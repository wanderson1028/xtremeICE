import React from "react";
import { AlertTriangle, CheckCircle, Shield, Clock, Activity, Monitor, Star, TrendingUp, Award } from "lucide-react";

const ACTION_POINTS = {
  isolate_host: 15, block_ip: 12, disable_user: 10, reset_password: 8,
  kill_process: 10, quarantine_file: 8, collect_forensics: 12, preserve_evidence: 10,
  update_fw_rule: 8, patch_system: 10, restore_backup: 15, escalate_ir: 5,
  notify_customer: 5, open_ticket: 3, start_coc: 8, remove_persistence: 12,
  analyst_note: 1,
};

const severityColor = {
  critical: "text-red-400 bg-red-500/10 border-red-500/30",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  low: "text-blue-400 bg-blue-500/10 border-blue-500/30",
};

const statusColor = {
  healthy: "text-green-400",
  compromised: "text-red-400",
  isolated: "text-orange-400",
};

export default function SOCDashboard({ alerts, logs, edrDetections, endpoints, actionsLog, scenario, elapsedMinutes, score }) {
  const openAlerts = alerts.filter(a => a.status === "open");
  const closedAlerts = alerts.filter(a => a.status === "closed");
  const criticalAlerts = openAlerts.filter(a => a.severity === "critical");
  const compromisedEps = endpoints.filter(e => e.status === "compromised");
  const isolatedEps = endpoints.filter(e => e.status === "isolated");

  const successActions = actionsLog.filter(a => !a.isPenalty);
  const totalPossible = Object.values(ACTION_POINTS).reduce((s, v) => s + v, 0);
  const grade = score >= 90 ? { label: "S", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" }
    : score >= 75 ? { label: "A", color: "text-green-400", bg: "bg-green-500/10 border-green-500/30" }
    : score >= 60 ? { label: "B", color: "text-primary", bg: "bg-primary/10 border-primary/30" }
    : score >= 45 ? { label: "C", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" }
    : { label: "D", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30" };

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Score hero banner */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-4 flex items-center gap-4">
        <div className={`h-14 w-14 rounded-xl border-2 flex items-center justify-center shrink-0 ${grade.bg}`}>
          <span className={`text-2xl font-black ${grade.color}`}>{grade.label}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Live Score</span>
            <TrendingUp className="h-3.5 w-3.5 text-primary" />
          </div>
          <div className="h-2.5 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${score >= 80 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
              style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-muted-foreground">{successActions.length} actions completed · {actionsLog.filter(a => a.isPenalty).length} penalties</span>
            <span className="text-[10px] text-muted-foreground font-mono">max ~{totalPossible}pts</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="text-3xl font-black font-mono text-primary">{score}</div>
          <div className="text-[10px] text-muted-foreground">/ 100 pts</div>
        </div>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold font-mono text-red-400">{criticalAlerts.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Critical Alerts</div>
        </div>
        <div className="bg-orange-500/5 border border-orange-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold font-mono text-orange-400">{openAlerts.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Open Alerts</div>
        </div>
        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold font-mono text-green-400">{closedAlerts.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Triaged</div>
        </div>
        <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold font-mono text-primary">{elapsedMinutes}m</div>
          <div className="text-xs text-muted-foreground mt-1">SLA Timer</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Alert Queue */}
        <div className="bg-[#111] border border-border/30 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/20 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
            <span className="text-xs font-semibold">Alert Queue</span>
            {openAlerts.length > 0 && (
              <span className="ml-auto text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">{openAlerts.length} open</span>
            )}
          </div>
          <div className="divide-y divide-border/10 max-h-64 overflow-y-auto">
            {alerts.map(alert => (
              <div key={alert.id} className={`px-4 py-3 flex items-start gap-3 ${alert.status === "closed" ? "opacity-40" : ""}`}>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border shrink-0 mt-0.5 ${severityColor[alert.severity] || severityColor.low}`}>
                  {alert.severity}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium truncate">{alert.title}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{alert.src} · {alert.tactic}</div>
                </div>
                {alert.status === "closed"
                  ? <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  : <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* Endpoint Health */}
        <div className="bg-[#111] border border-border/30 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/20 flex items-center gap-2">
            <Monitor className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold">Endpoint Health</span>
            {compromisedEps.length > 0 && (
              <span className="ml-auto text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">{compromisedEps.length} compromised</span>
            )}
          </div>
          <div className="divide-y divide-border/10 max-h-64 overflow-y-auto">
            {endpoints.map(ep => (
              <div key={ep.id} className="px-4 py-2.5 flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${ep.status === "healthy" ? "bg-green-500" : ep.status === "isolated" ? "bg-orange-500" : "bg-red-500"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono font-medium">{ep.name}</div>
                  <div className="text-[10px] text-muted-foreground">{ep.ip} · {ep.role}</div>
                </div>
                <span className={`text-[10px] font-mono ${statusColor[ep.status] || "text-muted-foreground"}`}>{ep.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* EDR Summary */}
        <div className="bg-[#111] border border-border/30 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/20 flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-xs font-semibold">EDR Detections</span>
            <span className="ml-auto text-[10px] text-muted-foreground">{edrDetections.length} events</span>
          </div>
          <div className="divide-y divide-border/10 max-h-48 overflow-y-auto">
            {edrDetections.map(d => (
              <div key={d.id} className="px-4 py-2.5">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${severityColor[d.severity] || severityColor.low}`}>{d.severity}</span>
                  <span className="text-xs font-mono text-muted-foreground">{d.endpoint}</span>
                  <span className="ml-auto text-[10px] text-primary font-mono">{d.mitre}</span>
                </div>
                <div className="text-[10px] text-foreground/70 font-mono truncate">{d.process} ({d.pid})</div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Log */}
        <div className="bg-[#111] border border-border/30 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/20 flex items-center gap-2">
            <Activity className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-xs font-semibold">Analyst Action Log</span>
            <span className="ml-auto text-[10px] text-muted-foreground">{actionsLog.length} actions</span>
          </div>
          {actionsLog.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground text-xs">No actions taken yet. Start investigating!</div>
          ) : (
            <div className="divide-y divide-border/10 max-h-48 overflow-y-auto">
              {[...actionsLog].reverse().map((a, i) => {
                const pts = a.scoreOverride ?? ACTION_POINTS[a.id] ?? 2;
                const isPositive = pts > 0;
                return (
                  <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                    <span className="text-base leading-none">{a.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs">{a.label}</div>
                      {a.target && <div className="text-[10px] text-muted-foreground truncate">→ {a.target}</div>}
                    </div>
                    <span className="text-[10px] text-muted-foreground font-mono shrink-0">{a.time}</span>
                    <span className={`text-[10px] font-bold font-mono shrink-0 ${isPositive ? "text-green-400" : "text-red-400"}`}>
                      {isPositive ? "+" : ""}{pts}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}