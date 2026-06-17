import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "List All Running Processes",
    prompt: "PS C:\\Users\\Analyst>",
    command: "Get-Process | Sort-Object CPU -Descending | Select-Object -First 10",
    explanation: "Get-Process returns all running processes sorted by CPU usage. Select-Object -First 10 limits output to the top 10 — useful for quickly spotting resource hogs.",
    whyItMatters: "During triage, quickly identifying the top CPU-consuming processes can surface cryptominers, malware, or runaway scripts.",
    output: [
      "",
      "Handles  NPM(K)    PM(K)      WS(K)     CPU(s)     Id  SI ProcessName",
      "-------  ------    -----      -----     ------     --  -- -----------",
      "   2341     112   412088     398120     142.83   4892   1 powershell",
      "   1842      89   298456     345120      42.31   1248   1 chrome",
      "    445      22    89234      94120       8.74    988   1 explorer",
      "    234      12    45678      52480       2.11   1520   0 svchost",
      "    128       8    18234      22048       0.94    612   0 lsass",
      "",
    ],
    nextStepDirections: "Suspicious: a powershell.exe process is consuming 142 seconds of CPU. Investigate it.",
    securityInsight: {
      title: "Anomalous PowerShell CPU Usage",
      content: "MITRE ATT&CK T1059.001 — High CPU from powershell.exe can indicate cryptomining, password spraying, or heavy obfuscation loops. Correlate with network connections using Get-NetTCPConnection -OwningProcess.",
    },
  },
  {
    stepLabel: "Investigate a Specific Process",
    prompt: "PS C:\\Users\\Analyst>",
    command: "Get-Process -Id 4892 | Select-Object *",
    explanation: "Select-Object * returns ALL properties of a process object, including the full executable path, start time, handle count, and more — far more detail than the default view.",
    whyItMatters: "The default Get-Process view hides many useful properties. Always use Select-Object * or Format-List * when investigating a specific process to see everything.",
    output: [
      "",
      "Name                : powershell",
      "Id                  : 4892",
      "PriorityClass       : Normal",
      "MainWindowTitle     : ",
      "StartTime           : 6/9/2026 8:47:12 AM",
      "TotalProcessorTime  : 00:02:22.83",
      "CPU                 : 142.83",
      "Path                : C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe",
      "Company             : Microsoft Corporation",
      "",
    ],
    nextStepDirections: "The process started at 08:47 — correlate with the analyst notes from earlier. Now look at all Windows services.",
    securityInsight: {
      title: "Process Start Time as IOC",
      content: "MITRE ATT&CK T1078 — Correlating process start times with known attack timelines is a core DFIR technique. Processes that started outside business hours or immediately after a login event warrant investigation.",
    },
  },
  {
    stepLabel: "List All Windows Services",
    prompt: "PS C:\\Users\\Analyst>",
    command: "Get-Service | Where-Object { $_.Status -eq 'Running' } | Sort-Object DisplayName",
    explanation: "Get-Service returns all Windows services. Filtering for Running services and sorting alphabetically makes it easy to scan for unexpected services.",
    whyItMatters: "Malware frequently installs as a Windows service to achieve persistence. Regularly auditing running services against a known baseline is a key hardening practice.",
    output: [
      "",
      "Status   Name               DisplayName",
      "------   ----               -----------",
      "Running  AppMgmt            Application Management",
      "Running  AudioSrv           Windows Audio",
      "Running  EventLog           Windows Event Log",
      "Running  MalwareSvc         Malware Cleanup Service",
      "Running  Netlogon           Netlogon",
      "Running  WinDefend          Windows Defender Antivirus Service",
      "",
    ],
    nextStepDirections: "Notice 'MalwareSvc' — that name looks suspicious. Investigate it.",
    securityInsight: {
      title: "Malicious Service Names",
      content: "MITRE ATT&CK T1543.003 — Attackers name malicious services with legitimate-sounding names. Compare running services against the HKLM:\\SYSTEM\\CurrentControlSet\\Services registry key baseline and flag unknown entries.",
    },
  },
  {
    stepLabel: "Inspect a Suspicious Service",
    prompt: "PS C:\\Users\\Analyst>",
    command: "Get-Service -Name MalwareSvc | Select-Object *",
    explanation: "Retrieving all properties of a service reveals its display name, service type, start type, and most importantly — whether it requires a binary path that can be inspected.",
    whyItMatters: "A service's BinaryPathName (visible via Get-WmiObject Win32_Service) reveals the executable being run. This is where malicious services expose themselves.",
    output: [
      "",
      "Name                : MalwareSvc",
      "DisplayName         : Malware Cleanup Service",
      "Status              : Running",
      "ServiceType         : Win32OwnProcess",
      "StartType           : Automatic",
      "CanStop             : True",
      "CanPauseAndContinue : False",
      "",
    ],
    nextStepDirections: "This service starts automatically. Now stop it for further investigation.",
    securityInsight: {
      title: "Automatic Service Persistence",
      content: "MITRE ATT&CK T1543.003 — Services set to StartType=Automatic survive reboots, giving attackers persistent access. Always check StartType when auditing services. Automatic services that don't belong in the baseline are high-priority findings.",
    },
  },
  {
    stepLabel: "Stop a Suspicious Service",
    prompt: "PS C:\\Users\\Analyst>",
    command: "Stop-Service -Name MalwareSvc -Force",
    explanation: "Stop-Service halts a running service. The -Force flag stops dependent services as well. After stopping, the service can be further analyzed without it actively running.",
    whyItMatters: "Stopping a malicious service is often the first containment action during an incident. Always document the action with timestamps before and after stopping.",
    output: [
      "",
      "WARNING: Waiting for service 'Malware Cleanup Service (MalwareSvc)' to stop...",
      "",
    ],
    finalGoal: "You triaged a suspicious high-CPU process, investigated a running service, identified a persistence mechanism, and performed initial containment — a complete process & service triage workflow.",
    nextStepDirections: "Lab complete! The service has been stopped and is ready for deeper forensic analysis.",
    securityInsight: {
      title: "Containment Documentation",
      content: "NIST SP 800-61 Rev. 2 — Every containment action must be timestamped and logged. Before stopping a service: Get-Date | Out-File -Append C:\\Incident\\containment.log. After stopping, record the service state change as evidence.",
    },
  },
];

export default function LabPSProcesses() {
  return (
    <LabRunner
      labTitle="Process & Service Management"
      chapterNum={4}
      difficulty="Beginner"
      tags={["PowerShell", "Windows"]}
      terminalLabel="Windows PowerShell 5.1"
      duration={25}
      steps={steps}
      intro={{
        overview: "An alert fired on ANALYST-WS01 showing unusual CPU activity. You need to identify the culprit process, audit running Windows services, and perform initial containment. This lab walks you through the process and service management cmdlets that form the backbone of Windows incident response.",
        objectives: [
          "List and sort processes by CPU usage",
          "Inspect all properties of a specific process",
          "Audit running Windows services",
          "Identify suspicious service configurations",
          "Stop a running service for containment",
        ],
        tools: ["Get-Process", "Get-Service", "Stop-Service", "Where-Object"],
        prerequisites: ["PowerShell Basics & Navigation", "Variables & the Pipeline"],
      }}
    />
  );
}