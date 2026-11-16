import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Shield, Radio, GraduationCap, Crosshair, Building2, ChevronRight,
  Clock, Layers, Activity, Radar, Network, Cpu, AlertTriangle, ArrowRight,
} from "lucide-react";
import {
  ENVIRONMENT_DIAGRAM_URL, ENVIRONMENT_TIERS, CAPABILITY_AREAS,
  PRACTICE_MODES, SCENARIO_CATALOG, SEVERITY_STYLES, ACCENT_TEXT, ACCENT_RING,
} from "@/lib/mssp/catalog";

const MODE_ICON = { graduation: GraduationCap, crosshair: Crosshair, building: Building2 };
const CAP_ICON = { triage: Radar, detection: Activity, lifecycle: Layers };

const TIER_ACCENT = {
  cyan: { text: "text-cyan-300", dot: "bg-cyan-400", border: "border-cyan-400/30" },
  amber: { text: "text-amber-300", dot: "bg-amber-400", border: "border-amber-400/30" },
  emerald: { text: "text-emerald-300", dot: "bg-emerald-400", border: "border-emerald-400/30" },
};

function SectionHeading({ eyebrow, title, children }) {
  return (
    <div className="mb-6 max-w-2xl">
      <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-red-400/90">{eyebrow}</div>
      <h2 className="mt-1.5 text-xl sm:text-2xl font-semibold tracking-tight text-white">{title}</h2>
      {children && <p className="mt-2 text-sm leading-relaxed text-slate-400">{children}</p>}
    </div>
  );
}

