import { createClientFromRequest } from "npm:@base44/sdk@0.8.40";

Deno.serve(async(req)=>{
 try{
  const base44=createClientFromRequest(req);
  const user=await base44.auth.me();
  if(!user)return Response.json({error:"Unauthorized"},{status:401});
  const body=await req.json().catch(()=>({}));
  const requested=String(body.organization_id||"").trim();
  let rows;
  if(user.role==="admin"){
   rows=requested?await base44.asServiceRole.entities.CCIAssessment.filter({organization_id:requested}):await base44.asServiceRole.entities.CCIAssessment.list("-created_date",250);
  }else{
   const orgId=String(user.organization_id||`individual:${user.id}`);
   rows=await base44.asServiceRole.entities.CCIAssessment.filter({organization_id:orgId});
  }
  const completed=(rows||[]).filter((r:any)=>r.status==="completed").sort((a:any,b:any)=>new Date(b.analyzed_at||b.created_date||0).getTime()-new Date(a.analyzed_at||a.created_date||0).getTime()).slice(0,250);
  return Response.json({success:true,assessments:completed,organizations:Array.from(new Map(completed.map((r:any)=>[r.organization_id,{id:r.organization_id,name:r.business_name||"Unnamed organization"}])).values())});
 }catch(e){return Response.json({error:e instanceof Error?e.message:String(e)},{status:500});}
});