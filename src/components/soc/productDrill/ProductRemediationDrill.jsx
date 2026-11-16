import React, { useMemo, useState } from "react";
import { CheckCircle, XCircle, ChevronRight, RotateCcw, Lightbulb, Terminal } from "lucide-react";
import ProductConsole from "./ProductConsole";

const PENALTY_RATIO = 0.4;

export default function ProductRemediationDrill({ spec, onComplete }) {
  const tasks = spec?.tasks || [];
  const [index, setIndex] = useState(0);
  const [solvedIds, setSolvedIds] = useState([]);
  const [wrongId, setWrongId] = useState(null);
  const [message, setMessage] = useState(null);
  const [results, setResults] = useState([]);
  const [misses, setMisses] = useState({});
  const [showHint, setShowHint] = useState(false);

  const totalPoints = useMemo(() => tasks.reduce((sum, t) => sum + (t.points || 10), 0), [tasks]);
  const earned = results.reduce((sum, r) => sum + r.points, 0);
  const finished = !!spec && index >= tasks.length;
  const current = tasks[index];

  const handleClick = (elementId) => {
    if (!current || finished) return;

    if (elementId === current.target_element_id) {
      const wrongAttempts = misses[current.id] || 0;
      const max = current.points || 10;
      const points = Math.max(0, Math.round(max * (1 - wrongAttempts * PENALTY_RATIO)));
      const nextResults = [...results, { id: current.id, step: current.step, instruction: current.instruction, wrongAttempts, points, max }];
      setResults(nextResults);
      setSolvedIds((prev) => [...prev, current.target_element_id]);
      setWrongId(null);
      setMessage(null);
      setShowHint(false);
      setIndex(index + 1);

      if (index + 1 >= tasks.length) {
        const gained = nextResults.reduce((sum, r) => sum + r.points, 0);
        const pct = totalPoints ? Math.round((gained / totalPoints) * 100) : 0;
        onComplete?.({ score: pct, earned: gained, total: totalPoints, tasks: nextResults, spec });
      }
      return;
    }

    setWrongId(elementId);
    setMessage(current.wrong_feedback || "That control does not remediate this vulnerability. Re-read the advisory: what is exposed, and where is it configured?");
    setMisses((prev) => ({ ...prev, [current.id]: (prev[current.id] || 0) + 1 }));
    window.setTimeout(() => setWrongId(null), 1400);
  };

  const retry = () => {
    setIndex(0);
    setSolvedIds([]);
    setWrongId(null);
    setMessage(null);
    setResults([]);
    setMisses({});
    setShowHint(false);
  };

  if (!spec) return null;

  const pct = totalPoints ? Math.round((earned / totalPoints) * 100) : 0;

  return (
    <div className="h-full overflow-y-auto p-4 bg-gradient-to-b from-[#070c12] to-[#0a1018]">
      <div className="max-w-6xl mx-auto space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-cyan-500/15"><Terminal className="h-5 w-5 text-cyan-400" /></div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white">
              {spec.vendor} {spec.product} — Remediation Drill
            </h2>
            <p className="text-xs text-gray-400">{spec.summary}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-xl font-bold font-mono text-cyan-400">{pct}%</div>
            <div className="text-[10px] text-gray-500">remediation score</div>
          </div>
        </div>

        {/* Task rail */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-3 space-y-2">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-gray-500 font-mono">
            <span>Remediation steps</span>
            <span>{Math.min(results.length, tasks.length)}/{tasks.length} complete</span>
          </div>
          {tasks.map((task, i) => {
            const done = i < results.length;
            const active = i === index;
            return (
              <div
                key={task.id}
                className={`flex items-start gap-2.5 rounded-lg px-3 py-2 border transition-colors ${
                  done
                    ? "border-emerald-500/30 bg-emerald-500/10"
                    : active
                    ? "border-cyan-500/50 bg-cyan-500/10"
                    : "border-white/10 bg-black/20"
                }`}
              >
                {done ? (
                  <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                ) : (
                  <span className={`h-4 w-4 rounded-full border text-[9px] font-bold flex items-center justify-center shrink-0 mt-0.5 ${active ? "border-cyan-400 text-cyan-300" : "border-gray-600 text-gray-500"}`}>
                    {i + 1}
                  </span>
                )}
                <div className="min-w-0 flex-1">
                  <p className={`text-xs leading-relaxed ${done ? "text-emerald-200/80" : active ? "text-white" : "text-gray-400"}`}>
                    {task.instruction}
                  </p>
                  {done && results[i]?.points < results[i]?.max && (
                    <p className="text-[10px] text-amber-400/80 mt-0.5">
                      {results[i].wrongAttempts} wrong click(s) · {results[i].points}/{results[i].max} pts
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {message && !finished && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
            <XCircle className="h-4 w-4 shrink-0 mt-0.5" /> {message}
          </div>
        )}

        <ProductConsole
          spec={spec}
          onElementClick={handleClick}
          solvedIds={solvedIds}
          wrongId={wrongId}
          locked={finished}
        />

        <div className="flex items-center gap-2 flex-wrap">
          {!finished && current?.hint && (
            <button
              onClick={() => setShowHint((v) => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-amber-300 border border-amber-500/30 hover:bg-amber-500/10 transition-colors"
            >
              <Lightbulb className="h-3.5 w-3.5" /> {showHint ? "Hide hint" : "Show hint"}
            </button>
          )}
          {showHint && !finished && <span className="text-xs text-amber-200/80">{current?.hint}</span>}
          {finished && (
            <button
              onClick={retry}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/10 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Run again
            </button>
          )}
        </div>

        {finished && (
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/5 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold font-mono text-cyan-300">{pct}%</div>
              <div className="flex-1">
                <div className="text-sm font-semibold text-white">Remediation drill complete</div>
                <div className="text-xs text-gray-400">
                  {earned} of {totalPoints} points · recorded with this drill session
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              {results.map((r) => {
                const task = tasks.find((t) => t.id === r.id);
                return (
                  <div key={r.id} className="flex items-start gap-2 rounded-lg bg-black/30 px-3 py-2">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-gray-200">{r.instruction}</p>
                      {task?.rationale && <p className="text-[10px] text-gray-500 mt-0.5">{task.rationale}</p>}
                    </div>
                    <span className="text-[10px] font-mono text-gray-400 shrink-0">{r.points}/{r.max}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <ChevronRight className="h-3 w-3" /> Continue in the SOC tools to close out the incident.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}