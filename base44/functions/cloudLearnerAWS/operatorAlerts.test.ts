import { operatorAlerts,detectOperatorAlerts,workflowHealth,ALERT_SCOPE,EXPIRY_WORKFLOW_ID } from "./operatorAlerts.ts";
import {handleLearnerRequest} from "./handler.ts";
const assert=(v:unknown,message:string)=>{if(!v)throw Error(message);};
const TIME=Date.parse("2026-01-03T12:00:00Z"),iso=(offset=0)=>new Date(TIME+offset).toISOString();
const row=(extra:any={})=>({id:"0123456789abcdef01234567",status:"ready",started_at:iso(-60000),expires_at:iso(60000),...extra});
const health=(extra:any={})=>({available:true,accounting_available:true,status:"active",last_run_at:iso(-60000),last_run_status:"success",consecutive_failures:0,...extra});
const data=(extra:any={})=>({active:[],recent:[],legacy:[],recentLegacy:[],operations:[],truncated:{active:false,recent:false,legacy:false,recent_legacy:false,operations:false},workflow:health(),...extra});
const codes=(d:any)=>d.alerts.map((a:any)=>a.code);
const req=()=>new Request("https://test.invalid",{method:"POST",headers:{authorization:"Bearer TEST_ONLY_CREDENTIAL","Base44-Service-Authorization":"Bearer NEVER_FORWARD","Base44-State":"SIGNED_STATE"},body:JSON.stringify({action:"operatorAlerts",role:"admin",scope:"main"})});
function fixture(){
 const calls:any[]=[];
 const entity=(name:string)=>({filter:async(q:any,sort:string,limit:number)=>{calls.push({name,q,sort,limit});return [];}});
 return {calls,b:{auth:{me:async()=>({id:"instructor",role:"admin"})},asServiceRole:{entities:{CloudLearnerRun:entity("CloudLearnerRun"),CloudPocRun:entity("CloudPocRun"),CloudGuestOperation:entity("CloudGuestOperation")}}}};
}
Deno.test("operator alerts deny anonymous and distinct learner identities before privileged reads or fetch",async()=>{
 for(const user of [null,{id:"joe",role:"user"},{id:"radi",role:"user"}]){
  let touched=false;const b={auth:{me:async()=>user},get asServiceRole(){touched=true;throw Error("Forbidden read");}};
  const response=await handleLearnerRequest(req(),b);
  assert(response.status===(user?403:401)&&!touched,"real identity wins over caller role/scope");
 }
});
Deno.test("operator helper independently enforces admin access",async()=>{
 let touched=false;try{await operatorAlerts({get asServiceRole(){touched=true;throw Error();}},{role:"user"},req());throw Error("allowed");}catch(e:any){assert(e.status===403&&!touched,"helper rejects before reads");}
});
Deno.test("healthy observed records clear condition keys without claiming provider checks",async()=>{
 const result=await detectOperatorAlerts(data({active:[row()]}),TIME);
 assert(!result.alerts.length&&result.cleared_keys.length>=12,"fresh healthy record coverage");
 assert(result.cleared_keys.every((k:string)=>/^[a-f0-9]{32}\.[a-z_]+$/.test(k)),"opaque stable keys");
});
Deno.test("stalled starts use existing five and twenty minute thresholds",async()=>{
 const early=await detectOperatorAlerts(data({active:[row({status:"preparing",started_at:iso(-4*60000)})]}),TIME);
 assert(!codes(early).includes("start_stalled"),"settling grace retained");
 for(const [status,age,code] of [["preparing",6,"start_stalled"],["provisioning",21,"provisioning_stalled"],["failed",1,"launch_failed"]] as const){
  const result=await detectOperatorAlerts(data({active:[row({status,started_at:iso(-age*60000)})]}),TIME);
  assert(codes(result).includes(code),"detect "+code);
 }
});
Deno.test("expected expiry grace is quiet while delayed cleanup becomes actionable",async()=>{
 const early=await detectOperatorAlerts(data({active:[row({expires_at:iso(-9*60000),cleanup_requested_at:iso(-5*60000)})]}),TIME);
 assert(!codes(early).includes("expiry_overdue")&&!codes(early).includes("cleanup_overdue"),"normal sweep grace");
 const delayed=await detectOperatorAlerts(data({active:[row({expires_at:iso(-11*60000),cleanup_requested_at:iso(-16*60000)})]}),TIME);
 assert(codes(delayed).includes("expiry_overdue")&&codes(delayed).includes("cleanup_overdue"),"delayed cleanup detected");
});
Deno.test("unknown states and invalid times do not falsely clear state-dependent warnings",async()=>{
 const good=await detectOperatorAlerts(data({active:[row()]}),TIME);
 const bad=await detectOperatorAlerts(data({active:[row({status:"mystery",started_at:"invalid",expires_at:"invalid",cleanup_requested_at:"invalid"})]}),TIME);
 assert(codes(bad).includes("session_state")&&codes(bad).includes("session_timing"),"corrupt records surfaced");
 const startKey=good.cleared_keys.find((k:string)=>k.endsWith(".start_stalled"))!;
 assert(!bad.cleared_keys.includes(startKey),"invalid start cannot clear prior stuck-start warning");
});
Deno.test("uncertain expired dispatch remains actionable until recorded guest release",async()=>{
 const op={run_id:row().id,status:"expired",error_code:"DISPATCH_UNCERTAIN",expires_at:iso(-1000)};
 const open=await detectOperatorAlerts(data({active:[row()],operations:[op]}),TIME);
 assert(codes(open).includes("uncertain_action"),"expired unknown dispatch is not claimed recovered");
 const closed=await detectOperatorAlerts(data({recent:[row({status:"terminated"})],operations:[op]}),TIME);
 assert(!codes(closed).includes("uncertain_action")&&closed.cleared_keys.some((k:string)=>k.endsWith(".uncertain_action")),"recorded release closes guest-action condition");
});
Deno.test("truncated operations cannot clear a previously uncertain action",async()=>{
 const d=data({active:[row()]});d.truncated.operations=true;
 const result=await detectOperatorAlerts(d,TIME);
 assert(codes(result).includes("results_incomplete")&&!result.cleared_keys.some((k:string)=>k.endsWith(".uncertain_action")),"incomplete is not absence proof");
});
Deno.test("known release and repaired error conditions provide explicit resolution keys",async()=>{
 const failed=await detectOperatorAlerts(data({active:[row({status:"failed",last_error_code:"TimeoutError"})]}),TIME);
 const released=await detectOperatorAlerts(data({recent:[row({status:"terminated",last_error_code:null})]}),TIME);
 assert(failed.alerts.every((a:any)=>released.cleared_keys.includes(a.key)),"all prior session conditions covered after recorded release");
});
Deno.test("overlapping and repeated observations produce stable nonduplicated logical alerts",async()=>{
 const a=await detectOperatorAlerts(data({active:[row({status:"failed"}),row({status:"failed"})]}),TIME);
 const b=await detectOperatorAlerts(data({active:[row({status:"failed"})]}),TIME+1000);
 assert(a.alerts.filter((x:any)=>x.code==="launch_failed").length===1,"same logical incident once");
 assert(a.alerts.find((x:any)=>x.code==="launch_failed").key===b.alerts.find((x:any)=>x.code==="launch_failed").key,"stable keys across checks");
});
Deno.test("capacity hold conflicts include previous AWS proof records without claiming multiple guests",async()=>{
 const r=await detectOperatorAlerts(data({active:[row()],legacy:[row({id:"legacy",status:"failed"})]}),TIME);
 assert(codes(r).includes("capacity_conflict")&&r.alerts.find((a:any)=>a.code==="capacity_conflict").next_step.includes("does not prove"),"record capacity wording");
});
Deno.test("workflow disabled, failed and stale conditions are detected independently",async()=>{
 for(const [patch,code] of [[{status:"inactive"},"expiry_disabled"],[{last_run_status:"failed",consecutive_failures:2},"expiry_failed"],[{last_run_at:iso(-16*60000)},"expiry_stale"]] as const){
  const r=await detectOperatorAlerts(data({workflow:health(patch)}),TIME);assert(codes(r).includes(code),"detect "+code);
 }
});
Deno.test("unavailable workflow reads preserve previous failure and schedule warnings",async()=>{
 const r=await detectOperatorAlerts(data({workflow:{available:false,reason:"workflow_access_unavailable"}}),TIME);
 assert(codes(r).includes("monitor_unavailable"),"cannot report healthy");
 assert(!r.cleared_keys.some((k:string)=>/\.(expiry_failed|expiry_stale|expiry_disabled)$/.test(k)),"no false workflow resolution");
});
Deno.test("invalid or future workflow timestamps are unknown rather than healthy",async()=>{
 for(const value of [null,"invalid",iso(6*60000)]){
  const r=await detectOperatorAlerts(data({workflow:health({last_run_at:value})}),TIME);
  assert(codes(r).includes("monitor_unavailable"),"bad workflow clock detected");
 }
});
Deno.test("workflow reader is a fixed bounded GET using only caller authorization and allowlist proof",async()=>{
 const seen:any[]=[];
 const w=await workflowHealth(req(),{fetch:async(url:any,options:any)=>{seen.push({url,options});return Response.json({id:EXPIRY_WORKFLOW_ID,app_id:"69a0a5a90473fac0aa3ea135",status:"active",last_run_at:iso(),last_run_status:"success",consecutive_failures:0,definition:{secret:"NEVER_RETURN"}});}});
 assert(w.available&&seen.length===1&&seen[0].url.startsWith("https://base44.app/api/apps/69a0a5a90473fac0aa3ea135/workflows/"),"fixed same-service metadata endpoint");
 assert(seen[0].options.method==="GET"&&seen[0].options.redirect==="error"&&seen[0].options.signal instanceof AbortSignal,"bounded read, redirects forbidden");
 assert(Object.keys(seen[0].options.headers).sort().join(",")==="Base44-State,accept,authorization","never forwards service-role auth");
 assert(!JSON.stringify(w).includes("NEVER_RETURN")&&!JSON.stringify(w).includes("TEST_ONLY_CREDENTIAL"),"DTO omits definition and auth");
});
Deno.test("workflow permission denial, HTML, invalid binding and outages produce sanitized unknown status",async()=>{
 for(const response of [new Response("DO_NOT_LEAK",{status:403}),new Response("<html>DO_NOT_LEAK</html>"),Response.json({id:"wrong",status:"active"})]){
  const w=await workflowHealth(req(),{fetch:async()=>response});assert(!w.available&&!JSON.stringify(w).includes("DO_NOT_LEAK"),"sanitized read failure");
 }
 const w=await workflowHealth(req(),{fetch:async()=>{throw Error("DO_NOT_LEAK");}});assert(!w.available&&!JSON.stringify(w).includes("DO_NOT_LEAK"),"sanitized outage");
});
Deno.test("missing user authorization does not attempt a platform read",async()=>{
 let calls=0;const w=await workflowHealth(new Request("https://test.invalid"),{fetch:async()=>{calls++;throw Error();}});
 assert(!w.available&&calls===0,"no alternate credential fallback");
});
Deno.test("operator endpoint is bounded read-only and returns only whitelisted alert metadata",async()=>{
 const f=fixture(),net:any[]=[];
 const output=await operatorAlerts(f.b,{id:"instructor",role:"admin"},req(),{clock:()=>TIME,fetch:async(url:any)=>{net.push(url);return Response.json({id:EXPIRY_WORKFLOW_ID,status:"active",last_run_at:iso(-60000),last_run_status:"success",consecutive_failures:0});}});
 assert(f.calls.length===5&&f.calls.every(c=>c.limit>0&&c.limit<=201),"bounded entity reads");
 assert(net.length===1&&net.every(u=>new URL(u).hostname==="base44.app"),"no AWS or third-party calls");
 assert(output.scope===ALERT_SCOPE&&output.subject_id==="instructor"&&output.read_only&&!output.provider_checked&&output.acknowledgments==="this_browser_only","honest scope and limits");
});
Deno.test("record read failures cannot become empty healthy snapshots",async()=>{
 const f=fixture();f.b.asServiceRole.entities.CloudPocRun.filter=async()=>{throw Error("DO_NOT_LEAK");};
 try{await operatorAlerts(f.b,{role:"admin"},req());throw Error("allowed");}catch(e:any){assert(e.name==="OPERATOR_ALERT_READ_FAILED"&&!e.message.includes("DO_NOT_LEAK"),"source outage remains a failure");}
});
Deno.test("alert payload excludes raw learner identities, frozen content, provider handles and command data",async()=>{
 const sensitive=row({status:"failed",owner_email:"PRIVATE_EMAIL",stack_id:"PRIVATE_ARN",contract:{secret:"PRIVATE_SNAPSHOT"}});
 const r=await detectOperatorAlerts(data({active:[sensitive],operations:[{run_id:sensitive.id,status:"pending",error_code:"DISPATCH_UNCERTAIN",binding:"PRIVATE_BINDING",command_id:"PRIVATE_COMMAND",result:{content:"PRIVATE_OUTPUT"},expires_at:iso(-1000)}]}),TIME);
 assert(!JSON.stringify(r).includes("PRIVATE_"),"private source fields never enter alert DTO");
});
