import test from 'node:test';
import assert from 'node:assert/strict';
import {retryableSave} from '../src/lib/retryableSave.js';
test('failed save retries the original immutable result',async()=>{let n=0;const payload={score:80,actions:[{id:'a'}]};const seen=[];const save=retryableSave(payload,async p=>{seen.push(p);if(++n===1)throw Error('offline');return {id:'saved'};});await assert.rejects(save());payload.score=0;payload.actions[0].id='changed';assert.deepEqual(await save(),{id:'saved'});assert.deepEqual(seen[1],{score:80,actions:[{id:'a'}]});});
test('concurrent retry clicks create only one result',async()=>{let n=0;let release;const save=retryableSave({},()=>{n++;return new Promise(r=>release=r);});const a=save(),b=save();await Promise.resolve();assert.equal(n,1);release({id:'s'});assert.deepEqual(await Promise.all([a,b]),[{id:'s'},{id:'s'}]);});
test('successful save is reused without another create',async()=>{let n=0;const save=retryableSave({},async()=>{n++;return {id:'s'};});await save();await save();assert.equal(n,1);});
