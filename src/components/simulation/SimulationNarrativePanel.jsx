import React, { useEffect, useState, useRef } from "react";
import { BookOpen, ChevronDown, ChevronUp, Radio, Zap } from "lucide-react";

// Per-scenario narrative config
const SCENARIO_NARRATIVES = {
  link_failure: {
    title: "WAN Link Failure",
    color: "text-red-400",
    dot: "bg-red-400",
    summary: (targets) =>
      `One or more WAN/core links have gone down. Affected devices (${targets}) have lost upstream connectivity and are attempting to reroute traffic.`,
    phases: [
      { t: 0,  msg: "Link carrier signal lost — interface enters DOWN/DOWN state." },
      { t: 4,  msg: "IGP/BGP detects neighbor loss; hold-down timers begin." },
      { t: 8,  msg: "Routing protocol withdraws affected prefixes and floods LSA/update." },
      { t: 14, msg: "Convergence underway — packets black-holed or looped until new paths install." },
      { t: 20, msg: "Alternate path selected (if available). Traffic rerouted; latency elevated 30–120 ms." },
      { t: 30, msg: "Stability restored on surviving links. Monitoring for flapping." },
    ],
    linkNote: "Affected links show red congestion glow. Green packets resume on surviving paths.",
  },
  device_reboot: {
    title: "Device Reboot",
    color: "text-orange-400",
    dot: "bg-orange-400",
    summary: (targets) =>
      `${targets} is being force-rebooted. All interfaces are down; sessions are dropped and the control plane is offline.`,
    phases: [
      { t: 0,  msg: "Power cycle initiated — all interfaces drop, ARP/MAC table cleared." },
      { t: 5,  msg: "POST and IOS/JunOS image loading in progress (~60 s in real hardware)." },
      { t: 12, msg: "Interfaces come back up; CDP/LLDP neighbors rediscovered." },
      { t: 18, msg: "Routing process restarts; OSPF/BGP adjacencies re-forming." },
      { t: 25, msg: "Full routing table rebuilt; traffic forwarding resumes normally." },
    ],
    linkNote: "Packet flow pauses on links touching the rebooted device, then resumes.",
  },
  high_latency: {
    title: "High Latency Injection",
    color: "text-yellow-400",
    dot: "bg-yellow-400",
    summary: (targets) =>
      `Simulated RTT of 100–500 ms injected on paths through ${targets}. Applications experience timeouts; VoIP/video quality degrades.`,
    phases: [
      { t: 0,  msg: "WAN delay injected via traffic shaping / netem emulation." },
      { t: 6,  msg: "TCP slow-start triggers; throughput drops as window sizes shrink." },
      { t: 12, msg: "OSPF/BGP hello timers approach threshold — adjacency at risk." },
      { t: 20, msg: "Application-layer timeouts begin. HTTP 504 responses observed." },
      { t: 28, msg: "Latency-sensitive traffic (SIP, RTP) severely degraded." },
    ],
    linkNote: "Yellow packet glow indicates elevated queuing delay on impacted segments.",
  },
  ddos: {
    title: "DDoS Attack",
    color: "text-red-500",
    dot: "bg-red-500",
    summary: (targets) =>
      `Volumetric flood targeting ${targets}. Firewall and uplink interfaces are saturated; legitimate traffic is being dropped.`,
    phases: [
      { t: 0,  msg: "Attack traffic arrives — firewall CPU spikes to 100%." },
      { t: 4,  msg: "Uplink bandwidth exhausted; ISP-level queues overflow." },
      { t: 8,  msg: "Connection table full; new legitimate sessions rejected (SYN timeout)." },
      { t: 14, msg: "IDS/IPS detects flood signature; ACL/rate-limit rules pushed." },
      { t: 22, msg: "Scrubbing center (if present) begins filtering attack traffic." },
      { t: 32, msg: "Attack subsides or is mitigated; service gradually restores." },
    ],
    linkNote: "Dense red packets on WAN/firewall links indicate flood traffic. Congestion glow at maximum intensity.",
  },
  bandwidth_surge: {
    title: "Bandwidth Surge",
    color: "text-blue-400",
    dot: "bg-blue-400",
    summary: (targets) =>
      `Heavy traffic burst on core switch (${targets}). Uplinks approach capacity; QoS queues activate to prioritize critical traffic.`,
    phases: [
      { t: 0,  msg: "Traffic load spikes — switch uplink utilization exceeds 80%." },
      { t: 6,  msg: "QoS scheduling kicks in; best-effort traffic buffered or dropped." },
      { t: 12, msg: "ECMP load balancing redistributes flows across available paths." },
      { t: 20, msg: "Buffer bloat causes latency to climb 50–200 ms on congested ports." },
      { t: 28, msg: "Traffic normalizes; queues drain and latency returns to baseline." },
    ],
    linkNote: "Orange/red glow on core switch links shows congestion. Packet colors shift yellow→orange.",
  },
  bgp_flap: {
    title: "BGP Session Flap",
    color: "text-purple-400",
    dot: "bg-purple-400",
    summary: (targets) =>
      `BGP neighbor session on ${targets} is resetting. Prefixes withdrawn and re-advertised; route instability propagating to peers.`,
    phases: [
      { t: 0,  msg: "TCP session reset — BGP enters Idle state." },
      { t: 5,  msg: "BGP withdrawal messages sent to all peers; prefixes removed from RIB." },
      { t: 10, msg: "Traffic falls back to static routes or alternate BGP peers (if configured)." },
      { t: 16, msg: "Session re-establishes (Connect → OpenSent → Established)." },
      { t: 22, msg: "Full routing table re-advertised; convergence complete." },
      { t: 30, msg: "Route flap dampening may suppress instability. Normal forwarding resumes." },
    ],
    linkNote: "WAN links show intermittent packet gaps as routes are withdrawn and reinstalled.",
  },
  firewall_breach: {
    title: "Firewall Breach",
    color: "text-pink-400",
    dot: "bg-pink-400",
    summary: (targets) =>
      `Unauthorized traffic has bypassed ${targets} rule set. An attacker is moving laterally across network segments.`,
    phases: [
      { t: 0,  msg: "Exploit or misconfigured ACL allows unauthorized session establishment." },
      { t: 6,  msg: "Lateral movement detected — attacker probing internal subnets." },
      { t: 12, msg: "IDS/IPS raises alert; logging volume spikes." },
      { t: 18, msg: "Incident response: firewall policy updated to block offending flows." },
      { t: 26, msg: "Threat contained; forensic capture initiated on affected segments." },
    ],
    linkNote: "Anomalous packet colors crossing DMZ links indicate unauthorized traffic flows.",
  },
  server_crash: {
    title: "Server Crash",
    color: "text-red-300",
    dot: "bg-red-300",
    summary: (targets) =>
      `${targets} has become unresponsive. Application services are unavailable; load balancer health checks failing.`,
    phases: [
      { t: 0,  msg: "Application process crashes — kernel panic or OOM killer triggered." },
      { t: 5,  msg: "Load balancer health checks fail; server removed from active pool." },
      { t: 10, msg: "Traffic rerouted to remaining pool members (if HA configured)." },
      { t: 16, msg: "iDRAC/iLO remote console available; crash dump collected." },
      { t: 24, msg: "Server rebooted and rejoins pool after health checks pass." },
    ],
    linkNote: "Links to the crashed server go dark; surviving server links carry elevated load.",
  },
};

