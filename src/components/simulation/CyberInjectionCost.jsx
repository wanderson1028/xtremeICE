import React, { useMemo } from "react";
import { TrendingDown, AlertTriangle, DollarSign, Clock, Database, Wrench } from "lucide-react";

const SEVERITY_MULTIPLIER = {
  critical: 1.0,
  high: 0.65,
  warning: 0.35,
  medium: 0.35,
  low: 0.15,
  info: 0.05,
};

const DEVICE_IMPACT = {
  server: { base: 45000, label: "Server" },
  firewall: { base: 38000, label: "Firewall" },
  router: { base: 28000, label: "Router" },
  switch: { base: 18000, label: "Switch" },
  loadbalancer: { base: 32000, label: "Load Balancer" },
  ot: { base: 75000, label: "OT/ICS Device" },
  wireless: { base: 12000, label: "Wireless AP" },
  workstation: { base: 8500, label: "Workstation" },
  phone: { base: 4200, label: "Phone" },
  internet: { base: 50000, label: "Internet Gateway" },
  dmz: { base: 40000, label: "DMZ Asset" },
};

const SCENARIO_BREACH_COST = {
  "Ransomware": 85000,
  "Data Exfiltration": 72000,
  "DDoS Flood": 28000,
  "Phishing Attack": 18000,
  "Insider Threat": 62000,
  "Supply Chain": 55000,
  "Zero-Day Exploit": 95000,
  "Credential Stuffing": 22000,
  "SQL Injection": 48000,
  "Man-in-the-Middle": 35000,
  "Malware Outbreak": 52000,
  "Privilege Escalation": 41000,
};

function formatCurrency(value) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export default function CyberInjectionCost({ scenario, eventLog, nodes, design }) {
  const cost = useMemo(() => {
    if (!scenario) return null;

    const severity = scenario.defaults?.severity || "warning";
    const severityMult = SEVERITY_MULTIPLIER[severity] ?? 0.35;
    const scenarioLabel = scenario.label || "Custom Attack";
    const breachBase = SCENARIO_BREACH_COST[scenarioLabel] ?? 35000;

    // Affected devices from event log
    const affectedDevices = (eventLog || []).map((ev) => {
      const node = (nodes || []).find((n) => n.label.replace(/\n/g, " ") === ev.device);
      return { ...ev, type: node?.type || "workstation" };
    });

    const uniqueDevices = affectedDevices.filter(
      (d, i, arr) => arr.findIndex((x) => x.device === d.device) === i
    );

    // Device damage cost
    let deviceCost = 0;
    const deviceBreakdown = {};
    uniqueDevices.forEach((d) => {
      const impact = DEVICE_IMPACT[d.type] ?? DEVICE_IMPACT.workstation;
      deviceCost += impact.base * severityMult;
      deviceBreakdown[impact.label] = (deviceBreakdown[impact.label] || 0) + 1;
    });

    // Downtime cost (per hour, scaled by severity and device count)
    const downtimeHours = severity === "critical" ? 8 : severity === "high" ? 4 : 2;
    const hourlyRate = (design?.num_user_devices || 10) * 120 + (design?.server_farm ? 2000 : 500);
    const downtimeCost = downtimeHours * hourlyRate * Math.max(uniqueDevices.length, 1);

    // Data breach cost
    const dataBreachCost = breachBase * severityMult * Math.max(uniqueDevices.length, 1);

    // Recovery / remediation cost
    const recoveryCost = (deviceCost + downtimeCost + dataBreachCost) * 0.25;

    const total = deviceCost + downtimeCost + dataBreachCost + recoveryCost;

    return {
      total,
      deviceCost,
      downtimeCost,
      downtimeHours,
      dataBreachCost,
      recoveryCost,
      severity,
      affectedCount: uniqueDevices.length,
      deviceBreakdown,
      scenarioLabel,
    };
  }, [scenario, eventLog, nodes, design]);

  if (!scenario) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
            <TrendingDown className="h-4 w-4 text-red-500" />
          </div>
          <h3 className="font-semibold text-sm text-foreground">Cyber Injection Cost</h3>
        </div>
        <p className="text-xs text-muted-foreground">
          Run an attack simulation to see the estimated financial impact on this network.
        </p>
      </div>
    );
  }

  if (!cost) {
    return (
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
            <TrendingDown className="h-4 w-4 text-red-500" />
          </div>
          <h3 className="font-semibold text-sm text-foreground">Cyber Injection Cost</h3>
        </div>
        <p className="text-xs text-muted-foreground">Calculating impact…</p>
      </div>
    );
  }

  const severityColor = {
    critical: "text-red-600 bg-red-50 border-red-200",
    high: "text-orange-600 bg-orange-50 border-orange-200",
    warning: "text-yellow-600 bg-yellow-50 border-yellow-200",
    medium: "text-yellow-600 bg-yellow-50 border-yellow-200",
    low: "text-blue-600 bg-blue-50 border-blue-200",
    info: "text-gray-600 bg-gray-50 border-gray-200",
  }[cost.severity] || "text-gray-600 bg-gray-50 border-gray-200";

  return (
    <div className="bg-card border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
            <TrendingDown className="h-4 w-4 text-red-500" />
          </div>
          <h3 className="font-semibold text-sm text-foreground">Cyber Injection Cost</h3>
        </div>
        <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${severityColor}`}>
          {cost.severity}
        </span>
      </div>

      {/* Total impact */}
      <div className="bg-gradient-to-br from-red-500/5 to-orange-500/5 border border-red-200/40 rounded-lg p-3 mb-3">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">Estimated Financial Impact</p>
        <p className="text-2xl font-bold text-red-600">{formatCurrency(cost.total)}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {cost.scenarioLabel} · {cost.affectedCount} device{cost.affectedCount !== 1 ? "s" : ""} affected
        </p>
      </div>

      {/* Cost breakdown */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Device Damage</span>
          </div>
          <span className="font-medium text-foreground">{formatCurrency(cost.deviceCost)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Downtime ({cost.downtimeHours}h)</span>
          </div>
          <span className="font-medium text-foreground">{formatCurrency(cost.downtimeCost)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <Database className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Data Breach</span>
          </div>
          <span className="font-medium text-foreground">{formatCurrency(cost.dataBreachCost)}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">Recovery & Remediation</span>
          </div>
          <span className="font-medium text-foreground">{formatCurrency(cost.recoveryCost)}</span>
        </div>
      </div>

      {/* Affected devices */}
      {Object.keys(cost.deviceBreakdown).length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Affected Assets</p>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(cost.deviceBreakdown).map(([type, count]) => (
              <span key={type} className="text-[10px] bg-secondary border border-border rounded px-1.5 py-0.5 text-muted-foreground">
                {count}× {type}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="mt-3 flex items-start gap-1.5 text-[10px] text-muted-foreground">
        <AlertTriangle className="h-3 w-3 shrink-0 mt-0.5" />
        <span>Estimate based on attack severity, affected device types, and industry averages. Actual costs may vary.</span>
      </div>
    </div>
  );
}