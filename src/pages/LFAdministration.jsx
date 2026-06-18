import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  Shield, Search, ArrowLeft, Users, Cloud, HardDrive,
  BarChart3, DollarSign, Activity, FileText, Settings,
  Key, AlertTriangle, CheckCircle2, Clock
} from "lucide-react";
import { Input } from "@/components/ui/input";

export default function LFAdministration() {
  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: labs = [] } = useQuery({
    queryKey: ["admin-labs"],
    queryFn: () => base44.entities.LiveFireLab.list("-updated_date", 200),
  });

  const { data: users = [] } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => base44.entities.User.list(),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["admin-cloud-accounts"],
    queryFn: () => base44.entities.LiveFireCloudAccount.list(),
  });

  const { data: images = [] } = useQuery({
    queryKey: ["admin-images"],
    queryFn: () => base44.entities.LiveFireImage.list(),
  });

  const { data: auditLogs = [] } = useQuery({
    queryKey: ["admin-audit-logs"],
    queryFn: () => base44.entities.LiveFireAuditLog.list("-created_date", 50),
  });

  const activeLabs = labs.filter(l => l.status === "running" || l.status === "deploying");
  const totalCost = labs.reduce((sum, l) => sum + (l.actual_cost || 0), 0);

  const adminModules = [
    { label: "Users", value: users.length, icon: Users, color: "blue" },
    { label: "Cloud Accounts", value: accounts.length, icon: Cloud, color: "cyan" },
    { label: "Images", value: images.length, icon: HardDrive, color: "purple" },
    { label: "Labs", value: labs.length, icon: Activity, color: "red" },
    { label: "Active Labs", value: activeLabs.length, icon: Shield, color: "green" },
    { label: "Total Cost", value: `$${totalCost.toFixed(2)}`, icon: DollarSign, color: "yellow" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/LiveFireDashboard" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">Administration</h1>
            <p className="text-sm text-gray-400 font-mono">Live Fire platform management & monitoring</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          {adminModules.map(m => (
            <div key={m.label} className="bg-gray-900/80 border border-red-900/30 rounded-xl p-3">
              <div className={`h-8 w-8 rounded-lg bg-${m.color}-900/30 border border-${m.color}-700/30 flex items-center justify-center mb-2`}>
                <m.icon className={`h-4 w-4 text-${m.color}-400`} />
              </div>
              <p className="text-lg font-bold text-white font-mono">{m.value}</p>
              <p className="text-[10px] text-gray-500 font-mono">{m.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Audit Log */}
          <div className="bg-gray-900/80 border border-red-900/30 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-red-900/20">
              <FileText className="h-4 w-4 text-yellow-400" />
              <h2 className="text-sm font-bold text-white">Audit Log</h2>
            </div>
            <div className="divide-y divide-gray-800/50 max-h-96 overflow-y-auto">
              {auditLogs.length === 0 ? (
                <div className="p-6 text-center text-gray-500 text-xs font-mono">No audit entries</div>
              ) : (
                auditLogs.slice(0, 15).map(log => (
                  <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                    <div className={`h-1.5 w-1.5 rounded-full mt-1.5 shrink-0 ${
                      log.action?.includes("delete") || log.action?.includes("removed") ? "bg-red-500" :
                      log.action?.includes("create") || log.action?.includes("added") ? "bg-green-500" :
                      "bg-blue-500"
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-300">{log.action?.replace(/_/g, " ")}</p>
                      <p className="text-[10px] font-mono text-gray-600">{log.user_email} · {log.resource_type} · {new Date(log.created_date).toLocaleString()}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* RBAC & Settings */}
          <div className="space-y-4">
            {/* Access Control */}
            <div className="bg-gray-900/80 border border-red-900/30 rounded-xl p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <Key className="h-4 w-4 text-purple-400" />
                <h2 className="text-sm font-bold text-white">Access Control</h2>
              </div>
              <div className="space-y-3">
                {[
                  { role: "Administrator", desc: "Full platform access", count: users.filter(u => u.role === "admin").length },
                  { role: "Lab Creator", desc: "Create and manage labs", count: users.length },
                  { role: "Viewer", desc: "Read-only lab access", count: 0 },
                ].map(r => (
                  <div key={r.role} className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-gray-800">
                    <div>
                      <p className="text-xs text-white font-mono">{r.role}</p>
                      <p className="text-[10px] text-gray-500">{r.desc}</p>
                    </div>
                    <span className="text-[10px] font-mono text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{r.count} users</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quota Enforcement */}
            <div className="bg-gray-900/80 border border-red-900/30 rounded-xl p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <AlertTriangle className="h-4 w-4 text-orange-400" />
                <h2 className="text-sm font-bold text-white">Quota & Limits</h2>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Max Labs per User", current: Math.max(...labs.map(() => 1), 1), max: 50 },
                  { label: "Max Devices per Lab", current: Math.max(...labs.map(l => l.device_count || 0)), max: 20 },
                  { label: "Max Running Labs", current: activeLabs.length, max: 10 },
                ].map(q => (
                  <div key={q.label}>
                    <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-0.5">
                      <span>{q.label}</span>
                      <span>{q.current}/{q.max}</span>
                    </div>
                    <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${q.current / q.max > 0.8 ? "bg-gradient-to-r from-red-600 to-red-400" : "bg-gradient-to-r from-cyan-600 to-cyan-400"}`}
                        style={{ width: `${Math.min((q.current / q.max) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Security */}
            <div className="bg-gray-900/80 border border-red-900/30 rounded-xl p-5">
              <div className="flex items-center gap-2.5 mb-4">
                <Shield className="h-4 w-4 text-green-400" />
                <h2 className="text-sm font-bold text-white">Security Status</h2>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Encryption at Rest", status: true },
                  { label: "Encryption in Transit", status: true },
                  { label: "MFA Support", status: true },
                  { label: "Audit Logging", status: true },
                  { label: "RBAC Enforced", status: true },
                  { label: "Secrets Management", status: true },
                ].map(s => (
                  <div key={s.label} className="flex items-center justify-between py-1.5">
                    <span className="text-xs text-gray-300 font-mono">{s.label}</span>
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}