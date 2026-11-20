import test from 'node:test';
import assert from 'node:assert/strict';
import {durationParts,detailDuration} from '../detail-duration.js';
import {count} from '../core.js';
const values=p=>p.map(x=>x.n);
test('detail units use complete calendar anchors, including month ends and leap days',()=>{
  assert.deepEqual(values(durationParts('2026-03-22',244,1)),[34,6]);
  assert.deepEqual(values(durationParts('2026-03-22',244,2)),[7,30]);
  assert.deepEqual(values(durationParts('2026-03-22',244,3)),[0,244]);
  assert.deepEqual(values(durationParts('2026-01-31',28,2)),[1,0]);
  assert.deepEqual(values(durationParts('2026-01-31',27,2)),[0,27]);
  assert.deepEqual(values(durationParts('2024-02-29',365,3)),[1,0]);
  assert.deepEqual(values(durationParts('2024-02-29',366,3)),[1,1]);
  assert.deepEqual(values(durationParts('2026-01-01',0,3)),[0,0]);
});
test('all detail modes retain the existing counter interval without mutating events',()=>{
  for(const date of ['2024-02-29','2026-11-20','2026-12-31'])for(const annual of [false,true])for(const inclusive of [false,true])for(const type of ['纪念日','倒数日']){
    const e={date,annual,inclusive,type},before=JSON.stringify(e),now='2026-11-20';
    assert.equal(detailDuration(e,0,now)[0].n,Math.abs(count(e,now).n));
    const weeks=detailDuration(e,1,now);assert.equal(weeks[0].n*7+weeks[1].n,Math.abs(count(e,now).n));
    for(const mode of [2,3]){const parts=detailDuration(e,mode,now);assert.ok(parts.every(x=>Number.isInteger(x.n)&&x.n>=0));}
    assert.equal(JSON.stringify(e),before);
  }
});
