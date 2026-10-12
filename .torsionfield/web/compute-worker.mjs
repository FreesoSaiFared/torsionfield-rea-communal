// Deliberately finite, allowlisted browser-side compute; no eval or dynamic code.
function primes(a,b){
 let count=0;for(let n=a;n<b;n++){let yes=n>=2;for(let d=2;d*d<=n&&yes;d++)if(n%d===0)yes=false;if(yes)count++;}return count;
}
self.onmessage=async({data})=>{
 try{
  const {kind,input}=data;
  let result;
  if(kind==='prime-range')result={count:primes(input.start,input.end)};
  else if(kind==='digest-text'){
   const bytes=new TextEncoder().encode(input.text);
   const buffer=await crypto.subtle.digest('SHA-256',bytes);
   const sha256=Array.from(new Uint8Array(buffer)).map(x=>x.toString(16).padStart(2,'0')).join('');
   const s=input.text;
   result={sha256,chars:s.length,words:s.trim()?s.trim().split(/\s+/).length:0};
  }else throw Error('Workload not approved');
  self.postMessage({result});
 }catch(e){self.postMessage({error:String(e.message||e)});}
};
