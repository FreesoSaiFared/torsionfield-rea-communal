// Dependency-free local MCP stdio bridge for the Torsionfield community hub.
import {createInterface} from 'node:readline';
import {readFileSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=dirname(fileURLToPath(import.meta.url));
const ui='ui://torsionfield/community';
const hub=process.env.TF_HUB_URL||'http://127.0.0.1:19876';
const schema={type:'object',additionalProperties:true};
const tools=[
 {name:'torsionfield_tasks',description:'List shared work queue and proposal progress',inputSchema:{type:'object',properties:{}},_meta:{ui:{resourceUri:ui}}},
 {name:'torsionfield_propose',description:'Create opt-in finite compute task or agent-only proposal. No arbitrary code execution.',inputSchema:schema,_meta:{ui:{resourceUri:ui}}},
 {name:'torsionfield_lease',description:'Lease one allowlisted browser-safe work unit for a volunteer',inputSchema:schema,_meta:{ui:{resourceUri:ui}}},
 {name:'torsionfield_result',description:'Submit result for independent verification and SHA-256 receipt',inputSchema:schema,_meta:{ui:{resourceUri:ui}}},
 {name:'torsionfield_receipts',description:'Read accepted contribution receipts',inputSchema:{type:'object',properties:{}},_meta:{ui:{resourceUri:ui}}}
];
const routes={torsionfield_tasks:['GET','/api/tasks'],torsionfield_propose:['POST','/api/tasks'],
 torsionfield_lease:['POST','/api/lease'],torsionfield_result:['POST','/api/result'],
 torsionfield_receipts:['GET','/api/receipts']};
async function handle(message){
 const {method,params={}}=message;
 if(method==='server/discover')return {protocolVersions:['2026-07-28','2025-11-25'],capabilities:{tools:{},resources:{}},
   extensions:{'io.modelcontextprotocol/ui':{}},serverInfo:{name:'torsionfield-community',version:'0.1.0'}};
 if(method==='initialize')return {protocolVersion:'2025-11-25',capabilities:{tools:{},resources:{}},
   serverInfo:{name:'torsionfield-community',version:'0.1.0'}};
 if(method==='ping')return {};
 if(method==='tools/list')return {tools};
 if(method==='resources/list')return {resources:[{uri:ui,name:'Community Workbench',
   mimeType:'text/html;profile=mcp-app',description:'Interactive opt-in volunteer task board'}]};
 if(method==='resources/read'){
  if(params.uri!==ui)throw Error('Unknown UI resource');
  return {contents:[{uri:ui,mimeType:'text/html;profile=mcp-app',
   text:readFileSync(join(root,'mcp-ui.html'),'utf8')}]};
 }
 if(method==='tools/call'){
  const route=routes[params.name];
  if(!route)throw Error('Unknown tool');
  const [method,path]=route;
  const response=await fetch(hub+path,method==='POST'?{method,headers:{'Content-Type':'application/json'},
    body:JSON.stringify(params.arguments||{})}:{method});
  const data=await response.json();
  if(!response.ok)throw Error(data.error||'HTTP '+response.status);
  return {content:[{type:'text',text:JSON.stringify(data)}],structuredContent:{data}};
 }
 throw Error('Unknown method: '+method);
}
const io=createInterface({input:process.stdin,crlfDelay:Infinity});
io.on('line',async line=>{
 let msg;try{msg=JSON.parse(line);}catch{return;}
 if(msg.id===undefined)return;
 try{const result=await handle(msg);
  process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:msg.id,result})+'\n');
 }catch(e){process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:msg.id,
  error:{code:-32000,message:e.message}})+'\n');}
});
