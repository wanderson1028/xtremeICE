import { GUEST_PROFILE_NAME } from "./accessConfig.ts";
export const REGION = "us-east-1";
export const ACCOUNT = "935838375949";
export function requireAccount(observed: string) {
  if(observed!==ACCOUNT)throw Object.assign(new Error("Learner AWS credentials identify account "+observed+"; expected "+ACCOUNT+"."),{name:"AWS_ACCOUNT_MISMATCH"});
}
export const MANAGED_BY = "ExtremeICE-DesignStudio-Learner";
export const TASK_PATH = "/var/tmp/design-studio-learner/proof.txt";
export const TASK = Object.freeze({ title: "Protect the task file", path: TASK_PATH, expected_mode: "600", initial_mode: "644", task_id: "protect_file", check_id: "file_mode" });
export type Operation = "read" | "write" | "validate";
export function owns(run: any, user: any) { return !!user?.id && run?.owner_user_id === user.id; }
export function canOperate(run: any, user: any, time = Date.now()) {
  return owns(run,user) && run.status === "ready" && Date.parse(run.expires_at) > time &&
    run.contract?.path === TASK_PATH && run.contract?.expected_mode === "600";
}
const utf8b64 = (text: string) => btoa(String.fromCharCode(...new TextEncoder().encode(text)));
export function compileOperation(kind: Operation, nonce: string, content?: unknown, mode?: unknown) {
  if (!/^[a-f0-9]{32}$/.test(nonce)) throw new Error("INVALID_OPERATION_BINDING");
  const prefix = "DSLEARN:"+nonce+":";
  const lines = ["set -eu", "exec 9>/var/lock/design-studio-learner.lock", "flock -w 10 9",
    "test -f '"+TASK_PATH+"' && test ! -L '"+TASK_PATH+"'"];
  if (kind === "write") {
    if (typeof content !== "string" || new TextEncoder().encode(content).length > 4096 || !["600","644"].includes(String(mode))) throw new Error("INVALID_FILE_EDIT");
    lines.push("umask 077", "tmp=$(mktemp /var/tmp/design-studio-learner/edit.XXXXXX)",
      "trap 'rm -f \"$tmp\"' EXIT", "printf '%s' '"+utf8b64(content)+"' | base64 -d > \"$tmp\"",
      "chmod "+mode+" \"$tmp\"", "mv -f \"$tmp\" '"+TASK_PATH+"'", "trap - EXIT",
      "printf '"+prefix+"saved\\n'");
  } else if (kind === "read") {
    lines.push("printf '"+prefix+"content:'", "base64 -w 0 '"+TASK_PATH+"'", "printf '\\n'",
      "printf '"+prefix+"mode:'", "stat -c %a '"+TASK_PATH+"'");
  } else if (kind === "validate") {
    lines.push("printf '"+prefix+"mode:'", "stat -c %a '"+TASK_PATH+"'");
  } else throw new Error("UNSUPPORTED_OPERATION");
  return lines.join("\n");
}
export function parseOutput(kind: Operation, nonce: string, text: string) {
  if (text.length > 16000 || !/^[a-f0-9]{32}$/.test(nonce)) throw new Error("INVALID_GUEST_OUTPUT");
  const lines = text.trimEnd().split(/\r?\n/), prefix = "DSLEARN:"+nonce+":";
  if (kind === "write") {
    if (lines.length !== 1 || lines[0] !== prefix+"saved") throw new Error("INVALID_GUEST_OUTPUT");
    return { saved: true };
  }
  const modeLines=lines.filter(l=>l.startsWith(prefix+"mode:"));
  if (modeLines.length!==1 || !/^([0-7]{3,4})$/.test(modeLines[0].slice((prefix+"mode:").length))) throw new Error("INVALID_GUEST_OUTPUT");
  const mode=modeLines[0].slice((prefix+"mode:").length);
  if (kind==="validate") {
    if (lines.length!==1) throw new Error("INVALID_GUEST_OUTPUT");
    return { mode, passed: mode === "600" };
  }
  const contents=lines.filter(l=>l.startsWith(prefix+"content:"));
  if (lines.length!==2 || contents.length!==1) throw new Error("INVALID_GUEST_OUTPUT");
  const encoded=contents[0].slice((prefix+"content:").length);
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) throw new Error("INVALID_GUEST_OUTPUT");
  const bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
  if(bytes.length>4096) throw new Error("INVALID_GUEST_OUTPUT");
  return { mode, content: new TextDecoder("utf-8",{fatal:true}).decode(bytes) };
}
const ref = (name:string) => ({Ref:name});
export function stackTemplate(ami:string,zone:string,runId:string) {
  if (!/^ami-[a-f0-9]{8,17}$/.test(ami) || !/^us-east-1[a-f]$/.test(zone) || !/^[a-f0-9]{16,32}$/.test(runId)) throw new Error("INVALID_STACK_INPUT");
  const tags=[{Key:"ManagedBy",Value:MANAGED_BY},{Key:"LearnerRunId",Value:runId}];
  const resource=(Type:string,Properties:any,extra:any={})=>({Type,Properties,...extra});
  const userData=["#!/bin/bash","set -eu","shutdown -h +105","install -d -m 700 /var/tmp/design-studio-learner",
    "printf 'Edit this file, then protect it with mode 600.\\n' > "+TASK_PATH,"chmod 644 "+TASK_PATH,"systemctl enable --now amazon-ssm-agent"].join("\n");
  return {AWSTemplateFormatVersion:"2010-09-09",Description:"Disposable Design Studio guided learner file task",Resources:{
    Vpc:resource("AWS::EC2::VPC",{CidrBlock:"10.252.0.0/24",EnableDnsSupport:true,EnableDnsHostnames:true,Tags:tags}),
    Subnet:resource("AWS::EC2::Subnet",{VpcId:ref("Vpc"),CidrBlock:"10.252.0.0/27",AvailabilityZone:zone,MapPublicIpOnLaunch:false,Tags:tags}),
    EndpointGroup:resource("AWS::EC2::SecurityGroup",{VpcId:ref("Vpc"),GroupDescription:"SSM endpoint access from task guest only",SecurityGroupEgress:[{IpProtocol:"-1",CidrIp:"127.0.0.1/32"}],Tags:tags}),
    GuestGroup:resource("AWS::EC2::SecurityGroup",{VpcId:ref("Vpc"),GroupDescription:"Task guest: HTTPS to private SSM endpoints only",SecurityGroupEgress:[{IpProtocol:"tcp",FromPort:443,ToPort:443,DestinationSecurityGroupId:ref("EndpointGroup")}],Tags:tags}),
    EndpointIngress:resource("AWS::EC2::SecurityGroupIngress",{GroupId:ref("EndpointGroup"),IpProtocol:"tcp",FromPort:443,ToPort:443,SourceSecurityGroupId:ref("GuestGroup")}),
    SsmEndpoint:resource("AWS::EC2::VPCEndpoint",{VpcId:ref("Vpc"),VpcEndpointType:"Interface",ServiceName:"com.amazonaws."+REGION+".ssm",PrivateDnsEnabled:true,SubnetIds:[ref("Subnet")],SecurityGroupIds:[ref("EndpointGroup")],Tags:tags}),
    MessagesEndpoint:resource("AWS::EC2::VPCEndpoint",{VpcId:ref("Vpc"),VpcEndpointType:"Interface",ServiceName:"com.amazonaws."+REGION+".ssmmessages",PrivateDnsEnabled:true,SubnetIds:[ref("Subnet")],SecurityGroupIds:[ref("EndpointGroup")],Tags:tags}),
    Guest:resource("AWS::EC2::Instance",{ImageId:ami,InstanceType:"t3.micro",SubnetId:ref("Subnet"),SecurityGroupIds:[ref("GuestGroup")],IamInstanceProfile:GUEST_PROFILE_NAME,InstanceInitiatedShutdownBehavior:"terminate",
      CreditSpecification:{CPUCredits:"standard"},MetadataOptions:{HttpTokens:"required",HttpEndpoint:"enabled"},
      BlockDeviceMappings:[{DeviceName:"/dev/xvda",Ebs:{VolumeSize:8,VolumeType:"gp3",Encrypted:true,DeleteOnTermination:true}}],
      UserData:{"Fn::Base64":userData},Tags:tags,PropagateTagsToVolumeOnCreation:true},{DependsOn:["SsmEndpoint","MessagesEndpoint","EndpointIngress"]})
  },Outputs:{InstanceId:{Value:ref("Guest")},VpcId:{Value:ref("Vpc")},SubnetId:{Value:ref("Subnet")},GuestGroupId:{Value:ref("GuestGroup")},EndpointGroupId:{Value:ref("EndpointGroup")}}};
}
