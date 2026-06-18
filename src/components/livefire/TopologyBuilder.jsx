import React, { useState, useRef, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Server, Router, Shield, Monitor, HardDrive, Wifi, Cloud,
  Container, Zap, GitBranch, Trash2, Plus, Move, Maximize2,
  Minimize2, Eye, Copy, Layers, Network, Globe, Lock, Cpu,
  DollarSign, X, Check, AlertTriangle, Settings, ShieldAlert
} from "lucide-react";
import { getCostTier, COST_TIERS, checkLabDevices } from "@/lib/instanceTiers";

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

// Per-device pricing ($/hr)
const DEVICE_PRICING = {
  router: 0.18, switch: 0.14, firewall: 0.22, server: 0.15,
  workstation: 0.12, cloud_resource: 0.20, container: 0.10,
  security_appliance: 0.25, load_balancer: 0.16, monitoring: 0.12,
};

export default function TopologyBuilder({ topology, onChange, cloudProvider = "aws", isAdmin = false, isLabApproved = false }) {
  const devices = topology?.devices || [];
  const vpcConfig = topology?.vpcConfig || {
    cidr: "10.0.0.0/16",
    subnets: [{ name: "public", cidr: "10.0.1.0/24", zone: "us-east-1a" }, { name: "private", cidr: "10.0.2.0/24", zone: "us-east-1b" }],
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
  const [connectingFrom, setConnectingFrom] = useState(null);
  const [rightPanel, setRightPanel] = useState(null); // 'properties' | 'network' | null
  const canvasRef = useRef(null);

  // Fetch available AMI images
  const { data: availableImages = [] } = useQuery({
    queryKey: ["ami-images", cloudProvider],
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
    const subnets = [...vpcConfig.subnets, { name: `subnet-${vpcConfig.subnets.length + 1}`, cidr: `10.0.${vpcConfig.subnets.length + 3}.0/24`, zone: "us-east-1a" }];
    updateVpcConfig({ subnets });
  };

  const removeSubnet = (idx) => {
    const subnets = vpcConfig.subnets.filter((_, i) => i !== idx);
    updateVpcConfig({ subnets });
  };

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

  const handleCanvasMouseDown = (e) => {
    if (e.target === canvasRef.current || e.target.classList.contains("canvas-bg") || e.target.tagName === "svg") {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };
  const handleCanvasMouseMove = (e) => { if (isPanning) setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y }); };
  const handleCanvasMouseUp = () => setIsPanning(false);

  const startConnection = (deviceId) => {
    if (connectingFrom === deviceId) { setConnectingFrom(null); return; }
    if (connectingFrom) {
      const fromDevice = devices.find(d => d.id === connectingFrom);
      const toDevice = devices.find(d => d.id === deviceId);
      if (fromDevice && toDevice && fromDevice.id !== toDevice.id) {
        const exists = fromDevice.connections?.some(c => c.target_device_id === toDevice.id);
        if (!exists) {
          updateDevice(connectingFrom, { connections: [...(fromDevice.connections || []), { target_device_id: toDevice.id, source_interface: `eth${(fromDevice.connections?.length || 0)}`, target_interface: `eth${(toDevice.connections?.length || 0)}`, connection_type: "ethernet", bandwidth_mbps: 1000 }] });
          updateDevice(deviceId, { connections: [...(toDevice.connections || []), { target_device_id: fromDevice.id, source_interface: `eth${(toDevice.connections?.length || 0)}`, target_interface: `eth${(fromDevice.connections?.length || 0)}`, connection_type: "ethernet", bandwidth_mbps: 1000 }] });
        }
      }
      setConnectingFrom(null);
    } else { setConnectingFrom(deviceId); }
  };

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
        lines.push(<line key={pairKey} x1={(device.position_x || 0) + 60} y1={(device.position_y || 0) + 36} x2={(target.position_x || 0) + 60} y2={(target.position_y || 0) + 36} stroke="#4B5563" strokeWidth={2} opacity={0.5} />);
      });
    });
    return lines;
  };

  const selectedDeviceData = selectedDevice ? devices.find(d => d.id === selectedDevice) : null;
  const totalCost = devices.reduce((sum, d) => sum + (d.cost_per_hour || DEVICE_PRICING[d.type] || 0.15), 0);

  // Cost tier violation check
  const tierCheck = checkLabDevices(devices, isAdmin, isLabApproved);
  const hasViolations = tierCheck.hasViolations;

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
          {/* Cost summary */}
          <div className="border-t border-red-900/20 p-3 bg-black/30">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-mono text-gray-500">Est. Cost</span>
              <span className="font-mono text-green-400 font-bold">${totalCost.toFixed(2)}/hr</span>
            </div>
            {/* Tier indicator */}
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
          {/* Cost tier warning banner */}
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
          <div className="flex items-center gap-2 px-3 py-2 border-b border-red-900/20 bg-black/20 shrink-0">
            <button onClick={() => setScale(s => Math.max(0.25, s - 0.25))} className="p-1.5 rounded bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors"><Minimize2 className="h-3.5 w-3.5" /></button>
            <span className="text-[10px] font-mono text-gray-500 w-10 text-center">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(2, s + 0.25))} className="p-1.5 rounded bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors"><Maximize2 className="h-3.5 w-3.5" /></button>
            <div className="h-4 w-px bg-gray-700 mx-1" />
            <button onClick={() => setConnectingFrom(null)}
              className={`text-[10px] font-mono px-2.5 py-1 rounded border transition-colors ${
                connectingFrom ? "bg-yellow-900/30 border-yellow-600/60 text-yellow-400" : "bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300"
              }`}>
              {connectingFrom ? "Connecting... (click target)" : "Connect Mode"}
            </button>
            <button onClick={() => setRightPanel(rightPanel === "network" ? null : "network")}
              className={`text-[10px] font-mono px-2.5 py-1 rounded border transition-colors ${
                rightPanel === "network" ? "bg-blue-900/30 border-blue-600/60 text-blue-400" : "bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300"
              }`}>
              <Network className="h-3 w-3 inline mr-1" />VPC Config
            </button>
            <button onClick={() => { onChange({ ...topology, devices: [] }); setSelectedDevice(null); setRightPanel(null); setConnectingFrom(null); }}
              className="text-[10px] font-mono px-2 py-1 rounded border border-gray-700 text-gray-500 hover:text-red-400 ml-auto transition-colors">Clear All</button>
          </div>

          <Droppable droppableId="canvas" type="DEVICE">
            {(provided, snapshot) => (
              <div ref={(el) => { canvasRef.current = el; provided.innerRef(el); }} {...provided.droppableProps}
                className={`canvas-bg flex-1 relative overflow-hidden ${snapshot.isDraggingOver ? "bg-red-950/10" : "bg-[radial-gradient(circle,#1f2937_1px,transparent_1px)] bg-[size:20px_20px]"}`}
                onMouseDown={handleCanvasMouseDown} onMouseMove={handleCanvasMouseMove} onMouseUp={handleCanvasMouseUp} onMouseLeave={handleCanvasMouseUp}
                style={{ cursor: isPanning ? "grabbing" : connectingFrom ? "crosshair" : "grab" }}>
                <svg className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%" }}>
                  <g transform={`translate(${pan.x},${pan.y}) scale(${scale})`}>{renderConnections()}</g>
                </svg>
                <div style={{ transform: `translate(${pan.x}px,${pan.y}px) scale(${scale})`, transformOrigin: "0 0" }} className="absolute inset-0">
                  {devices.map((device, idx) => {
                    const paletteItem = DEVICE_PALETTE.find(d => d.type === device.type);
                    const DevIcon = paletteItem?.icon || Server;
                    const isConnected = connectingFrom && connectingFrom !== device.id;
                    return (
                      <Draggable key={device.id} draggableId={`device-${device.id}`} index={idx}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                            className={`absolute w-[130px] rounded-xl border-2 transition-all cursor-pointer ${
                              TYPE_COLORS[device.type] || TYPE_COLORS.server
                            } ${selectedDevice === device.id ? "ring-2 ring-red-500 ring-offset-2 ring-offset-gray-950 shadow-lg shadow-red-900/20" : ""} ${
                              snapshot.isDragging ? "opacity-80 shadow-2xl scale-105" : "hover:scale-[1.02]"
                            } ${isConnected ? "ring-1 ring-yellow-500/50" : ""}`}
                            style={{ left: device.position_x || 0, top: device.position_y || 0, ...provided.draggableProps.style }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (connectingFrom) { startConnection(device.id); }
                              else if (selectedDevice === device.id) { setSelectedDevice(null); setRightPanel(null); }
                              else { setSelectedDevice(device.id); setRightPanel("properties"); }
                            }}>
                            <div className="p-2.5">
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <DevIcon className={`h-3.5 w-3.5 ${TYPE_ICON_COLORS[device.type] || "text-gray-400"}`} />
                                <span className="text-[9px] font-mono text-gray-200 truncate font-bold">{device.name}</span>
                                {(() => {
                                  const tier = getCostTier(device.cpu_cores || 2, device.ram_mb || 4096);
                                  const tc = COST_TIERS[tier];
                                  return (
                                    <span className={`text-[7px] font-mono px-1 py-0.5 rounded border ml-auto ${tc.bg} ${tc.color}`}>
                                      {tc.label}
                                    </span>
                                  );
                                })()}
                              </div>
                              <div className="flex items-center gap-2 text-[8px] font-mono text-gray-500">
                                <span>{device.cpu_cores || 2} vCPU</span>
                                <span>{device.ram_mb >= 1024 ? `${device.ram_mb / 1024}GB` : `${device.ram_mb}MB`}</span>
                              </div>
                              {device.ami_image_id && (
                                <div className="mt-1.5 text-[7px] font-mono text-cyan-500 bg-cyan-950/30 rounded px-1.5 py-0.5 truncate border border-cyan-800/30">
                                  AMI: {availableImages.find(i => i.id === device.ami_image_id)?.product || device.ami_image_id}
                                </div>
                              )}
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); removeDevice(device.id); }}
                              className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-800/90 border border-red-600 text-red-300 hover:bg-red-700 flex items-center justify-center transition-colors">
                              <X className="h-2.5 w-2.5" />
                            </button>
                            <button onClick={(e) => { e.stopPropagation(); startConnection(device.id); }}
                              className={`absolute -bottom-2 -right-2 h-5 w-5 rounded-full border flex items-center justify-center transition-colors ${
                                connectingFrom === device.id ? "bg-yellow-800 border-yellow-500 text-yellow-300" : "bg-gray-800 border-gray-600 text-gray-400 hover:border-cyan-500 hover:text-cyan-400"
                              }`}>
                              <GitBranch className="h-2.5 w-2.5" />
                            </button>
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                </div>
                {provided.placeholder}
                {devices.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <div className="h-14 w-14 rounded-2xl bg-gray-800/40 border border-gray-700/50 flex items-center justify-center mx-auto mb-4">
                        <Network className="h-7 w-7 text-gray-600" />
                      </div>
                      <p className="text-xs font-mono text-gray-600 mb-1">Drag devices from the palette</p>
                      <p className="text-[10px] font-mono text-gray-700">or click a device to add it to the canvas</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Droppable>
        </div>

        {/* Right Panel: Properties or Network Config */}
        {rightPanel && (
          <div className="w-72 shrink-0 border-l border-red-900/20 bg-gradient-to-b from-black/40 to-black/20 overflow-y-auto">
            {/* Tabs */}
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

                  {/* Tier restriction warning */}
                  {!isAdmin && !isLabApproved && (() => {
                    const st = getCostTier(selectedDeviceData.cpu_cores || 2, selectedDeviceData.ram_mb || 4096);
                    const sc = COST_TIERS[st];
                    if (!sc.requiresApproval) return null;
                    return (
                      <div className="flex items-start gap-2 p-2.5 rounded-lg bg-red-950/30 border border-red-800/40 text-red-300">
                        <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-mono font-bold">Admin Approval Required</p>
                          <p className="text-[9px] text-red-400/80 mt-0.5">
                            {sc.label} tier is restricted. Reduce vCPU to ≤{COST_TIERS.performance.maxCpu}/{COST_TIERS.performance.maxRamMB / 1024}GB or request admin approval.
                          </p>
                        </div>
                      </div>
                    );
                  })()}

                  <div>
                    <label className="text-[8px] font-mono text-gray-500 uppercase tracking-wider block mb-1">Device Name</label>
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

                  {/* AMI Image Selection */}
                  <div>
                    <label className="text-[8px] font-mono text-gray-500 uppercase tracking-wider block mb-1">AMI / Image</label>
                    <select value={selectedDeviceData.ami_image_id || ""}
                      onChange={(e) => updateDevice(selectedDeviceData.id, { ami_image_id: e.target.value || null })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-xs px-2.5 py-2">
                      <option value="">Default (auto-assign)</option>
                      {availableImages.map(img => (
                        <option key={img.id} value={img.id}>{img.vendor} {img.product} v{img.version}</option>
                      ))}
                    </select>
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

                  <div className="pt-2 border-t border-gray-800">
                    <div className="flex items-center justify-between text-[10px] font-mono">
                      <span className="text-gray-500">Cost</span>
                      <span className="text-green-400 font-bold">${(selectedDeviceData.cost_per_hour || DEVICE_PRICING[selectedDeviceData.type] || 0.15).toFixed(2)}/hr</span>
                    </div>
                  </div>
                </div>
              )}

              {rightPanel === "properties" && !selectedDeviceData && (
                <div className="text-center py-12">
                  <Server className="h-8 w-8 text-gray-700 mx-auto mb-2" />
                  <p className="text-[10px] text-gray-600 font-mono">Select a device on the canvas to edit its properties</p>
                </div>
              )}

              {rightPanel === "network" && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-800">
                    <Globe className="h-4 w-4 text-cyan-400" />
                    <span className="text-xs font-bold text-white font-mono">VPC Configuration</span>
                  </div>

                  <div>
                    <label className="text-[8px] font-mono text-gray-500 uppercase tracking-wider block mb-1">VPC CIDR Block</label>
                    <input value={vpcConfig.cidr}
                      onChange={(e) => updateVpcConfig({ cidr: e.target.value })}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-xs px-2.5 py-2 font-mono focus:border-cyan-500/50 outline-none" />
                  </div>

                  <div>
                    <label className="text-[8px] font-mono text-gray-500 uppercase tracking-wider block mb-1">Internet Gateway</label>
                    <button onClick={() => updateVpcConfig({ enableInternetGateway: !vpcConfig.enableInternetGateway })}
                      className={`w-full text-left text-[10px] font-mono px-2.5 py-2 rounded-lg border transition-colors ${
                        vpcConfig.enableInternetGateway ? "bg-green-900/20 border-green-700/40 text-green-400" : "bg-gray-800 border-gray-700 text-gray-500"
                      }`}>
                      {vpcConfig.enableInternetGateway ? "✓ Enabled" : "Disabled"}
                    </button>
                  </div>

                  {/* Subnets */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-[8px] font-mono text-gray-500 uppercase tracking-wider">Subnets</label>
                      <button onClick={addSubnet} className="text-[8px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-1">
                        <Plus className="h-2.5 w-2.5" /> Add
                      </button>
                    </div>
                    <div className="space-y-1.5">
                      {vpcConfig.subnets.map((subnet, idx) => (
                        <div key={idx} className="bg-black/30 rounded-lg border border-gray-800 p-2.5 space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <input value={subnet.name}
                              onChange={(e) => updateSubnet(idx, { name: e.target.value })}
                              className="flex-1 bg-gray-800 border border-gray-700 rounded text-white text-[10px] font-mono px-2 py-1" placeholder="Name" />
                            <button onClick={() => removeSubnet(idx)}
                              className="text-gray-500 hover:text-red-400 transition-colors"><X className="h-3 w-3" /></button>
                          </div>
                          <div className="flex gap-1.5">
                            <input value={subnet.cidr}
                              onChange={(e) => updateSubnet(idx, { cidr: e.target.value })}
                              className="flex-1 bg-gray-800 border border-gray-700 rounded text-white text-[10px] font-mono px-2 py-1" placeholder="CIDR" />
                            <input value={subnet.zone}
                              onChange={(e) => updateSubnet(idx, { zone: e.target.value })}
                              className="w-24 bg-gray-800 border border-gray-700 rounded text-white text-[10px] font-mono px-2 py-1" placeholder="Zone" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Security Groups */}
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
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </DragDropContext>
  );
}