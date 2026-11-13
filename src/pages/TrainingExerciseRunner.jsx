import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, CheckCircle2, Circle, Loader2, PlayCircle, Send } from "lucide-react";

const message = (error, fallback) => error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback;

export default function TrainingExerciseRunner() {
  const { exerciseId } = useParams();
  const [exercise, setExercise] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [completed, setCompleted] = useState([]);
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

  const tasks = exercise?.tasks || [];

  const toggle = (id) => setCompleted((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));

  const submit = async () => {
    setSubmitError("");
    setSubmitting(true);
    try {
      const me = await base44.auth.me();
      const score = tasks.length ? Math.round((completed.length / tasks.length) * 100) : 0;
      const attempt = await base44.entities.TrainingExerciseAttempt.create({
        exercise_id: exercise.id,
        exercise_title: exercise.title,
        exercise_owner_id: exercise.created_by_id || "",
        organization_id: exercise.organization_id || "",
        organization_name: exercise.organization_name || "",
        user_email: me?.email || "",
        user_name: me?.full_name || me?.email || "",
        completed_tasks: completed,
        task_total: tasks.length,
        score,
        notes,
        status: "completed",
        started_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      });
      setResult(attempt);
      await loadAttempts();
    } catch (error) {
      setSubmitError(message(error, "The attempt could not be recorded."));
    } finally {
      setSubmitting(false);
    }
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

  return (
    <div className="cfrs-sg min-h-screen">
      <div className="mx-auto max-w-[1100px] px-4 py-7 lg:px-7">
        <a href="/training-designer" className="sg-btn mb-4 inline-flex items-center gap-2 px-3 py-1.5 text-xs">
          <ArrowLeft className="h-3.5 w-3.5" /> Training Designer
        </a>

        <header className="sg-panel p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-semibold lg:text-2xl">{exercise.title}</h1>
              <p className="mt-1 text-[11px]" style={{ color: "#404040" }}>
                {[exercise.organization_name, exercise.nice_role_name, exercise.difficulty, `${exercise.duration_minutes || 45} min`]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
            </div>
            <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase" style={{ borderColor: "#b91c1c", color: "#b91c1c" }}>
              {exercise.status}
            </span>
          </div>
          {exercise.summary && <p className="sg-body mt-3" style={{ color: "#404040" }}>{exercise.summary}</p>}
        </header>

        {result && (
          <section className="sg-panel mt-4 p-5" style={{ borderTopColor: "#0f9d58" }}>
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <CheckCircle2 className="h-4 w-4" style={{ color: "#0f9d58" }} /> Attempt recorded
            </h2>
            <p className="sg-body mt-1" style={{ color: "#404040" }}>
              {result.score}% · {result.completed_tasks.length} of {result.task_total} tasks completed.
            </p>
          </section>
        )}

        {exercise.scenario && (
          <section className="sg-panel mt-4 p-5">
            <h2 className="text-sm font-semibold">Scenario</h2>
            <p className="sg-body mt-2 whitespace-pre-line">{exercise.scenario}</p>
          </section>
        )}

        <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_320px]">
          <section className="sg-panel p-5">
            <h2 className="text-sm font-semibold">Tasks</h2>
            <p className="sg-body mt-1" style={{ color: "#404040" }}>{completed.length} of {tasks.length} complete</p>
            <div className="mt-3 space-y-2">
              {tasks.map((task) => {
                const isOn = completed.includes(task.id);
                return (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => toggle(task.id)}
                    className={`flex w-full gap-3 rounded-lg border px-3 py-3 text-left transition ${isOn ? "border-green-600 bg-green-50" : "border-[#d4d4d4] bg-white hover:border-red-300"}`}
                  >
                    {isOn ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#0f9d58" }} /> : <Circle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "#737373" }} />}
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold">{task.title}</span>
                      {task.instructions && <span className="mt-1 block whitespace-pre-line text-xs" style={{ color: "#404040" }}>{task.instructions}</span>}
                      {task.success_criteria && (
                        <span className="mt-1 block text-[11px]" style={{ color: "#166534" }}>Success: {task.success_criteria}</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>

            <label className="mt-4 block">
              <span className="sg-micro">Analyst notes</span>
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={4} className="sg-input mt-1 w-full px-3 py-2 text-sm" placeholder="What you did, found and changed" />
            </label>

            {submitError && <p className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs" style={{ color: "#7f1d1d" }}>{submitError}</p>}

            <button type="button" onClick={submit} disabled={submitting} className="sg-btn-primary mt-3 flex items-center gap-2 px-4 py-2 text-xs font-semibold">
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {submitting ? "Submitting…" : "Submit attempt"}
            </button>
          </section>

          <div className="space-y-4">
            <section className="sg-panel p-4">
              <h2 className="text-sm font-semibold">Objectives</h2>
              <ul className="sg-body mt-2 space-y-1 pl-4" style={{ color: "#404040", listStyle: "disc" }}>
                {(exercise.objectives || []).map((objective, index) => <li key={index}>{objective}</li>)}
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
      </div>
    </div>
  );
}