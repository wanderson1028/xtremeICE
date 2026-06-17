import React, { useEffect, useState, useRef } from "react";
import { Activity, AlertTriangle, Clock, ArrowUp, ArrowDown, Wifi, XCircle, BarChart2 } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip as ReTooltip, ResponsiveContainer, AreaChart, Area } from "recharts";

function MetricCard({ label, value, unit, icon: Icon, color, trend }) {
  return (
    <div className="bg-secondary rounded-lg border border-border p-3 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
        <Icon className={`h-3.5 w-3.5 ${color}`} />
      </div>
      <div className="flex items-end gap-1.5">
        <span className={`text-xl font-bold ${color}`}>{value}</span>
        <span className="text-xs text-muted-foreground mb-0.5">{unit}</span>
        {trend !== undefined && (
          <span className={`ml-auto text-[10px] font-semibold ${trend > 0 ? "text-red-400" : "text-green-400"}`}>
            {trend > 0 ? <ArrowUp className="h-3 w-3 inline" /> : <ArrowDown className="h-3 w-3 inline" />}
            {Math.abs(trend)}%
          </span>
        )}
      </div>
    </div>
  );
}

const TRAFFIC_COLORS = {
  steady: (t) => 40 + 10 * Math.sin(t * 0.1),
  bursty: (t) => 30 + (Math.random() < 0.2 ? 55 * Math.random() : 5 * Math.random()),
  ramp_up: (t) => Math.min(10 + t * 2.5, 95),
  sine: (t) => 45 + 40 * Math.sin(t * 0.25),
};

function generateMetricsSnapshot(tick, pattern, scenario) {
  const baseTraffic = TRAFFIC_COLORS[pattern] ? TRAFFIC_COLORS[pattern](tick) : 40;

  let latency = 4 + Math.random() * 3;
  let packetLoss = Math.random() * 0.5;
  let cpu = 20 + baseTraffic * 0.4 + Math.random() * 10;
  let bandwidth = baseTraffic;

  if (scenario) {
    if (scenario.id === "link_failure") {
      packetLoss = 40 + Math.random() * 40;
      latency = 200 + Math.random() * 300;
      bandwidth = Math.max(0, bandwidth - 60);
    } else if (scenario.id === "device_reboot") {
      packetLoss = 60 + Math.random() * 35;
      latency = 300 + Math.random() * 400;
      bandwidth = Math.max(0, bandwidth - 80);
      cpu = 0;
    } else if (scenario.id === "high_latency") {
      latency = 120 + Math.random() * 380;
    } else if (scenario.id === "ddos") {
      bandwidth = Math.min(100, bandwidth + 50 + Math.random() * 20);
      packetLoss = 5 + Math.random() * 20;
      cpu = Math.min(100, cpu + 40);
    } else if (scenario.id === "bandwidth_surge") {
      bandwidth = Math.min(100, bandwidth + 35 + Math.random() * 15);
      cpu = Math.min(100, cpu + 25);
    } else if (scenario.id === "bgp_flap") {
      packetLoss = 20 + Math.random() * 50;
      latency = 80 + Math.random() * 200;
      bandwidth = Math.max(5, bandwidth - 40);
    } else if (scenario.id === "firewall_breach") {
      cpu = Math.min(100, cpu + 50);
      bandwidth = Math.min(100, bandwidth + 30);
      packetLoss = 2 + Math.random() * 8;
    } else if (scenario.id === "server_crash") {
      packetLoss = 80 + Math.random() * 20;
      latency = 500 + Math.random() * 1000;
      bandwidth = Math.max(0, bandwidth - 30);
    }
  }

  return {
    t: tick,
    traffic: Math.round(bandwidth),
    latency: Math.round(latency),
    packetLoss: parseFloat(packetLoss.toFixed(1)),
    cpu: Math.round(cpu),
  };
}

