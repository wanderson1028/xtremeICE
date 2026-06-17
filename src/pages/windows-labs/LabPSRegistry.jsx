import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Navigate to the Registry Provider",
    prompt: "PS C:\\Users\\Analyst>",
    command: "Set-Location HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion",
    explanation: "PowerShell exposes the Windows Registry as a filesystem provider. HKLM: maps to HKEY_LOCAL_MACHINE. You navigate it just like a directory tree using Set-Location.",
    whyItMatters: "The Registry is where Windows stores critical configuration — and where attackers hide persistence. Being able to navigate it like a filesystem is a powerful investigative skill.",
    output: [
      "",
      "PS HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion>",
      "",
    ],
    nextStepDirections: "You're inside the Registry. Now list the subkeys.",
    securityInsight: {
      title: "Registry as Filesystem",
      content: "MITRE ATT&CK T1112 — Attackers modify registry keys to store configurations, disable security features, or hide data. The PowerShell registry provider lets defenders query and audit registry data at scale without regedit.",
    },
  },
  {
    stepLabel: "List Registry Subkeys",
    prompt: "PS HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion>",
    command: "Get-ChildItem",
    explanation: "Get-ChildItem works on the Registry provider just like on the filesystem. Each registry key appears as a 'directory', and values appear as properties.",
    whyItMatters: "Auditing the subkeys under commonly targeted Registry paths is a standard threat hunting activity. Unexpected keys under Windows\\CurrentVersion are often created by malware.",
    output: [
      "",
      "    Hive: HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion",
      "",
      "Name                           Property",
      "----                           --------",
      "App Paths",
      "Applets",
      "Authentication",
      "Explorer",
      "Run",
      "RunOnce",
      "Uninstall",
      "",
    ],
    nextStepDirections: "The 'Run' key is a critical persistence location. Inspect it.",
    securityInsight: {
      title: "Registry Autorun Keys",
      content: "MITRE ATT&CK T1547.001 — The Run and RunOnce keys execute programs automatically at user login. These are among the most commonly abused persistence mechanisms. Always audit these keys during incident response.",
    },
  },
  {
    stepLabel: "Read the Run Autorun Key",
    prompt: "PS HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion>",
    command: "Get-ItemProperty -Path .\\Run",
    explanation: "Get-ItemProperty reads the values stored in a registry key. The Run key stores programs that launch automatically when any user logs in — a prime persistence location.",
    whyItMatters: "Legitimate software like antivirus and system tools appear here, but so does malware. Any unknown entries in the Run key should be immediately investigated.",
    output: [
      "",
      "SecurityHealth      : C:\\Windows\\System32\\SecurityHealthSystray.exe",
      "WindowsDefender     : C:\\Program Files\\Windows Defender\\MSASCuiL.exe",
      "SuspiciousUpdater   : C:\\Users\\Public\\update.exe",
      "PSPath              : Microsoft.PowerShell.Core\\Registry::HKEY_LOCAL_MACHINE\\...",
      "",
    ],
    nextStepDirections: "ALERT: 'SuspiciousUpdater' is pointing to C:\\Users\\Public\\update.exe — highly suspicious. Investigate further.",
    securityInsight: {
      title: "Suspicious Autorun Entry",
      content: "MITRE ATT&CK T1547.001 — Executables in C:\\Users\\Public, C:\\Temp, or C:\\ProgramData launched from the Run key are major red flags. Legitimate software almost never runs from public/temp directories. This is a high-confidence malware persistence indicator.",
    },
  },
  {
    stepLabel: "Check a Specific Registry Value",
    prompt: "PS HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion>",
    command: 'Get-ItemPropertyValue -Path .\\Run -Name "SuspiciousUpdater"',
    explanation: "Get-ItemPropertyValue retrieves the exact value of a specific registry entry. This gives you the full executable path for investigation or threat intelligence lookup.",
    whyItMatters: "Getting the exact binary path from an autorun entry allows you to hash the executable, look it up in VirusTotal, or check if it exists on other systems in the environment.",
    output: [
      "",
      "C:\\Users\\Public\\update.exe",
      "",
    ],
    nextStepDirections: "Path confirmed. Now remove this malicious persistence entry.",
    securityInsight: {
      title: "IOC: Executable Path",
      content: "MITRE ATT&CK T1036 — Masquerading: the filename 'update.exe' sounds legitimate but the location (C:\\Users\\Public) is suspicious. Legitimate Windows updates run from C:\\Windows\\System32 or C:\\Windows\\SoftwareDistribution.",
    },
  },
  {
    stepLabel: "Remove Malicious Registry Entry",
    prompt: "PS HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion>",
    command: 'Remove-ItemProperty -Path .\\Run -Name "SuspiciousUpdater"',
    explanation: "Remove-ItemProperty deletes a specific value from a registry key. This removes the persistence mechanism, preventing the malware from launching on next login.",
    whyItMatters: "Registry cleanup is a key remediation step. After removing a persistence entry, always verify it's gone, hash and preserve the binary as evidence, and scan for other persistence locations.",
    output: [""],
    finalGoal: "You navigated the Registry as a filesystem, enumerated autorun keys, identified a malicious persistence entry, extracted the IOC, and removed the persistence mechanism — a complete Registry-based threat hunting and remediation workflow.",
    nextStepDirections: "Lab complete! The malicious autorun entry has been removed. Remember to preserve and analyze the binary at C:\\Users\\Public\\update.exe.",
    securityInsight: {
      title: "Registry Persistence Remediation",
      content: "NIST SP 800-83 — After removing Registry persistence: (1) Hash the binary with Get-FileHash, (2) Check other autorun locations (HKCU:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run, Startup folder), (3) Search for the binary on other hosts, (4) Document everything for the incident report.",
    },
  },
];

export default function LabPSRegistry() {
  return (
    <LabRunner
      labTitle="Windows Registry Operations"
      chapterNum={7}
      difficulty="Intermediate"
      tags={["PowerShell", "Registry", "Windows"]}
      terminalLabel="Windows PowerShell 5.1"
      duration={35}
      steps={steps}
      intro={{
        overview: "An EDR alert flagged suspicious persistence on ANALYST-WS01. You need to investigate the Windows Registry autorun keys to find and remove the malware's persistence mechanism. In this lab you'll use PowerShell's Registry provider to navigate, read, and modify the Windows Registry like a threat hunter.",
        objectives: [
          "Navigate the Registry using the PowerShell Registry provider",
          "List Registry subkeys with Get-ChildItem",
          "Read autorun key values with Get-ItemProperty",
          "Extract specific values with Get-ItemPropertyValue",
          "Remove malicious persistence entries",
        ],
        tools: ["Get-ItemProperty", "Get-ItemPropertyValue", "Remove-ItemProperty", "HKLM: Provider"],
        prerequisites: ["PowerShell Scripting Fundamentals"],
      }}
    />
  );
}