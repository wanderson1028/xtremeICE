import React, { useState, useEffect, useRef, useCallback } from "react";
import { allocateIPs } from "@/components/diagram/ipAllocator";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { ArrowLeft, FileCode, RefreshCw, Loader2, Send, Zap, ZapOff, LayoutGrid, Network, Globe, Lock, Download, Type, CheckSquare, Save } from "lucide-react";
import SubmitDesignDialog from "@/components/diagram/SubmitDesignDialog";

import NetworkDiagram from "@/components/diagram/NetworkDiagram";
import DeviceDetailPanel from "@/components/diagram/DeviceDetailPanel";
import SimulationEvent from "@/components/diagram/SimulationEvent";
import TopologyView from "@/components/diagram/TopologyView";
import SimulationControlPanel from "@/components/diagram/SimulationControlPanel";
import SimulationMetricsDashboard from "@/components/diagram/SimulationMetricsDashboard";
import SimulationHistoryPanel from "@/components/diagram/SimulationHistoryPanel";
import SimulationNarrativePanel from "@/components/simulation/SimulationNarrativePanel";
import AnnotationToolbar from "@/components/diagram/AnnotationToolbar";
import NetworkDocumentation from "@/components/diagram/NetworkDocumentation";
import CostEstimator from "@/components/diagram/CostEstimator";
import MetricsComparison from "@/components/simulation/MetricsComparison";
import LatencyHopGraph from "@/components/diagram/LatencyHopGraph";
import BottleneckAnalysis from "@/components/simulation/BottleneckAnalysis";
import ConfigValidation from "@/components/simulation/ConfigValidation";
import AIExploitSimulator from "@/components/simulation/AIExploitSimulator";
import TrafficFlowPanel from "@/components/simulation/TrafficFlowPanel";
import TrafficPatternBuilder from "@/components/diagram/TrafficPatternBuilder";

function randomIp(base = "10") {
  return `${base}.${Math.floor(Math.random()*254)+1}.${Math.floor(Math.random()*254)+1}.${Math.floor(Math.random()*254)+1}`;
}

