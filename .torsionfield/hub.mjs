// Opt-in communal compute hub. Node >=22; default loopback only.
import {createServer} from 'node:http';
import {createHash,randomUUID} from 'node:crypto';
import {readFileSync,writeFileSync,renameSync,mkdirSync} from 'node:fs';
import {join,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const project=JSON.parse(readFileSync(join(root,'project.json'),'utf8'));
const dir=join(root,'state');mkdirSync(dir,{recursive:true,mode:0o700});
const file=join(dir,'tasks.json');
let tasks=[];try{tasks=JSON.parse(readFileSync(file,'utf8'));}catch{}
const digest=s=>createHash('sha256').update(s).digest('hex');
function save(){writeFileSync(file+'.tmp',JSON.stringify(tasks,null,2),{mode:0o600});renameSync(file+'.tmp',file);}
function primes(a,b){let total=0;for(let n=a;n<b;n++){let ok=n>=2;for(let d=2;d*d<=n&&ok;d++)if(n%d===0)ok=false;if(ok)total++;}return total;}
function calculate(kind,input){
 if(kind==='prime-range')return {count:primes(input.start,input.end)};
 if(kind==='digest-text'){const s=input.text;return {sha256:digest(s),chars:s.length,words:s.trim()?s.trim().split(/\s+/).length:0};}
 throw Error('Unsupported browser workload');
}
function summary(t){return {id:t.id,title:t.title,kind:t.kind,goal:t.goal,status:t.status,
 createdAt:t.createdAt,units:t.units.length,completed:t.units.filter(x=>x.status==='done').length};}
function answer(res,status,value){const s=JSON.stringify(value);res.writeHead(status,{'Content-Type':'application/json',
 'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(s);}
function bad(text,status=400){const e=Error(text);e.status=status;throw e;}
async function body(req){let s='';for await(const c of req){s+=c;if(s.length>16384)bad('Request too large',413);}
 try{return JSON.parse(s);}catch{bad('Invalid JSON');}}
function add(d){
 if(tasks.length>=80)bad('Queue full',429);
 const kind=String(d.kind||'');let units=[],status='queued',goal;
 if(kind==='prime-range'){
  if(!Number.isSafeInteger(d.start)||!Number.isSafeInteger(d.end)||d.start<2||d.end<=d.start||
     d.end>2000000||d.end-d.start>40000)bad('Range must be 2..2000000, max span 40000');
  for(let i=d.start;i<d.end;i+=2000)units.push({id:randomUUID(),input:{start:i,end:Math.min(i+2000,d.end)},status:'queued'});
 }else if(kind==='digest-text'){
  if(typeof d.text!=='string'||d.text.length>4000)bad('Text too large');
  units=[{id:randomUUID(),input:{text:d.text},status:'queued'}];
 }else if(kind==='agent-request'){
  goal=String(d.goal||'').trim();if(!goal||goal.length>2000)bad('Invalid goal');status='proposal';
 }else bad('Unknown task type');
 const t={id:randomUUID(),kind,title:String(d.title||kind).slice(0,100),goal,status,
  createdAt:new Date().toISOString(),units};tasks.push(t);save();return summary(t);
}
function lease(d){
 const workerId=String(d.workerId||'');
 if(!/^[\w-]{8,80}$/.test(workerId))bad('Invalid worker ID');
 for(const t of tasks)for(const u of t.units){
  if(u.status==='leased'&&u.expires<Date.now())u.status='queued';
  if(u.status!=='queued')continue;
  u.status='leased';u.workerId=workerId;u.leaseId=randomUUID();
  u.expires=Date.now()+120000;save();
  return {taskId:t.id,unitId:u.id,kind:t.kind,input:u.input,
          leaseId:u.leaseId,workerId,expires:u.expires};
 }
 save();return null;
}
async function fabric(receipt){
 const tokenFile=process.env.ABP_FABRIC_TOKEN_FILE;
 if(!tokenFile)return;
 try{
  const token=readFileSync(tokenFile,'utf8').trim();
  const endpoint=process.env.ABP_FABRIC_URL||'http://127.0.0.1:19860/api/events';
  const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',
   Authorization:'Bearer '+token},body:JSON.stringify({kind:'tf.receipt',project:project.project.id,receipt})});
  if(!r.ok)process.stderr.write('Fabric rejected receipt '+r.status+'\n');
 }catch(e){process.stderr.write('Fabric bridge error: '+e.message+'\n');}
}
async function accept(d){
 const t=tasks.find(t=>t.id===d.taskId),u=t?.units.find(x=>x.id===d.unitId);
 if(!u||u.status!=='leased'||u.expires<Date.now()||
    u.leaseId!==d.leaseId||u.workerId!==d.workerId)bad('Lease invalid or expired',409);
 const expected=calculate(t.kind,u.input);
 if(JSON.stringify(expected)!==JSON.stringify(d.result)){
  u.status='queued';delete u.leaseId;save();bad('Result verification failed',422);
 }
 u.status='done';u.result=expected;
 const receipt={project:project.project.id,task:t.id,unit:u.id,
  contributor:u.workerId,kind:t.kind,inputSha256:digest(JSON.stringify(u.input)),
  resultSha256:digest(JSON.stringify(expected)),acceptedAt:new Date().toISOString(),verified:true};
 receipt.receiptSha256=digest(JSON.stringify(receipt));
 u.receipt=receipt;
 if(t.units.every(x=>x.status==='done'))t.status='completed';
 save();await fabric(receipt);return receipt;
}
async function handler(req,res){
 try{
  const path=new URL(req.url,'http://localhost').pathname;
  if(req.method==='GET'){
   if(path==='/api/health')return answer(res,200,{ok:true,project:project.project.id});
   if(path==='/api/project')return answer(res,200,project);
   if(path==='/api/tasks')return answer(res,200,tasks.map(summary));
   if(path==='/api/receipts')return answer(res,200,tasks.flatMap(t=>t.units.flatMap(u=>u.receipt?[u.receipt]:[])));
   const files={'/':'index.html','/client.mjs':'client.mjs','/compute-worker.mjs':'compute-worker.mjs'};
   if(files[path]){
    const file=files[path],js=file.endsWith('.mjs');
    res.writeHead(200,{'Content-Type':js?'text/javascript; charset=utf-8':'text/html; charset=utf-8',
     'Content-Security-Policy':"default-src 'self'; script-src 'self'; worker-src 'self'; connect-src 'self'; style-src 'self' 'unsafe-inline'",
     'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    return res.end(readFileSync(join(root,'web',file)));
   }
  }
  if(req.method==='POST'){
   if(!String(req.headers['content-type']||'').includes('application/json'))bad('JSON required',415);
   const d=await body(req);
   if(path==='/api/tasks')return answer(res,201,add(d));
   if(path==='/api/lease')return answer(res,200,lease(d));
   if(path==='/api/result')return answer(res,200,await accept(d));
  }
  answer(res,404,{error:'not_found'});
 }catch(e){answer(res,e.status||500,{error:e.message});}
}
export function createHub({host='127.0.0.1',port=19876}={}){
 const server=createServer(handler);
 return new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,host,()=>resolve(server));});
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){
 const host=process.env.TF_BIND||'127.0.0.1',port=Number(process.env.TF_PORT||19876);
 createHub({host,port}).then(()=>console.log('Torsionfield community: http://'+host+':'+port+'/'));
}
