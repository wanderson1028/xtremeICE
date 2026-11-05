import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";
import { sweepExpiredLearners } from "./expiry.ts";
Deno.serve(async (req) => {
 const b = createClientFromRequest(req);
 const user = await b.auth.me().catch(() => null);
 if (!user || user.role !== "admin") return Response.json({error:"Administrator access required"},{status:403});
 try {
  const data = await sweepExpiredLearners(b);
  return Response.json(data,{status:data.errors.length ? 502 : 200});
 } catch (error: any) {
  return Response.json({error:"Expiry sweep failed",error_code:String(error?.name || "EXPIRY_SWEEP_FAILED").slice(0,80)},{status:502});
 }
});
