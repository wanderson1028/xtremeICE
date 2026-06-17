import React from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Pencil, Users, Trash2, Globe, Building2, Lock } from "lucide-react";

const planColor = {
  free: "bg-secondary text-secondary-foreground",
  pro: "bg-blue-900/30 text-blue-300 border-blue-800",
  enterprise: "bg-yellow-900/30 text-yellow-300 border-yellow-800",
};

const statusColor = {
  active: "bg-green-900/30 text-green-300 border-green-800",
  suspended: "bg-red-900/30 text-red-300 border-red-800",
  trial: "bg-orange-900/30 text-orange-300 border-orange-800",
};

export default function OrgList({ onEdit, onManageUsers, isPlatformAdmin, lockedOrgId }) {
  const queryClient = useQueryClient();

  const { data: orgs = [], isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => base44.entities.Organization.list("-created_date"),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ["all-users"],
    queryFn: () => base44.entities.User.list(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Organization.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["organizations"] }),
  });

  const userCountForOrg = (orgId) =>
    allUsers.filter((u) => u.organization_id === orgId).length;

  // Org admins only see their own org
  const visibleOrgs = lockedOrgId
    ? orgs.filter((o) => o.id === lockedOrgId)
    : orgs;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (visibleOrgs.length === 0) {
    return (
      <div className="border border-dashed border-border rounded-xl p-12 text-center">
        <Building2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
        <p className="text-muted-foreground">
          {isPlatformAdmin ? "No organizations yet. Create your first one." : "Your organization was not found."}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Org admin scope notice */}
      {!isPlatformAdmin && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-secondary/50 text-sm text-muted-foreground w-fit">
          <Lock className="h-3.5 w-3.5" />
          You can edit your organization's branding and settings, but cannot create or delete organizations.
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visibleOrgs.map((org) => (
          <Card key={org.id} className="bg-card border border-border p-5 flex flex-col gap-4">
            {/* Header */}
            <div className="flex items-start gap-3">
              {org.logo_url ? (
                <img
                  src={org.logo_url}
                  alt={org.name}
                  className="h-12 w-12 rounded-lg object-contain bg-secondary border border-border"
                />
              ) : (
                <div
                  className="h-12 w-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
                  style={{ backgroundColor: org.primary_color || "#0ea5e9" }}
                >
                  {org.name.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-foreground truncate">{org.name}</h3>
                {org.slug && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                    <Globe className="h-3 w-3" />
                    {org.slug}
                  </p>
                )}
              </div>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className={planColor[org.plan] || planColor.free}>
                {org.plan || "free"}
              </Badge>
              <Badge variant="outline" className={statusColor[org.status] || statusColor.active}>
                {org.status || "active"}
              </Badge>
              <Badge variant="outline" className="flex items-center gap-1 text-xs">
                <Users className="h-3 w-3" />
                {userCountForOrg(org.id)} users
              </Badge>
            </div>

            {/* Description */}
            {org.description && (
              <p className="text-xs text-muted-foreground line-clamp-2">{org.description}</p>
            )}

            {/* Owner */}
            {org.owner_email && (
              <p className="text-xs text-muted-foreground">
                Owner: <span className="text-foreground">{org.owner_email}</span>
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 mt-auto pt-2 border-t border-border">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 gap-1 text-xs"
                onClick={() => onManageUsers(org.id)}
              >
                <Users className="h-3 w-3" />
                Manage Users
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1 text-xs"
                onClick={() => onEdit(org)}
              >
                <Pencil className="h-3 w-3" />
                Edit
              </Button>
              {/* Delete — platform admin only */}
              {isPlatformAdmin && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1 text-xs text-destructive hover:text-destructive"
                  onClick={() => {
                    if (confirm(`Delete "${org.name}"? This cannot be undone.`)) {
                      deleteMutation.mutate(org.id);
                    }
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}