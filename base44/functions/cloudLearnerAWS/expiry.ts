import { STSClient, GetCallerIdentityCommand } from "./awsQuery.ts";
import { requireAccount } from "./model.ts";
import { requestCleanup, START_GRACE_MS, PROVISION_TIMEOUT_MS } from "./lifecycle.ts";
const ACTIVE=["preparing","provisioning","ready","failed","cleanup_pending"],BATCH=50;
export async function sweepExpiredLearners(b:any,deps:any={}) {
 const clock=deps.clock||Date.now,cutoff=new Date(clock()).toISOString();
 const rows=await b.asServiceRole.entities.CloudLearnerRun.filter({status:{$in:ACTIVE},$or:[
  {expires_at:{$lte:cutoff}},{cleanup_requested_at:{$lte:cutoff}},{status:{$in:["cleanup_pending","failed"]}},
  {status:"preparing",started_at:{$lte:new Date(clock()-START_GRACE_MS).toISOString()}},
  {status:"provisioning",started_at:{$lte:new Date(clock()-PROVISION_TIMEOUT_MS).toISOString()}}
 ]},"expires_at",BATCH);
 const result:any={checked_at:cutoff,scanned:rows.length,cleanup_requested:0,pending:0,verified_terminated:0,errors:[],has_more:rows.length===BATCH};
 if(!rows.length)return result;
 const identity=await (deps.sts||new STSClient()).send(new GetCallerIdentityCommand({}));requireAccount(identity.Account);
 for(const row of rows)try{
  const r=await requestCleanup(b,row,deps);
  if(r.cleanup_requested)result.cleanup_requested++;
  if(r.pending)result.pending++;else if(r.run.status==="terminated")result.verified_terminated++;
 }catch(e:any){const error_code=String(e?.name||"EXPIRY_CLEANUP_FAILED").slice(0,80);await b.asServiceRole.entities.CloudLearnerRun.update(row.id,{last_error_code:error_code});result.errors.push({run_id:row.id,error_code});}
 return result;
}
