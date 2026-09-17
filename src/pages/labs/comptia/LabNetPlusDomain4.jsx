import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Apply Logical Security Controls",
    explanation: "Logical security controls protect data through software and protocols: encryption (data in transit and at rest), PKI (Public Key Infrastructure), IAM (Identity and Access Management), MFA, SSO, RADIUS, LDAP, SAML, and TACACS+. Review the logical security controls.",
    whyItMatters: "Network+ tests whether you can match an authentication protocol to its use. RADIUS and TACACS+ are for network device authentication (TACACS+ is Cisco-proprietary and encrypts the whole packet); SAML is for web SSO; LDAP is for directory lookups. MFA combines factors; SSO reduces password fatigue.",
    command: "netctl security --logical --output table",
    prompt: "analyst@netplus:~$",
    output: [
      "---------------------------------------------------------------",
      "|  Control   |  Purpose                  |  Protocol/Standard |",
      "+-----------+---------------------------+--------------------+",
      "|  RADIUS   |  AAA (auth, authz, acct)   |  UDP 1812/1813     |",
      "|  TACACS+  |  AAA (Cisco, encrypts all) |  TCP 49           |",
      "|  LDAP     |  Directory lookup          |  TCP 389/636       |",
      "|  SAML     |  Web SSO (XML tokens)      |  HTTP/HTTPS        |",
      "|  MFA      |  Multi-factor auth         |  Various           |",
      "|  PKI      |  Certs, key management     |  X.509             |",
      "+-----------+---------------------------+--------------------+",
    ],
    question: {
      text: "A network administrator needs to centralize authentication for network devices (switches, routers) and wants all communication between the devices and the AAA server to be fully encrypted. Which protocol should they choose?",
      options: [
        "RADIUS — it only encrypts the password, leaving other attributes in cleartext",
        "TACACS+ — it encrypts the entire packet body between the device and the server",
        "LDAP — it is a directory protocol, not an AAA protocol for network devices",
        "SAML — it is for web single sign-on, not network device authentication",
      ],
      correctIndex: 1,
      explanation: "TACACS+ (Terminal Access Controller Access-Control System Plus) encrypts the entire packet body, including all attributes, between the network device and the AAA server. RADIUS only encrypts the password attribute — the rest of the packet is sent in cleartext, making TACACS+ the better choice when full encryption is required. TACACS+ also separates authentication, authorization, and accounting into distinct services (RADIUS combines auth and authorization). LDAP is for directory lookups, and SAML is for web SSO — neither is used for network device AAA.",
    },
  },
  {
    stepLabel: "Implement Network Segmentation",
    explanation: "Network segmentation isolates different device types and trust zones: IoT, IIoT (Industrial IoT), SCADA/ICS/OT (operational technology), guest networks, and BYOD. Segmentation limits lateral movement and protects vulnerable devices. Review the segmentation use cases.",
    whyItMatters: "Network+ tests whether you can match a segmentation scenario to its rationale. IoT devices are often insecure and need isolation; SCADA/ICS systems cannot be patched easily and need strong isolation; guest networks must not access internal resources; BYOD needs controlled access.",
    command: "netctl segmentation --zones --output table",
    prompt: "analyst@netplus:~$",
    output: [
      "--------------------------------------------------------------",
      "|  Zone       |  Devices              |  Risk               |",
      "+------------+-----------------------+---------------------+",
      "|  IoT        |  Smart sensors, cameras|  Weak security     |",
      "|  IIoT       |  Industrial sensors   |  Cannot patch      |",
      "|  SCADA/ICS  |  Control systems      |  Safety-critical   |",
      "|  Guest      |  Visitor devices      |  Untrusted         |",
      "|  BYOD       |  Personal devices     |  Mixed trust       |",
      "|  Corporate  |  Managed endpoints   |  Trusted baseline  |",
      "+------------+-----------------------+---------------------+",
    ],
    question: {
      text: "A manufacturing plant runs SCADA control systems that cannot be patched frequently due to operational requirements. How should these systems be placed on the network?",
      options: [
        "On the same VLAN as corporate workstations for easier management",
        "On an isolated, segmented network with strict firewall rules limiting communication to only required protocols and hosts",
        "On the guest network, since they are untrusted",
        "On the public internet for remote monitoring access",
      ],
      correctIndex: 1,
      explanation: "SCADA/ICS (Industrial Control Systems) are safety-critical and often cannot be patched due to uptime requirements, so they must be isolated on a segmented network with strict firewall rules. This air-gap-like segmentation limits attack surface and prevents a compromised corporate machine from reaching the control systems. Putting them on the corporate VLAN risks lateral movement. The guest network is for untrusted visitors, not critical infrastructure. Exposing them to the public internet would be extremely dangerous. Segmentation with strict rules is the correct approach.",
    },
  },
  {
    stepLabel: "Identify Common Network Attacks",
    explanation: "Common network attacks include DoS/DDoS (denial of service), VLAN hopping, MAC flooding, ARP poisoning/spoofing, DNS poisoning/spoofing, rogue devices/services, evil twin (fake AP), on-path (MITM) attacks, and social engineering. Review the attack types.",
    whyItMatters: "Network+ tests whether you can identify an attack from its description and recommend a mitigation. ARP poisoning redirects traffic by poisoning the ARP cache; DNS poisoning redirects by corrupting DNS; an evil twin impersonates a legitimate AP; MAC flooding overflows a switch's MAC table to force it to flood all traffic.",
    command: "netctl attacks --list --output table",
    prompt: "analyst@netplus:~$",
    output: [
      "---------------------------------------------------------------",
      "|  Attack          |  Target            |  Mitigation          |",
      "+-----------------+--------------------+----------------------+",
      "|  ARP poisoning   |  ARP cache         |  Dynamic ARP Inspection |",
      "|  MAC flooding    |  Switch MAC table  |  Port security       |",
      "|  VLAN hopping    |  Switch trunk      |  Disable DTP, native VLAN |",
      "|  DNS poisoning   |  DNS resolver      |  DNSSEC              |",
      "|  Evil twin       |  Wireless clients   |  WPA3, 802.1X        |",
      "|  On-path (MITM)  |  Traffic between hosts |  Encryption (TLS) |",
      "|  DDoS            |  Availability       |  DDoS mitigation, rate limit |",
      "+-----------------+--------------------+----------------------+",
    ],
    question: {
      text: "An attacker sends a flood of forged ARP replies to a switch, mapping the attacker's MAC address to the default gateway's IP address. Client traffic then flows through the attacker's machine before reaching the gateway. What is this attack called?",
      options: [
        "DNS poisoning — corrupting DNS responses",
        "ARP poisoning (spoofing) — corrupting the ARP cache to redirect traffic through the attacker",
        "MAC flooding — overflowing the switch's MAC table to force flooding",
        "Evil twin — impersonating a wireless access point",
      ],
      correctIndex: 1,
      explanation: "ARP poisoning (also called ARP spoofing) sends forged ARP replies claiming the attacker's MAC owns the default gateway's IP. Victims update their ARP cache and send traffic to the attacker, who can inspect or modify it (a man-in-the-middle / on-path attack) before forwarding it to the real gateway. DNS poisoning corrupts DNS records, not ARP. MAC flooding overflows the switch's MAC table to force it to act like a hub and flood all traffic — it does not redirect specific traffic. An evil twin impersonates a wireless AP. The key indicator is forged ARP replies mapping the gateway IP to the attacker's MAC.",
    },
  },
  {
    stepLabel: "Harden Network Devices",
    explanation: "Device hardening reduces attack surface: change default passwords, disable unused services and ports, enable SSH (not Telnet), restrict management access with ACLs, keep firmware updated, and disable unused switch ports. Review the hardening checklist.",
    whyItMatters: "Network+ tests whether you can identify a hardening measure and its benefit. Default passwords are the most common breach vector; Telnet sends credentials in cleartext; unused services and ports expand attack surface; ACLs limit who can manage the device; firmware updates patch vulnerabilities.",
    command: "netctl hardening --checklist --output table",
    prompt: "analyst@netplus:~$",
    output: [
      "---------------------------------------------------------------",
      "|  Measure            |  Risk Reduced                    |  Benefit  |",
      "+--------------------+----------------------------------+-----------+",
      "|  Change defaults    |  Default creds exploited        |  Block unauthorized |",
      "|  Disable Telnet     |  Cleartext credentials          |  Use SSH  |",
      "|  Disable unused svc |  Attack surface                 |  Less exposure |",
      "|  Management ACLs    |  Unauthorized management access |  Restrict |",
      "|  Firmware updates   |  Known vulnerabilities          |  Patch    |",
      "|  Disable unused ports |  Rogue device access        |  Limit    |",
      "+--------------------+----------------------------------+-----------+",
    ],
    question: {
      text: "A network administrator finds that a switch is still using Telnet for remote management. What is the primary security risk, and what should they do?",
      options: [
        "Telnet is slower than SSH; they should switch to SSH for performance",
        "Telnet sends credentials and all session data in cleartext, so anyone sniffing the network can capture the admin password; they should disable Telnet and enable SSH instead",
        "Telnet uses more bandwidth than SSH; they should switch to reduce congestion",
        "Telnet is only a risk if the switch is on the internet; on an internal LAN it is safe to keep",
      ],
      correctIndex: 1,
      explanation: "Telnet transmits everything — including the username and password — in cleartext. Anyone with a packet sniffer on the same segment can capture the admin credentials and take over the switch. SSH encrypts the entire session, protecting credentials and data. The risk is not about speed or bandwidth, and internal LANs can still be sniffed (especially after a compromise). The correct hardening step is to disable Telnet and require SSH for management.",
    },
  },
  {
    stepLabel: "Deploy Deception Technology",
    explanation: "Deception technologies like honeypots and honeynets lure attackers by presenting fake targets. A honeypot is a single fake system; a honeynet is a network of honeypots. They detect attackers, gather intelligence on techniques, and divert them from real assets. Review the deception concepts.",
    whyItMatters: "Network+ tests whether you understand the purpose of deception technology and can distinguish a honeypot from a honeynet. Honeypots are detective controls — they detect and study attackers, not block them. They are best deployed in a way that looks real but is isolated from production.",
    command: "netctl deception --show --output table",
    prompt: "analyst@netplus:~$",
    output: [
      "---------------------------------------------------------------",
      "|  Type       |  Scope            |  Purpose                    |",
      "+------------+-------------------+-----------------------------+",
      "|  Honeypot  |  Single fake host |  Lure, detect, study       |",
      "|  Honeynet  |  Network of fakes |  Observe lateral movement   |",
      "|  Honeyfile |  Decoy file       |  Detect data exfiltration   |",
      "|  Honeytoken|  Fake credential |  Alert on credential reuse |",
      "+------------+-------------------+-----------------------------+",
    ],
    question: {
      text: "A security team deploys a fake database server filled with synthetic data and monitors it for access. No legitimate user should ever connect to it. What is the primary purpose of this deployment?",
      options: [
        "To serve as a backup database in case the primary fails",
        "To act as a honeypot — a deception system that detects and gathers intelligence on attackers who interact with it, since no legitimate user should ever access it",
        "To load-balance queries away from the real database",
        "To encrypt data at rest using a decoy key",
      ],
      correctIndex: 1,
      explanation: "A honeypot is a deception system designed to attract attackers. Because no legitimate user should ever access it, any interaction is by definition suspicious and likely an attacker probing the network. The honeypot detects the intrusion, gathers intelligence on the attacker's techniques, and diverts them from real assets. It is a detective control, not a backup, load balancer, or encryption tool. A honeynet is a network of such honeypots. The key giveaway is the fake server with synthetic data that no legitimate user should touch.",
    },
  },
  {
    stepLabel: "Understand Security Terminology",
    explanation: "Core security terms: risk (the potential for loss), vulnerability (a weakness), exploit (a technique that leverages a vulnerability), threat (a potential danger), and the CIA Triad (Confidentiality, Integrity, Availability). Review the terminology.",
    whyItMatters: "Network+ tests whether you can define and distinguish these terms. A vulnerability is a weakness; a threat is a potential danger that could exploit it; risk is the combination of the threat, vulnerability, and impact. Understanding these terms is foundational for security discussions and risk assessments.",
    command: "netctl security --terms --output table",
    prompt: "analyst@netplus:~$",
    output: [
      "---------------------------------------------------------------",
      "|  Term           |  Definition                       |  Example |",
      "+----------------+-----------------------------------+----------+",
      "|  Vulnerability |  A weakness in a system          |  Unpatched SW |",
      "|  Threat        |  Potential danger that can exploit|  Hacker  |",
      "|  Exploit       |  Technique that uses a vuln       |  Malware  |",
      "|  Risk          |  Probability x Impact of a threat |  High    |",
      "|  Confidentiality|  Data kept private              |  Encrypt  |",
      "|  Integrity     |  Data not altered                |  Hashing  |",
      "|  Availability  |  Data accessible when needed     |  Backups  |",
      "+----------------+-----------------------------------+----------+",
    ],
    question: {
      text: "A company discovers an unpatched vulnerability in its web server software (the weakness). A hacker could use this vulnerability to breach the server. What is the hacker in this scenario?",
      options: [
        "A vulnerability — the hacker is the weakness itself",
        "A threat — a potential danger that could exploit the vulnerability",
        "An exploit — the hacker is the technique, not the actor",
        "A risk — the hacker is the probability of loss",
      ],
      correctIndex: 1,
      explanation: "A threat is a potential danger — an actor or event that could exploit a vulnerability. The unpatched software is the vulnerability (the weakness). The specific technique the hacker uses to exploit it is the exploit. Risk is the combination of the threat exploiting the vulnerability and the resulting impact (probability x impact). The hacker is the threat actor. Understanding this chain — threat exploits vulnerability, creating risk — is foundational to security.",
    },
  },
];

