import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

const clean=(value:unknown,max:number)=>String(value||"").trim().slice(0,max);

Deno.serve(async(req)=>{
 try{
  const base44=createClientFromRequest(req);
  const user=await base44.auth.me();
  if(!user)return Response.json({error:"Unauthorized"},{status:401});
  const body=await req.json();
  const assessmentId=clean(body.assessment_id,100);
  if(!assessmentId)return Response.json({error:"Assessment ID is required"},{status:400});
  const assessment=await base44.asServiceRole.entities.CCIAssessment.get(assessmentId);
  if(!assessment)return Response.json({error:"Assessment not found"},{status:404});
  const ownsRecord=String(assessment.created_by_id||"")===String(user.id);
  const sharesOrganization=Boolean(user.organization_id)&&String(assessment.organization_id)===String(user.organization_id);
  if(user.role!=="admin"&&!ownsRecord&&!sharesOrganization)return Response.json({error:"You do not have permission to update this assessment"},{status:403});
  const profile={
   business_name:clean(body.business_name,200),
   business_address:clean(body.business_address,500),
   poc_name:clean(body.poc_name,200),
   poc_email:clean(body.poc_email,320),
   poc_phone:clean(body.poc_phone,80),
   profile_updated_at:new Date().toISOString(),
   profile_updated_by:String(user.id)
  };
  if(!profile.business_name||!profile.business_address||!profile.poc_name)return Response.json({error:"Business name, address, and point of contact are required"},{status:400});
  const updated=await base44.asServiceRole.entities.CCIAssessment.update(assessmentId,profile);
  const ratings=await base44.asServiceRole.entities.CCISecurityRating.filter({organization_id:assessment.organization_id});
  if(ratings[0]&&assessment.is_current_rating)await base44.asServiceRole.entities.CCISecurityRating.update(ratings[0].id,{organization_name:profile.business_name});
  return Response.json({success:true,assessment:{...assessment,...updated,...profile}});
 }catch(e){return Response.json({error:e instanceof Error?e.message:String(e)},{status:500});}
});
