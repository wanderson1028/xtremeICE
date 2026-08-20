import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Profile Threat Actor Types",
    explanation: "Threat actors are categorized by motivation, resources, and sophistication: nation-state/APT (well-funded, persistent), organized crime (financial), hacktivist (ideological), insider (access), script kiddie (low skill), and competitor. Profile each type.",
    whyItMatters: "Identifying the threat actor type drives your defense strategy. A nation-state APT requires different controls than an insider threat or script kiddie. Security+ tests your ability to match attacker characteristics to their category.",
    command: "threatctl profile --type all --output table",
    prompt: "analyst@secplus:~$",
    output: [
      "-----------------------------------------------------------",
      "|  Actor Type     |  Motivation    |  Sophistication  |",
      "+-----------------+-----------------+-------------------+",
      "|  Nation-State   |  Espionage     |  Very High (APT)  |",
      "|  Organized Crime|  Financial     |  High             |",
      "|  Hacktivist     |  Ideological   |  Medium           |",
      "|  Insider        |  Revenge/Gain  |  Varies (access)  |",
      "|  Script Kiddie  |  Notoriety     |  Low (tools)      |",
      "|  Competitor     |  Corporate     |  Medium-High      |",
      "+-----------------+-----------------+-------------------+",
    ],
    question: {
      text: "An attacker with no advanced skills downloads a pre-built exploit toolkit and defaces a small business website to gain attention on social media. Which threat actor type is this?",
      options: [
        "Nation-state APT — highly sophisticated and persistent",
        "Script kiddie — low-skill attacker who uses pre-built tools without understanding how they work, motivated by notoriety",
        "Organized crime — financially motivated with significant resources",
        "Insider threat — an employee with internal access",
      ],
      correctIndex: 1,
      explanation: "A script kiddie is an unskilled attacker who uses pre-made tools and exploits created by others, without understanding the underlying techniques. Their motivation is typically notoriety or defacement, not financial gain or espionage. The key indicators here are: low skill (downloading pre-built tools), and motivation (attention on social media). Nation-states use custom zero-days, organized crime seeks financial return, and insiders have legitimate internal access.",
    },
  },
  {
    stepLabel: "Map the Attack Surface",
    explanation: "The attack surface is the sum of all points where an attacker can attempt to enter or extract data. It includes network services, web applications, APIs, wireless, physical access, and human factors (social engineering). Map your attack surface.",
    whyItMatters: "You cannot defend what you do not know exists. Attack surface management is the first step in risk reduction — every open port, exposed API, and untrained employee is a potential entry point. Security+ tests your ability to identify attack surface components.",
    command: "surfacectl map --scope all --output table",
    prompt: "analyst@secplus:~$",
    output: [
      "-------------------------------------------------------------",
      "|  Surface Component   |  Exposure       |  Risk Level  |",
      "+----------------------+-----------------+---------------+",
      "|  Open ports (22,80)  |  Internet-facing|  High         |",
      "|  Web application     |  Public         |  High         |",
      "|  REST API            |  Partner        |  Medium       |",
      "|  Wireless (WPA3)     |  Office         |  Medium       |",
      "|  Employee email      |  Internet       |  High (phish) |",
      "|  Physical access     |  Building       |  Medium       |",
      "+----------------------+-----------------+---------------+",
    ],
    question: {
      text: "Which of the following would most effectively reduce an organization's attack surface?",
      options: [
        "Adding more security tools to the network",
        "Closing unnecessary open ports and decommissioning unused services and applications",
        "Increasing the number of user accounts for better access distribution",
        "Publishing all internal IP addresses for transparency",
      ],
      correctIndex: 1,
      explanation: "Reducing the attack surface means eliminating unnecessary entry points. Closing unused ports, decommissioning unused services, and removing orphaned applications all shrink the surface an attacker can target. Adding more tools increases complexity (and potentially new vulnerabilities), more accounts increase the credential attack surface, and publishing internal IPs gives attackers a map. The principle is: if you don't need it, remove it.",
    },
  },
  {
    stepLabel: "Run a Vulnerability Scan",
    explanation: "Vulnerability scanning identifies known weaknesses in systems and applications. Authenticated scans log in and check from the inside; unauthenticated scans check from the outside. Review scan results with CVSS severity ratings.",
    whyItMatters: "Vulnerability management is a core security operations function. Security+ tests your ability to interpret scan results, understand CVSS scores, and prioritize remediation. Critical (9.0-10.0) vulnerabilities should be patched first.",
    command: "vulnctl scan --target 10.0.0.0/24 --format summary",
    prompt: "analyst@secplus:~$",
    output: [
      "-----------------------------------------------------------",
      "|  Host          |  CVE             |  CVSS  |  Severity |",
      "+----------------+------------------+--------+-----------+",
      "|  10.0.0.5      |  CVE-2024-1234   |  9.8   |  Critical |",
      "|  10.0.0.5      |  CVE-2024-5678   |  7.5   |  High     |",
      "|  10.0.0.12     |  CVE-2023-9012   |  6.5   |  Medium   |",
      "|  10.0.0.20     |  CVE-2024-3456   |  3.1   |  Low      |",
      "+----------------+------------------+--------+-----------+",
      "[*] Scan complete: 4 hosts, 4 vulnerabilities, 1 critical",
    ],
    question: {
      text: "Your vulnerability scan finds a critical CVE (CVSS 9.8) on an internet-facing web server and a low CVE (CVSS 3.1) on an internal printer. How should you prioritize remediation?",
      options: [
        "Fix the printer first because it is easier",
        "Fix the critical CVE on the internet-facing web server first — it has the highest severity and the greatest exposure to external attackers",
        "Fix both simultaneously with equal priority",
        "Ignore both because vulnerabilities are inevitable",
      ],
      correctIndex: 1,
      explanation: "Remediation priority considers both severity (CVSS score) and exposure (attack surface). The critical CVE (9.8) on an internet-facing server is the highest priority: it is severe and directly reachable by external attackers. The low CVE on an internal printer is lower risk because it is less severe and not internet-facing. Prioritize by risk = severity × exposure. Fix the critical internet-facing issue immediately, then address the printer in a normal maintenance window.",
    },
  },
  {
    stepLabel: "Identify Common Attack Vectors",
    explanation: "Attack vectors are the paths attackers use to gain access: phishing, watering hole, MITM, SQL injection, XSS, privilege escalation, and supply chain. Review the common vectors and their indicators.",
    whyItMatters: "Security+ tests your ability to identify an attack from its description and recommend the appropriate mitigation. Each vector requires a different defense — phishing needs awareness training, SQLi needs input validation, MITM needs encryption.",
    command: "threatctl vectors --output table",
    prompt: "analyst@secplus:~$",
    output: [
      "-------------------------------------------------------------",
      "|  Attack Vector      |  Indicator              |  Mitigation |",
      "+---------------------+-------------------------+-------------+",
      "|  Phishing           |  Suspicious email links  |  Awareness  |",
      "|  Watering Hole      |  Compromised legit site |  Web filter |",
      "|  MITM               |  Rogue AP, ARP spoof     |  TLS, VPN   |",
      "|  SQL Injection      |  DB error in response   |  Param query|",
      "|  XSS                |  Script in input field  |  Sanitize   |",
      "|  Supply Chain       |  Compromised dependency |  SBOM, scan |",
      "+---------------------+-------------------------+-------------+",
    ],
    question: {
      text: "An attacker compromises a legitimate industry news website that a target company's employees visit daily, and injects malware that exploits a browser vulnerability when employees browse the site. What type of attack is this?",
      options: [
        "Phishing — the attacker is sending fraudulent emails",
        "Watering hole attack — the attacker compromises a legitimate site that the target group frequently visits to deliver malware",
        "SQL injection — the attacker is injecting SQL into the website",
        "Man-in-the-middle — the attacker is intercepting traffic",
      ],
      correctIndex: 1,
      explanation: "A watering hole attack targets a specific group by compromising a legitimate website they are known to visit regularly — like an industry news site. The attacker infects the site with malware that exploits browser vulnerabilities when victims browse. The name comes from predators waiting at a watering hole for prey to come drink. Unlike phishing (which sends emails to targets), watering hole attacks require no action from the victim beyond their normal browsing. Web filtering and patch management mitigate this.",
    },
  },
  {
    stepLabel: "Apply Mitigation Techniques",
    explanation: "Mitigation techniques reduce risk from threats and vulnerabilities: patching, segmentation, principle of least privilege, input validation, encryption, and awareness training. Map mitigations to the threats they address.",
    whyItMatters: "Security+ tests your ability to select the right mitigation for a given threat. Patching addresses known vulnerabilities; segmentation limits lateral movement; least privilege reduces the blast radius of compromised accounts. Defense in depth combines multiple mitigations.",
    command: "mitigatectl map --output table",
    prompt: "analyst@secplus:~$",
    output: [
      "---------------------------------------------------------------",
      "|  Threat/Vuln        |  Mitigation              |  Layer      |",
      "+---------------------+--------------------------+-------------+",
      "|  Known CVE          |  Patch management        |  Host       |",
      "|  Lateral movement   |  Network segmentation   |  Network   |",
      "|  Privilege abuse    |  Least privilege (PoLP)  |  Identity  |",
      "|  SQL injection      |  Parameterized queries   |  App        |",
      "|  Data interception  |  Encryption (TLS)       |  Transport  |",
      "|  Social engineering |  Security awareness     |  Human      |",
      "+---------------------+--------------------------+-------------+",
    ],
    question: {
      text: "An organization wants to limit the damage if an attacker compromises a single server. Which mitigation technique is most effective for containing the blast radius?",
      options: [
        "Installing more antivirus software on the compromised server",
        "Network segmentation — dividing the network into isolated zones so a compromised server cannot reach other segments",
        "Adding more users to the admin group for faster response",
        "Disabling all logging to reduce the attack surface",
      ],
      correctIndex: 1,
      explanation: "Network segmentation contains the blast radius by isolating network zones. If a server in one segment is compromised, segmentation prevents the attacker from moving laterally to other segments — they are confined to the compromised zone. This is a core defense-in-depth principle. Antivirus is host-level (doesn't prevent lateral movement), more admins increase risk, and disabling logging blinds you. Segmentation, combined with least privilege, limits both the spread and impact of a breach.",
    },
  },
  {
    stepLabel: "Analyze the MITRE ATT&CK Framework",
    explanation: "MITRE ATT&CK is a knowledge base of adversary tactics and techniques. Tactics are the attacker's goals (Initial Access, Persistence, Exfiltration); techniques are how they achieve them. Review the tactic categories.",
    whyItMatters: "MITRE ATT&CK is the industry standard for understanding adversary behavior. Security+ references it for threat classification and detection. Knowing the tactics (from Reconnaissance to Impact) helps you map detections to the attack lifecycle.",
    command: "threatctl mitre --tactics --output table",
    prompt: "analyst@secplus:~$",
    output: [
      "---------------------------------------------------------------",
      "|  Tactic              |  Description               |  Phase    |",
      "+----------------------+----------------------------+-----------+",
      "|  Reconnaissance     |  Gathering information     |  Pre      |",
      "|  Initial Access      |  First foothold           |  Early    |",
      "|  Execution           |  Running malware          |  Early    |",
      "|  Persistence         |  Staying in the system    |  Middle   |",
      "|  Lateral Movement   |  Moving through network   |  Middle   |",
      "|  Exfiltration        |  Stealing data out        |  Late     |",
      "|  Impact              |  Destruction/disruption   |  End      |",
      "+----------------------+----------------------------+-----------+",
    ],
    question: {
      text: "An attacker gains initial access via a phishing email, then creates a scheduled task to maintain access after reboots. Which two MITRE ATT&CK tactics are involved?",
      options: [
        "Exfiltration and Impact",
        "Initial Access (via phishing) and Persistence (via the scheduled task that survives reboots)",
        "Reconnaissance and Lateral Movement",
        "Defense Evasion and Discovery",
      ],
      correctIndex: 1,
      explanation: "The phishing email that gives the attacker their first foothold maps to the 'Initial Access' tactic. Creating a scheduled task to ensure the malware runs again after a reboot maps to 'Persistence' — the attacker is ensuring they maintain access over time. MITRE ATT&CK tactics describe the adversary's goals at each phase. Understanding this mapping helps defenders build detections: if you see a scheduled task created after a suspicious email, you can correlate the two tactics to identify the attack chain.",
    },
  },
];

