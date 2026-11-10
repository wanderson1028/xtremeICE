import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ChevronRight, Clock, MousePointerClick, Trophy } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  M365_APPS, M365_QUESTIONS, TOTAL_QUESTIONS, LAB_TITLE, PASS_MARK,
  appById, initialAppState, correctCount,
} from "@/lib/m365";
import { clickBudget } from "@/lib/m365/clicks";
import { createTaskPointerFlow } from "@/lib/m365/pointerFlow";
import { afterTask } from "@/lib/m365/progress";
import { applyTaskAction, expireTask } from "@/lib/m365/session";
import { tally } from "@/lib/m365/outcome";
import M365Window from "@/components/m365/M365Window";
import M365Rail from "@/components/m365/M365Rail";
import M365Summary from "@/components/m365/M365Summary";
import M365QuestionCard from "@/components/m365/M365QuestionCard";
import M365SectionTransition from "@/components/m365/M365SectionTransition";

const ADVANCE_MS = 950;

export default function M365Assessment() {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [appState, setAppState] = useState(initialAppState);
  const [submitted, setSubmitted] = useState(false);
  const [clicks, setClicks] = useState(0);
  const [transition, setTransition] = useState(null);
  const [finished, setFinished] = useState(false);
  const [saving, setSaving] = useState(false);

  const answersRef = useRef({});
  const statesRef = useRef(appState);
  const flowRef = useRef(null);
  const savedRef = useRef(false);
  const advancedRef = useRef(false);
  const continuingRef = useRef(false);

  const question = M365_QUESTIONS[index];
  const app = appById(question.appId);
  const limit = clickBudget(question.minClicks);
  /* Progress is answered tasks; correctness is its own count. Both read the
     stored outcome, so a task closed by its click budget shows as wrong. */
  const overall = tally(M365_QUESTIONS, answers);
  const currentAnswer = answers[question.id] || null;

  /* A task opens with a fresh budget. Presses are counted at the window boundary
     and an expiry is only armed there; it is decided once the press has finished
     dispatching (see pointerFlow), so the operation on the final allowed click is
     applied and verified instead of being pre-empted by its own click. */
  useEffect(() => {
    setSubmitted(false);
    advancedRef.current = false;
    continuingRef.current = false;
    setClicks(0);

    const task = M365_QUESTIONS[index];
    const flow = createTaskPointerFlow({
      limit: clickBudget(task.minClicks),
      isResolved: () => Boolean(answersRef.current[task.id]),
      onCount: setClicks,
      expire: () => {
        const result = expireTask({
          question: task,
          answers: answersRef.current,
          states: statesRef.current,
        });
        answersRef.current = result.answers;
        statesRef.current = result.states;
        setAnswers(result.answers);
        setAppState(result.states);
        if (result.outcome === "exhausted") setSubmitted(true);
      },
    });
    flowRef.current = flow;
    return () => flow.dispose();
  }, [index]);

  const finish = useCallback(async () => {
    if (savedRef.current) return;
    savedRef.current = true;
    setSaving(true);
    const snapshot = answersRef.current;
    const correct = correctCount(snapshot);
    try {
      const user = await base44.auth.me();
      await base44.entities.LabScore.create({
        user_email: user.email,
        user_name: user.full_name || user.email,
        lab_title: LAB_TITLE,
        lab_chapter: "1",
        difficulty: "Beginner",
        total_steps: M365_APPS.length,
        steps_completed: M365_APPS.filter((a) => a.questions.every((q) => snapshot[q.id]?.correct)).length,
        questions_correct: correct,
        questions_total: TOTAL_QUESTIONS,
        points_earned: correct,
        points_possible: TOTAL_QUESTIONS,
        step_results: M365_APPS.map((a) => {
          const right = a.questions.filter((q) => snapshot[q.id]?.correct).length;
          return {
            stepLabel: a.name,
            commandCompleted: right === a.questions.length,
            questionCorrect: right,
            pointsEarned: right,
          };
        }),
        completed_at: new Date().toISOString(),
      });
    } catch {
      // The result screen still renders when the score cannot be stored.
    }
    setSaving(false);
    setFinished(true);
  }, []);

  /* Inside an application the next task opens by itself; at the end of an
     application the hand-off screen is shown instead, and the last application
     goes straight to the score. */
  useEffect(() => {
    if (!submitted) return undefined;
    const timer = setTimeout(() => {
      if (advancedRef.current) return;
      advancedRef.current = true;
      const step = afterTask(index);
      if (step.kind === "results") finish();
      else if (step.kind === "section") {
        setTransition({ from: step.from, to: step.to, index: step.index });
      } else setIndex(step.index);
    }, ADVANCE_MS);
    return () => clearTimeout(timer);
  }, [submitted, index, finish]);

  /* One physical press inside the window spends one click, whatever it hit: a
     wrong control, a menu, a blank area or a right-click. Clicks outside the
     window — progress, navigation, the hand-off screen — never count.

     This runs in the capture phase, before the pressed control's own handler, so
     it only records and reserves the click. It never settles, locks or re-renders
     the task away: the budget decision waits until the press has finished. */
  const handlePointer = (eventType) => {
    if (submitted || answersRef.current[question.id]) return;
    flowRef.current?.press(eventType);
  };

  /* Navigation stays ignored. A committed operation either completes the task,
     or changes the document and leaves the task open so it can be corrected —
     including the operation performed by the last click the budget allows. */
  const handleAction = (action) => {
    if (submitted || answersRef.current[question.id]) return;
    const result = applyTaskAction({
      question,
      answers: answersRef.current,
      states: statesRef.current,
      action,
    });
    answersRef.current = result.answers;
    statesRef.current = result.states;
    setAnswers(result.answers);
    setAppState(result.states);
    if (result.outcome === "correct") setSubmitted(true);
  };

  const continueSection = () => {
    if (!transition || continuingRef.current) return;
    continuingRef.current = true;
    const next = transition.index;
    setTransition(null);
    setIndex(next);
  };

  const retake = () => {
    const fresh = initialAppState();
    answersRef.current = {};
    statesRef.current = fresh;
    flowRef.current?.dispose();
    savedRef.current = false;
    advancedRef.current = false;
    continuingRef.current = false;
    setAnswers({});
    setAppState(fresh);
    setClicks(0);
    setTransition(null);
    setIndex(0);
    setSubmitted(false);
    setSaving(false);
    setFinished(false);
    setStarted(true);
  };

  if (finished) return <M365Summary answers={answers} onRetry={retake} />;

  if (!started) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-sky-950/20 px-4 py-12">
        <div className="mx-auto max-w-3xl">
          <Link
            to="/InteractiveVirtualLabs"
            className="mb-6 inline-flex items-center gap-1.5 font-mono text-xs text-gray-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Training labs
          </Link>

          <h1 className="text-4xl font-bold tracking-tight text-white">
            Microsoft 365 <span className="text-sky-400">Point &amp; Click</span>
          </h1>
          <p className="mt-3 max-w-2xl leading-relaxed text-gray-300">
            A scored assessment across six Microsoft 365 applications. Every ribbon tab, menu and
            context menu in the window is live: pick the tab, open the command and choose the option
            that performs the task. Some tasks also need a selection or a right-click first.
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-gray-500">
            Each task is marked correct or wrong as it closes, with no hints and no solutions. The
            total score, pass or fail and per-application scores appear at the end. Every task has a click budget, four times
            what the shortest solution needs: you can try a command, get it wrong and correct it,
            and the counter under the window shows what is left. When the budget runs out the task
            closes and the attempt moves on. The application screens are recreated simulations with
            fictitious companies and data, not captured Microsoft interfaces.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {M365_APPS.map((a) => (
              <div key={a.id} className="rounded-xl border border-gray-700 bg-gray-900 p-4">
                <div className="mb-2 flex items-center gap-2">
                  <span
                    className="flex h-7 w-7 items-center justify-center rounded text-[10px] font-bold text-white"
                    style={{ backgroundColor: a.accent }}
                  >
                    {a.name.slice(0, 2)}
                  </span>
                  <span className="text-sm font-semibold text-white">{a.name}</span>
                </div>
                <p className="font-mono text-[11px] text-gray-500">{a.questions.length} tasks</p>
              </div>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap items-center gap-6 rounded-xl border border-gray-700 bg-gray-900 px-5 py-4 font-mono text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" /> ~45 min
            </span>
            <span className="flex items-center gap-1.5">
              <MousePointerClick className="h-3.5 w-3.5" /> {TOTAL_QUESTIONS} scored tasks
            </span>
            <span className="flex items-center gap-1.5">
              <Trophy className="h-3.5 w-3.5" /> {PASS_MARK}% to pass
            </span>
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
          <Link
            to="/InteractiveVirtualLabs"
            className="flex items-center gap-1.5 font-mono text-xs text-gray-400 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Training labs
          </Link>
          <span className="text-gray-600">|</span>
          <span className="font-mono text-sm font-bold text-white">
            Microsoft 365 Point &amp; Click
          </span>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1 font-mono text-[11px] tabular-nums">
          <span className="text-gray-300">
            Answered: {overall.answered}/{TOTAL_QUESTIONS}
          </span>
          <span className="text-emerald-400">Correct: {overall.correct}</span>
          <span className={overall.wrong ? "text-red-400" : "text-gray-600"}>
            Wrong: {overall.wrong}
          </span>
        </div>
      </div>

      <div className="shrink-0 border-b border-gray-800 bg-black/40 px-4 py-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-gray-800">
          <div
            className="h-full rounded-full bg-gradient-to-r from-sky-600 to-sky-400 transition-all duration-500"
            style={{ width: `${(overall.answered / TOTAL_QUESTIONS) * 100}%` }}
          />
        </div>
        <div className="mt-1 text-right font-mono text-[10px] text-gray-500">
          Progress counts answered tasks, not your score.
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <M365Rail
          apps={M365_APPS}
          currentAppId={app.id}
          currentQuestionId={transition ? null : question.id}
          answers={answers}
        />

        <div className="min-w-0 flex-1 overflow-y-auto p-4 lg:p-6">
          <div className="mx-auto max-w-5xl">
            {transition ? (
              <M365SectionTransition
                fromApp={transition.from}
                toApp={transition.to}
                answers={answers}
                overall={overall}
                onContinue={continueSection}
              />
            ) : (
              <>
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-gray-700 bg-gray-900 px-2.5 py-0.5 font-mono text-[10px] text-gray-400">
                    Task {index + 1} / {TOTAL_QUESTIONS}
                  </span>
                  <span
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-white"
                    style={{ backgroundColor: app.accent }}
                  >
                    {app.name}
                  </span>
                  <span className="ml-auto font-mono text-[10px] text-gray-500">
                    Click · select · right-click
                  </span>
                </div>

                <div className="h-[clamp(380px,58vh,640px)] w-full">
                  <M365Window
                    key={question.id}
                    app={app}
                    state={appState[app.id]}
                    locked={submitted}
                    onPointer={handlePointer}
                    onAction={handleAction}
                  />
                </div>

                <M365QuestionCard
                  question={question}
                  app={app}
                  index={index}
                  total={TOTAL_QUESTIONS}
                  submitted={submitted}
                  saving={saving}
                  isLast={index + 1 >= TOTAL_QUESTIONS}
                  clicks={clicks}
                  limit={limit}
                  outcome={
                    currentAnswer ? (currentAnswer.correct ? "correct" : "wrong") : null
                  }
                />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}