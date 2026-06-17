import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Check WinRM Service Status",
    prompt: "PS C:\\Users\\Analyst>",
    command: "Get-Service -Name WinRM | Select-Object Name, Status, StartType",
    explanation: "Windows Remote Management (WinRM) is the service that enables PowerShell Remoting. Before using remoting, verify it's running and check whether it starts automatically.",
    whyItMatters: "WinRM is required for PowerShell Remoting. If it's disabled, attackers can't use PSRemoting as a lateral movement technique. Conversely, if it's enabled on workstations that don't need it, that's unnecessary attack surface.",
    output: [
      "",
      "Name  Status  StartType",
      "----  ------  ---------",
      "WinRM Running Automatic",
      "",
    ],
    nextStepDirections: "WinRM is running. Now check the remoting configuration.",
    securityInsight: {
      title: "WinRM Lateral Movement",
      content: "MITRE ATT&CK T1021.006 — Attackers use PowerShell Remoting (WinRM/WSMan) for lateral movement. It's stealthier than PsExec because traffic is encrypted and blends with legitimate admin activity. Monitor Event ID 4624 Type 3 logins on target systems.",
    },
  },
  {
    stepLabel: "Check WinRM Trusted Hosts",
    prompt: "PS C:\\Users\\Analyst>",
    command: "Get-Item WSMan:\\localhost\\Client\\TrustedHosts",
    explanation: "TrustedHosts controls which remote computers this system will connect to without certificate validation. A wildcard (*) means any computer is trusted — a significant security risk.",
    whyItMatters: "A TrustedHosts value of * allows man-in-the-middle attacks against your remoting sessions. Always specify explicit hostnames or use certificates for authentication instead.",
    output: [
      "",
      "   WSManConfig: Microsoft.WSMan.Management\\WSMan::localhost\\Client",
      "",
      "Type            Name                           SourceOfValue   Value",
      "----            ----                           -------------   -----",
      "System.String   TrustedHosts                                   *",
      "",
    ],
    nextStepDirections: "TrustedHosts is set to * — that's a misconfiguration. For now, proceed to query remote system info.",
    securityInsight: {
      title: "TrustedHosts Wildcard Risk",
      content: "CWE-295 Improper Certificate Validation — TrustedHosts=* disables host authentication checks, enabling MITM attacks. Restrict to specific hostnames: Set-Item WSMan:\\localhost\\Client\\TrustedHosts -Value 'server01,server02'. In enterprise environments, use Kerberos auth on domain-joined systems instead.",
    },
  },
  {
    stepLabel: "Query Remote System with Invoke-Command",
    prompt: "PS C:\\Users\\Analyst>",
    command: 'Invoke-Command -ComputerName "SERVER01" -ScriptBlock { Get-Process | Sort-Object CPU -Descending | Select-Object -First 5 }',
    explanation: "Invoke-Command runs a ScriptBlock on a remote computer. The code inside the braces executes on the remote system, and results are returned as objects to the local session.",
    whyItMatters: "Invoke-Command is the foundation of large-scale PowerShell automation. You can run the same command against dozens of servers simultaneously using -ComputerName with an array of hostnames.",
    output: [
      "",
      "Handles  NPM(K)    PM(K)      WS(K)     CPU(s)     Id PSComputerName",
      "-------  ------    -----      -----     ------     -- --------------",
      "    892      34   145234     178120      82.11   2344 SERVER01",
      "    445      22    89234      94120       8.74    988 SERVER01",
      "    234      12    45678      52480       2.11   1520 SERVER01",
      "",
    ],
    nextStepDirections: "Remote process data retrieved with PSComputerName tagged. Now query system info using CIM.",
    securityInsight: {
      title: "Lateral Movement via Invoke-Command",
      content: "MITRE ATT&CK T1021.006 — Invoke-Command is identical whether used by defenders or attackers. Defenders audit WinRM connections via Event ID 4624 (Type 3) on target hosts and Event ID 91/168 in the WinRM event log. Script blocks executed remotely are logged with Event ID 4104.",
    },
  },
  {
    stepLabel: "Query System Info via CIM",
    prompt: "PS C:\\Users\\Analyst>",
    command: "Get-CimInstance -ClassName Win32_ComputerSystem | Select-Object Name, Manufacturer, Model, TotalPhysicalMemory",
    explanation: "Get-CimInstance queries WMI/CIM classes. Win32_ComputerSystem returns hardware details. CIM replaced the older Get-WmiObject and uses WS-Management protocol — more secure and firewall-friendly.",
    whyItMatters: "CIM/WMI is used extensively by both sysadmins and attackers. Building baselines of hardware configurations helps detect unauthorized hardware changes. CIM queries also work remotely via -ComputerName.",
    output: [
      "",
      "Name         Manufacturer         Model               TotalPhysicalMemory",
      "----         ------------         -----               -------------------",
      "ANALYST-WS01 Dell Inc.            OptiPlex 7090               17179869184",
      "",
    ],
    nextStepDirections: "16GB RAM confirmed. Now query the OS for last boot time.",
    securityInsight: {
      title: "WMI for Living-off-the-Land",
      content: "MITRE ATT&CK T1047 — WMI/CIM is frequently abused for lateral movement (wmic /node:target process call create cmd.exe), persistence (WMI event subscriptions), and reconnaissance. Monitor WMI activity via Microsoft-Windows-WMI-Activity/Operational event logs.",
    },
  },
  {
    stepLabel: "Get System Uptime via CIM",
    prompt: "PS C:\\Users\\Analyst>",
    command: '$os = Get-CimInstance Win32_OperatingSystem; $uptime = (Get-Date) - $os.LastBootUpTime; Write-Host "Last Boot: $($os.LastBootUpTime) | Uptime: $([int]$uptime.TotalHours) hours"',
    explanation: "Combining CIM queries with date arithmetic gives you system uptime. This one-liner stores the OS object, calculates uptime, and formats a human-readable output.",
    whyItMatters: "System uptime is valuable during incident response — a recent unexpected reboot can indicate a crash caused by a rootkit or attacker activity, or an attacker clearing in-memory artifacts.",
    output: [
      "",
      "Last Boot: 6/9/2026 6:00:00 AM | Uptime: 4 hours",
      "",
    ],
    finalGoal: "You've verified WinRM configuration, identified a security misconfiguration (wildcard TrustedHosts), executed remote commands with Invoke-Command, and queried hardware/OS details using CIM — mastering the remoting and WMI skills used by both defenders and attackers.",
    nextStepDirections: "Lab complete! You've covered the core remoting and WMI/CIM patterns used in enterprise security operations.",
    securityInsight: {
      title: "Uptime as Forensic Indicator",
      content: "MITRE ATT&CK T1070 — Attackers may reboot systems to clear event logs, flush in-memory malware, or apply malicious driver installations. Correlate unexpected reboots (Event ID 1074, 6006) with other suspicious activity. A reboot at 3am on a workstation warrants immediate investigation.",
    },
  },
];

export default function LabPSRemoting() {
  return (
    <LabRunner
      labTitle="PowerShell Remoting & WMI"
      chapterNum={10}
      difficulty="Intermediate"
      tags={["PowerShell", "WinRM", "WMI", "Windows"]}
      terminalLabel="Windows PowerShell 5.1"
      duration={40}
      steps={steps}
      intro={{
        overview: "Your investigation of ANALYST-WS01 has expanded to include a remote server, SERVER01. You need to use PowerShell Remoting and WMI/CIM to query remote systems at scale — the same techniques used in enterprise security operations and, unfortunately, by attackers for lateral movement.",
        objectives: [
          "Verify and audit WinRM service configuration",
          "Check TrustedHosts for security misconfigurations",
          "Run commands on remote systems with Invoke-Command",
          "Query hardware information using Get-CimInstance",
          "Calculate system uptime and interpret it forensically",
        ],
        tools: ["Invoke-Command", "Get-CimInstance", "WinRM", "WSMan Provider", "Win32_ComputerSystem"],
        prerequisites: ["PowerShell Scripting Fundamentals", "Network Configuration & Diagnostics"],
      }}
    />
  );
}