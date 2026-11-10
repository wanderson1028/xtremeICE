import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronRight, Clock, MousePointerClick, Trophy } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  M365_APPS, M365_QUESTIONS, TOTAL_QUESTIONS, LAB_TITLE, targetLabel, stepLabel,
} from "@/lib/m365Assessment";
import M365Screen from "@/components/m365/M365Screen";
import M365Rail from "@/components/m365/M365Rail";
import M365Summary from "@/components/m365/M365Summary";
import M365QuestionCard from "@/components/m365/M365QuestionCard";

const stepMatches = (step, action) => {
  if (!step || !action) return false;
  if (step.action === "click") return action.type === "click" && action.targetId === step.target;
  if (step.action === "context") return action.type === "context" && action.targetId === step.target;
  if (step.action === "menu") return action.type === "menu" && action.itemId === step.item;
  return false;
};

export default function M365Assessment() {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [flash, setFlash] = useState(null);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  const question = M365_QUESTIONS[index];
  const app = M365_APPS.find((a) => a.id === question.appId);
  const answer = answers[question.id];
  const answeredCount = M365_QUESTIONS.filter((q) => answers[q.id]).length;
  const correctCount = M365_QUESTIONS.filter((q) => answers[q.id]?.correct).length;
  const isLast = index === TOTAL_QUESTIONS - 1;

  useEffect(() => {
    setStepIndex(0);
    setFlash(null);
  }, [index]);

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
    if (saving) return;
    if (isLast) finish();
    else setIndex((i) => i + 1);
  };

  useEffect(() => {
    if (!answer) return undefined;
    const delay = answer.correct ? 1600 : 3600;
    const timer = setTimeout(() => next(), delay);
    return () => clearTimeout(timer);
  }, [answer, index]);

  const handleAction = (action) => {
    if (answer) return;
    const step = question.steps[stepIndex];
    const matched = stepMatches(step, action);

    if (!matched) {
      const committed =
        action.type === "menu" ||
        (action.type === "click" && step.action === "click") ||
        (action.type === "context" && step.action === "context");
      if (!committed) return;
      const clicked = action.type === "menu"
        ? "a different menu command"
        : action.targetId
        ? targetLabel(app, action.targetId)
        : "empty space";
      setAnswers((prev) => ({
        ...prev,
        [question.id]: {
          correct: false,
          clicked,
          wanted: stepLabel(app, step),
          wrongId: action.targetId || null,
        },
      }));
      setFlash("wrong");
      return;
    }

    if (stepIndex + 1 < question.steps.length) {
      setStepIndex(stepIndex + 1);
      return;
    }

    setAnswers((prev) => ({ ...prev, [question.id]: { correct: true, clicked: stepLabel(app, step) } }));
    setFlash("correct");
  };

  const retake = () => {
    setAnswers({});
    setIndex(0);
    setStepIndex(0);
    setFlash(null);
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
            A hands-on assessment across six Microsoft 365 applications. Work the real interface with your mouse:
            click controls, select rows and text, and right-click for context menus. Some tasks need several steps
            before they are complete.
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
                <p className="font-mono text-[11px] text-gray-500">{a.questions.length} questions</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-6 rounded-xl border border-gray-700 bg-gray-900 px-5 py-4 font-mono text-xs text-gray-400">
            <span className="flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" /> ~45 min</span>
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
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-gray-700 bg-gray-900 px-2.5 py-0.5 font-mono text-[10px] text-gray-400">
                Question {index + 1} / {TOTAL_QUESTIONS}
              </span>
              <span className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white" style={{ backgroundColor: app.accent }}>
                {app.name}
              </span>
              {question.steps.length > 1 && (
                <span className="rounded-full border border-sky-700/60 bg-sky-950/40 px-2.5 py-0.5 font-mono text-[10px] text-sky-300">
                  {question.steps.length}-step task
                </span>
              )}
              <span className="ml-auto font-mono text-[10px] text-gray-500">Click · select · right-click</span>
            </div>

            <M365Screen
              key={question.id}
              app={app}
              revealId={question.steps[0].target}
              wrongId={answer?.wrongId ?? null}
              revealed={Boolean(answer)}
              flash={flash}
              onAction={handleAction}
            />

            <M365QuestionCard
              app={app}
              question={question}
              stepIndex={stepIndex}
              answer={answer}
              isLast={isLast}
              saving={saving}
              onNext={next}
            />
          </div>
        </div>
      </div>
    </div>
  );
}