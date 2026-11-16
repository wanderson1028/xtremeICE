import React from "react";
import { GraduationCap, EyeOff } from "lucide-react";

export default function CoachPanel({ scenario, stageKey, mode }) {
  const text = scenario.coach?.[stageKey === "detection" ? "analysis" : stageKey];

  if (mode !== "guided") {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
        <EyeOff className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-500" />
        <p className="text-[11px] leading-relaxed text-slate-500">
          Coach hints are off in this mode. The telemetry, asset context and alert detail are all you get.
        </p>
      </div>
    );
  }

  if (!text) return null;

  return (
    <div className="flex items-start gap-2.5 rounded-xl border border-cyan-500/25 bg-cyan-500/[0.06] px-3 py-3">
      <GraduationCap className="mt-0.5 h-4 w-4 shrink-0 text-cyan-300" />
      <div>
        <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300">Analyst coach</div>
        <p className="mt-1 text-[11px] leading-relaxed text-cyan-50/85">{text}</p>
      </div>
    </div>
  );
}