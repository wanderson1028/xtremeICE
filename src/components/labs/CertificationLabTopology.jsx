import React, { useMemo } from "react";
import { Cloud, Crosshair, Database, Globe2, Monitor, Network, Router, Server, Shield, Terminal } from "lucide-react";

const ICONS={attacker:Crosshair,cloud:Cloud,database:Database,internet:Globe2,workstation:Monitor,switch:Network,router:Router,server:Server,firewall:Shield,console:Terminal};
const POSITIONS=[[10,50],[28,22],[28,76],[50,50],[72,22],[72,76],[90,50]];

function makeDevices(labTitle,tags){
 const text=`${labTitle} ${(tags||[]).join(" ")}`.toLowerCase();
 const cloud=/aws|azure|cloud/.test(text),security=/security|cyber|pentest|vulnerab|ethical|soc|cysa/.test(text),network=/network|net\+|router|switch/.test(text),soc=/soc|siem|incident|forensic|cysa/.test(text);
 const rows=[
  {id:"console",name:"Analyst Console",type:"workstation",ip:"192.168.1.50",role:"Learner access point"},
  {id:"edge",name:cloud?"Cloud Gateway":"Edge Firewall",type:cloud?"cloud":"firewall",ip:"192.168.1.1",role:"Security boundary"},
  {id:"core",name:network?"Core Router":"Core Switch",type:network?"router":"switch",ip:"192.168.1.254",role:"Network services"},
  {id:"target",name:cloud?"Cloud Workload":"Application Server",type:cloud?"cloud":"server",ip:"192.168.1.10",role:"Primary lab system"},
  {id:"data",name:soc?"SIEM Console":"Data Service",type:soc?"console":"database",ip:"192.168.1.20",role:soc?"Security monitoring":"Protected data"},
 ];
 if(security)rows.unshift({id:"tester",name:"Authorized Test Host",type:"attacker",ip:"10.10.10.25",role:"Security test source"});
 if(cloud)rows.push({id:"services",name:"Cloud Services",type:"internet",ip:"Provider network",role:"Managed services"});
 return rows.slice(0,7).map((d,i)=>({...d,x:POSITIONS[i][0],y:POSITIONS[i][1]}));
}
function targetId(step,devices){
 const text=`${step?.stepLabel||""} ${step?.explanation||""} ${step?.command||""}`.toLowerCase();
 if(/siem|log|alert|incident|event/.test(text))return"data";
 if(/database|sql|storage|data/.test(text))return"data";
 if(/firewall|acl|gateway|security group/.test(text))return"edge";
 if(/router|route|ospf|eigrp|bgp|vlan|switch|osi|subnet|traffic|connector/.test(text))return"core";
 if(/scan|nmap|nikto|exploit|attack|recon/.test(text))return devices.some(d=>d.id==="tester")?"tester":"console";
 if(/server|host|service|web|patch|vulnerab/.test(text))return"target";
 return"console";
}

export default function CertificationLabTopology({labTitle,tags,step,selectedDevice,onSelect}){
 const devices=useMemo(()=>makeDevices(labTitle,tags),[labTitle,tags]);
 const target=targetId(step,devices);
 const selected=devices.find(d=>d.id===selectedDevice?.id)||devices[0];
 return <div className="shrink-0 overflow-hidden rounded-xl border border-cyan-800/40 bg-gray-950/90">
  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-800 px-4 py-2">
   <div><div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-cyan-300"><Network className="h-3.5 w-3.5"/>Interactive topology</div><div className="mt-0.5 text-[10px] text-gray-500">Select a device to enter its console</div></div>
   <div className="flex gap-2 text-[9px] font-mono"><span className="text-red-300">● Current task</span><span className="text-cyan-300">● Selected</span><span className="text-emerald-300">● Online</span></div>
  </div>
  <div className="grid md:grid-cols-[minmax(0,1fr)_220px]">
   <div className="relative min-h-[250px] overflow-hidden bg-[radial-gradient(circle_at_center,rgba(6,182,212,.09),transparent_62%)]">
    <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
     {devices.slice(1).map((d,i)=>{const from=i<2?devices[0]:devices[Math.min(i,2)];return <g key={d.id}><line x1={from.x} y1={from.y} x2={d.x} y2={d.y} stroke="#334155" strokeWidth="1"/><line x1={from.x} y1={from.y} x2={d.x} y2={d.y} stroke="#22d3ee" strokeWidth=".25" strokeDasharray="2 2" className="animate-pulse"/></g>})}
    </svg>
    {devices.map(d=>{const Icon=ICONS[d.type]||Server,isSelected=d.id===selected.id,isTarget=d.id===target;return <button key={d.id} type="button" onClick={()=>onSelect(d)} style={{left:`${d.x}%`,top:`${d.y}%`}} className={`absolute w-24 -translate-x-1/2 -translate-y-1/2 rounded-lg border p-2 text-left shadow-lg transition hover:z-20 hover:scale-105 ${isSelected?"border-cyan-300 bg-cyan-950 text-cyan-100":isTarget?"border-red-500/70 bg-red-950/60 text-red-100":"border-gray-700 bg-black/90 text-gray-300"}`} aria-label={`Open ${d.name} console`}>
     {isTarget&&!isSelected&&<span className="absolute -right-1 -top-1 h-2.5 w-2.5 animate-ping rounded-full bg-red-400"/>}
     <div className="flex items-center justify-between"><Icon className="h-4 w-4"/><span className="h-1.5 w-1.5 rounded-full bg-emerald-400"/></div>
     <div className="mt-1.5 truncate text-[9px] font-bold">{d.name}</div><div className="truncate text-[8px] font-mono text-gray-500">{d.ip}</div>
    </button>})}
   </div>
   <div className="border-t border-gray-800 bg-black/40 p-4 md:border-l md:border-t-0">
    <div className="text-[9px] font-mono uppercase tracking-wider text-gray-500">Selected device</div>
    <div className="mt-2 text-sm font-bold text-white">{selected.name}</div>
    <div className="mt-1 text-[10px] text-gray-400">{selected.role}</div>
    <div className="mt-3 rounded-lg border border-gray-800 bg-gray-950 p-2 font-mono text-[9px] text-gray-400"><div>Address: <span className="text-cyan-300">{selected.ip}</span></div><div className="mt-1">Status: <span className="text-emerald-300">Online</span></div></div>
    <button type="button" onClick={()=>onSelect(selected)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 px-3 py-2 text-[10px] font-bold text-gray-950 hover:bg-cyan-300"><Terminal className="h-3.5 w-3.5"/>Enter console</button>
   </div>
  </div>
 </div>;
}
