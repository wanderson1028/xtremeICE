import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import vm from 'node:vm';import ts from 'typescript';
function actionHarness(page,status='active'){
 const text=fs.readFileSync(`src/pages/${page}.jsx`,'utf8'),ast=ts.createSourceFile('page.jsx',text,ts.ScriptTarget.Latest,true,ts.ScriptKind.JSX);let handler;
 const visit=node=>{if(ts.isVariableDeclaration(node)&&node.name.getText(ast)==='handleAction')handler=node.initializer.getText(ast);ts.forEachChild(node,visit);};visit(ast);
 let score=0,actions=[],effects=0;
 const context={phase:status==='active'?'active':'summary',evolution:{status,processAction:()=>effects++},scoredActionsRef:{current:new Set()},setScore:fn=>score=fn(score),setActionsLog:fn=>actions=fn(actions),setEndpoints:()=>{},setAlerts:()=>{},selectedScenario:{id:'test'},getScenarioPlaybook:()=>({prohibited:[]}),getRequiredActionIds:()=>['isolate_host']};
 const fn=vm.runInNewContext('('+handler+')',context);return {act:fn,result:()=>({score,actions,effects})};
}
for(const page of ['SOCTraining','SOCSimulation','RealAttackDrills']){
 test(`${page}: duplicate action cannot add points twice`,()=>{const h=actionHarness(page);h.act({id:'isolate_host'});const first=h.result().score;h.act({id:'isolate_host'});assert.equal(h.result().score,first);assert.equal(h.result().actions.length,1);});
 test(`${page}: duplicate challenge credit is ignored`,()=>{const h=actionHarness(page);h.act({id:'challenge',scoreOverride:20});h.act({id:'challenge',scoreOverride:20});assert.equal(h.result().score,20);});
 test(`${page}: terminal result cannot be altered`,()=>{const h=actionHarness(page,'complete');h.act({id:'isolate_host'});assert.equal(h.result().score,0);assert.equal(h.result().effects,0);});
 test(`${page}: zero penalty stays zero`,()=>{const h=actionHarness(page);h.act({id:'challenge',scoreOverride:20});h.act({id:'penalty',isPenalty:true,scoreOverride:0});assert.equal(h.result().score,20);});
}
