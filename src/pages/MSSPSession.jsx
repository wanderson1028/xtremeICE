import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  ArrowLeft, Radar, Activity, Layers, Radio, Clock, ChevronDown, CheckCircle2, AlertTriangle, Building2,
} from "lucide-react";
import { getScenario } from "@/lib/mssp/scenarios";
import { getMode, ENVIRONMENT_DIAGRAM_URL } from "@/lib/mssp/catalog";
import { LIFECYCLE_STAGES, getSources } from "@/lib/mssp/model";
import { computeOutcome, scoreDetection, SLA_MINUTES } from "@/lib/mssp/engine";
import StageRail from "@/components/mssp/StageRail";
import CoachPanel from "@/components/mssp/CoachPanel";
import AlertCard from "@/components/mssp/AlertCard";
import TelemetryFeed from "@/components/mssp/TelemetryFeed";
import DetectionBuilder from "@/components/mssp/DetectionBuilder";
import ResponsePanel from "@/components/mssp/ResponsePanel";
import OutcomePanel from "@/components/mssp/OutcomePanel";

const MODE_ICON = { guided: Radar, range: Activity, mssp: Building2 };

const TAB_FOR_STAGE = {
  triage: "alerts",
  detection: "detection",
  containment: "response",
  recovery: "response",
  verification: "response",
  outcome: "outcome",
};

