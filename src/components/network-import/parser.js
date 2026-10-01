import { XMLParser, XMLValidator } from "fast-xml-parser";

export const DEVICE_TYPES = ["router","switch","firewall","server","wireless","workstation","loadbalancer","cloud","internet","plc","scada","hmi","iot"];
const list = v => v == null ? [] : Array.isArray(v) ? v : [v];
const str = v => typeof v === "string" || typeof v === "number" ? String(v).trim().slice(0,200) : "";
const safe = v => str(v).replace(/[\u0000-\u001f]/g,"");
const words = s => (s.match(/"[^"]*"|\S+/g)||[]).map(x=>x.replace(/^"|"$/g,""));
export function csvRows(text) {
 const rows=[];let row=[],cell="",quote=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quote&&text[i+1]==='"'){cell+='"';i++;}else quote=!quote;}
 else if(c===','&&!quote){row.push(cell.trim());cell="";}
 else if(c==='\n'&&!quote){row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell="";}
 else cell+=c;}
 if(quote)throw Error("CSV has an unclosed quoted field.");
 row.push(cell.trim());if(row.some(Boolean))rows.push(row);return rows;
}
const device = () => ({label:"",type:"router",vendor:"",model:"",site:"",provenance:"extracted",role_provenance:"inferred",interfaces:[],protocols:[],vlans:[],routes:[],policies:[],services:[],tunnels:[]});
function cisco(text) {
 const d=device(); d.vendor="Cisco"; d.label=text.match(/^hostname\s+(\S+)/m)?.[1]||"";
 d.model=text.match(/^!\s*(?:Model|PID):\s*(\S+)/mi)?.[1]||"";
 let iface=null,vlan=null;
 for(const raw of text.split(/\r?\n/)){const s=raw.trim(), w=words(s);
 if(/^interface\s/.test(s)){iface={name:s.slice(10),addresses:[],provenance:"extracted"};d.interfaces.push(iface);vlan=null;continue;}
 if(/^vlan\s+[\d,-]+$/.test(s)){vlan={id:w[1],name:""};d.vlans.push(vlan);iface=null;continue;}
 if(/^\S/.test(raw)||s==="!"){iface=null;if(s==="!")vlan=null;}
 if(iface){
 if(/^ip address\s/.test(s))iface.addresses.push(w.slice(2,4).join(" "));
 if(/^ipv6 address\s/.test(s))iface.addresses.push(w[2]);
 if(/^switchport (access|trunk native) vlan /.test(s))iface.vlan=w.at(-1);
 if(/^encapsulation dot1Q /.test(s))iface.vlan=w[2];
 if(/^switchport mode /.test(s))iface.mode=w[2];
 if(s==="shutdown")iface.admin_status="disabled";
 if(/^ip access-group /.test(s))iface.acl=w.slice(2).join(" ");
 }
 if(vlan&&/^name /.test(s))vlan.name=s.slice(5);
 if(/^router (ospf|eigrp|bgp|rip|isis)\b/i.test(s))d.protocols.push(w[1].toUpperCase());
 if(/^ip route /.test(s))d.routes.push({destination:w.slice(2,4).join(" "),next_hop:w[4]||"",provenance:"extracted"});
 if(/^access-list \S+ (permit|deny) /.test(s))d.policies.push({id:w[1],action:w[2],protocol:w[3]||"",source:w[4]||"",destination:"See source configuration; extended ACL not fully interpreted"});
 if(/^ip access-list /.test(s))d.policies.push({id:w.slice(2).join(" "),action:"configured",protocol:"",source:"",destination:"Rules require review"});
 if(/^ip nat /.test(s))d.services.push("NAT configured");
 if(/^ip ssh /.test(s))d.services.push("SSH configured");
 if(/^ntp server /.test(s))d.services.push("NTP server "+w[2]);
 if(/^ip name-server /.test(s))d.services.push("DNS servers "+w.slice(2).filter(x=>/^[\da-f:.]+$/i.test(x)).join(" "));
 if(/^crypto (map|ipsec|isakmp policy) /.test(s))d.tunnels.push({name:"IPsec configuration present",remote:"Unknown"});
 }
 d.type=d.interfaces.some(i=>i.mode)||d.vlans.length?"switch":"router";
 return d;
}
function forti(text) {
 const d=device();d.vendor="Fortinet";d.type="firewall";
 d.label=text.match(/^\s*set hostname\s+"?([^"\r\n]+)"?/m)?.[1]||"";
 d.model=text.match(/^#config-version=([^ -]+)/m)?.[1]||"";
 let stack=[],records=[];
 for(const raw of text.split(/\r?\n/)){const w=words(raw.trim());if(!w.length)continue;
 if(w[0]==="config")stack.push({section:w.slice(1).join(" "),record:null});
 else if(w[0]==="edit"&&stack.length)stack.at(-1).record={name:w[1],values:{}};
 else if(w[0]==="set"&&stack.at(-1)?.record){
 const k=w[1];
 if(["ip","interface","vlanid","type","status","dst","gateway","device","srcintf","dstintf","srcaddr","dstaddr","service","action","nat","remote-gw","allowaccess"].includes(k))stack.at(-1).record.values[k]=w.slice(2);
 }else if(w[0]==="next"&&stack.at(-1)?.record){records.push({section:stack.map(x=>x.section).join("/"),...stack.at(-1).record});stack.at(-1).record=null;}
 else if(w[0]==="end")stack.pop();
 }
 for(const r of records){const v=r.values,join=k=>(v[k]||[]).join(" ");
 if(r.section==="system interface"){d.interfaces.push({name:r.name,addresses:v.ip?[join("ip")]:[],vlan:join("vlanid"),parent:join("interface"),mode:join("type"),admin_status:join("status"),provenance:"extracted"});if(v.vlanid)d.vlans.push({id:join("vlanid"),name:r.name});if(v.allowaccess)d.services.push(r.name+": "+join("allowaccess"));}
 if(r.section==="router static")d.routes.push({destination:join("dst")||"0.0.0.0 0.0.0.0 (default)",next_hop:join("gateway"),interface:join("device"),provenance:"extracted"});
 if(r.section==="firewall policy")d.policies.push({id:r.name,action:join("action")||"deny (default)",source:join("srcaddr"),destination:join("dstaddr"),protocol:join("service"),from:join("srcintf"),to:join("dstintf"),nat:join("nat")});
 if(r.section.startsWith("vpn ipsec phase1"))d.tunnels.push({name:r.name,remote:join("remote-gw"),interface:join("interface")});
 }
 for(const p of ["ospf","bgp","rip"])if(new RegExp("^config router "+p+"\\s*$","m").test(text))d.protocols.push(p.toUpperCase());
 return d;
}
function pfsense(text) {
 if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error("XML document types and entities are not allowed.");
 if(XMLValidator.validate(text)!==true)throw Error("Malformed XML configuration.");
 const root=new XMLParser({ignoreAttributes:true,parseTagValue:false,processEntities:false}).parse(text).pfsense;
 if(!root)throw Error("Only pfSense XML exports are supported.");
 const d=device();d.vendor="pfSense";d.type="firewall";d.label=str(root.system?.hostname);
 for(const [name,v] of Object.entries(root.interfaces||{}))if(v&&typeof v==="object")d.interfaces.push({name,port:str(v.if),addresses:v.ipaddr?[str(v.ipaddr)+(v.subnet?"/"+str(v.subnet):"")]:[],provenance:"extracted"});
 d.vlans=list(root.vlans?.vlan).map(v=>({id:str(v.tag),name:str(v.vlanif),parent:str(v.if)}));
 d.routes=list(root.staticroutes?.route).map(v=>({destination:str(v.network),next_hop:str(v.gateway),provenance:"extracted"}));
 const endpoint=v=>v?.any!==undefined?"any":str(v?.address||v?.network)||"Unknown";
 d.policies=list(root.filter?.rule).map((v,i)=>({id:String(i+1),action:str(v.type),protocol:str(v.protocol),source:endpoint(v.source),destination:endpoint(v.destination),interface:str(v.interface)}));
 if(root.nat)d.services.push("NAT configuration present");
 if(root.system?.ssh?.enable!==undefined)d.services.push("SSH enabled");
 if(root.dhcpd)d.services.push("DHCP configuration present");
 d.tunnels=list(root.ipsec?.phase1).map(v=>({name:"IPsec "+str(v.ikeid),remote:str(v["remote-gateway"])}));
 if(root.openvpn)d.tunnels.push({name:"OpenVPN configuration present",remote:"Unknown"});
 return d;
}
export function parseConfiguration(text,filename) {
 if(typeof text!=="string"||!text.trim()||text.length>2*1024*1024||text.includes("\0"))throw Error("Use a nonempty text configuration under 2 MB.");
 let nodes=[];
 if(/\.csv$/i.test(filename)){
 const rows=csvRows(text.replace(/^\uFEFF/,"")),head=rows.shift()?.map(s=>s.toLowerCase())||[];
 if(!head.includes("name")||!head.includes("type"))throw Error("CSV requires name,type columns. Optional: vendor,model,ip,site,protocols,connects_to.");
 nodes=rows.map(row=>{const get=k=>safe(row[head.indexOf(k)]);if(!get("name")||!DEVICE_TYPES.includes(get("type")))throw Error("Every CSV device needs a name and supported type.");
 return {...device(),label:get("name"),type:get("type"),role_provenance:"extracted",vendor:get("vendor"),model:get("model"),site:get("site"),interfaces:get("ip")?[{name:"inventory",addresses:[get("ip")],provenance:"extracted"}]:[],protocols:get("protocols").split(";").filter(Boolean),declared_peers:get("connects_to").split(";").filter(Boolean)};});
 }else if(/<pfsense[>\s]/.test(text))nodes=[pfsense(text)];
 else if(/^config system (global|interface)/m.test(text)||/^#config-version=/m.test(text))nodes=[forti(text)];
 else if(/^hostname\s+\S+/m.test(text)&&/^interface\s+\S+/m.test(text))nodes=[cisco(text)];
 else throw Error("Unrecognized format. Use Cisco IOS text, FortiGate single-VDOM text, pfSense XML, or the CSV inventory template.");
 if(!nodes.length||nodes.length>200)throw Error("Import 1–200 devices at a time.");
 if(nodes.some(n=>n.interfaces.length>300||n.policies.length>2000||n.routes.length>1000))throw Error("Configuration exceeds the supported interface, policy, or route limits. Split the inventory before importing.");
 if(/^config vdom/m.test(text))throw Error("Export each FortiGate VDOM separately; combined VDOM files are not supported.");
 return nodes.map(n=>({...n,label:safe(n.label)||"Unnamed device",protocols:[...new Set(n.protocols)],services:[...new Set(n.services)],source_file:safe(filename),interfaces:n.interfaces}));
}
export function buildSnapshot(devices) {
 if(devices.length>200)throw Error("A snapshot is limited to 200 devices.");
 const nodes=devices.map((d,i)=>({...d,id:"import-"+i,x:100+(i%4)*220,y:100+Math.floor(i/4)*150,ip:d.interfaces[0]?.addresses[0]?.split(/[ /]/)[0]||"",reviewed:false}));
 const links=[],warnings=["Configuration snapshot only: no live discovery, effective-policy validation, or device emulation. Missing settings mean unknown, not absent.","Cisco extended ACLs, vendor-specific extensions, hardware models absent from exports, and business dependencies need manual review."];
 const names=new Map();for(const n of nodes){if(names.has(n.label))throw Error("Duplicate device name: "+n.label+". Import only one configuration per device, or rename the source device.");names.set(n.label,n.id);}
 for(const n of nodes)for(const peer of n.declared_peers||[]){const to=names.get(peer);if(to&&to!==n.id&&!links.some(l=>[l.from,l.to].includes(n.id)&&[l.from,l.to].includes(to)))links.push({id:"import-link-"+links.length,from:n.id,to,label:"Inventory connection",provenance:"extracted",confirmed:false});else if(!to)warnings.push("Unresolved inventory connection from "+n.label+" to "+peer);}
 // Config exports usually do not prove physical adjacency. Do not manufacture links from shared addressing.
 return {nodes,links,warnings,parser_version:"network-import-1",status:"configuration_snapshot"};
}
