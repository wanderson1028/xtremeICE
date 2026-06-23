import React from "react";
import { Button } from "@/components/ui/button";
import { Clock, Target, ListChecks, CheckCircle2, Save } from "lucide-react";

export default function BuilderSidebar({ form, saving, onSave, sections, onNavigate }) {
  const labContent = form.lab_content || {};
  const tasks = labContent.tasks || [];
  const estMin = form.estimated_duration_minutes || 0;
  const objectivesCount = form.objectives?.length || 0;

  const hasScenario = !!(labContent.scenario && labContent.scenario.trim());
  const hasTasks = tasks.length > 0;
  const hasValidation = !!(labContent.success_criteria && labContent.success_criteria.trim());
  const contentComplete = hasScenario && hasTasks && hasValidation;

  const niceComplete = !!(form.nice_category && form.nice_work_role);

  const healthItems = [
    { icon: Clock, label: "Duration", value: `${estMin}m`, ok: estMin > 0 },
    { icon: Target, label: "Objectives", value: objectivesCount, ok: objectivesCount >= 3 },
    { icon: ListChecks, label: "Lab Tasks", value: tasks.length, ok: hasTasks },
    { icon: CheckCircle2, label: "NICE", value: niceComplete ? "Mapped" : "Pending", ok: niceComplete },
  ];

  const contentChecks = [
    { label: "Scenario", done: hasScenario },
    { label: "Tasks", done: hasTasks },
    { label: "Success Criteria", done: hasValidation },
  ];

  return (
    <div className="lg:sticky lg:top-24 lg:self-start space-y-4">
      {/* Health Stats */}
      <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Lab Readiness</h3>
        <div className="grid grid-cols-2 gap-2">
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

        {/* Content completeness */}
        <div className="mt-3 pt-3 border-t border-gray-800">
          <p className="text-[10px] text-gray-500 uppercase mb-2">Content Checklist</p>
          <div className="space-y-1.5">
            {contentChecks.map((check, i) => (
              <div key={i} className="flex items-center gap-2">
                <CheckCircle2 className={`h-3.5 w-3.5 ${check.done ? "text-green-400" : "text-gray-700"}`} />
                <span className={`text-xs ${check.done ? "text-gray-300" : "text-gray-600"}`}>{check.label}</span>
              </div>
            ))}
          </div>
        </div>
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