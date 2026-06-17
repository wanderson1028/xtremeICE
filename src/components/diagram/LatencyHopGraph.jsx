import React, { useState, useEffect, useRef, useCallback } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell, ResponsiveContainer } from "recharts";
import { Activity, ChevronDown, ChevronUp, ArrowRight, GitBranch } from "lucide-react";

// Base latency characteristics per routing protocol (ms)
const PROTOCOL_BASE = {
  OSPF:       { base: 18,  jitter: 6,  color: "#0ea5e9" },
  EIGRP:      { base: 16,  jitter: 5,  color: "#34d399" },
  BGP:        { base: 42,  jitter: 15, color: "#a78bfa" },
  Static:     { base: 28,  jitter: 4,  color: "#fbbf24" },
  "IS-IS":    { base: 20,  jitter: 7,  color: "#f472b6" },
  RIP:        { base: 65,  jitter: 20, color: "#f87171" },
};

// Scenario multipliers
const SCENARIO_MULT = {
  high_latency:    4.5,
  link_failure:    6.0,
  ddos:            3.5,
  bgp_flap:        5.0,
  bandwidth_surge: 2.5,
  device_reboot:   3.0,
  firewall_breach: 1.8,
  server_crash:    2.2,
};

// Traffic pattern modifier — returns a value between 0.6 and 1.4
function trafficMod(pattern, tick) {
  switch (pattern) {
    case "bursty":   return 0.7 + (tick % 4 === 0 ? 2.2 : 0.5) * Math.random();
    case "ramp_up":  return 0.5 + (tick / 40) * 1.5;
    case "sine":     return 1 + 0.6 * Math.sin((tick / 8) * Math.PI);
    default:         return 0.95 + Math.random() * 0.1; // steady
  }
}

// BFS hop count between two nodes using diagram links
function calcHops(nodes, links, srcId, dstId) {
  if (!srcId || !dstId || srcId === dstId) return 0;
  const adj = {};
  nodes.forEach(n => { adj[n.id] = []; });
  links.forEach(l => {
    if (adj[l.from]) adj[l.from].push(l.to);
    if (adj[l.to])   adj[l.to].push(l.from);
  });
  const visited = new Set([srcId]);
  const queue = [[srcId, 0]];
  while (queue.length) {
    const [cur, dist] = queue.shift();
    if (cur === dstId) return dist;
    for (const nb of (adj[cur] || [])) {
      if (!visited.has(nb)) { visited.add(nb); queue.push([nb, dist + 1]); }
    }
  }
  return -1; // not connected
}

