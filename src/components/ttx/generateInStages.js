export async function generateInStages(invoke,payload,onProgress,cache) {
 const key=JSON.stringify(payload);
 if(cache.key!==key){cache.key=key;cache.batches=[];}
 for(let batch=cache.batches.length;batch<3;batch++){
   onProgress(batch,"Generating stage "+(batch+1)+" of 3: "+["preparation, detection, and command","containment, remediation, and recovery","communications, evidence, and improvement"][batch]+"…");
   const first=cache.batches[0],previous=cache.batches.flatMap(b=>b.exercise.injects);
   const exercise_context=first?{title:first.exercise.title,entry_node:first.exercise.entry_node,disaster_target:first.exercise.disaster_target,disaster_sequence:first.exercise.disaster_sequence,earlier_questions:previous.map(x=>x.question)}:null;
   const response=await invoke("generateTTXExercise",{...payload,batch_index:batch,scenario_seed:first?.scenario_seed,expected_profile_version:first?.profile_snapshot?.profile_version||undefined,exercise_context});
   const data=response.data||response;
   if(data.error)throw new Error(data.error);
   if(!data.exercise?.injects||data.exercise.injects.length!==3||data.batch_index!==batch)throw new Error("The exercise stage returned incomplete data. Please retry.");
   cache.batches.push(data);onProgress(batch+1,"Completed "+(batch+1)+" of 3 generation stages.");
 }
 const first=cache.batches[0];
 return {...first,threat_sources:[...new Set(cache.batches.flatMap(b=>b.threat_sources||[]))],exercise:{...first.exercise,injects:cache.batches.flatMap(b=>b.exercise.injects),assumptions:[...new Set(cache.batches.flatMap(b=>b.exercise.assumptions||[]))]}};
}
