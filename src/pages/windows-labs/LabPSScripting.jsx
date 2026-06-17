import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Check Execution Policy",
    prompt: "PS C:\\Users\\Analyst>",
    command: "Get-ExecutionPolicy -List",
    explanation: "Get-ExecutionPolicy shows the current script execution policy at each scope. Restricted blocks all scripts; RemoteSigned is the recommended policy for most environments.",
    whyItMatters: "Execution policy is a defense-in-depth control. While it can be bypassed, it raises the bar for accidental or unskilled script execution. Always document and justify deviations from Restricted.",
    output: [
      "",
      "        Scope ExecutionPolicy",
      "        ----- ---------------",
      "MachinePolicy       Undefined",
      "   UserPolicy       Undefined",
      "      Process       Undefined",
      "  CurrentUser    RemoteSigned",
      " LocalMachine    RemoteSigned",
      "",
    ],
    nextStepDirections: "RemoteSigned is in place. Now create a reusable function.",
    securityInsight: {
      title: "Execution Policy Bypass",
      content: "MITRE ATT&CK T1059.001 — Common bypasses: powershell -ExecutionPolicy Bypass, or encoding scripts in Base64. Execution policy is NOT a security boundary — use AppLocker/WDAC for true script control. Log all policy changes via Event ID 4103.",
    },
  },
  {
    stepLabel: "Define a Reusable Function",
    prompt: "PS C:\\Users\\Analyst>",
    command: "function Get-SystemInfo { [PSCustomObject]@{ Hostname = $env:COMPUTERNAME; OS = (Get-CimInstance Win32_OperatingSystem).Caption; Uptime = (Get-Date) - (gcim Win32_OperatingSystem).LastBootUpTime } }",
    explanation: "Functions in PowerShell wrap reusable logic. This function creates a custom object with hostname, OS, and uptime — information useful for rapid system triage.",
    whyItMatters: "Reusable functions prevent code duplication in scripts. PSCustomObject lets you create structured output that works natively with the PowerShell pipeline.",
    output: [""],
    nextStepDirections: "Function defined. Call it to see the output.",
    securityInsight: {
      title: "Information Gathering Functions",
      content: "MITRE ATT&CK T1082 — System information discovery is one of the first things attackers do post-compromise. Functions like this are used both by defenders for baselining and attackers for reconnaissance. Monitor Get-CimInstance calls in script block logs.",
    },
  },
  {
    stepLabel: "Call the Function",
    prompt: "PS C:\\Users\\Analyst>",
    command: "Get-SystemInfo",
    explanation: "Simply typing the function name calls it. The output is a PSCustomObject which can be piped to Select-Object, ConvertTo-Json, or Export-Csv for reporting.",
    whyItMatters: "Functions produce consistent, structured output every time they're called. This is the foundation of automation — collect the same data from many systems with a single function call.",
    output: [
      "",
      "Hostname : ANALYST-WS01",
      "OS       : Windows 10 Enterprise",
      "Uptime   : 2.03:47:22.1458320",
      "",
    ],
    nextStepDirections: "Clean output. Now write a script with a loop to process multiple items.",
    securityInsight: {
      title: "Structured Output for SIEM",
      content: "NIST SP 800-92 — Security tools consume structured data better than plain text. Add ConvertTo-Json | Out-File to your functions to generate SIEM-ingestible output. This enables automated ingestion of system baseline data.",
    },
  },
  {
    stepLabel: "Use a ForEach Loop",
    prompt: "PS C:\\Users\\Analyst>",
    command: 'foreach ($svc in @("WinDefend","EventLog","Netlogon")) { $s = Get-Service $svc; Write-Host "$($s.Name): $($s.Status)" }',
    explanation: "ForEach loops iterate over collections. Here we check the status of three critical security services. The @() creates an array of service names to iterate over.",
    whyItMatters: "Loops let you apply the same check to multiple items — checking all critical services, scanning multiple hosts, or processing a list of IOCs. This scales manual checks into automated audits.",
    output: [
      "",
      "WinDefend: Running",
      "EventLog: Running",
      "Netlogon: Running",
      "",
    ],
    nextStepDirections: "All three critical services are running. Now add error handling to a command.",
    securityInsight: {
      title: "Critical Service Monitoring",
      content: "MITRE ATT&CK T1562.001 — Attackers disable security tools like WinDefend (Windows Defender) and EventLog to avoid detection. Monitor Event ID 7036 (service state change) and alert when these specific services stop.",
    },
  },
  {
    stepLabel: "Add Try-Catch Error Handling",
    prompt: "PS C:\\Users\\Analyst>",
    command: 'try { Get-Service -Name "FakeService" -ErrorAction Stop } catch { Write-Host "ERROR: $($_.Exception.Message)" }',
    explanation: "Try-Catch blocks handle errors gracefully. -ErrorAction Stop converts a non-terminating error into a terminating one that the catch block can handle.",
    whyItMatters: "Production scripts must handle errors gracefully. Without error handling, a single failed cmdlet can crash an entire automation run. Always use -ErrorAction Stop in try blocks.",
    output: [
      "",
      "ERROR: No service with service name 'FakeService' was found.",
      "",
    ],
    finalGoal: "You've built a PowerShell scripting foundation: checked execution policy, written functions, called them, used loops for batch operations, and handled errors with try-catch — everything needed for production-quality security automation scripts.",
    nextStepDirections: "Lab complete! These patterns form the foundation of all production PowerShell security scripts.",
    securityInsight: {
      title: "Error Handling in Security Scripts",
      content: "CWE-391 Unchecked Error Condition — Scripts that don't handle errors can silently skip critical security checks, creating false confidence. Always validate that critical operations succeeded and log failures to a SIEM or alert channel.",
    },
  },
];

export default function LabPSScripting() {
  return (
    <LabRunner
      labTitle="PowerShell Scripting Fundamentals"
      chapterNum={6}
      difficulty="Intermediate"
      tags={["PowerShell", "Scripting", "Windows"]}
      terminalLabel="Windows PowerShell 5.1"
      duration={40}
      steps={steps}
      intro={{
        overview: "Your team needs reusable automation scripts for daily system health checks and incident triage. In this lab you'll learn the scripting fundamentals that separate ad-hoc commands from professional security automation: execution policy, functions, loops, and error handling.",
        objectives: [
          "Understand and audit PowerShell execution policy",
          "Define reusable functions with PSCustomObject output",
          "Call functions and use their output",
          "Iterate over collections with ForEach loops",
          "Handle errors gracefully with Try-Catch",
        ],
        tools: ["Get-ExecutionPolicy", "PSCustomObject", "ForEach", "Try-Catch", "Get-CimInstance"],
        prerequisites: ["Variables & the Pipeline", "Process & Service Management"],
      }}
    />
  );
}