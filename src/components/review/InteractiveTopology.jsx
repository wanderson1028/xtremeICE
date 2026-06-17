import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Maximize2, Plus, Trash2, Save, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

const COLORS = {
  internet: "#7ecef4",
  firewall: "#ef4444",
  router: "#3b82f6",
  switch: "#22d3ee",
  server: "#8b5cf6",
  loadbalancer: "#f59e0b",
  wireless: "#10b981",
  workstation: "#64748b",
  phone: "#6b7280",
};

const TEAM_COLORS = {
  red: "#ef4444",
  blue: "#3b82f6",
  white: "#e2e8f0",
};

const TYPE_ICONS = {
  internet: "☁",
  firewall: "🔥",
  router: "⬡",
  switch: "▬",
  server: "▪",
  loadbalancer: "⚖",
  wireless: "◉",
  workstation: "□",
  phone: "◈",
};

const NODE_TYPES = Object.keys(COLORS);

function buildInitialTopology(design, ingressPoints = []) {
  const nodes = [];
  const links = [];
  let id = 0;

  const mk = (type, label, x, y) => {
    const n = { id: `n${id++}`, type, label, x, y };
    nodes.push(n);
    return n.id;
  };

  // Helper: tag a node with team color if an ingress point matches its label
  const tagIngress = (nodeId, label) => {
    const match = ingressPoints.find(p =>
      p.system && label && label.toLowerCase().includes(p.system.toLowerCase().split(/[\s\-\.]/)[0])
    );
    if (match) {
      const node = nodes.find(n => n.id === nodeId);
      if (node) {
        node.teamColor = TEAM_COLORS[match.team] || null;
        node.ingressLabel = `${match.team.toUpperCase()}: ${match.role}`;
        node.ingressIP = match.ip;
      }
    }
  };

  const COL_W = 140;
  const ROW_H = 100;

  const inetId = mk("internet", "Internet", 0, 0);
  tagIngress(inetId, "Internet");

  let prevId = inetId;
  if (design.firewall_enabled) {
    const fwLabel = design.firewall_vendor || "Firewall";
    const fwId = mk("firewall", fwLabel, 0, ROW_H);
    links.push({ id: `l${links.length}`, from: inetId, to: fwId });
    tagIngress(fwId, fwLabel);
    prevId = fwId;
  }

  const coreId = mk("router", "Core Router", 0, ROW_H * 2);
  links.push({ id: `l${links.length}`, from: prevId, to: coreId });
  tagIngress(coreId, "Core Router");

  let coreSw;
  let coreSwX = 0;
  if (design.load_balancer) {
    const lbId = mk("loadbalancer", "Load Balancer", -COL_W, ROW_H * 3);
    links.push({ id: `l${links.length}`, from: coreId, to: lbId });
    tagIngress(lbId, "Load Balancer");
    coreSw = mk("switch", "Core Switch", COL_W * 0.5, ROW_H * 3);
    coreSwX = COL_W * 0.5;
    links.push({ id: `l${links.length}`, from: coreId, to: coreSw });
    tagIngress(coreSw, "Core Switch");
  } else {
    coreSw = mk("switch", "Core Switch", 0, ROW_H * 3);
    links.push({ id: `l${links.length}`, from: coreId, to: coreSw });
    tagIngress(coreSw, "Core Switch");
  }

  if (design.server_farm) {
    const srvX = design.load_balancer ? COL_W * 0.5 : 0;
    const srvLabel = `Servers (${design.num_servers || 1})`;
    const srvId = mk("server", srvLabel, srvX, ROW_H * 4);
    links.push({ id: `l${links.length}`, from: coreSw, to: srvId });
    tagIngress(srvId, "Server");
  }

  const sites = design.site_names?.filter(Boolean).length
    ? design.site_names.filter(Boolean)
    : Array.from({ length: design.num_sites || 1 }, (_, i) => `Site-${i + 1}`);

  const siteRow = (design.server_farm ? 5 : 4) * ROW_H;
  const totalCols = sites.length;
  const startX = -((totalCols - 1) / 2) * COL_W;

  sites.forEach((site, i) => {
    const sx = startX + i * COL_W;
    const rtrId = mk("router", `${site} Rtr`, sx, siteRow);
    links.push({ id: `l${links.length}`, from: coreSw, to: rtrId });
    tagIngress(rtrId, site);
    const swId = mk("switch", `${site} SW`, sx, siteRow + ROW_H);
    links.push({ id: `l${links.length}`, from: rtrId, to: swId });
    tagIngress(swId, site);

    if (design.wireless_enabled) {
      const wapId = mk("wireless", "WAP", sx - 50, siteRow + ROW_H * 2);
      links.push({ id: `l${links.length}`, from: swId, to: wapId });
      tagIngress(wapId, "WAP");
    }

    const devTypes = design.user_device_types || [];
    const hasPhones = devTypes.some(d => /phone|voip/i.test(d));
    const udId = mk(hasPhones ? "phone" : "workstation", "Users", sx + (design.wireless_enabled ? 50 : 0), siteRow + ROW_H * 2);
    links.push({ id: `l${links.length}`, from: swId, to: udId });
    tagIngress(udId, "Users");
  });

  // Shift all nodes so min x/y = 80
  const minX = Math.min(...nodes.map(n => n.x));
  const minY = Math.min(...nodes.map(n => n.y));
  nodes.forEach(n => { n.x -= minX - 80; n.y -= minY - 60; });

  return { nodes, links };
}

