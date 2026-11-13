import React from "react";
import { Trash2 } from "lucide-react";

export default function ExerciseTaskEditor({ task, index, onChange, onRemove }) {
  const set = (key, value) => onChange({ ...task, [key]: value });

  return (
    <div className="rounded-lg border p-3" style={{ borderColor: "#d4d4d4", background: "#fff" }}>
      <div className="flex items-center justify-between gap-2">
        <span className="sg-micro">Task {index + 1}</span>
        <button type="button" onClick={onRemove} className="sg-btn flex items-center gap-1 px-2 py-1 text-[10px]" title="Remove task">
          <Trash2 className="h-3 w-3" /> Remove
        </button>
      </div>
      <input
        value={task.title || ""}
        onChange={(event) => set("title", event.target.value)}
        placeholder="Task title"
        className="sg-input mt-2 h-9 w-full px-2 text-sm font-semibold"
      />
      <textarea
        value={task.instructions || ""}
        onChange={(event) => set("instructions", event.target.value)}
        placeholder="Instructions the learner follows"
        rows={3}
        className="sg-input mt-2 w-full px-2 py-2 text-xs"
      />
      <input
        value={task.success_criteria || ""}
        onChange={(event) => set("success_criteria", event.target.value)}
        placeholder="Success criterion"
        className="sg-input mt-2 h-9 w-full px-2 text-xs"
      />
    </div>
  );
}