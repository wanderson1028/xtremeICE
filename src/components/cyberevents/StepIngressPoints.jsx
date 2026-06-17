import React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

const TEAM_CONFIG = {
  red: { label: "Red Team", icon: "🔴", color: "border-red-500/40 bg-red-500/5", badgeColor: "bg-red-500/20 text-red-400 border-red-500/30" },
  blue: { label: "Blue Team", icon: "🔵", color: "border-blue-500/40 bg-blue-500/5", badgeColor: "bg-blue-500/20 text-blue-400 border-blue-500/30" },
  white: { label: "White Team", icon: "⚪", color: "border-gray-500/40 bg-gray-500/5", badgeColor: "bg-gray-500/20 text-gray-400 border-gray-500/30" },
};

// MITRE ATT&CK work roles for Red Team
const RED_ROLES = [
  "Initial Access Operator",
  "Execution Specialist",
  "Persistence Operator",
  "Privilege Escalation Specialist",
  "Defense Evasion Operator",
  "Credential Access Specialist",
  "Discovery Analyst",
  "Lateral Movement Operator",
  "Collection Specialist",
  "Command & Control Operator",
  "Exfiltration Specialist",
  "Impact Operator",
  "Phishing / Social Engineer",
  "Exploit Developer",
  "Recon / OSINT Analyst",
];

// NICE Framework Cyber Work Roles for Blue Team
const BLUE_ROLES = [
  "Cyber Defense Analyst (PR-CDA-001)",
  "Cyber Defense Infrastructure Support (PR-INF-001)",
  "Incident Responder (PR-IR-001)",
  "Vulnerability Assessment Analyst (PR-VA-001)",
  "Threat / Warning Analyst (AN-TWA-001)",
  "All-Source Analyst (AN-ASA-001)",
  "Exploitation Analyst (AN-EXP-001)",
  "Digital Forensics Analyst (IN-FOR-001)",
  "Cyber Intelligence Planner (SP-TRD-001)",
  "Systems Security Analyst (PR-SSA-001)",
  "Security Architect (SP-ARC-001)",
  "SOC Analyst (Tier 1)",
  "SOC Analyst (Tier 2)",
  "Threat Hunter",
  "SIEM / Log Analyst",
];

const WHITE_ROLES = [
  "Event Controller",
  "Scorekeeper",
  "Observer / Evaluator",
  "Referee / Adjudicator",
  "Technical Support",
];

const TEAM_ROLES = { red: RED_ROLES, blue: BLUE_ROLES, white: WHITE_ROLES };

const DEFAULTS = {
  red: { system: "Kali Linux Attacker VM", ip: "10.0.1.100", credentials: "redteam/R3dP@ss!" },
  blue: { system: "SOC Analyst Workstation", ip: "10.0.2.50", credentials: "blueteam/B1ueP@ss!" },
  white: { system: "Event Controller Console", ip: "10.0.3.10", credentials: "whiteteam/Wh1teP@ss!" },
};

export default function StepIngressPoints({ data, onChange }) {
  const ingress = data.ingress_points || [];

  const addIngress = (team) => {
    onChange({ ingress_points: [...ingress, {
      team,
      role: TEAM_ROLES[team][0],
      system: DEFAULTS[team].system,
      ip: DEFAULTS[team].ip,
      credentials: DEFAULTS[team].credentials,
      description: "",
    }]});
  };

  const updateIngress = (idx, field, value) => {
    onChange({ ingress_points: ingress.map((p, i) => i === idx ? { ...p, [field]: value } : p) });
  };

  const removeIngress = (idx) => {
    onChange({ ingress_points: ingress.filter((_, i) => i !== idx) });
  };

  const byTeam = (team) => ingress.map((p, i) => ({ ...p, _idx: i })).filter(p => p.team === team);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">Ingress Points & Roles</h2>
        <p className="text-sm text-muted-foreground">
          Define each participant's login system, IP, and role.
          Red Team roles follow <span className="text-red-400 font-medium">MITRE ATT&CK</span> tactics.
          Blue Team roles follow the <span className="text-blue-400 font-medium">NICE Cybersecurity Workforce Framework</span>.
        </p>
      </div>

      {["red","blue","white"].map(team => {
        const cfg = TEAM_CONFIG[team];
        const members = byTeam(team);
        return (
          <div key={team} className={`border rounded-xl p-5 space-y-4 ${cfg.color}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground flex items-center gap-2">
                <span>{cfg.icon}</span> {cfg.label}
                <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${cfg.badgeColor}`}>
                  {members.length} member{members.length !== 1 ? "s" : ""}
                </span>
                {team === "red" && <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400">MITRE ATT&CK</span>}
                {team === "blue" && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400">NICE Framework</span>}
              </h3>
              <Button size="sm" variant="outline" onClick={() => addIngress(team)} className="gap-1.5 text-xs h-7">
                <Plus className="h-3 w-3" /> Add Member
              </Button>
            </div>

            {members.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No members added yet. Click "Add Member" to define ingress points.</p>
            )}

            {members.map((p) => (
              <div key={p._idx} className="bg-card border border-border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Member #{p._idx + 1}</span>
                  <button onClick={() => removeIngress(p._idx)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Role</label>
                    <select
                      value={p.role}
                      onChange={e => updateIngress(p._idx, "role", e.target.value)}
                      className="w-full bg-secondary border border-border rounded-md px-2 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      {TEAM_ROLES[team].map(r => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">System / VM Name</label>
                    <input
                      value={p.system}
                      onChange={e => updateIngress(p._idx, "system", e.target.value)}
                      placeholder="e.g. Kali Linux Attacker VM"
                      className="w-full bg-secondary border border-border rounded-md px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">IP Address</label>
                    <input
                      value={p.ip}
                      onChange={e => updateIngress(p._idx, "ip", e.target.value)}
                      placeholder="e.g. 10.0.1.100"
                      className="w-full bg-secondary border border-border rounded-md px-2 py-1.5 text-xs text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Credentials</label>
                    <input
                      value={p.credentials}
                      onChange={e => updateIngress(p._idx, "credentials", e.target.value)}
                      placeholder="e.g. user/password"
                      className="w-full bg-secondary border border-border rounded-md px-2 py-1.5 text-xs text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-wider">Access Description</label>
                  <input
                    value={p.description}
                    onChange={e => updateIngress(p._idx, "description", e.target.value)}
                    placeholder="e.g. External attacker — internet-facing access only"
                    className="w-full bg-secondary border border-border rounded-md px-2 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}