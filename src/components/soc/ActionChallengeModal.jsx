import React, { useState } from "react";
import { X, CheckCircle, AlertTriangle, ChevronRight } from "lucide-react";
import { getScenarioPlaybook } from "./scenarioPlaybooks";

// Challenge definitions per action ID
// All correct answers are derived from the run-seed so they always match the
// evidence the analyst sees in SIEM, EDR, alerts, and endpoints.
export function buildChallenge(actionId, endpoints, alerts, scenario, seed) {
  const compromisedEndpoints = endpoints.filter((e) => e.status !== "healthy").map((e) => e.name);
  const playbook = getScenarioPlaybook(scenario?.id);
  const severityLabels = { P1: "Declare major incident and page IR immediately", P2: "Urgent incident response with same-shift escalation", P3: "Investigate and remediate through the standard queue", P4: "Document and monitor as a low-impact event" };
  const allEndpointNames = endpoints.map((e) => e.name);

  // ─── Derive IOCs from the seed (single source of truth) ───────────────────
  const attackerIP = seed?.attackerIP || null;
  const compromisedUser = seed?.compromisedUser || null;
  const maliciousFile = seed?.maliciousFile || null;
  const seedProcesses = seed?.maliciousProcesses || [];
  const seedPersistence = seed?.persistenceArtifacts || [];

  // ─── Firewall rule scripts (derived from seed attacker IP) ─────────────────
  const fwScripts = attackerIP ? [
    { id: "correct", label: `deny ip host ${attackerIP} any\ndeny ip any host ${attackerIP}`, correct: true },
    { id: "wrong1", label: `permit ip host ${attackerIP} any\ndeny udp any any`, correct: false },
    { id: "wrong2", label: `deny tcp any any eq 80\ndeny tcp any any eq 443`, correct: false },
    { id: "wrong3", label: `no ip access-list extended BLOCK_ATTACKER`, correct: false },
  ] : null;

  // ─── Malicious processes (from seed, with plausible distractors) ──────────
  const allKnownProcesses = [
    ...seedProcesses.map(p => ({ name: p.name, correct: true })),
    { name: "chrome.exe", correct: false },
    { name: "explorer.exe", correct: false },
    { name: "notepad.exe", correct: false },
    { name: "svchost.exe -k netsvcs", correct: false },
  ];

  // ─── Persistence items (from seed, with legitimate distractors) ────────────
  const allPersistenceItems = [
    ...seedPersistence.map(p => ({ name: p, correct: true })),
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
      correctAnswer: attackerIP || "10.0.1.50",
      hint: "Check the SIEM for repeated failed auth, C2 traffic, or scan sources — the IP appears in the logs.",
      explanation: `The correct attacker IP is ${attackerIP || "10.0.1.50"}. This IP appears repeatedly in the SIEM logs as the source of failed auth attempts, successful logins, or C2 outbound traffic. Blocking the wrong IP wastes time and may block legitimate users while leaving the attacker's real IP active.`,
    },
    disable_user: {
      type: "text_input",
      title: "Enter the Compromised Username",
      description: "Type the exact AD username (CORP\\user format) that has been compromised, as shown in the auth logs.",
      placeholder: "e.g. CORP\\username",
      correctAnswer: compromisedUser ? `CORP\\${compromisedUser.sam}` : "CORP\\jsmith",
      hint: "Check the auth/SIEM logs for the account with anomalous login activity — successful auth from an external IP or after lockout.",
      explanation: `The correct account is CORP\\${compromisedUser?.sam || "jsmith"}. This account shows anomalous authentication patterns in the SIEM — multiple failed logins followed by a successful auth from an external IP, then lateral movement. Disabling the wrong account leaves the attacker active while disrupting a legitimate user.`,
    },
    reset_password: {
      type: "text_input",
      title: "Enter the Account to Force-Reset",
      description: "Specify the UPN (user@domain) of the compromised account requiring an immediate password reset.",
      placeholder: "e.g. user@company.com",
      correctAnswer: compromisedUser ? compromisedUser.upn : "jsmith@company.com",
      hint: "Check the SIEM for the compromised account's email/UPN — it appears in auth and email logs.",
    },
    kill_process: {
      type: "multi_select",
      title: "Select Malicious Process(es) to Terminate",
      description: "Choose only the processes confirmed malicious in the EDR detections. Killing the wrong process may crash legitimate services.",
      options: allKnownProcesses.length > 1 ? allKnownProcesses : [
        { name: "powershell.exe -enc SQBFAFgA...", correct: true },
        { name: "chrome.exe", correct: false },
        { name: "explorer.exe", correct: false },
      ],
      minCorrect: 1,
      explanation: "Malicious processes are those shown in the EDR tab with suspicious patterns: encoded PowerShell, masquerading names (svchost32.exe is not a real Windows binary), or remote execution tools. Standard Windows processes like chrome.exe and explorer.exe are not malicious — killing them crashes the user's session without stopping the attack.",
    },
    quarantine_file: {
      type: "text_input",
      title: "Enter the Malicious File Path",
      description: "Type the full file path of the file to quarantine, exactly as shown in EDR detections.",
      placeholder: "e.g. C:\\Windows\\Temp\\malware.exe",
      correctAnswer: maliciousFile || "C:\\Windows\\Temp\\svchost32.exe",
      hint: "Look at the EDR detections for suspicious executables in non-standard locations (Temp, AppData, /tmp).",
      explanation: `The correct file is ${maliciousFile || "C:\\Windows\\Temp\\svchost32.exe"}. Legitimate Windows system files live in C:\\Windows\\System32 — never in Temp or AppData. Non-standard paths are classic masquerading indicators (MITRE T1036).`,
    },
    update_fw_rule: {
      type: "single_select",
      title: "Select the Correct Firewall Rule",
      description: "Choose the ACL snippet that correctly blocks the attacker while preserving legitimate traffic.",
      options: fwScripts || [
        { id: "correct", label: `deny ip host 10.0.1.50 any\ndeny ip any host 10.0.1.50`, correct: true },
        { id: "wrong1", label: "permit ip host 10.0.1.50 any", correct: false },
        { id: "wrong2", label: "deny tcp any any eq 443", correct: false },
        { id: "wrong3", label: "no ip access-list extended BLOCK", correct: false },
      ],
      explanation: `The correct rule uses 'deny ip host ${attackerIP || "10.0.1.50"} any' AND 'deny ip any host ${attackerIP || "10.0.1.50"}' — blocking both inbound and outbound traffic to/from the attacker IP. Using 'permit' would allow the attacker through. Blocking ports blindly would break all web traffic. Deleting the ACL entirely removes all protections.`,
    },
    remove_persistence: {
      type: "multi_select",
      title: "Identify Persistence Mechanisms to Remove",
      description: "Select all persistence artifacts planted by the attacker, as shown in the EDR/SIEM. Leave legitimate system entries untouched.",
      options: allPersistenceItems.length > 1 ? allPersistenceItems : [
        { name: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\svcupdate", correct: true },
        { name: "C:\\Program Files\\Chrome\\chrome.exe (legitimate)", correct: false },
      ],
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
    const { type, options, correctAnswer, minCorrect = 1, caseSensitive = true, explanation } = challenge;

    let correct = false;
    let feedback = "";

    if (type === "text_input") {
      const answer = caseSensitive ? textInput.trim() : textInput.trim().toUpperCase();
      const expected = caseSensitive ? correctAnswer : correctAnswer.toUpperCase();
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