function TabButton({ active, disabled, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-[11px] font-semibold transition-colors ${
        active
          ? "border-red-500 text-white"
          : disabled
          ? "border-transparent text-slate-600"
          : "border-transparent text-slate-400 hover:text-white"
      }`}
    >
      <Icon className="h-3.5 w-3.5" /> {children}
    </button>
  );
}

export default function MSSPSession() {
  const params = new URLSearchParams(window.location.search);
  const scenarioId = params.get("scenario") || "gateway_compromise";
  const modeKey = params.get("mode") || "guided";

  const scenario = useMemo(() => getScenario(scenarioId), [scenarioId]);
  const mode = getMode(modeKey);

  const { data: currentUser } = useQuery({ queryKey: ["me"], queryFn: () => base44.auth.me() });

  const [stage, setStage] = useState("triage");
  const [tab, setTab] = useState("alerts");
  const [dispositions, setDispositions] = useState({});
  const [evidence, setEvidence] = useState({});
  const [expandedAlert, setExpandedAlert] = useState(scenario.alerts[0]?.id || null);
  const [unlockedCount, setUnlockedCount] = useState(1);
  const [rule, setRule] = useState({
    source: scenario.detection.sources[0],
    field: "",
    operator: "equals",
    value: "",
    threshold: 1,
  });
  const [testResult, setTestResult] = useState(null);
  const [triageDone, setTriageDone] = useState(false);
  const [detectionDone, setDetectionDone] = useState(false);
  const [selectedContainment, setSelectedContainment] = useState([]);
  const [selectedRecovery, setSelectedRecovery] = useState([]);
  const [verification, setVerification] = useState([]);
  const [applied, setApplied] = useState({ containment: false, recovery: false, verification: false });
  const [findings, setFindings] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [briefingOpen, setBriefingOpen] = useState(true);
  const [contextOpen, setContextOpen] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const undispositioned = scenario.alerts.filter((a) => !dispositions[a.id]);
  const unsubstantiated = scenario.alerts.filter((a) => a.truth !== "benign" && !(evidence[a.id] || []).length);
  const triageReady = undispositioned.length === 0 && unsubstantiated.length === 0;

  const completedKeys = [
    ...(triageDone ? ["triage"] : []),
    ...(detectionDone ? ["detection"] : []),
    ...(applied.containment ? ["containment"] : []),
    ...(applied.recovery ? ["recovery"] : []),
    ...(applied.verification ? ["verification"] : []),
    ...(applied.verification ? ["outcome"] : []),
  ];

  const detectionPreview = testResult;
  const outcome = useMemo(
    () =>
      computeOutcome(scenario, {
        dispositions,
        evidence,
        rule,
        actions: { containment: selectedContainment, recovery: selectedRecovery },
        verification,
      }),
    [scenario, dispositions, evidence, rule, selectedContainment, selectedRecovery, verification]
  );

  const setStageAndTab = (key) => {
    setStage(key);
    setTab(TAB_FOR_STAGE[key] || "alerts");
  };

  const handleDisposition = (alert, value) => {
    setDispositions((prev) => ({ ...prev, [alert.id]: value }));
    if (modeKey === "range") {
      const idx = scenario.alerts.findIndex((a) => a.id === alert.id);
      if (idx === unlockedCount - 1) setUnlockedCount((n) => Math.min(scenario.alerts.length, n + 1));
      const next = scenario.alerts[idx + 1];
      if (next) setTimeout(() => setExpandedAlert(next.id), 150);
    }
  };

  const handleEvidence = (alertId, ids) => setEvidence((prev) => ({ ...prev, [alertId]: ids }));

  const completeTriage = () => {
    setTriageDone(true);
    setStageAndTab("detection");
  };

  const runDetectionTest = () => setTestResult(scoreDetection(rule, scenario));

  const confirmDetection = () => {
    setDetectionDone(true);
    setStage("containment");
    setTab("response");
  };

  const toggleAction = (group, id) => {
    if (group === "containment") {
      setSelectedContainment((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    } else {
      setSelectedRecovery((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
    }
  };

  const toggleVerification = (id) =>
    setVerification((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const applyGroup = (group) => {
    setApplied((prev) => ({ ...prev, [group]: true }));
    if (group === "containment") setStage("recovery");
    if (group === "recovery") setStage("verification");
    if (group === "verification") {
      setStage("outcome");
      setTab("outcome");
    }
  };

  const saveSession = async () => {
    setSaving(true);
    try {
      await base44.entities.MSSPSession.create({
        scenario_id: scenario.id,
        scenario_name: scenario.title,
        mode: modeKey,
        client_name: scenario.client,
        user_email: currentUser?.email || "unknown",
        user_name: currentUser?.full_name || currentUser?.email || "Analyst",
        status: "completed",
        started_at: new Date(Date.now() - elapsed * 1000).toISOString(),
        completed_at: new Date().toISOString(),
        duration_seconds: elapsed,
        overall_score: Math.round(outcome.overall * 100),
        grade: outcome.grade.label,
        capability_scores: outcome.capabilities.reduce(
          (acc, c) => ({ ...acc, [c.key]: Math.round(c.score * 100) }),
          {}
        ),
        alerts_triaged: scenario.alerts.map((a) => ({
          alert_id: a.id,
          disposition: dispositions[a.id] || "none",
          evidence_ids: evidence[a.id] || [],
          correct: dispositions[a.id] === a.truth,
        })),
        detection_rule: rule,
        detection_result: {
          verdict: outcome.detection.verdict,
          fired: detectionPreview?.evaluation?.fires || false,
          matched: detectionPreview?.evaluation?.matched?.length || 0,
          benign: detectionPreview?.evaluation?.benign?.length || 0,
        },
        response_actions: selectedContainment,
        recovery_actions: selectedRecovery,
        verification_checks: verification,
        findings,
        feedback: outcome.feedback,
        lifecycle_stage: "verification",
      });
      setSaved(true);
    } finally {
      setSaving(false);
    }
  };

  const restart = () => {
    setStage("triage");
    setTab("alerts");
    setDispositions({});
    setEvidence({});
    setExpandedAlert(scenario.alerts[0]?.id || null);
    setUnlockedCount(1);
    setRule({ source: scenario.detection.sources[0], field: "", operator: "equals", value: "", threshold: 1 });
    setTestResult(null);
    setTriageDone(false);
    setDetectionDone(false);
    setSelectedContainment([]);
    setSelectedRecovery([]);
    setVerification([]);
    setApplied({ containment: false, recovery: false, verification: false });
    setFindings("");
    setElapsed(0);
    setSaved(false);
  };

  const ModeIcon = MODE_ICON[modeKey] || Radar;
  const elapsedLabel = `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`;
  const sources = getSources(scenario.telemetry);

  return (
    <div className="min-h-screen bg-[#05070d] pb-16 text-slate-100">
      {/* Header */}
      <div className="border-b border-white/5 bg-gradient-to-b from-white/[0.05] to-transparent">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
          <Link
            to="/mssp-soc"
            className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 transition-colors hover:text-white"
          >
            <ArrowLeft className="h-3 w-3" /> MSSP SOC &amp; SIEM
          </Link>

          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold leading-tight text-white sm:text-xl">{scenario.title}</h1>
              <p className="mt-0.5 text-[11px] text-slate-400">{scenario.subtitle}</p>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-amber-300">
                  <Radio className="h-2.5 w-2.5" /> Simulation
                </span>
                <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-slate-300">
                  <ModeIcon className="h-2.5 w-2.5" /> {mode.name}
                </span>
                {modeKey === "mssp" && (
                  <span className="inline-flex items-center gap-1 rounded border border-cyan-500/30 bg-cyan-500/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-cyan-200">
                    <Building2 className="h-2.5 w-2.5" /> {scenario.client}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded border border-white/10 bg-white/[0.03] px-1.5 py-0.5 font-mono text-[9px] text-slate-400">
                  <Clock className="h-2.5 w-2.5" /> {elapsedLabel}
                </span>
              </div>
            </div>

            <button
              onClick={() => setContextOpen((v) => !v)}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-2.5 py-1.5 text-[10px] font-semibold text-slate-300 transition-colors hover:border-white/25 hover:text-white"
            >
              Environment context
            </button>
          </div>

          {contextOpen && (
            <div className="mt-3 overflow-hidden rounded-xl border border-white/10">
              <img src={ENVIRONMENT_DIAGRAM_URL} alt="Edge and OT/IoT enterprise environment" className="h-auto w-full" />
            </div>
          )}
        </div>
      </div>

      {/* Stage rail */}
      <div className="sticky top-20 z-30 border-b border-white/5 bg-[#05070d]/95 backdrop-blur">
        <div className="mx-auto max-w-5xl px-4 py-2.5 sm:px-6">
          <StageRail currentKey={stage} completedKeys={completedKeys} onSelect={setStageAndTab} />
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-4 sm:px-6">
        {/* Tabs */}
        <div className="mb-4 flex gap-0.5 overflow-x-auto border-b border-white/5">
          <TabButton active={tab === "alerts"} onClick={() => setTab("alerts")} icon={Radar}>
            Alerts
            <span className="ml-1 rounded bg-white/5 px-1 font-mono text-[9px] text-slate-400">
              {scenario.alerts.length - undispositioned.length}/{scenario.alerts.length}
            </span>
          </TabButton>
          <TabButton active={tab === "telemetry"} onClick={() => setTab("telemetry")} icon={Activity}>
            Telemetry
          </TabButton>
          <TabButton active={tab === "detection"} disabled={!triageDone} onClick={() => setTab("detection")} icon={Layers}>
            Detection
          </TabButton>
          <TabButton active={tab === "response"} disabled={!detectionDone} onClick={() => setTab("response")} icon={CheckCircle2}>
            Response
          </TabButton>
          {applied.verification && (
            <TabButton active={tab === "outcome"} onClick={() => setTab("outcome")} icon={CheckCircle2}>
              Outcome
            </TabButton>
          )}
        </div>

        <div className="space-y-3">
          <CoachPanel scenario={scenario} stageKey={stage} mode={modeKey} />

          {/* ALERTS */}
          {tab === "alerts" && (
            <>
              <div className="rounded-xl border border-white/10 bg-white/[0.03]">
                <button
                  onClick={() => setBriefingOpen((v) => !v)}
                  className="flex w-full items-center justify-between gap-2 p-3 text-left"
                >
                  <div>
                    <div className="text-[9px] font-bold uppercase tracking-[0.16em] text-slate-500">Scenario briefing</div>
                    <div className="mt-0.5 text-[11px] font-semibold text-white">
                      {scenario.client} · {scenario.clientDetail}
                    </div>
                  </div>
                  <ChevronDown className={`h-4 w-4 shrink-0 text-slate-500 transition-transform ${briefingOpen ? "rotate-180" : ""}`} />
                </button>
                {briefingOpen && (
                  <div className="space-y-2 border-t border-white/5 p-3">
                    {scenario.briefing.map((line, i) => (
                      <p key={i} className="text-[11px] leading-relaxed text-slate-300">
                        {line}
                      </p>
                    ))}
                    <p className="text-[10px] leading-relaxed text-slate-500">{scenario.diagramNote}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                <span>{sources.length} log sources</span>
                <span>·</span>
                <span>{scenario.telemetry.length} seeded events</span>
                {modeKey === "mssp" && (
                  <>
                    <span>·</span>
                    <span className="text-amber-400">SLA clock running</span>
                  </>
                )}
              </div>

              <div className="space-y-2">
                {scenario.alerts.map((alert, index) => {
                  const locked = modeKey === "range" && index >= unlockedCount;
                  const sla = SLA_MINUTES[alert.severity] || 60;
                  const remaining = sla - Math.floor(elapsed / 60);
                  return (
                    <AlertCard
                      key={alert.id}
                      alert={alert}
                      scenario={scenario}
                      mode={modeKey}
                      expanded={expandedAlert === alert.id && !locked}
                      onToggle={() => setExpandedAlert(expandedAlert === alert.id ? null : alert.id)}
                      disposition={dispositions[alert.id]}
                      onDisposition={(v) => handleDisposition(alert, v)}
                      evidence={evidence[alert.id] || []}
                      onEvidence={(ids) => handleEvidence(alert.id, ids)}
                      tenant={scenario.client}
                      slaLabel={remaining > 0 ? `${remaining}m to SLA` : `SLA breached`}
                      breached={remaining <= 0}
                      locked={locked}
                    />
                  );
                })}
              </div>

              {!triageDone && (
                <div className="sticky bottom-3 rounded-xl border border-white/10 bg-[#0a0f1a]/95 p-3 backdrop-blur">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-[10px] leading-relaxed text-slate-400">
                      {undispositioned.length > 0 && <span>{undispositioned.length} alert(s) left to disposition · </span>}
                      {unsubstantiated.length > 0 && (
                        <span className="text-amber-300">{unsubstantiated.length} malicious alert(s) need corroborating telemetry</span>
                      )}
                      {triageReady && <span className="text-emerald-300">Queue clear. Ready to analyse.</span>}
                    </div>
                    <button
                      onClick={completeTriage}
                      disabled={!triageReady}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-200 transition-colors hover:border-red-500/70 hover:bg-red-900/50 hover:text-white disabled:opacity-40 btn-3d"
                    >
                      Complete triage <ChevronDown className="h-3.5 w-3.5 -rotate-90" />
                    </button>
                  </div>
                </div>
              )}

              {triageDone && (
                <button
                  onClick={() => setStageAndTab("detection")}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-800/60 bg-cyan-950/30 px-3 py-2 text-xs font-semibold text-cyan-200 transition-colors hover:border-cyan-500/70 hover:text-white btn-3d"
                >
                  Next: build a detection
                </button>
              )}
            </>
          )}

          {/* TELEMETRY */}
          {tab === "telemetry" && <TelemetryFeed telemetry={scenario.telemetry} />}

          {/* DETECTION */}
          {tab === "detection" && (
            <>
              <DetectionBuilder
                scenario={scenario}
                rule={rule}
                onRuleChange={setRule}
                result={detectionPreview}
                onTest={runDetectionTest}
              />
              {!detectionDone ? (
                <button
                  onClick={confirmDetection}
                  disabled={!detectionPreview?.evaluation?.fires}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-900/60 bg-red-950/40 px-3 py-2 text-xs font-semibold text-red-200 transition-colors hover:border-red-500/70 hover:bg-red-900/50 hover:text-white disabled:opacity-40 btn-3d"
                >
                  Deploy detection &amp; respond
                </button>
              ) : (
                <p className="text-[11px] text-emerald-300">Detection deployed for this client.</p>
              )}
            </>
          )}

          {/* RESPONSE */}
          {tab === "response" && (
            <>
              <div className="rounded-xl border border-rose-500/25 bg-rose-500/[0.05] p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-300" />
                  <p className="text-[10.5px] leading-relaxed text-rose-50/80">
                    Every action here is simulated against the seeded scenario. In production, anything that can stop a
                    process needs the operations owner's approval before you touch it.
                  </p>
                </div>
              </div>
              <ResponsePanel
                scenario={scenario}
                selectedContainment={selectedContainment}
                selectedRecovery={selectedRecovery}
                verification={verification}
                applied={applied}
                onToggleAction={toggleAction}
                onToggleVerification={toggleVerification}
                onApply={applyGroup}
              />
            </>
          )}

          {/* OUTCOME */}
          {tab === "outcome" && applied.verification && (
            <OutcomePanel
              scenario={scenario}
              outcome={outcome}
              findings={findings}
              onFindingsChange={setFindings}
              onSave={saveSession}
              saving={saving}
              saved={saved}
              onRestart={restart}
            />
          )}
        </div>

        <p className="mt-6 text-center text-[10px] leading-relaxed text-slate-600">
          {LIFECYCLE_STAGES.length}-stage simulated incident · {scenario.client} · no live systems are contacted.
        </p>
      </div>
    </div>
  );
}