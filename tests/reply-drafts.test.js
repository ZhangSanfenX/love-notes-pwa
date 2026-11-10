import test from 'node:test';
import assert from 'node:assert/strict';
import {ReplyDrafts} from '../reply-drafts.js';
test('unsigned replies stay in memory, isolated by account/note/message and reset with runtime',()=>{
 const d=new ReplyDrafts(),value={comment:'我再看看原文',reaction:{mood:29,tiger:false},selectionStart:3};
 d.put('A','one','new',value);value.reaction.mood=0;
 assert.equal(d.get('A','one','new').reaction.mood,29);assert.equal(d.get('A','two','new'),undefined);assert.equal(d.get('A','one','edit-id'),undefined);
 d.put('A','one','edit-id',{comment:'编辑中的回应'});d.remove('A','one','new');assert.equal(d.get('A','one','new'),undefined);assert.equal(d.get('A','one','edit-id').comment,'编辑中的回应');
 assert.equal(d.get('B','one','edit-id'),undefined);assert.equal(d.get('A','one','edit-id'),undefined);
 d.put('A','one','new',value);assert.equal(new ReplyDrafts().get('A','one','new'),undefined);d.clear();assert.equal(d.get('A','one','new'),undefined);
});
