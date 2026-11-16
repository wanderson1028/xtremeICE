export const ALERT_SCOPE="69a0a5a90473fac0aa3ea135:design-studio-integration";
export const ALERT_LABELS={
 launch_failed:"A lab launch failed",start_stalled:"A lab start is stranded",provisioning_stalled:"A guest has taken too long to become ready",cleanup_overdue:"Lab cleanup is delayed",expiry_overdue:"An expired lab still holds capacity",session_error:"A session check recorded an error",session_timing:"A session has invalid timing data",session_state:"A session has an unrecognized state",uncertain_action:"A guest action has an uncertain outcome",operation_overdue:"A guest action needs review",capacity_conflict:"Multiple session records hold pilot capacity",expiry_disabled:"Automatic expiry cleanup is disabled",expiry_failed:"The expiry workflow reported a failure",expiry_stale:"The expiry workflow has not run recently",monitor_unavailable:"Expiry workflow status could not be verified",results_incomplete:"Some monitoring results are incomplete"
};
const validKey=(key,code)=>typeof key==="string"&&Object.hasOwn(ALERT_LABELS,code)&&new RegExp("^[a-f0-9]{32}\\."+code+"$").test(key);
const stamp=value=>typeof value==="string"&&Number.isFinite(Date.parse(value))?value:null;
export const alertStorageKey=id=>"design-studio-operator-alerts:v1:"+id;
export function parseAlertCache(raw){
 const empty={checked_at:null,entries:{}};
 if(!raw)return empty;
 try{if(raw.length>80000)return empty;const parsed=JSON.parse(raw);if(parsed.scope!==ALERT_SCOPE)return empty;
  if(stamp(parsed.checked_at)&&Date.parse(parsed.checked_at)>Date.now()+300000)return empty;
  const entries={};for(const [key,v] of Object.entries(parsed.entries||{}).slice(0,100)){
   if(!validKey(key,v?.code)||!["open","acknowledged","resolved"].includes(v.status)||!stamp(v.first_seen_at))continue;
   entries[key]={code:v.code,status:v.status,first_seen_at:v.first_seen_at,last_seen_at:stamp(v.last_seen_at),acknowledged_at:stamp(v.acknowledged_at),resolved_at:stamp(v.resolved_at),occurrences:Number.isInteger(v.occurrences)&&v.occurrences>0?v.occurrences:1};
  }return {checked_at:stamp(parsed.checked_at),entries};
 }catch{return empty;}
}
export function serializeAlertCache(cache){
 // Persist only opaque keys, generic rule names and timestamps: no run IDs, identities or incident details.
 const entries=Object.fromEntries(Object.entries(cache.entries).sort((a,b)=>String(b[1].last_seen_at).localeCompare(String(a[1].last_seen_at))).slice(0,100));
 return JSON.stringify({scope:ALERT_SCOPE,checked_at:cache.checked_at,entries});
}
export function reconcileAlerts(previous,snapshot){
 if(snapshot.scope!==ALERT_SCOPE||!stamp(snapshot.checked_at))throw Error("Unexpected operator alert snapshot");
 if(previous.checked_at&&Date.parse(snapshot.checked_at)<=Date.parse(previous.checked_at))return previous;
 const entries={...previous.entries},current=new Set();
 for(const alert of snapshot.alerts){
  if(!validKey(alert.key,alert.code))continue;
  current.add(alert.key);const old=entries[alert.key],reopened=old?.status==="resolved";
  entries[alert.key]={code:alert.code,status:!old||reopened?"open":old.status,first_seen_at:!old||reopened?snapshot.checked_at:old.first_seen_at,last_seen_at:snapshot.checked_at,acknowledged_at:reopened?null:old?.acknowledged_at||null,resolved_at:null,occurrences:(old?.occurrences||0)+(!old||reopened?1:0)};
 }
 for(const key of snapshot.cleared_keys||[]){
  if(!current.has(key)&&entries[key]&&entries[key].status!=="resolved")entries[key]={...entries[key],status:"resolved",resolved_at:snapshot.checked_at};
 }
 return {checked_at:snapshot.checked_at,entries};
}
export function acknowledgeAlert(cache,key,time=new Date().toISOString()){
 if(!cache.entries[key]||cache.entries[key].status==="resolved")return cache;
 return {...cache,entries:{...cache.entries,[key]:{...cache.entries[key],status:"acknowledged",acknowledged_at:time}}};
}
export function alertView(cache,snapshot){
 const current=new Map((snapshot?.alerts||[]).map(a=>[a.key,a])),active=[],resolved=[];
 for(const [key,entry] of Object.entries(cache.entries)){
  const detail=current.get(key),row={key,...entry,title:detail?.title||ALERT_LABELS[entry.code],severity:detail?.severity||(["monitor_unavailable","results_incomplete","session_error","session_timing","uncertain_action","operation_overdue"].includes(entry.code)?"warning":"high"),next_step:detail?.next_step||"Open the recovery overview and obtain a fresh check.",source_type:detail?.source_type||null,run_id:detail?.run_id||null,unverified:!detail&&entry.status!=="resolved"};
  (entry.status==="resolved"?resolved:active).push(row);
 }
 active.sort((a,b)=>Number(a.status==="acknowledged")-Number(b.status==="acknowledged")||Number(b.severity==="high")-Number(a.severity==="high")||b.first_seen_at.localeCompare(a.first_seen_at));
 resolved.sort((a,b)=>String(b.resolved_at).localeCompare(String(a.resolved_at)));
 return {active,resolved:resolved.slice(0,20)};
}