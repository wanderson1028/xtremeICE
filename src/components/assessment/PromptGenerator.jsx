import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Sparkles, Loader2 } from "lucide-react";
import { fromGeneratedQuestions } from "@/lib/assessmentQuestions";

const inputCls =
  "w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-colors placeholder-gray-600";
const labelCls = "block text-sm font-medium text-gray-300 mb-1.5";

const EXAMPLES = [
  "Junior SOC analyst: log sources, alert triage, MITRE ATT&CK basics",
  "Network security: VLANs, routing, firewall zone placement",
  "Cloud security on AWS: IAM, S3 exposure, shared responsibility",
];

export default function PromptGenerator({ onGenerated, scenario, onScenarioChange }) {
  const [prompt, setPrompt] = useState("");
  const [mcqCount, setMcqCount] = useState(5);
  const [matchingCount, setMatchingCount] = useState(2);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  const total = (Number(mcqCount) || 0) + (Number(matchingCount) || 0);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError("Describe what the test should cover.");
      return;
    }
    if (total < 1 || total > 20) {
      setError("Ask for between 1 and 20 questions in total.");
      return;
    }
    setError("");
    setStatus("");
    setBusy(true);
    try {
      const res = await base44.functions.invoke("generateApplicationQuestions", {
        prompt: prompt.trim(),
        scenario: String(scenario || "").trim(),
        mcq_count: Number(mcqCount) || 0,
        matching_count: Number(matchingCount) || 0,
      });
      const generated = fromGeneratedQuestions(res.data?.questions || []);
      if (!generated.length) {
        setError("No usable questions came back. Try a more specific brief.");
        return;
      }
      const generatedScenario = String(res.data?.scenario || "").trim();
      const adoptedScenario = Boolean(generatedScenario) && !String(scenario || "").trim();
      if (adoptedScenario) onScenarioChange(generatedScenario);
      onGenerated(generated);
      setStatus(
        `Added ${generated.length} question${generated.length === 1 ? "" : "s"} below${adoptedScenario ? " plus the scenario they follow" : ""} — edit, reorder or remove any of them.`
      );
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Question generation failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-gray-900/60 border border-red-900/40 rounded-xl p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="icon-3d h-9 w-9 rounded-lg bg-red-950/60 border border-red-900/50 flex items-center justify-center shrink-0">
          <Sparkles className="h-4 w-4 text-red-400" />
        </div>
        <div>
          <h2 className="text-white font-semibold text-lg leading-tight">Generate Questions From a Brief</h2>
          <p className="text-gray-500 text-xs mt-0.5">
            Describe the role or topics. Draft questions are added to the list for you to edit before saving.
          </p>
        </div>
      </div>

      <div>
        <label className={labelCls}>What should this test cover?</label>
        <textarea
          rows={4}
          className={inputCls + " resize-none"}
          placeholder="e.g. Entry-level SOC analyst — alert triage, Windows event logs, phishing analysis, MITRE ATT&CK tactics"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="flex flex-wrap gap-2 mt-2">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setPrompt(example)}
              className="text-[11px] px-2.5 py-1 rounded-full border border-gray-700 text-gray-400 hover:text-white hover:border-red-700 transition-colors"
            >
              {example.split(":")[0]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelCls}>Multiple Choice</label>
          <input
            type="number"
            min="0"
            max="15"
            className={inputCls}
            value={mcqCount}
            onChange={(e) => setMcqCount(e.target.value)}
          />
        </div>
        <div>
          <label className={labelCls}>Matching</label>
          <input
            type="number"
            min="0"
            max="10"
            className={inputCls}
            value={matchingCount}
            onChange={(e) => setMatchingCount(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">{error}</div>
      )}
      {status && !error && (
        <div className="p-3 bg-green-900/20 border border-green-800/50 rounded-lg text-green-300 text-sm">{status}</div>
      )}

      <div className="flex items-center justify-between gap-4">
        <p className="text-gray-500 text-xs">
          {total} question{total === 1 ? "" : "s"} will be drafted. Answer keys are kept out of the candidate view.
        </p>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={busy}
          className="btn-3d flex items-center gap-2 px-5 py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors shrink-0"
        >
          {busy ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Generating…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Generate Questions
            </>
          )}
        </button>
      </div>
    </div>
  );
}