import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Confirm the OS",
    explanation: "A fresh Ubuntu server was just provisioned for the development team. First, confirm the OS version and kernel to ensure you're working on the right system.",
    whyItMatters: "Installing packages on the wrong OS version or architecture can break a system. Always confirm before installing software.",
    securityInsight: "Knowing your exact kernel version is critical for patching. Attackers routinely check kernel versions (uname -a) immediately after compromise to identify local privilege escalation exploits (MITRE T1082 — System Information Discovery).",
    prompt: "ubuntu@devserver:~$",
    command: "uname -a",
    output: [
      "Linux devserver 5.15.0-91-generic #101-Ubuntu SMP Tue Nov 14 13:30:08 UTC 2023 x86_64 x86_64 x86_64 GNU/Linux",
    ],
    nextStepDirections: "Confirmed: Ubuntu on x86_64. Before installing anything, update the package index to make sure you're getting the latest available versions.",
  },
  {
    stepLabel: "Update the package index",
    explanation: "Run apt update to refresh the list of available packages from all configured repositories. This does NOT install or upgrade any software.",
    whyItMatters: "Package lists can be outdated by weeks. Without updating, you might install an older version with known vulnerabilities.",
    securityInsight: "Outdated package indexes lead to installing versions with known CVEs. Always run apt update before installs in production — skipping it is one of the most common reasons servers end up running vulnerable software.",
    prompt: "ubuntu@devserver:~$",
    command: "sudo apt update",
    output: [
      "Hit:1 http://archive.ubuntu.com/ubuntu jammy InRelease",
      "Get:2 http://archive.ubuntu.com/ubuntu jammy-updates InRelease [119 kB]",
      "Get:3 http://security.ubuntu.com/ubuntu jammy-security InRelease [110 kB]",
      "Fetched 229 kB in 2s (114 kB/s)",
      "Reading package lists... Done",
      "Building dependency tree... Done",
      "Reading state information... Done",
      "42 packages can be upgraded. Run 'apt list --upgradable' to see them.",
    ],
    nextStepDirections: "Package index is fresh. The team uses Git for version control — install it first.",
  },
  {
    stepLabel: "Install Git",
    explanation: "Install Git using apt install. The -y flag automatically confirms the installation without prompting.",
    whyItMatters: "Git is the foundation of collaborative software development. It must be the first tool installed on any development server.",
    securityInsight: "Git repositories sometimes contain accidentally committed secrets (API keys, passwords). Tools like truffleHog or git-secrets scan for this. Being the admin who installs git means you're also responsible for configuring .gitignore and pre-commit hooks to prevent secrets leaking.",
    prompt: "ubuntu@devserver:~$",
    command: "sudo apt install -y git",
    output: [
      "Reading package lists... Done",
      "Building dependency tree... Done",
      "The following NEW packages will be installed:",
      "  git git-man liberror-perl",
      "0 upgraded, 3 newly installed, 0 to remove and 0 not upgraded.",
      "Need to get 7,428 kB of archives.",
      "Unpacking git (1:2.34.1-1ubuntu1.10) ...",
      "Setting up git (1:2.34.1-1ubuntu1.10) ...",
      "Processing triggers for man-db (2.10.2-1) ...",
    ],
    nextStepDirections: "Git installed successfully. Verify the version to make sure it installed correctly.",
  },
  {
    stepLabel: "Verify Git installation",
    explanation: "Run git --version to confirm Git is installed and accessible in the PATH.",
    whyItMatters: "Installation success messages don't always mean the tool is accessible. Always test the binary directly.",
    securityInsight: "Verifying binaries after install catches supply chain attacks where a malicious package could install a trojanized binary. In critical environments, hash-checking installed binaries against known-good checksums adds another layer of assurance.",
    prompt: "ubuntu@devserver:~$",
    command: "git --version",
    output: ["git version 2.34.1"],
    nextStepDirections: "Git 2.34.1 confirmed. Now install curl — the team uses it for API testing and downloading files.",
  },
  {
    stepLabel: "Install curl",
    explanation: "Install curl, the command-line tool for making HTTP requests and downloading files from URLs.",
    whyItMatters: "curl is used in deployment scripts, health checks, and API testing. It's a standard tool on every Linux server.",
    securityInsight: "curl is also a common tool for data exfiltration and payload delivery (MITRE T1105 — Ingress Tool Transfer). In hardened environments, outbound HTTP/HTTPS access is restricted via firewall rules to limit what curl can reach.",
    prompt: "ubuntu@devserver:~$",
    command: "sudo apt install -y curl",
    output: [
      "Reading package lists... Done",
      "Building dependency tree... Done",
      "The following NEW packages will be installed:",
      "  curl libcurl4",
      "0 upgraded, 2 newly installed, 0 to remove and 0 not upgraded.",
      "Unpacking curl (7.81.0-1ubuntu1.15) ...",
      "Setting up curl (7.81.0-1ubuntu1.15) ...",
    ],
    nextStepDirections: "curl is installed. Finally, install vim — developers need a reliable terminal text editor for config changes.",
  },
  {
    stepLabel: "Install Vim",
    explanation: "Install vim, the powerful terminal-based text editor that is standard on Linux servers.",
    whyItMatters: "When SSH'd into a server with no GUI, vim is often the only way to edit configuration files. Every sysadmin needs it.",
    securityInsight: "Vim has a built-in shell escape (:!command) which has been used in GTFOBins privilege escalation scenarios. If vim is run with sudo, an attacker can use :!/bin/bash to get a root shell. Be aware of which users can run sudo vim.",
    prompt: "ubuntu@devserver:~$",
    command: "sudo apt install -y vim",
    output: [
      "Reading package lists... Done",
      "Building dependency tree... Done",
      "The following NEW packages will be installed:",
      "  vim vim-common vim-runtime",
      "0 upgraded, 3 newly installed, 0 to remove and 0 not upgraded.",
      "Unpacking vim (2:8.2.3995-1ubuntu2.15) ...",
      "Setting up vim (2:8.2.3995-1ubuntu2.15) ...",
    ],
    nextStepDirections: "All three tools installed. Do a final check to confirm everything is registered in the package database.",
  },
  {
    stepLabel: "Confirm all packages installed",
    explanation: "Use dpkg -l to list installed packages and grep to filter for the ones you just installed.",
    whyItMatters: "Confirming packages via dpkg gives you the definitive installed state — not just a command response, but database confirmation.",
    securityInsight: "dpkg is useful in incident response to check when packages were installed. Unexpected recently-installed packages can indicate an attacker installed tools during a breach (MITRE T1072 — Software Deployment Tools). Always compare against a known-good baseline.",
    prompt: "ubuntu@devserver:~$",
    command: "dpkg -l git curl vim",
    output: [
      "Desired=Unknown/Install/Remove/Purge/Hold",
      "| Status=Not/Inst/Conf-files/Unpacked/halF-conf/Half-inst/trig-aWait/Trig-pend",
      "|/ Err?=(none)/Reinst-required (Status,Err: uppercase=bad)",
      "||/ Name           Version                  Architecture Description",
      "+++-==============-========================-============-=================================",
      "ii  curl           7.81.0-1ubuntu1.15       amd64        command line tool for URL transfers",
      "ii  git            1:2.34.1-1ubuntu1.10     amd64        fast, scalable, distributed revision control system",
      "ii  vim            2:8.2.3995-1ubuntu2.15   amd64        Vi IMproved - enhanced vi editor",
    ],
    nextStepDirections: "All packages show status 'ii' — installed and configured. The development server is fully provisioned and ready for the team.",
    finalGoal: "Development server provisioned: git, curl, and vim installed and verified via package database.",
  },
];

export default function LabPackages() {
  return (
    <LabRunner
      labTitle="Linux Package Management"
      chapterNum="1.3"
      difficulty="Beginner"
      tags={["apt", "packages", "provisioning"]}
      duration={30}
      terminalLabel="ubuntu@devserver:~"
      intro={{
        overview: "SCENARIO: A new Ubuntu 22.04 server was just provisioned for the development team. It's a bare-bones install with nothing on it. Your job is to install the required tools before the team's standup at 9am: Git for version control, curl for HTTP requests, and vim for terminal editing.",
        outcomes: [
          "Update the APT package index",
          "Install packages using apt install",
          "Verify installations by running binaries",
          "Confirm package state via dpkg",
        ],
        prerequisites: ["Basic command line usage"],
        tools: ["uname", "apt", "dpkg", "git", "curl", "vim"],
      }}
      steps={steps}
    />
  );
}