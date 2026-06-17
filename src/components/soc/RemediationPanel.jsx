import React, { useState } from "react";
import { CheckCircle, AlertTriangle, Clock, Lock } from "lucide-react";
import { REMEDIATION_ACTIONS } from "./socData";
import ActionChallengeModal, { buildChallenge } from "./ActionChallengeModal";

const categoryColors = {
  Containment: "text-red-400 border-red-500/30 hover:bg-red-500/10",
  Response: "text-orange-400 border-orange-500/30 hover:bg-orange-500/10",
  Evidence: "text-purple-400 border-purple-500/30 hover:bg-purple-500/10",
  Remediation: "text-green-400 border-green-500/30 hover:bg-green-500/10",
  Communication: "text-blue-400 border-blue-500/30 hover:bg-blue-500/10",
  Documentation: "text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10",
};

const categoryBg = {
  Containment: "bg-red-500/5",
  Response: "bg-orange-500/5",
  Evidence: "bg-purple-500/5",
  Remediation: "bg-green-500/5",
  Communication: "bg-blue-500/5",
  Documentation: "bg-cyan-500/5",
};

const ACTION_OUTCOMES = {
  isolate_host:       { msg: "Host isolated. No further lateral movement from this endpoint.", impact: +15 },
  block_ip:           { msg: "Attacker IP blocked at firewall. C2 communication severed.", impact: +12 },
  disable_user:       { msg: "Compromised user account disabled. Attacker loses access.", impact: +10 },
  reset_password:     { msg: "Password reset. Credential-based access revoked.", impact: +8 },
  kill_process:       { msg: "Malicious process terminated. Immediate threat neutralized.", impact: +10 },
  quarantine_file:    { msg: "File quarantined. Malware cannot re-execute.", impact: +8 },
  collect_forensics:  { msg: "Forensic package collected. Evidence preserved.", impact: +12 },
  preserve_evidence:  { msg: "Evidence preserved with hash verification.", impact: +10 },
  update_fw_rule:     { msg: "Firewall rule updated. Attack vector blocked.", impact: +8 },
  patch_system:       { msg: "Emergency patch deployed. Vulnerability closed.", impact: +10 },
  restore_backup:     { msg: "System restored from last known good backup.", impact: +15 },
  escalate_ir:        { msg: "IR team engaged. Full investigation underway.", impact: +5 },
  notify_customer:    { msg: "Customer notified per breach notification policy.", impact: +5 },
  open_ticket:        { msg: "Incident ticket created. Tracking ID: INC-20240115-001.", impact: +3 },
  start_coc:          { msg: "Chain of custody log started. Evidence tracked.", impact: +8 },
  remove_persistence: { msg: "Persistence mechanisms removed. Registry and tasks cleaned.", impact: +12 },
};

const PENALTY = -5;
const categories = ["Containment", "Response", "Evidence", "Remediation", "Communication", "Documentation"];

