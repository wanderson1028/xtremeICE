import React from "react";
export function planResult(decisions,plan){
 if(!plan)return null;
 const evaluated=decisions.filter(d=>Number.isFinite(d.plan_points)&&d.plan_requirement_ids?.length);
 const covered=[...new Set(evaluated.flatMap(d=>d.plan_requirement_ids))];
 return {version_id:plan.version_id,score:evaluated.length?Math.round(evaluated.reduce((s,d)=>s+d.plan_points,0)/evaluated.length):null,assessed_decisions:evaluated.length,requirements_tested:covered.length,requirements_total:plan.requirements.length,untested:plan.requirements.filter(r=>!covered.includes(r.id)).map(r=>r.id)};
}
export default function IRPlanReport({exercise,result}){
 const plan=exercise?.ir_plan_snapshot;if(!plan)return null;
 const adherence=result.ir_plan_result||planResult(result.decisions||[],plan);
 return <section className="rounded-2xl border border-purple-500/40 bg-slate-900 p-6">
 <h2 className="text-xl font-bold">Incident response plan — after-action review</h2><p className="mt-2 text-sm text-slate-300">{plan.title} · Document version {plan.document_version} · {exercise.training_mode==="assessment"?"Assessment":"Practice"} mode</p><p className="mt-1 break-all text-xs text-slate-400">Saved plan version: {plan.version_id}</p>
 <div className="mt-4 grid gap-4 sm:grid-cols-2"><div className="rounded-xl bg-slate-950 p-4"><p className="text-sm text-purple-200">Plan adherence</p><p className="text-3xl font-bold">{adherence.score==null?"Not assessed":adherence.score+"/100"}</p><p className="mt-2 text-sm text-slate-400">How well the selected actions followed the tested plan requirements.</p></div><div className="rounded-xl bg-slate-950 p-4"><p className="text-sm text-cyan-200">Response effectiveness</p><p className="text-3xl font-bold">{result.overall_score}/100</p><p className="mt-2 text-sm text-slate-400">The separate TTX score. Following a weak plan does not automatically improve this score.</p></div></div>
 <p className="mt-4 text-sm text-slate-300">{adherence.requirements_tested} of {adherence.requirements_total} extracted requirements tested across {adherence.assessed_decisions} decisions. Untested requirements are not treated as passed or failed.</p>
 <div className="mt-4 space-y-3">{(result.decisions||[]).filter(d=>d.plan_requirement_ids?.length).map(d=><details key={d.inject_id} className="rounded-lg border border-slate-700 p-3"><summary className="cursor-pointer font-semibold">Decision {d.sequence} · Plan adherence {d.plan_points}/100</summary><p className="mt-2 text-sm leading-6">{d.choice_label}</p><p className="mt-2 text-sm leading-6 text-slate-300">{d.plan_rationale}</p>{d.plan_requirement_ids.map(id=>{const r=plan.requirements.find(r=>r.id===id);return r?<p key={id} className="mt-2 text-sm text-purple-200">{r.reference}: {r.requirement}</p>:null})}</details>)}</div>
 {!!plan.gaps?.length&&<div className="mt-4"><h3 className="font-bold text-amber-200">Plan gaps flagged during review</h3><ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-slate-300">{plan.gaps.map((g,i)=><li key={i}>{g}</li>)}</ul><p className="mt-2 text-xs text-slate-400">These are reviewed plan observations, not proof that each gap affected this run.</p></div>}
 </section>;
}