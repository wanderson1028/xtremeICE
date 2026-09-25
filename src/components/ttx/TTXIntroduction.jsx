import React from "react";
import { ShieldAlert, Building2, Network, Radio, Users, BarChart3, History, ArrowRight, CheckCircle2, Activity } from "lucide-react";

const features=[
 [Building2,"Built around your company","Use a saved company profile, industry, size, and recovery priorities to shape each exercise."],
 [Radio,"Threat-informed scenarios","Practice cyber incidents inspired by threat intelligence, with disaster and continuity complications woven into the response."],
 [Network,"See the impact of each decision","Follow changes across the simulated network and review estimated outage and response costs."],
 [Users,"Clear roles and accountability","Identify decision owners, supporting roles, and execution responsibilities. See how authority engagement affects the outcome."],
 [Activity,"Questions that follow your choices","Conditional follow-up questions revisit unresolved risks and response gaps as the exercise progresses."],
 [History,"Results you can learn from","Review scores by response area and role, a plain-language end-state overview, and organization-specific history."]
];
export default function TTXIntroduction({onEnter,onProfile}){
 return <main className="min-h-screen bg-slate-950 text-slate-100">
 <div className="relative overflow-hidden border-b border-cyan-900/60 bg-[radial-gradient(ellipse_at_top_right,rgba(8,145,178,.22),transparent_60%)] px-5 py-10 lg:px-10 lg:py-14">
 <div className="mx-auto grid max-w-[1600px] items-center gap-10 lg:grid-cols-[1.15fr_.85fr]">
 <section><div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/5 px-4 py-2 text-xs font-bold uppercase tracking-[.18em] text-cyan-200"><ShieldAlert className="h-4 w-4"/>Xtreme I.C.E. · Cyber Tabletop Exercises</div>
 <h1 className="mt-6 max-w-3xl text-4xl font-bold leading-tight tracking-tight md:text-5xl">Practice the decisions.<br/><span className="text-cyan-300">Understand the consequences.</span></h1>
 <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-300">Bring your company's cyber response into focus. Work through a simulated crisis, see how your choices affect operations, and discover where your team needs to improve.</p>
 <div className="mt-7 flex flex-wrap gap-3"><button onClick={onEnter} className="inline-flex items-center gap-3 rounded-xl bg-cyan-400 px-6 py-3.5 text-base font-bold text-slate-950 hover:bg-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-300">Enter TTX dashboard<ArrowRight className="h-5 w-5"/></button><button onClick={onProfile} className="rounded-xl border border-slate-600 bg-slate-900 px-6 py-3.5 font-semibold hover:border-cyan-400">Set up company profile</button></div>
 <p className="mt-4 text-sm text-slate-400">Select or save a company profile before starting an exercise.</p></section>
 <aside aria-label="Exercise journey" className="rounded-2xl border border-slate-700 bg-slate-900/90 p-6 shadow-2xl">
 <div className="flex items-center justify-between gap-3"><p className="text-sm font-bold uppercase tracking-widest text-cyan-200">Your exercise journey</p><ShieldAlert className="h-7 w-7 text-cyan-300"/></div>
 <ol className="mt-6 space-y-5">{[["01","Define your environment","Company profile, network, and business priorities"],["02","Face the incident","Choose an attack scenario and continuity factor"],["03","Make the decisions","Respond as events unfold and consequences appear"],["04","Review your readiness","Understand the outcome and plan improvements"]].map(([n,title,detail])=><li key={n} className="flex items-start gap-4"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/30 bg-cyan-500/10 font-mono font-bold text-cyan-200">{n}</span><div><p className="font-semibold">{title}</p><p className="mt-1 text-sm leading-6 text-slate-400">{detail}</p></div></li>)}</ol>
 <div className="mt-6 flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4"><CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-emerald-300"/><p className="text-sm leading-6 text-slate-300">A safe place to test business decisions before a real incident demands them.</p></div></aside>
 </div></div>
 <section className="mx-auto max-w-[1600px] px-5 py-8 lg:px-10"><div className="mb-5 flex items-center gap-3"><BarChart3 className="h-5 w-5 text-cyan-300"/><h2 className="text-2xl font-bold">From decision to business impact</h2></div>
 <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{features.map(([Icon,title,description])=><article key={title} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5"><Icon className="mb-3 h-6 w-6 text-cyan-300"/><h3 className="text-lg font-semibold">{title}</h3><p className="mt-2 text-base leading-7 text-slate-300">{description}</p></article>)}</div>
 <p className="mt-6 text-sm leading-6 text-slate-400">TTX measures exercise decisions independently of CFRS. Financial impacts are simulated training estimates based on your saved assumptions.</p>
 </section></main>;
}
