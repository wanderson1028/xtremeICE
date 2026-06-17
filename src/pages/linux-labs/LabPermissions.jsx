import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Assess the damage",
    explanation: "A security audit flagged sensitive files on this Ubuntu server as world-readable. Start by listing the current permissions to understand what needs to be fixed.",
    whyItMatters: "You can't fix what you can't see. Understanding the current state before making changes is a core security practice.",
    securityInsight: "World-readable credential files (-rw-rw-rw-) are mapped to CWE-732 (Incorrect Permission Assignment). This is exploited in real attacks where low-privilege users or malware on the same host read secrets to escalate privileges or pivot laterally.",
    prompt: "ubuntu@server:~$",
    command: "ls -la",
    output: [
      "total 56",
      "drwxr-xr-x 3 ubuntu ubuntu 4096 Jun  9 08:00 .",
      "drwxr-xr-x 4 root   root   4096 Jun  1 09:00 ..",
      "-rw-r--r-- 1 ubuntu ubuntu  220 Jun  1 09:00 .bash_logout",
      "-rw-r--r-- 1 ubuntu ubuntu 3526 Jun  1 09:00 .bashrc",
      "-rw-rw-rw- 1 ubuntu ubuntu 1024 Jun  8 22:00 config.env",
      "-rw-rw-rw- 1 ubuntu ubuntu 2048 Jun  8 22:00 db_credentials.txt",
      "-rw-r--r-- 1 ubuntu ubuntu  512 Jun  7 10:00 README.md",
      "drwxrwxrwx 2 ubuntu ubuntu 4096 Jun  8 22:00 scripts/",
    ],
    nextStepDirections: "Both config.env and db_credentials.txt are world-writable (-rw-rw-rw-). That means any user on the system can read and modify them. Fix the credentials file first — restrict it to owner-only read/write.",
  },
  {
    stepLabel: "Restrict the credentials file",
    explanation: "Use chmod 600 to set the config.env file to owner read/write only. Mode 600 means: user=rw, group=none, other=none.",
    whyItMatters: "Credentials files exposed to all users are a critical vulnerability. chmod 600 is the minimum security requirement for any file containing secrets.",
    securityInsight: "The principle of least privilege (PoLP) mandates that files containing secrets be accessible only to the process that needs them. Mode 600 enforces this — even root-level processes accessing the file as another user will be denied at the OS level.",
    prompt: "ubuntu@server:~$",
    command: "chmod 600 config.env",
    output: [
      "# mode of 'config.env' changed from 0666 (-rw-rw-rw-) to 0600 (-rw-------)",
    ],
    nextStepDirections: "config.env is now locked down. Do the same for db_credentials.txt — it contains database passwords and must be restricted to owner-only access.",
  },
  {
    stepLabel: "Restrict the database credentials",
    explanation: "Apply the same chmod 600 to db_credentials.txt to restrict it to owner-only access.",
    whyItMatters: "Database credentials in plaintext are extremely high-risk. Restricting file permissions is a quick win that closes a major attack vector.",
    securityInsight: "Plaintext database credentials exposed via file permissions are a top initial access vector in cloud intrusions (MITRE T1552.001 — Credentials In Files). Attackers use automated tools to scan for 0666/0644 credential files within seconds of gaining a shell.",
    prompt: "ubuntu@server:~$",
    command: "chmod 600 db_credentials.txt",
    output: [
      "# mode of 'db_credentials.txt' changed from 0666 (-rw-rw-rw-) to 0600 (-rw-------)",
    ],
    nextStepDirections: "Both sensitive files are now restricted. The scripts/ directory is also world-writable — fix that next. Mode 750 allows the owner full access and group read/execute, with no access for others.",
  },
  {
    stepLabel: "Secure the scripts directory",
    explanation: "Set the scripts/ directory to chmod 750 — owner has full control, group can read/execute, others have no access.",
    whyItMatters: "A world-writable scripts directory lets any user plant malicious scripts. Locking it to 750 prevents unauthorized modification.",
    securityInsight: "World-writable directories are a classic persistence mechanism (MITRE T1546). Attackers drop a malicious cron script or init file into an open directory, then wait for a privileged process to execute it. Mode 750 closes this off entirely.",
    prompt: "ubuntu@server:~$",
    command: "chmod 750 scripts/",
    output: [
      "# mode of 'scripts/' changed from 0777 (drwxrwxrwx) to 0750 (drwxr-x---)",
    ],
    nextStepDirections: "Scripts directory secured. The README.md is fine as 644 (world-readable is acceptable for documentation). Now verify all permission changes look correct.",
  },
  {
    stepLabel: "Verify the permission changes",
    explanation: "Run ls -la again to confirm all permissions are now correctly set across the directory.",
    whyItMatters: "Post-change verification is non-negotiable in security work. You must confirm the changes took effect before closing the ticket.",
    securityInsight: "Change verification is required by most compliance frameworks (PCI-DSS 10.x, CIS Benchmark). Skipping verification is how misconfigurations slip through — a typo in a chmod command can leave a file still exposed.",
    prompt: "ubuntu@server:~$",
    command: "ls -la",
    output: [
      "total 56",
      "drwxr-xr-x 3 ubuntu ubuntu 4096 Jun  9 08:15 .",
      "drwxr-xr-x 4 root   root   4096 Jun  1 09:00 ..",
      "-rw-r--r-- 1 ubuntu ubuntu  220 Jun  1 09:00 .bash_logout",
      "-rw-r--r-- 1 ubuntu ubuntu 3526 Jun  1 09:00 .bashrc",
      "-rw------- 1 ubuntu ubuntu 1024 Jun  9 08:10 config.env",
      "-rw------- 1 ubuntu ubuntu 2048 Jun  9 08:12 db_credentials.txt",
      "-rw-r--r-- 1 ubuntu ubuntu  512 Jun  7 10:00 README.md",
      "drwxr-x--- 2 ubuntu ubuntu 4096 Jun  9 08:14 scripts/",
    ],
    nextStepDirections: "All permissions are correct. Confirm ownership is properly set for the config file using stat.",
  },
  {
    stepLabel: "Verify file ownership",
    explanation: "Use stat to confirm the ownership and full permission details on the most sensitive file.",
    whyItMatters: "Permissions mean nothing if the wrong user owns the file. Always confirm both owner and permissions together.",
    securityInsight: "Ownership mismatches are an overlooked attack surface. If a service runs as user 'app' but a config file is owned by 'ubuntu', the service may fail to read it — or worse, a misconfigured sudo policy could allow 'ubuntu' to modify secrets the service depends on.",
    prompt: "ubuntu@server:~$",
    command: "stat config.env",
    output: [
      "  File: config.env",
      "  Size: 1024       Blocks: 8      IO Block: 4096   regular file",
      "Device: 8,1        Inode: 131074  Links: 1",
      "Access: (0600/-rw-------)  Uid: ( 1000/ ubuntu)   Gid: ( 1000/ ubuntu)",
      "Access: 2026-06-09 08:10:00.000000000 +0000",
      "Modify: 2026-06-08 22:00:00.000000000 +0000",
      "Change: 2026-06-09 08:10:05.000000000 +0000",
    ],
    nextStepDirections: "Ownership is correct: ubuntu:ubuntu with mode 0600. The security audit findings are fully remediated.",
    finalGoal: "All sensitive files secured — credentials restricted to 600, scripts directory locked to 750, ownership verified.",
  },
];

export default function LabPermissions() {
  return (
    <LabRunner
      labTitle="Linux File Permissions"
      chapterNum="1.2"
      difficulty="Beginner"
      tags={["permissions", "security", "chmod"]}
      duration={25}
      terminalLabel="ubuntu@server:~"
      intro={{
        overview: "SCENARIO: A security audit flagged your Ubuntu server — sensitive config files and credentials are world-readable and world-writable. Any user on the system can read database passwords and modify deployment configs. Your task is to lock everything down before the auditor's follow-up review in 30 minutes.",
        outcomes: [
          "Read and interpret Linux permission strings",
          "Use chmod to restrict file and directory access",
          "Verify ownership with stat",
          "Apply least-privilege principles to sensitive files",
        ],
        prerequisites: ["Basic command line usage"],
        tools: ["ls -la", "chmod", "stat"],
      }}
      steps={steps}
    />
  );
}