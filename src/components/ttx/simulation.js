export const ROLES = ["CEO","CISO","CIO","CFO","COO","Legal","Communications"];
export const VERTICALS = ["Healthcare","Manufacturing","Financial Services","Professional Services","Retail","Government","Education","Technology"];
export const SIZES = ["small","medium","large","enterprise"];
export const money = n => new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:0}).format(n||0);
const num=(v,d=0)=>Number.isFinite(Number(v))&&Number(v)>=0?Number(v):d;
export function buildNetwork(p={}) {
 const size=SIZES.includes(p.business_size)?p.business_size:"small";
 const scale={small:1,medium:3,large:8,enterprise:20}[size];
 const staff=Math.max(1,num(p.employee_count)||{small:40,medium:200,large:800,enterprise:3000}[size]);
 const industry=p.industry||"Professional Services";
 const vertical=/health/i.test(industry)?["Electronic health records","Medical devices","Patient records"]:/manufact/i.test(industry)?["Production ERP","Plant controllers","Engineering designs"]:/financ|bank/i.test(industry)?["Payment processing","Branch terminals","Customer accounts"]:/retail/i.test(industry)?["Order management","Point of sale","Customer orders"]:/educat/i.test(industry)?["Learning platform","Classroom devices","Student records"]:/government/i.test(industry)?["Mission services","Field devices","Mission records"]:["Client services","Business devices","Client records"];
 const spec=[
 ["edge","Internet gateway","firewall",scale,2500,100,[],0],
 ["core","Core network","switch",scale*2,1000,30,["edge"],0],
 ["identity","Identity services","server",scale,3500,150,["core"],0],
 ["endpoints","Employee workstations","workstation",staff,1200,35,["core","identity"],0.15],
 ["cloud","Email and collaboration","cloud",staff,0,25,["edge","identity"],0.15],
 ["business",vertical[0],"server",scale*2,5000,300,["core","identity","data"],0.45],
 ["data",vertical[2],"database",scale,6000,250,["core","identity"],0],
 ["special",vertical[1],"workstation",scale*12,1800,40,["core"],0.25],
 ["backup","Recovery repository","server",scale,4000,200,["core"],0],
 ["soc","Security monitoring","siem",scale,2000,200,["core"],0]];
 const nodes=spec.map(([id,name,type,quantity,unit_cost,monthly_unit_cost,dependencies,impact_share])=>({id,name,type,quantity,unit_cost,monthly_unit_cost,dependencies,impact_share}));
 return {version:"TTX-network-1",industry,size,nodes,edges:nodes.flatMap(n=>n.dependencies.map(source=>({source,target:n.id}))),
 assumptions:{downtime_per_hour:1000*scale,response_hourly_rate:150,implementation_rate:0.2},role_assignments:Object.fromEntries(ROLES.map(r=>[r,r]))};
}
export function environmentCost(n) {
 const equipment=n.nodes.reduce((s,x)=>s+num(x.quantity)*num(x.unit_cost),0);
 return {equipment,implementation:Math.round(equipment*num(n.assumptions.implementation_rate)),monthly:n.nodes.reduce((s,x)=>s+num(x.quantity)*num(x.monthly_unit_cost),0)};
}
export function initialState(n,entry="endpoints") {
 return {statuses:Object.fromEntries(n.nodes.map(x=>[x.id,x.id===entry?"compromised":"healthy"])),hours:0,downtime:0,response:0,total:0,timeline:[]};
}
export function advance(n,previous,inject,choice) {
 const s=JSON.parse(JSON.stringify(previous));
 const id=inject.target_id;
 if(!n.nodes.some(x=>x.id===id))throw new Error("Unknown network target");
 const transitions=[];
 const set=(key,status)=>{if(s.statuses[key]!==status){transitions.push(n.nodes.find(x=>x.id===key).name+": "+s.statuses[key]+" → "+status);s.statuses[key]=status;}};
 if(inject.disruption_target&&n.nodes.some(x=>x.id===inject.disruption_target))set(inject.disruption_target,"disrupted");
 const action=choice.action;
 if(action==="isolate")set(id,"isolated");
 if(action==="remediate"&&["compromised","isolated","suspicious"].includes(s.statuses[id]))set(id,"recovering");
 if(action==="restore_verified"&&["recovering","disrupted"].includes(s.statuses[id]))set(id,"healthy");
 if(action==="restore_unverified"&&["isolated","recovering"].includes(s.statuses[id]))set(id,"compromised");
 if(action==="investigate"&&s.statuses[id]==="healthy")set(id,"suspicious");
 // One connected hop per decision. Isolation removes both ingress and egress paths.
 const infected=Object.keys(s.statuses).filter(k=>s.statuses[k]==="compromised");
 {
 const candidates=n.edges.flatMap(e=>infected.includes(e.source)?[e.target]:infected.includes(e.target)?[e.source]:[]);
 const next=[...new Set(candidates)].find(k=>s.statuses[k]==="healthy"||s.statuses[k]==="suspicious");
 if(next)set(next,"compromised");
 }
 const unavailable=new Set(Object.keys(s.statuses).filter(k=>["compromised","isolated","recovering","disrupted"].includes(s.statuses[k])));
 let changed=true;
 while(changed){changed=false;for(const node of n.nodes){if(!unavailable.has(node.id)&&node.dependencies.some(d=>unavailable.has(d))){unavailable.add(node.id);changed=true;}}}
 const authorityDelay=choice.authorized===false?0.5:0;
 const duration=Math.max(.25,Math.min(8,num(inject.duration_hours,1)))+authorityDelay;
 const share=Math.min(1,n.nodes.filter(x=>unavailable.has(x.id)).reduce((a,x)=>a+x.impact_share,0));
 const downtime=Math.round(duration*share*num(n.assumptions.downtime_per_hour));
 const labor={investigate:2,isolate:2,remediate:6,restore_verified:4,restore_unverified:1,coordinate:2,defer:0}[action]??0;
 const response=Math.round(labor*num(n.assumptions.response_hourly_rate));
 s.hours+=duration;s.downtime+=downtime;s.response+=response;s.total=s.downtime+s.response;
 const active=Object.values(s.statuses).filter(v=>["compromised","recovering","isolated"].includes(v)).length;
 s.projected_remaining=Math.round(active*duration*num(n.assumptions.downtime_per_hour)*.25);
 s.unavailable=[...unavailable];
 s.timeline.push({sequence:inject.sequence,target:id,action,hours:s.hours,increment:downtime+response,downtime,response,total:s.total,transitions,authority_delay:authorityDelay,summary:(transitions.length?transitions.join("; "):"No device status changed; response and outage time advanced.")+(authorityDelay?" An additional 30 minutes elapsed resolving decision ownership.":"")});
 return s;
}
export function roleResults(decisions){
 return Object.fromEntries(ROLES.map(role=>{
 const ds=decisions.filter(d=>d.decision_owner===role);
 const score=ds.length?Math.round(ds.reduce((s,d)=>s+d.points,0)/ds.length):null;
 return [role,{score,count:ds.length,narrative:ds.length?ds.map(d=>"Decision "+d.sequence+": "+d.choice_label+" ("+d.points+"/100). "+d.rationale+(d.authorized?" The designated decision authority was engaged.":" The designated decision authority was not engaged; a 20-point responsibility deduction applied.")).join(" "):"Not assessed: no decisions were assigned to this role."}];
 }));
}
export function followupFor(inject,decision,state) {
 const f=inject.followup;
 if(!f||inject.is_followup)return null;
 const trigger=f.trigger||"needs_improvement";
 const warranted=trigger==="always"||trigger==="needs_improvement"&&decision.points<75||trigger==="authority_missing"&&!decision.authorized||trigger==="ongoing_compromise"&&Object.values(state.statuses).includes("compromised");
 if(!warranted)return null;
 return {...f,id:inject.id+"-followup",phase:inject.phase,sequence:decision.sequence+1,is_followup:true,parent_id:inject.id,disruption_target:null,
 situation:"Following your decision to "+decision.choice_label+": "+f.situation,
 choices:f.choices.map((c,i)=>({...c,id:inject.id+"-followup-choice-"+i}))};
}
export function decisionExplanation(inject,choice,decision,network) {
 const best=[...inject.choices].sort((a,b)=>b.points-a.points)[0];
 const event=decision.simulation_event;
 const target=network.nodes.find(n=>n.id===inject.target_id)?.name||inject.target_id;
 return "Because you chose “"+choice.label+"”, the team applied that decision to "+target+". "+event.summary+
 " This added "+money(event.downtime)+" in simulated outage cost and "+money(event.response)+" in response labor. "+
 (decision.authorized?"The responsible authority was engaged; no responsibility deduction applied.":"The responsible authority was not engaged: 20 points were deducted and 30 minutes of simulated coordination delay were added.")+
 " Decision score: "+decision.points+"/100. "+choice.rationale+" "+
 (best.id===choice.id?"Your selection was the strongest available response for this decision. ":"The strongest available response would have been “"+best.label+"”. "+best.rationale);
}
export function endStateOverview(network,state,decisions,company) {
 const names=status=>network.nodes.filter(n=>state.statuses[n.id]===status).map(n=>n.name);
 const compromised=names("compromised"),isolated=names("isolated"),recovering=names("recovering"),disrupted=names("disrupted");
 const missed=decisions.filter(d=>!d.authorized).length;
 const positives=decisions.filter(d=>d.points>=75).map(d=>d.choice_label);
 const gaps=decisions.filter(d=>d.points<75).map(d=>d.choice_label);
 return company+" completed "+decisions.length+" decisions over "+state.hours+" simulated hours. "+
 (compromised.length?"The attack remained active in "+compromised.join(", ")+". ":"No active compromise remained in the modeled devices at the end of this exercise. This is a simulation outcome, not proof of a secure environment. ")+
 (isolated.length?"Systems still isolated: "+isolated.join(", ")+". ":"")+
 (recovering.length?"Recovery remained in progress for "+recovering.join(", ")+". ":"")+
 (disrupted.length?"Disaster-related disruption remained on "+disrupted.join(", ")+". ":"")+
 "Simulated incident cost reached "+money(state.total)+": "+money(state.downtime)+" from service interruption and "+money(state.response)+" from response labor. Additional estimated exposure of "+money(state.projected_remaining)+" is separate from that total. "+
 (positives.length?"Stronger decisions included: "+positives.slice(0,3).join("; ")+". ":"No decision met the strong-response threshold. ")+
 (gaps.length?"Decisions needing improvement included: "+gaps.slice(0,3).join("; ")+". ":"All assessed decisions met the strong-response threshold. ")+
 (missed?missed+" decisions bypassed the designated authority, adding "+(missed*.5)+" hours of coordination delay and responsibility deductions. ":"The designated decision authority was engaged for every decision. ")+
 (compromised.length||recovering.length||disrupted.length||isolated.length?"The next priority is to contain remaining exposure, validate restoration, and confirm that dependent business services work before closing the incident.":"The next priority is to validate the recovery evidence, document lessons, and assign owners to follow-up improvements.");
}

