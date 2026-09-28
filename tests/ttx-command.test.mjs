
import {build} from "esbuild";import assert from "node:assert/strict";
globalThis.Deno={serve(){}};
const built=await build({entryPoints:["base44/functions/ttx-command/entry.ts"],bundle:true,write:false,platform:"node",format:"esm",plugins:[{name:"mock",setup(b){b.onResolve({filter:/^npm:/},()=>({path:"sdk",namespace:"mock"}));b.onLoad({filter:/.*/,namespace:"mock"},()=>({contents:"export const createClientFromRequest=()=>globalThis.client;"}));}}]});
const {handler}=await import("data:text/javascript;base64,"+Buffer.from(built.outputFiles[0].text).toString("base64"));
const sim=await build({entryPoints:["base44/functions/ttx-command/simulation.js"],bundle:true,write:false,platform:"node",format:"esm"});
const {buildNetwork}=await import("data:text/javascript;base64,"+Buffer.from(sim.outputFiles[0].text).toString("base64"));
let seq=0,who={id:"admin",email:"admin@test",role:"admin"},aiFail=false;
const rows={};
const db=new Proxy({}, {get:(_,name)=>({
 async filter(query={},sort,limit=200,offset=0){return (rows[name]||[]).filter(r=>Object.entries(query).every(([k,v])=>r[k]===v)).slice(offset,offset+limit).map(r=>structuredClone(r));},
 async list(){return structuredClone(rows[name]||[]);},
 async get(id){return structuredClone((rows[name]||[]).find(r=>r.id===id));},
 async create(data){const row={...structuredClone(data),id:"id"+String(++seq).padStart(5,"0"),created_date:new Date(1700000000000+seq*1000).toISOString()};(rows[name]??=[]).push(row);return structuredClone(row);},
 async update(id,data){const r=rows[name].find(r=>r.id===id);Object.assign(r,structuredClone(data));return structuredClone(r);}
})});
globalThis.client={auth:{me:async()=>who},asServiceRole:{entities:db},integrations:{Core:{InvokeLLM:async({prompt})=>{
 if(aiFail)throw Error("provider");
 const context=JSON.parse(prompt.split("\n")[1]),deps=context.departments;
 const dep=deps[context.previous.length%deps.length];
 return {phase:context.phase,department_id:dep.id,decision_owner:dep.roles[0],target_id:"identity",duration_hours:1,situation:"Review the current incident.",question:"What should your department do?",guidance_basis:"Preserve evidence",routing_reason:"Previous department handed off the incident.",plan_requirement_ids:[],choices:[90,50,10].map(points=>({label:"Response "+points,action:"coordinate",points,rationale:"Evidence-based response",consequence:"The team coordinates response.",plan_points:-1,plan_rationale:"Not assessed"}))};
}}}};
const user1={id:"u1",email:"u1@test",role:"user",organization_id:"org1"},user2={id:"u2",email:"u2@test",role:"user",organization_id:"org1"},outsider={id:"outsider",email:"out@test",role:"user",organization_id:"org2"};
rows.User=[who,user1,user2,outsider];
rows.UserService=[user1,user2,outsider].map(u=>({user_email:u.email,service_key:"tabletop_exercises"}));
rows.Organization=[{id:"org1",name:"One",status:"active"},{id:"org2",name:"Two",status:"active"}];
rows.TTXCompanyProfile=[{id:"profile",company_name:"One",industry:"Manufacturing",business_size:"small",owner_email:"admin@test",network_model:buildNetwork({industry:"Manufacturing",business_size:"small",employee_count:10})}];
let configId,sessionId;
async function call(action,more={},expected=200){const response=await handler(new Request("http://test",{method:"POST",body:JSON.stringify({action,config_id:configId,session_id:sessionId,...more})}));const data=await response.json();assert.equal(response.status,expected,JSON.stringify(data));return data;}
const departments=[{id:"a",name:"Security",roles:["CEO","CISO","CFO","COO"],approval_required:false},{id:"b",name:"Operations",roles:["CIO","Legal","Communications"],approval_required:false}];
const members=[{user_id:"u1",department_id:"a",access:"participant",responsibility:"decision_maker"},{user_id:"u2",department_id:"b",access:"participant",responsibility:"decision_maker"}];
configId=(await call("save_config",{organization_id:"org1",profile_id:"profile",departments,members,technical_context:{custom_nodes:[{id:"custom",name:"ERP",quantity:1,unit_cost:500,dependencies:["core"]}]}})).id;
const start={department_ids:["a","b"],member_ids:["u1","u2"],attack_category:"Ransomware",attack_scenario:"Encryption",entry_node:"identity",disaster_target:"backup"};
sessionId=(await call("start",start)).session_id;
assert.equal(rows.TTXCommandSession[0].snapshot.profile.network_model.nodes.at(-1).name,"ERP");
who=outsider;await call("view",{},403);who=user1;
aiFail=true;await call("generate",{},503);aiFail=false;
await call("generate");
let v=await call("view");assert.equal(v.current.choices[0].points,undefined);assert.ok(!("plan_requirement_ids" in v.current));
const qid=v.current.id;
who=user2;let other=await call("view");assert.equal(other.current,null);await call("answer",{question_id:qid,choice_id:v.current.choices[0].id},403);
who=user1;await call("ack",{question_id:qid});
const handoff={action:"Contain affected accounts",impact:"Production dependency requires review",unresolved:"Confirm the full affected system scope"};
const choice=rows.TTXCommandEvent.find(e=>e.kind==="question").payload.question.choices.find(c=>c.points===90);
await call("answer",{question_id:qid,choice_id:choice.id,handoff,points:1000});
await call("answer",{question_id:qid,choice_id:choice.id,handoff},409);
await call("generate");who=user2;v=await call("view");assert.equal(v.timeline.length,1);assert.equal(v.current.department_id,"b");
await call("request",{to_department:"a",message:"Confirm affected systems"});who=user1;v=await call("view");await call("reply",{request_id:v.requests[0].id,message:"Affected systems confirmed"});
who={id:"admin",email:"admin@test",role:"admin"};await call("pause");who=user2;await call("answer",{question_id:v.current?.id},409);who={id:"admin",email:"admin@test",role:"admin"};await call("resume");
for(let i=1;i<9;i++){
 who=i%2?user2:user1;v=await call("view");const q=rows.TTXCommandEvent.find(e=>e.id===v.current.id).payload.question;
 await call("answer",{question_id:v.current.id,choice_id:q.choices.find(c=>c.points===90).id,handoff});
 await call("generate");
}
who={id:"admin",email:"admin@test",role:"admin"};await call("complete");v=await call("view");assert.equal(v.result.overall_score,90);assert.equal(v.result.decisions.length,9);assert.equal(Object.keys(v.result.department_scores).length,2);assert.ok(v.result.end_state_overview);
who=user1;assert.equal((await call("view")).result,null);
who={id:"admin",email:"admin@test",role:"admin"};await call("release");who=user1;v=await call("view");assert.deepEqual(Object.keys(v.result.department_scores),["a"]);
await call("answer",{},409);
rows.TTXCommandConfig[0].members[0].active=false;await call("view",{},403);
console.log("PASS: organization isolation, existing feature gate, custom systems, AI retry, hidden scores, department routing, duplicate-answer rejection, shared handoff, parallel requests, pause/resume, nine-category completion, stable scoring, report release, department-only results, membership revocation.");

