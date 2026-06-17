import React from "react";

const LEVELS = [
  {
    key: "easy",
    label: "Easy",
    color: "green",
    desc: "Step-by-step guide",
  },
  {
    key: "medium",
    label: "Medium",
    color: "yellow",
    desc: "Hints & reference",
  },
  {
    key: "hard",
    label: "Hard",
    color: "red",
    desc: "No guidance",
  },
];

export default function DifficultySelector({ difficulty, onChange }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-xs font-mono text-gray-500 mr-1">Mode:</span>
      {LEVELS.map((lvl) => {
        const active = difficulty === lvl.key;
        const colorMap = {
          green:  { active: "bg-green-900/60 border-green-500 text-green-300", idle: "border-gray-700 text-gray-500 hover:border-green-700 hover:text-green-400" },
          yellow: { active: "bg-yellow-900/60 border-yellow-500 text-yellow-300", idle: "border-gray-700 text-gray-500 hover:border-yellow-700 hover:text-yellow-400" },
          red:    { active: "bg-red-900/60 border-red-500 text-red-300", idle: "border-gray-700 text-gray-500 hover:border-red-800 hover:text-red-400" },
        };
        return (
          <button
            key={lvl.key}
            onClick={() => onChange(lvl.key)}
            title={lvl.desc}
            className={`px-2.5 py-1 rounded-lg border text-xs font-mono transition-all ${active ? colorMap[lvl.color].active : colorMap[lvl.color].idle}`}
          >
            {lvl.label}
          </button>
        );
      })}
    </div>
  );
}