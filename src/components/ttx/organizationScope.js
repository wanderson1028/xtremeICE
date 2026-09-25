// Stable IDs define reporting scope; company names are display labels only.
export function profileScope(profile) {
 return profile?.organization_id ? "org:"+profile.organization_id : profile?.id ? "profile:"+profile.id : "";
}
export function attemptScope(attempt,profiles=[]) {
 if(attempt.organization_id)return "org:"+attempt.organization_id;
 const profile=profiles.find(p=>p.id===attempt.profile_id);
 if(profile)return profileScope(profile);
 if(attempt.profile_snapshot?.organization_id)return "org:"+attempt.profile_snapshot.organization_id;
 return attempt.profile_id?"profile:"+attempt.profile_id:"";
}
export function scopeOptions(profiles,attempts) {
 const options=new Map();
 for(const p of profiles){const key=profileScope(p);if(key&&!options.has(key))options.set(key,{key,label:p.company_name+(p.is_demo?" (demo)":""),profile:p});}
 for(const a of attempts){const key=attemptScope(a,profiles);if(key&&!options.has(key))options.set(key,{key,label:(a.company_name||"Archived organization")+" (archived)",profile:null});}
 return [...options.values()].sort((a,b)=>a.label.localeCompare(b.label));
}
export function scopedCompleted(attempts,profiles,scope) {
 if(!scope)return [];
 return attempts.filter(a=>a.status==="completed"&&attemptScope(a,profiles)===scope)
 .sort((a,b)=>new Date(b.completed_at||b.started_at||b.created_date)-new Date(a.completed_at||a.started_at||a.created_date));
}
