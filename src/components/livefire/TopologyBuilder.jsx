import React, { useState, useRef, useEffect, useCallback } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Server, Router, Shield, Monitor, HardDrive, Wifi, Cloud,
  Container, Zap, GitBranch, Trash2, Plus, Move, Maximize2,
  Minimize2, Eye, Copy, Layers, Network, Globe, Lock, Cpu,
  DollarSign, X, Check, AlertTriangle, Settings, ShieldAlert,
  Link2, Unlink, Database, Terminal, Key, MonitorPlay, ExternalLink, RefreshCw
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { getCostTier, COST_TIERS, checkLabDevices } from "@/lib/instanceTiers";
import ImageCatalog from "@/components/livefire/ImageCatalog";

const DEVICE_PALETTE = [
  { type: "router", label: "Router", icon: Router, color: "blue" },
  { type: "switch", label: "Switch", icon: GitBranch, color: "cyan" },
  { type: "firewall", label: "Firewall", icon: Shield, color: "red" },
  { type: "server", label: "Server", icon: Server, color: "green" },
  { type: "workstation", label: "Workstation", icon: Monitor, color: "yellow" },
  { type: "cloud_resource", label: "Cloud", icon: Cloud, color: "purple" },
  { type: "container", label: "Container", icon: Container, color: "orange" },
  { type: "load_balancer", label: "Load Balancer", icon: Layers, color: "teal" },
  { type: "monitoring", label: "Monitor", icon: Eye, color: "gray" },
];

const TYPE_COLORS = {
  router: "border-blue-500 bg-blue-900/20",
  switch: "border-cyan-500 bg-cyan-900/20",
  firewall: "border-red-500 bg-red-900/20",
  server: "border-green-500 bg-green-900/20",
  workstation: "border-yellow-500 bg-yellow-900/20",
  cloud_resource: "border-purple-500 bg-purple-900/20",
  container: "border-orange-500 bg-orange-900/20",
  security_appliance: "border-pink-500 bg-pink-900/20",
  load_balancer: "border-teal-500 bg-teal-900/20",
  monitoring: "border-gray-500 bg-gray-900/20",
};

const TYPE_ICON_COLORS = {
  router: "text-blue-400",
  switch: "text-cyan-400",
  firewall: "text-red-400",
  server: "text-green-400",
  workstation: "text-yellow-400",
  cloud_resource: "text-purple-400",
  container: "text-orange-400",
  load_balancer: "text-teal-400",
  monitoring: "text-gray-400",
};

const DEVICE_PRICING = {
  router: 0.18, switch: 0.14, firewall: 0.22, server: 0.15,
  workstation: 0.12, cloud_resource: 0.20, container: 0.10,
  security_appliance: 0.25, load_balancer: 0.16, monitoring: 0.12,
};

