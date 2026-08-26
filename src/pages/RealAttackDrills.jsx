import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield, ChevronRight, Network, Clock, BarChart2, Terminal,
  Cpu, Monitor, FileText, X, AlertTriangle, CheckCircle, Zap,
  Search, Database, Loader2, Globe, ChevronDown, Flag,
} from "lucide-react";

import { ENDPOINTS, generateLogs, generateAlerts, generateEDRDetections } from "@/components/soc/socData";
import { getCompromisedEndpoints } from "@/components/soc/scenarioProgression";
import { generateRunSeed } from "@/components/soc/runSeed";
import { registerDynamicScenario } from "@/components/soc/dynamicRegistry";
import { useThreatEvolution } from "@/hooks/useThreatEvolution";
import SOCDashboard from "@/components/soc/SOCDashboard";
import SIEMViewer from "@/components/soc/SIEMViewer";
import EDRModule from "@/components/soc/EDRModule";
import RMMModule from "@/components/soc/RMMModule";
import RemediationPanel from "@/components/soc/RemediationPanel";
import IncidentReport from "@/components/soc/IncidentReport";
import DrillReview from "@/components/soc/DrillReview";
import CompleteScenarioDialog from "@/components/soc/CompleteScenarioDialog";
import ScenarioBriefing from "@/components/soc/ScenarioBriefing";
import TrainingNarrative from "@/components/soc/TrainingNarrative";
import GeneratingIndicator from "@/components/soc/GeneratingIndicator";
import { calculateSurrenderScore } from "@/components/soc/drillReview";

const TABS = [
  { id: "dashboard", label: "Dashboard", icon: Monitor },
  { id: "siem", label: "SIEM", icon: BarChart2 },
  { id: "edr", label: "EDR", icon: Shield },
  { id: "rmm", label: "RMM", icon: Cpu },
  { id: "remediation", label: "Remediation", icon: Terminal },
  { id: "report", label: "Report", icon: FileText },
];

const SEVERITY_STYLES = {
  critical: { badge: "text-red-400 bg-red-500/10 border-red-500/30", dot: "bg-red-500" },
  high: { badge: "text-orange-400 bg-orange-500/10 border-orange-500/30", dot: "bg-orange-500" },
  medium: { badge: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30", dot: "bg-yellow-500" },
  low: { badge: "text-blue-400 bg-blue-500/10 border-blue-500/30", dot: "bg-blue-500" },
};

const SOURCE_STYLES = {
  "CISA-KEV": { label: "CISA KEV", color: "text-red-400", bg: "bg-red-500/10" },
  "NVD-CVE": { label: "NVD CVE", color: "text-blue-400", bg: "bg-blue-500/10" },
  "GHSA": { label: "GitHub Advisory", color: "text-purple-400", bg: "bg-purple-500/10" },
};

function AttackCard({ item, onSelect }) {
  const sev = SEVERITY_STYLES[item.severity_label] || SEVERITY_STYLES.medium;
  const src = SOURCE_STYLES[item.source] || SOURCE_STYLES["NVD-CVE"];
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all group cursor-pointer"
      onClick={() => onSelect(item)}
    >
      <div className="flex items-start justify-between gap-2 mb-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${src.bg} ${src.color} border border-current/20`}>{src.label}</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${sev.badge}`}>{item.severity_label}</span>
          </div>
          <div className="text-sm font-semibold text-white group-hover:text-cyan-400 transition-colors truncate">{item.cve_id || item.title}</div>
        </div>
        {item.severity != null && (
          <div className="text-right shrink-0">
            <div className="text-lg font-bold text-white font-mono">{item.severity.toFixed(1)}</div>
            <div className="text-[9px] text-gray-500 uppercase">CVSS</div>
          </div>
        )}
      </div>
      <p className="text-xs text-gray-400 leading-relaxed mb-3 line-clamp-2">{item.description}</p>
      <div className="flex items-center gap-3 text-[10px] text-gray-500">
        {(item.affected_products || []).slice(0, 2).map((p, i) => (
          <span key={i} className="truncate max-w-[120px]">{p}</span>
        ))}
        <span className="ml-auto flex items-center gap-1 text-cyan-400 font-medium group-hover:gap-2 transition-all">
          Select <ChevronRight className="h-3 w-3" />
        </span>
      </div>
    </motion.div>
  );
}

