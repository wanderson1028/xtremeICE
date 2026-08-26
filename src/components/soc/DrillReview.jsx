import React, { useMemo } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle, XCircle, AlertTriangle, DollarSign, ShieldAlert,
  Clock, TrendingDown, ArrowLeft, Activity, Cpu,
} from "lucide-react";
import { getExpectedActions, getTakenActionIds, calculateDrillCost, formatCurrency } from "./drillReview";

export default function DrillReview({
  scenario, actionsLog, alerts, endpoints, score, elapsedMinutes,
  status, successMessage, failureMessage, onExit,
}) {
  const expected = useMemo(() => getExpectedActions(scenario, alerts), [scenario, alerts]);
  const takenIds = useMemo(() => getTakenActionIds(actionsLog), [actionsLog]);
  const cost = useMemo(() => calculateDrillCost(scenario, endpoints, alerts), [scenario, endpoints, alerts]);

  const completed = expected.filter(a => takenIds.has(a.id));
  const missed = expected.filter(a => !takenIds.has(a.id));
  const openAlerts = (alerts || []).filter(a => a.status === "open");
  const compromisedEps = (endpoints || []).filter(e => e.status === "compromised");
  const contained = status === "complete";
  const cleanRun = compromisedEps.length === 0 && openAlerts.length === 0;

  const sevColor = (s) => {
    const v = (s || "").toLowerCase();
    if (v === "critical") return "text-red-400 bg-red-500/10 border-red-500/30";
    if (v === "high") return "text-orange-400 bg-orange-500/10 border-orange-500/30";
    if (v === "medium") return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
    return "text-blue-400 bg-blue-500/10 border-blue-500/30";
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/85 backdrop-blur-sm flex items-start sm:items-center justify-center z-50 p-3 sm:p-6 overflow-y-auto"
    >
      <motion.div
        initial={{ scale: 0.96, y: 16 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-card border border-border/50 rounded-2xl w-full max-w-4xl my-2 shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Outcome banner */}
        <div className={`px-5 sm:px-7 py-5 border-b ${contained ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
          <div className="flex items-center gap-4">
            <div className={`h-14 w-14 rounded-full border-2 flex items-center justify-center shrink-0 ${contained ? "bg-green-500/20 border-green-500/40" : "bg-red-500/20 border-red-500/40"}`}>
              {contained ? <CheckCircle className="h-7 w-7 text-green-400" /> : <AlertTriangle className="h-7 w-7 text-red-400" />}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className={`text-xl sm:text-2xl font-bold ${contained ? "text-green-400" : "text-red-400"}`}>
                {contained ? "Incident Contained" : "Attack Succeeded"}
              </h2>
              <p className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-2">
                {contained ? successMessage : failureMessage}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4">
            <div className="bg-secondary/30 rounded-lg p-2.5 text-center">
              <div className="text-xl sm:text-2xl font-bold font-mono text-primary">{score}</div>
              <div className="text-[10px] text-muted-foreground">Score</div>
            </div>
            <div className="bg-secondary/30 rounded-lg p-2.5 text-center">
              <div className="text-xl sm:text-2xl font-bold font-mono text-primary">{elapsedMinutes}m</div>
              <div className="text-[10px] text-muted-foreground">Response Time</div>
            </div>
            <div className="bg-secondary/30 rounded-lg p-2.5 text-center">
              <div className="text-xl sm:text-2xl font-bold font-mono text-primary">{actionsLog.filter(a => !a.isPenalty).length}</div>
              <div className="text-[10px] text-muted-foreground">Actions Taken</div>
            </div>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto">
          {/* Completed + Missed — two columns on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Completed */}
            <div className="bg-green-500/5 border border-green-500/20 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-green-500/20 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-xs font-semibold uppercase text-green-400">What You Completed</span>
                <span className="ml-auto text-xs font-mono text-green-400/70">{completed.length}/{expected.length}</span>
              </div>
              <div className="p-3 space-y-1.5 max-h-56 overflow-y-auto">
                {completed.length === 0 ? (
                  <div className="py-4 text-center text-xs text-muted-foreground">No expected actions were taken</div>
                ) : (
                  completed.map(a => (
                    <div key={a.id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg bg-green-500/5">
                      <span className="text-base leading-none">{a.icon}</span>
                      <span className="text-xs text-foreground/90 flex-1 truncate">{a.label}</span>
                      <CheckCircle className="h-3.5 w-3.5 text-green-500 shrink-0" />
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Missed */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-red-500/20 flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-400" />
                <span className="text-xs font-semibold uppercase text-red-400">What You Failed To Do</span>
                <span className="ml-auto text-xs font-mono text-red-400/70">{missed.length}/{expected.length}</span>
              </div>
              <div className="p-3 space-y-1.5 max-h-56 overflow-y-auto">
                {missed.length === 0 ? (
                  <div className="py-4 text-center text-xs text-green-400/80 flex items-center justify-center gap-1.5">
                    <CheckCircle className="h-3.5 w-3.5" /> All expected actions completed
                  </div>
                ) : (
                  missed.map(a => (
                    <div key={a.id} className="px-2 py-1.5 rounded-lg bg-red-500/5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-base leading-none opacity-50">{a.icon}</span>
                        <span className="text-xs text-foreground/90 flex-1 truncate">{a.label}</span>
                        <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0" />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1 pl-7 leading-snug">{a.description}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Remaining threats */}
          <div className="bg-[#111] border border-border/30 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border/20 flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-yellow-400" />
              <span className="text-xs font-semibold uppercase text-muted-foreground">Remaining Threats</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3">
              {/* Open alerts */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertTriangle className="h-3.5 w-3.5 text-orange-400" />
                  <span className="text-xs font-medium text-muted-foreground">Open Alerts ({openAlerts.length})</span>
                </div>
                {openAlerts.length === 0 ? (
                  <div className="text-xs text-green-400/80 flex items-center gap-1.5 py-1">
                    <CheckCircle className="h-3.5 w-3.5" /> All alerts triaged
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {openAlerts.map(a => (
                      <div key={a.id} className="flex items-center gap-2">
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${sevColor(a.sev || a.severity)}`}>
                          {(a.sev || a.severity || "?").toUpperCase()}
                        </span>
                        <span className="text-xs text-foreground/80 truncate flex-1">{a.title}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Compromised endpoints */}
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  <Cpu className="h-3.5 w-3.5 text-red-400" />
                  <span className="text-xs font-medium text-muted-foreground">Compromised Hosts ({compromisedEps.length})</span>
                </div>
                {compromisedEps.length === 0 ? (
                  <div className="text-xs text-green-400/80 flex items-center gap-1.5 py-1">
                    <CheckCircle className="h-3.5 w-3.5" /> All endpoints secured
                  </div>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {compromisedEps.map(ep => (
                      <div key={ep.id} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
                        <span className="text-xs text-foreground/80 truncate flex-1">{ep.name}</span>
                        <span className="text-[10px] font-mono text-muted-foreground">{ep.ip}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Cost to the company */}
          <div className="bg-red-950/20 border border-red-500/30 rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-red-500/20 flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-red-400" />
              <span className="text-xs font-semibold uppercase text-red-400">Cost to the Company</span>
            </div>
            <div className="p-4">
              {/* Total banner */}
              <div className="flex items-center gap-3 mb-4 bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
                <TrendingDown className="h-7 w-7 text-red-400 shrink-0" />
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-red-400/70">Estimated Business Impact</div>
                  <div className="text-3xl sm:text-4xl font-bold font-mono text-red-400">
                    {cleanRun ? formatCurrency(0) : formatCurrency(cost.total)}
                  </div>
                </div>
                {cleanRun && (
                  <span className="ml-auto text-xs text-green-400 font-medium hidden sm:block">Fully contained</span>
                )}
              </div>
              {/* Breakdown */}
              {cost.breakdown.length > 0 && (
                <div className="space-y-1.5">
                  {cost.breakdown.map((item, i) => (
                    <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-border/10 last:border-0">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className={`font-mono font-semibold ${item.cost === 0 ? "text-green-400" : "text-red-400"}`}>
                        {item.cost === 0 ? "—" : formatCurrency(item.cost)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[10px] text-muted-foreground/70 mt-3 leading-relaxed">
                Estimate based on residual compromised endpoints, open alert severity, and scenario-specific regulatory/recovery costs. For training purposes only.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 sm:px-6 py-4 border-t border-border/30 bg-secondary/20 shrink-0">
          <button
            onClick={onExit}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-all mx-auto"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Scenarios
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}