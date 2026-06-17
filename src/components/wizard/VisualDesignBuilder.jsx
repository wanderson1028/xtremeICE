import React, { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, Link as LinkIcon, Router, Network, Shield, Server, Wifi, Cloud, Monitor, Scale, Globe, ZoomIn, ZoomOut, Sparkles, Cpu, Activity, Terminal, Gauge, Download } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import CanvasConfigPanel from "./CanvasConfigPanel";
import SmartAnalysisPanel from "./SmartAnalysisPanel";
import SaveDesignDialog from "./SaveDesignDialog";
import DiagramExporter from "./DiagramExporter";

const DEVICE_TYPES = [
  // Network
  { type: "router",       label: "Router",      Icon: Router,   color: "#3b82f6", category: "network" },
  { type: "switch",       label: "Switch",      Icon: Network,  color: "#8b5cf6", category: "network" },
  { type: "firewall",     label: "Firewall",    Icon: Shield,   color: "#ef4444", category: "network" },
  { type: "loadbalancer", label: "Load Bal.",   Icon: Scale,    color: "#0ea5e9", category: "network" },
  // End Devices
  { type: "server",       label: "Server",      Icon: Server,   color: "#10b981", category: "endpoint" },
  { type: "wireless",     label: "WAP",         Icon: Wifi,     color: "#f59e0b", category: "endpoint" },
  { type: "workstation",  label: "PC",          Icon: Monitor,  color: "#64748b", category: "endpoint" },
  // OT / ICS / SCADA
  { type: "plc",          label: "PLC",         Icon: Cpu,      color: "#dc2626", category: "ot" },
  { type: "scada",        label: "SCADA Srv",   Icon: Activity, color: "#b45309", category: "ot" },
  { type: "hmi",          label: "HMI",         Icon: Gauge,    color: "#7c3aed", category: "ot" },
  { type: "iot",          label: "IoT Device",  Icon: Cpu,      color: "#059669", category: "ot" },
  // WAN
  { type: "cloud",        label: "Cloud",       Icon: Cloud,    color: "#6366f1", category: "wan" },
  { type: "internet",     label: "Internet",    Icon: Globe,    color: "#06b6d4", category: "wan" },
];

const NETWORK_DEVICES  = DEVICE_TYPES.filter(d => d.category === "network");
const ENDPOINT_DEVICES = DEVICE_TYPES.filter(d => d.category === "endpoint");
const OT_DEVICES       = DEVICE_TYPES.filter(d => d.category === "ot");
const WAN_DEVICES      = DEVICE_TYPES.filter(d => d.category === "wan");
// Legacy alias
const LAN_DEVICES = [...NETWORK_DEVICES, ...ENDPOINT_DEVICES];

const GRID = 16;
const snap = (v) => Math.round(v / GRID) * GRID;

const VENDOR_OPTIONS = {
  router:       ["Cisco ISR", "Cisco CSR1000v", "Juniper vMX", "VyOS", "Generic Router"],
  switch:       ["Cisco Catalyst", "Cisco Nexus", "Arista", "Juniper EX", "Generic L2/L3"],
  firewall:     ["Cisco ASA", "Palo Alto", "Fortinet", "pfSense"],
  server:       ["Windows Server", "Ubuntu Server", "CentOS", "Debian", "Generic Server"],
  wireless:     ["Cisco WAP", "Aruba AP", "Ubiquiti UniFi", "Generic WAP"],
  cloud:        ["AWS", "Azure", "GCP", "Oracle Cloud"],
  internet:     ["Public Internet", "ISP Link", "Peering Point"],
  workstation:  ["Windows", "macOS", "Ubuntu", "Linux", "Generic PC"],
  loadbalancer: ["F5 BIG-IP", "HAProxy", "NGINX", "AWS ALB", "Generic LB"],
  plc:          ["Allen-Bradley PLC", "Siemens S7", "Schneider Modicon", "GE Fanuc", "Generic PLC"],
  scada:        ["Wonderware", "Ignition", "Siemens WinCC", "GE iFIX", "Generic SCADA"],
  hmi:          ["Siemens HMI", "Allen-Bradley PanelView", "Weintek", "Generic HMI"],
  iot:          ["Raspberry Pi", "Arduino", "Generic IoT Sensor", "Smart Camera", "Environmental Sensor"],
};

const DEVICE_INTERFACES = {
  router:       ["GigabitEthernet0/0", "GigabitEthernet0/1", "GigabitEthernet0/2", "GigabitEthernet0/3"],
  switch:       ["Fa0/1", "Fa0/2", "Fa0/3", "Fa0/4", "Fa0/5", "Fa0/6", "Fa0/7", "Fa0/8"],
  firewall:     ["outside", "inside", "dmz"],
  server:       ["eth0", "eth1"],
  wireless:     ["radio0", "wired0"],
  workstation:  ["eth0"],
  loadbalancer: ["port1", "port2", "port3", "port4"],
  cloud:        [],
  internet:     [],
  plc:          ["eth0", "serial0"],
  scada:        ["eth0", "eth1"],
  hmi:          ["eth0"],
  iot:          ["eth0"],
};

const WAN_TYPES = new Set(["cloud", "internet"]);

let nodeCounter = 0;

function extractFormData(nodes, links) {
  const counts = {};
  nodes.forEach(n => { counts[n.type] = (counts[n.type] || 0) + 1; });
  const routerCount = counts.router || 0;
  const switchCount = counts.switch || 0;
  const firewallCount = counts.firewall || 0;
  const serverCount = counts.server || 0;
  const wapCount = counts.wireless || 0;
  const lbCount = counts.loadbalancer || 0;
  const cloudCount = counts.cloud || 0;
  const numSites = Math.max(1, routerCount);
  const maxLinks = numSites * (numSites - 1) / 2;
  let topologyType = "star";
  if (numSites >= 3) {
    const linkRatio = links.length / Math.max(maxLinks, 1);
    if (linkRatio >= 0.8) topologyType = "full-mesh";
    else if (linkRatio >= 0.5) topologyType = "partial-mesh";
    else topologyType = "hub-and-spoke";
  }
  return {
    num_sites: numSites,
    site_names: Array.from({ length: numSites }, (_, i) => `Site-${i + 1}`),
    topology_type: topologyType,
    routing_protocol: numSites > 2 ? "OSPF" : "Static",
    wan_technology: cloudCount > 0 ? "SD-WAN" : numSites > 2 ? "MPLS" : "Metro Ethernet",
    firewall_enabled: firewallCount > 0,
    firewall_vendor: firewallCount > 0 ? "Palo Alto" : "None",
    dmz_required: firewallCount > 0 && serverCount > 0,
    server_farm: serverCount > 0,
    num_servers: serverCount,
    load_balancer: lbCount > 0,
    wireless_enabled: wapCount > 0,
    redundancy_enabled: links.length > numSites,
    num_vlans_per_site: Math.min(Math.max(2, switchCount), 6),
    vlan_names: ["Management", "Data", "Voice", "Guest"].slice(0, Math.min(Math.max(2, switchCount), 4)),
    router_model: "Cisco ISR",
    switch_model: "Cisco Catalyst",
    num_user_devices: (counts.workstation || 0) * 5 || 20,
    user_device_types: counts.workstation ? ["Workstation", "Laptop"] : ["Laptop"],
    ip_scheme: "10.0.0.0/8",
  };
}

