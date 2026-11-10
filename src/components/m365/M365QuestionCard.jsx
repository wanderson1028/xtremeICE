import React from "react";
import { Loader2 } from "lucide-react";

/** Task prompt plus neutral submission status — no hints, no answer feedback. */
export default function M365QuestionCard({ question, app, submitted, saving, index, total }) {
  return (
    <div className="mt-3 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3">
      <div className="mb-1.5 flex items-center gap-2">
        <span className="rounded-full px-2 py-[1px] text-[10px] font-semibold text-white" style={{ backgroundColor: app.accent }}>
          {app.name}
        </span>
        <span className="font-mono text-[10px] text-gray-500">
          Task {index + 1} of {total}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-gray-100">{question.task}</p>

      <div className="mt-3 flex items-center gap-2 border-t border-gray-800 pt-2.5 font-mono text-[11px]">
        {submitted ? (
          <>
            <Loader2 className="h-3.5 w-3.5 animate-spin text-sky-400" />
            <span className="text-sky-300">
              {saving ? "Saving your score…" : "Task submitted — moving to the next task."}
            </span>
          </>
        ) : (
          <span className="text-gray-500">Complete the task in the window above.</span>
        )}
      </div>
    </div>
  );
}