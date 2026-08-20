import React from "react";

// The six AWS Well-Architected Framework pillars, as a color-coded pillar graphic.
const PILLARS = [
  { name: "Operational Excellence", focus: "Run", color: "from-blue-600 to-blue-400", accent: "text-blue-300" },
  { name: "Security", focus: "Protect", color: "from-red-600 to-red-400", accent: "text-red-300" },
  { name: "Reliability", focus: "Recover", color: "from-green-600 to-green-400", accent: "text-green-300" },
  { name: "Performance Efficiency", focus: "Scale", color: "from-purple-600 to-purple-400", accent: "text-purple-300" },
  { name: "Cost Optimization", focus: "Save", color: "from-yellow-600 to-yellow-400", accent: "text-yellow-300" },
  { name: "Sustainability", focus: "Green", color: "from-emerald-600 to-emerald-400", accent: "text-emerald-300" },
];

export default function WellArchitectedPillars() {
  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
        {PILLARS.map(p => (
          <div key={p.name} className="flex flex-col items-center">
            <div className={`w-full h-16 rounded-t-md bg-gradient-to-b ${p.color} flex items-center justify-center shadow-inner`}>
              <span className="text-[10px] font-mono font-bold text-white/90">{p.focus}</span>
            </div>
            <div className="w-full h-1.5 rounded-b-sm bg-gray-700" />
            <div className={`text-[9px] font-mono text-center mt-1.5 leading-tight ${p.accent}`}>{p.name}</div>
          </div>
        ))}
      </div>
      <p className="text-[10px] font-mono text-gray-500 mt-3 text-center">Six pillars of the AWS Well-Architected Framework</p>
    </div>
  );
}