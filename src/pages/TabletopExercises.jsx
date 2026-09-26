import React, { useEffect, useMemo, useState, useRef } from "react";
import IRPlanEditor from "@/components/ttx/IRPlanEditor";
import IRPlanReport, { planResult } from "@/components/ttx/IRPlanReport";
import TTXIntroduction from "@/components/ttx/TTXIntroduction";
import SimulationPanel, { NetworkEditor } from "@/components/ttx/SimulationPanel";
import AttackSelector from "@/components/ttx/AttackSelector";
import { buildNetwork, initialState, advance, roleResults, ROLES, VERTICALS, SIZES, money, followupFor, decisionExplanation, endStateOverview, archivedOverview } from "@/components/ttx/simulation";
import { profileScope, attemptScope, scopeOptions, scopedCompleted } from "@/components/ttx/organizationScope";
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
const DEMO_PROFILES = [
  { company_name:"Harborview Regional Bank", is_demo:true, industry:"Financial Services", employee_count:850, annual_revenue_range:"$100M–$500M", headquarters:"Charleston, South Carolina", operating_locations:["South Carolina","Georgia","North Carolina"], critical_services:["Online banking","Payment processing","Customer account services"], technology_stack:["Microsoft 365","Azure cloud","Core banking platform","Windows endpoints"], regulated_data:["Customer PII","Financial records","Payment-card data"], response_team:["Executive leadership","IT operations","Security operations","Legal and compliance","Communications"], third_parties:["Core banking provider","Cloud provider","Payment processor"], backup_strategy:"Daily immutable backups with secondary regional recovery capability", rto_hours:8, rpo_hours:4, primary_geography:"Coastal South Carolina", confidence_notes:["Fictional demo profile—replace with verified company information before a real exercise."] },
  { company_name:"Piedmont Health Network", is_demo:true, industry:"Healthcare", employee_count:1200, annual_revenue_range:"$100M–$500M", headquarters:"Greenville, South Carolina", operating_locations:["Upstate South Carolina"], critical_services:["Patient care","Electronic health records","Clinical scheduling","Pharmacy operations"], technology_stack:["Microsoft 365","Electronic health record platform","Medical devices","Windows endpoints"], regulated_data:["Protected health information","Patient PII","Payment-card data"], response_team:["Executive leadership","Clinical operations","IT and security","Privacy officer","Legal and communications"], third_parties:["EHR provider","Medical device vendors","Cloud backup provider"], backup_strategy:"Encrypted backups with tested clinical-system restoration procedures", rto_hours:4, rpo_hours:1, primary_geography:"Upstate South Carolina", confidence_notes:["Fictional demo profile—replace with verified company information before a real exercise."] },
  { company_name:"Southeastern Precision Manufacturing", is_demo:true, industry:"Manufacturing", employee_count:425, annual_revenue_range:"$50M–$100M", headquarters:"Spartanburg, South Carolina", operating_locations:["South Carolina","Georgia"], critical_services:["Production operations","Supply-chain coordination","Quality control","Customer delivery"], technology_stack:["Microsoft 365","ERP platform","Industrial control systems","Windows engineering workstations"], regulated_data:["Employee PII","Customer contracts","Controlled technical data"], response_team:["Executive leadership","Plant operations","IT and security","Safety","Legal and communications"], third_parties:["Logistics providers","Equipment vendors","Cloud ERP provider"], backup_strategy:"Separated IT backups with documented production recovery priorities", rto_hours:12, rpo_hours:4, primary_geography:"Upstate South Carolina", confidence_notes:["Fictional demo profile—replace with verified company information before a real exercise."] }
];
const blankProfile = { business_size:"small", company_name:"", industry:"", employee_count:"", headquarters:"", operating_locations:"", critical_services:"", technology_stack:"", regulated_data:"", response_team:"", third_parties:"", backup_strategy:"", rto_hours:"", rpo_hours:"", primary_geography:"" };
const profileRegion = p => p.headquarters?.trim() || p.primary_geography?.trim() || "";
const toArray = v => Array.isArray(v) ? v : String(v || "").split(",").map(x=>x.trim()).filter(Boolean);
const toText = v => Array.isArray(v) ? v.join(", ") : (v || "");
const hydrateProfile = p => ({...blankProfile,...p,operating_locations:toText(p.operating_locations),critical_services:toText(p.critical_services),technology_stack:toText(p.technology_stack),regulated_data:toText(p.regulated_data),response_team:toText(p.response_team),third_parties:toText(p.third_parties)});
const scoreLabel = n => n >= 90 ? "Exceptional" : n >= 80 ? "Strong" : n >= 70 ? "Good" : n >= 60 ? "Developing" : n >= 40 ? "At Risk" : "Critical";
const tone = n => n >= 80 ? "text-emerald-300" : n >= 60 ? "text-amber-300" : "text-rose-300";

function Card({children,className=""}) { return <div className={`rounded-2xl border border-slate-700/70 bg-slate-900/80 ${className}`}>{children}</div>; }
function Field({label, children}) { return <label className="block"><span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</span>{children}</label>; }
const inputClass="w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-slate-100 outline-none focus:border-cyan-400";

