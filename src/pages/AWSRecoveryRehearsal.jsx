import React,{useEffect,useState} from "react";
import {base44} from "@/api/base44Client";
const TEMPLATE="6ae8dcb50cfc77ecfbad0643";
export default function AWSRecoveryRehearsal(){
 const [me,setMe]=useState(null),[plan,setPlan]=useState(null),[run,setRun]=useState(new URLSearchParams(window.location.search).get("run")||""),[operation,setOperation]=useState(null),[busy,setBusy]=useState(false),[logs,setLogs]=useState([]);
 useEffect(()=>{base44.auth.me().then(setMe).catch(()=>setMe({role:"none"}));},[]);
 const call=async(action,fields={})=>(await base44.functions.invoke("cloudLearnerAWS",{action,...fields})).data;
 const perform=(label,fn)=>async()=>{setBusy(true);try{const data=await fn();setLogs(rows=>[{at:new Date().toISOString(),label,data},...rows]);}catch(e){setLogs(rows=>[{at:new Date().toISOString(),label,error:e?.response?.data||e.message},...rows]);}finally{setBusy(false);}};
 const begin=kind=>perform("start "+kind,async()=>{const d=await call("startOperation",{run_id:run,kind,...(kind==="write"?{content:"Approved recovery rehearsal: persisted file after management-agent interruption.\n",mode:"600"}:{})});setOperation({id:d.operation_id,kind:d.kind});return d;});
 const button="rounded bg-sky-700 p-3 disabled:opacity-40";
 if(!me)return <p>Checking instructor identity…</p>;
 if(me.role!=="admin")return <p>Instructor access required</p>;
 return <main className="bg-gray-950 text-white p-6 space-y-5"><h1 className="text-2xl">Temporary approved AWS recovery rehearsal</h1>
 <p>One guest · $1 allowance · deadline 07:45 UTC November 5 · no main deployment. This temporary test page will be removed.</p>
 <p>Authenticated instructor: {me.email}</p><p>Run: {run||"Not launched"}</p><p>Stored test operation: {operation?.id||"None"}</p>
 <div className="flex flex-wrap gap-3">
 <button disabled={busy} className={button} onClick={perform("AWS tagged inventory",()=>call("rehearsalInspect"))}>Check AWS pilot inventory</button>
 <button disabled={busy||!!run} className={button} onClick={perform("preflight",async()=>{const p=await call("preflight",{template_id:TEMPLATE});setPlan(p);return p;})}>Preflight approved guest</button>
 <button disabled={busy||!plan||!!run} className={button} onClick={perform("launch",async()=>{const d=await call("provision",{template_id:TEMPLATE,template_hash:plan.template_hash,ami_id:plan.ami_id,zone:plan.zone,ack:"LAUNCH_PRIVATE_SSM_LEARNER_PILOT"});setRun(d.run_id);return d;})}>Launch one approved guest</button>
 <button disabled={busy||!run} className={button} onClick={perform("refresh",async()=>{const d=await call("refresh",{run_id:run});return {run:{...d.run,contract:undefined}};})}>Refresh run</button>
 <button disabled={busy||!run} className={button} onClick={perform("interrupt",()=>call("rehearsalInterrupt",{run_id:run}))}>Pause agent with automatic restart</button>
 <button disabled={busy||!run} className={button} onClick={perform("interrupt command",()=>call("rehearsalCommand",{run_id:run}))}>Check interruption command</button>
 <button disabled={busy||!run} className={button} onClick={begin("read")}>Read guest file</button>
 <button disabled={busy||!run} className={button} onClick={begin("write")}>Write approved proof at 600</button>
 <button disabled={busy||!run} className={button} onClick={begin("validate")}>Validate guest file</button>
 <button disabled={busy||!operation} className={button} onClick={perform("poll operation",()=>call("pollOperation",{run_id:run,operation_id:operation.id}))}>Poll stored operation</button>
 <button disabled={busy||!run} className={button} onClick={perform("workspace resume",async()=>{const d=await call("workspaceState",{run_id:run});if(d.pending_operation)setOperation({id:d.pending_operation.id,kind:d.pending_operation.kind});return {run:{...d.run,contract:undefined},pending_operation:d.pending_operation};})}>Resume stored operation</button>
 <button disabled={busy||!run} className={button} onClick={perform("verify removal",()=>call("verifyRemoval",{run_id:run}))}>Verify AWS removal</button>
 <button disabled={busy||!run} className={button} onClick={perform("fallback cleanup",()=>call("cleanup",{run_id:run,ack:"DELETE_LEARNER_STACK"}))}>Fallback cleanup</button>
 </div><pre className="whitespace-pre-wrap text-xs" data-testid="rehearsal-log">{JSON.stringify(logs,null,2)}</pre></main>;
}
