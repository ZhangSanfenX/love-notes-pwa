import {CLOUD_API} from './cloud-config.js';
const copy=x=>JSON.parse(JSON.stringify(x));
export class CloudJournal {
 constructor(db,onChange=()=>{}){this.db=db;this.onChange=onChange;this.state={session:null,items:{},pending:{}};this.tail=Promise.resolve();this.busy=false;this.status='尚未登录';this.authRequired=false;}
 async load(){this.state=await new Promise((resolve,reject)=>{const r=this.db.transaction('data').objectStore('data').get('cloudJournal');r.onsuccess=()=>resolve(r.result||this.state);r.onerror=()=>reject(r.error);});return this;}
 get session(){return this.state.session;}get pendingCount(){return Object.keys(this.state.pending).length;}
 change(fn){const job=async()=>{const next=copy(this.state);fn(next);await new Promise((resolve,reject)=>{const tx=this.db.transaction('data','readwrite');tx.objectStore('data').put(next,'cloudJournal');tx.oncomplete=resolve;tx.onabort=()=>reject(Error('云日记本地保存失败，请检查手机存储空间'));tx.onerror=()=>{};});this.state=next;this.onChange();};this.tail=this.tail.then(job,job);return this.tail;}
 async request(path,method='GET',body,token=this.session?.token){const response=await fetch(CLOUD_API+path,{method,headers:{'Content-Type':'application/json',...(token?{Authorization:'Bearer '+token}:{})},body:body===undefined?undefined:JSON.stringify(body),credentials:'omit',signal:AbortSignal.timeout(45000)});let data;try{data=await response.json();}catch{throw Error('同步服务响应异常，内容仍保留在本机');}if(!response.ok){const e=Error(data.message||'同步失败');e.status=response.status;e.code=data.error;throw e;}return data;}
 async login(username,password){if(this.pendingCount&&this.session?.user.username.toLowerCase()!==username.trim().toLowerCase())throw Error('当前账号还有未上传内容，请先同步再切换账号');const result=await this.request('/api/login','POST',{username,password},null);await this.change(s=>{if(s.session?.user.id!==result.user.id){s.items={};s.pending={};}s.session=result;});this.authRequired=false;this.status=result.user.forceChange?'首次登录，请先改密码':'已登录';if(!result.user.forceChange)this.sync();return result;}
 async password(oldPassword,newPassword){const result=await this.request('/api/password','POST',{oldPassword,newPassword});await this.change(s=>s.session=result);this.authRequired=false;this.status='密码已更新';this.sync();}
 async logout(){if(this.pendingCount)throw Error('还有未上传或冲突的内容，请先同步或处理冲突后再退出');try{await this.request('/api/logout','POST',{});}catch{}await this.change(s=>{s.session=null;s.items={};s.pending={};});this.status='已退出，云端缓存已移除';this.authRequired=false;}
 list(scope){if(!this.session)return [];const result={};for(const [id,item]of Object.entries(this.state.items))if(item.scope===scope&&!item.deleted)result[id]={...copy(item.note),id,_cloud:copy(item)};
  for(const [id,p]of Object.entries(this.state.pending)){delete result[id];if(!p.deleted&&p.scope===scope)result[id]={...copy(p.note),id,_cloud:{id,scope,owner:this.session.user.id,author:this.session.user.displayName,version:p.expectedVersion,updatedAt:p.localUpdatedAt,pending:true,conflict:!!p.conflict}};}
  return Object.values(result).sort((a,b)=>b._cloud.updatedAt.localeCompare(a._cloud.updatedAt));}
 async save(note,scope){if(!this.session||this.session.user.forceChange)throw Error('请登录并修改初始密码后再启用云端日记');const prior=this.state.items[note.id];if(prior&&prior.owner!==this.session.user.id)throw Error('只能修改自己写的内容');const payload={text:note.text,date:note.date.replace(' ','T').slice(0,16),mood:note.mood,tiger:note.tiger!==false,photos:note.photos||[]};await this.change(s=>s.pending[note.id]={operationId:crypto.randomUUID(),scope,note:payload,expectedVersion:s.pending[note.id]?.expectedVersion||s.items[note.id]?.version||0,localUpdatedAt:new Date().toISOString(),deleted:false});this.sync();}
 async remove(id){const prior=this.state.items[id];if(prior&&prior.owner!==this.session?.user.id)throw Error('只能删除自己写的内容');await this.change(s=>{const p=s.pending[id],item=s.items[id];s.pending[id]={operationId:crypto.randomUUID(),scope:p?.scope||item?.scope||'private',note:p?.note||item?.note,expectedVersion:p?.expectedVersion||item?.version||0,localUpdatedAt:new Date().toISOString(),deleted:true};});this.sync();}
 async discard(id){await this.change(s=>delete s.pending[id]);this.sync();}
 async keepCopy(id){const p=this.state.pending[id];if(!p||p.deleted)return;await this.change(s=>{const fresh=crypto.randomUUID();s.pending[fresh]={...p,expectedVersion:0,conflict:false,operationId:crypto.randomUUID(),localUpdatedAt:new Date().toISOString()};delete s.pending[id];});this.sync();}
 async sync(){
  if(!this.session||this.session.user.forceChange||this.authRequired)return;if(this.busy){this.again=true;return;}this.busy=true;this.status='正在同步…';this.onChange();
  try{
   const current=await this.request('/api/session');await this.change(s=>s.session.user=current.user);
   for(const [id,p]of Object.entries(copy(this.state.pending))){if(p.conflict)continue;let result;
    try{result=await this.request('/api/notes/'+id+(p.deleted?'/delete':''),'POST',{expectedVersion:p.expectedVersion,operationId:p.operationId,...(!p.deleted?{scope:p.scope,note:p.note}:{})});}
    catch(error){if(error.status===409){await this.change(s=>{if(s.pending[id]?.operationId===p.operationId)s.pending[id].conflict=true;});continue;}if(error.status===404&&p.deleted){await this.change(s=>{if(s.pending[id]?.operationId===p.operationId){delete s.pending[id];delete s.items[id];}});continue;}throw error;}
    await this.change(s=>{s.items[id]={...result.item,note:p.note};if(s.pending[id]?.operationId===p.operationId)delete s.pending[id];else if(s.pending[id])s.pending[id].expectedVersion=result.item.version;});
   }
   const index=[];let after='';do{const response=await this.request('/api/index'+(after?'?after='+encodeURIComponent(after):''));index.push(...response.items);if(index.length>10000)throw Error('云端记录过多，请联系管理员');after=response.more?response.next:'';}while(after);
   const items={};for(const meta of index){if(meta.deleted)continue;const cached=this.state.items[meta.id];if(cached?.version===meta.version&&cached.note)items[meta.id]={...meta,note:cached.note};else{const remote=await this.request('/api/notes/'+meta.id);items[meta.id]=remote;}}
   await this.change(s=>s.items=items);this.status=this.pendingCount?'有待处理的同步冲突':'已同步 · '+new Date().toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  }catch(error){if(error.status===401){this.authRequired=true;this.status='登录过期，请重新登录；未上传内容仍保留';}else if(error.code==='password_change_required'){await this.change(s=>s.session.user.forceChange=true);this.status='请先修改初始密码';}else this.status=navigator.onLine?error.message:'离线中，内容已保存在本机等待同步';}
  finally{this.busy=false;this.onChange();if(this.again){this.again=false;if(!this.authRequired)this.sync();}}
 }
}
