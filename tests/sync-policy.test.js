import {test} from 'node:test';
import assert from 'node:assert/strict';
import {indexRevision,syncDelay} from '../sync-policy.js';
test('lightweight revision ignores index ordering but detects edits, replies and visibility changes',()=>{const a={id:'a',scope:'shared',version:1,responseRevision:0,owner:'u',author:'ZYW',username:'ZYW'},b={...a,id:'b',scope:'private'};assert.equal(indexRevision([a,b]),indexRevision([b,a]));for(const patch of [{version:2},{responseRevision:1},{deleted:true},{scope:'private'},{author:'new name'}])assert.notEqual(indexRevision([a,b]),indexRevision([{...a,...patch},b]));assert.notEqual(indexRevision([a,b]),indexRevision([a]));});
test('foreground checks are modest and failed connections back off to five minutes',()=>{assert.equal(syncDelay(true),20000);assert.equal(syncDelay(false),60000);assert.equal(syncDelay(true,1),40000);assert.equal(syncDelay(true,2),80000);assert.equal(syncDelay(true,10),300000);assert.equal(syncDelay(false,10),300000);});
