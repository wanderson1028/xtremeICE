import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ShieldCheck, Loader2, AlertTriangle, XCircle, CheckCircle2, ChevronDown, ChevronUp, Lightbulb, Zap, X, Wand2 } from "lucide-react";


const SEVERITY_CONFIG = {
  critical: { icon: XCircle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", label: "Critical" },
  warning:  { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", label: "Warning" },
  info:     { icon: Lightbulb, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30", label: "Info" },
};

function IssueCard({ issue, onImplement, onDismiss, isImplementing }) {
  const [open, setOpen] = useState(false);
  const cfg = SEVERITY_CONFIG[issue.severity] || SEVERITY_CONFIG.info;
  const Icon = cfg.icon;

  return (
    <div className={`rounded-lg border p-3 ${cfg.bg}`}>
      <button
        className="w-full flex items-start gap-3 text-left"
        onClick={() => setOpen(v => !v)}
      >
        <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${cfg.color}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground leading-snug">{issue.title}</p>
        </div>
        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${cfg.color} opacity-80`}>
          {cfg.label}
        </span>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0" />}
      </button>
      {open && (
        <div className="mt-2 ml-7 space-y-2">
          <p className="text-xs text-muted-foreground leading-relaxed">{issue.description}</p>
          {issue.suggestion && (
            <div className="rounded-md bg-primary/10 border border-primary/20 px-3 py-2">
              <p className="text-xs font-semibold text-primary mb-0.5">Suggestion</p>
              <p className="text-xs text-foreground/80 leading-relaxed">{issue.suggestion}</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={(e) => { e.stopPropagation(); onImplement(); }}
                  disabled={isImplementing}
                  className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-primary/20 hover:bg-primary/30 text-primary transition-colors disabled:opacity-60"
                >
                  {isImplementing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Zap className="h-3 w-3" />}
                  {isImplementing ? "Applying…" : "Implement"}
                </button>
                <button
                  onClick={(e) => { e.stopPropagation(); onDismiss(); }}
                  disabled={isImplementing}
                  className="flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-md bg-secondary hover:bg-secondary/80 text-muted-foreground transition-colors disabled:opacity-60"
                >
                  <X className="h-3 w-3" /> Dismiss
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function NetworkValidationPanel({ design, onUpdateDesign }) {
  const [loading, setLoading] = useState(false);
  const [implementing, setImplementing] = useState(null);
  const [fixingAll, setFixingAll] = useState(false);
  const [fixAllProgress, setFixAllProgress] = useState({ current: 0, total: 0 });
  const [result, setResult] = useState(null);
  const [dismissedIndexes, setDismissedIndexes] = useState([]);

  const handleDismiss = (globalIdx) => {
    setDismissedIndexes(prev => [...prev, globalIdx]);
  };

  const handleImplement = async (issue, globalIdx) => {
    setImplementing(globalIdx);

    // Ask LLM what design fields to update based on the suggestion
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a network design expert. Given this network design issue and its suggestion, return the exact JSON field updates needed to apply the fix to the design object.

Issue: ${issue.title}
Description: ${issue.description}
Suggestion: ${issue.suggestion}

Current design fields:
${JSON.stringify({
  firewall_enabled: design.firewall_enabled,
  firewall_vendor: design.firewall_vendor,
  dmz_required: design.dmz_required,
  redundancy_enabled: design.redundancy_enabled,
  load_balancer: design.load_balancer,
  wireless_enabled: design.wireless_enabled,
  routing_protocol: design.routing_protocol,
  wan_technology: design.wan_technology,
  num_vlans_per_site: design.num_vlans_per_site,
  vlan_names: design.vlan_names,
  ntp_server: design.ntp_server,
  dns_servers: design.dns_servers,
  server_farm: design.server_farm,
  num_servers: design.num_servers,
}, null, 2)}

Valid enum values:
- firewall_vendor: "Cisco ASA", "Palo Alto", "Fortinet", "pfSense", "None"
- routing_protocol: "OSPF", "EIGRP", "BGP", "Static", "IS-IS", "RIP"
- wan_technology: "MPLS", "SD-WAN", "IPSec VPN", "DMVPN", "Metro Ethernet", "Leased Line"

Return ONLY a JSON object with the fields to update (e.g. {"firewall_enabled": true, "dmz_required": true}). Only include fields that actually change. If no direct field changes apply, return {}.`,
      response_json_schema: {
        type: "object",
        properties: {
          firewall_enabled: { type: "boolean" },
          firewall_vendor: { type: "string" },
          dmz_required: { type: "boolean" },
          redundancy_enabled: { type: "boolean" },
          load_balancer: { type: "boolean" },
          wireless_enabled: { type: "boolean" },
          routing_protocol: { type: "string" },
          wan_technology: { type: "string" },
          num_vlans_per_site: { type: "number" },
          vlan_names: { type: "array", items: { type: "string" } },
          ntp_server: { type: "string" },
          dns_servers: { type: "array", items: { type: "string" } },
          server_farm: { type: "boolean" },
          num_servers: { type: "number" },
        },
      },
    });

    // Apply updates and remove empty/null values
    const updates = Object.fromEntries(
      Object.entries(res).filter(([, v]) => v !== null && v !== undefined)
    );

    if (Object.keys(updates).length > 0) {
      await onUpdateDesign(updates);
    }

    // Dismiss the issue and re-run validation with updated design
    handleDismiss(globalIdx);
    setImplementing(null);

    // Re-run validation automatically after a short delay
    setTimeout(() => runValidation({ ...design, ...updates }), 400);
  };

  const runValidation = async (designOverride) => {
    const d = designOverride || design;
    setLoading(true);
    setResult(null);
    setDismissedIndexes([]);
    const prompt = `You are a senior network security and architecture expert. Analyze the following network design configuration and identify misconfigurations, security vulnerabilities, and areas for improvement.

Network Design:
- Name: ${d.name}
- Company: ${d.company_name || "N/A"}
- Topology: ${d.topology_type || "N/A"}
- Sites: ${d.num_sites || 1}, Names: ${(d.site_names || []).join(", ") || "N/A"}
- Routing Protocol: ${d.routing_protocol || "N/A"}
- WAN Technology: ${d.wan_technology || "N/A"}
- VLANs per site: ${d.num_vlans_per_site || 0}, Names: ${(d.vlan_names || []).join(", ") || "N/A"}
- Firewall: ${d.firewall_enabled ? d.firewall_vendor : "Disabled"}
- DMZ: ${d.dmz_required ? "Yes" : "No"}
- Redundancy: ${d.redundancy_enabled ? "Yes" : "No"}
- Load Balancer: ${d.load_balancer ? "Yes" : "No"}
- Wireless: ${d.wireless_enabled ? "Yes" : "No"}
- Server Farm: ${d.server_farm ? `Yes (${d.num_servers || 0} servers)` : "No"}
- Router Model: ${d.router_model || "N/A"}
- Switch Model: ${d.switch_model || "N/A"}
- IP Scheme: ${d.ip_scheme || "N/A"}
- Domain: ${d.domain_name || "N/A"}
- NTP Server: ${d.ntp_server || "N/A"}
- DNS Servers: ${(d.dns_servers || []).join(", ") || "N/A"}
- User Devices: ${d.num_user_devices || 0} (${(d.user_device_types || []).join(", ") || "N/A"})

Return a JSON with: { "score": number (0-100, overall security/design score), "summary": string (1-2 sentence overall assessment), "issues": [ { "severity": "critical"|"warning"|"info", "title": string, "description": string, "suggestion": string } ] }

Check for: missing firewall, no redundancy on critical topologies, weak/missing VLAN segmentation, no DMZ with server farm, missing NTP/DNS, wireless without proper segmentation, single points of failure, security best practices.`;

    const res = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          score: { type: "number" },
          summary: { type: "string" },
          issues: {
            type: "array",
            items: {
              type: "object",
              properties: {
                severity: { type: "string" },
                title: { type: "string" },
                description: { type: "string" },
                suggestion: { type: "string" },
              },
            },
          },
        },
      },
    });

    setResult(res);
    setLoading(false);
  };

  const handleFixAll = async () => {
    if (!result?.issues) return;
    const activeIssues = result.issues
      .map((issue, globalIdx) => ({ issue, globalIdx }))
      .filter(({ globalIdx }) => !dismissedIndexes.includes(globalIdx))
      .filter(({ issue }) => issue.suggestion);

    if (activeIssues.length === 0) return;

    setFixingAll(true);
    setFixAllProgress({ current: 0, total: activeIssues.length });

    let accumulatedDesign = { ...design };
    const allDismissed = [...dismissedIndexes];

    for (let i = 0; i < activeIssues.length; i++) {
      const { issue, globalIdx } = activeIssues[i];
      setFixAllProgress({ current: i + 1, total: activeIssues.length });

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a network design expert. Given this network design issue and its suggestion, return the exact JSON field updates needed to apply the fix to the design object.

Issue: ${issue.title}
Description: ${issue.description}
Suggestion: ${issue.suggestion}

Current design fields:
${JSON.stringify({
  firewall_enabled: accumulatedDesign.firewall_enabled,
  firewall_vendor: accumulatedDesign.firewall_vendor,
  dmz_required: accumulatedDesign.dmz_required,
  redundancy_enabled: accumulatedDesign.redundancy_enabled,
  load_balancer: accumulatedDesign.load_balancer,
  wireless_enabled: accumulatedDesign.wireless_enabled,
  routing_protocol: accumulatedDesign.routing_protocol,
  wan_technology: accumulatedDesign.wan_technology,
  num_vlans_per_site: accumulatedDesign.num_vlans_per_site,
  vlan_names: accumulatedDesign.vlan_names,
  ntp_server: accumulatedDesign.ntp_server,
  dns_servers: accumulatedDesign.dns_servers,
  server_farm: accumulatedDesign.server_farm,
  num_servers: accumulatedDesign.num_servers,
}, null, 2)}

Valid enum values:
- firewall_vendor: "Cisco ASA", "Palo Alto", "Fortinet", "pfSense", "None"
- routing_protocol: "OSPF", "EIGRP", "BGP", "Static", "IS-IS", "RIP"
- wan_technology: "MPLS", "SD-WAN", "IPSec VPN", "DMVPN", "Metro Ethernet", "Leased Line"

Return ONLY a JSON object with the fields to update. Only include fields that actually change. If no direct field changes apply, return {}.`,
        response_json_schema: {
          type: "object",
          properties: {
            firewall_enabled: { type: "boolean" },
            firewall_vendor: { type: "string" },
            dmz_required: { type: "boolean" },
            redundancy_enabled: { type: "boolean" },
            load_balancer: { type: "boolean" },
            wireless_enabled: { type: "boolean" },
            routing_protocol: { type: "string" },
            wan_technology: { type: "string" },
            num_vlans_per_site: { type: "number" },
            vlan_names: { type: "array", items: { type: "string" } },
            ntp_server: { type: "string" },
            dns_servers: { type: "array", items: { type: "string" } },
            server_farm: { type: "boolean" },
            num_servers: { type: "number" },
          },
        },
      });

      const updates = Object.fromEntries(
        Object.entries(res).filter(([, v]) => v !== null && v !== undefined)
      );

      if (Object.keys(updates).length > 0) {
        accumulatedDesign = { ...accumulatedDesign, ...updates };
        await onUpdateDesign(updates);
      }

      allDismissed.push(globalIdx);
      setDismissedIndexes([...allDismissed]);
    }

    setFixingAll(false);
    setFixAllProgress({ current: 0, total: 0 });
    setTimeout(() => runValidation(accumulatedDesign), 400);
  };

  const criticalCount = result?.issues?.filter(i => i.severity === "critical").length || 0;
  const warningCount = result?.issues?.filter(i => i.severity === "warning").length || 0;
  const infoCount = result?.issues?.filter(i => i.severity === "info").length || 0;

  const scoreColor =
    !result ? "" :
    result.score >= 80 ? "text-green-400" :
    result.score >= 60 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="mt-6 rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-primary" />
          <h2 className="text-base font-semibold text-foreground">Network Validation</h2>
        </div>
        <div className="flex items-center gap-2">
          {result && !loading && (result.issues || []).some((_, i) => !dismissedIndexes.includes(i)) && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleFixAll}
              disabled={fixingAll || loading}
              className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
            >
              {fixingAll
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Fixing {fixAllProgress.current}/{fixAllProgress.total}…</>
                : <><Wand2 className="h-3.5 w-3.5" /> Fix All</>
              }
            </Button>
          )}
          <Button size="sm" onClick={runValidation} disabled={loading || fixingAll} className="gap-2">
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
            {loading ? "Analyzing…" : result ? "Re-run Analysis" : "Run Validation"}
          </Button>
        </div>
      </div>

      {!result && !loading && (
        <div className="px-5 py-10 text-center text-muted-foreground text-sm">
          Click <span className="text-foreground font-medium">Run Validation</span> to analyze your design for security issues and misconfigurations.
        </div>
      )}

      {loading && (
        <div className="px-5 py-10 flex flex-col items-center gap-3 text-muted-foreground text-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p>Running network validation…</p>
        </div>
      )}

      {result && !loading && (
        <div className="p-5 space-y-4">
          {/* Score + summary */}
          <div className="flex items-center gap-5 rounded-lg bg-secondary/40 px-4 py-3">
            <div className="text-center">
              <p className={`text-3xl font-bold ${scoreColor}`}>{result.score}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide">/ 100</p>
            </div>
            <div className="flex-1">
              <p className="text-sm text-foreground leading-relaxed">{result.summary}</p>
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                {criticalCount > 0 && <span className="text-red-400 font-medium">{criticalCount} Critical</span>}
                {warningCount > 0 && <span className="text-yellow-400 font-medium">{warningCount} Warning{warningCount > 1 ? "s" : ""}</span>}
                {infoCount > 0 && <span className="text-blue-400 font-medium">{infoCount} Suggestion{infoCount > 1 ? "s" : ""}</span>}
                {result.issues?.length === 0 && <span className="text-green-400 font-medium flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />No issues found</span>}
              </div>
            </div>
          </div>

          {/* Issues grouped by severity */}
          {["critical", "warning", "info"].map(sev => {
            const items = (result.issues || [])
              .map((issue, globalIdx) => ({ issue, globalIdx }))
              .filter(({ issue, globalIdx }) => issue.severity === sev && !dismissedIndexes.includes(globalIdx));
            if (!items.length) return null;
            return (
              <div key={sev} className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1">
                  {SEVERITY_CONFIG[sev].label}
                </p>
                {items.map(({ issue, globalIdx }) => (
                  <IssueCard
                    key={globalIdx}
                    issue={issue}
                    isImplementing={implementing === globalIdx || fixingAll}
                    onImplement={() => handleImplement(issue, globalIdx)}
                    onDismiss={() => handleDismiss(globalIdx)}
                  />
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}