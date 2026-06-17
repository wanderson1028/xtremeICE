import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, AlertCircle, AlertTriangle, Send, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

function validateDesign(design, nodes) {
  const checks = [];
  if (!design) return checks;

  checks.push({ id: "routing", category: "Routing", label: "Routing protocol configured", passed: !!design.routing_protocol, detail: design.routing_protocol ? `Using ${design.routing_protocol}` : "No routing protocol selected — dynamic routing is required.", severity: design.routing_protocol ? "ok" : "critical" });
  checks.push({ id: "wan", category: "Connectivity", label: "WAN technology selected", passed: !!design.wan_technology, detail: design.wan_technology ? `WAN: ${design.wan_technology}` : "No WAN technology chosen — needed for site connectivity.", severity: design.wan_technology ? "ok" : "critical" });
  checks.push({ id: "firewall", category: "Security", label: "Firewall enabled", passed: !!design.firewall_enabled, detail: design.firewall_enabled ? `${design.firewall_vendor || "Generic"} firewall present` : "No firewall — perimeter is unprotected.", severity: design.firewall_enabled ? "ok" : "critical" });
  checks.push({ id: "creds", category: "Security", label: "Device credentials set", passed: !!(design.device_username && design.device_password), detail: design.device_username ? `Username: ${design.device_username}` : "No device credentials configured — all devices require authentication.", severity: !!(design.device_username && design.device_password) ? "ok" : "warning" });
  checks.push({ id: "redundancy", category: "Reliability", label: "Redundancy enabled", passed: !!design.redundancy_enabled, detail: design.redundancy_enabled ? "HA/redundant links configured" : "No redundancy — single points of failure risk.", severity: design.redundancy_enabled ? "ok" : "warning" });
  checks.push({ id: "ip", category: "Addressing", label: "IP addressing scheme defined", passed: !!design.ip_scheme, detail: design.ip_scheme ? `Scheme: ${design.ip_scheme}` : "No IP scheme specified — required for proper network segmentation.", severity: design.ip_scheme ? "ok" : "warning" });
  checks.push({ id: "sites", category: "Topology", label: "Sites configured", passed: !!(design.num_sites && design.num_sites > 0), detail: design.num_sites ? `${design.num_sites} site(s) configured` : "No sites defined.", severity: design.num_sites ? "ok" : "critical" });
  checks.push({ id: "dmz", category: "Architecture", label: "DMZ or server farm present", passed: !!(design.server_farm || design.dmz_required), detail: (design.server_farm || design.dmz_required) ? "DMZ/server farm present" : "No DMZ or server farm — services should be separated from the internal network.", severity: (design.server_farm || design.dmz_required) ? "ok" : "warning" });
  checks.push({ id: "dns", category: "Services", label: "DNS servers configured", passed: !!(design.dns_servers && design.dns_servers.filter(Boolean).length > 0), detail: design.dns_servers?.filter(Boolean).length > 0 ? `DNS: ${design.dns_servers.filter(Boolean).join(", ")}` : "No DNS servers defined.", severity: design.dns_servers?.filter(Boolean).length > 0 ? "ok" : "warning" });
  checks.push({ id: "ntp", category: "Services", label: "NTP server configured", passed: !!design.ntp_server, detail: design.ntp_server ? `NTP: ${design.ntp_server}` : "No NTP server — time synchronization issues may affect logging and certificates.", severity: design.ntp_server ? "ok" : "warning" });
  checks.push({ id: "domain", category: "Identity", label: "Domain name configured", passed: !!design.domain_name, detail: design.domain_name ? `Domain: ${design.domain_name}` : "No domain name set — required for SSH key generation and identity.", severity: design.domain_name ? "ok" : "warning" });
  checks.push({ id: "nodes", category: "Diagram", label: "Diagram contains devices", passed: (nodes?.length || 0) > 3, detail: (nodes?.length || 0) > 3 ? `${nodes.length} nodes in diagram` : "Diagram has too few devices — build out the topology.", severity: (nodes?.length || 0) > 3 ? "ok" : "critical" });

  if (design.server_farm && design.num_servers > 2) {
    checks.push({ id: "lb", category: "Performance", label: "Load balancer for server farm", passed: !!design.load_balancer, detail: design.load_balancer ? "Load balancer present" : `${design.num_servers} servers without a load balancer — high availability at risk.`, severity: design.load_balancer ? "ok" : "warning" });
  }

  return checks;
}

function scoreDesign(design, diagramData) {
  const checks = validateDesign(design, diagramData?.nodes);
  const total = checks.length;
  const passed = checks.filter(c => c.passed).length;
  const score = total > 0 ? Math.round((passed / total) * 100) : 0;
  return { checks, score, passed, total };
}

