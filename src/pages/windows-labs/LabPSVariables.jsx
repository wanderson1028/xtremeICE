import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Create a Variable",
    prompt: "PS C:\\Users\\Analyst>",
    command: '$hostname = $env:COMPUTERNAME',
    explanation: "Variables in PowerShell start with $. Here we store the computer name from an environment variable into our own variable.",
    whyItMatters: "Variables let you store and reuse data in scripts. Using $env: variables accesses Windows environment data without hardcoding values.",
    output: [""],
    nextStepDirections: "Variable stored. Now display its value.",
    securityInsight: {
      title: "Environment Variable Abuse",
      content: "MITRE ATT&CK T1552.001 — Attackers read $env:USERNAME, $env:APPDATA, and $env:TEMP to locate user profiles and staging directories. Monitor environment variable access in suspicious scripts.",
    },
  },
  {
    stepLabel: "Display Variable Value",
    prompt: "PS C:\\Users\\Analyst>",
    command: "Write-Host $hostname",
    explanation: "Write-Host outputs text to the console. It's commonly used for user-facing messages in scripts.",
    whyItMatters: "Understanding how to output variables is fundamental to debugging scripts. Use Write-Output instead of Write-Host when you need pipeline-compatible output.",
    output: ["", "ANALYST-WS01", ""],
    nextStepDirections: "Now let's get a list of processes and store them in a variable.",
    securityInsight: {
      title: "Script Output vs. Pipeline Output",
      content: "CWE-116 — Write-Host bypasses the pipeline and cannot be captured or redirected. This is a common source of script bugs. Prefer Write-Output or just place the object on the pipeline.",
    },
  },
  {
    stepLabel: "Store Process List in Variable",
    prompt: "PS C:\\Users\\Analyst>",
    command: "$procs = Get-Process",
    explanation: "Get-Process returns a collection of Process objects. Storing them in a variable lets you query and filter the same data multiple times without re-running the cmdlet.",
    whyItMatters: "Storing expensive cmdlet results in variables prevents repeated calls. During live incident response, repeatedly calling cmdlets can alter system state.",
    output: [""],
    nextStepDirections: "Processes stored. Now filter to find only high-memory processes.",
    securityInsight: {
      title: "Process Object Properties",
      content: "MITRE ATT&CK T1057 — Attackers enumerate processes to identify security tools (AV, EDR) and kill them. Process objects expose Name, Id, CPU, WS (memory), Path — all useful for threat hunting.",
    },
  },
  {
    stepLabel: "Filter with Where-Object",
    prompt: "PS C:\\Users\\Analyst>",
    command: '$procs | Where-Object { $_.WorkingSet -gt 100MB }',
    explanation: "Where-Object filters pipeline objects. $_ represents the current object. WorkingSet is memory in bytes — 100MB filters for processes using over 100 megabytes.",
    whyItMatters: "Where-Object is one of the most powerful filtering tools in PowerShell. The $_ automatic variable is used throughout the pipeline to reference the current item.",
    output: [
      "",
      "Handles  NPM(K)    PM(K)      WS(K)     CPU(s)     Id  SI ProcessName",
      "-------  ------    -----      -----     ------     --  -- -----------",
      "   1842      89   298456     345120      42.31   1248   1 chrome",
      "    956      45   198234     210048      18.74   2456   1 svchost",
      "",
    ],
    nextStepDirections: "Two high-memory processes found. Now select only the Name and Id columns.",
    securityInsight: {
      title: "Memory-Based Threat Detection",
      content: "CWE-400 Uncontrolled Resource Consumption — Processes with abnormally high memory usage can indicate memory injection attacks (T1055). Baseline normal memory usage and alert on deviations.",
    },
  },
  {
    stepLabel: "Select Specific Properties",
    prompt: "PS C:\\Users\\Analyst>",
    command: '$procs | Select-Object Name, Id, CPU | Sort-Object CPU -Descending',
    explanation: "Select-Object picks specific properties from objects. Sort-Object orders results. Chaining cmdlets with | builds a powerful analysis pipeline.",
    whyItMatters: "Limiting output to relevant properties speeds up analysis. Sorting by CPU descending immediately surfaces the most resource-intensive processes — a key threat hunting technique.",
    output: [
      "",
      "Name                  Id       CPU",
      "----                  --       ---",
      "chrome              1248     42.31",
      "svchost             2456     18.74",
      "powershell          4892      8.12",
      "explorer             988      2.34",
      "",
    ],
    finalGoal: "You've mastered PowerShell variables and the object pipeline — storing data, filtering with Where-Object, and projecting properties with Select-Object.",
    nextStepDirections: "Lab complete! The pipeline is one of PowerShell's greatest strengths for security analysis.",
    securityInsight: {
      title: "Pipeline for Threat Hunting",
      content: "MITRE ATT&CK T1059.001 — Defenders can use the same pipeline techniques attackers use: Get-Process | Where-Object {$_.Path -like '*Temp*'} | Select Name,Path,Id detects processes running from temp directories — a major red flag.",
    },
  },
];

export default function LabPSVariables() {
  return (
    <LabRunner
      labTitle="Variables, Objects & the Pipeline"
      chapterNum={2}
      difficulty="Beginner"
      tags={["PowerShell", "Windows"]}
      terminalLabel="Windows PowerShell 5.1"
      duration={25}
      steps={steps}
      intro={{
        overview: "PowerShell's real power comes from its object pipeline. Unlike bash which passes strings, PowerShell passes rich .NET objects between cmdlets. In this lab you'll learn to store data in variables, filter collections, and project specific properties — the foundation of all PowerShell security scripts.",
        objectives: [
          "Create and use variables to store system data",
          "Display variable values with Write-Host",
          "Store cmdlet output in variables for reuse",
          "Filter object collections with Where-Object",
          "Project specific properties with Select-Object and sort results",
        ],
        tools: ["PowerShell 5.1", "Get-Process", "Where-Object", "Select-Object"],
        prerequisites: ["PowerShell Basics & Navigation"],
      }}
    />
  );
}