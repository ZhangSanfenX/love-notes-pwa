import {test} from 'node:test';import assert from 'node:assert/strict';
import {months,toSolar,fromSolar,dateLabel} from '../lunar.js';
import {count,occurrence,reminders,validate,initial} from '../core.js';
test('HKO reference dates, 2033 leap November and every supported lunar day round trip',()=>{
 for(const [l,solar]of [[{year:2025,month:6,day:1,leap:true},'2025-07-25'],[{year:2033,month:11,day:1,leap:true},'2033-12-22'],[{year:2026,month:1,day:1,leap:false},'2026-02-17']]){assert.equal(toSolar(l),solar);assert.deepEqual(fromSolar(solar),l);}
 for(let y=1900;y<=2199;y++)for(const m of months(y))for(let d=1;d<=m.days;d++){const l={year:y,month:m.month,day:d,leap:m.leap};assert.deepEqual(fromSolar(toSolar(l)),l);}
 assert.throws(()=>toSolar({year:2026,month:6,day:1,leap:true}));assert.throws(()=>fromSolar('1900-01-01'));
});
test('lunar birthdays, leap fallback, small-month clamp and year-boundary advance reminders',()=>{
 const e={id:'lunar',title:'农历生日',calendar:'lunar',lunar:{year:2023,month:2,day:1,leap:true},date:'2023-03-22',type:'生日',annual:true,remind:true,advance:true};
 assert.equal(occurrence(e,'2024-03-01'),'2024-03-10');assert.equal(count(e,'2024-03-10').n,0);assert.equal(count({...e,inclusive:true},'2024-03-10').n,1);
 assert.equal(toSolar({year:2024,month:1,day:30,leap:false},true),toSolar({year:2024,month:1,day:29,leap:false}));
 const end={...e,lunar:{year:2025,month:12,day:29,leap:false},date:'2026-02-16'};assert.ok(reminders({events:[end]},'2026-02-13',1).some(x=>x.date==='2026-02-16'&&x.advance));
 assert.match(dateLabel(e),/闰二月/);const root=initial();root.events.push(e);assert.equal(validate(root),root);assert.throws(()=>validate({...root,events:[{...e,date:'2023-03-23'}]}));
});
test('elapsed lunar events and milestones use actual days and lunar anniversaries',()=>{
 const e={id:'love',title:'农历纪念',type:'纪念日',calendar:'lunar',lunar:{year:2026,month:1,day:1,leap:false},date:'2026-02-17',milestoneMaster:true,milestoneOptions:[{unit:'day',value:100,enabled:true},{unit:'year',value:1,enabled:true}],milestoneOn:true,milestoneAdvance:true};
 assert.equal(count(e,'2026-02-18').n,1);const entries=reminders({events:[e]},'2026-02-17',2);assert.ok(entries.some(x=>x.date==='2026-05-28'));assert.ok(entries.some(x=>x.date==='2027-02-06'));
});
