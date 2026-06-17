import React, { useMemo } from "react";
import { AlertTriangle, CheckCircle2, XCircle, Cpu, Wifi, Shield, Server, Router } from "lucide-react";

const SEVERITY_CONFIG = {
  critical: { color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", icon: XCircle },
  warning: { color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", icon: AlertTriangle },
  ok: { color: "text-green-400", bg: "bg-green-500/10 border-green-500/30", icon: CheckCircle2 },
};

function analyzeBottlenecks(nodes, metricsHistory) {
  const issues = [];

  if (!nodes || nodes.length === 0) return issues;

  // Count node types
  const routers = nodes.filter(n => n.type === "router");
  const switches = nodes.filter(n => n.type === "switch");
  const firewalls = nodes.filter(n => n.type === "firewall");
  const servers = nodes.filter(n => n.type === "server");
  const loadBalancers = nodes.filter(n => n.type === "loadbalancer");

  // Single point of failure checks
  if (firewalls.length === 1) {
    issues.push({ id: "spof_fw", severity: "warning", category: "Redundancy", device: "Firewall", message: "Single firewall detected — no redundancy. Consider a HA pair.", icon: Shield });
  }
  if (firewalls.length === 0) {
    issues.push({ id: "no_fw", severity: "critical", category: "Security", device: "Perimeter", message: "No firewall in topology. Network is unprotected.", icon: Shield });
  }
  if (routers.filter(r => r.label.includes("Core")).length === 1) {
    issues.push({ id: "spof_core", severity: "warning", category: "Redundancy", device: "Core Router", message: "Single core router is a SPOF. Add a redundant path.", icon: Router });
  }

  // Server-to-load-balancer ratio
  if (servers.length >= 3 && loadBalancers.length === 0) {
    issues.push({ id: "no_lb", severity: "warning", category: "Performance", device: "Server Farm", message: `${servers.length} servers without a load balancer. Traffic distribution may be uneven.`, icon: Server });
  }

  // Site scalability
  const siteRouters = routers.filter(r => !r.label.includes("Core"));
  if (siteRouters.length > 5) {
    issues.push({ id: "scale_sites", severity: "warning", category: "Scalability", device: "WAN", message: `${siteRouters.length} branch sites. Consider SD-WAN or hub-and-spoke topology at this scale.`, icon: Wifi });
  }

  // Metrics-based analysis
  const latestMetrics = metricsHistory?.[metricsHistory.length - 1]?.metrics || [];
  if (latestMetrics.length > 0) {
    const avgCpu = latestMetrics.reduce((s, m) => s + (m.cpu || 0), 0) / latestMetrics.length;
    const avgLatency = latestMetrics.reduce((s, m) => s + (m.latency || 0), 0) / latestMetrics.length;
    const avgPacketLoss = latestMetrics.reduce((s, m) => s + (m.packetLoss || 0), 0) / latestMetrics.length;
    const avgBandwidth = latestMetrics.reduce((s, m) => s + (m.traffic || 0), 0) / latestMetrics.length;

    if (avgCpu > 80) {
      issues.push({ id: "high_cpu", severity: "critical", category: "Performance", device: "CPU", message: `Average CPU utilization ${Math.round(avgCpu)}% — devices are overloaded.`, icon: Cpu });
    } else if (avgCpu > 60) {
      issues.push({ id: "med_cpu", severity: "warning", category: "Performance", device: "CPU", message: `Average CPU at ${Math.round(avgCpu)}% — approaching capacity.`, icon: Cpu });
    }

    if (avgLatency > 150) {
      issues.push({ id: "high_latency", severity: "critical", category: "Performance", device: "WAN/Core", message: `Average latency ${Math.round(avgLatency)}ms — significant delays detected.`, icon: Wifi });
    } else if (avgLatency > 50) {
      issues.push({ id: "med_latency", severity: "warning", category: "Performance", device: "Network Path", message: `Average latency ${Math.round(avgLatency)}ms — above baseline.`, icon: Wifi });
    }

    if (avgPacketLoss > 5) {
      issues.push({ id: "packet_loss", severity: "critical", category: "Reliability", device: "Links", message: `${avgPacketLoss.toFixed(1)}% average packet loss — link congestion or failure detected.`, icon: XCircle });
    }

    if (avgBandwidth > 85) {
      issues.push({ id: "bandwidth", severity: "critical", category: "Capacity", device: "Core Links", message: `Bandwidth utilization at ${Math.round(avgBandwidth)}% — near saturation.`, icon: Wifi });
    }
  }

  if (issues.length === 0) {
    issues.push({ id: "ok", severity: "ok", category: "Health", device: "All Systems", message: "No bottlenecks detected. Network topology looks healthy.", icon: CheckCircle2 });
  }

  return issues;
}

export default function BottleneckAnalysis({ nodes = [], metricsHistory = [] }) {
  const issues = useMemo(() => analyzeBottlenecks(nodes, metricsHistory), [nodes, metricsHistory]);

  const criticalCount = issues.filter(i => i.severity === "critical").length;
  const warningCount = issues.filter(i => i.severity === "warning").length;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-border flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 text-yellow-400" />
        <span className="font-semibold text-sm text-foreground">Bottleneck Analysis</span>
        <div className="ml-auto flex gap-1.5">
          {criticalCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-semibold">{criticalCount} Critical</span>
          )}
          {warningCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-400 text-[10px] font-semibold">{warningCount} Warning</span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-2">
        {issues.map(issue => {
          const cfg = SEVERITY_CONFIG[issue.severity];
          const Icon = cfg.icon;
          return (
            <div key={issue.id} className={`rounded-lg border px-3 py-2.5 ${cfg.bg} flex items-start gap-2.5`}>
              <Icon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${cfg.color}`} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={`text-[10px] font-semibold uppercase tracking-wider ${cfg.color}`}>{issue.category}</span>
                  <span className="text-[10px] text-muted-foreground">• {issue.device}</span>
                </div>
                <p className="text-xs text-foreground leading-relaxed">{issue.message}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}