import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, BookOpen, AlertTriangle, Shield, CheckCircle, FileText, Radio } from "lucide-react";

// Per-scenario detect guidance: what to look for on each tab
const DETECT_GUIDANCE = {
  ransomware_outbreak: {
    dashboard: "Look for **CRITICAL alerts** from DESKTOP-WIN01 and SERVER-WIN01. You should see a 'Ransomware Activity Detected' alert and a 'Volume Shadow Copy Deletion' alert — these are your primary indicators. Note the source IPs (10.0.1.10, 10.0.2.10) and the 'C2 Beacon Outbound' alert flagging a known TOR exit node.",
    siem: "Filter by **Critical/High** severity. Spot the mass file rename event (847 .LOCKED files on 10.0.1.10), then find the encoded PowerShell command from jsmith. Look for the vssadmin delete shadows entry and the outbound connection to 185.220.101.47 — a known ransomware C2 IP.",
  },
  phishing_compromise: {
    dashboard: "Check for a **'Suspicious OAuth Grant'** and **'Impossible Travel'** alert for jsmith@company.com — these are the key signals. Also note the 'Email Forwarding Rule Created' alert from the mail gateway. The source account (jsmith) is your initial pivot point.",
    siem: "Search for **jsmith** in the log stream. You'll see a phishing URL visit, an OAuth consent to 'DocuSignHelper', and an email forwarding rule set to an external Gmail address. Then spot the successful login from IP 91.108.4.22 (Russia) — this confirms account compromise.",
  },
  brute_force_vpn: {
    dashboard: "Find the **'VPN Brute Force Attack'** alert from 45.95.147.23 — over 800 failed attempts. Then look for **'Successful Auth After Lockout'** for mjohnson — this is the critical alert showing the attacker broke through. Note the source IP is flagged as Ukraine.",
    siem: "Filter by **Auth** event type. You'll see hundreds of failed VPN auth attempts from 45.95.147.23, followed by an account lockout for mjohnson, and then a successful login from the same IP. After that, spot the internal network scan from VPN IP 10.10.0.55.",
  },
  lateral_movement: {
    dashboard: "Look for multiple **CRITICAL** alerts: 'Pass-the-Hash Attack', 'Credential Dumping (Mimikatz)', and 'DCSync Attack' — all sourced from DESKTOP-WIN01. These indicate an attacker has stolen credentials and is impersonating a domain admin to reach DC-PRIMARY.",
    siem: "Filter by **Critical** severity. Find the Mimikatz lsass memory read, then the domain admin authentication from workstation 10.0.1.10 (anomalous — admins don't log in from workstations). Then spot the DC replication request from a non-DC host — this is a DCSync attack.",
  },
  data_exfiltration: {
    dashboard: "The key alert is **'Large Outbound Data Transfer'** (CRITICAL) from LINUX-APP01 — 4.2GB uploaded to mega.nz. Also note 'DNS Tunneling Detected' and 'Log File Tampered', which show the attacker is covering their tracks after stealing data.",
    siem: "Filter by **LINUX-APP01** as source. You'll see bulk DB access (2,847 records), then archive creation with 7z, then DNS resolution for upload.mega.nz, followed by a 4.2GB HTTPS upload. Finally, spot the shred and auth.log truncation — evidence destruction.",
  },
  insider_threat: {
    dashboard: "Look for **'After-Hours Data Access'** from DESKTOP-WIN02 (mjohnson) and the **'Audit Log Cleared'** alert — clearing audit logs is a major red flag. The 'USB Data Transfer' alert shows 1.8GB copied to removable media. All activity traces back to user mjohnson.",
    siem: "Filter by **DESKTOP-WIN02** or **mjohnson**. You'll see bulk HR file access outside business hours, auditpol.exe clearing audit logs, a USB device connect event with 1.8GB copied, then Dropbox uploading 847 files, and finally a large email attachment sent to a personal Gmail.",
  },
  web_compromise: {
    dashboard: "Start with the **'Web Shell Uploaded'** and **'Reverse Shell Established'** alerts — both CRITICAL, both from LINUX-WEB01. Also check 'SQL Injection Detected' (the initial entry point) and 'Internal Network Scan from DMZ' showing the attacker pivoting inward.",
    siem: "Filter by **LINUX-WEB01** as source. Trace the attack chain: SQL injection GET request from 91.92.247.18, then a web shell POST that returned 200 OK, then RCE commands (id, uname, cat /etc/passwd), then a reverse shell bash command, and finally an internal nmap scan.",
  },
  cloud_compromise: {
    dashboard: "All top alerts are **CRITICAL**: 'AWS Credentials Exposed on GitHub', 'API Access from Unknown IP' (185.176.27.101, Russia), 'Privileged IAM User Created', and 'S3 Bucket Made Public'. These form a clear attack chain from credential theft to full cloud account takeover.",
    siem: "Filter by **cloud** event type. Trace: credential exposure on github.com, then DescribeInstances API calls from 185.176.27.101, then a backdoor_admin IAM user created with AdministratorAccess, then 12 EC2 instances launched (cryptomining), then the S3 bucket ACL set to public with 47,832 objects exfiltrated.",
  },
};

