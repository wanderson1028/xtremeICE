import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Wrench, Loader2, Download, Copy, CheckCheck, ChevronDown, ChevronUp, Terminal, FileCode, Package } from "lucide-react";

function downloadFile(filename, content) {
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={handleCopy} className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
      {copied ? <CheckCheck className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

export default function AutomatedRemediation({ exploitResult, design }) {
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(false);
  const [scripts, setScripts] = useState(null);
  const [openScript, setOpenScript] = useState(null);

  const vulnerableAttacks = exploitResult?.attacks?.filter(a => a.outcome !== "blocked") || [];

  const generateScripts = async () => {
    if (!exploitResult || vulnerableAttacks.length === 0) return;
    setLoading(true);
    setScripts(null);

    const weaknessSummary = vulnerableAttacks.map(a => ({
      name: a.name,
      vector: a.vector,
      severity: a.severity,
      remediation: a.remediation,
      outcome_explanation: a.outcome_explanation,
    }));

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a senior network security engineer. Based on the following vulnerabilities found in a network design, generate production-ready CLI remediation scripts for each one.

Network Design Context:
- Router Model: ${design?.router_model || "Cisco ISR"}
- Switch Model: ${design?.switch_model || "Cisco Catalyst"}
- Firewall: ${design?.firewall_vendor || "None"}
- Routing Protocol: ${design?.routing_protocol || "Static"}
- Has Firewall: ${design?.firewall_enabled}
- Has DMZ: ${design?.dmz_required}
- Has Redundancy: ${design?.redundancy_enabled}
- WAN Technology: ${design?.wan_technology || "N/A"}

Vulnerabilities to remediate:
${JSON.stringify(weaknessSummary, null, 2)}

For each vulnerability, generate a complete CLI remediation script. Use the correct CLI syntax for the device platform (Cisco IOS for routers/switches, vendor-appropriate for firewalls).
Each script should:
- Be immediately deployable (no placeholders except where IP is genuinely needed — use comments to explain)
- Include verification commands at the end (show commands)
- Be well-commented explaining what each section does
- Address the specific vulnerability described

Also generate a combined "master patch" script that applies all remediations in the correct order with section headers.`,
      response_json_schema: {
        type: "object",
        properties: {
          summary: { type: "string" },
          scripts: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                title: { type: "string" },
                device_target: { type: "string" },
                platform: { type: "string" },
                severity: { type: "string", enum: ["critical", "high", "medium", "low"] },
                description: { type: "string" },
                cli_script: { type: "string" },
                verification_commands: { type: "array", items: { type: "string" } },
                estimated_downtime: { type: "string" },
                rollback_commands: { type: "string" },
              }
            }
          },
          master_patch_script: { type: "string" },
          deployment_order: { type: "array", items: { type: "string" } },
        }
      },
      model: "claude_sonnet_4_6"
    });

    setScripts(res);
    setLoading(false);
    if (res?.scripts?.length > 0) setOpenScript(res.scripts[0].id);
  };

  const severityColor = {
    critical: "text-red-400 border-red-500/30 bg-red-500/10",
    high:     "text-orange-400 border-orange-500/30 bg-orange-500/10",
    medium:   "text-yellow-400 border-yellow-500/30 bg-yellow-500/10",
    low:      "text-blue-400 border-blue-500/30 bg-blue-500/10",
  };

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-secondary/50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <Wrench className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">Automated Remediation</span>
          {scripts && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-primary border-primary/30 bg-primary/10">
              {scripts.scripts?.length} Patch{scripts.scripts?.length !== 1 ? "es" : ""} Ready
            </span>
          )}
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border px-5 py-4 space-y-4">
          {vulnerableAttacks.length === 0 && (
            <p className="text-xs text-green-400 text-center py-2">No vulnerabilities to remediate — your network blocked all attacks!</p>
          )}

          {vulnerableAttacks.length > 0 && !scripts && !loading && (
            <div className="text-center py-2 space-y-3">
              <p className="text-xs text-muted-foreground leading-relaxed">
                Generate device-specific CLI scripts to patch <span className="text-foreground font-medium">{vulnerableAttacks.length} vulnerability{vulnerableAttacks.length !== 1 ? "ies" : "y"}</span> identified by the exploit analysis. Scripts are ready to deploy.
              </p>
              <div className="flex flex-col gap-1.5 text-[10px] text-muted-foreground">
                {vulnerableAttacks.map((a, i) => (
                  <div key={i} className="flex items-center gap-1.5">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold border ${severityColor[a.severity]}`}>{a.severity?.toUpperCase()}</span>
                    <span>{a.name}</span>
                  </div>
                ))}
              </div>
              <Button
                onClick={generateScripts}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs h-8"
              >
                <Wrench className="h-3.5 w-3.5" />
                Generate Remediation Scripts
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center py-6 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Generating CLI patch scripts…</p>
              <div className="flex flex-col gap-1 text-[10px] text-muted-foreground/60 text-center">
                <span>Analyzing vulnerabilities…</span>
                <span>Building device-specific commands…</span>
                <span>Adding verification & rollback steps…</span>
              </div>
            </div>
          )}

          {scripts && (
            <>
              {/* Summary + master download */}
              <div className="bg-primary/10 border border-primary/20 rounded-lg px-4 py-3">
                <p className="text-xs text-primary/90 leading-relaxed mb-3">{scripts.summary}</p>

                {scripts.deployment_order?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">Deployment Order</p>
                    <div className="flex flex-wrap gap-1.5">
                      {scripts.deployment_order.map((step, i) => (
                        <div key={i} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span className="w-4 h-4 rounded-full bg-primary/20 text-primary flex items-center justify-center text-[9px] font-bold shrink-0">{i + 1}</span>
                          <span>{step}</span>
                          {i < scripts.deployment_order.length - 1 && <span className="text-border">→</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="gap-1.5 text-xs h-7 bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={() => downloadFile(`remediation-master-patch-${design?.name || "network"}.txt`, scripts.master_patch_script)}
                  >
                    <Package className="h-3 w-3" />
                    Download Master Patch
                  </Button>
                  <CopyButton text={scripts.master_patch_script} />
                </div>
              </div>

              {/* Individual scripts */}
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Individual Patch Scripts</p>
                <div className="space-y-2">
                  {scripts.scripts?.map((script) => {
                    const isOpen = openScript === script.id;
                    const sc = severityColor[script.severity] || severityColor.medium;

                    return (
                      <div key={script.id} className="border border-border rounded-lg overflow-hidden">
                        <button
                          className="w-full flex items-start justify-between px-3 py-2.5 text-left hover:bg-secondary/30 transition-colors"
                          onClick={() => setOpenScript(isOpen ? null : script.id)}
                        >
                          <div className="flex items-start gap-2 flex-1 min-w-0">
                            <Terminal className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-semibold text-foreground truncate">{script.title}</p>
                              <p className="text-[10px] text-muted-foreground truncate">{script.device_target} · {script.platform}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-2 shrink-0">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${sc}`}>{script.severity?.toUpperCase()}</span>
                            {script.estimated_downtime && (
                              <span className="text-[10px] text-muted-foreground hidden sm:inline">{script.estimated_downtime}</span>
                            )}
                            {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                          </div>
                        </button>

                        {isOpen && (
                          <div className="border-t border-border px-3 py-3 space-y-3">
                            <p className="text-xs text-muted-foreground leading-relaxed">{script.description}</p>

                            {/* CLI Script */}
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold flex items-center gap-1">
                                  <FileCode className="h-3 w-3" /> Patch Script
                                </p>
                                <div className="flex items-center gap-2">
                                  <CopyButton text={script.cli_script} />
                                  <button
                                    onClick={() => downloadFile(`patch-${script.id}.txt`, script.cli_script)}
                                    className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                                  >
                                    <Download className="h-3 w-3" /> Download
                                  </button>
                                </div>
                              </div>
                              <pre className="bg-background border border-border rounded-md p-3 text-[10px] text-green-400 font-mono overflow-x-auto max-h-56 leading-relaxed whitespace-pre-wrap">
                                {script.cli_script}
                              </pre>
                            </div>

                            {/* Verification commands */}
                            {script.verification_commands?.length > 0 && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1.5">Verification Commands</p>
                                <div className="bg-background border border-border rounded-md p-3 space-y-1">
                                  {script.verification_commands.map((cmd, ci) => (
                                    <div key={ci} className="flex items-center gap-2">
                                      <span className="text-primary text-[10px] font-mono">$</span>
                                      <code className="text-[10px] text-blue-400 font-mono">{cmd}</code>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Rollback */}
                            {script.rollback_commands && (
                              <div>
                                <p className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-semibold mb-1.5">Rollback Commands</p>
                                <pre className="bg-red-500/5 border border-red-500/20 rounded-md p-3 text-[10px] text-red-400 font-mono overflow-x-auto max-h-32 leading-relaxed whitespace-pre-wrap">
                                  {script.rollback_commands}
                                </pre>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Re-generate button */}
              <button
                onClick={generateScripts}
                className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
              >
                <Wrench className="h-3 w-3" /> Regenerate scripts
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}