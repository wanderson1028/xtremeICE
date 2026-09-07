import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const MAX_AGE_DAYS = 7;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me().catch(() => null);
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000).toISOString();

    // Count matching designs first (capped for reporting)
    const oldDesigns = await base44.asServiceRole.entities.NetworkDesign.filter(
      { created_date: { $lt: cutoff } },
      '-created_date',
      500
    );

    if (oldDesigns.length === 0) {
      return Response.json({ expired: 0, cutoff });
    }

    // Delete all designs older than the cutoff in one call
    await base44.asServiceRole.entities.NetworkDesign.deleteMany({
      created_date: { $lt: cutoff }
    });

    return Response.json({
      expired: oldDesigns.length,
      cutoff,
      has_more: oldDesigns.length === 500
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}