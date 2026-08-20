import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Execute the NIST Incident Response Lifecycle",
    explanation: "NIST SP 800-61 defines the incident response lifecycle: Preparation, Detection & Analysis, Containment, Eradication, Recovery, and Post-Incident Activity (lessons learned). Review each phase.",
    whyItMatters: "Security+ tests your ability to match an activity to its IR phase. Knowing the order matters — you must contain before you eradicate, and you must detect before you can contain. Post-incident activity (lessons learned) closes the loop and improves future responses.",
    command: "irctl lifecycle --framework nist --output table",
    prompt: "analyst@secplus:~$",
    output: [
      "---------------------------------------------------------------",
      "|  Phase                |  Key Activity            |  Order  |",
      "+-----------------------+--------------------------+---------+",
      "|  Preparation         |  Train, build runbooks   |  1      |",
      "|  Detection & Analysis|  Identify, triage        |  2      |",
      "|  Containment         |  Isolate, limit spread   |  3      |",
      "|  Eradication         |  Remove threat           |  4      |",
      "|  Recovery            |  Restore, validate       |  5      |",
      "|  Post-Incident       |  Lessons learned         |  6      |",
      "+-----------------------+--------------------------+---------+",
    ],
    question: {
      text: "A SOC analyst identifies a compromised server spreading malware to other hosts. They immediately disconnect the server from the network. Which NIST IR phase does this action belong to?",
      options: [
        "Detection & Analysis — they are still investigating",
        "Containment — disconnecting the server isolates the threat and limits its spread to other hosts",
        "Eradication — they are removing the malware",
        "Recovery — they are restoring the server",
      ],
      correctIndex: 1,
      explanation: "Disconnecting the compromised server is a containment action. Containment's goal is to stop the spread and limit damage — isolating the host prevents the malware from reaching other systems. Eradication comes next (removing the malware from the isolated server), followed by recovery (restoring the server to normal operation). Detection & Analysis already occurred (they identified the compromise). Containment is often the most time-critical phase because delay means more lateral movement and data loss.",
    },
  },
  {
    stepLabel: "Configure Log Monitoring",
    explanation: "Log monitoring collects and reviews system and security logs. Key log sources include: system logs (syslog), auth logs, application logs, firewall logs, and IDS/IPS alerts. Configure centralized log collection.",
    whyItMatters: "Security+ tests your knowledge of log sources and what each reveals. Auth logs show login attempts; firewall logs show blocked/allowed traffic; IDS logs show detected attacks. Centralized collection (SIEM) enables correlation across sources — a single failed login is noise, but 1,000 failures in a minute is an attack.",
    command: "logctl configure --sources all --output table",
    prompt: "analyst@secplus:~$",
    output: [
      "---------------------------------------------------------------",
      "|  Log Source       |  Facility     |  What It Reveals        |",
      "+-------------------+---------------+-------------------------+",
      "|  /var/log/auth    |  PAM/SSH      |  Login attempts, sudo   |",
      "|  /var/log/syslog  |  System       |  Service starts/stops   |",
      "|  /var/log/firewall|  iptables     |  Blocked/allowed traffic|",
      "|  /var/log/audit   |  auditd       |  File changes, syscall  |",
      "|  /var/log/app     |  Application  |  Errors, user actions    |",
      "|  IDS alerts       |  Suricata     |  Detected attack sigs   |",
      "+-------------------+---------------+-------------------------+",
      "[*] Forwarding all sources to SIEM at 10.0.0.100:514/udp",
    ],
    question: {
      text: "A security analyst reviews auth logs and sees 500 failed SSH login attempts from a single IP in two minutes, followed by a successful login. What is the most likely attack, and what should the analyst do first?",
      options: [
        "A user forgot their password; reset the password for them",
        "A brute-force attack succeeded — the analyst should contain the threat by blocking the IP and investigating the compromised account immediately",
        "A network misconfiguration; restart the SSH service",
        "Normal behavior; no action needed",
      ],
      correctIndex: 1,
      explanation: "500 failed attempts followed by a success is a classic brute-force attack that found a valid credential. The analyst should immediately contain the threat: block the source IP, disable or lock the compromised account, and check what the attacker accessed after login. This is Detection & Analysis (identifying the pattern) flowing into Containment (blocking the IP and account). The high volume in a short time is the key indicator — a single failed login is normal, but 500 in two minutes is an attack pattern that log monitoring and SIEM correlation are designed to catch.",
    },
  },
  {
    stepLabel: "Build SIEM Detection Rules",
    explanation: "SIEM (Security Information and Event Management) platforms aggregate logs and apply correlation rules to detect threats. Rules define patterns that trigger alerts — e.g., multiple failed logins, unusual data transfer, or known IOCs. Review common detection rules.",
    whyItMatters: "Security+ covers SIEM as a core security operations tool. Understanding how correlation rules work — combining multiple log sources to identify attacks — is an exam topic. A single failed login is noise; correlating it with a successful login from a new location is a signal.",
    command: "siemctl rules --list --output table",
    prompt: "analyst@secplus:~$",
    output: [
      "---------------------------------------------------------------",
      "|  Rule Name           |  Trigger                  |  Severity |",
      "+----------------------+---------------------------+-----------+",
      "|  BruteForceSSH       |  >10 fails in 60s         |  High     |",
      "|  OffHoursAccess      |  Login outside work hours |  Medium   |",
      "|  DataExfil           |  >1GB outbound off-hours  |  Critical |",
      "|  ImpossibleTravel    |  2 logins, diff geo, <1h  |  High     |",
      "|  MalwareIOC          |  Connection to known C2   |  Critical |",
      "|  PrivEsc             |  User gains admin rights  |  High     |",
      "+----------------------+---------------------------+-----------+",
    ],
    question: {
      text: "A user logs in from New York at 9:00 AM and then from Tokyo at 9:15 AM the same day. Which SIEM rule would detect this, and what attack does it indicate?",
      options: [
        "BruteForceSSH — too many login attempts",
        "ImpossibleTravel — two logins from geographically distant locations within a time frame that makes physical travel impossible, indicating a stolen credential being used from a second location",
        "OffHoursAccess — logging in outside work hours",
        "DataExfil — large data transfer",
      ],
      correctIndex: 1,
      explanation: "The ImpossibleTravel rule detects when a single account logs in from two locations that are too far apart for the user to physically travel between in the elapsed time. New York to Tokyo in 15 minutes is physically impossible, so the second login is almost certainly an attacker using stolen credentials. This is a powerful correlation rule because it uses context (geography + time) that a single log source cannot provide. The response is to challenge the second session (require MFA) and investigate whether the credentials were phished or leaked.",
    },
  },
  {
    stepLabel: "Automate Security Operations",
    explanation: "Security automation uses SOAR (Security Orchestration, Automation, and Response) to automate repetitive tasks: blocking IPs, isolating hosts, enriching alerts, and running playbooks. Review automation use cases.",
    whyItMatters: "Security+ covers SOAR and automation as force multipliers for understaffed security teams. Automation handles the volume of alerts — a human cannot manually investigate thousands of alerts per day. Playbooks ensure consistent, fast responses to common incident types.",
    command: "soarctl playbooks --list --output table",
    prompt: "analyst@secplus:~$",
    output: [
      "---------------------------------------------------------------",
      "|  Playbook           |  Trigger              |  Actions      |",
      "+---------------------+-----------------------+---------------+",
      "|  AutoBlockIP        |  IDS alert (High)     |  Block IP @FW |",
      "|  IsolateHost        |  EDR malware detected |  Network iso  |",
      "|  EnrichAlert        |  Any alert            |  Add threat   |",
      "|  DisableAccount     |  ImpossibleTravel     |  Lock + notify|",
      "|  QuarantineEmail    |  Phishing reported    |  Remove + block|",
      "|  PatchCritical      |  CVE CVSS >= 9.0      |  Auto-deploy  |",
      "+---------------------+-----------------------+---------------+",
    ],
    question: {
      text: "A SOAR platform automatically blocks an IP address at the firewall when the IDS generates a high-severity alert. What is the primary benefit of this automation?",
      options: [
        "It makes the firewall faster",
        "It reduces response time from minutes to seconds, ensuring the threat is contained before a human analyst even sees the alert",
        "It eliminates the need for security analysts entirely",
        "It prevents all future attacks from that IP forever",
      ],
      correctIndex: 1,
      explanation: "The primary benefit of SOAR automation is speed and consistency. A human analyst might take minutes to see the alert, investigate, and manually block the IP — during which the attacker continues their activity. Automation blocks the IP in seconds, containing the threat immediately. It does not replace analysts (they handle complex investigations, tuning, and decisions automation cannot make), and it does not prevent all future attacks (the attacker may use a different IP). Automation is a force multiplier: it handles the repetitive, time-sensitive tasks so analysts can focus on higher-value work.",
    },
  },
  {
    stepLabel: "Manage Identity and Access Operations",
    explanation: "IAM operations include provisioning (creating accounts), deprovisioning (removing access), access reviews (periodic recertification), and privilege management (least privilege, PAM for admin accounts). Review IAM lifecycle stages.",
    whyItMatters: "Security+ covers the IAM lifecycle as part of security operations. Orphaned accounts (from departed employees who were never deprovisioned) are a major insider risk. Periodic access reviews ensure users only have the access they need — a core compliance requirement.",
    command: "iamctl lifecycle --output table",
    prompt: "analyst@secplus:~$",
    output: [
      "---------------------------------------------------------------",
      "|  Stage           |  Activity                  |  Frequency  |",
      "+------------------+----------------------------+-------------+",
      "|  Provisioning    |  Create account, assign   |  On hire    |",
      "|  Modification    |  Change role/permissions   |  On change  |",
      "|  Access Review   |  Recertify permissions     |  Quarterly  |",
      "|  Deprovisioning  |  Disable + remove access   |  On departure|",
      "|  Privilege Mgmt  |  PAM, just-in-time access  |  Continuous |",
      "|  Account Reconcil|  Compare HR vs. IAM        |  Monthly    |",
      "+------------------+----------------------------+-------------+",
    ],
    question: {
      text: "An employee leaves the company, but their account is not disabled for three months because the manager forgot to submit the deprovisioning request. What type of risk does this create, and what process would have prevented it?",
      options: [
        "No risk — the employee no longer has their laptop",
        "Orphaned account risk — a former employee retains access, creating an insider threat; an automated HR-to-IAM reconciliation process that compares active employees against active accounts would have caught and disabled the account",
        "A brute-force risk — attackers will guess the departed employee's password",
        "A compliance risk only — there is no security impact",
      ],
      correctIndex: 1,
      explanation: "An orphaned account is a major security risk. The former employee (or anyone who compromises their credentials) retains access to company systems and data for months. This is a classic insider threat vector. The fix is automated account reconciliation: regularly compare the HR system's active employee list against the IAM system's active accounts. Any account without a matching active employee should be automatically disabled. This process, combined with immediate deprovisioning on departure, eliminates orphaned accounts. Access reviews (quarterly recertification) also catch these, but reconciliation is faster and more reliable.",
    },
  },
  {
    stepLabel: "Conduct Threat Hunting",
    explanation: "Threat hunting is the proactive search for threats that have evaded automated detection. Unlike alert-driven monitoring (reactive), hunting uses hypotheses: 'If an attacker used technique X, what evidence would they leave?' Review the hunting process.",
    whyItMatters: "Security+ covers threat hunting as a proactive security operations activity. Hunters assume the adversary is already inside and look for indicators of compromise (IOCs) and tactics, techniques, and procedures (TTPs). This catches APTs that live off the land and evade signature-based detection.",
    command: "huntctl methodology --output table",
    prompt: "analyst@secplus:~$",
    output: [
      "---------------------------------------------------------------",
      "|  Step           |  Activity                     |  Tool     |",
      "+-----------------+-------------------------------+-----------+",
      "|  1. Hypothesize |  'Attacker used living-off-land'|  MITRE  |",
      "|  2. Collect     |  Pull logs, EDR, netflow       |  SIEM     |",
      "|  3. Analyze     |  Look for anomalies/TTPs       |  Analytics|",
      "|  4. Investigate |  Pivot on IOCs, trace origin   |  Threat   |",
      "|  5. Document    |  Record findings, update detect|  Report   |",
      "|  6. Improve     |  Create new detection rules    |  SIEM     |",
      "+-----------------+-------------------------------+-----------+",
    ],
    question: {
      text: "A threat hunter forms the hypothesis: 'An APT is using PowerShell to execute encoded commands for persistence.' What type of evidence should the hunter look for, and why is this threat hard to detect with signatures?",
      options: [
        "Look for antivirus alerts — signatures always catch PowerShell attacks",
        "Look for anomalous PowerShell execution patterns (encoded commands, unusual parent processes, off-hours activity) — living-off-the-land attacks use legitimate tools, so they do not trigger signature-based detection and require behavioral analysis",
        "Look for new software installations — APTs always install new tools",
        "Look for network port scans — all APTs port scan first",
      ],
      correctIndex: 1,
      explanation: "Living-off-the-land (LotL) attacks use built-in administrative tools like PowerShell, WMI, and certutil — tools that are legitimate and present on every Windows system. Signature-based detection cannot flag them because the tools themselves are not malicious. The hunter must look for behavioral anomalies: PowerShell running encoded commands (-enc), PowerShell spawned by an unusual parent process (not the normal interactive shell), or PowerShell executing outside business hours. This is why threat hunting is necessary — automated tools miss LotL attacks, and only a human analyst with a hypothesis can find the subtle behavioral indicators.",
    },
  },
];

