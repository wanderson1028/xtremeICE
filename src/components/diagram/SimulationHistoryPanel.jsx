import React, { useState } from "react";
import { History, XCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Download, Trash2 } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, Cell } from "recharts";

const SEVERITY_META = {
  critical: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", icon: XCircle, barColor: "#f43f5e" },
  warning: { color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", icon: AlertTriangle, barColor: "#f59e0b" },
  info: { color: "text-green-400", bg: "bg-green-500/10 border-green-500/30", icon: CheckCircle2, barColor: "#10b981" },
};

export default function SimulationHistoryPanel({ sessions = [] }) {
  const [expanded, setExpanded] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);

  if (sessions.length === 0) return null;

  const sessionToShow = selectedSession ?? sessions[sessions.length - 1];

  // Build bar chart data: aggregate events per scenario
  const chartData = sessions.map((s, i) => ({
    name: s.scenarioLabel || `Run ${i + 1}`,
    critical: s.events.filter(e => e.severity === "critical").length,
    warning: s.events.filter(e => e.severity === "warning").length,
    info: s.events.filter(e => e.severity === "info").length,
    avgLatency: s.avgLatency || 0,
  }));

  const exportCSV = () => {
    const rows = [["Session", "Scenario", "Time", "Device", "Event", "Severity"]];
    sessions.forEach((s, si) => {
      s.events.forEach(e => {
        rows.push([si + 1, s.scenarioLabel, s.timestamp, e.device, e.label, e.severity]);
      });
    });
    const csv = rows.map(r => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "simulation_history.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">Historical Analysis</span>
          <span className="text-[10px] bg-primary/20 text-primary border border-primary/30 rounded-full px-2 py-0.5 font-medium">
            {sessions.length} run{sessions.length !== 1 ? "s" : ""}
          </span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-5 pb-5 space-y-4 border-t border-border">
          {/* Session selector */}
          <div className="mt-4 flex gap-2 flex-wrap">
            {sessions.map((s, i) => (
              <button
                key={i}
                onClick={() => setSelectedSession(s)}
                className={`text-[10px] px-2.5 py-1 rounded-md border font-medium transition-all
                  ${sessionToShow === s
                    ? "bg-primary/20 border-primary/50 text-primary"
                    : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                  }`}
              >
                Run {i + 1}: {s.scenarioLabel}
              </button>
            ))}
          </div>

          {/* Events by severity bar chart */}
          {sessions.length > 1 && (
            <div>
              <p className="text-[10px] text-muted-foreground mb-2 uppercase tracking-wider font-medium">Events per Run</p>
              <ResponsiveContainer width="100%" height={80}>
                <BarChart data={chartData} margin={{ top: 2, right: 2, left: -30, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 8, fill: "#666" }} />
                  <YAxis tick={{ fontSize: 8, fill: "#666" }} />
                  <ReTooltip
                    contentStyle={{ background: "hsl(222 47% 9%)", border: "1px solid hsl(222 30% 18%)", borderRadius: 8, fontSize: 10 }}
                  />
                  <Bar dataKey="critical" fill="#f43f5e" stackId="a" radius={[0,0,2,2]} />
                  <Bar dataKey="warning" fill="#f59e0b" stackId="a" />
                  <Bar dataKey="info" fill="#10b981" stackId="a" radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Selected session stats */}
          {sessionToShow && (
            <>
              <div className="grid grid-cols-3 gap-2">
                {["critical","warning","info"].map(sev => {
                  const m = SEVERITY_META[sev];
                  const Icon = m.icon;
                  const count = sessionToShow.events.filter(e => e.severity === sev).length;
                  return (
                    <div key={sev} className={`rounded-lg border px-3 py-2 text-center ${m.bg}`}>
                      <Icon className={`h-3.5 w-3.5 mx-auto mb-1 ${m.color}`} />
                      <p className={`text-lg font-bold ${m.color}`}>{count}</p>
                      <p className="text-[9px] text-muted-foreground capitalize">{sev}</p>
                    </div>
                  );
                })}
              </div>

              {sessionToShow.avgLatency > 0 && (
                <div className="flex items-center justify-between text-xs bg-secondary rounded-lg px-3 py-2 border border-border">
                  <span className="text-muted-foreground">Avg Latency</span>
                  <span className={`font-bold ${sessionToShow.avgLatency > 100 ? "text-red-400" : "text-green-400"}`}>
                    {sessionToShow.avgLatency}ms
                  </span>
                </div>
              )}

              {/* Event log for session */}
              <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                {sessionToShow.events.length === 0 && (
                  <p className="text-xs text-muted-foreground text-center py-3">No events recorded</p>
                )}
                {sessionToShow.events.map((e, i) => {
                  const m = SEVERITY_META[e.severity] || SEVERITY_META.info;
                  const Icon = m.icon;
                  return (
                    <div key={i} className={`flex items-start gap-2 rounded-md border px-2.5 py-1.5 text-xs ${m.bg}`}>
                      <Icon className={`h-3 w-3 mt-0.5 shrink-0 ${m.color}`} />
                      <div className="min-w-0">
                        <span className="text-muted-foreground font-medium">{e.device}: </span>
                        <span className={m.color}>{e.label}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          <button
            onClick={exportCSV}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-primary transition-colors"
          >
            <Download className="h-3 w-3" /> Export CSV
          </button>
        </div>
      )}
    </div>
  );
}