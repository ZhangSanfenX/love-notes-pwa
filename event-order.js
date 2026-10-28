export function orderedEvents(events){return events.map((e,i)=>({e,i})).sort((a,b)=>(a.e.sortOrder??Number.MAX_SAFE_INTEGER)-(b.e.sortOrder??Number.MAX_SAFE_INTEGER)||a.i-b.i).map(x=>x.e);}
export function moveEvent(events,id,target,after=false){const list=orderedEvents(events),from=list.findIndex(e=>e.id===id);if(from<0||id===target)return list;const [item]=list.splice(from,1),to=list.findIndex(e=>e.id===target);if(to<0)return orderedEvents(events);list.splice(to+(after?1:0),0,item);return list.map((e,i)=>({...e,sortOrder:(i+1)*1024}));}
export function installEventDrag(list,getEvents,save,toast){
 let pending,active=false,source,target,after=false,ignoreClick=false,raf;
 const scroll=list.closest('#page-scroll');
 list.addEventListener('touchmove',e=>{if(active)e.preventDefault();},{passive:false});
 const clear=()=>{clearTimeout(pending);cancelAnimationFrame(raf);list.querySelectorAll('.dragging,.drop-target').forEach(e=>e.classList.remove('dragging','drop-target'));active=false;};
 list.querySelectorAll('img').forEach(image=>image.draggable=false);
 list.addEventListener('dragstart',e=>e.preventDefault());
 list.addEventListener('contextmenu',e=>{if(e.target.closest('.event'))e.preventDefault();});
 list.addEventListener('click',e=>{if(ignoreClick){e.preventDefault();e.stopImmediatePropagation();ignoreClick=false;}},true);
 list.addEventListener('pointerdown',e=>{const item=e.target.closest('.event');if(!item||e.button!==0)return;clear();source=item;target=null;const x=e.clientX,y=e.clientY;let lastY=y;
  pending=setTimeout(()=>{active=true;ignoreClick=true;item.classList.add('dragging');item.setPointerCapture(e.pointerId);navigator.vibrate?.(20);const step=()=>{if(!active)return;if(scroll){const r=scroll.getBoundingClientRect();if(lastY<r.top+55)scroll.scrollTop-=9;else if(lastY>r.bottom-65)scroll.scrollTop+=9;}raf=requestAnimationFrame(step);};step();},450);
  item.onpointermove=ev=>{lastY=ev.clientY;if(!active){if(Math.hypot(ev.clientX-x,ev.clientY-y)>10)clearTimeout(pending);return;}ev.preventDefault();const hit=document.elementFromPoint(ev.clientX,ev.clientY)?.closest('.event');list.querySelectorAll('.drop-target').forEach(e=>e.classList.remove('drop-target'));if(hit&&hit!==source&&list.contains(hit)){target=hit;after=ev.clientY>hit.getBoundingClientRect().top+hit.offsetHeight/2;hit.classList.add('drop-target');}};
  const done=ev=>{const was=active,drop=target;clear();item.onpointermove=null;item.onpointerup=null;item.onpointercancel=null;if(was&&drop&&ev.type!=='pointercancel'){save(moveEvent(getEvents(),source.dataset.id,drop.dataset.id,after));toast('顺序已保存');}if(was)setTimeout(()=>ignoreClick=false,350);};item.onpointerup=done;item.onpointercancel=done;
 });
 list.addEventListener('keydown',e=>{const item=e.target.closest('.event');if(!item||!e.altKey||!['ArrowUp','ArrowDown'].includes(e.key))return;const visible=[...list.querySelectorAll('.event')],next=visible[visible.indexOf(item)+(e.key==='ArrowUp'?-1:1)];if(next){e.preventDefault();save(moveEvent(getEvents(),item.dataset.id,next.dataset.id,e.key==='ArrowDown'));}});
}
