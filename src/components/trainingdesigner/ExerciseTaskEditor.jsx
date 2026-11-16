import React from "react";
import { Trash2 } from "lucide-react";
import { TASK_TYPE_LABEL, taskType } from "@/lib/trainingScoring";

export default function ExerciseTaskEditor({ task, index, onChange, onRemove }) {
  const set = (key, value) => onChange({ ...task, [key]: value });
  const type = taskType(task);

  const matchingKey = (task.matching_prompts || [])
    .map((prompt) => {
      const choice = (task.matching_choices || []).find((item) => item.id === (task.matching_answer || {})[prompt.id]);
      return `${prompt.text} → ${choice?.text || "—"}`;
    })
    .join(" · ");

  return (
    <div className="rounded-lg border p-3" style={{ borderColor: "#d4d4d4", background: "#fff" }}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2">
          <span className="sg-micro">Task {index + 1}</span>
          <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase" style={{ borderColor: "#d4d4d4", color: "#525252" }}>
            {TASK_TYPE_LABEL[type]}
          </span>
        </span>
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

      {type === "hands_on" && (
        <input
          value={task.success_criteria || ""}
          onChange={(event) => set("success_criteria", event.target.value)}
          placeholder="Success criterion"
          className="sg-input mt-2 h-9 w-full px-2 text-xs"
        />
      )}

      {type === "mcq" && (
        <label className="mt-2 block">
          <span className="sg-micro">Correct answer</span>
          <select
            value={task.correct_option_id || ""}
            onChange={(event) => set("correct_option_id", event.target.value)}
            className="sg-input mt-1 h-9 w-full px-2 text-xs"
          >
            {(task.options || []).map((option, optionIndex) => (
              <option key={option.id} value={option.id}>{String.fromCharCode(65 + optionIndex)}. {option.text}</option>
            ))}
          </select>
        </label>
      )}

      {type === "hotspot" && (
        <label className="mt-2 block">
          <span className="sg-micro">Correct area · {task.interface_name || "console"}</span>
          <select
            value={task.correct_region_id || ""}
            onChange={(event) => set("correct_region_id", event.target.value)}
            className="sg-input mt-1 h-9 w-full px-2 text-xs"
          >
            {(task.hotspot_regions || []).map((region) => (
              <option key={region.id} value={region.id}>{region.label}</option>
            ))}
          </select>
        </label>
      )}

      {type === "matching" && (
        <p className="mt-2 rounded border px-2 py-1.5 text-[11px]" style={{ borderColor: "#e5e5e5", background: "#fafafa", color: "#404040" }}>
          <strong>Answer key:</strong> {matchingKey || "No matches defined"}
        </p>
      )}
    </div>
  );
}