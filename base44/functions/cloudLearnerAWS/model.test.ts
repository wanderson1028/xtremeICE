import { TASK, TASK_PATH, canOperate, owns, compileOperation, parseOutput, stackTemplate } from "./model.ts";
const nonce="0123456789abcdef0123456789abcdef";
function eq(a:unknown,b:unknown){if(JSON.stringify(a)!==JSON.stringify(b))throw new Error("Assertion failed: "+JSON.stringify(a)+" != "+JSON.stringify(b));}
function rejects(fn:()=>any){let thrown=false;try{fn();}catch{thrown=true;}eq(thrown,true);}
Deno.test("owner, expiry, ready state and frozen contract govern guest access",()=>{
 const user={id:"owner",role:"admin"},run={owner_user_id:"owner",status:"ready",contract:TASK,expires_at:new Date(2000).toISOString()};
 eq(owns(run,user),true);eq(canOperate(run,user,1000),true);
 eq(canOperate(run,{id:"other",role:"admin"},1000),false);
 eq(canOperate({...run,status:"cleanup_pending"},user,1000),false);
 eq(canOperate(run,user,3000),false);
 eq(canOperate({...run,contract:{...TASK,path:"/etc/shadow"}},user,1000),false);
 eq(canOperate({...run,contract:{...TASK,expected_mode:"777"}},user,1000),false);
});
Deno.test("only fixed file operations and bounded inputs compile",()=>{
 rejects(()=>compileOperation("shell" as any,nonce));
 rejects(()=>compileOperation("read","bad"));
 rejects(()=>compileOperation("write",nonce,"x","777; touch /tmp/owned"));
 rejects(()=>compileOperation("write",nonce,"x".repeat(4097),"600"));
 rejects(()=>compileOperation("write",nonce,{},"600"));
});
Deno.test("unbound, duplicate, malformed and truncated guest outputs are rejected",()=>{
 rejects(()=>parseOutput("validate",nonce,"600"));
 rejects(()=>parseOutput("validate",nonce,"DSLEARN:wrong:mode:600"));
 rejects(()=>parseOutput("validate",nonce,"DSLEARN:"+nonce+":mode:600\nDSLEARN:"+nonce+":mode:644"));
 rejects(()=>parseOutput("read",nonce,"DSLEARN:"+nonce+":mode:600"));
 rejects(()=>parseOutput("write",nonce,"DSLEARN:"+nonce+":saved\nunexpected"));
 eq(parseOutput("validate",nonce,"DSLEARN:"+nonce+":mode:644\n"),{mode:"644",passed:false});
});
Deno.test("real file edits produce fail-pass-fail and preserve literal untrusted content",async()=>{
 const dir=await Deno.makeTempDir({dir:"/tmp",prefix:"aws-learner-test-"});
 try{
  const target=dir+"/fixture/proof.txt";await Deno.mkdir(dir+"/fixture");await Deno.writeTextFile(target,"initial");await Deno.chmod(target,0o644);
  const run=async(kind:any,text?:string,mode?:string)=>{
   const script=compileOperation(kind,nonce,text,mode).replaceAll(TASK_PATH,target).replaceAll("/var/tmp/design-studio-learner/",dir+"/fixture/").replaceAll("/var/lock/design-studio-learner.lock",dir+"/task.lock");
   const r=await new Deno.Command("bash",{args:["-c",script],stdout:"piped",stderr:"piped"}).output();eq(r.code,0);return parseOutput(kind,nonce,new TextDecoder().decode(r.stdout));
  };
  eq(await run("validate"),{mode:"644",passed:false});
  const text='$(touch '+dir+'/injected)\n'+String.fromCharCode(96)+'id'+String.fromCharCode(96)+'\n"quoted" 🧊';
  await run("write",text,"600");eq(await run("read"),{mode:"600",content:text});eq(await run("validate"),{mode:"600",passed:true});
  let exists=true;try{await Deno.stat(dir+"/injected");}catch{exists=false;}eq(exists,false);
  await run("write","reverted","644");eq(await run("validate"),{mode:"644",passed:false});
  await Deno.remove(target);await Deno.writeTextFile(dir+"/other","outside task");
  eq((await new Deno.Command("bash",{args:["-c",'ln -s "$1" "$2"',"--",dir+"/other",target]}).output()).code,0);
  const cmd=compileOperation("read",nonce).replaceAll(TASK_PATH,target).replaceAll("/var/lock/design-studio-learner.lock",dir+"/task.lock");
  eq((await new Deno.Command("bash",{args:["-c",cmd],stdout:"piped",stderr:"piped"}).output()).success,false);
 }finally{await Deno.remove(dir,{recursive:true});}
});
Deno.test("stack contains only private endpoints, one bounded guest, and SSM instance access",()=>{
 const t=stackTemplate("ami-0123456789abcdef0","us-east-1a","0123456789abcdef01234567"),r=t.Resources;
 eq(r.Guest.Properties.InstanceType,"t3.micro");eq(r.Subnet.Properties.MapPublicIpOnLaunch,false);
 eq(Object.values(r).filter((v:any)=>v.Type==="AWS::EC2::VPCEndpoint").length,2);
 eq(Object.values(r).some((v:any)=>/InternetGateway|NatGateway|EIP|AccessKey/.test(v.Type)),false);
 eq(r.Guest.Properties.BlockDeviceMappings[0].Ebs,{VolumeSize:8,VolumeType:"gp3",Encrypted:true,DeleteOnTermination:true});
 eq(r.GuestGroup.Properties.SecurityGroupEgress,[{IpProtocol:"tcp",FromPort:443,ToPort:443,DestinationSecurityGroupId:{Ref:"EndpointGroup"}}]);
 eq(r.Guest.Properties.IamInstanceProfile,"DesignStudioLearnerGuestProfile");
 eq(Object.values(r).some((v:any)=>v.Type.startsWith("AWS::IAM::")),false);
 rejects(()=>stackTemplate("ami-0123456789abcdef0","us-west-2a","0123456789abcdef01234567"));
});
