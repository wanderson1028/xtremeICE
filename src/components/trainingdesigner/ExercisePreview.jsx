import React from "react";
import { ClipboardList, Loader2, Save } from "lucide-react";
import ExerciseTaskEditor from "./ExerciseTaskEditor";

const asLines = (list) => (Array.isArray(list) ? list.join("\n") : "");
const fromLines = (text) => text.split("\n").map((line) => line.trim()).filter(Boolean);

export default function ExercisePreview({ draft, setDraft, onSave, saving, error }) {
  if (!draft) return null;

  const set = (key, value) => setDraft({ ...draft, [key]: value });

  const updateTask = (index, task) => {
    const tasks = [...(draft.tasks || [])];
    tasks[index] = task;
    set("tasks", tasks);
  };

  const removeTask = (index) => set("tasks", (draft.tasks || []).filter((_, i) => i !== index));

  return (
    <section className="sg-panel sg-enter p-5">
      <h2 className="flex items-center gap-2 text-sm font-semibold">
        <ClipboardList className="h-4 w-4" /> 6 · Review and save
      </h2>
      <p className="sg-body mt-1" style={{ color: "#404040" }}>
        Edit anything the generator produced, then save the exercise to the training area.
      </p>

      {error && <p className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs" style={{ color: "#7f1d1d" }}>{error}</p>}

      <label className="mt-4 block">
        <span className="sg-micro">Exercise title</span>
        <input value={draft.title || ""} onChange={(event) => set("title", event.target.value)} className="sg-input mt-1 h-10 w-full px-3 text-sm font-semibold" />
      </label>

      <label className="mt-3 block">
        <span className="sg-micro">Summary</span>
        <textarea value={draft.summary || ""} onChange={(event) => set("summary", event.target.value)} rows={2} className="sg-input mt-1 w-full px-3 py-2 text-sm" />
      </label>

      <label className="mt-3 block">
        <span className="sg-micro">Scenario</span>
        <textarea value={draft.scenario || ""} onChange={(event) => set("scenario", event.target.value)} rows={6} className="sg-input mt-1 w-full px-3 py-2 text-sm" />
      </label>

      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="block">
          <span className="sg-micro">Objectives (one per line)</span>
          <textarea
            value={asLines(draft.objectives)}
            onChange={(event) => set("objectives", fromLines(event.target.value))}
            rows={5}
            className="sg-input mt-1 w-full px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="sg-micro">Success criteria (one per line)</span>
          <textarea
            value={asLines(draft.success_criteria)}
            onChange={(event) => set("success_criteria", fromLines(event.target.value))}
            rows={5}
            className="sg-input mt-1 w-full px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="mt-4">
        <span className="sg-micro">Tasks</span>
        <div className="mt-2 space-y-2">
          {(draft.tasks || []).map((task, index) => (
            <ExerciseTaskEditor key={task.id || index} task={task} index={index} onChange={(next) => updateTask(index, next)} onRemove={() => removeTask(index)} />
          ))}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2 border-t pt-4" style={{ borderColor: "#d4d4d4" }}>
        <button type="button" onClick={onSave} disabled={saving || !(draft.tasks || []).length} className="sg-btn-primary flex items-center gap-2 px-4 py-2 text-xs font-semibold">
          {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
          {saving ? "Saving…" : "Save exercise"}
        </button>
        <span className="text-[11px]" style={{ color: "#404040" }}>
          After saving, assign the exercise to individual learners or the whole organization.
        </span>
      </div>
    </section>
  );
}