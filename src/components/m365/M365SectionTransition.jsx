import React from "react";
import { ArrowRight, CheckCircle2, XCircle } from "lucide-react";
import { sectionResult } from "@/lib/m365/outcome";

/**
 * Hand-off screen between two applications. It reports the finished section as a
 * true outcome — how many tasks were correct and how many were wrong — so a
 * section that closed with failures is never presented as a pass. No hints and no
 * solutions: the candidate sees only right and wrong counts. The next application
 * opens when the candidate presses Continue.
 */
export default function M365SectionTransition({ fromApp, toApp, answers, overall, onContinue }) {
  const result = sectionResult(fromApp, answers);
  const percent = overall.total ? Math.round((overall.answered / overall.total) * 100) : 0;

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-4 py-10 text-center">
      <span
        className="flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold text-white"
        style={{ backgroundColor: fromApp.accent }}
      >
        {fromApp.name.slice(0, 2)}
      </span>

      <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">
        {fromApp.name} section finished.
      </h2>
      <p className="mt-1.5 font-mono text-sm text-gray-400">
        Up next: <span className="font-semibold text-gray-200">{toApp.name}</span>
      </p>

      <div
        className={`mt-6 w-full rounded-xl border px-5 py-4 ${
          result.passed ? "border-emerald-700/50 bg-emerald-950/20" : "border-red-700/50 bg-red-950/20"
        }`}
      >
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] text-gray-400">
            {fromApp.name} — this section
          </span>
          <span
            className={`rounded-full border px-2.5 py-[1px] font-mono text-[10px] font-bold uppercase tracking-wide ${
              result.passed
                ? "border-emerald-600/60 bg-emerald-500/15 text-emerald-400"
                : "border-red-600/60 bg-red-500/15 text-red-400"
            }`}
          >
            {result.passed ? "Passed" : "Not passed"}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 font-mono text-[11px] tabular-nums">
          <div className="rounded-lg border border-gray-700 bg-black/30 px-2 py-1.5">
            <div className="text-[10px] uppercase tracking-wide text-gray-500">Answered</div>
            <div className="text-gray-200">
              {result.answered}/{result.total}
            </div>
          </div>
          <div className="rounded-lg border border-emerald-800/60 bg-black/30 px-2 py-1.5">
            <div className="text-[10px] uppercase tracking-wide text-gray-500">Correct</div>
            <div className="text-emerald-400">{result.correct}</div>
          </div>
          <div className="rounded-lg border border-red-800/60 bg-black/30 px-2 py-1.5">
            <div className="text-[10px] uppercase tracking-wide text-gray-500">Wrong</div>
            <div className={result.wrong ? "text-red-400" : "text-gray-400"}>{result.wrong}</div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-center gap-1.5 font-mono text-[11px]">
          {result.passed ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
              <span className="text-emerald-300">
                Every task in {fromApp.name} was verified correct.
              </span>
            </>
          ) : (
            <>
              <XCircle className="h-3.5 w-3.5 shrink-0 text-red-400" />
              <span className="text-red-300">
                {result.wrong} of {result.total} {result.wrong === 1 ? "task was" : "tasks were"}{" "}
                wrong in {fromApp.name}.
              </span>
            </>
          )}
        </div>
      </div>

      <div className="mt-4 w-full rounded-xl border border-gray-700 bg-gray-900 px-5 py-4">
        <div className="flex items-center justify-between font-mono text-[11px] text-gray-500">
          <span>
            Answered: {overall.answered} of {overall.total}
          </span>
          <span className="tabular-nums">{percent}%</span>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-600 to-sky-400 transition-all duration-500"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-2 text-right font-mono text-[10px] text-gray-500">
          Progress counts answered tasks, not your score.
        </p>
        <div className="mt-3 font-mono text-[11px] text-gray-400">
          {toApp.questions.length} tasks in {toApp.name}
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