/**
 * Deterministic scoring engine for the MSSP SOC & SIEM training module.
 * Detections are evaluated against the seeded telemetry stream, so results are reproducible.
 */

function matches(value, operator, target) {
  const v = String(value ?? "").toLowerCase();
  const t = String(target ?? "").toLowerCase().trim();
  if (!t) return false;
  switch (operator) {
    case "equals":
      return v === t;
    case "contains":
      return v.includes(t);
    case "not_equals":
      return v !== t;
    case "greater_than": {
      const a = parseFloat(v);
      const b = parseFloat(t);
      return !Number.isNaN(a) && !Number.isNaN(b) && a > b;
    }
    default:
      return false;
  }
}

/** Evaluate a detection rule against the scenario event stream. */
export function evaluateRule(rule, scenario) {
  const empty = {
    valid: false,
    matched: [],
    benign: [],
    malicious: [],
    fires: false,
    attackHit: false,
    coverage: 0,
    noise: 0,
  };
  if (!rule?.source || !rule?.field || !rule?.value) return empty;

  const sourceEvents = scenario.telemetry.filter((e) => e.source === rule.source);
  const matched = sourceEvents.filter((e) => matches(e.fields?.[rule.field], rule.operator, rule.value));
  const benign = matched.filter((e) => !e.malicious);
  const malicious = matched.filter((e) => e.malicious);
  const threshold = Math.max(1, Number(rule.threshold) || 1);
  const fires = matched.length >= threshold;
  const matchedIds = new Set(matched.map((e) => e.id));
  const attackHit = (scenario.detection.attack_event_ids || []).some((id) => matchedIds.has(id));

  return {
    valid: true,
    matched,
    benign,
    malicious,
    fires,
    attackHit,
    coverage: attackHit ? 1 : 0,
    noise: benign.length,
    totalSourceEvents: sourceEvents.length,
  };
}

export function scoreDetection(rule, scenario) {
  const evaluation = evaluateRule(rule, scenario);
  if (!evaluation.valid) {
    return { evaluation, score: 0, verdict: "No rule", message: "Build a rule with a log source, field and value." };
  }
  if (!evaluation.fires) {
    return {
      evaluation,
      score: 0,
      verdict: "Silent",
      message: "The rule never fires on this stream — it would miss the attack entirely.",
    };
  }
  if (!evaluation.attackHit) {
    return {
      evaluation,
      score: Math.min(0.3, evaluation.noise === 0 ? 0.3 : 0.1),
      verdict: "Missed the attack",
      message: "The rule fires, but none of the matched events are the malicious one you were asked to catch.",
    };
  }
  const specificity = evaluation.noise === 0 ? 1 : Math.max(0, 1 - evaluation.noise * 0.3);
  return {
    evaluation,
    score: 0.55 + specificity * 0.45,
    verdict: evaluation.noise === 0 ? "Clean detection" : "Noisy detection",
    message:
      evaluation.noise === 0
        ? "Catches the malicious event with no benign events in the same scope."
        : `Catches the attack but also fires on ${evaluation.noise} benign event${evaluation.noise === 1 ? "" : "s"} — the client will tune it out.`,
  };
}

function dispositionPoints(alert, disposition) {
  if (!disposition) return 0;
  if (disposition === alert.truth) return 1;
  if (alert.truth === "true_positive" && disposition === "needs_escalation") return 0.6;
  if (alert.truth === "needs_escalation" && disposition === "true_positive") return 0.7;
  return 0;
}

export function scoreTriage(scenario, dispositions = {}, evidence = {}) {
  const alerts = scenario.alerts;
  const dispositionScore =
    alerts.reduce((sum, a) => sum + dispositionPoints(a, dispositions[a.id]), 0) / alerts.length;

  const maliciousAlerts = alerts.filter((a) => a.truth !== "benign");
  const withEvidence = maliciousAlerts.filter((a) => (evidence[a.id] || []).length > 0).length;
  const evidenceScore = maliciousAlerts.length ? withEvidence / maliciousAlerts.length : 1;

  const missed = alerts
    .filter((a) => dispositionPoints(a, dispositions[a.id]) < 1)
    .map((a) => ({ id: a.id, title: a.title, given: dispositions[a.id], truth: a.truth }));

  return {
    score: dispositionScore * 0.65 + evidenceScore * 0.35,
    dispositionScore,
    evidenceScore,
    missed,
    unsubstantiated: maliciousAlerts.filter((a) => !(evidence[a.id] || []).length).map((a) => a.id),
  };
}

function actionScore(actions, selected = []) {
  const max = actions.filter((a) => a.points > 0).reduce((s, a) => s + a.points, 0) || 1;
  const earned = selected.reduce((s, id) => s + (actions.find((a) => a.id === id)?.points || 0), 0);
  return {
    score: Math.max(0, Math.min(1, earned / max)),
    earned,
    max,
    unsafe: selected
      .map((id) => actions.find((a) => a.id === id))
      .filter((a) => a && a.safety === "unsafe")
      .map((a) => a.label),
    risky: selected
      .map((id) => actions.find((a) => a.id === id))
      .filter((a) => a && a.safety === "risky")
      .map((a) => a.label),
    missing: actions.filter((a) => a.points > 0 && !selected.includes(a.id)).map((a) => a.label),
  };
}

