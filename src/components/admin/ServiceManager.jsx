import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, User, Settings2, X, ChevronLeft } from "lucide-react";
import LabAssignmentManager from "./LabAssignmentManager";

const ALL_SERVICES = [
  { key: "network_design_wizard",  label: "Network Design Wizard",       short: "NDW",  granular: false },
  { key: "visual_design_editor",   label: "Visual Design Editor",        short: "VDE",  granular: false },
  { key: "cyber_range",            label: "Cyber Range (Red vs. Blue)",  short: "RvB",  granular: false },
  { key: "soc_training",           label: "SOC Response Drills",         short: "SOCT", granular: true  },
  { key: "soc_assessments",        label: "SOC Assessments",             short: "SOCA", granular: true  },
  { key: "lab_scenarios",          label: "Active Labs",                 short: "ALabs", granular: true  },
  { key: "course_lab_builder",     label: "Course Lab Builder",          short: "CLB",  granular: false },
];

export default function ServiceManager() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState({});
  const [managingUser, setManagingUser] = useState(null); // user whose labs we're managing

  const { data: users = [] } = useQuery({
    queryKey: ["all-users"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["user-services"],
    queryFn: () => base44.entities.UserService.list(),
  });

  const assign = useMutation({
    mutationFn: ({ user_email, service_key }) =>
      base44.entities.UserService.create({ user_email, service_key }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-services"] }),
  });

  const revoke = useMutation({
    mutationFn: (id) => base44.entities.UserService.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-services"] }),
  });

  const filteredUsers = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return u.full_name?.toLowerCase().includes(q) || u.email?.toLowerCase().includes(q);
  });

  const getAssignment = (email, serviceKey) =>
    assignments.find((a) => a.user_email === email && a.service_key === serviceKey);

  const handleToggle = async (user, serviceKey, isOn) => {
    const key = `${user.email}__${serviceKey}`;
    setPending((p) => ({ ...p, [key]: true }));
    try {
      if (isOn) {
        await assign.mutateAsync({ user_email: user.email, service_key: serviceKey });
      } else {
        const existing = getAssignment(user.email, serviceKey);
        if (existing) await revoke.mutateAsync(existing.id);
      }
    } finally {
      setPending((p) => { const n = { ...p }; delete n[key]; return n; });
    }
  };

  const countAssigned = (email) =>
    assignments.filter((a) => a.user_email === email).length;

  const getEnabledKeys = (email) =>
    assignments.filter(a => a.user_email === email).map(a => a.service_key);

  // ── Lab Assignment panel ─────────────────────────────────────────────────────
  if (managingUser) {
    const enabledServiceKeys = getEnabledKeys(managingUser.email);
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setManagingUser(null)}
            className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ChevronLeft className="h-4 w-4" /> Back to Feature Access
          </button>
        </div>
        <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
          <div className="h-8 w-8 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
            <User className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">{managingUser.full_name || "—"}</p>
            <p className="text-xs text-gray-500">{managingUser.email}</p>
          </div>
          <Badge variant="outline" className="ml-auto text-xs">
            {enabledServiceKeys.length} service{enabledServiceKeys.length !== 1 ? "s" : ""} enabled
          </Badge>
        </div>
        <LabAssignmentManager user={managingUser} enabledServiceKeys={enabledServiceKeys} />
      </div>
    );
  }

  // ── Main table ───────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Feature Access</h2>
          <p className="text-sm text-gray-500">Toggle features on/off per user. Use <Settings2 className="inline h-3.5 w-3.5" /> to assign individual labs for training features.</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[800px]">
          <thead>
            <tr className="bg-gray-100 border-b border-gray-200">
              <th className="text-left px-4 py-3 text-gray-600 font-medium w-52">User</th>
              {ALL_SERVICES.map((s) => (
                <th key={s.key} className="text-center px-2 py-3 text-gray-600 font-medium">
                  <span className="hidden lg:block text-xs leading-tight">{s.label}</span>
                  <span className="lg:hidden text-xs">{s.short}</span>
                </th>
              ))}
              <th className="text-center px-3 py-3 text-gray-600 font-medium text-xs">Assigned</th>
              <th className="text-center px-3 py-3 text-gray-600 font-medium text-xs">Labs</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={ALL_SERVICES.length + 3} className="text-center py-12 text-gray-400">
                  No users found.
                </td>
              </tr>
            ) : (
              filteredUsers.map((user, idx) => {
                const enabledKeys = getEnabledKeys(user.email);
                const hasGranular = ALL_SERVICES.some(s => s.granular && enabledKeys.includes(s.key));
                return (
                  <tr
                    key={user.id}
                    className={`border-b border-gray-200 last:border-0 transition-colors ${idx % 2 === 0 ? "bg-white" : "bg-gray-50"}`}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
                          <User className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">{user.full_name || "—"}</p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                      </div>
                    </td>

                    {ALL_SERVICES.map((svc) => {
                      const assignment = getAssignment(user.email, svc.key);
                      const isOn = !!assignment;
                      const isPend = !!pending[`${user.email}__${svc.key}`];
                      return (
                        <td key={svc.key} className="text-center px-2 py-3">
                          <div className="flex justify-center">
                            <Switch
                              checked={isOn}
                              disabled={isPend}
                              onCheckedChange={(val) => handleToggle(user, svc.key, val)}
                              className={isPend ? "opacity-50" : ""}
                            />
                          </div>
                        </td>
                      );
                    })}

                    <td className="text-center px-3 py-3">
                      <Badge
                        variant={countAssigned(user.email) > 0 ? "default" : "secondary"}
                        className="text-xs"
                      >
                        {countAssigned(user.email)}/{ALL_SERVICES.length}
                      </Badge>
                    </td>

                    <td className="text-center px-3 py-3">
                      {hasGranular ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          title="Manage lab assignments"
                          onClick={() => setManagingUser(user)}
                        >
                          <Settings2 className="h-3.5 w-3.5 text-blue-600" />
                        </Button>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-gray-400 text-right">
        {filteredUsers.length} user{filteredUsers.length !== 1 ? "s" : ""} shown
      </p>
    </div>
  );
}