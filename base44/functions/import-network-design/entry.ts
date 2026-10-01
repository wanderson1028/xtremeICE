import {createClientFromRequest} from "npm:@base44/sdk";
import {z} from "npm:zod@3.24.2";
const short=z.string().max(250),arr=z.array(short).max(300);
const iface=z.object({name:short,port:short.optional(),addresses:arr,vlan:short.optional(),parent:short.optional(),mode:short.optional(),admin_status:short.optional(),acl:short.optional(),provenance:z.literal("extracted")});
const record=z.record(short).refine(v=>Object.keys(v).length<=12);
const node=z.object({id:short,label:short.min(1),type:z.enum(["router","switch","firewall","server","wireless","workstation","loadbalancer","cloud","internet","plc","scada","hmi","iot"]),vendor:short,model:short,site:short,provenance:z.enum(["extracted","user-confirmed"]),role_provenance:z.enum(["inferred","extracted","user-confirmed"]),interfaces:z.array(iface).max(300),protocols:arr,vlans:z.array(record).max(500),routes:z.array(record).max(1000),policies:z.array(record).max(2000),services:arr,tunnels:z.array(record).max(300),source_file:short,ip:short,x:z.number().finite(),y:z.number().finite(),reviewed:z.literal(true)});
const snapshot=z.object({nodes:z.array(node).min(1).max(200),links:z.array(z.object({id:short,from:short,to:short,label:short,provenance:z.enum(["extracted","inferred","user-confirmed"]),confirmed:z.literal(true)})).max(1000),warnings:arr,parser_version:z.literal("network-import-1"),status:z.literal("configuration_snapshot")});
const request=z.object({action:z.enum(["save","organizations","designs"]),name:short.optional(),organization_id:short.optional(),parent_id:short.optional(),snapshot:snapshot.optional()});
export async function handler(req){
 try{
 const c=createClientFromRequest(req),u=await c.auth.me();if(!u)return Response.json({error:"Sign in to import a network."},{status:401});
 const raw=await req.text();if(raw.length>3*1024*1024)return Response.json({error:"Snapshot is too large."},{status:413});
 const body=request.parse(JSON.parse(raw));
 const db=c.asServiceRole.entities,admin=u.role==="admin";
 if(body.action==="organizations"){
 let orgs=[];
 if(admin){for(let skip=0;;skip+=200){const p=await db.Organization.list("name",200,skip);orgs.push(...p);if(p.length<200)break;}}
 else if(u.organization_id){const o=await db.Organization.get(u.organization_id);if(o)orgs=[o];}
 return Response.json({organizations:orgs.filter(o=>o.status!=="suspended").map(o=>({id:o.id,name:o.name}))});
 }
 if(body.action==="designs"){
 if(!body.organization_id||(!admin&&u.organization_id!==body.organization_id))return Response.json({error:"Organization access denied."},{status:403});
 const found=[];
 for(let skip=0;;skip+=100){const p=await c.entities.NetworkDesign.filter({organization_id:body.organization_id},"-created_date",100,skip);found.push(...p.filter(d=>d.import_snapshot));if(p.length<100)break;}
 return Response.json({designs:found.map(d=>({id:d.id,name:d.name,version:d.import_version,snapshot:JSON.parse(d.import_snapshot)}))});
 }
 if(!body.name?.trim()||!body.organization_id||!body.snapshot)throw Error("Select an organization, enter a design name, and review every device and connection.");
 if(!admin&&u.organization_id!==body.organization_id)return Response.json({error:"This organization is not assigned to you."},{status:403});
 const org=await db.Organization.get(body.organization_id);if(!org||org.status==="suspended")throw Error("Select an active organization.");
 const s=body.snapshot,ids=new Set(s.nodes.map(n=>n.id));
 if(ids.size!==s.nodes.length||s.links.some(l=>!ids.has(l.from)||!ids.has(l.to)||l.from===l.to))throw Error("Topology has invalid or duplicate device references.");
 let parent=null;
 if(body.parent_id){
 parent=await c.entities.NetworkDesign.get(body.parent_id);
 if(!parent||parent.organization_id!==org.id||(!admin&&parent.created_by_id!==u.id))return Response.json({error:"The prior design is not available for revision."},{status:403});
 }
 const version=(parent?.import_version||0)+1;
 const saved=await c.entities.NetworkDesign.create({name:body.name.trim(),company_name:org.name,organization_id:org.id,is_public:false,status:"draft",diagram_data:JSON.stringify({nodes:s.nodes,links:s.links}),import_snapshot:JSON.stringify({...s,imported_at:new Date().toISOString()}),import_version:version,parent_design_id:parent?.id||"",change_history:[`Configuration snapshot v${version} reviewed and imported. ${s.nodes.length} devices; ${s.links.length} confirmed connections.`]});
 return Response.json({id:saved.id});
 }catch(e){return Response.json({error:e instanceof z.ZodError?"Review the import: all devices and connections must be confirmed and within the supported limits.":e instanceof SyntaxError?"Invalid import request.":e.message||"Import failed."},{status:400});}
}
Deno.serve(handler);
