import React, { useState } from "react";
import { X, CheckCircle, AlertTriangle, ChevronRight } from "lucide-react";

// Challenge definitions per action ID
// Each challenge has: type, prompt, and validation logic
export function buildChallenge(actionId, endpoints, alerts, scenario) {
  const compromisedEndpoints = endpoints.filter((e) => e.status !== "healthy").map((e) => e.name);
  const allEndpointNames = endpoints.map((e) => e.name);

  // Derive attacker IPs from alerts/logs
  const attackerIPMap = {
    brute_force_vpn: "45.95.147.23",
    web_compromise: "91.92.247.18",
    lateral_movement: "5.188.206.14",
    ransomware_outbreak: "185.220.101.47",
    phishing_compromise: "91.108.4.22",
    data_exfiltration: "185.42.116.0",
    insider_threat: "10.0.1.11",
    cloud_compromise: "185.176.27.101"
  };
  const attackerIP = attackerIPMap[scenario?.id] || "198.51.100.55";

  // Firewall rule scripts
  const fwScripts = [
  { id: "correct", label: `deny ip host ${attackerIP} any\ndeny ip any host ${attackerIP}`, correct: true },
  { id: "wrong1", label: `permit ip host ${attackerIP} any\ndeny udp any any`, correct: false },
  { id: "wrong2", label: `deny tcp any any eq 80\ndeny tcp any any eq 443`, correct: false },
  { id: "wrong3", label: `no ip access-list extended BLOCK_ATTACKER`, correct: false }];


  // Process names from EDR
  const maliciousProcesses = [
  { name: "powershell.exe -enc JABjAD0A...", correct: true },
  { name: "svchost32.exe -s", correct: true },
  { name: "chrome.exe", correct: false },
  { name: "explorer.exe", correct: false },
  { name: "wmic.exe /node process call create", correct: true },
  { name: "notepad.exe", correct: false }];


  // Persistence artifacts
  const persistenceItems = [
  { name: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\svcupdate", correct: true },
  { name: "C:\\Windows\\Temp\\svchost32.exe scheduled task", correct: true },
  { name: "C:\\Program Files\\Chrome\\chrome.exe", correct: false },
  { name: "HKLM\\SOFTWARE\\Microsoft\\Windows NT\\CurrentVersion\\Winlogon", correct: false },
  { name: "C:\\Users\\Public\\updater.bat in StartUp folder", correct: true }];


  const patchOptions = [
  { id: "cve1", label: "CVE-2023-4966 — Citrix Bleed (session hijack)", correct: true },
  { id: "cve2", label: "CVE-2021-44228 — Log4Shell (RCE)", correct: scenario?.id === "web_compromise" },
  { id: "cve3", label: "CVE-2019-0708 — BlueKeep (RDP RCE)", correct: false },
  { id: "cve4", label: "CVE-2023-20198 — Cisco IOS XE (auth bypass)", correct: scenario?.id === "brute_force_vpn" }];


  const challenges = {
    isolate_host: {
      type: "multi_select",
      title: "Select Host(s) to Isolate",
      description: "Choose only the endpoints that show signs of compromise. Isolating the wrong host disrupts legitimate operations.",
      explanation: "Host isolation cuts off a compromised machine from the network to stop lateral movement. You should only isolate hosts that appear in EDR detections or SIEM alerts with confirmed malicious activity. Isolating a healthy host causes unnecessary downtime and may alert the attacker to your response.",
      options: allEndpointNames.map((name) => ({
        label: name,
        sublabel: endpoints.find((e) => e.name === name)?.ip,
        correct: compromisedEndpoints.length > 0 ?
        compromisedEndpoints.includes(name) :
        ["DESKTOP-WIN01", "DESKTOP-WIN02", "SERVER-WIN01"].includes(name)
      })),
      minCorrect: 1
    },
    block_ip: {
      type: "text_input",
      title: "Enter the Attacker IP to Block",
      description: "Type the exact attacker IP address identified in the SIEM logs. An incorrect IP will block legitimate traffic.",
      placeholder: "e.g. 0.0.0.0",
      correctAnswer: attackerIP,
      hint: "Check the SIEM for repeated failed auth or outbound C2 traffic sources.",
      explanation: `The correct attacker IP is ${attackerIP}. This IP appears repeatedly in the SIEM logs as the source of failed auth attempts, successful VPN logins, or C2 outbound traffic. Blocking the wrong IP wastes time and may block legitimate users while leaving the attacker's real IP active.`
    },
    disable_user: {
      type: "text_input",
      title: "Enter the Compromised Username",
      description: "Type the exact AD username (DOMAIN\\user format) that has been compromised.",
      placeholder: "e.g. CORP\\username",
      correctAnswer: scenario?.id === "insider_threat" ? "CORP\\mjohnson" : "CORP\\jsmith",
      hint: "Check the auth logs for the account with anomalous login activity.",
      explanation: `The correct account is ${scenario?.id === "insider_threat" ? "CORP\\mjohnson" : "CORP\\jsmith"}. This account shows anomalous authentication patterns in the SIEM — multiple failed logins followed by a successful auth from an external IP, then lateral movement. Disabling the wrong account leaves the attacker active while disrupting a legitimate user.`
    },
    reset_password: {
      type: "text_input",
      title: "Enter the Account to Force-Reset",
      description: "Specify the UPN (user@domain) of the account requiring an immediate password reset.",
      placeholder: "e.g. user@company.com",
      correctAnswer: scenario?.id === "insider_threat" ? "mjohnson@company.com" : "jsmith@company.com",
      hint: "Check the SIEM for the compromised account's email/UPN."
    },
    kill_process: {
      type: "multi_select",
      title: "Select Malicious Process(es) to Terminate",
      description: "Choose only the processes that are confirmed malicious. Killing the wrong process may crash legitimate services.",
      options: maliciousProcesses,
      minCorrect: 1,
      explanation: "Malicious processes include: powershell.exe with -enc (Base64-encoded commands indicate obfuscation), svchost32.exe (note: legitimate svchost never has a '32' suffix — this is a common masquerading tactic), and wmic.exe with process create (used for executing remote code). Processes like chrome.exe, explorer.exe, and notepad.exe are standard Windows processes — killing them crashes the user's session without stopping the attack."
    },
    quarantine_file: {
      type: "text_input",
      title: "Enter the Malicious File Path",
      description: "Type the full file path of the file to quarantine, exactly as shown in EDR detections.",
      placeholder: "e.g. C:\\Windows\\Temp\\malware.exe",
      correctAnswer: "C:\\Windows\\Temp\\svchost32.exe",
      hint: "Look at the EDR detections for suspicious executables in non-standard locations.",
      explanation: "The correct file is C:\\Windows\\Temp\\svchost32.exe. Legitimate Windows system files (svchost.exe) live in C:\\Windows\\System32 — never in Temp. The '32' suffix and non-standard path are classic masquerading indicators (MITRE T1036). C:\\Windows\\Temp is a common attacker staging area for dropping and executing payloads."
    },
    update_fw_rule: {
      type: "single_select",
      title: "Select the Correct Firewall Rule",
      description: "Choose the ACL snippet that correctly blocks the attacker while preserving legitimate traffic.",
      options: fwScripts,
      explanation: `The correct rule uses 'deny ip host ${attackerIP} any' AND 'deny ip any host ${attackerIP}' — blocking both inbound and outbound traffic to/from the attacker IP. Using 'permit' would allow the attacker through. Blocking ports 80/443 blindly would break all web traffic. Deleting the ACL entirely removes all protections.`
    },
    remove_persistence: {
      type: "multi_select",
      title: "Identify Persistence Mechanisms to Remove",
      description: "Select all persistence artifacts planted by the attacker. Leave legitimate system entries untouched.",
      options: persistenceItems,
      minCorrect: 2,
      explanation: "The malicious persistence mechanisms are: (1) HKCU Run key 'svcupdate' — attackers add Run keys to execute malware on login (MITRE T1547.001); (2) svchost32.exe scheduled task in Temp — a fake svchost running as a scheduled task; (3) updater.bat in the StartUp folder — scripts placed here run at every logon. The Chrome executable and Winlogon key are legitimate Windows entries — removing them would break the OS."
    },
    collect_forensics: {
      type: "multi_select",
      title: "Select Endpoints for Forensic Collection",
      description: "Choose all compromised endpoints from which you need forensic packages. Missing one loses evidence.",
      options: allEndpointNames.map((name) => ({
        label: name,
        sublabel: endpoints.find((e) => e.name === name)?.ip,
        correct: compromisedEndpoints.length > 0 ?
        compromisedEndpoints.includes(name) :
        ["DESKTOP-WIN01", "SERVER-WIN01"].includes(name)
      })),
      minCorrect: 1
    },
    preserve_evidence: {
      type: "multi_select",
      title: "Select Artefacts to Preserve",
      description: "Choose the correct evidence sources to hash and preserve for the investigation.",
      options: [
      { label: "Windows Event Logs — DESKTOP-WIN01", sublabel: "Security.evtx, System.evtx", correct: true },
      { label: "Memory Dump — DESKTOP-WIN01", sublabel: "lsass.dmp, full_mem.dmp", correct: true },
      { label: "Browser Cache — jsmith", sublabel: "Chrome profile data", correct: false },
      { label: "Network PCAP — last 2 hours", sublabel: "Captured by TAP/SPAN", correct: true },
      { label: "Screensaver settings", sublabel: "HKCU\\Control Panel\\Desktop", correct: false },
      { label: "Registry Hive — SYSTEM, SAM, SECURITY", sublabel: "From DESKTOP-WIN01", correct: true }],

      minCorrect: 3
    },
    patch_system: {
      type: "single_select",
      title: "Select the Vulnerability to Patch",
      description: "Identify the correct CVE being actively exploited in this incident and apply the emergency patch.",
      options: patchOptions
    },
    restore_backup: {
      type: "single_select",
      title: "Select the Backup Restore Point",
      description: "Choose the most appropriate restore point. Restoring too early loses legitimate data; too late restores malware.",
      options: [
      { id: "r1", label: "2 hours ago — Pre-incident (recommended)", correct: true },
      { id: "r2", label: "30 minutes ago — During active compromise", correct: false },
      { id: "r3", label: "5 minutes ago — Fully compromised state", correct: false },
      { id: "r4", label: "7 days ago — Missing recent legitimate data", correct: false }]

    },
    start_coc: {
      type: "multi_select",
      title: "Select Evidence Items for Chain of Custody",
      description: "Choose all items that must be formally tracked. Every piece of evidence submitted to legal must be listed.",
      options: [
      { label: "Hard drive image — DESKTOP-WIN01", correct: true },
      { label: "Memory capture — DESKTOP-WIN01", correct: true },
      { label: "SIEM export — incident window", correct: true },
      { label: "Analyst personal notes (unverified)", correct: false },
      { label: "PCAP files from network tap", correct: true },
      { label: "Screenshot from analyst's phone", correct: false }],

      minCorrect: 3
    },
    escalate_ir: {
      type: "single_select",
      title: "Select the Correct Escalation Path",
      description: "Choose the appropriate escalation procedure based on the severity of this incident.",
      options: [
      { id: "e1", label: "P1 — Declare Major Incident, page on-call IR team immediately", correct: true },
      { id: "e2", label: "P3 — Log ticket, assign to next-day queue", correct: false },
      { id: "e3", label: "P2 — Email the security team and wait", correct: false },
      { id: "e4", label: "Close alert — False positive, no action needed", correct: false }],

      explanation: "Active compromise with confirmed lateral movement, credential abuse, and data exfiltration indicators is a P1 Major Incident — it requires immediate IR team activation, not a next-day queue. P3 is for low-impact events. Emailing and waiting (P2) loses critical response time. Closing as a false positive when there is confirmed malicious activity is a serious analyst failure."
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
      { label: "All staff via company-wide email blast", correct: false }],

      minCorrect: 3
    },
    open_ticket: {
      type: "text_input",
      title: "Classify the Incident Severity",
      description: "Enter the correct ITSM severity level for this incident (P1, P2, P3, or P4). Misclassification delays response.",
      placeholder: "e.g. P1",
      correctAnswer: "P1",
      hint: "Active ransomware, active exfiltration, or domain compromise = P1.",
      caseSensitive: false
    }
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
      feedback = correct ?
      `Correct! "${correctAnswer}" confirmed.` :
      `Incorrect. The correct answer was: "${correctAnswer}"`;
    } else if (type === "single_select") {
      const chosen = options[selected[0]];
      correct = chosen?.correct === true;
      feedback = correct ?
      "Correct selection!" :
      `Incorrect. "${options.find((o) => o.correct)?.label || "Unknown"}" was the right answer.`;
    } else if (type === "multi_select") {
      const correctIndices = options.map((o, i) => o.correct ? i : -1).filter((i) => i >= 0);
      const allCorrectSelected = correctIndices.every((i) => selected.includes(i));
      const noWrongSelected = selected.every((i) => options[i]?.correct === true);
      correct = allCorrectSelected && noWrongSelected;
      if (correct) {
        feedback = "All correct items selected with no false positives!";
      } else if (!allCorrectSelected) {
        feedback = `Missed: ${correctIndices.filter((i) => !selected.includes(i)).map((i) => options[i].label).join(", ")}`;
      } else {
        feedback = `Incorrectly included: ${selected.filter((i) => !options[i]?.correct).map((i) => options[i].label).join(", ")}`;
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
              className={`w-full text-left px-3 py-2 rounded-lg border text-xs transition-all flex items-start gap-2 bg-[hsl(var(--foreground))] text-[hsl(var(--destructive))] ${
              selected.includes(i) ?
              "border-primary/60 bg-primary/10 text-foreground" :
              "border-border/30 hover:border-border/60 hover:text-foreground"} disabled:cursor-not-allowed`
              }>
              
                  <div className={`mt-0.5 h-3.5 w-3.5 shrink-0 rounded border flex items-center justify-center ${
              selected.includes(i) ? "border-primary bg-primary/30" : "border-border/50"}`
              }>
                    {selected.includes(i) && <div className="h-1.5 w-1.5 rounded-sm bg-primary" />}
                  </div>
                  <div>
                    <div className="font-mono">{opt.label}</div>
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