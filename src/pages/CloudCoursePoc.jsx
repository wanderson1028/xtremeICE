import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
export default function CloudCoursePoc(){
 const [runs,setRuns]=useState([]),[error,setError]=useState(""),[user,setUser]=useState(null);
 useEffect(()=>{let mounted=true;(async()=>{try{
  const me=await base44.auth.me();if(!mounted)return;setUser(me);if(me.role!=="admin")return;
  const response=await base44.functions.invoke("cloudCoursePocAWS",{action:"list"});
  if(mounted)setRuns(response.data?.runs||[]);
 }catch(e){if(mounted)setError(e.message||"Could not load proof history.");}})();return()=>{mounted=false;};},[]);
 if(user&&user.role!=="admin")return <div className="p-8 text-red-300">Admin access is required to view prior proof records.</div>;
 return <main className="min-h-screen bg-gray-950 text-gray-100 p-6"><div className="max-w-4xl mx-auto space-y-5">
  <Link to="/LabBuilderDashboard" className="text-sky-300">← Course Lab Builder</Link>
  <h1 className="text-2xl font-semibold">AWS course proof history</h1>
  <p>The earlier boot and validation self-tests used the previous AWS integration. Their records remain here. New demonstrations use dedicated learner account 935838375949.</p>
  <div className="flex flex-wrap gap-3"><Link className="rounded bg-sky-800 px-4 py-2" to="/QuickBuild?preset=aws-learner">Generate an AWS lab with AI</Link><Link className="rounded border border-sky-700 px-4 py-2" to="/CloudLearnerPoc">Open AWS learner file task</Link></div>
  {error&&<p role="alert" className="text-red-300">{error}</p>}
  <section className="border border-gray-700 rounded p-4 space-y-3"><h2 className="font-semibold">Earlier proof runs</h2>
   {runs.length===0&&<p>No earlier proof runs are available.</p>}
   {runs.map(run=><div className="border border-gray-800 rounded p-3 space-y-1" key={run.id}><p className="font-mono text-sm">{run.id} · {run.status}</p><p>Instance: {run.instance_id||"not created"} · Region: {run.region} · Last observed state: {run.last_observed_state||"not observed"}</p></div>)}
  </section>
 </div></main>;
}

