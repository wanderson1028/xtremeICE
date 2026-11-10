import React from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";

/**
 * Hand-off screen between two applications. It reports only where the attempt
 * is, never how it is going: no scores, no correctness, no hints. The next
 * application opens when the candidate presses Continue.
 */
export default function M365SectionTransition({ fromApp, toApp, answered, total, onContinue }) {
  const percent = Math.round((answered / total) * 100);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-10 text-center">
      <span
        className="flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold text-white"
        style={{ backgroundColor: fromApp.accent }}
      >
        {fromApp.name.slice(0, 2)}
      </span>

      <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
        {fromApp.name} section complete.
      </h2>
      <p className="mt-1.5 font-mono text-sm text-gray-400">
        Up next: <span className="font-semibold text-gray-200">{toApp.name}</span>
      </p>

      <div className="mt-6 w-full rounded-xl border border-gray-700 bg-gray-900 px-5 py-4">
        <div className="flex items-center justify-between font-mono text-[11px] text-gray-500">
          <span>
            {answered} of {total} tasks answered
          </span>
          <span className="tabular-nums">{percent}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-600 to-sky-400 transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mt-4 flex items-center justify-center gap-2 font-mono text-[11px] text-gray-400">
          <CheckCircle2 className="h-3.5 w-3.5 text-sky-400" />
          <span>
            {fromApp.name} finished · {toApp.questions.length} tasks in {toApp.name}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={onContinue}
        className="mt-6 flex items-center gap-2 rounded-xl bg-sky-700 px-7 py-3 font-mono text-sm font-bold text-white transition-colors hover:bg-sky-600"
      >
        Continue to {toApp.name} <ArrowRight className="h-4 w-4" />
      </button>
    </div>
  );
}