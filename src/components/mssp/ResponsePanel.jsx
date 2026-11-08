import React from "react";
import { Lock, ShieldCheck, ShieldAlert, Wrench, CheckCircle2, ArrowRight } from "lucide-react";

const SAFETY = {
  safe: { label: "OT-safe", className: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
  risky: { label: "Operational cost", className: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  unsafe: { label: "Unsafe for process", className: "border-rose-500/40 bg-rose-500/10 text-rose-300" },
};

function ActionCard({ action, selected, onToggle, disabled }) {
  const safety = SAFETY[action.safety] || SAFETY.risky;
  return (
    <button
      onClick={() => !disabled && onToggle(action.id)}
      disabled={disabled}
      className={`w-full rounded-xl border p-2.5 text-left transition-all ${
        selected ? "border-red-500/50 bg-red-950/25" : "border-white/10 bg-white/[0.02] hover:border-white/25"
      } ${disabled ? "opacity-60" : ""}`}
    >
      <div className="flex items-start gap-2">
        <span
          className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
            selected ? "border-red-400 bg-red-500/30" : "border-white/20"
          }`}
        >
          {selected && <span className="h-1.5 w-1.5 rounded-sm bg-red-200" />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[11.5px] font-semibold leading-snug text-white">{action.label}</div>
          <p className="mt-0.5 text-[10.5px] leading-relaxed text-slate-400">{action.description}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide ${safety.className}`}>
          {safety.label}
        </span>
      </div>
    </button>
  );
}

function Section({ icon: Icon, title, subtitle, locked, children, action }) {
  return (
    <div className={`rounded-xl border p-3.5 ${locked ? "border-white/5 bg-white/[0.01]" : "border-white/10 bg-white/[0.03]"}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <Icon className={`mt-0.5 h-3.5 w-3.5 shrink-0 ${locked ? "text-slate-600" : "text-red-300"}`} />
          <div>
            <div className={`text-[11px] font-bold uppercase tracking-[0.14em] ${locked ? "text-slate-600" : "text-slate-300"}`}>
              {title}
            </div>
            <p className="mt-0.5 text-[10px] leading-relaxed text-slate-500">{subtitle}</p>
          </div>
        </div>
        {locked && <Lock className="h-3.5 w-3.5 shrink-0 text-slate-600" />}
      </div>
      {!locked && <div className="mt-3 space-y-2">{children}</div>}
      {!locked && action}
    </div>
  );
}

export default function ResponsePanel({
  scenario,
  selectedContainment,
  selectedRecovery,
  verification,
  applied,
  onToggleAction,
  onToggleVerification,
  onApply,
}) {
  const applyGroup = (group) => onApply(group);

  return (
    <div className="space-y-3">
      <Section
        icon={ShieldAlert}
        title="Containment"
        subtitle="Stop the activity without stopping the business. Choose every action the incident needs."
        locked={false}
        action={
          !applied.containment ? (
            <button
              onClick={() => applyGroup("containment")}
              disabled={selectedContainment.length === 0}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-200 transition-colors hover:border-red-500/70 hover:bg-red-900/50 hover:text-white disabled:opacity-40 sm:w-auto btn-3d"
            >
              Apply containment <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : null
        }
      >
        {scenario.containment.map((a) => (
          <ActionCard
            key={a.id}
            action={a}
            selected={selectedContainment.includes(a.id)}
            onToggle={(id) => onToggleAction("containment", id)}
            disabled={applied.containment}
          />
        ))}
        {applied.containment && (
          <div className="space-y-1.5 rounded-lg border border-white/10 bg-black/30 p-2.5">
            <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Simulated effect</div>
            {scenario.containment
              .filter((a) => selectedContainment.includes(a.id))
              .map((a) => (
                <p key={a.id} className="text-[10.5px] leading-relaxed text-slate-300">
                  <span className="font-semibold text-white">{a.label}</span> — {a.effect}
                </p>
              ))}
            {selectedContainment.length === 0 && (
              <p className="text-[10.5px] text-slate-500">No containment applied. The activity continues.</p>
            )}
          </div>
        )}
      </Section>

      <Section
        icon={Wrench}
        title="Recovery"
        subtitle="Restore the asset to a known-good, monitored state without destroying evidence or operations."
        locked={!applied.containment}
        action={
          !applied.recovery ? (
            <button
              onClick={() => applyGroup("recovery")}
              disabled={selectedRecovery.length === 0}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-200 transition-colors hover:border-red-500/70 hover:bg-red-900/50 hover:text-white disabled:opacity-40 sm:w-auto btn-3d"
            >
              Apply recovery <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : null
        }
      >
        {scenario.recovery.map((a) => (
          <ActionCard
            key={a.id}
            action={a}
            selected={selectedRecovery.includes(a.id)}
            onToggle={(id) => onToggleAction("recovery", id)}
            disabled={applied.recovery}
          />
        ))}
        {applied.recovery && (
          <div className="space-y-1.5 rounded-lg border border-white/10 bg-black/30 p-2.5">
            <div className="text-[9px] font-bold uppercase tracking-[0.14em] text-slate-500">Simulated effect</div>
            {scenario.recovery
              .filter((a) => selectedRecovery.includes(a.id))
              .map((a) => (
                <p key={a.id} className="text-[10.5px] leading-relaxed text-slate-300">
                  <span className="font-semibold text-white">{a.label}</span> — {a.effect}
                </p>
              ))}
          </div>
        )}
      </Section>

      <Section
        icon={CheckCircle2}
        title="Verification"
        subtitle="Select only the checks that actually prove the attacker's path is gone and the process is safe."
        locked={!applied.recovery}
        action={
          !applied.verification ? (
            <button
              onClick={() => onApply("verification")}
              disabled={verification.length === 0}
              className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-lg border border-emerald-800/60 bg-emerald-950/30 px-3 py-2 text-xs font-semibold text-emerald-200 transition-colors hover:border-emerald-500/70 hover:bg-emerald-900/40 hover:text-white disabled:opacity-40 sm:w-auto btn-3d"
            >
              <ShieldCheck className="h-3.5 w-3.5" /> Close the incident
            </button>
          ) : null
        }
      >
        {scenario.verification.map((v) => {
          const sel = verification.includes(v.id);
          return (
            <button
              key={v.id}
              onClick={() => !applied.verification && onToggleVerification(v.id)}
              disabled={applied.verification}
              className={`flex w-full items-start gap-2 rounded-lg border p-2 text-left transition-colors ${
                sel ? "border-emerald-500/40 bg-emerald-500/[0.08]" : "border-white/10 bg-white/[0.02] hover:border-white/25"
              } ${applied.verification ? "opacity-70" : ""}`}
            >
              <span
                className={`mt-0.5 flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded border ${
                  sel ? "border-emerald-400 bg-emerald-500/30" : "border-white/20"
                }`}
              >
                {sel && <span className="h-1.5 w-1.5 rounded-sm bg-emerald-200" />}
              </span>
              <span className="text-[10.5px] leading-relaxed text-slate-300">{v.label}</span>
            </button>
          );
        })}
      </Section>
    </div>
  );
}