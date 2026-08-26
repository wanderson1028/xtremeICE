// Shared helpers for the post-drill review screen.
// Pure functions — no entity or backend dependency.

import { REMEDIATION_ACTIONS } from "./socData";
import { getRequiredActionIds } from "./scenarioPlaybooks";

// Which attack tactics each remediation action closes.
// Mirrors ACTION_CONSEQUENCES.closeAlertTactics in scenarioProgression.jsx.
const CLOSE_ALERT_TACTICS = {
  isolate_host: ["Lateral Movement", "Impact"],
  block_ip: ["Command and Control"],
  disable_user: ["Initial Access", "Credential Access"],
  reset_password: ["Credential Access"],
  kill_process: ["Execution"],
  quarantine_file: ["Persistence"],
  collect_forensics: [],
  preserve_evidence: [],
  update_fw_rule: ["Command and Control", "Initial Access"],
  patch_system: ["Initial Access"],
  restore_backup: [],
  remove_persistence: ["Persistence"],
  escalate_ir: [],
  notify_customer: [],
  open_ticket: [],
  start_coc: [],
};

// Standard IR actions expected on every incident regardless of tactic mapping.
const STANDARD_IR_ACTIONS = ["collect_forensics", "open_ticket", "start_coc"];

const DIFFICULTY_MULTIPLIER = {
  Beginner: 1,
  Intermediate: 1.5,
  Advanced: 2,
  Expert: 3,
};

// MITRE technique IDs that indicate a data-exfiltration scenario.
const EXFIL_TECHNIQUES = ["t1041", "t1567", "t1048", "t1568"];

// Derive the per-scenario expected-actions checklist from the alert tactics.
export function getExpectedActions(scenario, alerts) {
  if (!scenario) return [];
  const scenarioRequirements = getRequiredActionIds(scenario.id);
  const expectedIds = scenarioRequirements.length > 0
    ? new Set(scenarioRequirements)
    : new Set(STANDARD_IR_ACTIONS);

  // Non-configured scenarios retain tactic-derived expectations.
  if (scenarioRequirements.length === 0) {
    const alertTactics = new Set((alerts || []).map(a => a.tactic).filter(Boolean));
    for (const [actionId, tactics] of Object.entries(CLOSE_ALERT_TACTICS)) {
      if (tactics.some(t => alertTactics.has(t))) expectedIds.add(actionId);
    }
  }

  return REMEDIATION_ACTIONS
    .filter(a => expectedIds.has(a.id))
    .map(a => ({
      id: a.id,
      label: a.label,
      icon: a.icon,
      description: a.description,
      closesTactics: CLOSE_ALERT_TACTICS[a.id] || [],
    }));
}

// Normalize the actions log into a set of taken action ids.
// Strips rmm_/edr_ prefixes and ignores penalty (failed attempt) entries.
export function getTakenActionIds(actionsLog) {
  const ids = new Set();
  for (const a of actionsLog || []) {
    if (a.isPenalty) continue;
    const raw = a.id || "";
    const clean = raw.replace("rmm_", "").replace("edr_", "");
    ids.add(clean);
  }
  return ids;
}

// Outcome-only cost model — based purely on the drill's end state.
export function calculateDrillCost(scenario, endpoints, alerts) {
  const breakdown = [];
  let total = 0;

  const difficulty = scenario?.difficulty || "Beginner";
  const multiplier = DIFFICULTY_MULTIPLIER[difficulty] ?? 1;

  // Compromised endpoints
  const compromised = (endpoints || []).filter(e => e.status === "compromised");
  if (compromised.length > 0) {
    const cost = Math.round(compromised.length * 25000 * multiplier);
    total += cost;
    breakdown.push({
      label: `${compromised.length} compromised endpoint${compromised.length > 1 ? "s" : ""} uncontained`,
      cost,
    });
  }

  // Open alerts by severity
  const openAlerts = (alerts || []).filter(a => a.status === "open");
  const sev = a => a.sev || a.severity || "";
  const criticalOpen = openAlerts.filter(a => sev(a) === "critical");
  const highOpen = openAlerts.filter(a => sev(a) === "high");

  if (criticalOpen.length > 0) {
    const cost = criticalOpen.length * 10000;
    total += cost;
    breakdown.push({
      label: `${criticalOpen.length} open critical alert${criticalOpen.length > 1 ? "s" : ""}`,
      cost,
    });
  }
  if (highOpen.length > 0) {
    const cost = highOpen.length * 3000;
    total += cost;
    breakdown.push({
      label: `${highOpen.length} open high alert${highOpen.length > 1 ? "s" : ""}`,
      cost,
    });
  }

  // Data exfiltration regulatory fine
  const mitreStr = (scenario?.mitre || []).join(" ").toLowerCase();
  const isExfilScenario = EXFIL_TECHNIQUES.some(t => mitreStr.includes(t));
  const hasOpenExfilAlert = openAlerts.some(a => a.tactic === "Exfiltration");
  if (isExfilScenario && hasOpenExfilAlert) {
    total += 500000;
    breakdown.push({ label: "Regulatory fine — data exfiltration uncontained", cost: 500000 });
  }

  // Ransomware recovery cost
  if ((scenario?.id || "").includes("ransomware")) {
    const hasOpenImpact = openAlerts.some(a => a.tactic === "Impact");
    if (hasOpenImpact) {
      total += 150000;
      breakdown.push({ label: "Ransomware recovery — encryption uncontained", cost: 150000 });
    }
  }

  // Containment bonus: if the incident was contained, reduce cost by 40%
  // (reflects reduced business impact when the threat is neutralized)
  if (compromised.length === 0 && openAlerts.length === 0) {
    breakdown.push({ label: "Full containment — no residual impact", cost: 0 });
  }

  return { total, breakdown };
}

// Partial-performance score used when an analyst ends a scenario early.
// Required response actions carry 60%, alert resolution 25%, and host containment 15%.
export function calculateSurrenderScore(scenario, actionsLog, alerts, endpoints) {
  const expected = getExpectedActions(scenario, alerts);
  const taken = getTakenActionIds(actionsLog);
  const requiredRatio = expected.length ? expected.filter(a => taken.has(a.id)).length / expected.length : 0;

  const allAlerts = alerts || [];
  const resolvedRatio = allAlerts.length ? allAlerts.filter(a => a.status !== "open").length / allAlerts.length : 0;

  const affected = (endpoints || []).filter(e => ["compromised", "isolated"].includes(e.status));
  const containedRatio = affected.length ? affected.filter(e => e.status === "isolated").length / affected.length : 1;

  const raw = Math.round((requiredRatio * 60) + (resolvedRatio * 25) + (containedRatio * 15));
  return Math.min(raw, 85); // A surrendered attempt cannot receive a passing-perfect score.
}

export const formatCurrency = (n) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);