export default function TabletopExercises() {
  const [user,setUser]=useState(null), [profiles,setProfiles]=useState([]), [profile,setProfile]=useState(blankProfile), [profileId,setProfileId]=useState(null), [profileChoice,setProfileChoice]=useState(""), [denied,setDenied]=useState(false);
  const [showIntroduction,setShowIntroduction]=useState(true);
  const [selectedScope,setSelectedScope]=useState("");
  const [attempts,setAttempts]=useState([]), [tab,setTab]=useState("dashboard"), [loading,setLoading]=useState(true), [message,setMessage]=useState("");
  const [setup,setSetup]=useState({training_mode:"practice",mode:"cyber",attack_category:"Ransomware",attack_scenario:"Data encryption and extortion",disaster_type:"Hurricane / severe storm",geography:"",difficulty:"standard"});
  const [run,setRun]=useState(null), [index,setIndex]=useState(0), [decisions,setDecisions]=useState([]), [feedback,setFeedback]=useState(null), [generating,setGenerating]=useState(false);
  const questionPane=useRef(null);
  useEffect(()=>{questionPane.current?.scrollTo({top:0,behavior:"smooth"});},[index]);
  const [generationStatus,setGenerationStatus]=useState("");
  const [simulation,setSimulation]=useState(null),[authority,setAuthority]=useState(""),[saving,setSaving]=useState(false);
  const [websiteUrl,setWebsiteUrl]=useState(""), [urlLoading,setUrlLoading]=useState(false);

  const load=async()=>{
    setLoading(true);
    try {
      const me=await base44.auth.me(); setUser(me);
      if(me.role!=="admin"){
        const access=await base44.entities.UserService.filter({user_email:me.email,service_key:"tabletop_exercises"});
        if(!access?.length){setDenied(true);setLoading(false);return;}
      }
      const readAll=async(entity,sort)=>{
        const rows=[];let offset=0;
        for(;;){const page=me.role==="admin"?await entity.list(sort,200,offset):await entity.filter({owner_email:me.email},sort,200,offset);rows.push(...(page||[]));if(!page||page.length<200)break;offset+=page.length;}
        return rows;
      };
      const [loadedProfiles,history]=await Promise.all([readAll(base44.entities.TTXCompanyProfile,"-updated_at"),readAll(base44.entities.TTXAttempt,"-created_date")]);
      const savedProfiles=(loadedProfiles||[]).sort((a,b)=>new Date(b.updated_at||b.created_date)-new Date(a.updated_at||a.created_date));
      setProfiles(savedProfiles);
      setSelectedScope("");setProfileId(null);
      setProfileChoice("");
      setProfile(blankProfile);
      if(!savedProfiles.length){setTab("profile");setMessage("A company profile is required before an exercise can be started.");}
      setAttempts((history||[]).sort((a,b)=>new Date(b.started_at||b.created_date)-new Date(a.started_at||a.created_date)));
    } catch(e){ setMessage(e.message||"Unable to load TTX workspace."); }
    setLoading(false);
  };
  useEffect(()=>{load();},[]);
  useEffect(()=>{if(!loading&&!profileId&&(tab==="setup"||tab==="exercise")){setMessage("Build or select a company profile before starting an exercise.");setTab("profile");}},[loading,profileId,tab]);

  const organizations=useMemo(()=>scopeOptions(profiles,attempts),[profiles,attempts]);
  const selectedOrganization=organizations.find(o=>o.key===selectedScope);
  const completed=useMemo(()=>scopedCompleted(attempts,profiles,selectedScope),[attempts,profiles,selectedScope]);
  const selectOrganization=(key)=>{
    const option=organizations.find(o=>o.key===key);
    setSelectedScope(key);setRun(null);setMessage("");setDecisions([]);setFeedback(null);
    if(option?.profile){const p=option.profile;setProfile(hydrateProfile(p));setProfileId(p.id);setProfileChoice("saved:"+p.id);setSetup(s=>({...s,geography:profileRegion(p)}));}
    else{setProfile(blankProfile);setProfileId(null);setProfileChoice("");}
    if(tab==="results"||tab==="exercise")setTab("dashboard");
  };
  const avg=completed.length?Math.round(completed.reduce((s,a)=>s+(a.overall_score||0),0)/completed.length):0;
  const categoryAverages=useMemo(()=>Object.keys(CATEGORIES).map(k=>{const vals=completed.map(a=>a.category_scores?.[k]).filter(v=>Number.isFinite(v));return [k,vals.length?Math.round(vals.reduce((s,v)=>s+v,0)/vals.length):0]}),[completed]);

  const saveProfile=async()=>{
    if(!profile.company_name||!profile.industry||!profile.primary_geography){setMessage("Company name, industry, and primary geography are required.");return;}
    const payload={...profile,network_model:profile.network_model||buildNetwork(profile),owner_email:profileId?(profile.owner_email||user.email):user.email,employee_count:Number(profile.employee_count)||0,rto_hours:Number(profile.rto_hours)||0,rpo_hours:Number(profile.rpo_hours)||0,operating_locations:toArray(profile.operating_locations),critical_services:toArray(profile.critical_services),technology_stack:toArray(profile.technology_stack),regulated_data:toArray(profile.regulated_data),response_team:toArray(profile.response_team),third_parties:toArray(profile.third_parties),profile_version:Number(profile.profile_version||0)+1,updated_at:new Date().toISOString()};
    try { const saved=profileId?await base44.entities.TTXCompanyProfile.update(profileId,payload):await base44.entities.TTXCompanyProfile.create(payload);
    const savedRecord={...payload,id:saved.id||profileId};
    setSelectedScope(profileScope(savedRecord));setProfile(hydrateProfile(savedRecord)); setProfileId(savedRecord.id); setProfileChoice(`saved:${savedRecord.id}`); setProfiles(list=>[savedRecord,...list.filter(x=>x.id!==savedRecord.id)]); setMessage("Company profile saved and selected. Exercises are now available."); setSetup(s=>({...s,geography:profileRegion(payload)}));
    } catch(e){setMessage(e.message||"Unable to save profile.");}
  };

  const generateFromUrl=async()=>{
    if(!websiteUrl.trim()){setMessage("Enter the company website URL.");return;}
    setUrlLoading(true);setMessage("");
    try{
      const res=await base44.functions.invoke("generateTTXCompanyProfile",{url:websiteUrl.trim()});
      const data=res.data||res;
      if(data.error)throw new Error(data.error);
      setProfileId(null);setProfileChoice("");setProfile(hydrateProfile(data.profile));setMessage("Draft created from public information. Review every field, complete anything marked for confirmation, then save the profile.");
    }catch(e){setMessage(e.message||"Unable to create a profile from that URL.");}
    setUrlLoading(false);
  };

  const applyDemoProfile=(demo,index)=>{
    setProfileId(null);setProfileChoice(`demo:${index}`);setProfile(hydrateProfile(demo));setSetup(s=>({...s,geography:profileRegion(demo)}));setMessage("Demo profile loaded. Review it and save to select it for an exercise.");
  };

  const generate=async()=>{
    if(!profileId){setMessage("Save the company profile before starting an exercise.");setTab("profile");return;}
    if(!profile.network_model||JSON.stringify(profile)!==JSON.stringify(hydrateProfile(profiles.find(p=>p.id===profileId)||{}))){setMessage("Save your company profile and network assumptions before generating the exercise.");setTab("profile");return;}
    setGenerating(true);setGenerationStatus("Generating the scenario, decision branches, and response guidance…"); setMessage("");
    try{
      const payload={...setup,geography:profileRegion(profile),profile_id:profileId,profile:{...profile,operating_locations:toArray(profile.operating_locations),critical_services:toArray(profile.critical_services),technology_stack:toArray(profile.technology_stack),regulated_data:toArray(profile.regulated_data),response_team:toArray(profile.response_team),third_parties:toArray(profile.third_parties)}};
      const res=await base44.functions.invoke("generateTTXExercise",payload);
      const data=res.data||res;
      if(data.error) throw new Error(data.error);
      setGenerationStatus("Scenario validated. Opening your workspace…");setRun({...data,request_snapshot:{...setup,geography:profileRegion(profile)}}); setSimulation(initialState(data.exercise.network_model,data.exercise.entry_node));setAuthority(""); setIndex(0); setDecisions([]); setFeedback(null); setTab("exercise");
    }catch(e){setMessage(e.message||"The exercise could not be generated.");}
    setGenerating(false);
  };

  const choose=(choice)=>{
    if(feedback||!authority)return;
    const inject=run.exercise.injects[index];
    const authorized=authority==="yes";
    const updated=advance(run.exercise.network_model,simulation,{...inject,sequence:decisions.length+1},{...choice,authorized});
    const d={decision_owner:inject.decision_owner,supporting_roles:inject.supporting_roles,execution_owner:inject.execution_owner,authorized,base_points:choice.points,simulation_event:updated.timeline.at(-1),inject_id:inject.id,sequence:decisions.length+1,phase:inject.phase,choice_id:choice.id,choice_label:choice.label,points:Math.max(0,(Number(choice.points)||0)-(authorized?0:20)),rationale:choice.rationale,consequence:choice.consequence,selected_at:new Date().toISOString()};
    d.plan_requirement_ids=inject.plan_requirement_ids||[];
    d.plan_points=d.plan_requirement_ids.length&&Number.isFinite(choice.plan_points)?choice.plan_points:null;
    d.plan_rationale=choice.plan_rationale||"Not assessed";
    const authorityRequired=(run.exercise.ir_plan_snapshot?.requirements||[]).some(r=>d.plan_requirement_ids.includes(r.id)&&/approv|authoriz|authoris|decision authority/i.test(r.requirement));
    if(!authorized&&authorityRequired&&d.plan_points!==null){d.plan_points=Math.max(0,d.plan_points-20);d.plan_rationale+=" The plan calls for approval/authority, but the designated authority was not engaged; the training rubric deducts 20 adherence points.";}
    d.explanation=decisionExplanation(inject,choice,d,run.exercise.network_model);
    const followup=followupFor(inject,d,updated);
    if(followup)setRun(previous=>({...previous,exercise:{...previous.exercise,injects:[...previous.exercise.injects.slice(0,index+1),followup,...previous.exercise.injects.slice(index+1)]}}));
    setSimulation(updated);setDecisions(x=>[...x,d]);setFeedback(d);
  };
  const finish=async()=>{
    if(saving)return;setSaving(true);try{
    const by={};
    decisions.forEach(d=>{(by[d.phase]??=[]).push(d.points)});
    const category_scores={}; Object.keys(CATEGORIES).forEach(k=>category_scores[k]=by[k]?.length?Math.round(by[k].reduce((a,b)=>a+b,0)/by[k].length):null);
    const covered=Object.keys(CATEGORIES).filter(k=>by[k]?.length);
    const totalWeight=covered.reduce((s,k)=>s+CATEGORIES[k][1],0)||1;
    const overall_score=Math.round(covered.reduce((s,k)=>s+category_scores[k]*CATEGORIES[k][1],0)/totalWeight);
    const ranked=covered.map(k=>[k,category_scores[k]]).sort((a,b)=>b[1]-a[1]);
    const category_narratives=Object.fromEntries(covered.map(k=>[k,decisions.filter(d=>d.phase===k).map(d=>`Decision ${d.sequence}: ${d.choice_label} — ${d.points}/100. ${d.rationale}${d.authorized?"":" Decision authority was not engaged (20-point deduction)."}`).join(" ")]));
    const end_state_overview=endStateOverview(run.exercise.network_model,simulation,decisions,run.profile_snapshot?.company_name||profile.company_name);
    const payload={ir_plan_result:planResult(decisions,run.exercise.ir_plan_snapshot),organization_id:run.profile_snapshot?.organization_id||profile.organization_id||undefined,end_state_overview,role_scores:roleResults(decisions),category_narratives,simulation_state:simulation,profile_snapshot:run.profile_snapshot,owner_email:user.email,profile_id:run.profile_snapshot?.id||profileId,profile_version:Number(run.profile_snapshot?.profile_version||profile.profile_version)||1,company_name:run.profile_snapshot?.company_name||profile.company_name,exercise_title:run.exercise.title,mode:setup.mode,attack_category:setup.attack_category,attack_scenario:setup.attack_scenario,disaster_type:setup.disaster_type,geography:setup.geography||profile.primary_geography,difficulty:setup.difficulty,scenario_seed:run.scenario_seed,threat_sources:run.threat_sources||[],scoring_version:run.scoring_version,status:"completed",started_at:decisions[0]?.selected_at||new Date().toISOString(),completed_at:new Date().toISOString(),overall_score,category_scores,decisions,exercise_snapshot:run.exercise,strengths:ranked.filter(([,s])=>s>=75).slice(0,2).map(([k])=>CATEGORIES[k][0]),gaps:ranked.filter(([,s])=>s<75).slice(-2).map(([k])=>CATEGORIES[k][0]),corrective_actions:ranked.filter(([,s])=>s<75).slice(-2).map(([k])=>`Review and exercise the company's ${CATEGORIES[k][0].toLowerCase()} process.`)};
    const savedAttempt=await base44.entities.TTXAttempt.create(payload); const completedAttempt={...payload,id:savedAttempt.id}; setAttempts(x=>[completedAttempt,...x]); setRun({...run,result:completedAttempt}); setTab("results");
    }catch(e){setMessage(e.message||"Unable to save result. Please retry.");}finally{setSaving(false);}
  };
  const openResult=async(attempt)=>{
    if(!selectedScope||attemptScope(attempt,profiles)!==selectedScope){setMessage("Select this assessment’s organization before opening its results.");return;}
    const overview=archivedOverview(attempt);
    const result={...attempt,end_state_overview:overview};
    setRun({result,exercise:attempt.exercise_snapshot});setTab("results");setMessage("");
    window.scrollTo({top:0,behavior:"smooth"});
    if(!attempt.end_state_overview?.trim()&&attempt.id){
      try{
        await base44.entities.TTXAttempt.update(attempt.id,{end_state_overview:overview});
        setAttempts(items=>items.map(a=>a.id===attempt.id?{...a,end_state_overview:overview}:a));
      }catch(e){setMessage("The overview is displayed, but could not be saved. It will be rebuilt from this assessment's recorded results when reopened.");}
    }
  };
  const next=()=>{if(index>=run.exercise.injects.length-1)finish();else{setIndex(i=>i+1);setFeedback(null);setAuthority("");}};

  if(loading)return <div className="min-h-screen bg-slate-950 p-10 text-slate-200">Loading Tabletop Exercises…</div>;
  if(denied)return <div className="min-h-screen bg-slate-950 p-10 text-slate-100"><Card className="mx-auto max-w-xl p-8 text-center"><ShieldAlert className="mx-auto h-10 w-10 text-purple-300"/><h1 className="mt-4 text-2xl font-bold">Tabletop Exercises access required</h1><p className="mt-2 text-slate-400">Ask an administrator to assign the Tabletop Exercises feature to your account.</p></Card></div>;
  if(showIntroduction)return <TTXIntroduction onEnter={()=>{setShowIntroduction(false);setTab("dashboard");setMessage("");window.scrollTo(0,0);}} onProfile={()=>{setShowIntroduction(false);setTab("profile");window.scrollTo(0,0);}}/>;
  return <div className="min-h-screen bg-slate-950 text-slate-100">
    <div className="border-b border-slate-800 bg-[radial-gradient(circle_at_top_right,rgba(8,145,178,.18),transparent_35%)] px-4 py-3 lg:px-6">
      <div className="mx-auto max-w-none">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div><div className="flex items-center gap-2 text-cyan-300"><ShieldAlert className="h-5 w-5"/><span className="text-xs font-bold uppercase tracking-[.22em]">Xtreme I.C.E. Tabletop Exercises</span></div><h1 className={tab==="exercise"?"mt-1 text-xl font-bold":"mt-2 text-3xl font-bold"}>Crisis decisions, tested before they matter.</h1><p className={tab==="exercise"?"hidden":"mt-2 max-w-3xl text-slate-400"}>Threat-informed cyber and disaster-recovery simulations tailored to your company. TTX scores are independent from CFRS.</p></div>
          <button onClick={()=>{if(profileId){setTab("setup");setMessage("");}else{setTab("profile");setMessage("Build or select a company profile before starting an exercise.");}}} className={`rounded-xl px-5 py-3 font-bold ${profileId?"bg-cyan-400 text-slate-950 hover:bg-cyan-300":"border border-amber-400/40 bg-amber-400/10 text-amber-200"}`}><Play className="mr-2 inline h-4 w-4"/>{profileId?"Start an exercise":"Complete profile to start"}</button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">{tab!=="exercise"&&!generating&&<button onClick={()=>{setShowIntroduction(true);window.scrollTo(0,0);}} className="rounded-lg px-4 py-2 text-sm text-slate-400 hover:bg-slate-900">TTX overview</button>}{[["dashboard",BarChart3,"Dashboard"],["profile",Building2,"Company profile"],["setup",Settings2,"New exercise"],["history",History,"History"]].map(([id,Icon,label])=><button key={id} onClick={()=>{if(id==="setup"&&!profileId){setTab("profile");setMessage("Build or select a company profile before starting an exercise.");}else{setTab(id);setMessage("");}}} className={`rounded-lg px-4 py-2 text-sm ${tab===id?"bg-slate-700 text-white":id==="setup"&&!profileId?"cursor-not-allowed text-slate-600":"text-slate-400 hover:bg-slate-900"}`} title={id==="setup"&&!profileId?"Company profile required":undefined}><Icon className="mr-2 inline h-4 w-4"/>{label}{id==="setup"&&!profileId?" · Locked":""}</button>)}</div>
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded-xl border border-slate-700 bg-slate-950 p-3"><label className="min-w-[260px] flex-1 text-sm font-semibold"> {user?.role==="admin"?"Organization / tenant":"Your organization"}<select aria-label="Organization / tenant" className={inputClass+" mt-1"} value={selectedScope} disabled={generating||saving||tab==="exercise"} onChange={e=>selectOrganization(e.target.value)}><option value="">Select an organization</option>{organizations.map(o=><option key={o.key} value={o.key}>{o.label}</option>)}</select></label><p className="flex-1 text-sm text-slate-300">{selectedOrganization?"Showing dashboard and history for "+selectedOrganization.label+".":"Select an organization to view its dashboard and history."}</p></div>
        {message&&<div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">{message}</div>}
      </div>
    </div>

    <main className="mx-auto w-full max-w-none p-3 lg:p-5">
      {tab==="dashboard"&&<div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[["Completed exercises",completed.length,History],["Average readiness",completed.length?`${avg}/100`:"—",BarChart3],["Latest result",completed.length?`${completed[0].overall_score}/100`:"—",TrendingUp],["Company profile",profileId?"Ready":"Required",Building2]].map(([l,v,I])=><Card key={l} className="p-5"><I className="h-5 w-5 text-cyan-300"/><p className="mt-5 text-sm text-slate-400">{l}</p><p className="mt-1 text-2xl font-bold">{v}</p></Card>)}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="p-6"><h2 className="text-lg font-bold">Readiness by response area</h2><p className="text-sm text-slate-400">Historical average for the selected organization.</p><div className="mt-5 space-y-4">{categoryAverages.map(([k,v])=><div key={k}><div className="mb-1 flex justify-between text-sm"><span>{CATEGORIES[k][0]}</span><span>{completed.length?v:"—"}</span></div><div className="h-2 rounded bg-slate-800"><div className="h-2 rounded bg-gradient-to-r from-rose-500 via-amber-400 to-emerald-400" style={{width:`${completed.length?v:0}%`}}/></div></div>)}</div></Card>
          <Card className="p-6"><h2 className="text-lg font-bold">Recent performance</h2><div className="mt-4 space-y-3">{completed.slice(0,5).map(a=><button key={a.id||a.completed_at} onClick={()=>openResult(a)} className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-slate-950 p-4 text-left hover:border-cyan-500"><div><p className="font-semibold">{a.exercise_title}</p><p className="text-xs text-slate-500">{new Date(a.completed_at).toLocaleDateString()} · {a.attack_category || "Cyber incident"}</p></div><span className={`text-xl font-bold ${tone(a.overall_score)}`}>{a.overall_score}</span></button>)}{!completed.length&&<p className="rounded-xl border border-dashed border-slate-700 p-8 text-center text-slate-500">Select an organization with completed exercises to view its trends.</p>}</div></Card>
        </div>
      </div>}

      {tab==="profile"&&<Card className="p-6"><div className="mb-6"><h2 className="text-2xl font-bold">Required company profile</h2><p className="text-slate-400">Build a profile, create a draft from the company website, or select an existing profile before starting an exercise.</p></div><div className="mb-6 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4"><p className="font-bold text-cyan-200">Create draft from company URL</p><p className="mt-1 text-xs text-slate-400">Public information creates a draft only. Security, recovery, technology, and staffing details must be verified by the user.</p><div className="mt-3 flex gap-2"><input className={inputClass} value={websiteUrl} onChange={e=>setWebsiteUrl(e.target.value)} placeholder="https://company.com"/><button disabled={urlLoading} onClick={generateFromUrl} className="shrink-0 rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-bold text-slate-950 disabled:opacity-50">{urlLoading?"Researching…":"Create draft"}</button></div></div><div className="mb-6 grid gap-3 rounded-xl border border-slate-700 bg-slate-950 p-4 md:grid-cols-[1fr_auto]"><Field label={user?.role==="admin"?"Select any company profile":"Select a company profile"}><select className={inputClass} value={profileChoice} onChange={e=>{const value=e.target.value;setProfileChoice(value);if(value.startsWith("saved:")){const p=profiles.find(x=>x.id===value.slice(6));if(p){setSelectedScope(profileScope(p));setRun(null);setProfileId(p.id);setProfile(hydrateProfile(p));setSetup(s=>({...s,geography:profileRegion(p)}));setMessage(`${p.company_name} selected. You may now start an exercise.`);}}else if(value.startsWith("demo:")){const i=Number(value.slice(5));if(DEMO_PROFILES[i])applyDemoProfile(DEMO_PROFILES[i],i);}}}><option value="">Select a profile</option>{profiles.map(p=><option key={p.id} value={`saved:${p.id}`}>{p.company_name}{p.is_demo&&!p.company_name.toLowerCase().endsWith("(demo)")?" (demo)":""}</option>)}{DEMO_PROFILES.map((d,i)=><option key={`demo-${i}`} value={`demo:${i}`}>{d.company_name} (demo)</option>)}</select><span className="mt-1.5 block text-xs text-slate-500">{user?.role==="admin"?"Administrators can select profiles created by any user.":"Only your saved profiles and the demo profiles are shown."}</span></Field><button onClick={()=>{setProfileId(null);setProfileChoice("");setProfile(blankProfile);setMessage("Enter the new company profile and save it to unlock exercises.");}} className="self-end rounded-xl border border-slate-600 px-4 py-2.5 text-sm font-semibold hover:bg-slate-800">Build new profile</button></div><div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {[["company_name","Company name"],["employee_count","Employee count"],["headquarters","Headquarters"],["primary_geography","Primary geography"],["operating_locations","Operating locations"],["critical_services","Critical services"],["technology_stack","Technology stack"],["regulated_data","Regulated data"],["response_team","Response team roles"],["third_parties","Critical third parties"],["backup_strategy","Backup strategy"],["rto_hours","Recovery time objective (hours)"],["rpo_hours","Recovery point objective (hours)"]].map(([k,l])=><Field key={k} label={l}><input className={inputClass} value={profile[k]??""} onChange={e=>setProfile(p=>({...p,[k]:e.target.value}))}/></Field>)}
      <Field label="Industry vertical"><select className={inputClass} value={profile.industry} onChange={e=>setProfile(p=>({...p,industry:e.target.value,network_model:null}))}><option value="">Choose vertical</option>{[...new Set([...VERTICALS,profile.industry].filter(Boolean))].map(v=><option key={v}>{v}</option>)}</select></Field><Field label="Business size"><select className={inputClass} value={profile.business_size} onChange={e=>setProfile(p=>({...p,business_size:e.target.value,network_model:null}))}>{SIZES.map(s=><option key={s}>{s}</option>)}</select></Field>
      </div><button className="mt-5 rounded-xl border border-cyan-500 px-4 py-2 text-cyan-200" onClick={()=>setProfile(p=>({...p,network_model:buildNetwork(p)}))}>Generate / reset simulated topology</button><p className="mt-2 text-sm text-slate-400">Reset rebuilds the model from the selected industry, size, and employee count. Review assumptions and save before starting.</p><NetworkEditor network={profile.network_model||buildNetwork(profile)} onChange={network_model=>setProfile(p=>({...p,network_model}))}/>{profile.source_url&&<div className="mt-5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-4"><p className="text-sm font-bold text-amber-200">Website-generated draft</p><p className="mt-1 break-all text-xs text-slate-400">Source: {profile.source_url}</p>{profile.confidence_notes?.length>0&&<ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-300">{profile.confidence_notes.map((n,i)=><li key={i}>{n}</li>)}</ul>}</div>}<IRPlanEditor key={profileId||"draft"} profileId={profileId} plan={profile.ir_plan} onChange={ir_plan=>setProfile(p=>p.id===profileId?{...p,ir_plan}:p)}/><button onClick={saveProfile} className="mt-7 rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950"><Save className="mr-2 inline h-4 w-4"/>Save and select company profile</button></Card>}

      {tab==="setup"&&<><div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr]">
        <Card className="p-6"><h2 className="text-2xl font-bold">Build a new exercise</h2><p className="text-slate-400">Choose the cyberattack and the disaster-recovery factor that will complicate response and restoration. The injects, timing, details, and answer order change every run.</p>
          <div className="mt-6 space-y-5">
            <div className="rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-4"><p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Cyber tabletop exercise</p><p className="mt-1 text-sm text-slate-300">Disaster recovery is included as a factor within the cyber incident—not as a separate exercise.</p></div>
            <Field label="Exercise mode"><select className={inputClass} value={setup.training_mode} onChange={e=>setSetup(s=>({...s,training_mode:e.target.value}))}><option value="practice">Practice — show applicable plan requirements</option><option value="assessment">Assessment — show plan guidance in after-action review</option></select></Field><div className="rounded-xl border border-purple-500/30 p-4 text-sm text-slate-300">{profile.ir_plan?.approved?"Using approved IR plan: "+profile.ir_plan.title+" · "+profile.ir_plan.document_version:profile.ir_plan?"IR plan needs review and confirmation before generation.":"No IR plan attached. This exercise will use the company profile and response guidance."}</div>
            <AttackSelector categories={Object.keys(ATTACKS)} scenarios={ATTACKS[setup.attack_category]} selectedCategory={setup.attack_category} selectedScenario={setup.attack_scenario} onCategoryChange={cat=>setSetup(s=>({...s,attack_category:cat,attack_scenario:ATTACKS[cat][0]}))} onScenarioChange={scen=>setSetup(s=>({...s,attack_scenario:scen}))}/>
            <Field label="Disaster-recovery factor"><select className={inputClass} value={setup.disaster_type} onChange={e=>setSetup(s=>({...s,disaster_type:e.target.value}))}>{DISASTERS.map(x=><option key={x}>{x}</option>)}</select><span className="mt-1.5 block text-xs text-slate-500">This condition will affect staffing, communications, facilities, backups, vendors, or restoration during the cyber incident.</span></Field>
            <Field label="Region from company profile"><div className="relative"><MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-500"/><input readOnly className={inputClass+" pl-9"} value={profileRegion(profile)} /></div><span className="mt-1 block text-xs text-slate-400">Automatically uses headquarters/address, falling back to primary geography. Update the company profile to change it.</span></Field>
            <Field label="Difficulty"><select className={inputClass} value={setup.difficulty} onChange={e=>setSetup(s=>({...s,difficulty:e.target.value}))}><option value="standard">Standard team exercise</option><option value="advanced">Advanced / time pressured</option><option value="executive">Executive decision exercise</option></select></Field>
          </div>{generating&&<div role="status" aria-live="polite" className="mt-5 rounded-xl border border-cyan-600 p-4"><p className="text-sm text-cyan-100">{generationStatus}</p><progress aria-label="Exercise generation in progress" className="mt-3 h-3 w-full accent-cyan-400"/><p className="mt-2 text-xs text-slate-300">Generating a branched exercise can take a few minutes. This bar indicates activity; the AI service does not report a completion percentage.</p></div>}<button disabled={generating} onClick={generate} className="mt-7 w-full rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 disabled:opacity-50">{generating?"Generating a unique exercise…":"Generate immersive exercise"}<ArrowRight className="ml-2 inline h-4 w-4"/></button>
        </Card>
        <Card className="p-6"><SimulationPanel compact network={profile.network_model}/><Radio className="h-7 w-7 text-purple-300"/><h3 className="mt-4 text-xl font-bold">Threat context and response guidance</h3><ul className="mt-5 space-y-4 text-sm text-slate-300">{["Uses the saved company profile and recovery targets","Draws defensive context from current threat feeds","Randomizes inject details and decision order","Adds geographic disaster and continuity pressure","Scores incident-response capabilities separately","Saves the scenario seed, scoring version, decisions, and results for audit and trend analysis"].map(x=><li key={x} className="flex gap-3"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-300"/>{x}</li>)}</ul><p className="mt-4 text-sm text-slate-300">Decision guidance uses NIST SP 800-61 Rev. 3 and CISA incident response playbook principles. TTX point values are our training rubric, not official NIST/CISA scores. References are saved with each new exercise.</p></Card>
      </div></>}

      {tab==="exercise"&&run?.exercise&&<div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(380px,.85fr)_minmax(0,1.15fr)]"><aside className="min-w-0 xl:sticky xl:top-4 xl:max-h-[calc(100vh-190px)] xl:overflow-y-auto"><SimulationPanel compact network={run.exercise.network_model} state={simulation}/></aside><div ref={questionPane} className="min-w-0 xl:max-h-[calc(100vh-190px)] xl:overflow-y-auto xl:pr-2">
        <div className="mb-5 flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Live tabletop exercise</p><h2 className="text-2xl font-bold">{run.exercise.title}</h2></div><span className="rounded-full bg-slate-800 px-3 py-1 text-sm">Decision {index+1} / {run.exercise.injects.length}{run.exercise.injects[index]?.is_followup?" · Follow-up":""}</span></div>
        <div className="mb-6 h-2 rounded bg-slate-800"><div className="h-2 rounded bg-cyan-400 transition-all" style={{width:`${((index+1)/run.exercise.injects.length)*100}%`}}/></div>
        {(()=>{const x=run.exercise.injects[index];return <Card className="overflow-hidden"><div className="border-b border-slate-700 bg-slate-900 p-5"><div className="flex flex-wrap gap-2 text-xs"><span className="rounded bg-purple-500/15 px-2 py-1 text-purple-200">{x.delivery_channel}</span><span className="rounded bg-cyan-500/15 px-2 py-1 text-cyan-200">{x.time_label}</span><span className="rounded bg-slate-800 px-2 py-1">{CATEGORIES[x.phase]?.[0]||x.phase}</span></div><p className="mt-4 text-lg leading-8">{x.situation}</p></div><div className="p-5"><div className="mb-4 rounded-xl border border-purple-500/40 p-4 text-sm"><p><b>Decision owner:</b> {x.decision_owner} · {run.exercise.network_model?.role_assignments?.[x.decision_owner]}</p><p><b>Supporting roles:</b> {x.supporting_roles?.join(", ")||"None"}</p><p><b>Execution owner:</b> {x.execution_owner}</p><label className="mt-3 block">Was the designated decision owner or authorized delegate engaged?<select disabled={!!feedback} className={inputClass+" mt-2"} value={authority} onChange={e=>setAuthority(e.target.value)}><option value="">Select before answering</option><option value="yes">Yes — decision authority engaged</option><option value="no">No — proceed without decision authority</option></select></label><p className="mt-2 text-xs text-slate-300">Training rule: proceeding without the responsible authority deducts 20 points (minimum zero) and adds 30 minutes of simulated coordination delay and any associated outage cost.</p>{authority&&<p aria-live="polite" className={authority==="yes"?"mt-2 text-emerald-200":"mt-2 text-amber-200"}>{authority==="yes"?"Authority confirmed: no responsibility penalty or coordination delay.":"On submission: −20 points and +30 minutes; the cost impact will appear with the outcome."}</p>}</div>{run.exercise.training_mode!=="assessment"&&x.plan_requirement_ids?.length>0&&<div className="mb-4 rounded-xl border border-purple-500/40 p-4"><p className="font-bold text-purple-200">Your IR plan guidance</p>{x.plan_requirement_ids.map(id=>{const requirement=run.exercise.ir_plan_snapshot?.requirements.find(r=>r.id===id);return requirement?<p className="mt-2 text-sm leading-6 text-slate-200" key={id}>{requirement.reference} · {requirement.requirement} (Owner: {requirement.owner})</p>:null})}</div>}<h3 className="text-lg font-bold">{x.question}</h3><div className="mt-4 space-y-3">{x.choices.map(c=><button disabled={!!feedback||!authority} key={c.id} onClick={()=>choose(c)} className={`w-full rounded-xl border p-4 text-left transition ${feedback?.choice_id===c.id?"border-cyan-400 bg-cyan-400/10":"border-slate-700 bg-slate-950 hover:border-slate-500"} disabled:cursor-default`}>{c.label}</button>)}</div>{feedback&&<div className="mt-5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-5"><p className="text-xs font-bold uppercase tracking-wider text-cyan-300">What happened next</p><p className="mt-2 text-base leading-7 text-slate-100">{feedback.explanation}</p>{run.exercise.training_mode!=="assessment"&&feedback.plan_points!==null&&<p className="mt-3 text-sm text-purple-200">Plan adherence: {feedback.plan_points}/100. {feedback.plan_rationale}</p>}<p className="mt-3 text-sm text-cyan-200">Reference: {x.guidance_basis||"Versioned TTX response rubric"} · Score {feedback.points}/100</p><button disabled={saving} onClick={next} className="mt-5 rounded-xl bg-cyan-400 px-5 py-2.5 font-bold text-slate-950">{saving?"Saving…":index===run.exercise.injects.length-1?"Complete exercise":"Continue"}<ArrowRight className="ml-2 inline h-4 w-4"/></button></div>}</div></Card>})()}
      </div></div>}

      {tab==="results"&&run?.result&&<div className="space-y-6"><IRPlanReport exercise={run.exercise} result={run.result}/>{run.exercise?.response_guidance&&<details className="rounded-xl border border-slate-700 p-4 text-sm"><summary className="cursor-pointer font-semibold">Response guidance used for this attempt</summary><p className="mt-2 text-slate-300">{run.exercise.response_guidance.note}</p>{run.exercise.response_guidance.references.map(ref=><a className="mt-2 block text-cyan-300 underline" key={ref.id} href={ref.url} target="_blank" rel="noopener noreferrer">{ref.title}</a>)}</details>}{<Card className="p-6"><h2 className="text-xl font-bold">What happened — end-state overview</h2><p className="mt-3 whitespace-pre-wrap text-base leading-7 text-slate-200">{archivedOverview(run.result)}</p></Card>}<details className="rounded-xl border border-slate-700 p-4"><summary className="cursor-pointer font-semibold">Final network and cost details</summary><SimulationPanel network={run.exercise?.network_model} state={run.result.simulation_state}/></details><Card className="p-7"><p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Executive readiness result</p><div className="mt-3 flex flex-wrap items-end justify-between gap-5"><div><h2 className="text-3xl font-bold">{run.result.exercise_title}</h2><p className="mt-2 text-slate-400">This score measures the decisions made in this exercise. It does not alter CFRS.</p></div><div className="text-right"><p className={`text-6xl font-black ${tone(run.result.overall_score)}`}>{run.result.overall_score}</p><p className="font-bold">{scoreLabel(run.result.overall_score)}</p></div></div></Card>
        <div className="grid gap-6 lg:grid-cols-2"><Card className="p-6"><h3 className="text-lg font-bold">Incident-response breakdown</h3><div className="mt-5 space-y-4">{Object.entries(run.result.category_scores||{}).map(([k,v])=><div key={k}><div className="flex justify-between text-sm"><span>{CATEGORIES[k]?.[0]||k}</span><b className={tone(v)}>{v==null?"Not assessed":`${v}/100`}</b></div><div className="mt-1 h-2 rounded bg-slate-800"><div className="h-2 rounded bg-cyan-400" style={{width:`${v||0}%`}}/></div><p className="mt-2 text-sm leading-6 text-slate-300">{run.result.category_narratives?.[k]}</p></div>)}</div></Card><Card className="p-6"><h3 className="text-lg font-bold">Executive action summary</h3><p className="mt-4 text-sm uppercase tracking-wider text-emerald-300">Demonstrated strengths</p><ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">{(run.result.strengths||[]).map(x=><li key={x}>{x}</li>)}</ul><p className="mt-5 text-sm uppercase tracking-wider text-rose-300">Priority gaps</p><ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">{(run.result.gaps||[]).map(x=><li key={x}>{x}</li>)}</ul><p className="mt-5 text-sm uppercase tracking-wider text-amber-300">Recommended next actions</p><ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">{(run.result.corrective_actions||[]).map(x=><li key={x}>{x}</li>)}</ul></Card></div>
        {run.result.role_scores&&<Card className="p-6"><h3 className="text-xl font-bold">Readiness by role and responsibility</h3><p className="mt-2 text-sm text-slate-400">Scores cover decisions owned by each role. Supporting and execution responsibilities appear in the decision record.</p><div className="mt-4 grid gap-4 md:grid-cols-2">{Object.entries(run.result.role_scores).map(([r,v])=><div key={r} className="rounded-xl border border-slate-700 p-4"><b>{r} · {v.score==null?"Not assessed":v.score+"/100"}</b><p className="mt-2 text-sm leading-6 text-slate-300">{v.narrative}</p></div>)}</div></Card>}
        <button onClick={()=>{setRun(null);setTab("setup")}} className="rounded-xl border border-slate-700 px-5 py-3"><RotateCcw className="mr-2 inline h-4 w-4"/>Run a different randomized exercise</button>
      </div>}

      {tab==="history"&&<Card className="overflow-hidden"><div className="p-6"><h2 className="text-2xl font-bold">Exercise history and trends</h2><p className="text-slate-400">Every completed attempt is retained with its scenario seed and scoring model.</p></div><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="bg-slate-900 text-xs uppercase text-slate-500"><tr><th className="p-4">Date</th><th className="p-4">Company</th><th className="p-4">Exercise</th><th className="p-4">DR factor</th><th className="p-4">Score</th><th className="p-4">Model</th></tr></thead><tbody>{completed.map(a=><tr key={a.id||a.completed_at} onClick={()=>openResult(a)} className="cursor-pointer border-t border-slate-800 hover:bg-slate-900"><td className="p-4">{new Date(a.completed_at).toLocaleDateString()}</td><td className="p-4">{a.company_name}</td><td className="p-4 font-semibold">{a.exercise_title}</td><td className="p-4">{a.disaster_type || "Continuity pressure"}</td><td className={`p-4 font-bold ${tone(a.overall_score)}`}>{a.overall_score}</td><td className="p-4 text-slate-500">{a.scoring_version}</td></tr>)}{!completed.length&&<tr><td colSpan="6" className="p-10 text-center text-slate-500">No completed exercises for the selected organization.</td></tr>}</tbody></table></div></Card>}
    </main>
  </div>;
}