function buildDiagram(design) {
  const nodes = [];
  const links = [];
  let nodeId = 0;

  // Layer Y positions — compact hierarchy
  const LAYER_Y = {
    internet: 60,
    firewall: 165,
    coreRouter: 280,
    coreSwitches: 400,
    datacenter: 520,
    servers: 640,
    siteRouters: 770,
    siteSwitches: 900,
    userDevices: 1050
  };

  const addNode = (type, label, x, y, layer = "default") => {
    const id = `n${nodeId++}`;
    const ip = (type === "internet") ? null : randomIp(type === "router" ? "10" : type === "server" ? "192.168" : "172.16");
    nodes.push({ id, type, label, x, y, ip, deviceConfig: null, layer });
    return id;
  };

  // ── Layer 0: Internet ──
  const cx = 800;
  const internetId = addNode("internet", "Internet", cx, LAYER_Y.internet, "internet");

  // ── Layer 1: Firewall ──
  let firewallId = null;
  if (design.firewall_enabled) {
    firewallId = addNode("firewall", design.firewall_vendor || "Firewall", cx, LAYER_Y.firewall, "firewall");
    links.push({ from: internetId, to: firewallId, label: "Internet", wan: true });
  }

  // ── Layer 2: Core Router ──
  const coreRouterId = addNode("router", "Core Router", cx, LAYER_Y.coreRouter, "core");
  links.push({ from: firewallId || internetId, to: coreRouterId, label: design.routing_protocol, wan: true });

  // ── Layer 3: Core Switch + Load Balancer ──
  // Space them out based on what's present
  const hasDMZ = design.dmz_required;
  const hasFarm = design.server_farm;
  const hasLB = design.load_balancer;

  const coreSwitchId = addNode("switch", "Core Switch", cx - (hasLB ? 200 : 0), LAYER_Y.coreSwitches, "core");
  links.push({ from: coreRouterId, to: coreSwitchId });

  let lbId = null;
  if (hasLB) {
    lbId = addNode("loadbalancer", "Load Balancer", cx + 200, LAYER_Y.coreSwitches, "core");
    links.push({ from: coreRouterId, to: lbId });
  }

  // ── Layer 4: DMZ Switch + Server Switch ──
  let dmzSwId = null, farmSwId = null;
  const layer4Items = [];
  if (hasDMZ) layer4Items.push({ type: "dmz", label: "DMZ Switch" });
  if (hasFarm) layer4Items.push({ type: "server", label: "Server SW" });

  const layer4Spacing = 300;
  const layer4TotalWidth = (layer4Items.length - 1) * layer4Spacing;
  const layer4StartX = cx - layer4TotalWidth / 2;

  layer4Items.forEach((item, idx) => {
    const x = layer4StartX + idx * layer4Spacing;
    if (item.type === "dmz") {
      dmzSwId = addNode("switch", item.label, x, LAYER_Y.datacenter, "datacenter");
      links.push({ from: coreSwitchId, to: dmzSwId, label: "DMZ" });
    } else {
      farmSwId = addNode("switch", item.label, x, LAYER_Y.datacenter, "datacenter");
      links.push({ from: lbId || coreSwitchId, to: farmSwId });
    }
  });

  // ── Layer 5: Servers ──
  if (hasDMZ && dmzSwId) {
    const dmzSrvId = addNode("server", "DMZ Server", layer4StartX, LAYER_Y.servers, "datacenter");
    links.push({ from: dmzSwId, to: dmzSrvId });
  }

  if (hasFarm && farmSwId) {
    const numSrv = Math.min(design.num_servers || 2, 5);
    const farmCenterX = hasDMZ ? layer4StartX + layer4Spacing : cx / 2;
    const farmSpan = (numSrv - 1) * 120;
    for (let s = 0; s < numSrv; s++) {
      const sx = farmCenterX - farmSpan / 2 + s * 120;
      const srvId = addNode("server", `Srv-${s + 1}`, sx, LAYER_Y.servers, "datacenter");
      links.push({ from: farmSwId, to: srvId });
    }
  }

  // ── Sites (WAN branches) ──
  const sites = design.site_names?.filter(Boolean).length > 0
    ? design.site_names.filter(Boolean)
    : Array.from({ length: design.num_sites || 1 }, (_, i) => `Site-${i + 1}`);

  const siteCount = sites.length;
  const deviceTypes = design.user_device_types || [];
  const hasPhones = deviceTypes.some(d => d.toLowerCase().includes("phone") || d.toLowerCase().includes("voip"));
  const hasOTDevices = deviceTypes.some(d => d.toLowerCase().includes("ot") || d.toLowerCase().includes("ics") || d.toLowerCase().includes("plc") || d.toLowerCase().includes("scada"));
  const userDevPerSite = Math.max(1, Math.min(Math.round((design.num_user_devices || 3) / Math.max(siteCount, 1)), 4));

  // Calculate site spacing — give each site generous horizontal room
  const hasWap = design.wireless_enabled;
  const devicesPerSite = userDevPerSite + (hasWap ? 1 : 0) + (hasOTDevices ? 2 : 0);
  const deviceSlotWidth = 100;
  const siteMinWidth = Math.max(280, devicesPerSite * deviceSlotWidth + 100);
  const siteSpacing = siteMinWidth + 80;
  const totalSitesWidth = siteSpacing * siteCount;
  const startX = cx - (totalSitesWidth - siteSpacing) / 2;

  // ── Layer 6: Site Routers ──
  const siteRouterIds = [];
  sites.forEach((site, i) => {
    const sx = startX + i * siteSpacing + siteSpacing / 2;
    const siteRouterId = addNode("router", `${site}\nRtr`, sx, LAYER_Y.siteRouters, "site");
    siteRouterIds.push({ id: siteRouterId, x: sx });
    links.push({ from: coreSwitchId, to: siteRouterId, label: design.wan_technology || "WAN", wan: true });

    // Redundant inter-site link
    if (design.redundancy_enabled && i > 0) {
      links.push({ from: siteRouterIds[i - 1].id, to: siteRouterId, label: "HA" });
    }
  });

  // ── Layer 7: Site Switches ──
  sites.forEach((site, i) => {
    const sx = startX + i * siteSpacing + siteSpacing / 2;
    const siteSwitchId = addNode("switch", `${site} SW`, sx, LAYER_Y.siteSwitches, "site");
    links.push({ from: siteRouterIds[i].id, to: siteSwitchId });

    // ── Layer 8: User devices ──
    // Derive OS types from user_device_types (e.g. "Windows", "Linux", "macOS", "Ubuntu")
    const osTypes = (design.user_device_types || []).filter(t =>
      !t.toLowerCase().includes("phone") &&
      !t.toLowerCase().includes("voip") &&
      !t.toLowerCase().includes("ot") &&
      !t.toLowerCase().includes("ics") &&
      !t.toLowerCase().includes("plc") &&
      !t.toLowerCase().includes("scada")
    );
    const getWorkstationLabel = (idx) => {
      if (osTypes.length === 0) return `PC-${idx + 1}`;
      const os = osTypes[idx % osTypes.length];
      const shortOs = os.replace(/windows/i, "Win").replace(/macos|mac os/i, "Mac").replace(/ubuntu/i, "Ubuntu").replace(/linux/i, "Linux").replace(/debian/i, "Debian").replace(/centos/i, "CentOS").replace(/fedora/i, "Fedora");
      return `${shortOs}-${idx + 1}`;
    };

    const allDevices = [];
    if (hasWap) allDevices.push({ kind: "wap" });
    for (let d = 0; d < userDevPerSite; d++) {
      const isPhone = hasPhones && d % 3 === 0;
      allDevices.push({ kind: isPhone ? "phone" : "workstation", idx: d });
    }
    if (hasOTDevices) {
      allDevices.push({ kind: "ot", idx: 0, label: "PLC" });
      if (userDevPerSite > 2) allDevices.push({ kind: "ot", idx: 1, label: "SCADA" });
    }

    const totalDevW = allDevices.length * deviceSlotWidth;
    const devStartX = sx - totalDevW / 2 + deviceSlotWidth / 2;

    allDevices.forEach((dev, di) => {
      const devX = devStartX + di * deviceSlotWidth;
      if (dev.kind === "wap") {
        const wapId = addNode("wireless", "WAP", devX, LAYER_Y.userDevices, "user");
        links.push({ from: siteSwitchId, to: wapId });
      } else if (dev.kind === "ot") {
        const otId = addNode("ot", dev.label, devX, LAYER_Y.userDevices, "user");
        links.push({ from: siteSwitchId, to: otId });
      } else {
        const udType = dev.kind;
        const udLabel = udType === "phone" ? `Phone-${dev.idx + 1}` : getWorkstationLabel(dev.idx);
        const udId = addNode(udType, udLabel, devX, LAYER_Y.userDevices, "user");
        links.push({ from: siteSwitchId, to: udId });
      }
    });
  });

  return { nodes, links };
}

