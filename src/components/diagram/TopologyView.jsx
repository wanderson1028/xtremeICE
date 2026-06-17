import React, { useState, useRef, useCallback, useEffect } from "react";

// Derive groups from diagram nodes
function buildGroups(diagramData, design) {
  if (!diagramData) return [];

  const { nodes, links } = diagramData;

  const coreTypes = ["internet", "firewall", "router", "switch", "loadbalancer"];
  const isCoreNode = (n) =>
    coreTypes.includes(n.type) &&
    !n.label.match(/Site|HQ|Branch|Rtr|SW$/i);

  // Core / Data Center group
  const coreNodes = nodes.filter(n => isCoreNode(n));
  const serverFarmNodes = nodes.filter(n => n.type === "server" || n.label.includes("Server"));
  const dmzNodes = nodes.filter(n => n.label.toLowerCase().includes("dmz"));

  const groups = [];

  if (coreNodes.length) {
    groups.push({
      id: "core",
      label: "Core Network",
      sublabel: "Internet · Firewall · Core Router",
      color: "#0ea5e9",
      bgColor: "rgba(14,165,233,0.08)",
      borderColor: "rgba(14,165,233,0.4)",
      nodes: coreNodes,
      icon: "🌐",
    });
  }

  if (serverFarmNodes.length) {
    groups.push({
      id: "dc",
      label: "Data Center",
      sublabel: `${serverFarmNodes.length} server${serverFarmNodes.length > 1 ? "s" : ""}`,
      color: "#a855f7",
      bgColor: "rgba(168,85,247,0.08)",
      borderColor: "rgba(168,85,247,0.4)",
      nodes: serverFarmNodes,
      icon: "🖥️",
    });
  }

  if (dmzNodes.length) {
    groups.push({
      id: "dmz",
      label: "DMZ",
      sublabel: "Demilitarized Zone",
      color: "#f43f5e",
      bgColor: "rgba(244,63,94,0.08)",
      borderColor: "rgba(244,63,94,0.4)",
      nodes: dmzNodes,
      icon: "🔒",
    });
  }

  // Site groups
  const sites = design?.site_names?.filter(Boolean).length > 0
    ? design.site_names.filter(Boolean)
    : Array.from({ length: design?.num_sites || 1 }, (_, i) => `Site-${i + 1}`);

  const siteColors = ["#22d3ee", "#10b981", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];

  sites.forEach((site, i) => {
    const siteNodes = nodes.filter(n =>
      n.label.includes(site) || n.label.startsWith(site)
    );
    if (!siteNodes.length) return;

    const deviceCount = siteNodes.length;
    const hasWap = siteNodes.some(n => n.type === "wireless");
    const hasPhone = siteNodes.some(n => n.type === "phone");
    const workstations = siteNodes.filter(n => n.type === "workstation");
    const windowsPCs = workstations.filter(n => /win/i.test(n.label));
    const linuxPCs = workstations.filter(n => /linux|ubuntu|debian|centos|fedora/i.test(n.label));
    const otherPCs = workstations.filter(n => !(/win/i.test(n.label)) && !(/linux|ubuntu|debian|centos|fedora/i.test(n.label)));

    const pcSummary = [
      windowsPCs.length ? `${windowsPCs.length} Win` : null,
      linuxPCs.length ? `${linuxPCs.length} Linux` : null,
      otherPCs.length ? `${otherPCs.length} PC` : null,
    ].filter(Boolean).join(" · ") || (workstations.length ? `${workstations.length} PC` : null);

    const deviceSummary = [
      pcSummary,
      hasPhone ? `${siteNodes.filter(n => n.type === "phone").length} Phone` : null,
      hasWap ? "WiFi" : null,
    ].filter(Boolean).join(" · ");

    groups.push({
      id: `site-${i}`,
      label: site,
      sublabel: deviceSummary || `${deviceCount} devices`,
      color: siteColors[i % siteColors.length],
      bgColor: `rgba(${hexToRgb(siteColors[i % siteColors.length])},0.08)`,
      borderColor: `rgba(${hexToRgb(siteColors[i % siteColors.length])},0.4)`,
      nodes: siteNodes,
      icon: "🏢",
    });
  });

  return groups;
}

function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return "100,100,100";
  return `${parseInt(result[1], 16)},${parseInt(result[2], 16)},${parseInt(result[3], 16)}`;
}

function buildGroupLinks(groups, diagramData) {
  if (!diagramData || !groups.length) return [];
  const { links } = diagramData;
  const groupLinks = [];
  const seen = new Set();

  links.forEach(link => {
    let fromGroup = null, toGroup = null;
    groups.forEach(g => {
      if (g.nodes.find(n => n.id === link.from)) fromGroup = g.id;
      if (g.nodes.find(n => n.id === link.to)) toGroup = g.id;
    });
    if (fromGroup && toGroup && fromGroup !== toGroup) {
      const key = [fromGroup, toGroup].sort().join("--");
      if (!seen.has(key)) {
        seen.add(key);
        groupLinks.push({ from: fromGroup, to: toGroup, label: link.label || "", wan: link.wan });
      }
    }
  });
  return groupLinks;
}

const CARD_W = 180;
const CARD_H = 100;

function getInitialPositions(groups, containerW, containerH) {
  const cols = Math.ceil(Math.sqrt(groups.length));
  const spacingX = Math.max(220, containerW / (cols + 1));
  const spacingY = Math.max(160, containerH / (Math.ceil(groups.length / cols) + 1));
  const positions = {};
  groups.forEach((g, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    positions[g.id] = {
      x: spacingX * (col + 0.5) + (containerW - spacingX * cols) / 2,
      y: 80 + row * spacingY,
    };
  });
  return positions;
}

