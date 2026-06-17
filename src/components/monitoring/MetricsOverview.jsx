import React, { useMemo } from "react";
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Activity, Zap, TrendingDown } from "lucide-react";

export default function MetricsOverview({ metrics }) {
  const stats = useMemo(() => {
    if (!metrics.length) return { latency: 0, bandwidth: 0, packetLoss: 0 };
    const latest = metrics[metrics.length - 1];
    const avg = {
      latency: metrics.reduce((sum, m) => sum + m.latency, 0) / metrics.length,
      bandwidth: metrics.reduce((sum, m) => sum + m.bandwidth, 0) / metrics.length,
      packetLoss: metrics.reduce((sum, m) => sum + m.packetLoss, 0) / metrics.length,
    };
    return {
      latency: latest.latency.toFixed(1),
      latencyAvg: avg.latency.toFixed(1),
      bandwidth: latest.bandwidth.toFixed(1),
      bandwidthAvg: avg.bandwidth.toFixed(1),
      packetLoss: latest.packetLoss.toFixed(2),
      packetLossAvg: avg.packetLoss.toFixed(2),
    };
  }, [metrics]);

  const chartData = useMemo(() => {
    return metrics.map((m, i) => ({
      time: new Date(m.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      latency: Math.round(m.latency),
      bandwidth: Math.round(m.bandwidth),
      packetLoss: Math.round(m.packetLoss * 10) / 10,
    }));
  }, [metrics]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
      {/* Latency Card */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Latency</h3>
          <Activity className="h-5 w-5 text-blue-500" />
        </div>
        <p className="text-3xl font-bold text-foreground mb-1">{stats.latency}ms</p>
        <p className="text-xs text-muted-foreground">Avg: {stats.latencyAvg}ms</p>
        <div className="mt-4 h-16">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <Area type="monotone" dataKey="latency" stroke="#3b82f6" fill="#3b82f6" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bandwidth Card */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Bandwidth</h3>
          <Zap className="h-5 w-5 text-green-500" />
        </div>
        <p className="text-3xl font-bold text-foreground mb-1">{stats.bandwidth}%</p>
        <p className="text-xs text-muted-foreground">Avg: {stats.bandwidthAvg}%</p>
        <div className="mt-4 h-16">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <Area type="monotone" dataKey="bandwidth" stroke="#10b981" fill="#10b981" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Packet Loss Card */}
      <div className="bg-card border border-border rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Packet Loss</h3>
          <TrendingDown className="h-5 w-5 text-red-500" />
        </div>
        <p className="text-3xl font-bold text-foreground mb-1">{stats.packetLoss}%</p>
        <p className="text-xs text-muted-foreground">Avg: {stats.packetLossAvg}%</p>
        <div className="mt-4 h-16">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData}>
              <Area type="monotone" dataKey="packetLoss" stroke="#ef4444" fill="#ef4444" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}