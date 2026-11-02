import { assignedLab, assignmentActions } from "./assignments.ts";
import { aws, list, hash } from "./awsControl.ts";
import { EXECUTION_ROLE_ARN } from "./accessConfig.ts";
import { assessGuidedTemplate, freezeGuidedTemplate } from "./templateContract.ts";
import { REGION, ACCOUNT, MANAGED_BY, TASK, requireAccount, canOperate, owns, compileOperation, parseOutput, stackTemplate, type Operation } from "./model.ts";
import { EC2Client, STSClient, GetCallerIdentityCommand, DescribeImagesCommand, DescribeInstanceTypeOfferingsCommand, DescribeInstancesCommand, DescribeVolumesCommand, DescribeVpcsCommand } from "./awsQuery.ts";
const ec2=new EC2Client(),sts=new STSClient();
const STACK_NAME="ExtremeICE-DesignStudio-Learner-Pilot";
const ACTIVE=["preparing","provisioning","ready","cleanup_pending","failed"];
const reply=(body:any,status=200)=>Response.json(body,{status});
const now=()=>new Date().toISOString();
const safe=(e:any)=>String(e?.name||"OPERATION_FAILED").slice(0,80);
const fail=(message:string)=>{throw new Error(message);};
async function assertAccount(){const identity=await sts.send(new GetCallerIdentityCommand({}));requireAccount(identity.Account);return identity;}
async function authoredTemplate(b:any,id:unknown){
 if(typeof id!=="string"||!/^[a-f0-9]{16,32}$/i.test(id))throw Object.assign(new Error("Save and select an AWS guided lab in Lab Builder first."),{name:"TEMPLATE_REQUIRED",status:400});
 const template=(await b.asServiceRole.entities.LabTemplate.filter({id}))[0];
 if(!template)throw Object.assign(new Error("Saved lab template not found."),{name:"TEMPLATE_NOT_FOUND",status:400});
 const assessment=assessGuidedTemplate(template);
 if(!assessment.ready)throw Object.assign(new Error(assessment.errors.join(" ")),{name:"TEMPLATE_NOT_ELIGIBLE",status:400});
 const snapshot=freezeGuidedTemplate(template);
 return {template,snapshot,fingerprint:await hash(JSON.stringify(snapshot))};
}
async function schemaReady(b:any){
 try{await b.asServiceRole.entities.CloudLearnerRun.list("-created_date",1);await b.asServiceRole.entities.CloudGuestOperation.list("-created_date",1);return true;}catch{return false;}
}
async function getStack(run:any){
 try{
 const result=await aws("cloudformation","DescribeStacks",{StackName:run.stack_id||run.stack_name});
 const s=list(result.Stacks?.member)[0];if(!s)return null;
 if(!list(s.Tags?.member).some(t=>t.Key==="LearnerRunId"&&t.Value===run.id)||!list(s.Tags?.member).some(t=>t.Key==="ManagedBy"&&t.Value===MANAGED_BY))fail("STACK_OWNERSHIP_MISMATCH");
 return s;
 }catch(e:any){if(e.name==="ValidationError"&&/does not exist/i.test(e.message))return null;throw e;}
}
async function markTerminated(b:any,run:any){
 const terminated_at=run.terminated_at||now();
 await b.asServiceRole.entities.CloudLearnerRun.update(run.id,{status:"terminated",terminated_at});
 if(run.lab_instance_id&&run.status!=="terminated")await b.asServiceRole.entities.LabInstance.update(run.lab_instance_id,{status:"terminated",provider_status_message:"Learner stack deletion completed."});
 return {...run,status:"terminated",terminated_at};
}
async function refresh(b:any,run:any){
 const stack=await getStack(run);
 if(!stack){if(run.status==="cleanup_pending"||run.stack_id)return await markTerminated(b,run);return run;}
 const state=stack.StackStatus,output=Object.fromEntries(list(stack.Outputs?.member).map(x=>[x.OutputKey,x.OutputValue]));
 const update:any={stack_id:stack.StackId,stack_status:state};
 if(state==="CREATE_COMPLETE"&&run.status!=="cleanup_pending"&&run.status!=="terminated"){
   update.instance_id=output.InstanceId;update.vpc_id=output.VpcId;
   const info=await aws("ssm","DescribeInstanceInformation",{Filters:[{Key:"InstanceIds",Values:[output.InstanceId]}],MaxResults:5});
   update.status=info.InstanceInformationList?.[0]?.PingStatus==="Online"?"ready":"provisioning";
 }else if(state==="DELETE_COMPLETE") {update.status="terminated";update.terminated_at=run.terminated_at||now();}
 else if(/FAILED|ROLLBACK/.test(state)&&state!=="DELETE_IN_PROGRESS")update.status="failed";
 await b.asServiceRole.entities.CloudLearnerRun.update(run.id,update);
 if(run.lab_instance_id && update.status!==run.status && ["ready","terminated"].includes(update.status))await b.asServiceRole.entities.LabInstance.update(run.lab_instance_id,{status:update.status==="ready"?"running":"terminated",provider_status_message:update.status==="ready"?"Private SSM guest is online.":"Learner stack deletion completed."});
 return {...run,...update};
}
function publicRun(run:any){
 return {id:run.id,status:run.status,stack_status:run.stack_status,instance_id:run.instance_id,expires_at:run.expires_at,contract:run.contract,owner_user_id:run.owner_user_id,template_id:run.template_id};
}
export async function handleLearnerRequest(req:Request,b:any){
 const user=await b.auth.me().catch(()=>null);
 if(!user)return reply({error:"Sign in required"},401);
 let input:any;try{input=await req.json();}catch{return reply({error:"Invalid JSON"},400);}
 try{
 const action=input.action;
 const assignmentResponse=await assignmentActions(action,input,b,user);
 if(assignmentResponse)return reply(assignmentResponse);
 let assignmentContext:any=null;
 if(["assignmentPreflight","startAssigned"].includes(action)){
   assignmentContext=await assignedLab(b,user,input.assignment_id);
   input.template_id=assignmentContext.template.id;
 }
 if(action==="preflight"||action==="assignmentPreflight"){
   if(user.role!=="admin"&&!assignmentContext)return reply({error:"Admin pilot provisioning required"},403);
   const source=await authoredTemplate(b,input.template_id);
   const identity=await assertAccount();
   const images=await ec2.send(new DescribeImagesCommand({Owners:["137112412989"],Filters:[{Name:"name",Values:["al2023-ami-2023.*-x86_64"]},{Name:"state",Values:["available"]},{Name:"architecture",Values:["x86_64"]}]}));
   const ami=(images.Images||[]).sort((a:any,b:any)=>String(b.CreationDate).localeCompare(String(a.CreationDate)))[0]?.ImageId;if(!ami)fail("NO_AMI");
   const offerings=await ec2.send(new DescribeInstanceTypeOfferingsCommand({LocationType:"availability-zone",Filters:[{Name:"instance-type",Values:["t3.micro"]}]}));
   const zone=(offerings.Offerings||[]).map((x:any)=>x.Location).filter((x:any)=>/^us-east-1[a-f]$/.test(x)).sort()[0];if(!zone)fail("NO_ZONE");
   const template=stackTemplate(ami,zone,"0123456789abcdef01234567");
   await aws("cloudformation","ValidateTemplate",{TemplateBody:JSON.stringify(template)});
   await aws("ssm","DescribeInstanceInformation",{MaxResults:5});
   const ready=await schemaReady(b);
   return reply({template_id:source.template.id,template_hash:source.fingerprint,template_title:source.snapshot.title,schema_ready:ready,eligible:ready,account:identity.Account,region:REGION,ami_id:ami,zone,scope:"One t3.micro, encrypted 8 GiB disk, new VPC/subnet, two private SSM endpoints, two security groups, and the preconfigured SSM instance profile. No public IP or internet gateway. Endpoints remain billable until stack cleanup.",task:TASK});
 }
 if(action==="list"){
   if(!await schemaReady(b))return reply({runs:[],schema_ready:false});
   const runs=await b.asServiceRole.entities.CloudLearnerRun.filter(user.role==="admin"?{}:{owner_user_id:user.id},"-created_date",50);
   return reply({runs:runs.map(publicRun),schema_ready:true});
 }
 if(action==="provision"||action==="startAssigned"){
   if(user.role!=="admin"&&!assignmentContext)return reply({error:"Admin pilot provisioning required"},403);
   if(input.ack!=="LAUNCH_PRIVATE_SSM_LEARNER_PILOT")return reply({error:"Explicit scope acknowledgment required"},400);
   stackTemplate(input.ami_id,input.zone,"0123456789abcdef01234567");
   if(!await schemaReady(b))return reply({error:"Shared learner schemas are required"},409);
   const active=await b.asServiceRole.entities.CloudLearnerRun.filter({status:{$in:ACTIVE}});
   const resumable=assignmentContext&&active.find((r:any)=>r.owner_user_id===user.id&&r.contract?.assignment_id===assignmentContext.assignment.id);
   if(resumable)return reply({run_id:resumable.id,status:resumable.status,expires_at:resumable.expires_at,resumed:true});
   if(active.length)return reply({error:"The single lab environment is in use or awaiting cleanup. Try again when it is available.",error_code:"LAB_CAPACITY_BUSY"},409);
   const old=await b.asServiceRole.entities.CloudPocRun.filter({status:{$in:["preparing","provisioning","running","cleanup_pending"]}});if(old.length)return reply({error:"A previous AWS proof is active"},409);
   const source=await authoredTemplate(b,input.template_id);
   if(input.template_hash!==source.fingerprint)return reply({error:"The saved template changed after preflight. Check AWS learner access again."},409);
   await assertAccount();
   const images=await ec2.send(new DescribeImagesCommand({Owners:["137112412989"],Filters:[{Name:"image-id",Values:[input.ami_id]},{Name:"state",Values:["available"]},{Name:"name",Values:["al2023-ami-2023.*-x86_64"]}]}));
   if(!images.Images?.some((x:any)=>x.ImageId===input.ami_id))fail("AMI_PREFLIGHT_CHANGED");
   const zones=await ec2.send(new DescribeInstanceTypeOfferingsCommand({LocationType:"availability-zone",Filters:[{Name:"instance-type",Values:["t3.micro"]},{Name:"location",Values:[input.zone]}]}));if(!zones.Offerings?.some((x:any)=>x.Location===input.zone))fail("ZONE_PREFLIGHT_CHANGED");
   const expires=new Date(Date.now()+110*60000).toISOString();
   const run=await b.asServiceRole.entities.CloudLearnerRun.create({owner_user_id:user.id,owner_email:user.email,status:"preparing",region:REGION,stack_name:STACK_NAME,contract:{...TASK,...(assignmentContext?{assignment_id:assignmentContext.assignment.id}:{}),title:source.snapshot.lab_content.tasks[0].title,account_id:ACCOUNT,template_snapshot:source.snapshot},template_id:source.template.id,started_at:now(),expires_at:expires});
   try{
     const lab=await b.asServiceRole.entities.LabInstance.create({template_id:source.template.id,user_email:user.email,status:"provisioning",provider:"aws",template_snapshot:source.snapshot,template_version:source.template.version||"",started_at:now(),expires_at:expires,provider_status_message:"Creating private SSM learner stack."});
     await b.asServiceRole.entities.CloudLearnerRun.update(run.id,{lab_instance_id:lab.id});
     const result=await aws("cloudformation","CreateStack",{StackName:STACK_NAME,TemplateBody:JSON.stringify(stackTemplate(input.ami_id,input.zone,run.id)),RoleARN:EXECUTION_ROLE_ARN,OnFailure:"DELETE",TimeoutInMinutes:15,ClientRequestToken:run.id,Tags:[{Key:"ManagedBy",Value:MANAGED_BY},{Key:"LearnerRunId",Value:run.id}]});
     await b.asServiceRole.entities.CloudLearnerRun.update(run.id,{stack_id:result.StackId,status:"provisioning"});
     return reply({run_id:run.id,status:"provisioning",expires_at:expires});
   }catch(e){await b.asServiceRole.entities.CloudLearnerRun.update(run.id,{status:"failed",last_error_code:safe(e)});return reply({error:"Provisioning request failed; inspect or clean up this run",error_code:safe(e),run_id:run.id},502);}
 }
 if(typeof input.run_id!=="string"||!/^[a-f0-9]{16,32}$/i.test(input.run_id))return reply({error:"Invalid run"},400);
 let run=(await b.asServiceRole.entities.CloudLearnerRun.filter({id:input.run_id}))[0];
 if(!run)return reply({error:"Run not found"},404);
 if(!owns(run,user)&&user.role!=="admin")return reply({error:"Run access denied"},403);
 if(run.contract?.account_id!==ACCOUNT)fail("RUN_ACCOUNT_BINDING_MISMATCH");
 if(action==="workspaceState"){
   const operations=await b.asServiceRole.entities.CloudGuestOperation.filter({run_id:run.id,owner_user_id:user.id,status:"pending"},"-created_date",20);
   return reply({run:publicRun(run),pending_operation:operations[0]?{id:operations[0].id,kind:operations[0].kind}:null});
 }
 if(action==="validationHistory"){
   if(!run.lab_instance_id)return reply({checks:[]});
   const attempts=await b.asServiceRole.entities.RuntimeValidationAttempt.filter({instance_id:run.lab_instance_id,task_id:TASK.task_id,check_id:TASK.check_id},"-created_date",20);
   return reply({checks:attempts.filter((a:any)=>a.evidence?.run_id===run.id).map((a:any)=>({id:a.id,status:a.status,passed:a.passed,observed:a.observed}))});
 }
 await assertAccount();
 if(action==="refresh"){run=await refresh(b,run);return reply({run:publicRun(run)});}
 if(action==="cleanup"||action==="finish"){
   if(input.ack!=="DELETE_LEARNER_STACK")return reply({error:"Cleanup acknowledgment required"},400);
   if(action==="finish"){
    const current=(await b.asServiceRole.entities.CloudLearnerRun.filter({id:run.id}))[0];
    run={...run,contract:{...current.contract,learning:{...current.contract.learning,finished_at:current.contract.learning?.finished_at||now()}}};
    await b.asServiceRole.entities.CloudLearnerRun.update(run.id,{contract:run.contract});
   }
   let stack;
   try{stack=await getStack(run);}catch(e){if(!run.stack_id&&run.last_error_code==="AlreadyExistsException"){await markTerminated(b,run);return reply({status:"terminated"});}throw e;}
   if(!stack||stack.StackStatus==="DELETE_COMPLETE"){await markTerminated(b,run);return reply({status:"terminated"});}
   await aws("cloudformation","DeleteStack",{StackName:stack.StackId,RoleARN:EXECUTION_ROLE_ARN,ClientRequestToken:"cleanup-"+run.id});
   await b.asServiceRole.entities.CloudLearnerRun.update(run.id,{status:"cleanup_pending"});return reply({status:"cleanup_pending"});
 }
 if(action==="verifyRemoval"){
   const stack=await getStack(run);if(stack&&stack.StackStatus!=="DELETE_COMPLETE")return reply({verified:false,remaining:["stack"]});
   const remaining=[];
   if(run.vpc_id){try{const v=await ec2.send(new DescribeVpcsCommand({VpcIds:[run.vpc_id]}));if(v.Vpcs?.length)remaining.push("vpc");}catch(e:any){if(e.name!=="InvalidVpcID.NotFound")throw e;}}
   if(run.instance_id){try{const state=(await ec2.send(new DescribeInstancesCommand({InstanceIds:[run.instance_id]}))).Reservations?.flatMap((r:any)=>r.Instances||[])[0]?.State?.Name;if(state&&state!=="terminated")remaining.push("instance");}catch(e:any){if(e.name!=="InvalidInstanceID.NotFound")throw e;}}
   const volumes=await ec2.send(new DescribeVolumesCommand({Filters:[{Name:"tag:LearnerRunId",Values:[run.id]},{Name:"tag:ManagedBy",Values:[MANAGED_BY]}],MaxResults:1000}));
   if(volumes.NextToken||volumes.Volumes?.some((x:any)=>x.State!=="deleted"))remaining.push("volume");
   return reply({verified:remaining.length===0,remaining});
 }
 if(action==="startOperation"){
   if(run.contract.assignment_id){const access=await assignedLab(b,user,run.contract.assignment_id,false);if(access.assignment.lab_id!==run.template_id)return reply({error:"Assignment changed. Finish this session and contact your instructor."},403);}
   if(run.contract.learning?.finished_at)return reply({error:"This learning session has finished. Start a new session to try again."},409);
   if(!canOperate(run,user))return reply({error:"Only the owner of a ready, unexpired run can access its guest"},403);
   const kind=input.kind as Operation;if(!["read","write","validate"].includes(kind))return reply({error:"Unsupported task action"},400);
   const nonce=crypto.randomUUID().replaceAll("-","");
   const script=compileOperation(kind,nonce,input.content,input.mode);
   const stack=await getStack(run);if(stack?.StackStatus!=="CREATE_COMPLETE")return reply({error:"Guest stack is not ready"},409);
   const output=Object.fromEntries(list(stack.Outputs?.member).map(x=>[x.OutputKey,x.OutputValue]));
   if(output.InstanceId!==run.instance_id)fail("INSTANCE_BINDING_MISMATCH");
   const op=await b.asServiceRole.entities.CloudGuestOperation.create({run_id:run.id,owner_user_id:user.id,kind,status:"pending",binding:nonce,expires_at:new Date(Math.min(Date.now()+120000,Date.parse(run.expires_at))).toISOString()});
   try{
     const result=await aws("ssm","SendCommand",{DocumentName:"AWS-RunShellScript",InstanceIds:[run.instance_id],Parameters:{commands:[script],executionTimeout:["30"]},TimeoutSeconds:30,MaxConcurrency:"1",MaxErrors:"0",Comment:"Design Studio guided task "+op.id});
     if(!result.Command?.CommandId)fail("COMMAND_ID_MISSING");
     await b.asServiceRole.entities.CloudGuestOperation.update(op.id,{command_id:result.Command.CommandId});
     return reply({operation_id:op.id,status:"pending"});
   }catch(e){await b.asServiceRole.entities.CloudGuestOperation.update(op.id,{status:"failed",error_code:safe(e)});throw e;}
 }
 if(action==="pollOperation"){
   if(!owns(run,user))return reply({error:"Guest operation access denied"},403);
   if(typeof input.operation_id!=="string"||!/^[a-f0-9]{16,32}$/i.test(input.operation_id))return reply({error:"Invalid operation"},400);
   const op=(await b.asServiceRole.entities.CloudGuestOperation.filter({id:input.operation_id,run_id:run.id,owner_user_id:user.id}))[0];if(!op)return reply({error:"Operation not found"},404);
   if(op.status!=="pending")return reply({status:op.status,result:op.result||null,error_code:op.error_code||null});
   if(Date.now()>Date.parse(op.expires_at)){await b.asServiceRole.entities.CloudGuestOperation.update(op.id,{status:"expired"});return reply({status:"expired"});}
   if(!op.command_id)return reply({status:"pending"});
   let command;
   try{command=await aws("ssm","GetCommandInvocation",{CommandId:op.command_id,InstanceId:run.instance_id});}catch(e:any){if(e.name==="InvocationDoesNotExist")return reply({status:"pending"});throw e;}
   if(["Pending","InProgress","Delayed"].includes(command.Status))return reply({status:"pending"});
   if(command.Status!=="Success"||command.ResponseCode!==0){await b.asServiceRole.entities.CloudGuestOperation.update(op.id,{status:"failed",error_code:"GUEST_COMMAND_FAILED"});return reply({status:"failed",error_code:"GUEST_COMMAND_FAILED"});}
   let result;
   try{result=parseOutput(op.kind,op.binding,command.StandardOutputContent||"");}catch{await b.asServiceRole.entities.CloudGuestOperation.update(op.id,{status:"failed",error_code:"INVALID_GUEST_OUTPUT"});return reply({status:"failed",error_code:"INVALID_GUEST_OUTPUT"});}
   if(op.kind==="validate"){
     const existing=await b.asServiceRole.entities.RuntimeValidationAttempt.filter({instance_id:run.lab_instance_id||run.id,task_id:TASK.task_id,check_id:TASK.check_id});
     if(!existing.some((a:any)=>a.evidence?.operation_id===op.id))await b.asServiceRole.entities.RuntimeValidationAttempt.create({instance_id:run.lab_instance_id||run.id,user_email:user.email,task_id:TASK.task_id,check_id:TASK.check_id,validator_type:"command_result",status:"completed",token_hash:await hash(op.binding),expires_at:op.expires_at,passed:(result as any).passed,observed:(result as any).mode,message:"SSM observed the guest file mode independently.",evidence:{run_id:run.id,operation_id:op.id,command_id:op.command_id,path:run.contract.path,template_id:run.template_id,expected_mode:run.contract.expected_mode,source:"aws_ssm_guided_task"}});
   }
   if(op.kind==="validate"){
     const current=(await b.asServiceRole.entities.CloudLearnerRun.filter({id:run.id}))[0];
     const learning={...current.contract.learning,last_validation:{passed:(result as any).passed,mode:(result as any).mode,operation_id:op.id},...((result as any).passed?{completed_at:current.contract.learning?.completed_at||now()}:{} )};
     await b.asServiceRole.entities.CloudLearnerRun.update(run.id,{contract:{...current.contract,learning}});
     if(run.lab_instance_id)await b.asServiceRole.entities.LabInstance.update(run.lab_instance_id,{progress:learning.completed_at?100:0,score:learning.completed_at?100:0,...(learning.completed_at?{completed_at:learning.completed_at}:{}),task_results:[{task_id:TASK.task_id,check_id:TASK.check_id,passed:(result as any).passed,observed:(result as any).mode,validation_operation_id:op.id}]});
   }
   await b.asServiceRole.entities.CloudGuestOperation.update(op.id,{status:"completed",result});
   return reply({status:"completed",result});
 }
 return reply({error:"Unknown action"},400);
 }catch(e:any){return reply({error:"AWS learner request failed",error_code:safe(e),detail:String(e.message||"").slice(0,300)},[400,403,404,409].includes(e.status)?e.status:502);}
}
