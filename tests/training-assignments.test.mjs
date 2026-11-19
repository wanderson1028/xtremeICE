import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
function fixture(user,org='A',owner='owner'){
 const users=[{id:'a',email:'a@example.test',organization_id:'A'},{id:'b',email:'b@example.test',organization_id:'B'}];
 const exercise={id:'e',app_organization_id:org,created_by_id:owner,assigned_emails:[]};const assignments=[];const writes=[];
 const client={auth:{me:async()=>user},asServiceRole:{entities:{User:{list:async()=>users},TrainingExercise:{get:async()=>exercise,update:async(id,data)=>{writes.push(data);Object.assign(exercise,data);}},TrainingAssignment:{filter:async()=>assignments,bulkCreate:async rows=>{assignments.push(...rows);writes.push(rows);}}}}};
 const code=ts.transpileModule(fs.readFileSync('base44/functions/trainingAssignments/entry.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;const exports={};vm.runInNewContext(code,{exports,require:()=>({createClientFromRequest:()=>client}),Response,Request});
 return {client,writes,assignments,call:async(body)=>{const r=await exports.default(new Request('https://example.test',{method:'POST',body:JSON.stringify({action:'assign',exercise_id:'e',...body})}));return {status:r.status,data:await r.json()};}};
}
const admin={id:'p',role:'admin',email:'p@example.test'};
test('platform cannot accidentally assign exercise A to tenant B learner',async()=>{const f=fixture(admin);assert.equal((await f.call({emails:['b@example.test']})).status,400);assert.equal(f.writes.length,0);});
test('creator moved to tenant B cannot distribute old tenant A exercise',async()=>{const f=fixture({id:'owner',role:'user',organization_id:'B'});assert.equal((await f.call({emails:['b@example.test']})).status,403);assert.equal(f.writes.length,0);});
test('unmapped exercise refuses whole-organization assignment',async()=>{const f=fixture(admin,'');assert.equal((await f.call({whole_organization:true})).status,400);assert.equal(f.writes.length,0);});
test('whole organization assignment stays scoped and repeat is idempotent',async()=>{const f=fixture(admin);assert.equal((await f.call({whole_organization:true})).data.created,1);assert.equal(f.assignments[0].assignee_email,'a@example.test');assert.equal((await f.call({whole_organization:true})).data.created,0);});
test('duplicate-check failure does not create assignments',async()=>{const f=fixture(admin);f.client.asServiceRole.entities.TrainingAssignment.filter=async()=>{throw new Error('Unavailable');};assert.equal((await f.call({emails:['a@example.test']})).status,500);assert.equal(f.writes.length,0);});
test('unrelated member cannot assign exercise',async()=>{const f=fixture({id:'member',role:'user',organization_id:'A'});assert.equal((await f.call({emails:['a@example.test']})).status,403);});
test('anonymous assignment is denied',async()=>{const f=fixture(null);assert.equal((await f.call({emails:['a@example.test']})).status,401);});