export default function RemediationPanel({ endpoints, alerts, actionsLog, onAction, score, scenario }) {
  const [activeChallenge, setActiveChallenge] = useState(null); // { action, challenge }
  const [noteText, setNoteText] = useState("");
  const [notes, setNotes] = useState([]);
  const [lastOutcome, setLastOutcome] = useState(null);
  const [failedAttempts, setFailedAttempts] = useState({}); // action.id → count
  const [attemptedActions, setAttemptedActions] = useState(new Set()); // permanently disabled after any attempt

  const takenActionIds = new Set(actionsLog.map(a => a.id?.replace("rmm_", "").replace("edr_", "")));

  const openChallenge = (action) => {
    if (takenActionIds.has(action.id)) return;
    const challenge = buildChallenge(action.id, endpoints, alerts, scenario);
    if (!challenge) {
      // No challenge defined — apply directly (fallback)
      applyAction(action, true);
      return;
    }
    setActiveChallenge({ action, challenge });
  };

  const applyAction = (action, correct) => {
    const outcome = ACTION_OUTCOMES[action.id];
    const impact = correct ? outcome?.impact : PENALTY;
    const msg = correct
      ? outcome?.msg
      : `Incorrect response. ${PENALTY} point penalty applied. Review SIEM/EDR evidence before acting.`;

    if (correct) {
      // Successful action — log it with its earned points
      onAction({
        id: action.id,
        label: action.label,
        icon: action.icon,
        target: action.id,
        time: new Date().toLocaleTimeString(),
        scoreOverride: impact,
      });
    } else {
      // Failed attempt — penalty only, not logged as a completed action
      onAction({
        id: `fail_${action.id}_${Date.now()}`,
        label: `❌ Failed: ${action.label}`,
        icon: "❌",
        target: "",
        time: new Date().toLocaleTimeString(),
        isPenalty: true,
        scoreOverride: PENALTY,
      });
    }

    setLastOutcome({ msg, impact, type: correct ? "positive" : "negative", action: action.label });
    setTimeout(() => setLastOutcome(null), 5000);

    if (!correct) {
      setFailedAttempts(prev => ({ ...prev, [action.id]: (prev[action.id] || 0) + 1 }));
    }

    // Permanently lock the action after any attempt (correct or incorrect)
    setAttemptedActions(prev => new Set([...prev, action.id]));
    setActiveChallenge(null);
  };

  const addNote = () => {
    if (!noteText.trim()) return;
    setNotes(prev => [...prev, { text: noteText, time: new Date().toLocaleTimeString() }]);
    setNoteText("");
    onAction({ id: "analyst_note", label: "Analyst Note Added", icon: "📝", time: new Date().toLocaleTimeString() });
  };

  return (
    <div className="p-4 h-full overflow-y-auto space-y-4">
      {/* Score bar */}
      <div className="flex items-center gap-4 bg-[#111] border border-border/30 rounded-xl p-4">
        <div className="flex-1">
          <div className="text-xs font-mono text-muted-foreground uppercase mb-1">Incident Response Score</div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${score >= 80 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
              style={{ width: `${Math.min(Math.max(score, 0), 100)}%` }}
            />
          </div>
        </div>
        <div className="text-3xl font-bold font-mono text-primary">{score}</div>
        <div className="text-xs text-muted-foreground">/100</div>
      </div>

      {/* Outcome toast */}
      {lastOutcome && (
        <div className={`flex items-start gap-3 p-3 rounded-xl border ${
          lastOutcome.type === "positive"
            ? "bg-green-500/10 border-green-500/30 text-green-300"
            : "bg-red-500/10 border-red-500/30 text-red-300"
        }`}>
          {lastOutcome.type === "positive"
            ? <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" />
            : <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
          <div>
            <div className="text-xs font-semibold">
              {lastOutcome.action} — {lastOutcome.impact > 0 ? "+" : ""}{lastOutcome.impact} points
            </div>
            <div className="text-xs opacity-80 mt-0.5">{lastOutcome.msg}</div>
          </div>
        </div>
      )}

      {/* Instructions */}
      <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-2.5 text-xs text-primary/80">
        <span className="font-semibold">Interactive Mode:</span> Each action requires you to provide the correct target, IP, script, or selection. Wrong answers incur a {PENALTY} point penalty.
      </div>

      {/* Action groups */}
      {categories.map(cat => {
        const catActions = REMEDIATION_ACTIONS.filter(a => a.category === cat);
        return (
          <div key={cat} className={`border border-border/30 rounded-xl overflow-hidden ${categoryBg[cat]}`}>
            <div className="px-4 py-2.5 border-b border-border/20">
              <span className={`text-xs font-semibold uppercase ${categoryColors[cat].split(" ")[0]}`}>{cat}</span>
            </div>
            <div className="p-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {catActions.map(action => {
                const taken = takenActionIds.has(action.id);
                const attempted = attemptedActions.has(action.id);
                const disabled = taken || attempted;
                const fails = failedAttempts[action.id] || 0;
                const wasFailed = attempted && !taken;
                return (
                  <button
                    key={action.id}
                    onClick={() => openChallenge(action)}
                    disabled={disabled}
                    title={action.description}
                    className={`relative flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                      disabled
                        ? "opacity-40 cursor-not-allowed border-border/20 text-muted-foreground"
                        : `${categoryColors[cat]} border`
                    }`}
                  >
                    <span className="text-base leading-none">{action.icon}</span>
                    <span className="truncate">{action.label}</span>
                    {taken && <CheckCircle className="h-3 w-3 ml-auto shrink-0 text-green-500" />}
                    {wasFailed && <span className="ml-auto text-[9px] font-bold text-red-400">✗</span>}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Analyst notes */}
      <div className="bg-[#111] border border-border/30 rounded-xl overflow-hidden">
        <div className="px-4 py-2.5 border-b border-border/20 text-xs font-semibold text-muted-foreground uppercase">Analyst Notes</div>
        <div className="p-3 space-y-2">
          <div className="flex gap-2">
            <textarea
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
              placeholder="Add investigation notes, IOCs, observations..."
              className="flex-1 bg-[#0d0d0d] border border-border/40 rounded-lg p-2 text-xs font-mono text-foreground resize-none h-16 outline-none focus:border-primary/40"
            />
            <button
              onClick={addNote}
              className="px-3 py-1 bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-xs hover:bg-cyan-500/30 transition-all"
            >Add</button>
          </div>
          {notes.map((n, i) => (
            <div key={i} className="flex items-start gap-2 text-xs bg-secondary/20 rounded-lg p-2">
              <Clock className="h-3 w-3 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <div className="text-[10px] text-muted-foreground font-mono">{n.time}</div>
                <div className="text-foreground/80">{n.text}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Challenge Modal */}
      {activeChallenge && (
        <ActionChallengeModal
          action={activeChallenge.action}
          challenge={activeChallenge.challenge}
          onConfirm={(correct) => applyAction(activeChallenge.action, correct)}
          onCancel={() => setActiveChallenge(null)}
        />
      )}
    </div>
  );
}