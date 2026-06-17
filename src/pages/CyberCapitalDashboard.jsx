import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2, TrendingDown, AlertTriangle, Clock, DollarSign, ShieldAlert, BarChart3, Activity } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid, Legend, PieChart, Pie, Cell } from "recharts";

const fmt = (n) => {
  if (!n || isNaN(n)) return "$0";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${Number(n).toLocaleString()}`;
};

const COLORS = ["#ef4444", "#f97316", "#eab308", "#3b82f6", "#8b5cf6", "#06b6d4"];

function KpiCard({ icon: Icon, label, value, sub, color = "text-primary" }) {
  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-2">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg px-3 py-2 text-xs shadow-xl">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>{p.name}: {fmt(p.value)}</p>
      ))}
    </div>
  );
};

export default function CyberCapitalDashboard() {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ["published-cyber-events"],
    queryFn: () => base44.entities.CyberEvent.filter({ status: "published" }, "-created_date", 50),
  });

  const eventsWithImpact = useMemo(() =>
    events.filter(e => e.financial_impact && (
      e.financial_impact.scenario_total_exposure ||
      e.financial_impact.scenario_recovery_cost ||
      e.financial_impact.scenario_regulatory_fine
    )), [events]);

  const kpis = useMemo(() => {
    let totalExposure = 0, totalFines = 0, totalRecovery = 0, maxDowntime = 0;
    eventsWithImpact.forEach(e => {
      const fi = e.financial_impact;
      totalExposure += parseFloat(fi.scenario_total_exposure || 0);
      totalFines += parseFloat(fi.scenario_regulatory_fine || 0);
      totalRecovery += parseFloat(fi.scenario_recovery_cost || 0);
      const dph = parseFloat(fi.scenario_downtime_cost_per_hour || 0);
      if (dph > maxDowntime) maxDowntime = dph;
    });
    if (totalExposure === 0) totalExposure = totalFines + totalRecovery;
    return { totalExposure, totalFines, totalRecovery, maxDowntime, eventCount: eventsWithImpact.length };
  }, [eventsWithImpact]);

  // Per-event bar chart data
  const barData = useMemo(() =>
    eventsWithImpact.map(e => ({
      name: (e.title || "Untitled").slice(0, 20),
      "Recovery Cost": parseFloat(e.financial_impact.scenario_recovery_cost || 0),
      "Regulatory Fine": parseFloat(e.financial_impact.scenario_regulatory_fine || 0),
    })), [eventsWithImpact]);

  // Trend line: exposure over time (sorted by created_date)
  const trendData = useMemo(() => {
    const sorted = [...eventsWithImpact].sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
    let cumulative = 0;
    return sorted.map(e => {
      const fi = e.financial_impact;
      const exp = parseFloat(fi.scenario_total_exposure || 0) || (parseFloat(fi.scenario_recovery_cost || 0) + parseFloat(fi.scenario_regulatory_fine || 0));
      cumulative += exp;
      return {
        name: new Date(e.created_date).toLocaleDateString("en-US", { month: "short", year: "2-digit" }),
        Exposure: exp,
        "Cumulative": cumulative,
      };
    });
  }, [eventsWithImpact]);

  // Pie: breakdown by category
  const pieData = useMemo(() => {
    let fines = 0, recovery = 0, downtime = 0;
    eventsWithImpact.forEach(e => {
      const fi = e.financial_impact;
      fines += parseFloat(fi.scenario_regulatory_fine || 0);
      recovery += parseFloat(fi.scenario_recovery_cost || 0);
      // Estimate downtime: cost/hr * 8 hours average
      downtime += parseFloat(fi.scenario_downtime_cost_per_hour || 0) * 8;
    });
    return [
      { name: "Regulatory Fines", value: fines },
      { name: "Recovery Costs", value: recovery },
      { name: "Downtime (est. 8hr)", value: downtime },
    ].filter(d => d.value > 0);
  }, [eventsWithImpact]);

  // Top objectives by total impact
  const topObjectives = useMemo(() => {
    const map = {};
    eventsWithImpact.forEach(e => {
      const objs = e.red_team_objectives || [];
      const mappings = e.financial_impact.objective_mappings || [];
      objs.forEach((obj, i) => {
        const m = mappings[i] || {};
        const total = parseFloat(m.recovery_cost || 0) + parseFloat(m.regulatory_fine || 0);
        if (total > 0) {
          const key = obj.slice(0, 60);
          map[key] = (map[key] || 0) + total;
        }
      });
    });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
  }, [eventsWithImpact]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 bg-background">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-9 w-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center">
                <BarChart3 className="h-5 w-5 text-primary" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Cyber Capital Dashboard</h1>
            </div>
            <p className="text-sm text-muted-foreground ml-12">Aggregated financial risk exposure across all published cyber exercise scenarios</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary border border-border rounded-lg px-3 py-2">
            <Activity className="h-3.5 w-3.5 text-green-400" />
            {events.length} published event{events.length !== 1 ? "s" : ""} · {eventsWithImpact.length} with financial data
          </div>
        </div>

        {eventsWithImpact.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-border rounded-2xl">
            <ShieldAlert className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-foreground font-semibold">No financial impact data available yet.</p>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm mx-auto">
              Publish cyber events with Financial Impact data filled in to see aggregated capital exposure here.
            </p>
          </div>
        ) : (
          <>
            {/* KPI Row */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <KpiCard icon={TrendingDown} label="Total Exposure" value={fmt(kpis.totalExposure)} sub="Across all published events" color="text-red-400" />
              <KpiCard icon={AlertTriangle} label="Regulatory Risk" value={fmt(kpis.totalFines)} sub="Cumulative regulatory fines" color="text-yellow-400" />
              <KpiCard icon={DollarSign} label="Recovery Costs" value={fmt(kpis.totalRecovery)} sub="Remediation & recovery" color="text-blue-400" />
              <KpiCard icon={Clock} label="Peak Downtime Cost" value={fmt(kpis.maxDowntime)} sub="Per hour, highest scenario" color="text-orange-400" />
            </div>

            {/* Charts row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar: per-event breakdown */}
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-sm font-semibold text-foreground mb-4">Capital Exposure by Event</p>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={barData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Bar dataKey="Recovery Cost" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Regulatory Fine" fill="#eab308" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie: cost category breakdown */}
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-sm font-semibold text-foreground mb-4">Risk Exposure Breakdown</p>
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v) => fmt(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-[240px] text-muted-foreground text-sm">No breakdown data</div>
                )}
              </div>
            </div>

            {/* Cumulative exposure trend */}
            {trendData.length > 1 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-sm font-semibold text-foreground mb-4">Cumulative Exposure Trend</p>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trendData} margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tickFormatter={v => fmt(v)} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 11 }} />
                    <Line type="monotone" dataKey="Exposure" stroke="#ef4444" strokeWidth={2} dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="Cumulative" stroke="#8b5cf6" strokeWidth={2} strokeDasharray="5 5" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Top attack objectives by financial impact */}
            {topObjectives.length > 0 && (
              <div className="bg-card border border-border rounded-xl p-5">
                <p className="text-sm font-semibold text-foreground mb-4">Highest-Impact Red Team Objectives</p>
                <div className="space-y-3">
                  {topObjectives.map((obj, i) => {
                    const pct = (obj.value / topObjectives[0].value) * 100;
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-foreground flex items-center gap-2">
                            <span className="h-4 w-4 rounded-full flex items-center justify-center text-[9px] font-bold bg-red-500/20 border border-red-500/30 text-red-400 shrink-0">{i + 1}</span>
                            <span className="truncate max-w-[400px]">{obj.name}</span>
                          </span>
                          <span className="font-bold text-red-400 shrink-0 ml-3">{fmt(obj.value)}</span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-1.5">
                          <div className="bg-red-500/70 h-1.5 rounded-full transition-all" style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Event table */}
            <div className="bg-card border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-border">
                <p className="text-sm font-semibold text-foreground">Published Events — Financial Summary</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-secondary/50">
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">Event</th>
                      <th className="px-4 py-3 text-left text-muted-foreground font-medium">Difficulty</th>
                      <th className="px-4 py-3 text-right text-orange-400 font-medium">Downtime/hr</th>
                      <th className="px-4 py-3 text-right text-red-400 font-medium">Rev. Loss</th>
                      <th className="px-4 py-3 text-right text-yellow-400 font-medium">Reg. Fine</th>
                      <th className="px-4 py-3 text-right text-blue-400 font-medium">Recovery</th>
                      <th className="px-4 py-3 text-right text-foreground font-medium">Total Exposure</th>
                    </tr>
                  </thead>
                  <tbody>
                    {eventsWithImpact.map(e => {
                      const fi = e.financial_impact;
                      const total = parseFloat(fi.scenario_total_exposure || 0) || (parseFloat(fi.scenario_recovery_cost || 0) + parseFloat(fi.scenario_regulatory_fine || 0));
                      return (
                        <tr key={e.id} className="border-b border-border/50 hover:bg-secondary/30 transition-colors">
                          <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">{e.title || "Untitled"}</td>
                          <td className="px-4 py-3 text-muted-foreground">{e.difficulty || "—"}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{fmt(fi.scenario_downtime_cost_per_hour)}/hr</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{fi.scenario_revenue_loss_percent ? `${fi.scenario_revenue_loss_percent}%` : "—"}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{fmt(fi.scenario_regulatory_fine)}</td>
                          <td className="px-4 py-3 text-right text-muted-foreground">{fmt(fi.scenario_recovery_cost)}</td>
                          <td className="px-4 py-3 text-right font-bold text-red-400">{fmt(total)}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-secondary/60">
                      <td className="px-4 py-3 font-bold text-foreground" colSpan={6}>Grand Total</td>
                      <td className="px-4 py-3 text-right font-bold text-red-400 text-sm">{fmt(kpis.totalExposure)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}