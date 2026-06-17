import React, { useState } from "react";
import { Sparkles, Loader2, ChevronDown, ChevronUp, ChevronsRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const ROUTING_PROTOCOLS = ["OSPF", "EIGRP", "BGP", "Static", "IS-IS", "RIP"];
const WAN_TECHS = ["MPLS", "SD-WAN", "IPSec VPN", "DMVPN", "Metro Ethernet", "Leased Line"];

const DEVICE_SUGGESTIONS = {
  router: ["Assign WAN IP and default route", "Configure OSPF area 0", "Set up NAT overload for internet access", "Configure DHCP relay", "Enable SSH and disable telnet"],
  switch: ["Configure VLANs and trunk ports", "Set STP root bridge priority", "Enable PortFast on access ports", "Configure inter-VLAN routing", "Set up LACP port-channel"],
  firewall: ["Define inside/outside/DMZ zones", "Create permit rules for known traffic", "Block all inbound by default", "Enable IDS/IPS inspection", "Configure site-to-site VPN"],
  server: ["Assign static IP in management VLAN", "Configure DNS/NTP services", "Set up Active Directory roles", "Enable Windows Firewall", "Configure backup schedule"],
  wireless: ["Set SSID and WPA3 passphrase", "Configure separate guest SSID", "Set channel and power levels", "Enable client isolation on guest", "Configure RADIUS authentication"],
  workstation: ["Assign DHCP from user VLAN", "Configure DNS suffix", "Join to domain", "Set default gateway", "Enable host firewall"],
  loadbalancer: ["Define backend server pool", "Configure health checks", "Set up SSL termination", "Configure sticky sessions", "Set up round-robin algorithm"],
  cloud: ["Configure VPN gateway", "Set up route tables", "Configure security groups", "Set up NAT gateway", "Configure VPC peering"],
  internet: ["Configure BGP with upstream ISP", "Set up prefix filters", "Configure BFD for fast failover", "Set up DDoS protection", "Configure route maps"],
};

function Section({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center justify-between px-3 py-2 bg-secondary text-xs font-semibold text-foreground hover:bg-secondary/80 transition-colors">
        {title}
        {open ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>
      {open && <div className="px-3 py-3 space-y-2 bg-card">{children}</div>}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">{label}</label>
      {children}
    </div>
  );
}

const inp = "w-full bg-secondary border border-border rounded px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary";

const DHCP_CAPABLE = ["router", "switch", "server", "firewall"];

export default function CanvasConfigPanel({ nodes, globalConfig, onGlobalChange, selectedNode, onNodeConfigChange, onCollapse }) {
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState(null);

  const handleAiGenerate = async () => {
    if (!selectedNode) return;
    const prompt = aiPrompt.trim() || `Generate configuration for a ${selectedNode.vendor || selectedNode.label} (${selectedNode.type}) in a ${globalConfig.routing_protocol || "OSPF"} network using ${globalConfig.lan_scheme || "192.168.1.0/24"} LAN scheme.`;
    setAiLoading(true);
    setAiResult(null);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a network engineer. Generate a concise Cisco IOS (or vendor-appropriate) configuration snippet for this device:

Device: ${selectedNode.vendor || selectedNode.label}
Type: ${selectedNode.type}
Network context: Routing=${globalConfig.routing_protocol || "OSPF"}, LAN=${globalConfig.lan_scheme || "192.168.1.0/24"}, WAN=${globalConfig.wan_scheme || "10.0.0.0/30"}
Admin user: ${globalConfig.username || "admin"}

User request: ${prompt}

Return: hostname config snippet + interface config + relevant protocol config. Be concise, CLI-ready.`,
      });
      setAiResult(typeof result === "string" ? result : JSON.stringify(result));
      toast.success("Config generated!");
    } catch {
      toast.error("AI generation failed.");
    }
    setAiLoading(false);
  };

  const suggestions = selectedNode ? (DEVICE_SUGGESTIONS[selectedNode.type] || []) : [];

  return (
    <div className="w-64 shrink-0 bg-card border border-border rounded-xl flex flex-col overflow-hidden" style={{ maxHeight: 520 }}>
      <div className="px-3 py-2.5 border-b border-border bg-secondary/60 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-bold text-foreground">
            {selectedNode ? `⚙️ ${selectedNode.label}` : "🌐 Network Config"}
          </p>
          <p className="text-[10px] text-muted-foreground mt-0.5">
            {selectedNode ? `${selectedNode.vendor || selectedNode.type} configuration` : "Global topology settings"}
          </p>
        </div>
        {onCollapse && (
          <button
            onClick={onCollapse}
            title="Collapse panel"
            className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {!selectedNode ? (
          <>
            <Section title="Routing & WAN">
              <Field label="Routing Protocol">
                <select value={globalConfig.routing_protocol || ""} onChange={e => onGlobalChange({ routing_protocol: e.target.value })} className={inp}>
                  <option value="">-- Select --</option>
                  {ROUTING_PROTOCOLS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </Field>
              <Field label="WAN Technology">
                <select value={globalConfig.wan_technology || ""} onChange={e => onGlobalChange({ wan_technology: e.target.value })} className={inp}>
                  <option value="">-- Select --</option>
                  {WAN_TECHS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </Field>
              <Field label="WAN IP Scheme">
                <input value={globalConfig.wan_scheme || ""} onChange={e => onGlobalChange({ wan_scheme: e.target.value })} placeholder="e.g. 10.0.0.0/30" className={inp} />
              </Field>
            </Section>

            <Section title="LAN & IP Addressing">
              <Field label="LAN IP Scheme">
                <input value={globalConfig.lan_scheme || ""} onChange={e => onGlobalChange({ lan_scheme: e.target.value })} placeholder="e.g. 192.168.1.0/24" className={inp} />
              </Field>
              <Field label="Domain Name">
                <input value={globalConfig.domain_name || ""} onChange={e => onGlobalChange({ domain_name: e.target.value })} placeholder="e.g. corp.local" className={inp} />
              </Field>
              <Field label="DNS Servers">
                <input value={globalConfig.dns_servers || ""} onChange={e => onGlobalChange({ dns_servers: e.target.value })} placeholder="e.g. 8.8.8.8, 8.8.4.4" className={inp} />
              </Field>
              <Field label="NTP Server">
                <input value={globalConfig.ntp_server || ""} onChange={e => onGlobalChange({ ntp_server: e.target.value })} placeholder="e.g. pool.ntp.org" className={inp} />
              </Field>
            </Section>

            <Section title="Admin Credentials" defaultOpen={false}>
              <Field label="Username">
                <input value={globalConfig.username || ""} onChange={e => onGlobalChange({ username: e.target.value })} placeholder="admin" className={inp} />
              </Field>
              <Field label="Password">
                <input type="password" value={globalConfig.password || ""} onChange={e => onGlobalChange({ password: e.target.value })} placeholder="••••••••" className={inp} />
              </Field>
              <Field label="Enable Secret">
                <input type="password" value={globalConfig.enable_secret || ""} onChange={e => onGlobalChange({ enable_secret: e.target.value })} placeholder="••••••••" className={inp} />
              </Field>
            </Section>

            <Section title="Features" defaultOpen={false}>
              {[
                { key: "dmz_required", label: "DMZ Zone" },
                { key: "redundancy_enabled", label: "Redundancy / HA" },
                { key: "wireless_enabled", label: "Wireless" },
                { key: "load_balancer", label: "Load Balancer" },
              ].map(f => (
                <label key={f.key} className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={!!globalConfig[f.key]} onChange={e => onGlobalChange({ [f.key]: e.target.checked })}
                    className="rounded border-border accent-primary" />
                  <span className="text-xs text-foreground">{f.label}</span>
                </label>
              ))}
            </Section>
          </>
        ) : (
          <>
            <Section title="Device Notes">
              <Field label="IP Address">
                <input value={selectedNode.ip || ""} onChange={e => onNodeConfigChange(selectedNode.id, "ip", e.target.value)} placeholder="e.g. 192.168.1.1" className={inp} />
              </Field>
              {DHCP_CAPABLE.includes(selectedNode.type) && (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!selectedNode.dhcp_enabled}
                      onChange={e => onNodeConfigChange(selectedNode.id, "dhcp_enabled", e.target.checked)}
                      className="rounded border-border accent-primary" />
                    <span className="text-xs font-medium text-foreground">DHCP Server</span>
                  </label>
                  {selectedNode.dhcp_enabled && (
                    <div className="space-y-1.5 pl-5 border-l-2 border-primary/30">
                      <Field label="DHCP Pool">
                        <input value={selectedNode.dhcp_pool || ""} onChange={e => onNodeConfigChange(selectedNode.id, "dhcp_pool", e.target.value)} placeholder="e.g. 192.168.1.100" className={inp} />
                      </Field>
                      <Field label="Subnet Mask">
                        <input value={selectedNode.dhcp_mask || ""} onChange={e => onNodeConfigChange(selectedNode.id, "dhcp_mask", e.target.value)} placeholder="e.g. 255.255.255.0" className={inp} />
                      </Field>
                      <Field label="Default Gateway">
                        <input value={selectedNode.dhcp_gw || ""} onChange={e => onNodeConfigChange(selectedNode.id, "dhcp_gw", e.target.value)} placeholder="e.g. 192.168.1.1" className={inp} />
                      </Field>
                      <Field label="DNS Server">
                        <input value={selectedNode.dhcp_dns || ""} onChange={e => onNodeConfigChange(selectedNode.id, "dhcp_dns", e.target.value)} placeholder="e.g. 8.8.8.8" className={inp} />
                      </Field>
                    </div>
                  )}
                </div>
              )}
              <Field label="Notes">
                <textarea value={selectedNode.notes || ""} onChange={e => onNodeConfigChange(selectedNode.id, "notes", e.target.value)} rows={2} placeholder="Device notes…" className={inp + " resize-none"} />
              </Field>
            </Section>

            <Section title="AI Config Generator">
              <p className="text-[10px] text-muted-foreground mb-1">Quick suggestions for {selectedNode.type}:</p>
              <div className="space-y-1 mb-2">
                {suggestions.slice(0, 4).map(s => (
                  <button key={s} onClick={() => setAiPrompt(s)}
                    className={`w-full text-left text-[10px] px-2 py-1.5 rounded border transition-all ${aiPrompt === s ? "bg-primary/10 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground hover:border-primary/30"}`}>
                    {s}
                  </button>
                ))}
              </div>
              <textarea
                value={aiPrompt}
                onChange={e => setAiPrompt(e.target.value)}
                rows={2}
                placeholder="Describe what to configure…"
                className={inp + " resize-none"}
              />
              <Button size="sm" onClick={handleAiGenerate} disabled={aiLoading} className="w-full gap-1.5 mt-1 text-xs bg-primary text-primary-foreground hover:bg-primary/90">
                {aiLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                {aiLoading ? "Generating…" : "Generate Config"}
              </Button>
              {aiResult && (
                <pre className="mt-2 bg-[#0a0e1a] text-green-400 font-mono text-[10px] rounded-lg p-2 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto leading-relaxed">
                  {aiResult}
                </pre>
              )}
            </Section>
          </>
        )}
      </div>
    </div>
  );
}