import React from "react";
import { CalendarDays, FileSearch, Loader2, RefreshCw } from "lucide-react";

const when = (value) => {
  const time = new Date(value || 0).getTime();
  return Number.isFinite(time) && time ? new Date(time).toLocaleDateString() : "Date not reported";
};

export default function AssessmentPicker({ organizationName, assessments = [], loading, error, selectedId, onSelect, onRefresh }) {
  return (
    <section className="sg-panel sg-enter p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <FileSearch className="h-4 w-4" /> 2 · Assessment
          </h2>
          <p className="sg-body mt-1" style={{ color: "#404040" }}>
            Imported from vPenTest for {organizationName}. Selecting one loads its findings.
          </p>
        </div>
        <button type="button" onClick={onRefresh} disabled={loading} className="sg-btn flex items-center gap-2 px-3 py-2 text-xs">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
          Refresh
        </button>
      </div>

      {error && <p className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs" style={{ color: "#7f1d1d" }}>{error}</p>}

      {loading && !assessments.length ? (
        <p className="mt-4 flex items-center gap-2 text-xs" style={{ color: "#404040" }}>
          <Loader2 className="h-4 w-4 animate-spin" /> Loading assessments…
        </p>
      ) : assessments.length ? (
        <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto pr-1">
          {assessments.map((assessment) => (
            <button
              key={assessment.id}
              type="button"
              onClick={() => onSelect(assessment)}
              className={`flex items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${selectedId === assessment.id ? "border-red-600 bg-red-50" : "border-[#d4d4d4] bg-white hover:border-red-400"}`}
            >
              <span className="min-w-0">
                <span className="block truncate font-semibold">{assessment.name}</span>
                <span className="mt-0.5 flex items-center gap-1 text-[10px]" style={{ color: "#404040" }}>
                  <CalendarDays className="h-3 w-3" /> {when(assessment.created_at)}
                  {assessment.status ? ` · ${assessment.status}` : ""}
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        !loading && <p className="mt-4 text-xs" style={{ color: "#404040" }}>No completed assessments were returned for this organization.</p>
      )}
    </section>
  );
}