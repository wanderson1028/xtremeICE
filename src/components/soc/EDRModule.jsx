import React, { useState } from "react";
import { Shield, Cpu, CheckCircle, Terminal, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

const sevColor = {
  critical: "text-red-400 bg-red-500/10 border-red-500/30",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30"
};

const statusColor = {
  healthy: "bg-green-500",
  compromised: "bg-red-500",
  isolated: "bg-orange-500"
};

const EDR_ACTIONS = [
{ id: "edr_isolate", label: "Isolate Host", icon: "🔒", actionId: "edr_isolate_host" },
{ id: "edr_kill", label: "Kill Process", icon: "⛔", actionId: "kill_process" },
{ id: "edr_quarantine", label: "Quarantine File", icon: "🧪", actionId: "quarantine_file" },
{ id: "edr_forensics", label: "Collect Forensics", icon: "🔍", actionId: "collect_forensics" }];


function PowerShellDecoder({ cmdline }) {
  const [decoded, setDecoded] = useState(null);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const decode = async () => {
    if (decoded) {setOpen((o) => !o);return;}
    setLoading(true);
    setOpen(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a malware analyst. Decode and analyze this command:\n\n${cmdline}\n\nProvide:\n1. Decoded/deobfuscated command (if Base64 -enc/-EncodedCommand, decode the payload)\n2. What it does in plain English\n3. MITRE ATT&CK technique(s)\n4. Threat level: Low / Medium / High / Critical with a one-line reason\n\nBe concise and technical. No preamble.`
      });
      setDecoded(typeof result === "string" ? result : result?.text || "Unable to decode.");
    } catch {
      setDecoded("Decoder error — could not analyze command.");
    }
    setLoading(false);
  };

  const isPowershell = cmdline && (
  cmdline.toLowerCase().includes("powershell") ||
  cmdline.toLowerCase().includes("pwsh") ||
  cmdline.toLowerCase().includes("-enc ") ||
  cmdline.toLowerCase().includes("-encodedcommand"));

  if (!isPowershell) return null;

  return (
    <div className="mt-3 border border-yellow-500/30 rounded-lg overflow-hidden">
      <button
        onClick={decode}
        className="w-full flex items-center gap-2 px-3 py-2 bg-yellow-500/10 text-yellow-400 text-xs font-medium hover:bg-yellow-500/15 transition-colors">
        
        <Terminal className="h-3.5 w-3.5" />
        <span>Decode PowerShell Command</span>
        {loading ? <Loader2 className="h-3 w-3 ml-auto animate-spin" /> : open ? <ChevronUp className="h-3 w-3 ml-auto" /> : <ChevronDown className="h-3 w-3 ml-auto" />}
      </button>
      {open && !loading && decoded &&
      <div className="p-3 bg-black/40 text-xs font-mono text-green-200 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
          {decoded}
        </div>
      }
      {open && loading &&
      <div className="p-3 text-xs text-muted-foreground font-mono">Analyzing command...</div>
      }
    </div>);

}

export default function EDRModule({ detections, endpoints, onAction }) {
  const [selected, setSelected] = useState(null);
  const [taken, setTaken] = useState(new Set());

  const handleAction = (act, endpoint) => {
    const key = `${act.id}-${endpoint?.name}`;
    if (taken.has(key)) return;
    setTaken((prev) => new Set([...prev, key]));
    onAction({ id: act.actionId, label: act.label, icon: act.icon, target: endpoint?.name, time: new Date().toLocaleTimeString() });
  };

  return (
    <div className="h-full flex overflow-hidden">
      {/* Process list */}
      <div className="w-1/2 border-r border-border/20 overflow-y-auto">
        <div className="px-4 py-2.5 border-b border-border/20 sticky top-0 z-10 bg-[hsl(var(--foreground))] text-[hsl(var(--chart-2))]">
          <div className="flex items-center gap-2">
            <Shield className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-xs font-semibold">EDR Detections</span>
            <span className="ml-auto text-[10px] text-muted-foreground">{detections.length} events</span>
          </div>
        </div>
        {detections.map((d) =>
        <div
          key={d.id}
          onClick={() => setSelected(d)}
          className={`px-4 py-3 border-b border-border/10 cursor-pointer transition-colors hover:bg-secondary/30 ${selected?.id === d.id ? "bg-secondary/40 border-l-2 border-l-primary" : ""}`}>
          
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${sevColor[d.severity] || sevColor.medium}`}>{d.severity}</span>
              <span className="text-[10px] text-primary font-mono">{d.mitre}</span>
              <span className="ml-auto text-[10px] text-muted-foreground">{new Date(d.time).toLocaleTimeString()}</span>
            </div>
            <div className="text-xs font-mono text-foreground">{d.process} <span className="text-muted-foreground">({d.pid})</span></div>
            <div className="text-[10px] text-muted-foreground mt-0.5">on {d.endpoint}</div>
          </div>
        )}
      </div>

      {/* Detail panel */}
      <div className="flex-1 overflow-y-auto">
        {!selected ?
        <div className="h-full flex flex-col items-center justify-center text-muted-foreground text-xs gap-2">
            <Shield className="h-8 w-8 opacity-20" />
            <span>Select a detection to investigate</span>
          </div> :

        <div className="p-4 space-y-4">
            <div className="border border-border/30 rounded-xl p-4 space-y-3 bg-[hsl(var(--foreground))] text-[hsl(var(--chart-2))]">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-mono px-2 py-0.5 rounded border ${sevColor[selected.severity] || sevColor.medium}`}>{selected.severity}</span>
                <span className="text-xs font-semibold">{selected.process}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div><span className="text-muted-foreground">PID: </span><span className="font-mono">{selected.pid}</span></div>
                <div><span className="text-muted-foreground">Parent: </span><span className="font-mono">{selected.parent}</span></div>
                <div><span className="text-muted-foreground">Host: </span><span className="font-mono">{selected.endpoint}</span></div>
                <div><span className="text-muted-foreground">MITRE: </span><span className="font-mono text-primary">{selected.mitre}</span></div>
              </div>
              <div>
                <div className="text-[10px] text-muted-foreground mb-1 uppercase">Command Line</div>
                <div className="bg-black/50 rounded-lg p-2 text-[10px] font-mono text-green-300 break-all">{selected.cmdline}</div>
                <PowerShellDecoder cmdline={selected.cmdline} />
              </div>
            </div>

            {/* Endpoint detail */}
            {(() => {
            const ep = endpoints.find((e) => e.name === selected.endpoint);
            return ep ?
            <div className="border border-border/30 rounded-xl p-4 bg-[hsl(var(--foreground))] text-[hsl(var(--chart-2))]">
                  <div className="flex items-center gap-2 mb-3">
                    <Cpu className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs font-semibold">Endpoint: {ep.name}</span>
                    <span className={`ml-auto h-2 w-2 rounded-full ${statusColor[ep.status] || "bg-gray-500"}`} />
                    <span className="text-[10px] text-muted-foreground">{ep.status}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                    <div><span className="text-muted-foreground">OS: </span>{ep.os}</div>
                    <div><span className="text-muted-foreground">IP: </span><span className="font-mono">{ep.ip}</span></div>
                    <div><span className="text-muted-foreground">Role: </span>{ep.role}</div>
                    <div><span className="text-muted-foreground">User: </span><span className="font-mono">{ep.user}</span></div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {EDR_ACTIONS.map((act) => {
                  const key = `${act.id}-${ep.name}`;
                  const done = taken.has(key);
                  return (
                    <button
                      key={act.id}
                      onClick={() => handleAction(act, ep)}
                      disabled={done}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${done ? "opacity-40 cursor-not-allowed border-border/20 text-muted-foreground" : "text-purple-400 border-purple-500/30 hover:bg-purple-500/10"}`}>
                      
                          <span>{act.icon}</span>
                          <span>{act.label}</span>
                          {done && <CheckCircle className="h-3 w-3 ml-auto text-green-500" />}
                        </button>);

                })}
                  </div>
                </div> :
            null;
          })()}
          </div>
        }
      </div>
    </div>);

}