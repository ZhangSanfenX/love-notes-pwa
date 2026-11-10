import {ReplyDrafts} from './reply-drafts.js';
export const noteDrafts=new ReplyDrafts();
export function noteDraftKey(kind,id,scope=''){return kind+':'+(id||'new:'+scope);}
const same=(a,b)=>a.scope===b.scope&&a.note.text===b.note.text&&a.note.mood===b.note.mood&&a.note.tiger===b.note.tiger&&(a.note.photos||[]).length===(b.note.photos||[]).length&&(a.note.photos||[]).every((p,i)=>p===b.note.photos[i]);
export function attachNoteDraft(d,h,{user,key,base,read}){
 const rawClose=()=>HTMLDialogElement.prototype.close.call(d),drop=()=>noteDrafts.remove(user,key,'note'),finish=()=>{drop();rawClose();},leave=()=>{rawClose();h.refresh();};
 const stash=()=>{noteDrafts.put(user,key,'note',read());leave();h.toast('笔记已暂存，可点继续写；刷新或进程结束后清除');};let asking=false;
 const cancel=()=>{if(same(read(),base)){drop();leave();return;}if(asking)return;asking=true;const q=h.sheet('这篇笔记还没写完','<p>可以暂存后浏览原文，稍后接着写。</p><p class="help">文字、心情和已选照片不上传，仅在本次运行内暂存。</p>',h.button('继续写','keep')+h.button('放弃编辑','discard')+h.button('暂存返回','stash','primary'));q.classList.add('reply-exit-dialog');q.addEventListener('close',()=>asking=false,{once:true});q.querySelector('[data-act=keep]').onclick=()=>q.close();q.querySelector('[data-act=discard]').onclick=()=>{drop();q.close();leave();};q.querySelector('[data-act=stash]').onclick=()=>{q.close();stash();};};
 d.close=cancel;d.addEventListener('cancel',e=>{e.preventDefault();cancel();});d.querySelector('[data-act=cancel]').onclick=cancel;d.querySelector('[data-act=stash-note]').onclick=stash;d.classList.add('note-draft-dialog');return {finish,drop};
}
export function markNoteCompose(hasDraft){const b=document.querySelector('#journal-compose');if(b){b.setAttribute('aria-label',hasDraft?'继续写':'写一篇');b.querySelector('.compose-label').textContent=hasDraft?'继续写':'写一篇';}}
