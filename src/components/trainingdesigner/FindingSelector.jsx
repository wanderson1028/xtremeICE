import React, { useMemo } from "react";
import { Loader2, ShieldAlert } from "lucide-react";

const severityStyle = (severity) => {
  const value = String(severity || "").toLowerCase();
  if (value.includes("critical")) return { border: "#991b1b", background: "#fef2f2", color: "#7f1d1d" };
  if (value.includes("high")) return { border: "#dc2626", background: "#fef2f2", color: "#991b1b" };
  if (value.includes("medium")) return { border: "#f59e0b", background: "#fffbeb", color: "#92400e" };
  if (value.includes("low")) return { border: "#0f9d58", background: "#f0fdf4", color: "#166534" };
  return { border: "#a3a3a3", background: "#f5f5f5", color: "#404040" };
};

export default function FindingSelector({ findings = [], loading, error, selectedIds = [], onToggle, onSelectAll, onClear }) {
  const selected = useMemo(() => new Set(selectedIds), [selectedIds]);
  const selectable = findings.length;

  return (
    <section className="sg-panel sg-enter p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <ShieldAlert className="h-4 w-4" /> 3 · Findings
          </h2>
          <p className="sg-body mt-1" style={{ color: "#404040" }}>
            Pick the findings the exercise should be built on. {selectedIds.length} of {selectable} selected.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => onSelectAll(findings)} className="sg-btn px-3 py-2 text-xs">Select all</button>
          <button type="button" onClick={onClear} className="sg-btn px-3 py-2 text-xs">Clear</button>
        </div>
      </div>

      {error && <p className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs" style={{ color: "#7f1d1d" }}>{error}</p>}

      {loading ? (
        <p className="mt-4 flex items-center gap-2 text-xs" style={{ color: "#404040" }}>
          <Loader2 className="h-4 w-4 animate-spin" /> Loading findings from vPenTest…
        </p>
      ) : findings.length ? (
        <div className="mt-3 max-h-96 space-y-2 overflow-y-auto pr-1">
          {findings.map((finding) => {
            const tone = severityStyle(finding.severity);
            const isOn = selected.has(finding.id);
            return (
              <label
                key={finding.id}
                className={`flex cursor-pointer gap-3 rounded-lg border px-3 py-2.5 transition ${isOn ? "border-red-600 bg-red-50" : "border-[#d4d4d4] bg-white hover:border-red-300"}`}
              >
                <input type="checkbox" checked={isOn} onChange={() => onToggle(finding.id)} className="mt-1 h-4 w-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-semibold">{finding.title}</span>
                    <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide" style={tone}>
                      {finding.severity || "unspecified"}
                    </span>
                  </span>
                  <span className="mt-1 block text-[11px]" style={{ color: "#404040" }}>
                    {[finding.asset, finding.assessment_type, finding.mitre_technique_id].filter(Boolean).join(" · ") || "No asset reported"}
                  </span>
                  {finding.evidence && (
                    <span className="mt-1 block line-clamp-2 text-[11px]" style={{ color: "#525252" }}>{finding.evidence}</span>
                  )}
                </span>
              </label>
            );
          })}
        </div>
      ) : (
        !loading && <p className="mt-4 text-xs" style={{ color: "#404040" }}>This assessment returned no findings. Choose another assessment.</p>
      )}
    </section>
  );
}