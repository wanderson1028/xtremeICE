import React from "react";
import { BarChart3 } from "lucide-react";

const TYPE_META = {
  hands_on: { label: "Hands-On", color: "bg-amber-500" },
  reading: { label: "Reading", color: "bg-blue-500" },
  video: { label: "Video", color: "bg-purple-500" },
  quiz: { label: "Quiz", color: "bg-green-500" },
  challenge: { label: "Challenge", color: "bg-red-500" },
};

export default function CurriculumPacing({ modules }) {
  const counts = modules.reduce((acc, m) => {
    const t = m.type || "hands_on";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});
  const total = modules.length;
  if (total === 0) return null;

  const passiveCount = (counts.reading || 0) + (counts.video || 0);
  const passivePct = Math.round((passiveCount / total) * 100);
  const tooPassive = passivePct > 60;

  return (
    <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <BarChart3 className="h-4 w-4 text-gray-400" />
        <h3 className="text-xs font-semibold text-gray-300 uppercase tracking-wide">Curriculum Pacing</h3>
      </div>

      <div className="flex h-3 rounded-full overflow-hidden bg-gray-800 mb-3">
        {Object.entries(counts).map(([type, count]) => (
          <div
            key={type}
            className={TYPE_META[type]?.color || "bg-gray-600"}
            style={{ width: `${(count / total) * 100}%` }}
            title={`${TYPE_META[type]?.label || type}: ${count}`}
          />
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        {Object.entries(counts).map(([type, count]) => (
          <span key={type} className="flex items-center gap-1 text-xs text-gray-400">
            <span className={`h-2 w-2 rounded-full ${TYPE_META[type]?.color || "bg-gray-600"}`} />
            {TYPE_META[type]?.label || type}: {count}
          </span>
        ))}
      </div>

      {tooPassive && (
        <p className="text-xs text-amber-400/80 mt-3">
          {passivePct}% of modules are passive (reading/video). Consider adding hands-on activities to improve engagement.
        </p>
      )}
    </div>
  );
}