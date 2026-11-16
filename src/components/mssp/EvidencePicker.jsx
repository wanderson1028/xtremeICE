import React, { useState } from "react";
import { Search, Check } from "lucide-react";
import { getAsset, TIER_STYLES } from "@/lib/mssp/assets";

export default function EvidencePicker({ telemetry, selected = [], onChange, pivotAssets = [] }) {
  const [query, setQuery] = useState("");
  const [onlyPivots, setOnlyPivots] = useState(false);

  const rows = telemetry
    .filter((e) => (onlyPivots ? pivotAssets.includes(e.asset_id) : true))
    .filter((e) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        e.message.toLowerCase().includes(q) ||
        e.source.toLowerCase().includes(q) ||
        getAsset(e.asset_id).name.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a.ts.localeCompare(b.ts));

  const toggle = (id) => {
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  };

  return (
    <div className="rounded-xl border border-white/10 bg-slate-950/40">
      <div className="flex flex-wrap items-center gap-2 border-b border-white/5 p-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search telemetry…"
            className="w-full rounded-md border border-white/10 bg-white/[0.03] py-1.5 pl-7 pr-2 text-[11px] text-white placeholder:text-slate-500 focus:border-red-500/50 focus:outline-none"
          />
        </div>
        <button
          onClick={() => setOnlyPivots((v) => !v)}
          className={`rounded-md border px-2 py-1.5 text-[10px] font-semibold transition-colors ${
            onlyPivots
              ? "border-amber-500/50 bg-amber-500/10 text-amber-200"
              : "border-white/10 bg-white/[0.03] text-slate-400 hover:text-white"
          }`}
        >
          Related assets only
        </button>
        <span className="rounded-md bg-white/5 px-2 py-1 text-[10px] font-mono text-slate-400">{selected.length} attached</span>
      </div>

      <div className="max-h-64 overflow-y-auto">
        {rows.length === 0 && <div className="p-4 text-center text-[11px] text-slate-500">No telemetry matches that filter.</div>}
        {rows.map((e) => {
          const asset = getAsset(e.asset_id);
          const tier = TIER_STYLES[asset.tier] || TIER_STYLES.it;
          const isSel = selected.includes(e.id);
          return (
            <button
              key={e.id}
              onClick={() => toggle(e.id)}
              className={`flex w-full items-start gap-2 border-b border-white/5 px-2.5 py-2 text-left transition-colors last:border-0 ${
                isSel ? "bg-red-950/25" : "hover:bg-white/[0.03]"
              }`}
            >
              <span
                className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                  isSel ? "border-red-400 bg-red-500/30" : "border-white/20"
                }`}
              >
                {isSel && <Check className="h-2.5 w-2.5 text-red-200" />}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-mono text-[10px] text-slate-500">{e.ts}</span>
                  <span className={`text-[10px] font-semibold ${tier.text}`}>{asset.name}</span>
                  <span className="text-[10px] text-slate-600">·</span>
                  <span className="text-[10px] text-slate-500">{e.source}</span>
                </div>
                <div className="mt-0.5 break-words font-mono text-[10.5px] leading-relaxed text-slate-300">{e.message}</div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}