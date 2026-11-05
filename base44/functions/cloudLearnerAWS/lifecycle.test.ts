import { canOperate, TASK } from "./model.ts";
import { requestCleanup, refreshLifecycle, verifyRunRemoval, STACK_NAME } from "./lifecycle.ts";
import { sweepExpiredLearners } from "./expiry.ts";
const check=(v:unknown,m:string)=>{if(!v)throw Error(m)};
const ID="0123456789abcdef01234567",ARN="arn:aws:cloudformation:us-east-1:935838375949:stack/"+STACK_NAME+"/example";
const TIME=Date.parse("2026-01-03T12:00:00Z");
function fixture(overrides:any={}) {
 const row:any={id:ID,status:"ready",region:"us-east-1",stack_name:STACK_NAME,stack_id:ARN,owner_user_id:"owner",lab_instance_id:"lab",started_at:new Date(TIME-60000).toISOString(),expires_at:new Date(TIME+600000).toISOString(),contract:{account_id:"935838375949",learning:{completed_at:"earned"}} ,...overrides};
 const lab:any={status:"running",completed_at:"earned",score:100},writes:any[]=[],calls:any[]=[];
 let state="CREATE_COMPLETE",foreign=false,vpc=false,instance=false,volume=false,pages=false,failProjection=false,loseDelete=false,deleteCount=0,cleanupDuringRead=false;
 const db:any={asServiceRole:{entities:{CloudLearnerRun:{filter:async()=>[{...row}],update:async(_id:string,c:any)=>{writes.push(c);Object.assign(row,c)}},LabInstance:{update:async(_id:string,c:any)=>{if(failProjection){failProjection=false;throw Object.assign(Error("projection unavailable"),{name:"DatabaseUnavailable"})}Object.assign(lab,c)}}}}};
 const deps:any={clock:()=>TIME,sts:{send:async()=>({Account:"935838375949"})},aws:async(_s:string,action:string,input:any)=>{
  calls.push({action,input});
  if(action==="DescribeStacks"){if(state==="MISSING")throw Object.assign(Error("does not exist"),{name:"ValidationError"});return {Stacks:{member:{StackId:ARN,StackStatus:state,Tags:{member:[{Key:"ManagedBy",Value:"ExtremeICE-DesignStudio-Learner"},{Key:"LearnerRunId",Value:foreign?"other":ID}]},Outputs:{member:[{OutputKey:"InstanceId",OutputValue:"i-owned"},{OutputKey:"VpcId",OutputValue:"vpc-owned"}]}}}};}
  if(action==="DeleteStack"){deleteCount++;state="DELETE_IN_PROGRESS";if(loseDelete){loseDelete=false;throw Object.assign(Error("response lost after acceptance"),{name:"TimeoutError"})}return {};}
  if(action==="DescribeInstanceInformation"){if(cleanupDuringRead)row.status="cleanup_pending";return {InstanceInformationList:[{PingStatus:"Online"}]};}
  throw Error("Unexpected "+action);
 },ec2:{send:async(c:any)=>{calls.push({action:c.action,input:c.input});return c.action==="DescribeVpcs"?{Vpcs:vpc?[{}]:[],NextToken:pages?"more":null}:c.action==="DescribeInstances"?{Reservations:instance?[{Instances:[{State:{Name:"running"}}]}]:[],NextToken:pages?"more":null}:{Volumes:volume?[{State:"available"}]:[],NextToken:pages?"more":null};}}};
 return {row,lab,writes,calls,db,deps,set:(v:any)=>{if("state"in v)state=v.state;if("foreign"in v)foreign=v.foreign;if("vpc"in v)vpc=v.vpc;if("instance"in v)instance=v.instance;if("volume"in v)volume=v.volume;if("pages"in v)pages=v.pages;if("failProjection"in v)failProjection=v.failProjection;if("loseDelete"in v)loseDelete=v.loseDelete;if("cleanupDuringRead"in v)cleanupDuringRead=v.cleanupDuringRead;},deletes:()=>deleteCount};
}
Deno.test("manual cleanup does not repeat deletion in progress and keeps earned results",async()=>{
 const f=fixture();await requestCleanup(f.db,f.row,f.deps);await requestCleanup(f.db,f.row,f.deps);
 check(f.deletes()===1&&f.row.status==="cleanup_pending","single deletion, capacity held");
 f.set({state:"DELETE_COMPLETE"});await requestCleanup(f.db,f.row,f.deps);const t=f.row.terminated_at;await requestCleanup(f.db,f.row,f.deps);
 check(f.deletes()===1&&f.row.terminated_at===t&&f.lab.score===100&&f.row.contract.learning.completed_at==="earned","repeat release preserves learning and timestamp");
});
Deno.test("manual refresh cannot release a missing stack with tagged orphan resources",async()=>{
 const f=fixture({stack_id:null});f.set({state:"MISSING",vpc:true,instance:true,volume:true});
 const result=await refreshLifecycle(f.db,f.row,f.deps);
 check(result.status==="cleanup_pending"&&f.lab.status==="running","capacity held despite lost identifiers");
 const scan=f.calls.filter(c=>["DescribeVpcs","DescribeInstances","DescribeVolumes"].includes(c.action));
 check(scan.length===3&&scan.every(c=>c.input.Filters.some((x:any)=>x.Name==="tag:LearnerRunId"&&x.Values[0]===ID)),"all orphan scans scoped to run tags");
});
Deno.test("pagination prevents false removal confirmation",async()=>{
 const f=fixture();f.set({state:"DELETE_COMPLETE",pages:true});const r=await verifyRunRemoval(f.row,f.deps);
 check(!r.verified&&r.remaining.length===3,"partial inventory is not proof of absence");
});
Deno.test("projection write failure holds capacity and is repaired by the next cleanup attempt",async()=>{
 const f=fixture();f.set({state:"DELETE_COMPLETE",failProjection:true});
 try{await requestCleanup(f.db,f.row,f.deps);throw Error("failure swallowed")}catch(e:any){check(e.name==="DatabaseUnavailable","failure propagated");}
 check(f.row.status==="cleanup_pending"&&f.row.last_error_code==="DatabaseUnavailable","retryable state retained");
 await requestCleanup(f.db,f.row,f.deps);
 check(f.row.status==="terminated"&&f.lab.status==="terminated"&&f.lab.completed_at==="earned"&&!f.row.last_error_code,"projection repaired before capacity release");
});
Deno.test("accepted delete with a lost response is resumed without replay",async()=>{
 const f=fixture();f.set({loseDelete:true});
 try{await requestCleanup(f.db,f.row,f.deps)}catch{}
 check(f.row.status==="cleanup_pending"&&f.row.last_error_code==="TimeoutError","durable cleanup intent before timeout");
 await requestCleanup(f.db,f.row,f.deps);
 check(f.deletes()===1&&f.row.stack_status==="DELETE_IN_PROGRESS"&&!f.row.last_error_code,"provider state resolves uncertainty without another delete");
});
Deno.test("concurrent launch loser never deletes the winning learner stack",async()=>{
 const f=fixture({stack_id:null,status:"failed",last_error_code:"AlreadyExistsException"});f.set({foreign:true});
 await requestCleanup(f.db,f.row,f.deps);
 check(f.deletes()===0&&f.row.status==="terminated","only empty losing record released");
});
Deno.test("foreign stack without an explicit launch collision remains protected and blocks capacity",async()=>{
 const f=fixture({stack_id:null});f.set({foreign:true});
 try{await requestCleanup(f.db,f.row,f.deps)}catch{}
 check(f.deletes()===0&&f.row.status==="cleanup_pending"&&f.row.last_error_code==="STACK_OWNERSHIP_MISMATCH","no foreign deletion or unsafe release");
});
Deno.test("status refresh cannot reopen a session whose cleanup started during the provider read",async()=>{
 const f=fixture({status:"provisioning"});f.set({cleanupDuringRead:true});
 const r=await refreshLifecycle(f.db,f.row,f.deps);
 check(r.status==="cleanup_pending"&&f.deletes()===1&&!f.writes.some(c=>c.status==="ready"),"late ready response cannot override cleanup intent");
});
Deno.test("failed and abandoned starts are cleaned without replaying provisioning",async()=>{
 for(const status of ["failed","preparing","provisioning"]){
  const f=fixture({status,started_at:new Date(TIME-25*60000).toISOString()});
  const r=await refreshLifecycle(f.db,f.row,f.deps);
  check(r.status==="cleanup_pending"&&f.deletes()===1&&!f.calls.some(c=>c.action==="CreateStack"),"bounded cleanup for "+status);
 }
});
Deno.test("a young start with a lost stack identifier can recover the owned provider state",async()=>{
 const f=fixture({status:"preparing",stack_id:null});const r=await refreshLifecycle(f.db,f.row,f.deps);
 check(r.status==="ready"&&r.stack_id===ARN&&r.instance_id==="i-owned"&&f.deletes()===0,"owned stack adopted without a second launch");
});
Deno.test("scheduler selects cleanup and failure before expiry, but protects healthy and unsettled runs",async()=>{
 const f=fixture();let selected:string[]=[];
 const rows=[
  {...f.row,id:"healthy",status:"ready"},
  {...f.row,id:"cleanup",status:"cleanup_pending"},
  {...f.row,id:"failed",status:"failed"},
  {...f.row,id:"young",status:"preparing"},
  {...f.row,id:"abandoned",status:"preparing",started_at:new Date(TIME-6*60000).toISOString()},
  {...f.row,id:"stuck",status:"provisioning",started_at:new Date(TIME-21*60000).toISOString()}];
 const match=(r:any,q:any):boolean=>Object.entries(q).every(([k,v]:any)=>k==="$or"?v.some((x:any)=>match(r,x)):v&&typeof v==="object"?v.$in?v.$in.includes(r[k]):r[k]<=v.$lte:r[k]===v);
 f.db.asServiceRole.entities.CloudLearnerRun.filter=async(q:any)=>{selected=rows.filter(r=>match(r,q)).map(r=>r.id);return []};
 await sweepExpiredLearners(f.db,f.deps);
 check(selected.join(",")==="cleanup,failed,abandoned,stuck","retry query does not wait for original TTL");
});
Deno.test("provider outage cannot release capacity through refresh",async()=>{
 const f=fixture();f.deps.aws=async()=>{throw Object.assign(Error("provider unavailable"),{name:"ServiceUnavailable"})};
 try{await refreshLifecycle(f.db,f.row,f.deps)}catch{}
 check(f.row.status==="ready"&&f.row.last_error_code==="ServiceUnavailable"&&!f.writes.some(c=>c.status==="terminated"),"unverified capacity is retained");
});
Deno.test("launch collision ownership survives an intervening provider outage",async()=>{
 const f=fixture({stack_id:null,status:"failed",last_error_code:"TimeoutError",contract:{account_id:"935838375949",lifecycle:{launch_collision:true}}});
 f.set({foreign:true});await requestCleanup(f.db,f.row,f.deps);
 check(f.deletes()===0&&f.row.status==="terminated","durable collision marker releases only the empty loser");
});
Deno.test("durable cleanup intent blocks guest access even if a late readiness write wins",async()=>{
 const f=fixture({contract:{...TASK,account_id:"935838375949"}}),user={id:"owner"};
 check(canOperate(f.row,user,TIME),"initial owner access");
 await requestCleanup(f.db,f.row,f.deps);const marker=f.row.cleanup_requested_at;
 f.row.status="ready";
 f.row.contract={...f.row.contract,learning:{completed_at:"late validation"}};
 check(!!marker&&!canOperate(f.row,user,TIME),"independent cleanup marker survives stale status and learning writes");
 const r=await refreshLifecycle(f.db,f.row,f.deps);
 check(r.status==="cleanup_pending"&&f.row.cleanup_requested_at===marker&&f.deletes()===1,"cleanup resumes without reopening or duplicate deletion");
});
