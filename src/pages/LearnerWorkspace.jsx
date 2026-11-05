import React,{useEffect,useState} from "react";
import {Link,useSearchParams} from "react-router-dom";
import {base44} from "@/api/base44Client";
import {learnerCall,learnerError} from "@/lib/cloudLearnerClient";
import LiveVerification from "@/components/LiveVerification";
const ACTIVE=["preparing","provisioning","ready","failed","cleanup_pending"];
export default function LearnerWorkspace(){
 const [params,setParams]=useSearchParams(),selected=params.get("run")||"";
 const [user,setUser]=useState(null),[assignments,setAssignments]=useState([]),[runs,setRuns]=useState([]),[capacity,setCapacity]=useState(true),[loading,setLoading]=useState(true);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[operation,setOperation]=useState(null);
 const [content,setContent]=useState(""),[mode,setMode]=useState("644"),[loaded,setLoaded]=useState(false),[history,setHistory]=useState([]),[clock,setClock]=useState(Date.now());
 const run=runs.find(r=>r.id===selected),snapshot=run?.contract?.template_snapshot,learning=run?.contract?.learning||{},locked=busy||!!operation;
 const hasAssignment=!run?.contract?.assignment_id||assignments.some(a=>a.id===run.contract.assignment_id);
 const expired=run&&Date.parse(run.expires_at)<=clock,canEdit=run?.status==="ready"&&!expired&&!learning.finished_at&&hasAssignment;
 const load=async()=>{const [me,a,r]=await Promise.all([base44.auth.me(),learnerCall("assignedLabs"),learnerCall("list")]);setUser(me);setAssignments(a.assignments);setCapacity(a.capacity_available);setRuns(r.runs.filter(x=>x.owner_user_id===me.id));};
 useEffect(()=>{load().catch(e=>setError(learnerError(e))).finally(()=>setLoading(false));const timer=setInterval(()=>setClock(Date.now()),1000);return()=>clearInterval(timer);},[]);
 useEffect(()=>{setLoaded(false);setContent("");setMode("644");setHistory([]);setOperation(null);setNotice("");setError("");if(!selected)return;
  let cancelled=false;Promise.all([learnerCall("workspaceState",{run_id:selected}),learnerCall("validationHistory",{run_id:selected})]).then(([s,h])=>{if(cancelled)return;setRuns(rows=>rows.some(r=>r.id===s.run.id)?rows.map(r=>r.id===s.run.id?s.run:r):[s.run,...rows]);setHistory(h.checks||[]);if(s.pending_operation)setOperation({...s.pending_operation,run_id:selected});}).catch(e=>{if(!cancelled)setError(learnerError(e));});return()=>{cancelled=true;};
 },[selected]);
 useEffect(()=>{if(!run||!["preparing","provisioning","cleanup_pending"].includes(run.status))return;
  let cancelled=false,timer;const poll=async()=>{try{const d=await learnerCall("refresh",{run_id:run.id});if(cancelled)return;setRuns(rows=>rows.map(r=>r.id===run.id?d.run:r));if(["preparing","provisioning","cleanup_pending"].includes(d.run.status))timer=setTimeout(poll,5000);}catch(e){if(!cancelled)setError(learnerError(e));}};
  timer=setTimeout(poll,2000);return()=>{cancelled=true;clearTimeout(timer);};
 },[run?.id,run?.status]);
 useEffect(()=>{if(!run||run.status!=="terminated")return;let cancelled=false;learnerCall("verifyRemoval",{run_id:run.id}).then(d=>{if(!cancelled){setNotice(d.verified?"Environment released. AWS removal verified.":"Cleanup needs attention: "+d.remaining.join(", "));load().catch(()=>{});}}).catch(e=>{if(!cancelled)setError(learnerError(e));});return()=>{cancelled=true;};},[run?.id,run?.status]);
 useEffect(()=>{if(!operation)return;let cancelled=false,timer;
  const poll=async()=>{try{const d=await learnerCall("pollOperation",{run_id:operation.run_id,operation_id:operation.id});if(cancelled)return;
   if(d.status==="pending"){timer=setTimeout(poll,2000);return;}
   if(d.status!=="completed"){setOperation(null);setError("Guest action "+d.status+(d.error_code?": "+d.error_code:""));return;}
   if(operation.kind==="read"){setContent(d.result.content);setMode(d.result.mode);setLoaded(true);setNotice("Loaded the file from your guest.");}
   if(operation.kind==="write"){setLoaded(false);setNotice("File saved in your guest. Load it again to check persistence, then validate.");}
   if(operation.kind==="validate"){const h=await learnerCall("validationHistory",{run_id:operation.run_id});if(cancelled)return;setHistory(h.checks||[]);setNotice(d.result.passed?"Validation passed: permissions are 600.":"Validation failed: observed "+d.result.mode+"; required 600.");await load();}
   if(!cancelled)setOperation(null);
  }catch(e){if(!cancelled){setOperation(null);setError(learnerError(e));}}};poll();return()=>{cancelled=true;clearTimeout(timer);};
 },[operation]);
 const perform=async(fn)=>{setBusy(true);setError("");setNotice("");try{await fn();}catch(e){setError(learnerError(e));}finally{setBusy(false);}};
 const open=id=>setParams({run:id});
 const start=a=>{if(!window.confirm("Start your private lab session? Finish the lab to release its environment. This pilot allows one active guest and a session of up to 110 minutes."))return;perform(async()=>{const p=await learnerCall("assignmentPreflight",{assignment_id:a.id});if(!p.eligible)throw new Error("The assigned lab is not ready. Contact your instructor.");const d=await learnerCall("startAssigned",{assignment_id:a.id,template_hash:p.template_hash,ami_id:p.ami_id,zone:p.zone,ack:"LAUNCH_PRIVATE_SSM_LEARNER_PILOT"});await load();open(d.run_id);});};
 const action=kind=>perform(async()=>{const d=await learnerCall("startOperation",{run_id:run.id,kind,...(kind==="write"?{content,mode}:{})});setOperation({id:d.operation_id,kind,run_id:run.id});});
 const finish=()=>{if(window.confirm("Finish this session and release its environment? Your validation results will be kept."))perform(async()=>{await learnerCall("finish",{run_id:run.id,ack:"DELETE_LEARNER_STACK"});await load();});};
 const refresh=()=>perform(async()=>{if(run)await learnerCall("refresh",{run_id:run.id});await load();});
 const button="rounded-lg bg-sky-700 px-4 py-2 text-white disabled:opacity-40";
 return <main className="min-h-screen bg-gray-950 text-gray-100 p-6"><div className="max-w-6xl mx-auto space-y-6">
  <header className="flex justify-between gap-4"><div><h1 className="text-3xl font-semibold">Assigned Labs</h1><p className="text-gray-400 mt-2">Learn, practice and check your work in a private lab.</p></div>{user?.role==="admin"&&<Link className="text-sky-300" to="/LabAssignments">Instructor assignments →</Link>}</header>
  <LiveVerification/>
  {error&&<p role="alert" className="border border-red-700 rounded p-4">{error}</p>}
  {notice&&<p role="status" className="border border-sky-700 rounded p-4">{notice}</p>}
  {loading&&<p>Loading your labs…</p>}
  {!loading&&<div className="grid lg:grid-cols-[280px_1fr] gap-6"><aside className="space-y-5">
   <section className="space-y-3"><h2 className="font-semibold">Your assignments</h2>{!assignments.length&&<p className="text-gray-400 text-sm">No AWS labs assigned yet. Ask your instructor to assign a lab.</p>}
   {!capacity&&<p className="text-amber-300 text-sm">The shared pilot environment is occupied or awaiting cleanup. You can resume your own active session.</p>}
   {assignments.map(a=>{const active=runs.find(r=>r.contract?.assignment_id===a.id&&ACTIVE.includes(r.status));return <article key={a.id} className="bg-gray-900 border border-gray-700 rounded-xl p-4 space-y-3"><h3 className="font-semibold">{a.title}</h3><p className="text-sm text-gray-400">{a.description}</p><button className={button} disabled={locked||(!active&&(!capacity||!a.available))} onClick={()=>active?open(active.id):start(a)}>{active?"Resume session":"Start lab"}</button>{!a.available&&!active&&<p className="text-amber-300 text-sm">This lab needs instructor review.</p>}</article>;})}
   </section><section className="space-y-2"><h2 className="font-semibold">Your sessions</h2>{runs.map(r=><button key={r.id} disabled={locked} onClick={()=>open(r.id)} className={"block text-left w-full rounded p-3 border "+(r.id===selected?"border-sky-500 bg-sky-950":"border-gray-700")}><span className="block">{r.contract?.template_snapshot?.title||"Lab session"}</span><span className="text-xs text-gray-400">{r.contract?.learning?.completed_at?"Task completed · ":""}{r.status==="terminated"?"Environment released":r.status}</span></button>)}</section>
   <button className={button} disabled={locked} onClick={refresh}>Refresh status</button>
  </aside><section className="bg-gray-900 border border-gray-700 rounded-xl p-6 space-y-5">
   {!run&&<p className="text-gray-400">Choose an assigned lab to begin, or resume a session.</p>}
   {run&&<><header><h2 className="text-2xl font-semibold">{snapshot?.title||"Lab session"}</h2><p className="text-gray-300 mt-2">{snapshot?.description}</p><p className="text-sm text-sky-300 mt-3">Environment: {run.status==="ready"?"Ready":run.status==="terminated"?"Released":run.status}{run.status!=="terminated"&&" · "+(expired?"Session expired":Math.max(0,Math.ceil((Date.parse(run.expires_at)-clock)/60000))+" minutes remaining")}</p></header>
   {learning.completed_at&&<p className="rounded border border-green-700 bg-green-950 p-4">Task completed · 100%. Your passing validation is recorded.</p>}
   {learning.finished_at&&<p className="text-gray-300">This learning session has ended. Results remain available below.</p>}
   <div><h3 className="font-semibold mb-2">Learning objectives</h3><ul className="list-disc pl-5 text-gray-300">{snapshot?.objectives?.map((o,i)=><li key={i}>{o}</li>)}</ul></div>
   <p className="whitespace-pre-wrap text-gray-300">{snapshot?.lab_content?.scenario}</p>
   <div className="border-t border-gray-700 pt-4"><h3 className="font-semibold mb-2">{snapshot?.lab_content?.tasks?.[0]?.title}</h3><p className="whitespace-pre-wrap text-gray-300">{snapshot?.lab_content?.tasks?.[0]?.instructions}</p></div>
   {["preparing","provisioning"].includes(run.status)&&<p role="status" className="text-amber-300">Preparing your private environment. This may take 5–10 minutes. You can return to this session later.</p>}
   {expired&&run.status!=="terminated"&&<p className="text-amber-300">The session has expired. Finish the lab to release its remaining resources.</p>}
   {run.status==="failed"&&<p className="text-amber-300">The environment needs attention. Finish this session to request cleanup, or contact your instructor.</p>}
   {!hasAssignment&&run.status!=="terminated"&&<p className="text-amber-300">Your assignment was revoked. Finish this session to release the environment, or contact your instructor.</p>}
   {canEdit&&<div className="space-y-4"><p className="text-sm text-gray-400">Validate once to see the starting state. Load the file, edit it and save with permissions 600. Reload it, then validate again.</p>
    <p className="font-mono text-sm">{run.contract.path}</p>
    <button className={button} disabled={locked} onClick={()=>action("read")}>Load file from guest</button>
    <label className="block">File contents<textarea className="block w-full min-h-40 rounded border border-gray-600 bg-gray-950 font-mono p-3 mt-2" disabled={locked||!loaded} value={content} onChange={e=>setContent(e.target.value)}/></label>
    <label className="block">File permissions<select className="block rounded border border-gray-600 bg-gray-950 p-3 mt-2" value={mode} disabled={locked||!loaded} onChange={e=>setMode(e.target.value)}><option value="644">644 — others can read</option><option value="600">600 — only the owner can read and write</option></select></label>
    <div className="flex flex-wrap gap-3"><button className={button} disabled={locked||!loaded} onClick={()=>action("write")}>Save file to guest</button><button className={button} disabled={locked} onClick={()=>action("validate")}>Validate my work</button></div>
   </div>}
   {operation&&<p role="status">Checking your guest action…</p>}
   <section className="border-t border-gray-700 pt-4 space-y-2"><h3 className="font-semibold">Validation history</h3>{!history.length&&<p className="text-gray-400">No completed validation yet.</p>}{history.map(h=><p key={h.id} className={h.passed?"text-green-300":"text-amber-300"}>{h.passed?"Pass":"Fail"} · Observed {h.observed} · Required 600</p>)}</section>
   {run.status!=="terminated"&&<button className={button+" bg-red-800"} disabled={locked} onClick={finish}>{run.status==="cleanup_pending"?"Retry cleanup":"Finish lab and release environment"}</button>}
   {run.status==="terminated"&&<button className={button} disabled={locked} onClick={()=>perform(async()=>{const d=await learnerCall("verifyRemoval",{run_id:run.id});setNotice(d.verified?"Environment released. AWS removal verified.":"Cleanup needs attention: "+d.remaining.join(", "));})}>Verify environment released</button>}
   </>}
  </section></div>}
 </div></main>;
}