export default function LatencyHopGraph({ nodes = [], links = [], running, scenario, trafficPattern, routingProtocol }) {
  const [expanded, setExpanded] = useState(true);
  const [srcId, setSrcId] = useState("");
  const [dstId, setDstId] = useState("");
  const [history, setHistory] = useState([]); // [{t, latency, hops}]
  const [tick, setTick] = useState(0);
  const intervalRef = useRef(null);

  // Auto-select sensible defaults when nodes change
  useEffect(() => {
    if (nodes.length < 2) return;
    const routerNodes = nodes.filter(n => n.type === "router");
    const endNodes   = nodes.filter(n => ["workstation", "server", "phone"].includes(n.type));
    const src = routerNodes[0]?.id || nodes[0]?.id || "";
    const dst = endNodes[0]?.id   || nodes[nodes.length - 1]?.id || "";
    if (!srcId) setSrcId(src);
    if (!dstId) setDstId(dst !== src ? dst : nodes[1]?.id || "");
  }, [nodes]);

  // Live update while running
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!running) return;

    intervalRef.current = setInterval(() => {
      setTick(t => {
        const nextTick = t + 1;
        const proto = routingProtocol || "OSPF";
        const cfg   = PROTOCOL_BASE[proto] || PROTOCOL_BASE.OSPF;
        const mult  = scenario ? (SCENARIO_MULT[scenario.id] || 1) : 1;
        const tmod  = trafficMod(trafficPattern || "steady", nextTick);
        const latency = parseFloat((cfg.base * mult * tmod + (Math.random() * cfg.jitter - cfg.jitter / 2)).toFixed(1));

        setHistory(prev => {
          const entry = { t: `T${nextTick}`, latency: Math.max(1, latency) };
          const next = [...prev, entry];
          return next.slice(-40); // keep last 40 points
        });
        return nextTick;
      });
    }, 800);

    return () => clearInterval(intervalRef.current);
  }, [running, scenario, trafficPattern, routingProtocol]);

  // Clear on reset
  useEffect(() => {
    if (!running) { setHistory([]); setTick(0); }
  }, [running]);

  const hops = calcHops(nodes, links, srcId, dstId);
  const srcNode = nodes.find(n => n.id === srcId);
  const dstNode = nodes.find(n => n.id === dstId);
  const currentLatency = history[history.length - 1]?.latency ?? null;

  // Protocol comparison data (static snapshot when running)
  const protoCompare = Object.entries(PROTOCOL_BASE).map(([proto, cfg]) => {
    const mult = scenario ? (SCENARIO_MULT[scenario.id] || 1) : 1;
    const tmod = trafficMod(trafficPattern || "steady", tick);
    return {
      protocol: proto,
      latency: parseFloat((cfg.base * mult * tmod).toFixed(1)),
      color: cfg.color,
      active: proto === (routingProtocol || "OSPF"),
    };
  });

  const selectable = nodes.filter(n =>
    ["router", "switch", "firewall", "server", "workstation", "internet", "phone"].includes(n.type)
  );

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">Latency &amp; Hop Tracker</span>
          {running && (
            <span className="flex items-center gap-1 text-[10px] bg-green-500/20 border border-green-500/30 text-green-400 rounded-full px-2 py-0.5">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" />
              LIVE
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border px-4 pb-5 pt-4 space-y-4">
          {/* Source / Destination selectors */}
          <div className="flex items-center gap-2 text-xs">
            <select
              value={srcId}
              onChange={e => setSrcId(e.target.value)}
              className="flex-1 bg-secondary border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary truncate"
            >
              <option value="">Source…</option>
              {selectable.map(n => (
                <option key={n.id} value={n.id}>{n.label.replace(/\n/g, " ")}</option>
              ))}
            </select>
            <ArrowRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            <select
              value={dstId}
              onChange={e => setDstId(e.target.value)}
              className="flex-1 bg-secondary border border-border rounded-lg px-2 py-1.5 text-foreground focus:outline-none focus:ring-1 focus:ring-primary truncate"
            >
              <option value="">Destination…</option>
              {selectable.filter(n => n.id !== srcId).map(n => (
                <option key={n.id} value={n.id}>{n.label.replace(/\n/g, " ")}</option>
              ))}
            </select>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-secondary rounded-lg p-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Latency</p>
              <p className={`text-base font-bold ${currentLatency == null ? "text-muted-foreground" : currentLatency > 100 ? "text-red-400" : currentLatency > 40 ? "text-yellow-400" : "text-green-400"}`}>
                {currentLatency != null ? `${currentLatency}ms` : "—"}
              </p>
            </div>
            <div className="bg-secondary rounded-lg p-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Hops</p>
              <p className={`text-base font-bold ${hops < 0 ? "text-muted-foreground" : "text-foreground"}`}>
                {hops < 0 ? "N/A" : hops === 0 ? "—" : hops}
              </p>
            </div>
            <div className="bg-secondary rounded-lg p-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Protocol</p>
              <p className="text-base font-bold" style={{ color: PROTOCOL_BASE[routingProtocol]?.color || "#0ea5e9" }}>
                {routingProtocol || "—"}
              </p>
            </div>
          </div>

          {/* Real-time latency chart */}
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
              Real-time Latency ({srcNode?.label?.replace(/\n/g, " ") || "Src"} → {dstNode?.label?.replace(/\n/g, " ") || "Dst"})
            </p>
            {history.length === 0 ? (
              <div className="h-28 flex items-center justify-center rounded-lg bg-secondary border border-dashed border-border">
                <p className="text-xs text-muted-foreground">Run a simulation to see live data</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={110}>
                <LineChart data={history} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 18%)" />
                  <XAxis dataKey="t" tick={{ fontSize: 8, fill: "#64748b" }} interval="preserveStartEnd" />
                  <YAxis tick={{ fontSize: 8, fill: "#64748b" }} unit="ms" />
                  <Tooltip
                    contentStyle={{ background: "hsl(222 47% 9%)", border: "1px solid hsl(222 30% 18%)", borderRadius: 8, fontSize: 11 }}
                    labelStyle={{ color: "#94a3b8" }}
                    formatter={(v) => [`${v}ms`, "Latency"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="latency"
                    stroke={PROTOCOL_BASE[routingProtocol]?.color || "#0ea5e9"}
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Protocol comparison bar chart */}
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <GitBranch className="h-3 w-3 text-muted-foreground" />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Protocol Latency Comparison</p>
            </div>
            <ResponsiveContainer width="100%" height={100}>
              <BarChart data={protoCompare} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(222 30% 18%)" />
                <XAxis dataKey="protocol" tick={{ fontSize: 8, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 8, fill: "#64748b" }} unit="ms" />
                <Tooltip
                  contentStyle={{ background: "hsl(222 47% 9%)", border: "1px solid hsl(222 30% 18%)", borderRadius: 8, fontSize: 11 }}
                  formatter={(v) => [`${v}ms`, "Est. Latency"]}
                />
                <Bar dataKey="latency" radius={[3, 3, 0, 0]}>
                  {protoCompare.map((entry, idx) => (
                    <Cell key={idx} fill={entry.color} opacity={entry.active ? 1 : 0.4} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-[10px] text-muted-foreground mt-1 text-center">
              Active protocol highlighted · Values reflect current scenario conditions
            </p>
          </div>
        </div>
      )}
    </div>
  );
}