const getDetectSteps = (scenarioId) => {
  const guidance = DETECT_GUIDANCE[scenarioId] || {
    dashboard: "Check the open alert count, severity levels, and source IPs in the Active Alerts panel. Note any CRITICAL or HIGH severity alerts and identify the affected hosts.",
    siem: "Scan the log stream for suspicious patterns — failed logins, unusual processes, or unexpected outbound connections. Filter by High/Critical severity to focus on the most important events.",
  };
  return [
    { tab: "dashboard", label: "View Dashboard", instruction: guidance.dashboard },
    { tab: "siem", label: "View SIEM Logs", instruction: guidance.siem },
  ];
};

const PHASES = [
  {
    id: "detect",
    icon: Radio,
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/30",
    label: "Phase 1 — Detect",
    goal: "Review incoming alerts and identify the threat",
    requirement: "Visit both the Dashboard and SIEM tabs to detect the incident",
    check: ({ tabsVisited }) => tabsVisited && tabsVisited.has("dashboard") && tabsVisited.has("siem"),
  },
  {
    id: "triage",
    icon: AlertTriangle,
    color: "text-orange-400",
    bg: "bg-orange-500/10 border-orange-500/30",
    label: "Phase 2 — Triage",
    goal: "Confirm scope and identify affected assets",
    hint: "Use the **EDR** tab to see compromised endpoints and process trees. Which hosts are affected? Note any suspicious processes or parent-child chains.",
    tab: "edr",
    tabLabel: "Open EDR",
    requirement: "Run an EDR action on a compromised endpoint",
    check: ({ actionIds }) => ["kill_process", "quarantine_file", "collect_forensics", "edr_isolate_host"].some(id => actionIds.has(id)),
  },
  {
    id: "contain",
    icon: Shield,
    color: "text-yellow-400",
    bg: "bg-yellow-500/10 border-yellow-500/30",
    label: "Phase 3 — Contain",
    goal: "Isolate threats and block attacker access",
    hint: "Go to **Remediation** and execute containment actions. Isolate compromised hosts, block malicious IPs, and disable compromised accounts.",
    tab: "remediation",
    tabLabel: "Open Remediation",
    requirement: "Execute a containment action (isolate host, block IP, or disable user)",
    check: ({ actionIds }) => ["isolate_host", "block_ip", "disable_user"].some(id => actionIds.has(id)),
  },
  {
    id: "recover",
    icon: CheckCircle,
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/30",
    label: "Phase 4 — Eradicate & Recover",
    goal: "Remove persistence and restore systems",
    hint: "Use **RMM** to patch systems and restore from backup. In Remediation, run Response and Remediation actions to clean up malware and restore services.",
    tab: "rmm",
    tabLabel: "Open RMM",
    requirement: "Patch, restore backup, or remove persistence",
    check: ({ actionIds }) => ["restore_backup", "patch_system", "remove_persistence"].some(id => actionIds.has(id)),
  },
  {
    id: "report",
    icon: FileText,
    color: "text-primary",
    bg: "bg-primary/10 border-primary/30",
    label: "Phase 5 — Document",
    goal: "Generate the final incident report",
    hint: "Open the **Report** tab to create a comprehensive incident report. Document IOCs, timeline, affected assets, and lessons learned.",
    tab: "report",
    tabLabel: "Open Report",
    requirement: "Generate the AI incident report",
    check: ({ reportGenerated }) => reportGenerated,
  },
];

