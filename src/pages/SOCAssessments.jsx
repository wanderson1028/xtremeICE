import React, { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, ChevronRight, Network, Clock, BarChart2, Terminal,
  Cpu, Monitor, FileText, X, AlertTriangle, CheckCircle, Zap, ClipboardList
} from "lucide-react";

import { SCENARIOS, ENDPOINTS, generateLogs, generateAlerts, generateEDRDetections } from "@/components/soc/socData";
import SOCDashboard from "@/components/soc/SOCDashboard";
import SIEMViewer from "@/components/soc/SIEMViewer";
import EDRModule from "@/components/soc/EDRModule";
import RMMModule from "@/components/soc/RMMModule";
import RemediationPanel from "@/components/soc/RemediationPanel";
import SOCAnalystAI from "@/components/soc/SOCAnalystAI";
import IncidentReport from "@/components/soc/IncidentReport";
import ScenarioBriefing from "@/components/soc/ScenarioBriefing";
import TrainingNarrative from "@/components/soc/TrainingNarrative";
import AssessmentTaskList from "@/components/soc/AssessmentTaskList";
import AssessmentSummary from "@/components/soc/AssessmentSummary";
import { TASK_DEFINITIONS } from "@/components/soc/assessmentTasks";

const ALL_ASSESSMENT = SCENARIOS.filter(s => s.difficulty !== "Beginner");

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: Monitor },
  { id: "siem", label: "SIEM", icon: BarChart2 },
  { id: "edr", label: "EDR", icon: Shield },
  { id: "rmm", label: "RMM", icon: Cpu },
  { id: "remediation", label: "Remediation", icon: Terminal },
  { id: "report", label: "Report", icon: FileText },
];

const difficultyColor = {
  Intermediate: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  Advanced: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  Expert: "text-red-400 bg-red-500/10 border-red-500/30",
};

