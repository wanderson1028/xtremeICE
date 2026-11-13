import React from "react";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { TASK_TYPE_LABEL } from "@/lib/trainingScoring";

const givenAnswer = (row, task) => {
  if (row.correct) return null;
  if (row.type === "mcq") return (task.options || []).find((item) => item.id === row.answer)?.text || "No answer";
  if (row.type === "hotspot") return (task.hotspot_regions || []).find((item) => item.id === row.answer)?.label || "No answer";
  if (row.type === "matching") {
    const choices = task.matching_choices || [];
    const pairs = Object.entries(row.answer || {}).map(([promptId, choiceId]) => {
      const prompt = (task.matching_prompts || []).find((item) => item.id === promptId);
      const choice = choices.find((item) => item.id === choiceId);
      return `${prompt?.text || "—"} → ${choice?.text || "—"}`;
    });
    return pairs.join("; ") || "No answer";
  }
  return "Not marked complete";
};

export default function AttemptResult({ evaluation, tasks, onRetake }) {
  return (
    <section className="sg-panel p-5" style={{ borderTopColor: "#0f9d58" }}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <CheckCircle2 className="h-4 w-4" style={{ color: "#0f9d58" }} /> Attempt recorded
        </h2>
        <span className="text-2xl font-semibold" style={{ color: "#b91c1c" }}>{evaluation.score}%</span>
      </div>
      <p className="sg-body mt-1" style={{ color: "#404040" }}>
        {evaluation.correct} of {evaluation.total} activities correct.
      </p>

      <ul className="mt-3 space-y-1.5">
        {evaluation.rows.map((row, index) => {
          const task = tasks[index] || {};
          const missed = givenAnswer(row, task);
          return (
            <li key={row.id || index} className="rounded-lg border px-3 py-2" style={{ borderColor: row.correct ? "#bbf7d0" : "#fecaca", background: row.correct ? "#f0fdf4" : "#fef2f2" }}>
              <div className="flex items-start gap-2">
                {row.correct ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#0f9d58" }} />
                ) : (
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#b91c1c" }} />
                )}
                <div className="min-w-0">
                  <p className="text-xs font-semibold">
                    {index + 1}. {row.title} <span style={{ color: "#525252", fontWeight: 400 }}>· {TASK_TYPE_LABEL[row.type]}</span>
                  </p>
                  {!row.correct && missed && (
                    <p className="mt-0.5 text-[11px]" style={{ color: "#7f1d1d" }}>Your answer: {missed}</p>
                  )}
                  <p className="mt-0.5 text-[11px]" style={{ color: "#166534" }}>Answer: {row.key}</p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {onRetake && (
        <button type="button" onClick={onRetake} className="sg-btn mt-4 flex items-center gap-2 px-3 py-1.5 text-xs">
          <RotateCcw className="h-3.5 w-3.5" /> Retake exercise
        </button>
      )}
    </section>
  );
}