const TRAFFIC_NOTES = {
  steady:   "Traffic is flowing at a constant, predictable rate. Packet colors are predominantly green.",
  bursty:   "Traffic arrives in sharp bursts with quiet periods in between. Watch for rapid color shifts from green to red.",
  ramp_up:  "Traffic is steadily increasing over time. Packet density and congestion colors will intensify as the simulation progresses.",
  sine:     "Traffic oscillates in a sinusoidal wave — congestion peaks and troughs repeat every ~40 simulation ticks.",
};

export default function SimulationNarrativePanel({ scenario, trafficPattern, running, nodes = [] }) {
  const [expanded, setExpanded] = useState(true);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);

  const config = scenario ? SCENARIO_NARRATIVES[scenario.id] : null;

  // Reset on scenario change
  useEffect(() => {
    setPhaseIndex(0);
    setElapsed(0);
  }, [scenario?.id]);

  // Tick elapsed seconds when running
  useEffect(() => {
    if (!running || !config) {
      clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      setElapsed(e => {
        const next = e + 1;
        // Advance phase
        const phases = config.phases;
        const nextPhase = phases.filter(p => p.t <= next).length - 1;
        setPhaseIndex(Math.max(0, nextPhase));
        return next;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [running, config]);

  const targetLabels = nodes
    .filter(n => scenario?.defaults?.targetType === "any" || n.type === scenario?.defaults?.targetType)
    .slice(0, 3)
    .map(n => n.label.replace(/\n/g, " "))
    .join(", ") || "selected devices";

  if (!scenario && !running) return null;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-secondary/50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">Simulation Narrative</span>
          {running && (
            <span className="flex items-center gap-1 text-[10px] text-green-400 font-medium ml-1">
              <Radio className="h-3 w-3 animate-pulse" /> LIVE
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border px-5 py-4 space-y-4 text-xs">
          {/* No scenario selected */}
          {!scenario && (
            <p className="text-muted-foreground italic">Select and run a scenario to see a live explanation of what's happening across the network.</p>
          )}

          {/* Active scenario */}
          {config && (
            <>
              {/* Title + summary */}
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`h-2 w-2 rounded-full ${config.dot} ${running ? "animate-pulse" : ""}`} />
                  <span className={`font-bold text-sm ${config.color}`}>{config.title}</span>
                  {running && <span className="ml-auto text-muted-foreground tabular-nums">{elapsed}s elapsed</span>}
                </div>
                <p className="text-muted-foreground leading-relaxed">{config.summary(targetLabels)}</p>
              </div>

              {/* Phase timeline */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Event Timeline</p>
                <div className="space-y-2">
                  {config.phases.map((phase, i) => {
                    const active = i === phaseIndex && running;
                    const past = i < phaseIndex || !running;
                    return (
                      <div key={i} className={`flex items-start gap-2.5 transition-all duration-500 ${active ? "opacity-100" : past ? "opacity-50" : "opacity-25"}`}>
                        <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 border ${active ? `${config.dot} border-transparent animate-pulse` : past ? "bg-muted-foreground/40 border-transparent" : "bg-transparent border-muted-foreground/30"}`} />
                        <div>
                          <span className="text-muted-foreground/60 mr-1.5 tabular-nums">+{phase.t}s</span>
                          <span className={active ? "text-foreground font-medium" : "text-muted-foreground"}>{phase.msg}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Link/packet visual key */}
              <div className="bg-secondary/50 border border-border/50 rounded-lg px-3 py-2.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">What You're Seeing on the Diagram</p>
                <p className="text-muted-foreground leading-relaxed">{config.linkNote}</p>
              </div>

              {/* Traffic pattern note */}
              {trafficPattern && (
                <div className="flex items-start gap-2">
                  <Zap className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <div>
                    <span className="text-primary font-semibold capitalize">{trafficPattern} pattern: </span>
                    <span className="text-muted-foreground">{TRAFFIC_NOTES[trafficPattern] || ""}</span>
                  </div>
                </div>
              )}

              {/* Packet color legend */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Packet Color Key</p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { color: "#4dff91", label: "Normal flow (<35% load)" },
                    { color: "#fbbf24", label: "Moderate congestion" },
                    { color: "#f97316", label: "High congestion (>65%)" },
                    { color: "#ef4444", label: "Critical / saturated (>85%)" },
                  ].map(item => (
                    <div key={item.color} className="flex items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}