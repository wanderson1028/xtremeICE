import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft, ChevronRight, CheckCircle2, XCircle, Clock, MousePointerClick, Trophy,
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  M365_APPS, M365_QUESTIONS, TOTAL_QUESTIONS, LAB_TITLE, targetLabel,
} from "@/lib/m365Assessment";
import M365Screen from "@/components/m365/M365Screen";
import M365Rail from "@/components/m365/M365Rail";
import M365Summary from "@/components/m365/M365Summary";

export default function M365Assessment() {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  const question = M365_QUESTIONS[index];
  const app = M365_APPS.find((a) => a.id === question.appId);
  const answer = answers[question.id];
  const answeredCount = M365_QUESTIONS.filter((q) => answers[q.id]).length;
  const correctCount = M365_QUESTIONS.filter((q) => answers[q.id]?.correct).length;
  const isLast = index === TOTAL_QUESTIONS - 1;

  const handlePick = (targetId) => {
    if (answer) return;
    setAnswers((prev) => ({
      ...prev,
      [question.id]: { targetId, correct: targetId === question.targetId },
    }));
  };

  const finish = async () => {
    setSaving(true);
    const correct = M365_QUESTIONS.filter((q) => answers[q.id]?.correct).length;
    try {
      const user = await base44.auth.me();
      await base44.entities.LabScore.create({
        user_email: user.email,
        user_name: user.full_name || user.email,
        lab_title: LAB_TITLE,
        lab_chapter: "1",
        difficulty: "Beginner",
        total_steps: M365_APPS.length,
        steps_completed: M365_APPS.filter((a) => a.questions.every((q) => answers[q.id]?.correct)).length,
        questions_correct: correct,
        questions_total: TOTAL_QUESTIONS,
        points_earned: correct,
        points_possible: TOTAL_QUESTIONS,
        step_results: M365_APPS.map((a) => {
          const right = a.questions.filter((q) => answers[q.id]?.correct).length;
          return {
            stepLabel: a.name,
            commandCompleted: true,
            questionCorrect: right,
            pointsEarned: right,
          };
        }),
        completed_at: new Date().toISOString(),
      });
    } catch (_) {
      // Score could not be stored — the result screen still shows the session.
    }
    setSaving(false);
    setFinished(true);
  };

  const next = () => {
    if (isLast) finish();
    else setIndex((i) => i + 1);
  };

  const retake = () => {
    setAnswers({});
    setIndex(0);
    setFinished(false);
    setStarted(true);
  };

  if (finished) {
    return <M365Summary answers={answers} onRetry={retake} />;
  }

  if (!started) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-sky-950/20 px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <Link to="/InteractiveVirtualLabs" className="mb-6 inline-flex items-center gap-1.5 font-mono text-xs text-gray-400 transition-colors hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> Training labs
          </Link>

          <h1 className="text-4xl font-bold tracking-tight text-white">
            Microsoft 365 <span className="text-sky-400">Point &amp; Click</span>
          </h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-gray-300">
            A screenshot-based assessment across six Microsoft 365 applications. Each question shows the real
            interface for that app — click the exact control that performs the task.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {M365_APPS.map((a) => (
              <div key={a.id} className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded text-[10px] font-bold text-white" style={{ backgroundColor: a.accent }}>
                    {a.name.slice(0, 2)}
                  </span>
                  <span className="text-sm font-semibold text-white">{a.name}</span>
                </div>
                <p className="font-mono text-[11px] text-gray-500">{a.questions.length} hotspot questions</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-6 rounded-xl border border-gray-700 bg-gray-900 px-5 py-4 font-mono text-xs text-gray-400">
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> ~35 min</span>
            <span className="flex items-center gap-1.5"><MousePointerClick className="h-3.5 w-3.5" /> {TOTAL_QUESTIONS} questions</span>
            <span className="flex items-center gap-1.5"><Trophy className="h-3.5 w-3.5" /> 70% to pass</span>
          </div>

          <button
            onClick={() => setStarted(true)}
            className="mt-8 flex items-center gap-2 rounded-xl bg-sky-700 px-7 py-3 font-mono text-sm font-bold text-white transition-colors hover:bg-sky-600"
          >
            Start assessment <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-black via-gray-950 to-sky-950/20">
      <div className="flex shrink-0 items-center justify-between border-b border-gray-800 bg-black/60 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link to="/InteractiveVirtualLabs" className="flex items-center gap-1.5 font-mono text-xs text-gray-400 transition-colors hover:text-white">
            <ArrowLeft className="h-3.5 w-3.5" /> Training labs
          </Link>
          <span className="text-gray-600">|</span>
          <span className="font-mono text-sm font-bold text-white">Microsoft 365 Point &amp; Click</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-[11px] text-gray-500">{answeredCount}/{TOTAL_QUESTIONS} answered</span>
          <span className="rounded-full border border-emerald-600/40 bg-emerald-900/30 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-emerald-400">
            {correctCount} correct
          </span>
        </div>
      </div>

      <div className="shrink-0 border-b border-gray-800 bg-black/40 px-4 py-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-600 to-sky-400 transition-all duration-500"
            style={{ width: `${(answeredCount / TOTAL_QUESTIONS) * 100}%` }}
          />
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <M365Rail apps={M365_APPS} currentAppId={app.id} answers={answers} />

        <div className="min-w-0 flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="mx-auto max-w-3xl">
            <div className="mb-3 flex items-center gap-3">
              <span className="rounded-full border border-gray-700 bg-gray-900 px-2.5 py-0.5 font-mono text-[10px] text-gray-400">
                Question {index + 1} / {TOTAL_QUESTIONS}
              </span>
              <span className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: app.accent }}>
                {app.name}
              </span>
              <span className="ml-auto font-mono text-[10px] text-gray-500">Click the correct control</span>
            </div>

            <div className="mb-4 rounded-xl border border-gray-700 bg-gray-900 px-4 py-3">
              <p className="text-sm leading-relaxed text-gray-100">{question.text}</p>
            </div>

            <M365Screen
              app={app}
              selectedId={answer?.targetId ?? null}
              correctId={question.targetId}
              revealed={Boolean(answer)}
              onPick={handlePick}
            />

            {answer && (
              <div
                className={`mt-4 rounded-xl border px-4 py-3 ${
                  answer.correct
                    ? "border-emerald-700/50 bg-emerald-950/30"
                    : "border-red-700/50 bg-red-950/30"
                }`}
              >
                <div className="mb-1 flex items-center gap-2">
                  {answer.correct ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-400" />
                  )}
                  <span className={`text-xs font-semibold ${answer.correct ? "text-emerald-300" : "text-red-300"}`}>
                    {answer.correct
                      ? "Correct"
                      : answer.targetId
                      ? `Not quite — you clicked ${targetLabel(app, answer.targetId)}. The answer is ${targetLabel(app, question.targetId)}.`
                      : `Nothing selectable there. The answer is ${targetLabel(app, question.targetId)}.`}
                  </span>
                </div>
                <p className="text-[11px] leading-relaxed text-gray-400">{question.explanation}</p>
              </div>
            )}

            <div className="mt-5 flex items-center justify-between">
              <span className="font-mono text-[11px] text-gray-500">
                {answer ? "Answer locked — review the highlight above." : "Click anywhere on the app screen."}
              </span>
              <button
                onClick={next}
                disabled={!answer || saving}
                className="flex items-center gap-2 rounded-lg bg-sky-700 px-5 py-2 font-mono text-xs font-bold text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isLast ? (saving ? "Saving…" : "Finish assessment") : "Next question"}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}