import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Check PowerShell Version",
    prompt: "PS C:\\Users\\Analyst>",
    command: "$PSVersionTable.PSVersion",
    explanation: "Before running any scripts, confirm which version of PowerShell is installed. Different versions support different cmdlets and features.",
    whyItMatters: "Older PowerShell versions (v2) lack security features like script block logging. Attackers often downgrade to v2 to evade detection.",
    output: [
      "",
      "Major  Minor  Build  Revision",
      "-----  -----  -----  --------",
      "5      1      19041  4522",
      "",
    ],
    nextStepDirections: "Good. You're running PowerShell 5.1. Now let's explore the filesystem.",
    securityInsight: {
      title: "PowerShell Version Downgrade",
      content: "MITRE ATT&CK T1059.001 — Attackers invoke powershell.exe -Version 2 to bypass AMSI and script block logging. Always enforce PSVersion ≥ 5.1 and disable v2 via Remove-WindowsFeature.",
    },
  },
  {
    stepLabel: "List Current Directory",
    prompt: "PS C:\\Users\\Analyst>",
    command: "Get-ChildItem",
    explanation: "Get-ChildItem (alias: ls, dir) lists files and folders in the current directory. It returns objects, not just text.",
    whyItMatters: "Understanding directory contents is the first step in any investigation. Unusual files in user directories are a common IOC.",
    output: [
      "",
      "    Directory: C:\\Users\\Analyst",
      "",
      "Mode                LastWriteTime         Length Name",
      "----                -------------         ------ ----",
      "d-r---         6/9/2026   9:00 AM                Desktop",
      "d-r---         6/9/2026   9:00 AM                Documents",
      "d-r---         6/9/2026   9:00 AM                Downloads",
      "-a----         6/9/2026   8:55 AM           2048 report.txt",
      "",
    ],
    nextStepDirections: "You can see the directory listing. Now navigate into the Documents folder.",
    securityInsight: {
      title: "Directory Enumeration",
      content: "MITRE ATT&CK T1083 — Adversaries enumerate file systems to identify sensitive data. Get-ChildItem -Recurse -Include *.txt,*.docx is a common attacker pattern used post-compromise.",
    },
  },
  {
    stepLabel: "Navigate to Documents",
    prompt: "PS C:\\Users\\Analyst>",
    command: "Set-Location Documents",
    explanation: "Set-Location (alias: cd) changes the current working directory. PowerShell uses the same concept as a filesystem provider.",
    whyItMatters: "Knowing how to navigate directories quickly is essential during incident response when time is critical.",
    output: [
      "",
    ],
    nextStepDirections: "You're now in the Documents folder. Let's read a file.",
    securityInsight: {
      title: "Working Directory Awareness",
      content: "CWE-22 Path Traversal — Scripts that use relative paths without validation are vulnerable to path traversal. Always use absolute paths ($env:USERPROFILE) in production scripts.",
    },
  },
  {
    stepLabel: "Read a File",
    prompt: "PS C:\\Users\\Analyst\\Documents>",
    command: "Get-Content .\\notes.txt",
    explanation: "Get-Content reads the contents of a file and returns each line as a string object in the pipeline.",
    whyItMatters: "Incident responders frequently read log files and notes left by attackers. Get-Content -Tail 50 reads the last 50 lines — useful for large logs.",
    output: [
      "",
      "Analyst Notes - Incident 2026-06-09",
      "Suspicious process: svchost.exe spawned cmd.exe",
      "Parent PID: 1248  Child PID: 4892",
      "Time: 08:47 UTC",
      "",
    ],
    nextStepDirections: "You found analyst notes about a suspicious process. Let's check where we currently are.",
    securityInsight: {
      title: "File Content as Evidence",
      content: "MITRE ATT&CK T1005 — Attackers read local files to collect sensitive data. Monitoring file access via Get-WinEvent with Event ID 4663 (object access) can detect unauthorized reads.",
    },
  },
  {
    stepLabel: "Show Full Current Path",
    prompt: "PS C:\\Users\\Analyst\\Documents>",
    command: "Get-Location",
    explanation: "Get-Location (alias: pwd) returns the current working directory as a PathInfo object, showing your full path in the filesystem.",
    whyItMatters: "Always know where you are when scripting. Relative paths behave differently depending on the working directory, which can cause scripts to fail or operate on the wrong files.",
    output: [
      "",
      "Path",
      "----",
      "C:\\Users\\Analyst\\Documents",
      "",
    ],
    nextStepDirections: "Lab complete! You've covered core navigation cmdlets used in every Windows investigation.",
    finalGoal: "You can now navigate the Windows filesystem, list directory contents, read files, and confirm your working directory — foundational skills for any PowerShell-based investigation.",
    securityInsight: {
      title: "Filesystem Situational Awareness",
      content: "CWE-73 External Control of File Name — Scripts that build paths from user input without validation can be manipulated. Always validate and canonicalize paths using [System.IO.Path]::GetFullPath().",
    },
  },
];

export default function LabPSBasics() {
  return (
    <LabRunner
      labTitle="PowerShell Basics & Navigation"
      chapterNum={1}
      difficulty="Beginner"
      tags={["PowerShell", "Windows"]}
      terminalLabel="Windows PowerShell 5.1"
      duration={20}
      steps={steps}
      intro={{
        overview: "A new Windows workstation has been provisioned for your analyst team. Before diving into investigations, you need to get comfortable with PowerShell's core navigation cmdlets — the same tools you'll use daily for incident response and system auditing.",
        objectives: [
          "Verify the PowerShell version installed on the system",
          "List files and directories using Get-ChildItem",
          "Navigate between directories with Set-Location",
          "Read file contents using Get-Content",
          "Confirm working directory with Get-Location",
        ],
        tools: ["PowerShell 5.1", "Windows Filesystem"],
        prerequisites: ["Basic Windows familiarity"],
      }}
    />
  );
}