import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Create a Directory",
    prompt: "PS C:\\Users\\Analyst>",
    command: "New-Item -ItemType Directory -Path C:\\Incident\\Evidence",
    explanation: "New-Item creates files and folders. -ItemType Directory creates a folder. The -Path parameter specifies where to create it.",
    whyItMatters: "During incident response, creating organized directory structures for evidence collection prevents contamination and maintains chain of custody.",
    output: [
      "",
      "    Directory: C:\\Incident",
      "",
      "Mode                LastWriteTime         Length Name",
      "----                -------------         ------ ----",
      "d-----         6/9/2026  10:00 AM                Evidence",
      "",
    ],
    nextStepDirections: "Evidence directory created. Now create a text file to log findings.",
    securityInsight: {
      title: "Evidence Collection Structure",
      content: "NIST SP 800-86 — Proper evidence collection requires organized, timestamped directories. Never write to original evidence locations. Always work from copies stored in a controlled directory.",
    },
  },
  {
    stepLabel: "Create a Text File",
    prompt: "PS C:\\Users\\Analyst>",
    command: 'New-Item -ItemType File -Path C:\\Incident\\Evidence\\findings.txt',
    explanation: "New-Item with -ItemType File creates an empty file. You can also use Set-Content or Out-File to create a file with initial content.",
    whyItMatters: "Creating structured log files during an investigation provides an auditable trail of analyst actions and findings.",
    output: [
      "",
      "    Directory: C:\\Incident\\Evidence",
      "",
      "Mode                LastWriteTime         Length Name",
      "----                -------------         ------ ----",
      "-a----         6/9/2026  10:01 AM              0 findings.txt",
      "",
    ],
    nextStepDirections: "File created. Now write some investigation notes to it.",
    securityInsight: {
      title: "Audit Trail Creation",
      content: "CWE-778 Insufficient Logging — Scripts that perform system changes without logging create gaps in audit trails. Always log actions with timestamps using Add-Content or Write-EventLog.",
    },
  },
  {
    stepLabel: "Write Content to File",
    prompt: "PS C:\\Users\\Analyst>",
    command: 'Set-Content C:\\Incident\\Evidence\\findings.txt "Incident started 2026-06-09 10:00 UTC"',
    explanation: "Set-Content writes (or overwrites) content to a file. Use Add-Content to append without overwriting existing data.",
    whyItMatters: "Writing structured findings to files allows you to generate reports and share results with other team members. Always include timestamps in investigation logs.",
    output: [""],
    nextStepDirections: "Content written. Now verify it was saved correctly.",
    securityInsight: {
      title: "Data Integrity in Evidence Files",
      content: "CWE-345 Insufficient Verification — Evidence files can be tampered. After writing critical evidence, generate a hash: Get-FileHash findings.txt -Algorithm SHA256, and store the hash separately.",
    },
  },
  {
    stepLabel: "Copy File to Backup Location",
    prompt: "PS C:\\Users\\Analyst>",
    command: "Copy-Item C:\\Incident\\Evidence\\findings.txt C:\\Incident\\findings.bak",
    explanation: "Copy-Item duplicates a file or directory. Use -Recurse to copy entire directory trees. The original file remains untouched.",
    whyItMatters: "Always maintain backup copies of evidence files before making modifications. This preserves original state and protects against accidental data loss.",
    output: [""],
    nextStepDirections: "Backup created. Now verify both files exist.",
    securityInsight: {
      title: "Evidence Preservation",
      content: "MITRE ATT&CK T1005 — Attackers copy sensitive files to staging directories before exfiltration. Monitoring Copy-Item operations on sensitive paths via file system auditing (Event ID 4663) can detect this.",
    },
  },
  {
    stepLabel: "Verify Files with Get-ChildItem",
    prompt: "PS C:\\Users\\Analyst>",
    command: "Get-ChildItem C:\\Incident -Recurse",
    explanation: "Get-ChildItem with -Recurse lists all files in a directory tree. This confirms both files were created in the correct locations.",
    whyItMatters: "Always verify file operations completed successfully. In scripts, check that expected files exist before proceeding with dependent operations.",
    output: [
      "",
      "    Directory: C:\\Incident",
      "",
      "Mode                LastWriteTime         Length Name",
      "----                -------------         ------ ----",
      "d-----         6/9/2026  10:00 AM                Evidence",
      "-a----         6/9/2026  10:03 AM             39 findings.bak",
      "",
      "    Directory: C:\\Incident\\Evidence",
      "",
      "Mode                LastWriteTime         Length Name",
      "----                -------------         ------ ----",
      "-a----         6/9/2026  10:01 AM             39 findings.txt",
      "",
    ],
    finalGoal: "You've practiced the full file operations workflow: creating directories and files, writing content, copying for backup, and verifying results — essential skills for incident response evidence management.",
    nextStepDirections: "Lab complete! Both files are confirmed in their correct locations.",
    securityInsight: {
      title: "Recursive Directory Enumeration",
      content: "MITRE ATT&CK T1083 — Get-ChildItem -Recurse -Include *.docx,*.xlsx,*.pdf is a common data discovery pattern used by attackers before staging exfiltration. Set file access auditing on sensitive directories.",
    },
  },
];

export default function LabPSFiles() {
  return (
    <LabRunner
      labTitle="File & Directory Operations"
      chapterNum={3}
      difficulty="Beginner"
      tags={["PowerShell", "Windows"]}
      terminalLabel="Windows PowerShell 5.1"
      duration={25}
      steps={steps}
      intro={{
        overview: "A security incident has been reported on ANALYST-WS01. You need to set up a proper evidence collection directory, document your findings, and preserve original files. In this lab you'll use PowerShell file operations to manage evidence like a professional incident responder.",
        objectives: [
          "Create directories with New-Item",
          "Create and write to text files",
          "Copy files to backup locations",
          "Verify file system operations with Get-ChildItem -Recurse",
        ],
        tools: ["New-Item", "Set-Content", "Copy-Item", "Get-ChildItem"],
        prerequisites: ["PowerShell Basics & Navigation"],
      }}
    />
  );
}