export default function TrainingNarrative({ scenario, actionsLog, alerts, reportGenerated, activeTab, onNavigate, onPhaseChange, tabsVisited }) {
  const [currentPhase, setCurrentPhase] = useState(0);
  const [expandedPhase, setExpandedPhase] = useState(0);

  // Build scenario-specific detect steps once
  const detectSteps = getDetectSteps(scenario?.id);

  useEffect(() => {
    const actionIds = new Set(actionsLog.map(a => a.id));
    const ctx = { actionIds, alerts, actionsLog, reportGenerated, tabsVisited };

    // Each phase gates the next — advance only through consecutively completed phases
    let newPhase = 0;
    for (let i = 0; i < PHASES.length - 1; i++) {
      if (PHASES[i].check(ctx)) {
        newPhase = i + 1;
      } else {
        break; // stop at first incomplete phase
      }
    }

    if (newPhase !== currentPhase) {
      setCurrentPhase(newPhase);
      setExpandedPhase(newPhase);
      onPhaseChange?.(PHASES[newPhase]?.id);
    }
  }, [actionsLog, alerts, reportGenerated, tabsVisited]);

  const phase = PHASES[expandedPhase];

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/20 bg-primary/5 flex items-center gap-2">
        <BookOpen className="h-4 w-4 text-primary" />
        <span className="text-xs font-semibold">Story Guide</span>
        <span className="ml-auto text-[10px] text-muted-foreground font-mono">Phase {Math.min(currentPhase + 1, 5)}/5</span>
      </div>

      {/* Phase list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {PHASES.map((p, idx) => {
          const Icon = p.icon;
          const done = idx < currentPhase;
          const active = idx === currentPhase;
          const locked = idx > currentPhase;
          const open = idx === expandedPhase;

          return (
            <div
              key={p.id}
              className={`rounded-xl border transition-all overflow-hidden ${
                done ? "border-green-500/20 bg-green-500/5" :
                active ? p.bg :
                "border-border/20 bg-secondary/20 opacity-50"
              }`}
            >
              <button
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left"
                onClick={() => !locked && setExpandedPhase(open ? -1 : idx)}
                disabled={locked}
              >
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${done ? "bg-green-500/20" : active ? p.bg.split(" ")[0] : "bg-secondary"}`}>
                  {done ? <CheckCircle className="h-3.5 w-3.5 text-green-400" /> : <Icon className={`h-3.5 w-3.5 ${p.color}`} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-semibold ${done ? "text-green-400" : active ? p.color : "text-muted-foreground"}`}>{p.label}</div>
                  <div className="text-[10px] text-muted-foreground truncate">{p.goal}</div>
                </div>
                {!locked && (
                  <ChevronRight className={`h-3 w-3 text-muted-foreground transition-transform ${open ? "rotate-90" : ""}`} />
                )}
              </button>

              <AnimatePresence>
                {open && !locked && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-3 pb-3 space-y-2.5">
                      {/* Multi-step instructions */}
                      {p.id === "detect" ? (
                        <div className="space-y-2">
                          {detectSteps.map((step, si) => {
                            const visited = tabsVisited && tabsVisited.has(step.tab);
                            return (
                              <div key={si} className={`rounded-lg border p-2.5 transition-all ${visited ? "border-green-500/30 bg-green-500/5" : "border-border/30 bg-secondary/20"}`}>
                                <div className="flex items-center gap-2 mb-1">
                                  {visited
                                    ? <CheckCircle className="h-3 w-3 text-green-400 shrink-0" />
                                    : <div className="h-3 w-3 rounded-full border border-muted-foreground/40 shrink-0" />
                                  }
                                  <span className={`text-[10px] font-semibold ${visited ? "text-green-400" : "text-foreground"}`}>Step {si + 1} — {step.label}</span>
                                </div>
                                <p className="text-[10px] text-muted-foreground leading-relaxed ml-5">
                                  {step.instruction.split("**").map((part, i) =>
                                    i % 2 === 1 ? <strong key={i} className="text-foreground font-medium">{part}</strong> : part
                                  )}
                                </p>
                                {!visited && !done && (
                                  <button
                                    onClick={() => onNavigate(step.tab)}
                                    className={`mt-2 ml-5 flex items-center gap-1 text-[10px] font-medium ${p.color} hover:opacity-80 transition-opacity`}
                                  >
                                    Go to {step.label} <ChevronRight className="h-2.5 w-2.5" />
                                  </button>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="text-[11px] text-foreground/70 leading-relaxed bg-secondary/30 rounded-lg p-2.5">
                          💡 {p.hint.split("**").map((part, i) =>
                            i % 2 === 1 ? <strong key={i} className="text-foreground font-semibold">{part}</strong> : part
                          )}
                        </div>
                      )}
                      {/* Completion requirement indicator */}
                      <div className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 text-[10px] ${done ? "border-green-500/30 bg-green-500/5" : "border-border/30 bg-secondary/20"}`}>
                        {done
                          ? <CheckCircle className="h-3 w-3 text-green-400 shrink-0 mt-0.5" />
                          : <div className="h-3 w-3 rounded-full border border-muted-foreground/40 shrink-0 mt-0.5" />
                        }
                        <span className={done ? "text-green-400 font-medium" : "text-muted-foreground"}>
                          {done ? "Complete — " : "Required: "}{p.requirement}
                        </span>
                      </div>
                      {p.id !== "detect" && p.tab && !done && (
                        <button
                          onClick={() => onNavigate(p.tab)}
                          className={`w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${p.bg} ${p.color}`}
                        >
                          {p.tabLabel} <ChevronRight className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="px-4 py-3 border-t border-border/20">
        <div className="flex items-center justify-between text-[10px] text-muted-foreground mb-1.5">
          <span>Scenario Progress</span>
          <span>{Math.round((currentPhase / (PHASES.length - 1)) * 100)}%</span>
        </div>
        <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full bg-primary rounded-full transition-all duration-700"
            style={{ width: `${(currentPhase / (PHASES.length - 1)) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}