export default function VisualDesignBuilder({ onDone, onBack, initialNodes = [], initialLinks = [], initialGlobalConfig = {}, designId = null, designName = null }) {
  const canvasRef = useRef(null);
  const [nodes, setNodes] = useState(initialNodes);
  const [links, setLinks] = useState(initialLinks);
  const [dragging, setDragging] = useState(null);
  const [linking, setLinking] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [pendingDrop, setPendingDrop] = useState(null);
  const [editingNode, setEditingNode] = useState(null);
  const [confirmReset, setConfirmReset] = useState(false);
  const [selectionBox, setSelectionBox] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const panRef = useRef({ x: 0, y: 0 });
  const [pendingLink, setPendingLink] = useState(null);
  const [globalConfig, setGlobalConfig] = useState(initialGlobalConfig);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showSaveDialog, setShowSaveDialog] = useState(false);
  const [editingLabel, setEditingLabel] = useState(null);
  const [boxes, setBoxes] = useState([]);
  const [sectionMode, setSectionMode] = useState(false);
  const [boxDrawing, setBoxDrawing] = useState(null); // {startX, startY, currentX, currentY}
  const [selectedBox, setSelectedBox] = useState(null); // box id being edited
  const BOX_COLORS = ["#3b82f6","#10b981","#f59e0b","#ef4444","#8b5cf6","#ec4899","#06b6d4","#64748b"]; // nodeId being renamed
  const [saving, setSaving] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [showExporter, setShowExporter] = useState(false);
  const [autoSaveStatus, setAutoSaveStatus] = useState(null); // null | 'saving' | 'saved'
  const isDirtyRef = useRef(false);
  const navigate = useNavigate();
  const didDrag = useRef(false);
  const historyRef = useRef([]);
  const futureRef = useRef([]);
  const [historySize, setHistorySize] = useState(0);
  const [futureSize, setFutureSize] = useState(0);

  // Mark dirty whenever nodes/links change after initial load
  const prevNodesRef = useRef(null);
  useEffect(() => {
    if (prevNodesRef.current !== null) isDirtyRef.current = true;
    prevNodesRef.current = nodes;
  }, [nodes, links]);

  // Auto-save every 30 seconds if dirty and designId exists
  useEffect(() => {
    if (!designId) return;
    const interval = setInterval(async () => {
      if (!isDirtyRef.current) return;
      setAutoSaveStatus('saving');
      try {
        const base = extractFormData(nodes, links);
        await base44.entities.NetworkDesign.update(designId, {
          diagram_data: JSON.stringify({ nodes, links }),
          ...base,
          status: 'draft',
        });
        isDirtyRef.current = false;
        setAutoSaveStatus('saved');
        setTimeout(() => setAutoSaveStatus(null), 3000);
      } catch (_) {
        setAutoSaveStatus(null);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [designId, nodes, links]);

  const pushHistory = (prevNodes, prevLinks) => {
    historyRef.current = [...historyRef.current, { nodes: prevNodes, links: prevLinks }];
    futureRef.current = [];
    setHistorySize(historyRef.current.length);
    setFutureSize(0);
  };

  const undo = () => {
    if (historyRef.current.length === 0) return;
    const prev = historyRef.current[historyRef.current.length - 1];
    historyRef.current = historyRef.current.slice(0, -1);
    futureRef.current = [{ nodes, links }, ...futureRef.current];
    setNodes(prev.nodes);
    setLinks(prev.links);
    setSelectedIds([]);
    setHistorySize(historyRef.current.length);
    setFutureSize(futureRef.current.length);
  };

  const redo = () => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current[0];
    futureRef.current = futureRef.current.slice(1);
    historyRef.current = [...historyRef.current, { nodes, links }];
    setNodes(next.nodes);
    setLinks(next.links);
    setSelectedIds([]);
    setHistorySize(historyRef.current.length);
    setFutureSize(futureRef.current.length);
  };

  const handleGlobalConfigChange = (patch) => setGlobalConfig(prev => ({ ...prev, ...patch }));

  const handleNodeConfigChange = (id, field, value) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, [field]: value } : n));
  };

  const handleDone = () => {
    if (designId && designName) {
      // Already named — save directly without dialog
      handleSaveAndNavigate(designName);
    } else {
      setShowSaveDialog(true);
    }
  };

  // Keep panRef in sync so event handlers (wheel, mousemove) always have fresh pan
  useEffect(() => { panRef.current = pan; }, [pan]);

  // centerView: pan to center content at a given zoom (default 0.75), don't shrink to fit
  const centerView = useCallback((nodeList, targetZoom = 0.75) => {
    if (!nodeList || nodeList.length === 0) return;
    const el = canvasRef.current;
    const W = el?.clientWidth || 860;
    const H = el?.clientHeight || 600;
    const minX = Math.min(...nodeList.map(n => n.x));
    const maxX = Math.max(...nodeList.map(n => n.x + 80));
    const minY = Math.min(...nodeList.map(n => n.y));
    const maxY = Math.max(...nodeList.map(n => n.y + 80));
    const cW = Math.max(maxX - minX, 1);
    const cH = Math.max(maxY - minY, 1);
    const newPan = {
      x: Math.round(W / 2 - (minX + cW / 2) * targetZoom),
      y: Math.round(H / 2 - (minY + cH / 2) * targetZoom),
    };
    setZoom(targetZoom);
    setPan(newPan);
    panRef.current = newPan;
  }, []);

  // fitView: shrink to fit — used only when user explicitly requests it, min zoom 0.45
  const fitView = useCallback((nodeList) => {
    if (!nodeList || nodeList.length === 0) return;
    const el = canvasRef.current;
    const W = el?.clientWidth || 860;
    const H = el?.clientHeight || 600;
    const PAD = 80;
    const minX = Math.min(...nodeList.map(n => n.x));
    const maxX = Math.max(...nodeList.map(n => n.x + 80));
    const minY = Math.min(...nodeList.map(n => n.y));
    const maxY = Math.max(...nodeList.map(n => n.y + 80));
    const cW = Math.max(maxX - minX, 1);
    const cH = Math.max(maxY - minY, 1);
    const newZoom = Math.max(0.45, Math.min(1.0,
      Math.min((W - PAD * 2) / cW, (H - PAD * 2) / cH)
    ));
    const newPan = {
      x: Math.round(W / 2 - (minX + cW / 2) * newZoom),
      y: Math.round(H / 2 - (minY + cH / 2) * newZoom),
    };
    setZoom(newZoom);
    setPan(newPan);
    panRef.current = newPan;
  }, []);

  const handleSaveAndNavigate = async (designNameArg) => {
    setSaving(true);
    try {
      const base = extractFormData(nodes, links);
      const diagramPayload = JSON.stringify({ nodes, links });
      const designData = {
        name: designNameArg,
        ...base,
        routing_protocol: globalConfig.routing_protocol || base.routing_protocol,
        wan_technology: globalConfig.wan_technology || base.wan_technology,
        ip_scheme: globalConfig.lan_scheme || base.ip_scheme,
        domain_name: globalConfig.domain_name || "",
        ntp_server: globalConfig.ntp_server || "",
        dns_servers: globalConfig.dns_servers ? globalConfig.dns_servers.split(",").map(s => s.trim()) : [],
        device_username: globalConfig.username || "",
        device_password: globalConfig.password || "",
        enable_password: globalConfig.enable_secret || "",
        dmz_required: globalConfig.dmz_required ?? base.dmz_required,
        redundancy_enabled: globalConfig.redundancy_enabled ?? base.redundancy_enabled,
        wireless_enabled: globalConfig.wireless_enabled ?? base.wireless_enabled,
        load_balancer: globalConfig.load_balancer ?? base.load_balancer,
        diagram_data: diagramPayload,
        status: "draft",
      };
      
      if (designId) {
        await base44.entities.NetworkDesign.update(designId, designData);
        toast.success("Design updated!");
        if (onDone) onDone(designData);
        else navigate(`/GenerateScript?id=${designId}`);
      } else {
        const created = await base44.entities.NetworkDesign.create(designData);
        toast.success("Design saved!");
        navigate(`/GenerateScript?id=${created.id}`);
      }
    } catch (err) {
      toast.error("Save failed: " + err.message);
      setSaving(false);
    }
  };

  // Load initial nodes: fit to canvas but keep zoom readable (min 0.6)
  useEffect(() => {
    if (!initialNodes || initialNodes.length === 0) return;
    setNodes(initialNodes);
    setLinks(initialLinks || []);
    const tryFitLoad = (attempts = 0) => {
      const el = canvasRef.current;
      const W = el?.clientWidth ?? 0;
      const H = el?.clientHeight ?? 0;
      if (W > 100 && H > 100) {
        const PAD = 80;
        const minX = Math.min(...initialNodes.map(n => n.x));
        const maxX = Math.max(...initialNodes.map(n => n.x + 80));
        const minY = Math.min(...initialNodes.map(n => n.y));
        const maxY = Math.max(...initialNodes.map(n => n.y + 80));
        const cW = Math.max(maxX - minX, 1);
        const cH = Math.max(maxY - minY, 1);
        // Use fit-zoom but clamp between 0.6 and 1.0 for readability
        const fitZoom = Math.min((W - PAD * 2) / cW, (H - PAD * 2) / cH);
        const newZoom = Math.max(0.6, Math.min(1.0, fitZoom));
        const newPan = {
          x: Math.round(W / 2 - (minX + cW / 2) * newZoom),
          y: Math.round(H / 2 - (minY + cH / 2) * newZoom),
        };
        setZoom(newZoom);
        setPan(newPan);
        panRef.current = newPan;
      } else if (attempts < 20) {
        setTimeout(() => tryFitLoad(attempts + 1), attempts < 5 ? 50 : 150);
      }
    };
    requestAnimationFrame(() => tryFitLoad());
  }, [initialNodes, initialLinks]);

  // Non-passive wheel listener for zoom — zoom toward canvas center
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const onWheel = (e) => {
      e.preventDefault();
      e.stopPropagation();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setZoom(oldZ => {
        const newZ = Math.min(2, Math.max(0.2, oldZ - e.deltaY * 0.001));
        setPan(oldPan => ({
          x: Math.round(mx - (mx - oldPan.x) * newZ / oldZ),
          y: Math.round(my - (my - oldPan.y) * newZ / oldZ),
        }));
        return newZ;
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const handleDragStart = (type, e) => {
    e.dataTransfer.setData("deviceType", type);
  };

  const toCanvasCoords = (clientX, clientY) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - panRef.current.x) / zoom,
      y: (clientY - rect.top - panRef.current.y) / zoom,
    };
  };

  const handleDrop = (e) => {
    e.preventDefault();
    const type = e.dataTransfer.getData("deviceType");
    if (!type) return;
    const { x, y } = toCanvasCoords(e.clientX, e.clientY);
    const sx = snap(x - 28);
    const sy = snap(y - 28);
    setPendingDrop({ type, x: sx, y: sy });
  };

  const confirmDrop = (vendor) => {
    const { type, x, y } = pendingDrop;
    const def = DEVICE_TYPES.find(d => d.type === type);
    nodeCounter++;
    const label = vendor || `${def.label} ${nodeCounter}`;
    pushHistory(nodes, links);
    const interfaces = DEVICE_INTERFACES[type] ? [...DEVICE_INTERFACES[type]] : ["eth0", "eth1"];
    setNodes(prev => [...prev, { id: `node-${nodeCounter}`, type, label, x, y, Icon: def.Icon, color: def.color, vendor, interfaces }]);
    setPendingDrop(null);
  };

  const confirmVendorEdit = (vendor) => {
    setNodes(prev => prev.map(n => n.id === editingNode ? { ...n, label: vendor, vendor } : n));
    setEditingNode(null);
  };

  const copyNode = (e, node) => {
    e.stopPropagation();
    nodeCounter++;
    setNodes(prev => [...prev, { ...node, id: `node-${nodeCounter}`, x: node.x + 20, y: node.y + 20 }]);
  };

  const handleNodeMouseDown = (e, id) => {
    e.stopPropagation();
    if (linking !== null) { didDrag.current = false; return; }
    didDrag.current = false;
    const { x: mouseX, y: mouseY } = toCanvasCoords(e.clientX, e.clientY);
    const idsToMove = selectedIds.includes(id) ? selectedIds : [id];
    const origPositions = {};
    nodes.forEach(n => { if (idsToMove.includes(n.id)) origPositions[n.id] = { x: n.x, y: n.y }; });
    setDragging({ ids: idsToMove, startX: mouseX, startY: mouseY, origPositions });
  };

  const handleNodeClick = (e, id) => {
    e.stopPropagation();
    if (didDrag.current) return;

    if (linking !== null) {
      if (linking !== id) {
        const exists = links.some(l => (l.from === linking && l.to === id) || (l.from === id && l.to === linking));
        if (!exists) {
          const fromNode = nodes.find(n => n.id === linking);
          const toNode = nodes.find(n => n.id === id);
          // If either side is cloud/internet, skip interface picker and link directly
          if (WAN_TYPES.has(fromNode?.type) || WAN_TYPES.has(toNode?.type)) {
            pushHistory(nodes, links);
            setLinks(prev => [...prev, { id: `link-${Date.now()}`, from: linking, to: id, wan: true }]);
            // Auto-select "outside" interface on firewall when connected to WAN
            const fwNode = fromNode?.type === "firewall" ? fromNode : toNode?.type === "firewall" ? toNode : null;
            if (fwNode) {
              setLinks(prev => prev.map(l => {
                if (l.id !== prev[prev.length - 1]?.id) return l;
                return fwNode.id === linking
                  ? { ...l, fromIface: "outside" }
                  : { ...l, toIface: "outside" };
              }));
            }
          } else {
            // Ensure nodes have type-specific interfaces
            setNodes(prev => prev.map(n => {
              if ((n.id === linking || n.id === id) && !n.interfaces) {
                return { ...n, interfaces: DEVICE_INTERFACES[n.type] ? [...DEVICE_INTERFACES[n.type]] : ["eth0", "eth1"] };
              }
              return n;
            }));
            const fromIfaces = (fromNode?.interfaces || DEVICE_INTERFACES[fromNode?.type] || ["eth0"]).filter(i => !links.some(l => (l.from === linking && l.fromIface === i) || (l.to === linking && l.toIface === i)));
            const toIfaces = (toNode?.interfaces || DEVICE_INTERFACES[toNode?.type] || ["eth0"]).filter(i => !links.some(l => (l.from === id && l.fromIface === i) || (l.to === id && l.toIface === i)));
            setPendingLink({ fromId: linking, toId: id, fromIface: fromIfaces[0] || "", toIface: toIfaces[0] || "" });
          }
        }
      }
      setLinking(null);
      return;
    }

    if (e.shiftKey || e.ctrlKey || e.metaKey) {
      setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
      return;
    }
    setSelectedIds([id]);
  };

  const handleCanvasMouseDown = (e) => {
    if (linking) { setLinking(null); return; }
    if (e.target.closest && e.target.closest('[data-node]')) return;
    const { x, y } = toCanvasCoords(e.clientX, e.clientY);
    if (sectionMode) {
      setBoxDrawing({ startX: x, startY: y, currentX: x, currentY: y });
      return;
    }
    setSelectedIds([]);
    setSelectionBox({ startX: x, startY: y, currentX: x, currentY: y });
  };

  const handleMouseMove = useCallback((e) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const mouseX = (e.clientX - rect.left - panRef.current.x) / zoom;
    const mouseY = (e.clientY - rect.top - panRef.current.y) / zoom;
    if (boxDrawing) {
      setBoxDrawing(prev => ({ ...prev, currentX: mouseX, currentY: mouseY }));
      return;
    }
    if (dragging) {
      const dx = mouseX - dragging.startX;
      const dy = mouseY - dragging.startY;
      if (!didDrag.current && Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
      didDrag.current = true;
      setNodes(prev => prev.map(n => {
        if (!dragging.ids.includes(n.id)) return n;
        const orig = dragging.origPositions[n.id];
        return { ...n, x: snap(orig.x + dx), y: snap(orig.y + dy) };
      }));
    }
    if (selectionBox) {
      setSelectionBox(prev => ({ ...prev, currentX: mouseX, currentY: mouseY }));
    }
  }, [dragging, selectionBox, zoom, boxDrawing]);

  const handleMouseUp = useCallback(() => {
    if (boxDrawing) {
      const minX = Math.min(boxDrawing.startX, boxDrawing.currentX);
      const minY = Math.min(boxDrawing.startY, boxDrawing.currentY);
      const w = Math.abs(boxDrawing.currentX - boxDrawing.startX);
      const h = Math.abs(boxDrawing.currentY - boxDrawing.startY);
      if (w > 30 && h > 30) {
        const newBox = { id: `box-${Date.now()}`, x: minX, y: minY, w, h, label: "Section", color: "#3b82f6" };
        setBoxes(prev => [...prev, newBox]);
        setSelectedBox(newBox.id);
      }
      setBoxDrawing(null);
      return;
    }
    if (selectionBox) {
      const minX = Math.min(selectionBox.startX, selectionBox.currentX);
      const maxX = Math.max(selectionBox.startX, selectionBox.currentX);
      const minY = Math.min(selectionBox.startY, selectionBox.currentY);
      const maxY = Math.max(selectionBox.startY, selectionBox.currentY);
      if (maxX - minX > 5 || maxY - minY > 5) {
        const hit = nodes.filter(n => {
          const cx = n.x + 28;
          const cy = n.y + 28;
          return cx >= minX && cx <= maxX && cy >= minY && cy <= maxY;
        }).map(n => n.id);
        if (hit.length > 0) setSelectedIds(hit);
      }
      setSelectionBox(null);
    }
    setDragging(null);
  }, [selectionBox, nodes]);

  const deleteSelected = () => {
    if (selectedIds.length === 0) return;
    pushHistory(nodes, links);
    setNodes(prev => prev.filter(n => !selectedIds.includes(n.id)));
    setLinks(prev => prev.filter(l => !selectedIds.includes(l.from) && !selectedIds.includes(l.to)));
    setSelectedIds([]);
  };

  const deleteLink = (id) => {
    pushHistory(nodes, links);
    setLinks(prev => prev.filter(l => l.id !== id));
  };

  const confirmLink = () => {
    if (!pendingLink) return;
    pushHistory(nodes, links);
    setLinks(prev => [...prev, {
      id: `link-${Date.now()}`,
      from: pendingLink.fromId,
      to: pendingLink.toId,
      fromIface: pendingLink.fromIface,
      toIface: pendingLink.toIface,
    }]);
    setPendingLink(null);
    setSelectedIds([]);
  };

  const autoAlign = () => {
    if (nodes.length === 0) return;
    const SPACING_X = 160;
    const SPACING_Y = 140;
    // Group by type, each type gets its own row
    const typeOrder = [];
    nodes.forEach(n => { if (!typeOrder.includes(n.type)) typeOrder.push(n.type); });
    const aligned = [];
    typeOrder.forEach((type, rowIdx) => {
      const row = nodes.filter(n => n.type === type);
      const rowWidth = (row.length - 1) * SPACING_X;
      row.forEach((n, colIdx) => {
        aligned.push({ ...n, x: snap(colIdx * SPACING_X - rowWidth / 2 + 300), y: snap(rowIdx * SPACING_Y + 100) });
      });
    });
    setNodes(aligned);
    requestAnimationFrame(() => centerView(aligned, 0.75));
  };

  const getNodeCenter = (id) => {
    const n = nodes.find(n => n.id === id);
    return n ? { x: n.x + 28, y: n.y + 28 } : null;
  };

  const selBox = selectionBox ? {
    x: Math.min(selectionBox.startX, selectionBox.currentX),
    y: Math.min(selectionBox.startY, selectionBox.currentY),
    w: Math.abs(selectionBox.currentX - selectionBox.startX),
    h: Math.abs(selectionBox.currentY - selectionBox.startY),
  } : null;

  const soloSelected = selectedIds.length === 1 ? selectedIds[0] : null;

  // Auto-show config panel when a single node is selected
  useEffect(() => {
    if (soloSelected) setShowConfigPanel(true);
  }, [soloSelected]);

  // Returns interfaces already used in existing links for a given node+side
  const getUsedInterfaces = (nodeId) => {
    const used = new Set();
    links.forEach(l => {
      if (l.from === nodeId && l.fromIface) used.add(l.fromIface);
      if (l.to === nodeId && l.toIface) used.add(l.toIface);
    });
    return used;
  };

  // Returns available (unused) interfaces for a node
  const getAvailableInterfaces = (node) => {
    if (!node) return [];
    const all = node.interfaces || ["eth0", "eth1"];
    const used = getUsedInterfaces(node.id);
    return all.filter(i => !used.has(i));
  };

  // Adds the next consecutive interface to a node
  const addInterfaceToNode = (nodeId) => {
    setNodes(prev => prev.map(n => {
      if (n.id !== nodeId) return n;
      const existing = n.interfaces || ["eth0", "eth1"];
      const next = `eth${existing.length}`;
      return { ...n, interfaces: [...existing, next] };
    }));
  };

  return (
    <div className="min-h-screen py-6 px-4">
      {/* Selected box editor */}
      {selectedBox && (() => {
        const box = boxes.find(b => b.id === selectedBox);
        if (!box) return null;
        return (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-card border border-border rounded-xl px-4 py-3 shadow-2xl flex items-center gap-4">
            <span className="text-xs font-semibold text-foreground">Section Label:</span>
            <input
              value={box.label}
              onChange={e => setBoxes(prev => prev.map(b => b.id === selectedBox ? { ...b, label: e.target.value } : b))}
              className="bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground w-32 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-xs text-muted-foreground">Color:</span>
            <div className="flex gap-1">
              {BOX_COLORS.map(c => (
                <button key={c} onClick={() => setBoxes(prev => prev.map(b => b.id === selectedBox ? { ...b, color: c } : b))}
                  className={`h-5 w-5 rounded-full border-2 transition-all ${box.color === c ? "border-foreground scale-110" : "border-transparent"}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>
            <button onClick={() => { setBoxes(prev => prev.filter(b => b.id !== selectedBox)); setSelectedBox(null); }}
              className="text-xs text-destructive hover:text-destructive/80 transition-colors ml-1">Delete</button>
            <button onClick={() => setSelectedBox(null)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors">Done</button>
          </div>
        );
      })()}

      {/* Save Design Dialog */}
      <SaveDesignDialog
        open={showSaveDialog}
        onClose={() => setShowSaveDialog(false)}
        onSave={handleSaveAndNavigate}
        loading={saving}
      />

      {/* Interface Picker Modal */}
      {pendingLink && (function () {
        const fromNode = nodes.find(n => n.id === pendingLink.fromId);
        const toNode = nodes.find(n => n.id === pendingLink.toId);
        const fromIfaces = getAvailableInterfaces(fromNode);
        const toIfaces = getAvailableInterfaces(toNode);
        const fromEmpty = fromIfaces.length === 0;
        const toEmpty = toIfaces.length === 0;

        const InterfaceList = ({ ifaces, selected, onSelect, nodeId, isEmpty }) => (
          <div className="space-y-1.5">
            {ifaces.map(iface => (
              <button key={iface} onClick={() => onSelect(iface)}
                className={`w-full text-left px-3 py-1.5 rounded-lg text-xs border font-mono transition-all ${
                  selected === iface ? "bg-primary/10 border-primary/40 text-primary" : "bg-secondary border-border text-foreground hover:border-primary/30"
                }`}>
                {iface}
              </button>
            ))}
            {isEmpty && (
              <button
                onClick={() => addInterfaceToNode(nodeId)}
                className="w-full text-left px-3 py-1.5 rounded-lg text-xs border border-dashed border-primary/40 text-primary bg-primary/5 hover:bg-primary/10 transition-all font-medium">
                + Add interface
              </button>
            )}
          </div>
        );

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card border border-border rounded-2xl p-6 w-80 shadow-2xl space-y-4">
              <p className="text-sm font-semibold text-foreground">Choose Interfaces to Link</p>
              {(fromEmpty || toEmpty) && (
                <p className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                  {fromEmpty && toEmpty ? "Both devices have no free interfaces."
                    : fromEmpty ? `${fromNode?.label} has no free interfaces.`
                    : `${toNode?.label} has no free interfaces.`}
                  {" "}Click "+ Add interface" to add one.
                </p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{fromNode?.label}</p>
                  <InterfaceList
                    ifaces={fromIfaces}
                    selected={pendingLink.fromIface}
                    onSelect={iface => setPendingLink(p => ({ ...p, fromIface: iface }))}
                    nodeId={pendingLink.fromId}
                    isEmpty={fromEmpty}
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{toNode?.label}</p>
                  <InterfaceList
                    ifaces={toIfaces}
                    selected={pendingLink.toIface}
                    onSelect={iface => setPendingLink(p => ({ ...p, toIface: iface }))}
                    nodeId={pendingLink.toId}
                    isEmpty={toEmpty}
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <Button
                  onClick={confirmLink}
                  disabled={!pendingLink.fromIface || !pendingLink.toIface || fromEmpty || toEmpty}
                  className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90 text-xs disabled:opacity-40"
                >Connect</Button>
                <Button variant="outline" onClick={() => setPendingLink(null)} className="text-xs">Cancel</Button>
              </div>
            </div>
          </div>
        );
      }())}

      {/* Page background with glows */}
      <div className="fixed inset-0 -z-50 bg-gradient-to-br from-black via-gray-950 to-red-950/20" />
      <div className="fixed inset-0 pointer-events-none -z-40">
        <div className="absolute top-0 left-1/3 w-[600px] h-[500px] bg-blue-900/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/3 w-[700px] h-[500px] bg-purple-900/8 rounded-full blur-3xl" />
      </div>

      {/* Vendor Picker Modal — new drop */}
       {pendingDrop && (function () {
        const def = DEVICE_TYPES.find(d => d.type === pendingDrop.type);
        const options = VENDOR_OPTIONS[pendingDrop.type] || [];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card border border-border rounded-2xl p-6 w-72 shadow-2xl">
              <p className="text-sm font-semibold text-foreground mb-1">Choose {def.label} Type</p>
              <p className="text-xs text-muted-foreground mb-4">Select the vendor/model for this device</p>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {options.map(opt => (
                  <button key={opt} onClick={() => confirmDrop(opt)}
                    className="w-full text-left px-3 py-2 rounded-lg text-sm text-foreground bg-secondary hover:bg-primary/10 hover:text-primary border border-transparent hover:border-primary/30 transition-all">
                    {opt}
                  </button>
                ))}
              </div>
              <button onClick={() => setPendingDrop(null)} className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            </div>
          </div>
        );
      }())}

      {/* Vendor Picker Modal — edit node */}
      {editingNode && (function () {
        const node = nodes.find(n => n.id === editingNode);
        if (!node) return null;
        const def = DEVICE_TYPES.find(d => d.type === node.type);
        const options = VENDOR_OPTIONS[node.type] || [];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card border border-border rounded-2xl p-6 w-72 shadow-2xl">
              <p className="text-sm font-semibold text-foreground mb-1">Change {def.label} Type</p>
              <p className="text-xs text-muted-foreground mb-4">Current: <strong>{node.vendor || node.label}</strong></p>
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {options.map(opt => (
                  <button key={opt} onClick={() => confirmVendorEdit(opt)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm border transition-all ${node.vendor === opt ? "bg-primary/10 border-primary/40 text-primary" : "text-foreground bg-secondary hover:bg-primary/10 hover:text-primary border-transparent hover:border-primary/30"}`}>
                    {opt}
                  </button>
                ))}
              </div>
              <button onClick={() => setEditingNode(null)} className="mt-3 w-full text-xs text-muted-foreground hover:text-foreground transition-colors">Cancel</button>
            </div>
          </div>
        );
      }())}

      <div className="max-w-5xl mx-auto min-h-screen p-4 relative z-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 text-muted-foreground hover:text-blue-400 transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">Visual Network Designer</h1>
              {autoSaveStatus === 'saving' && (
                <p className="text-[10px] text-muted-foreground animate-pulse">Auto-saving…</p>
              )}
              {autoSaveStatus === 'saved' && (
                <p className="text-[10px] text-green-500">✓ Draft auto-saved</p>
              )}
              <p className="text-xs text-muted-foreground">Drag devices onto the canvas · Shift-click to multi-select</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-secondary border border-border rounded px-1 py-0.5">
              <button onClick={() => { const el = canvasRef.current; const W = el?.clientWidth||860; const H = el?.clientHeight||600; setZoom(z => { const nz = Math.max(0.2, +(z-0.1).toFixed(1)); setPan(p => ({ x: Math.round(W/2-(W/2-p.x)*nz/z), y: Math.round(H/2-(H/2-p.y)*nz/z) })); return nz; }); }} className="p-1 hover:text-primary transition-colors"><ZoomOut className="h-3.5 w-3.5" /></button>
              <span className="text-[10px] font-mono text-muted-foreground w-8 text-center">{Math.round(zoom * 100)}%</span>
              <button onClick={() => { const el = canvasRef.current; const W = el?.clientWidth||860; const H = el?.clientHeight||600; setZoom(z => { const nz = Math.min(2, +(z+0.1).toFixed(1)); setPan(p => ({ x: Math.round(W/2-(W/2-p.x)*nz/z), y: Math.round(H/2-(H/2-p.y)*nz/z) })); return nz; }); }} className="p-1 hover:text-primary transition-colors"><ZoomIn className="h-3.5 w-3.5" /></button>
            </div>
            {nodes.length > 1 && (
              <button onClick={autoAlign} className="text-[10px] font-medium text-primary bg-primary/10 border border-primary/30 px-2 py-1 rounded hover:bg-primary/20 transition-colors">Auto-Align</button>
            )}
            {nodes.length > 0 && (
              <button onClick={() => fitView(nodes)} className="text-[10px] font-medium px-2 py-1 rounded border border-border bg-secondary text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors">Fit View</button>
            )}
            {nodes.length > 1 && (
              <button
                onClick={() => setSelectedIds(nodes.map(n => n.id))}
                className="text-[10px] font-medium px-2 py-1 rounded border border-border bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >Select All</button>
            )}
            <button onClick={undo} disabled={historySize === 0} title="Undo" className="text-[10px] font-medium px-2 py-1 rounded border border-border bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">↩ Undo</button>
            <button onClick={redo} disabled={futureSize === 0} title="Redo" className="text-[10px] font-medium px-2 py-1 rounded border border-border bg-secondary text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors">↪ Redo</button>
            <Button
              onClick={() => setShowAnalysis(true)}
              disabled={nodes.length === 0}
              variant="outline"
              className="gap-2 border-primary/40 text-primary hover:bg-primary/10"
            >
              <Sparkles className="h-4 w-4" /> Smart Analysis
            </Button>
            <Button
              onClick={() => setShowExporter(true)}
              disabled={nodes.length === 0}
              variant="outline"
              className="gap-2"
            >
              <Download className="h-4 w-4" /> Export Report
            </Button>
            <button
              onClick={() => setShowConfigPanel(v => !v)}
              className={`text-[10px] font-medium px-2 py-1 rounded border transition-colors ${
                showConfigPanel ? "bg-primary/10 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              ⚙ Config
            </button>
            {nodes.length > 0 && (
              <button
                onClick={() => { if (window.confirm('Reset canvas? This will clear all devices and links.')) { setNodes([]); setLinks([]); setSelectedIds([]); setLinking(null); historyRef.current = []; futureRef.current = []; setHistorySize(0); setFutureSize(0); } }}
                className="text-xs font-medium px-3 py-1.5 rounded-lg border border-destructive/40 text-destructive hover:bg-destructive/10 transition-colors"
              >
                Reset Canvas
              </button>
            )}
            <Button onClick={handleDone} disabled={nodes.length === 0} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              Done — Build from This Design
            </Button>
          </div>
        </div>

        <div className="flex gap-4 relative" style={{ height: "calc(100vh - 180px)", minHeight: 520 }}>
          {/* Palette */}
           <div className="w-36 shrink-0 bg-card/70 border border-blue-400/20 rounded-xl p-3 overflow-y-auto flex flex-col gap-1 backdrop-blur-sm shadow-lg hover:border-blue-400/40 transition-colors">
            {[{ label: "Network", items: NETWORK_DEVICES }, { label: "Endpoints", items: ENDPOINT_DEVICES }, { label: "OT / ICS", items: OT_DEVICES }, { label: "WAN", items: WAN_DEVICES }].map(group => (
              <div key={group.label} className="pt-1">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{group.label}</p>
                <div className="space-y-1">
                  {group.items.map(d => (
                    <div key={d.type} draggable onDragStart={e => handleDragStart(d.type, e)}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-secondary hover:border-primary/50 hover:bg-primary/5 cursor-grab active:cursor-grabbing transition-all text-xs font-medium text-foreground select-none">
                      <d.Icon className="h-3.5 w-3.5 shrink-0" style={{ color: d.color }} />
                      {d.label}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            <div className="pt-3 border-t border-border space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Tools</p>
              <button onClick={() => { setSectionMode(v => !v); setSelectedIds([]); }}
                className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                  sectionMode ? "bg-primary/10 border-primary/40 text-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"
                }`}>
                ⬜ {sectionMode ? "Drawing…" : "Add Section"}
              </button>
              <button onClick={deleteSelected} disabled={selectedIds.length === 0}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-secondary text-xs font-medium text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-all disabled:opacity-40">
                <Trash2 className="h-3.5 w-3.5" /> Delete{selectedIds.length > 1 ? ` (${selectedIds.length})` : ""}
              </button>
              <button onClick={() => { if (window.confirm('Reset canvas?')) { setNodes([]); setLinks([]); setSelectedIds([]); setLinking(null); historyRef.current = []; futureRef.current = []; setHistorySize(0); setFutureSize(0); } }} disabled={nodes.length === 0}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-secondary text-xs font-medium text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-all disabled:opacity-40">
                <Trash2 className="h-3.5 w-3.5" /> Reset All
              </button>
            </div>
          </div>

          {/* Canvas */}
           <div
             ref={canvasRef}
             className="flex-1 relative bg-card/70 border-2 border-dashed border-cyan-400/20 rounded-xl overflow-hidden shadow-lg backdrop-blur-sm hover:border-cyan-400/40 transition-colors"
            style={{
              cursor: sectionMode || selectionBox || boxDrawing ? "crosshair" : "default",
              backgroundImage: `radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)`,
              backgroundSize: `${GRID * zoom}px ${GRID * zoom}px`,
            }}
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseDown={handleCanvasMouseDown}
          >
            {nodes.length === 0 && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="text-center">
                  <p className="text-3xl mb-2">🖧</p>
                  <p className="text-sm text-muted-foreground font-medium">Drag devices here to start</p>
                  <p className="text-xs text-muted-foreground mt-1">Use the link button to connect devices</p>
                </div>
              </div>
            )}

            {/* Scaled inner canvas */}
            <div style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: "0 0", position: "absolute", top: 0, left: 0, width: "100%", height: "100%", overflow: "visible" }}>
              {/* SVG links */}
              <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 0, pointerEvents: "none" }}>
                {/* Section Boxes */}
                {boxes.map(box => (
                  <g key={box.id} style={{ pointerEvents: "all", cursor: "pointer" }}
                    onMouseDown={e => e.stopPropagation()}
                    onClick={e => { e.stopPropagation(); setSelectedBox(box.id === selectedBox ? null : box.id); setSectionMode(false); }}>
                    <rect x={box.x} y={box.y} width={box.w} height={box.h}
                      fill={box.color + "18"} stroke={box.color} strokeWidth={2} strokeDasharray="6 3" rx={8} />
                    <rect x={box.x + 10} y={box.y - 10} width={box.label.length * 7 + 12} height={20} rx={4} fill={box.color} />
                    <text x={box.x + 16} y={box.y + 5} fontSize={11} fill="white" fontWeight="600" style={{ pointerEvents: "none" }}>{box.label}</text>
                  </g>
                ))}
                {/* Active box drawing preview */}
                {boxDrawing && (() => {
                  const bx = Math.min(boxDrawing.startX, boxDrawing.currentX);
                  const by = Math.min(boxDrawing.startY, boxDrawing.currentY);
                  const bw = Math.abs(boxDrawing.currentX - boxDrawing.startX);
                  const bh = Math.abs(boxDrawing.currentY - boxDrawing.startY);
                  return <rect x={bx} y={by} width={bw} height={bh} fill="rgba(59,130,246,0.08)" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" rx={6} />;
                })()}
                {links.map(link => {
                  const from = getNodeCenter(link.from);
                  const to = getNodeCenter(link.to);
                  if (!from || !to) return null;
                  const fromNode = nodes.find(n => n.id === link.from);
                  const toNode = nodes.find(n => n.id === link.to);
                  const isWan = link.wan || WAN_TYPES.has(fromNode?.type) || WAN_TYPES.has(toNode?.type);
                  const mx = (from.x + to.x) / 2;
                  const my = (from.y + to.y) / 2;
                  const dx = to.x - from.x;
                  const dy = to.y - from.y;
                  const d = `M ${from.x} ${from.y} C ${from.x + dx * 0.25} ${from.y + dy * 0.1}, ${from.x + dx * 0.75} ${from.y + dy * 0.9}, ${to.x} ${to.y}`;
                  return (
                    <g key={link.id}>
                      {isWan ? (
                        <>
                          <path d={d} stroke="#f59e0b" strokeWidth={2.5} fill="none" strokeDasharray="8 4" strokeLinecap="round" opacity={0.9} />
                          <path d={d} stroke="#f59e0b" strokeWidth={8} fill="none" opacity={0.08} strokeLinecap="round" />
                          <text x={mx} y={my - 8} textAnchor="middle" fontSize={13} style={{ pointerEvents: "none" }}>⚡</text>
                        </>
                      ) : (
                        <>
                          <path d={d} stroke="#3b82f6" strokeWidth={6} fill="none" opacity={0.12} strokeLinecap="round" />
                          <path d={d} stroke="#64748b" strokeWidth={2} fill="none" strokeDasharray="6 3" strokeLinecap="round" opacity={0.7} />
                          {link.fromIface && (
                            <text x={from.x + (mx - from.x) * 0.25} y={from.y + (my - from.y) * 0.25 - 6} fontSize={9} fill="hsl(var(--muted-foreground))" textAnchor="middle">{link.fromIface}</text>
                          )}
                          {link.toIface && (
                            <text x={to.x + (mx - to.x) * 0.25} y={to.y + (my - to.y) * 0.25 - 6} fontSize={9} fill="hsl(var(--muted-foreground))" textAnchor="middle">{link.toIface}</text>
                          )}
                        </>
                      )}
                      <circle cx={mx} cy={my + (isWan ? 6 : 0)} r={7} fill="hsl(var(--destructive))" opacity={0.85} style={{ cursor: "pointer", pointerEvents: "all" }} onClick={() => deleteLink(link.id)} />
                      <line x1={mx - 3} y1={my + (isWan ? 6 : 0)} x2={mx + 3} y2={my + (isWan ? 6 : 0)} stroke="white" strokeWidth={1.5} style={{ pointerEvents: "none" }} />
                    </g>
                  );
                })}
                {selBox && selBox.w > 5 && (
                  <rect x={selBox.x} y={selBox.y} width={selBox.w} height={selBox.h}
                    fill="rgba(59,130,246,0.08)" stroke="#3b82f6" strokeWidth={1.5} strokeDasharray="5 3" rx={4} />
                )}
              </svg>

              {/* Nodes */}
              {nodes.map(node => {
                const isSelected = selectedIds.includes(node.id);
                return (
                  <div key={node.id}
                    data-node="true"
                    onMouseDown={e => handleNodeMouseDown(e, node.id)}
                    onClick={e => handleNodeClick(e, node.id)}
                    className="absolute flex flex-col items-center gap-1 cursor-pointer select-none"
                    style={{ left: node.x, top: node.y, zIndex: 10 }}>
                    {soloSelected === node.id && (
                      <button onMouseDown={e => e.stopPropagation()} onClick={e => copyNode(e, node)}
                        className="absolute -top-3 left-1/2 -translate-x-1/2 h-5 w-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shadow hover:bg-primary/80 transition-colors z-10"
                        title="Copy device">+</button>
                    )}
                    {soloSelected === node.id && (
                      <button onMouseDown={e => e.stopPropagation()} onClick={e => { e.stopPropagation(); setLinking(node.id); }}
                        className="absolute top-1/2 -translate-y-1/2 -right-6 h-5 w-5 rounded-full bg-blue-500 text-white flex items-center justify-center shadow hover:bg-blue-400 transition-colors z-10"
                        title="Link to another device">
                        <LinkIcon className="h-3 w-3" />
                      </button>
                    )}
                    <div className={`h-14 w-14 rounded-xl flex items-center justify-center border-2 transition-all ${isSelected ? "shadow-lg scale-110" : "hover:scale-105"} ${linking === node.id ? "ring-2 ring-blue-400" : ""}`}
                      style={{
                        borderColor: isSelected ? node.color : "hsl(var(--border))",
                        backgroundColor: isSelected ? `${node.color}22` : "hsl(var(--secondary))",
                        outline: selectedIds.length > 1 && isSelected ? `2px dashed ${node.color}` : "none",
                        outlineOffset: "3px",
                      }}>
                      {node.Icon && <node.Icon className="h-7 w-7" style={{ color: node.color }} />}
                    </div>
                    {editingLabel === node.id ? (
                      <input
                        autoFocus
                        className="text-[10px] text-foreground font-medium bg-card border border-primary px-1.5 py-0.5 rounded w-20 text-center focus:outline-none"
                        value={node.label}
                        onMouseDown={e => e.stopPropagation()}
                        onClick={e => e.stopPropagation()}
                        onChange={e => setNodes(prev => prev.map(n => n.id === node.id ? { ...n, label: e.target.value } : n))}
                        onBlur={() => setEditingLabel(null)}
                        onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingLabel(null); }}
                      />
                    ) : (
                      <span
                        className="text-[10px] text-foreground font-medium bg-card border border-border px-1.5 py-0.5 rounded whitespace-nowrap max-w-[80px] truncate cursor-text hover:border-primary/50 transition-colors"
                        onDoubleClick={e => { e.stopPropagation(); setEditingLabel(node.id); }}
                        title="Double-click to rename"
                      >
                        {node.label}
                      </span>
                    )}
                  </div>
                );
              })}

              {linking && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-primary/90 text-primary-foreground text-xs font-semibold px-4 py-2 rounded-full shadow-lg pointer-events-none">
                  Click a device to connect — or click canvas to cancel
                </div>
              )}

              {selectedIds.length > 1 && !linking && (
                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-secondary border border-border text-foreground text-xs font-medium px-4 py-2 rounded-full shadow pointer-events-none">
                  {selectedIds.length} devices selected — drag any to move all
                </div>
              )}
            </div>
          </div>

          {/* Right config panel — floating overlay so it never hides the canvas */}
          {nodes.length > 0 && showConfigPanel && (
            <div className="absolute top-2 right-2 z-30 overflow-y-auto shadow-2xl rounded-xl" style={{ maxHeight: "calc(100% - 16px)", maxWidth: 270 }}>
              <CanvasConfigPanel
                nodes={nodes}
                globalConfig={globalConfig}
                onGlobalChange={handleGlobalConfigChange}
                selectedNode={soloSelected ? nodes.find(n => n.id === soloSelected) : null}
                onNodeConfigChange={handleNodeConfigChange}
                onCollapse={() => setShowConfigPanel(false)}
              />
            </div>
          )}
        </div>

        {/* Export Report Modal */}
        {showExporter && (
          <DiagramExporter
            design={(() => {
              const base = { ...extractFormData(nodes, links) };
              return {
                ...base,
                routing_protocol: globalConfig.routing_protocol || base.routing_protocol,
                wan_technology: globalConfig.wan_technology || base.wan_technology,
                ip_scheme: globalConfig.lan_scheme || base.ip_scheme,
                domain_name: globalConfig.domain_name || "",
                ntp_server: globalConfig.ntp_server || "",
                firewall_vendor: base.firewall_vendor,
              };
            })()}
            nodes={nodes}
            links={links}
            onClose={() => setShowExporter(false)}
          />
        )}

        {/* Smart Analysis Panel */}
        {showAnalysis && (
          <SmartAnalysisPanel
            nodes={nodes}
            links={links}
            globalConfig={globalConfig}
            onClose={() => setShowAnalysis(false)}
            onImplement={(topoData) => {
              if (!topoData?.add_devices) return;
              let counter = nodes.length;
              const COLORS = { router: "#3b82f6", switch: "#8b5cf6", firewall: "#ef4444", server: "#10b981", wireless: "#f59e0b", workstation: "#64748b", loadbalancer: "#0ea5e9", cloud: "#6366f1", internet: "#06b6d4" };
              const ICONS = { router: Router, switch: Network, firewall: Shield, server: Server, wireless: Wifi, workstation: Monitor, loadbalancer: Scale, cloud: Cloud, internet: Globe };
              const newNodes = [];
              const newLinks = [];
              topoData.add_devices.forEach((dev) => {
                counter++;
                const id = `node-smart-${counter}`;
                const Icon = ICONS[dev.type] || Network;
                const color = COLORS[dev.type] || "#64748b";
                newNodes.push({ id, type: dev.type, label: dev.label || dev.type, x: 80 + (counter % 5) * 120, y: 80 + Math.floor(counter / 5) * 120, Icon, color, vendor: dev.label });
                const connectTarget = nodes.find(n => n.type === dev.connect_to_type);
                if (connectTarget) {
                  newLinks.push({ id: `link-smart-${counter}`, from: connectTarget.id, to: id });
                }
              });
              setNodes(prev => [...prev, ...newNodes]);
              setLinks(prev => [...prev, ...newLinks]);
              setShowAnalysis(false);
            }}
          />
        )}

        {nodes.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2 items-center">
            <p className="text-xs text-muted-foreground">Detected:</p>
            {Object.entries(nodes.reduce((acc, n) => { acc[n.type] = (acc[n.type] || 0) + 1; return acc; }, {})).map(([type, count]) => {
              const def = DEVICE_TYPES.find(d => d.type === type);
              return (
                <span key={type} className="text-[10px] px-2 py-0.5 rounded-full bg-secondary border border-border text-foreground flex items-center gap-1">
                  {def?.Icon && <def.Icon className="h-3 w-3" style={{ color: def.color }} />}
                  {count}× {def?.label}
                </span>
              );
            })}
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary border border-border text-foreground">🔗 {links.length} link{links.length !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>
    </div>
  );
}