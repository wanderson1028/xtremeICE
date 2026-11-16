import React, { useState } from "react";
import { X, CheckCircle, AlertTriangle, ChevronRight } from "lucide-react";
import { getScenarioPlaybook } from "./scenarioPlaybooks";

// Challenge definitions per action ID
// All correct answers are derived from the run-seed so they always match the
// evidence the analyst sees in SIEM, EDR, alerts, and endpoints.

// Terms that mark a log line as attacker evidence, including web-attack patterns.
const SUSPICIOUS_EVIDENCE =
  /attacker|command and control|\bc2\b|brute ?force|failed (?:vpn )?auth|scan|unknown ip|foreign ip|reverse shell|beacon|spoof|injection|traversal|%2e|\.\.\/|web shell|malicious|suspicious|probe|exploit|exfil|hijack|poison|\bioc\b|blocked/i;

const NEVER_AN_ATTACKER = new Set(["0.0.0.0", "255.255.255.255"]);

function deriveAttackerIPFromLogs(logs = [], endpoints = []) {
  const endpointIPs = new Set(endpoints.map(endpoint => endpoint.ip).filter(Boolean));
  const candidates = new Map();

  logs.forEach(log => {
    const text = `${log.source || ""} ${log.message || ""}`;
    if (!SUSPICIOUS_EVIDENCE.test(text)) return;
    for (const match of text.matchAll(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g)) {
      const ip = match[0];
      const octets = ip.split(".").map(Number);
      const valid = octets.length === 4 && octets.every(value => value >= 0 && value <= 255);
      if (!valid || endpointIPs.has(ip) || NEVER_AN_ATTACKER.has(ip) || ip.endsWith(".0") || ip.endsWith(".255")) continue;
      // "gateway IP 10.0.1.1" is the victim being impersonated, not the attacker
      const before = text.slice(Math.max(0, match.index - 12), match.index).toLowerCase();
      if (/gateway\s+(?:ip\s+)?$/.test(before)) continue;
      candidates.set(ip, (candidates.get(ip) || 0) + 1);
    }
  });

  return [...candidates.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

const DOMAIN_USER_RE = /\b[A-Za-z0-9-]+\\[A-Za-z0-9._$-]+\b/g;
const UPN_RE = /\b[A-Za-z0-9._-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const WINDOWS_PATH_RE = /\b[A-Za-z]:\\[^\s"',;)]+\.[A-Za-z0-9]{2,4}\b/g;
const UNIX_PATH_RE = /\/(?:tmp|var\/tmp|dev\/shm|home)\/[^\s"',;)]+/g;

function evidenceTextOf(lines = []) {
  return lines.map(line => `${line.source || ""} ${line.message || ""}`).join("\n");
}

function evidenceHas(blob, value) {
  const needle = String(value || "").trim().toLowerCase();
  return needle.length > 1 && blob.toLowerCase().includes(needle);
}

/** Most frequent match among the evidence lines that show attacker activity. */
function deriveFromEvidence(lines = [], pattern) {
  const counts = new Map();
  lines.forEach(line => {
    const text = `${line.source || ""} ${line.message || ""}`;
    if (!SUSPICIOUS_EVIDENCE.test(text)) return;
    for (const match of text.matchAll(pattern)) {
      const value = match[0].replace(/[.,;:)\]]+$/, "");
      if (value.length < 3) continue;
      counts.set(value, (counts.get(value) || 0) + 1);
    }
  });
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || null;
}

/** True when the challenge has no answer the analyst can verify in this run. */
export function challengeBlocked(challenge) {
  if (!challenge) return false;
  if (challenge.type === "text_input") return !challenge.correctAnswer;
  if (Array.isArray(challenge.options)) return !challenge.options.some(option => option.correct);
  return false;
}

export function buildChallenge(actionId, endpoints, alerts, scenario, seed, logs = [], edr = []) {
  // A host counts as compromised when its status says so OR when EDR shows
  // detections on it — both are evidence the analyst can see.
  const edrHosts = new Set((edr || []).map(d => d.endpoint).filter(Boolean));
  const compromisedEndpoints = endpoints
    .filter((e) => e.status !== "healthy" || edrHosts.has(e.name))
    .map((e) => e.name);
  const playbook = getScenarioPlaybook(scenario?.id);
  const severityLabels = { P1: "Declare major incident and page IR immediately", P2: "Urgent incident response with same-shift escalation", P3: "Investigate and remediate through the standard queue", P4: "Document and monitor as a low-impact event" };
  const allEndpointNames = endpoints.map((e) => e.name);

  // ─── Derive IOCs from what the analyst can actually see ───────────────────
  // SIEM logs, alerts and EDR detections are the evidence. A seed IOC is only
  // trusted when it appears in that evidence; otherwise it is derived from the
  // evidence itself, and an action with no verified indicator gets locked
  // instead of demanding an answer that is nowhere in the run.
  const evidenceLines = [
    ...logs,
    ...(alerts || []).map(a => ({ source: a.src, message: `${a.title || ""} ${a.rule || ""}` })),
    ...(edr || []).map(d => ({ source: d.endpoint, message: `${d.process || ""} ${d.cmdline || ""} ${d.mitre || ""}` })),
  ];
  const evidenceBlob = evidenceTextOf(evidenceLines);
  const visible = value => evidenceHas(evidenceBlob, value);

  const attackerIP = visible(seed?.attackerIP)
    ? seed.attackerIP
    : deriveAttackerIPFromLogs(evidenceLines, endpoints) || null;

  let compromisedUser = null;
  if (seed?.compromisedUser && (visible(seed.compromisedUser.sam) || visible(seed.compromisedUser.upn))) {
    compromisedUser = seed.compromisedUser;
  } else {
    const sam = deriveFromEvidence(evidenceLines, DOMAIN_USER_RE);
    const upn = deriveFromEvidence(evidenceLines, UPN_RE);
    if (sam || upn) compromisedUser = { sam: sam ? sam.split("\\").pop() : null, upn };
  }

  const edrOfKind = kind => (edr || []).filter(d => (d.kind || "process") === kind);
  const pathIn = text => (String(text || "").match(WINDOWS_PATH_RE) || String(text || "").match(UNIX_PATH_RE) || [])[0] || null;

  const evidenceFiles = edrOfKind("file").map(d => pathIn(d.cmdline)).filter(Boolean);
  const maliciousFile = visible(seed?.maliciousFile)
    ? seed.maliciousFile
    : evidenceFiles[0] || deriveFromEvidence(evidenceLines, WINDOWS_PATH_RE) || deriveFromEvidence(evidenceLines, UNIX_PATH_RE) || null;

  const evidenceProcesses = edrOfKind("process")
    .map(d => (d.cmdline || "").trim())
    .filter(name => name && visible(name));
  const maliciousProcessNames = [...new Set([
    ...(seed?.maliciousProcesses || []).filter(p => visible(p.name)).map(p => p.name),
    ...evidenceProcesses,
  ])].slice(0, 3);

  const evidencePersistence = edrOfKind("persistence")
    .map(d => String(d.cmdline || "").replace(/^Persistence established:\s*/i, "").trim())
    .filter(Boolean);
  const seedPersistence = (seed?.persistenceArtifacts || []).filter(artifact => visible(artifact));
  const persistenceItems = seedPersistence.length ? seedPersistence : evidencePersistence;

  // ─── Firewall rule scripts (derived from seed attacker IP) ─────────────────
  const scenarioBlockTargets = {
    spam_campaign: { target: "invoices-payable.xyz", rule: "Block sender domain and quarantine matching messages" },
    web_phishing_report: { target: "company-helpdesk.net", rule: "Block URL/domain at secure web gateway and mail filter" },
    dns_anomaly: { target: "*.randomchars.c2server.ru", rule: "Create DNS RPZ deny rule and sinkhole matching queries" },
    crypto_miner: { target: "pool.minexmr.com", rule: "Block mining-pool domain and outbound TLS destination" },
    data_on_pastebin: { target: "pastebin.com", rule: "Block paste-site access and alert on matching DLP uploads" },
    shadow_it: { target: "box.com", rule: "Block unsanctioned cloud-storage tenant via CASB/SWG policy" },
    rogue_wifi: { target: "BSSID 00:1A:2B:3C:4D:5E", rule: "Quarantine rogue BSSID through WLAN/NAC policy" },
  };
  const scenarioTarget = scenarioBlockTargets[scenario?.id];
  const fwScripts = scenarioTarget ? [
    { id: "correct", label: `${scenarioTarget.rule}: ${scenarioTarget.target}`, correct: true },
    { id: "wrong1", label: `Allowlist ${scenarioTarget.target} for all users`, correct: false },
    { id: "wrong2", label: "Disable all inbound and outbound web traffic", correct: false },
    { id: "wrong3", label: "Remove the existing security policy", correct: false },
  ] : attackerIP ? [
    { id: "correct", label: `deny ip host ${attackerIP} any\ndeny ip any host ${attackerIP}`, correct: true },
    { id: "wrong1", label: `permit ip host ${attackerIP} any\ndeny udp any any`, correct: false },
    { id: "wrong2", label: `deny tcp any any eq 80\ndeny tcp any any eq 443`, correct: false },
    { id: "wrong3", label: `no ip access-list extended BLOCK_ATTACKER`, correct: false },
  ] : null;

  // ─── Malicious processes (from seed, with plausible distractors) ──────────
  const allKnownProcesses = [
    ...maliciousProcessNames.map(name => ({ name, correct: true })),
    { name: "chrome.exe", correct: false },
    { name: "explorer.exe", correct: false },
    { name: "notepad.exe", correct: false },
    { name: "svchost.exe -k netsvcs", correct: false },
  ];

  // ─── Persistence items (from seed, with legitimate distractors) ────────────
  const allPersistenceItems = [
    ...persistenceItems.map(p => ({ name: p, correct: true })),
    { name: "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon (legitimate)", correct: false },
    { name: "C:\\Program Files\\Google\\Chrome\\chrome.exe (legitimate)", correct: false },
    { name: "HKLM\\SYSTEM\\CurrentControlSet\\Services\\DHCP (legitimate)", correct: false },
  ];

  // ─── Patch options (scenario-aware) ────────────────────────────────────────
  const patchMap = {
    web_compromise: "CVE-2021-44228 — Log4Shell (RCE)",
    brute_force_vpn: "CVE-2023-20198 — Cisco IOS XE (auth bypass)",
    rdp_external: "CVE-2019-0708 — BlueKeep (RDP RCE)",
    zero_day_exploit: "No patch available — implement virtual patch / WAF rule",
  };
  const correctPatch = patchMap[scenario?.id] || "CVE-2023-4966 — Citrix Bleed (session hijack)";
  const patchOptions = [
    { id: "cve1", label: correctPatch, correct: true },
    { id: "cve2", label: "CVE-2023-23397 — Outlook Elevation of Privilege", correct: false },
    { id: "cve3", label: "CVE-2022-30190 — Follina (MSDT RCE)", correct: false },
    { id: "cve4", label: "CVE-2020-1472 — Zerologon (AD DC compromise)", correct: false },
  ];

  // ─── Forensic collection targets (from actual compromised endpoints) ──────
  const forensicTargets = (compromisedEndpoints.length > 0 ? compromisedEndpoints : [endpoints[0]?.name]).filter(Boolean);
  const primaryEp = forensicTargets[0] || "DESKTOP-WIN01";

  const challenges = {
    isolate_host: {
      type: "multi_select",
      title: "Select Host(s) to Isolate",
      description: "Choose only the endpoints that show signs of compromise in EDR or SIEM. Isolating the wrong host disrupts legitimate operations.",
      explanation: "Host isolation cuts off a compromised machine from the network to stop lateral movement. Only isolate hosts that appear in EDR detections or SIEM alerts with confirmed malicious activity. Isolating a healthy host causes unnecessary downtime and may alert the attacker to your response.",
      options: allEndpointNames.map((name) => ({
        label: name,
        sublabel: endpoints.find((e) => e.name === name)?.ip,
        correct: compromisedEndpoints.includes(name),
      })),
      minCorrect: 1,
    },
    block_ip: {
      type: "text_input",
      title: "Enter the Attacker IP to Block",
      description: "Type the exact attacker IP address identified in the SIEM logs. An incorrect IP will block legitimate traffic.",
      placeholder: "e.g. 0.0.0.0",
      correctAnswer: attackerIP || "",
      inputKind: "ip",
      unavailableReason: "No attacker address appears in this run's SIEM, alerts or EDR evidence, so there is nothing to block yet.",
      hint: "Check the SIEM for repeated failed auth, C2 traffic, or scan sources — the IP appears in the logs.",
      explanation: attackerIP
        ? `The correct attacker IP is ${attackerIP}. This IOC is shown in the SIEM evidence for the current run.`
        : "This scenario does not contain a verified attacker IP. Use the scenario-specific containment action instead of guessing an address.",
    },
    disable_user: {
      type: "text_input",
      title: "Enter the Compromised Username",
      description: "Type the exact AD username (CORP\\user format) that has been compromised, as shown in the auth logs.",
      placeholder: "e.g. CORP\\username",
      correctAnswer: compromisedUser?.sam ? `CORP\\${compromisedUser.sam}` : "",
      unavailableReason: "No compromised account appears in this run's authentication evidence, so there is no account to disable.",
      hint: "Check the auth/SIEM logs for the account with anomalous login activity — successful auth from an external IP or after lockout.",
      explanation: `The correct account is CORP\\${compromisedUser?.sam || "the account named in the auth logs"}. This account shows anomalous authentication patterns in the SIEM — multiple failed logins followed by a successful auth from an external IP, then lateral movement. Disabling the wrong account leaves the attacker active while disrupting a legitimate user.`,
    },
    reset_password: {
      type: "text_input",
      title: "Enter the Account to Force-Reset",
      description: "Specify the UPN (user@domain) of the compromised account requiring an immediate password reset.",
      placeholder: "e.g. user@company.com",
      correctAnswer: compromisedUser?.upn || "",
      unavailableReason: "No compromised account's UPN appears in this run's evidence, so there is nothing to reset.",
      hint: "Check the SIEM for the compromised account's email/UPN — it appears in auth and email logs.",
    },
    kill_process: {
      type: "multi_select",
      title: "Select Malicious Process(es) to Terminate",
      description: "Choose only the processes confirmed malicious in the EDR detections. Killing the wrong process may crash legitimate services.",
      options: allKnownProcesses,
      unavailableReason: "No malicious process appears in this run's EDR detections, so there is nothing to terminate.",
      minCorrect: 1,
      explanation: "Malicious processes are those shown in the EDR tab with suspicious patterns: encoded PowerShell, masquerading names (svchost32.exe is not a real Windows binary), or remote execution tools. Standard Windows processes like chrome.exe and explorer.exe are not malicious — killing them crashes the user's session without stopping the attack.",
    },
    quarantine_file: {
      type: "text_input",
      title: "Enter the Malicious File Path",
      description: "Type the full file path of the file to quarantine, exactly as shown in EDR detections.",
      placeholder: "e.g. C:\\Windows\\Temp\\malware.exe",
      correctAnswer: maliciousFile || "",
      unavailableReason: "No suspicious file path appears in this run's EDR detections, so there is nothing to quarantine.",
      hint: "Look at the EDR detections for suspicious executables in non-standard locations (Temp, AppData, /tmp).",
      explanation: `The correct file is ${maliciousFile || "the path shown in the EDR detections"}. Legitimate Windows system files live in C:\\Windows\\System32 — never in Temp or AppData. Non-standard paths are classic masquerading indicators (MITRE T1036).`,
    },
    update_fw_rule: {
      type: "single_select",
      title: fwScripts ? "Select the Correct Firewall Rule" : "Select the Correct Firewall Action",
      description: fwScripts
        ? "Choose the ACL snippet that correctly blocks the attacker while preserving legitimate traffic."
        : "This run's evidence contains no verified attacker address or malicious domain, so no firewall block can be justified. Choose the response that avoids an unjustified change.",
      options: fwScripts || [
        { id: "correct", label: "no change — no verified IOC in this run's evidence", correct: true },
        { id: "wrong1", label: "deny ip any any", correct: false },
        { id: "wrong2", label: "deny tcp any any eq 443", correct: false },
        { id: "wrong3", label: "no ip access-list extended BLOCK", correct: false },
      ],
      explanation: scenarioTarget
        ? `The correct control targets ${scenarioTarget.target}, which is the malicious domain, service, or wireless identifier shown in the SIEM evidence.`
        : attackerIP
          ? `The correct rule blocks both inbound and outbound traffic to and from ${attackerIP}, the address shown in this run's SIEM evidence.`
          : "No attacker address or malicious domain appears in this run's evidence, so a firewall block would target something you have not verified. Broad denies like 'deny ip any any' or blocking all 443 break legitimate traffic — preserve the evidence and escalate until an IOC is confirmed.",
    },
    remove_persistence: {
      type: "multi_select",
      title: "Identify Persistence Mechanisms to Remove",
      description: "Select all persistence artifacts planted by the attacker, as shown in the EDR/SIEM. Leave legitimate system entries untouched.",
      options: allPersistenceItems,
      unavailableReason: "No persistence artifact appears in this run's EDR detections, so there is nothing to remove.",
      minCorrect: 1,
      explanation: "The malicious persistence mechanisms are those shown in the EDR detections — Run keys, scheduled tasks, and StartUp folder items planted by the attacker. Legitimate Windows entries (Winlogon, Chrome, DHCP service) must not be removed — doing so would break the OS.",
    },
    collect_forensics: {
      type: "multi_select",
      title: "Select Endpoints for Forensic Collection",
      description: "Choose all compromised endpoints from which you need forensic packages. Missing one loses evidence.",
      options: allEndpointNames.map((name) => ({
        label: name,
        sublabel: endpoints.find((e) => e.name === name)?.ip,
        correct: compromisedEndpoints.includes(name),
      })),
      minCorrect: 1,
    },
    preserve_evidence: {
      type: "multi_select",
      title: "Select Artefacts to Preserve",
      description: "Choose the correct evidence sources to hash and preserve for the investigation.",
      options: [
        { label: `Windows Event Logs — ${primaryEp}`, sublabel: "Security.evtx, System.evtx", correct: true },
        { label: `Memory Dump — ${primaryEp}`, sublabel: "lsass.dmp, full_mem.dmp", correct: true },
        { label: "Browser Cache — user profile", sublabel: "Chrome profile data", correct: false },
        { label: "Network PCAP — last 2 hours", sublabel: "Captured by TAP/SPAN", correct: true },
        { label: "Screensaver settings", sublabel: "HKCU\\Control Panel\\Desktop", correct: false },
        { label: "Registry Hive — SYSTEM, SAM, SECURITY", sublabel: `From ${primaryEp}`, correct: true },
      ],
      minCorrect: 3,
    },
    patch_system: {
      type: "single_select",
      title: "Select the Vulnerability to Patch",
      description: "Identify the correct CVE being actively exploited in this incident and apply the emergency patch.",
      options: patchOptions,
    },
    restore_backup: {
      type: "single_select",
      title: "Select the Backup Restore Point",
      description: "Choose the most appropriate restore point. Restoring too early loses legitimate data; too late restores malware.",
      options: [
        { id: "r1", label: "2 hours ago — Pre-incident (recommended)", correct: true },
        { id: "r2", label: "30 minutes ago — During active compromise", correct: false },
        { id: "r3", label: "5 minutes ago — Fully compromised state", correct: false },
        { id: "r4", label: "7 days ago — Missing recent legitimate data", correct: false },
      ],
    },
    start_coc: {
      type: "multi_select",
      title: "Select Evidence Items for Chain of Custody",
      description: "Choose all items that must be formally tracked. Every piece of evidence submitted to legal must be listed.",
      options: [
        { label: `Hard drive image — ${primaryEp}`, correct: true },
        { label: `Memory capture — ${primaryEp}`, correct: true },
        { label: "SIEM export — incident window", correct: true },
        { label: "Analyst personal notes (unverified)", correct: false },
        { label: "PCAP files from network tap", correct: true },
        { label: "Screenshot from analyst's phone", correct: false },
      ],
      minCorrect: 3,
    },
    escalate_ir: {
      type: "single_select",
      title: "Select the Correct Escalation Path",
      description: "Choose the appropriate escalation procedure based on the severity of this incident.",
      options: ["P1", "P2", "P3", "P4"].map(level => ({
        id: level.toLowerCase(),
        label: `${level} — ${severityLabels[level]}`,
        correct: level === playbook.severity,
      })),
      explanation: `${scenario?.name || "This incident"} is classified ${playbook.severity} based on its confirmed scope, affected assets, and business impact. The analyst must classify the actual incident rather than defaulting every alert to P1.`,
    },
    notify_customer: {
      type: "multi_select",
      title: "Select Required Notification Recipients",
      description: "A breach may have affected customer PII. Select all parties that must be notified per policy.",
      options: [
        { label: "Affected customers (PII breach)", correct: true },
        { label: "Legal & Compliance team", correct: true },
        { label: "Data Protection Officer (DPO)", correct: true },
        { label: "Marketing department", correct: false },
        { label: "Regulatory body (if required by law)", correct: true },
        { label: "All staff via company-wide email blast", correct: false },
      ],
      minCorrect: 3,
    },
    open_ticket: {
      type: "text_input",
      title: "Classify the Incident Severity",
      description: "Enter the correct ITSM severity level for this incident (P1, P2, P3, or P4). Misclassification delays response.",
      placeholder: "e.g. P1",
      correctAnswer: playbook.severity,
      hint: `Use the scenario scope and business impact. This drill is classified ${playbook.severity}.`,
      caseSensitive: false,
    },
  };

  return challenges[actionId] || null;
}

export default function ActionChallengeModal({ action, challenge, onConfirm, onCancel }) {
  const [selected, setSelected] = useState([]);
  const [textInput, setTextInput] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState(null);

  if (!challenge) return null;

  const toggleSelect = (idx) => {
    setSelected((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  const handleSingleSelect = (idx) => {
    setSelected([idx]);
  };

  const evaluate = () => {
    const { type, options, correctAnswer, minCorrect = 1, caseSensitive = true, explanation, inputKind } = challenge;

    let correct = false;
    let feedback = "";

    if (type === "text_input") {
      const normalizeIp = value => value.trim().replace(/^\[|\]$/g, "").replace(/\/32$/, "").replace(/:(\d+)$/, "");
      const rawAnswer = inputKind === "ip" ? normalizeIp(textInput) : textInput.trim();
      const rawExpected = inputKind === "ip" ? normalizeIp(correctAnswer || "") : (correctAnswer || "");
      const answer = caseSensitive ? rawAnswer : rawAnswer.toUpperCase();
      const expected = caseSensitive ? rawExpected : rawExpected.toUpperCase();
      correct = answer === expected;
      feedback = correct
        ? `Correct! "${correctAnswer}" confirmed.`
        : `Incorrect. The correct answer was: "${correctAnswer}"`;
    } else if (type === "single_select") {
      const chosen = options[selected[0]];
      correct = chosen?.correct === true;
      feedback = correct
        ? "Correct selection!"
        : `Incorrect. "${options.find((o) => o.correct)?.label || "Unknown"}" was the right answer.`;
    } else if (type === "multi_select") {
      const correctIndices = options.map((o, i) => o.correct ? i : -1).filter((i) => i >= 0);
      const allCorrectSelected = correctIndices.every((i) => selected.includes(i));
      const noWrongSelected = selected.every((i) => options[i]?.correct === true);
      correct = allCorrectSelected && noWrongSelected;
      if (correct) {
        feedback = "All correct items selected with no false positives!";
      } else if (!allCorrectSelected) {
        feedback = `Missed: ${correctIndices.filter((i) => !selected.includes(i)).map((i) => options[i].label || options[i].name).join(", ")}`;
      } else {
        feedback = `Incorrectly included: ${selected.filter((i) => !options[i]?.correct).map((i) => options[i].label || options[i].name).join(", ")}`;
      }
    }

    setResult({ correct, feedback, explanation: correct ? null : explanation });
    setSubmitted(true);
  };

  const canSubmit = () => {
    if (challenge.type === "text_input") return textInput.trim().length > 0;
    return selected.length > 0;
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#0f1117] border border-border/50 rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/30">
          <div className="flex items-center gap-2.5">
            <span className="text-lg">{action.icon}</span>
            <div>
              <div className="text-sm font-semibold text-foreground">{action.label}</div>
              <div className="text-[10px] font-mono text-muted-foreground uppercase">{challenge.title}</div>
            </div>
          </div>
          <button onClick={onCancel} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
          <p className="text-xs text-muted-foreground leading-relaxed">{challenge.description}</p>

          {/* Text input */}
          {challenge.type === "text_input" &&
          <div className="space-y-2">
            <input
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !submitted && canSubmit() && evaluate()}
              disabled={submitted}
              placeholder={challenge.placeholder}
              className="w-full h-9 text-sm font-mono bg-[#0a0c12] border border-border/40 rounded-lg px-3 text-white outline-none focus:border-primary/50 disabled:opacity-50 placeholder:text-muted-foreground/50" />
            
              {challenge.hint && !submitted &&
            <div className="text-[10px] text-muted-foreground/60 italic flex items-start gap-1">
                  <span className="text-yellow-500/60">💡</span> {challenge.hint}
                </div>
            }
            </div>
          }

          {/* Single select */}
          {challenge.type === "single_select" &&
          <div className="space-y-2">
            {challenge.options.map((opt, i) =>
            <button
              key={i}
              onClick={() => !submitted && handleSingleSelect(i)}
              disabled={submitted}
              className={`w-full text-left px-3 py-2.5 rounded-lg border text-xs transition-all ${
              selected.includes(i) ?
              "border-primary/60 bg-primary/10 text-foreground" :
              "border-border/30 bg-[#0a0c12] text-muted-foreground hover:border-border/60 hover:text-foreground"} disabled:cursor-not-allowed`
              }>
                <code className="font-mono whitespace-pre-wrap leading-relaxed">{opt.label}</code>
              </button>
            )}
            </div>
          }

          {/* Multi select */}
          {challenge.type === "multi_select" &&
          <div className="space-y-1.5">
            <div className="text-[10px] text-muted-foreground/60 mb-2">Select all that apply — accuracy matters.</div>
            {challenge.options.map((opt, i) =>
            <button
              key={i}
              onClick={() => !submitted && toggleSelect(i)}
              disabled={submitted}
              className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all flex items-start gap-2 ${
              selected.includes(i) ?
              "border-primary/60 bg-primary/10 text-foreground" :
              "border-border/30 bg-[#0a0c12] text-muted-foreground hover:border-border/60 hover:text-foreground"} disabled:cursor-not-allowed`
              }>
                <div className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded border flex items-center justify-center ${
                selected.includes(i) ? "border-primary bg-primary/30" : "border-border/50"}`
                }>
                  {selected.includes(i) && <div className="h-1.5 w-1.5 rounded-sm bg-primary" />}
                </div>
                <div>
                  <div className="font-mono">{opt.label || opt.name}</div>
                  {opt.sublabel && <div className="text-[10px] opacity-50 mt-0.5">{opt.sublabel}</div>}
                </div>
              </button>
            )}
            </div>
          }

          {/* Result feedback */}
          {submitted && result &&
          <div className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs ${
          result.correct ?
          "bg-green-500/10 border-green-500/30 text-green-300" :
          "bg-red-500/10 border-red-500/30 text-red-300"}`
          }>
            {result.correct ?
            <CheckCircle className="h-4 w-4 shrink-0 mt-0.5" /> :
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
            <div className="space-y-1.5">
              <div className="font-semibold">{result.correct ? "✓ Correct!" : "✗ Incorrect"}</div>
              <div className="opacity-80 leading-relaxed">{result.feedback}</div>
              {!result.correct && result.explanation &&
            <div className="mt-2 p-2.5 bg-black/30 rounded-lg border border-red-500/20">
                  <div className="text-[10px] uppercase font-semibold text-red-400/70 mb-1">Why this matters:</div>
                  <div className="text-red-200/80 leading-relaxed">{result.explanation}</div>
                </div>
              }
            </div>
          </div>
          }
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-5 py-4 border-t border-border/30">
          {!submitted ?
          <>
            <button
              onClick={onCancel}
              className="px-4 py-1.5 text-xs text-muted-foreground hover:text-foreground border border-border/30 rounded-lg transition-all">
              Cancel
            </button>
            <button
              onClick={evaluate}
              disabled={!canSubmit()}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
              Execute <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </> :
          <button
            onClick={() => onConfirm(result.correct)}
            className={`flex items-center gap-1.5 px-5 py-1.5 text-xs rounded-lg font-medium transition-all ${
            result.correct ?
            "bg-green-500/20 text-green-300 border border-green-500/30 hover:bg-green-500/30" :
            "bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30"}`
            }>
            {result.correct ? <CheckCircle className="h-3.5 w-3.5" /> : <AlertTriangle className="h-3.5 w-3.5" />}
            {result.correct ? "Apply Action (+points)" : "Close (−5 pts)"}
          </button>
          }
        </div>
      </div>
    </div>);
}