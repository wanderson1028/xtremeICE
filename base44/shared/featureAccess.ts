/**
 * Tenant + feature permission model.
 *
 * Three levels of access, in order:
 *  - Platform admin  (User.role === "admin")          → everything, every tenant.
 *  - Tenant admin    (User.org_role === "org_admin")  → everything inside their organization.
 *  - Standard user   (org_role === "member")          → only the features assigned to them,
 *                                                       at the level stored on the assignment.
 *
 * A feature assignment (UserService) carries access_level "editor" or "viewer".
 * Assignments created before this field existed have no value and keep their
 * previous meaning, which was full use of the feature, so they resolve to "editor".
 */
export type AccessLevel = "editor" | "viewer";

export const ACCESS_LEVELS: AccessLevel[] = ["editor", "viewer"];

export function normalizeLevel(value: unknown): AccessLevel {
  return String(value) === "viewer" ? "viewer" : "editor";
}

export function isPlatformAdmin(user: any): boolean {
  return user?.role === "admin";
}

export function isTenantAdmin(user: any): boolean {
  return !isPlatformAdmin(user) && user?.org_role === "org_admin" && Boolean(user?.organization_id);
}

/** Admins at either level manage their scope, so they hold every feature. */
export function managesScope(user: any): boolean {
  return isPlatformAdmin(user) || isTenantAdmin(user);
}

/** Feature key → level assigned to this user. */
export async function loadFeatureLevels(base44: any, email: string): Promise<Record<string, AccessLevel>> {
  const levels: Record<string, AccessLevel> = {};
  if (!email) return levels;
  const rows = await base44.asServiceRole.entities.UserService.filter({ user_email: email });
  for (const row of rows || []) {
    if (row?.service_key) levels[row.service_key] = normalizeLevel(row.access_level);
  }
  return levels;
}

/** True when the user may create and change records inside the feature. */
export async function canEditFeature(base44: any, user: any, serviceKey: string): Promise<boolean> {
  if (managesScope(user)) return true;
  const levels = await loadFeatureLevels(base44, user?.email);
  return levels[serviceKey] === "editor";
}