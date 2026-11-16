import React from "react";
import { TIER_STYLES } from "@/lib/mssp/assets";

const CRITICALITY = {
  Critical: "text-rose-300 border-rose-500/40 bg-rose-500/10",
  High: "text-orange-300 border-orange-500/40 bg-orange-500/10",
  Medium: "text-amber-300 border-amber-500/40 bg-amber-500/10",
  Low: "text-sky-300 border-sky-500/40 bg-sky-500/10",
  Unknown: "text-slate-300 border-white/15 bg-white/5",
};

export default function DeviceBadge({ asset, compact = false }) {
  const tier = TIER_STYLES[asset.tier] || TIER_STYLES.it;
  return (
    <div
      className={`flex items-center gap-2 rounded-lg border ${tier.border} ${tier.chip} ${
        compact ? "px-2 py-1" : "px-2.5 py-1.5"
      }`}
    >
      <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${asset.tier === "edge" ? "bg-amber-400" : asset.tier === "ot" ? "bg-emerald-400" : "bg-cyan-400"}`} />
      <div className="min-w-0">
        <div className="truncate text-[11px] font-semibold text-white">{asset.name}</div>
        <div className="truncate text-[10px] text-slate-400">{asset.type}</div>
      </div>
      {!compact && (
        <span className={`ml-1 shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${CRITICALITY[asset.criticality]}`}>
          {asset.criticality}
        </span>
      )}
    </div>
  );
}