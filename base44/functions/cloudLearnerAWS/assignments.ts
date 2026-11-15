import { ACTIVE_PROOF_STATUSES, ACTIVE_RUN_STATUSES, classroomRun, classroomSeat, classroomWindow, launchScope, readClassroom } from "./classroom.ts";
import { assessGuidedTemplate, freezeGuidedTemplate } from "./templateContract.ts";
import { hash } from "./awsControl.ts";
export const ASSIGNMENT_KIND={lab_type:"lab_course",service_key:"lab_scenarios"};
const denied=(message:string,status=403)=>Object.assign(new Error(message),{name:"ASSIGNMENT_ACCESS_DENIED",status});
export async function assignedLab(b:any,user:any,id:unknown,checkTemplate=true){
 if(typeof id!=="string"||!/^[a-f0-9]{16,32}$/i.test(id))throw denied("Select an assigned lab.");
 const assignment=(await b.asServiceRole.entities.UserLabAssignment.filter({id,...ASSIGNMENT_KIND}))[0];
 if(!assignment||assignment.user_email.toLowerCase()!==String(user.email).toLowerCase())throw denied("This lab is not assigned to you.");
 if(!checkTemplate)return {assignment,template:null};
 const template=(await b.asServiceRole.entities.LabTemplate.filter({id:assignment.lab_id}))[0];
 if(!template||!assessGuidedTemplate(template).ready)throw denied("This assigned lab is unavailable. Contact your instructor.",409);
 return {assignment,template};
}
export async function assignmentActions(action:string,input:any,b:any,user:any){
 if(!["assignmentCatalog","assignLab","revokeAssignment","assignedLabs"].includes(action))return null;
 if(action!=="assignedLabs"&&user.role!=="admin")throw denied("Instructor access required.");
 const classroom=readClassroom();
 if(action==="assignmentCatalog"){
  const [templates,users,assignments]=await Promise.all([b.asServiceRole.entities.LabTemplate.list("-created_date",100),b.asServiceRole.entities.User.list("-created_date",200),b.asServiceRole.entities.UserLabAssignment.filter(ASSIGNMENT_KIND,"-created_date",200)]);
  const labs=await Promise.all(templates.filter((t:any)=>assessGuidedTemplate(t).ready).map(async(t:any)=>({id:t.id,title:t.title,description:t.description||"",instructions:t.lab_content.tasks[0].instructions,template_hash:await hash(JSON.stringify(freezeGuidedTemplate(t)))})));
  return {labs,aws_capacity:classroom.mode==="classroom"
   ? {mode:"classroom",seats:classroom.config.seats.length,opens_at:classroom.config.opens_at,expires_at:classroom.config.expires_at}
   : {mode:classroom.mode,seats:classroom.mode==="pilot"?1:0},users:users.map((u:any)=>({id:u.id,email:u.email,name:u.full_name||u.email})),assignments:assignments.filter((a:any)=>labs.some(l=>l.id===a.lab_id)).map((a:any)=>({id:a.id,template_id:a.lab_id,user_email:a.user_email}))};
 }
 if(action==="assignLab"){
  const template=(await b.asServiceRole.entities.LabTemplate.filter({id:input.template_id}))[0];
  if(!template||!assessGuidedTemplate(template).ready)throw denied("Review a compatible AWS lab first.",409);
  if(input.template_hash!==await hash(JSON.stringify(freezeGuidedTemplate(template))))throw denied("The lab changed. Reload and review it before assigning.",409);
  const learner=(await b.asServiceRole.entities.User.filter({id:input.user_id}))[0];
  if(!learner?.email)throw denied("Select an existing app user.",400);
  const query={...ASSIGNMENT_KIND,lab_id:template.id,user_email:learner.email};
  const existing=await b.asServiceRole.entities.UserLabAssignment.filter(query);
  const assignment=existing[0]||await b.asServiceRole.entities.UserLabAssignment.create(query);
  return {assignment_id:assignment.id};
 }
 if(action==="revokeAssignment"){
  const assignment=(await b.asServiceRole.entities.UserLabAssignment.filter({id:input.assignment_id,...ASSIGNMENT_KIND}))[0];
  if(!assignment)throw denied("Assignment not found.",404);
  const template=(await b.asServiceRole.entities.LabTemplate.filter({id:assignment.lab_id}))[0];
  if(!template?.tags?.includes("aws-guided-file-v1"))throw denied("This is not an AWS guided lab assignment.");
  await b.asServiceRole.entities.UserLabAssignment.delete(assignment.id);
  return {revoked:true};
 }
 const rows=await b.asServiceRole.entities.UserLabAssignment.filter({...ASSIGNMENT_KIND,user_email:user.email},"-created_date",100);
 const [active,previous]=await Promise.all([
  b.asServiceRole.entities.CloudLearnerRun.filter({status:{$in:ACTIVE_RUN_STATUSES}},"created_date",101),
  b.asServiceRole.entities.CloudPocRun.filter({status:{$in:ACTIVE_PROOF_STATUSES}},"created_date",1),
 ]);
 const window=classroomWindow(classroom);
 const assignments=[];
 for(const row of rows){
  const template=(await b.asServiceRole.entities.LabTemplate.filter({id:row.lab_id}))[0];
  if(!template?.tags?.includes("aws-guided-file-v1"))continue;
  const seat=classroomSeat(classroom,user,row);
  let launch_blocked:string|null=null;
  if(window==="invalid")launch_blocked="AWS classroom setup needs instructor attention.";
  else if(classroom.mode==="classroom"){
   if(!seat)launch_blocked="This assignment does not have a seat in the configured AWS class.";
   else if(window==="scheduled")launch_blocked="This class has not opened yet.";
   else if(window==="ended")launch_blocked="The class lab window has ended.";
   else if(previous.length||active.length>=101||active.some((r:any)=>{
    const held=classroomRun(r.contract);
    return held?.id!==seat.id||(r.stack_name===launchScope(seat)&&r.owner_user_id!==user.id);
   }))launch_blocked="AWS capacity is still reserved by another session. Check with your instructor.";
  }
  assignments.push({id:row.id,template_id:row.lab_id,title:template.title,description:template.description||"",objectives:template.objectives||[],available:assessGuidedTemplate(template).ready,launch_blocked,classroom_id:seat?.id||null});
 }
 return {assignments,launch_mode:classroom.mode,capacity_available:classroom.mode==="pilot"?active.length===0&&!previous.length:assignments.some(a=>!a.launch_blocked)};
}
