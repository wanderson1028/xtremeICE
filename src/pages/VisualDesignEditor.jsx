import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2, Router, Network, Shield, Server, Wifi, Cloud, Monitor, Scale, Globe, Cpu, Activity, Terminal, Gauge } from "lucide-react";
import VisualDesignBuilder from "@/components/wizard/VisualDesignBuilder";
import { allocateIPs } from "@/components/diagram/ipAllocator";

const ICON_MAP = {
  router: Router, switch: Network, firewall: Shield, server: Server,
  wireless: Wifi, workstation: Monitor, loadbalancer: Scale,
  cloud: Cloud, internet: Globe, plc: Cpu, scada: Activity, hmi: Gauge, iot: Cpu,
};
const COLOR_MAP = {
  router: "#3b82f6", switch: "#8b5cf6", firewall: "#ef4444", server: "#10b981",
  wireless: "#f59e0b", workstation: "#64748b", loadbalancer: "#0ea5e9",
  cloud: "#6366f1", internet: "#06b6d4", plc: "#dc2626", scada: "#b45309", hmi: "#7c3aed", iot: "#059669",
};

function restoreNodes(nodes) {
  return (nodes || []).map(n => ({
    ...n,
    Icon: ICON_MAP[n.type] || Network,
    color: n.color || COLOR_MAP[n.type] || "#64748b",
  }));
}

export default function VisualDesignEditor() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const [diagramNodes, setDiagramNodes] = useState([]);
  const [diagramLinks, setDiagramLinks] = useState([]);
  const [globalConfig, setGlobalConfig] = useState({});

  const { data: design, isLoading } = useQuery({
    queryKey: ["design", id],
    queryFn: () => base44.entities.NetworkDesign.get(id),
    enabled: !!id,
  });

  const generateInitialTopology = useCallback((designData) => {
    // Simple topology: create nodes based on design parameters
    const nodes = [];
    const links = [];
    let nodeId = 0;

    const addNode = (type, label, x, y) => {
      const id = `n${nodeId++}`;
      const ip = type === "internet" ? null : `192.168.${nodeId}.1`;
      nodes.push({ id, type, label, x, y, ip });
      return id;
    };

    // Core topology
    const cx = 400;
    const coreRouterId = addNode("router", "Core Router", cx, 100);
    const coreSwitchId = addNode("switch", "Core Switch", cx, 200);

    // Add firewalls if enabled
    if (designData.firewall_enabled) {
      const firewallId = addNode("firewall", designData.firewall_vendor || "Firewall", cx - 150, 150);
      links.push({ id: `l${nodeId}`, from: firewallId, to: coreRouterId });
    }

    // Add servers if enabled
    if (designData.server_farm && designData.num_servers) {
      const numServers = Math.min(designData.num_servers, 3);
      for (let i = 0; i < numServers; i++) {
        const serverId = addNode("server", `Server-${i + 1}`, cx + (i - 1) * 80, 300);
        links.push({ id: `l${nodeId}`, from: coreSwitchId, to: serverId });
      }
    }

    // Add sites
    const siteCount = designData.num_sites || 1;
    const siteSpacing = 250;
    const startX = cx - ((siteCount - 1) * siteSpacing) / 2;

    for (let s = 0; s < siteCount; s++) {
      const siteX = startX + s * siteSpacing;
      const siteRouterId = addNode("router", `Site-${s + 1} Router`, siteX, 400);
      const siteSwitchId = addNode("switch", `Site-${s + 1} Switch`, siteX, 500);
      links.push({ id: `l${nodeId}`, from: coreRouterId, to: siteRouterId });
      links.push({ id: `l${nodeId + 1}`, from: siteRouterId, to: siteSwitchId });

      // Add workstations
      const numDevices = Math.min(designData.num_user_devices || 2, 3);
      for (let d = 0; d < numDevices; d++) {
        const devId = addNode("workstation", `PC-${d + 1}`, siteX + (d - 1) * 60, 600);
        links.push({ id: `l${nodeId + 2 + d}`, from: siteSwitchId, to: devId });
      }
    }

    setDiagramNodes(restoreNodes(nodes));
    setDiagramLinks(links);
  }, []);

  // Parse diagram data or generate from design parameters
  useEffect(() => {
    if (design?.diagram_data) {
      try {
        const parsed = JSON.parse(design.diagram_data);
        setDiagramNodes(restoreNodes(parsed.nodes));
        setDiagramLinks(parsed.links || []);
      } catch (_) {
        generateInitialTopology(design);
      }
    } else if (design) {
      generateInitialTopology(design);
    }
  }, [design]);

  useEffect(() => {
    // Initialize global config from design
    if (design) {
      setGlobalConfig({
        routing_protocol: design.routing_protocol || "",
        wan_technology: design.wan_technology || "",
        lan_scheme: design.ip_scheme || "",
        domain_name: design.domain_name || "",
        ntp_server: design.ntp_server || "",
        dns_servers: (design.dns_servers || []).join(", "),
        username: design.device_username || "",
        password: design.device_password || "",
        enable_secret: design.enable_password || "",
        dmz_required: design.dmz_required || false,
        redundancy_enabled: design.redundancy_enabled || false,
        wireless_enabled: design.wireless_enabled || false,
        load_balancer: design.load_balancer || false,
      });
    }
  }, [design]);


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!design) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Design not found.</p>
      </div>
    );
  }

  return (
    <VisualDesignBuilder
      initialNodes={diagramNodes}
      initialLinks={diagramLinks}
      initialGlobalConfig={globalConfig}
      designId={id}
      designName={design.name}
      onBack={() => navigate(`/ReviewDesign?id=${id}`)}
      onDone={(updatedDesign) => {
        // Save and redirect to script generator
        base44.entities.NetworkDesign.update(id, updatedDesign).then(() => {
          navigate(`/GenerateScript?id=${id}`);
        });
      }}
    />
  );
}