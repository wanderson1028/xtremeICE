import React, { useMemo, useState } from "react";
import { ClipboardCheck, Loader2, Play, Trash2, UserPlus } from "lucide-react";
import AssignmentDialog from "./AssignmentDialog";

const statusTone = (status) => {
  if (status === "published") return { border: "#0f9d58", color: "#166534", background: "#f0fdf4" };
  if (status === "archived") return { border: "#a3a3a3", color: "#404040", background: "#f5f5f5" };
  return { border: "#f59e0b", color: "#92400e", background: "#fffbeb" };
};

export default function SavedExercises({ exercises = [], attempts = [], assignments = [], me, loading, onDelete, onOpen, onAssigned }) {
  const [assignTarget, setAssignTarget] = useState(null);

  const stats = useMemo(() => {
    const map = new Map();
    attempts.forEach((attempt) => {
      const entry = map.get(attempt.exercise_id) || { count: 0, total: 0 };
      entry.count += 1;
      entry.total += Number(attempt.score || 0);
      map.set(attempt.exercise_id, entry);
    });
    return map;
  }, [attempts]);

  const assignedCounts = useMemo(() => {
    const map = new Map();
    assignments.forEach((row) => map.set(row.exercise_id, (map.get(row.exercise_id) || 0) + 1));
    return map;
  }, [assignments]);

  const canManage = (exercise) =>
    me?.role === "admin" ||
    (me?.id && exercise.created_by_id === me.id) ||
    (me?.org_role === "org_admin" && me?.organization_id && exercise.app_organization_id === me.organization_id);

  if (loading) {
    return (
      <p className="flex items-center gap-2 text-xs" style={{ color: "#404040" }}>
        <Loader2 className="h-4 w-4 animate-spin" /> Loading saved exercises…
      </p>
    );
  }

  if (!exercises.length) {
    return (
      <section className="sg-panel p-6 text-center">
        <ClipboardCheck className="mx-auto h-8 w-8" style={{ color: "#b91c1c" }} />
        <p className="mt-2 text-sm font-semibold">No exercises saved yet</p>
        <p className="sg-body mt-1" style={{ color: "#404040" }}>Build one from a vPenTest assessment and it will appear here.</p>
      </section>
    );
  }

  return (
    <>
      <div className="grid gap-3 lg:grid-cols-2">
        {exercises.map((exercise) => {
          const tone = statusTone(exercise.status);
          const stat = stats.get(exercise.id);
          const assignedCount = assignedCounts.get(exercise.id) || 0;
          const manageable = canManage(exercise);
          return (
            <section key={exercise.id} className="sg-panel sg-panel-hover flex flex-col p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-sm font-semibold">{exercise.title}</h3>
                  <p className="mt-1 text-[11px]" style={{ color: "#404040" }}>
                    {exercise.organization_name || "Organization"} · {exercise.nice_role_name || "No role"}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase" style={tone}>
                  {exercise.status || "draft"}
                </span>
              </div>

              <p className="mt-2 line-clamp-2 text-xs" style={{ color: "#525252" }}>{exercise.summary || exercise.scenario}</p>

              <div className="mt-3 flex flex-wrap gap-2 text-[10px]" style={{ color: "#404040" }}>
                <span className="rounded border px-2 py-0.5" style={{ borderColor: "#d4d4d4" }}>{(exercise.tasks || []).length} tasks</span>
                <span className="rounded border px-2 py-0.5" style={{ borderColor: "#d4d4d4" }}>{(exercise.source_findings || []).length} findings</span>
                <span className="rounded border px-2 py-0.5" style={{ borderColor: "#d4d4d4" }}>{exercise.difficulty || "Intermediate"}</span>
                <span className="rounded border px-2 py-0.5" style={{ borderColor: assignedCount ? "#b91c1c" : "#d4d4d4" }}>
                  {assignedCount ? `${assignedCount} assigned` : "Not assigned"}
                </span>
                <span className="rounded border px-2 py-0.5" style={{ borderColor: "#d4d4d4" }}>
                  {stat ? `${stat.count} attempt${stat.count === 1 ? "" : "s"} · avg ${Math.round(stat.total / stat.count)}%` : "No attempts"}
                </span>
              </div>

              <div className="mt-auto flex items-center gap-2 border-t pt-3" style={{ borderColor: "#d4d4d4" }}>
                <button type="button" onClick={() => onOpen(exercise)} className="sg-btn-primary flex items-center gap-2 px-3 py-1.5 text-xs font-semibold">
                  <Play className="h-3.5 w-3.5" /> Launch
                </button>
                {manageable && (
                  <button type="button" onClick={() => setAssignTarget(exercise)} className="sg-btn flex items-center gap-1.5 px-3 py-1.5 text-[11px]">
                    <UserPlus className="h-3.5 w-3.5" /> Assign
                  </button>
                )}
                {manageable && (
                  <button type="button" onClick={() => onDelete(exercise)} className="sg-btn ml-auto flex items-center gap-1 px-2 py-1.5 text-[10px]">
                    <Trash2 className="h-3 w-3" /> Delete
                  </button>
                )}
              </div>
            </section>
          );
        })}
      </div>

      {assignTarget && (
        <AssignmentDialog
          exercise={assignTarget}
          onClose={() => setAssignTarget(null)}
          onAssigned={(created) => {
            setAssignTarget(null);
            onAssigned?.(created);
          }}
        />
      )}
    </>
  );
}