import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Wand2, Loader2, ArrowRight } from "lucide-react";
import { fromGeneratedQuestions } from "@/lib/assessmentQuestions";

const AI_TYPES = ["mcq", "matching"];

const EXAMPLES = [
  "Add two harder questions about firewall rule ordering",
  "Make the scenario a hospital instead of a logistics company",
  "Turn question 2 into a matching question",
  "Shorten the test to 5 questions and drop the easy ones",
];

const inputCls =
  "w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-colors placeholder-gray-600";

export default function PromptEditor({ details, questions, onRefined }) {
  const [instruction, setInstruction] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [changes, setChanges] = useState([]);

  const aiQuestions = (questions || []).filter((q) => AI_TYPES.includes(q.question_type));

  const handleApply = async () => {
    if (!instruction.trim()) {
      setError("Describe the change you want.");
      return;
    }
    if (!aiQuestions.length) {
      setError("Add at least one multiple-choice or matching question first.");
      return;
    }
    setError("");
    setChanges([]);
    setBusy(true);
    try {
      const res = await base44.functions.invoke("refineApplicationQuestions", {
        instruction: instruction.trim(),
        details,
        questions: aiQuestions,
      });
      const refined = fromGeneratedQuestions(res.data?.questions || []);
      if (!refined.length) {
        setError("The edit came back empty. Try rephrasing what you want changed.");
        return;
      }
      const keptManual = (questions || []).filter((q) => !AI_TYPES.includes(q.question_type));
      onRefined({ details: res.data?.details || {}, questions: [...refined, ...keptManual] });
      setChanges(Array.isArray(res.data?.changes) ? res.data.changes : []);
      setInstruction("");
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "That edit could not be applied.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 space-y-3">
      <div className="flex items-start gap-3">
        <div className="icon-3d h-9 w-9 rounded-lg bg-red-950/60 border border-red-900/50 flex items-center justify-center shrink-0">
          <Wand2 className="h-4 w-4 text-red-400" />
        </div>
        <div>
          <h2 className="text-white font-semibold text-lg leading-tight">Edit This Test With a Prompt</h2>
          <p className="text-gray-500 text-xs mt-0.5">
            Describe the change in plain language — the AI rewrites the details and questions just as you asked.
            Nothing is saved until you press Save, so you can undo by reloading.
          </p>
        </div>
      </div>

      <textarea
        rows={3}
        className={inputCls + " resize-none"}
        placeholder="e.g. Make the scenario a healthcare help desk and add three questions about phishing triage"
        value={instruction}
        onChange={(e) => setInstruction(e.target.value)}
      />

      <div className="flex flex-wrap gap-2">
        {EXAMPLES.map((example) => (
          <button
            key={example}
            type="button"
            onClick={() => setInstruction(example)}
            className="text-[11px] px-2.5 py-1 rounded-full border border-gray-700 text-gray-400 hover:text-white hover:border-red-700 transition-colors"
          >
            {example}
          </button>
        ))}
      </div>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">{error}</div>
      )}

      {changes.length > 0 && !error && (
        <div className="p-3 bg-green-900/20 border border-green-800/50 rounded-lg space-y-1">
          <p className="text-green-300 text-sm font-medium">Applied — review it below, then save.</p>
          <ul className="space-y-1">
            {changes.map((change) => (
              <li key={change} className="flex items-start gap-1.5 text-green-200/90 text-xs">
                <ArrowRight className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{change}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <p className="text-gray-500 text-xs">
          {aiQuestions.length
            ? `Edits the ${aiQuestions.length} multiple-choice and matching question${aiQuestions.length === 1 ? "" : "s"} plus the test details.`
            : "Add a multiple-choice or matching question to enable prompt edits."}
        </p>
        <button
          type="button"
          onClick={handleApply}
          disabled={busy || !aiQuestions.length}
          className="btn-3d flex items-center gap-2 px-5 py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors shrink-0"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Applying…
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4" /> Apply Edit
            </>
          )}
        </button>
      </div>
    </div>
  );
}