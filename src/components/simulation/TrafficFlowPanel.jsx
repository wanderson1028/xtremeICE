import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Activity, Play, Square, ChevronDown, ChevronUp,
  AlertTriangle, CheckCircle2, XCircle, ArrowRight,
  Route, Wifi, Zap, RotateCcw, Trash2, Radio
} from "lucide-react";

// ── Path-finding (BFS) ─────────────────────────────────────────────────────
function bfsPath(nodes, links, srcId, dstId, failedLinks, failedNodes) {
  if (srcId === dstId) return [srcId];
  const adj = {};
  nodes.forEach(n => { if (!failedNodes.has(n.id)) adj[n.id] = []; });
  links.forEach(l => {
    const fwd = `${l.from}|${l.to}`, rev = `${l.to}|${l.from}`;
    if (failedLinks.has(fwd) || failedLinks.has(rev)) return;
    if (failedNodes.has(l.from) || failedNodes.has(l.to)) return;
    adj[l.from]?.push(l.to);
    adj[l.to]?.push(l.from);
  });
  const visited = new Set([srcId]);
  const queue = [[srcId]];
  while (queue.length) {
    const path = queue.shift();
    for (const nb of adj[path.at(-1)] || []) {
      if (nb === dstId) return [...path, nb];
      if (!visited.has(nb)) { visited.add(nb); queue.push([...path, nb]); }
    }
  }
  return null;
}

// ── Latency model per hop ──────────────────────────────────────────────────
function hopLatency(fromNode, toNode, links, wan_technology, jitter = false) {
  const link = links.find(l =>
    (l.from === fromNode?.id && l.to === toNode?.id) ||
    (l.to === fromNode?.id && l.from === toNode?.id)
  );
  const isWan = link?.wan || fromNode?.type === "internet" || toNode?.type === "internet";
  let base;
  if (fromNode?.type === "internet" || toNode?.type === "internet") base = 80;
  else if (isWan) {
    const t = wan_technology || "";
    base = t.includes("MPLS") ? 18 : t.includes("SD-WAN") ? 12 : t.includes("IPSec") ? 30 : t.includes("DMVPN") ? 22 : 40;
  } else {
    base = fromNode?.type === "firewall" || toNode?.type === "firewall" ? 3 : 1;
  }
  return jitter ? base + (Math.random() - 0.5) * base * 0.3 : base;
}

// ── Bandwidth model ────────────────────────────────────────────────────────
function maxThroughput(path, links) {
  if (!path || path.length < 2) return 0;
  let min = Infinity;
  for (let i = 0; i < path.length - 1; i++) {
    const link = links.find(l =>
      (l.from === path[i] && l.to === path[i + 1]) ||
      (l.to === path[i] && l.from === path[i + 1])
    );
    const cap = link?.wan ? 100 : 1000; // Mbps
    min = Math.min(min, cap);
  }
  return min === Infinity ? 0 : min;
}

// ── Node label helper ─────────────────────────────────────────────────────
const nodeLabel = (n) => n?.label?.replace(/\n/g, " ") ?? "";
const PROTOCOL_COLORS = { ICMP: "#22d3ee", TCP: "#a78bfa", UDP: "#fb923c" };
const STATUS_COLORS = { active: "text-green-400", rerouted: "text-yellow-400", failed: "text-red-400" };

let flowIdSeq = 0;