const intro = {
  overview: "This lab covers CompTIA Security+ (SY0-701) Domain 4: Security Operations. You'll execute the NIST incident response lifecycle, configure log monitoring, build SIEM detection rules, automate responses with SOAR, manage the IAM lifecycle, and conduct proactive threat hunting through hands-on CLI exercises.",
  niceCategory: "Security Operations",
  objectives: [
    "Execute the NIST SP 800-61 incident response lifecycle phases in order",
    "Configure centralized log monitoring across multiple log sources",
    "Build SIEM correlation rules to detect brute-force, impossible travel, and data exfiltration",
    "Apply SOAR automation to reduce incident response time",
    "Manage the IAM lifecycle including provisioning, access reviews, and deprovisioning",
    "Conduct hypothesis-driven threat hunting for living-off-the-land attacks",
  ],
  outcomes: [
    "Able to match security activities to their NIST IR phase",
    "Can identify which log source reveals a given type of activity",
    "Understands how SIEM correlation rules combine signals to detect attacks",
    "Able to design SOAR playbooks for common incident types",
    "Can identify and prevent orphaned account risks through reconciliation",
    "Understands why living-off-the-land attacks evade signatures and require hunting",
  ],
  prerequisites: [
    "Completion of Security+ Domains 1-3 (recommended)",
    "Familiarity with networking and operating system fundamentals",
  ],
  tools: [
    "SIEM Platform — centralized log aggregation and correlation",
    "SOAR Engine — security orchestration and automated response",
    "EDR/Threat Hunting Toolkit — endpoint detection and proactive hunting",
  ],
};

export default function LabSecPlusDomain4() {
  return (
    <LabRunner
      labTitle="Security+ Domain 4: Security Operations"
      chapterNum="4"
      difficulty="Intermediate"
      tags={["CompTIA", "Security+", "SY0-701", "Incident Response", "SIEM", "Threat Hunting"]}
      terminalLabel="Security+ CLI — Security Operations"
      duration={55}
      intro={intro}
      steps={steps}
    />
  );
}