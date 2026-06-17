import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Users, UserPlus, X, Search, UserCheck, ArrowRightLeft, Lock, KeyRound, Check, Crown, Building2 } from "lucide-react";

const roleColor = {
  admin: "bg-purple-100 text-purple-700 border-purple-300",
  org_admin: "bg-yellow-100 text-yellow-700 border-yellow-300",
  user: "bg-gray-100 text-gray-600 border-gray-300",
};

export default function UserManager({ selectedOrgId, onOrgChange, isPlatformAdmin, currentUser }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteOrgRole, setInviteOrgRole] = useState("member");
  const [inviting, setInviting] = useState(false);
  const [movingUserId, setMovingUserId] = useState(null);
  const [resetSentFor, setResetSentFor] = useState(null);

  const { data: orgs = [] } = useQuery({
    queryKey: ["organizations"],
    queryFn: () => base44.entities.Organization.list("-created_date"),
  });

  const { data: allUsers = [], isLoading } = useQuery({
    queryKey: ["all-users"],
    queryFn: () => base44.entities.User.list(),
  });

  const updateUserMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.User.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["all-users"] });
      setMovingUserId(null);
    },
  });

  // Org admins only see their org's users; platform admins can filter by org
  const visibleUsers = allUsers.filter((u) => {
    if (!isPlatformAdmin) {
      return u.organization_id === currentUser?.organization_id;
    }
    if (selectedOrgId === "__individual__") return !u.organization_id;
    if (selectedOrgId) return u.organization_id === selectedOrgId;
    return true;
  });

  const filteredUsers = visibleUsers.filter((u) =>
    !search ||
    u.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase())
  );

  const orgName = (orgId) => orgs.find((o) => o.id === orgId)?.name || "—";
  const orgColor = (orgId) => orgs.find((o) => o.id === orgId)?.primary_color || "#0ea5e9";

  const handleMoveOrg = (userId, newOrgId) => {
    updateUserMutation.mutate({
      id: userId,
      data: {
        organization_id: newOrgId === "__none__" ? null : newOrgId,
        is_individual: newOrgId === "__none__",
        org_role: newOrgId === "__none__" ? null : "member",
      },
    });
  };

  const handleSetOrgRole = (userId, role) => {
    updateUserMutation.mutate({ id: userId, data: { org_role: role } });
  };

  const handleResetPassword = async (email) => {
    await base44.auth.resetPasswordRequest(email);
    setResetSentFor(email);
    setTimeout(() => setResetSentFor(null), 3000);
  };

  const handleInvite = async (e) => {
    e.preventDefault();
    setInviting(true);
    await base44.users.inviteUser(inviteEmail, "user");
    setInviteEmail("");
    setShowInvite(false);
    setInviting(false);
    queryClient.invalidateQueries({ queryKey: ["all-users"] });
  };

  // ── Grouped rendering helpers ────────────────────────────────────────────────
  const colCount = isPlatformAdmin ? 5 : 5;

  const TableHead = () => (
    <thead>
      <tr className="bg-gray-100 border-b border-gray-200">
        <th className="text-left px-4 py-3 text-gray-600 font-medium">User</th>
        <th className="text-left px-4 py-3 text-gray-600 font-medium hidden md:table-cell">Role</th>
        {isPlatformAdmin && (
          <th className="text-left px-4 py-3 text-gray-600 font-medium">
            <span className="flex items-center gap-1"><ArrowRightLeft className="h-3.5 w-3.5" />Organization</span>
          </th>
        )}
        {!isPlatformAdmin && (
          <th className="text-left px-4 py-3 text-gray-600 font-medium hidden md:table-cell">Organization</th>
        )}
        <th className="text-left px-4 py-3 text-gray-600 font-medium">Org Role</th>
        <th className="px-4 py-3 text-gray-600 font-medium">Password</th>
      </tr>
    </thead>
  );

  const GroupHeader = ({ label, icon, colorClass }) => (
    <tr>
      <td colSpan={colCount} className={`px-4 py-2 text-xs font-semibold uppercase tracking-wider border-b border-gray-200 ${colorClass}`}>
        <span className="flex items-center gap-1.5">{icon}{label}</span>
      </td>
    </tr>
  );

  const UserRow = ({ user, idx }) => (
    <tr className={`border-b border-gray-200 last:border-0 ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}>
      <td className="px-4 py-3">
        <div className="font-medium text-gray-800">{user.full_name || "—"}</div>
        <div className="text-xs text-gray-500">{user.email}</div>
      </td>
      <td className="px-4 py-3 hidden md:table-cell">
        <Badge variant="outline" className={roleColor[user.role] || roleColor.user}>
          {user.role || "user"}
        </Badge>
      </td>
      {isPlatformAdmin && (
        <td className="px-4 py-3">
          <Select
            value={user.organization_id || "__none__"}
            onValueChange={(v) => handleMoveOrg(user.id, v)}
            disabled={updateUserMutation.isPending && movingUserId === user.id}
          >
            <SelectTrigger className="h-8 text-xs w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__none__">
                <span className="flex items-center gap-1.5 text-muted-foreground"><UserCheck className="h-3 w-3" /> Individual</span>
              </SelectItem>
              {orgs.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full inline-block flex-shrink-0" style={{ background: o.primary_color || "#0ea5e9" }} />
                    {o.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </td>
      )}
      {!isPlatformAdmin && (
        <td className="px-4 py-3 hidden md:table-cell">
          {user.organization_id ? (
            <span className="flex items-center gap-1.5 text-xs text-foreground">
              <span className="h-2 w-2 rounded-full inline-block flex-shrink-0" style={{ background: orgColor(user.organization_id) }} />
              {orgName(user.organization_id)}
            </span>
          ) : (
            <span className="text-xs text-gray-400">Individual</span>
          )}
        </td>
      )}
      <td className="px-4 py-3">
        {user.organization_id ? (
          <Select value={user.org_role || "member"} onValueChange={(v) => handleSetOrgRole(user.id, v)}>
            <SelectTrigger className="h-8 text-xs w-32"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="member">Member</SelectItem>
              <SelectItem value="org_admin">Org Admin</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <Button size="sm" variant="outline" className="h-8 text-xs gap-1.5"
          onClick={() => handleResetPassword(user.email)}
          disabled={resetSentFor === user.email}>
          {resetSentFor === user.email
            ? <><Check className="h-3.5 w-3.5 text-green-600" /> Sent</>
            : <><KeyRound className="h-3.5 w-3.5" /> Reset</>}
        </Button>
      </td>
    </tr>
  );

  const renderGroupedUsers = () => {
    // Owner = admin role with no org
    const ownerUser = filteredUsers.find(u => u.role === "admin" && !u.organization_id);
    const rest = filteredUsers.filter(u => !(u.role === "admin" && !u.organization_id));

    // Group rest by org
    const orgMap = {};
    rest.forEach(u => {
      const key = u.organization_id || "__none__";
      if (!orgMap[key]) orgMap[key] = [];
      orgMap[key].push(u);
    });

    const orgGroups = orgs
      .filter(o => orgMap[o.id])
      .map(o => ({ id: o.id, label: o.name, color: o.primary_color, users: orgMap[o.id] }));

    const noOrgUsers = orgMap["__none__"] || [];

    return (
      <div className="space-y-5">
        {/* Owner */}
        {ownerUser && (
          <div className="border border-yellow-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <TableHead />
              <tbody>
                <GroupHeader
                  label="Owner"
                  icon={<Crown className="h-3.5 w-3.5 text-yellow-600" />}
                  colorClass="bg-yellow-50 text-yellow-700"
                />
                <UserRow user={ownerUser} idx={0} />
              </tbody>
            </table>
          </div>
        )}

        {/* Org groups */}
        {orgGroups.map(group => (
          <div key={group.id} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <TableHead />
              <tbody>
                <GroupHeader
                  label={group.label}
                  icon={<span className="h-3 w-3 rounded-full inline-block" style={{ background: group.color || "#0ea5e9" }} />}
                  colorClass="bg-blue-50 text-blue-700"
                />
                {group.users.map((u, i) => <UserRow key={u.id} user={u} idx={i} />)}
              </tbody>
            </table>
          </div>
        ))}

        {/* No Organization */}
        {noOrgUsers.length > 0 && (
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <TableHead />
              <tbody>
                <GroupHeader
                  label="No Organization"
                  icon={<Building2 className="h-3.5 w-3.5 text-gray-500" />}
                  colorClass="bg-gray-100 text-gray-600"
                />
                {noOrgUsers.map((u, i) => <UserRow key={u.id} user={u} idx={i} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        {isPlatformAdmin && onOrgChange && (
          <Select
            value={selectedOrgId || "__all__"}
            onValueChange={(v) => onOrgChange(v === "__all__" ? null : v)}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All Organizations" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All Users</SelectItem>
              <SelectItem value="__individual__">Individual (no org)</SelectItem>
              {orgs.map((o) => (
                <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {!isPlatformAdmin && (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 bg-gray-100 text-sm text-gray-500">
            <Lock className="h-3.5 w-3.5" />
            Showing users in your organization only
          </div>
        )}

        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search by name or email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Button
          onClick={() => setShowInvite(true)}
          className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 ml-auto"
        >
          <UserPlus className="h-4 w-4" />
          Invite User
        </Button>
      </div>

      {/* Invite form */}
      {showInvite && (
        <form
          onSubmit={handleInvite}
          className="border border-blue-200 bg-blue-50 rounded-xl p-4 flex flex-wrap items-end gap-3"
        >
          <div className="space-y-1.5 flex-1 min-w-48">
            <Label>Email Address</Label>
            <Input
              required
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <div className="space-y-1.5 w-36">
            <Label>Org Role</Label>
            <Select value={inviteOrgRole} onValueChange={setInviteOrgRole}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="org_admin">Org Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={inviting} className="gap-2">
              {inviting ? "Sending…" : "Send Invite"}
            </Button>
            <Button type="button" variant="ghost" onClick={() => setShowInvite(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </form>
      )}

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="border border-dashed border-gray-300 rounded-xl p-12 text-center">
          <Users className="h-10 w-10 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-400">No users found.</p>
        </div>
      ) : renderGroupedUsers()}

      <p className="text-xs text-gray-500 text-right">
        Showing {filteredUsers.length} of {visibleUsers.length} users
        {isPlatformAdmin && allUsers.length !== visibleUsers.length && ` (${allUsers.length} total)`}
      </p>
    </div>
  );
}