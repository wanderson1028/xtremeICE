import { lifecycleDiagnostics } from "./diagnostics.ts";
import { handleLearnerRequest } from "./handler.ts";
const check=(v:unknown,m:string)=>{if(!v)throw Error(m);};
const TIME=Date.parse("2026-01-03T12:00:00Z"),iso=(offset=0)=>new Date(TIME+offset).toISOString();
function fixture(rows:any[]=[],recent:any[]=[],ops:any[]=[],legacy:any[]=[]){
 const calls:any[]=[];
 const entity=(name:string)=>({filter:async(q:any,sort:string,limit:number)=>{calls.push({name,q,sort,limit});const values=name==="CloudGuestOperation"?ops:name==="CloudPocRun"?legacy:q.status==="terminated"?recent:rows;return values.slice(0,limit);}});
 return {calls,b:{asServiceRole:{entities:{CloudLearnerRun:entity("CloudLearnerRun"),CloudGuestOperation:entity("CloudGuestOperation"),CloudPocRun:entity("CloudPocRun")}}}};
}
const row=(extra:any={})=>({id:"run",status:"ready",started_at:iso(-60000),expires_at:iso(60000),updated_date:iso(),...extra});
Deno.test("diagnostics API denies anonymous and both learner identities before service reads",async()=>{
 for(const user of [null,{id:"joe",role:"user"},{id:"radi",role:"user"}]){
  let touched=false;
  const b={auth:{me:async()=>user},get asServiceRole(){touched=true;throw Error("privileged read");}};
  const response=await handleLearnerRequest(new Request("https://test.invalid",{method:"POST",body:JSON.stringify({action:"lifecycleDiagnostics",role:"admin",owner_user_id:"admin"})}),b);
  check(response.status===(user?403:401)&&!touched,"auth before data access");
 }
});
Deno.test("diagnostics requires admin even when called outside the handler",async()=>{
 let touched=false;try{await lifecycleDiagnostics({get asServiceRole(){touched=true;throw Error();}},{role:"user"},TIME);throw Error("allowed");}catch(e:any){check(e.status===403&&!touched,"helper denies");}
});
Deno.test("diagnostics performs only bounded reads and no provider request",async()=>{
 const f=fixture([row()]),original=globalThis.fetch;let providerCalls=0;
 globalThis.fetch=async()=>{providerCalls++;throw Error("provider forbidden");};
 try{const d=await lifecycleDiagnostics(f.b,{role:"admin"},TIME);
 check(d.read_only&&!d.provider_checked&&providerCalls===0,"no provider action");
 check(f.calls.length===4&&f.calls.every(c=>c.limit<=201&&c.limit>0),"bounded filter reads only");
 check(f.calls[0].q.status.$ne==="terminated"&&f.calls[3].q.status.$ne==="terminated","unknown records held");
 }finally{globalThis.fetch=original;}
});
Deno.test("diagnostics whitelists records and never leaks command contents or frozen secrets",async()=>{
 const f=fixture([row({owner_email:"learner@example.invalid",contract:{template_snapshot:{title:"Reviewed lab",secret:"SECRET_SNAPSHOT"},binding:"SECRET_TOKEN"},stack_id:"SECRET_ARN",last_error_code:"SECRET ERROR STRING"})],[],[{run_id:"run",command_id:"SECRET_COMMAND",binding:"SECRET_BINDING",result:{content:"SECRET_OUTPUT"},expires_at:iso(60000)}]);
 const d=await lifecycleDiagnostics(f.b,{role:"admin"},TIME),s=JSON.stringify(d);
 check(!s.includes("SECRET")&&d.active[0].title==="Reviewed lab"&&d.active[0].last_error_code==="UNRECOGNIZED_ERROR","only allowlisted fields");
 check(d.active[0].record_updated_at===iso()&&d.active[0].last_provider_check_at===null,"record update is not provider success");
});
Deno.test("diagnostics flags stuck cleanup, launch failures and expired uncertain operations",async()=>{
 const f=fixture([row({status:"ready",cleanup_requested_at:iso(-16*60000),expires_at:iso(-1000),last_error_code:"TimeoutError"})],[],[{run_id:"run",expires_at:iso(-1000),error_code:"DISPATCH_UNCERTAIN"}]);
 const d=await lifecycleDiagnostics(f.b,{role:"admin"},TIME),r=d.active[0];
 check(r.capacity_held&&r.pending_operations===1&&r.uncertain_operations===1&&r.overdue_operations===1,"capacity and command warnings");
 check(r.attention.length>=5,"cleanup, age, expiry, error and dispatch warnings");
});
Deno.test("diagnostics includes stale starts, unknown states and malformed timing conservatively",async()=>{
 const f=fixture([row({id:"start",status:"preparing",started_at:iso(-6*60000)}),row({id:"stuck",status:"provisioning",started_at:iso(-21*60000)}),row({id:"corrupt",status:"mystery",started_at:"invalid",expires_at:"invalid",cleanup_requested_at:"invalid"})]);
 const d=await lifecycleDiagnostics(f.b,{role:"admin"},TIME);
 check(d.capacity.held&&d.active.every((r:any)=>r.attention.length>0),"all unsafe records remain held");
 check(d.active[2].started_at===null&&d.active[2].expires_at===null,"invalid dates never displayed as valid");
});
Deno.test("diagnostics records release history without claiming current provider health",async()=>{
 const f=fixture([],[row({status:"terminated",terminated_at:iso(-1000)})],[],[row({status:"failed"})]);
 const d=await lifecycleDiagnostics(f.b,{role:"admin"},TIME);
 check(d.capacity.held&&d.legacy.length===1&&d.recent[0].recorded_release_at===iso(-1000)&&!d.recent[0].capacity_held,"legacy holds and retained release");
 check(d.recent[0].last_provider_check_at===null&&!d.provider_checked,"no fabricated health check");
});
Deno.test("diagnostics reports truncation and lower-bound counts instead of silently incomplete totals",async()=>{
 const f=fixture(Array.from({length:60},(_,i)=>row({id:String(i)})),Array(22).fill(row({status:"terminated"})),Array(220).fill({run_id:"0",expires_at:iso(60000)}),Array(55).fill(row()));
 const d=await lifecycleDiagnostics(f.b,{role:"admin"},TIME);
 check(Object.values(d.truncated).every(Boolean)&&d.active.length===50&&d.recent.length===20&&d.capacity.record_count_at_least===102,"explicit bounded counts");
});
Deno.test("diagnostics read failure returns an error instead of claiming empty capacity",async()=>{
 const f=fixture();f.b.asServiceRole.entities.CloudPocRun.filter=async()=>{throw Error("database unavailable");};
 let failed=false;try{await lifecycleDiagnostics(f.b,{role:"admin"},TIME);}catch{failed=true;}
 check(failed,"no false healthy or empty result");
});
Deno.test("empty diagnostics do not claim verified AWS removal",async()=>{
 const d=await lifecycleDiagnostics(fixture().b,{role:"admin"},TIME);
 check(!d.capacity.held&&d.active.length===0&&d.recent.length===0&&!d.provider_checked,"empty saved records only");
});
