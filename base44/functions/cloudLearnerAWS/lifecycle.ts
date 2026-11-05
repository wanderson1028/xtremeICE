import { aws as awsRequest, list } from "./awsControl.ts";
import { EXECUTION_ROLE_ARN } from "./accessConfig.ts";
import { ACCOUNT, MANAGED_BY, REGION } from "./model.ts";
import { EC2Client, DescribeInstancesCommand, DescribeVolumesCommand, DescribeVpcsCommand } from "./awsQuery.ts";

export const STACK_NAME = "ExtremeICE-DesignStudio-Learner-Pilot";
export const START_GRACE_MS = 5 * 60 * 1000;
export const PROVISION_TIMEOUT_MS = 20 * 60 * 1000;
const missing = (e: any) => e?.name === "ValidationError" && /does not exist/i.test(String(e.message));
const code = (e: any) => String(e?.name || "LIFECYCLE_CHECK_FAILED").slice(0,80);
const bound = (run: any) => {
 if(run.region!==REGION || run.stack_name!==STACK_NAME || run.contract?.account_id!==ACCOUNT)
  throw Object.assign(new Error("Stored run binding differs from the pilot"),{name:"RUN_BINDING_MISMATCH"});
 if(run.stack_id && !String(run.stack_id).startsWith("arn:aws:cloudformation:"+REGION+":"+ACCOUNT+":stack/"+STACK_NAME+"/"))
  throw Object.assign(new Error("Stored stack differs from the pilot"),{name:"STACK_BINDING_MISMATCH"});
};
export function starting(run: any, time=Date.now()) {
 return run.status==="preparing" && !run.stack_id && time-Date.parse(run.started_at)<START_GRACE_MS;
}
export async function ownedStack(run: any, deps: any={}) {
 bound(run);
 let stack: any;
 try { const r=await (deps.aws||awsRequest)("cloudformation","DescribeStacks",{StackName:run.stack_id||run.stack_name});stack=list(r.Stacks?.member)[0]||null; }
 catch(e){if(missing(e))return null;throw e;}
 if(!stack)return null;
 const tags=list(stack.Tags?.member);
 if((run.stack_id && stack.StackId!==run.stack_id) ||
    !tags.some((t:any)=>t.Key==="ManagedBy"&&t.Value===MANAGED_BY) ||
    !tags.some((t:any)=>t.Key==="LearnerRunId"&&t.Value===run.id))
  throw Object.assign(new Error("Stack ownership tags differ"),{name:"STACK_OWNERSHIP_MISMATCH"});
 return stack;
}
export async function resourceRemnants(run: any, deps: any={}) {
 bound(run);const ec2=deps.ec2||new EC2Client(),remaining=new Set<string>();
 const filters=[{Name:"tag:LearnerRunId",Values:[run.id]},{Name:"tag:ManagedBy",Values:[MANAGED_BY]}];
 const inspect=async(command:any,kind:string,notFound:string,exists:(r:any)=>boolean)=>{
  try {const r=await ec2.send(command);if(r.NextToken||exists(r))remaining.add(kind);}
  catch(e:any){if(e.name!==notFound)throw e;}
 };
 // Check both stored IDs and tags: a lost CreateStack response may leave IDs unset.
 if(run.vpc_id)await inspect(new DescribeVpcsCommand({VpcIds:[run.vpc_id]}),"vpc","InvalidVpcID.NotFound",r=>!!r.Vpcs?.length);
 if(run.instance_id)await inspect(new DescribeInstancesCommand({InstanceIds:[run.instance_id]}),"instance","InvalidInstanceID.NotFound",r=>r.Reservations?.some((x:any)=>x.Instances?.some((i:any)=>i.State?.Name!=="terminated")));
 await inspect(new DescribeVpcsCommand({Filters:filters}),"vpc","InvalidVpcID.NotFound",r=>!!r.Vpcs?.length);
 await inspect(new DescribeInstancesCommand({Filters:filters}),"instance","InvalidInstanceID.NotFound",r=>r.Reservations?.some((x:any)=>x.Instances?.some((i:any)=>i.State?.Name!=="terminated")));
 await inspect(new DescribeVolumesCommand({Filters:filters,MaxResults:1000}),"volume","InvalidVolume.NotFound",r=>r.Volumes?.some((v:any)=>v.State!=="deleted"));
 return [...remaining];
}
export async function verifyRunRemoval(run: any, deps: any={}) {
 const stack=await ownedStack(run,deps);
 if(stack && stack.StackStatus!=="DELETE_COMPLETE")return {verified:false,remaining:["stack"]};
 const remaining=await resourceRemnants(run,deps);
 return {verified:!remaining.length,remaining};
}
async function latest(b:any,run:any) {
 const rows=await b.asServiceRole.entities.CloudLearnerRun.filter({id:run.id});
 if(!rows[0])throw Object.assign(new Error("Run disappeared during lifecycle check"),{name:"RUN_NOT_FOUND"});
 return rows[0];
}
async function released(b:any,run:any,deps:any) {
 const current=await latest(b,run),terminated_at=current.terminated_at||new Date((deps.clock||Date.now)()).toISOString();
 // Repair the projection before releasing capacity, so a failed write is retried.
 if(current.lab_instance_id)await b.asServiceRole.entities.LabInstance.update(current.lab_instance_id,{status:"terminated",provider_status_message:"Learner stack removed and AWS resources verified."});
 const changes={status:"terminated",stack_status:"DELETE_COMPLETE",terminated_at,last_error_code:null};
 await b.asServiceRole.entities.CloudLearnerRun.update(run.id,changes);
 return {...current,...changes};
}
export async function requestCleanup(b:any,run:any,deps:any={}) {
 bound(run);const time=(deps.clock||Date.now)();
 if(starting(run,time))return {run,pending:true,cleanup_requested:false};
 // Persist intent before the provider call. A timeout must never reopen a guest.
 const current=await latest(b,run);
 if(current.status!=="terminated")await b.asServiceRole.entities.CloudLearnerRun.update(run.id,{status:"cleanup_pending"});
 try {
  let stack:any=null;
  try {stack=await ownedStack(current,deps);}
  catch(e:any){
   // A concurrent launch loser owns no stack. Never touch the winning stack.
   if(!(e.name==="STACK_OWNERSHIP_MISMATCH"&&!current.stack_id&&(current.last_error_code==="AlreadyExistsException"||current.contract?.lifecycle?.launch_collision===true)))throw e;
  }
  if(stack && stack.StackStatus!=="DELETE_COMPLETE") {
   let requested=false;
   if(stack.StackStatus!=="DELETE_IN_PROGRESS"){
    await (deps.aws||awsRequest)("cloudformation","DeleteStack",{StackName:stack.StackId,RoleARN:EXECUTION_ROLE_ARN,ClientRequestToken:"cleanup-"+run.id});
    requested=true;
   }
   const changes={status:"cleanup_pending",stack_id:stack.StackId,stack_status:requested?"DELETE_REQUESTED":stack.StackStatus,last_error_code:null};
   await b.asServiceRole.entities.CloudLearnerRun.update(run.id,changes);
   return {run:{...current,...changes},pending:true,cleanup_requested:requested};
  }
  const remaining=await resourceRemnants(current,deps);
  if(remaining.length){
   const changes={status:"cleanup_pending",stack_status:stack?.StackStatus||"NOT_FOUND",last_error_code:"AWS_RESOURCES_REMAIN"};
   await b.asServiceRole.entities.CloudLearnerRun.update(run.id,changes);
   return {run:{...current,...changes},pending:true,cleanup_requested:false,remaining};
  }
  return {run:await released(b,current,deps),pending:false,cleanup_requested:false};
 } catch(e) {
  await b.asServiceRole.entities.CloudLearnerRun.update(run.id,{status:"cleanup_pending",last_error_code:code(e)});
  throw e;
 }
}
export async function refreshLifecycle(b:any,run:any,deps:any={}) {
 bound(run);const time=(deps.clock||Date.now)();
 if(run.status==="terminated")return run;
 const elapsed=time-Date.parse(run.started_at);
 if(["cleanup_pending","failed"].includes(run.status)||Date.parse(run.expires_at)<=time ||
    (run.status==="preparing"&&elapsed>=START_GRACE_MS) ||
    (run.status==="provisioning"&&elapsed>=PROVISION_TIMEOUT_MS))
  return (await requestCleanup(b,run,deps)).run;
 try {
  const stack=await ownedStack(run,deps);
  if(!stack)return starting(run,time)?run:(await requestCleanup(b,run,deps)).run;
  if(stack.StackStatus==="DELETE_COMPLETE"||/FAILED|ROLLBACK|DELETE_IN_PROGRESS/.test(stack.StackStatus))
   return (await requestCleanup(b,run,deps)).run;
  const output=Object.fromEntries(list(stack.Outputs?.member).map((x:any)=>[x.OutputKey,x.OutputValue]));
  const changes:any={stack_id:stack.StackId,stack_status:stack.StackStatus,last_error_code:null};
  if(stack.StackStatus==="CREATE_COMPLETE"){
   changes.instance_id=output.InstanceId;changes.vpc_id=output.VpcId;
   const info=await (deps.aws||awsRequest)("ssm","DescribeInstanceInformation",{Filters:[{Key:"InstanceIds",Values:[output.InstanceId]}],MaxResults:5});
   changes.status=info.InstanceInformationList?.[0]?.PingStatus==="Online"?"ready":"provisioning";
  }else changes.status="provisioning";
  const current=await latest(b,run);
  if(current.status==="terminated")return current;
  if(current.status==="cleanup_pending"||current.contract?.learning?.finished_at)return (await requestCleanup(b,current,deps)).run;
  await b.asServiceRole.entities.CloudLearnerRun.update(run.id,changes);
  if(current.lab_instance_id&&changes.status==="ready")await b.asServiceRole.entities.LabInstance.update(current.lab_instance_id,{status:"running",provider_status_message:"Private SSM guest is online."});
  return {...current,...changes};
 }catch(e){
  await b.asServiceRole.entities.CloudLearnerRun.update(run.id,{last_error_code:code(e)});
  throw e;
 }
}
