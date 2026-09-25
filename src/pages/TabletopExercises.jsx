import React, { useEffect, useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { ShieldAlert, Building2, Play, BarChart3, History, Settings2, Radio, CheckCircle2, ArrowRight, RotateCcw, Save, MapPin, TrendingUp } from "lucide-react";

const CATEGORIES = {
  preparation_governance: ["Preparation & Governance", 10],
  detection_analysis: ["Detection & Analysis", 15],
  escalation_command: ["Escalation & Command", 10],
  containment: ["Containment", 15],
  eradication_remediation: ["Eradication & Remediation", 10],
  recovery_restoration: ["Recovery & Restoration", 15],
  communications: ["Communications", 10],
  legal_evidence: ["Legal, Compliance & Evidence", 10],
  lessons_improvement: ["Lessons & Improvement", 5],
};
const ATTACKS = {
  "Ransomware": ["Data encryption and extortion", "Backup compromise", "Third-party ransomware"],
  "Business Email Compromise": ["Fraudulent wire transfer", "Executive impersonation", "Vendor invoice fraud"],
  "Cloud Compromise": ["Stolen cloud credentials", "Public data exposure", "Privileged account takeover"],
  "Supply Chain": ["Compromised software update", "Managed-service provider breach", "Vendor access abuse"],
  "Data Breach": ["Customer data theft", "Insider data removal", "Lost or exposed records"],
  "Operational Disruption": ["Distributed denial of service", "Industrial system outage", "Critical service sabotage"],
};
const DISASTERS = ["Hurricane / severe storm", "Flood", "Wildfire", "Earthquake", "Tornado", "Winter storm", "Extended power outage", "Regional communications outage", "Public health emergency", "Custom event", "Surprise me"];
const blankProfile = { company_name:"", industry:"", employee_count:"", headquarters:"", operating_locations:"", critical_services:"", technology_stack:"", regulated_data:"", response_team:"", third_parties:"", backup_strategy:"", rto_hours:"", rpo_hours:"", primary_geography:"" };
const toArray = v => Array.isArray(v) ? v : String(v || "").split(",").map(x=>x.trim()).filter(Boolean);
const toText = v => Array.isArray(v) ? v.join(", ") : (v || "");
const scoreLabel = n => n >= 90 ? "Exceptional" : n >= 80 ? "Strong" : n >= 70 ? "Good" : n >= 60 ? "Developing" : n >= 40 ? "At Risk" : "Critical";
const tone = n => n >= 80 ? "text-emerald-300" : n >= 60 ? "text-amber-300" : "text-rose-300";

function Card({children,className=""}) { return <div className={`rounded-2xl border border-slate-700/70 bg-slate-900/80 ${className}`}>{children}</div>; }
function Field({label, children}) { return <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>{children}</label>; }
const inputClass="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400";

export default function TabletopExercises() {
  const [user,setUser]=useState(null), [profile,setProfile]=useState(blankProfile), [profileId,setProfileId]=useState(null);
  const [attempts,setAttempts]=useState([]), [tab,setTab]=useState("dashboard"), [loading,setLoading]=useState(true), [message,setMessage]=useState("");
  const [setup,setSetup]=useState({mode:"combined",attack_category:"Ransomware",attack_scenario:"Data encryption and extortion",disaster_type:"Hurricane / severe storm",geography:"",difficulty:"standard"});
  const [run,setRun]=useState(null), [index,setIndex]=useState(0), [decisions,setDecisions]=useState([]), [feedback,setFeedback]=useState(null), [generating,setGenerating]=useState(false);

  const load=async()=>{
    setLoading(true);
    try {
      const me=await base44.auth.me(); setUser(me);
      const [profiles,history]=await Promise.all([base44.entities.TTXCompanyProfile.filter({owner_email:me.email}),base44.entities.TTXAttempt.filter({owner_email:me.email})]);
      const p=(profiles||[]).sort((a,b)=>new Date(b.updated_at||b.created_date)-new Date(a.updated_at||a.created_date))[0];
      if(p){ setProfileId(p.id); setProfile({...blankProfile,...p,operating_locations:toText(p.operating_locations),critical_services:toText(p.critical_services),technology_stack:toText(p.technology_stack),regulated_data:toText(p.regulated_data),response_team:toText(p.response_team),third_parties:toText(p.third_parties)}); setSetup(s=>({...s,geography:p.primary_geography||""})); }
      setAttempts((history||[]).sort((a,b)=>new Date(b.started_at||b.created_date)-new Date(a.started_at||a.created_date)));
    } catch(e){ setMessage(e.message||"Unable to load TTX workspace."); }
    setLoading(false);
  };
  useEffect(()=>{load();},[]);

  const completed=attempts.filter(a=>a.status==="completed");
  const avg=completed.length?Math.round(completed.reduce((s,a)=>s+(a.overall_score||0),0)/completed.length):0;
  const categoryAverages=useMemo(()=>Object.keys(CATEGORIES).map(k=>{const vals=completed.map(a=>a.category_scores?.[k]).filter(v=>Number.isFinite(v));return [k,vals.length?Math.round(vals.reduce((s,v)=>s+v,0)/vals.length):0]}),[completed]);

  const saveProfile=async()=>{
    if(!profile.company_name||!profile.industry||!profile.primary_geography){setMessage("Company name, industry, and primary geography are required.");return;}
    const payload={...profile,owner_email:user.email,employee_count:Number(profile.employee_count)||0,rto_hours:Number(profile.rto_hours)||0,rpo_hours:Number(profile.rpo_hours)||0,operating_locations:toArray(profile.operating_locations),critical_services:toArray(profile.critical_services),technology_stack:toArray(profile.technology_stack),regulated_data:toArray(profile.regulated_data),response_team:toArray(profile.response_team),third_parties:toArray(profile.third_parties),profile_version:Number(profile.profile_version||0)+1,updated_at:new Date().toISOString()};
    const saved=profileId?await base44.entities.TTXCompanyProfile.update(profileId,payload):await base44.entities.TTXCompanyProfile.create(payload);
    setProfileId(saved.id||profileId); setMessage("Company profile saved. Future exercises will use this context."); setSetup(s=>({...s,geography:payload.primary_geography}));
  };

  const generate=async()=>{
    if(!profileId){setMessage("Save the company profile before starting an exercise.");setTab("profile");return;}
    setGenerating(true); setMessage("");
    try{
      const payload={...setup,profile:{...profile,operating_locations:toArray(profile.operating_locations),critical_services:toArray(profile.critical_services),technology_stack:toArray(profile.technology_stack),regulated_data:toArray(profile.regulated_data),response_team:toArray(profile.response_team),third_parties:toArray(profile.third_parties)}};
      const res=await base44.functions.invoke("generateTTXExercise",payload);
      const data=res.data||res;
      if(data.error) throw new Error(data.error);
      setRun(data); setIndex(0); setDecisions([]); setFeedback(null); setTab("exercise");
    }catch(e){setMessage(e.message||"The exercise could not be generated.");}
    setGenerating(false);
  };

  const choose=(choice)=>{
    if(feedback)return;
    const inject=run.exercise.injects[index];
    const d={inject_id:inject.id,sequence:inject.sequence,phase:inject.phase,choice_id:choice.id,choice_label:choice.label,points:Number(choice.points)||0,rationale:choice.rationale,consequence:choice.consequence,selected_at:new Date().toISOString()};
    setDecisions(x=>[...x,d]);setFeedback(d);
  };
  const finish=async()=>{
    const by={};
    decisions.forEach(d=>{(by[d.phase]??=[]).push(d.points)});
    const category_scores={}; Object.keys(CATEGORIES).forEach(k=>category_scores[k]=by[k]?.length?Math.round(by[k].reduce((a,b)=>a+b,0)/by[k].length):0);
    const covered=Object.keys(CATEGORIES).filter(k=>by[k]?.length);
    const totalWeight=covered.reduce((s,k)=>s+CATEGORIES[k][1],0)||1;
    const overall_score=Math.round(covered.reduce((s,k)=>s+category_scores[k]*CATEGORIES[k][1],0)/totalWeight);
    const ranked=covered.map(k=>[k,category_scores[k]]).sort((a,b)=>b[1]-a[1]);
    const payload={owner_email:user.email,profile_id:profileId,profile_version:Number(profile.profile_version)||1,company_name:profile.company_name,exercise_title:run.exercise.title,mode:setup.mode,attack_category:setup.attack_category,attack_scenario:setup.attack_scenario,disaster_type:setup.disaster_type,geography:setup.geography||profile.primary_geography,difficulty:setup.difficulty,scenario_seed:run.scenario_seed,threat_sources:run.threat_sources||[],scoring_version:run.scoring_version,status:"completed",started_at:decisions[0]?.selected_at||new Date().toISOString(),completed_at:new Date().toISOString(),overall_score,category_scores,decisions,exercise_snapshot:run.exercise,strengths:ranked.slice(0,2).map(([k])=>CATEGORIES[k][0]),gaps:ranked.slice(-2).map(([k])=>CATEGORIES[k][0]),corrective_actions:ranked.slice(-2).map(([k])=>`Review and exercise the company's ${CATEGORIES[k][0].toLowerCase()} process.`)};
    await base44.entities.TTXAttempt.create(payload); setAttempts(x=>[payload,...x]); setRun({...run,result:payload}); setTab("results");
  };
  const next=()=>{if(index>=run.exercise.injects.length-1)finish();else{setIndex(i=>i+1);setFeedback(null);}};

  if(loading)return <div className="min-h-screen bg-slate-950 p-10 text-slate-200">Loading Tabletop Exercises…</div>;
  return <div className="min-h-screen bg-slate-950 text-slate-100">
    <div className="border-b border-slate-800 bg-[radial-gradient(circle_at_top_right,rgba(8,145,178,.18),transparent_35%)] px-5 py-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><div className="flex items-center gap-2 text-cyan-300"><ShieldAlert className="h-5 w-5"/><span className="text-xs font-bold uppercase tracking-[.22em]">Xtreme I.C.E. Tabletop Exercises</span></div><h1 className="mt-2 text-3xl font-bold">Crisis decisions, tested before they matter.</h1><p className="mt-2 max-w-3xl text-slate-400">Threat-informed cyber and disaster-recovery simulations tailored to your company. TTX scores are independent from CFRS.</p></div>
          <button onClick={()=>setTab("setup")} className="rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 hover:bg-cyan-300"><Play className="mr-2 inline h-4 w-4"/>Start an exercise</button>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">{[["dashboard",BarChart3,"Dashboard"],["profile",Building2,"Company profile"],["setup",Settings2,"New exercise"],["history",History,"History"]].map(([id,Icon,label])=><button key={id} onClick={()=>setTab(id)} className={`rounded-lg px-4 py-2 text-sm ${tab===id?"bg-slate-700 text-white":"text-slate-400 hover:bg-slate-900"}`}><Icon className="mr-2 inline h-4 w-4"/>{label}</button>)}</div>
        {message&&<div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{message}</div>}
      </div>
    </div>

    <main className="mx-auto max-w-7xl p-5 lg:p-10">
      {tab==="dashboard"&&<div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[["Completed exercises",completed.length,History],["Average readiness",completed.length?`${avg}/100`:"—",BarChart3],["Latest result",completed.length?`${completed[0].overall_score}/100`:"—",TrendingUp],["Company profile",profileId?"Ready":"Required",Building2]].map(([l,v,I])=><Card key={l} className="p-5"><I className="h-5 w-5 text-cyan-300"/><p className="mt-5 text-sm text-slate-400">{l}</p><p className="mt-1 text-2xl font-bold">{v}</p></Card>)}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6"><h2 className="text-lg font-bold">Readiness by response area</h2><p className="text-sm text-slate-400">Historical average across completed exercises.</p><div className="mt-5 space-y-4">{categoryAverages.map(([k,v])=><div key={k}><div className="mb-1 flex justify-between text-sm"><span>{CATEGORIES[k][0]}</span><span>{completed.length?v:"—"}</span></div><div className="h-2 rounded bg-slate-800"><div className="h-2 rounded bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400" style={{width:`${completed.length?v:0}%`}}/></div></div>)}</div></Card>
          <Card className="p-6"><h2 className="text-lg font-bold">Recent performance</h2><div className="mt-4 space-y-3">{completed.slice(0,5).map(a=><button key={a.id||a.completed_at} onClick={()=>{setRun({result:a,exercise:a.exercise_snapshot});setTab("results")}} className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4 text-left hover:border-cyan-500"><div><p className="font-semibold">{a.exercise_title}</p><p className="text-xs text-slate-500">{new Date(a.completed_at).toLocaleDateString()} · {a.mode}</p></div><span className={`text-xl font-bold ${tone(a.overall_score)}`}>{a.overall_score}</span></button>)}{!completed.length&&<p className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-500">Complete an exercise to begin trend tracking.</p>}</div></Card>
        </div>
      </div>}

      {tab==="profile"&&<Card className="p-6"><div className="mb-6"><h2 className="text-2xl font-bold">Reusable company profile</h2><p className="text-slate-400">This context personalizes every future scenario. Separate list items with commas.</p></div><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {[["company_name","Company name"],["industry","Industry"],["employee_count","Employee count"],["headquarters","Headquarters"],["primary_geography","Primary geography"],["operating_locations","Operating locations"],["critical_services","Critical services"],["technology_stack","Technology stack"],["regulated_data","Regulated data"],["response_team","Response team roles"],["third_parties","Critical third parties"],["backup_strategy","Backup strategy"],["rto_hours","Recovery time objective (hours)"],["rpo_hours","Recovery point objective (hours)"]].map(([k,l])=><Field key={k} label={l}><input className={inputClass} value={profile[k]??""} onChange={e=>setProfile(p=>({...p,[k]:e.target.value}))}/></Field>)}
      </div><button onClick={saveProfile} className="mt-7 rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950"><Save className="mr-2 inline h-4 w-4"/>Save company profile</button></Card>}

      {tab==="setup"&&<div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <Card className="p-6"><h2 className="text-2xl font-bold">Build a new exercise</h2><p className="text-slate-400">You choose the crisis type. The injects, timing, details, and answer order change every run.</p>
          <div className="mt-6 space-y-5">
            <Field label="Exercise mode"><div className="grid grid-cols-3 gap-2">{[["cyber","Cyber"],["disaster","Disaster recovery"],["combined","Combined crisis"]].map(([v,l])=><button key={v} onClick={()=>setSetup(s=>({...s,mode:v}))} className={`rounded-xl border p-3 text-sm font-semibold ${setup.mode===v?"border-cyan-400 bg-cyan-400/10 text-cyan-200":"border-slate-700 text-slate-400"}`}>{l}</button>)}</div></Field>
            {setup.mode!=="disaster"&&<><Field label="Attack category"><select className={inputClass} value={setup.attack_category} onChange={e=>setSetup(s=>({...s,attack_category:e.target.value,attack_scenario:ATTACKS[e.target.value][0]}))}>{Object.keys(ATTACKS).map(x=><option key={x}>{x}</option>)}</select></Field><Field label="Attack scenario"><select className={inputClass} value={setup.attack_scenario} onChange={e=>setSetup(s=>({...s,attack_scenario:e.target.value}))}>{ATTACKS[setup.attack_category].map(x=><option key={x}>{x}</option>)}</select></Field></>}
            {setup.mode!=="cyber"&&<Field label="Disaster recovery event"><select className={inputClass} value={setup.disaster_type} onChange={e=>setSetup(s=>({...s,disaster_type:e.target.value}))}>{DISASTERS.map(x=><option key={x}>{x}</option>)}</select></Field>}
            <Field label="Geographic area"><div className="relative"><MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-500"/><input className={inputClass+" pl-9"} value={setup.geography} onChange={e=>setSetup(s=>({...s,geography:e.target.value}))} placeholder={profile.primary_geography||"City, state, or region"}/></div></Field>
            <Field label="Difficulty"><select className={inputClass} value={setup.difficulty} onChange={e=>setSetup(s=>({...s,difficulty:e.target.value}))}><option value="standard">Standard team exercise</option><option value="advanced">Advanced / time pressured</option><option value="executive">Executive decision exercise</option></select></Field>
          </div><button disabled={generating} onClick={generate} className="mt-7 w-full rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 disabled:opacity-50">{generating?"Generating a unique exercise…":"Generate immersive exercise"}<ArrowRight className="ml-2 inline h-4 w-4"/></button>
        </Card>
        <Card className="p-6"><Radio className="h-7 w-7 text-purple-300"/><h3 className="mt-4 text-xl font-bold">Built from live context, not a fixed quiz</h3><ul className="mt-5 space-y-4 text-sm text-slate-300">{["Uses the saved company profile and recovery targets","Draws defensive context from current threat feeds","Randomizes inject details and decision order","Adds geographic disaster and continuity pressure","Scores incident-response capabilities separately","Saves the scenario seed, scoring version, decisions, and results for audit and trend analysis"].map(x=><li key={x} className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300"/>{x}</li>)}</ul></Card>
      </div>}

      {tab==="exercise"&&run?.exercise&&<div className="mx-auto max-w-4xl">
        <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Live tabletop exercise</p><h2 className="text-2xl font-bold">{run.exercise.title}</h2></div><span className="rounded-full bg-slate-800 px-3 py-1 text-sm">Inject {index+1} of {run.exercise.injects.length}</span></div>
        <div className="mb-6 h-2 rounded bg-slate-800"><div className="h-2 rounded bg-cyan-400 transition-all" style={{width:`${((index+1)/run.exercise.injects.length)*100}%`}}/></div>
        {(()=>{const x=run.exercise.injects[index];return <Card className="overflow-hidden"><div className="border-b border-slate-700 bg-slate-900 p-5"><div className="flex flex-wrap gap-2 text-xs"><span className="rounded bg-purple-500/15 px-2 py-1 text-purple-200">{x.delivery_channel}</span><span className="rounded bg-cyan-500/15 px-2 py-1 text-cyan-200">{x.time_label}</span><span className="rounded bg-slate-800 px-2 py-1">{CATEGORIES[x.phase]?.[0]||x.phase}</span></div><p className="mt-4 text-lg leading-8">{x.situation}</p></div><div className="p-5"><h3 className="text-lg font-bold">{x.question}</h3><div className="mt-4 space-y-3">{x.choices.map(c=><button disabled={!!feedback} key={c.id} onClick={()=>choose(c)} className={`w-full rounded-xl border p-4 text-left transition ${feedback?.choice_id===c.id?"border-cyan-400 bg-cyan-400/10":"border-slate-700 bg-slate-950 hover:border-slate-500"} disabled:cursor-default`}>{c.label}</button>)}</div>{feedback&&<div className="mt-5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-5"><p className="text-xs font-bold uppercase tracking-wider text-cyan-300">What happened next</p><p className="mt-2 text-lg">{feedback.consequence}</p><p className="mt-3 text-sm text-slate-300">{feedback.rationale}</p><button onClick={next} className="mt-5 rounded-xl bg-cyan-400 px-5 py-2.5 font-bold text-slate-950">{index===run.exercise.injects.length-1?"Complete exercise":"Continue"}<ArrowRight className="ml-2 inline h-4 w-4"/></button></div>}</div></Card>})()}
      </div>}

      {tab==="results"&&run?.result&&<div className="space-y-6"><Card className="p-7"><p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Executive readiness result</p><div className="mt-3 flex flex-wrap items-end justify-between gap-5"><div><h2 className="text-3xl font-bold">{run.result.exercise_title}</h2><p className="mt-2 text-slate-400">This score measures the decisions made in this exercise. It does not alter CFRS.</p></div><div className="text-right"><p className={`text-6xl font-black ${tone(run.result.overall_score)}`}>{run.result.overall_score}</p><p className="font-bold">{scoreLabel(run.result.overall_score)}</p></div></div></Card>
        <div className="grid gap-6 lg:grid-cols-2"><Card className="p-6"><h3 className="text-lg font-bold">Incident-response breakdown</h3><div className="mt-5 space-y-4">{Object.entries(run.result.category_scores||{}).map(([k,v])=><div key={k}><div className="flex justify-between text-sm"><span>{CATEGORIES[k]?.[0]||k}</span><b className={tone(v)}>{v}/100</b></div><div className="mt-1 h-2 rounded bg-slate-800"><div className="h-2 rounded bg-cyan-400" style={{width:`${v}%`}}/></div></div>)}</div></Card><Card className="p-6"><h3 className="text-lg font-bold">Executive action summary</h3><p className="mt-4 text-sm uppercase tracking-wider text-emerald-300">Demonstrated strengths</p><ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">{(run.result.strengths||[]).map(x=><li key={x}>{x}</li>)}</ul><p className="mt-5 text-sm uppercase tracking-wider text-rose-300">Priority gaps</p><ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">{(run.result.gaps||[]).map(x=><li key={x}>{x}</li>)}</ul><p className="mt-5 text-sm uppercase tracking-wider text-amber-300">Recommended next actions</p><ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">{(run.result.corrective_actions||[]).map(x=><li key={x}>{x}</li>)}</ul></Card></div>
        <button onClick={()=>{setRun(null);setTab("setup")}} className="rounded-xl border border-slate-700 px-5 py-3"><RotateCcw className="mr-2 inline h-4 w-4"/>Run a different randomized exercise</button>
      </div>}

      {tab==="history"&&<Card className="overflow-hidden"><div className="p-6"><h2 className="text-2xl font-bold">Exercise history and trends</h2><p className="text-slate-400">Every completed attempt is retained with its scenario seed and scoring model.</p></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-900 text-xs uppercase text-slate-500"><tr><th className="p-4">Date</th><th className="p-4">Company</th><th className="p-4">Exercise</th><th className="p-4">Mode</th><th className="p-4">Score</th><th className="p-4">Model</th></tr></thead><tbody>{completed.map(a=><tr key={a.id||a.completed_at} onClick={()=>{setRun({result:a,exercise:a.exercise_snapshot});setTab("results")}} className="cursor-pointer border-t border-slate-800 hover:bg-slate-900"><td className="p-4">{new Date(a.completed_at).toLocaleDateString()}</td><td className="p-4">{a.company_name}</td><td className="p-4 font-semibold">{a.exercise_title}</td><td className="p-4 capitalize">{a.mode}</td><td className={`p-4 font-bold ${tone(a.overall_score)}`}>{a.overall_score}</td><td className="p-4 text-slate-500">{a.scoring_version}</td></tr>)}{!completed.length&&<tr><td colSpan="6" className="p-10 text-center text-slate-500">No completed exercises yet.</td></tr>}</tbody></table></div></Card>}
    </main>
  </div>;
}
