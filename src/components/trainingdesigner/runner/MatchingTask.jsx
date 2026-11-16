import React from "react";

export default function MatchingTask({ task, value = {}, onChange }) {
  const choices = task.matching_choices || [];

  return (
    <div className="mt-4 space-y-2">
      {(task.matching_prompts || []).map((prompt) => (
        <label
          key={prompt.id}
          className="grid gap-2 rounded-lg border px-3 py-2.5 sm:grid-cols-[1fr_240px] sm:items-center"
          style={{ borderColor: "#d4d4d4", background: "#fff" }}
        >
          <span className="text-sm font-medium">{prompt.text}</span>
          <select
            value={value[prompt.id] || ""}
            onChange={(event) => onChange({ ...value, [prompt.id]: event.target.value })}
            className="sg-input h-9 px-2 text-xs"
          >
            <option value="">Choose a match</option>
            {choices.map((choice) => (
              <option key={choice.id} value={choice.id}>{choice.text}</option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}