export function scoreResponse(scenario, selected = {}) {
  const containment = actionScore(scenario.containment, selected.containment || []);
  const recovery = actionScore(scenario.recovery, selected.recovery || []);
  return {
    containment,
    recovery,
    score: containment.score * 0.6 + recovery.score * 0.4,
  };
}

export function scoreVerification(scenario, selected = []) {
  const correct = scenario.verification.filter((v) => v.correct);
  const wrong = scenario.verification.filter((v) => !v.correct);
  const hit = correct.filter((v) => selected.includes(v.id)).length;
  const falsePositive = wrong.filter((v) => selected.includes(v.id)).length;
  const score = Math.max(0, Math.min(1, hit / correct.length - falsePositive * 0.25));
  return {
    score,
    hit,
    total: correct.length,
    falsePositive,
    missed: correct.filter((v) => !selected.includes(v.id)).map((v) => v.label),
  };
}

export function gradeFor(score) {
  if (score >= 0.85) return { label: "Excellent", tone: "emerald", note: "You worked this the way the client pays for." };
  if (score >= 0.7) return { label: "Strong", tone: "cyan", note: "Sound decisions with a few gaps worth closing." };
  if (score >= 0.55) return { label: "Developing", tone: "amber", note: "The direction was right; the discipline needs work." };
  return { label: "Needs work", tone: "rose", note: "Review the coach notes and run this scenario again." };
}

/** Combine every scored area into the session outcome. */
export function computeOutcome(scenario, state) {
  const triage = scoreTriage(scenario, state.dispositions, state.evidence);
  const detection = scoreDetection(state.rule, scenario);
  const response = scoreResponse(scenario, state.actions);
  const verification = scoreVerification(scenario, state.verification);

  const lifecycleScore = response.score * 0.6 + verification.score * 0.4;
  const overall = triage.score * 0.35 + detection.score * 0.3 + lifecycleScore * 0.35;

  const capabilities = [
    {
      key: "triage",
      title: "Alert triage & investigation",
      score: triage.score,
      detail: `${Math.round(triage.dispositionScore * 100)}% correct dispositions · evidence attached on ${Math.round(
        triage.evidenceScore * 100
      )}% of malicious alerts`,
    },
    {
      key: "detection",
      title: "Detection engineering & response",
      score: detection.score * 0.5 + response.score * 0.5,
      detail: `${detection.verdict} · containment ${Math.round(response.containment.score * 100)}% · recovery ${Math.round(
        response.recovery.score * 100
      )}%`,
    },
    {
      key: "lifecycle",
      title: "Full incident lifecycle",
      score: lifecycleScore,
      detail: `${verification.hit}/${verification.total} closure checks proven`,
    },
  ];

  const feedback = [];

  if (triage.missed.length) {
    const named = triage.missed.slice(0, 3).map((m) => `${m.id} (${m.title})`).join("; ");
    feedback.push({
      tone: "fix",
      area: "Triage",
      text: `Re-read the evidence on ${named}. A disposition has to be defensible from the telemetry, not from the alert title.`,
    });
  } else {
    feedback.push({ tone: "good", area: "Triage", text: "Every alert was dispositioned correctly, including the benign noise." });
  }

  if (triage.unsubstantiated.length) {
    feedback.push({
      tone: "watch",
      area: "Investigation",
      text: `You confirmed malicious activity on ${triage.unsubstantiated.length} alert(s) without attaching the telemetry that proves it. Correlate first, then disposition.`,
    });
  }

  feedback.push({
    tone: detection.score >= 0.9 ? "good" : detection.score >= 0.6 ? "watch" : "fix",
    area: "Detection",
    text: detection.message,
  });

  if (response.containment.unsafe.length || response.recovery.unsafe?.length) {
    feedback.push({
      tone: "fix",
      area: "Response",
      text: `Unsafe action selected: ${[...response.containment.unsafe, ...(response.recovery.unsafe || [])].join(
        "; "
      )}. In an OT estate, an action that stops the process is an outcome the attacker wanted.`,
    });
  }
  if (response.containment.missing.length) {
    feedback.push({
      tone: "watch",
      area: "Containment",
      text: `Still open: ${response.containment.missing.slice(0, 2).join("; ")}.`,
    });
  }
  if (response.containment.risky.length) {
    feedback.push({
      tone: "watch",
      area: "Containment",
      text: `${response.containment.risky.join("; ")} carried an avoidable operational cost — get plant approval before that class of action.`,
    });
  }
  if (verification.missed.length) {
    feedback.push({
      tone: "watch",
      area: "Verification",
      text: `Not proven before closure: ${verification.missed.slice(0, 2).join("; ")}.`,
    });
  }
  if (verification.falsePositive) {
    feedback.push({
      tone: "fix",
      area: "Verification",
      text: "You counted time passed or a clean reboot as closure evidence. Those do not prove the attacker's path is gone.",
    });
  }

  const grade = gradeFor(overall);
  return { triage, detection, response, verification, lifecycleScore, overall, capabilities, feedback, grade };
}

/** Multi-tenant queue metadata for the MSSP operations mode. */
export const CLIENT_TENANTS = ["Northwind Water Utility", "Helios Manufacturing", "Meridian Logistics"];

export const SLA_MINUTES = { Critical: 15, High: 30, Medium: 60, Low: 120 };

export function assignTenant(scenario, index) {
  const tenants = scenario.tenants || CLIENT_TENANTS;
  return tenants[index % tenants.length];
}