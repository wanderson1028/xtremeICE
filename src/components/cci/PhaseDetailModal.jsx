import React, { useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { X, Loader2, TrendingUp, ShieldAlert, Target } from "lucide-react";

const money = (value) => {
  const n = Number(value || 0);
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n >= 10_000_000 ? 1 : 2)}M`;
  if (n >= 1_000) return `$${Math.round(n / 1_000)}K`;
  return `$${n.toLocaleString()}`;
};

export default function PhaseDetailModal({ phase, index, scenarioName, adversary, phaseCost, exposure, done, onClose }) {
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
      prompt: `You are a cybersecurity financial impact analyst. Provide a detailed analysis of the following MITRE ATT&CK phase in the context of a business impact simulation.

Scenario: ${scenarioName}
Adversary: ${adversary.name} (${adversary.alias}) — Motive: ${adversary.motive}
Phase: ${phase[0]} (${phase[1]})
Technique: ${phase[2]}
Description: ${phase[3]}
Operational consequence: ${phase[6]}
Modeled phase cost: ${money(phaseCost)}
Exposure added (potential future loss): ${money(exposure)}

Provide a structured analysis with these four sections, each 2-4 sentences:
1. BUSINESS IMPACT BREAKDOWN — How this phase translates to financial and operational damage (downtime, data loss, recovery cost, reputational exposure).
2. DETECTION OPPORTUNITIES — Key telemetry, logs, and alerts that would reveal this activity.
3. MITIGATION & CONTAINMENT — Prioritized actions to reduce the impact or stop progression at this phase.
4. ADVERSARY CONTEXT — How ${adversary.name} specifically leverages this technique based on their known TTPs.

Use plain text with clear numbered section headers. Do not use markdown.`
    }).then(res => {
      if (!cancelled) setAnalysis(typeof res === "string" ? res : res?.data || JSON.stringify(res));
    }).catch(err => {
      if (!cancelled) setError(err?.message || "Analysis unavailable");
    }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [phase?.[0], adversary?.id]);

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
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-400"><TrendingUp className="h-3.5 w-3.5" /> Phase cost</div>
              <div className="mt-1.5 text-xl font-semibold text-cyan-300">{money(phaseCost)}</div>
            </div>
            <div className="rounded-xl border border-orange-500/20 bg-orange-950/20 p-3">
              <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-slate-400"><ShieldAlert className="h-3.5 w-3.5" /> Exposure added</div>
              <div className="mt-1.5 text-xl font-semibold text-orange-300">{money(exposure)}</div>
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