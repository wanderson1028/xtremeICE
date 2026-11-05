export async function handleExpiryRequest(base44:any) {
 const user=await base44.auth.me().catch(()=>null);
 if(!user||user.role!=="admin")return Response.json({error:"Administrator access required"},{status:403});
 try{
  const result=await base44.functions.invoke("cloudLearnerAWS",{action:"sweepExpired"});
  const data=result.data??result;
  if(!Number.isInteger(data?.scanned)||data.scanned<0)return Response.json({error:"Expiry sweep returned no result"},{status:502});
  if(data.errors?.length)return Response.json({error:"Expiry sweep needs operator attention",checked_at:data.checked_at,scanned:data.scanned,errors:data.errors},{status:502});
  return Response.json(data);
 }catch(error:any){return Response.json({error:"Expiry sweep failed",error_code:String(error?.name||"EXPIRY_SWEEP_FAILED").slice(0,80)},{status:502});}
}
