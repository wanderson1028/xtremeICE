import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ShieldOff } from "lucide-react";

/**
 * Wraps a page/component and blocks access if the feature flag is disabled.
 * Admins always bypass the gate.
 * Usage: <FeatureGate flagKey="soc_training"><SOCTraining /></FeatureGate>
 */
export default function FeatureGate({ flagKey, children }) {
  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
    staleTime: 60_000,
  });

  const { data: flags = [], isLoading } = useQuery({
    queryKey: ["feature-flags-all"],
    queryFn: () => base44.entities.FeatureFlag.list(),
    staleTime: 60_000,
    retry: false,
    enabled: me?.role !== "admin",
  });

  // Admins always pass through
  if (me?.role === "admin") return <>{children}</>;

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gray-950">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  const flag = flags.find((f) => f.key === flagKey);
  const isEnabled = flag?.is_enabled === true;

  if (!isEnabled) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-md px-6">
          <ShieldOff className="h-16 w-16 text-red-500 mx-auto" />
          <h2 className="text-2xl font-bold text-white">Feature Unavailable</h2>
          <p className="text-gray-400">
            This feature is currently disabled. Please contact your administrator.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}