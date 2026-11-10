import React from "react";
import { CheckCircle2, XCircle, ChevronRight, Loader2 } from "lucide-react";
import { stepLabel } from "@/lib/m365Assessment";

export default function M365QuestionCard({ app, question, stepIndex, answer, isLast, saving, onNext }) {
  const multiStep = question.steps.length > 1;

  const hint = answer
    ? answer.correct
      ? "Task complete — moving to the next question."
      : "Advancing to the next question."
    : multiStep
    ? "Follow the steps in order. Right-click where a menu is needed."
    : "Click the control that performs the task.";

  return (
    <div className="mt-4">
      <div className="rounded-xl border border-gray-700 bg-gray-900 px-4 py-3">
        <p className="text-sm leading-relaxed text-gray-100">{question.text}</p>

        {multiStep && (
          <ol className="mt-3 space-y-1 border-t border-gray-800 pt-3">
            {question.steps.map((step, i) => {
              const done = Boolean(answer) || i < stepIndex;
              const active = !answer && i === stepIndex;
              return (
                <li
                  key={i}
                  className={`flex items-baseline gap-2 font-mono text-[11px] ${
                    done ? "text-emerald-400" : active ? "text-sky-300" : "text-gray-500"
                  }`}
                >
                  <span className="w-3 shrink-0 text-center">{done ? "✓" : active ? "›" : "·"}</span>
                  <span>
                    {i + 1}. {stepLabel(app, step)}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      {answer && (
        <div
          className={`mt-3 rounded-xl border px-4 py-3 ${
            answer.correct ? "border-emerald-700/50 bg-emerald-950/30" : "border-red-700/50 bg-red-950/30"
          }`}
        >
          <div className="mb-1 flex items-start gap-2">
            {answer.correct ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
            ) : (
              <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
            )}
            <span className={`text-xs font-semibold ${answer.correct ? "text-emerald-300" : "text-red-300"}`}>
              {answer.correct
                ? "Correct"
                : `Not quite — you used ${answer.clicked}. The task needed: ${answer.wanted}.`}
            </span>
          </div>
          <p className="text-[11px] leading-relaxed text-gray-400">{question.explanation}</p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3">
        <span className="font-mono text-[11px] text-gray-500">{hint}</span>
        <button
          onClick={onNext}
          disabled={!answer || saving}
          className="flex shrink-0 items-center gap-2 rounded-lg bg-sky-700 px-5 py-2 font-mono text-xs font-bold text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isLast ? (saving ? "Saving…" : "Finish assessment") : "Next question"}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}