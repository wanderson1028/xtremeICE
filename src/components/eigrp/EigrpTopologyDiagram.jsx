import React from "react";
import { TOPOLOGY, ROUTER_POSITIONS } from "./eigrpTopology";

const W = 620, H = 520;

export default function EigrpTopologyDiagram({ selectedRouter, onSelect, locked }) {
  return (
    <div className="bg-gray-950 border border-gray-700 rounded-xl p-3">
      <div className="text-xs text-gray-400 font-mono mb-2">EIGRP AS 100 — 6-Router Topology</div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 280 }}>
        {/* Links */}
        {TOPOLOGY.links.map((link, i) => {
          const a = ROUTER_POSITIONS[link.a];
          const b = ROUTER_POSITIONS[link.b];
          const mx = (a.x + b.x) / 2;
          const my = (a.y + b.y) / 2;
          return (
            <g key={i}>
              <line x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="#374151" strokeWidth="2" />
              <text x={mx} y={my - 4} textAnchor="middle" fontSize="9" fill="#6b7280" fontFamily="monospace">
                {link.subnet}
              </text>
            </g>
          );
        })}

        {/* Routers */}
        {Object.entries(ROUTER_POSITIONS).map(([rName, pos]) => {
          const isSelected = rName === selectedRouter;
          return (
            <g key={rName}
              onClick={() => !locked && onSelect && onSelect(rName)}
              style={{ cursor: locked ? "default" : "pointer" }}
            >
              <circle
                cx={pos.x} cy={pos.y} r={22}
                fill={isSelected ? "#7f1d1d" : "#1f2937"}
                stroke={isSelected ? "#ef4444" : "#4b5563"}
                strokeWidth={isSelected ? 2.5 : 1.5}
              />
              <text x={pos.x} y={pos.y + 1} textAnchor="middle" dominantBaseline="middle"
                fontSize="13" fontWeight="bold" fill={isSelected ? "#fca5a5" : "#d1d5db"} fontFamily="monospace">
                {rName}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}