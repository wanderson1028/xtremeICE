import { handleLearnerRequest } from "./handler.ts";
import { buildAiGuidedTemplate, TASK_PATH } from "./templateContract.ts";
import { normalizeTasks } from "../../../src/lib/taskModel.js";
const clone=(v:any)=>JSON.parse(JSON.stringify(v));
function check(v:unknown,label="workflow assertion"){if(!v)throw new Error(label);}
Deno.test("Assignment rehearsal: instructor controls, non-admin start, one guest, resume, revocation and retained completion",async()=>{
 const directory=await Deno.makeTempDir({dir:"/tmp",prefix:"ds-workflow-"});
 const originalFetch=globalThis.fetch;
 Deno.env.set("AWS_LEARNER_ACCESS_KEY_ID","EXAMPLE_LEARNER_ACCESS");
 Deno.env.set("AWS_LEARNER_SECRET_ACCESS_KEY","EXAMPLE_LEARNER_SECRET");
 const tables:Record<string,any[]>={};let sequence=0;
 const id=()=> (++sequence).toString(16).padStart(24,"0");
 let user:any={id:"owner-id",email:"owner@example.invalid",role:"admin"};
 const entities:any=new Proxy({}, {get(_target,name:string){
   tables[name] ||= [];
   return {
    list:async()=>clone(tables[name]),
    filter:async(query:any,sort?:string,limit=100)=>{let rows=tables[name].filter(row=>Object.entries(query).every(([k,v]:any)=>v&&typeof v==="object"&&v.$in?v.$in.includes(row[k]):row[k]===v));if(sort==="-created_date")rows=[...rows].reverse();return clone(rows.slice(0,limit));},
    delete:async(key:string)=>{tables[name]=tables[name].filter(r=>r.id!==key);},
    get:async(key:string)=>clone(tables[name].find(r=>r.id===key)),
    create:async(record:any)=>{const row={...clone(record),id:id(),created_date:new Date().toISOString()};tables[name].push(row);return clone(row);},
    update:async(key:string,update:any)=>{const row=tables[name].find(r=>r.id===key);if(!row)throw new Error("Missing fake row");Object.assign(row,clone(update));return clone(row);}
   };
 }});
 const client={auth:{me:async()=>user},asServiceRole:{entities}};
 const narrative={title:"Linux file protection",description:"AI-response-shaped rehearsal fixture, not a live AI result.",scenario:"Protect a configuration file.",task_title:"Protect the task file",instructions:"Reviewed instructions: validate, edit, save 600 and validate again.",objectives:["Read","Edit","Validate"],prerequisites:[]};
 const draft:any=buildAiGuidedTemplate(narrative);draft.lab_content.tasks=normalizeTasks(draft.lab_content.tasks);
 draft.id="0123456789abcdef01234567";tables.LabTemplate=[draft];tables.User=[{id:"owner-id",email:"owner@example.invalid",role:"user"},{id:"other-id",email:"other@example.invalid",role:"user"}];
 const commands=new Map<string,any>();const observed:string[]=[];
 let account="935838375949",stackState="CREATE_COMPLETE";
 const instance="i-0123456789abcdef0",vpc="vpc-0123456789abcdef0",stack="arn:aws:cloudformation:us-east-1:935838375949:stack/ExtremeICE-DesignStudio-Learner-Pilot/test-id";
 const target=directory+"/fixture/proof.txt";await Deno.mkdir(directory+"/fixture");await Deno.writeTextFile(target,"initial");await Deno.chmod(target,0o644);
 const xml=(action:string,body:string)=>new Response("<"+action+"Response>"+body+"</"+action+"Response>");
 globalThis.fetch=async(url:any,init:any)=>{
   const endpoint=new URL(String(url)),ssm=endpoint.hostname.startsWith("ssm."),cf=endpoint.hostname.startsWith("cloudformation.");
   const q=new URLSearchParams(init?.body||(endpoint.search.slice(1))),input=ssm?JSON.parse(init.body):null;
   const action=ssm?init.headers["x-amz-target"].split(".").pop():q.get("Action")!;observed.push(action);
   if(action==="GetCallerIdentity")return xml(action,"<GetCallerIdentityResult><Account>"+account+"</Account></GetCallerIdentityResult>");
   if(action==="DescribeImages")return xml(action,"<imagesSet><item><imageId>ami-0123456789abcdef0</imageId><creationDate>2026-01-01</creationDate></item></imagesSet>");
   if(action==="DescribeInstanceTypeOfferings")return xml(action,"<instanceTypeOfferingSet><item><location>us-east-1a</location></item></instanceTypeOfferingSet>");
   if(cf&&action==="ValidateTemplate")return xml(action,"<ValidateTemplateResult/>");
   if(action==="DescribeInstanceInformation")return Response.json({InstanceInformationList:[{InstanceId:instance,PingStatus:"Online"}]});
   if(action==="CreateStack"){
    check(q.get("RoleARN")==="arn:aws:iam::935838375949:role/DesignStudioLearnerCloudFormationRole","execution role binding");
    const template=JSON.parse(q.get("TemplateBody")!);check(template.Resources.Guest.Properties.IamInstanceProfile==="DesignStudioLearnerGuestProfile","guest profile");
    return xml(action,"<CreateStackResult><StackId>"+stack+"</StackId></CreateStackResult>");
   }
   if(action==="DescribeStacks"){
    const run=tables.CloudLearnerRun?.[0];check(run,"fake run exists");
    return xml(action,"<DescribeStacksResult><Stacks><member><StackId>"+stack+"</StackId><StackStatus>"+stackState+"</StackStatus><Tags><member><Key>ManagedBy</Key><Value>ExtremeICE-DesignStudio-Learner</Value></member><member><Key>LearnerRunId</Key><Value>"+run.id+"</Value></member></Tags><Outputs><member><OutputKey>InstanceId</OutputKey><OutputValue>"+instance+"</OutputValue></member><member><OutputKey>VpcId</OutputKey><OutputValue>"+vpc+"</OutputValue></member></Outputs></member></Stacks></DescribeStacksResult>");
   }
   if(action==="SendCommand"){
    check(input.InstanceIds.length===1&&input.InstanceIds[0]===instance,"command bound to server instance");
    const script=input.Parameters.commands.join("\n").replaceAll(TASK_PATH,target).replaceAll("/var/tmp/design-studio-learner/",directory+"/fixture/").replaceAll("/var/lock/design-studio-learner.lock",directory+"/task.lock");
    const result=await new Deno.Command("bash",{args:["-c",script],stdout:"piped",stderr:"piped"}).output();
    const key=crypto.randomUUID();commands.set(key,{CommandId:key,InstanceId:instance,Status:result.success?"Success":"Failed",ResponseCode:result.code,StandardOutputContent:new TextDecoder().decode(result.stdout),reads:0});
    return Response.json({Command:{CommandId:key}});
   }
   if(action==="GetCommandInvocation"){
    const command=commands.get(input.CommandId);check(command&&input.InstanceId===command.InstanceId,"poll uses stored binding");
    if(command.reads++===0)return Response.json({__type:"InvocationDoesNotExist",Message:"Eventual consistency"},{status:400});
    return Response.json(command);
   }
   if(action==="DeleteStack"){check(q.get("RoleARN")?.includes("935838375949"),"cleanup account");stackState="DELETE_IN_PROGRESS";return xml(action,"<DeleteStackResult/>");}
   if(action==="DescribeInstances")return xml(action,"<reservationSet><item><instancesSet><item><instanceState><name>terminated</name></instanceState></item></instancesSet></item></reservationSet>");
   if(action==="DescribeVpcs")return new Response("<Response><Errors><Error><Code>InvalidVpcID.NotFound</Code></Error></Errors></Response>",{status:400});
   if(action==="DescribeVolumes")return xml(action,"<volumeSet/>");
   throw new Error("Unexpected fake AWS action "+action);
 };
 const api=async(action:string,fields:any={})=>{const response=await handleLearnerRequest(new Request("https://example.invalid/learner",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action,...fields})}),client);return {status:response.status,body:await response.json()};};
 try{
  user=null;check((await api("assignedLabs")).status===401,"anonymous denied");
  user={id:"owner-id",email:"owner@example.invalid",role:"user"};
  const beforeDenied=observed.length;
  check((await api("assignmentCatalog")).status===403,"learner cannot inspect other users");
  check((await api("assignLab",{template_id:draft.id,user_id:user.id})).status===403,"learner cannot self-assign");
  check((await api("assignmentPreflight",{assignment_id:"abcdefabcdefabcdefabcdef"})).status===403,"unassigned preflight denied");
  check((await api("startAssigned",{assignment_id:"abcdefabcdefabcdefabcdef"})).status===403,"unassigned start denied");
  check((await api("provision",{template_id:draft.id})).status===403,"legacy admin endpoint remains gated");
  check(observed.length===beforeDenied,"unassigned requests never contact AWS");
  user={id:"instructor-id",email:"teacher@example.invalid",role:"admin"};
  const catalog=(await api("assignmentCatalog")).body;check(catalog.labs.length===1&&catalog.users.length===2,"instructor catalog");
  const oldHash=catalog.labs[0].template_hash;draft.lab_content.tasks[0].instructions="Reviewed revision";
  check((await api("assignLab",{template_id:draft.id,template_hash:oldHash,user_id:"owner-id"})).status===409,"stale instructor review rejected");
  const reviewed=(await api("assignmentCatalog")).body.labs[0];
  const assigned=await api("assignLab",{template_id:draft.id,template_hash:reviewed.template_hash,user_id:"owner-id"});
  const assignmentId=assigned.body.assignment_id;check(assignmentId,"assignment created");
  const duplicate=await api("assignLab",{template_id:draft.id,template_hash:reviewed.template_hash,user_id:"owner-id"});check(duplicate.body.assignment_id===assignmentId,"sequential assignment idempotent");
  user={id:"other-id",email:"other@example.invalid",role:"user"};
  check((await api("assignedLabs")).body.assignments.length===0,"other learner has no assignment");
  check((await api("assignmentPreflight",{assignment_id:assignmentId})).status===403,"cannot use another learner assignment");
  user={id:"owner-id",email:"owner@example.invalid",role:"user"};
  check((await api("assignedLabs")).body.capacity_available===true,"pilot initially free");
  const plan=(await api("assignmentPreflight",{assignment_id:assignmentId})).body;
  const launchFields={assignment_id:assignmentId,ack:"LAUNCH_PRIVATE_SSM_LEARNER_PILOT",template_hash:plan.template_hash,ami_id:plan.ami_id,zone:plan.zone};
  const launched=await api("startAssigned",launchFields);
  check(launched.status===200,"provision accepted");const runId=launched.body.run_id,run=tables.CloudLearnerRun[0],lab=tables.LabInstance[0];
  check(lab.template_id===draft.id&&lab.template_snapshot.lab_content.tasks[0].instructions==="Reviewed revision","reviewed snapshot linked");
  const provisioningState=run.status;run.status="preparing";const boundStack=run.stack_id;delete run.stack_id;
  check((await api("finish",{run_id:runId,ack:"DELETE_LEARNER_STACK"})).status===409,"finish cannot race an unsettled start request");run.status=provisioningState;run.stack_id=boundStack;
  check((await api("startAssigned",launchFields)).body.run_id===runId,"repeat start resumes same run");
  check(tables.CloudLearnerRun.length===1&&observed.filter(a=>a==="CreateStack").length===1,"repeat start launches no second guest");
  check((await api("assignedLabs")).body.capacity_available===false,"occupied capacity visible without owner details");
  const secondAssignment=await entities.UserLabAssignment.create({user_email:"other@example.invalid",lab_id:draft.id,lab_type:"lab_course",service_key:"lab_scenarios"});
  user={id:"other-id",email:"other@example.invalid",role:"user"};
  const occupiedAt=observed.length;
  check((await api("startAssigned",{...launchFields,assignment_id:secondAssignment.id})).body.error_code==="LAB_CAPACITY_BUSY","second learner blocked by global capacity");
  check(observed.length===occupiedAt,"capacity denial does not contact AWS");
  user={id:"owner-id",email:"owner@example.invalid",role:"user"};
  draft.lab_content.tasks[0].instructions="Edited after provisioning";check(run.contract.template_snapshot.lab_content.tasks[0].instructions==="Reviewed revision","run snapshot immutable");
  check((await api("refresh",{run_id:runId})).body.run.status==="ready","SSM ready");
  const count=observed.length;user={id:"other-id",email:"other@example.invalid",role:"user"};
  check((await api("startOperation",{run_id:runId,kind:"read"})).status===403,"another learner denied");
  check(observed.length===count,"owner denial precedes AWS dispatch");
  user={id:"owner-id",email:"owner@example.invalid",role:"user"};
  const savedAssignment=clone(tables.UserLabAssignment.find(a=>a.id===assignmentId));
  check((await api("revokeAssignment",{assignment_id:assignmentId})).status===403,"learner cannot revoke");
  user={id:"instructor-id",email:"teacher@example.invalid",role:"admin"};
  check((await api("revokeAssignment",{assignment_id:assignmentId})).body.revoked,"instructor revokes");
  user={id:"owner-id",email:"owner@example.invalid",role:"user"};
  check((await api("startOperation",{run_id:runId,kind:"read"})).status===403,"revoked assignment cannot dispatch guest commands");
  tables.UserLabAssignment.push(savedAssignment);
  const operate=async(kind:string,content?:string,mode?:string)=>{
   const started=await api("startOperation",{run_id:runId,kind,content,mode});check(started.status===200,"owner operation start");
   const state=(await api("workspaceState",{run_id:runId})).body;
   check(state.pending_operation.id===started.body.operation_id&&state.pending_operation.kind===kind,"reload recovers pending command without dispatch");
   const pending=await api("pollOperation",{run_id:runId,operation_id:started.body.operation_id});check(pending.body.status==="pending","SSM eventual consistency handled");
   const done=await api("pollOperation",{run_id:runId,operation_id:started.body.operation_id});check(done.body.status==="completed","operation completed");
   const size=commands.size;const repeated=await api("pollOperation",{run_id:runId,operation_id:started.body.operation_id});check(repeated.body.status==="completed"&&commands.size===size,"poll does not replay command");
   return done.body.result;
  };
  check((await operate("validate")).passed===false,"initial failure");
  check((await operate("read")).content==="initial","initial actual file");
  await operate("write","Changed through guided editor 🧊","600");
  check((await operate("read")).content==="Changed through guided editor 🧊","edited file persists");
  check((await operate("validate")).passed===true,"protected file passes");
  check(tables.CloudLearnerRun[0].contract.learning.completed_at&&tables.LabInstance[0].progress===100,"passing validation records learning completion");
  const completedAt=tables.CloudLearnerRun[0].contract.learning.completed_at;
  await operate("write","Reverted","644");check((await operate("validate")).passed===false,"new validation fails after revert");
  const history=(await api("validationHistory",{run_id:runId})).body.checks;check(history.length===3&&history[0].passed===false&&history[1].passed===true&&history[2].passed===false,"stored fail-pass-fail history");
  const expiredStart=await api("startOperation",{run_id:runId,kind:"validate"});const op=tables.CloudGuestOperation.find(x=>x.id===expiredStart.body.operation_id);op.expires_at="2000-01-01T00:00:00Z";
  check((await api("pollOperation",{run_id:runId,operation_id:op.id})).body.status==="expired","late result rejected");
  check(tables.RuntimeValidationAttempt.length===3,"expired evidence not recorded");
  check((await api("finish",{run_id:runId})).status===400,"finish requires acknowledgment");
  check(!tables.CloudLearnerRun[0].contract.learning.finished_at,"missing acknowledgment changes no completion state");
  check((await api("finish",{run_id:runId,ack:"DELETE_LEARNER_STACK"})).body.status==="cleanup_pending","cleanup requested");
  stackState="DELETE_COMPLETE";check((await api("refresh",{run_id:runId})).body.run.status==="terminated","stack termination observed");
  check(tables.LabInstance[0].status==="terminated","course instance terminated");
  check(tables.CloudLearnerRun[0].contract.learning.completed_at===completedAt&&tables.LabInstance[0].completed_at===completedAt,"cleanup preserves learning achievement time");
  check(tables.CloudLearnerRun[0].contract.learning.finished_at,"finish closes learning session independently");
  check((await api("assignedLabs")).body.capacity_available===true,"cleanup releases pilot capacity");
  check((await api("verifyRemoval",{run_id:runId})).body.verified===true,"mock AWS inventory reconciled");
 }finally{
  globalThis.fetch=originalFetch;
  Deno.env.delete("AWS_LEARNER_ACCESS_KEY_ID");Deno.env.delete("AWS_LEARNER_SECRET_ACCESS_KEY");
  await Deno.remove(directory,{recursive:true});
 }
});