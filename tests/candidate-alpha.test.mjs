import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
const handlers={};
for(const name of ['candidateSessionFlow','getCandidateAssessment','resetCandidateAttempt']){
 globalThis.Deno={serve:h=>handlers[name]=h};
 const out=await build({entryPoints:[`base44/functions/${name}/entry.ts`],bundle:true,write:false,platform:'node',format:'esm',plugins:[{name:'mock',setup(b){b.onResolve({filter:/^npm:/},()=>({path:'sdk',namespace:'mock'}));b.onLoad({filter:/.*/,namespace:'mock'},()=>({contents:'export const createClientFromRequest=()=>globalThis.client;'}));}}]});
 const mod=await import('data:text/javascript;base64,'+Buffer.from(out.outputFiles[0].text).toString('base64'));handlers[name] ||= mod.default;
}
const token='a'.repeat(64);
function fixture(){
 const rows={CandidateInvitation:[{id:'i',invite_token:token,assessment_id:'a',candidate_email:'c@test',candidate_name:'Candidate',invited_by_id:'admin',status:'pending'}],CandidateSession:[],Scorecard:[],Assessment:[{id:'a',duration_minutes:60,pass_threshold:70}],AssessmentTask:[]};
 let failDelete=false;
 const db=new Proxy({}, {get:(_,name)=>({filter:async(q)=>(rows[name]||[]).filter(r=>Object.entries(q).every(([k,v])=>r[k]===v)).map(r=>structuredClone(r)),get:async(id)=>structuredClone((rows[name]||[]).find(r=>r.id===id)),create:async(data)=>{const r={...data,id:`${name}-${rows[name].length}`};rows[name].push(r);return structuredClone(r);},update:async(id,data)=>{const r=rows[name].find(r=>r.id===id);Object.assign(r,data);return structuredClone(r);},delete:async(id)=>{if(failDelete)throw Error('storage unavailable');rows[name]=rows[name].filter(r=>r.id!==id);}})});
 globalThis.client={auth:{me:async()=>({id:'admin',role:'admin'})},entities:db,asServiceRole:{entities:db,integrations:{Core:{InvokeLLM:async()=>({})}}}};
 return {rows,failDelete:()=>failDelete=true,call:async(name,body={})=>{const r=await handlers[name](new Request('https://example.test',{method:'POST',body:JSON.stringify({token,...body})}));return {status:r.status,data:await r.json()};}};
}
test('malformed invitation token is denied',async()=>{const f=fixture();assert.equal((await f.call('candidateSessionFlow',{action:'start',token:'bad'})).status,400);});
test('expired invitation cannot start',async()=>{const f=fixture();f.rows.CandidateInvitation[0].expires_at='2000-01-01';assert.equal((await f.call('candidateSessionFlow',{action:'start'})).status,410);});
test('start reuses an open session',async()=>{const f=fixture();await f.call('candidateSessionFlow',{action:'start'});const r=await f.call('candidateSessionFlow',{action:'start'});assert.equal(r.data.resumed,true);assert.equal(f.rows.CandidateSession.length,1);});
test('resuming not-started session returns its new timestamp and status',async()=>{const f=fixture();f.rows.CandidateSession.push({id:'s',invitation_id:'i',status:'not_started'});const r=await f.call('candidateSessionFlow',{action:'start'});assert.equal(r.data.session.status,'in_progress');assert.ok(r.data.session.started_at);});
test('session from another invitation is denied',async()=>{const f=fixture();f.rows.CandidateSession.push({id:'s',invitation_id:'other'});assert.equal((await f.call('candidateSessionFlow',{action:'update',session_id:'s'})).status,404);});
test('submitted answer changes are denied',async()=>{const f=fixture();f.rows.CandidateSession.push({id:'s',invitation_id:'i',status:'submitted'});assert.equal((await f.call('candidateSessionFlow',{action:'update',session_id:'s'})).status,410);});
test('repeat submit returns existing scorecard',async()=>{const f=fixture();f.rows.CandidateSession.push({id:'s',invitation_id:'i',status:'submitted'});f.rows.Scorecard.push({id:'card',session_id:'s',overall_score:80});const r=await f.call('candidateSessionFlow',{action:'submit',session_id:'s'});assert.equal(r.data.overall_score,80);assert.equal(r.data.already_submitted,true);});
test('portal hides questions for completed candidate',async()=>{const f=fixture();f.rows.CandidateInvitation[0].status='completed';f.rows.AssessmentTask.push({id:'q',assessment_id:'a'});assert.deepEqual((await f.call('getCandidateAssessment')).data.tasks,[]);});
test('reset fails visibly when result deletion fails',async()=>{const f=fixture();f.rows.CandidateSession.push({id:'s',assessment_id:'a',invitation_id:'i',candidate_email:'c@test'});f.rows.Scorecard.push({id:'card',session_id:'s'});f.failDelete();assert.equal((await f.call('resetCandidateAttempt',{invitation_id:'i'})).status,500);});
function objective(f){f.rows.CandidateSession.push({id:'s',invitation_id:'i',assessment_id:'a',candidate_email:'c@test',status:'in_progress',started_at:new Date(Date.now()-600000).toISOString()});f.rows.AssessmentTask.push({id:'q',assessment_id:'a',question_type:'mcq',points:10,correct_option_id:'yes',options:[{id:'yes',text:'Yes'},{id:'no',text:'No'}]});}
test('objective submission scores from server answer key',async()=>{const f=fixture();objective(f);const r=await f.call('candidateSessionFlow',{action:'submit',session_id:'s',task_submissions:[{task_id:'q',answer:'no',score:100}]});assert.equal(r.status,200);assert.equal(r.data.overall_score,0);});
test('candidate receives no objective answer key',async()=>{const f=fixture();objective(f);const r=await f.call('getCandidateAssessment');assert.equal(r.data.tasks[0].correct_option_id,undefined);assert.equal(r.data.tasks[0].option_credits,undefined);});
test('submission timing ignores forged browser duration',async()=>{const f=fixture();objective(f);await f.call('candidateSessionFlow',{action:'submit',session_id:'s',time_elapsed_minutes:99999,task_submissions:[]});assert.ok(f.rows.CandidateSession[0].time_elapsed_minutes<11);});
test('interrupted scoring retry uses submitted answers',async()=>{const f=fixture();objective(f);Object.assign(f.rows.CandidateSession[0],{status:'submitted',task_submissions:[{task_id:'q',answer:'no'}]});const r=await f.call('candidateSessionFlow',{action:'submit',session_id:'s',task_submissions:[{task_id:'q',answer:'yes'}]});assert.equal(r.data.overall_score,0);});
