import { buildAiGuidedTemplate, buildGuidedTemplate, assessGuidedTemplate, freezeGuidedTemplate, TASK_PATH, generationPrompt } from "./templateContract.ts";
import { normalizeTasks } from "../../../src/lib/taskModel.js";
const narrative={title:"Protect a Linux task file",description:"AI courseware fixture for a permissions lab.",scenario:"A configuration file needs protection.",task_title:"Protect the file",instructions:"Validate 644, load and edit, save 600, reload and validate.",objectives:["Read guest state","Change file permissions","Validate a change"],prerequisites:["Basic Linux knowledge"]};
function check(v:unknown){if(!v)throw new Error("Template pipeline assertion failed");}
Deno.test("AI courseware survives builder normalization and freezes the reviewed task",()=>{
 const draft=buildAiGuidedTemplate(narrative);draft.lab_content.tasks=normalizeTasks(draft.lab_content.tasks) as any;
 check(assessGuidedTemplate(draft).ready);
 const frozen=freezeGuidedTemplate(draft);
 check(frozen.lab_content.tasks[0].instructions===narrative.instructions);
 draft.lab_content.tasks[0].instructions="Changed after provisioning";
 check(frozen.lab_content.tasks[0].instructions===narrative.instructions);
 check(frozen.lab_content.tasks[0].validation_criteria[0].runtime_validator.path===TASK_PATH);
});
Deno.test("AI cannot replace infrastructure, commands or frozen validator criteria",()=>{
 const draft=buildAiGuidedTemplate({...narrative,owner_user_id:"attacker",environment_definition:{resources:[{startup_scripts:["bad"]}]},lab_content:{tasks:[{runtime_validator:{path:"/etc/shadow"}}]}});
 check(assessGuidedTemplate(draft).ready);
 check(draft.environment_definition.resources[0].startup_scripts.length===0);
 check(draft.lab_content.tasks[0].validation_criteria[0].runtime_validator.expected_output==="600");
 check(!("owner_user_id" in draft));
 let rejected=false;try{buildAiGuidedTemplate({title:"incomplete"});}catch{rejected=true;}check(rejected);
 check(generationPrompt("a".repeat(10000)).length<4000);
});
Deno.test("builder changes outside the supported profile prevent deployment",()=>{
 const changes=[
  (v:any)=>v.lab_content.tasks.push(v.lab_content.tasks[0]),
  (v:any)=>v.lab_content.tasks[0].validation_criteria[0].runtime_validator.path="/etc/shadow",
  (v:any)=>v.lab_content.tasks[0].validation_criteria[0].runtime_validator.expected_output="777",
  (v:any)=>v.environment_definition.resources[0].storage_gb=100,
  (v:any)=>v.environment_definition.resources[0].startup_scripts=["echo unsupported"],
  (v:any)=>v.environment_definition.networks[0].internet_access=true,
  (v:any)=>v.environment_definition.connectivity_policy.allow_inbound_external=true,
  (v:any)=>v.environment_profile_id="another-provider",
 ];
 for(const change of changes){const draft:any=buildGuidedTemplate(narrative);change(draft);check(!assessGuidedTemplate(draft).ready);}
});
Deno.test("a new reviewed instruction changes the frozen preflight payload",()=>{
 const a=buildGuidedTemplate(narrative),b=buildGuidedTemplate({...narrative,instructions:"A reviewed new instruction"});
 check(JSON.stringify(freezeGuidedTemplate(a))!==JSON.stringify(freezeGuidedTemplate(b)));
});
