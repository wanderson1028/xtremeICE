import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Utility backend function: checks if a feature flag is enabled.
 * Call from other backend functions via:
 *   const res = await base44.functions.invoke('checkFeatureFlag', { key: 'soc_training' });
 *   if (!res.enabled) return Response.json({ error: 'Feature disabled' }, { status: 403 });
 *
 * Also callable directly from frontend to check gate before submitting forms.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    // Admins always pass
    if (user.role === 'admin') {
      return Response.json({ enabled: true, bypass: true });
    }

    const { key } = await req.json();
    if (!key) return Response.json({ error: 'Missing flag key' }, { status: 400 });

    const flags = await base44.asServiceRole.entities.FeatureFlag.filter({ key });
    const flag = flags[0];

    if (!flag || flag.is_enabled !== true) {
      return Response.json({ enabled: false }, { status: 403 });
    }

    return Response.json({ enabled: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});