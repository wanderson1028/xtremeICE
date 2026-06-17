import React, { useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Clock, Shield, Zap, ChevronRight, Play, BookOpen, ClipboardList } from "lucide-react";

const difficultyColor = {
  Beginner: "text-green-400 bg-green-500/10 border-green-500/30",
  Intermediate: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  Advanced: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  Expert: "text-red-400 bg-red-500/10 border-red-500/30",
};

// Story intro texts per scenario
const BRIEFINGS = {
  phishing_compromise: {
    time: "Monday, 08:47 AM",
    caller: "Help Desk Supervisor",
    intro: "An urgent ticket just came in. Multiple employees are reporting that their systems are behaving strangely after opening what appeared to be a legitimate HR email about benefits enrollment. One user says their browser keeps redirecting to unknown sites. Another reports files disappearing.",
    hook: "Your SIEM is lighting up. The clock is ticking — every minute the attacker has a foothold, the blast radius grows.",
    urgency: "critical",
  },
  ransomware_outbreak: {
    time: "Thursday, 02:13 AM",
    caller: "On-Call Engineer",
    intro: "You're jolted awake by a pager alert. Three servers in the data center have gone dark. A night shift operator reports seeing a ransom note on their screen: 'Your files have been encrypted. Pay 5 BTC within 48 hours.' The file share is inaccessible.",
    hook: "This is a live ransomware outbreak. Contain it now or risk the entire network going down before morning.",
    urgency: "critical",
  },
  brute_force_vpn: {
    time: "Wednesday, 11:22 PM",
    caller: "Network Operations Center",
    intro: "NOC alerts you: the VPN gateway is registering thousands of authentication failures from a rotating pool of IPs. A few attempts succeeded. Someone is inside the network perimeter. You don't yet know who or what they've accessed.",
    hook: "A credential-based intrusion is underway. Find the breach point and cut off their access before they move deeper.",
    urgency: "high",
  },
  lateral_movement: {
    time: "Tuesday, 03:45 PM",
    caller: "EDR Alert System",
    intro: "Your EDR console fires an alert: a workstation is making unusual SMB connections to internal servers, including the domain controller. It's mimicking admin credentials. The EDR signature matches known lateral movement tooling used by advanced threat actors.",
    hook: "The attacker is already inside and moving toward your crown jewels. Every second they're in the AD environment is catastrophic.",
    urgency: "critical",
  },
  data_exfiltration: {
    time: "Friday, 04:59 PM",
    caller: "DLP System Alert",
    intro: "As the office empties out for the weekend, your DLP system raises a flag: 47GB of data transferred to an external cloud storage endpoint in the last 2 hours. The source? A Linux server hosting your customer database.",
    hook: "A data breach may already be in progress. You need to determine what was taken and stop the bleeding — before Monday morning becomes a PR nightmare.",
    urgency: "high",
  },
  insider_threat: {
    time: "Monday, 05:30 PM",
    caller: "HR & Legal",
    intro: "HR has flagged an employee who gave two weeks notice last Tuesday. Audit logs show their account accessed sensitive payroll and product roadmap files outside of normal working hours. Data was copied to a USB device.",
    hook: "An insider may be exfiltrating intellectual property. You need to act carefully — this involves legal and HR, not just technical controls.",
    urgency: "medium",
  },
  web_compromise: {
    time: "Sunday, 09:15 AM",
    caller: "Cloud Monitoring",
    intro: "Your web application firewall is logging a flood of unusual POST requests to your public-facing Linux web server. Shortly after, a customer reports seeing a defacement page instead of your homepage. Internal tools suggest a web shell may have been uploaded.",
    hook: "Your public website is compromised. Contain the web shell, assess what data was accessed, and get the site back online.",
    urgency: "high",
  },
  cloud_compromise: {
    time: "Tuesday, 01:30 PM",
    caller: "Cloud SIEM",
    intro: "GuardDuty alerts indicate an IAM role has been used from an unusual geographic location — a region you've never operated in. Shortly after, new EC2 instances are spun up and outbound data transfers spike on your S3 buckets.",
    hook: "Your cloud environment is being actively abused. Act fast before costs skyrocket and sensitive data walks out the door.",
    urgency: "high",
  },
};

