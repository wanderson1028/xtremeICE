import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { isGuidedTemplate } from "@/lib/awsLearnerTemplate";
const call = async (action,fields={}) => (await base44.functions.invoke("cloudLearnerAWS",{action,...fields})).data;
const message = e => [e?.response?.data?.error,e?.response?.data?.error_code,e?.response?.data?.detail].filter(Boolean).join(": ") || e.message;
export default function CloudLearnerPoc(){
 const [user,setUser]=useState(null),[runs,setRuns]=useState([]),[schema,setSchema]=useState(false),[plan,setPlan]=useState(null);
 const [templates,setTemplates]=useState([]),[templateId,setTemplateId]=useState(new URLSearchParams(window.location.search).get("template_id")||"");
 const [selected,setSelected]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [history,setHistory]=useState([]),[historyTick,setHistoryTick]=useState(0);
 const [content,setContent]=useState(""),[mode,setMode]=useState("644"),[loaded,setLoaded]=useState(false),[operation,setOperation]=useState(null),[validation,setValidation]=useState(null);
 const run=runs.find(r=>r.id===selected),locked=busy||!!operation;
 const load=async()=>{const data=await call("list");setRuns(data.runs||[]);setSchema(data.schema_ready);return data.runs||[];};
 useEffect(()=>{let mounted=true;(async()=>{try{const me=await base44.auth.me();const [data,rows]=await Promise.all([call("list"),me.role==="admin"?base44.entities.LabTemplate.list("-created_date",100):Promise.resolve([])]);if(mounted){setUser(me);setRuns(data.runs||[]);setSchema(data.schema_ready);setTemplates(rows.filter(isGuidedTemplate));}}catch(e){if(mounted)setError(message(e));}})();return()=>{mounted=false;};},[]);
 useEffect(()=>{
  if(!operation)return;
  let cancelled=false,timer;
  const poll=async()=>{try{
   const data=await call("pollOperation",{run_id:operation.run_id,operation_id:operation.id});
   if(cancelled)return;
   if(data.status==="pending"){timer=setTimeout(poll,2000);return;}
   setOperation(null);
   if(data.status!=="completed"){setError("Guest task action "+data.status+(data.error_code?": "+data.error_code:""));return;}
   if(operation.kind==="read"){setContent(data.result.content);setMode(data.result.mode==="600"?"600":"644");setLoaded(true);setNotice("Loaded file contents and permissions from the AWS guest.");}
   if(operation.kind==="write"){setNotice("The AWS guest saved the file. Run validation to check its permissions.");setValidation(null);}
   if(operation.kind==="validate"){setValidation(data.result);setHistoryTick(n=>n+1);setNotice("Independent guest validation completed.");}
  }catch(e){if(!cancelled){setOperation(null);setError(message(e));}}};
  poll();return()=>{cancelled=true;clearTimeout(timer);};
 },[operation]);
 useEffect(()=>{
  if(!selected)return;
  let cancelled=false;call("validationHistory",{run_id:selected}).then(data=>{if(!cancelled)setHistory(data.checks||[]);}).catch(()=>{if(!cancelled)setHistory([]);});
  return()=>{cancelled=true;};
 },[selected,historyTick]);
 useEffect(()=>{
  if(!run||!["preparing","provisioning","cleanup_pending"].includes(run.status))return;
  let cancelled=false,timer,tries=0;const id=run.id;
  const poll=async()=>{try{
    const data=await call("refresh",{run_id:id});if(cancelled)return;
    setRuns(previous=>previous.map(r=>r.id===id?data.run:r));
    if(data.run.status==="terminated"){const removal=await call("verifyRemoval",{run_id:id});if(!cancelled)setNotice(removal.verified?"Cleanup verified: AWS reports no learner stack resources remain.":"Cleanup needs attention: "+removal.remaining.join(", "));return;}
    if(data.run.status==="ready"){setNotice("Your AWS guest is ready. Start with an initial validation, then load and edit its file.");return;}
    if(data.run.status==="failed"){setError("AWS stack needs inspection or cleanup. Check its status before another launch.");return;}
    if(++tries<90)timer=setTimeout(poll,5000);else setNotice("AWS is still working. Use Refresh guest status to check again.");
  }catch(e){if(!cancelled)setError(message(e));}};
  timer=setTimeout(poll,2000);return()=>{cancelled=true;clearTimeout(timer);};
 },[run?.id,run?.status]);
 const perform=async(fn)=>{setBusy(true);setError("");setNotice("");try{await fn();}catch(e){setError(message(e));}finally{setBusy(false);}};
 const choose=id=>{setSelected(id);setLoaded(false);setContent("");setMode("644");setValidation(null);setHistory([]);setNotice("");setError("");};
 const refresh=()=>perform(async()=>{await call("refresh",{run_id:run.id});await load();});
 const provision=()=>{if(!plan?.eligible||plan.template_id!==templateId)return;if(!window.confirm("Launch one private t3.micro with an encrypted 8 GiB disk, two private SSM endpoints, and the preconfigured SSM instance profile? No public IP or internet gateway. Private endpoints stay billable until stack deletion. Clean up within the $10/two-hour pilot limit; the guest requests termination after 105 minutes."))return;
 perform(async()=>{const data=await call("provision",{ack:"LAUNCH_PRIVATE_SSM_LEARNER_PILOT",template_id:templateId,template_hash:plan.template_hash,ami_id:plan.ami_id,zone:plan.zone});await load();choose(data.run_id);setNotice("Private learner stack requested. Refresh its status until ready.");});};
 const start=kind=>perform(async()=>{const data=await call("startOperation",{run_id:run.id,kind,...(kind==="write"?{content,mode}:{})});setOperation({id:data.operation_id,run_id:run.id,kind});});
 const cleanup=()=>{if(!window.confirm("Delete this learner stack, including its guest, disk and private endpoints? The reusable IAM setup stays in place."))return;perform(async()=>{const data=await call("cleanup",{run_id:run.id,ack:"DELETE_LEARNER_STACK"});await load();setNotice("Cleanup: "+data.status+". Refresh until terminated, then verify AWS removal.");});};
 const button="rounded bg-sky-800 px-4 py-2 disabled:opacity-40";
 return <div className="min-h-screen bg-gray-950 text-gray-100 p-6"><main className="max-w-4xl mx-auto space-y-5">
  <Link to="/CloudCoursePoc" className="text-sky-300">← AWS course proof</Link>
  <h1 className="text-2xl font-semibold">AWS learner file task</h1>
  <p className="text-sm text-sky-300">Learner account: 935838375949 · Region: us-east-1 · Dedicated learner credentials</p>
  <p className="text-gray-300">Edit a file in your AWS guest and protect it with permissions 600. Validation independently reads the guest file mode.</p>
  {error&&<div role="alert" className="border border-red-700 p-3">{error}</div>}
  {notice&&<div role="status" className="border border-sky-700 p-3">{notice}</div>}
  {!schema&&<p className="text-amber-300">The shared learner data schemas need to be applied before provisioning.</p>}
  {user?.role==="admin"&&<section className="border border-gray-700 rounded p-4 space-y-3">
   <h2 className="font-semibold">Provision your reviewed lab</h2>
   <Link to="/QuickBuild?preset=aws-learner" className="block text-sky-300">1. Generate a lab with AI →</Link>
   <label className="block">Saved AWS lab template<select aria-label="Saved AWS lab template" disabled={locked} className="block mt-2 w-full bg-gray-900 border border-gray-600 p-2" value={templateId} onChange={e=>{setTemplateId(e.target.value);setPlan(null);}}><option value="">Select the saved lab</option>{templates.map(t=><option key={t.id} value={t.id}>{t.title}</option>)}</select></label>
   {templateId&&<Link className="block text-sky-300" to={"/LabBuilder?id="+templateId}>2. Review this lab in Lab Builder →</Link>}
   <button className={button} disabled={locked||!templateId} onClick={()=>perform(async()=>setPlan(await call("preflight",{template_id:templateId})))}>Check AWS learner access</button>
   {plan&&<div className="space-y-2 text-sm"><p>Reviewed lab: {plan.template_title}</p><p>Account: {plan.account} · Region: {plan.region} · Zone: {plan.zone} · AMI: {plan.ami_id}</p><p>{plan.scope}</p><p>Shared schemas: {plan.schema_ready?"ready":"required"} · Eligible: {plan.eligible?"yes":"no"}</p></div>}
   <button className={button+" bg-red-800"} disabled={locked||!plan?.eligible||plan.template_id!==templateId||runs.some(r=>r.status!=="terminated")} onClick={provision}>Launch private learner guest</button>
  </section>}
  <section className="border border-gray-700 rounded p-4 space-y-3">
   <h2 className="font-semibold">Your learner run</h2>
   <div className="flex gap-3">
    <select aria-label="Learner run" className="bg-gray-900 border border-gray-600 p-2 flex-1" disabled={locked} value={selected} onChange={e=>choose(e.target.value)}><option value="">Select a run</option>{runs.map(r=><option key={r.id} value={r.id}>{r.id} · {r.status}</option>)}</select>
    <button className={button} disabled={locked} onClick={()=>perform(load)}>Reload runs</button>
   </div>
   {run&&<><p>Status: {run.status} · AWS stack: {run.stack_status||"pending"}</p><p>Instance: {run.instance_id||"pending"} · Expires: {run.expires_at}</p>
    <div className="flex gap-3 flex-wrap"><button className={button} disabled={locked} onClick={refresh}>Refresh guest status</button>
    {run.status!=="terminated"&&<button className={button+" bg-red-800"} disabled={locked} onClick={cleanup}>Terminate and clean up</button>}
    {run.status==="terminated"&&<button className={button} disabled={locked} onClick={()=>perform(async()=>{const data=await call("verifyRemoval",{run_id:run.id});setNotice(data.verified?"AWS confirms no learner stack, active instance, VPC, or tagged volume remains.":"AWS still reports: "+data.remaining.join(", "));})}>Verify AWS removal</button>}</div>
   </>}
  </section>
  {run&&run.owner_user_id===user?.id&&<section className="border border-gray-700 rounded p-4 space-y-3">
   {run.contract?.template_snapshot&&<div className="border-b border-gray-700 pb-3 space-y-2"><h2 className="font-semibold text-lg">{run.contract.template_snapshot.title}</h2><p>{run.contract.template_snapshot.description}</p><p className="whitespace-pre-wrap">{run.contract.template_snapshot.lab_content?.scenario}</p><p className="whitespace-pre-wrap">{run.contract.template_snapshot.lab_content?.tasks?.[0]?.instructions}</p></div>}
   <h2 className="font-semibold">{run.contract?.title}</h2><p className="font-mono text-sm">{run.contract?.path}</p>
   <p>First validate the initial permissions to see a failure. Load the file, edit its contents, choose 600, and save. Validate again to check the change. Changing back to 644 should fail a new validation.</p>
   <button className={button} disabled={locked||run.status!=="ready"} onClick={()=>start("read")}>Load file from guest</button>
   <label className="block">File contents<textarea className="block mt-2 w-full min-h-32 bg-gray-900 border border-gray-600 p-3 font-mono" disabled={locked||!loaded||run.status!=="ready"} value={content} onChange={e=>setContent(e.target.value)}/></label>
   <label className="block">File permissions <select className="bg-gray-900 p-2 border border-gray-600" disabled={locked||!loaded||run.status!=="ready"} value={mode} onChange={e=>setMode(e.target.value)}><option value="644">644 — owner writes; others can read</option><option value="600">600 — owner reads and writes</option></select></label>
   <div className="flex gap-3"><button className={button} disabled={locked||!loaded||run.status!=="ready"} onClick={()=>start("write")}>Save file to guest</button><button className={button} disabled={locked||run.status!=="ready"} onClick={()=>start("validate")}>Validate guest permissions</button></div>
   {operation&&<p role="status">Guest action in progress…</p>}
   {history.length>0&&<div className="border border-gray-700 rounded p-3 space-y-1"><h3 className="font-semibold">Recorded validations · newest first</h3>{history.map(check=><p key={check.id} className={check.passed?"text-green-300":"text-amber-300"}>{check.passed?"Pass":"Fail"} · Observed mode: {check.observed} · Required: 600</p>)}</div>}
   {validation&&<p role="status" className={validation.passed?"text-green-300":"text-amber-300"}>Validation: {validation.passed?"Pass":"Fail"} · Guest mode: {validation.mode} · Required mode: 600</p>}
  </section>}
 </main></div>;
}