export default function SimulationMetricsDashboard({ running, scenario, trafficPattern, eventLog = [] }) {
  const [history, setHistory] = useState([]);
  const [tick, setTick] = useState(0);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (running) {
      intervalRef.current = setInterval(() => {
        setTick(t => {
          const next = t + 1;
          const snap = generateMetricsSnapshot(next, trafficPattern || "steady", scenario);
          setHistory(h => [...h.slice(-30), snap]);
          return next;
        });
      }, 800);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [running, scenario, trafficPattern]);

  const latest = history[history.length - 1] || { traffic: 0, latency: 0, packetLoss: 0, cpu: 0 };
  const prev = history[history.length - 2];
  const trend = (key) => prev ? Math.round(((latest[key] - prev[key]) / Math.max(1, prev[key])) * 100) : 0;

  const alerts = eventLog.filter(e => e.severity === "critical").length;
  const warnings = eventLog.filter(e => e.severity === "warning").length;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <BarChart2 className="h-4 w-4 text-primary" />
        <span className="font-semibold text-sm text-foreground">Simulation Metrics</span>
        {running && (
          <span className="ml-auto flex items-center gap-1.5 text-xs text-green-400 font-medium">
            <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
            Live
          </span>
        )}
        {!running && history.length > 0 && (
          <span className="ml-auto text-xs text-muted-foreground">Paused</span>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Metric cards */}
        <div className="grid grid-cols-2 gap-2">
          <MetricCard label="Bandwidth" value={latest.traffic} unit="%" icon={Activity} color="text-primary" trend={trend("traffic")} />
          <MetricCard label="Latency" value={latest.latency} unit="ms" icon={Clock} color={latest.latency > 100 ? "text-red-400" : "text-green-400"} trend={trend("latency")} />
          <MetricCard label="Packet Loss" value={latest.packetLoss} unit="%" icon={XCircle} color={latest.packetLoss > 5 ? "text-red-400" : "text-green-400"} trend={trend("packetLoss")} />
          <MetricCard label="CPU Load" value={latest.cpu} unit="%" icon={Wifi} color={latest.cpu > 80 ? "text-red-400" : "text-yellow-400"} trend={trend("cpu")} />
        </div>

        {/* Traffic chart */}
        {history.length > 1 && (
          <div>
            <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider font-medium">Bandwidth Utilization</p>
            <ResponsiveContainer width="100%" height={80}>
              <AreaChart data={history} margin={{ top: 2, right: 2, left: -30, bottom: 0 }}>
                <defs>
                  <linearGradient id="trafficGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(199 89% 48%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(199 89% 48%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="t" hide />
                <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#666" }} />
                <ReTooltip
                  contentStyle={{ background: "hsl(222 47% 9%)", border: "1px solid hsl(222 30% 18%)", borderRadius: 8, fontSize: 11 }}
                  labelFormatter={() => ""}
                  formatter={(v) => [`${v}%`, "Bandwidth"]}
                />
                <Area type="monotone" dataKey="traffic" stroke="hsl(199 89% 48%)" strokeWidth={2} fill="url(#trafficGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Latency chart */}
        {history.length > 1 && (
          <div>
            <p className="text-[10px] text-muted-foreground mb-1.5 uppercase tracking-wider font-medium">Latency (ms)</p>
            <ResponsiveContainer width="100%" height={60}>
              <LineChart data={history} margin={{ top: 2, right: 2, left: -30, bottom: 0 }}>
                <XAxis dataKey="t" hide />
                <YAxis tick={{ fontSize: 9, fill: "#666" }} />
                <ReTooltip
                  contentStyle={{ background: "hsl(222 47% 9%)", border: "1px solid hsl(222 30% 18%)", borderRadius: 8, fontSize: 11 }}
                  labelFormatter={() => ""}
                  formatter={(v) => [`${v}ms`, "Latency"]}
                />
                <Line type="monotone" dataKey="latency" stroke="#f43f5e" strokeWidth={1.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Alerts summary */}
        {(alerts > 0 || warnings > 0) && (
          <div className="flex gap-2">
            {alerts > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg bg-red-500/10 border border-red-500/30 px-3 py-1.5 text-xs text-red-400 font-medium">
                <XCircle className="h-3 w-3" /> {alerts} Critical
              </div>
            )}
            {warnings > 0 && (
              <div className="flex items-center gap-1.5 rounded-lg bg-yellow-500/10 border border-yellow-500/30 px-3 py-1.5 text-xs text-yellow-400 font-medium">
                <AlertTriangle className="h-3 w-3" /> {warnings} Warnings
              </div>
            )}
          </div>
        )}

        {!running && history.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-4">Run a scenario to see live metrics</p>
        )}
      </div>
    </div>
  );
}