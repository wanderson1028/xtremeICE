import { START_GRACE_MS, PROVISION_TIMEOUT_MS } from "./lifecycle.ts";

const LIMIT = 50, RECENT_LIMIT = 20, OP_LIMIT = 200;
const date = (value: unknown): string | null => typeof value==="string" && Number.isFinite(Date.parse(value)) ? new Date(value).toISOString() : null;
const text = (value: unknown, max=160) => typeof value==="string" ? value.slice(0,max) : null;
const errorCode = (value: unknown) => typeof value==="string" && /^[A-Za-z0-9_.:-]{1,80}$/.test(value) ? value : value ? "UNRECOGNIZED_ERROR" : null;

/** Stored-record diagnostics only. Never calls a provider, repairs records or releases capacity. */
export async function lifecycleDiagnostics(b: any, user: any, time=Date.now()) {
 if(user?.role!=="admin")throw Object.assign(new Error("Instructor access required"),{name:"FORBIDDEN",status:403});
 const entities=b.asServiceRole.entities;
 const [activeRows,recentRows,operations,legacyRows]=await Promise.all([
  entities.CloudLearnerRun.filter({status:{$ne:"terminated"}},"expires_at",LIMIT+1),
  entities.CloudLearnerRun.filter({status:"terminated"},"-terminated_at",RECENT_LIMIT+1),
  entities.CloudGuestOperation.filter({status:"pending"},"-created_date",OP_LIMIT+1),
  entities.CloudPocRun.filter({status:{$ne:"terminated"}},"expires_at",LIMIT+1),
 ]);
 const pending=operations.slice(0,OP_LIMIT);
 const project=(run: any, legacy=false) => {
  const started=date(run.started_at),expiry=date(run.expires_at),cleanup=date(run.cleanup_requested_at);
  const updated=date(run.updated_date),terminated=date(run.terminated_at);
  const held=run.status!=="terminated",reasons:string[]=[];
  const age=started?Math.max(0,time-Date.parse(started)):null;
  const ops=legacy?[]:pending.filter((op:any)=>op.run_id===run.id);
  if(held){
   if(!expiry||!started)reasons.push("Session timing is incomplete or invalid");
   if(expiry&&Date.parse(expiry)<=time)reasons.push("Session expired; cleanup must be verified");
   if(run.cleanup_requested_at)reasons.push("Cleanup requested; capacity remains reserved");
   if(run.cleanup_requested_at&&!cleanup)reasons.push("Cleanup timestamp is invalid");
   if(cleanup&&time-Date.parse(cleanup)>=15*60000)reasons.push("Cleanup has been waiting at least 15 minutes");
   if(run.status==="cleanup_pending"&&!run.cleanup_requested_at)reasons.push("Cleanup is pending; inspect saved errors and wait for verified release");
   if(run.status==="failed")reasons.push("Launch failed; inspect cleanup");
   if(run.status==="preparing"&&age!==null&&age>=START_GRACE_MS)reasons.push("Start exceeded its settling grace");
   if(run.status==="provisioning"&&age!==null&&age>=PROVISION_TIMEOUT_MS)reasons.push("Provisioning exceeded its recovery threshold");
   if(!["preparing","provisioning","ready","running","cleanup_pending","failed"].includes(run.status))reasons.push("Unrecognized session state; inspect before reuse");
  }
  if(run.last_error_code)reasons.push("A recorded check or cleanup error needs review");
  const uncertain=ops.filter((op:any)=>!op.command_id||op.error_code==="DISPATCH_UNCERTAIN").length;
  const overdue=ops.filter((op:any)=>!date(op.expires_at)||Date.parse(op.expires_at)<=time).length;
  if(uncertain)reasons.push("Guest action dispatch is uncertain; do not redispatch");
  if(overdue)reasons.push("Pending guest actions have an expired or invalid deadline");
  return {
   id:text(run.id),source:legacy?"previous_aws_proof":"learner",title:text(run.contract?.template_snapshot?.title)||"Lab session",
   learner_email:legacy?null:text(run.owner_email),status:text(run.status,40)||"unknown",
   capacity_held:held,started_at:started,expires_at:expiry,cleanup_requested_at:cleanup,
   record_updated_at:updated,last_provider_check_at:null,recorded_release_at:terminated,
   stack_status:text(run.stack_status,60),last_error_code:errorCode(run.last_error_code),
   pending_operations:ops.length,uncertain_operations:uncertain,overdue_operations:overdue,
   attention:reasons,
  };
 };
 const active=activeRows.slice(0,LIMIT).map((r:any)=>project(r));
 const legacy=legacyRows.slice(0,LIMIT).map((r:any)=>project(r,true));
 const recent=recentRows.slice(0,RECENT_LIMIT).map((r:any)=>project(r));
 return {
  generated_at:new Date(time).toISOString(),read_only:true,provider_checked:false,
  capacity:{held:activeRows.length>0||legacyRows.length>0,record_count_at_least:activeRows.length+legacyRows.length,guest_limit:1},
  active,legacy,recent,
  truncated:{active:activeRows.length>LIMIT,legacy:legacyRows.length>LIMIT,recent:recentRows.length>RECENT_LIMIT,operations:operations.length>OP_LIMIT},
  notes:[
   "This view reads saved records only. Refreshing it does not check AWS, start guests, or request cleanup.",
   "Last successful provider checks are not recorded. Record update times can include learning changes and do not prove AWS health.",
   "Recorded release times reflect earlier verified cleanup; they are not a new provider check.",
   "Pending-action counts may be incomplete when the operation list is truncated. Distributed admission remains best effort.",
  ],
 };
}
