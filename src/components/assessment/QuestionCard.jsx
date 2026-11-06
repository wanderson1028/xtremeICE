import React from "react";
import { Trash2, Plus, ArrowUp, ArrowDown, ListChecks } from "lucide-react";
import { QUESTION_TYPE_LABEL, uid } from "@/lib/assessmentQuestions";

const inputCls =
  "w-full bg-gray-950 border border-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-600 transition-colors placeholder-gray-600";
const microLabel = "block text-[10px] uppercase tracking-wider text-gray-500 mb-1.5";

export default function QuestionCard({ question, index, total, onChange, onRemove, onMove }) {
  const patch = (updates) => onChange({ ...question, ...updates });

  const updateOption = (id, text) =>
    patch({ options: question.options.map((o) => (o.id === id ? { ...o, text } : o)) });

  const removeOption = (id) => {
    const credits = { ...(question.option_credits || {}) };
    delete credits[id];
    patch({
      options: question.options.filter((o) => o.id !== id),
      correct_option_id: question.correct_option_id === id ? "" : question.correct_option_id,
      option_credits: credits,
    });
  };

  const setCredit = (id, percent) => {
    const credits = { ...(question.option_credits || {}) };
    if (percent > 0) credits[id] = Math.min(95, percent) / 100;
    else delete credits[id];
    patch({ option_credits: credits });
  };

  const updatePrompt = (id, text) =>
    patch({ matching_prompts: question.matching_prompts.map((p) => (p.id === id ? { ...p, text } : p)) });

  const updateChoice = (id, text) =>
    patch({ matching_choices: question.matching_choices.map((c) => (c.id === id ? { ...c, text } : c)) });

  const removeChoice = (id) => {
    const answers = { ...(question.matching_answer || {}) };
    Object.keys(answers).forEach((promptId) => {
      if (answers[promptId] === id) delete answers[promptId];
    });
    patch({
      matching_choices: question.matching_choices.filter((c) => c.id !== id),
      matching_answer: answers,
    });
  };

  const removePrompt = (id) => {
    const answers = { ...(question.matching_answer || {}) };
    delete answers[id];
    patch({
      matching_prompts: question.matching_prompts.filter((p) => p.id !== id),
      matching_answer: answers,
    });
  };

  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="h-6 w-6 rounded-full bg-red-900/40 border border-red-700/40 text-red-400 text-[11px] font-bold flex items-center justify-center shrink-0">
          {index + 1}
        </span>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-300 uppercase tracking-wide">
          {QUESTION_TYPE_LABEL[question.question_type] || question.question_type}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(index, -1)}
            disabled={index === 0}
            className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded disabled:opacity-30 transition-colors"
            title="Move up"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onMove(index, 1)}
            disabled={index === total - 1}
            className="p-1.5 text-gray-500 hover:text-white hover:bg-gray-800 rounded disabled:opacity-30 transition-colors"
            title="Move down"
          >
            <ArrowDown className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onRemove(index)}
            className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded transition-colors"
            title="Remove question"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="mb-3">
        <label className={microLabel}>Question</label>
        <input
          className={inputCls}
          placeholder="e.g. Which protocol resolves hostnames to IP addresses?"
          value={question.title}
          onChange={(e) => patch({ title: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[1fr_180px_90px] gap-3 mb-4">
        <div>
          <label className={microLabel}>Instructions (optional)</label>
          <input
            className={inputCls}
            placeholder="Optional context shown to the candidate"
            value={question.description}
            onChange={(e) => patch({ description: e.target.value })}
          />
        </div>
        <div>
          <label className={microLabel}>Theme</label>
          <input
            className={inputCls}
            placeholder="e.g. Alert Triage"
            value={question.theme || ""}
            onChange={(e) => patch({ theme: e.target.value })}
          />
        </div>
        <div>
          <label className={microLabel}>Points</label>
          <input
            type="number"
            min="1"
            className={inputCls}
            value={question.points}
            onChange={(e) => patch({ points: Number(e.target.value) })}
          />
        </div>
      </div>

      {question.question_type === "mcq" && (
        <div>
          <p className={microLabel}>Answer choices — select the correct one, set partial credit on the rest</p>
          <div className="space-y-2">
            {question.options.map((option) => (
              <div
                key={option.id}
                className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                  question.correct_option_id === option.id
                    ? "border-green-700/60 bg-green-950/20"
                    : "border-gray-700 bg-gray-950/50"
                }`}
              >
                <input
                  type="radio"
                  name={`correct-${question.key}`}
                  checked={question.correct_option_id === option.id}
                  onChange={() => patch({ correct_option_id: option.id })}
                  className="h-3.5 w-3.5 accent-green-500 shrink-0"
                />
                <input
                  className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-gray-600"
                  placeholder="Choice text"
                  value={option.text}
                  onChange={(e) => updateOption(option.id, e.target.value)}
                />
                {question.correct_option_id === option.id ? (
                  <span className="text-[10px] font-semibold text-green-400 bg-green-950/40 border border-green-800/50 rounded px-1.5 py-0.5 shrink-0">
                    100%
                  </span>
                ) : (
                  <div className="flex items-center gap-1 shrink-0" title="Partial credit if the candidate picks this answer">
                    <input
                      type="number"
                      min="0"
                      max="95"
                      step="5"
                      className="w-14 bg-gray-900 border border-gray-700 text-white rounded px-1.5 py-1 text-[11px] text-right focus:outline-none focus:border-amber-600"
                      value={Math.round((Number((question.option_credits || {})[option.id]) || 0) * 100)}
                      onChange={(e) => setCredit(option.id, Number(e.target.value) || 0)}
                    />
                    <span className="text-[10px] text-gray-500">%</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => removeOption(option.id)}
                  disabled={question.options.length <= 2}
                  className="p-1 text-gray-600 hover:text-red-400 disabled:opacity-30 transition-colors"
                  title="Remove choice"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => patch({ options: [...question.options, { id: uid(), text: "" }] })}
            className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
          >
            <Plus className="h-3 w-3" /> Add choice
          </button>
        </div>
      )}

      {question.question_type === "matching" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p className={microLabel}>Items to match — pick the correct answer</p>
            <div className="space-y-2">
              {question.matching_prompts.map((prompt) => (
                <div key={prompt.id} className="rounded-lg border border-gray-700 bg-gray-950/50 px-3 py-2 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-gray-600"
                      placeholder="Item (e.g. Port 443)"
                      value={prompt.text}
                      onChange={(e) => updatePrompt(prompt.id, e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => removePrompt(prompt.id)}
                      disabled={question.matching_prompts.length <= 1}
                      className="p-1 text-gray-600 hover:text-red-400 disabled:opacity-30 transition-colors"
                      title="Remove item"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <select
                    value={(question.matching_answer || {})[prompt.id] || ""}
                    onChange={(e) =>
                      patch({ matching_answer: { ...(question.matching_answer || {}), [prompt.id]: e.target.value } })
                    }
                    className="w-full bg-gray-900 border border-gray-700 text-xs text-gray-200 rounded px-2 py-1.5 focus:outline-none focus:border-green-600"
                  >
                    <option value="">Select correct match…</option>
                    {question.matching_choices.map((choice) => (
                      <option key={choice.id} value={choice.id}>
                        {choice.text || "(empty option)"}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                patch({ matching_prompts: [...question.matching_prompts, { id: uid(), text: "" }] })
              }
              className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
            >
              <Plus className="h-3 w-3" /> Add item
            </button>
          </div>

          <div>
            <p className={microLabel}>Match options</p>
            <div className="space-y-2">
              {question.matching_choices.map((choice) => (
                <div key={choice.id} className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-950/50 px-3 py-2">
                  <ListChecks className="h-3.5 w-3.5 text-gray-600 shrink-0" />
                  <input
                    className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder-gray-600"
                    placeholder="Match option (e.g. HTTPS)"
                    value={choice.text}
                    onChange={(e) => updateChoice(choice.id, e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => removeChoice(choice.id)}
                    disabled={question.matching_choices.length <= 2}
                    className="p-1 text-gray-600 hover:text-red-400 disabled:opacity-30 transition-colors"
                    title="Remove option"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={() =>
                patch({ matching_choices: [...question.matching_choices, { id: uid(), text: "" }] })
              }
              className="mt-2 flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition-colors"
            >
              <Plus className="h-3 w-3" /> Add option
            </button>
          </div>
        </div>
      )}
    </div>
  );
}