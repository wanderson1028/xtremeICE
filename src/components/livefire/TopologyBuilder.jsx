import React, { useState, useCallback, useRef, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import {
  Server, Router, Shield, Monitor, HardDrive, Wifi, Cloud,
  Container, Zap, GitBranch, Trash2, Plus, Move, Maximize2,
  Minimize2, Eye, Copy, Layers
} from "lucide-react";

const DEVICE_PALETTE = [
  { type: "router", label: "Router", icon: Router, color: "blue" },
  { type: "switch", label: "Switch", icon: GitBranch, color: "cyan" },
  { type: "firewall", label: "Firewall", icon: Shield, color: "red" },
  { type: "server", label: "Server", icon: Server, color: "green" },
  { type: "workstation", label: "Workstation", icon: Monitor, color: "yellow" },
  { type: "cloud_resource", label: "Cloud", icon: Cloud, color: "purple" },
  { type: "container", label: "Container", icon: Container, color: "orange" },
  { type: "security_appliance", label: "Security", icon: Shield, color: "pink" },
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

export default function TopologyBuilder({ topology, onChange }) {
  const devices = topology?.devices || [];
  const [scale, setScale] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [connectingFrom, setConnectingFrom] = useState(null);
  const canvasRef = useRef(null);

  const addDevice = (deviceType) => {
    const paletteItem = DEVICE_PALETTE.find(d => d.type === deviceType);
    const newDevice = {
      id: `dev_${Date.now()}`,
      type: deviceType,
      name: `${paletteItem?.label || deviceType}_${devices.length + 1}`,
      position_x: 200 + (devices.length % 5) * 150,
      position_y: 150 + Math.floor(devices.length / 5) * 150,
      connections: [],
      cpu_cores: 2,
      ram_mb: 4096,
      storage_gb: 20,
      status: "pending",
    };
    onChange({ ...topology, devices: [...devices, newDevice] });
  };

  const removeDevice = (deviceId) => {
    const updated = devices.filter(d => d.id !== deviceId).map(d => ({
      ...d,
      connections: d.connections?.filter(c => c.target_device_id !== deviceId) || [],
    }));
    onChange({ ...topology, devices: updated });
    if (selectedDevice === deviceId) setSelectedDevice(null);
    if (connectingFrom === deviceId) setConnectingFrom(null);
  };

  const updateDevice = (deviceId, updates) => {
    const updated = devices.map(d => d.id === deviceId ? { ...d, ...updates } : d);
    onChange({ ...topology, devices: updated });
  };

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const { source, destination } = result;

    // Dragging from palette
    if (source.droppableId === "palette" && destination.droppableId === "canvas") {
      const deviceType = result.draggableId.replace("palette-", "");
      addDevice(deviceType);
      return;
    }

    // Repositioning device on canvas
    if (source.droppableId === "canvas" && destination.droppableId === "canvas") {
      const canvasEl = canvasRef.current?.getBoundingClientRect();
      if (!canvasEl) return;

      const dx = (destination.droppableId === "canvas" && canvasEl) ? 0 : 150;
      const dy = (result.source.index !== result.destination.index) ? (result.destination.index - result.source.index) * 80 : 0;

      const deviceId = result.draggableId.replace("device-", "");
      const device = devices.find(d => d.id === deviceId);
      if (device) {
        updateDevice(deviceId, {
          position_x: (device.position_x || 200) + dx,
          position_y: (device.position_y || 150) + dy,
        });
      }
    }
  };

  const handleCanvasMouseDown = (e) => {
    if (e.target === canvasRef.current || e.target.classList.contains("canvas-bg")) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleCanvasMouseMove = (e) => {
    if (isPanning) {
      setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
    }
  };

  const handleCanvasMouseUp = () => {
    setIsPanning(false);
  };

  const startConnection = (deviceId) => {
    if (connectingFrom === deviceId) {
      setConnectingFrom(null);
    } else if (connectingFrom) {
      // Create connection
      const fromDevice = devices.find(d => d.id === connectingFrom);
      const toDevice = devices.find(d => d.id === deviceId);
      if (fromDevice && toDevice && fromDevice.id !== toDevice.id) {
        const exists = fromDevice.connections?.some(c => c.target_device_id === toDevice.id);
        if (!exists) {
          updateDevice(connectingFrom, {
            connections: [
              ...(fromDevice.connections || []),
              {
                target_device_id: toDevice.id,
                source_interface: `eth${(fromDevice.connections?.length || 0)}`,
                target_interface: `eth${(toDevice.connections?.length || 0)}`,
                connection_type: "ethernet",
                bandwidth_mbps: 1000,
              },
            ],
          });
          updateDevice(deviceId, {
            connections: [
              ...(toDevice.connections || []),
              {
                target_device_id: fromDevice.id,
                source_interface: `eth${(toDevice.connections?.length || 0)}`,
                target_interface: `eth${(fromDevice.connections?.length || 0)}`,
                connection_type: "ethernet",
                bandwidth_mbps: 1000,
              },
            ],
          });
        }
      }
      setConnectingFrom(null);
    } else {
      setConnectingFrom(deviceId);
    }
  };

  // Draw connection lines
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

        const x1 = (device.position_x || 0) + 60;
        const y1 = (device.position_y || 0) + 30;
        const x2 = (target.position_x || 0) + 60;
        const y2 = (target.position_y || 0) + 30;

        lines.push(
          <line
            key={pairKey}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke={conn.connection_type === "ethernet" ? "#4B5563" : "#DC2626"}
            strokeWidth={2}
            strokeDasharray={conn.connection_type === "wan" ? "5,5" : "none"}
            opacity={0.6}
          />
        );
      });
    });
    return lines;
  };

  const selectedDeviceData = selectedDevice ? devices.find(d => d.id === selectedDevice) : null;

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex h-[550px]">
        {/* Device Palette */}
        <div className="w-48 shrink-0 border-r border-red-900/20 bg-black/20 flex flex-col">
          <div className="p-3 border-b border-red-900/20">
            <p className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Device Palette</p>
          </div>
          <Droppable droppableId="palette" isDropDisabled={true}>
            {(provided) => (
              <div ref={provided.innerRef} {...provided.droppableProps} className="flex-1 overflow-y-auto p-2 space-y-1">
                {DEVICE_PALETTE.map((dev, idx) => (
                  <Draggable key={dev.type} draggableId={`palette-${dev.type}`} index={idx}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        {...provided.dragHandleProps}
                        onClick={() => addDevice(dev.type)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border transition-all cursor-grab active:cursor-grabbing ${
                          snapshot.isDragging ? "bg-red-900/40 border-red-500" : "bg-gray-800/60 border-gray-700 hover:border-red-700/40"
                        }`}
                      >
                        <dev.icon className="h-4 w-4 text-gray-400" />
                        <span className="text-[11px] font-mono text-gray-300">{dev.label}</span>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        {/* Canvas */}
        <div className="flex-1 flex flex-col">
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-3 py-2 border-b border-red-900/20 bg-black/20 shrink-0">
            <button onClick={() => setScale(s => Math.max(0.25, s - 0.25))} className="p-1.5 rounded bg-gray-800 border border-gray-700 text-gray-400 hover:text-white">
              <Minimize2 className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] font-mono text-gray-500">{Math.round(scale * 100)}%</span>
            <button onClick={() => setScale(s => Math.min(2, s + 0.25))} className="p-1.5 rounded bg-gray-800 border border-gray-700 text-gray-400 hover:text-white">
              <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <div className="h-4 w-px bg-gray-700 mx-1" />
            <button
              onClick={() => setConnectingFrom(null)}
              className={`text-[10px] font-mono px-2 py-1 rounded border transition-colors ${
                connectingFrom ? "bg-yellow-900/30 border-yellow-600/60 text-yellow-400" : "bg-gray-800 border-gray-700 text-gray-500"
              }`}
            >
              {connectingFrom ? "Connecting... (click target)" : "Connect Mode"}
            </button>
            <button
              onClick={() => {
                onChange({ ...topology, devices: [], connections: [] });
                setSelectedDevice(null);
                setConnectingFrom(null);
              }}
              className="text-[10px] font-mono px-2 py-1 rounded border border-gray-700 text-gray-500 hover:text-red-400 ml-auto"
            >
              Clear All
            </button>
          </div>

          {/* Canvas Area */}
          <Droppable droppableId="canvas" type="DEVICE">
            {(provided, snapshot) => (
              <div
                ref={(el) => { canvasRef.current = el; provided.innerRef(el); }}
                {...provided.droppableProps}
                className={`canvas-bg flex-1 relative overflow-hidden ${snapshot.isDraggingOver ? "bg-red-950/10" : "bg-[radial-gradient(circle,#1f2937_1px,transparent_1px)] bg-[size:20px_20px]"}`}
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
                onMouseUp={handleCanvasMouseUp}
                onMouseLeave={handleCanvasMouseUp}
                style={{ cursor: isPanning ? "grabbing" : connectingFrom ? "crosshair" : "default" }}
              >
                {/* Connection lines SVG */}
                <svg className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%" }}>
                  <g transform={`translate(${pan.x},${pan.y}) scale(${scale})`}>
                    {renderConnections()}
                  </g>
                </svg>

                {/* Devices layer */}
                <div
                  style={{
                    transform: `translate(${pan.x}px,${pan.y}px) scale(${scale})`,
                    transformOrigin: "0 0",
                  }}
                  className="absolute inset-0"
                >
                  {devices.map((device, idx) => (
                    <Draggable key={device.id} draggableId={`device-${device.id}`} index={idx}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`absolute w-[120px] rounded-xl border-2 transition-all ${
                            TYPE_COLORS[device.type] || TYPE_COLORS.server
                          } ${selectedDevice === device.id ? "ring-2 ring-red-500 ring-offset-2 ring-offset-gray-950" : ""} ${
                            snapshot.isDragging ? "opacity-80 shadow-xl" : ""
                          }`}
                          style={{
                            left: device.position_x || 0,
                            top: device.position_y || 0,
                            ...provided.draggableProps.style,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (connectingFrom) {
                              startConnection(device.id);
                            } else {
                              setSelectedDevice(selectedDevice === device.id ? null : device.id);
                            }
                          }}
                        >
                          <div className="p-2">
                            <div className="flex items-center gap-1.5 mb-1">
                              <div className={`h-1.5 w-1.5 rounded-full ${device.status === "running" ? "bg-green-400" : "bg-gray-500"}`} />
                              <span className="text-[9px] font-mono text-gray-300 truncate">{device.name}</span>
                            </div>
                            <div className="flex items-center gap-1 text-[8px] font-mono text-gray-500">
                              <span>{device.type}</span>
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeDevice(device.id); }}
                            className="absolute -top-2 -right-2 h-5 w-5 rounded-full bg-red-800 border border-red-600 text-red-300 hover:bg-red-700 flex items-center justify-center"
                          >
                            <Trash2 className="h-2.5 w-2.5" />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); startConnection(device.id); }}
                            className={`absolute -bottom-2 -right-2 h-5 w-5 rounded-full border flex items-center justify-center text-[8px] ${
                              connectingFrom === device.id ? "bg-yellow-800 border-yellow-500 text-yellow-300" : "bg-gray-800 border-gray-600 text-gray-400 hover:text-cyan-400"
                            }`}
                          >
                            <GitBranch className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      )}
                    </Draggable>
                  ))}
                </div>
                {provided.placeholder}

                {/* Empty state */}
                {devices.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="text-center">
                      <Server className="h-10 w-10 text-gray-700 mx-auto mb-3" />
                      <p className="text-xs font-mono text-gray-600">Drag devices here or click from the palette</p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </Droppable>
        </div>

        {/* Properties Panel */}
        {selectedDeviceData && (
          <div className="w-60 shrink-0 border-l border-red-900/20 bg-black/20 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xs font-bold text-white font-mono">Properties</h3>
              <button onClick={() => setSelectedDevice(null)} className="text-gray-500 hover:text-white">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-[9px] font-mono text-gray-500 block mb-1">Name</label>
                <input
                  value={selectedDeviceData.name}
                  onChange={(e) => updateDevice(selectedDeviceData.id, { name: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-xs px-2 py-1.5 font-mono"
                />
              </div>
              <div>
                <label className="text-[9px] font-mono text-gray-500 block mb-1">Type</label>
                <select
                  value={selectedDeviceData.type}
                  onChange={(e) => updateDevice(selectedDeviceData.id, { type: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-xs px-2 py-1.5"
                >
                  {DEVICE_PALETTE.map(d => (
                    <option key={d.type} value={d.type}>{d.label}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-mono text-gray-500 block mb-1">CPU</label>
                  <input
                    type="number"
                    value={selectedDeviceData.cpu_cores}
                    onChange={(e) => updateDevice(selectedDeviceData.id, { cpu_cores: parseInt(e.target.value) || 2 })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-xs px-2 py-1.5 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono text-gray-500 block mb-1">RAM (MB)</label>
                  <input
                    type="number"
                    value={selectedDeviceData.ram_mb}
                    onChange={(e) => updateDevice(selectedDeviceData.id, { ram_mb: parseInt(e.target.value) || 4096 })}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-xs px-2 py-1.5 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="text-[9px] font-mono text-gray-500 block mb-1">Storage (GB)</label>
                <input
                  type="number"
                  value={selectedDeviceData.storage_gb}
                  onChange={(e) => updateDevice(selectedDeviceData.id, { storage_gb: parseInt(e.target.value) || 20 })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-xs px-2 py-1.5 font-mono"
                />
              </div>
              <div>
                <label className="text-[9px] font-mono text-gray-500 block mb-1">Access Method</label>
                <select
                  value={selectedDeviceData.access_method || "ssh"}
                  onChange={(e) => updateDevice(selectedDeviceData.id, { access_method: e.target.value })}
                  className="w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-xs px-2 py-1.5"
                >
                  <option value="ssh">SSH</option>
                  <option value="rdp">RDP</option>
                  <option value="novnc">noVNC</option>
                  <option value="web_terminal">Web Terminal</option>
                  <option value="serial_console">Serial Console</option>
                </select>
              </div>
              {/* Connections list */}
              {(selectedDeviceData.connections || []).length > 0 && (
                <div>
                  <label className="text-[9px] font-mono text-gray-500 block mb-1">
                    Connections ({selectedDeviceData.connections.length})
                  </label>
                  <div className="space-y-1">
                    {selectedDeviceData.connections.map((conn, i) => {
                      const target = devices.find(d => d.id === conn.target_device_id);
                      return (
                        <div key={i} className="flex items-center gap-1 text-[9px] font-mono text-gray-400 bg-gray-800/50 rounded px-2 py-1">
                          <GitBranch className="h-2.5 w-2.5 text-cyan-400 shrink-0" />
                          <span className="truncate">{target?.name || conn.target_device_id}</span>
                        </div>
                      );
                    })}
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