who={id:"admin",email:"admin@test",role:"admin"};
const approver={id:"u3",email:"u3@test",role:"user",organization_id:"org1"};rows.User.push(approver);rows.UserService.push({user_email:approver.email,service_key:"tabletop_exercises"});
await call("save_config",{organization_id:"org1",profile_id:"profile",departments:departments.map(d=>({...d,approval_required:d.id==="a"})),members:[...members,{user_id:"u3",department_id:"a",access:"participant",responsibility:"approver"}]});
sessionId=(await call("start",{...start,member_ids:["u1","u2","u3"]})).session_id;
await call("generate");who=user1;v=await call("view");
const firstQuestionId=v.current.id, firstQuestion=rows.TTXCommandEvent.find(e=>e.id===firstQuestionId).payload.question;
const low=firstQuestion.choices.find(c=>c.points===10);
await call("answer",{question_id:firstQuestionId,choice_id:low.id,handoff});
v=await call("view");assert.equal(v.timeline.length,0);assert.ok(v.proposal);
await call("approve",{question_id:firstQuestionId,proposal_id:v.proposal.id},403);
who=approver;await call("approve",{question_id:firstQuestionId,proposal_id:v.proposal.id});
await call("generate");who=user2;v=await call("view");
assert.equal(v.current.phase,"preparation_governance");assert.equal(v.timeline[0].approved_by,approver.email);
const q2=rows.TTXCommandEvent.find(e=>e.id===v.current.id).payload.question;
await call("answer",{question_id:v.current.id,choice_id:q2.choices.find(c=>c.points===90).id,handoff});
await call("generate");who=user1;v=await call("view");assert.equal(v.current.phase,"detection_analysis");
rows.UserService=rows.UserService.filter(g=>g.user_email!==user1.email);await call("view",{},403);
console.log("PASS: separate approval authority, decisions pending until approved, adaptive low-score follow-up, category progression, and feature revocation.");
