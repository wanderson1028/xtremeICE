import React from "react";
import { CheckCircle2, Link2 } from "lucide-react";
import HotspotQuestion from "@/components/assessment/HotspotQuestion";

export default function CandidateQuestion({ task, value, onChange }) {
  const type = task?.question_type || "manual";
  const answer = value?.answer || "";
  const matches = value?.matches || {};

  if (type === "hotspot") {
    return <HotspotQuestion task={task} value={value} onChange={onChange} />;
  }

  if (type === "mcq") {
    return (
      <div className="space-y-2">
        {(task.options || []).map((option, index) => {
          const selected = answer === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onChange({ ...value, answer: option.id })}
              className={`w-full flex items-start gap-3 rounded-xl border px-4 py-3 text-left transition-all ${
                selected
                  ? "border-red-600 bg-red-950/30"
                  : "border-gray-800 bg-gray-900/60 hover:border-gray-700"
              }`}
            >
              <span
                className={`mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                  selected ? "border-red-500 bg-red-600" : "border-gray-600"
                }`}
              >
                {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              </span>
              <span className="text-sm text-gray-200 whitespace-pre-wrap break-words">
                <span className="text-gray-500 font-mono mr-2">{String.fromCharCode(65 + index)}.</span>
                {option.text}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  if (type === "matching") {
    return (
      <div className="space-y-2">
        {(task.matching_prompts || []).map((prompt) => (
          <div
            key={prompt.id}
            className={`rounded-xl border px-4 py-3 ${matches[prompt.id] ? "border-gray-700 bg-gray-900/80" : "border-gray-800 bg-gray-900/60"}`}
          >
            <div className="flex items-center gap-2 mb-2">
              <Link2 className="h-3.5 w-3.5 text-gray-500 shrink-0" />
              <span className="text-sm text-gray-200">{prompt.text}</span>
            </div>
            <select
              value={matches[prompt.id] || ""}
              onChange={(e) => onChange({ ...value, matches: { ...matches, [prompt.id]: e.target.value } })}
              className="w-full bg-gray-950 border border-gray-700 text-sm text-white rounded-lg px-3 py-2 focus:outline-none focus:border-red-600 transition-colors"
            >
              <option value="">Select a match…</option>
              {(task.matching_choices || []).map((choice) => (
                <option key={choice.id} value={choice.id}>
                  {choice.text}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>
    );
  }

  return (
    <textarea
      className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl p-4 text-sm font-mono h-40 resize-none focus:outline-none focus:border-red-600 transition-colors placeholder-gray-600"
      placeholder="Document your approach, commands run, findings, analysis, and conclusions here..."
      value={answer}
      onChange={(e) => onChange({ ...value, answer: e.target.value })}
    />
  );
}

export function isAnswered(task, value) {
  const type = task?.question_type || "manual";
  if (type === "mcq") return Boolean(value?.answer);
  if (type === "hotspot") return Boolean(value?.answer);
  if (type === "matching") {
    const prompts = task.matching_prompts || [];
    const matches = value?.matches || {};
    return prompts.length > 0 && prompts.every((prompt) => Boolean(matches[prompt.id]));
  }
  return Boolean(String(value?.answer || "").trim());
}

export function AnsweredBadge() {
  return <CheckCircle2 className="h-3 w-3 text-green-400 shrink-0" />;
}