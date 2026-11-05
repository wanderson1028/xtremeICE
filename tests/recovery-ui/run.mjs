import fs from "node:fs";
import path from "node:path";
import {fileURLToPath,pathToFileURL} from "node:url";
import assert from "node:assert/strict";
import {build} from "esbuild";
import React,{act} from "react";
import {createRoot} from "react-dom/client";
import {MemoryRouter} from "react-router-dom";

const directory=path.dirname(fileURLToPath(import.meta.url)),app=path.resolve(directory,"../..");
const jsdomUrl=process.env.RECOVERY_TEST_MODULES?pathToFileURL(path.join(process.env.RECOVERY_TEST_MODULES,"jsdom/lib/api.js")).href:"jsdom";
const {JSDOM}=await import(jsdomUrl);
const dom=new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>",{url:"http://localhost/"});
for(const key of ["window","document","navigator","HTMLElement","Event","MouseEvent"])Object.defineProperty(globalThis,key,{value:dom.window[key],configurable:true});
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const original={setTimeout,clearTimeout,setInterval,clearInterval,now:Date.now,fetch};
let time=Date.parse("2026-01-03T12:00:00Z"),next=0,timers=new Map(),root,calls=[],config;
globalThis.setTimeout=(callback,delay=0)=>{const id=++next;timers.set(id,{callback,at:time+delay});return id;};
globalThis.setInterval=(callback,delay=0)=>{const id=++next;timers.set(id,{callback,at:time+delay,interval:delay});return id;};
globalThis.clearTimeout=globalThis.clearInterval=id=>timers.delete(id);
Date.now=()=>time;
let networkAttempts=0;
globalThis.fetch=async()=>{networkAttempts++;throw Error("Network forbidden in recovery UI tests");};
const flush=()=>act(async()=>{for(let i=0;i<12;i++)await Promise.resolve();});
async function advance(ms){
 const end=time+ms;
 for(let guard=0;guard<1000;guard++){
  const due=[...timers.entries()].filter(([,t])=>t.at<=end).sort((a,b)=>a[1].at-b[1].at)[0];
  if(!due)break;
  const [id,t]=due;time=t.at;if(t.interval)t.at+=t.interval;else timers.delete(id);
  await act(async()=>{t.callback();for(let i=0;i<12;i++)await Promise.resolve();});
 }
 time=end;await flush();
}
const mock=`
export const base44={auth:{me:async()=>globalThis.__recoveryMe}};
export const learnerCall=async(action,fields={})=>globalThis.__recoveryCall(action,fields);
export const learnerError=e=>e?.response?.data?.error||e.message;
`;
const bundle=await build({
 absWorkingDir:app,stdin:{contents:'export {default as LearnerWorkspace} from "./src/pages/LearnerWorkspace.jsx"; export {default as LifecycleDiagnostics} from "./src/pages/LifecycleDiagnostics.jsx";',resolveDir:app,loader:"jsx"},
 bundle:true,format:"esm",platform:"node",write:false,packages:"external",
 plugins:[{name:"no-cloud-test-client",setup(b){
  b.onResolve({filter:/^@\//},args=>{
   if(/^@\/(api\/base44Client|lib\/cloudLearnerClient)$/.test(args.path))return {path:args.path,namespace:"mock"};
   const target=path.join(app,"src",args.path.slice(2));for(const suffix of ["",".js",".jsx",".ts"])if(fs.existsSync(target+suffix)&&fs.statSync(target+suffix).isFile())return {path:target+suffix};
   throw Error("Unresolved test alias "+args.path);
  });
  b.onLoad({filter:/.*/,namespace:"mock"},()=>({contents:mock,loader:"js"}));
 }}],
});
const temporary=fs.mkdtempSync(path.join(directory,".tmp-")),modulePath=path.join(temporary,"components.mjs");
fs.writeFileSync(modulePath,bundle.outputFiles[0].text);
const components=await import(pathToFileURL(modulePath).href);
const copy=value=>JSON.parse(JSON.stringify(value));
const id="0123456789abcdef01234567";
function reset(){
 time=Date.parse("2026-01-03T12:00:00Z");timers.clear();calls=[];window.localStorage.clear();
 config={
  me:{id:"learner",role:"user",email:"learner@example.invalid"},
  run:{id,owner_user_id:"learner",status:"ready",expires_at:new Date(time+3600000).toISOString(),contract:{assignment_id:"assignment",path:"/fixture/proof.txt",template_snapshot:{title:"Recovery test lab",objectives:["Protect the file"],lab_content:{tasks:[{title:"Permissions",instructions:"Use the fixture"}]}},learning:{}}},
  assignments:[{id:"assignment",title:"Recovery test lab",available:true}],
  assignmentDeferred:null,pending:null,refreshErrors:0,assignmentErrors:0,pollErrors:0,pollPending:false,diagnosticErrors:0,denyDiagnostics:false,
  diagnostics:{generated_at:new Date(time).toISOString(),capacity:{held:false,record_count_at_least:0,guest_limit:1},active:[],legacy:[],recent:[],truncated:{active:false,legacy:false,recent:false,operations:false},notes:["Saved records only. No AWS check."]},
 };
 globalThis.__recoveryMe=config.me;
 globalThis.__recoveryCall=async(action,fields)=>{
  calls.push({action,fields,time});
  if(action==="assignedLabs"){if(config.assignmentDeferred)await config.assignmentDeferred;if(config.assignmentErrors-->0)throw Error("Assignment refresh unavailable");return {assignments:copy(config.assignments),capacity_available:config.run.status==="terminated"};}
  if(action==="list")return {runs:[copy(config.run)]};
  if(action==="workspaceState")return {run:copy(config.run),pending_operation:copy(config.pending)};
  if(action==="validationHistory")return {checks:[]};
  if(action==="refresh"){if(config.refreshErrors-->0)throw Error("Provider unavailable");return {run:copy(config.run)};}
  if(action==="startOperation")return {operation_id:"operation",kind:fields.kind};
  if(action==="pollOperation"){
   if(config.pollErrors-->0)throw Error("Action status unavailable");
   return config.pollPending?{status:"pending"}:{status:"completed",result:{content:"fixture contents",mode:"600",passed:true}};
  }
  if(action==="verifyRemoval")return {verified:true,remaining:[]};
  if(action==="operatorAlerts")return {subject_id:config.me.id,scope:"69a0a5a90473fac0aa3ea135:design-studio-integration",checked_at:new Date(time).toISOString(),alerts:[],cleared_keys:[],workflow:{available:true,status:"active",last_run_at:new Date(time).toISOString()},pilot:{guest_limit:1,ttl_minutes:110}};
  if(action==="lifecycleDiagnostics"){
   if(config.denyDiagnostics)throw Object.assign(Error("Instructor access required"),{response:{status:403,data:{error:"Instructor access required"}}});
   if(config.diagnosticErrors-->0)throw Error("Records unavailable");
   return copy(config.diagnostics);
  }
  throw Error("Unexpected action "+action);
 };
}
async function mount(name,props){
 if(name==="LifecycleDiagnostics")config.me.role="admin";
 await act(async()=>{root=createRoot(document.getElementById("root"));root.render(React.createElement(MemoryRouter,{initialEntries:["/LearnerWorkspace?run="+id],future:{v7_startTransition:true,v7_relativeSplatPath:true}},React.createElement(components[name],props)));});
 await flush();
}
async function unmount(){if(root){await act(async()=>root.unmount());root=null;}timers.clear();}
const body=()=>document.body.textContent;
const button=label=>[...document.querySelectorAll("button")].find(b=>b.textContent===label);
async function click(label){const b=button(label);assert.ok(b,"Missing button "+label);assert.equal(b.disabled,false,"Button disabled "+label);await act(async()=>b.click());await flush();}
const count=action=>calls.filter(c=>c.action===action).length;
const results=[];
async function test(name,fn){
 reset();try{await fn();assert.equal(networkAttempts,0,"Unexpected network request");results.push({name,status:"passed"});console.log("PASS "+name);}
 catch(e){results.push({name,status:"failed",error:e.message});console.error("FAIL "+name+": "+e.message);}
 finally{await unmount();}
}
try{
 await test("ready-session provider outage retries and clears warning after recovery",async()=>{
  await mount("LearnerWorkspace");config.refreshErrors=1;await advance(15000);
  assert.match(body(),/Status could not be verified/);await advance(4000);
  assert.doesNotMatch(body(),/Status could not be verified/);assert.equal(count("refresh"),2);
 });
 await test("assignment refresh outage increases backoff across repeated failures",async()=>{
  await mount("LearnerWorkspace");config.assignmentErrors=3;await advance(15000);await advance(4000);await advance(8000);
  assert.equal(count("refresh"),3);await advance(15999);assert.equal(count("refresh"),3);await advance(1);assert.equal(count("refresh"),4);
  assert.doesNotMatch(body(),/Status could not be verified/);
 });
 await test("pending read survives poll outage and never dispatches a duplicate",async()=>{
  await mount("LearnerWorkspace");config.pollErrors=1;await click("Load file from guest");
  assert.match(body(),/Guest action status could not be verified/);assert.equal(button("Load file from guest").disabled,true);
  await advance(4000);assert.equal(count("startOperation"),1);assert.equal(count("pollOperation"),2);
  assert.equal(document.querySelector("textarea").value,"fixture contents");assert.equal(button("Load file from guest").disabled,false);
  assert.doesNotMatch(body(),/Guest action status could not be verified/);
 });
 await test("session refresh success does not hide an unresolved guest-action outage",async()=>{
  config.pending={id:"operation",kind:"read"};config.pollErrors=20;await mount("LearnerWorkspace");
  await advance(15000);assert.equal(count("refresh"),1);assert.match(body(),/Guest action status could not be verified/);
  assert.equal(button("Load file from guest").disabled,true);assert.equal(count("startOperation"),0);
 });
 await test("reopened session resumes stored command without starting another",async()=>{
  config.pending={id:"stored-operation",kind:"read"};await mount("LearnerWorkspace");
  assert.equal(count("startOperation"),0);assert.equal(count("pollOperation"),1);
  assert.equal(calls.find(c=>c.action==="pollOperation").fields.operation_id,"stored-operation");
  assert.equal(document.querySelector("textarea").value,"fixture contents");
 });
 await test("assignment revocation removes guest controls on the next refresh",async()=>{
  await mount("LearnerWorkspace");config.assignments=[];await advance(15000);
  assert.match(body(),/Your assignment was revoked/);assert.equal(button("Load file from guest"),undefined);
 });
 await test("cleanup marker blocks guest controls even while saved status is ready",async()=>{
  config.run.cleanup_requested_at=new Date(time).toISOString();await mount("LearnerWorkspace");
  assert.equal(button("Load file from guest"),undefined);assert.ok(button("Finish lab and release environment"));
 });
 await test("cleanup transition shows verified release and retains earned completion",async()=>{
  config.run.status="cleanup_pending";config.run.contract.learning.completed_at=new Date(time).toISOString();
  await mount("LearnerWorkspace");assert.match(body(),/Releasing the environment/);config.refreshErrors=1;await advance(2000);assert.match(body(),/Status could not be verified/);let releaseAssignments;config.assignmentDeferred=new Promise(resolve=>{releaseAssignments=resolve;});config.run.status="terminated";await advance(4000);
  assert.match(body(),/Environment released. AWS removal verified/);assert.doesNotMatch(body(),/Status could not be verified/);assert.match(body(),/Task completed/);assert.equal(count("verifyRemoval"),1);
  assert.equal(button("Load file from guest"),undefined);await act(async()=>releaseAssignments());config.assignmentDeferred=null;
 });
 await test("instructor records retain stale snapshot on refresh failure then recover",async()=>{
  await mount("LifecycleDiagnostics");config.diagnosticErrors=1;await click("Refresh records");assert.match(body(),/records below are stale/);
  assert.match(body(),/No saved active sessions/);await click("Refresh records");assert.doesNotMatch(body(),/stale/);
  assert.ok(calls.every(c=>["lifecycleDiagnostics","operatorAlerts"].includes(c.action)),"Read-only action only");
 });
 await test("learner cannot load instructor records",async()=>{
  config.denyDiagnostics=true;await mount("LifecycleDiagnostics");assert.match(body(),/Instructor access required/);assert.doesNotMatch(body(),/No saved active sessions/);
 });
 await test("instructor view drops old records if a later refresh loses authorization",async()=>{
  await mount("LifecycleDiagnostics");config.denyDiagnostics=true;await click("Refresh records");
  assert.match(body(),/Instructor access required/);assert.doesNotMatch(body(),/No saved active sessions/);
 });
 await test("instructor view marks partial results and never invents provider health",async()=>{
  config.diagnostics.truncated.operations=true;
  config.diagnostics.active=[{id:"run",source:"learner",title:"Stuck lab",learner_email:"learner@example.invalid",status:"cleanup_pending",attention:["Cleanup has been waiting at least 15 minutes"],pending_operations:1,uncertain_operations:1,overdue_operations:0}];
  config.diagnostics.capacity={held:true,record_count_at_least:1,guest_limit:1};
  await mount("LifecycleDiagnostics");assert.match(body(),/Results are limited/);assert.match(body(),/Last successful provider checkNot recorded/);assert.match(body(),/Cleanup has been waiting/);
  assert.ok(calls.every(c=>["lifecycleDiagnostics","operatorAlerts"].includes(c.action)));
 });
 const report={simulated:true,network_attempts:networkAttempts,passed:results.filter(r=>r.status==="passed").length,failed:results.filter(r=>r.status==="failed").length,results};
 console.log(JSON.stringify(report,null,2));if(process.env.RECOVERY_TEST_REPORT)fs.writeFileSync(process.env.RECOVERY_TEST_REPORT,JSON.stringify(report,null,2)+"\n");
 if(report.failed)process.exitCode=1;
}finally{
 await unmount();Object.assign(globalThis,{setTimeout:original.setTimeout,clearTimeout:original.clearTimeout,setInterval:original.setInterval,clearInterval:original.clearInterval,fetch:original.fetch});Date.now=original.now;
 dom.window.close();
 fs.unlinkSync(modulePath);fs.rmdirSync(temporary);
}
