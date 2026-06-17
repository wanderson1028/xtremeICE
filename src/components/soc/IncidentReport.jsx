import React, { useState } from "react";
import { FileText, Download, Loader2, CheckCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ReactMarkdown from "react-markdown";

export default function IncidentReport({ scenario, alerts, logs, actionsLog, endpoints, score, elapsedMinutes, onReportGenerated }) {
  const [report, setReport] = useState("");
  const [loading, setLoading] = useState(false);
  const [generated, setGenerated] = useState(false);

  const generateReport = async () => {
    setLoading(true);
    const closedAlerts = alerts.filter(a => a.status === "closed");
    const openAlerts = alerts.filter(a => a.status === "open");
    const affectedEndpoints = endpoints.filter(e => e.status !== "healthy").map(e => e.name);
    const iocs = [];
    logs.filter(l => l.severity === "Critical").forEach(l => {
      if (l.detail.includes("185.220.101.45")) iocs.push("IP: 185.220.101.45 (C2)");
      if (l.detail.includes("evil-phish.com")) iocs.push("Domain: evil-phish.com");
      if (l.detail.includes("198.51.100.55")) iocs.push("IP: 198.51.100.55 (Attacker)");
      if (l.detail.includes(".locked")) iocs.push("Ransomware extension: .locked");
      if (l.detail.includes("backdoor_svc")) iocs.push("Backdoor account: backdoor_svc");
    });

    const prompt = `You are a senior incident responder generating a formal incident report. Write a comprehensive, professional incident report in markdown format.

INCIDENT DETAILS:
- Scenario: ${scenario?.name}
- Description: ${scenario?.description}
- MITRE Tactics: ${(scenario?.mitre || []).join(", ")}
- Duration: ${elapsedMinutes} minutes
- Analyst Score: ${score}/100

ALERT STATUS:
- Total Alerts: ${alerts.length}
- Closed/Triaged: ${closedAlerts.length}
- Still Open: ${openAlerts.length}

AFFECTED ASSETS:
${affectedEndpoints.length > 0 ? affectedEndpoints.join(", ") : "None identified by analyst"}

INDICATORS OF COMPROMISE (found in logs):
${[...new Set(iocs)].join("\n") || "None documented"}

ACTIONS TAKEN BY ANALYST:
${actionsLog.map(a => `- ${a.label}${a.target ? " → " + a.target : ""} at ${a.time}`).join("\n") || "No actions taken"}

CRITICAL LOG EVENTS:
${logs.filter(l => l.severity === "Critical").map(l => `- ${l.source}: ${l.event}`).join("\n")}

Generate a professional incident report with these sections:
1. Executive Summary
2. Incident Timeline
3. Affected Assets
4. Indicators of Compromise
5. Root Cause Analysis
6. Actions Taken
7. Evidence Collected
8. Chain of Custody
9. Business Impact
10. Containment & Remediation Status
11. Lessons Learned
12. Preventive Recommendations
13. MITRE ATT&CK Mapping

Make it detailed, professional, and realistic. Use proper incident response terminology.`;

    try {
      const result = await base44.integrations.Core.InvokeLLM({ prompt, model: "claude_sonnet_4_6" });
      setReport(typeof result === "string" ? result : result?.text || "Failed to generate report.");
      setGenerated(true);
      onReportGenerated?.();
    } catch (e) {
      setReport("⚠️ Failed to generate report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = () => {
    const blob = new Blob([report], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Incident_Report_${scenario?.name?.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 h-full overflow-y-auto space-y-4">
      {/* Score card */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#111] border border-border/30 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold font-mono text-primary">{score}</div>
          <div className="text-xs text-muted-foreground mt-1">Final Score</div>
        </div>
        <div className="bg-[#111] border border-border/30 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold font-mono text-green-400">{alerts.filter(a => a.status === "closed").length}</div>
          <div className="text-xs text-muted-foreground mt-1">Alerts Closed</div>
        </div>
        <div className="bg-[#111] border border-border/30 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold font-mono text-cyan-400">{actionsLog.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Actions Taken</div>
        </div>
        <div className="bg-[#111] border border-border/30 rounded-xl p-3 text-center">
          <div className="text-2xl font-bold font-mono text-yellow-400">{elapsedMinutes}m</div>
          <div className="text-xs text-muted-foreground mt-1">Response Time</div>
        </div>
      </div>

      {/* Action summary */}
      <div className="bg-[#111] border border-border/30 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border/20 text-xs font-semibold text-muted-foreground uppercase">Actions Taken During Incident</div>
        {actionsLog.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground text-sm">No actions recorded</div>
        ) : (
          <div className="divide-y divide-border/10 max-h-48 overflow-y-auto">
            {actionsLog.map((a, i) => (
              <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                <span className="text-lg">{a.icon}</span>
                <div className="flex-1">
                  <div className="text-xs text-foreground">{a.label}</div>
                  {a.target && <div className="text-[10px] text-muted-foreground">→ {a.target}</div>}
                </div>
                <span className="text-[10px] text-muted-foreground font-mono">{a.time}</span>
                <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Generate report button */}
      {!generated ? (
        <button
          onClick={generateReport}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary rounded-xl font-medium transition-all disabled:opacity-50"
        >
          {loading ? (
            <><Loader2 className="h-4 w-4 animate-spin" /> Generating AI Incident Report...</>
          ) : (
            <><FileText className="h-4 w-4" /> Generate Final Incident Report</>
          )}
        </button>
      ) : (
        <button
          onClick={downloadReport}
          className="w-full flex items-center justify-center gap-2 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/30 text-green-400 rounded-xl text-sm font-medium transition-all"
        >
          <Download className="h-4 w-4" /> Download Report (.md)
        </button>
      )}

      {/* Report content */}
      {report && (
        <div className="bg-[#111] border border-border/30 rounded-xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border/20 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold">Incident Report</span>
            <span className="ml-auto text-[10px] text-muted-foreground">AI Generated</span>
          </div>
          <div className="p-6 prose prose-sm prose-invert max-w-none">
            <ReactMarkdown
              components={{
                h1: ({ children }) => <h1 className="text-lg font-bold text-primary mt-4 mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-semibold text-foreground mt-3 mb-1.5">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold text-foreground/80 mt-2 mb-1">{children}</h3>,
                p: ({ children }) => <p className="text-sm text-foreground/80 my-1.5 leading-relaxed">{children}</p>,
                ul: ({ children }) => <ul className="my-1.5 ml-4 list-disc text-sm text-foreground/80">{children}</ul>,
                li: ({ children }) => <li className="my-0.5">{children}</li>,
                strong: ({ children }) => <strong className="text-foreground font-semibold">{children}</strong>,
                code: ({ children }) => <code className="px-1 py-0.5 rounded bg-secondary text-xs font-mono text-primary">{children}</code>,
                blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/40 pl-3 my-2 text-foreground/60">{children}</blockquote>,
              }}
            >
              {report}
            </ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  );
}