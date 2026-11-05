import React from "react";
import {Link} from "react-router-dom";
import {useOperatorAlerts} from "@/lib/useOperatorAlerts";

const stamp=value=>value?new Date(value).toLocaleString():"Not recorded";
export default function OperatorAlerts(){
 const {snapshot,active,resolved,busy,error,storageWarning,refresh,acknowledge}=useOperatorAlerts();
 const open=active.filter(a=>a.status==="open").length;
 return <main className="min-h-screen bg-gray-950 text-gray-100 p-6"><div className="max-w-5xl mx-auto space-y-6">
  <nav className="flex flex-wrap gap-5 text-sky-300"><Link to="/LabAssignments">← Lab assignments</Link><Link to="/LifecycleDiagnostics">Session recovery overview</Link></nav>
  <header><h1 className="text-3xl font-semibold">Operator alerts</h1><p className="text-gray-300 mt-2">Review lab failures, delayed cleanup and expiry monitoring. Acknowledging an alert keeps it visible until a fresh check confirms recovery.</p></header>
  <p className="rounded border border-gray-700 p-4 text-sm text-gray-300">This branch checks while an instructor page is open. Acknowledgments are saved only for this instructor in this browser; recent history contains generic alert labels. Email and background notifications are not enabled. These controls do not launch guests or request cleanup.</p>
  <button className="rounded-lg bg-sky-700 px-4 py-2 disabled:opacity-40" onClick={refresh} disabled={busy}>{busy?"Checking alerts…":"Refresh alerts"}</button>
  {error&&<p role="alert" className="border border-red-700 rounded p-4">{snapshot?"Check failed. The previous alert snapshot is stale. ":""}{error}</p>}
  {storageWarning&&<p role="status" className="border border-amber-700 rounded p-4">{storageWarning}</p>}
  {snapshot&&<section className="rounded border border-sky-700 p-4 space-y-2">
   <p>{error?"Stale snapshot":"Last checked"}: {stamp(snapshot.checked_at)} · {open} unacknowledged · {active.length-open} acknowledged</p>
   <p className="text-sm">Pilot limit: {snapshot.pilot.guest_limit} guest · {snapshot.pilot.ttl_minutes}-minute sessions. Additional AWS launches and main deployment require approval.</p>
   <p className="text-sm text-gray-300">Session alerts use saved records; they do not prove current AWS health or removal. Expiry workflow: {snapshot.workflow.available?snapshot.workflow.status:"not verified"} · Last recorded run: {stamp(snapshot.workflow.last_run_at)}</p>
  </section>}
  {(snapshot||active.length>0)&&<section className="space-y-3"><h2 className="text-xl font-semibold">Needs attention</h2>
   {!active.length&&!error&&<p>No current operator warnings in the checked records.</p>}
   {active.map(a=><article key={a.key} className={"rounded-xl border bg-gray-900 p-5 space-y-3 "+(a.severity==="high"?"border-red-700":"border-amber-700")}>
    <div><h3 className="font-semibold text-lg">{a.title}</h3><p className="text-sm">{a.severity==="high"?"High priority":"Warning"} · {a.status==="acknowledged"?"Acknowledged in this browser":"Unacknowledged"} · Occurrence {a.occurrences}</p></div>
    {a.unverified&&<p className="text-amber-300">Previously detected; this snapshot could not recheck it. It remains unresolved.</p>}
    <p>{a.next_step}</p>
    {a.run_id&&<p className="text-xs text-gray-400 break-all">Session {a.run_id}</p>}
    <p className="text-xs text-gray-400">First seen: {stamp(a.first_seen_at)} · Last detected: {stamp(a.last_seen_at)}{a.acknowledged_at&&" · Acknowledged: "+stamp(a.acknowledged_at)}</p>
    <div className="flex flex-wrap gap-4 items-center"><button className="rounded bg-sky-700 px-4 py-2 disabled:opacity-40" disabled={busy||a.status==="acknowledged"} onClick={()=>acknowledge(a.key)}>{a.status==="acknowledged"?"Acknowledged":"Acknowledge"}</button><Link className="text-sky-300" to="/LifecycleDiagnostics">Review recovery details →</Link></div>
   </article>)}
  </section>}
  {snapshot&&resolved.length>0&&<section className="space-y-3"><h2 className="text-xl font-semibold">Recently resolved in this browser</h2>{resolved.map(a=><article key={a.key} className="rounded border border-gray-700 p-4"><h3 className="font-semibold">{a.title}</h3><p className="text-sm text-gray-300">Resolved after a fresh check · {stamp(a.resolved_at)} · {a.occurrences} occurrence(s)</p></article>)}</section>}
 </div></main>;
}
