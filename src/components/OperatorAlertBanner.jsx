import React from "react";
import {Link} from "react-router-dom";
import {useOperatorAlerts} from "@/lib/useOperatorAlerts";
export default function OperatorAlertBanner({enabled}){
 const {snapshot,active,error}=useOperatorAlerts(enabled);
 if(!enabled)return null;
 if(!snapshot&&!error)return null;
 const count=active.filter(a=>a.status==="open").length;
 return <aside role="status" className={"rounded border p-4 "+(error||active.length?"border-amber-700 bg-amber-950/30":"border-gray-700")}>
  <Link className="font-semibold text-sky-300" to="/OperatorAlerts">Operator alerts →</Link>
  <p className="text-sm">{error?"Alert checks are unavailable. Open Operator alerts to review the last known state.":active.length?active.length+" unresolved alert(s) · "+count+" unacknowledged.":"No current operator warnings in the checked records."}</p>
  <p className="text-xs text-gray-400">Checks refresh while this page is open. Acknowledgments stay in this browser.</p>
 </aside>;
}