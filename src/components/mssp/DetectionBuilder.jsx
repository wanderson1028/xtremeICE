import React, { useMemo, useState } from "react";
import { FlaskConical, CircleCheck, CircleAlert, Zap } from "lucide-react";
import { getFields, getFieldValues } from "@/lib/mssp/model";

const OPERATORS = [
  { key: "equals", label: "equals" },
  { key: "contains", label: "contains" },
  { key: "not_equals", label: "does not equal" },
  { key: "greater_than", label: "greater than" },
];

const INPUT =
  "w-full rounded-lg border border-white/10 bg-slate-950/60 px-2.5 py-2 text-[11px] text-white placeholder:text-slate-500 focus:border-red-500/50 focus:outline-none";

export default function DetectionBuilder({ scenario, rule, onRuleChange, result, onTest }) {
  const [tested, setTested] = useState(false);
  const sources = scenario.detection.sources;
  const fields = useMemo(() => getFields(scenario.telemetry, rule.source), [scenario.telemetry, rule.source]);
  const values = useMemo(
    () => (rule.field ? getFieldValues(scenario.telemetry, rule.source, rule.field) : []),
    [scenario.telemetry, rule.source, rule.field]
  );

  const set = (patch) => onRuleChange({ ...rule, ...patch });

  const runTest = () => {
    onTest();
    setTested(true);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-red-300">{scenario.detection.id}</div>
            <h3 className="mt-0.5 text-sm font-semibold text-white">{scenario.detection.title}</h3>
          </div>
          <span className="shrink-0 rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-slate-400">
            Detection
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-relaxed text-slate-300">{scenario.detection.goal}</p>
        <p className="mt-1.5 text-[10px] leading-relaxed text-slate-500">{scenario.detection.guidance}</p>
      </div>

      <div className="space-y-3 rounded-xl border border-white/10 bg-slate-950/40 p-3.5">
        <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Rule builder</div>

        <div className="grid gap-2.5 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold text-slate-400">Log source</span>
            <select
              value={rule.source}
              onChange={(e) => set({ source: e.target.value, field: "", value: "" })}
              className={INPUT}
            >
              {sources.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold text-slate-400">Field</span>
            <select
              value={rule.field}
              onChange={(e) => set({ field: e.target.value, value: "" })}
              className={INPUT}
            >
              <option value="">Select a field…</option>
              {fields.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold text-slate-400">Condition</span>
            <select value={rule.operator} onChange={(e) => set({ operator: e.target.value })} className={INPUT}>
              {OPERATORS.map((o) => (
                <option key={o.key} value={o.key}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-[10px] font-semibold text-slate-400">Matches at least (threshold)</span>
            <input
              type="number"
              min="1"
              max="20"
              value={rule.threshold}
              onChange={(e) => set({ threshold: Number(e.target.value) })}
              className={INPUT}
            />
          </label>
        </div>

        <label className="block">
          <span className="mb-1 block text-[10px] font-semibold text-slate-400">Value</span>
          <input
            value={rule.value}
            onChange={(e) => set({ value: e.target.value })}
            placeholder={rule.field ? `e.g. ${values[0] ?? "value"}` : "Choose a field first"}
            className={INPUT}
          />
          {values.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {values.slice(0, 6).map((v) => (
                <button
                  key={v}
                  onClick={() => set({ value: v })}
                  className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[10px] text-slate-400 hover:border-white/25 hover:text-white"
                >
                  {v}
                </button>
              ))}
            </div>
          )}
        </label>

        <div className="rounded-lg border border-white/10 bg-black/30 p-2 font-mono text-[10.5px] leading-relaxed text-slate-300">
          <span className="text-cyan-300">rule</span> where <span className="text-amber-300">source</span>=
          <span className="text-slate-100">"{rule.source}"</span> and <span className="text-amber-300">{rule.field || "field"}</span>{" "}
          <span className="text-rose-300">{rule.operator.replace("_", " ")}</span>{" "}
          <span className="text-slate-100">"{rule.value || "value"}"</span> count &ge; {rule.threshold}
        </div>

        <button
          onClick={runTest}
          disabled={!rule.field || !rule.value}
          className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-200 transition-colors hover:border-red-500/70 hover:bg-red-900/50 hover:text-white disabled:opacity-40 sm:w-auto btn-3d"
        >
          <FlaskConical className="h-3.5 w-3.5" /> Test against event stream
        </button>
      </div>

      {tested && result && (
        <div className="space-y-2.5 rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[10px] font-bold uppercase tracking-wide ${
                result.score >= 0.9
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300"
                  : result.score >= 0.5
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                  : "border-rose-500/40 bg-rose-500/10 text-rose-300"
              }`}
            >
              {result.score >= 0.9 ? <CircleCheck className="h-3 w-3" /> : <CircleAlert className="h-3 w-3" />}
              {result.verdict}
            </span>
            <span className="text-[10px] text-slate-400">
              {result.evaluation.matched.length} match{result.evaluation.matched.length === 1 ? "" : "es"} ·{" "}
              {result.evaluation.benign.length} benign · {result.evaluation.fires ? "fires" : "silent"}
            </span>
          </div>

          <p className="text-[11px] leading-relaxed text-slate-300">{result.message}</p>

          <div className="max-h-52 overflow-y-auto rounded-lg border border-white/10 bg-black/30">
            {result.evaluation.matched.length === 0 && (
              <div className="p-3 text-center text-[10px] text-slate-500">No events matched this rule.</div>
            )}
            {result.evaluation.matched.map((e) => (
              <div key={e.id} className="border-b border-white/5 px-2.5 py-1.5 last:border-0">
                <div className="flex items-center gap-1.5">
                  <Zap className="h-2.5 w-2.5 text-amber-400" />
                  <span className="font-mono text-[9.5px] text-slate-500">{e.ts}</span>
                  <span className="text-[9.5px] text-slate-500">{e.source}</span>
                </div>
                <div className="mt-0.5 break-words font-mono text-[10px] leading-relaxed text-slate-300">{e.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}