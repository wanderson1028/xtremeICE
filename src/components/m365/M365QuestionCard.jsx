import React from "react";
import { CheckCircle2, Loader2, Lock, MousePointerClick, XCircle } from "lucide-react";

/**
 * Task prompt, click budget and outcome feedback — no hints and no solutions.
 * Once a task closes the window locks: the card states plainly whether the
 * operation was verified correct or the task closed wrong because its click
 * limit ran out, then the attempt moves on.
 */
export default function M365QuestionCard({
  question, app, submitted, saving, index, total, isLast,
  clicks = 0, limit = 0, outcome = null,
}) {
  const remaining = Math.max(0, limit - clicks);
  const wrong = outcome === "wrong";
  const correct = outcome === "correct";
  const progress = isLast
    ? "All tasks answered — preparing your score…"
    : "The next task opens automatically.";

  const status = () => {
    if (!submitted) {
      return <span className="text-gray-500">Complete the task in the window above.</span>;
    }
    if (saving) {
      return (
        <>
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-sky-400" />
          <span className="text-sky-300">Response recorded — saving your score…</span>
        </>
      );
    }
    if (wrong) {
      return (
        <>
          <XCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
          <span className="font-semibold text-red-400">Wrong — click limit reached.</span>
          <span className="text-gray-500">{progress}</span>
        </>
      );
    }
    return (
      <>
        <CheckCircle2
          className={`h-3.5 w-3.5 shrink-0 ${correct ? "text-emerald-400" : "text-sky-400"}`}
        />
        <span className={correct ? "font-semibold text-emerald-400" : "text-gray-300"}>
          Correct.
        </span>
        <span className="text-gray-500">{progress}</span>
      </>
    );
  };

  return (
    <div
      className={`mt-3 rounded-xl border px-4 py-3 ${
        wrong ? "border-red-700/60 bg-red-950/20" : "border-gray-700 bg-gray-900"
      }`}
    >
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

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-gray-800 pt-2.5 font-mono text-[11px]">
        <span className="flex min-w-0 flex-1 items-center gap-1.5">{status()}</span>

        <span
          className="flex shrink-0 items-center gap-1.5 text-gray-400"
          title="Every click in the window counts, including wrong controls and blank clicks."
        >
          <MousePointerClick className="h-3.5 w-3.5" />
          <span className="tabular-nums">
            Clicks used: {clicks} / {limit}
          </span>
          <span className="text-gray-500">· {remaining} remaining</span>
        </span>

        {submitted && !saving ? (
          <span className="flex shrink-0 items-center gap-1 text-gray-500">
            <Lock className="h-3 w-3" /> Task closed
          </span>
        ) : null}
      </div>
    </div>
  );
}