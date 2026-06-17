// Shared source of truth for all assessment phase task definitions.
// Checks are STRICT — each phase requires actions specific to that phase only.

export const TASK_DEFINITIONS = [
  {
    id: "task_identify_threat",
    label: "Identify the Threat Type",
    description: "Visit the Dashboard AND review SIEM logs to identify the active alerts and attack pattern",
    points: 15,
    phase: "detect",
    // Must visit BOTH dashboard and SIEM — not just one
    check: ({ tabsVisited }) =>
      tabsVisited.has("dashboard") && tabsVisited.has("siem"),
  },
  {
    id: "task_scope_impact",
    label: "Scope the Incident",
    description: "Open the EDR tab AND perform an EDR triage action on a compromised endpoint",
    points: 15,
    phase: "triage",
    // Must visit EDR AND perform a triage action (kill process, quarantine file, collect forensics, or EDR isolate)
    check: ({ tabsVisited, actionIds }) =>
      tabsVisited.has("edr") &&
      ["kill_process", "quarantine_file", "collect_forensics", "edr_isolate_host"].some(id => actionIds.has(id)),
  },
  {
    id: "task_containment",
    label: "Contain the Threat",
    description: "Execute a containment action from the Remediation panel (isolate host, block IP, or disable user account)",
    points: 20,
    phase: "contain",
    // Strict: must use the Remediation panel's isolate_host/block_ip/disable_user (NOT the EDR edr_isolate_host)
    check: ({ actionIds }) =>
      ["isolate_host", "block_ip", "disable_user"].some(id => actionIds.has(id)),
  },
  {
    id: "task_evidence",
    label: "Preserve Evidence",
    description: "Preserve forensic evidence by initiating chain of custody or preserving artefacts",
    points: 15,
    phase: "contain",
    // Strict: only evidence-specific actions qualify — NOT collect_forensics which is an EDR action
    check: ({ actionIds }) =>
      ["preserve_evidence", "start_coc"].some(id => actionIds.has(id)),
  },
  {
    id: "task_eradicate",
    label: "Eradicate & Recover",
    description: "Remove persistence mechanisms and restore/patch affected systems via Remediation or RMM",
    points: 20,
    phase: "recover",
    // Strict: only recovery-specific actions — NOT kill_process/quarantine_file which are triage actions
    check: ({ actionIds }) =>
      ["remove_persistence", "patch_system", "restore_backup"].some(id => actionIds.has(id)),
  },
  {
    id: "task_report",
    label: "Generate Incident Report",
    description: "Create and generate a full AI incident report documenting findings, timeline, and IOCs",
    points: 15,
    phase: "report",
    check: ({ reportGenerated }) => !!reportGenerated,
  },
];

export const PHASE_COLORS = {
  detect:  { text: "text-red-400",    bg: "bg-red-500/10 border-red-500/30" },
  triage:  { text: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30" },
  contain: { text: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30" },
  recover: { text: "text-green-400",  bg: "bg-green-500/10 border-green-500/30" },
  report:  { text: "text-primary",    bg: "bg-primary/10 border-primary/30" },
};