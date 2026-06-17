import React from "react";
import { ROUTER_POSITIONS, TOPOLOGY } from "./ospfTopology";

export default function OspfTopologyDiagram({ selectedRouter, onSelect, locked = false }) {
  const routers = Object.keys(ROUTER_POSITIONS);

  return (
    <div className="bg-gray-950 border border-gray-700 rounded-xl p-3">
      <div className="text-xs text-gray-400 font-mono mb-2 text-center">OSPF Area 0 Topology</div>
      <svg viewBox="0 0 600 560" className="w-full">
        {/* Links */}
        {TOPOLOGY.links.map((link, i) => {
          const a = ROUTER_POSITIONS[link.a];
          const b = ROUTER_POSITIONS[link.b];
          const midX = (a.x + b.x) / 2;
          const midY = (a.y + b.y) / 2;
          // Highlight links connected to selected router
          const isActiveLink = locked && (link.a === selectedRouter || link.b === selectedRouter);
          return (
            <g key={i}>
              <line
                x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={isActiveLink ? "#ef444460" : "#4b5563"}
                strokeWidth={isActiveLink ? 2 : 1.5}
              />
              <text x={midX} y={midY - 3} fill="#9ca3af" fontSize="8" textAnchor="middle" fontFamily="monospace">
                {link.subnet}
              </text>
            </g>
          );
        })}

        {/* Router nodes */}
        {routers.map(r => {
          const pos = ROUTER_POSITIONS[r];
          const isSelected = r === selectedRouter;
          const isOther = locked && !isSelected;

          return (
            <g
              key={r}
              onClick={() => !locked && onSelect(r)}
              className={locked ? "cursor-default" : "cursor-pointer"}
            >
              {/* Pulse ring for selected router */}
              {isSelected && locked && (
                <circle
                  cx={pos.x} cy={pos.y} r={32}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  opacity="0.6"
                />
              )}
              <circle
                cx={pos.x} cy={pos.y} r={22}
                fill={isSelected ? "#7f1d1d" : isOther ? "#111827" : "#1f2937"}
                stroke={isSelected ? "#ef4444" : isOther ? "#1f2937" : "#374151"}
                strokeWidth={isSelected ? 3 : 1.5}
                opacity={isOther ? 0.5 : 1}
              />
              <text
                x={pos.x} y={pos.y + 1}
                fill={isSelected ? "#fca5a5" : isOther ? "#6b7280" : "#f3f4f6"}
                fontSize="11" textAnchor="middle" dominantBaseline="middle"
                fontFamily="monospace" fontWeight="bold"
              >
                {r}
              </text>
              {/* "YOU" label on selected when locked */}
              {isSelected && locked && (
                <text x={pos.x} y={pos.y - 34} fill="#ef4444" fontSize="8" textAnchor="middle" fontFamily="monospace" fontWeight="bold">
                  YOU
                </text>
              )}
              {r === "R8" && (
                <text x={pos.x} y={pos.y + 34} fill="#22c55e" fontSize="7" textAnchor="middle" fontFamily="monospace">
                  8.8.8.8
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="text-[10px] text-gray-300 text-center mt-1 font-mono">
        {locked ? `Locked to ${selectedRouter}` : "Click a router to select it"}
      </div>
    </div>
  );
}