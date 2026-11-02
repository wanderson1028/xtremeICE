import React,{useEffect,useState} from "react";
import {Link} from "react-router-dom";
import {learnerCall,learnerError} from "@/lib/cloudLearnerClient";
export default function LabAssignments(){
 const [data,setData]=useState(null),[templateId,setTemplateId]=useState(""),[userId,setUserId]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const template=data?.labs.find(l=>l.id===templateId);
 const load=async()=>setData(await learnerCall("assignmentCatalog"));
 useEffect(()=>{let live=true;learnerCall("assignmentCatalog").then(d=>{if(live)setData(d);}).catch(e=>{if(live)setError(learnerError(e));});return()=>{live=false;};},[]);
 const perform=async(fn)=>{setBusy(true);setError("");setNotice("");try{await fn();await load();}catch(e){setError(learnerError(e));}finally{setBusy(false);}};
 const assign=()=>perform(async()=>{await learnerCall("assignLab",{template_id:templateId,template_hash:template.template_hash,user_id:userId});setNotice("Lab assigned. The learner can open Assigned Labs. No guest has been started.");});
 const revoke=id=>{if(window.confirm("Revoke this assignment? New guest actions will be blocked. An existing session still needs Finish lab or instructor cleanup."))perform(async()=>{await learnerCall("revokeAssignment",{assignment_id:id});setNotice("Assignment revoked. Check any active session for cleanup.");});};
 const button="rounded-lg bg-sky-700 px-4 py-2 text-white disabled:opacity-40";
 return <main className="min-h-screen bg-gray-950 text-gray-100 p-6"><div className="max-w-5xl mx-auto space-y-6">
  <nav className="flex gap-5 text-sky-300"><Link to="/LabBuilderDashboard">← Course Lab Builder</Link><Link to="/LearnerWorkspace">Assigned Labs</Link><Link to="/CloudLearnerPoc">Manage AWS sessions</Link></nav>
  <header><h1 className="text-3xl font-semibold">Lab assignments</h1><p className="text-gray-400 mt-2">Review a supported lab and assign it to an existing learner. One AWS guest can run at a time.</p></header>
  {error&&<p role="alert" className="rounded border border-red-700 p-4">{error}</p>}
  {notice&&<p role="status" className="rounded border border-sky-700 p-4">{notice}</p>}
  {!data&&!error&&<p>Loading instructor controls…</p>}
  {data&&<><section className="rounded-xl border border-gray-700 bg-gray-900 p-6 space-y-4">
   <h2 className="text-xl font-semibold">Assign a reviewed lab</h2>
   <label className="block">Lab<select className="block w-full bg-gray-950 border border-gray-600 rounded p-3 mt-2" value={templateId} disabled={busy} onChange={e=>setTemplateId(e.target.value)}><option value="">Choose a supported AWS lab</option>{data.labs.map(l=><option key={l.id} value={l.id}>{l.title}</option>)}</select></label>
   {template&&<div className="border-l-2 border-sky-600 pl-4 space-y-2"><p>{template.description}</p><p className="whitespace-pre-wrap text-gray-300">{template.instructions}</p><Link className="text-sky-300" to={"/LabBuilder?id="+template.id}>Review in Lab Builder →</Link><p className="text-sm text-gray-400">Instructions and validation are frozen when the learner starts.</p></div>}
   <label className="block">Learner<select className="block w-full bg-gray-950 border border-gray-600 rounded p-3 mt-2" value={userId} disabled={busy} onChange={e=>setUserId(e.target.value)}><option value="">Choose an existing app user</option>{data.users.map(u=><option key={u.id} value={u.id}>{u.name} · {u.email}</option>)}</select></label>
   <button className={button} disabled={busy||!template||!userId} onClick={assign}>Assign reviewed lab</button>
   {!data.labs.length&&<p>Create a lab using <Link className="text-sky-300" to="/QuickBuild?preset=aws-learner">AI → AWS Demo</Link> first.</p>}
  </section><section className="space-y-3"><h2 className="text-xl font-semibold">Current assignments</h2>
   {!data.assignments.length&&<p className="text-gray-400">No supported AWS labs are assigned yet.</p>}
   {data.assignments.map(a=><article key={a.id} className="rounded-xl border border-gray-700 p-4 flex justify-between items-center gap-4"><div><h3 className="font-semibold">{data.labs.find(l=>l.id===a.template_id)?.title}</h3><p className="text-gray-400">{a.user_email}</p></div><button className={button} disabled={busy} onClick={()=>revoke(a.id)}>Revoke access</button></article>)}
  </section></>}
 </div></main>;
}
