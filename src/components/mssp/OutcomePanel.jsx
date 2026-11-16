import React from "react";
import { Link } from "react-router-dom";
import {
  Trophy, RefreshCw, Save, CheckCircle2, AlertTriangle, Info, FileText, Loader2,
} from "lucide-react";
import { getScenarioSummary } from "@/lib/mssp/catalog";

const TONE = {
  good: { icon: CheckCircle2, className: "border-emerald-500/30 bg-emerald-500/[0.06] text-emerald-300" },
  watch: { icon: Info, className: "border-amber-500/30 bg-amber-500/[0.06] text-amber-300" },
  fix: { icon: AlertTriangle, className: "border-rose-500/30 bg-rose-500/[0.06] text-rose-300" },
};

function ScoreBar({ label, score, detail }) {
  const pct = Math.round(score * 100);
  const color = pct >= 85 ? "bg-emerald-400" : pct >= 70 ? "bg-cyan-400" : pct >= 55 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-[11px] font-semibold text-slate-200">{label}</span>
        <span className="font-mono text-sm font-semibold text-white tabular-nums">{pct}%</span>
      </div>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(2, pct)}%` }} />
      </div>
      <p className="mt-1 text-[10px] leading-relaxed text-slate-500">{detail}</p>
    </div>
  );
}

export default function OutcomePanel({ scenario, outcome, findings, onFindingsChange, onSave, saving, saved, onRestart }) {
  const mode = getScenarioSummary(scenario.id);
  const overallPct = Math.round(outcome.overall * 100);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[9px] font-bold uppercase tracking-[0.18em] text-slate-500">Session outcome</div>
            <h2 className="mt-1 text-lg font-semibold text-white">{mode?.title || scenario.title}</h2>
            <p className="mt-0.5 text-[10.5px] text-slate-400">{scenario.client}</p>
          </div>
          <div className="text-right">
            <div className="font-mono text-3xl font-bold leading-none text-white tabular-nums">{overallPct}</div>
            <div className="mt-0.5 text-[9px] uppercase tracking-[0.14em] text-slate-500">Overall</div>
          </div>
        </div>

        <div className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-2.5 py-1">
          <Trophy className="h-3.5 w-3.5 text-amber-300" />
          <span className="text-[11px] font-bold text-white">{outcome.grade.label}</span>
          <span className="text-[10px] text-slate-400">· {outcome.grade.note}</span>
        </div>

        <div className="mt-4 space-y-3">
          {outcome.capabilities.map((c) => (
            <ScoreBar key={c.key} label={c.title} score={c.score} detail={c.detail} />
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
        <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Capability feedback</div>
        <div className="mt-2.5 space-y-1.5">
          {outcome.feedback.map((f, i) => {
            const tone = TONE[f.tone] || TONE.watch;
            const Icon = tone.icon;
            return (
              <div key={i} className={`flex items-start gap-2 rounded-lg border p-2 ${tone.className}`}>
                <Icon className="mt-0.5 h-3 w-3 shrink-0" />
                <p className="text-[10.5px] leading-relaxed">
                  <span className="font-bold uppercase tracking-wide">{f.area}</span> — <span className="text-slate-200">{f.text}</span>
                </p>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3.5">
        <div className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5 text-slate-400" />
          <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Escalation note</div>
        </div>
        <textarea
          value={findings}
          onChange={(e) => onFindingsChange(e.target.value)}
          rows={4}
          placeholder="What happened, which assets are affected, what you did, and what the client must still do…"
          className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/60 px-2.5 py-2 text-[11px] leading-relaxed text-white placeholder:text-slate-500 focus:border-red-500/50 focus:outline-none"
        />
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <button
            onClick={onSave}
            disabled={saving || saved}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-800/60 bg-emerald-950/30 px-3 py-2 text-xs font-semibold text-emerald-200 transition-colors hover:border-emerald-500/70 hover:bg-emerald-900/40 hover:text-white disabled:opacity-50 btn-3d"
          >
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : saved ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            {saved ? "Session saved" : saving ? "Saving…" : "Save session"}
          </button>
          <button
            onClick={onRestart}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/[0.03] px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-white/30 hover:text-white"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Run again
          </button>
          <Link
            to="/mssp-soc"
            className="text-[11px] font-medium text-slate-400 underline-offset-2 transition-colors hover:text-white hover:underline"
          >
            Back to hub
          </Link>
        </div>
      </div>
    </div>
  );
}