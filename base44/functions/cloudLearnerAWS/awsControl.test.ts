import { aws } from "./awsControl.ts";
import { STSClient, GetCallerIdentityCommand } from "./awsQuery.ts";
function ok(v:unknown){if(!v)throw new Error("Request assertion failed");}
Deno.test("learner requests never fall back to the existing integration identity",async()=>{
 const priorFetch=globalThis.fetch;let called=false;
 Deno.env.set("AWS_ACCESS_KEY_ID","EXAMPLE_OTHER_INTEGRATION");
 Deno.env.set("AWS_SECRET_ACCESS_KEY","EXAMPLE_OTHER_SECRET");
 Deno.env.delete("AWS_LEARNER_ACCESS_KEY_ID");Deno.env.delete("AWS_LEARNER_SECRET_ACCESS_KEY");
 globalThis.fetch=async()=>{called=true;throw new Error("Unexpected request");};
 try{
   let controlDenied=false,queryDenied=false;
   try{await aws("ssm","DescribeInstanceInformation",{});}catch(e:any){controlDenied=e.name==="LEARNER_AWS_KEYS_MISSING";}
   try{await new STSClient().send(new GetCallerIdentityCommand({}));}catch(e:any){queryDenied=e.name==="LEARNER_AWS_KEYS_MISSING";}
   ok(controlDenied&&queryDenied&&!called);
 }finally{globalThis.fetch=priorFetch;Deno.env.delete("AWS_ACCESS_KEY_ID");Deno.env.delete("AWS_SECRET_ACCESS_KEY");}
});
Deno.test("AWS control adapter signs POST forms and JSON using the correct wire formats",async()=>{
 const priorFetch=globalThis.fetch;
 Deno.env.set("AWS_LEARNER_ACCESS_KEY_ID","EXAMPLE_ACCESS");
 Deno.env.set("AWS_LEARNER_SECRET_ACCESS_KEY","EXAMPLE_SECRET");
 Deno.env.set("AWS_LEARNER_SESSION_TOKEN","EXAMPLE_SESSION");
 try{
 globalThis.fetch=async(url:any,init:any)=>{
  ok(String(url)==="https://cloudformation.us-east-1.amazonaws.com/");
  const q=new URLSearchParams(init.body);
  ok(q.get("Capabilities.member.1")==="CAPABILITY_IAM");
  ok(q.get("Tags.member.1.Key")==="ManagedBy");ok(q.get("TemplateBody")==='{"Resources":{}}');
  ok(init.method==="POST");ok(init.headers.authorization.includes("SignedHeaders=content-type;host;x-amz-date;x-amz-security-token"));
  ok(init.headers["x-amz-security-token"]==="EXAMPLE_SESSION");
  return new Response("<CreateStackResponse><CreateStackResult><StackId>stack-example</StackId></CreateStackResult></CreateStackResponse>");
 };
 ok((await aws("cloudformation","CreateStack",{Capabilities:["CAPABILITY_IAM"],Tags:[{Key:"ManagedBy",Value:"DesignStudio"}],TemplateBody:'{"Resources":{}}'})).StackId==="stack-example");
 globalThis.fetch=async(url:any,init:any)=>{
  ok(String(url)==="https://ssm.us-east-1.amazonaws.com/");
  ok(init.headers["x-amz-target"]==="AmazonSSM.SendCommand");
  ok(JSON.parse(init.body).Parameters.commands[0]==="fixed command");
  return Response.json({Command:{CommandId:"command-example"}});
 };
 ok((await aws("ssm","SendCommand",{Parameters:{commands:["fixed command"]}})).Command.CommandId==="command-example");
 globalThis.fetch=async()=>Response.json({__type:"com.amazonaws.ssm#AccessDeniedException",Message:"Denied"},{status:400});
 let denied=false;try{await aws("ssm","DescribeInstanceInformation",{});}catch(e:any){denied=e.name==="AccessDeniedException";}ok(denied);
 }finally{globalThis.fetch=priorFetch;Deno.env.delete("AWS_LEARNER_ACCESS_KEY_ID");Deno.env.delete("AWS_LEARNER_SECRET_ACCESS_KEY");Deno.env.delete("AWS_LEARNER_SESSION_TOKEN");}
});
