import React, { useMemo, useState } from "react";
import { CheckCircle2, XCircle, AlertTriangle, ChevronDown, ChevronUp, ClipboardCheck } from "lucide-react";

function validateDesign(design, nodes) {
  const checks = [];

  if (!design) return checks;

  // Routing
  checks.push({
    id: "routing",
    category: "Routing",
    label: "Routing protocol configured",
    passed: !!design.routing_protocol,
    detail: design.routing_protocol ? `Using ${design.routing_protocol}` : "No routing protocol selected",
  });

  // Firewall
  checks.push({
    id: "firewall",
    category: "Security",
    label: "Firewall enabled",
    passed: !!design.firewall_enabled,
    detail: design.firewall_enabled ? `${design.firewall_vendor || "Generic"} firewall present` : "No firewall — perimeter unprotected",
    severity: design.firewall_enabled ? "ok" : "critical",
  });

  // Redundancy
  checks.push({
    id: "redundancy",
    category: "Reliability",
    label: "Redundancy enabled",
    passed: !!design.redundancy_enabled,
    detail: design.redundancy_enabled ? "HA/redundant links configured" : "No redundancy — single point of failure risk",
    severity: design.redundancy_enabled ? "ok" : "warning",
  });

  // DNS
  checks.push({
    id: "dns",
    category: "Services",
    label: "DNS servers configured",
    passed: !!(design.dns_servers && design.dns_servers.filter(Boolean).length > 0),
    detail: design.dns_servers?.filter(Boolean).length > 0 ? `DNS: ${design.dns_servers.filter(Boolean).join(", ")}` : "No DNS servers defined",
    severity: design.dns_servers?.length > 0 ? "ok" : "warning",
  });

  // NTP
  checks.push({
    id: "ntp",
    category: "Services",
    label: "NTP server configured",
    passed: !!design.ntp_server,
    detail: design.ntp_server ? `NTP: ${design.ntp_server}` : "No NTP server — time sync issues may occur",
    severity: design.ntp_server ? "ok" : "warning",
  });

  // IP scheme
  checks.push({
    id: "ip",
    category: "Addressing",
    label: "IP addressing scheme defined",
    passed: !!design.ip_scheme,
    detail: design.ip_scheme ? `Scheme: ${design.ip_scheme}` : "No IP scheme specified",
    severity: design.ip_scheme ? "ok" : "warning",
  });

  // Domain name
  checks.push({
    id: "domain",
    category: "Identity",
    label: "Domain name configured",
    passed: !!design.domain_name,
    detail: design.domain_name ? `Domain: ${design.domain_name}` : "No domain name set",
  });

  // Credentials
  checks.push({
    id: "creds",
    category: "Security",
    label: "Device credentials set",
    passed: !!(design.device_username && design.device_password),
    detail: design.device_username ? `Username: ${design.device_username}` : "No device credentials configured",
    severity: !!(design.device_username && design.device_password) ? "ok" : "warning",
  });

  // Sites
  checks.push({
    id: "sites",
    category: "Topology",
    label: "Sites configured",
    passed: !!(design.num_sites && design.num_sites > 0),
    detail: design.num_sites ? `${design.num_sites} site(s) configured` : "No sites defined",
  });

  // Load balancer for server farm
  if (design.server_farm && design.num_servers > 2) {
    checks.push({
      id: "lb",
      category: "Performance",
      label: "Load balancer for server farm",
      passed: !!design.load_balancer,
      detail: design.load_balancer ? "Load balancer present" : `${design.num_servers} servers without load balancer`,
      severity: design.load_balancer ? "ok" : "warning",
    });
  }

  return checks;
}

export default function ConfigValidation({ design, nodes = [] }) {
  const [expanded, setExpanded] = useState(true);
  const checks = useMemo(() => validateDesign(design, nodes), [design, nodes]);

  const passed = checks.filter(c => c.passed).length;
  const total = checks.length;
  const score = total > 0 ? Math.round((passed / total) * 100) : 0;
  const scoreColor = score >= 80 ? "text-green-400" : score >= 60 ? "text-yellow-400" : "text-red-400";

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">Config Validation</span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-sm font-bold ${scoreColor}`}>{score}%</span>
          <span className="text-xs text-muted-foreground">{passed}/{total}</span>
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-border p-4 space-y-2">
          {/* Score bar */}
          <div className="mb-3">
            <div className="h-2 rounded-full bg-secondary overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${score >= 80 ? "bg-green-500" : score >= 60 ? "bg-yellow-500" : "bg-red-500"}`}
                style={{ width: `${score}%` }}
              />
            </div>
          </div>

          {checks.map(check => {
            const severity = check.severity || (check.passed ? "ok" : "warning");
            return (
              <div key={check.id} className="flex items-start gap-2.5">
                {check.passed
                  ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400 mt-0.5 shrink-0" />
                  : severity === "critical"
                    ? <XCircle className="h-3.5 w-3.5 text-red-400 mt-0.5 shrink-0" />
                    : <AlertTriangle className="h-3.5 w-3.5 text-yellow-400 mt-0.5 shrink-0" />
                }
                <div>
                  <p className={`text-xs font-medium ${check.passed ? "text-foreground" : "text-muted-foreground"}`}>
                    {check.label}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{check.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}