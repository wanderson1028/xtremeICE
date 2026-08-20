import React from "react";

// The dimensions of responsible AI, as a color-coded pillar set —
// analogous to the AWS Well-Architected pillars.
const PILLARS = [
  { name: "Fairness", focus: "Equitable", color: "from-blue-600 to-blue-400", accent: "text-blue-300" },
  { name: "Explainability", focus: "Understandable", color: "from-purple-600 to-purple-400", accent: "text-purple-300" },
  { name: "Transparency", focus: "Open", color: "from-cyan-600 to-cyan-400", accent: "text-cyan-300" },
  { name: "Privacy & Security", focus: "Protect", color: "from-red-600 to-red-400", accent: "text-red-300" },
  { name: "Safety", focus: "No harm", color: "from-orange-600 to-orange-400", accent: "text-orange-300" },
  { name: "Governance", focus: "Accountable", color: "from-green-600 to-green-400", accent: "text-green-300" },
];

export default function ResponsibleAiPillars() {
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
      <p className="text-[10px] font-mono text-gray-500 mt-3 text-center">Six dimensions of responsible AI — AWS guides builders to evaluate every AI system against all six</p>
    </div>
  );
}