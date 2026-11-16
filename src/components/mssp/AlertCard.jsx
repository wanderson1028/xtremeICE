import React from "react";
import { ChevronDown, AlertTriangle, Clock, ShieldAlert } from "lucide-react";
import DeviceBadge from "./DeviceBadge";
import EvidencePicker from "./EvidencePicker";
import { getAsset } from "@/lib/mssp/assets";
import { DISPOSITIONS } from "@/lib/mssp/model";

export default function AlertCard({
  alert,
  scenario,
  mode,
  expanded,
  onToggle,
  disposition,
  onDisposition,
  evidence,
  onEvidence,
  tenant,
  slaLabel,
  breached,
  locked,
}) {
  const asset = getAsset(alert.asset_id);
  const severityClass =
    alert.severity === "Critical"
      ? "text-rose-200 border-rose-500/50 bg-rose-500/15"
      : alert.severity === "High"
      ? "text-orange-200 border-orange-500/50 bg-orange-500/15"
      : alert.severity === "Medium"
      ? "text-amber-200 border-amber-500/50 bg-amber-500/15"
      : "text-sky-200 border-sky-500/50 bg-sky-500/15";

  return (
    <div
      className={`overflow-hidden rounded-xl border transition-colors ${
        expanded ? "border-red-500/40 bg-red-950/[0.12]" : "border-white/10 bg-white/[0.03] hover:border-white/20"
      } ${locked ? "opacity-50" : ""}`}
    >
      <button onClick={() => !locked && onToggle()} className="flex w-full items-start gap-2.5 p-3 text-left" disabled={locked}>
        <span className={`mt-0.5 shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${severityClass}`}>
          {alert.severity}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-[10px] text-slate-500">{alert.id}</span>
            <span className="text-[13px] font-semibold leading-snug text-white">{alert.title}</span>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
            <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5">
              {asset.name} · {asset.type}
            </span>
            <span className="text-slate-600">·</span>
            <span>{alert.source}</span>
            {mode === "mssp" && tenant && (
              <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-cyan-200">{tenant}</span>
            )}
            {mode === "mssp" && slaLabel && (
              <span
                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${
                  breached ? "bg-rose-500/15 text-rose-300" : "bg-white/5 text-slate-400"
                }`}
              >
                <Clock className="h-2.5 w-2.5" /> {slaLabel}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {disposition && (
            <span
              className={`hidden rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide sm:inline ${
                DISPOSITIONS.find((d) => d.key === disposition)?.className || ""
              }`}
            >
              {DISPOSITIONS.find((d) => d.key === disposition)?.short}
            </span>
          )}
          {locked && <span className="text-[9px] uppercase tracking-wide text-slate-500">Locked</span>}
          <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </div>
      </button>

      {expanded && (
        <div className="space-y-3 border-t border-white/5 p-3">
          <DeviceBadge asset={asset} />
          <p className="text-[10px] leading-relaxed text-slate-500">{asset.note}</p>

          <div className="grid gap-2.5 sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
              <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">What the sensor saw</div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-200">{alert.observed}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/[0.02] p-2.5">
              <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Detection logic</div>
              <p className="mt-1 text-[11px] leading-relaxed text-slate-300">{alert.detail}</p>
            </div>
          </div>

          <div className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] p-2.5">
            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-amber-300">
              <AlertTriangle className="h-3 w-3" /> Operational impact
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-amber-50/80">{alert.impact}</p>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 text-[10px] text-slate-400">
            <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5">
              <ShieldAlert className="h-2.5 w-2.5" /> {alert.mitre}
            </span>
            <span className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono">{alert.rule}</span>
          </div>

          <div>
            <div className="mb-1.5 flex items-baseline justify-between">
              <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Corroborating telemetry</div>
              <span className="text-[10px] text-slate-500">Attach what proves this</span>
            </div>
            <EvidencePicker
              telemetry={scenario.telemetry}
              selected={evidence}
              onChange={onEvidence}
              pivotAssets={alert.pivot}
            />
          </div>

          <div>
            <div className="mb-1.5 text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Disposition</div>
            <div className="grid gap-1.5 sm:grid-cols-3">
              {DISPOSITIONS.map((d) => {
                const active = disposition === d.key;
                return (
                  <button
                    key={d.key}
                    onClick={() => onDisposition(d.key)}
                    className={`rounded-lg border p-2 text-left transition-all ${
                      active ? d.className : "border-white/10 bg-white/[0.02] text-slate-300 hover:border-white/25"
                    }`}
                  >
                    <div className="text-[11px] font-semibold">{d.label}</div>
                    <div className={`mt-0.5 text-[10px] leading-snug ${active ? "" : "text-slate-500"}`}>{d.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {mode === "guided" && alert.hint && (
            <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/[0.05] p-2.5">
              <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-cyan-300">Coach hint</div>
              <p className="mt-1 text-[11px] leading-relaxed text-cyan-50/80">{alert.hint}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}