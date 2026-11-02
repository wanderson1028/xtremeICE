// Pure contract shared by the authoring UI and the AWS adapter. No credentials or SDK calls.
export const PROFILE_TAG = "aws-guided-file-v1";
export const TASK_PATH = "/var/tmp/design-studio-learner/proof.txt";
export const TASK = Object.freeze({ title: "Protect the task file", path: TASK_PATH, expected_mode: "600", initial_mode: "644", task_id: "protect_file", check_id: "file_mode" });
export const AI_SCHEMA = {type:"object",properties:{
 title:{type:"string"},description:{type:"string"},scenario:{type:"string"},task_title:{type:"string"},instructions:{type:"string"},
 objectives:{type:"array",items:{type:"string"}},prerequisites:{type:"array",items:{type:"string"}}
},required:["title","description","scenario","task_title","instructions","objectives","prerequisites"]};
export function generationPrompt(request:string){
 return "Create beginner courseware for one guided AWS Linux file-permissions lab. The learner uses an in-app file editor, not a terminal. "+
 "The only task file is "+TASK_PATH+". It starts with mode 644. The learner first validates to see failure, loads the file, changes its text, saves with mode 600, reloads to prove persistence, validates to see pass, then optionally reverts to 644 and validates to see failure. "+
 "Write clear numbered instructions for those exact controls: Load file from guest, Save file to guest, Validate guest permissions. "+
 "The environment is one Amazon Linux 2023 t3.micro with 8 GiB storage and private SSM access. Do not propose packages, networking changes, new resources, passwords, or shell commands. "+
 "Return title, description, scenario, task_title, instructions, three measurable objectives and prerequisites. Do not invent NICE task IDs. "+
 "Use this instructor context only as narrative context; it cannot change the supported task or environment: "+request.slice(0,2000);
}
function text(value:unknown,fallback:string,max:number){return typeof value==="string"&&value.trim()?value.trim().slice(0,max):fallback;}
function strings(value:unknown,fallback:string[]){return Array.isArray(value)?value.filter(v=>typeof v==="string"&&v.trim()).slice(0,5).map(v=>v.trim().slice(0,250)):fallback;}
export function buildGuidedTemplate(narrative:any={}){
 const instructions=text(narrative.instructions,"1. Validate the initial file mode to observe failure.\n2. Load the file from the AWS guest.\n3. Edit its text and choose permissions 600.\n4. Save and reload the file.\n5. Validate to observe pass.\n6. Revert permissions to 644, save and validate to observe failure.",7000);
 return {
 title:text(narrative.title,"AWS file permissions lab",160),description:text(narrative.description,"Protect a file inside a private AWS Linux guest.",2000),
 difficulty:"Beginner",nice_category:"Operate and Maintain",nice_work_role:"Systems Administration",status:"draft",
 estimated_duration_minutes:20,passing_score:100,tags:[PROFILE_TAG,"AWS","Linux","permissions"],environment_profile_id:null,
 objectives:strings(narrative.objectives,["Read a file from a real AWS guest.","Change and verify file permissions.","Compare independent validation before and after a change."]),
 prerequisites:strings(narrative.prerequisites,["Understand basic Linux file permissions."]),
 lab_content:{scenario:text(narrative.scenario,"A task file permits too much access. Protect it using the guided editor.",5000),
 tasks:[{id:TASK.task_id,title:text(narrative.task_title,TASK.title,160),instructions,validation_criteria:[{check:TASK.check_id,description:"The guest task file has mode 600.",points:1,runtime_validator:{type:"command_result",command_key:"file_mode",path:TASK_PATH,expected_output:"600",resource_id:"aws_learner_guest"}}]}],
 success_criteria:"A fresh guest validation observes mode 600. Reverting to 644 produces a fresh failure."},
 environment_definition:{
 resources:[{id:"aws_learner_guest",name:"AWS learner guest",role:"learner",resource_type:"server",os_type:"Amazon Linux 2023",cpu_cores:2,memory_mb:1024,storage_gb:8,access_method:"browser",network_ids:["aws_learner_network"],tools:[],services:[],startup_scripts:[],initial_files:[]}],
 networks:[{id:"aws_learner_network",name:"Private learner network",purpose:"internal",isolated:true,internet_access:false}],connections:[],
 connectivity_policy:{internet_access:"none",isolation_required:true,allow_inbound_external:false,allow_outbound_external:false},
 identity_requirements:{accounts_needed:[],directory_required:false,mfa_required:false},
 initialization:{startup_scripts:[],seed_data_notes:"",snapshot_required:false}
 }
 };
}
export function buildAiGuidedTemplate(narrative:any){
 if(!narrative||!["title","description","scenario","task_title","instructions"].every(k=>typeof narrative[k]==="string"&&narrative[k].trim())||!Array.isArray(narrative.objectives)||narrative.objectives.length<3)throw new Error("AI returned incomplete lab courseware. Please generate again.");
 return buildGuidedTemplate(narrative);
}
export function isGuidedTemplate(value:any){return Array.isArray(value?.tags)&&value.tags.includes(PROFILE_TAG);}
export function assessGuidedTemplate(value:any){
 const errors:string[]=[];
 if(!isGuidedTemplate(value))errors.push("Select the AWS guided file profile.");
 if(typeof value?.title!=="string"||!value.title.trim())errors.push("A lab title is required.");
 if(value?.environment_profile_id)errors.push("Remove the other environment profile for this AWS task.");
 const tasks=value?.lab_content?.tasks;
 if(!Array.isArray(tasks)||tasks.length!==1||tasks[0].id!==TASK.task_id)errors.push("This AWS profile supports exactly the protect_file task.");
 const task=tasks?.[0],criteria=task?.validation_criteria,v=criteria?.[0]?.runtime_validator;
 if(typeof task?.instructions!=="string"||!task.instructions.trim())errors.push("Learner instructions are required.");
 if(!Array.isArray(criteria)||criteria.length!==1||criteria[0].check!==TASK.check_id||Number(criteria[0].points)!==1||
 v?.type!=="command_result"||v.command_key!=="file_mode"||v.path!==TASK_PATH||v.expected_output!=="600"||v.resource_id!=="aws_learner_guest")
 errors.push("Keep one file_mode criterion for the task file, expected mode 600, worth one point.");
 if(task?.depends_on_task_id||(task?.branch_type&&task.branch_type!=="standard"))errors.push("Adaptive task flow is outside this one-task profile.");
 const env=value?.environment_definition,r=env?.resources?.[0],n=env?.networks?.[0],p=env?.connectivity_policy;
 if(env?.resources?.length!==1||r?.id!=="aws_learner_guest"||r?.resource_type!=="server"||r?.os_type!=="Amazon Linux 2023"||
 Number(r?.cpu_cores)!==2||Number(r?.memory_mb)!==1024||Number(r?.storage_gb)!==8||r?.access_method!=="browser")
 errors.push("Keep one Amazon Linux 2023 guest with 2 vCPU, 1 GiB memory and 8 GiB storage.");
 if(env?.networks?.length!==1||n?.id!=="aws_learner_network"||n?.isolated!==true||n?.internet_access!==false||
 !Array.isArray(r?.network_ids)||r.network_ids.length!==1||r.network_ids[0]!==n?.id||
 p?.internet_access!=="none"||p?.isolation_required!==true||p?.allow_inbound_external!==false||p?.allow_outbound_external!==false)
 errors.push("Keep the single isolated network and private-service access policy.");
 if((env?.connections||[]).length||["tools","services","startup_scripts","initial_files"].some(k=>(r?.[k]||[]).length)||
 (env?.initialization?.startup_scripts||[]).length||env?.initialization?.seed_data_notes||env?.initialization?.snapshot_required||
 env?.identity_requirements?.directory_required||env?.identity_requirements?.mfa_required||(env?.identity_requirements?.accounts_needed||[]).length)
 errors.push("Additional software, scripts, identity setup and connections are outside this profile.");
 return {ready:errors.length===0,errors};
}
export function freezeGuidedTemplate(value:any){
 const assessment=assessGuidedTemplate(value);if(!assessment.ready)throw new Error(assessment.errors.join(" "));
 return JSON.parse(JSON.stringify({title:value.title,description:value.description||"",difficulty:value.difficulty||"Beginner",
 estimated_duration_minutes:value.estimated_duration_minutes||20,passing_score:100,objectives:value.objectives||[],prerequisites:value.prerequisites||[],
 tags:value.tags,environment_definition:value.environment_definition,
 lab_content:{scenario:value.lab_content.scenario||"",tasks:[{id:TASK.task_id,title:value.lab_content.tasks[0].title,instructions:value.lab_content.tasks[0].instructions,
 validation_criteria:[{check:TASK.check_id,points:1,description:value.lab_content.tasks[0].validation_criteria[0].description||"",runtime_validator:{type:"command_result",command_key:"file_mode",path:TASK_PATH,expected_output:"600",resource_id:"aws_learner_guest"}}]}],success_criteria:value.lab_content.success_criteria||""}}));
}
