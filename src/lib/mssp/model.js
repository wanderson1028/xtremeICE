/** Shared model helpers for the MSSP SOC & SIEM training module. All data is simulated. */

export const LIFECYCLE_STAGES = [
  { key: "triage", label: "Triage", hint: "Disposition every alert and attach the telemetry that proves it." },
  { key: "detection", label: "Analysis & detection", hint: "Build a detection rule and test it against the event stream." },
  { key: "containment", label: "Containment", hint: "Stop the activity without breaking the process or the site." },
  { key: "recovery", label: "Recovery", hint: "Restore the asset to a known-good, monitored state." },
  { key: "verification", label: "Verification", hint: "Confirm closure with evidence, not assumption." },
  { key: "outcome", label: "Outcome", hint: "Review your capability scores and feedback." },
];

export const DISPOSITIONS = [
  {
    key: "true_positive",
    label: "True positive",
    short: "TP",
    description: "Confirmed malicious or unauthorised activity that needs response.",
    className: "border-rose-500/50 bg-rose-500/10 text-rose-200",
  },
  {
    key: "needs_escalation",
    label: "Escalate / investigate",
    short: "ESC",
    description: "Genuine anomaly or policy breach whose intent is not yet proven.",
    className: "border-amber-500/50 bg-amber-500/10 text-amber-200",
  },
  {
    key: "benign",
    label: "Benign",
    short: "BEN",
    description: "Expected, approved or otherwise non-malicious activity.",
    className: "border-emerald-500/50 bg-emerald-500/10 text-emerald-200",
  },
];

/** Telemetry event factory — keeps the seed files readable. */
export function ev(id, ts, source, assetId, tier, message, fields = {}, opts = {}) {
  return {
    id,
    ts,
    source,
    asset_id: assetId,
    tier,
    message,
    fields,
    malicious: false,
    attack: false,
    ...opts,
  };
}

/** Distinct log sources present in a scenario's telemetry. */
export function getSources(telemetry) {
  return [...new Set(telemetry.map((e) => e.source))];
}

/** Distinct field names for a log source. */
export function getFields(telemetry, source) {
  const names = new Set();
  telemetry
    .filter((e) => e.source === source)
    .forEach((e) => Object.keys(e.fields || {}).forEach((f) => names.add(f)));
  return [...names];
}

/** Distinct values for a field, so the builder can suggest real values. */
export function getFieldValues(telemetry, source, field, limit = 8) {
  const values = new Set();
  telemetry
    .filter((e) => e.source === source && e.fields && e.fields[field] !== undefined)
    .forEach((e) => values.add(String(e.fields[field])));
  return [...values].slice(0, limit);
}

export function formatTs(ts) {
  return ts;
}