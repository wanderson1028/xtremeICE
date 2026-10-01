import {buildNetwork} from "../ttx/simulation.js";
export function toTTXNetwork(design,profile){
 const base=buildNetwork(profile),s=design.snapshot;
 return {...base,version:"TTX-import-1",source_design_id:design.id,source_design_version:design.version,source_status:"configuration_snapshot",
 nodes:s.nodes.map(n=>({id:n.id,name:n.label,type:n.type,quantity:1,unit_cost:0,monthly_unit_cost:0,impact_share:1/s.nodes.length,dependencies:[],product:[n.vendor,n.model].filter(Boolean).join(" "),protocols:n.protocols,interfaces:n.interfaces,vlans:n.vlans,configuration_notes:"Imported configuration; effective reachability and exploitability are not validated."})),
 edges:s.links.filter(l=>l.confirmed).map(l=>({source:l.from,target:l.to,label:l.label,provenance:l.provenance})),
 import_note:"Costs start at zero because configuration exports contain no pricing. Equal outage impact shares are initial training assumptions. Confirm costs, business dependencies, and impact shares before exercise use."};
}
