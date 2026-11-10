import React from "react";
import { Link } from "react-router-dom";
import { Trophy, AlertTriangle, RotateCcw, ChevronRight, CheckCircle2, XCircle } from "lucide-react";
import {
  M365_APPS, M365_QUESTIONS, TOTAL_QUESTIONS, PASS_MARK,
  correctCount, scorePercent, appScore,
} from "@/lib/m365";

export default function M365Summary({ answers, onRetry }) {
  const correct = correctCount(answers);
  const pct = scorePercent(answers);
  const passed = pct >= PASS_MARK;
  const scores = M365_APPS.map((app) => appScore(app, answers));

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-sky-950/20">
      <div className="mx-auto max-w-2xl px-6 py-10">
        <div className="mb-6 text-center">
          <div
            className={`mb-3 inline-flex h-16 w-16 items-center justify-center rounded-full border-2 ${
              passed ? "border-emerald-600/50 bg-emerald-900/30" : "border-orange-600/50 bg-orange-900/20"
            }`}
          >
            {passed ? (
              <Trophy className="h-8 w-8 text-emerald-400" />
            ) : (
              <AlertTriangle className="h-8 w-8 text-orange-400" />
            )}
          </div>
          <h1 className="text-2xl font-bold text-white">
            {passed ? "Assessment passed" : "Assessment not passed"}
          </h1>
          <p className="mt-1 font-mono text-xs text-gray-400">
            {correct} of {TOTAL_QUESTIONS} tasks correct · {pct}% · pass mark {PASS_MARK}%
          </p>
        </div>

        <div className="mb-5 rounded-xl border border-gray-700 bg-gray-900 p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-gray-400">
              Score by application
            </h2>
            <span
              className={`rounded-full border px-3 py-1 font-mono text-[11px] font-bold ${
                passed
                  ? "border-green-600/50 bg-green-900/40 text-green-400"
                  : "border-red-600/50 bg-red-900/40 text-red-400"
              }`}
            >
              {passed ? "PASS" : "BELOW PASS MARK"}
            </span>
          </div>
          <div className="space-y-2">
            {scores.map((score) => (
              <div
                key={score.id}
                className="flex items-center gap-3 rounded-lg border border-gray-800 bg-black/40 px-3 py-2"
              >
                <span className="h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: score.accent }} />
                <span className="text-xs font-medium text-gray-200">{score.name}</span>
                <div className="ml-auto flex items-center gap-2">
                  <div className="h-1.5 w-24 overflow-hidden rounded-full bg-gray-800">
                    <div
                      className={`h-full rounded-full ${
                        score.correct === score.total
                          ? "bg-emerald-500"
                          : score.correct > 0
                          ? "bg-yellow-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${(score.correct / score.total) * 100}%` }}
                    />
                  </div>
                  <span className="w-10 text-right font-mono text-[11px] tabular-nums text-gray-400">
                    {score.correct}/{score.total}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-gray-700 bg-gray-900 p-4">
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-400">
            Task review
          </h2>
          <div className="grid gap-2">
            {M365_QUESTIONS.map((question, i) => {
              const answer = answers[question.id];
              return (
                <div key={question.id} className="flex items-start gap-2 text-[11px]">
                  {answer?.correct ? (
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-400" />
                  ) : (
                    <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                  )}
                  <span className="font-mono text-gray-500">{String(i + 1).padStart(2, "0")}</span>
                  <span className="text-gray-300">
                    <span className="font-semibold text-gray-200">{question.appName}.</span>{" "}
                    {question.explanation}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <button
            onClick={onRetry}
            className="flex items-center gap-2 rounded-xl border border-gray-600 px-5 py-2.5 font-mono text-sm text-gray-300 transition-colors hover:border-gray-400 hover:text-white"
          >
            <RotateCcw className="h-4 w-4" /> Retake
          </button>
          <Link
            to="/InteractiveVirtualLabs"
            className="flex items-center gap-2 rounded-xl bg-sky-700 px-6 py-2.5 font-mono text-sm font-bold text-white transition-colors hover:bg-sky-600"
          >
            Back to Active Labs <ChevronRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}