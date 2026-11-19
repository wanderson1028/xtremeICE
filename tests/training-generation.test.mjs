import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import { evaluateExercise } from '../src/lib/trainingScoring.js';
const compile=(path,require)=>{const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(path,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require,Response,Request});return exports;};
async function generate(user,assignments,body){let aiCalls=0;const client={auth:{me:async()=>user},asServiceRole:{entities:{UserService:{filter:async()=>assignments}}},integrations:{Core:{InvokeLLM:async()=>{aiCalls++;throw new Error('AI must not run for invalid inputs');}}}};const access=compile('base44/shared/featureAccess.ts',()=>{});const fn=compile('base44/functions/generateTrainingExercise/entry.ts',name=>name.includes('featureAccess')?access:{createClientFromRequest:()=>client}).default;const response=await fn(new Request('https://example.test',{method:'POST',body:JSON.stringify(body)}));return {status:response.status,aiCalls};}
test('generation denies anonymous callers',async()=>{assert.equal((await generate(null,[],{})).status,401);});
test('generation denies unassigned member before AI call',async()=>{const r=await generate({role:'user',email:'u@example.test'},[],{});assert.equal(r.status,403);assert.equal(r.aiCalls,0);});
test('generation denies viewer before AI call',async()=>{const r=await generate({role:'user',email:'u@example.test'},[{service_key:'training_designer',access_level:'viewer'}],{});assert.equal(r.status,403);assert.equal(r.aiCalls,0);});
test('editor generation validates missing roles',async()=>{const r=await generate({role:'user',email:'u@example.test'},[{service_key:'training_designer',access_level:'editor'}],{});assert.equal(r.status,400);assert.equal(r.aiCalls,0);});
test('admin generation validates missing findings',async()=>{const r=await generate({role:'admin'},[],{nice_roles:[{name:'Analyst'}]});assert.equal(r.status,400);assert.equal(r.aiCalls,0);});
const tasks=[{id:'m',type:'mcq',correct_option_id:'yes',options:[{id:'yes',text:'Yes'},{id:'no',text:'No'}]},{id:'h',type:'hotspot',correct_region_id:'target',hotspot_regions:[{id:'target',label:'Target'}]},{id:'p',type:'matching',matching_prompts:[{id:'one',text:'One'}],matching_choices:[{id:'two',text:'Two'}],matching_answer:{one:'two'}}];
test('unanswered interactive exercise scores zero',()=>assert.equal(evaluateExercise(tasks,{}).score,0));
test('wrong interactive answers do not earn credit',()=>assert.equal(evaluateExercise(tasks,{m:'no',h:'wrong',p:{one:'wrong'}}).score,0));
test('all correct interactive answers score 100',()=>assert.equal(evaluateExercise(tasks,{m:'yes',h:'target',p:{one:'two'}}).score,100));
test('one correct of three tasks rounds to 33',()=>assert.equal(evaluateExercise(tasks,{m:'yes'}).score,33));
