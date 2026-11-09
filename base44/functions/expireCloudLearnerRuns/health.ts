export const EXPIRY_SIGNAL_KEY = "cloud-learner-aws-expiry-v1";

export async function saveExpiryHealth(base44:any, observation:any, clock=Date.now) {
 const entity=base44.asServiceRole.entities.CloudLearnerExpiryHealth;
 const previous=await entity.filter({signal_key:EXPIRY_SIGNAL_KEY},"-checked_at",1);
 const record={
  signal_key:EXPIRY_SIGNAL_KEY,
  checked_at:new Date(clock()).toISOString(),
  outcome:observation.outcome==="success"?"success":"failed",
  scanned:Number.isInteger(observation.scanned)&&observation.scanned>=0?observation.scanned:0,
  pending:Number.isInteger(observation.pending)&&observation.pending>=0?observation.pending:0,
  verified_terminated:Number.isInteger(observation.verified_terminated)&&observation.verified_terminated>=0?observation.verified_terminated:0,
  error_code:observation.outcome==="success"?"":String(observation.error_code||"EXPIRY_SWEEP_FAILED").replace(/[^A-Z0-9_]/gi,"_").slice(0,60),
 };
 if(previous[0]?.id)await entity.update(previous[0].id,record);
 else await entity.create(record);
 return record;
}
