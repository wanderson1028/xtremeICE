import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Assigns a user to an organization. The organization_id field is locked against
// app-user writes (only workspace editors can change it directly), so every
// assignment goes through this entitlement-checked server path.
export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const targetUserId = String(body?.user_id || '').trim();
    const organizationId = String(body?.organization_id || '').trim();
    if (!targetUserId) return Response.json({ error: 'user_id is required.' }, { status: 400 });

    const target = await base44.asServiceRole.entities.User
      .filter({ id: targetUserId })
      .then((rows) => rows[0]);
    if (!target) return Response.json({ error: 'User not found.' }, { status: 404 });

    // Platform admins may place any user in any organization. Org admins may only
    // add members to, or remove members from, their own organization.
    if (user.role !== 'admin') {
      const callerOrg = String(user.organization_id || '');
      const isOrgAdmin = user.org_role === 'org_admin' && Boolean(callerOrg);
      if (!isOrgAdmin) return Response.json({ error: 'Admin role required.' }, { status: 403 });
      if (organizationId && organizationId !== callerOrg) {
        return Response.json({ error: 'You can only assign users to your own organization.' }, { status: 403 });
      }
      if (!organizationId && String(target.organization_id || '') !== callerOrg) {
        return Response.json({ error: 'You can only remove users from your own organization.' }, { status: 403 });
      }
    }

    if (organizationId) {
      const org = await base44.asServiceRole.entities.Organization
        .filter({ id: organizationId })
        .then((rows) => rows[0]);
      if (!org) return Response.json({ error: 'Organization not found.' }, { status: 404 });
    }

    const updated = await base44.asServiceRole.entities.User.update(targetUserId, {
      organization_id: organizationId || null,
      is_individual: !organizationId,
      org_role: organizationId ? (target.org_role || 'member') : null,
    });

    return Response.json({
      success: true,
      user: { id: updated?.id || targetUserId, organization_id: organizationId || null },
    });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}