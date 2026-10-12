// Browser donor runs ONLY after explicit user click. Each tab has a separate identity.
const q=id=>document.getElementById(id);
const ident=sessionStorage.getItem('tf-worker-id')||crypto.randomUUID();
sessionStorage.setItem('tf-worker-id',ident);
q('worker-id').textContent=ident.slice(0,13);
const processor=new Worker('/compute-worker.mjs',{type:'module'});
let active=false,solved=0;
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function api(path,data){
 const options=data===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)};
 const r=await fetch(path,options);
 const value=await r.json();
 if(!r.ok)throw Error(value.error||'HTTP '+r.status);
 return value;
}
function execute(unit){
 return new Promise((resolve,reject)=>{
  processor.onmessage=e=>e.data.error?reject(Error(e.data.error)):resolve(e.data.result);
  processor.onerror=e=>reject(Error(e.message));
  processor.postMessage({kind:unit.kind,input:unit.input});
 });
}
function inform(s){q('message').textContent=s;}
async function refresh(){
 try{
  const [project,tasks,receipts]=await Promise.all([api('/api/project'),api('/api/tasks'),api('/api/receipts')]);
  q('project-name').textContent=project.project.name;
  q('total').textContent=tasks.length;
  q('accepted').textContent=receipts.length;
  const list=q('task-list');list.replaceChildren();
  for(const task of tasks.slice(-18).reverse()){
   const tr=document.createElement('tr');
   for(const data of [task.title,task.kind,task.status,task.completed+'/'+task.units]){
    const td=document.createElement('td');td.textContent=String(data);tr.append(td);
   }
   list.append(tr);
  }
 }catch(e){inform('Hub unavailable: '+e.message);}
}
async function donate(){
 if(active)return;active=true;q('start').disabled=true;q('stop').disabled=false;
 inform('Volunteering compute — bounded, audited browser worker active.');
 while(active){
  try{
   const unit=await api('/api/lease',{workerId:ident});
   if(!unit){await pause(1500);continue;}
   const began=performance.now(),result=await execute(unit);
   await api('/api/result',{taskId:unit.taskId,unitId:unit.unitId,
    workerId:ident,leaseId:unit.leaseId,result,durationMs:Math.round(performance.now()-began)});
   solved++;inform('Verified units contributed this session: '+solved);
   await refresh();
  }catch(e){inform('Contribution rejected or disconnected: '+e.message);await pause(3000);}
 }
 q('start').disabled=false;q('stop').disabled=true;
 inform('Compute donation stopped. Verified units: '+solved);
}
q('start').addEventListener('click',donate);
q('stop').addEventListener('click',()=>{active=false;q('stop').disabled=true;});
q('proposal').addEventListener('submit',async e=>{
 e.preventDefault();
 const kind=q('kind').value;
 const data={kind,title:q('task-title').value.trim()||kind};
 if(kind==='prime-range'){data.start=Number(q('range-start').value);data.end=Number(q('range-end').value);}
 if(kind==='digest-text')data.text=q('input-text').value;
 if(kind==='agent-request')data.goal=q('input-text').value;
 try{const t=await api('/api/tasks',data);inform('Submitted '+t.kind+' / '+t.id);await refresh();}
 catch(err){inform('Task rejected: '+err.message);}
});
q('kind').addEventListener('change',()=>{
 q('range-fields').hidden=q('kind').value!=='prime-range';
 q('text-fields').hidden=q('kind').value==='prime-range';
});
refresh();
setInterval(refresh,5000); // status reads only; never starts donation
