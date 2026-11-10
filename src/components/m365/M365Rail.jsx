import React from "react";
import { Check, Minus, X } from "lucide-react";
import {
  QUESTION_CORRECT, QUESTION_UNANSWERED, QUESTION_WRONG, sectionResult,
} from "@/lib/m365/outcome";

const MARKER = {
  [QUESTION_CORRECT]: {
    label: "Correct",
    className: "border-emerald-600/60 bg-emerald-500/15 text-emerald-400",
    Icon: Check,
  },
  [QUESTION_WRONG]: {
    label: "Wrong",
    className: "border-red-600/70 bg-red-500/20 text-red-400",
    Icon: X,
  },
  [QUESTION_UNANSWERED]: {
    label: "Not answered",
    className: "border-gray-700 bg-gray-800/60 text-gray-500",
    Icon: Minus,
  },
};

/**
 * Application rail: what each task actually came out as. A green check means the
 * operation was verified correct; a red cross means the task closed wrong (its
 * click limit ran out); a dash means it has not been answered yet. Counts are
 * true outcomes, so "Answered" never stands in for "Correct".
 */
export default function M365Rail({ apps, currentAppId, currentQuestionId, answers }) {
  return (
    <aside className="hidden w-72 shrink-0 overflow-y-auto border-r border-gray-800 bg-black/30 p-4 lg:block xl:w-80">
      <div className="mb-3 px-1 font-mono text-[11px] uppercase tracking-wider text-gray-500">
        Applications
      </div>

      {apps.map((app) => {
        const active = app.id === currentAppId;
        const result = sectionResult(app, answers);
        return (
          <div
            key={app.id}
            className={`mb-2.5 rounded-lg border px-3 py-2.5 ${
              active ? "border-sky-700/60 bg-sky-950/30" : "border-gray-800/70"
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: app.accent }} />
              <span className={`text-sm font-medium ${active ? "text-white" : "text-gray-300"}`}>
                {app.name}
              </span>
              {result.passed ? (
                <span className="ml-auto rounded-full border border-emerald-600/60 bg-emerald-500/15 px-1.5 py-[1px] font-mono text-[9px] font-bold uppercase tracking-wide text-emerald-400">
                  Passed
                </span>
              ) : result.finished ? (
                <span className="ml-auto rounded-full border border-amber-600/60 bg-amber-500/10 px-1.5 py-[1px] font-mono text-[9px] font-bold uppercase tracking-wide text-amber-400">
                  Finished
                </span>
              ) : null}
            </div>

            <div className="mt-2 space-y-1 font-mono text-[11px] tabular-nums">
              <div className="text-gray-300">
                Answered: {result.answered}/{result.total}
              </div>
              <div className="flex gap-2.5">
                <span className="text-emerald-400">Correct: {result.correct}</span>
                <span className={result.wrong ? "text-red-400" : "text-gray-500"}>
                  Wrong: {result.wrong}
                </span>
              </div>
            </div>

            <div className="mt-2 flex gap-1.5">
              {app.questions.map((question, i) => {
                const { label, className, Icon } = MARKER[result.statuses[i]];
                const current = question.id === currentQuestionId;
                return (
                  <span
                    key={question.id}
                    role="img"
                    aria-label={`${app.name} task ${i + 1}: ${label}`}
                    title={`${app.name} task ${i + 1}: ${label}`}
                    className={`flex h-5 flex-1 items-center justify-center rounded-[3px] border ${className} ${
                      current ? "ring-2 ring-sky-500/70 ring-offset-1 ring-offset-gray-950" : ""
                    }`}
                  >
                    <Icon className="h-3 w-3" strokeWidth={3} />
                  </span>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="mt-4 space-y-1.5 border-t border-gray-800 px-1 pt-3 font-mono text-[11px] text-gray-500">
        {[QUESTION_CORRECT, QUESTION_WRONG, QUESTION_UNANSWERED].map((status) => {
          const { label, className, Icon } = MARKER[status];
          return (
            <div key={status} className="flex items-center gap-2">
              <span
                className={`flex h-4 w-4 items-center justify-center rounded-[3px] border ${className}`}
              >
                <Icon className="h-2.5 w-2.5" strokeWidth={3} />
              </span>
              {label}
            </div>
          );
        })}
      </div>

      <p className="mt-3 px-1 font-mono text-[11px] leading-relaxed text-gray-600">
        Progress counts answered tasks. Your score appears at the end.
      </p>
    </aside>
  );
}