import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, ArrowRight, Loader2, PlayCircle, Send } from "lucide-react";
import TaskCard from "@/components/trainingdesigner/runner/TaskCard";
import AttemptResult from "@/components/trainingdesigner/runner/AttemptResult";
import { evaluateExercise, isAnswered } from "@/lib/trainingScoring";

const message = (error, fallback) => error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback;

export default function TrainingExerciseRunner() {
  const { exerciseId } = useParams();
  const [exercise, setExercise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [answers, setAnswers] = useState({});
  const [index, setIndex] = useState(0);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [result, setResult] = useState(null);

  const [attempts, setAttempts] = useState([]);

  const loadAttempts = useCallback(async () => {
    const page = await base44.entities.TrainingExerciseAttempt.filter({ exercise_id: exerciseId }, { sort: "-created_date", limit: 20 });
    setAttempts(page.items || []);
  }, [exerciseId]);

  useEffect(() => {
    (async () => {
      try {
        const record = await base44.entities.TrainingExercise.get(exerciseId).catch((error) => {
          if (error?.status === 404) return null;
          throw error;
        });
        setExercise(record);
        if (!record) setLoadError("This exercise could not be found.");
        else await loadAttempts();
      } catch (error) {
        setLoadError(message(error, "The exercise could not be loaded."));
      } finally {
        setLoading(false);
      }
    })();
  }, [exerciseId, loadAttempts]);

  const tasks = useMemo(() => exercise?.tasks || [], [exercise]);
  const current = tasks[index];
  const evaluation = useMemo(() => evaluateExercise(tasks, answers), [tasks, answers]);
  const answeredCount = tasks.filter((task) => isAnswered(task, answers[task.id])).length;

  const setAnswer = (taskId, value) => setAnswers((prev) => ({ ...prev, [taskId]: value }));

  const submit = async () => {
    setSubmitError("");
    const outcome = evaluateExercise(tasks, answers);
    setSubmitting(true);
    try {
      const me = await base44.auth.me();
      await base44.entities.TrainingExerciseAttempt.create({
        exercise_id: exercise.id,
        exercise_title: exercise.title,
        exercise_owner_id: exercise.created_by_id || "",
        organization_id: exercise.organization_id || "",
        organization_name: exercise.organization_name || "",
        user_email: me?.email || "",
        user_name: me?.full_name || me?.email || "",
        completed_tasks: outcome.completed,
        task_total: outcome.total,
        score: outcome.score,
        notes,
        answers,
        task_results: outcome.rows.map((row) => ({ id: row.id, title: row.title, type: row.type, correct: row.correct })),
        status: "completed",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
      setResult(outcome);
      await loadAttempts();
    } catch (error) {
      setSubmitError(message(error, "The attempt could not be recorded."));
    } finally {
      setSubmitting(false);
    }
  };

  const retake = () => {
    setAnswers({});
    setNotes("");
    setResult(null);
    setIndex(0);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center gap-2 text-sm" style={{ color: "#404040" }}>
        <Loader2 className="h-4 w-4 animate-spin" /> Loading exercise…
      </div>
    );
  }

  if (!exercise) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-sm font-semibold" style={{ color: "#7f1d1d" }}>{loadError || "This exercise could not be found."}</p>
        <a href="/training-designer" className="sg-btn mt-4 inline-flex items-center gap-2 px-4 py-2 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Training Designer
        </a>
      </div>
    );
  }

  const roleNames = (exercise.nice_roles || []).map((role) => role.name).filter(Boolean);
  const roleLabel = roleNames.length ? roleNames.join(", ") : exercise.nice_role_name;

  return (
    <div className="cfrs-sg min-h-screen">
      <div className="mx-auto max-w-[1100px] px-4 py-7 lg:px-7">
        <a href="/training-designer" className="sg-btn mb-4 inline-flex items-center gap-2 px-3 py-1.5 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" /> Training Designer
        </a>

        <header className="sg-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-xl font-semibold lg:text-2xl">{exercise.title}</h1>
              <p className="mt-1 text-[11px]" style={{ color: "#404040" }}>
                {[roleLabel, exercise.difficulty, `${exercise.duration_minutes || 45} min`, `${tasks.length} activities`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase" style={{ borderColor: "#b91c1c", color: "#b91c1c" }}>
              {exercise.status}
            </span>
          </div>
          {exercise.summary && <p className="sg-body mt-3" style={{ color: "#404040" }}>{exercise.summary}</p>}
          {exercise.scenario && (
            <p className="mt-3 whitespace-pre-line rounded-lg border px-3 py-2 text-xs" style={{ borderColor: "#e5e5e5", background: "#fafafa", color: "#404040" }}>
              {exercise.scenario}
            </p>
          )}
        </header>

        {result ? (
          <div className="mt-4">
            <AttemptResult evaluation={result} tasks={tasks} onRetake={retake} />
          </div>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-center gap-1.5">
              {tasks.map((task, taskIndex) => {
                const done = isAnswered(task, answers[task.id]);
                const active = taskIndex === index;
                return (
                  <button
                    key={task.id || taskIndex}
                    type="button"
                    onClick={() => setIndex(taskIndex)}
                    aria-label={`Go to activity ${taskIndex + 1}`}
                    aria-current={active ? "step" : undefined}
                    className={`h-7 w-7 rounded-full border text-[11px] font-semibold transition ${done ? "border-red-600 bg-red-600" : "border-[#d4d4d4] bg-white hover:border-red-300"}`}
                    style={{ color: done ? "#fff" : active ? "#b91c1c" : "#525252", boxShadow: active ? "0 0 0 2px #b91c1c44" : "none" }}
                  >
                    {taskIndex + 1}
                  </button>
                );
              })}
              <span className="ml-2 text-[11px]" style={{ color: "#404040" }}>{answeredCount} of {tasks.length} answered</span>
            </div>

            <div className="mt-3 grid gap-4 lg:grid-cols-[1fr_320px]">
              <div className="space-y-3">
                {current && (
                  <TaskCard task={current} index={index} total={tasks.length} value={answers[current.id]} onChange={(value) => setAnswer(current.id, value)} />
                )}

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setIndex((value) => Math.max(0, value - 1))}
                    disabled={index === 0}
                    className="sg-btn flex items-center gap-1.5 px-3 py-1.5 text-xs disabled:opacity-40"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back
                  </button>
                  {index < tasks.length - 1 ? (
                    <button
                      type="button"
                      onClick={() => setIndex((value) => Math.min(tasks.length - 1, value + 1))}
                      className="sg-btn-primary flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold"
                    >
                      Next activity <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={submit}
                      disabled={submitting}
                      className="sg-btn-primary flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold"
                    >
                      {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      {submitting ? "Submitting…" : "Submit attempt"}
                    </button>
                  )}
                </div>

                <section className="sg-panel p-4">
                  <label className="block">
                    <span className="sg-micro">Analyst notes</span>
                    <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} className="sg-input mt-1 w-full px-3 py-2 text-sm" placeholder="What you did, found and changed" />
                  </label>
                  {submitError && <p className="mt-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs" style={{ color: "#7f1d1d" }}>{submitError}</p>}
                  {index < tasks.length - 1 && (
                    <button type="button" onClick={submit} disabled={submitting} className="sg-btn mt-3 flex items-center gap-1.5 px-3 py-1.5 text-[11px]">
                      {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                      Submit now
                    </button>
                  )}
                </section>
              </div>

              <div className="space-y-4">
                <section className="sg-panel p-4">
                  <h2 className="text-sm font-semibold">Objectives</h2>
                  <ul className="sg-body mt-2 space-y-1 pl-4" style={{ color: "#404040", listStyle: "disc" }}>
                    {(exercise.objectives || []).map((objective, objectiveIndex) => <li key={objectiveIndex}>{objective}</li>)}
                  </ul>
                </section>

                <section className="sg-panel p-4">
                  <h2 className="text-sm font-semibold">Source findings</h2>
                  <ul className="mt-2 space-y-1.5">
                    {(exercise.source_findings || []).map((finding) => (
                      <li key={finding.id} className="text-[11px]" style={{ color: "#404040" }}>
                        <span className="font-semibold">{finding.title}</span>
                        {finding.severity ? ` · ${finding.severity}` : ""}
                      </li>
                    ))}
                  </ul>
                </section>

                <section className="sg-panel p-4">
                  <h2 className="flex items-center gap-2 text-sm font-semibold"><PlayCircle className="h-4 w-4" /> Recent attempts</h2>
                  {attempts.length ? (
                    <ul className="mt-2 space-y-1.5">
                      {attempts.map((attempt) => (
                        <li key={attempt.id} className="flex items-center justify-between gap-2 text-[11px]" style={{ color: "#404040" }}>
                          <span className="truncate">{attempt.user_name || attempt.user_email}</span>
                          <span className="shrink-0 font-semibold">{attempt.score}%</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-2 text-[11px]" style={{ color: "#404040" }}>No attempts yet.</p>
                  )}
                </section>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}