import React, { useMemo } from "react";
import { ClipboardCheck, Loader2, Play } from "lucide-react";

export default function MyAssignments({ assignments = [], exercises = [], attempts = [], me, loading }) {
  const rows = useMemo(() => {
    const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));
    const best = new Map();
    attempts
      .filter((attempt) => String(attempt.user_email || "").toLowerCase() === String(me?.email || "").toLowerCase())
      .forEach((attempt) => {
        const current = best.get(attempt.exercise_id) || 0;
        best.set(attempt.exercise_id, Math.max(current, Number(attempt.score || 0)));
      });
    return assignments.map((assignment) => ({
      assignment,
      exercise: byId.get(assignment.exercise_id) || null,
      score: best.has(assignment.exercise_id) ? best.get(assignment.exercise_id) : null,
    }));
  }, [assignments, exercises, attempts, me]);

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-xs" style={{ color: "#404040" }}>
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your assigned training…
      </p>
    );
  }

  if (!rows.length) {
    return (
      <section className="sg-panel p-6 text-center">
        <ClipboardCheck className="mx-auto h-8 w-8" style={{ color: "#b91c1c" }} />
        <p className="mt-2 text-sm font-semibold">No training assigned to you yet</p>
        <p className="sg-body mt-1" style={{ color: "#404040" }}>
          When an organization admin or an exercise owner assigns you an exercise, it appears here.
        </p>
      </section>
    );
  }

  return (
    <div className="grid gap-3 lg:grid-cols-2">
      {rows.map(({ assignment, exercise, score }) => (
        <section key={assignment.id} className="sg-panel sg-panel-hover flex flex-col p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold">{exercise?.title || assignment.exercise_title}</h3>
              <p className="mt-1 text-[11px]" style={{ color: "#404040" }}>
                {[assignment.organization_name, exercise?.nice_role_name, exercise?.difficulty].filter(Boolean).join(" · ") || "Assigned training"}
              </p>
            </div>
            <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase" style={{ borderColor: score === null ? "#f59e0b" : "#0f9d58", color: score === null ? "#92400e" : "#166534", background: score === null ? "#fffbeb" : "#f0fdf4" }}>
              {score === null ? "Assigned" : "Attempted"}
            </span>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-[10px]" style={{ color: "#404040" }}>
            <span className="rounded border px-2 py-0.5" style={{ borderColor: "#d4d4d4" }}>
              Assigned by {assignment.assigned_by_name || assignment.assigned_by_email || "your organization"}
            </span>
            <span className="rounded border px-2 py-0.5" style={{ borderColor: "#d4d4d4" }}>
              {assignment.assignment_scope === "organization" ? "Whole organization" : "Individual"}
            </span>
            {score !== null && (
              <span className="rounded border px-2 py-0.5" style={{ borderColor: "#d4d4d4" }}>Best score {score}%</span>
            )}
          </div>

          <div className="mt-auto flex items-center gap-2 border-t pt-3" style={{ borderColor: "#d4d4d4" }}>
            {exercise ? (
              <a href={`/training-designer/${exercise.id}`} className="sg-btn-primary flex items-center gap-2 px-3 py-1.5 text-xs font-semibold">
                <Play className="h-3.5 w-3.5" /> {score === null ? "Start exercise" : "Retake exercise"}
              </a>
            ) : (
              <span className="text-[11px]" style={{ color: "#404040" }}>This exercise is no longer available.</span>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}