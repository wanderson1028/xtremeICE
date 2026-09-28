
import {initialState,advance,roleResults,endStateOverview} from "./simulation.js";
export const CATEGORIES={preparation_governance:["Preparation & Governance",10],detection_analysis:["Detection & Analysis",15],escalation_command:["Escalation & Command",10],containment:["Containment",15],eradication_remediation:["Eradication & Remediation",10],recovery_restoration:["Recovery & Restoration",15],communications:["Communications",10],legal_evidence:["Legal, Compliance & Evidence",10],lessons_improvement:["Lessons & Improvement",5]};
export const ROLES=["CEO","CISO","CIO","CFO","COO","Legal","Communications"];
export const ACTIONS=["investigate","isolate","remediate","restore_verified","restore_unverified","coordinate","defer"];
export const average=xs=>xs.length?Math.round(xs.reduce((a,b)=>a+b,0)/xs.length):null;
export const ordered=events=>[...events].sort((a,b)=>String(a.created_date).localeCompare(String(b.created_date))||a.id.localeCompare(b.id));
export function replay(session,events){
 const es=ordered(events), network=session.snapshot.profile.network_model;
 let state=initialState(network,session.settings.entry_node||network.nodes[0].id),parent="root",current=null;
 const decisions=[],questions=[];
 // An append-only chain chooses one canonical question and answer per parent.
 // Retried/concurrent submissions cannot count twice or overwrite a decision.
 for(let i=0;i<19;i++){
  const q=es.find(e=>e.kind==="question"&&e.payload.parent===parent);
  if(!q)break;
  questions.push(q);current=q;
  const a=es.find(e=>e.kind==="answer"&&e.payload.question_id===q.id);
  if(!a)break;
  const c=q.payload.question.choices.find(c=>c.id===a.payload.choice_id);if(!c)break;
  const x=q.payload.question;
  const updated=advance(network,state,{...x,sequence:decisions.length+1,disruption_target:decisions.length===2?session.settings.disaster_target:null},{...c,authorized:a.payload.authorized});
  const score=Math.max(0,c.points-(a.payload.authorized?0:20));
  const handoff=a.payload.handoff||{};
  const acknowledged=es.some(e=>e.kind==="ack"&&e.payload.question_id===q.id);
  const deadline=Number(session.settings.response_minutes)||30;
  const elapsed=Math.max(0,(Date.parse(a.created_date)-Date.parse(q.created_date))/60000);
  const pausedMinutes=es.filter(e=>e.kind==="pause"&&e.created_date>=q.created_date&&e.created_date<=a.created_date).reduce((sum,p)=>{
   const resume=es.find(e=>e.kind==="resume"&&e.created_date>p.created_date);
   return sum+Math.max(0,(Math.min(Date.parse(resume?.created_date||a.created_date),Date.parse(a.created_date))-Date.parse(p.created_date))/60000);
  },0);
  const activeMinutes=Math.max(0,elapsed-pausedMinutes);
  decisions.push({inject_id:q.id,sequence:decisions.length+1,phase:x.phase,department_id:a.payload.department_id||x.department_id,decision_owner:x.decision_owner,choice_id:c.id,choice_label:c.label,points:score,base_points:c.points,rationale:c.rationale,consequence:c.consequence,authorized:a.payload.authorized,actor:a.payload.submitted_by||a.actor,approved_by:a.payload.approved_by||null,selected_at:a.created_date,handoff,simulation_event:updated.timeline.at(-1),plan_requirement_ids:x.plan_requirement_ids||[],plan_points:x.plan_requirement_ids?.length?Math.max(0,c.plan_points-(!a.payload.authorized&&x.requires_approval?20:0)):null,plan_rationale:c.plan_rationale||"Not assessed",handoff_score:Math.round(["action","impact","unresolved"].filter(k=>String(handoff[k]||"").trim().length>=10).length/3*100),coordination_score:acknowledged?100:50,timeliness_score:activeMinutes<=deadline?100:activeMinutes<=deadline*2?60:30,response_minutes:Math.round(activeMinutes)});
  state=updated;parent=a.id;current=null;
 }
 const lastControl=es.filter(e=>["pause","resume"].includes(e.kind)).at(-1);
 const requests=es.filter(e=>e.kind==="request").map(e=>({...e,reply:es.find(r=>["reply","waive"].includes(r.kind)&&r.payload.request_id===e.id)}));
 const complete=es.find(e=>e.kind==="complete"&&e.payload.parent===parent);
 return {events:es,decisions,questions,state,parent,current,paused:lastControl?.kind==="pause",requests,complete,released:!!es.find(e=>e.kind==="release"&&complete&&e.payload.complete_id===complete.id)};
}
export function nextPhase(decisions){
 const keys=Object.keys(CATEGORIES),counts=Object.fromEntries(keys.map(k=>[k,decisions.filter(d=>d.phase===k).length]));
 const last=decisions.at(-1);
 if(last&&last.points<75&&counts[last.phase]<2)return last.phase;
 return keys.find(k=>!counts[k])||null;
}
export function report(session,r){
 const ds=r.decisions, category_scores=Object.fromEntries(Object.keys(CATEGORIES).map(k=>[k,average(ds.filter(d=>d.phase===k).map(d=>d.points))]));
 const covered=Object.keys(CATEGORIES).filter(k=>category_scores[k]!==null);
 const overall_score=covered.length?Math.round(covered.reduce((s,k)=>s+category_scores[k]*CATEGORIES[k][1],0)/covered.reduce((s,k)=>s+CATEGORIES[k][1],0)):null;
 const describe=rows=>rows.map(d=>"Decision "+d.sequence+": "+d.choice_label+" — "+d.points+"/100. "+d.rationale+" "+(!d.authorized?"Designated approval was missing; 20 points were deducted. ":"")+"Handoff: "+d.handoff.action+" Business impact: "+d.handoff.impact+" Unresolved: "+d.handoff.unresolved).join("\n\n");
 const department_scores=Object.fromEntries(session.snapshot.departments.map(dep=>{
  const rows=ds.filter(d=>d.department_id===dep.id);
  const assessed=Object.keys(CATEGORIES).filter(k=>rows.some(d=>d.phase===k));
  const departmentScore=assessed.length?Math.round(assessed.reduce((sum,k)=>sum+average(rows.filter(d=>d.phase===k).map(d=>d.points))*CATEGORIES[k][1],0)/assessed.reduce((sum,k)=>sum+CATEGORIES[k][1],0)):null;
  return [dep.id,{name:dep.name,score:departmentScore,count:rows.length,handoff:average(rows.map(d=>d.handoff_score)),coordination:average(rows.map(d=>d.coordination_score)),timeliness:average(rows.map(d=>d.timeliness_score)),narrative:rows.length?describe(rows):"Not assessed: no decisions assigned."}];
 }));
 const plan=session.snapshot.profile.ir_plan;
 const pd=ds.filter(d=>d.plan_requirement_ids.length&&Number.isFinite(d.plan_points));
 return {overall_score,category_scores,category_narratives:Object.fromEntries(covered.map(k=>[k,describe(ds.filter(d=>d.phase===k))])),department_scores,role_scores:roleResults(ds),decisions:ds,end_state_overview:endStateOverview(session.snapshot.profile.network_model,r.state,ds,session.snapshot.profile.company_name),ir_plan_result:plan?{version_id:plan.version_id,score:average(pd.map(d=>d.plan_points)),assessed_decisions:pd.length,requirements_tested:new Set(pd.flatMap(d=>d.plan_requirement_ids)).size,requirements_total:plan.requirements.length}:null,scoring_version:session.scoring_version};
}
export function validateQuestion(q,phase,snapshot){
 const deps=snapshot.departments,nodes=snapshot.profile.network_model.nodes;
 if(!q||q.phase!==phase||!deps.some(d=>d.id===q.department_id)||!nodes.some(n=>n.id===q.target_id)||!ROLES.includes(q.decision_owner)||!q.situation||!q.question||!q.guidance_basis)throw Error("Generated decision has invalid routing or context. Retry this stage.");
 const dep=deps.find(d=>d.id===q.department_id);
 if(!dep.roles.includes(q.decision_owner))throw Error("Generated role does not match department responsibilities. Retry this stage.");
 if(!Array.isArray(q.choices)||q.choices.length!==3||!q.choices.every(c=>c.label&&c.rationale&&c.consequence&&ACTIONS.includes(c.action)&&Number.isFinite(c.points)&&c.points>=0&&c.points<=100))throw Error("Generated choices were incomplete. Retry this stage.");
 if(!q.choices.some(c=>c.points>=75)||!q.choices.some(c=>c.points>=35&&c.points<=70)||!q.choices.some(c=>c.points<=30))throw Error("Generated choices did not satisfy the scoring rubric. Retry.");
 const ids=new Set((snapshot.profile.ir_plan?.requirements||[]).map(x=>x.id));
 if(!Array.isArray(q.plan_requirement_ids)||!q.plan_requirement_ids.every(id=>ids.has(id)))throw Error("Generated plan references were invalid. Retry.");
 if(q.plan_requirement_ids.length&&!q.choices.every(c=>Number.isFinite(c.plan_points)&&c.plan_points>=0&&c.plan_points<=100&&c.plan_rationale))throw Error("Plan adherence scoring incomplete. Retry.");
 q.requires_approval=!!dep.approval_required;
 q.duration_hours=Math.min(8,Math.max(.25,Number(q.duration_hours)||1));
 q.choices=q.choices.map(c=>({...c,id:crypto.randomUUID()})).sort(()=>Math.random()-.5);
 return q;
}
