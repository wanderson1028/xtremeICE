import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Loader2, TrendingUp, ShieldAlert, Target } from "lucide-react";

const points = (value) => `${Math.max(0, Math.round(Number(value || 0)))} pts`;

export default function PhaseDetailModal({ phase, index, scenarioName, adversary, phasePoints, projectedScore, done, onClose }) {
  const [analysis, setAnalysis] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!phase) return;
    let cancelled = false;
    setLoading(true);
    setError("");
    setAnalysis("");
    base44.integrations.Core.InvokeLLM({
      prompt: `You are a cybersecurity rating analyst. Explain the following attack phase in a point-based security rating simulation.

Scenario: ${scenarioName}
Adversary: ${adversary.name} (${adversary.alias}) — Motive: ${adversary.motive}
Phase: ${phase[0]} (${phase[1]})
Technique: ${phase[2]}
Description: ${phase[3]}
Operational consequence: ${phase[6]}
Illustrative phase deduction: ${points(phasePoints)}
Illustrative projected rating after this phase: ${projectedScore}/850

Provide a structured analysis with these four sections, each 2-4 sentences:
1. RATING IMPACT — Why this phase warrants the displayed point deduction and which aspects of security posture it represents.
2. DETECTION OPPORTUNITIES — Key telemetry, logs, and alerts that would reveal this activity.
3. MITIGATION & CONTAINMENT — Prioritized actions to reduce impact or stop progression.
4. ADVERSARY CONTEXT — How ${adversary.name} is represented in this scenario.

Clarify that scenario points are illustrative and that the saved CCI rating is calculated only from VulScan and vPentest. Use plain text with clear numbered section headers. Do not use markdown.`
    }).then(res => {
      if (!cancelled) setAnalysis(typeof res === "string" ? res : res?.data || JSON.stringify(res));
    }).catch(err => {
      if (!cancelled) setError(err?.message || "Analysis unavailable");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [phase?.[0], adversary?.id, phasePoints, projectedScore]);

  if (!phase) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onClose}>
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-800 bg-slate-950/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className={`flex h-10 w-10 items-center justify-center rounded-full border ${done ? "border-cyan-400/60 bg-cyan-950 text-cyan-300" : "border-slate-700 bg-slate-900 text-slate-400"}`}>
              <span className="text-sm font-bold">{index + 1}</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-semibold text-white">{phase[0]}</h3>
                <span className="rounded border border-slate-700 px-2 py-0.5 text-[10px] text-slate-400">{phase[1]}</span>
              </div>
              <div className="mt-0.5 text-xs text-cyan-300">{phase[2]}</div>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5 px-6 py-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-cyan-500/20 bg-cyan-950/20 p-3">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-400"><TrendingUp className="h-3.5 w-3.5" /> Phase deduction</div>
              <div className="mt-1.5 text-xl font-semibold text-cyan-300">−{points(phasePoints)}</div>
            </div>
            <div className="rounded-xl border border-orange-500/20 bg-orange-950/20 p-3">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-400"><ShieldAlert className="h-3.5 w-3.5" /> Projected rating</div>
              <div className="mt-1.5 text-xl font-semibold text-orange-300">{projectedScore}<span className="ml-1 text-xs text-slate-500">/850</span></div>
            </div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Description</div>
            <p className="mt-1.5 text-sm text-slate-200">{phase[3]}</p>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-widest text-slate-500">Operational consequence</div>
            <p className="mt-1.5 text-sm text-slate-400">{phase[6]}</p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-4">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-amber-300">
              <Target className="h-4 w-4" /> Detailed analysis
            </div>
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Loader2 className="h-4 w-4 animate-spin" /> Generating phase analysis…
              </div>
            ) : error ? (
              <p className="text-sm text-red-400">{error}</p>
            ) : (
              <div className="whitespace-pre-wrap text-sm leading-relaxed text-slate-300">{analysis}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}