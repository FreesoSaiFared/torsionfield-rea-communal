const field=document.getElementById('hub');
chrome.storage.local.get('tfHubUrl',data=>{if(data.tfHubUrl)field.value=data.tfHubUrl;});
document.getElementById('open').addEventListener('click',async()=>{
 try{
  const value=field.value.trim(),url=new URL(value);
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('HTTP(S) URL only');
  if(url.protocol==='http:'&&!['127.0.0.1','localhost'].includes(url.hostname))
   throw Error('Remote community hubs require HTTPS');
  url.pathname='/';url.search='';url.hash='';
  await chrome.storage.local.set({tfHubUrl:url.toString()});
  await chrome.tabs.create({url:url.toString()});
  window.close();
 }catch(e){document.getElementById('error').textContent=String(e.message||e);}
});