const intro = {
  overview: "This lab covers CompTIA Network+ (N10-009) Domain 4: Network Security. You'll explore logical security controls (RADIUS, TACACS+, LDAP, SAML), network segmentation for IoT/OT/guest/BYOD, common network attacks and their mitigations, device hardening, deception technology (honeypots), and core security terminology through hands-on CLI exercises.",
  niceCategory: "Network Security",
  objectives: [
    "Compare logical security controls and authentication protocols (RADIUS, TACACS+, LDAP, SAML, MFA, SSO)",
    "Implement network segmentation for IoT, IIoT, SCADA/ICS/OT, guest, and BYOD zones",
    "Identify common network attacks (ARP poisoning, MAC flooding, VLAN hopping, DNS poisoning, evil twin, MITM, DDoS) and their mitigations",
    "Apply device hardening techniques (change defaults, disable Telnet, restrict management, update firmware)",
    "Understand deception technologies (honeypots, honeynets, honeyfiles, honeytokens)",
    "Define core security terminology (risk, vulnerability, exploit, threat, CIA Triad)",
  ],
  outcomes: [
    "Able to choose the right AAA protocol for a given requirement",
    "Can design segmentation for vulnerable or untrusted device classes",
    "Can identify a network attack from its description and recommend a mitigation",
    "Able to harden a network device against common attack vectors",
    "Understands the purpose and deployment of deception technology",
    "Can distinguish risk, vulnerability, threat, and exploit in a scenario",
  ],
  prerequisites: [
    "Completion of Network+ Domains 1-3 or equivalent networking knowledge",
    "Basic understanding of security concepts is helpful",
  ],
  tools: [
    "Network CLI — simulated command-line interface for security configuration",
    "Attack reference — for identifying and mitigating common network attacks",
    "Hardening checklist — for securing network devices",
  ],
};

export default function LabNetPlusDomain4() {
  return (
    <LabRunner
      labTitle="Network+ Domain 4: Network Security"
      chapterNum="4"
      difficulty="Intermediate"
      tags={["CompTIA", "Network+", "N10-009", "Security", "Segmentation", "Hardening", "Attacks"]}
      terminalLabel="Network+ CLI — Network Security"
      duration={55}
      intro={intro}
      steps={steps}
    />
  );
}