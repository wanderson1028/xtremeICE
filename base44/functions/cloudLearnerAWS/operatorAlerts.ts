// Read-only operator monitoring. No AWS clients, resource actions, or entity mutations.
export const ALERT_SCOPE="69a0a5a90473fac0aa3ea135:design-studio-integration";
export const EXPIRY_WORKFLOW_ID="6aebf2f5f80221b22d139e5d";
const APP_ID="69a0a5a90473fac0aa3ea135",LIMIT=50,RECENT=20,OPS=200;
const WORKFLOW_URL="https://app.base44.com/api/apps/"+APP_ID+"/workflows/"+EXPIRY_WORKFLOW_ID;
const minutes=(n:number)=>n*60000;
const date=(v:any)=>typeof v==="string"&&Number.isFinite(Date.parse(v))?Date.parse(v):null;
const codes:Record<string,[string,string,string]>={
 launch_failed:["high","A lab launch failed","Review the recovery overview and confirm cleanup before another launch."],
 start_stalled:["high","A lab start is stranded","Review the recovery overview. The expiry sweep should reconcile the abandoned start."],
 provisioning_stalled:["high","A guest has taken too long to become ready","Review saved errors and the scheduled cleanup status."],
 cleanup_overdue:["high","Lab cleanup is delayed","Review the recovery overview and verify removal before reusing capacity."],
 expiry_overdue:["high","An expired lab still holds capacity","Check the expiry workflow and review the session's cleanup state."],
 session_error:["warning","A session check recorded an error","Review the recovery overview. Acknowledging this alert does not release capacity."],
 session_timing:["warning","A session has invalid timing data","Inspect the saved session before making a recovery decision."],
 session_state:["high","A session has an unrecognized state","Inspect the saved session before reusing capacity."],
 uncertain_action:["warning","A guest action has an uncertain outcome","Review the existing action. Avoid submitting a replacement until its outcome or guest removal is verified."],
 operation_overdue:["warning","A guest action needs review","Review the pending action and its deadline."],
 capacity_conflict:["high","Multiple session records hold pilot capacity","Inspect the session records. This count does not prove multiple AWS guests exist."],
 expiry_disabled:["high","Automatic expiry cleanup is disabled","Inspect the Expire AWS Learner Labs workflow. New launches require approval."],
 expiry_failed:["high","The expiry workflow reported a failure","Inspect the workflow run and recovery overview; capacity remains reserved until removal is verified."],
 expiry_stale:["high","The expiry workflow has not run recently","Inspect the workflow schedule and its recent runs."],
 monitor_unavailable:["warning","Expiry workflow status could not be verified","An app owner or authorized editor should inspect the workflow in Base44. Session checks can still be reviewed."],
 results_incomplete:["warning","Some monitoring results are incomplete","Inspect older records. An incomplete check cannot confirm that earlier alerts have cleared."],
};
async function sourceKey(source:string){const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(ALERT_SCOPE+":"+source));return Array.from(new Uint8Array(bytes)).map(v=>v.toString(16).padStart(2,"0")).join("").slice(0,32);}
export async function workflowHealth(request:Request, deps:any={}){
 const authorization=request.headers.get("authorization");
 if(!authorization||!/^Bearer [^\s]+$/.test(authorization))return {available:false,reason:"authorization_unavailable"};
 try{
  const headers:Record<string,string>={authorization,"accept":"application/json"};
  const state=request.headers.get("Base44-State");if(state)headers["Base44-State"]=state;
  const response=await (deps.fetch||fetch)(WORKFLOW_URL,{method:"GET",headers,redirect:"error",signal:AbortSignal.timeout(8000)});
  if(!response.ok)return {available:false,reason:response.status===401||response.status===403?"workflow_access_unavailable":"workflow_read_failed"};
  const raw=await response.text();if(raw.length>200000)return {available:false,reason:"workflow_response_invalid"};
  const w=JSON.parse(raw);
  if(w.id!==EXPIRY_WORKFLOW_ID||(w.app_id&&w.app_id!==APP_ID)||!["active","inactive","archived"].includes(w.status))return {available:false,reason:"workflow_response_invalid"};
  return {available:true,status:w.status,accounting_available:w.run_accounting_available!==false,last_run_at:date(w.last_run_at)===null?null:new Date(w.last_run_at).toISOString(),last_run_status:["success","failed","cancelled"].includes(w.last_run_status)?w.last_run_status:null,consecutive_failures:Number.isInteger(w.consecutive_failures)&&w.consecutive_failures>=0?w.consecutive_failures:null};
 }catch{return {available:false,reason:"workflow_read_unavailable"};}
}
export async function detectOperatorAlerts(data:any,time=Date.now()){
 const alerts:any[]=[],cleared=new Set<string>();
 const sources=[...data.active.map((r:any)=>({r,kind:"learner"})),...data.recent.map((r:any)=>({r,kind:"learner"})),...data.legacy.map((r:any)=>({r,kind:"previous_aws_proof"})),...data.recentLegacy.map((r:any)=>({r,kind:"previous_aws_proof"}))];
 const keys=new Map<string,string>();
 const key=async(source:string,code:string)=>{if(!keys.has(source))keys.set(source,await sourceKey(source));return keys.get(source)+"."+code;};
 const check=async(source:string,code:string,bad:boolean,known=true,extra:any={})=>{
  const id=await key(source,code);
  if(bad){const [severity,title,next_step]=codes[code];alerts.push({key:id,code,severity,title,next_step,...extra});}
  else if(known)cleared.add(id);
 };
 for(const {r,kind} of sources){
  if(typeof r.id!=="string")continue;
  const source=kind+":"+r.id,held=r.status!=="terminated",known=["preparing","provisioning","ready","running","failed","cleanup_pending","terminated"].includes(r.status);
  const start=date(r.started_at),expiry=date(r.expires_at),cleanup=date(r.cleanup_requested_at);
  const timing=start!==null&&expiry!==null&&(!r.cleanup_requested_at||cleanup!==null);
  const extra={source_type:kind,run_id:r.id};
  await check(source,"session_state",held&&!known,true,extra);
  await check(source,"session_timing",held&&!timing,true,extra);
  await check(source,"launch_failed",held&&r.status==="failed",known,extra);
  await check(source,"start_stalled",held&&r.status==="preparing"&&start!==null&&time-start>=minutes(5),!held||(known&&start!==null),extra);
  await check(source,"provisioning_stalled",held&&r.status==="provisioning"&&start!==null&&time-start>=minutes(20),!held||(known&&start!==null),extra);
  await check(source,"cleanup_overdue",held&&cleanup!==null&&time-cleanup>=minutes(15),!held||(known&&(!r.cleanup_requested_at||cleanup!==null)),extra);
  await check(source,"expiry_overdue",held&&expiry!==null&&time-expiry>=minutes(10),!held||(known&&expiry!==null),extra);
  await check(source,"session_error",!!r.last_error_code,known,extra);
  const ops=kind==="learner"?data.operations.filter((o:any)=>o.run_id===r.id):[];
  const uncertain=ops.some((o:any)=>o.error_code==="DISPATCH_UNCERTAIN"&&["pending","expired"].includes(o.status));
  const overdue=ops.some((o:any)=>o.status==="pending"&&(date(o.expires_at)===null||date(o.expires_at)!<=time));
  await check(source,"uncertain_action",held&&uncertain,!held||!data.truncated.operations,extra);
  await check(source,"operation_overdue",held&&overdue,!held||!data.truncated.operations,extra);
 }
 const held=data.active.length+data.legacy.length;
 await check("pilot","capacity_conflict",held>1,!data.truncated.active&&!data.truncated.legacy,{source_type:"pilot",run_id:null});
 await check("monitor","results_incomplete",Object.values(data.truncated).some(Boolean),true,{source_type:"monitor",run_id:null});
 const w=data.workflow,workflowExtra={source_type:"workflow",run_id:null};
 const workflowKnown=w.available&&w.accounting_available&&date(w.last_run_at)!==null&&date(w.last_run_at)!<=time+minutes(5)&&w.last_run_status!==null&&w.consecutive_failures!==null;
 await check("workflow","monitor_unavailable",!workflowKnown,true,workflowExtra);
 await check("workflow","expiry_disabled",w.available&&w.status!=="active",w.available,workflowExtra);
 await check("workflow","expiry_failed",workflowKnown&&(w.last_run_status==="failed"||w.last_run_status==="cancelled"||w.consecutive_failures>0),!!workflowKnown,workflowExtra);
 await check("workflow","expiry_stale",workflowKnown&&time-date(w.last_run_at)!>=minutes(15),!!workflowKnown,workflowExtra);
 return {alerts:[...new Map(alerts.map(a=>[a.key,a])).values()],cleared_keys:[...cleared]};
}
export async function operatorAlerts(b:any,user:any,request:Request,deps:any={}){
 if(user?.role!=="admin")throw Object.assign(new Error("Instructor access required"),{name:"FORBIDDEN",status:403});
 const e=b.asServiceRole.entities,time=(deps.clock||Date.now)();
 let rows:any[];
 try{rows=await Promise.all([
  e.CloudLearnerRun.filter({status:{$ne:"terminated"}},"expires_at",LIMIT+1),
  e.CloudLearnerRun.filter({status:"terminated"},"-terminated_at",RECENT+1),
  e.CloudPocRun.filter({status:{$ne:"terminated"}},"expires_at",LIMIT+1),
  e.CloudPocRun.filter({status:"terminated"},"-terminated_at",RECENT+1),
  e.CloudGuestOperation.filter({$or:[{status:"pending"},{status:"expired",error_code:"DISPATCH_UNCERTAIN"}]},"-created_date",OPS+1),
 ]);}catch{throw Object.assign(new Error("Saved session records could not be checked. Previous alerts must remain unverified."),{name:"OPERATOR_ALERT_READ_FAILED"});}
 const [active,recent,legacy,recentLegacy,operations]=rows;
 const truncated={active:active.length>LIMIT,recent:recent.length>RECENT,legacy:legacy.length>LIMIT,recent_legacy:recentLegacy.length>RECENT,operations:operations.length>OPS};
 const workflow=await workflowHealth(request,deps);
 const result=await detectOperatorAlerts({active:active.slice(0,LIMIT),recent:recent.slice(0,RECENT),legacy:legacy.slice(0,LIMIT),recentLegacy:recentLegacy.slice(0,RECENT),operations:operations.slice(0,OPS),truncated,workflow},time);
 return {subject_id:user.id,scope:ALERT_SCOPE,checked_at:new Date(time).toISOString(),...result,workflow,truncated,read_only:true,provider_checked:false,delivery:"in_app_while_open",acknowledgments:"this_browser_only",pilot:{guest_limit:1,ttl_minutes:110}};
}
