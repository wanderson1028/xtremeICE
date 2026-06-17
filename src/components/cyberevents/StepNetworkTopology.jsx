import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Network, Plus, Sparkles, Loader2, ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import InteractiveTopology from "@/components/review/InteractiveTopology";

export default function StepNetworkTopology({ data, onChange, savedEventId }) {
  const navigate = useNavigate();
  const [analyzing, setAnalyzing] = useState(false);
  const [aiTopology, setAiTopology] = useState(data._recommended_network || null);

  const { data: allDesigns = [] } = useQuery({
    queryKey: ["designs-for-topology"],
    queryFn: () => base44.entities.NetworkDesign.list("-created_date", 50),
  });

  const { data: linkedDesign } = useQuery({
    queryKey: ["linked-design", data.network_design_id],
    queryFn: () => base44.entities.NetworkDesign.get(data.network_design_id),
    enabled: !!data.network_design_id,
  });

  // Sync aiTopology if document scan provides a recommended network
  useEffect(() => {
    if (data._recommended_network && !aiTopology) {
      setAiTopology(data._recommended_network);
    }
  }, [data._recommended_network]);

  // Build a rich context string from all team directions and objectives
  const buildContext = () => {
    const redObjs = (data.red_team_objectives || []).join("; ");
    const blueObjs = (data.blue_team_objectives || []).join("; ");
    const redDir = data.red_team_directions || "";
    const blueDir = data.blue_team_directions || "";
    const ingress = (data.ingress_points || []).map(p => `${p.team} - ${p.role}: ${p.system} (${p.ip})`).join(", ");
    return `Scenario: ${data.scenario_prompt || data.title || "Cyber Exercise"}
Red Team Objectives: ${redObjs}
Red Team Directions Summary: ${redDir.slice(0, 400)}
Blue Team Objectives: ${blueObjs}
Blue Team Directions Summary: ${blueDir.slice(0, 400)}
Ingress Points: ${ingress || "Not yet defined"}
Difficulty: ${data.difficulty}, Duration: ${data.duration_minutes} min`;
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const context = buildContext();
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a senior network architect designing cyber exercise environments. Analyze the following red vs blue team exercise details and recommend the EXACT network topology that best supports both teams' objectives.

${context}

Consider:
- What systems does the red team need to attack (DMZ servers, internal hosts, OT/ICS, web apps)?
- What does the blue team need to monitor and defend (SIEM, firewalls, IDS/IPS, segmented networks)?
- What network complexity suits the difficulty level and duration?
- What WAN technology enables realistic attack/defense scenarios?

Return specific, deployment-ready topology parameters.`,
        response_json_schema: {
          type: "object",
          properties: {
            topology_summary: { type: "string" },
            topology_type: { type: "string", enum: ["hub-and-spoke", "full-mesh", "partial-mesh", "ring", "star"] },
            routing_protocol: { type: "string", enum: ["OSPF", "EIGRP", "BGP", "Static", "IS-IS", "RIP"] },
            wan_technology: { type: "string", enum: ["MPLS", "SD-WAN", "IPSec VPN", "DMVPN", "Metro Ethernet", "Leased Line"] },
            num_sites: { type: "number" },
            firewall_enabled: { type: "boolean" },
            firewall_vendor: { type: "string", enum: ["Cisco ASA", "Palo Alto", "Fortinet", "pfSense", "None"] },
            dmz_required: { type: "boolean" },
            server_farm: { type: "boolean" },
            num_servers: { type: "number" },
            load_balancer: { type: "boolean" },
            wireless_enabled: { type: "boolean" },
            redundancy_enabled: { type: "boolean" },
            num_vlans_per_site: { type: "number" },
            vlan_names: { type: "array", items: { type: "string" } },
            site_names: { type: "array", items: { type: "string" } },
            num_user_devices: { type: "number" },
            user_device_types: { type: "array", items: { type: "string" } },
            ip_scheme: { type: "string" },
            domain_name: { type: "string" },
            design_rationale: { type: "string" },
          }
        }
      });

      setAiTopology(result);
      onChange({ topology_summary: result.topology_summary });
      toast.success("Topology analyzed from team directions!");
    } catch (e) {
      toast.error("Analysis failed. Please try again.");
    }
    setAnalyzing(false);
  };

  const handleCreateDesign = () => {
    const topology = aiTopology || data._recommended_network || {};
    const prefill = {
      name: `${data.title || "Cyber Exercise"} — Network`,
      company_name: "Cyber Exercise Environment",
      topology_type: topology.topology_type || "hub-and-spoke",
      routing_protocol: topology.routing_protocol || "OSPF",
      wan_technology: topology.wan_technology || "MPLS",
      num_sites: topology.num_sites || 2,
      site_names: topology.site_names || [],
      firewall_enabled: topology.firewall_enabled ?? true,
      firewall_vendor: topology.firewall_vendor || "Palo Alto",
      dmz_required: topology.dmz_required ?? true,
      server_farm: topology.server_farm ?? false,
      num_servers: topology.num_servers || 3,
      load_balancer: topology.load_balancer ?? false,
      wireless_enabled: topology.wireless_enabled ?? false,
      redundancy_enabled: topology.redundancy_enabled ?? false,
      num_vlans_per_site: topology.num_vlans_per_site || 3,
      vlan_names: topology.vlan_names || ["Management", "Users", "Servers"],
      num_user_devices: topology.num_user_devices || 4,
      user_device_types: topology.user_device_types || ["Windows", "Linux"],
      ip_scheme: topology.ip_scheme || "10.0.0.0/8",
      domain_name: topology.domain_name || "cyberex.local",
      device_username: "admin",
      device_password: "CyberEx2024!",
      enable_password: "Enable2024!",
      ntp_server: "pool.ntp.org",
      dns_servers: ["8.8.8.8", "8.8.4.4"],
      // Pass event context so NetworkWizard/ReviewDesign can link back
      _from_cyber_event: true,
      _event_title: data.title || "Cyber Exercise",
    };

    sessionStorage.setItem("cyber_event_topology_prefill", JSON.stringify(prefill));
    // Store the full event data snapshot so it can be fully restored on return
    const { _recommended_network, ...dataToStore } = data;
    sessionStorage.setItem("cyber_event_return_data", JSON.stringify(dataToStore));
    if (savedEventId) sessionStorage.setItem("cyber_event_saved_id", savedEventId);
    navigate("/NetworkWizard");
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">Network Topology</h2>
        <p className="text-sm text-muted-foreground">
          Assign or create a network topology for this scenario. Your red & blue team directions will guide the design.
        </p>
      </div>

      {/* Auto-recommended network banner (from document scan) */}
      {data._recommended_network && !data.network_design_id && (
        <div className="bg-primary/10 border border-primary/30 rounded-xl p-4 flex items-start gap-3">
          <Sparkles className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-primary">Network Design Auto-Recommended from Document</p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {[
                data._recommended_network.topology_type,
                data._recommended_network.routing_protocol,
                data._recommended_network.wan_technology,
                data._recommended_network.num_sites && `${data._recommended_network.num_sites} sites`,
                data._recommended_network.firewall_vendor && `FW: ${data._recommended_network.firewall_vendor}`,
                data._recommended_network.dmz_required && "DMZ",
                data._recommended_network.server_farm && `${data._recommended_network.num_servers} servers`,
              ].filter(Boolean).map(v => (
                <span key={v} className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary">{v}</span>
              ))}
            </div>
            {data._recommended_network.design_rationale && (
              <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{data._recommended_network.design_rationale}</p>
            )}
            <p className="text-xs text-muted-foreground mt-1.5">Click <strong>Create Network Design</strong> below to launch the wizard pre-filled with these settings.</p>
          </div>
        </div>
      )}

      {/* Linked design status + live topology preview */}
      {data.network_design_id && (
        <div className="space-y-3">
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-start justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm font-semibold text-green-400">Network Design Linked{linkedDesign ? `: ${linkedDesign.name}` : ""}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Nodes are color-coded by team ingress assignment.
                <span className="ml-2 inline-flex gap-2">
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500 inline-block"></span>Red</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500 inline-block"></span>Blue</span>
                  <span className="inline-flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-slate-200 inline-block"></span>White</span>
                </span>
              </p>
            </div>
            <button
              onClick={() => onChange({ network_design_id: null })}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors shrink-0"
            >
              Unlink
            </button>
          </div>
          {linkedDesign && (
            <InteractiveTopology
              design={linkedDesign}
              ingressPoints={data.ingress_points || []}
              onSaveTopology={null}
              readOnly={false}
            />
          )}
        </div>
      )}

      {/* Option 1: Link Existing Design */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-3">
        <p className="text-sm font-semibold text-foreground">1. Link Existing Network Design</p>
        <p className="text-xs text-muted-foreground mb-3">Choose a network design you've already created:</p>
        <select
          value={data.network_design_id || ""}
          onChange={e => onChange({ network_design_id: e.target.value || null })}
          className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">-- Select a design --</option>
          {allDesigns.map(d => (
            <option key={d.id} value={d.id}>{d.name} {d.company_name ? `— ${d.company_name}` : ""}</option>
          ))}
        </select>
      </div>

      {/* Option 2: AI Analysis from team directions */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl p-5 space-y-4">
        <p className="text-sm font-semibold text-foreground">2. AI-Guided Network Design</p>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">Topology Analysis</p>
            <span className="text-[10px] text-muted-foreground bg-secondary border border-border px-1.5 py-0.5 rounded">Based on team directions & objectives</span>
          </div>
          <Button size="sm" onClick={handleAnalyze} disabled={analyzing} className="gap-1.5 text-xs bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30">
            {analyzing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            {analyzing ? "Analyzing…" : "Analyze & Recommend"}
          </Button>
        </div>

        {!data.red_team_directions && !data.blue_team_directions && (
          <div className="flex items-center gap-2 text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            Complete Team Directions (Step 3) first for the best AI topology recommendation.
          </div>
        )}

        {/* AI result chips */}
        {aiTopology && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Type", value: aiTopology.topology_type },
                { label: "Routing", value: aiTopology.routing_protocol },
                { label: "WAN", value: aiTopology.wan_technology },
                { label: "Sites", value: aiTopology.num_sites },
                { label: "VLANs/site", value: aiTopology.num_vlans_per_site },
                aiTopology.firewall_enabled && { label: "Firewall", value: aiTopology.firewall_vendor || "Yes" },
                aiTopology.dmz_required && { label: "DMZ", value: "Yes" },
                aiTopology.server_farm && { label: "Server Farm", value: `${aiTopology.num_servers} servers` },
                aiTopology.load_balancer && { label: "Load Balancer", value: "Yes" },
                aiTopology.redundancy_enabled && { label: "Redundancy", value: "Yes" },
              ].filter(Boolean).map(item => (
                <span key={item.label} className="text-[10px] px-2 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary font-medium">
                  {item.label}: {item.value}
                </span>
              ))}
            </div>
            {aiTopology.design_rationale && (
              <div className="bg-card border border-border rounded-lg px-4 py-3">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold mb-1">Design Rationale</p>
                <p className="text-xs text-foreground leading-relaxed">{aiTopology.design_rationale}</p>
              </div>
            )}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Topology Summary</label>
          <textarea
            value={data.topology_summary || ""}
            onChange={e => onChange({ topology_summary: e.target.value })}
            rows={3}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
            placeholder="Click 'Analyze & Recommend' to generate from team directions, or describe the topology manually…"
          />
        </div>
      </div>

      {/* Create design button — only show when no design is linked */}
      {!data.network_design_id && (
        <div className="bg-card border border-border rounded-xl p-5 space-y-3">
          <p className="text-sm font-semibold text-foreground">3. Create New Network Design</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Launch the Network Wizard to design a topology. If you ran AI analysis above, the wizard will be pre-filled with recommendations based on your team directions.
          </p>
          <div className="flex items-center gap-3 flex-wrap">
            <Button onClick={handleCreateDesign} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" /> Create Network Design
              <ExternalLink className="h-3.5 w-3.5 opacity-60" />
            </Button>
            {!aiTopology && (
              <span className="text-xs text-muted-foreground">Run AI Analysis first for best results</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}