function AttackDetailModal({ item, onGenerate, onClose, generating }) {
  if (!item) return null;
  const sev = SEVERITY_STYLES[item.severity_label] || SEVERITY_STYLES.medium;
  const src = SOURCE_STYLES[item.source] || SOURCE_STYLES["NVD-CVE"];
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-card border border-border/50 rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-border/30 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${src.bg} ${src.color} border border-current/20`}>{src.label}</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${sev.badge}`}>{item.severity_label}</span>
              {item.severity != null && <span className="text-xs font-mono text-muted-foreground">CVSS {item.severity.toFixed(1)}</span>}
            </div>
            <div className="text-base font-bold">{item.cve_id || item.title}</div>
          </div>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <div className="text-[10px] text-muted-foreground uppercase mb-1.5 font-mono">Description</div>
            <p className="text-sm text-foreground/80 leading-relaxed">{item.description}</p>
          </div>
          {item.affected_products?.length > 0 && (
            <div>
              <div className="text-[10px] text-muted-foreground uppercase mb-1.5 font-mono">Affected Products</div>
              <div className="flex flex-wrap gap-1.5">
                {item.affected_products.map((p, i) => (
                  <span key={i} className="text-[11px] px-2 py-0.5 rounded bg-secondary/50 text-foreground/70 border border-border/30">{p}</span>
                ))}
              </div>
            </div>
          )}
          {item.published_date && (
            <div className="text-[11px] text-muted-foreground font-mono">
              Published: {new Date(item.published_date).toLocaleDateString()}
            </div>
          )}
        </div>
        <div className="px-6 pb-6">
          {generating ? (
            <GeneratingIndicator />
          ) : (
            <button
              onClick={() => onGenerate(item)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-all"
            >
              <Zap className="h-4 w-4" /> Generate Drill
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function RealAttackDrills() {
  const [phase, setPhase] = useState("select_attack");
  const [selectedAttack, setSelectedAttack] = useState(null);
  const [detailItem, setDetailItem] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState(null);
  const [selectedNetwork, setSelectedNetwork] = useState(null);
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [simData, setSimData] = useState(null);
  const [activeTab, setActiveTab] = useState("dashboard");
  const [actionsLog, setActionsLog] = useState([]);
  const [score, setScore] = useState(0);
  const [tabsVisited, setTabsVisited] = useState(new Set(["dashboard"]));
  const [reportGenerated, setReportGenerated] = useState(false);
  const [runSeed, setRunSeed] = useState(null);
  const [sessionStartedAt, setSessionStartedAt] = useState(null);
  const [showCompleteDialog, setShowCompleteDialog] = useState(false);
  const sessionSavedRef = useRef(false);

  // Filter state
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const evolution = useThreatEvolution(selectedScenario, simData, runSeed);
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  // Persist a SOCSession record when the drill reaches a terminal state
  useEffect(() => {
    if (!["complete", "failed", "surrendered"].includes(evolution.status)) return;
    if (sessionSavedRef.current) return;
    if (!selectedScenario || !currentUser?.email) return;
    sessionSavedRef.current = true;

    const compromisedAssets = (evolution.liveEndpoints || [])
      .filter(ep => ep.status === "compromised")
      .map(ep => ep.id);

    const triagedAlerts = (evolution.liveAlerts || [])
      .filter(a => a.status !== "open")
      .map(a => a.id);

    base44.entities.SOCSession.create({
      network_design_id: selectedNetwork?.id || "default",
      scenario_id: selectedScenario.id,
      scenario_name: selectedScenario.name,
      user_email: currentUser.email,
      user_name: currentUser.full_name,
      mode: "training",
      status: "completed",
      started_at: sessionStartedAt || new Date().toISOString(),
      completed_at: new Date().toISOString(),
      actions_taken: actionsLog,
      alerts_triaged: triagedAlerts,
      score: score,
      score_breakdown: { finalThreatLevel: evolution.threatLevel, elapsedMinutes: evolution.elapsedMinutes, outcome: evolution.status },
      affected_assets: compromisedAssets,
      iocs: runSeed?.iocs || [],
    }).then(() => {
      queryClient.invalidateQueries({ queryKey: ["my-soc-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["soc-sessions"] });
      queryClient.invalidateQueries({ queryKey: ["soc-sessions-detail"] });
      queryClient.invalidateQueries({ queryKey: ["soc-sessions-leaderboard"] });
    }).catch(() => {});
  }, [evolution.status, selectedScenario, currentUser, selectedNetwork, sessionStartedAt, actionsLog, score, evolution.liveEndpoints, evolution.liveAlerts, evolution.threatLevel, evolution.elapsedMinutes, evolution.status, runSeed, queryClient]);

  const { data: feedItems = [], isLoading: feedLoading } = useQuery({
    queryKey: ["threat-feed-items"],
    queryFn: () => base44.entities.ThreatFeedItem.list("-ingested_at", 25),
  });

  const { data: networks = [] } = useQuery({
    queryKey: ["network-designs-rad"],
    queryFn: () => base44.entities.NetworkDesign.list(),
  });
  const { data: networkTemplates = [] } = useQuery({
    queryKey: ["network-templates-rad"],
    queryFn: () => base44.entities.NetworkTemplate.filter({ category: "built-in" }),
  });

  const filteredItems = useMemo(() => {
    return feedItems.filter(item => {
      if (sevFilter !== "all" && item.severity_label !== sevFilter) return false;
      if (sourceFilter !== "all" && item.source !== sourceFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const haystack = `${item.title} ${item.cve_id || ""} ${item.description || ""} ${(item.affected_products || []).join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [feedItems, sevFilter, sourceFilter, search]);

  const generateDrill = async (item) => {
    setGenerating(true);
    setGenError(null);
    try {
      const response = await base44.functions.invoke("generateDynamicScenario", { feed_item_id: item.id });
      const scenario = response.data?.scenario;
      if (!scenario) throw new Error("No scenario returned");
      registerDynamicScenario(scenario);
      setSelectedAttack(item);
      setSelectedScenario(scenario);
      setPhase("select_network");
      setDetailItem(null);
    } catch (err) {
      setGenError(err.message || "Failed to generate drill");
    } finally {
      setGenerating(false);
    }
  };

  const launchScenario = (scenario) => {
    const seed = generateRunSeed(scenario.id);
    const scenarioAlerts = generateAlerts(scenario.id, seed);
    const scenarioLogs = generateLogs(scenario.id, seed);
    const scenarioEDR = generateEDRDetections(scenario.id, seed);
    const compromised = new Set(getCompromisedEndpoints(scenario.id));
    if (seed.patientZero) compromised.add(seed.patientZero);
    const updatedEps = [...ENDPOINTS].map(ep => ({ ...ep, status: compromised.has(ep.id) ? "compromised" : "healthy" }));
    setSimData({ alerts: scenarioAlerts, logs: scenarioLogs, endpoints: updatedEps, edr: scenarioEDR });
    setActionsLog([]);
    setScore(0);
    setTabsVisited(new Set(["dashboard"]));
    setReportGenerated(false);
    setRunSeed(seed);
    setSessionStartedAt(new Date().toISOString());
    sessionSavedRef.current = false;
    setActiveTab("dashboard");
    setPhase("active");
  };

  const handleAction = (action) => {
    evolution.processAction(action);
    if (action.isPenalty) { setScore(prev => Math.max(prev + (action.scoreOverride || -5), 0)); return; }
    if (action.scoreOverride !== undefined) {
      setActionsLog(prev => prev.find(a => a.id === action.id) ? prev : [...prev, action]);
      setScore(prev => Math.min(Math.max(prev + action.scoreOverride, 0), 100));
      return;
    }
    setActionsLog(prev => prev.find(a => a.id === action.id) ? prev : [...prev, action]);
    const scoreMap = { isolate_host: 15, block_ip: 12, disable_user: 10, reset_password: 8, kill_process: 10, quarantine_file: 8, collect_forensics: 12, preserve_evidence: 10, update_fw_rule: 8, patch_system: 10, restore_backup: 15, escalate_ir: 5, notify_customer: 5, open_ticket: 3, start_coc: 8, remove_persistence: 12, analyst_note: 1 };
    setScore(prev => Math.min(prev + (scoreMap[action.id] || 2), 100));
  };

  const handleCompleteScenario = () => setShowCompleteDialog(true);

  const confirmCompleteScenario = () => {
    const finalScore = calculateSurrenderScore(selectedScenario, actionsLog, evolution.liveAlerts, evolution.liveEndpoints);
    setScore(finalScore);
    evolution.completeScenario();
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setTabsVisited(prev => new Set([...prev, tabId]));
  };

  const exitSimulation = () => {
    setPhase("select_attack");
    setSelectedAttack(null);
    setSelectedScenario(null);
    setSelectedNetwork(null);
    setSimData(null);
    setActionsLog([]);
    setScore(0);
  };

  // ── SELECT ATTACK ───────────────────────────────────────────────────────────
  if (phase === "select_attack") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-cyan-950/20 p-6">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/20 rounded-xl"><Globe className="h-6 w-6 text-cyan-400" /></div>
            <div>
              <h1 className="text-2xl font-bold text-white">Real Attack Drills</h1>
              <p className="text-sm text-gray-400">Practice incident response against real vulnerabilities from CISA KEV, NVD CVE, and GitHub Security Advisories — enriched with EPSS exploit-likelihood scores</p>
            </div>
          </div>

          {feedLoading ? (
            <div className="flex items-center justify-center py-20 text-gray-400">
              <Loader2 className="h-6 w-6 animate-spin mr-2" /> Loading threat feed catalog...
            </div>
          ) : feedItems.length === 0 ? (
            <div className="text-center py-20">
              <Database className="h-12 w-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 mb-2">No threat feed items yet.</p>
              <p className="text-xs text-gray-500">An admin can run the feed ingestion to populate the catalog, or the nightly workflow will fetch them automatically.</p>
            </div>
          ) : (
            <>
              {/* Search & Filters */}
              <div className="mb-6 space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by CVE, title, product, or description..."
                    className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {["all", "critical", "high", "medium", "low"].map(s => (
                    <button key={s} onClick={() => setSevFilter(s)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all capitalize ${sevFilter === s ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : "bg-white/5 text-gray-400 border border-white/10 hover:text-white"}`}>
                      {s}
                    </button>
                  ))}
                  <div className="h-4 w-px bg-white/10 mx-1" />
                  {["all", "CISA-KEV", "NVD-CVE", "GHSA"].map(s => (
                    <button key={s} onClick={() => setSourceFilter(s)}
                      className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${sourceFilter === s ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" : "bg-white/5 text-gray-400 border border-white/10 hover:text-white"}`}>
                      {s === "all" ? "All Sources" : SOURCE_STYLES[s]?.label || s}
                    </button>
                  ))}
                  <span className="ml-auto text-xs text-gray-500">{filteredItems.length} attacks</span>
                </div>
              </div>

              {genError && (
                <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-sm text-red-400 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0" /> {genError}
                </div>
              )}

              {/* Attack Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map(item => (
                  <AttackCard key={item.id} item={item} onSelect={setDetailItem} />
                ))}
              </div>
            </>
          )}
        </div>

        <AnimatePresence>
          {detailItem && (
            <AttackDetailModal
              item={detailItem}
              onGenerate={generateDrill}
              onClose={() => setDetailItem(null)}
              generating={generating}
            />
          )}
        </AnimatePresence>
      </div>
    );
  }

  // ── SELECT NETWORK (optional) ───────────────────────────────────────────────
  if (phase === "select_network") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-cyan-950/20 p-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
            <button onClick={() => { setPhase("select_attack"); setSelectedScenario(null); }} className="hover:text-white transition-colors">Real Attack Drills</button>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-white truncate">{selectedScenario?.name}</span>
          </div>

          <div className="mb-6 p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-cyan-400" />
              <span className="text-sm font-semibold text-white">Scenario Generated!</span>
            </div>
            <p className="text-xs text-gray-400">{selectedScenario?.description}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {(selectedScenario?.mitre || []).map(m => (
                <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-mono">{m}</span>
              ))}
            </div>
          </div>

          <h2 className="text-lg font-semibold text-white mb-1">Choose Network Environment <span className="text-sm text-gray-500 font-normal">(optional)</span></h2>
          <p className="text-sm text-gray-400 mb-4">Pick a network for cosmetic endpoint labels, or use the default lab and start immediately.</p>

          {/* Primary: Use default */}
          <button
            onClick={() => { setSelectedNetwork({ id: "default", name: "Default Lab Environment" }); setPhase("briefing"); }}
            className="w-full mb-4 p-4 bg-cyan-500/10 border-2 border-cyan-500/40 rounded-xl hover:bg-cyan-500/15 transition-all text-left group flex items-center gap-3"
          >
            <div className="p-2 bg-cyan-500/20 rounded-lg"><Zap className="h-5 w-5 text-cyan-400" /></div>
            <div className="flex-1">
              <div className="font-semibold text-sm text-white">Use Default Environment & Start</div>
              <div className="text-xs text-cyan-400 mt-0.5">8 pre-configured virtual devices — jump straight into the drill</div>
            </div>
            <ChevronRight className="h-5 w-5 text-cyan-400 group-hover:translate-x-1 transition-transform" />
          </button>

          {/* Secondary: Choose a network */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-gray-400">Or Choose a Network</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            {networkTemplates.map(tpl => {
              const data = (() => { try { return JSON.parse(tpl.template_data); } catch { return {}; } })();
              return (
                <button key={tpl.id} onClick={() => { setSelectedNetwork({ id: tpl.id, name: tpl.name, ...data }); setPhase("briefing"); }}
                  className="p-4 bg-white/5 border border-white/10 rounded-xl hover:border-cyan-400/50 hover:bg-cyan-400/5 transition-all text-left group">
                  <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-cyan-400/10 rounded-lg shrink-0 mt-0.5"><Network className="h-4 w-4 text-cyan-400" /></div>
                    <div className="min-w-0">
                      <div className="font-semibold text-sm text-white group-hover:text-cyan-400 transition-colors">{tpl.name}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{tpl.description}</div>
                    </div>
                  </div>
                </button>
              );
            })}
            {networks.map(net => (
              <button key={net.id} onClick={() => { setSelectedNetwork(net); setPhase("briefing"); }}
                className="p-4 bg-white/5 border border-white/10 rounded-xl hover:border-cyan-400/50 hover:bg-cyan-400/5 transition-all text-left">
                <div className="flex items-center gap-3">
                  <Network className="h-5 w-5 text-cyan-400" />
                  <div>
                    <div className="font-semibold text-sm text-white">{net.name}</div>
                    <div className="text-xs text-gray-400 mt-0.5">{net.topology_type || "Custom"} · {net.site_names?.length || 1} site(s)</div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── BRIEFING ───────────────────────────────────────────────────────────────
  if (phase === "briefing") {
    return (
      <ScenarioBriefing
        scenario={selectedScenario}
        mode="training"
        onConfirm={() => launchScenario(selectedScenario)}
        onBack={() => setPhase("select_network")}
      />
    );
  }

  // ── ACTIVE SIMULATION ────────────────────────────────────────────────────────
  const openAlerts = evolution.liveAlerts.filter(a => a.status === "open").length;
  const threatColor = evolution.threatLevel >= 75 ? "text-red-400" : evolution.threatLevel >= 40 ? "text-orange-400" : evolution.threatLevel >= evolution.containmentThreshold ? "text-yellow-400" : "text-green-400";
  const threatBg = evolution.threatLevel >= 75 ? "bg-red-500" : evolution.threatLevel >= 40 ? "bg-orange-500" : evolution.threatLevel >= evolution.containmentThreshold ? "bg-yellow-500" : "bg-green-500";
  const threatLabel = evolution.status === "contained" ? "CONTAINED" : evolution.threatLevel >= 75 ? "CRITICAL" : evolution.threatLevel >= 40 ? "ESCALATING" : "ACTIVE";

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <div className="flex items-center gap-3 px-4 py-2 bg-card border-b border-border/40 shrink-0">
        <div className="flex items-center gap-2 shrink-0">
          <Globe className="h-5 w-5 text-cyan-400" />
          <span className="font-semibold text-sm hidden sm:inline">{selectedScenario?.name}</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border text-cyan-400 border-cyan-500/30">Real Attack</span>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border text-primary border-primary/30 hidden sm:inline">🎓 Training</span>
        </div>

        {/* Threat Level Indicator */}
        <div className="flex items-center gap-2 px-3 py-1 rounded-lg border border-border/30 bg-secondary/30 shrink-0">
          <div className="flex items-center gap-1.5">
            <span className={`text-[10px] font-bold font-mono ${threatColor}`}>{threatLabel}</span>
            <div className="w-20 h-1.5 bg-secondary rounded-full overflow-hidden">
              <div className={`h-full ${threatBg} rounded-full transition-all duration-500`} style={{ width: `${evolution.threatLevel}%` }} />
            </div>
            <span className={`text-xs font-mono font-bold ${threatColor}`}>{evolution.threatLevel}%</span>
          </div>
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
            <span className="text-muted-foreground">{evolution.elapsedMinutes}m</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-mono">
            {openAlerts > 0 ? <AlertTriangle className="h-3.5 w-3.5 text-red-400" /> : <CheckCircle className="h-3.5 w-3.5 text-green-400" />}
            <span className={openAlerts > 0 ? "text-red-400" : "text-green-400"}>{openAlerts} open</span>
          </div>
          <div className="text-xs font-mono text-primary font-semibold">{score}pts</div>
          <button onClick={handleCompleteScenario}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 border border-amber-500/30 transition-all">
            <Flag className="h-3.5 w-3.5" /> Complete Scenario
          </button>
          <button onClick={exitSimulation}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs text-muted-foreground hover:text-red-400 hover:bg-red-500/10 border border-border/30 transition-all">
            <X className="h-3.5 w-3.5" /> Exit
          </button>
        </div>
      </div>

      {/* Content + Sidebar */}
      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }} className="h-full">
              {activeTab === "dashboard" && <SOCDashboard alerts={evolution.liveAlerts} logs={evolution.liveLogs} edrDetections={evolution.liveEDR} endpoints={evolution.liveEndpoints} actionsLog={actionsLog} scenario={selectedScenario} elapsedMinutes={evolution.elapsedMinutes} score={score} threatLevel={evolution.threatLevel} threatTrend={evolution.threatTrend} eventFeed={evolution.eventFeed} status={evolution.status} />}
              {activeTab === "siem" && <SIEMViewer logs={evolution.liveLogs} />}
              {activeTab === "edr" && <EDRModule detections={evolution.liveEDR} endpoints={evolution.liveEndpoints} onAction={handleAction} />}
              {activeTab === "rmm" && <RMMModule endpoints={evolution.liveEndpoints} onAction={handleAction} />}
              {activeTab === "remediation" && <RemediationPanel endpoints={evolution.liveEndpoints} alerts={evolution.liveAlerts} logs={evolution.liveLogs} actionsLog={actionsLog} onAction={handleAction} score={score} scenario={selectedScenario} seed={runSeed} />}
              {activeTab === "report" && <IncidentReport scenario={selectedScenario} alerts={evolution.liveAlerts} logs={evolution.liveLogs} actionsLog={actionsLog} endpoints={evolution.liveEndpoints} score={score} elapsedMinutes={evolution.elapsedMinutes} onReportGenerated={() => { setReportGenerated(true); evolution.markComplete(); }} />}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="w-px shrink-0 bg-gradient-to-b from-transparent via-primary/40 to-transparent" />
        <div className="w-80 shrink-0 flex flex-col overflow-hidden">
          <TrainingNarrative scenario={selectedScenario} actionsLog={actionsLog} alerts={evolution.liveAlerts} reportGenerated={reportGenerated} activeTab={activeTab} onNavigate={handleTabChange} tabsVisited={tabsVisited} threatLevel={evolution.threatLevel} eventFeed={evolution.eventFeed} status={evolution.status} seed={runSeed} onHintUsed={evolution.addTimePenalty} />
        </div>
      </div>

      <CompleteScenarioDialog
        open={showCompleteDialog}
        onOpenChange={setShowCompleteDialog}
        onConfirm={confirmCompleteScenario}
        actionsCompleted={actionsLog.filter(a => !a.isPenalty).length}
        score={score}
      />

      {/* Post-Incident Review */}
      <AnimatePresence>
        {(["failed", "complete", "surrendered"].includes(evolution.status)) && (
          <DrillReview
            scenario={selectedScenario}
            actionsLog={actionsLog}
            alerts={evolution.liveAlerts}
            endpoints={evolution.liveEndpoints}
            score={score}
            elapsedMinutes={evolution.elapsedMinutes}
            status={evolution.status}
            successMessage={evolution.successMessage}
            failureMessage={evolution.failureMessage}
            onExit={exitSimulation}
          />
        )}
      </AnimatePresence>
    </div>
  );
}