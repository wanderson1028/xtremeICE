import React from "react";
import { Button } from "@/components/ui/button";
import { Clock, Layers, Target, ListChecks, BarChart3, Save } from "lucide-react";

const TYPE_COLORS = {
  hands_on: "bg-amber-500",
  reading: "bg-blue-500",
  video: "bg-purple-500",
  quiz: "bg-green-500",
  challenge: "bg-red-500",
};

const TYPE_LABELS = {
  hands_on: "Hands-On",
  reading: "Reading",
  video: "Video",
  quiz: "Quiz",
  challenge: "Challenge",
};

export default function BuilderSidebar({ form, modules, saving, onSave, sections, onNavigate }) {
  const totalModuleMin = modules.reduce((sum, m) => sum + (m.duration_minutes || 0), 0);
  const estMin = form.estimated_duration_minutes || 0;
  const durationOk = totalModuleMin > 0 && Math.abs(totalModuleMin - estMin) <= 15;

  const typeCounts = modules.reduce((acc, m) => {
    const t = m.type || "hands_on";
    acc[t] = (acc[t] || 0) + 1;
    return acc;
  }, {});

  const niceComplete = !!(form.nice_category && form.nice_work_role);
  const objectivesCount = form.objectives?.length || 0;

  const healthItems = [
    { icon: Clock, label: "Duration", value: `${totalModuleMin}m / ${estMin}m`, ok: durationOk && totalModuleMin > 0 },
    { icon: Layers, label: "Modules", value: modules.length, ok: modules.length > 0 },
    { icon: Target, label: "Objectives", value: objectivesCount, ok: objectivesCount >= 3 },
    { icon: ListChecks, label: "NICE", value: niceComplete ? "Mapped" : "Pending", ok: niceComplete },
  ];

  return (
    <div className="lg:sticky lg:top-24 lg:self-start space-y-4">
      {/* Health Stats */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3 flex items-center gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" /> Curriculum Health
        </h3>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {healthItems.map((item, i) => (
            <div key={i} className="bg-gray-800/50 rounded-lg p-2.5">
              <div className="flex items-center gap-1.5 mb-0.5">
                <item.icon className={`h-3 w-3 ${item.ok ? "text-green-400" : "text-gray-500"}`} />
                <span className="text-[10px] text-gray-500 uppercase">{item.label}</span>
              </div>
              <p className={`text-sm font-semibold ${item.ok ? "text-green-400" : "text-white"}`}>{item.value}</p>
            </div>
          ))}
        </div>

        {/* Instructional Mix Bar */}
        {modules.length > 0 ? (
          <div>
            <p className="text-[10px] text-gray-500 uppercase mb-1.5">Instructional Mix</p>
            <div className="flex h-2 rounded-full overflow-hidden bg-gray-800">
              {Object.entries(typeCounts).map(([type, count]) => (
                <div
                  key={type}
                  className={TYPE_COLORS[type]}
                  style={{ width: `${(count / modules.length) * 100}%` }}
                  title={`${TYPE_LABELS[type]}: ${count}`}
                />
              ))}
            </div>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {Object.entries(typeCounts).map(([type, count]) => (
                <span key={type} className="flex items-center gap-1 text-[10px] text-gray-400">
                  <span className={`h-2 w-2 rounded-full ${TYPE_COLORS[type]}`} />
                  {TYPE_LABELS[type]} ({count})
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-600 italic">Add modules to see pacing</p>
        )}

        {/* Duration mismatch warning */}
        {totalModuleMin > 0 && !durationOk && (
          <p className="text-xs text-amber-400/80 mt-3">
            Module time ({totalModuleMin}m) differs from estimate ({estMin}m)
          </p>
        )}
      </div>

      {/* Section Nav (desktop only) */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-2 hidden lg:block">
        {sections.map((s) => (
          <button
            key={s.id}
            onClick={() => onNavigate(s.id)}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-white hover:bg-gray-800/50 transition-colors"
          >
            <s.icon className="h-3.5 w-3.5 flex-shrink-0" />
            {s.label}
          </button>
        ))}
      </div>

      <Button
        onClick={onSave}
        disabled={saving || !form.title}
        className="w-full bg-green-700 hover:bg-green-600 text-white"
      >
        <Save className="h-4 w-4 mr-1.5" />
        {saving ? "Saving..." : "Save Template"}
      </Button>
    </div>
  );
}