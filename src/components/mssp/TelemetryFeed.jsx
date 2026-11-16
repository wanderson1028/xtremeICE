import React, { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { getAsset, TIER_STYLES } from "@/lib/mssp/assets";
import { getSources } from "@/lib/mssp/model";

export default function TelemetryFeed({ telemetry }) {
  const [query, setQuery] = useState("");
  const [source, setSource] = useState("all");
  const [tier, setTier] = useState("all");
  const sources = useMemo(() => getSources(telemetry), [telemetry]);

  const rows = telemetry
    .filter((e) => (source === "all" ? true : e.source === source))
    .filter((e) => (tier === "all" ? true : e.tier === tier))
    .filter((e) => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        e.message.toLowerCase().includes(q) ||
        getAsset(e.asset_id).name.toLowerCase().includes(q) ||
        e.source.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => a.ts.localeCompare(b.ts));

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search messages, assets, sources…"
            className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2 pl-8 pr-3 text-xs text-white placeholder:text-slate-500 focus:border-red-500/50 focus:outline-none"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="min-w-0 flex-1 rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-[11px] text-slate-200 focus:border-red-500/50 focus:outline-none sm:flex-none"
          >
            <option value="all">All sources</option>
            {sources.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <select
            value={tier}
            onChange={(e) => setTier(e.target.value)}
            className="rounded-lg border border-white/10 bg-slate-900 px-2 py-2 text-[11px] text-slate-200 focus:border-red-500/50 focus:outline-none"
          >
            <option value="all">All zones</option>
            <option value="it">Enterprise IT</option>
            <option value="edge">Edge</option>
            <option value="ot">OT / IoT</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-white/10">
        <div className="hidden grid-cols-[64px_1fr_150px_1fr] gap-2 border-b border-white/10 bg-white/[0.03] px-3 py-2 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500 sm:grid">
          <span>Time</span>
          <span>Asset</span>
          <span>Source</span>
          <span>Event</span>
        </div>
        <div className="max-h-[520px] divide-y divide-white/5 overflow-y-auto">
          {rows.length === 0 && <div className="p-6 text-center text-xs text-slate-500">No telemetry matches those filters.</div>}
          {rows.map((e) => {
            const asset = getAsset(e.asset_id);
            const t = TIER_STYLES[asset.tier] || TIER_STYLES.it;
            return (
              <div key={e.id} className="grid gap-1 px-3 py-2 text-[11px] hover:bg-white/[0.02] sm:grid-cols-[64px_1fr_150px_1fr] sm:items-start sm:gap-2">
                <span className="font-mono text-[10px] text-slate-500">{e.ts}</span>
                <span className={`truncate font-semibold ${t.text}`}>{asset.name}</span>
                <span className="truncate text-[10px] text-slate-500">{e.source}</span>
                <span className="break-words font-mono text-[10.5px] leading-relaxed text-slate-300">{e.message}</span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-[10px] text-slate-500">
        {rows.length} events · seeded and reproducible. No connection is made to a live SIEM.
      </p>
    </div>
  );
}