import React,{useEffect,useRef,useState} from "react";
import {Link} from "react-router-dom";
import {learnerCall,learnerError} from "@/lib/cloudLearnerClient";

const stamp=value=>value?new Date(value).toLocaleString():"Not recorded";
function Session({run}){
 return <article className="rounded-xl border border-gray-700 bg-gray-900 p-5 space-y-3">
  <div><h3 className="font-semibold">{run.title}</h3><p>{run.learner_email||"Previous AWS proof"} · {run.status}</p><p className="text-xs text-gray-400 break-all">Session {run.id}</p></div>
  {run.attention.length>0&&<ul className="list-disc pl-5 text-amber-300">{run.attention.map(reason=><li key={reason}>{reason}</li>)}</ul>}
  <dl className="grid sm:grid-cols-2 gap-3 text-sm">
   <div><dt>Started</dt><dd>{stamp(run.started_at)}</dd></div><div><dt>Expires</dt><dd>{stamp(run.expires_at)}</dd></div>
   <div><dt>Cleanup requested</dt><dd>{stamp(run.cleanup_requested_at)}</dd></div><div><dt>Record updated</dt><dd>{stamp(run.record_updated_at)}</dd></div>
   <div><dt>Last successful provider check</dt><dd>Not recorded</dd></div><div><dt>Recorded release</dt><dd>{stamp(run.recorded_release_at)}</dd></div>
   <div><dt>Recorded error</dt><dd>{run.last_error_code||"None recorded"}</dd></div><div><dt>Pending guest actions</dt><dd>{run.pending_operations} · {run.uncertain_operations} uncertain · {run.overdue_operations} overdue</dd></div>
  </dl>
 </article>;
}
export default function LifecycleDiagnostics(){
 const [data,setData]=useState(null),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const mounted=useRef(false);
 const refresh=async()=>{setBusy(true);try{const result=await learnerCall("lifecycleDiagnostics");if(mounted.current){setData(result);setError("");}}catch(e){if(mounted.current)setError(learnerError(e));}finally{if(mounted.current)setBusy(false);}};
 useEffect(()=>{mounted.current=true;refresh();return()=>{mounted.current=false;};},[]);
 const sessions=data?[...data.active,...data.legacy]:[];
 return <main className="min-h-screen bg-gray-950 text-gray-100 p-6"><div className="max-w-5xl mx-auto space-y-6">
  <nav className="flex gap-5 text-sky-300"><Link to="/LabAssignments">← Lab assignments</Link><Link to="/CloudLearnerPoc">Manage AWS sessions</Link></nav>
  <header><h1 className="text-3xl font-semibold">Session recovery overview</h1><p className="text-gray-300 mt-2">Review saved session records, capacity holds and cleanup errors.</p></header>
  <button className="rounded-lg bg-sky-700 px-4 py-2 disabled:opacity-40" disabled={busy} onClick={refresh}>{busy?"Loading records…":"Refresh records"}</button>
  {error&&<p role="alert" className="rounded border border-red-700 p-4">{data?"Refresh failed. The records below are stale. ":""}{error}</p>}
  {data&&<><section className="rounded border border-sky-700 p-4 space-y-2">
   <p className="font-semibold">{error?"Stale snapshot":"Snapshot"} · {stamp(data.generated_at)}</p>
   <p>{data.capacity.held?"Capacity reserved by at least "+data.capacity.record_count_at_least+" saved session record(s).":"No capacity hold appears in saved records."} Pilot limit: {data.capacity.guest_limit} guest.</p>
   {data.notes.map(note=><p key={note} className="text-sm text-gray-300">{note}</p>)}
   {Object.values(data.truncated).some(Boolean)&&<p role="status" className="text-amber-300">Results are limited. Session or guest-action counts may be incomplete; inspect older records before making recovery decisions.</p>}
  </section><section className="space-y-3"><h2 className="text-xl font-semibold">Sessions holding capacity</h2>
   {!sessions.length&&<p>No saved active sessions.</p>}{sessions.map(run=><Session key={run.source+run.id} run={run}/>)}
  </section><section className="space-y-3"><h2 className="text-xl font-semibold">Recently released sessions</h2>
   {!data.recent.length&&<p>No recently released sessions.</p>}{data.recent.map(run=><Session key={run.id} run={run}/>)}
  </section></>}
 </div></main>;
}
