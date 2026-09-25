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
 const action=choice.action;
 if(action==="isolate"&&s.statuses[id]!=="healthy")set(id,"isolated");
 if(action==="remediate"&&["compromised","isolated","suspicious"].includes(s.statuses[id]))set(id,"recovering");
 if(action==="restore_verified"&&s.statuses[id]==="recovering")set(id,"healthy");
 if(action==="restore_unverified"&&["isolated","recovering"].includes(s.statuses[id]))set(id,"compromised");
 if(action==="investigate"&&s.statuses[id]==="healthy")set(id,"suspicious");
 // One connected hop per decision. Isolation removes both ingress and egress paths.
 const infected=Object.keys(s.statuses).filter(k=>s.statuses[k]==="compromised");
 if(!["isolate","remediate","restore_verified"].includes(action)){
 const candidates=n.edges.flatMap(e=>infected.includes(e.source)?[e.target]:infected.includes(e.target)?[e.source]:[]);
 const next=[...new Set(candidates)].find(k=>s.statuses[k]==="healthy"||s.statuses[k]==="suspicious");
 if(next)set(next,"compromised");
 }
 const unavailable=new Set(Object.keys(s.statuses).filter(k=>["compromised","isolated","recovering","disrupted"].includes(s.statuses[k])));
 let changed=true;
 while(changed){changed=false;for(const node of n.nodes){if(!unavailable.has(node.id)&&node.dependencies.some(d=>unavailable.has(d))){unavailable.add(node.id);changed=true;}}}
 const duration=Math.max(.25,Math.min(8,num(inject.duration_hours,1)));
 const share=Math.min(1,n.nodes.filter(x=>unavailable.has(x.id)).reduce((a,x)=>a+x.impact_share,0));
 const downtime=Math.round(duration*share*num(n.assumptions.downtime_per_hour));
 const labor={investigate:2,isolate:2,remediate:6,restore_verified:4,restore_unverified:1,coordinate:2,defer:0}[action]??0;
 const response=Math.round(labor*num(n.assumptions.response_hourly_rate));
 s.hours+=duration;s.downtime+=downtime;s.response+=response;s.total=s.downtime+s.response;
 const active=Object.values(s.statuses).filter(v=>["compromised","recovering","isolated"].includes(v)).length;
 s.projected_remaining=Math.round(active*duration*num(n.assumptions.downtime_per_hour)*.25);
 s.unavailable=[...unavailable];
 s.timeline.push({sequence:inject.sequence,target:id,action,hours:s.hours,increment:downtime+response,downtime,response,total:s.total,transitions,summary:transitions.length?transitions.join("; "):"No device status changed; response and outage time advanced."});
 return s;
}
export function roleResults(decisions){
 return Object.fromEntries(ROLES.map(role=>{
 const ds=decisions.filter(d=>d.decision_owner===role);
 const score=ds.length?Math.round(ds.reduce((s,d)=>s+d.points,0)/ds.length):null;
 return [role,{score,count:ds.length,narrative:ds.length?ds.map(d=>"Decision "+d.sequence+": "+d.choice_label+" ("+d.points+"/100). "+d.rationale+(d.authorized?" The designated decision authority was engaged.":" The designated decision authority was not engaged; a 20-point responsibility deduction applied.")).join(" "):"Not assessed: no decisions were assigned to this role."}];
 }));
}
