import React, { useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip as ReTooltip, Legend, ResponsiveContainer, ComposedChart } from "recharts";
import { TrendingUp, Download, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function MetricsComparison({ currentMetrics = [], historicalSessions = [] }) {
  const [selectedComparison, setSelectedComparison] = useState("latency");
  const [comparisonSession, setComparisonSession] = useState(null);

  // Prepare comparison data
  const getComparisonData = () => {
    if (!comparisonSession || !currentMetrics.length) return [];

    const merged = [];
    const maxLen = Math.max(currentMetrics.length, comparisonSession.metrics?.length || 0);

    for (let i = 0; i < maxLen; i++) {
      const current = currentMetrics[i];
      const historical = comparisonSession.metrics?.[i];

      merged.push({
        time: i,
        current: current?.[selectedComparison] || 0,
        historical: historical?.[selectedComparison] || 0,
      });
    }

    return merged;
  };

  const comparisonData = getComparisonData();
  const currentAvg = currentMetrics.length > 0
    ? Math.round(currentMetrics.reduce((sum, m) => sum + (m[selectedComparison] || 0), 0) / currentMetrics.length)
    : 0;
  const historicalAvg = comparisonSession && comparisonSession.metrics
    ? Math.round(comparisonSession.metrics.reduce((sum, m) => sum + (m[selectedComparison] || 0), 0) / comparisonSession.metrics.length)
    : 0;

  const improvement = historicalAvg > 0
    ? Math.round(((historicalAvg - currentAvg) / historicalAvg) * 100)
    : 0;

  const exportComparison = () => {
    const csv = [
      "Time,Current,Historical",
      ...comparisonData.map(d => `${d.time},${d.current},${d.historical}`)
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `metrics-comparison-${new Date().toISOString()}.csv`;
    a.click();
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <TrendingUp className="h-4 w-4 text-primary" />
        <span className="font-semibold text-sm text-foreground">Metrics Comparison</span>
      </div>

      <div className="p-4 space-y-4">
        {/* Metric selector */}
        <div className="grid grid-cols-2 gap-2">
          {["latency", "bandwidth", "packetLoss", "cpu"].map(metric => (
            <button
              key={metric}
              onClick={() => setSelectedComparison(metric)}
              className={`px-2 py-1.5 rounded-md text-xs font-medium border transition-all
                ${selectedComparison === metric
                  ? "bg-primary/20 border-primary/50 text-primary"
                  : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                }`}
            >
              {metric.charAt(0).toUpperCase() + metric.slice(1)}
            </button>
          ))}
        </div>

        {/* Session selector */}
        {historicalSessions.length > 0 && (
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-1.5">
              Compare Against Session
            </label>
            <select
              value={comparisonSession?.id || ""}
              onChange={(e) => {
                const session = historicalSessions.find(s => s.id === e.target.value);
                setComparisonSession(session || null);
              }}
              className="w-full bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Select session...</option>
              {historicalSessions.map(s => (
                <option key={s.id} value={s.id}>
                  {s.scenario} — {new Date(s.timestamp).toLocaleString()}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Comparison stats */}
        {comparisonSession && (
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-secondary rounded-lg p-2.5">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Current Avg</div>
              <div className="text-lg font-bold text-primary">{currentAvg}</div>
            </div>
            <div className="bg-secondary rounded-lg p-2.5">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Previous Avg</div>
              <div className="text-lg font-bold text-muted-foreground">{historicalAvg}</div>
            </div>
            <div className={`col-span-2 rounded-lg p-2.5 ${improvement > 0 ? "bg-green-500/10 border border-green-500/30" : "bg-red-500/10 border border-red-500/30"}`}>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Improvement</div>
              <div className={`text-lg font-bold ${improvement > 0 ? "text-green-400" : "text-red-400"}`}>
                {improvement > 0 ? "+" : ""}{improvement}%
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        {comparisonData.length > 1 && comparisonSession && (
          <div>
            <ResponsiveContainer width="100%" height={180}>
              <ComposedChart data={comparisonData} margin={{ top: 2, right: 2, left: -30, bottom: 0 }}>
                <XAxis dataKey="time" tick={{ fontSize: 8 }} />
                <YAxis tick={{ fontSize: 8 }} />
                <ReTooltip
                  contentStyle={{ background: "hsl(222 47% 9%)", border: "1px solid hsl(222 30% 18%)", borderRadius: 6, fontSize: 11 }}
                  labelFormatter={(val) => `Time ${val}`}
                />
                <Legend wrapperStyle={{ fontSize: 10 }} />
                <Line type="monotone" dataKey="current" stroke="hsl(199 89% 48%)" strokeWidth={2} dot={false} name="Current" />
                <Line type="monotone" dataKey="historical" stroke="hsl(168 76% 42%)" strokeWidth={2} dot={false} strokeDasharray="5,5" name="Historical" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}

        {!comparisonSession && (
          <p className="text-xs text-muted-foreground text-center py-4">Select a session to compare metrics</p>
        )}

        {/* Export button */}
        {comparisonData.length > 0 && (
          <Button
            onClick={exportComparison}
            variant="outline"
            size="sm"
            className="w-full gap-2 text-xs h-8"
          >
            <Download className="h-3 w-3" /> Export Comparison
          </Button>
        )}
      </div>
    </div>
  );
}