function ScenarioCard({ scenario, onLaunch }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-card border border-border/50 rounded-2xl p-5 hover:border-primary/40 transition-all group cursor-pointer"
      onClick={() => onLaunch(scenario)}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-base font-semibold group-hover:text-primary transition-colors">{scenario.name}</div>
          <div className="text-xs text-muted-foreground mt-0.5">{scenario.category}</div>
        </div>
        <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${difficultyColor[scenario.difficulty]}`}>{scenario.difficulty}</span>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed mb-4">{scenario.description}</p>
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> ~{scenario.duration_min} min</span>
        <span className="flex items-center gap-1"><Zap className="h-3.5 w-3.5" />{scenario.mitre.length} MITRE tactics</span>
        <span className="ml-auto flex items-center gap-1 text-primary font-medium group-hover:gap-2 transition-all">
          Launch <ChevronRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </motion.div>
  );
}

function ModePicker({ onSelect }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-xl mx-auto">
      <button onClick={() => onSelect("training")}
        className="p-6 bg-primary/10 border border-primary/30 rounded-2xl hover:bg-primary/20 transition-all text-left group">
        <div className="text-2xl mb-2">🎓</div>
        <div className="font-semibold">Training Mode</div>
        <div className="text-sm text-muted-foreground mt-1">AI analyst guides you step by step. Hints available. Learn while doing.</div>
      </button>
      <button onClick={() => onSelect("assessment")}
        className="p-6 bg-orange-500/10 border border-orange-500/30 rounded-2xl hover:bg-orange-500/20 transition-all text-left group">
        <div className="text-2xl mb-2">📋</div>
        <div className="font-semibold">Assessment Mode</div>
        <div className="text-sm text-muted-foreground mt-1">Work independently. Scored on speed, actions, and quality. No hints.</div>
      </button>
    </div>
  );
}

export default function SOCAssessments() {
  const [phase, setPhase] = useState("select_network");
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [mode, setMode] = useState("training");
  const [activeTab, setActiveTab] = useState("dashboard");
  const [actionsLog, setActionsLog] = useState([]);
  const [score, setScore] = useState(0);
  const [alerts, setAlerts] = useState([]);
  const [endpoints, setEndpoints] = useState([]);
  const [logs, setLogs] = useState([]);
  const [edrDetections, setEdrDetections] = useState([]);
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [tabsVisited, setTabsVisited] = useState(new Set(["dashboard"]));
  const [reportGenerated, setReportGenerated] = useState(false);
  const startTimeRef = useRef(null);
  const timerRef = useRef(null);

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: labAssignments = [] } = useQuery({
    queryKey: ["lab-assignments-user", currentUser?.email, "soc_assessments"],
    queryFn: () => base44.entities.UserLabAssignment.filter({
      user_email: currentUser.email,
      service_key: "soc_assessments",
    }),
    enabled: !!currentUser?.email,
  });

  const ASSESSMENT_SCENARIOS = (() => {
    if (!labAssignments.length) return ALL_ASSESSMENT;
    const ids = new Set(labAssignments.map(a => a.lab_id));
    return ALL_ASSESSMENT.filter(s => ids.has(s.id));
  })();

  const { data: networks = [] } = useQuery({
    queryKey: ["network-designs"],
    queryFn: () => base44.entities.NetworkDesign.list(),
  });
  const { data: networkTemplates = [], isLoading: templatesLoading } = useQuery({
    queryKey: ["network-templates-soc"],
    queryFn: () => base44.entities.NetworkTemplate.filter({ category: "built-in" }),
  });

  useEffect(() => {
    if (phase === "active") {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedMinutes(Math.floor((Date.now() - startTimeRef.current) / 60000));
      }, 10000);
    }
    return () => clearInterval(timerRef.current);
  }, [phase]);

  const launchScenario = (scenario, selectedMode) => {
    const scenarioAlerts = generateAlerts(scenario.id);
    const scenarioLogs = generateLogs(scenario.id);
    const scenarioEDR = generateEDRDetections(scenario.id);
    const compromisedMap = {
      phishing_compromise: ["win-ws-01", "win-srv-01"],
      ransomware_outbreak: ["win-ws-01", "win-ws-02", "win-srv-01"],
      lateral_movement: ["win-ws-01", "win-srv-01", "dc-01"],
      data_exfiltration: ["linux-srv-01"],
      insider_threat: ["win-ws-02"],
      web_compromise: ["linux-web-01"],
    };
    const compromised = new Set(compromisedMap[scenario.id] || []);
    const updatedEps = [...ENDPOINTS].map(ep => ({ ...ep, status: compromised.has(ep.id) ? "compromised" : "healthy" }));
    setAlerts(scenarioAlerts);
    setLogs(scenarioLogs);
    setEdrDetections(scenarioEDR);
    setEndpoints(updatedEps);
    setActionsLog([]);
    setScore(0);
    setElapsedMinutes(0);
    setTabsVisited(new Set(["dashboard"]));
    setReportGenerated(false);
    setActiveTab("dashboard");
    setSelectedScenario(scenario);
    setMode(selectedMode);
    setPhase("active");
  };

  const handleAction = (action) => {
    if (action.isPenalty) { setScore(prev => Math.max(prev + (action.scoreOverride || -5), 0)); return; }
    if (action.scoreOverride !== undefined) {
      setActionsLog(prev => prev.find(a => a.id === action.id) ? prev : [...prev, action]);
      setScore(prev => Math.min(Math.max(prev + action.scoreOverride, 0), 100));
      return;
    }
    setActionsLog(prev => prev.find(a => a.id === action.id) ? prev : [...prev, action]);
    const scoreMap = { isolate_host: 15, block_ip: 12, disable_user: 10, reset_password: 8, kill_process: 10, quarantine_file: 8, collect_forensics: 12, preserve_evidence: 10, update_fw_rule: 8, patch_system: 10, restore_backup: 15, escalate_ir: 5, notify_customer: 5, open_ticket: 3, start_coc: 8, remove_persistence: 12, analyst_note: 1 };
    setScore(prev => Math.min(prev + (scoreMap[action.id] || 2), 100));
    if (action.id === "isolate_host" || action.id?.includes("isolate")) {
      setEndpoints(prev => prev.map(ep => ep.name === action.target ? { ...ep, status: "isolated" } : ep));
    }
    if (["block_ip", "disable_user", "isolate_host", "kill_process"].includes(action.id)) {
      setAlerts(prev => prev.map((a, idx) => idx === 0 && a.status === "open" ? { ...a, status: "closed" } : a));
    }
  };

  const handleHintUsed = (penalty) => setScore(prev => Math.max(prev - penalty, 0));

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setTabsVisited(prev => new Set([...prev, tabId]));
  };

  const endAssessment = () => { clearInterval(timerRef.current); setPhase("summary"); };

  const exitSimulation = () => {
    clearInterval(timerRef.current);
    setPhase("select_network");
    setSelectedScenario(null);
    setActionsLog([]);
    setScore(0);
  };

  // Inline task progress for top bar
  const SIMPLE_TASKS = [
    { id: "t1", check: ({ tabsVisited }) => tabsVisited.has("siem") },
    { id: "t2", check: ({ tabsVisited }) => tabsVisited.has("edr") },
    { id: "t3", check: ({ actionIds }) => ["isolate_host", "block_ip", "disable_user"].some(id => actionIds.has(id)) },
    { id: "t4", check: ({ actionIds }) => ["collect_forensics", "preserve_evidence", "start_coc"].some(id => actionIds.has(id)) },
    { id: "t5", check: ({ actionIds }) => ["remove_persistence", "patch_system", "restore_backup", "kill_process", "quarantine_file"].some(id => actionIds.has(id)) },
    { id: "t6", check: ({ reportGenerated }) => reportGenerated },
  ];
  const taskCtx = { actionIds: new Set(actionsLog.map(a => a.id)), tabsVisited, reportGenerated };
  const completedTaskCount = SIMPLE_TASKS.filter(t => t.check(taskCtx)).length;

  // ── SELECT NETWORK ───────────────────────────────────────────────────────────
  if (phase === "select_network") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/20 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8 flex items-center gap-3">
            <div className="p-2.5 bg-orange-500/20 rounded-xl"><ClipboardList className="h-6 w-6 text-orange-400" /></div>
            <div>
              <h1 className="text-2xl font-bold">SOC Assessments</h1>
              <p className="text-sm text-muted-foreground">Intermediate, Advanced, and Expert-level scenarios — training or timed assessment mode</p>
            </div>
          </div>
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-1">Select Network Environment</h2>
            <p className="text-sm text-muted-foreground mb-4">Choose an enterprise template or one of your saved network designs.</p>
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Enterprise Templates</span>
                <div className="flex-1 h-px bg-primary/20" />
              </div>
              {templatesLoading ? (
                <div className="py-4 text-center text-muted-foreground text-sm">Loading templates...</div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {networkTemplates.map(tpl => {
                    const data = (() => { try { return JSON.parse(tpl.template_data); } catch { return {}; } })();
                    return (
                      <button key={tpl.id} onClick={() => { setSelectedNetwork({ id: tpl.id, name: tpl.name, ...data }); setPhase("select_scenario"); }}
                        className="p-4 bg-primary/5 border border-primary/20 rounded-xl hover:border-primary/50 hover:bg-primary/10 transition-all text-left group">
                        <div className="flex items-start gap-3">
                          <div className="p-1.5 bg-primary/10 rounded-lg shrink-0 mt-0.5"><Network className="h-4 w-4 text-primary" /></div>
                          <div className="min-w-0">
                            <div className="font-semibold text-sm group-hover:text-primary transition-colors">{tpl.name}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">{tpl.description}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Your Designs</span>
                <div className="flex-1 h-px bg-border/50" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button onClick={() => { setSelectedNetwork({ id: "default", name: "Default Lab Environment" }); setPhase("select_scenario"); }}
                  className="p-4 bg-card border border-border/50 rounded-xl hover:border-primary/40 transition-all text-left">
                  <div className="flex items-center gap-3">
                    <Network className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium text-sm">Default Lab Environment</div>
                      <div className="text-xs text-muted-foreground">8 pre-configured virtual devices</div>
                    </div>
                  </div>
                </button>
                {networks.map(net => (
                  <button key={net.id} onClick={() => { setSelectedNetwork(net); setPhase("select_scenario"); }}
                    className="p-4 bg-card border border-border/50 rounded-xl hover:border-primary/40 transition-all text-left">
                    <div className="flex items-center gap-3">
                      <Network className="h-5 w-5 text-primary" />
                      <div>
                        <div className="font-medium text-sm">{net.name}</div>
                        <div className="text-xs text-muted-foreground">{net.topology_type || "Custom"} · {net.site_names?.length || 1} site(s)</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── SELECT SCENARIO ──────────────────────────────────────────────────────────
  if (phase === "select_scenario") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/20 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
            <button onClick={() => setPhase("select_network")} className="hover:text-foreground transition-colors">SOC Assessments</button>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground">{selectedNetwork?.name}</span>
          </div>
          <h2 className="text-xl font-bold mb-1">Choose Incident Scenario</h2>
          <p className="text-sm text-muted-foreground mb-6">Intermediate through Expert scenarios. Select training or assessment mode after picking a scenario.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {ASSESSMENT_SCENARIOS.map(scenario => (
              <ScenarioCard key={scenario.id} scenario={scenario} onLaunch={(s) => { setSelectedScenario(s); setPhase("select_mode"); }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── SELECT MODE ──────────────────────────────────────────────────────────────
  if (phase === "select_mode") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/20 p-6 flex flex-col items-center justify-center">
        <div className="max-w-xl w-full">
          <div className="text-center mb-8">
            <div className="text-4xl mb-3">🛡️</div>
            <h2 className="text-xl font-bold">Select Training Mode</h2>
            <p className="text-sm text-muted-foreground mt-1">Scenario: <span className="text-foreground font-medium">{selectedScenario?.name}</span></p>
          </div>
          <ModePicker onSelect={(m) => { setMode(m); setPhase("briefing"); }} />
          <button onClick={() => setPhase("select_scenario")} className="mt-6 w-full text-sm text-muted-foreground hover:text-foreground transition-colors">← Back to scenarios</button>
        </div>
      </div>
    );
  }

  // ── BRIEFING ─────────────────────────────────────────────────────────────────
  if (phase === "briefing") {
    return (
      <ScenarioBriefing
        scenario={selectedScenario}
        mode={mode}
        onConfirm={() => launchScenario(selectedScenario, mode)}
        onBack={() => setPhase("select_mode")}
      />
    );
  }

  // ── ASSESSMENT SUMMARY ───────────────────────────────────────────────────────
  if (phase === "summary") {
    return (
      <AssessmentSummary
        scenario={selectedScenario}
        score={score}
        actionsLog={actionsLog}
        tabsVisited={tabsVisited}
        reportGenerated={reportGenerated}
        elapsedMinutes={elapsedMinutes}
        onRestart={() => setPhase("briefing")}
        onExit={exitSimulation}
      />
    );
  }

  // ── ACTIVE SIMULATION ────────────────────────────────────────────────────────
  const openAlerts = alerts.filter(a => a.status === "open").length;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-card border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-red-400" />
          <span className="font-semibold text-sm">{selectedScenario?.name}</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${difficultyColor[selectedScenario?.difficulty]}`}>{selectedScenario?.difficulty}</span>
          <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${mode === "assessment" ? "text-orange-400 border-orange-500/30" : "text-primary border-primary/30"}`}>
            {mode === "assessment" ? "📋 Assessment" : "🎓 Training"}
          </span>
        </div>
        <div className="flex items-center gap-0.5 bg-secondary/50 rounded-lg p-0.5 mx-auto overflow-x-auto">
          {TABS.map(tab => {
            const Icon = tab.icon;
            const hasAlert = tab.id === "siem" && openAlerts > 0;
            return (
              <button key={tab.id} onClick={() => handleTabChange(tab.id)}
                className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"}`}>
                <Icon className="h-3.5 w-3.5" />{tab.label}
                {hasAlert && <span className="absolute -top-0.5 -right-0.5 h-2 w-2 bg-red-500 rounded-full" />}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-xs font-mono">
            <Clock className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-muted-foreground">{elapsedMinutes}m</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono">
            {openAlerts > 0 ? <AlertTriangle className="h-3.5 w-3.5 text-red-400" /> : <CheckCircle className="h-3.5 w-3.5 text-green-400" />}
            <span className={openAlerts > 0 ? "text-red-400" : "text-green-400"}>{openAlerts} open</span>
          </div>
          <div className="text-xs font-mono text-primary font-semibold">{score}pts</div>
          {mode === "assessment" && (
            <button onClick={endAssessment}
              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-orange-400 hover:bg-orange-500/10 border border-orange-500/30 transition-all font-medium">
              <CheckCircle className="h-3.5 w-3.5" /> End Assessment
            </button>
          )}
          <button onClick={exitSimulation}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/10 border border-border/30 transition-all">
            <X className="h-3.5 w-3.5" /> Exit
          </button>
        </div>
      </div>

      {/* Assessment task progress bar */}
      {mode === "assessment" && (
        <div className="shrink-0 px-4 py-1.5 bg-card/60 border-b border-border/30 flex items-center gap-3">
          <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">Tasks</span>
          <div className="flex-1 flex items-center gap-1">
            {SIMPLE_TASKS.map(t => (
              <div key={t.id} className={`flex-1 h-2 rounded-full transition-all duration-500 ${t.check(taskCtx) ? "bg-orange-400" : "bg-secondary"}`} />
            ))}
          </div>
          <span className="text-[10px] font-mono text-orange-400 font-semibold whitespace-nowrap">
            {completedTaskCount}/{SIMPLE_TASKS.length} · {Math.round((completedTaskCount / SIMPLE_TASKS.length) * 100)}%
          </span>
        </div>
      )}

      {/* Content + Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="h-full">
              {activeTab === "dashboard" && <SOCDashboard alerts={alerts} logs={logs} edrDetections={edrDetections} endpoints={endpoints} actionsLog={actionsLog} scenario={selectedScenario} elapsedMinutes={elapsedMinutes} score={score} />}
              {activeTab === "siem" && <SIEMViewer logs={logs} />}
              {activeTab === "edr" && <EDRModule detections={edrDetections} endpoints={endpoints} onAction={handleAction} />}
              {activeTab === "rmm" && <RMMModule endpoints={endpoints} onAction={handleAction} />}
              {activeTab === "remediation" && <RemediationPanel endpoints={endpoints} alerts={alerts} actionsLog={actionsLog} onAction={handleAction} score={score} scenario={selectedScenario} />}
              {activeTab === "report" && <IncidentReport scenario={selectedScenario} alerts={alerts} logs={logs} actionsLog={actionsLog} endpoints={endpoints} score={score} elapsedMinutes={elapsedMinutes} onReportGenerated={() => setReportGenerated(true)} />}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="w-px shrink-0 bg-gradient-to-b from-transparent via-primary/40 to-transparent" />
        <div className="w-80 shrink-0 flex flex-col overflow-hidden">
          {mode === "training" ? (
            <div className="flex flex-col h-full">
              <div className="h-1/2 border-b border-border/30 overflow-hidden flex flex-col">
                <TrainingNarrative scenario={selectedScenario} actionsLog={actionsLog} alerts={alerts} reportGenerated={reportGenerated} activeTab={activeTab} onNavigate={handleTabChange} tabsVisited={tabsVisited} />
              </div>
              <div className="flex-1 overflow-hidden flex flex-col">
                <SOCAnalystAI scenario={selectedScenario} alerts={alerts} logs={logs} actionsLog={actionsLog} mode={mode} />
              </div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="h-1/2 border-b border-border/30 overflow-hidden flex flex-col">
                <AssessmentTaskList actionsLog={actionsLog} tabsVisited={tabsVisited} score={score} reportGenerated={reportGenerated} mode={mode} onHintUsed={handleHintUsed} />
              </div>
              <div className="flex-1 overflow-hidden flex flex-col">
                <SOCAnalystAI scenario={selectedScenario} alerts={alerts} logs={logs} actionsLog={actionsLog} mode={mode} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}