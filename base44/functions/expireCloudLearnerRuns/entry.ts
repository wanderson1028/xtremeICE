import { createClientFromRequest } from "npm:@base44/sdk@0.8.31";

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me().catch(() => null);
  if (!user || user.role !== "admin") return Response.json({ error: "Administrator access required" }, { status: 403 });
  try {
    const result = await base44.functions.invoke("cloudLearnerAWS", { action: "sweepExpired" });
    return Response.json(result.data ?? result);
  } catch (error: any) {
    return Response.json({ error: "Expiry sweep failed", error_code: String(error?.name || "EXPIRY_SWEEP_FAILED").slice(0, 80) }, { status: 502 });
  }
});
