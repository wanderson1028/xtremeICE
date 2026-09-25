import React,{useState} from "react";
import {base44} from "@/api/base44Client";
const input="w-full rounded-lg border border-slate-600 bg-slate-950 p-3 text-sm text-white";
export default function IRPlanEditor({profileId,plan,onChange}){
 const [busy,setBusy]=useState(false),[error,setError]=useState("");
 const edit=patch=>onChange({...plan,...patch,approved:false,approved_at:null,version_id:crypto.randomUUID()});
 const upload=async(file)=>{
 if(!file)return;setBusy(true);setError("");
 try{const response=await base44.functions.invoke("extract-ttx-ir-plan",{file,profile_id:profileId});const data=response.data||response;if(data.error)throw Error(data.error);onChange(data.plan);}
 catch(e){setError(e.response?.data?.error||e.message||"Unable to process plan.");}finally{setBusy(false);}
 };
 return <section className="mt-6 rounded-2xl border border-purple-500/40 bg-purple-500/5 p-5">
 <h3 className="text-xl font-bold">Incident response plan</h3><p className="mt-2 text-sm leading-6 text-slate-300">Upload a PDF or TXT plan (up to 10 MB). Review the extracted requirements, confirm them, then save the company profile. New exercises use the approved version; existing attempts keep their original snapshot.</p>
 {!profileId?<p className="mt-3 text-amber-200">Save this company profile before uploading its plan.</p>:<label className="mt-4 block text-sm font-semibold">Upload / replace plan<input disabled={busy} type="file" accept=".pdf,.txt" className="mt-2 block w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-purple-200 file:px-4 file:py-2 file:text-slate-950" onChange={e=>{upload(e.target.files?.[0]);e.target.value="";}}/></label>}
 {busy&&<div role="status" className="mt-4 text-cyan-200">Privately uploading and extracting the plan…<progress className="mt-2 w-full"/></div>}
 {error&&<p role="alert" className="mt-3 text-rose-200">{error}</p>}
 {plan&&<div className="mt-5 space-y-4"><p className="text-sm text-purple-200">{plan.file_name} · Document version: {plan.document_version} · {plan.approved?"Reviewed and confirmed":"Review required"}</p><label className="block text-sm">Plan title<input className={input} value={plan.title||""} onChange={e=>edit({title:e.target.value})}/></label><label className="block text-sm">Executive summary<textarea className={input} rows={3} value={plan.summary||""} onChange={e=>edit({summary:e.target.value})}/></label>
 <details open><summary className="cursor-pointer font-semibold">Review extracted requirements ({plan.requirements?.length||0})</summary><div className="mt-3 space-y-3">{(plan.requirements||[]).map((r,i)=><div className="rounded-xl border border-slate-700 p-3" key={r.id}><div className="grid gap-3 md:grid-cols-3">{[["phase","Response area"],["owner","Responsible role"],["reference","Page / section"]].map(([k,l])=><label className="text-xs text-slate-300" key={k}>{l}<input className={input} value={r[k]||""} onChange={e=>edit({requirements:plan.requirements.map((x,j)=>i===j?{...x,[k]:e.target.value}:x)})}/></label>)}</div><label className="mt-2 block text-sm">Requirement<textarea className={input} value={r.requirement} rows={2} onChange={e=>edit({requirements:plan.requirements.map((x,j)=>i===j?{...x,requirement:e.target.value}:x)})}/></label></div>)}</div></details>
 <label className="block text-sm">Potential plan gaps — review and correct (one per line)<textarea className={input} rows={3} value={(plan.gaps||[]).join("\n")} onChange={e=>edit({gaps:e.target.value.split("\n").filter(Boolean)})}/></label>
 <label className="flex items-start gap-3 rounded-lg border border-emerald-500/30 p-3 text-sm"><input type="checkbox" className="mt-1" checked={!!plan.approved} disabled={busy||!plan.requirements?.length||plan.requirements.some(r=>!r.requirement.trim())} onChange={e=>onChange({...plan,approved:e.target.checked,approved_at:e.target.checked?new Date().toISOString():null})}/>I reviewed these requirements and references against the source plan. Use this version for future exercises after I save the profile.</label>
 <button type="button" className="text-sm text-rose-200 underline" onClick={()=>onChange(null)}>Detach plan from future exercises</button>
 </div>}</section>;
}