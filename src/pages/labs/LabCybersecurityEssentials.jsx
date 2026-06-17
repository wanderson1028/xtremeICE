import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Scan network with Nmap",
    explanation: "Run an Nmap scan against the local subnet to discover live hosts and open ports. The -sV flag attempts to identify service versions.",
    whyItMatters: "Network discovery is the first phase of both attack and defense. Knowing what's on your network — and what services are exposed — is fundamental to understanding your attack surface.",
    command: "nmap -sV 192.168.1.0/24",
    prompt: "root@kali:~#",
    output: [
      "Starting Nmap 7.94 at 2026-06-03 10:00 UTC",
      "Nmap scan report for 192.168.1.1",
      "Host is up (0.0021s latency).",
      "PORT     STATE  SERVICE   VERSION",
      "22/tcp   open   ssh       OpenSSH 8.9p1",
      "80/tcp   open   http      Apache httpd 2.4.57",
      "443/tcp  open   https     Apache httpd 2.4.57",
      "",
      "Nmap scan report for 192.168.1.105",
      "PORT     STATE  SERVICE   VERSION",
      "3389/tcp open   rdp       Microsoft Terminal Services",
      "445/tcp  open   smb       Samba smbd 4.17.2",
      "",
      "Nmap done: 256 IP addresses scanned in 12.34 seconds",
    ],
    question: {
      text: "The scan shows 3389/tcp (RDP) open on 192.168.1.105. Why is an internet-facing RDP port considered high risk?",
      options: [
        "RDP uses unencrypted traffic, making all sessions readable on the network",
        "RDP is a common target for brute force and credential stuffing attacks; several critical RDP CVEs (e.g., BlueKeep) allow unauthenticated RCE",
        "RDP only works on Windows XP and is therefore outdated",
        "Port 3389 is always blocked by modern firewalls automatically",
      ],
      correctIndex: 1,
      explanation: "RDP has been one of the most attacked services on the internet for years. BlueKeep (CVE-2019-0708) allows unauthenticated remote code execution — no credentials needed. DejaBlue and other CVEs followed. Even patched RDP is a brute-force magnet; automated bots constantly hammer port 3389 with credential stuffing. Exposed RDP should always be placed behind a VPN or bastion host and never directly internet-facing.",
    },
  },
  {
    stepLabel: "Check open firewall ports with UFW",
    explanation: "Inspect the local firewall rules using UFW (Uncomplicated Firewall). This shows what traffic is allowed in and out of this host.",
    whyItMatters: "Firewall misconfiguration is one of the most common security failures. Regularly auditing firewall rules ensures that no unauthorized ports are exposed to attackers.",
    command: "ufw status verbose",
    prompt: "root@ubuntu:~#",
    output: [
      "Status: active",
      "Logging: on (low)",
      "Default: deny (incoming), allow (outgoing), deny (routed)",
      "",
      "To                         Action      From",
      "--                         ------      ----",
      "22/tcp                     ALLOW IN    Anywhere",
      "80/tcp                     ALLOW IN    Anywhere",
      "443/tcp                    ALLOW IN    Anywhere",
      "8080/tcp                   ALLOW IN    Anywhere      ← REVIEW THIS",
      "",
      "[!] Port 8080 open to all — verify if intentional",
    ],
    question: {
      text: "Port 8080 is open to 'Anywhere'. What is the principle of least privilege as applied to firewall rules, and how would you fix this?",
      options: [
        "Allow all ports by default and only deny known malicious ports",
        "Only allow traffic that is explicitly needed; restrict 8080 to specific source IPs or close it entirely if no service requires it",
        "Block all inbound traffic including 22, 80, and 443 to achieve full security",
        "Firewall rules only matter on internet-facing servers, not internal hosts",
      ],
      correctIndex: 1,
      explanation: "Least privilege means granting only the minimum access required for a legitimate function. For firewalls: default-deny everything, then explicitly allow only what's needed with the narrowest source restrictions possible. Port 8080 open to 'Anywhere' means anyone on the internet can connect — unless there's a known service requiring that, it should be closed or restricted to specific IPs. The principle prevents accidental or malicious exposure of services that have no business being public.",
    },
  },
  {
    stepLabel: "View running processes",
    explanation: "List all running processes with ps aux to identify suspicious or unexpected services running on the system.",
    whyItMatters: "Malware, backdoors, and unauthorized services often appear as suspicious processes. Regular process auditing is a core system hardening practice.",
    command: "ps aux --sort=-%cpu | head -20",
    prompt: "root@ubuntu:~#",
    output: [
      "USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND",
      "root         1  0.0  0.3 169416 12548 ?        Ss   09:00   0:02 /sbin/init",
      "root       423  0.0  0.1  72304  4416 ?        Ss   09:00   0:00 /usr/sbin/sshd",
      "www-data   891  0.1  0.5 429120 21824 ?        Sl   09:01   0:08 apache2",
      "root      1842 12.4  2.1 891234 87654 ?        Rl   09:45   3:12 /tmp/.x11-update  ← SUSPICIOUS",
      "root      1843  8.7  1.8 445566 73210 ?        Sl   09:45   2:21 /tmp/.x11-update",
      "",
      "[!] Process /tmp/.x11-update in /tmp with high CPU — likely malware/miner",
    ],
    question: {
      text: "What two characteristics of /tmp/.x11-update immediately indicate it is malicious?",
      options: [
        "It is owned by www-data and has a low PID number",
        "It runs from /tmp (writable by all users, not a standard binary location) and consumes unusually high CPU (12.4%) — legitimate system binaries run from /usr/bin or /sbin",
        "It has two instances running and was started at 09:45",
        "The process name starts with a dot, which hides it from standard ls commands",
      ],
      correctIndex: 1,
      explanation: "/tmp is world-writable — any user or process can drop files there without elevated permissions, making it a favorite malware staging ground. Standard system binaries live in /usr/bin, /bin, or /sbin. A process running from /tmp with a misleading name (pretending to be an X11 display service) is a classic malware disguise. The high CPU consumption (12.4%) further suggests a crypto miner or active C2 communication loop, not a legitimate background service.",
    },
  },
  {
    stepLabel: "Check for rootkits with rkhunter",
    explanation: "Run rkhunter (Rootkit Hunter) to scan for known rootkits, backdoors, and local exploits on the system.",
    whyItMatters: "Rootkits hide malicious activity at the kernel level and are extremely difficult to detect without specialized tools. rkhunter checks against known rootkit signatures and suspicious system changes.",
    command: "rkhunter --check --sk",
    prompt: "root@ubuntu:~#",
    output: [
      "[ Rootkit Hunter version 1.4.6 ]",
      "",
      "Checking system commands...",
      "  Performing 'strings' command checks",
      "    Checking 'strings' command                        [ OK ]",
      "",
      "Checking for rootkits...",
      "  Performing check of known rootkit files and directories",
      "    55808 Trojan - Variant A                         [ Not found ]",
      "    ADM Worm                                         [ Not found ]",
      "    Xzibit Rootkit                                   [ FOUND! ]",
      "",
      "[!] WARNING: Rootkit signature detected — immediate remediation required",
    ],
    question: {
      text: "A rootkit was found. Why is simply killing the process and deleting the files often NOT sufficient remediation?",
      options: [
        "Rootkits are self-healing and will automatically reinstall themselves from the internet",
        "Rootkits operate at the kernel level and can hide their own files, processes, and network connections — the only reliable remediation is reimaging the system from a known-good state",
        "You need a paid antivirus tool to properly remove rootkits",
        "Killing the process is sufficient; rootkits do not persist across reboots",
      ],
      correctIndex: 1,
      explanation: "Rootkits operate by patching the running kernel — modifying system calls so that when you run 'ls', 'ps', or 'netstat', the kernel returns filtered results that hide rootkit files and processes. Any detection or removal tool running on the compromised kernel is potentially being deceived by the rootkit itself. The only fully trustworthy analysis uses a clean OS (like a forensic boot disk) to read the disk offline. For production systems, reimaging from a known-good baseline is the only way to guarantee a clean state.",
    },
  },
  {
    stepLabel: "Inspect network connections",
    explanation: "Use ss (socket statistics) to list all active network connections and identify any suspicious outbound connections to unknown IPs.",
    whyItMatters: "Malware often establishes persistent connections to C2 (command-and-control) servers. Monitoring outbound connections is a key detection technique.",
    command: "ss -tunp | grep ESTAB",
    prompt: "root@ubuntu:~#",
    output: [
      "Netid State   Recv-Q Send-Q  Local Address:Port   Peer Address:Port Process",
      "tcp   ESTAB   0      0       192.168.1.100:43210  8.8.8.8:443       apache2",
      "tcp   ESTAB   0      0       192.168.1.100:51234  185.220.101.47:4444  /tmp/.x11-update",
      "tcp   ESTAB   0      0       192.168.1.100:22     192.168.1.50:52341  sshd",
      "",
      "[!] /tmp/.x11-update connected to 185.220.101.47:4444 — classic C2 beacon pattern (Metasploit default port)",
    ],
    question: {
      text: "Port 4444 is Metasploit's default reverse shell port. Why do attackers often change their C2 port to 443 instead?",
      options: [
        "Port 443 is faster because it uses UDP instead of TCP",
        "Port 443 (HTTPS) is almost universally allowed outbound through firewalls; C2 traffic on 443 blends with normal web traffic and is much harder to block without breaking the internet",
        "Port 4444 is blocked by all modern operating systems by default",
        "Attackers use 443 because it requires no authentication to connect",
      ],
      correctIndex: 1,
      explanation: "Port 443 (HTTPS) is allowed outbound by virtually every corporate firewall because blocking it would break most of the internet. C2 traffic disguised as HTTPS is nearly impossible to block at the IP/port level without deep packet inspection (DPI) or TLS inspection. Port 4444 is widely known as Metasploit's default and is often blocked. Modern red teams and APT actors always move their C2 to 443 or 80 for exactly this reason.",
    },
  },
  {
    stepLabel: "Kill malicious process and block IP",
    explanation: "Terminate the malicious process and add a firewall rule to block the C2 IP address to cut the attacker's access.",
    whyItMatters: "Containment is the first priority in incident response. Killing the process and blocking C2 communication stops the bleeding while a full investigation begins.",
    command: "kill -9 1842 && ufw deny out to 185.220.101.47",
    prompt: "root@ubuntu:~#",
    output: [
      "[*] Process 1842 (/tmp/.x11-update) terminated",
      "[*] Process 1843 (/tmp/.x11-update) terminated",
      "",
      "Rule added",
      "[*] Outbound traffic to 185.220.101.47 blocked",
      "",
      "[*] CONTAINMENT COMPLETE — C2 communication severed",
      "[!] Next steps: forensic imaging, root cause analysis, patch vulnerability used for initial access",
    ],
    question: {
      text: "After containment, what is the most important next step before putting the server back into production?",
      options: [
        "Run rkhunter one more time to confirm the rootkit is gone, then resume normal operations",
        "Perform root cause analysis to find the initial access vector — without fixing the vulnerability that allowed the intrusion, the attacker can simply return through the same path",
        "Change the server's IP address so the attacker cannot find it again",
        "Install a commercial antivirus product to prevent future infections",
      ],
      correctIndex: 1,
      explanation: "Containment stops the immediate bleeding, but if you return the system to production without finding and fixing the initial entry point, the attacker simply walks back in the same way. Root cause analysis determines how they got in — a phishing email, an unpatched service, a stolen credential — and that vulnerability must be patched or the attack vector closed before the system can be trusted again. Many organizations get re-compromised within days by the same attacker through the same unpatched vulnerability.",
    },
  },
];

