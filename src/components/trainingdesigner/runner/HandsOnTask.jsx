import React from "react";
import { CheckCircle2, Circle } from "lucide-react";

export default function HandsOnTask({ task, value, onChange }) {
  const done = value === true;

  return (
    <div className="mt-4">
      {task.success_criteria && (
        <p className="rounded-lg border px-3 py-2 text-[11px]" style={{ borderColor: "#bbf7d0", background: "#f0fdf4", color: "#166534" }}>
          <strong>Success:</strong> {task.success_criteria}
        </p>
      )}
      <button
        type="button"
        aria-pressed={done}
        onClick={() => onChange(!done)}
        className={`mt-3 flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left transition ${done ? "border-green-600 bg-green-50" : "border-[#d4d4d4] bg-white hover:border-red-300"}`}
      >
        {done ? (
          <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: "#0f9d58" }} />
        ) : (
          <Circle className="h-5 w-5 shrink-0" style={{ color: "#737373" }} />
        )}
        <span className="text-sm font-semibold">
          {done ? "Marked complete" : "I completed this task successfully"}
        </span>
      </button>
    </div>
  );
}