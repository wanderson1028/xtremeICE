import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

Deno.serve(async(req)=>{
 try{
  const base44=createClientFromRequest(req);
  const user=await base44.auth.me();
  if(!user)return Response.json({error:"Unauthorized"},{status:401});
  const {assessment_id}=await req.json();
  if(!assessment_id)return Response.json({error:"Assessment ID is required"},{status:400});
  const assessment=await base44.asServiceRole.entities.CCIAssessment.get(String(assessment_id));
  if(!assessment)return Response.json({error:"Assessment not found"},{status:404});
  const ownsRecord=String(assessment.created_by_id||"")===String(user.id);
  const sharesOrganization=Boolean(user.organization_id)&&String(assessment.organization_id)===String(user.organization_id);
  if(user.role!=="admin"&&!ownsRecord&&!sharesOrganization)return Response.json({error:"You do not have permission to delete this result"},{status:403});
  await base44.asServiceRole.entities.CCIAssessment.delete(assessment.id);
  let replacement:any=null;
  if(assessment.is_current_rating){
   const remaining=await base44.asServiceRole.entities.CCIAssessment.filter({organization_id:assessment.organization_id,status:"completed"},"-analyzed_at",100);
   replacement=remaining.find((row:any)=>row.id!==assessment.id&&row.is_current_rating);
   const ratings=await base44.asServiceRole.entities.CCISecurityRating.filter({organization_id:assessment.organization_id});
   if(replacement){
    const rating={organization_id:replacement.organization_id,organization_name:replacement.business_name,vulscan_score:replacement.vulnerability_score,vpentest_score:replacement.penetration_test_score,vulscan_source:"api",vpentest_source:"api",baseline_score:replacement.baseline_score,final_score:replacement.final_score,rating_band:replacement.rating_band,score_change:replacement.score_change,factors:replacement.scoring_breakdown?.rating||{},calculation_version:replacement.calculation_version,calculated_at:replacement.analyzed_at,external_references:{cci_assessment_id:replacement.id,source_mode:replacement.source_mode||"upload"}};
    if(ratings[0])await base44.asServiceRole.entities.CCISecurityRating.update(ratings[0].id,rating);else await base44.asServiceRole.entities.CCISecurityRating.create(rating);
   }else if(ratings[0])await base44.asServiceRole.entities.CCISecurityRating.delete(ratings[0].id);
  }
  return Response.json({success:true,deleted_id:assessment.id,replacement_id:replacement?.id||null});
 }catch(e){return Response.json({error:e instanceof Error?e.message:String(e)},{status:500});}
});
