import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
const platform={id:'p',email:'p@example.test',role:'admin'};
const admin={id:'a',email:'a@example.test',role:'user',org_role:'org_admin',organization_id:'A'};
const member={id:'m',email:'m@example.test',role:'user',org_role:'member',organization_id:'A'};
const outsider={id:'b',email:'b@example.test',role:'user',org_role:'org_admin',organization_id:'B'};
function fixture(caller=admin, assignments=[]) {
 const users=structuredClone([platform,admin,member,outsider]);
 const rows=structuredClone(assignments); const writes=[];
 const match=(row,q)=>Object.entries(q).every(([k,v])=>row[k]===v);
 const entity=(items)=>({list:async()=>items,filter:async(q)=>items.filter(r=>match(r,q)),update:async(id,data)=>{writes.push(['update',id,data]);const row=items.find(r=>r.id===id);Object.assign(row,data);return row;},delete:async(id)=>{writes.push(['delete',id]);items.splice(items.findIndex(r=>r.id===id),1);},create:async(data)=>{const row={id:'new'+items.length,...data};items.push(row);writes.push(['create',row]);return row;}});
 const client={auth:{me:async()=>caller},asServiceRole:{entities:{User:entity(users),UserService:entity(rows),Organization:entity([{id:'A'},{id:'B'}])}}};
 return {client,users,rows,writes};
}
function handler(name,client){
 const source=fs.readFileSync(`base44/functions/${name}/entry.ts`,'utf8');
 const js=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const exports={};vm.runInNewContext(js,{exports,require:()=>({createClientFromRequest:()=>client}),Response,Request,console});return exports.default;
}
async function invoke(name,f,body){const response=await handler(name,f.client)(new Request('https://example.test',{method:'POST',body:JSON.stringify(body)}));return {status:response.status,data:await response.json()};}
test('anonymous cannot manage features',async()=>{const f=fixture(null);assert.equal((await invoke('manageTenantAccess',f,{action:'list_assignments'})).status,401);assert.equal(f.writes.length,0);});
test('member cannot elevate role',async()=>{const f=fixture(member);assert.equal((await invoke('manageTenantAccess',f,{action:'set_org_role',user_id:'m',org_role:'org_admin'})).status,403);assert.equal(f.writes.length,0);});
test('tenant admin cannot edit other tenant features',async()=>{const f=fixture();assert.equal((await invoke('manageTenantAccess',f,{action:'set_feature_access',user_email:outsider.email,service_key:'soc_training',access_level:'editor'})).status,403);});
test('tenant admin cannot move another tenant user into own tenant',async()=>{const f=fixture();assert.equal((await invoke('assignUserOrganization',f,{user_id:'b',organization_id:'A'})).status,403);assert.equal(f.writes.length,0);});
test('tenant admin cannot move platform admin',async()=>{const f=fixture();assert.equal((await invoke('assignUserOrganization',f,{user_id:'p',organization_id:'A'})).status,403);assert.equal(f.writes.length,0);});
test('platform transfer resets inherited tenant administrator role',async()=>{const f=fixture(platform);assert.equal((await invoke('assignUserOrganization',f,{user_id:'b',organization_id:'A'})).status,200);assert.equal(f.users.find(u=>u.id==='b').org_role,'member');});
test('same-tenant assignment preserves role',async()=>{const f=fixture(platform);await invoke('assignUserOrganization',f,{user_id:'b',organization_id:'B'});assert.equal(f.users.find(u=>u.id==='b').org_role,'org_admin');});
test('revoking access removes all duplicate assignments',async()=>{const f=fixture(admin,[{id:'1',user_email:member.email,service_key:'soc_training',access_level:'editor'},{id:'2',user_email:member.email,service_key:'soc_training',access_level:'viewer'}]);assert.equal((await invoke('manageTenantAccess',f,{action:'set_feature_access',user_email:member.email,service_key:'soc_training',access_level:null})).status,200);assert.equal(f.rows.length,0);});
test('downgrade updates all duplicate assignments',async()=>{const f=fixture(admin,[{id:'1',user_email:member.email,service_key:'soc_training',access_level:'editor'},{id:'2',user_email:member.email,service_key:'soc_training',access_level:'editor'}]);await invoke('manageTenantAccess',f,{action:'set_feature_access',user_email:member.email,service_key:'soc_training',access_level:'viewer'});assert.ok(f.rows.every(r=>r.access_level==='viewer'));});
test('own tenant member can receive feature',async()=>{const f=fixture();assert.equal((await invoke('manageTenantAccess',f,{action:'set_feature_access',user_email:member.email,service_key:'soc_training',access_level:'viewer'})).status,200);assert.equal(f.rows[0].access_level,'viewer');});
test('invalid permission is rejected without writes',async()=>{const f=fixture();assert.equal((await invoke('manageTenantAccess',f,{action:'set_feature_access',user_email:member.email,service_key:'soc_training',access_level:'admin'})).status,400);assert.equal(f.writes.length,0);});
test('tenant assignment listing ignores forged organization selector',async()=>{const f=fixture(admin,[{id:'1',user_email:member.email,service_key:'soc_training'},{id:'2',user_email:outsider.email,service_key:'soc_training'}]);const r=await invoke('manageTenantAccess',f,{action:'list_assignments',organization_id:'B'});assert.equal(r.status,200);assert.equal(r.data.assignments.length,1);assert.equal(r.data.assignments[0].user_email,member.email);});
