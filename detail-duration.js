import {count,occurrence,today,addDays} from './core.js';

const day=s=>Date.parse(s+'T00:00:00Z')/86400000;
function addMonths(s,n){
  const [y,m,d]=s.split('-').map(Number),first=new Date(Date.UTC(y,m-1+n,1));
  const last=new Date(Date.UTC(first.getUTCFullYear(),first.getUTCMonth()+1,0)).getUTCDate();
  first.setUTCDate(Math.min(d,last));return first.toISOString().slice(0,10);
}
// Clamp each anchor from the original date (Jan 31 -> Feb 28), never by stepping
// month-by-month. The interval uses the existing counter's inclusion rules.
export function durationParts(start,days,mode){
  days=Math.abs(days);
  if(mode===0)return [{n:days,u:'天'}];
  if(mode===1)return [{n:Math.floor(days/7),u:'周'},{n:days%7,u:'天'}];
  const end=addDays(start,days),step=mode===3?12:1;
  let months=(+end.slice(0,4)-+start.slice(0,4))*12+(+end.slice(5,7)-+start.slice(5,7));
  let whole=Math.floor(months/step),anchor=addMonths(start,whole*step);
  if(anchor>end){whole--;anchor=addMonths(start,whole*step);}
  return [{n:whole,u:mode===3?'年':'月'},{n:day(end)-day(anchor),u:'天'}];
}
export function detailDuration(e,mode,now=today()){
  const target=e.annual?occurrence(e,now):e.date;
  return durationParts(target<now?target:now,count(e,now).n,mode);
}
export const durationText=parts=>parts.map(p=>p.n+' '+p.u).join(' ');
