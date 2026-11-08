import React from "react";
import { Check } from "lucide-react";
import { LIFECYCLE_STAGES } from "@/lib/mssp/model";

export default function StageRail({ currentKey, completedKeys = [], onSelect }) {
  const currentIndex = LIFECYCLE_STAGES.findIndex((s) => s.key === currentKey);

  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {LIFECYCLE_STAGES.map((stage, i) => {
        const done = completedKeys.includes(stage.key);
        const active = stage.key === currentKey;
        const reachable = done || i <= currentIndex || i === 0;
        return (
          <button
            key={stage.key}
            onClick={() => reachable && onSelect(stage.key)}
            disabled={!reachable}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
              active
                ? "border-red-500/60 bg-red-950/50 text-white"
                : done
                ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300 hover:border-emerald-400/50"
                : reachable
                ? "border-white/10 bg-white/[0.03] text-slate-300 hover:text-white"
                : "border-white/5 bg-transparent text-slate-600"
            }`}
          >
            <span
              className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold ${
                done ? "bg-emerald-500/20 text-emerald-300" : active ? "bg-red-500/20 text-red-200" : "bg-white/5 text-slate-500"
              }`}
            >
              {done ? <Check className="h-2.5 w-2.5" /> : i + 1}
            </span>
            {stage.label}
          </button>
        );
      })}
    </div>
  );
}