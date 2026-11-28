// Original keys stay compatible. A transaction commits the original and a
// separately chunked, content-addressed recovery copy together. No cloud writes.
const PREFIX='safety-v1:',CHUNK=16384,NAMES=['root','cloudJournal'];
const clone=v=>structuredClone(v);
const hash=async text=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))),x=>x.toString(16).padStart(2,'0')).join('');
const headKey=name=>PREFIX+'head:'+name;
const chunkKey=(id,i)=>PREFIX+'chunk:'+id+':'+i;
export class LocalRecoveryError extends Error {
  constructor(namespace,cause){super('本地'+(namespace==='root'?'纪念日与旧纪录':'云日记缓存')+'暂不可读取；已停止自动保存与同步，原数据未清除。');this.name='LocalRecoveryError';this.namespace=namespace;this.cause=cause;}
}
function get(db,key){return new Promise((resolve,reject)=>{const tx=db.transaction('data'),r=tx.objectStore('data').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function plan(namespace,value,cached=new Map()){
  const pieces=new Map(),refs=new Set(),strings=new Map(),sources=new Map();
  async function pack(text,reuse){if(strings.has(text))return strings.get(text);const ref=reuse||{id:await hash(text),n:Math.max(1,Math.ceil(text.length/CHUNK))};for(let i=0;i<ref.n;i++){const key=chunkKey(ref.id,i);pieces.set(key,text.slice(i*CHUNK,(i+1)*CHUNK));refs.add(key);}strings.set(text,ref);return ref;}
  async function encode(v){
    if(typeof v==='string'&&(v.startsWith('data:image/')||v.length>CHUNK)){const ref=await pack(v,cached.get(v));sources.set(v,ref);return {$safeStringV1:ref};}
    if(Array.isArray(v))return Promise.all(v.map(encode));
    if(v&&typeof v==='object'){const result={};for(const [k,x]of Object.entries(v))Object.defineProperty(result,k,{value:await encode(x),enumerable:true,writable:true,configurable:true});return Object.hasOwn(result,'$safeStringV1')||Object.hasOwn(result,'$safeObjectV1')?{$safeObjectV1:Object.entries(result)}:result;}
    return v;
  }
  const doc=async v=>pack(JSON.stringify(await encode(v))),meta=clone(value),collections={};
  const fields=namespace==='root'?['events','notes']:['items','pending','responsePending'];
  for(const field of fields){if(!Object.hasOwn(meta,field))continue;const source=meta[field];delete meta[field];const array=Array.isArray(source),entries=array?source.map((v,i)=>[i,v]):Object.entries(source||{});collections[field]={array,entries:[]};for(const [id,v]of entries)collections[field].entries.push([id,await doc(v)]);}
  const manifest={format:1,namespace,meta:await doc(meta),collections},manifestRef=await pack(JSON.stringify(manifest));
  return {pieces,refs,sources,head:{format:1,namespace,manifest:manifestRef,savedAt:new Date().toISOString()}};
}
export class ResilientStorage {
  constructor(db){this.db=db;db.resilientStorage=this;this.tail=Promise.resolve();this.refs=new Map();this.heads=new Map();this.sources=new Map();this.known=new Set();this.values=new Map();this.active=new Map();this.recovered=new Set();this.warnings=[];this.persistenceAsked=false;}
  get needsReview(){return this.recovered.size>0;}
  enqueue(fn){const job=this.tail.then(fn,fn);this.tail=job.catch(()=>{});return job;}
  async unpack(ref){
    if(!ref||!/^[a-f0-9]{64}$/.test(ref.id)||!Number.isSafeInteger(ref.n)||ref.n<1||ref.n>100000)throw Error('恢复分片索引无效');
    const chunks=[];for(let i=0;i<ref.n;i++){const key=chunkKey(ref.id,i),part=await get(this.db,key);if(typeof part!=='string')throw Error('恢复分片缺失');chunks.push(part);}
    const value=chunks.join('');if(await hash(value)!==ref.id)throw Error('恢复分片校验失败');return value;
  }
  async decode(v){
    if(v&&typeof v==='object'&&Object.keys(v).length===1&&Array.isArray(v.$safeObjectV1)){const result={};for(const [k,x]of v.$safeObjectV1)Object.defineProperty(result,k,{value:await this.decode(x),enumerable:true,writable:true,configurable:true});return result;}
    if(v&&typeof v==='object'&&Object.keys(v).length===1&&v.$safeStringV1)return this.unpack(v.$safeStringV1);
    if(Array.isArray(v))return Promise.all(v.map(x=>this.decode(x)));
    if(v&&typeof v==='object'){const result={};for(const [k,x]of Object.entries(v))Object.defineProperty(result,k,{value:await this.decode(x),enumerable:true,writable:true,configurable:true});return result;}return v;
  }
  async document(ref){return this.decode(JSON.parse(await this.unpack(ref)));}
  async snapshot(namespace,partial=false){
    const head=await get(this.db,headKey(namespace));if(!head)throw Error('尚无本机恢复副本');
    const manifest=JSON.parse(await this.unpack(head.manifest));if(manifest.format!==1||manifest.namespace!==namespace)throw Error('恢复副本格式不匹配');
    const value=await this.document(manifest.meta),failed=[];
    for(const [field,collection]of Object.entries(manifest.collections)){const rows=collection.array?[]:{};for(const [id,ref]of collection.entries){try{const item=await this.document(ref);if(collection.array)rows.push(item);else Object.defineProperty(rows,id,{value:item,enumerable:true,writable:true,configurable:true});}catch(e){if(!partial)throw e;failed.push({field,id,message:e.message});}}value[field]=rows;}
    return {value,failed,savedAt:head.savedAt};
  }
  read(namespace,fallback){return this.enqueue(async()=>{
    let head;try{head=await get(this.db,headKey(namespace));}catch{/* The primary may still be healthy. */}
    const primary=head?.primaryKey||namespace;this.active.set(namespace,primary);
    try{
      let value=await get(this.db,primary);if(value===undefined&&(head||await get(this.db,PREFIX+'seen:'+namespace)))throw Error('主记录缺失');if(value===undefined)value=clone(fallback);
      // Establish protection for existing versions without deleting/moving keys.
      try{await this.persist(namespace,value,false);}catch(e){this.warnings.push('本机恢复副本尚未完整建立，请先导出备份。');}
      this.values.set(namespace,value);return value;
    }catch(error){
      try{const restored=await this.snapshot(namespace);this.recovered.add(namespace);this.active.set(namespace,PREFIX+'recovered-primary:'+namespace);this.values.set(namespace,clone(restored.value));return restored.value;}
      catch{throw new LocalRecoveryError(namespace,error);}
    }
  });}
  write(namespace,value){return this.enqueue(async()=>{if(this.needsReview)throw Error('请先核对恢复内容，并在提示中确认恢复保存与同步');await this.persist(namespace,value,true);this.values.set(namespace,value);});}
  async persist(namespace,value,primary){
    const cached=new Map();for(const entries of this.sources.values())for(const [text,ref]of entries)cached.set(text,ref);
    const next=await plan(namespace,value,cached),primaryKey=this.active.get(namespace)||namespace;
    next.head.primaryKey=primaryKey;
    const live=new Set(next.refs);for(const [name,refs]of this.refs)if(name!==namespace)for(const key of refs)live.add(key);
    await new Promise((resolve,reject)=>{
      const tx=this.db.transaction('data','readwrite'),store=tx.objectStore('data');
      tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error||Error('本地保存未完成，原记录仍保留'));tx.onerror=()=>{};
      const abort=e=>{try{tx.abort();}catch{}reject(e);};
      // Read presence and the other namespace's revision inside this same
      // transaction: another tab must not invalidate dedup or collection.
      const listing=store.getAllKeys();let allKeys=[];
      listing.onsuccess=()=>{try{allKeys=listing.result;const existing=new Set(allKeys);
        for(const [key,part]of next.pieces)if(!this.known.has(key)||!existing.has(key))store.put(part,key);
        store.put(next.head,headKey(namespace));store.put(true,PREFIX+'seen:'+namespace);if(primary)store.put(value,primaryKey);
      }catch(e){abort(e);}};
      const other=NAMES.find(n=>n!==namespace);
      if(this.refs.has(other)){const observed=store.get(headKey(other));observed.onsuccess=()=>{try{
        // A newer tab may own newer photos/queues. Skip collection until this
        // instance has actually read that namespace instead of guessing.
        if(observed.result?.manifest?.id===this.heads.get(other))for(const key of allKeys)if(typeof key==='string'&&key.startsWith(PREFIX+'chunk:')&&!live.has(key))store.delete(key);
      }catch(e){abort(e);}};}
    });
    this.refs.set(namespace,next.refs);this.heads.set(namespace,next.head.manifest.id);this.sources.set(namespace,next.sources);this.known=new Set([...this.known,...next.refs].filter(k=>live.has(k)));this.active.set(namespace,primaryKey);
  }
  approveRecovery(){return this.enqueue(async()=>{
    const names=[...this.recovered];try{for(const name of names)await this.persist(name,this.values.get(name),true);this.recovered.clear();}catch(e){throw Error('恢复保存未完成，请先导出备份：'+e.message);}
  });}
  forgetOriginal(namespace){return this.enqueue(async()=>{
    if(this.needsReview||this.active.get(namespace)===namespace)return;
    // Only called by an explicit logout after its queues were checked and its
    // current state cleared. Routine recovery never deletes the damaged key.
    await new Promise((resolve,reject)=>{const tx=this.db.transaction('data','readwrite');tx.objectStore('data').delete(namespace);tx.oncomplete=resolve;tx.onabort=()=>reject(tx.error||Error('旧缓存清理未完成'));tx.onerror=()=>{};});
  });}
  async exportReadable(){
    const namespaces={},failures=[];for(const name of NAMES){if(this.values.has(name)){namespaces[name]=clone(this.values.get(name));continue;}try{const result=await this.snapshot(name,true);namespaces[name]=result.value;failures.push(...result.failed.map(x=>({namespace:name,...x})));}catch(e){failures.push({namespace:name,message:e.message});}}
    // Recovery exports must not contain authentication tokens.
    if(namespaces.cloudJournal?.session)delete namespaces.cloudJournal.session.token;
    return {format:'lovenotes-local-recovery',version:1,exported:new Date().toISOString(),data:namespaces,unreadable:failures};
  }
  async requestPersistence(){if(this.persistenceAsked)return;this.persistenceAsked=true;try{await navigator.storage?.persist?.();}catch{/* Browser decides; protection never depends on a grant. */}}
}