export function archivedOverview(attempt={}) {
 if(typeof attempt.end_state_overview==="string"&&attempt.end_state_overview.trim())return attempt.end_state_overview;
 const ds=Array.isArray(attempt.decisions)?attempt.decisions:[];
 const state=attempt.simulation_state;
 const nodes=attempt.exercise_snapshot?.network_model?.nodes||[];
 const paragraphs=[];
 paragraphs.push((attempt.company_name||"The team")+" completed "+(attempt.exercise_title||"this exercise")+
 (Number.isFinite(attempt.overall_score)?", with a saved readiness score of "+attempt.overall_score+"/100.":".")+
 " This overview uses the recorded results; the original score has not been recalculated.");
 if(state?.statuses&&Object.keys(state.statuses).length){
 const name=id=>nodes.find(n=>n.id===id)?.name||id;
 const groups=[["compromised","The attack remained active on"],["isolated","These systems remained disconnected to limit exposure:"],["recovering","Recovery was still underway for"],["disrupted","Disaster-related disruption remained on"]];
 const outcomes=groups.map(([status,label])=>{const ids=Object.keys(state.statuses).filter(id=>state.statuses[id]===status);return ids.length?label+" "+ids.map(name).join(", ")+".":""}).filter(Boolean);
 if(!Object.values(state.statuses).includes("compromised"))outcomes.unshift("No devices were recorded as actively compromised at the end of the simulation.");
 paragraphs.push(outcomes.join(" ")||"No unresolved device states were recorded.");
 }else paragraphs.push("This older assessment did not retain a final network state, so its final containment and recovery status cannot be confirmed.");
 if(state&&Number.isFinite(state.total)){
 let cost="The recorded simulated incident cost was "+money(state.total)+".";
 if(Number.isFinite(state.downtime))cost+=" Service interruption accounted for "+money(state.downtime)+".";
 if(Number.isFinite(state.response))cost+=" Response labor accounted for "+money(state.response)+".";
 if(Number.isFinite(state.hours))cost+=" The exercise covered "+state.hours+" simulated hours.";
 paragraphs.push(cost);
 }
 const explain=list=>list.slice(0,3).map(d=>"“"+d.choice_label+"”"+(d.rationale?" — "+d.rationale:"")).join(" ");
 const strong=ds.filter(d=>Number.isFinite(d.points)&&d.points>=75&&d.choice_label);
 const weak=ds.filter(d=>Number.isFinite(d.points)&&d.points<75&&d.choice_label).sort((a,b)=>a.points-b.points);
 if(strong.length)paragraphs.push("Decisions that supported the response included: "+explain(strong));
 if(weak.length)paragraphs.push("Decisions that weakened the response or left gaps included: "+explain(weak));
 if(!ds.length)paragraphs.push("Detailed decision records were not retained for this attempt.");
 const missing=ds.filter(d=>d.authorized===false).length;
 if(missing)paragraphs.push("The designated decision authority was not engaged for "+missing+" recorded decision(s). Any original score deductions remain as recorded.");
 const delay=(state?.timeline||[]).reduce((sum,t)=>sum+(Number.isFinite(t.authority_delay)?t.authority_delay:0),0);
 if(delay)paragraphs.push("Recorded coordination delay totaled "+delay+" simulated hours.");
 if(attempt.corrective_actions?.length)paragraphs.push("Recommended follow-up: "+attempt.corrective_actions.join(" "));
 return paragraphs.join("\n\n");
}

