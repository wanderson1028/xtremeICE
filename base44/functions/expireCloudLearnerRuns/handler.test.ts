import { handleExpiryRequest } from "./handler.ts";
const check=(v:unknown,m:string)=>{if(!v)throw Error(m)};
Deno.test("scheduled wrapper authenticates before invoking the shared lifecycle",async()=>{
 let calls=0;const r=await handleExpiryRequest({auth:{me:async()=>({role:"user"})},functions:{invoke:async()=>{calls++}}});check(r.status===403&&calls===0,"learner cannot invoke sweep");
});
Deno.test("scheduled wrapper uses the shared sweep and preserves successful counts",async()=>{
 const r=await handleExpiryRequest({auth:{me:async()=>({role:"admin"})},functions:{invoke:async(name:string,input:any)=>{check(name==="cloudLearnerAWS"&&input.action==="sweepExpired","shared runtime");return {data:{scanned:2,pending:1,verified_terminated:1,errors:[]}}}}});
 const b=await r.json();check(r.status===200&&b.verified_terminated===1&&b.pending===1,"result preserved");
});
Deno.test("partial cleanup failure is a scheduler failure",async()=>{
 const r=await handleExpiryRequest({auth:{me:async()=>({role:"admin"})},functions:{invoke:async()=>({data:{scanned:1,errors:[{run_id:"one",error_code:"TimeoutError"}]}})}});
 check(r.status===502,"partial failure must not be reported as success");
});
Deno.test("malformed or absent sweep result is a scheduler failure",async()=>{
 for(const data of [{},null,{scanned:-1}]){const r=await handleExpiryRequest({auth:{me:async()=>({role:"admin"})},functions:{invoke:async()=>({data})}});check(r.status===502,"missing result rejected");}
});
Deno.test("provider or invocation failure returns a bounded error code",async()=>{
 const r=await handleExpiryRequest({auth:{me:async()=>({role:"admin"})},functions:{invoke:async()=>{throw Object.assign(Error("sensitive provider detail"),{name:"ProviderUnavailable"})}}});
 const b=await r.json();check(r.status===502&&b.error_code==="ProviderUnavailable"&&!JSON.stringify(b).includes("sensitive"),"bounded failure response");
});
