import React from "react";
import { Users, CheckCircle2, Clock, TrendingUp, ClipboardList } from "lucide-react";
import { completionMinutes, formatDuration, isFinished } from "@/lib/assessmentTiming";

export default function TrackerGroupHeader({ assessment, rows }) {
  const completedRows = rows.filter(({ inv, session }) => isFinished(inv, session));
  const scored = rows.map(({ scorecard }) => scorecard).filter(Boolean);
  const avgScore = scored.length
    ? Math.round(scored.reduce((sum, sc) => sum + (sc.overall_score || 0), 0) / scored.length)
    : null;
  const times = completedRows.map(({ session }) => completionMinutes(session)).filter((minutes) => minutes > 0);
  const avgTime = times.length ? Math.round(times.reduce((sum, minutes) => sum + minutes, 0) / times.length) : null;

  return (
    <div className="flex items-center justify-between gap-3 flex-wrap px-4 py-2.5 bg-gray-900/80 border-y border-gray-800 first:border-t-0">
      <div className="flex items-center gap-2 min-w-0">
        <ClipboardList className="h-4 w-4 text-red-400 shrink-0" />
        <h3 className="text-gray-100 text-sm font-semibold truncate">
          {assessment?.position_title || "Unassigned assessment"}
        </h3>
        {assessment?.assessment_kind === "application_test" ? (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-900/30 border border-blue-700/40 text-blue-300 shrink-0">Application Test</span>
        ) : assessment ? (
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-900/30 border border-amber-700/40 text-amber-300 shrink-0">Hands-on Labs</span>
        ) : null}
      </div>

      <div className="flex items-center gap-4 text-[11px] text-gray-300">
        <span className="flex items-center gap-1"><Users className="h-3.5 w-3.5 text-purple-400" />{rows.length} candidate{rows.length === 1 ? "" : "s"}</span>
        <span className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5 text-green-400" />{completedRows.length} completed</span>
        <span className="flex items-center gap-1">
          <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
          {avgScore !== null ? `Avg ${avgScore}%` : "Avg —"}
        </span>
        <span className="flex items-center gap-1" title="Average time candidates took to complete this assessment">
          <Clock className="h-3.5 w-3.5 text-amber-400" />
          {avgTime !== null ? `Avg time ${formatDuration(avgTime)}` : "Avg time —"}
        </span>
      </div>
    </div>
  );
}