import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

Deno.serve(async (request) => {
  const base44 = createClientFromRequest(request);
  const user = await base44.auth.me().catch(() => null);
  if (!user || user.role !== "admin") {
    return Response.json({ error: "Administrator access required." }, { status: 403 });
  }
  try {
    const reply = await base44.functions.invoke("kasmProvider", { action: "sweep" });
    const body = reply?.data ?? reply;
    const totals = body?.data;
    if (!body.success || !Number.isInteger(totals?.scanned) || totals.scanned < 0 || totals.failed > 0) {
      return Response.json({ error: "Kasm expiry needs operator review.", scanned: totals?.scanned, failed: totals?.failed }, { status: 502 });
    }
    return Response.json(totals);
  } catch {
    return Response.json({ error: "Kasm expiry could not be completed." }, { status: 502 });
  }
});
