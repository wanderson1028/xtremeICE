import React from "react";
import { Check, Loader2, Lock } from "lucide-react";

/**
 * Task prompt plus neutral submission status — no hints, no answer feedback.
 * Once a task is submitted the window is locked, so the copy says plainly that
 * the response is recorded and that the attempt moves on either way.
 */
export default function M365QuestionCard({ question, app, submitted, saving, index, total, isLast }) {
  const progress = isLast
    ? "All tasks answered — preparing your score…"
    : "The next task opens automatically.";

  return (
    <div className="mt-3 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3">
      <div className="mb-1.5 flex items-center gap-2">
        <span
          className="rounded-full px-2 py-[1px] text-[10px] font-semibold text-white"
          style={{ backgroundColor: app.accent }}
        >
          {app.name}
        </span>
        <span className="font-mono text-[10px] text-gray-500">
          Task {index + 1} of {total}
        </span>
      </div>
      <p className="text-sm leading-relaxed text-gray-100">{question.task}</p>

      <div className="mt-3 flex items-center gap-2 border-t border-gray-800 pt-2.5 font-mono text-[11px]">
        {submitted ? (
          saving ? (
            <>
              <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-sky-400" />
              <span className="text-sky-300">Response recorded — saving your score…</span>
            </>
          ) : (
            <>
              <Check className="h-3.5 w-3.5 shrink-0 text-sky-400" />
              <span className="text-gray-300">
                Response recorded. <span className="text-gray-500">{progress}</span>
              </span>
              <span className="ml-auto flex shrink-0 items-center gap-1 text-gray-500">
                <Lock className="h-3 w-3" /> Task closed
              </span>
            </>
          )
        ) : (
          <span className="text-gray-500">Complete the task in the window above.</span>
        )}
      </div>
    </div>
  );
}