const intro = {
  overview: "This foundational lab covers the essential security hardening and incident response skills every cybersecurity professional needs. You'll scan a network, harden a Linux server with firewall rules, detect a rootkit, identify active malware processes, and perform initial containment — exactly as you would respond to a real incident.",
  niceCategory: "Operate and Maintain",
  objectives: [
    "Perform host and network discovery scans using Nmap",
    "Configure UFW firewall rules to enforce the principle of least privilege",
    "Detect installed rootkits and backdoors using rkhunter",
    "Identify malicious processes and suspicious network connections",
    "Perform initial incident containment by terminating processes and blocking C2 IPs",
  ],
  outcomes: [
    "Able to use Nmap for host discovery, port scanning, and service version detection",
    "Understand how host-based firewalls (UFW/iptables) control traffic",
    "Able to run rootkit detection scans and interpret results",
    "Able to identify anomalous processes and network connections during an incident",
    "Understand the initial steps of the NIST incident response lifecycle (Contain, Eradicate, Recover)",
  ],
  prerequisites: [
    "Basic Linux terminal usage (cd, ls, cat, sudo)",
    "No prior security experience required — this is the starting point",
  ],
  tools: [
    "Nmap — network mapper for host discovery and port scanning",
    "UFW (Uncomplicated Firewall) — Linux host-based firewall management",
    "rkhunter — rootkit detection and system integrity checker",
    "ss / netstat — active connection and socket enumeration",
    "kill — process termination for malware containment",
  ],
};

export default function LabCybersecurityEssentials() {
  return (
    <LabRunner
      labTitle="Cybersecurity Essentials"
      chapterNum="4"
      difficulty="Beginner"
      tags={["Nmap", "UFW", "rkhunter", "Incident Response"]}
      terminalLabel="Ubuntu Server 22.04 LTS — root shell"
      duration={45}
      intro={intro}
      steps={steps}
    />
  );
}