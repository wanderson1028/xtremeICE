import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Confirm your location",
    explanation: "You've been given access to a developer's old workstation. Before touching anything, confirm you're in the correct home directory.",
    whyItMatters: "Always verify your working directory before performing file operations — a wrong directory can cause data loss.",
    securityInsight: "Accidental file operations in the wrong directory are a common cause of data loss incidents. Verifying context before acting reflects the 'look before you leap' principle central to secure operations.",
    prompt: "devuser@workstation:~$",
    command: "pwd",
    output: ["/home/devuser"],
    nextStepDirections: "Good — you're in /home/devuser. Now let's see the full state of the directory, including hidden files and permissions.",
  },
  {
    stepLabel: "Survey the directory",
    explanation: "Use ls -la to reveal all files, hidden dotfiles, sizes, and permissions. You need to understand what you're working with before reorganizing.",
    whyItMatters: "A full directory listing prevents surprises. Hidden files and permissions matter before you start moving things around.",
    securityInsight: "The -la flags expose hidden files (dotfiles) which often contain credentials, tokens, or sensitive configs like .env or .aws/credentials. Attackers specifically target dotfiles when they gain shell access.",
    prompt: "devuser@workstation:~$",
    command: "ls -la",
    output: [
      "total 104",
      "drwxr-xr-x 3 devuser devuser  4096 Jun  9 07:12 .",
      "drwxr-xr-x 4 root    root     4096 Jun  1 09:00 ..",
      "-rw-r--r-- 1 devuser devuser   220 Jun  1 09:00 .bash_logout",
      "-rw-r--r-- 1 devuser devuser  3526 Jun  1 09:00 .bashrc",
      "-rw-r--r-- 1 devuser devuser 12288 Jun  5 14:22 app_error.log",
      "-rw-r--r-- 1 devuser devuser  8192 Jun  6 09:45 debug.log",
      "-rw-r--r-- 1 devuser devuser  2048 Jun  7 11:30 notes.txt",
      "-rwxr-xr-x 1 devuser devuser  1024 Jun  8 16:00 deploy.sh",
      "-rwxr-xr-x 1 devuser devuser   512 Jun  8 16:05 cleanup.sh",
      "-rw-r--r-- 1 devuser devuser  4096 Jun  9 07:00 report_june.txt",
    ],
    nextStepDirections: "You can see log files, shell scripts, and text files all mixed together. Create three folders to separate them: Logs, Scripts, and Documents.",
  },
  {
    stepLabel: "Create folder structure",
    explanation: "Create three directories at once using mkdir. The -p flag ensures no error if they already exist.",
    whyItMatters: "A consistent folder structure makes maintenance, backup scheduling, and troubleshooting significantly faster.",
    securityInsight: "Organized directory structures help security teams quickly locate sensitive files during audits and incident response. Disorganized home directories delay triage and can hide malicious files in plain sight.",
    prompt: "devuser@workstation:~$",
    command: "mkdir -p Logs Scripts Documents",
    output: [
      "# mkdir: created directory 'Logs'",
      "# mkdir: created directory 'Scripts'",
      "# mkdir: created directory 'Documents'",
    ],
    nextStepDirections: "Directories created with no errors. Now move the log files into Logs/ using a wildcard.",
  },
  {
    stepLabel: "Move log files",
    explanation: "Use the mv command with a wildcard to move all .log files into the Logs directory in one command.",
    whyItMatters: "Log files grow large over time. Isolating them makes log rotation, archiving, and deletion much safer.",
    securityInsight: "Centralizing logs into a dedicated directory is a prerequisite for log management tools and SIEM ingestion. Scattered logs are frequently missed during security investigations (MITRE T1070 — Indicator Removal).",
    prompt: "devuser@workstation:~$",
    command: "mv *.log Logs/",
    output: [
      "# moved: app_error.log → Logs/app_error.log",
      "# moved: debug.log → Logs/debug.log",
    ],
    nextStepDirections: "Log files moved. Now move the shell scripts into the Scripts/ directory.",
  },
  {
    stepLabel: "Move shell scripts",
    explanation: "Move all .sh files into the Scripts directory. This keeps executable code separate from data.",
    whyItMatters: "Centralizing scripts makes them easier to find, audit for security issues, and include in version control.",
    securityInsight: "Executable scripts in world-readable home directories are an attack surface. Grouping them in Scripts/ makes permission auditing and code review far easier — you only need to inspect one location.",
    prompt: "devuser@workstation:~$",
    command: "mv *.sh Scripts/",
    output: [
      "# moved: deploy.sh → Scripts/deploy.sh",
      "# moved: cleanup.sh → Scripts/cleanup.sh",
    ],
    nextStepDirections: "Scripts organized. One more category — move the text reports and notes into Documents/.",
  },
  {
    stepLabel: "Move documents",
    explanation: "Move all .txt files into the Documents directory to complete the reorganization.",
    whyItMatters: "Separating documentation from code and logs ensures it gets included in the right backup policies.",
    securityInsight: "Document files often contain sensitive information like IP addresses, credentials, or system architecture details. Keeping them in a dedicated folder simplifies DLP (Data Loss Prevention) scanning policies.",
    prompt: "devuser@workstation:~$",
    command: "mv *.txt Documents/",
    output: [
      "# moved: notes.txt → Documents/notes.txt",
      "# moved: report_june.txt → Documents/report_june.txt",
    ],
    nextStepDirections: "All files moved. Before handing off the workstation, verify the structure with a recursive listing.",
  },
  {
    stepLabel: "Verify the final structure",
    explanation: "Use ls -R to recursively list all directories and confirm every file ended up in the right place.",
    whyItMatters: "Always verify your work after file operations. An extra 10 seconds of verification saves hours of recovery later.",
    securityInsight: "Post-change verification is required by security frameworks like CIS Benchmarks and SOC 2. It's also a good habit that catches mistakes before they become incidents — a missed file in the wrong location could expose sensitive data.",
    prompt: "devuser@workstation:~$",
    command: "ls -R",
    output: [
      ".:",
      "Documents  Logs  Scripts",
      "",
      "./Documents:",
      "notes.txt  report_june.txt",
      "",
      "./Logs:",
      "app_error.log  debug.log",
      "",
      "./Scripts:",
      "cleanup.sh  deploy.sh",
    ],
    nextStepDirections: "Everything is in order. The workstation is now organized and ready for the incoming developer.",
    finalGoal: "Home directory fully organized — logs, scripts, and documents separated into a clean, maintainable structure.",
  },
];

export default function LabFilesystem() {
  return (
    <LabRunner
      labTitle="Linux Filesystem Organization"
      chapterNum="1.1"
      difficulty="Beginner"
      tags={["cli", "filesystem", "organization"]}
      duration={25}
      terminalLabel="devuser@workstation:~"
      intro={{
        overview: "SCENARIO: A developer left their workstation in a mess before going on leave. Log files, scripts, and documents are all dumped into the home directory. Your task is to organize everything before the replacement developer arrives on Monday.",
        outcomes: [
          "Navigate and inspect a Linux home directory",
          "Create an organized directory structure",
          "Move files using wildcards",
          "Verify file operations with recursive listing",
        ],
        prerequisites: ["Basic command line familiarity"],
        tools: ["pwd", "ls", "mkdir", "mv"],
      }}
      steps={steps}
    />
  );
}