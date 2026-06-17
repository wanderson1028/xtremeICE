import React, { useRef, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Maximize2 } from "lucide-react";

// Build a simplified node/link list from design data
function buildTopology(design) {
  const nodes = [];
  const links = [];
  let id = 0;

  const mk = (type, label, col, row) => {
    const n = { id: id++, type, label, col, row };
    nodes.push(n);
    return n.id;
  };

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

  const TYPE_ICONS = {
    internet: "☁",
    firewall: "🔥",
    router: "⬡",
    switch: "▬",
    server: "▪",
    loadbalancer: "⬡",
    wireless: "◉",
    workstation: "□",
    phone: "◈",
  };

  // Layer 0: Internet
  const inetId = mk("internet", "Internet", 0, 0);

  // Layer 1: Firewall
  let prevId = inetId;
  if (design.firewall_enabled) {
    const fwId = mk("firewall", design.firewall_vendor || "Firewall", 0, 1);
    links.push({ from: inetId, to: fwId });
    prevId = fwId;
  }

  // Layer 2: Core Router
  const coreId = mk("router", "Core Rtr", 0, 2);
  links.push({ from: prevId, to: coreId });

  // Layer 3: Load Balancer + Core Switch
  let coreSw;
  if (design.load_balancer) {
    const lbId = mk("loadbalancer", "Load Bal.", -1, 3);
    links.push({ from: coreId, to: lbId });
    coreSw = mk("switch", "Core SW", 1, 3);
    links.push({ from: coreId, to: coreSw });
  } else {
    coreSw = mk("switch", "Core SW", 0, 3);
    links.push({ from: coreId, to: coreSw });
  }

  // Layer 4: Server Farm
  if (design.server_farm) {
    const srvId = mk("server", "Servers", design.load_balancer ? 1 : 0, 4);
    links.push({ from: coreSw, to: srvId });
  }

  // Sites
  const sites = design.site_names?.filter(Boolean).length
    ? design.site_names.filter(Boolean)
    : Array.from({ length: design.num_sites || 1 }, (_, i) => `Site-${i + 1}`);

  const siteRow = design.server_farm ? 5 : 4;
  const totalCols = sites.length;
  const startCol = -(totalCols - 1) / 2;

  sites.forEach((site, i) => {
    const col = startCol + i;
    const rtrId = mk("router", `${site}\nRtr`, col, siteRow);
    links.push({ from: coreSw, to: rtrId });
    const swId = mk("switch", `${site} SW`, col, siteRow + 1);
    links.push({ from: rtrId, to: swId });

    if (design.wireless_enabled) {
      const wapId = mk("wireless", "WAP", col - 0.4, siteRow + 2);
      links.push({ from: swId, to: wapId });
    }

    const devTypes = design.user_device_types || [];
    const hasPhones = devTypes.some(d => /phone|voip/i.test(d));
    const udId = mk(hasPhones ? "phone" : "workstation", "Users", col + (design.wireless_enabled ? 0.4 : 0), siteRow + 2);
    links.push({ from: swId, to: udId });
  });

  // Layout: assign x, y from col, row using a grid
  const COL_W = 130;
  const ROW_H = 90;
  const allCols = nodes.map(n => n.col);
  const minCol = Math.min(...allCols);
  const maxCol = Math.max(...allCols);
  const allRows = nodes.map(n => n.row);
  const maxRow = Math.max(...allRows);

  const canvasW = (maxCol - minCol + 1) * COL_W + 100;
  const canvasH = (maxRow + 1) * ROW_H + 60;

  nodes.forEach(n => {
    n.x = (n.col - minCol) * COL_W + 60;
    n.y = n.row * ROW_H + 45;
  });

  return { nodes, links, canvasW, canvasH, COLORS, TYPE_ICONS };
}

export default function TopologyMiniMap({ design }) {
  const navigate = useNavigate();
  const svgRef = useRef(null);

  const { nodes, links, canvasW, canvasH, COLORS, TYPE_ICONS } = useMemo(
    () => buildTopology(design),
    [design]
  );

  const nodeById = Object.fromEntries(nodes.map(n => [n.id, n]));

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-secondary/30">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Topology Preview</h3>
          <p className="text-xs text-muted-foreground">Live view generated from design parameters</p>
        </div>
        <Button
          size="sm"
          onClick={() => navigate(createPageUrl(`DiagramPreview?id=${design.id}`))}
          className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Maximize2 className="h-3.5 w-3.5" /> Open Full Diagram
        </Button>
      </div>

      <div className="overflow-auto bg-[#0b1120] p-2" style={{ maxHeight: 480 }}>
        <svg
          ref={svgRef}
          width={canvasW}
          height={canvasH}
          style={{ minWidth: "100%", display: "block" }}
        >
          {/* Grid dots */}
          <defs>
            <pattern id="grid" width="30" height="30" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.8" fill="rgba(148,163,184,0.08)" />
            </pattern>
          </defs>
          <rect width={canvasW} height={canvasH} fill="url(#grid)" />

          {/* Links */}
          {links.map((link, i) => {
            const from = nodeById[link.from];
            const to = nodeById[link.to];
            if (!from || !to) return null;
            const isWan = (from.type === "router" || to.type === "router") && from.row !== to.row;
            return (
              <g key={i}>
                <line
                  x1={from.x} y1={from.y}
                  x2={to.x} y2={to.y}
                  stroke={isWan ? "rgba(99,102,241,0.7)" : "rgba(148,163,184,0.4)"}
                  strokeWidth={isWan ? 2 : 1.5}
                  strokeDasharray={isWan ? "none" : "none"}
                />
              </g>
            );
          })}

          {/* Nodes */}
          {nodes.map(node => {
            const color = COLORS[node.type] || "#94a3b8";
            const icon = TYPE_ICONS[node.type] || "○";
            const labelLines = node.label.split("\n");
            return (
              <g key={node.id} transform={`translate(${node.x},${node.y})`}>
                {/* Glow */}
                <circle cx={0} cy={0} r={20} fill={color} opacity={0.08} />
                {/* Node circle */}
                <circle
                  cx={0} cy={0} r={16}
                  fill={color + "22"}
                  stroke={color}
                  strokeWidth={1.5}
                />
                {/* Icon */}
                <text
                  x={0} y={1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={12}
                  fill={color}
                >
                  {icon}
                </text>
                {/* Labels */}
                {labelLines.map((line, li) => (
                  <text
                    key={li}
                    x={0}
                    y={24 + li * 12}
                    textAnchor="middle"
                    fontSize={9}
                    fill="#94a3b8"
                    style={{ fontFamily: "Inter, sans-serif" }}
                  >
                    {line}
                  </text>
                ))}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="px-5 py-3 border-t border-border flex flex-wrap gap-x-5 gap-y-1.5">
        {Object.entries(COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <svg width={10} height={10}><circle cx={5} cy={5} r={4} fill={color} opacity={0.7} /></svg>
            <span className="capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}