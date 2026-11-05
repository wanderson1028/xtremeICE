import {useCallback,useEffect,useRef,useState} from "react";
import {base44} from "@/api/base44Client";
import {learnerCall,learnerError} from "@/lib/cloudLearnerClient";
import {ALERT_SCOPE,alertStorageKey,parseAlertCache,serializeAlertCache,reconcileAlerts,acknowledgeAlert,alertView} from "@/lib/operatorAlertState";

const empty=()=>({checked_at:null,entries:{}});
export function useOperatorAlerts(enabled=true){
 const [snapshot,setSnapshot]=useState(null),[cache,setCache]=useState(empty),[busy,setBusy]=useState(false),[error,setError]=useState(""),[storageWarning,setStorageWarning]=useState("");
 const cacheRef=useRef(empty()),actor=useRef(null),execute=useRef(null),live=useRef(false);
 const read=useCallback(id=>{try{return parseAlertCache(window.localStorage.getItem(alertStorageKey(id)));}catch{setStorageWarning("Acknowledgments cannot be saved in this browser. They will last only while this page stays open.");return cacheRef.current;}},[]);
 const save=useCallback((id,next)=>{cacheRef.current=next;setCache(next);try{window.localStorage.setItem(alertStorageKey(id),serializeAlertCache(next));setStorageWarning("");}catch{setStorageWarning("Acknowledgments cannot be saved in this browser. They will last only while this page stays open.");}},[]);
 useEffect(()=>{
  if(!enabled){setSnapshot(null);setCache(empty());return;}
  let cancelled=false,timer,inFlight=false,failures=0;
  live.current=true;
  const check=async()=>{
   if(cancelled||inFlight)return;
   clearTimeout(timer);inFlight=true;setBusy(true);let denied=false,failed=false;
   try{
    const me=await base44.auth.me();if(cancelled)return;
    if(me.role!=="admin")throw Object.assign(new Error("Instructor access required"),{response:{status:403}});
    if(actor.current!==me.id){actor.current=me.id;cacheRef.current=read(me.id);setCache(cacheRef.current);setSnapshot(null);}
    const result=await learnerCall("operatorAlerts");if(cancelled)return;
    if(result.subject_id!==me.id||result.scope!==ALERT_SCOPE)throw Object.assign(new Error("The signed-in account changed. Reload this page."),{response:{status:403}});
    const next=reconcileAlerts(read(me.id),result);save(me.id,next);setSnapshot(result);setError("");failures=0;
   }catch(e){
    if(cancelled)return;failed=true;
    if([401,403].includes(e?.response?.status)){
     denied=true;setSnapshot(null);cacheRef.current=empty();setCache(empty());
     if(actor.current)try{window.localStorage.removeItem(alertStorageKey(actor.current));}catch{}
     actor.current=null;
    }
    setError(learnerError(e));
   }finally{
    inFlight=false;if(!cancelled){setBusy(false);if(!denied)timer=setTimeout(check,failed?Math.min(120000,30000*2**Math.min(++failures,2)):60000);}
   }
  };
  execute.current=check;check();
  return()=>{cancelled=true;live.current=false;clearTimeout(timer);execute.current=null;};
 },[enabled,read,save]);
 const refresh=useCallback(()=>execute.current?.(),[]);
 const acknowledge=useCallback(key=>{if(!live.current||!actor.current)return;save(actor.current,acknowledgeAlert(read(actor.current),key));},[read,save]);
 return {snapshot,...alertView(cache,snapshot),busy,error,storageWarning,refresh,acknowledge};
}
