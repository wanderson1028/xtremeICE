import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

/**
 * Effective feature access for the signed-in user.
 *
 * Platform admins and tenant (org) admins manage their whole scope, so they hold
 * every feature at editor level. Everyone else gets the level stored on their
 * feature assignment — an assignment without a level keeps full use (editor).
 */
export function useFeatureAccess() {
  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const isPlatformAdmin = user?.role === "admin";
  const isTenantAdmin = !isPlatformAdmin && user?.org_role === "org_admin" && Boolean(user?.organization_id);
  const managesScope = isPlatformAdmin || isTenantAdmin;

  const { data: assignments = [] } = useQuery({
    queryKey: ["my-services", user?.email],
    queryFn: () => base44.entities.UserService.filter({ user_email: user.email }),
    enabled: !!user?.email && !managesScope,
    staleTime: 60_000,
  });

  const levels = {};
  assignments.forEach((assignment) => {
    if (assignment?.service_key) {
      levels[assignment.service_key] = assignment.access_level === "viewer" ? "viewer" : "editor";
    }
  });

  const levelFor = (serviceKey) => {
    if (managesScope) return "editor";
    return levels[serviceKey] || "none";
  };

  return {
    user,
    isPlatformAdmin,
    isTenantAdmin,
    levelFor,
    canView: (serviceKey) => levelFor(serviceKey) !== "none",
    canEdit: (serviceKey) => levelFor(serviceKey) === "editor",
  };
}