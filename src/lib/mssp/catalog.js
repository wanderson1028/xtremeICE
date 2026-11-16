/**
 * MSSP SOC & SIEM training — catalog metadata.
 * Shared by the hub page and the session runner. Everything here is simulated:
 * no live MSSP, SIEM, OT or IoT system is contacted.
 */

export const ENVIRONMENT_DIAGRAM_URL =
  "https://media.base44.com/images/public/69a0a5a90473fac0aa3ea135/0372876ec_generated_image.png";

export const ENVIRONMENT_TIERS = [
  {
    key: "it",
    label: "Enterprise IT",
    accent: "cyan",
    summary: "Directory, finance and analyst workloads that the SOC also has to defend.",
    assets: ["Domain controller", "File server", "Finance workstations", "SOC analyst console"],
  },
  {
    key: "edge",
    label: "Edge",
    accent: "amber",
    summary: "The layer you are primarily hired to protect: field connectivity, gateways and edge compute.",
    assets: ["Industrial cellular routers", "Edge compute servers", "UTM security gateway", "MQTT broker", "LoRaWAN gateway"],
  },
  {
    key: "ot",
    label: "OT / IoT",
    accent: "emerald",
    summary: "Process and physical systems where a wrong response can stop production or endanger people.",
    assets: ["PLCs (S7-1200, ControlLogix)", "DCS / SCADA HMIs", "RTU and IED relays", "IP cameras + NVR", "Vibration / temperature sensors", "Smart meters"],
  },
];

export const CAPABILITY_AREAS = [
  {
    key: "triage",
    title: "Alert triage & investigation",
    summary: "Disposition device-accurate alerts, pull corroborating telemetry, and record defensible findings.",
    icon: "triage",
  },
  {
    key: "detection",
    title: "Detection engineering & response",
    summary: "Build or tune a detection, test it against simulated events, then take response actions that keep OT running.",
    icon: "detection",
  },
  {
    key: "lifecycle",
    title: "Full incident lifecycle",
    summary: "Carry the incident from detection and analysis through containment, recovery and verified closure.",
    icon: "lifecycle",
  },
];

export const PRACTICE_MODES = [
  {
    key: "guided",
    name: "Guided SOC scenario",
    icon: "graduation",
    accent: "cyan",
    tagline: "Coach-led, step by step",
    description:
      "An analyst coach walks each stage with you: what to look at, why the device behaviour matters, and which response is safe for the process.",
    bullets: ["Stage prompts and rationale", "Device-specific hints", "Full lifecycle walkthrough"],
  },
  {
    key: "range",
    name: "Interactive cyber range",
    icon: "crosshair",
    accent: "rose",
    tagline: "No hints, hunt the telemetry",
    description:
      "Alerts land against a running clock. You hunt the raw telemetry yourself, correlate layers, and decide what is real before the scenario moves on.",
    bullets: ["Timed alert release", "Raw telemetry hunting", "Correlation across IT, edge and OT"],
  },
  {
    key: "mssp",
    name: "MSSP operations simulator",
    icon: "building",
    accent: "amber",
    tagline: "Multi-tenant, SLA-bound",
    description:
      "Run the queue the way an MSSP does: a contract SLA on every alert, client-safe actions, and an escalation note the client can act on.",
    bullets: ["Per-severity SLAs", "Client-impact guardrails", "Escalation write-up"],
  },
];

export const SCENARIO_CATALOG = [
  {
    id: "gateway_compromise",
    title: "Gateway Compromise",
    theme: "gateway",
    severity: "High",
    difficulty: "Intermediate",
    duration: 40,
    accent: "amber",
    summary:
      "An industrial cellular router is being reconfigured from outside the change window and an unknown MQTT publisher is writing to PLC command topics.",
    devices: ["Industrial router", "Edge UTM", "MQTT broker", "Edge server", "PLC"],
    capabilities: ["triage", "detection", "lifecycle"],
    mitre: ["T1078.001", "T1556", "T1562.004", "T1071.001"],
  },
  {
    id: "ot_disruption",
    title: "OT Disruption Attempt",
    theme: "ot",
    severity: "Critical",
    difficulty: "Advanced",
    duration: 45,
    accent: "emerald",
    summary:
      "A PLC program download and Modbus register writes arrive from a host that is not on the OT whitelist, while a process sensor starts drifting off its safe envelope.",
    devices: ["Siemens S7-1200", "RTU", "IED relay", "DCS HMI", "Pressure sensor"],
    capabilities: ["triage", "detection", "lifecycle"],
    mitre: ["T0836", "T0855", "T0842", "T0813"],
  },
  {
    id: "cross_layer",
    title: "Cross-Layer Intrusion",
    theme: "cross",
    severity: "Critical",
    difficulty: "Expert",
    duration: 50,
    accent: "rose",
    summary:
      "Kerberoasting in enterprise IT hands the adversary an edge admin credential, an NVR firmware flaw turns cameras into a botnet, and smart meters begin beaconing to a rogue aggregator.",
    devices: ["Domain controller", "Edge gateway", "NVR + cameras", "Smart meters", "LoRaWAN gateway"],
    capabilities: ["triage", "detection", "lifecycle"],
    mitre: ["T1558.003", "T1219", "T1071", "T1498"],
  },
];

export const SEVERITY_STYLES = {
  Critical: "text-rose-300 bg-rose-500/10 border-rose-500/40",
  High: "text-orange-300 bg-orange-500/10 border-orange-500/40",
  Medium: "text-amber-300 bg-amber-500/10 border-amber-500/40",
  Low: "text-sky-300 bg-sky-500/10 border-sky-500/40",
};

export const ACCENT_TEXT = {
  cyan: "text-cyan-300",
  amber: "text-amber-300",
  emerald: "text-emerald-300",
  rose: "text-rose-300",
};

export const ACCENT_RING = {
  cyan: "hover:border-cyan-400/60 hover:bg-cyan-500/5",
  amber: "hover:border-amber-400/60 hover:bg-amber-500/5",
  emerald: "hover:border-emerald-400/60 hover:bg-emerald-500/5",
  rose: "hover:border-rose-400/60 hover:bg-rose-500/5",
};

export function getMode(key) {
  return PRACTICE_MODES.find((m) => m.key === key) || PRACTICE_MODES[0];
}

export function getScenarioSummary(id) {
  return SCENARIO_CATALOG.find((s) => s.id === id) || SCENARIO_CATALOG[0];
}