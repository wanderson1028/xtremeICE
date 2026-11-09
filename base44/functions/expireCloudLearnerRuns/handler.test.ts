import { handleExpiryRequest } from "./handler.ts";
import { saveExpiryHealth, EXPIRY_SIGNAL_KEY } from "./health.ts";
const check=(v:unknown,m:string)=>{if(!v)throw Error(m)};
const admin=(invoke:any)=>({auth:{me:async()=>({role:"admin"})},functions:{invoke}});
Deno.test("scheduled wrapper authenticates before sweep or heartbeat",async()=>{
 let calls=0;const r=await handleExpiryRequest({auth:{me:async()=>({role:"user"})},functions:{invoke:async()=>{calls++}}},{saveHealth:async()=>{calls++}});
 check(r.status===403&&calls===0,"learner cannot invoke sweep or write health");
});
Deno.test("successful sweep preserves counts and records a sanitized heartbeat",async()=>{
 const saved:any[]=[];
 const r=await handleExpiryRequest(admin(async(name:string,input:any)=>{check(name==="cloudLearnerAWS"&&input.action==="sweepExpired","shared runtime");return {data:{scanned:2,pending:1,verified_terminated:1,errors:[]}}}),{saveHealth:async(_b:any,o:any)=>saved.push(o)});
 const b=await r.json();check(r.status===200&&b.verified_terminated===1&&b.pending===1&&saved.length===1&&saved[0].outcome==="success","success persisted");
});
Deno.test("partial cleanup failure remains a scheduler failure and records failure",async()=>{
 const saved:any[]=[];
 const r=await handleExpiryRequest(admin(async()=>({data:{scanned:1,errors:[{run_id:"private",error_code:"TimeoutError"}]}})),{saveHealth:async(_b:any,o:any)=>saved.push(o)});
 check(r.status===502&&saved[0].outcome==="failed"&&saved[0].error_code==="EXPIRY_SWEEP_PARTIAL_FAILURE"&&!JSON.stringify(saved).includes("private"),"partial failure is safe");
});
Deno.test("malformed results and invocation errors remain scheduler failures",async()=>{
 for(const data of [{},null,{scanned:-1}]){
  const saved:any[]=[];const r=await handleExpiryRequest(admin(async()=>({data})),{saveHealth:async(_b:any,o:any)=>saved.push(o)});
  check(r.status===502&&saved[0].error_code==="INVALID_SWEEP_RESULT","malformed result rejected");
 }
 const saved:any[]=[];const r=await handleExpiryRequest(admin(async()=>{throw Object.assign(Error("sensitive detail"),{name:"ProviderUnavailable"})}),{saveHealth:async(_b:any,o:any)=>saved.push(o)});
 const b=await r.json();check(r.status===502&&b.error_code==="ProviderUnavailable"&&saved[0].error_code==="EXPIRY_SWEEP_FAILED"&&!JSON.stringify(saved).includes("sensitive"),"bounded failure response");
});
Deno.test("missing heartbeat does not interrupt successful expiry cleanup",async()=>{
 const r=await handleExpiryRequest(admin(async()=>({data:{scanned:0,errors:[]}})),{saveHealth:async()=>{throw Error("PRIVATE_DB_DETAIL")}});
 const b=await r.json();check(r.status===200&&b.scanned===0&&!JSON.stringify(b).includes("PRIVATE"),"cleanup remains authoritative; missing heartbeat becomes stale");
});
Deno.test("heartbeat write failure does not conceal a failed sweep",async()=>{
 const r=await handleExpiryRequest(admin(async()=>{throw Error("PRIVATE_PROVIDER_DETAIL")}),{saveHealth:async()=>{throw Error("PRIVATE_DB_DETAIL")}});
 const b=await r.json();check(r.status===502&&b.error==="Expiry sweep failed"&&!JSON.stringify(b).includes("PRIVATE"),"primary failure retained");
});
Deno.test("heartbeat uses one admin-only record and excludes run IDs and provider details",async()=>{
 const calls:any[]=[];const existing={id:"same-row"};
 const entity={filter:async(q:any,sort:any,limit:any)=>{calls.push({kind:"filter",q,sort,limit});return [existing];},update:async(id:any,record:any)=>{calls.push({kind:"update",id,record})},create:async()=>{throw Error("unexpected create")}};
 const record=await saveExpiryHealth({asServiceRole:{entities:{CloudLearnerExpiryHealth:entity}}},{outcome:"failed",scanned:2,error_code:"BAD-CODE",run_id:"PRIVATE_RUN",provider:"PRIVATE_PROVIDER"},()=>Date.parse("2026-01-03T12:00:00Z"));
 check(calls.length===2&&calls[0].q.signal_key===EXPIRY_SIGNAL_KEY&&calls[0].limit===1&&calls[1].id==="same-row","bounded singleton update");
 check(record.error_code==="BAD_CODE"&&!JSON.stringify(record).includes("PRIVATE"),"sanitized fields only");
});
Deno.test("first heartbeat creates the singleton",async()=>{
 let created:any=null;const entity={filter:async()=>[],create:async(record:any)=>{created=record}};
 await saveExpiryHealth({asServiceRole:{entities:{CloudLearnerExpiryHealth:entity}}},{outcome:"success",scanned:0},()=>Date.parse("2026-01-03T12:00:00Z"));
 check(created.signal_key===EXPIRY_SIGNAL_KEY&&created.outcome==="success","created");
});