export default function DiagramPreview() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const [changePrompt, setChangePrompt] = useState("");
  const [applying, setApplying] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [diagramData, setDiagramData] = useState(null);
  const [changeLog, setChangeLog] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [tooltip, setTooltip] = useState(null); // { node, x, y }
  const [simulationMode, setSimulationMode] = useState(false);
  const [simEvents, setSimEvents] = useState([]); // [{ id, node }]
  const [viewMode, setViewMode] = useState("detailed"); // "detailed" | "topology"
  const [simRunning, setSimRunning] = useState(false);
  const [activeScenario, setActiveScenario] = useState(null);
  const [activeTrafficPattern, setActiveTrafficPattern] = useState("steady");
  const [simEventLog, setSimEventLog] = useState([]);
  const [simSessions, setSimSessions] = useState([]);
  const [currentSessionEvents, setCurrentSessionEvents] = useState([]);
  const [annotations, setAnnotations] = useState([]);
  const [annotationMode, setAnnotationMode] = useState(false);
  const [selectedAnnotation, setSelectedAnnotation] = useState(-1);
  const [metricsHistory, setMetricsHistory] = useState([]); // Store historical metrics
  const [hasChanges, setHasChanges] = useState(false);
  const [originalDiagramData, setOriginalDiagramData] = useState(null);
  const [savingLayout, setSavingLayout] = useState(false);
  const [showSubmit, setShowSubmit] = useState(false);
  const [showRegenConfirm, setShowRegenConfirm] = useState(false);
  const [trafficPatterns, setTrafficPatterns] = useState([]);
  const diagramRef = useRef(null);
  const isEmbedded = new URLSearchParams(window.location.search).get("embedded") === "true" || localStorage.getItem("lti_embedded") === "true";

  const returnTo = params.get("returnTo");

  const { data: design, isLoading, refetch } = useQuery({
    queryKey: ["design", id],
    queryFn: () => base44.entities.NetworkDesign.filter({ id }),
    select: (d) => d[0],
    enabled: !!id,
  });

  useEffect(() => {
    if (design) {
      // Always regenerate diagram from current design to reflect latest changes
      const diagram = buildDiagram(design);
      // Allocate IPs and attach to nodes/links
      const { nodeIps, linkIps } = allocateIPs(diagram.nodes, diagram.links, design.ip_scheme);
      diagram.nodes = diagram.nodes.map(n => ({ ...n, ip: nodeIps[n.id] }));
      diagram.links = diagram.links.map(l => {
        const key = `${l.from}-${l.to}`;
        const assignment = linkIps[key];
        return assignment
          ? { ...l, fromIp: assignment.fromIp, toIp: assignment.toIp, subnet: assignment.subnet }
          : l;
      });
      diagram._linkIps = linkIps;
      setDiagramData(diagram);
      setOriginalDiagramData(diagram);
      setHasChanges(false);
      // Save the fresh diagram
      base44.entities.NetworkDesign.update(design.id, {
        diagram_data: JSON.stringify(diagram),
        status: "previewed"
      });
      setChangeLog(design.change_history || []);
    }
  }, [design]);

  const handleRegenerateDiagram = async () => {
    if (!design) return;
    setRegenerating(true);
    const diagram = buildDiagram(design);
    setDiagramData({ ...diagram });
    setOriginalDiagramData(diagram);
    setHasChanges(false);
    await base44.entities.NetworkDesign.update(design.id, {
      diagram_data: JSON.stringify(diagram),
    });
    setRegenerating(false);
  };

  const handleApplyChanges = async () => {
    if (!changePrompt.trim()) return;
    setApplying(true);

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a network architect. Given this enterprise network design:
${JSON.stringify(design, null, 2)}

The user requests this change: "${changePrompt}"

Return ONLY the fields that need to change (flat JSON, not nested). 
Do NOT include: id, created_date, updated_date, created_by, diagram_data, eve_ng_script, change_history, status, summary.
Return a flat object with field names matching the design schema directly.`,
      response_json_schema: {
        type: "object",
        properties: {
          name: { type: "string" },
          company_name: { type: "string" },
          topology_type: { type: "string" },
          routing_protocol: { type: "string" },
          wan_technology: { type: "string" },
          num_sites: { type: "number" },
          site_names: { type: "array", items: { type: "string" } },
          num_vlans_per_site: { type: "number" },
          vlan_names: { type: "array", items: { type: "string" } },
          firewall_enabled: { type: "boolean" },
          firewall_vendor: { type: "string" },
          dmz_required: { type: "boolean" },
          redundancy_enabled: { type: "boolean" },
          load_balancer: { type: "boolean" },
          wireless_enabled: { type: "boolean" },
          server_farm: { type: "boolean" },
          num_servers: { type: "number" },
          router_model: { type: "string" },
          switch_model: { type: "string" },
          ip_scheme: { type: "string" },
          domain_name: { type: "string" },
          ntp_server: { type: "string" },
          dns_servers: { type: "array", items: { type: "string" } },
          num_user_devices: { type: "number" },
          user_device_types: { type: "array", items: { type: "string" } },
        }
      }
    });

    // Strip any protected fields
    const cleanUpdates = { ...result };
    ["id","created_date","updated_date","created_by","diagram_data","eve_ng_script","change_history","status"].forEach(k => delete cleanUpdates[k]);

    const newHistory = [...changeLog, changePrompt];
    const updatedDesign = { ...design, ...cleanUpdates };

    // Save to DB and immediately rebuild diagram
    await base44.entities.NetworkDesign.update(design.id, {
      ...cleanUpdates,
      change_history: newHistory,
    });

    const newDiagram = buildDiagram(updatedDesign);
    setDiagramData(newDiagram);
    await base44.entities.NetworkDesign.update(design.id, { diagram_data: JSON.stringify(newDiagram) });

    setChangePrompt("");
    setChangeLog(newHistory);
    await refetch();
    setApplying(false);
  };

  const handleSaveLayout = async () => {
    if (!diagramData || !design) return;
    setSavingLayout(true);
    await base44.entities.NetworkDesign.update(design.id, {
      diagram_data: JSON.stringify(diagramData),
    });
    setOriginalDiagramData(diagramData);
    setSavingLayout(false);
  };

  const handleSaveDeviceConfig = async (node, editedConfig) => {
    // Update the node in the current diagram data with the edited config
    const updatedDiagram = {
      ...diagramData,
      nodes: diagramData.nodes.map(n =>
        n.id === node.id ? { ...n, deviceConfig: editedConfig } : n
      )
    };
    setDiagramData(updatedDiagram);
    setHasChanges(true);
    // Don't auto-save to DB - let user regenerate to persist
  };

  const handleNodeUpdate = (updatedNode) => {
    // Update the selected node to reflect changes and regenerate config snippet
    setSelectedNode(updatedNode);
    // Also update in diagram data
    const updatedDiagram = {
      ...diagramData,
      nodes: diagramData.nodes.map(n =>
        n.id === updatedNode.id ? updatedNode : n
      )
    };
    setDiagramData(updatedDiagram);
    setHasChanges(true);
  };

  const handleRunScenario = ({ scenario, trafficPattern, targetNode, customEvents }) => {
    setActiveScenario(scenario);
    setActiveTrafficPattern(trafficPattern);
    setSimRunning(true);
    // Inject scenario events into simEvents feed
    const nodes = diagramData?.nodes || [];
    let targets = nodes;
    if (targetNode !== "auto") {
      targets = nodes.filter(n => n.id === targetNode);
    } else if (scenario.defaults?.targetType && scenario.defaults.targetType !== "any") {
      targets = nodes.filter(n => n.type === scenario.defaults.targetType);
    }
    if (targets.length === 0) targets = nodes.slice(0, 2);

    // Fire 3–5 events across matched targets
    const count = Math.min(targets.length, 3 + Math.floor(Math.random() * 2));
    const selected = targets.slice(0, count);
    const newEvents = selected.map(node => ({ id: Date.now() + Math.random(), node }));
    setSimEvents(prev => [...prev, ...newEvents]);

    // Build event log entries
    const logEntries = newEvents.map(ev => ({
      id: ev.id,
      device: ev.node.label.replace(/\n/g, " "),
      label: scenario.label + " detected",
      severity: scenario.defaults?.severity || "warning",
    }));
    setSimEventLog(prev => [...prev, ...logEntries]);
    setCurrentSessionEvents(prev => [...prev, ...logEntries]);

    // Add custom events too
    customEvents.forEach((ce, i) => {
      if (nodes.length > 0) {
        const node = nodes[i % nodes.length];
        const ceEntry = { id: Date.now() + i, device: node.label.replace(/\n/g, " "), label: ce.label, severity: "warning" };
        setSimEvents(prev => [...prev, { id: Date.now() + i + 1000, node, customLabel: ce.label }]);
        setSimEventLog(prev => [...prev, ceEntry]);
        setCurrentSessionEvents(prev => [...prev, ceEntry]);
      }
    });
  };

  const handleResetSim = (metricsData, avgLatency) => {
    // Save current session to history before reset
    if (activeScenario && currentSessionEvents.length > 0) {
      const sessionData = {
        id: Date.now(),
        scenario: activeScenario.label,
        timestamp: new Date().toISOString(),
        events: currentSessionEvents,
        metrics: metricsData || [],
        avgLatency: avgLatency || 0,
      };
      setSimSessions(prev => [...prev, sessionData]);
      setMetricsHistory(prev => [...prev, sessionData]);
    }
    setSimRunning(false);
    setActiveScenario(null);
    setSimEvents([]);
    setSimEventLog([]);
    setCurrentSessionEvents([]);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 xl:px-8">
      <div className="max-w-[1800px] mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Network Diagram</h1>
            <p className="text-muted-foreground text-sm mt-1">{design?.name} — {design?.company_name}</p>
          </div>
          <div className="flex gap-3 flex-wrap">
            {!isEmbedded && (
              <>
                {returnTo === "CyberEventBuilder" ? (
                  <Button variant="outline" onClick={() => navigate("/CyberEventBuilder")} className="gap-2 border-red-500/40 text-red-400 hover:bg-red-500/10">
                    <ArrowLeft className="h-4 w-4" /> ⚔️ Back to Event Builder
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => navigate(createPageUrl(`ReviewDesign?id=${id}`))} className="gap-2">
                    <ArrowLeft className="h-4 w-4" /> Review
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={async () => {
                    await base44.entities.NetworkDesign.update(design.id, { is_public: !design.is_public });
                    await refetch();
                  }}
                  className={`gap-2 ${design?.is_public ? "border-primary/50 text-primary" : "text-muted-foreground"}`}
                >
                  {design?.is_public ? <Globe className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                  {design?.is_public ? "Public" : "Private"}
                </Button>
              </>
            )}
            <Button
              onClick={() => navigate(createPageUrl(`GenerateScript?id=${id}`))}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <FileCode className="h-4 w-4" /> Generate Xtreme I.C.E. Script
            </Button>
            <Button
              onClick={() => setShowSubmit(true)}
              className="gap-2 bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckSquare className="h-4 w-4" /> Submit Design
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          <div className="xl:col-span-3 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              {/* View mode toggle */}
              <div className="flex items-center gap-1 bg-secondary rounded-lg p-1 border border-border">
                <button
                  onClick={() => setViewMode("detailed")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                    ${viewMode === "detailed"
                      ? "bg-primary/20 border border-primary/40 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <Network className="h-3.5 w-3.5" />
                  Detailed
                </button>
                <button
                  onClick={() => setViewMode("topology")}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all
                    ${viewMode === "topology"
                      ? "bg-primary/20 border border-primary/40 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                    }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                  Topology
                </button>
              </div>

              <div className="flex items-center gap-2">
                {viewMode === "detailed" && (
                  <button
                    onClick={() => { setSimulationMode(v => !v); setSelectedNode(null); setSimEvents([]); setSimRunning(false); setActiveScenario(null); setSimEventLog([]); }}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
                      ${simulationMode
                        ? "bg-primary/20 border-primary/50 text-primary"
                        : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    {simulationMode ? <Zap className="h-3.5 w-3.5" /> : <ZapOff className="h-3.5 w-3.5" />}
                    Simulation {simulationMode ? "ON" : "OFF"}
                  </button>
                )}
                {hasChanges && (
                  <Button
                    size="sm"
                    onClick={handleSaveLayout}
                    disabled={savingLayout}
                    className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    {savingLayout ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                    Save Layout
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRegenConfirm(true)}
                  disabled={regenerating}
                  className="gap-2"
                >
                  {regenerating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Regenerate
                </Button>
                <button
                  onClick={() => { setAnnotationMode(v => !v); setSelectedAnnotation(-1); }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
                    ${annotationMode ? "bg-yellow-400/20 border-yellow-400/50 text-yellow-300" : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}
                >
                  <Type className="h-3.5 w-3.5" /> Annotate
                </button>
                <div className="relative group">
                  <Button variant="outline" size="sm" className="gap-2">
                    <Download className="h-3.5 w-3.5" /> Export
                  </Button>
                  <div className="absolute right-0 top-full mt-1 hidden group-hover:flex flex-col bg-card border border-border rounded-lg shadow-xl z-50 min-w-[110px]">
                    <button onClick={() => diagramRef.current?.exportPNG()} className="px-3 py-2 text-xs text-foreground hover:bg-secondary text-left rounded-t-lg">PNG</button>
                    <button onClick={() => diagramRef.current?.exportSVG()} className="px-3 py-2 text-xs text-foreground hover:bg-secondary text-left rounded-b-lg">SVG</button>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative">
              {diagramData && viewMode === "topology" && (
                <TopologyView diagramData={diagramData} design={design} />
              )}
              {diagramData && viewMode === "detailed" && (
                <NetworkDiagram
                  ref={diagramRef}
                  diagramData={diagramData}
                  onNodesMoved={(updatedNodes) => {
                    setDiagramData(prev => ({ ...prev, nodes: updatedNodes }));
                    setHasChanges(true);
                  }}
                  onNodeClick={(node) => {
                    if (!node) return;
                    if (simulationMode) {
                      setSimEvents(prev => [...prev, { id: Date.now(), node }]);
                    } else {
                      setSelectedNode(node);
                      setTooltip(null);
                    }
                  }}
                  onNodeHover={(node) => {
                    if (simulationMode) { setTooltip(null); return; }
                    setTooltip(node ? { node } : null);
                  }}
                  simulationMode={simulationMode}
                  simulationTrafficPattern={activeTrafficPattern}
                  simulationScenario={activeScenario}
                  annotations={annotations}
                  annotationMode={annotationMode}
                  onAnnotationAdd={(x, y) => {
                    window.__annPos = { x, y };
                  }}
                  onNodeUpdate={handleNodeUpdate}
                />
              )}

              {/* Simulation mode overlay hint */}
              {viewMode === "detailed" && simulationMode && (
                <div className="absolute top-3 left-3 bg-primary/20 border border-primary/40 rounded-lg px-3 py-1.5 text-xs text-primary font-medium pointer-events-none flex items-center gap-1.5">
                  <Zap className="h-3 w-3" /> Click any device to simulate
                </div>
              )}

              {/* Hover tooltip (non-simulation) */}
              {viewMode === "detailed" && !simulationMode && tooltip && (
                <div
                  className="absolute z-50 bg-background border border-border rounded-lg px-3 py-2 text-xs shadow-xl pointer-events-none"
                  style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
                >
                  <p className="font-semibold text-foreground">{tooltip.node.label.replace(/\n/g, " ")}</p>
                  <p className="text-muted-foreground capitalize">{tooltip.node.type}</p>
                  <p className="text-primary mt-0.5 text-[10px]">Click for details</p>
                </div>
              )}
            </div>

            {/* Annotation toolbar */}
            {annotationMode && !simulationMode && (
              <AnnotationToolbar
                onAdd={(ann) => {
                  const pos = window.__annPos || { x: 100, y: 80 };
                  setAnnotations(prev => [...prev, { ...ann, x: pos.x, y: pos.y, id: Date.now() }]);
                  window.__annPos = null;
                }}
                onClose={() => setAnnotationMode(false)}
                hasSelected={selectedAnnotation >= 0}
                onDeleteSelected={() => {
                  setAnnotations(prev => prev.filter((_, i) => i !== selectedAnnotation));
                  setSelectedAnnotation(-1);
                }}
              />
            )}

            {/* Simulation events feed */}
            {simulationMode && simEvents.length > 0 && (
              <div className="space-y-2">
                {simEvents.map(ev => (
                  <SimulationEvent
                    key={ev.id}
                    node={ev.node}
                    onDone={() => setSimEvents(prev => prev.filter(e => e.id !== ev.id))}
                  />
                ))}
              </div>
            )}

            {/* Selected node detail panel (non-simulation) */}
            {!simulationMode && selectedNode && (
              <DeviceDetailPanel
                node={selectedNode}
                design={design}
                onClose={() => setSelectedNode(null)}
                onSaveConfig={handleSaveDeviceConfig}
              />
            )}

            {/* Traffic Flow + AI Exploit — below topology in simulation mode */}
            {simulationMode && (
              <div className="space-y-4 mt-2">
                <TrafficFlowPanel
                  nodes={diagramData?.nodes || []}
                  links={diagramData?.links || []}
                  design={design}
                  running={simRunning}
                />
                <AIExploitSimulator design={design} nodes={diagramData?.nodes || []} />
              </div>
            )}
          </div>

          <div className="xl:col-span-2 space-y-4">
            {simulationMode && (
               <>
                 {/* Top: control + narrative side by side */}
                 <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2 gap-4">
                   <SimulationControlPanel
                     nodes={diagramData?.nodes || []}
                     onRunScenario={handleRunScenario}
                     onReset={() => handleResetSim()}
                     running={simRunning}
                   />
                   <div className="space-y-4">
                     <SimulationNarrativePanel
                       scenario={activeScenario}
                       trafficPattern={activeTrafficPattern}
                       running={simRunning}
                       nodes={diagramData?.nodes || []}
                     />
                     <SimulationMetricsDashboard
                       running={simRunning}
                       scenario={activeScenario}
                       trafficPattern={activeTrafficPattern}
                       eventLog={simEventLog}
                       onSessionEnd={(metricsData) => setMetricsHistory(prev => [...prev, { metrics: metricsData, timestamp: new Date().toISOString() }])}
                     />
                   </div>
                 </div>
                 <LatencyHopGraph
                   nodes={diagramData?.nodes || []}
                   links={diagramData?.links || []}
                   running={simRunning}
                   scenario={activeScenario}
                   trafficPattern={activeTrafficPattern}
                   routingProtocol={design?.routing_protocol}
                 />
                 {/* Bottom panels in 2-col grid */}
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                   <MetricsComparison
                     currentMetrics={metricsHistory[metricsHistory.length - 1]?.metrics || []}
                     historicalSessions={metricsHistory}
                   />
                   <SimulationHistoryPanel sessions={simSessions} />
                   <BottleneckAnalysis nodes={diagramData?.nodes || []} metricsHistory={metricsHistory} />
                   <ConfigValidation design={design} nodes={diagramData?.nodes || []} />
                 </div>
                 </>
                 )}

            {!simulationMode && (
              <>
                <TrafficPatternBuilder 
                  patterns={trafficPatterns} 
                  onChange={setTrafficPatterns}
                />

                <CostEstimator design={design} />

                <NetworkDocumentation 
                  diagramData={diagramData}
                  designName={design?.name}
                />

                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="font-semibold text-sm text-foreground mb-3">Request Changes</h3>
                  <Textarea
                    value={changePrompt}
                    onChange={(e) => setChangePrompt(e.target.value)}
                    placeholder="e.g. Add a second firewall for redundancy, change routing to BGP, add 2 more servers..."
                    className="bg-secondary border-border min-h-[100px] text-sm"
                  />
                  <Button
                    onClick={handleApplyChanges}
                    disabled={applying || !changePrompt.trim()}
                    className="w-full mt-3 gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {applying ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    Apply Changes
                  </Button>
                </div>

                {changeLog.length > 0 && (
                  <div className="bg-card border border-border rounded-xl p-5">
                    <h3 className="font-semibold text-sm text-foreground mb-3">Change History</h3>
                    <div className="space-y-2">
                      {changeLog.map((log, i) => (
                        <div key={i} className="flex items-start gap-2 text-xs">
                          <div className="h-1.5 w-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                          <span className="text-muted-foreground">{log}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="font-semibold text-sm text-foreground mb-3">Legend</h3>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Devices</p>
                  <div className="grid grid-cols-2 gap-1.5 text-xs mb-3">
                    {[
                        { type: "Router", color: "#2e7fbf" },
                        { type: "Switch", color: "#3a9ec7" },
                        { type: "Firewall", color: "#cc2200" },
                        { type: "Server", color: "#5b3ea8" },
                        { type: "Load Bal.", color: "#b45309" },
                        { type: "Wireless AP", color: "#065f46" },
                        { type: "OT/ICS Device", color: "#dc2626" },
                        { type: "NAS", color: "#3730a3" },
                        { type: "VPN GW", color: "#047857" },
                        { type: "IDS/IPS", color: "#9a3412" },
                        { type: "Cloud", color: "#7c3aed" },
                        { type: "UPS", color: "#78350f" },
                        { type: "Workstation", color: "#2a4a6b" },
                      ].map((item) => (
                      <div key={item.type} className="flex items-center gap-1.5">
                        <div className="h-3 w-3 rounded-sm shrink-0" style={{ backgroundColor: item.color }} />
                        <span className="text-muted-foreground">{item.type}</span>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">Connections</p>
                  <div className="space-y-1.5 text-xs">
                    {[
                      { label: "WAN / MPLS", color: "#6366f1", dash: false },
                      { label: "LAN (solid)", color: "#94a3b8", dash: false },
                      { label: "Fiber", color: "#fbbf24", dash: false },
                      { label: "Point-to-Point", color: "#34d399", dash: true },
                      { label: "VPN Tunnel", color: "#a78bfa", dash: true },
                      { label: "HA Link", color: "#facc15", dash: true },
                      { label: "DMZ", color: "#f43f5e", dash: true },
                    ].map(item => (
                      <div key={item.label} className="flex items-center gap-2">
                        <svg width="28" height="8">
                          <line x1="0" y1="4" x2="28" y2="4" stroke={item.color} strokeWidth="2" strokeDasharray={item.dash ? "4,2" : "none"} />
                        </svg>
                        <span className="text-muted-foreground">{item.label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <AlertDialog open={showRegenConfirm} onOpenChange={setShowRegenConfirm}>
        <AlertDialogContent>
          <AlertDialogTitle>Regenerate Topology?</AlertDialogTitle>
          <AlertDialogDescription>
            This will reset the diagram to its baseline layout, discarding any custom device positions or manual layout changes. This cannot be undone.
          </AlertDialogDescription>
          <div className="flex justify-end gap-3 mt-4">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { setShowRegenConfirm(false); handleRegenerateDiagram(); }} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Reset to Baseline
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <SubmitDesignDialog
        open={showSubmit}
        onClose={() => setShowSubmit(false)}
        design={design}
        diagramData={diagramData}
      />
    </div>
  );
}