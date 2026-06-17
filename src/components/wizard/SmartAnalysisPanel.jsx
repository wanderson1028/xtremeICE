import React, { useState } from "react";
import { Sparkles, Loader2, ShieldAlert, Wifi, Lock, Activity, ChevronDown, ChevronUp, Zap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const CATEGORY_ICONS = {
  Security:       { Icon: ShieldAlert, color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20" },
  Availability:   { Icon: Activity,    color: "text-green-400",  bg: "bg-green-500/10 border-green-500/20" },
  "Access Control": { Icon: Lock,      color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
  Performance:    { Icon: Zap,         color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20" },
  Connectivity:   { Icon: Wifi,        color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
};

const fallback = { Icon: Sparkles, color: "text-primary", bg: "bg-primary/10 border-primary/20" };

export default function SmartAnalysisPanel({ nodes, links, globalConfig, onImplement, onClose }) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [implementing, setImplementing] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [implResults, setImplResults] = useState({});

  const analyze = async () => {
    setLoading(true);
    setSuggestions([]);
    setImplResults({});
    try {
      const topology = {
        devices: nodes.map(n => ({ type: n.type, vendor: n.vendor || n.label })),
        links: links.length,
        globalConfig,
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a senior network security architect. Analyze this network topology and configuration and return actionable improvement suggestions.

Topology:
${JSON.stringify(topology, null, 2)}

Return 5-8 concrete suggestions covering: Security hardening, High Availability, Access Control, Performance, and Connectivity best practices.
Each suggestion should be specific to the protocols, vendors, and topology present (e.g. if OSPF is used, suggest route authentication; if Cisco ASA is present, suggest specific ACL rules).

For each suggestion, classify it as one of:
- "config" — generates CLI configuration snippet(s)
- "topology" — adds/modifies devices or links in the canvas

Be specific and actionable. Reference real vendor CLI syntax where relevant.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id:          { type: "string" },
                  category:    { type: "string" },
                  title:       { type: "string" },
                  description: { type: "string" },
                  priority:    { type: "string", enum: ["High", "Medium", "Low"] },
                  impl_type:   { type: "string", enum: ["config", "topology"] },
                },
              },
            },
          },
        },
      });

      setSuggestions(result.suggestions || []);
      if ((result.suggestions || []).length > 0) {
        setExpanded({ [result.suggestions[0].id]: true });
      }
    } catch {
      toast.error("Analysis failed. Please try again.");
    }
    setLoading(false);
  };

  const implement = async (suggestion) => {
    setImplementing(suggestion.id);
    try {
      if (suggestion.impl_type === "config") {
        const cfg = await base44.integrations.Core.InvokeLLM({
          prompt: `Generate the complete, paste-ready CLI configuration to implement this suggestion:

Title: ${suggestion.title}
Description: ${suggestion.description}
Category: ${suggestion.category}

Network context:
- Devices: ${nodes.map(n => `${n.type} (${n.vendor || n.label})`).join(", ")}
- Routing protocol: ${globalConfig.routing_protocol || "OSPF"}
- WAN technology: ${globalConfig.wan_technology || "N/A"}
- LAN scheme: ${globalConfig.lan_scheme || "192.168.1.0/24"}
- Domain: ${globalConfig.domain_name || "corp.local"}

Generate ONLY CLI commands, no explanations. Include device hostnames as comments.`,
        });
        setImplResults(prev => ({ ...prev, [suggestion.id]: typeof cfg === "string" ? cfg : JSON.stringify(cfg) }));
        toast.success("Configuration generated!");
      } else {
        // topology impl — ask AI for nodes/links to add
        const topo = await base44.integrations.Core.InvokeLLM({
          prompt: `To implement this network topology suggestion, what devices and links should be added?

Title: ${suggestion.title}
Description: ${suggestion.description}
Existing devices: ${nodes.map(n => `${n.type}`).join(", ")}

Return a list of device types to add (use only: router, switch, firewall, server, wireless, workstation, loadbalancer, cloud, internet) and which existing device types to connect them to.`,
          response_json_schema: {
            type: "object",
            properties: {
              add_devices: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type:   { type: "string" },
                    label:  { type: "string" },
                    connect_to_type: { type: "string" },
                  },
                },
              },
              summary: { type: "string" },
            },
          },
        });
        onImplement && onImplement(topo);
        toast.success("Topology updated!");
      }
    } catch {
      toast.error("Implementation failed.");
    }
    setImplementing(null);
  };

  const priorityBadge = (p) => {
    const cls = p === "High" ? "bg-red-500/20 text-red-400 border-red-500/30"
      : p === "Medium" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
      : "bg-green-500/20 text-green-400 border-green-500/30";
    return <span className={`text-[9px] px-1.5 py-0.5 rounded-full border font-semibold ${cls}`}>{p}</span>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="relative h-full w-full max-w-md bg-card border-l border-border shadow-2xl flex flex-col overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-secondary/40">
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-bold text-foreground">Smart Analysis</p>
              <p className="text-[10px] text-muted-foreground">AI-powered design recommendations</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {suggestions.length === 0 && !loading && (
            <div className="text-center py-16">
              <div className="h-16 w-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-4">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">Analyze Your Design</p>
              <p className="text-xs text-muted-foreground max-w-[260px] mx-auto mb-6">
                Get AI-powered recommendations for security hardening, high availability, access control, and performance based on your current topology.
              </p>
              <Button onClick={analyze} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
                <Sparkles className="h-4 w-4" /> Run Smart Analysis
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Analyzing your network design…</p>
            </div>
          )}

          {suggestions.map(s => {
            const { Icon, color, bg } = CATEGORY_ICONS[s.category] || fallback;
            const isOpen = expanded[s.id];
            const result = implResults[s.id];
            return (
              <div key={s.id} className="border border-border rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 px-4 py-3 bg-secondary/40 hover:bg-secondary/60 transition-colors text-left"
                  onClick={() => setExpanded(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                >
                  <div className={`h-7 w-7 rounded-lg border flex items-center justify-center shrink-0 ${bg}`}>
                    <Icon className={`h-3.5 w-3.5 ${color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-xs font-semibold text-foreground truncate">{s.title}</p>
                      {priorityBadge(s.priority)}
                    </div>
                    <p className="text-[10px] text-muted-foreground">{s.category} · {s.impl_type === "config" ? "Config snippet" : "Topology change"}</p>
                  </div>
                  {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground shrink-0" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />}
                </button>

                {isOpen && (
                  <div className="px-4 py-3 space-y-3 bg-card">
                    <p className="text-xs text-muted-foreground leading-relaxed">{s.description}</p>

                    {result ? (
                      <>
                        <pre className="bg-[#0a0e1a] text-green-400 font-mono text-[10px] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap max-h-52 overflow-y-auto leading-relaxed">
                          {result}
                        </pre>
                        <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(result); toast.success("Copied!"); }}
                          className="w-full text-xs gap-1.5">
                          Copy to Clipboard
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => implement(s)}
                        disabled={implementing === s.id}
                        className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs"
                      >
                        {implementing === s.id
                          ? <><Loader2 className="h-3 w-3 animate-spin" /> Implementing…</>
                          : <><Zap className="h-3 w-3" /> Implement</>}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {suggestions.length > 0 && !loading && (
          <div className="px-4 py-3 border-t border-border bg-secondary/30">
            <Button onClick={analyze} variant="outline" size="sm" className="w-full gap-2 text-xs">
              <Sparkles className="h-3 w-3" /> Re-analyze
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}