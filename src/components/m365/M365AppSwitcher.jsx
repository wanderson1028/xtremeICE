import React from "react";
import { sectionResult } from "@/lib/m365/outcome";

/**
 * Compact application switcher for screens too narrow for the rail. Selecting an
 * application opens its first unfinished task; everything already done is kept.
 */
export default function M365AppSwitcher({ apps, currentAppId, answers, onSelect }) {
  return (
    <div className="mb-2 flex gap-1.5 overflow-x-auto pb-1 lg:hidden">
      {apps.map((app) => {
        const active = app.id === currentAppId;
        const result = sectionResult(app, answers);
        return (
          <button
            key={app.id}
            type="button"
            onClick={() => onSelect(app.id)}
            aria-current={active ? "true" : undefined}
            className={`shrink-0 rounded-full border px-2.5 py-1 font-mono text-[11px] transition-colors ${
              active
                ? "border-sky-600 bg-sky-950/40 text-white"
                : "border-gray-700 text-gray-400 hover:border-sky-700/60 hover:text-white"
            }`}
          >
            <span
              className="mr-1 inline-block h-2 w-2 rounded-sm align-middle"
              style={{ backgroundColor: app.accent }}
            />
            {app.name}
            <span className="ml-1 tabular-nums text-gray-500">
              {result.answered}/{result.total}
            </span>
          </button>
        );
      })}
    </div>
  );
}