export default function TrafficFlowPanel({ nodes = [], links = [], design, running }) {
  const [expanded, setExpanded] = useState(true);
  const [srcId, setSrcId] = useState("");
  const [dstId, setDstId] = useState("");
  const [protocol, setProtocol] = useState("TCP");
  const [bwReq, setBwReq] = useState(10);
  const [flows, setFlows] = useState([]);
  const [failedLinks, setFailedLinks] = useState(new Set());
  const [failedNodes, setFailedNodes] = useState(new Set());
  const [expandedFlow, setExpandedFlow] = useState(null);
  const tickRef = useRef(null);

  // Live jitter & throughput updates
  useEffect(() => {
    if (!running || flows.length === 0) return;
    tickRef.current = setInterval(() => {
      setFlows(prev => prev.map(f => {
        if (f.status === "failed") return f;
        const jitter = (Math.random() - 0.5) * 4;
        const tpJitter = (Math.random() - 0.5) * f.maxTp * 0.15;
        return {
          ...f,
          currentLatency: Math.max(1, f.baseLatency + jitter),
          currentTp: Math.max(1, Math.min(f.maxTp, f.requestedTp + tpJitter)),
          packetsSent: f.packetsSent + Math.floor(50 + Math.random() * 50),
          packetsLost: f.packetsLost + (Math.random() < 0.005 ? 1 : 0),
        };
      }));
    }, 800);
    return () => clearInterval(tickRef.current);
  }, [running, flows.length]);

  // Re-route flows when failures change
  useEffect(() => {
    setFlows(prev => prev.map(f => {
      const newPath = bfsPath(nodes, links, f.srcId, f.dstId, failedLinks, failedNodes);
      if (!newPath) return { ...f, status: "failed", currentTp: 0, path: [] };
      const sameLen = newPath.length === f.path.length && newPath.every((v, i) => v === f.path[i]);
      const baseLatency = newPath.slice(1).reduce((sum, id, i) => {
        const fn = nodes.find(n => n.id === newPath[i]);
        const tn = nodes.find(n => n.id === id);
        return sum + hopLatency(fn, tn, links, design?.wan_technology);
      }, 0);
      const mtp = maxThroughput(newPath, links);
      return {
        ...f,
        path: newPath,
        baseLatency,
        currentLatency: baseLatency,
        maxTp: mtp,
        currentTp: Math.min(f.requestedTp, mtp),
        status: sameLen ? "active" : (newPath.length ? "rerouted" : "failed"),
      };
    }));
  }, [failedLinks, failedNodes]);

  const injectFlow = () => {
    if (!srcId || !dstId || srcId === dstId) return;
    const path = bfsPath(nodes, links, srcId, dstId, failedLinks, failedNodes);
    if (!path) {
      setFlows(prev => [...prev, {
        id: ++flowIdSeq, srcId, dstId, protocol,
        path: [], status: "failed", baseLatency: 0,
        currentLatency: 0, maxTp: 0, requestedTp: bwReq,
        currentTp: 0, packetsSent: 0, packetsLost: 0,
        startedAt: Date.now(),
      }]);
      return;
    }
    const baseLatency = path.slice(1).reduce((sum, id, i) => {
      const fn = nodes.find(n => n.id === path[i]);
      const tn = nodes.find(n => n.id === id);
      return sum + hopLatency(fn, tn, links, design?.wan_technology);
    }, 0);
    const mtp = maxThroughput(path, links);
    setFlows(prev => [...prev, {
      id: ++flowIdSeq, srcId, dstId, protocol,
      path, status: "active", baseLatency,
      currentLatency: baseLatency,
      maxTp: mtp, requestedTp: bwReq,
      currentTp: Math.min(bwReq, mtp),
      packetsSent: 0, packetsLost: 0,
      startedAt: Date.now(),
    }]);
    setExpandedFlow(flowIdSeq);
  };

  const toggleLinkFail = (fromId, toId) => {
    const key = `${fromId}|${toId}`;
    setFailedLinks(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleNodeFail = (nodeId) => {
    setFailedNodes(prev => {
      const next = new Set(prev);
      next.has(nodeId) ? next.delete(nodeId) : next.add(nodeId);
      return next;
    });
  };

  const routableNodes = nodes.filter(n => n.type !== "internet");

  const statusIcon = (s) => s === "active"
    ? <CheckCircle2 className="h-3 w-3 text-green-400" />
    : s === "rerouted"
    ? <AlertTriangle className="h-3 w-3 text-yellow-400" />
    : <XCircle className="h-3 w-3 text-red-400" />;

  const elapsed = (ts) => {
    const s = Math.floor((Date.now() - ts) / 1000);
    return s < 60 ? `${s}s` : `${Math.floor(s / 60)}m${s % 60}s`;
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <button
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-secondary/50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">Traffic Flow Simulator</span>
          {flows.length > 0 && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-primary border-primary/30 bg-primary/10">
              {flows.filter(f => f.status !== "failed").length} active
            </span>
          )}
          {(failedLinks.size > 0 || failedNodes.size > 0) && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-red-400 border-red-500/30 bg-red-500/10">
              {failedLinks.size + failedNodes.size} fault{failedLinks.size + failedNodes.size !== 1 ? "s" : ""}
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border px-5 py-4 space-y-4">

          {/* ── Flow Injector ── */}
          <div className="bg-secondary/40 border border-border rounded-lg p-3 space-y-3">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Inject Test Flow</p>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Source</label>
                <select
                  value={srcId}
                  onChange={e => setSrcId(e.target.value)}
                  className="w-full bg-background border border-border rounded-md text-xs text-foreground px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">— pick node —</option>
                  {routableNodes.map(n => (
                    <option key={n.id} value={n.id}>{nodeLabel(n)}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Destination</label>
                <select
                  value={dstId}
                  onChange={e => setDstId(e.target.value)}
                  className="w-full bg-background border border-border rounded-md text-xs text-foreground px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  <option value="">— pick node —</option>
                  {routableNodes.filter(n => n.id !== srcId).map(n => (
                    <option key={n.id} value={n.id}>{nodeLabel(n)}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Protocol</label>
                <select
                  value={protocol}
                  onChange={e => setProtocol(e.target.value)}
                  className="w-full bg-background border border-border rounded-md text-xs text-foreground px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {["TCP", "UDP", "ICMP"].map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[10px] text-muted-foreground mb-1 block">Bandwidth (Mbps)</label>
                <select
                  value={bwReq}
                  onChange={e => setBwReq(Number(e.target.value))}
                  className="w-full bg-background border border-border rounded-md text-xs text-foreground px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {[1, 10, 100, 500, 1000].map(v => <option key={v} value={v}>{v}</option>)}
                </select>
              </div>
              <div className="flex items-end">
                <Button
                  onClick={injectFlow}
                  disabled={!srcId || !dstId}
                  className="w-full gap-1.5 h-[30px] text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Play className="h-3 w-3" /> Inject
                </Button>
              </div>
            </div>
          </div>

          {/* ── Failure injection ── */}
          {flows.length > 0 && (
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                Failover Testing — click a hop to fail it
              </p>
              {flows.filter(f => f.path.length > 1).map(flow => (
                <div key={flow.id} className="mb-2">
                  <p className="text-[10px] text-muted-foreground mb-1">
                    Flow #{flow.id}: {nodeLabel(nodes.find(n => n.id === flow.srcId))} → {nodeLabel(nodes.find(n => n.id === flow.dstId))}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {flow.path.slice(1).map((toId, i) => {
                      const fromId = flow.path[i];
                      const key = `${fromId}|${toId}`;
                      const revKey = `${toId}|${fromId}`;
                      const isFailed = failedLinks.has(key) || failedLinks.has(revKey);
                      const toNode = nodes.find(n => n.id === toId);
                      const isNodeFailed = failedNodes.has(toId);
                      return (
                        <div key={i} className="flex items-center gap-0.5">
                          <button
                            onClick={() => toggleLinkFail(fromId, toId)}
                            title="Click to fail this link"
                            className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors font-mono
                              ${isFailed ? "bg-red-500/20 border-red-500/50 text-red-400" : "bg-secondary border-border text-muted-foreground hover:border-red-500/40 hover:text-red-400"}`}
                          >
                            ─link─
                          </button>
                          <button
                            onClick={() => toggleNodeFail(toId)}
                            title="Click to fail this node"
                            className={`text-[10px] px-1.5 py-0.5 rounded border transition-colors truncate max-w-[80px]
                              ${isNodeFailed ? "bg-red-500/20 border-red-500/50 text-red-400" : "bg-secondary border-border text-muted-foreground hover:border-red-500/40 hover:text-red-400"}`}
                          >
                            {nodeLabel(toNode)}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {(failedLinks.size > 0 || failedNodes.size > 0) && (
                <button
                  onClick={() => { setFailedLinks(new Set()); setFailedNodes(new Set()); }}
                  className="text-[10px] text-red-400 hover:text-red-300 flex items-center gap-1 mt-1"
                >
                  <RotateCcw className="h-3 w-3" /> Clear all failures
                </button>
              )}
            </div>
          )}

          {/* ── Active flows list ── */}
          {flows.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">
              Select source and destination nodes above to inject a test traffic flow.
            </p>
          )}

          {flows.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Active Flows</p>
                <button
                  onClick={() => setFlows([])}
                  className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <Trash2 className="h-3 w-3" /> Clear all
                </button>
              </div>
              <div className="space-y-2">
                {flows.map(flow => {
                  const src = nodes.find(n => n.id === flow.srcId);
                  const dst = nodes.find(n => n.id === flow.dstId);
                  const isOpen = expandedFlow === flow.id;
                  const lossRate = flow.packetsSent > 0
                    ? ((flow.packetsLost / flow.packetsSent) * 100).toFixed(2)
                    : "0.00";
                  const tpPct = flow.maxTp > 0 ? Math.round((flow.currentTp / flow.maxTp) * 100) : 0;
                  const protColor = PROTOCOL_COLORS[flow.protocol] || "#94a3b8";

                  return (
                    <div key={flow.id} className="border border-border rounded-lg overflow-hidden">
                      <button
                        className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-secondary/30 transition-colors text-left"
                        onClick={() => setExpandedFlow(isOpen ? null : flow.id)}
                      >
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          {statusIcon(flow.status)}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: `${protColor}22`, color: protColor }}>
                                {flow.protocol}
                              </span>
                              <span className="text-xs text-foreground truncate">
                                {nodeLabel(src)} → {nodeLabel(dst)}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[10px] font-medium ${STATUS_COLORS[flow.status]}`}>
                                {flow.status === "active" ? "Active" : flow.status === "rerouted" ? "Rerouted" : "No Route"}
                              </span>
                              {flow.status !== "failed" && (
                                <>
                                  <span className="text-[10px] text-muted-foreground">{flow.currentLatency.toFixed(1)} ms RTT</span>
                                  <span className="text-[10px] text-muted-foreground">{flow.currentTp.toFixed(1)} Mbps</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 ml-2 shrink-0">
                          <span className="text-[10px] text-muted-foreground">{elapsed(flow.startedAt)}</span>
                          {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                        </div>
                      </button>

                      {isOpen && (
                        <div className="border-t border-border px-3 py-3 space-y-3">
                          {/* Metrics grid */}
                          <div className="grid grid-cols-2 gap-2">
                            {[
                              { label: "RTT Latency", value: flow.status === "failed" ? "—" : `${flow.currentLatency.toFixed(1)} ms` },
                              { label: "Throughput", value: flow.status === "failed" ? "—" : `${flow.currentTp.toFixed(1)} / ${flow.maxTp} Mbps` },
                              { label: "Packets Sent", value: flow.packetsSent.toLocaleString() },
                              { label: "Loss Rate", value: `${lossRate}%` },
                              { label: "Hops", value: flow.path.length > 1 ? flow.path.length - 1 : "—" },
                              { label: "Routing", value: design?.routing_protocol || "Static" },
                            ].map(m => (
                              <div key={m.label} className="bg-background border border-border rounded p-2">
                                <p className="text-[9px] text-muted-foreground uppercase tracking-wide">{m.label}</p>
                                <p className="text-xs font-semibold text-foreground mt-0.5">{m.value}</p>
                              </div>
                            ))}
                          </div>

                          {/* Throughput bar */}
                          {flow.status !== "failed" && flow.maxTp > 0 && (
                            <div>
                              <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
                                <span>Bandwidth utilization</span>
                                <span>{tpPct}%</span>
                              </div>
                              <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all duration-700 ${tpPct > 80 ? "bg-red-500" : tpPct > 50 ? "bg-yellow-400" : "bg-green-500"}`}
                                  style={{ width: `${tpPct}%` }}
                                />
                              </div>
                            </div>
                          )}

                          {/* Hop-by-hop path */}
                          {flow.path.length > 1 && (
                            <div>
                              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                                {flow.status === "rerouted" ? "⚡ Rerouted Path" : "Delivery Path"}
                              </p>
                              <div className="space-y-1">
                                {flow.path.map((nodeId, idx) => {
                                  const node = nodes.find(n => n.id === nodeId);
                                  const isFailedNode = failedNodes.has(nodeId);
                                  const hopLat = idx > 0
                                    ? hopLatency(nodes.find(n => n.id === flow.path[idx - 1]), node, links, design?.wan_technology)
                                    : null;
                                  const fromPrev = idx > 0 ? `${flow.path[idx - 1]}|${nodeId}` : null;
                                  const isFailedLink = fromPrev && (failedLinks.has(fromPrev) || failedLinks.has(`${nodeId}|${flow.path[idx - 1]}`));

                                  return (
                                    <div key={nodeId}>
                                      {idx > 0 && (
                                        <div className={`flex items-center gap-1.5 pl-4 text-[10px] mb-1 ${isFailedLink ? "text-red-400" : "text-muted-foreground"}`}>
                                          <div className={`w-0.5 h-3 ${isFailedLink ? "bg-red-500" : "bg-border"}`} />
                                          {isFailedLink
                                            ? <span className="text-red-400">✗ Link failed</span>
                                            : <span>{hopLat?.toFixed(1)} ms</span>
                                          }
                                        </div>
                                      )}
                                      <div className={`flex items-center gap-2 px-2 py-1.5 rounded-md border transition-colors
                                        ${idx === 0 ? "border-primary/40 bg-primary/10" :
                                          idx === flow.path.length - 1 ? "border-green-500/30 bg-green-500/10" :
                                          isFailedNode ? "border-red-500/40 bg-red-500/10" :
                                          "border-border bg-secondary/30"}`}
                                      >
                                        <Radio className={`h-3 w-3 shrink-0 ${idx === 0 ? "text-primary" : idx === flow.path.length - 1 ? "text-green-400" : isFailedNode ? "text-red-400" : "text-muted-foreground"}`} />
                                        <span className="text-xs text-foreground flex-1 truncate">{nodeLabel(node)}</span>
                                        <span className="text-[10px] text-muted-foreground capitalize">{node?.type}</span>
                                        {node?.ip && <span className="text-[10px] text-primary/70 font-mono hidden sm:inline">{node.ip}</span>}
                                        {isFailedNode && <span className="text-[10px] text-red-400 font-bold">FAILED</span>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {flow.status === "failed" && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-red-500/10 border border-red-500/30 rounded-lg">
                              <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                              <p className="text-xs text-red-400">No route to destination — all paths blocked by failures.</p>
                            </div>
                          )}

                          {flow.status === "rerouted" && (
                            <div className="flex items-center gap-2 px-3 py-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                              <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0" />
                              <p className="text-xs text-yellow-400">Traffic rerouted via alternate path due to failure.</p>
                            </div>
                          )}

                          <button
                            onClick={() => setFlows(prev => prev.filter(f => f.id !== flow.id))}
                            className="text-[10px] text-muted-foreground hover:text-destructive flex items-center gap-1"
                          >
                            <Trash2 className="h-3 w-3" /> Remove flow
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}