export default function SubmitDesignDialog({ open, onClose, design, diagramData }) {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { checks, score } = scoreDesign(design, diagramData);

  const scoreColor = score >= 80 ? "text-green-400" : score >= 50 ? "text-yellow-400" : "text-red-400";
  const scoreBg = score >= 80 ? "border-green-500/30 bg-green-500/10" : score >= 50 ? "border-yellow-500/30 bg-yellow-500/10" : "border-red-500/30 bg-red-500/10";
  const grade = score >= 90 ? "A" : score >= 80 ? "B" : score >= 70 ? "C" : score >= 60 ? "D" : "F";

  const [submitError, setSubmitError] = useState(null);

  const handleSubmit = async () => {
    setSubmitting(true);
    setSubmitError(null);

    // Read LTI context — window global is most reliable in cross-origin iframes
    // (localStorage/sessionStorage can be blocked by browser privacy policies)
    const sourcedId =
      window.__ltiParams?.sourcedId ||
      sessionStorage.getItem("lti_sourced_id") ||
      localStorage.getItem("lti_sourced_id") || "";
    const outcomeUrl =
      window.__ltiParams?.outcomeUrl ||
      sessionStorage.getItem("lti_outcome_url") ||
      localStorage.getItem("lti_outcome_url") || "";

    console.log("LTI Grade Passback — sourcedId:", sourcedId || "MISSING", "outcomeUrl:", outcomeUrl || "MISSING");
    console.log("LTI window.__ltiParams:", JSON.stringify(window.__ltiParams));

    // Debug: dump all storage keys
    let lsKeys = [];
    try {
      lsKeys = Object.keys(localStorage).filter(k => k.startsWith("lti_"));
      console.log("LTI localStorage keys:", lsKeys.map(k => `${k}=${localStorage.getItem(k)}`));
    } catch(e) { console.warn("Storage read blocked:", e); }

    if (sourcedId && outcomeUrl) {
      try {
        const res = await base44.functions.invoke("ltiGradePassback", {
          score,
          sourcedId,
          outcomeUrl,
          designId: design?.id,
        });
        console.log("Grade passback result:", JSON.stringify(res?.data));
        if (res?.data?.success === false) {
          setSubmitError(`Moodle error: ${res.data.message || "Unknown error"}. Response: ${res.data.moodle_response || ""}`);
        }
      } catch (err) {
        console.error("Grade passback error:", err);
        setSubmitError("Could not send grade to Moodle: " + err.message);
      }
    } else {
      const msg = `No LTI context found — grade passback skipped. sourcedId: "${sourcedId}", outcomeUrl: "${outcomeUrl}". Storage keys: [${lsKeys.join(",")}]`;
      console.warn(msg);
      // Only show error if this looks like it should be an LTI session
      const isLtiSession = window.__ltiEmbedded === true || localStorage.getItem("lti_embedded") === "true";
      if (isLtiSession) {
        setSubmitError("LTI grade info not found. Please re-launch this activity from Moodle and try again.");
      }
      // If not an LTI session at all, silent success is fine (direct app access)
    }

    // Also post message to parent frame
    if (window.parent !== window) {
      window.parent.postMessage({
        type: "design_submitted",
        score,
        grade,
        designName: design?.name,
        passed: checks.filter(c => c.ok).length,
        total: checks.length,
      }, "*");
    }

    setSubmitting(false);
    setSubmitted(true);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">Submit Network Design</DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="text-center py-8 space-y-3">
            {submitError ? (
              <>
                <AlertCircle className="h-12 w-12 text-yellow-400 mx-auto" />
                <h2 className="text-xl font-bold text-foreground">Submission Issue</h2>
                <p className="text-sm text-yellow-300 bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3">{submitError}</p>
                <p className="text-muted-foreground text-xs">Your score was {score}% (Grade: {grade}). Please contact your instructor.</p>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-12 w-12 text-green-400 mx-auto" />
                <h2 className="text-xl font-bold text-foreground">Design Submitted!</h2>
                <p className="text-muted-foreground text-sm">Your score of <span className={`font-bold ${scoreColor}`}>{score}%</span> (Grade: <span className="font-bold text-foreground">{grade}</span>) has been recorded.</p>
              </>
            )}
            <Button onClick={onClose} className="mt-2">Close</Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Score summary */}
            <div className={`rounded-xl border p-4 text-center ${scoreBg}`}>
              <div className={`text-5xl font-bold ${scoreColor}`}>{score}%</div>
              <div className="text-muted-foreground text-sm mt-1">Auto-score · Grade: <span className="font-semibold text-foreground">{grade}</span></div>
            </div>

            {/* Checklist */}
            <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
              {checks.map((c, i) => {
                const severity = c.severity || (c.passed ? "ok" : "warning");
                return (
                  <div key={i} className={`flex items-start gap-2 p-2 rounded-lg ${c.passed ? "bg-secondary/30" : severity === "critical" ? "bg-red-500/10 border border-red-500/20" : "bg-yellow-500/10 border border-yellow-500/20"}`}>
                    {c.passed
                      ? <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                      : severity === "critical"
                        ? <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                        : <AlertTriangle className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-xs font-medium ${c.passed ? "text-foreground" : severity === "critical" ? "text-red-300" : "text-yellow-300"}`}>{c.label}</span>
                        <Badge variant="outline" className="text-[10px] shrink-0 text-muted-foreground">{c.category}</Badge>
                      </div>
                      {!c.passed && <p className="text-[10px] text-muted-foreground mt-0.5">{c.detail}</p>}
                    </div>
                  </div>
                );
              })}
            </div>

            {score < 100 && (
              <div className="flex items-start gap-2 text-xs text-yellow-300 bg-yellow-400/10 border border-yellow-400/20 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>Fix the items marked in red to improve your score before submitting.</span>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
              <Button onClick={handleSubmit} disabled={submitting} className="flex-1 gap-2 bg-primary text-primary-foreground">
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Submit to Instructor
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}