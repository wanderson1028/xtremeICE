import { aws, list } from "./awsControl.ts";
import { ownedStack } from "./lifecycle.ts";
import { requireAccount, MANAGED_BY } from "./model.ts";
import { EC2Client, STSClient, GetCallerIdentityCommand, DescribeInstancesCommand, DescribeVpcsCommand, DescribeVolumesCommand } from "./awsQuery.ts";
export const REHEARSAL_DEADLINE=Date.parse("2026-11-05T07:30:00Z");
export const TARGET_RUN="";
const denied=(name:string)=>{throw Object.assign(new Error(name),{name,status:403});};
export async function rehearsalAction(action:string,input:any,b:any,user:any){
 if(!["rehearsalInspect","rehearsalInterrupt","rehearsalCommand"].includes(action))return null;
 if(user?.role!=="admin")denied("REHEARSAL_ADMIN_REQUIRED");
 if(Date.now()>REHEARSAL_DEADLINE)denied("REHEARSAL_WINDOW_CLOSED");
 const identity=await new STSClient().send(new GetCallerIdentityCommand({}));requireAccount(identity.Account);
 if(action==="rehearsalInspect"){
  const ec2=new EC2Client(),Filters=[{Name:"tag:ManagedBy",Values:[MANAGED_BY]}];
  const [vpcs,instances,volumes]=await Promise.all([
   ec2.send(new DescribeVpcsCommand({Filters})),
   ec2.send(new DescribeInstancesCommand({Filters})),
   ec2.send(new DescribeVolumesCommand({Filters,MaxResults:1000})),
  ]);
  return {checked_at:new Date().toISOString(),account:identity.Account,region:"us-east-1",vpcs:vpcs.Vpcs.length,active_instances:instances.Reservations.flatMap((r:any)=>r.Instances).filter((i:any)=>i.State.Name!=="terminated").length,volumes:volumes.Volumes.filter((v:any)=>v.State!=="deleted").length,incomplete:!!(vpcs.NextToken||instances.NextToken||volumes.NextToken)};
 }
 if(!TARGET_RUN||input.run_id!==TARGET_RUN)denied("REHEARSAL_RUN_REQUIRED");
 const run=(await b.asServiceRole.entities.CloudLearnerRun.filter({id:TARGET_RUN}))[0];
 if(!run||run.owner_user_id!==user.id)denied("REHEARSAL_OWNER_REQUIRED");
 if(action==="rehearsalCommand"){
  const command_id=run.contract?.lifecycle?.rehearsal_command_id;
  if(!command_id)return {status:"not_recorded"};
  const r=await aws("ssm","GetCommandInvocation",{CommandId:command_id,InstanceId:run.instance_id});
  return {status:r.Status,response_code:r.ResponseCode,output:String(r.StandardOutputContent||"").slice(0,2000),command_id};
 }
 if(run.contract?.lifecycle?.rehearsal_requested_at)return {status:"already_requested",requested_at:run.contract.lifecycle.rehearsal_requested_at,command_id:run.contract.lifecycle.rehearsal_command_id||null};
 if(run.status!=="ready"||run.cleanup_requested_at||Date.parse(run.expires_at)-Date.now()<8*60000)denied("REHEARSAL_RUN_NOT_READY");
 const stack=await ownedStack(run);if(!stack||stack.StackStatus!=="CREATE_COMPLETE")denied("REHEARSAL_STACK_NOT_READY");
 const lifecycle={...run.contract?.lifecycle,rehearsal_requested_at:new Date().toISOString(),rehearsal_pause_seconds:45};
 await b.asServiceRole.entities.CloudLearnerRun.update(run.id,{contract:{...run.contract,lifecycle}});
 // A detached, fixed systemd job restarts the agent even if the SSM worker disconnects.
 const script="set -eu\nsystemd-run --unit=design-studio-recovery-rehearsal --on-active=5s --property=Type=oneshot /bin/bash -c 'date -u +pause-start:%FT%TZ; systemctl stop amazon-ssm-agent; sleep 45; systemctl start amazon-ssm-agent; date -u +pause-end:%FT%TZ'\necho 'Recovery job scheduled: agent pause 45 seconds, automatic restart.'";
 const result=await aws("ssm","SendCommand",{DocumentName:"AWS-RunShellScript",InstanceIds:[run.instance_id],TimeoutSeconds:60,Parameters:{commands:[script],executionTimeout:["30"]}});
 const current=(await b.asServiceRole.entities.CloudLearnerRun.filter({id:run.id}))[0];
 await b.asServiceRole.entities.CloudLearnerRun.update(run.id,{contract:{...current.contract,lifecycle:{...current.contract.lifecycle,rehearsal_command_id:result.Command.CommandId}}});
 return {status:"scheduled",command_id:result.Command.CommandId,pause_seconds:45,restart_delay_seconds:5};
}