const intro = {
  overview: "This lab covers CompTIA Security+ (SY0-701) Domain 2: Threats, Vulnerabilities, and Mitigations. You'll profile threat actors, map attack surfaces, interpret vulnerability scans, identify attack vectors, apply mitigation techniques, and analyze the MITRE ATT&CK framework through hands-on CLI exercises.",
  niceCategory: "Threats, Vulnerabilities, and Mitigations",
  objectives: [
    "Classify threat actors by motivation, sophistication, and resources",
    "Identify and map attack surface components",
    "Interpret vulnerability scan results and prioritize by CVSS severity and exposure",
    "Recognize common attack vectors (phishing, watering hole, MITM, SQLi, XSS, supply chain)",
    "Select appropriate mitigation techniques for specific threats",
    "Map adversary behavior to MITRE ATT&CK tactics",
  ],
  outcomes: [
    "Able to identify threat actor types from behavioral indicators",
    "Can reduce attack surface by identifying unnecessary exposures",
    "Understands CVSS scoring and risk-based remediation prioritization",
    "Can match attack descriptions to their vector and mitigation",
    "Able to apply defense-in-depth through layered mitigations",
    "Understands the MITRE ATT&CK tactic lifecycle from Reconnaissance to Impact",
  ],
  prerequisites: [
    "Completion of Security+ Domain 1: General Security Concepts (recommended)",
    "Basic understanding of networking and operating systems",
  ],
  tools: [
    "Vulnerability Scanner — simulated tool for identifying CVEs and CVSS scores",
    "Threat Intelligence CLI — for profiling threat actors and attack vectors",
    "MITRE ATT&CK Reference — adversary tactics and techniques knowledge base",
  ],
};

export default function LabSecPlusDomain2() {
  return (
    <LabRunner
      labTitle="Security+ Domain 2: Threats, Vulnerabilities & Mitigations"
      chapterNum="2"
      difficulty="Intermediate"
      tags={["CompTIA", "Security+", "SY0-701", "Threats", "Vulnerabilities", "MITRE ATT&CK"]}
      terminalLabel="Security+ CLI — Threats & Mitigations"
      duration={50}
      intro={intro}
      steps={steps}
    />
  );
}