const urgencyStyles = {
  critical: { label: "CRITICAL INCIDENT", color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", pulse: true },
  high: { label: "HIGH SEVERITY", color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30", pulse: false },
  medium: { label: "MEDIUM SEVERITY", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", pulse: false },
};

export default function ScenarioBriefing({ scenario, mode, onConfirm, onBack }) {
  const [accepted, setAccepted] = useState(false);
  const briefing = BRIEFINGS[scenario?.id] || {
    time: "Now",
    caller: "Alert System",
    intro: scenario?.description || "A security incident has been detected. Investigate and respond.",
    hook: "Your skills are needed. Proceed with the investigation.",
    urgency: "high",
  };
  const urg = urgencyStyles[briefing.urgency] || urgencyStyles.high;

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-2xl w-full space-y-5"
      >
        {/* Alert header */}
        <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl border ${urg.bg}`}>
          {urg.pulse && (
            <span className="relative flex h-3 w-3 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          )}
          <AlertTriangle className={`h-4 w-4 ${urg.color} shrink-0`} />
          <span className={`text-sm font-bold tracking-wide ${urg.color}`}>{urg.label}</span>
          <span className="ml-auto text-xs text-muted-foreground font-mono">{briefing.time}</span>
        </div>

        {/* Main card */}
        <div className="bg-card border border-border/50 rounded-2xl overflow-hidden">
          {/* Scenario header */}
          <div className="px-6 py-4 border-b border-border/30 flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-bold">{scenario?.name}</div>
              <div className="text-sm text-muted-foreground mt-0.5 flex items-center gap-2">
                <span className="font-mono text-xs">{briefing.caller}</span>
                <span>·</span>
                <Clock className="h-3 w-3" />
                <span>~{scenario?.duration_min} min</span>
              </div>
            </div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded border shrink-0 ${difficultyColor[scenario?.difficulty]}`}>
              {scenario?.difficulty}
            </span>
          </div>

          {/* Story text */}
          <div className="px-6 py-5 space-y-4">
            <div className="text-sm text-foreground/85 leading-relaxed border-l-2 border-primary/40 pl-4 italic">
              "{briefing.intro}"
            </div>

            <div className={`text-sm font-semibold ${urg.color} flex items-start gap-2`}>
              <Zap className="h-4 w-4 shrink-0 mt-0.5" />
              {briefing.hook}
            </div>

            {/* MITRE & meta */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="bg-secondary/30 rounded-xl p-3">
                <div className="text-[10px] text-muted-foreground uppercase mb-1.5 font-mono">MITRE ATT&CK Tactics</div>
                <div className="flex flex-wrap gap-1">
                  {(scenario?.mitre || []).map(m => (
                    <span key={m} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary border border-primary/20 font-mono">{m}</span>
                  ))}
                </div>
              </div>
              <div className="bg-secondary/30 rounded-xl p-3">
                <div className="text-[10px] text-muted-foreground uppercase mb-1.5 font-mono">Your Objectives</div>
                <ul className="space-y-1">
                  {["Detect & triage the incident", "Contain the threat", "Collect evidence", "Eradicate & recover", "Document findings"].map(obj => (
                    <li key={obj} className="text-[10px] text-foreground/70 flex items-center gap-1.5">
                      <ChevronRight className="h-2.5 w-2.5 text-primary shrink-0" /> {obj}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Mode reminder */}
          <div className={`mx-6 mb-4 p-3 rounded-xl border flex items-start gap-3 ${
            mode === "assessment"
              ? "bg-orange-500/10 border-orange-500/30"
              : "bg-primary/10 border-primary/30"
          }`}>
            {mode === "assessment"
              ? <ClipboardList className="h-4 w-4 text-orange-400 shrink-0 mt-0.5" />
              : <BookOpen className="h-4 w-4 text-primary shrink-0 mt-0.5" />}
            <div>
              <div className={`text-xs font-semibold ${mode === "assessment" ? "text-orange-400" : "text-primary"}`}>
                {mode === "assessment" ? "Assessment Mode" : "Training Mode"}
              </div>
              <div className="text-[11px] text-muted-foreground mt-0.5">
                {mode === "assessment"
                  ? "You'll be given a task checklist. Work independently — the AI provides minimal guidance. You'll be scored on your actions and decisions."
                  : "A Story Guide will walk you through each phase. The AI Analyst is ready to help with hints, MITRE mapping, and step-by-step guidance."
                }
              </div>
            </div>
          </div>

          {/* CTA */}
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={onBack}
              className="px-4 py-2.5 rounded-xl border border-border/40 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                mode === "assessment"
                  ? "bg-orange-500 hover:bg-orange-400 text-white"
                  : "bg-primary hover:bg-primary/90 text-primary-foreground"
              }`}
            >
              <Play className="h-4 w-4" />
              {mode === "assessment" ? "Begin Assessment" : "Start Training"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}