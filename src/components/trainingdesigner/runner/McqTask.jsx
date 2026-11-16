import React from "react";

export default function McqTask({ task, value, onChange }) {
  return (
    <div className="mt-4 space-y-2" role="radiogroup" aria-label={task.title}>
      {(task.options || []).map((option, index) => {
        const isOn = value === option.id;
        return (
          <button
            key={option.id}
            type="button"
            role="radio"
            aria-checked={isOn}
            onClick={() => onChange(option.id)}
            className={`flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition ${isOn ? "border-red-600 bg-red-50" : "border-[#d4d4d4] bg-white hover:border-red-300"}`}
          >
            <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold ${isOn ? "border-red-600 bg-red-600" : "border-[#a3a3a3] bg-white"}`} style={{ color: isOn ? "#fff" : "#525252" }}>
              {String.fromCharCode(65 + index)}
            </span>
            <span className="text-sm">{option.text}</span>
          </button>
        );
      })}
    </div>
  );
}