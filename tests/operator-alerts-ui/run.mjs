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
 absWorkingDir:app,stdin:{contents:'export {default as LearnerWorkspace} from "./src/pages/LearnerWorkspace.jsx"; export {default as LifecycleDiagnostics} from "./src/pages/LifecycleDiagnostics.jsx"; export {default as OperatorAlerts} from "./src/pages/OperatorAlerts.jsx"; export {default as OperatorAlertBanner} from "./src/components/OperatorAlertBanner.jsx"; export * from "./src/lib/operatorAlertState.js";',resolveDir:app,loader:"jsx"},
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
  me:{id:"instructor",role:"admin",email:"instructor@example.invalid"},
  run:{id,owner_user_id:"learner",status:"ready",expires_at:new Date(time+3600000).toISOString(),contract:{assignment_id:"assignment",path:"/fixture/proof.txt",template_snapshot:{title:"Recovery test lab",objectives:["Protect the file"],lab_content:{tasks:[{title:"Permissions",instructions:"Use the fixture"}]}},learning:{}}},
  assignments:[{id:"assignment",title:"Recovery test lab",available:true}],
  workflowOverride:null,alertCandidates:[{key:"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.cleanup_overdue",code:"cleanup_overdue",severity:"high",title:"Lab cleanup is delayed",next_step:"Review the recovery overview.",source_type:"learner",run_id:id}],clearKeys:[],alertErrors:0,denyAlerts:false,subjectOverride:null,alertSequence:0,alertDeferred:null,
  pending:null,refreshErrors:0,assignmentErrors:0,pollErrors:0,pollPending:false,diagnosticErrors:0,denyDiagnostics:false,
  diagnostics:{generated_at:new Date(time).toISOString(),capacity:{held:false,record_count_at_least:0,guest_limit:1},active:[],legacy:[],recent:[],truncated:{active:false,legacy:false,recent:false,operations:false},notes:["Saved records only. No AWS check."]},
 };
 globalThis.__recoveryMe=config.me;
 globalThis.__recoveryCall=async(action,fields)=>{
  calls.push({action,fields,time});
  if(action==="assignedLabs"){if(config.assignmentErrors-->0)throw Error("Assignment refresh unavailable");return {assignments:copy(config.assignments),capacity_available:config.run.status==="terminated"};}
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
  if(action==="operatorAlerts"){
   if(config.denyAlerts)throw Object.assign(Error("Instructor access required"),{response:{status:403}});
   if(config.alertErrors-->0)throw Error("Alert records unavailable");
   if(config.alertDeferred)await config.alertDeferred;
   return {subject_id:config.subjectOverride||config.me.id,scope:"69a0a5a90473fac0aa3ea135:design-studio-integration",checked_at:new Date(time+ ++config.alertSequence).toISOString(),alerts:copy(config.alertCandidates),cleared_keys:copy(config.clearKeys),workflow:config.workflowOverride||{available:true,status:"active",last_run_at:new Date(time).toISOString()},pilot:{guest_limit:1,ttl_minutes:110}};
  }
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
 await test("admin sees actionable in-app alerts without resource actions",async()=>{
  await mount("OperatorAlerts");assert.match(body(),/Lab cleanup is delayed/);assert.match(body(),/1 unacknowledged/);
  assert.match(body(),/Email and background notifications are not enabled/);
  assert.ok(calls.every(c=>c.action==="operatorAlerts"));assert.equal(networkAttempts,0);
 });
 await test("acknowledgment survives reopening for the same instructor",async()=>{
  await mount("OperatorAlerts");await click("Acknowledge");assert.match(body(),/Acknowledged in this browser/);
  await unmount();await mount("OperatorAlerts");assert.equal(button("Acknowledged").disabled,true);assert.match(body(),/0 unacknowledged/);
  assert.equal(count("operatorAlerts"),2);
 });
 await test("persisted cache contains no run identities, private titles or incident details",async()=>{
  config.alertCandidates[0].title="PRIVATE_TITLE";config.alertCandidates[0].next_step="PRIVATE_DETAIL";
  await mount("OperatorAlerts");await click("Acknowledge");
  const raw=window.localStorage.getItem(components.alertStorageKey(config.me.id));
  assert.ok(raw);assert.ok(!raw.includes(id)&&!raw.includes("PRIVATE_")&&!raw.includes(config.me.email)&&!raw.includes("run_id"));
 });
 await test("repeated checks deduplicate incidents and preserve acknowledgment",async()=>{
  config.alertCandidates.push(copy(config.alertCandidates[0]));await mount("OperatorAlerts");await click("Acknowledge");
  await advance(60000);assert.equal(document.querySelectorAll("article").length,1);assert.match(body(),/Occurrence 1/);
  assert.equal(button("Acknowledged").disabled,true);
 });
 await test("fresh explicit recovery resolves an alert and recurrence reopens it",async()=>{
  await mount("OperatorAlerts");await click("Acknowledge");const original=copy(config.alertCandidates[0]);
  config.alertCandidates=[];config.clearKeys=[original.key];await click("Refresh alerts");
  assert.match(body(),/Recently resolved in this browser/);assert.match(body(),/No current operator warnings/);
  config.alertCandidates=[original];config.clearKeys=[];await click("Refresh alerts");
  assert.match(body(),/Occurrence 2/);assert.equal(button("Acknowledge").disabled,false);assert.match(body(),/1 unacknowledged/);
 });
 await test("incomplete or unknown source checks keep prior alerts unresolved",async()=>{
  await mount("OperatorAlerts");config.alertCandidates=[{key:"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.monitor_unavailable",code:"monitor_unavailable",severity:"warning",title:"Expiry workflow status could not be verified",next_step:"Inspect workflow.",source_type:"workflow",run_id:null}];config.clearKeys=[];
  await click("Refresh alerts");assert.match(body(),/Previously detected; this snapshot could not recheck it/);assert.match(body(),/Lab cleanup is delayed/);
  assert.doesNotMatch(body(),/No current operator warnings/);
 });
 await test("failed snapshot reads retain stale warnings instead of claiming healthy",async()=>{
  await mount("OperatorAlerts");config.alertErrors=1;await click("Refresh alerts");
  assert.match(body(),/previous alert snapshot is stale/);assert.match(body(),/Lab cleanup is delayed/);assert.doesNotMatch(body(),/No current operator warnings/);
 });
 await test("initial source failure does not render a healthy empty state",async()=>{
  config.alertErrors=1;await mount("OperatorAlerts");assert.match(body(),/Alert records unavailable/);assert.doesNotMatch(body(),/No current operator warnings/);
 });
 await test("permission loss clears incident details and local acknowledgment metadata",async()=>{
  await mount("OperatorAlerts");await click("Acknowledge");config.denyAlerts=true;await click("Refresh alerts");
  assert.match(body(),/Instructor access required/);assert.doesNotMatch(body(),/Lab cleanup is delayed/);assert.doesNotMatch(body(),new RegExp(id));
  assert.equal(window.localStorage.getItem(components.alertStorageKey(config.me.id)),null);
 });
 await test("learner role is rejected before requesting alert metadata",async()=>{
  config.me.role="user";await mount("OperatorAlerts");assert.match(body(),/Instructor access required/);assert.equal(count("operatorAlerts"),0);
  assert.doesNotMatch(body(),/Lab cleanup is delayed/);
 });
 await test("account changes do not inherit another instructor's acknowledgment",async()=>{
  await mount("OperatorAlerts");await click("Acknowledge");config.me.id="second-instructor";await click("Refresh alerts");
  assert.equal(button("Acknowledge").disabled,false);assert.match(body(),/1 unacknowledged/);
 });
 await test("mismatched response identity is rejected and clears privileged data",async()=>{
  await mount("OperatorAlerts");config.subjectOverride="another-admin";await click("Refresh alerts");
  assert.match(body(),/signed-in account changed/);assert.doesNotMatch(body(),/Lab cleanup is delayed/);
 });
 await test("corrupt or future-dated local metadata cannot suppress fresh warnings",async()=>{
  window.localStorage.setItem(components.alertStorageKey(config.me.id),"{broken");
  await mount("OperatorAlerts");assert.match(body(),/Lab cleanup is delayed/);
  const future=components.parseAlertCache(JSON.stringify({scope:components.ALERT_SCOPE,checked_at:new Date(time+600000).toISOString(),entries:{}}));assert.equal(future.checked_at,null);
 });
 await test("storage failure warns that acknowledgment persistence is unavailable",async()=>{
  const original=window.Storage.prototype.setItem;window.Storage.prototype.setItem=()=>{throw Error("storage denied");};
  try{await mount("OperatorAlerts");assert.match(body(),/Acknowledgments cannot be saved/);await click("Acknowledge");assert.match(body(),/Acknowledged in this browser/);}
  finally{window.Storage.prototype.setItem=original;}
 });
 await test("polling backs off on repeated errors then resumes normal checks",async()=>{
  config.alertErrors=2;await mount("OperatorAlerts");assert.equal(count("operatorAlerts"),1);
  await advance(60000);assert.equal(count("operatorAlerts"),2);await advance(119999);assert.equal(count("operatorAlerts"),2);
  await advance(1);assert.equal(count("operatorAlerts"),3);assert.doesNotMatch(body(),/Alert records unavailable/);
  await advance(60000);assert.equal(count("operatorAlerts"),4);
 });
 await test("a pending alert request never overlaps another scheduled request",async()=>{
  let release;config.alertDeferred=new Promise(resolve=>{release=resolve;});await mount("OperatorAlerts");
  assert.equal(count("operatorAlerts"),1);await advance(120000);assert.equal(count("operatorAlerts"),1);
  await act(async()=>release());config.alertDeferred=null;await flush();assert.match(body(),/Lab cleanup is delayed/);
 });
 await test("instructor banner surfaces alerts through the read-only endpoint",async()=>{
  await mount("OperatorAlertBanner",{enabled:true});assert.match(body(),/1 unresolved alert/);
  assert.equal(document.querySelector("a").getAttribute("href"),"/OperatorAlerts");assert.ok(calls.every(c=>c.action==="operatorAlerts"));
 });
 await test("disabled instructor banner makes no metadata request",async()=>{
  await mount("OperatorAlertBanner",{enabled:false});await advance(120000);assert.equal(count("operatorAlerts"),0);
 });
 await test("older snapshots cannot resolve newer incidents",async()=>{
  const empty=components.parseAlertCache(null),current={scope:components.ALERT_SCOPE,checked_at:new Date(time+1000).toISOString(),alerts:copy(config.alertCandidates),cleared_keys:[]};
  const newer=components.reconcileAlerts(empty,current);
  const older=components.reconcileAlerts(newer,{...current,checked_at:new Date(time).toISOString(),alerts:[],cleared_keys:[config.alertCandidates[0].key]});
  assert.equal(older.entries[config.alertCandidates[0].key].status,"open");
 });
 await test("a current warning wins over a contradictory clearance key",async()=>{
  const current={scope:components.ALERT_SCOPE,checked_at:new Date(time).toISOString(),alerts:copy(config.alertCandidates),cleared_keys:[config.alertCandidates[0].key]};
  const cache=components.reconcileAlerts(components.parseAlertCache(null),current);
  assert.equal(cache.entries[config.alertCandidates[0].key].status,"open");
 });
 await test("missing expiry heartbeat is explained without claiming successful monitoring",async()=>{
  config.workflowOverride={available:false,reason:"heartbeat_missing"};
  config.alertCandidates=[{key:"bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.monitor_unavailable",code:"monitor_unavailable",severity:"warning",title:"Expiry workflow status could not be verified",next_step:"Review Base44 workflow history.",source_type:"workflow",run_id:null}];
  await mount("OperatorAlerts");assert.match(body(),/No valid expiry sweep heartbeat is available yet/);assert.match(body(),/not verified/);assert.doesNotMatch(body(),/No current operator warnings/);
 });
 const report={simulated:true,network_attempts:networkAttempts,passed:results.filter(r=>r.status==="passed").length,failed:results.filter(r=>r.status==="failed").length,results};
 console.log(JSON.stringify(report,null,2));if(process.env.RECOVERY_TEST_REPORT)fs.writeFileSync(process.env.RECOVERY_TEST_REPORT,JSON.stringify(report,null,2)+"\n");
 if(report.failed)process.exitCode=1;
}finally{
 await unmount();Object.assign(globalThis,{setTimeout:original.setTimeout,clearTimeout:original.clearTimeout,setInterval:original.setInterval,clearInterval:original.clearInterval,fetch:original.fetch});Date.now=original.now;
 dom.window.close();
 fs.unlinkSync(modulePath);fs.rmdirSync(temporary);
}