export default function InteractiveTopology({ design, onSaveTopology, readOnly = false, ingressPoints = [] }) {
  const navigate = useNavigate();
  const svgRef = useRef(null);
  const containerRef = useRef(null);

  const initial = useMemo(() => buildInitialTopology(design, ingressPoints), [design.id]);

  const [nodes, setNodes] = useState(initial.nodes);
  const [links, setLinks] = useState(initial.links);
  const [dragging, setDragging] = useState(null); // { nodeId, offsetX, offsetY }
  const [linking, setLinking] = useState(null);   // nodeId being linked from
  const [selected, setSelected] = useState(null); // selected node id
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [panDragging, setPanDragging] = useState(null);

  // Center the diagram inside the container whenever nodes change from a reset/init
  const centerDiagram = useCallback((nodeList) => {
    if (!nodeList || nodeList.length === 0) return;
    const W = containerRef.current?.clientWidth || 800;
    const H = 480;
    const minX = Math.min(...nodeList.map(n => n.x));
    const maxX = Math.max(...nodeList.map(n => n.x));
    const minY = Math.min(...nodeList.map(n => n.y));
    const maxY = Math.max(...nodeList.map(n => n.y));
    const cW = Math.max(maxX - minX + 80, 1);
    const cH = Math.max(maxY - minY + 80, 1);
    const newZoom = Math.max(0.35, Math.min(1.2, Math.min((W - 60) / cW, (H - 60) / cH)));
    setPan({
      x: Math.round(W / 2 - (minX + (maxX - minX) / 2) * newZoom),
      y: Math.round(H / 2 - (minY + (maxY - minY) / 2) * newZoom),
    });
    setZoom(newZoom);
  }, []);
  const [addType, setAddType] = useState("router");
  const [dirty, setDirty] = useState(false);

  // Reset when design changes — also re-center
  useEffect(() => {
    const t = buildInitialTopology(design, ingressPoints);
    setNodes(t.nodes);
    setLinks(t.links);
    setDirty(false);
    setSelected(null);
    // Delay centering until the container has rendered
    setTimeout(() => centerDiagram(t.nodes), 50);
  }, [design.id]);

  const svgPoint = useCallback((e) => {
    const rect = svgRef.current.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - pan.x) / zoom,
      y: (e.clientY - rect.top - pan.y) / zoom,
    };
  }, [zoom, pan]);

  // --- Drag nodes ---
  const onNodeMouseDown = useCallback((e, nodeId) => {
    if (readOnly) return;
    e.stopPropagation();
    if (linking) {
      // complete a link
      if (linking !== nodeId) {
        setLinks(ls => [...ls, { id: `l${Date.now()}`, from: linking, to: nodeId }]);
        setDirty(true);
      }
      setLinking(null);
      return;
    }
    setSelected(nodeId);
    const pt = svgPoint(e);
    const node = nodes.find(n => n.id === nodeId);
    setDragging({ nodeId, offsetX: pt.x - node.x, offsetY: pt.y - node.y });
  }, [linking, nodes, svgPoint, readOnly]);

  const onSvgMouseMove = useCallback((e) => {
    if (dragging) {
      const pt = svgPoint(e);
      setNodes(ns => ns.map(n =>
        n.id === dragging.nodeId
          ? { ...n, x: pt.x - dragging.offsetX, y: pt.y - dragging.offsetY }
          : n
      ));
      setDirty(true);
    } else if (panDragging) {
      setPan(p => ({
        x: p.x + (e.clientX - panDragging.x),
        y: p.y + (e.clientY - panDragging.y),
      }));
      setPanDragging({ x: e.clientX, y: e.clientY });
    }
  }, [dragging, panDragging, svgPoint]);

  const onSvgMouseUp = useCallback(() => {
    setDragging(null);
    setPanDragging(null);
  }, []);

  const onSvgMouseDown = useCallback((e) => {
    if (e.target === svgRef.current || e.target.tagName === "rect") {
      setSelected(null);
      setLinking(null);
      if (!dragging) setPanDragging({ x: e.clientX, y: e.clientY });
    }
  }, [dragging]);

  // --- Add node ---
  const addNode = () => {
    const cx = (300 - pan.x) / zoom;
    const cy = (200 - pan.y) / zoom;
    const newNode = { id: `n${Date.now()}`, type: addType, label: addType.charAt(0).toUpperCase() + addType.slice(1), x: cx, y: cy };
    setNodes(ns => [...ns, newNode]);
    setDirty(true);
  };

  // --- Delete selected ---
  const deleteSelected = () => {
    if (!selected) return;
    setNodes(ns => ns.filter(n => n.id !== selected));
    setLinks(ls => ls.filter(l => l.from !== selected && l.to !== selected));
    setSelected(null);
    setDirty(true);
  };

  // --- Delete a link ---
  const deleteLink = (linkId) => {
    setLinks(ls => ls.filter(l => l.id !== linkId));
    setDirty(true);
  };

  // --- Save ---
  const handleSave = () => {
    if (onSaveTopology) {
      onSaveTopology({ diagram_data: JSON.stringify({ nodes, links }) });
      setDirty(false);
    }
  };

  // --- Reset ---
  const handleReset = () => {
    const t = buildInitialTopology(design, ingressPoints);
    setNodes(t.nodes);
    setLinks(t.links);
    setDirty(false);
    setSelected(null);
    setTimeout(() => centerDiagram(t.nodes), 50);
  };

  // Zoom with wheel
  const onWheel = (e) => {
    e.preventDefault();
    setZoom(z => Math.min(3, Math.max(0.3, z - e.deltaY * 0.001)));
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const nodeById = Object.fromEntries(nodes.map(n => [n.id, n]));

  // Canvas size
  const maxX = Math.max(...nodes.map(n => n.x), 400) + 100;
  const maxY = Math.max(...nodes.map(n => n.y), 300) + 100;

  const selectedNode = nodes.find(n => n.id === selected);

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-secondary/30 flex-wrap gap-2">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Interactive Topology Editor</h3>
          <p className="text-xs text-muted-foreground">Drag nodes to reposition • Click node then click another to link</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {!readOnly && (
            <>
              <select
                value={addType}
                onChange={e => setAddType(e.target.value)}
                className="text-xs bg-secondary border border-border rounded px-2 py-1 text-foreground"
              >
                {NODE_TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
              <Button size="sm" variant="outline" onClick={addNode} className="gap-1 h-7 text-xs">
                <Plus className="h-3 w-3" /> Add Node
              </Button>
              {selected && (
                <Button size="sm" variant="outline" onClick={() => setLinking(selected)} className={`gap-1 h-7 text-xs ${linking === selected ? "border-primary text-primary" : ""}`}>
                  {linking === selected ? "Click target…" : "Link Node"}
                </Button>
              )}
              {selected && (
                <Button size="sm" variant="destructive" onClick={deleteSelected} className="gap-1 h-7 text-xs">
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
              <Button size="sm" variant="outline" onClick={handleReset} className="gap-1 h-7 text-xs">
                <RotateCcw className="h-3 w-3" />
              </Button>
              {dirty && (
                <Button size="sm" onClick={handleSave} className="gap-1 h-7 text-xs bg-primary text-primary-foreground">
                  <Save className="h-3 w-3" /> Save
                </Button>
              )}
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="h-7 w-7 p-0"><ZoomIn className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={() => setZoom(z => Math.max(0.3, z - 0.2))} className="h-7 w-7 p-0"><ZoomOut className="h-3.5 w-3.5" /></Button>
          <Button size="sm" variant="ghost" onClick={() => centerDiagram(nodes)} className="h-7 text-xs px-2">Fit</Button>
          <Button size="sm" onClick={() => navigate(createPageUrl(`DiagramPreview?id=${design.id}`))} className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 h-7 text-xs">
            <Maximize2 className="h-3.5 w-3.5" /> Full Diagram
          </Button>
        </div>
      </div>

      {/* SVG Canvas */}
      <div ref={containerRef} className="overflow-hidden bg-[#0b1120] relative" style={{ height: 480, cursor: panDragging ? "grabbing" : (linking ? "crosshair" : "default") }}>
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          onMouseDown={onSvgMouseDown}
          onMouseMove={onSvgMouseMove}
          onMouseUp={onSvgMouseUp}
          onMouseLeave={onSvgMouseUp}
          style={{ userSelect: "none" }}
        >
          <defs>
            <pattern id="itgrid" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.8" fill="rgba(148,163,184,0.08)" />
            </pattern>
            <marker id="arrowhead" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
              <path d="M0,0 L0,6 L6,3 z" fill="rgba(148,163,184,0.5)" />
            </marker>
          </defs>
          <rect width="100%" height="100%" fill="url(#itgrid)" />

          <g transform={`translate(${pan.x},${pan.y}) scale(${zoom})`}>
            {/* Links */}
            {links.map((link) => {
              const from = nodeById[link.from];
              const to = nodeById[link.to];
              if (!from || !to) return null;
              const mx = (from.x + to.x) / 2;
              const my = (from.y + to.y) / 2;
              const isWan = from.type === "router" || to.type === "router";
              return (
                <g key={link.id}>
                  <line
                    x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                    stroke={isWan ? "rgba(99,102,241,0.7)" : "rgba(148,163,184,0.4)"}
                    strokeWidth={isWan ? 2 : 1.5}
                    markerEnd="url(#arrowhead)"
                  />
                  {!readOnly && (
                    <circle
                      cx={mx} cy={my} r={6}
                      fill="rgba(239,68,68,0.0)"
                      stroke="rgba(239,68,68,0.0)"
                      style={{ cursor: "pointer" }}
                      onMouseEnter={e => { e.target.setAttribute("fill", "rgba(239,68,68,0.3)"); e.target.setAttribute("stroke", "rgba(239,68,68,0.7)"); }}
                      onMouseLeave={e => { e.target.setAttribute("fill", "rgba(239,68,68,0.0)"); e.target.setAttribute("stroke", "rgba(239,68,68,0.0)"); }}
                      onClick={(e) => { e.stopPropagation(); deleteLink(link.id); }}
                    />
                  )}
                </g>
              );
            })}

            {/* Live link line while linking */}
            {linking && (() => {
              const fromNode = nodeById[linking];
              if (!fromNode) return null;
              return (
                <line
                  x1={fromNode.x} y1={fromNode.y}
                  x2={fromNode.x + 40} y2={fromNode.y + 40}
                  stroke="rgba(99,102,241,0.5)"
                  strokeWidth={1.5}
                  strokeDasharray="5,4"
                />
              );
            })()}

            {/* Nodes */}
            {nodes.map(node => {
              const color = COLORS[node.type] || "#94a3b8";
              const icon = TYPE_ICONS[node.type] || "○";
              const isSelected = selected === node.id;
              const isLinkSource = linking === node.id;
              const teamColor = node.teamColor || null;
              return (
                <g
                  key={node.id}
                  transform={`translate(${node.x},${node.y})`}
                  onMouseDown={e => onNodeMouseDown(e, node.id)}
                  style={{ cursor: readOnly ? "default" : (dragging?.nodeId === node.id ? "grabbing" : "grab") }}
                >
                  {/* Team color outer ring */}
                  {teamColor && (
                    <circle cx={0} cy={0} r={26} fill={teamColor + "22"} stroke={teamColor} strokeWidth={2.5} opacity={0.85} />
                  )}
                  {/* Selection ring */}
                  {(isSelected || isLinkSource) && (
                    <circle cx={0} cy={0} r={24} fill="none" stroke={isLinkSource ? "#f59e0b" : "#6366f1"} strokeWidth={2} strokeDasharray="4,3" opacity={0.8} />
                  )}
                  {/* Glow */}
                  <circle cx={0} cy={0} r={20} fill={teamColor || color} opacity={0.1} />
                  {/* Main circle */}
                  <circle
                    cx={0} cy={0} r={17}
                    fill={(teamColor || color) + "22"}
                    stroke={isSelected ? "#6366f1" : (teamColor || color)}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />
                  {/* Icon */}
                  <text x={0} y={1} textAnchor="middle" dominantBaseline="middle" fontSize={12} fill={teamColor || color}>
                    {icon}
                  </text>
                  {/* Label */}
                  {node.label.split("\n").map((line, li) => (
                    <text key={li} x={0} y={26 + li * 12} textAnchor="middle" fontSize={9} fill="#94a3b8" style={{ fontFamily: "Inter, sans-serif" }}>
                      {line}
                    </text>
                  ))}
                  {/* Ingress badge */}
                  {node.ingressLabel && (
                    <g transform={`translate(14, -18)`}>
                      <rect x={-2} y={-8} width={node.ingressLabel.length * 4.5 + 4} height={10} rx={3} fill={teamColor || "#6366f1"} opacity={0.9} />
                      <text x={(node.ingressLabel.length * 4.5) / 2} y={-1} textAnchor="middle" fontSize={6.5} fill="white" fontWeight="bold">
                        {node.ingressLabel}
                      </text>
                      {node.ingressIP && (
                        <>
                          <rect x={-2} y={3} width={node.ingressIP.length * 4 + 4} height={9} rx={3} fill="rgba(0,0,0,0.6)" />
                          <text x={(node.ingressIP.length * 4) / 2} y={10} textAnchor="middle" fontSize={6} fill="#94a3b8" fontFamily="monospace">
                            {node.ingressIP}
                          </text>
                        </>
                      )}
                    </g>
                  )}
                </g>
              );
            })}
          </g>
        </svg>

        {/* Node label editor */}
        {!readOnly && selectedNode && (
          <div className="absolute bottom-3 left-3 bg-card border border-border rounded-lg px-3 py-2 flex items-center gap-2 shadow-lg text-xs">
            <span className="text-muted-foreground">Label:</span>
            <input
              value={selectedNode.label}
              onChange={e => {
                setNodes(ns => ns.map(n => n.id === selectedNode.id ? { ...n, label: e.target.value } : n));
                setDirty(true);
              }}
              className="bg-secondary border border-border rounded px-2 py-0.5 text-foreground text-xs w-32 focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <span className="text-muted-foreground capitalize">{selectedNode.type}</span>
          </div>
        )}

        {/* Zoom indicator */}
        <div className="absolute bottom-3 right-3 text-[10px] text-muted-foreground bg-black/40 px-2 py-1 rounded">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* Legend */}
      <div className="px-5 py-3 border-t border-border flex flex-wrap gap-x-5 gap-y-1.5">
        {Object.entries(COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <svg width={10} height={10}><circle cx={5} cy={5} r={4} fill={color} opacity={0.7} /></svg>
            <span className="capitalize">{type}</span>
          </div>
        ))}
        {ingressPoints.length > 0 && (
          <>
            <div className="w-px bg-border mx-1" />
            {Object.entries(TEAM_COLORS).map(([team, color]) => (
              <div key={team} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <svg width={10} height={10}><circle cx={5} cy={5} r={4} fill={color} opacity={0.8} /></svg>
                <span className="capitalize font-semibold">{team} ingress</span>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}