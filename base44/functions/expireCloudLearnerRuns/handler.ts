import { saveExpiryHealth } from "./health.ts";

export async function handleExpiryRequest(base44:any,deps:any={}) {
 const user=await base44.auth.me().catch(()=>null);
 if(!user||user.role!=="admin")return Response.json({error:"Administrator access required"},{status:403});
 let response:Response,observation:any;
 try{
  const result=await base44.functions.invoke("cloudLearnerAWS",{action:"sweepExpired"});
  const data=result.data??result;
  if(!Number.isInteger(data?.scanned)||data.scanned<0){
   observation={outcome:"failed",error_code:"INVALID_SWEEP_RESULT"};
   response=Response.json({error:"Expiry sweep returned no result"},{status:502});
  }else if(data.errors?.length){
   observation={outcome:"failed",error_code:"EXPIRY_SWEEP_PARTIAL_FAILURE",scanned:data.scanned,pending:data.pending,verified_terminated:data.verified_terminated};
   response=Response.json({error:"Expiry sweep needs operator attention",checked_at:data.checked_at,scanned:data.scanned,errors:data.errors},{status:502});
  }else{
   observation={outcome:"success",scanned:data.scanned,pending:data.pending,verified_terminated:data.verified_terminated};
   response=Response.json(data);
  }
 }catch(error:any){
  observation={outcome:"failed",error_code:"EXPIRY_SWEEP_FAILED"};
  response=Response.json({error:"Expiry sweep failed",error_code:String(error?.name||"EXPIRY_SWEEP_FAILED").slice(0,80)},{status:502});
 }
 try{await (deps.saveHealth||saveExpiryHealth)(base44,observation,deps.clock||Date.now);}
 catch{console.warn("Expiry heartbeat could not be saved");}
 return response;
}
