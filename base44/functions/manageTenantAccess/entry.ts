import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Single server path for tenant user administration:
//  - list_assignments    → feature assignments for the users in the caller's scope
//  - set_feature_access  → assign a feature at editor or viewer level (null removes it)
//  - set_org_role        → standard user or tenant admin inside the caller's scope
// Platform admins act on every tenant; tenant admins are confined to their own.
const LEVELS = new Set(['editor', 'viewer']);
const ORG_ROLES = new Set(['org_admin', 'member']);

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((error) => (error?.status === 401 ? null : Promise.reject(error)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const platformAdmin = user.role === 'admin';
    const callerOrg = String(user.organization_id || '');
    const tenantAdmin = !platformAdmin && user.org_role === 'org_admin' && Boolean(callerOrg);
    if (!platformAdmin && !tenantAdmin) {
      return Response.json({ error: 'Admin role required.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const action = String(body?.action || '');

    const users = await base44.asServiceRole.entities.User.list().catch(() => []);

    // Which users may this caller touch?
    const inScope = (target: any) => {
      if (platformAdmin) return true;
      if (!target) return false;
      if (target.role === 'admin') return false; // tenant admins never change platform admins
      return String(target.organization_id || '') === callerOrg;
    };
    const findUser = (match: (candidate: any) => boolean) => users.find(match) || null;

    if (action === 'list_assignments') {
      const orgFilter = platformAdmin ? String(body?.organization_id || '') : callerOrg;
      const emails = new Set(
        users
          .filter((candidate) => (!orgFilter || String(candidate.organization_id || '') === orgFilter))
          .map((candidate) => String(candidate.email || '').toLowerCase())
          .filter(Boolean)
      );
      const rows = await base44.asServiceRole.entities.UserService.list().catch(() => []);
      const assignments = rows
        .filter((row) => emails.has(String(row.user_email || '').toLowerCase()))
        .map((row) => ({
          id: row.id,
          user_email: row.user_email,
          service_key: row.service_key,
          access_level: row.access_level === 'viewer' ? 'viewer' : 'editor',
        }));
      return Response.json({ success: true, assignments });
    }

    if (action === 'set_feature_access') {
      const email = String(body?.user_email || '').trim();
      const serviceKey = String(body?.service_key || '').trim();
      const rawLevel = body?.access_level;
      const level = rawLevel === null || rawLevel === undefined || rawLevel === '' ? null : String(rawLevel);
      if (!email || !serviceKey) return Response.json({ error: 'user_email and service_key are required.' }, { status: 400 });
      if (level !== null && !LEVELS.has(level)) {
        return Response.json({ error: 'access_level must be editor, viewer, or null.' }, { status: 400 });
      }

      const target = findUser((candidate) => String(candidate.email || '').toLowerCase() === email.toLowerCase());
      if (!target) return Response.json({ error: 'User not found.' }, { status: 404 });
      if (!inScope(target)) {
        return Response.json({ error: 'You can only manage access for members of your own organization.' }, { status: 403 });
      }

      const existing = await base44.asServiceRole.entities.UserService
        .filter({ user_email: target.email, service_key: serviceKey })
        .then((rows) => rows?.[0] || null);

      if (level === null) {
        if (existing) await base44.asServiceRole.entities.UserService.delete(existing.id);
        return Response.json({ success: true, user_email: target.email, service_key: serviceKey, access_level: null });
      }
      if (existing) {
        await base44.asServiceRole.entities.UserService.update(existing.id, { access_level: level });
      } else {
        await base44.asServiceRole.entities.UserService.create({
          user_email: target.email,
          service_key: serviceKey,
          access_level: level,
        });
      }
      return Response.json({ success: true, user_email: target.email, service_key: serviceKey, access_level: level });
    }

    if (action === 'set_org_role') {
      const targetUserId = String(body?.user_id || '').trim();
      const orgRole = String(body?.org_role || '').trim();
      if (!targetUserId || !ORG_ROLES.has(orgRole)) {
        return Response.json({ error: 'user_id and org_role (org_admin or member) are required.' }, { status: 400 });
      }
      const target = findUser((candidate) => candidate.id === targetUserId);
      if (!target) return Response.json({ error: 'User not found.' }, { status: 404 });
      if (!inScope(target)) {
        return Response.json({ error: 'You can only change roles for members of your own organization.' }, { status: 403 });
      }
      if (orgRole === 'org_admin' && !String(target.organization_id || '')) {
        return Response.json({ error: 'Only members of an organization can be tenant admins.' }, { status: 400 });
      }
      const updated = await base44.asServiceRole.entities.User.update(target.id, { org_role: orgRole });
      return Response.json({ success: true, user: { id: updated?.id || target.id, org_role: orgRole } });
    }

    return Response.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}