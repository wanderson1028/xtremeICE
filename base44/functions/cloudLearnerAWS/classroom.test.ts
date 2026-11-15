import { handleLearnerRequest } from "./handler.ts";
import { buildGuidedTemplate, freezeGuidedTemplate } from "./templateContract.ts";
import { hash } from "./awsControl.ts";
import { capacityConflict, CLASSROOM_SETTING, stackForSlot } from "./classroom.ts";
import { sweepExpiredLearners } from "./expiry.ts";

const check = (ok:unknown, msg:string) => { if(!ok) throw new Error(msg); };
const id = (n:number) => n.toString(16).padStart(24,"0");
const clone = (v:any) => JSON.parse(JSON.stringify(v));
const region = "us-east-1";
const account = "935838375949";
const point = (t:string) => Date.parse(t);
const arn = (name:string) => "arn:aws:cloudformation:"+region+":"+account+":stack/"+name+"/fake";
const keys = ["AWS_LEARNER_ACCESS_KEY_ID","AWS_LEARNER_SECRET_ACCESS_KEY","AWS_LEARNER_SESSION_TOKEN",CLASSROOM_SETTING];
Deno.test("20 independent learner sessions, exact stack cap, owner denial, and expiry reconciliation", async()=>{
 const previous = keys.map(k=>Deno.env.get(k));
 const originalFetch=globalThis.fetch;
 const users=Array.from({length:21},(_,i)=>({id:id(1000+i),email:"seat-"+(i+1)+"@example.invalid",role:"user"}));
 const template={...buildGuidedTemplate(),id:id(4000)};
 const assignments=users.map((u,i)=>({id:id(2000+i),user_email:u.email,lab_id:template.id,lab_type:"lab_course",service_key:"lab_scenarios"}));
 const roster=users.slice(0,20).map((u,i)=>({user_id:u.id,assignment_id:assignments[i].id}));
 const deadline=new Date(Date.now()+35*60_000).toISOString().replace(/\.\d{3}Z$/,"Z");
 const classId="permissions-class-rehearsal";
 const config={id:classId,opens_at:new Date(Date.now()-60_000).toISOString(),expires_at:deadline,
   template_id:template.id,template_hash:await hash(JSON.stringify(freezeGuidedTemplate(template))),seats:roster};
 const values=["EXAMPLE_ACCESS","EXAMPLE_SECRET","EXAMPLE_SESSION",JSON.stringify(config)];
 keys.forEach((k,i)=>Deno.env.set(k,values[i]));
 const table:Record<string,any[]>={LabTemplate:[template],UserLabAssignment:assignments};
 const match=(row:any, query:any):boolean=>Object.entries(query).every(([k,v]:any)=>{
  if(k==="$or")return v.some((term:any)=>match(row,term));
  if(v&&typeof v==="object"&&v.$in)return v.$in.includes(row[k]);
  if(v&&typeof v==="object"&&v.$lte)return !!row[k]&&point(row[k])<=point(v.$lte);
  return row[k]===v;
 });
 let seq=10_000;
 const entities=new Proxy({}, {get(_o, name:string) {
  const rows=table[name] ||= [];
  return {
   list:async()=>clone(rows),
   filter:async(q:any,_sort?:string, limit=100)=>clone(rows.filter(row=>match(row,q)).slice(0,limit)),
   create:async(data:any)=>{const row={...clone(data),id:id(seq++)};rows.push(row);return clone(row);},
   update:async(key:string,data:any)=>{const row=rows.find(r=>r.id===key);check(row,"row missing");Object.assign(row,clone(data));return clone(row);}
  };
 }});
 const api=async(i:number,action:string,args:any={})=>{
  const req=new Request("https://example.invalid/lab",{method:"POST",body:JSON.stringify({action,...args})});
  const res=await handleLearnerRequest(req,{auth:{me:async()=>users[i]},asServiceRole:{entities}});
  return {status:res.status,data:await res.json()};
 };
 const fakeStacks=new Map<string,{name:string,owner:string,instance:string,vpc:string,deleted:boolean}>();
 let calls=0,simulatedThrottle=true;
 const commands=new Map<string,{instance:string,output:string}>();
 const modes=new Map<string,string>();
 const xml=(action:string,body:string)=>new Response("<"+action+"Response>"+body+"</"+action+"Response>");
 globalThis.fetch=async(url,init)=>{
  calls++;
  const target=new URL(String(url));
  const q=new URLSearchParams(typeof init?.body==="string"&&target.hostname.startsWith("cloudformation.")?init.body:target.search);
  const action=q.get("Action");
  if(target.hostname.startsWith("ssm.")){
   const input=JSON.parse(String(init?.body));
   const awsAction=new Headers(init?.headers).get("X-Amz-Target");
   if(awsAction?.endsWith(".SendCommand")){
    const instance=input.InstanceIds[0], script=input.Parameters.commands[0];
    const owner=[...fakeStacks.values()].find(v=>v.instance===instance);
    check(owner && !owner.deleted,"guest command targets a live owned instance");
    const nonce=script.match(/DSLEARN:([a-f0-9]{32}):/)?.[1];
    if(script.includes("chmod 600"))modes.set(instance,"600");
    const output=script.includes(":saved")?"saved":"mode:"+(modes.get(instance)||"644");
    const command=crypto.randomUUID();
    commands.set(command,{instance,output:"DSLEARN:"+nonce+":"+output});
    return Response.json({Command:{CommandId:command}});
   }
   if(awsAction?.endsWith(".GetCommandInvocation")){
    const command=commands.get(input.CommandId);
    check(command?.instance===input.InstanceId,"command result bound to its instance");
    return Response.json({Status:"Success",ResponseCode:0,StandardOutputContent:command!.output});
   }
   const instance=input.Filters?.[0]?.Values?.[0];
   return Response.json({InstanceInformationList:[{InstanceId:instance||"unused",PingStatus:"Online"}]});
  }
  if(action==="GetCallerIdentity"||target.hostname.startsWith("ec2.")){
   const headers=new Headers(init?.headers);
   check(headers.get("X-Amz-Security-Token")==="EXAMPLE_SESSION","temporary credentials include session token");
   check(headers.get("Authorization")?.includes("SignedHeaders=host;x-amz-date;x-amz-security-token"),"session token is signed");
  }
  if(action==="GetCallerIdentity")return xml(action,"<GetCallerIdentityResult><Account>"+account+"</Account></GetCallerIdentityResult>");
  if(action==="DescribeImages")return xml(action,"<imagesSet><item><imageId>ami-0123456789abcdef0</imageId><creationDate>2026-01-01</creationDate></item></imagesSet>");
  if(action==="DescribeInstanceTypeOfferings")return xml(action,"<instanceTypeOfferingSet><item><location>us-east-1a</location></item></instanceTypeOfferingSet>");
  if(action==="ValidateTemplate")return xml(action,"<ValidateTemplateResult/>");
  if(action==="CreateStack"){
   const n=q.get("StackName")!, run=q.get("ClientRequestToken")!;
   if(fakeStacks.has(arn(n)))return new Response("<ErrorResponse><Error><Code>AlreadyExistsException</Code></Error></ErrorResponse>",{status:400});
   const template=JSON.parse(q.get("TemplateBody")!);
   check(template.Resources.Vpc.Properties.Tags.some((t:any)=>t.Key==="ClassroomId"&&t.Value===classId),"class tags propagated");
   const script=template.Resources.Guest.Properties.UserData["Fn::Base64"];
   check(script.includes("end="+Math.floor(point(deadline)/1000)),"guest shutdown uses the class deadline");
   const seat=n.slice(-2);
   check(fakeStacks.size<20&&n===stackForSlot(Number(seat)),"known capacity slot");
   fakeStacks.set(arn(n),{name:n,owner:run,instance:"i-"+seat.padStart(17,"0"),vpc:"vpc-"+seat.padStart(17,"0"),deleted:false});
   return xml(action,"<CreateStackResult><StackId>"+arn(n)+"</StackId></CreateStackResult>");
  }
  if(action==="DescribeStacks"||action==="DeleteStack"){
   const name=q.get("StackName")!, s=fakeStacks.get(name.startsWith("arn:")?name:arn(name));
   if(!s)return new Response("<ErrorResponse><Error><Code>ValidationError</Code><Message>Stack does not exist</Message></Error></ErrorResponse>",{status:400});
   if(action==="DeleteStack"){
    if(simulatedThrottle&&s.name===stackForSlot(5)){
     simulatedThrottle=false;
     return new Response("<ErrorResponse><Error><Code>Throttling</Code></Error></ErrorResponse>",{status:400});
    }
    s.deleted=true;
    return xml(action,"<DeleteStackResult/>");
   }
   return xml(action,"<DescribeStacksResult><Stacks><member><StackId>"+arn(s.name)+"</StackId><StackStatus>"+(s.deleted?"DELETE_COMPLETE":"CREATE_COMPLETE")+"</StackStatus><Tags><member><Key>ManagedBy</Key><Value>ExtremeICE-DesignStudio-Learner</Value></member><member><Key>ClassroomId</Key><Value>"+classId+"</Value></member><member><Key>LearnerRunId</Key><Value>"+s.owner+"</Value></member></Tags><Outputs><member><OutputKey>InstanceId</OutputKey><OutputValue>"+s.instance+"</OutputValue></member><member><OutputKey>VpcId</OutputKey><OutputValue>"+s.vpc+"</OutputValue></member></Outputs></member></Stacks></DescribeStacksResult>");
  }
  if(action==="DescribeInstances")return xml(action,"<reservationSet/>");
  if(action==="DescribeVpcs")return xml(action,"<vpcSet/>");
  if(action==="DescribeVolumes")return xml(action,"<volumeSet/>");
  throw new Error("Unexpected fake action "+action);
 };
 try {
  const fields=(i:number,p:any)=>({assignment_id:assignments[i].id,ack:"LAUNCH_PRIVATE_SSM_LEARNER_PILOT",template_hash:p.template_hash,zone:p.zone,ami_id:p.ami_id});
  const preflightFields={assignment_id:assignments[0].id};
  Deno.env.set(CLASSROOM_SETTING,JSON.stringify({...config,seats:[...roster,roster[0]]}));
  check((await api(0,"assignmentPreflight",preflightFields)).data.error_code==="AWS_CLASSROOM_CONFIG_INVALID"&&!calls,"oversized or duplicate roster blocks AWS");
  Deno.env.set(CLASSROOM_SETTING,JSON.stringify({...config,opens_at:new Date(Date.now()+60_000).toISOString()}));
  check((await api(0,"assignmentPreflight",preflightFields)).data.error_code==="AWS_CLASSROOM_CLOSED"&&!calls,"unopened class blocks AWS");
  Deno.env.set(CLASSROOM_SETTING,JSON.stringify({...config,template_hash:"a".repeat(64)}));
  check((await api(0,"assignmentPreflight",preflightFields)).data.error_code==="AWS_CLASSROOM_TEMPLATE_CHANGED"&&!calls,"changed class template blocks AWS");
  Deno.env.set(CLASSROOM_SETTING,JSON.stringify(config));
  const learnerPlan=await Promise.all(roster.map((_,i)=>api(i,"assignmentPreflight",{assignment_id:assignments[i].id})));
  check(learnerPlan.every(p=>p.status===200),"every seat passed preflight");
  const start=(i:number)=>api(i,"startAssigned",fields(i,learnerPlan[i].data));
  const sixteen=await Promise.all(roster.slice(0,16).map((_,i)=>start(i)));
  check(sixteen.every(r=>r.status===200)&&fakeStacks.size===16,"16 learners provisioned concurrently");
  const firstReady=await Promise.all(sixteen.map((r,i)=>api(i,"refresh",{run_id:r.data.run_id})));
  check(firstReady.every(r=>r.data.run?.status==="ready"),"first sixteen ready");
  const four=await Promise.all([16,17,18,19].map(i=>start(i)));
  const all=[...sixteen,...four];
  check(all.every(r=>r.status===200)&&fakeStacks.size===20,"add seats while first sixteen remain ready");
  const allReady=await Promise.all(all.map((r,i)=>api(i,"refresh",{run_id:r.data.run_id})));
  check(allReady.every(r=>r.data.run?.status==="ready"),"all twenty simultaneously ready");
  for(const field of ["owner","instance","vpc"] as const)check(new Set([...fakeStacks.values()].map(r=>r[field])).size===20,"unique "+field);
  const before=calls;
  check((await api(20,"startAssigned",fields(20,learnerPlan[0].data))).status===403,"21st learner denied");
  check((await api(0,"workspaceState",{run_id:all[1].data.run_id})).status===403,"peer workspace inaccessible");
  check((await api(1,"startOperation",{run_id:all[0].data.run_id,kind:"read"})).status===403,"peer guest inaccessible");
  check((await start(0)).data.run_id===all[0].data.run_id&&calls===before,"repeat resume and denials do not call AWS");
  check(!capacityConflict(table.CloudLearnerRun,[]),"twenty unique seats do not trigger a conflict");
  check(capacityConflict([...table.CloudLearnerRun,table.CloudLearnerRun[0]],[]),"overlapping seats trigger a conflict");
  await Promise.all(all.map(async (r,i)=>{
   const run_id=r.data.run_id;
   const operation=async (kind:string,extra={})=>{
    const request=await api(i,"startOperation",{run_id,kind,...extra});
    check(request.status===200&&request.data.operation_id,"guest action dispatched");
    const result=await api(i,"pollOperation",{run_id,operation_id:request.data.operation_id});
    check(result.status===200&&result.data.status==="completed","guest action completed");
    return result.data.result;
   };
   check((await operation("validate")).passed===false,"initial permissions fail validation");
   await operation("write",{content:"Classroom exercise",mode:"600"});
   check((await operation("validate")).passed===true,"protected file passes");
  }));
  check(table.LabInstance.every(r=>r.score===100),"every score is saved before cleanup");
  // Persistence, not the current class setting, owns cleanup authorization.
  Deno.env.delete(CLASSROOM_SETTING);
  const simulated={asServiceRole:{entities}};
  const sweep1=await sweepExpiredLearners(simulated,{clock:()=>point(deadline)+1});
  check(sweep1.cleanup_requested===19&&sweep1.errors[0]?.error_code==="Throttling","one throttled deletion is recorded without losing the other nineteen");
  const sweep2=await sweepExpiredLearners(simulated,{clock:()=>point(deadline)+60_000});
  check(sweep2.verified_terminated===19&&sweep2.cleanup_requested===1&&!sweep2.errors.length,"next sweep retries the remaining seat");
  const sweep3=await sweepExpiredLearners(simulated,{clock:()=>point(deadline)+120_000});
  check(sweep3.verified_terminated===1&&!sweep3.errors.length,"last removal is verified");
  check(table.CloudLearnerRun.every(r=>r.status==="terminated"),"terminated runs remain recorded");
  check(table.LabInstance.every(r=>r.status==="terminated"&&r.score===100),"all scores survive removal");
  check(table.RuntimeValidationAttempt.length===40,"every learner retains both grades");
 } finally {
  globalThis.fetch=originalFetch;
  keys.forEach((k,i)=>previous[i]===undefined?Deno.env.delete(k):Deno.env.set(k,previous[i]!));
 }
});