export default function TopologyBuilder({ topology, onChange, cloudProvider = "aws", isAdmin = false, isLabApproved = false, region = "us-west-2" }) {
  const devices = topology?.devices || [];
  const vpcConfig = topology?.vpcConfig || {
    cidr: "10.0.0.0/16",
    subnets: [{ name: "public", cidr: "10.0.1.0/24", zone: `${region}a` }, { name: "private", cidr: "10.0.2.0/24", zone: `${region}b` }],
    securityGroups: [{ name: "lab-sg", description: "Default lab security group", rules: [
      { protocol: "tcp", port: 22, source: "0.0.0.0/0", desc: "SSH" },
      { protocol: "tcp", port: 443, source: "0.0.0.0/0", desc: "HTTPS" },
    ]}],
    enableInternetGateway: true,
  };

  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [connectingFrom, setConnectingFrom] = useState(null);  // device ID or null
  const [connectLinePos, setConnectLinePos] = useState(null);
  const [rightPanel, setRightPanel] = useState(null);
  const [cidrSuggestion, setCidrSuggestion] = useState(null);
  const [cidrConflict, setCidrConflict] = useState(null);
  const [suggestingCidr, setSuggestingCidr] = useState(false);
  const [confirmDeleteDevice, setConfirmDeleteDevice] = useState(null);
  const [confirmClearCanvas, setConfirmClearCanvas] = useState(false);
  const [imageCatalogOpen, setImageCatalogOpen] = useState(false);
  const [catalogForDeviceId, setCatalogForDeviceId] = useState(null);
  const [manualImageId, setManualImageId] = useState("");
  const [existingVpcs, setExistingVpcs] = useState([]);
  const [selectedExistingVpc, setSelectedExistingVpc] = useState(null);
  const [vpcSubnetOptions, setVpcSubnetOptions] = useState(null);
  const [loadingVpcs, setLoadingVpcs] = useState(false);
  const [loadingSubnets, setLoadingSubnets] = useState(false);
  const canvasRef = useRef(null);

  const checkCidrConflict = async (cidr) => {
    if (!cidr) return;
    try {
      const res = await base44.functions.invoke("cloudProviderAWS", {
        action: "suggestCidr",
        params: { proposed_cidr: cidr, region },
      });
      const data = res.data;
      if (data?.check?.conflict) {
        setCidrConflict({ conflict: true, existingVpcs: data.existing_vpcs || [], suggested: data.suggested_cidr });
      } else {
        setCidrConflict({ conflict: false });
      }
    } catch { /* ignore */ }
  };

  const fetchCidrSuggestion = async () => {
    setSuggestingCidr(true);
    try {
      const res = await base44.functions.invoke("cloudProviderAWS", {
        action: "suggestCidr",
        params: { region },
      });
      const data = res.data;
      setCidrSuggestion(data);
      if (data?.suggested_cidr) {
        updateVpcConfig({ cidr: data.suggested_cidr });
        setCidrConflict(null);
      }
    } catch { /* ignore */ }
    setSuggestingCidr(false);
  };

  const fetchExistingVpcs = async () => {
    setLoadingVpcs(true);
    try {
      const res = await base44.functions.invoke("cloudProviderAWS", {
        action: "listAllVpcs",
        params: { region },
      });
      setExistingVpcs(res.data?.vpcs || []);
    } catch { /* ignore */ }
    setLoadingVpcs(false);
  };

  const selectExistingVpc = async (vpcId) => {
    setSelectedExistingVpc(vpcId);
    if (!vpcId) { setVpcSubnetOptions(null); return; }

    const vpc = existingVpcs.find(v => v.vpcId === vpcId);
    if (!vpc) return;

    // Update VPC config with existing VPC's CIDR
    updateVpcConfig({ cidr: vpc.cidrBlock, existingVpcId: vpcId });

    // Load subnet options
    setLoadingSubnets(true);
    try {
      const res = await base44.functions.invoke("cloudProviderAWS", {
        action: "suggestSubnets",
        params: { vpc_id: vpcId, vpc_cidr: vpc.cidrBlock, region },
      });
      setVpcSubnetOptions(res.data);
    } catch { /* ignore */ }
    setLoadingSubnets(false);
  };

  const applySubnetFromVpc = (subnetCidr) => {
    if (!subnetCidr || vpcSubnetOptions?.subnets?.find(s => s.cidr === subnetCidr)?.isTaken) return;

    const zone = region + "a";
    const existing = vpcConfig.subnets.find(s => s.cidr === subnetCidr);
    if (existing) {
      // Remove it (toggle)
      updateVpcConfig({ subnets: vpcConfig.subnets.filter(s => s.cidr !== subnetCidr) });
    } else {
      // Add it
      updateVpcConfig({
        subnets: [...vpcConfig.subnets, { name: `subnet-${subnetCidr.split("/")[0].split(".").slice(-2).join("-")}`, cidr: subnetCidr, zone }],
      });
    }
  };

  useEffect(() => {
    if (vpcConfig?.cidr) {
      const timer = setTimeout(() => checkCidrConflict(vpcConfig.cidr), 600);
      return () => clearTimeout(timer);
    }
  }, [vpcConfig?.cidr, region]);

  const { data: dbImages = [] } = useQuery({
    queryKey: ["livefire-images", cloudProvider],
    queryFn: () => base44.entities.LiveFireImage.filter({ status: "available" }, "vendor", 100),
  });

  const addDevice = (deviceType) => {
    const paletteItem = DEVICE_PALETTE.find(d => d.type === deviceType);
    const newDevice = {
      id: `dev_${Date.now()}`,
      type: deviceType,
      name: `${paletteItem?.label || deviceType}_${devices.length + 1}`,
      position_x: 200 + (devices.length % 4) * 160,
      position_y: 130 + Math.floor(devices.length / 4) * 170,
      connections: [],
      cpu_cores: 2,
      ram_mb: 4096,
      storage_gb: 20,
      status: "pending",
      ami_image_id: null,
      cost_per_hour: DEVICE_PRICING[deviceType] || 0.15,
      subnet: "public",
    };
    onChange({ ...topology, devices: [...devices, newDevice] });
    setSelectedDevice(newDevice.id);
    setRightPanel("properties");
  };

  const removeDevice = (deviceId) => {
    const updated = devices.filter(d => d.id !== deviceId).map(d => ({
      ...d,
      connections: d.connections?.filter(c => c.target_device_id !== deviceId) || [],
    }));
    onChange({ ...topology, devices: updated });
    if (selectedDevice === deviceId) { setSelectedDevice(null); setRightPanel(null); }
    if (connectingFrom === deviceId) setConnectingFrom(null);
  };

  const updateDevice = (deviceId, updates) => {
    const updated = devices.map(d => d.id === deviceId ? { ...d, ...updates } : d);
    onChange({ ...topology, devices: updated });
  };

  const updateVpcConfig = (updates) => {
    onChange({ ...topology, vpcConfig: { ...vpcConfig, ...updates } });
  };

  const updateSubnet = (idx, updates) => {
    const subnets = [...vpcConfig.subnets];
    subnets[idx] = { ...subnets[idx], ...updates };
    updateVpcConfig({ subnets });
  };

  const addSubnet = () => {
    const subnets = [...vpcConfig.subnets, { name: `subnet-${vpcConfig.subnets.length + 1}`, cidr: `10.0.${vpcConfig.subnets.length + 3}.0/24`, zone: `${region}a` }];
    updateVpcConfig({ subnets });
  };

  const removeSubnet = (idx) => {
    const subnets = vpcConfig.subnets.filter((_, i) => i !== idx);
    updateVpcConfig({ subnets });
  };

  // --- Connection logic (EVE-NG style) ---
  const createConnection = (fromId, toId) => {
    if (fromId === toId) return;
    const fromDevice = devices.find(d => d.id === fromId);
    const toDevice = devices.find(d => d.id === toId);
    if (!fromDevice || !toDevice) return;

    const alreadyExists = fromDevice.connections?.some(c => c.target_device_id === toId);
    if (alreadyExists) return;

    const fromCount = (fromDevice.connections?.length || 0);
    const toCount = (toDevice.connections?.length || 0);

    updateDevice(fromId, {
      connections: [...(fromDevice.connections || []), {
        target_device_id: toId,
        source_interface: `eth${fromCount}`,
        target_interface: `eth${toCount}`,
        connection_type: "ethernet",
        bandwidth_mbps: 1000
      }]
    });
    updateDevice(toId, {
      connections: [...(toDevice.connections || []), {
        target_device_id: fromId,
        source_interface: `eth${toCount}`,
        target_interface: `eth${fromCount}`,
        connection_type: "ethernet",
        bandwidth_mbps: 1000
      }]
    });
  };

  const startConnection = (deviceId, e) => {
    e.stopPropagation();
    setConnectingFrom(deviceId);
  };

  const finishConnection = (targetId, e) => {
    e.stopPropagation();
    if (connectingFrom && connectingFrom !== targetId) {
      createConnection(connectingFrom, targetId);
    }
    setConnectingFrom(null);
    setConnectLinePos(null);
  };

  const cancelConnection = (e) => {
    if (e) e.stopPropagation();
    setConnectingFrom(null);
    setConnectLinePos(null);
  };

  const removeConnection = (deviceId, targetId, e) => {
    e.stopPropagation();
    const fromDevice = devices.find(d => d.id === deviceId);
    const toDevice = devices.find(d => d.id === targetId);
    if (fromDevice) {
      updateDevice(deviceId, {
        connections: (fromDevice.connections || []).filter(c => c.target_device_id !== targetId)
      });
    }
    if (toDevice) {
      updateDevice(targetId, {
        connections: (toDevice.connections || []).filter(c => c.target_device_id !== deviceId)
      });
    }
  };

  // --- Drag & Drop ---
  const onDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination } = result;
    if (source.droppableId === "palette" && destination.droppableId === "canvas") {
      addDevice(result.draggableId.replace("palette-", ""));
      return;
    }
    if (source.droppableId === "canvas" && destination.droppableId === "canvas") {
      const deviceId = result.draggableId.replace("device-", "");
      const device = devices.find(d => d.id === deviceId);
      if (device) {
        const dx = (destination.index - source.index) * 40 + (Math.random() - 0.5) * 60;
        const dy = (destination.index - source.index) * 20 + (Math.random() - 0.5) * 40;
        updateDevice(deviceId, {
          position_x: Math.max(0, (device.position_x || 200) + dx),
          position_y: Math.max(0, (device.position_y || 150) + dy),
        });
      }
    }
  };

  // --- Canvas panning ---
  const handleCanvasMouseDown = (e) => {
    if (connectingFrom) {
      // Clicking empty canvas in connect mode cancels
      const isCanvas = e.target === canvasRef.current || e.target.classList.contains("canvas-bg") || e.target.tagName === "svg";
      if (isCanvas) {
        cancelConnection();
        return;
      }
    }
    const isCanvas = e.target === canvasRef.current || e.target.classList.contains("canvas-bg") || e.target.tagName === "svg";
    if (isCanvas && !connectingFrom) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
    if (connectingFrom) {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (rect) {
        setConnectLinePos({
          x: (e.clientX - rect.left - pan.x) / scale,
          y: (e.clientY - rect.top - pan.y) / scale,
        });
      }
    }
  };

  const handleCanvasMouseUp = () => { setIsPanning(false); };

  const selectDevice = (deviceId, e) => {
    if (e) e.stopPropagation();
    if (connectingFrom) {
      finishConnection(deviceId, e);
      return;
    }
    if (selectedDevice === deviceId) {
      setSelectedDevice(null);
      setRightPanel(null);
    } else {
      setSelectedDevice(deviceId);
      setRightPanel("properties");
    }
  };

  // --- Rendering ---
  const renderConnections = () => {
    const lines = [];
    const drawn = new Set();
    devices.forEach(device => {
      (device.connections || []).forEach(conn => {
        const pairKey = [device.id, conn.target_device_id].sort().join("-");
        if (drawn.has(pairKey)) return;
        drawn.add(pairKey);
        const target = devices.find(d => d.id === conn.target_device_id);
        if (!target) return;
        const sx = (device.position_x || 0) + 65;
        const sy = (device.position_y || 0) + 32;
        const ex = (target.position_x || 0) + 65;
        const ey = (target.position_y || 0) + 32;
        const midX = (sx + ex) / 2;
        lines.push(
          <g key={pairKey}>
            {/* Clickable wider hit area */}
            <line x1={sx} y1={sy} x2={ex} y2={ey}
              stroke="transparent" strokeWidth={14} className="cursor-pointer"
              onClick={(e) => removeConnection(device.id, conn.target_device_id, e)} />
            {/* Visible line */}
            <line x1={sx} y1={sy} x2={ex} y2={ey}
              stroke="#4B5563" strokeWidth={2.5} opacity={0.7} />
            {/* Delete X on hover */}
            <g className="opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
              onClick={(e) => removeConnection(device.id, conn.target_device_id, e)}>
              <circle cx={midX} cy={(sy + ey) / 2} r={8} fill="#1f2937" stroke="#ef4444" strokeWidth={1} />
              <text x={midX} y={(sy + ey) / 2 + 3} textAnchor="middle" fill="#ef4444" fontSize={10} fontWeight="bold">×</text>
            </g>
          </g>
        );
      });
    });
    return lines;
  };

  const selectedDeviceData = selectedDevice ? devices.find(d => d.id === selectedDevice) : null;
  const totalCost = devices.reduce((sum, d) => sum + (d.cost_per_hour || DEVICE_PRICING[d.type] || 0.15), 0);
  const tierCheck = checkLabDevices(devices, isAdmin, isLabApproved);
  const hasViolations = tierCheck.hasViolations;

  const isConnectedTo = (deviceId) => {
    if (!connectingFrom) return false;
    const fromDevice = devices.find(d => d.id === connectingFrom);
    return fromDevice?.connections?.some(c => c.target_device_id === deviceId);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex h-[580px]">
        {/* Left: Device Palette */}
        <div className="w-52 shrink-0 border-r border-red-900/20 bg-gradient-to-b from-black/40 to-black/20 flex flex-col">
          <div className="p-3 border-b border-red-900/20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-3.5 w-3.5 text-red-400" />
              <p className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">Devices</p>
            </div>
            <span className="text-[9px] font-mono text-gray-600 bg-gray-800 px-1.5 py-0.5 rounded">{devices.length}</span>
          </div>
          <Droppable droppableId="palette" isDropDisabled={true}>
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 overflow-y-auto p-2 space-y-1">
                {DEVICE_PALETTE.map((dev, idx) => (
                  <Draggable key={dev.type} draggableId={`palette-${dev.type}`} index={idx}>
                    {(provided, snapshot) => (
                      <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                        onClick={() => addDevice(dev.type)}
                        className={`flex items-center gap-2.5 p-2.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
                          snapshot.isDragging ? "bg-red-900/40 border-red-500 shadow-lg" : "bg-gray-800/60 border-gray-700 hover:border-red-700/40 hover:bg-gray-800/80"
                        }`}>
                        <dev.icon className={`h-4 w-4 ${TYPE_ICON_COLORS[dev.type] || "text-gray-400"}`} />
                        <span className="text-[11px] font-mono text-gray-300">{dev.label}</span>
                        <span className="text-[9px] font-mono text-gray-600 ml-auto">${DEVICE_PRICING[dev.type]}/hr</span>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
          <div className="border-t border-red-900/20 p-3 bg-black/30">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-mono text-gray-500">Est. Cost</span>
              <span className="font-mono text-green-400 font-bold">${totalCost.toFixed(2)}/hr</span>
            </div>
            {devices.length > 0 && !isAdmin && (
              <div className={`mt-2 text-[9px] font-mono px-2 py-1 rounded-md border ${
                hasViolations ? "bg-red-950/30 border-red-800/40 text-red-400" : "bg-green-950/30 border-green-800/40 text-green-400"
              }`}>
                {hasViolations ? (
                  <span className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Admin approval required</span>
                ) : (
                  <span className="flex items-center gap-1"><Check className="h-3 w-3" /> Within cost limits</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 flex flex-col">
          {hasViolations && !isAdmin && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-red-950/40 border-b border-red-800/50 text-red-300">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              <div className="flex-1">
                <p className="text-[11px] font-mono font-bold">{tierCheck.violations.length} device{tierCheck.violations.length > 1 ? "s" : ""} exceed{ tierCheck.violations.length === 1 ? "s" : ""} cost limits</p>
                <p className="text-[9px] text-red-400/70">Reduce vCPU/RAM or request admin approval to deploy</p>
              </div>
              <div className="flex items-center gap-1.5">
                {tierCheck.violations.map(v => (
                  <button key={v.deviceId}
                    onClick={() => { setSelectedDevice(v.deviceId); setRightPanel("properties"); }}
                    className="text-[9px] font-mono bg-red-900/40 border border-red-700/50 text-red-300 px-2 py-1 rounded hover:bg-red-800/40 transition-colors">
                    {v.deviceName}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Canvas Toolbar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-red-900/20 bg-black/20 shrink-0">
            <button onClick={() => setScale(s => Math.max(0.25, s - 0.25))} className="p-1.5 rounded bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors"><Minimize2 className="h-3.5 w-3.5" /></button>
            <span className="text-[10px] font-mono text-gray-500 w-10 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(2, s + 0.25))} className="p-1.5 rounded bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors"><Maximize2 className="h-3.5 w-3.5" /></button>
            <div className="h-4 w-px bg-gray-700 mx-1" />
            {connectingFrom ? (
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <Zap className="h-3 w-3 text-yellow-400 animate-pulse" />
                <span className="text-yellow-400 font-bold">Connecting...</span>
                <span className="text-gray-500">Click the target device</span>
                <button onClick={cancelConnection}
                  className="text-red-400 hover:text-red-300 underline ml-2">Cancel</button>
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-gray-500">
                <span>{connectingFrom ? "Click target device" : selectedDevice ? "Click another device to connect, or use button below" : "Click a device to select it"}</span>
              </div>
            )}
            <button onClick={() => setRightPanel(rightPanel === "network" ? null : "network")}
              className={`ml-auto text-[10px] font-mono px-2.5 py-1 rounded border transition-colors ${
                rightPanel === "network" ? "bg-blue-900/30 border-blue-600/60 text-blue-400" : "bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300"
              }`}>
              <Network className="h-3 w-3 inline mr-1" />VPC
            </button>
            <button onClick={() => setConfirmClearCanvas(true)}
              className="text-[10px] font-mono px-2 py-1 rounded border border-gray-700 text-gray-500 hover:text-red-400 transition-colors">Clear</button>
          </div>

          <Droppable droppableId="canvas" type="DEVICE">
            {(provided, snapshot) => (
              <div ref={(el) => { canvasRef.current = el; provided.innerRef(el); }} {...provided.droppableProps}
                className={`canvas-bg flex-1 relative overflow-hidden ${snapshot.isDraggingOver ? "bg-red-950/10" : "bg-[radial-gradient(circle,#1f2937_1px,transparent_1px)] bg-[size:20px_20px]"}`}
                onMouseDown={handleCanvasMouseDown} onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp} onMouseLeave={handleCanvasMouseUp}
                style={{ cursor: isPanning ? "grabbing" : connectingFrom ? "crosshair" : "default" }}>
                <svg className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%" }}>
                  <g transform={`translate(${pan.x},${pan.y}) scale(${scale})`}>
                    {renderConnections()}
                    {/* Rubber-band preview line */}
                    {connectingFrom && connectLinePos && (() => {
                      const from = devices.find(d => d.id === connectingFrom);
                      if (!from) return null;
                      return (
                        <line x1={(from.position_x || 0) + 65} y1={(from.position_y || 0) + 32}
                          x2={connectLinePos.x} y2={connectLinePos.y}
                          stroke="#fbbf24" strokeWidth={2.5} strokeDasharray="8,4" opacity={0.8}
                          className="drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]" />
                      );
                    })()}
                  </g>
                </svg>
                <div style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${scale})`, transformOrigin: "0 0" }} className="absolute inset-0">
                  {devices.map((device, idx) => {
                    const paletteItem = DEVICE_PALETTE.find(d => d.type === device.type);
                    const DevIcon = paletteItem?.icon || Server;
                    const isSelected = selectedDevice === device.id;
                    const isConnectingSource = connectingFrom === device.id;
                    const isConnectingTarget = connectingFrom && connectingFrom !== device.id;
                    const alreadyLinked = connectingFrom && isConnectedTo(device.id);
                    const connCount = device.connections?.length || 0;
                    const borderColor = isConnectingSource ? "border-yellow-400 ring-2 ring-yellow-400/50" :
                                        isConnectingTarget ? (alreadyLinked ? "border-gray-600" : "border-green-400 ring-2 ring-green-400/50") :
                                        isSelected ? "ring-2 ring-red-500" : "";

                    return (
                      <Draggable key={device.id} draggableId={`device-${device.id}`} index={idx}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                            className={`absolute w-[130px] rounded-xl border-2 transition-all ${TYPE_COLORS[device.type] || TYPE_COLORS.server} ${borderColor} ${
                              snapshot.isDragging ? "opacity-80 shadow-2xl scale-105 z-50" : "hover:scale-[1.02]"
                            }`}
                            style={{ left: device.position_x || 0, top: device.position_y || 0, ...provided.draggableProps.style }}
                            onClick={(e) => selectDevice(device.id, e)}>
                            <div className="p-2.5">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <DevIcon className={`h-3.5 w-3.5 ${TYPE_ICON_COLORS[device.type] || "text-gray-400"}`} />
                                <span className="text-[9px] font-mono text-gray-200 truncate font-bold">{device.name}</span>
                                {(() => {
                                  const tier = getCostTier(device.cpu_cores || 2, device.ram_mb || 4096);
                                  const tc = COST_TIERS[tier];
                                  return <span className={`text-[7px] font-mono px-1 py-0.5 rounded border ml-auto ${tc.bg} ${tc.color}`}>{tc.label}</span>;
                                })()}
                              </div>
                              <div className="flex items-center gap-2 text-[8px] font-mono text-gray-500">
                                <span>{device.cpu_cores || 2}vCPU</span>
                                <span>{device.ram_mb >= 1024 ? `${device.ram_mb / 1024}GB` : `${device.ram_mb}MB`}</span>
                              </div>
                              {device.ami_image_id && (
                                <div className="mt-1.5 text-[7px] font-mono text-cyan-500 bg-cyan-950/30 rounded px-1.5 py-0.5 truncate border border-cyan-800/30 flex items-center gap-1">
                                  <span className="truncate">
                                    {(() => {
                                      const dbImg = dbImages.find(i => i.id === device.ami_image_id);
                                      if (dbImg) return `${dbImg.vendor} ${dbImg.product}`;
                                      const id = device.ami_image_id;
                                      return id.startsWith("ami-") ? `AMI: ${id.slice(0, 14)}…` : id.slice(0, 18);
                                    })()}
                                  </span>
                                  {(device.access_method === "rdp" || device.ami_image_id?.toLowerCase().includes("windows"))
                                    ? <MonitorPlay className="h-2.5 w-2.5 text-blue-400 shrink-0" />
                                    : <Terminal className="h-2.5 w-2.5 text-green-400 shrink-0" />}
                                </div>
                              )}
                              {connCount > 0 && (
                                <div className="mt-1 text-[7px] font-mono text-gray-600 flex items-center gap-1">
                                  <GitBranch className="h-2.5 w-2.5" />{connCount}
                                </div>
                              )}

                              {/* EVE-NG style connect button — visible when selected */}
                              {isSelected && !connectingFrom && (
                                <button
                                  onClick={(e) => startConnection(device.id, e)}
                                  className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-yellow-600/30 border border-yellow-500/50 text-yellow-300 hover:bg-yellow-600/50 text-[9px] font-mono font-bold transition-colors">
                                  <Link2 className="h-3 w-3" /> Connect
                                </button>
                              )}

                              {/* Connecting source indicator */}
                              {isConnectingSource && (
                                <div className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-yellow-500/20 border border-yellow-400/60 text-yellow-300 text-[9px] font-mono">
                                  <Zap className="h-3 w-3 animate-pulse" /> Source
                                </div>
                              )}

                              {/* Connecting target indicator */}
                              {isConnectingTarget && !alreadyLinked && (
                                <div className="mt-2 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg bg-green-600/20 border border-green-500/50 text-green-300 text-[9px] font-mono font-bold">
                                  Click to link
                                </div>
                              )}
                            </div>

                            {/* Delete button */}
                            <button onClick={(e) => { e.stopPropagation(); setConfirmDeleteDevice(device); }}
                              className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-800/90 border border-red-600 text-red-300 hover:bg-red-700 flex items-center justify-center group-hover:opacity-100 transition-opacity"
                              style={{ opacity: isSelected ? 1 : undefined }}>
                              <X className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                </div>
                {provided.placeholder}
                {devices.length === 0 && !connectingFrom && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <div className="h-14 w-14 rounded-2xl bg-gray-800/40 border border-gray-700/50 flex items-center justify-center mx-auto mb-4">
                        <Network className="h-7 w-7 text-gray-600" />
                      </div>
                      <p className="text-xs font-mono text-gray-600 mb-1">Click devices in the palette to add them</p>
                      <p className="text-[10px] font-mono text-gray-700">Select a device → Connect → Click target</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Droppable>
        </div>

        {/* Right Panel */}
        {rightPanel && (
          <div className="w-72 shrink-0 border-l border-red-900/20 bg-gradient-to-b from-black/40 to-black/20 overflow-y-auto">
            <div className="flex border-b border-red-900/20">
              <button onClick={() => setRightPanel("properties")}
                className={`flex-1 text-[10px] font-mono py-2.5 text-center transition-colors ${rightPanel === "properties" ? "bg-red-900/20 text-red-300 border-b-2 border-red-500" : "text-gray-500 hover:text-gray-300"}`}>
                <Settings className="h-3 w-3 inline mr-1" />Properties
              </button>
              <button onClick={() => setRightPanel("network")}
                className={`flex-1 text-[10px] font-mono py-2.5 text-center transition-colors ${rightPanel === "network" ? "bg-blue-900/20 text-blue-300 border-b-2 border-blue-500" : "text-gray-500 hover:text-gray-300"}`}>
                <Network className="h-3 w-3 inline mr-1" />Network
              </button>
            </div>

            <div className="p-3">
              {rightPanel === "properties" && selectedDeviceData && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-800">
                    <div className={`h-2 w-2 rounded-full ${selectedDeviceData.status === "running" ? "bg-green-400" : "bg-gray-500"}`} />
                    <span className="text-xs font-bold text-white font-mono">{selectedDeviceData.name}</span>
                    {(() => {
                      const st = getCostTier(selectedDeviceData.cpu_cores || 2, selectedDeviceData.ram_mb || 4096);
                      const sc = COST_TIERS[st];
                      return <span className={`text-[7px] font-mono px-1.5 py-0.5 rounded border ml-auto ${sc.bg} ${sc.color}`}>{sc.label}</span>;
                    })()}
                  </div>

                  {!isAdmin && !isLabApproved && (() => {
                    const st = getCostTier(selectedDeviceData.cpu_cores || 2, selectedDeviceData.ram_mb || 4096);
                    const sc = COST_TIERS[st];
                    if (!sc.requiresApproval) return null;
                    return (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-950/30 border border-red-800/40 text-red-300">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-mono font-bold">Admin Approval Required</p>
                          <p className="text-[9px] text-red-400/80 mt-0.5">{sc.label} tier is restricted.</p>
                        </div>
                      </div>
                    );
                  })()}

                  <div>
                    <label className="text-[8px] font-mono text-gray-500 uppercase tracking-wider block mb-1">Name</label>
                    <input value={selectedDeviceData.name}
                      onChange={(e) => updateDevice(selectedDeviceData.id, { name: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-xs px-2.5 py-2 font-mono focus:border-red-500/50 outline-none" />
                  </div>
                  <div>
                    <label className="text-[8px] font-mono text-gray-500 uppercase tracking-wider block mb-1">Type</label>
                    <select value={selectedDeviceData.type}
                      onChange={(e) => updateDevice(selectedDeviceData.id, { type: e.target.value, cost_per_hour: DEVICE_PRICING[e.target.value] || 0.15 })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-xs px-2.5 py-2">
                      {DEVICE_PALETTE.map(d => <option key={d.type} value={d.type}>{d.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[8px] font-mono text-gray-500 uppercase tracking-wider block mb-1">AMI / Image</label>
                    {selectedDeviceData.ami_image_id ? (
                      <div className="space-y-2">
                        <div className="bg-cyan-950/20 border border-cyan-800/30 rounded-lg p-2.5">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] font-mono font-bold text-cyan-400 truncate max-w-[140px]">
                              {(() => {
                                const dbImg = dbImages.find(i => i.id === selectedDeviceData.ami_image_id);
                                if (dbImg) return `${dbImg.vendor} ${dbImg.product}`;
                                return selectedDeviceData.ami_image_id?.startsWith("ami-") ? selectedDeviceData.ami_image_id : selectedDeviceData.ami_image_id;
                              })()}
                            </span>
                            <span className="text-[7px] font-mono text-cyan-600 flex items-center gap-1">
                              <Check className="h-2.5 w-2.5" /> Selected
                            </span>
                          </div>
                          {/* Connection preview */}
                          <div className="flex items-center gap-2 text-[7px] font-mono text-gray-500 mt-1.5">
                            <span className="flex items-center gap-0.5"><Terminal className="h-2.5 w-2.5 text-green-400" />SSH</span>
                            <span className="flex items-center gap-0.5"><Key className="h-2.5 w-2.5 text-yellow-400" />.pem key</span>
                            <span className="text-gray-600">| port 22</span>
                          </div>
                        </div>
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => { setCatalogForDeviceId(selectedDeviceData.id); setImageCatalogOpen(true); }}
                            className="flex-1 text-[9px] font-mono px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-cyan-400 hover:bg-gray-700 transition-colors flex items-center justify-center gap-1">
                            <Database className="h-3 w-3" /> Change
                          </button>
                          <button
                            onClick={() => updateDevice(selectedDeviceData.id, { ami_image_id: null })}
                            className="text-[9px] font-mono px-2 py-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-500 hover:text-red-400 transition-colors">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button
                          onClick={() => { setCatalogForDeviceId(selectedDeviceData.id); setImageCatalogOpen(true); }}
                          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-cyan-400 hover:border-cyan-700/40 transition-colors text-[10px] font-mono">
                          <Database className="h-3.5 w-3.5" /> Browse Image Catalog
                        </button>
                        <div className="relative">
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-800"></div>
                          </div>
                          <div className="relative flex justify-center text-[8px]">
                            <span className="px-2 bg-gray-900 text-gray-700 font-mono">or enter manually</span>
                          </div>
                        </div>
                        <input
                          type="text"
                          value={manualImageId}
                          onChange={(e) => setManualImageId(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && manualImageId.trim()) {
                              updateDevice(selectedDeviceData.id, { ami_image_id: manualImageId.trim() });
                              setManualImageId("");
                            }
                          }}
                          placeholder="Paste AMI ID (ami-xxxxx)..."
                          className="w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-[10px] px-2.5 py-2 font-mono focus:border-cyan-500/50 outline-none placeholder:text-gray-600"
                        />
                      </div>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div><label className="text-[8px] font-mono text-gray-500 uppercase tracking-wider block mb-1">vCPU</label>
                      <input type="number" value={selectedDeviceData.cpu_cores}
                        onChange={(e) => updateDevice(selectedDeviceData.id, { cpu_cores: parseInt(e.target.value) || 2 })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-xs px-2.5 py-2 font-mono" /></div>
                    <div><label className="text-[8px] font-mono text-gray-500 uppercase tracking-wider block mb-1">RAM (MB)</label>
                      <input type="number" value={selectedDeviceData.ram_mb}
                        onChange={(e) => updateDevice(selectedDeviceData.id, { ram_mb: parseInt(e.target.value) || 4096 })}
                        className="w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-xs px-2.5 py-2 font-mono" /></div>
                  </div>
                  <div><label className="text-[8px] font-mono text-gray-500 uppercase tracking-wider block mb-1">Storage (GB)</label>
                    <input type="number" value={selectedDeviceData.storage_gb}
                      onChange={(e) => updateDevice(selectedDeviceData.id, { storage_gb: parseInt(e.target.value) || 20 })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-xs px-2.5 py-2 font-mono" /></div>
                  <div><label className="text-[8px] font-mono text-gray-500 uppercase tracking-wider block mb-1">Subnet</label>
                    <select value={selectedDeviceData.subnet || "public"}
                      onChange={(e) => updateDevice(selectedDeviceData.id, { subnet: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-xs px-2.5 py-2">
                      {vpcConfig.subnets.map((s, i) => <option key={i} value={s.name}>{s.name} ({s.cidr})</option>)}
                    </select>
                  </div>
                  <div><label className="text-[8px] font-mono text-gray-500 uppercase tracking-wider block mb-1">Access</label>
                    <select value={selectedDeviceData.access_method || "ssh"}
                      onChange={(e) => updateDevice(selectedDeviceData.id, { access_method: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-xs px-2.5 py-2">
                      <option value="ssh">SSH</option><option value="rdp">RDP</option><option value="novnc">noVNC</option>
                      <option value="web_terminal">Web Terminal</option><option value="serial_console">Serial Console</option>
                    </select>
                  </div>

                  {/* Connection details preview */}
                  <div className="bg-gray-800/60 rounded-lg p-3 border border-gray-700 space-y-2">
                    <p className="text-[8px] font-mono text-gray-500 uppercase tracking-wider">Connection Info</p>
                    {selectedDeviceData.access_method === "rdp" ? (
                      <>
                        <div className="bg-black/30 rounded p-2">
                          <code className="text-[9px] font-mono text-blue-400 break-all">
                            mstsc /v:&lt;IP&gt;:3389
                          </code>
                        </div>
                        <p className="text-[8px] font-mono text-gray-500 flex items-center gap-1">
                          <Key className="h-2.5 w-2.5 text-yellow-400" />
                          User: <span className="text-white">{selectedDeviceData.default_username || "Administrator"}</span>
                        </p>
                        <p className="text-[7px] font-mono text-amber-400/70">
                          Password is auto-generated on deploy — available in the device panel under GetPasswordData
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="bg-black/30 rounded p-2">
                          <code className="text-[9px] font-mono text-green-400 break-all">
                            chmod 400 lab-key.pem{'\n'}
                            ssh -i lab-key.pem {selectedDeviceData.default_username || "ec2-user"}@&lt;IP&gt;
                          </code>
                        </div>
                        <p className="text-[8px] font-mono text-gray-500 flex items-center gap-1">
                          <Key className="h-2.5 w-2.5 text-yellow-400" />
                          Key: <span className="text-white">.pem file</span>
                          <span className="text-gray-600">|</span>
                          Port: <span className="text-cyan-400">22</span>
                        </p>
                      </>
                    )}
                    <p className="text-[7px] font-mono text-gray-600 italic">
                      SSH key and IP are available after deployment
                    </p>
                  </div>
                </div>
              )}

              {rightPanel === "properties" && !selectedDeviceData && (
                <div className="text-center py-12">
                  <Server className="h-8 w-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-[10px] text-gray-600 font-mono">Select a device to edit</p>
                </div>
              )}

              {rightPanel === "network" && (() => {
                // Count devices per subnet
                const devicesPerSubnet = {};
                devices.forEach(d => {
                  const sn = d.subnet || "public";
                  devicesPerSubnet[sn] = (devicesPerSubnet[sn] || 0) + 1;
                });

                return (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-800">
                    <Globe className="h-4 w-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white font-mono">VPC Configuration</span>
                  </div>

                  {/* VPC Mode: Existing vs New */}
                  <div>
                    <label className="text-[8px] font-mono text-gray-500 uppercase tracking-wider block mb-1.5">VPC Source</label>
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => { selectExistingVpc(null); setVpcSubnetOptions(null); }}
                        className={`text-[9px] font-mono px-2.5 py-2 rounded-lg border transition-colors text-center ${
                          !selectedExistingVpc
                            ? "bg-cyan-900/30 border-cyan-600/60 text-cyan-300"
                            : "bg-gray-800/40 border-gray-700/40 text-gray-400 hover:text-cyan-400 hover:border-cyan-700/40"
                        }`}>
                        <Plus className="h-3 w-3 inline mr-1" />New VPC
                      </button>
                      <button
                        onClick={() => { fetchExistingVpcs(); }}
                        className={`text-[9px] font-mono px-2.5 py-2 rounded-lg border transition-colors text-center ${
                          selectedExistingVpc
                            ? "bg-cyan-900/30 border-cyan-600/60 text-cyan-300"
                            : "bg-gray-800/40 border-gray-700/40 text-gray-400 hover:text-cyan-400 hover:border-cyan-700/40"
                        }`}>
                        <RefreshCw className="h-3 w-3 inline mr-1" />Existing
                      </button>
                    </div>
                  </div>

                  {/* Existing VPC Selector */}
                  {selectedExistingVpc ? (
                    <>
                      <div>
                        <label className="text-[8px] font-mono text-gray-500 uppercase tracking-wider block mb-1">Select VPC</label>
                        <div className="flex gap-1.5">
                          <select
                            value={selectedExistingVpc}
                            onChange={(e) => selectExistingVpc(e.target.value || null)}
                            className="flex-1 bg-gray-800 border border-gray-700 rounded-lg text-white text-[10px] font-mono px-2.5 py-2 outline-none focus:border-cyan-500/50"
                          >
                            <option value="">— Choose —</option>
                            {existingVpcs.filter(v => !v.isDefault).map(vpc => (
                              <option key={vpc.vpcId} value={vpc.vpcId}>
                                {vpc.name || vpc.cidrBlock} ({vpc.cidrBlock}) {vpc.isOrphaned ? "[unused]" : `[${vpc.instanceCount} inst]`}
                              </option>
                            ))}
                          </select>
                        </div>
                        {selectedExistingVpc && (
                          <div className="mt-1.5 bg-cyan-950/20 border border-cyan-800/30 rounded-lg p-2">
                            <p className="text-[9px] font-mono text-cyan-400 font-bold">{vpcConfig.cidr}</p>
                            <p className="text-[8px] font-mono text-cyan-600">
                              {existingVpcs.find(v => v.vpcId === selectedExistingVpc)?.instanceCount || 0} running instances
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Subnet Options from existing VPC */}
                      {vpcSubnetOptions && (
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="text-[8px] font-mono text-gray-500 uppercase tracking-wider">
                              Available Subnets
                            </label>
                            <span className="text-[7px] font-mono text-gray-600">
                              {vpcConfig.subnets.length} selected / {vpcSubnetOptions.availableCount} free
                            </span>
                          </div>
                          {loadingSubnets ? (
                            <div className="flex justify-center py-3">
                              <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin" />
                            </div>
                          ) : (
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                              {vpcSubnetOptions.subnets.filter(s => !s.isTaken).slice(0, 24).map(s => {
                                const isSelected = vpcConfig.subnets.some(sub => sub.cidr === s.cidr);
                                const devsOnSubnet = devices.filter(d => d.subnet === (vpcConfig.subnets.find(sub => sub.cidr === s.cidr)?.name || "")).length;
                                return (
                                  <button key={s.cidr}
                                    onClick={() => applySubnetFromVpc(s.cidr)}
                                    className={`w-full text-left text-[9px] font-mono px-2.5 py-2 rounded-lg border transition-colors flex items-center justify-between ${
                                      isSelected
                                        ? "bg-cyan-900/30 border-cyan-600/60 text-cyan-300"
                                        : "bg-gray-800/40 border-gray-700/40 text-gray-400 hover:text-cyan-400 hover:border-cyan-700/40"
                                    }`}>
                                    <span className="truncate">{s.cidr}</span>
                                    <span className="text-[8px] shrink-0 ml-2">
                                      {isSelected && devsOnSubnet > 0
                                        ? <span className="text-green-400">{devsOnSubnet} device{devsOnSubnet > 1 ? "s" : ""}</span>
                                        : isSelected ? <Check className="h-3 w-3 text-cyan-400" /> : null}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      {/* New VPC CIDR */}
                      <div>
                        <label className="text-[8px] font-mono text-gray-500 uppercase tracking-wider block mb-1">CIDR Block</label>
                        <div className="flex gap-1.5">
                          <input value={vpcConfig.cidr}
                            onChange={(e) => updateVpcConfig({ cidr: e.target.value })}
                            className={`flex-1 bg-gray-800 border rounded-lg text-white text-xs px-2.5 py-2 font-mono outline-none ${
                              cidrConflict?.conflict ? "border-red-500/60" : "border-gray-700 focus:border-cyan-500/50"
                            }`} />
                          <button onClick={fetchCidrSuggestion} disabled={suggestingCidr}
                            className="text-[10px] font-mono px-2.5 py-2 rounded-lg bg-cyan-900/30 border border-cyan-700/40 text-cyan-400 hover:bg-cyan-800/40 transition-colors disabled:opacity-50 whitespace-nowrap">
                            {suggestingCidr ? "..." : "Suggest"}
                          </button>
                        </div>
                        {cidrConflict?.conflict && (
                          <div className="mt-1.5 p-2 rounded-lg bg-red-950/30 border border-red-800/40 text-red-300 text-[9px] font-mono">
                            <p className="flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> CIDR conflict</p>
                            {cidrConflict.suggested && (
                              <button onClick={() => updateVpcConfig({ cidr: cidrConflict.suggested })}
                                className="mt-1 text-cyan-400 hover:text-cyan-300 underline">
                                Use: {cidrConflict.suggested}
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Derived subnets preview */}
                      {vpcConfig.cidr && !selectedExistingVpc && (() => {
                        const parts = vpcConfig.cidr.split("/")[0].split(".").map(Number);
                        const prefix = `${parts[0]}.${parts[1]}`;
                        const derivedSubnets = [
                          { name: "public", cidr: `${prefix}.1.0/24` },
                          { name: "private", cidr: `${prefix}.2.0/24` },
                        ];
                        return (
                          <div>
                            <label className="text-[8px] font-mono text-gray-500 uppercase tracking-wider block mb-1">Derived Subnets</label>
                            <div className="space-y-1">
                              {derivedSubnets.map(s => {
                                const isSelected = vpcConfig.subnets.some(sub => sub.cidr === s.cidr);
                                const devsOnSubnet = devices.filter(d => d.subnet === s.name).length;
                                return (
                                  <button key={s.cidr}
                                    onClick={() => {
                                      if (isSelected) {
                                        updateVpcConfig({ subnets: vpcConfig.subnets.filter(sub => sub.cidr !== s.cidr) });
                                      } else {
                                        updateVpcConfig({ subnets: [...vpcConfig.subnets, { ...s, zone: `${region}a` }] });
                                      }
                                    }}
                                    className={`w-full text-left text-[9px] font-mono px-2.5 py-2 rounded-lg border transition-colors flex items-center justify-between ${
                                      isSelected
                                        ? "bg-cyan-900/30 border-cyan-600/60 text-cyan-300"
                                        : "bg-gray-800/40 border-gray-700/40 text-gray-400 hover:text-cyan-400 hover:border-cyan-700/40"
                                    }`}>
                                    <span>{s.name} <span className="text-[8px] opacity-60">({s.cidr})</span></span>
                                    <span className="text-[8px] shrink-0 ml-2">
                                      {devsOnSubnet > 0 && <span className="text-green-400">{devsOnSubnet}</span>}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </>
                  )}

                  {/* Internet Gateway (new VPC only) */}
                  {!selectedExistingVpc && (
                    <div>
                      <label className="text-[8px] font-mono text-gray-500 uppercase tracking-wider block mb-1">Internet Gateway</label>
                      <button onClick={() => updateVpcConfig({ enableInternetGateway: !vpcConfig.enableInternetGateway })}
                        className={`w-full text-left text-[10px] font-mono px-2.5 py-2 rounded-lg border transition-colors ${
                          vpcConfig.enableInternetGateway ? "bg-green-900/20 border-green-700/40 text-green-400" : "bg-gray-800 border-gray-700 text-gray-500"
                        }`}>{vpcConfig.enableInternetGateway ? "✓ Enabled" : "Disabled"}</button>
                    </div>
                  )}

                  {/* Device Assignments */}
                  {vpcConfig.subnets.length > 0 && devices.length > 0 && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[8px] font-mono text-gray-500 uppercase tracking-wider">Device Assignments</label>
                        <span className="text-[7px] font-mono text-gray-600">{devices.length} devices</span>
                      </div>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {vpcConfig.subnets.map(sn => {
                          const snDevices = devices.filter(d => (d.subnet || "public") === sn.name);
                          return (
                            <div key={sn.name} className="bg-black/30 rounded-lg border border-gray-800 p-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[9px] font-mono font-bold text-gray-300">{sn.name}</span>
                                <span className="text-[7px] font-mono text-gray-500">{sn.cidr}</span>
                              </div>
                              {snDevices.length === 0 ? (
                                <p className="text-[8px] font-mono text-gray-600 italic">No devices assigned</p>
                              ) : (
                                <div className="space-y-0.5">
                                  {snDevices.map(d => (
                                    <div key={d.id} className="flex items-center gap-1.5 text-[8px] font-mono text-gray-400">
                                      <div className={`w-1.5 h-1.5 rounded-full ${TYPE_ICON_COLORS[d.type] || "bg-gray-500"}`} />
                                      <span className="truncate flex-1">{d.name}</span>
                                      <span className="text-gray-600">{d.type}</span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      {/* Unassigned devices */}
                      {(() => {
                        const assignedNames = vpcConfig.subnets.map(s => s.name);
                        const unassigned = devices.filter(d => !assignedNames.includes(d.subnet || "public"));
                        if (unassigned.length === 0) return null;
                        return (
                          <div className="mt-1 bg-amber-950/20 border border-amber-800/30 rounded-lg p-2">
                            <p className="text-[8px] font-mono text-amber-400 mb-1">Unmatched subnet</p>
                            {unassigned.map(d => (
                              <div key={d.id} className="flex items-center gap-1.5 text-[8px] font-mono text-amber-300/70">
                                <span className="truncate flex-1">{d.name}</span>
                                <span className="text-amber-500">→ {d.subnet || "public"}</span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {/* Custom subnet management (new VPC only) */}
                  {!selectedExistingVpc && (
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-[8px] font-mono text-gray-500 uppercase tracking-wider">Custom Subnets</label>
                        <button onClick={addSubnet} className="text-[8px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                          <Plus className="h-2.5 w-2.5" /> Add
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {vpcConfig.subnets.map((subnet, idx) => (
                          <div key={idx} className="bg-black/30 rounded-lg border border-gray-800 p-2 space-y-1">
                            <div className="flex items-center gap-1.5">
                              <input value={subnet.name} onChange={(e) => updateSubnet(idx, { name: e.target.value })}
                                className="flex-1 bg-gray-800 border border-gray-700 rounded text-white text-[10px] font-mono px-2 py-1" placeholder="Name" />
                              <button onClick={() => removeSubnet(idx)} className="text-gray-500 hover:text-red-400"><X className="h-3 w-3" /></button>
                            </div>
                            <div className="flex gap-1.5">
                              <input value={subnet.cidr} onChange={(e) => updateSubnet(idx, { cidr: e.target.value })}
                                className="flex-1 bg-gray-800 border border-gray-700 rounded text-white text-[10px] font-mono px-2 py-1" placeholder="CIDR" />
                              <input value={subnet.zone} onChange={(e) => updateSubnet(idx, { zone: e.target.value })}
                                className="w-24 bg-gray-800 border border-gray-700 rounded text-white text-[10px] font-mono px-2 py-1" placeholder="Zone" />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Security Groups (new VPC only) */}
                  {!selectedExistingVpc && (
                    <div>
                      <label className="text-[8px] font-mono text-gray-500 uppercase tracking-wider block mb-1">Security Groups</label>
                      {vpcConfig.securityGroups.map((sg, sgIdx) => (
                        <div key={sgIdx} className="bg-black/30 rounded-lg border border-gray-800 p-2.5 mb-1.5">
                          <input value={sg.name}
                            onChange={(e) => {
                              const sgs = [...vpcConfig.securityGroups];
                              sgs[sgIdx] = { ...sgs[sgIdx], name: e.target.value };
                              updateVpcConfig({ securityGroups: sgs });
                            }}
                            className="w-full bg-gray-800 border border-gray-700 rounded text-white text-[10px] font-mono px-2 py-1 mb-1.5" placeholder="SG Name" />
                          <div className="space-y-1">
                            {sg.rules.map((rule, rIdx) => (
                              <div key={rIdx} className="flex items-center gap-1 text-[9px] font-mono text-gray-400 bg-gray-800/40 rounded px-2 py-1">
                                <Lock className="h-2.5 w-2.5 text-cyan-400 shrink-0" />
                                <span>{rule.protocol}:{rule.port}</span>
                                <span className="text-gray-600">←</span>
                                <span className="truncate">{rule.source}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* Image Catalog Modal */}
      <ImageCatalog
        isOpen={imageCatalogOpen}
        onClose={() => { setImageCatalogOpen(false); setCatalogForDeviceId(null); }}
        onSelect={(image) => {
          if (catalogForDeviceId) {
            const value = image.source === "custom" ? image.id : image.name; // custom uses db ID, cloud uses AMI ID
            updateDevice(catalogForDeviceId, {
              ami_image_id: value,
              // Auto-set access method based on OS
              access_method: image.osFamily === "windows" ? "rdp" : "ssh",
              access_port: image.osFamily === "windows" ? 3389 : 22,
              default_username: image.username || (image.osFamily === "windows" ? "Administrator" : "ec2-user"),
            });
          }
        }}
        cloudProvider={cloudProvider}
        region={region}
        selectedImageId={catalogForDeviceId ? selectedDeviceData?.ami_image_id : null}
      />

      {/* Delete Device Confirmation */}
      <AlertDialog open={!!confirmDeleteDevice} onOpenChange={(open) => { if (!open) setConfirmDeleteDevice(null); }}>
        <AlertDialogContent className="bg-gray-900 border border-red-800/40 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-lg">Delete Device</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to remove <span className="text-red-400 font-bold font-mono">{confirmDeleteDevice?.name}</span> from the topology?
              {confirmDeleteDevice?.connections?.length > 0 && (
                <span className="block mt-2 text-amber-400 font-mono text-xs">
                  ⚠ {confirmDeleteDevice.connections.length} connection{confirmDeleteDevice.connections.length !== 1 ? "s" : ""} will also be removed.
                </span>
              )}
              <span className="block mt-2">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-700 hover:bg-red-600 text-white"
              onClick={() => {
                if (confirmDeleteDevice) {
                  removeDevice(confirmDeleteDevice.id);
                  setConfirmDeleteDevice(null);
                }
              }}
            >
              Remove Device
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Clear Canvas Confirmation */}
      <AlertDialog open={confirmClearCanvas} onOpenChange={setConfirmClearCanvas}>
        <AlertDialogContent className="bg-gray-900 border border-red-800/40 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-lg">Clear Canvas</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to remove <span className="text-red-400 font-bold">{devices.length} device{devices.length !== 1 ? "s" : ""}</span> and all connections from the canvas?
              <span className="block mt-2">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-700 hover:bg-red-600 text-white"
              onClick={() => {
                onChange({ ...topology, devices: [] });
                setSelectedDevice(null);
                setRightPanel(null);
                cancelConnection();
                setConfirmClearCanvas(false);
              }}
            >
              Clear All Devices
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DragDropContext>
  );
}