function ModeCard({ mode, onSelect }) {
  const Icon = MODE_ICON[mode.icon] || Shield;
  return (
    <button
      onClick={() => onSelect(mode.key)}
      className={`group flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-left transition-all ${ACCENT_RING[mode.accent]} hover:-translate-y-0.5`}
    >
      <div className="flex items-center gap-2.5">
        <span className="icon-3d flex h-9 w-9 items-center justify-center rounded-xl bg-slate-800/80">
          <Icon className={`h-4 w-4 ${ACCENT_TEXT[mode.accent]}`} />
        </span>
        <div>
          <div className="text-sm font-semibold text-white">{mode.name}</div>
          <div className={`text-[10px] font-medium uppercase tracking-[0.14em] ${ACCENT_TEXT[mode.accent]}`}>
            {mode.tagline}
          </div>
        </div>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-400">{mode.description}</p>
      <ul className="mt-3 space-y-1.5">
        {mode.bullets.map((b) => (
          <li key={b} className="flex items-start gap-2 text-[11px] text-slate-300">
            <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${TIER_ACCENT[mode.accent === "rose" ? "amber" : mode.accent]?.dot || "bg-slate-400"}`} />
            {b}
          </li>
        ))}
      </ul>
      <span className="mt-auto pt-4 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-300 group-hover:text-white">
        Open mode <ChevronRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
      </span>
    </button>
  );
}

function ScenarioCard({ scenario, mode, onLaunch }) {
  return (
    <div className="group flex h-full flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-5 transition-all hover:-translate-y-0.5 hover:border-white/20">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            {scenario.theme === "gateway" ? "Edge gateway" : scenario.theme === "ot" ? "OT process" : "Multi-layer"}
          </div>
          <h3 className="mt-1 truncate text-base font-semibold text-white">{scenario.title}</h3>
        </div>
        <span className={`shrink-0 rounded-md border px-2 py-0.5 text-[10px] font-bold tracking-wide ${SEVERITY_STYLES[scenario.severity]}`}>
          {scenario.severity}
        </span>
      </div>

      <p className="mt-2.5 text-xs leading-relaxed text-slate-400">{scenario.summary}</p>

      <div className="mt-4 flex flex-wrap gap-1.5">
        {scenario.devices.map((d) => (
          <span key={d} className="rounded-md border border-white/10 bg-slate-900/60 px-1.5 py-0.5 text-[10px] text-slate-400">
            {d}
          </span>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-400">
        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{scenario.duration} min</span>
        <span className="flex items-center gap-1"><Cpu className="h-3 w-3" />{scenario.difficulty}</span>
        <span className="font-mono text-[10px] text-slate-500">{scenario.mitre.slice(0, 2).join(" · ")}</span>
      </div>

      <button
        onClick={() => onLaunch(scenario.id)}
        className="mt-5 inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-200 transition-colors hover:border-red-500/70 hover:bg-red-900/50 hover:text-white btn-3d"
      >
        Launch in {mode.name}
        <ArrowRight className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function MSSPSOC() {
  const navigate = useNavigate();
  const [mode, setMode] = useState("guided");

  const openSession = (modeKey, scenarioId) =>
    navigate(`/mssp-soc/session?mode=${modeKey}&scenario=${scenarioId || SCENARIO_CATALOG[0].id}`);

  const activeMode = PRACTICE_MODES.find((m) => m.key === mode) || PRACTICE_MODES[0];

  return (
    <div className="min-h-screen bg-[#05070d] text-slate-100">
      {/* Hero */}
      <div className="relative overflow-hidden border-b border-white/5">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            background:
              "radial-gradient(900px 380px at 12% -10%, rgba(239,68,68,0.28), transparent 65%), radial-gradient(700px 320px at 85% 0%, rgba(56,189,248,0.16), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">
            <Radio className="h-3 w-3" /> Simulation only
          </div>
          <h1 className="mt-4 text-3xl font-semibold leading-tight tracking-tight text-white sm:text-4xl">
            MSSP SOC &amp; SIEM Training
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
            Defend an enterprise IT, edge and OT/IoT estate the way a managed security provider does.
            Device-accurate alerts, real telemetry, and responses that keep the process running.
          </p>

          <div className="mt-6 flex flex-wrap gap-2">
            {PRACTICE_MODES.map((m) => {
              const Icon = MODE_ICON[m.icon];
              return (
                <button
                  key={m.key}
                  onClick={() => openSession(m.key)}
                  className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.04] px-3.5 py-2 text-xs font-semibold text-white transition-all hover:border-red-500/60 hover:bg-red-950/30 btn-3d"
                >
                  <Icon className={`h-4 w-4 ${ACCENT_TEXT[m.accent]}`} />
                  {m.name}
                </button>
              );
            })}
          </div>

          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Scenario families", value: "3" },
              { label: "Seeded alerts", value: "25" },
              { label: "Layer coverage", value: "IT · Edge · OT" },
              { label: "Practice modes", value: "3" },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/10 bg-white/[0.02] px-3 py-2.5">
                <div className="font-mono text-sm font-semibold text-white tabular-nums">{s.value}</div>
                <div className="mt-0.5 text-[10px] uppercase tracking-[0.12em] text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-10 sm:px-6 sm:py-14">
        {/* Modes */}
        <section>
          <SectionHeading eyebrow="Practice modes" title="Choose how you want to work the queue">
            All three modes run on the same seeded environment, alert set and telemetry — the difference is how much
            guidance you get and how the queue is paced.
          </SectionHeading>
          <div className="grid gap-4 sm:grid-cols-3">
            {PRACTICE_MODES.map((m) => (
              <ModeCard key={m.key} mode={m} onSelect={(k) => openSession(k)} />
            ))}
          </div>
        </section>

        {/* Environment context */}
        <section>
          <SectionHeading eyebrow="Your environment" title="Edge and OT/IoT enterprise estate">
            Every alert in this module maps to a real asset type in this environment — the router at the edge, the PLC on
            the line, the meter on the wall.
          </SectionHeading>

          <div className="overflow-hidden rounded-2xl border border-white/10 bg-slate-950/60">
            <div className="relative">
              <img
                src={ENVIRONMENT_DIAGRAM_URL}
                alt="Edge and OT/IoT enterprise environment diagram"
                className="h-auto w-full object-cover"
                loading="lazy"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent px-4 pb-3 pt-10">
                <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
                  <Network className="h-3.5 w-3.5 text-cyan-300" /> Scenario context
                </div>
              </div>
            </div>
            <div className="grid divide-y divide-white/5 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
              {ENVIRONMENT_TIERS.map((tier) => (
                <div key={tier.key} className="p-4">
                  <div className="flex items-center gap-2">
                    <span className={`h-1.5 w-1.5 rounded-full ${TIER_ACCENT[tier.accent].dot}`} />
                    <span className={`text-[10px] font-bold uppercase tracking-[0.16em] ${TIER_ACCENT[tier.accent].text}`}>
                      {tier.label}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-slate-400">{tier.summary}</p>
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {tier.assets.map((a) => (
                      <span key={a} className="rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-slate-400">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Capability areas */}
        <section>
          <SectionHeading eyebrow="What you practise" title="Three capability areas, one incident">
            Each scenario exercises all three — you are scored on each one separately.
          </SectionHeading>
          <div className="grid gap-3 sm:grid-cols-3">
            {CAPABILITY_AREAS.map((cap) => {
              const Icon = CAP_ICON[cap.icon] || Shield;
              return (
                <div key={cap.key} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                  <Icon className="h-4 w-4 text-red-300 icon-glow icon-glow-red" />
                  <div className="mt-2.5 text-sm font-semibold text-white">{cap.title}</div>
                  <p className="mt-1 text-[11px] leading-relaxed text-slate-400">{cap.summary}</p>
                </div>
              );
            })}
          </div>
        </section>

        {/* Scenarios */}
        <section>
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="max-w-2xl">
              <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-red-400/90">Scenario library</div>
              <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-white sm:text-2xl">Pick an incident to work</h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-400">
                Seeded and reproducible — the same scenario always produces the same telemetry, so decisions are reviewable.
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5 rounded-xl border border-white/10 bg-white/[0.03] p-1">
              {PRACTICE_MODES.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setMode(m.key)}
                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                    mode === m.key ? "bg-red-900/50 text-white" : "text-slate-400 hover:text-white"
                  }`}
                >
                  {m.name.split(" ")[0]}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {SCENARIO_CATALOG.map((s) => (
              <ScenarioCard key={s.id} scenario={s} mode={activeMode} onLaunch={(id) => openSession(mode, id)} />
            ))}
          </div>
        </section>

        {/* Simulation notice */}
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/[0.06] p-4">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" />
          <p className="text-[11px] leading-relaxed text-amber-100/80">
            Fully simulated training environment. No connections are made to real SIEM, MSSP, PLC, SCADA or IoT systems,
            and no response action affects live infrastructure. In a real OT network, never take an unverified action on a
            running process without the operations owner's approval.
          </p>
        </div>

        <div className="pb-4">
          <Link
            to="/training-catalog"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-white"
          >
            Back to training catalog <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}