import assert from "node:assert/strict";
import {parseConfiguration,buildSnapshot} from "../src/components/network-import/parser.js";
import {build} from "esbuild";
const cisco=`hostname R1
username admin secret SUPER_SECRET
enable secret ENABLE_SECRET
interface GigabitEthernet0/0
 ip address 10.0.0.1 255.255.255.0
!
interface GigabitEthernet0/1
 switchport mode trunk
 switchport trunk native vlan 10
!
vlan 10
 name Users
!
router ospf 1
 network 10.0.0.0 0.0.0.255 area 0
ip route 0.0.0.0 0.0.0.0 10.0.0.254
snmp-server community COMMUNITY_SECRET RO
crypto isakmp key VPN_SECRET address 1.2.3.4
`;
const a=parseConfiguration(cisco,"r1.cfg")[0];
assert.equal(a.interfaces.length,2);assert.equal(a.interfaces[0].addresses[0],"10.0.0.1 255.255.255.0");assert.equal(a.interfaces[1].vlan,"10");assert.equal(a.vlans[0].name,"Users");assert.deepEqual(a.protocols,["OSPF"]);assert.equal(a.routes[0].next_hop,"10.0.0.254");
assert.ok(!JSON.stringify(a).includes("SECRET"));assert.ok(!JSON.stringify(a).includes("community"));
const forti=`#config-version=FGT60F-7.0
config system global
 set hostname "FW1"
end
config system interface
 edit "port1"
  set ip 10.0.0.2 255.255.255.0
  set allowaccess ping https ssh
 next
end
config firewall policy
 edit 1
  set srcintf "port1"
  set dstintf "wan1"
  set srcaddr "all"
  set dstaddr "all"
  set action accept
  set service "HTTPS"
 next
end
config system admin
 edit "admin"
  set password ENC ADMIN_SECRET
 next
end
config vpn ipsec phase1-interface
 edit "branch"
  set remote-gw 203.0.113.1
  set psksecret PSK_SECRET
 next
end
config router ospf
 set router-id 10.0.0.2
end`;
const f=parseConfiguration(forti,"fw.conf")[0];assert.equal(f.label,"FW1");assert.equal(f.model,"FGT60F");assert.equal(f.policies[0].action,"accept");assert.equal(f.tunnels[0].remote,"203.0.113.1");assert.deepEqual(f.protocols,["OSPF"]);assert.ok(!JSON.stringify(f).includes("SECRET"));
const pf=parseConfiguration('<pfsense><system><hostname>PF1</hostname><user><password>HASH_SECRET</password></user></system><interfaces><lan><if>igb0</if><ipaddr>192.168.1.1</ipaddr><subnet>24</subnet></lan></interfaces><filter><rule><type>pass</type><protocol>tcp</protocol><source><any/></source><destination><address>10.0.0.5</address></destination></rule></filter><ipsec><phase1><ikeid>1</ikeid><remote-gateway>203.0.113.2</remote-gateway><pre-shared-key>PSK_SECRET</pre-shared-key></phase1></ipsec></pfsense>',"pf.xml")[0];
assert.equal(pf.interfaces[0].addresses[0],"192.168.1.1/24");assert.equal(pf.policies[0].source,"any");assert.ok(!JSON.stringify(pf).includes("SECRET"));
assert.throws(()=>parseConfiguration('<!DOCTYPE pfsense [<!ENTITY a SYSTEM "file:///etc/passwd">]><pfsense/>',"pf.xml"));
assert.throws(()=>parseConfiguration("<pfsense><system></pfsense>","pf.xml"));
assert.throws(()=>parseConfiguration("unrecognized backup","a.cfg"));assert.throws(()=>parseConfiguration("","a.cfg"));
assert.throws(()=>parseConfiguration(forti+"\nconfig vdom","vdom.conf"));
const csv=parseConfiguration('name,type,vendor,model,ip,site,protocols,connects_to\n"Core, HQ",router,Cisco,,10.0.0.1,HQ,OSPF,Access\nAccess,switch,Cisco,,10.0.0.2,HQ,,\n',"inventory.csv");
const inv=buildSnapshot(csv);assert.equal(inv.links.length,1);assert.equal(inv.links[0].confirmed,false);
const snap=buildSnapshot([a,f,pf]);assert.equal(snap.links.length,0,"same subnet must not imply physical adjacency");
assert.throws(()=>buildSnapshot([a,a]));
globalThis.Deno={serve(){}};
const compiled=await build({entryPoints:["base44/functions/import-network-design/entry.ts"],bundle:true,write:false,platform:"node",format:"esm",plugins:[{name:"sdk",setup(b){b.onResolve({filter:/^npm:@base44/},()=>({path:"mock",namespace:"mock"}));b.onLoad({filter:/.*/,namespace:"mock"},()=>({contents:"export const createClientFromRequest=()=>globalThis.client;"}));b.onResolve({filter:/^npm:zod/},()=>({path:process.cwd()+"/node_modules/zod/lib/index.mjs"}));}}]});
const {handler}=await import("data:text/javascript;base64,"+Buffer.from(compiled.outputFiles[0].text).toString("base64"));
let who={id:"u1",organization_id:"org1",role:"user"},saved=[],parent;
globalThis.client={auth:{me:async()=>who},asServiceRole:{entities:{Organization:{get:async id=>({id,name:"Company",status:"active"})}}},entities:{NetworkDesign:{create:async v=>{saved.push(v);return {id:"saved"};},get:async()=>parent,filter:async()=>[]}}};
const call=async body=>{const r=await handler(new Request("http://test",{method:"POST",body:JSON.stringify(body)}));return [r.status,await r.json()];};
const body={action:"save",name:"Network",organization_id:"org1",snapshot:snap};
assert.equal((await call(body))[0],400,"review required");
snap.nodes.forEach(n=>n.reviewed=true);
assert.equal((await call({...body,organization_id:"org2"}))[0],403);
assert.equal((await call(body))[0],200);assert.equal(saved[0].is_public,false);assert.equal(saved[0].organization_id,"org1");assert.equal(saved[0].import_version,1);assert.ok(!JSON.stringify(saved[0]).includes("SECRET"));
snap.links=[{id:"bad",from:"missing",to:snap.nodes[0].id,label:"bad",provenance:"user-confirmed",confirmed:true}];
assert.equal((await call(body))[0],400);snap.links=[];
parent={id:"parent",organization_id:"org1",created_by_id:"u1",import_version:1};
assert.equal((await call({...body,parent_id:"parent"}))[0],200);assert.equal(saved[1].import_version,2);assert.equal(saved[1].parent_design_id,"parent");
parent.organization_id="org2";assert.equal((await call({...body,parent_id:"parent"}))[0],403);
who=null;assert.equal((await call(body))[0],401);
console.log("PASS: four import formats, field extraction, secret exclusion, unsafe XML rejection, malformed/unsupported input, duplicate devices, conservative connections, review gate, organization isolation, private save, versioning, authentication.");
