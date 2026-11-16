import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, Eye, Pencil, ShieldOff, User } from "lucide-react";

const LEVEL_OPTIONS = [
  { value: "none", label: "No access" },
  { value: "viewer", label: "Viewer · read-only" },
  { value: "editor", label: "Editor · create & edit" },
];

const LEVEL_BADGE = {
  editor: "bg-green-100 text-green-700 border-green-300",
  viewer: "bg-blue-100 text-blue-700 border-blue-300",
  none: "bg-gray-100 text-gray-500 border-gray-300",
};

/** Per-user feature permissions: assign a feature at editor or viewer level. */
export default function UserFeatureAccess({ user, services, assignments, onBack }) {
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const save = useMutation({
    mutationFn: ({ service_key, access_level }) =>
      base44.functions.invoke("manageTenantAccess", {
        action: "set_feature_access",
        user_email: user.email,
        service_key,
        access_level: access_level === "none" ? null : access_level,
      }),
    onSuccess: () => {
      setError("");
      queryClient.invalidateQueries({ queryKey: ["tenant-access"] });
      queryClient.invalidateQueries({ queryKey: ["user-services"] });
    },
    onError: (err) => setError(err?.response?.data?.error || err?.message || "Could not save that change."),
  });

  const levelFor = (serviceKey) => {
    const row = assignments.find((a) => a.user_email === user.email && a.service_key === serviceKey);
    if (!row) return "none";
    return row.access_level === "viewer" ? "viewer" : "editor";
  };

  const assignedCount = services.filter((service) => levelFor(service.key) !== "none").length;

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ChevronLeft className="h-4 w-4" /> Back to users
      </button>

      <div className="flex items-center gap-3 pb-4 border-b border-gray-200">
        <div className="h-9 w-9 rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center shrink-0">
          <User className="h-4 w-4 text-blue-600" />
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-gray-900 truncate">{user.full_name || "—"}</p>
          <p className="text-xs text-gray-500 truncate">{user.email}</p>
        </div>
        <Badge variant="outline" className="ml-auto text-xs">
          {assignedCount} feature{assignedCount !== 1 ? "s" : ""} assigned
        </Badge>
      </div>

      <p className="text-sm text-gray-500">
        Editors can create and change records inside a feature. Viewers see the feature but cannot change anything.
      </p>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>
      )}

      <div className="rounded-xl border border-gray-200 divide-y divide-gray-200 overflow-hidden">
        {services.map((service) => {
          const level = levelFor(service.key);
          const isSaving = save.isPending && save.variables?.service_key === service.key;
          return (
            <div key={service.key} className="flex flex-wrap items-center gap-3 px-4 py-3 bg-white">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-800 truncate">{service.label}</p>
                <p className="text-[11px] text-gray-400">{service.key}</p>
              </div>

              <Badge variant="outline" className={`hidden sm:inline-flex gap-1 ${LEVEL_BADGE[level]}`}>
                {level === "editor" ? <Pencil className="h-3 w-3" /> : level === "viewer" ? <Eye className="h-3 w-3" /> : <ShieldOff className="h-3 w-3" />}
                {level === "none" ? "Not assigned" : level}
              </Badge>

              <Select
                value={level}
                disabled={isSaving}
                onValueChange={(value) => save.mutate({ service_key: service.key, access_level: value })}
              >
                <SelectTrigger className="h-8 w-52 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LEVEL_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={onBack}>
          Done
        </Button>
      </div>
    </div>
  );
}