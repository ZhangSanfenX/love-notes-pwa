export const MOODS=['开心','温暖','甜蜜','心动','充实','得意','惊喜','平静','迷茫','疲惫','孤单','委屈','难过','烦躁','生气'];
export const THEMES=['莓果奶油','抹茶心事','芋泥晚安','蜜桃日落','晴空来信','香草手帐'];
export const COLORS=['#f9dfd8','#e8eedd','#ece4f3','#ffe4cf','#dfeef6','#f5ecd9'];
export const DEFAULTS=[100,200,300].map(value=>({unit:'day',value,pinned:true})).concat([1,2,3].map(value=>({unit:'year',value,pinned:true})));
export const clone=x=>JSON.parse(JSON.stringify(x));
export function today(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
export function validDate(s){if(!/^\d{4}-\d{2}-\d{2}$/.test(s))return false;const d=new Date(s+'T00:00:00Z');return !isNaN(d)&&d.toISOString().slice(0,10)===s;}
export const day=s=>Date.parse(s+'T00:00:00Z')/86400000;
export const addDays=(s,n)=>new Date((day(s)+n)*86400000).toISOString().slice(0,10);
export function anniversary(s,y){const [,m,d]=s.split('-').map(Number);const last=new Date(Date.UTC(y,m,0)).getUTCDate();return `${y}-${String(m).padStart(2,'0')}-${String(Math.min(d,last)).padStart(2,'0')}`;}
export function occurrence(e,now=today()){if(!e.annual)return e.date;let next=anniversary(e.date,+now.slice(0,4));if(next<now)next=anniversary(e.date,+now.slice(0,4)+1);return next;}
export function count(e,now=today()){
  if(e.type==='倒数日'||e.annual){const gap=day(occurrence(e,now))-day(now);return {n:Math.abs(gap)+(e.inclusive?1:0),unit:gap===0?'就是今天':gap>0?'天后':'天前'};}
  const gap=day(now)-day(e.date);if(gap<0)return {n:-gap,unit:'天后开始'};return {n:gap+(e.inclusive?1:0),unit:e.inclusive?'天 · 当天算第 1 天':'天 · 当天算第 0 天'};
}
export const key=o=>`${o.unit}:${o.value}`;
export function prepare(e,library=DEFAULTS){
  if(Array.isArray(e.milestoneOptions))return e;
  const legacy=Array.isArray(e.milestones)||Array.isArray(e.milestoneYears), selected=(e.milestones?.length||0)+(e.milestoneYears?.length||0)>0;
  e.milestoneOptions=library.filter(x=>x.pinned).map(o=>({unit:o.unit,value:o.value,enabled:!legacy||!selected||(o.unit==='year'?e.milestoneYears:e.milestones)?.includes(o.value)||false}));
  for(const unit of ['day','year'])for(const value of (unit==='day'?e.milestones:e.milestoneYears)||[])if(!e.milestoneOptions.some(o=>key(o)===`${unit}:${value}`))e.milestoneOptions.push({unit,value,enabled:true});
  e.milestoneMaster=selected;return e;
}
export function initial(){return {events:[],notes:[],appearance:'system',names:'ZYW♥CSX',milestoneLibrary:clone(DEFAULTS),widgetDefault:{sync:true}};}
export function validate(root){
  if(!root||!Array.isArray(root.events)||!Array.isArray(root.notes)||root.events.length>2000||root.notes.length>10000)throw Error('不是有效的恋爱手记备份');
  const checkOptions=(options,library=false)=>{if(!Array.isArray(options)||options.length>60)throw Error('里程选项格式有误');const seen=new Set();for(const o of options){if(!o||!['day','year'].includes(o.unit)||!Number.isInteger(o.value)||o.value<1||o.value>(o.unit==='year'?100:365000)||seen.has(key(o)))throw Error('里程选项数值无效');seen.add(key(o));}};
  if(root.milestoneLibrary)checkOptions(root.milestoneLibrary,true);
  const ids=new Set();for(const e of root.events){if(!e||typeof e.id!=='string'||ids.has(e.id)||typeof e.title!=='string'||!e.title.trim()||e.title.length>100||!validDate(e.date)||!['纪念日','生日','倒数日','大事记'].includes(e.type))throw Error('纪念日格式有误');ids.add(e.id);if(e.milestoneOptions)checkOptions(e.milestoneOptions);}
  for(const n of root.notes)if(!n||typeof n.text!=='string'||n.text.length>50000||!Number.isInteger(n.mood)||n.mood<0||n.mood>=15||!validDate(n.date?.slice(0,10))||(n.photos&&!Array.isArray(n.photos))||(n.photos?.length||0)>6)throw Error('心情记录格式有误');
  const walk=(v,depth=0)=>{if(depth>20)throw Error('备份结构过深');if(Array.isArray(v)){for(const x of v)walk(x,depth+1);}else if(v&&typeof v==='object'){for(const [k,x]of Object.entries(v)){if(['__proto__','constructor','prototype'].includes(k))throw Error('备份字段无效');if(k==='photo'&&x&&(!/^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(x)))throw Error('照片格式不支持');walk(x,depth+1);}}};
  walk(root);for(const n of root.notes)for(const p of n.photos||[])if(!/^data:image\/(jpeg|png|webp);base64,[a-zA-Z0-9+/=]+$/.test(p))throw Error('日记照片格式不支持');
  return root;
}
export function reminders(root,now=today(),horizon=10){
  const entries=[];const end=anniversary(now,+now.slice(0,4)+horizon);
  for(const e of root.events){const byDate=new Map();const put=(date,label,on,advance)=>{if(date<now||date>end||(!on&&!advance))return;const v=byDate.get(date)||{date,labels:[],on:false,advance:false};v.labels.push(label);v.on||=!!on;v.advance||=!!advance;byDate.set(date,v);};
    if(e.remind||e.advance){if(e.annual||e.type==='纪念日'||e.type==='生日'){for(let year=Math.max(+now.slice(0,4),+e.date.slice(0,4));year<=+end.slice(0,4);year++)put(anniversary(e.date,year),e.type,e.remind,e.advance);}else put(e.date,e.type,e.remind,e.advance);}
    const x=prepare(clone(e),root.milestoneLibrary||DEFAULTS);
    if(x.milestoneMaster&&['纪念日','大事记'].includes(e.type))for(const o of x.milestoneOptions.filter(o=>o.enabled))put(o.unit==='day'?addDays(e.date,o.value-(e.inclusive?1:0)):anniversary(e.date,+e.date.slice(0,4)+o.value),o.unit==='day'?`第 ${o.value} 天`:`满 ${o.value} 年`,e.milestoneOn,e.milestoneAdvance);
    for(const r of byDate.values())entries.push({...r,id:e.id,title:e.title});
  }return entries.sort((a,b)=>a.date.localeCompare(b.date));
}
const esc=s=>String(s).replaceAll('\\','\\\\').replaceAll('\n','\\n').replaceAll(';','\\;').replaceAll(',','\\,');
export function calendar(root,now=today()){
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//LoveNotes//ZYW CSX//ZH-CN','CALSCALE:GREGORIAN','METHOD:PUBLISH','X-WR-CALNAME:我们的恋爱手记'];
  for(const r of reminders(root,now)){lines.push('BEGIN:VEVENT',`UID:${encodeURIComponent(r.id)}-${r.date}@lovenotes.local`,`DTSTAMP:${new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,'')}`,`DTSTART:${r.date.replaceAll('-','')}T090000`,`DTEND:${r.date.replaceAll('-','')}T091500`,`SUMMARY:${esc(r.title+' · '+r.labels.join(' / '))}`,'DESCRIPTION:来自恋爱手记；修改提醒后请删除旧日历项目并重新导入。');for(const trigger of [...(r.on?['PT0S']:[]),...(r.advance?['-P3D']:[])])lines.push('BEGIN:VALARM','ACTION:DISPLAY',`DESCRIPTION:${esc(r.title)}`,`TRIGGER:${trigger}`,'END:VALARM');lines.push('END:VEVENT');}
  lines.push('END:VCALENDAR');const encoder=new TextEncoder();return lines.map(line=>{let out='',size=0;for(const c of line){const n=encoder.encode(c).length;if(size+n>73){out+='\r\n ';size=1;}out+=c;size+=n;}return out;}).join('\r\n')+'\r\n';
}