export default function TopologyView({ diagramData, design }) {
  const containerRef = useRef(null);
  const [containerSize, setContainerSize] = useState({ w: 900, h: 560 });
  const [positions, setPositions] = useState(null);
  const [dragging, setDragging] = useState(null); // { groupId, offsetX, offsetY }
  const dragRef = useRef(null);

  const groups = buildGroups(diagramData, design);
  const groupLinks = buildGroupLinks(groups, diagramData);

  useEffect(() => {
    if (!containerRef.current) return;
    const { width, height } = containerRef.current.getBoundingClientRect();
    const size = { w: width || 900, h: height || 560 };
    setContainerSize(size);
    setPositions(getInitialPositions(groups, size.w, size.h));
  }, [diagramData]);

  useEffect(() => {
    const ro = new ResizeObserver(entries => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ w: width, h: height });
      }
    });
    if (containerRef.current) ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const handleMouseDown = (e, groupId) => {
    e.preventDefault();
    const pos = positions[groupId];
    const containerRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;
    dragRef.current = {
      groupId,
      offsetX: mouseX - pos.x,
      offsetY: mouseY - pos.y,
    };
    setDragging(groupId);
  };

  const handleMouseMove = useCallback((e) => {
    if (!dragRef.current) return;
    const { groupId, offsetX, offsetY } = dragRef.current;
    const containerRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    setPositions(prev => ({
      ...prev,
      [groupId]: {
        x: e.clientX - containerRect.left - offsetX,
        y: e.clientY - containerRect.top - offsetY,
      },
    }));
  }, []);

  const handleMouseUp = useCallback(() => {
    dragRef.current = null;
    setDragging(null);
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  if (!positions || !groups.length) {
    return (
      <div className="w-full rounded-xl border border-border flex items-center justify-center" style={{ minHeight: 500, background: "#0b1120" }}>
        <p className="text-muted-foreground text-sm">No topology data available.</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="w-full rounded-xl border border-border relative overflow-hidden select-none"
      style={{ minHeight: 560, background: "#0b1120" }}
    >
      {/* Dot grid */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id="topo-dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="1" cy="1" r="1" fill="rgba(148,163,184,0.06)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#topo-dots)" />

        {/* Group links */}
        {groupLinks.map((link, i) => {
          const fromPos = positions[link.from];
          const toPos = positions[link.to];
          if (!fromPos || !toPos) return null;
          const x1 = fromPos.x + CARD_W / 2;
          const y1 = fromPos.y + CARD_H / 2;
          const x2 = toPos.x + CARD_W / 2;
          const y2 = toPos.y + CARD_H / 2;
          const mx = (x1 + x2) / 2;
          const my = (y1 + y2) / 2;
          const isWan = link.wan;
          const strokeColor = isWan ? "rgba(99,102,241,0.7)" : "rgba(148,163,184,0.35)";
          const dash = link.label === "HA" ? "6,3" : isWan ? "none" : "none";

          return (
            <g key={i}>
              <line
                x1={x1} y1={y1} x2={x2} y2={y2}
                stroke={strokeColor}
                strokeWidth={isWan ? 2 : 1.5}
                strokeDasharray={dash}
              />
              {link.label && (
                <text
                  x={mx} y={my - 8}
                  fill="rgba(148,163,184,0.8)"
                  fontSize="10"
                  textAnchor="middle"
                  fontFamily="Inter, sans-serif"
                >
                  {link.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Group cards */}
      {groups.map(group => {
        const pos = positions[group.id];
        if (!pos) return null;
        const isDraggingThis = dragging === group.id;

        return (
          <div
            key={group.id}
            onMouseDown={(e) => handleMouseDown(e, group.id)}
            style={{
              position: "absolute",
              left: pos.x,
              top: pos.y,
              width: CARD_W,
              height: CARD_H,
              cursor: isDraggingThis ? "grabbing" : "grab",
              zIndex: isDraggingThis ? 10 : 1,
            }}
          >
            <div
              className="rounded-xl border h-full flex flex-col items-center justify-center gap-1 transition-shadow"
              style={{
                background: group.bgColor,
                borderColor: isDraggingThis ? group.color : group.borderColor,
                boxShadow: isDraggingThis
                  ? `0 0 24px ${group.color}55, 0 8px 32px rgba(0,0,0,0.5)`
                  : `0 0 0 1px ${group.borderColor}, 0 4px 16px rgba(0,0,0,0.3)`,
              }}
            >
              <span className="text-2xl leading-none">{group.icon}</span>
              <p className="text-xs font-bold text-center px-2" style={{ color: group.color }}>
                {group.label}
              </p>
              <p className="text-[10px] text-center px-2" style={{ color: "rgba(148,163,184,0.7)" }}>
                {group.sublabel}
              </p>
              <div
                className="mt-1 px-2 py-0.5 rounded-full text-[9px] font-medium"
                style={{ background: `${group.color}22`, color: group.color }}
              >
                {group.nodes.length} device{group.nodes.length !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        );
      })}

      {/* Legend */}
      <div className="absolute bottom-3 left-3 flex items-center gap-4 text-[10px] text-muted-foreground pointer-events-none">
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-px" style={{ background: "rgba(99,102,241,0.7)" }} />
          WAN Link
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-6 h-px" style={{ background: "rgba(148,163,184,0.35)" }} />
          LAN Link
        </div>
        <span className="opacity-60">Drag groups to rearrange</span>
      </div>
    </div>
  );
}