import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";
Deno.serve(async(req)=>{
 try{
  const base44=createClientFromRequest(req),user=await base44.auth.me();
  if(!user)return Response.json({error:"Unauthorized"},{status:401});
  if(user.role!=="admin")return Response.json({error:"Administrator access is required"},{status:403});
  const {assessment_id}=await req.json();
  const rows=await base44.asServiceRole.entities.CCIAssessment.filter({id:String(assessment_id)});
  const assessment=rows[0];if(!assessment)return Response.json({error:"Assessment not found"},{status:404});
  const files=(assessment.report_files||[]).filter((f:any)=>f?.file_url);
  if(!files.length)return Response.json({queued:false,message:"No report documents were available for background evidence analysis."});
  const existing=(await base44.asServiceRole.entities.CCIEvidenceAnalysisJob.filter({assessment_id:assessment.id})).filter((j:any)=>j.status==="queued"||j.status==="processing");
  if(existing[0])return Response.json({queued:true,job:existing[0],reused:true});
  const job=await base44.asServiceRole.entities.CCIEvidenceAnalysisJob.create({assessment_id:assessment.id,organization_id:assessment.organization_id,status:"queued",file_index:0,file_count:files.length,extracted_results:[],current_file:"",error:""});
  await base44.asServiceRole.entities.CCIAssessment.update(assessment.id,{evidence_analysis_status:"queued",evidence_analysis_progress:0,evidence_analysis_message:`Queued ${files.length} report document(s) for thorough evidence analysis.`});
  return Response.json({queued:true,job});
 }catch(e){return Response.json({error:e instanceof Error?e.message:String(e)},{status:500});}
});