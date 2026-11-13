// Point-and-click targets for guided SOC lessons.
// Every target is derived from the run's own seeded evidence, so the row the
// learner is asked to click is one that actually exists in the evidence shown.

const SEVERITY_RANK = { critical: 4, high: 3, medium: 2, low: 1 };

const shortProcess = (name) => (name || "").split(" ")[0];

const bySeverity = (a, b) => (SEVERITY_RANK[b?.severity] || 0) - (SEVERITY_RANK[a?.severity] || 0);

export function getGuidedClickSteps({ seed, alerts = [], logs = [] } = {}) {
  const candidates = [
    seed?.attackerIP,
    ...(seed?.maliciousProcesses || []).map((p) => shortProcess(p.name)),
    seed?.maliciousFile,
    seed?.compromisedUser?.sam,
  ].filter(Boolean);

  const matchIoc = (text) => {
    const haystack = (text || "").toLowerCase();
    return candidates.find((c) => haystack.includes(String(c).toLowerCase()));
  };

  const steps = [];

  // ── Step 1 — Dashboard: pick the alert that carries the indicator ──────────
  const alertMatch = alerts.find((a) => matchIoc(`${a.title} ${a.src} ${a.tactic}`));
  const alertTarget = alertMatch || [...alerts].sort(bySeverity)[0];
  if (alertTarget) {
    const ioc = alertMatch ? matchIoc(`${alertTarget.title} ${alertTarget.src}`) : null;
    steps.push({
      id: "click-dashboard-alert",
      tab: "dashboard",
      tabLabel: "Dashboard",
      title: "Spot the incident alert",
      instruction: ioc
        ? `Click the alert in the Alert Queue that names ${ioc}.`
        : "Click the most severe alert in the Alert Queue.",
      targetId: `alert-${alertTarget.id}`,
      selector: `[data-soc-click="alert-${alertTarget.id}"]`,
      missHint: ioc
        ? `Not that one — look for the alert containing ${ioc}.`
        : "Not that one — pick the alert with the highest severity badge.",
      hintText: `It is in the Alert Queue: "${alertTarget.title}".`,
    });
  }

  // ── Step 2 — SIEM: find the same activity in the log stream ────────────────
  const logMatch = logs.find((l) => matchIoc(`${l.message} ${l.source}`));
  const logTarget = logMatch || [...logs].sort(bySeverity)[0];
  if (logTarget) {
    const ioc = logMatch ? matchIoc(`${logTarget.message} ${logTarget.source}`) : null;
    steps.push({
      id: "click-siem-log",
      tab: "siem",
      tabLabel: "SIEM",
      title: "Find it in the logs",
      instruction: ioc
        ? `Click the log line whose message contains ${ioc}.`
        : "Click the highest-severity line in the log stream.",
      targetId: `row-${logTarget.id}`,
      selector: `[data-soc-click="row-${logTarget.id}"]`,
      missHint: ioc
        ? `Not that one — scan the Message column for ${ioc}.`
        : "Not that one — pick the line with the Critical or High severity badge.",
      hintText: `Read the Message column: "${String(logTarget.message).slice(0, 90)}${String(logTarget.message).length > 90 ? "…" : ""}"`,
    });
  }

  return steps;
}