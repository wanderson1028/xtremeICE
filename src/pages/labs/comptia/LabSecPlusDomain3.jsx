import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Design a DMZ Architecture",
    explanation: "A DMZ (Demilitarized Zone) is a network segment that exposes external-facing services to the internet while isolating the internal network. It sits between two firewalls — external traffic reaches the DMZ but cannot traverse to the internal LAN. Review the architecture.",
    whyItMatters: "Network segmentation through DMZs is a core security architecture pattern. Security+ tests your ability to identify where services should be placed (DMZ vs. internal) and how segmentation limits an attacker's reach after a breach.",
    command: "netarch view --zone dmz --output diagram",
    prompt: "analyst@secplus:~$",
    output: [
      "=============================================================",
      "  Internet  -->  [External FW]  -->  [DMZ]  -->  [Internal FW]  -->  [LAN]",
      "                                        |",
      "                                  +-----+-----+",
      "                                  | Web Server |",
      "                                  | Mail Server |",
      "                                  | DNS Server  |",
      "                                  +------------+",
      "",
      "  [*] DMZ hosts are isolated from the LAN by the internal firewall",
      "  [*] Even if a DMZ host is compromised, the LAN remains protected",
    ],
    question: {
      text: "A company hosts its public website on a server in the DMZ. An attacker exploits a web vulnerability and compromises the server. What prevents the attacker from directly accessing the internal database on the LAN?",
      options: [
        "The web server does not have enough storage for the database",
        "The internal firewall between the DMZ and LAN blocks traffic from the compromised DMZ server to the internal network",
        "The DMZ server runs a different operating system than the database",
        "The attacker would lose interest after compromising the web server",
      ],
      correctIndex: 1,
      explanation: "The internal firewall is the critical control. In a DMZ architecture, two firewalls separate the internet from the LAN: an external firewall (internet to DMZ) and an internal firewall (DMZ to LAN). Even if an attacker compromises a DMZ host, the internal firewall blocks lateral movement into the LAN. This is segmentation as a defense-in-depth measure. The DMZ server should also not have direct database access — the web app should connect through an application tier, further limiting reach.",
    },
  },
  {
    stepLabel: "Compare Secure vs. Insecure Protocols",
    explanation: "Many legacy protocols transmit data in plaintext (HTTP, Telnet, FTP, SMTP). Secure replacements encrypt traffic (HTTPS, SSH, SFTP, SMTPS/TLS). Review the protocol pairs and their security properties.",
    whyItMatters: "Security+ tests your ability to identify insecure protocols and their secure replacements. Disabling Telnet and using SSH, or redirecting HTTP to HTTPS, are common hardening tasks. Plaintext protocols expose credentials and data to packet sniffing.",
    command: "protoctl compare --output table",
    prompt: "analyst@secplus:~$",
    output: [
      "-------------------------------------------------------------",
      "|  Insecure  |  Secure    |  Port  |  Security Property     |",
      "+------------+------------+--------+-------------------------+",
      "|  HTTP      |  HTTPS     |  443   |  TLS encryption         |",
      "|  Telnet    |  SSH        |  22    |  Encrypted shell        |",
      "|  FTP       |  SFTP/FTPS |  22/990|  Encrypted transfer     |",
      "|  SMTP      |  SMTPS     |  465   |  TLS email transport    |",
      "|  SNMP v1/2 |  SNMP v3   |  161   |  Auth + encryption      |",
      "|  LDAP      |  LDAPS     |  636   |  TLS directory access   |",
      "+------------+------------+--------+-------------------------+",
    ],
    question: {
      text: "A network administrator is still using Telnet to manage network switches. What is the primary security risk, and what should they switch to?",
      options: [
        "Telnet is too slow; switch to SSH for faster management",
        "Telnet transmits all data including passwords in plaintext, making it vulnerable to packet sniffing; switch to SSH which encrypts the entire session",
        "Telnet uses too many ports; switch to SSH which uses fewer",
        "Telnet is fine if the network is behind a firewall",
      ],
      correctIndex: 1,
      explanation: "Telnet transmits everything — including login credentials and all commands — in cleartext. Anyone with a packet sniffer on the network can capture passwords and gain access. SSH (Secure Shell) encrypts the entire session, protecting credentials and data from interception. Even behind a firewall, internal threats (insiders, compromised hosts) can sniff Telnet traffic. Switching from Telnet to SSH is one of the most fundamental network hardening steps. Port 22 (SSH) replaces port 23 (Telnet).",
    },
  },
  {
    stepLabel: "Inspect a TLS Certificate",
    explanation: "TLS certificates bind a public key to an identity, verified by a Certificate Authority (CA). Certificate fields include subject, issuer, validity period, and the public key. Inspect a certificate with OpenSSL.",
    whyItMatters: "Security+ tests your understanding of PKI, certificate fields, and the role of CAs. A certificate's validity period, the chain of trust, and the difference between root CAs and intermediate CAs are all exam topics. Expired or misconfigured certificates cause outages and security warnings.",
    command: "openssl x509 -in server.crt -text -noout | grep -E 'Subject:|Issuer:|Not Before|Not After|Public Key Algorithm'",
    prompt: "analyst@secplus:~$",
    output: [
      "Certificate:",
      "    Data:",
      "        Version: 3 (0x2)",
      "        Subject: C=US, ST=NY, O=Acme Corp, CN=www.acme.com",
      "        Issuer: C=US, O=Let's Encrypt, CN=R3",
      "        Validity:",
      "            Not Before: Jan 15 00:00:00 2025 GMT",
      "            Not After: Apr 15 00:00:00 2025 GMT",
      "        Public Key Algorithm: rsaEncryption (2048 bit)",
      "    Signature Algorithm: sha256WithRSAEncryption",
    ],
    question: {
      text: "During a certificate inspection, you see the Issuer is 'Let's Encrypt R3' and the Subject is 'www.acme.com'. What does this tell you about the certificate's chain of trust?",
      options: [
        "The certificate is self-signed because the issuer and subject differ",
        "Let's Encrypt R3 is the intermediate CA that signed this certificate; the chain of trust goes from www.acme.com up through R3 to a root CA that browsers trust",
        "Let's Encrypt is the root CA directly signing end-entity certificates",
        "The certificate is invalid because the issuer is not the subject",
      ],
      correctIndex: 1,
      explanation: "In a PKI chain of trust, end-entity (leaf) certificates are signed by an intermediate CA (Let's Encrypt R3), which is itself signed by a root CA (ISRG Root X1) that browsers trust. The chain works because: root CA trusts intermediate R3, R3 trusts the leaf certificate for www.acme.com. Browsers verify the entire chain up to the root. If any link is broken (expired intermediate, revoked cert), the chain fails. Self-signed certs have issuer = subject. Let's Encrypt uses an intermediate, not a direct root signature.",
    },
  },
  {
    stepLabel: "Review Cryptographic Implementations",
    explanation: "Cryptography in practice involves choosing the right algorithm, key length, and mode. Weak algorithms (DES, MD5, RC4) should be replaced with strong ones (AES-256, SHA-256, ChaCha20). Review the cryptographic recommendations.",
    whyItMatters: "Security+ tests your ability to identify weak cryptography and recommend strong replacements. Using MD5 for password hashing or DES for encryption are common vulnerabilities. Key length also matters — 2048-bit RSA is the minimum, and 1024-bit is deprecated.",
    command: "cryptctl audit --output table",
    prompt: "analyst@secplus:~$",
    output: [
      "---------------------------------------------------------------",
      "|  Purpose      |  Weak (Avoid)   |  Strong (Recommended)    |",
      "+---------------+-----------------+--------------------------+",
      "|  Symmetric    |  DES, 3DES, RC4 |  AES-256, ChaCha20      |",
      "|  Hashing      |  MD5, SHA-1     |  SHA-256, SHA-3, BLAKE3 |",
      "|  Password Hash|  MD5, SHA-1     |  bcrypt, Argon2, scrypt  |",
      "|  Asymmetric   |  RSA-1024       |  RSA-2048+, ECC-256+    |",
      "|  Key Exchange |  DH (static)    |  ECDHE (ephemeral)       |",
      "+---------------+-----------------+--------------------------+",
    ],
    question: {
      text: "A developer stores user passwords as MD5 hashes in the database. What are the two primary problems, and what should they use instead?",
      options: [
        "MD5 is too fast and has known collisions; use a slow, salted password hashing function like bcrypt or Argon2",
        "MD5 is too slow; use SHA-256 for faster hashing",
        "MD5 is fine for passwords; no change needed",
        "MD5 uses too much memory; use SHA-1 instead",
      ],
      correctIndex: 0,
      explanation: "MD5 has two fatal flaws for password storage: (1) it is too fast — attackers can compute billions of MD5 hashes per second with a GPU, making brute-force trivial; (2) it has known collision vulnerabilities. Password hashing must be slow (to resist brute-force) and use a unique salt per user (to resist rainbow tables). bcrypt and Argon2 are designed specifically for this: they are intentionally slow and incorporate salts. SHA-256, while collision-resistant, is still too fast for password hashing without a KDF construction.",
    },
  },
  {
    stepLabel: "Evaluate Cloud Security Architecture",
    explanation: "Cloud security architecture adapts traditional controls to cloud environments: security groups (cloud firewalls), IAM policies, encryption at rest/transit, VPC isolation, and shared responsibility. Review the cloud security model.",
    whyItMatters: "Security+ covers cloud security fundamentals. The shared responsibility model (provider secures the cloud, customer secures what's in the cloud) is a key concept. Understanding security groups, IAM, and cloud network isolation maps directly to exam questions.",
    command: "cloudarch audit --model shared-responsibility --output table",
    prompt: "analyst@secplus:~$",
    output: [
      "---------------------------------------------------------------",
      "|  Layer              |  Provider Manages  |  Customer Manages |",
      "+---------------------+--------------------+-------------------+",
      "|  Physical/Hardware  |  Yes               |  No               |",
      "|  Host OS/Hypervisor |  Yes               |  No               |",
      "|  Network (VPC)      |  Platform          |  Config (SGs)     |",
      "|  Guest OS           |  No (IaaS)         |  Yes (IaaS)       |",
      "|  Applications       |  No                |  Yes              |",
      "|  Data               |  No                |  Yes (encrypt)    |",
      "|  Identity (IAM)     |  Platform          |  Policies/Keys    |",
      "+---------------------+--------------------+-------------------+",
    ],
    question: {
      text: "In an IaaS cloud model, who is responsible for patching the guest operating system and encrypting the application data?",
      options: [
        "The cloud provider patches the OS and encrypts the data",
        "The customer is responsible for both patching the guest OS and encrypting their application data in IaaS",
        "The provider patches the OS; the customer does nothing about data",
        "Neither party is responsible — it is shared and ambiguous",
      ],
      correctIndex: 1,
      explanation: "In IaaS (Infrastructure as a Service), the provider manages the physical hardware, hypervisor, and underlying infrastructure. The customer manages everything above: the guest OS (patching, hardening), applications, and data (encryption). This is the shared responsibility model. The customer must patch their own VMs, configure security groups, manage IAM keys, and encrypt their data. In PaaS, the provider would manage the OS; in SaaS, the provider manages nearly everything except data access.",
    },
  },
  {
    stepLabel: "Design for Resilience and Redundancy",
    explanation: "Resilience ensures systems survive failures; redundancy provides backup components. Patterns include load balancing, failover clustering, RAID, geographic redundancy, and backup strategies (3-2-1 rule). Review the resilience patterns.",
    whyItMatters: "Security+ covers availability as part of the CIA Triad. Resilience and redundancy protect availability — a single point of failure (SPOF) can take down an entire system. The 3-2-1 backup rule (3 copies, 2 media, 1 offsite) is a common exam topic.",
    command: "resiliencectl audit --output table",
    prompt: "analyst@secplus:~$",
    output: [
      "---------------------------------------------------------------",
      "|  Pattern            |  Purpose              |  Protects    |",
      "+---------------------+-----------------------+--------------+",
      "|  Load Balancer      |  Distribute traffic    |  Availability|",
      "|  Active-Passive     |  Failover on failure  |  Availability|",
      "|  RAID 1/5/6/10      |  Disk redundancy      |  Integrity   |",
      "|  Geo-redundancy     |  Multi-region backup  |  Disaster    |",
      "|  3-2-1 Backup       |  3 copies, 2 media, 1 offsite | Data |",
      "|  Health Checks      |  Detect failure fast  |  Response    |",
      "+---------------------+-----------------------+--------------+",
    ],
    question: {
      text: "An organization follows the 3-2-1 backup rule. Which configuration satisfies this rule?",
      options: [
        "1 copy on the production server",
        "3 copies of the data, on 2 different media types, with 1 copy stored offsite",
        "3 backups all on the same tape drive, stored in the server room",
        "2 copies on the same disk, no offsite backup",
      ],
      correctIndex: 1,
      explanation: "The 3-2-1 rule is: 3 copies of your data (1 primary + 2 backups), on 2 different media types (e.g., disk + tape, or local NAS + cloud), with 1 copy stored offsite (geographically separated). This protects against: hardware failure (multiple copies), media-specific failure (different media types), and site disasters (offsite copy). Having all copies on the same media in the same location fails if that media type has a flaw or the site is destroyed. The 3-2-1 rule is a best practice for data availability and disaster recovery.",
    },
  },
];

const intro = {
  overview: "This lab covers CompTIA Security+ (SY0-701) Domain 3: Security Architecture. You'll design DMZ architectures, compare secure vs. insecure protocols, inspect TLS certificates, evaluate cryptographic implementations, understand cloud security architecture, and design for resilience and redundancy through hands-on CLI exercises.",
  niceCategory: "Security Architecture",
  objectives: [
    "Design network segmentation using DMZ architecture",
    "Identify insecure protocols and their secure replacements",
    "Inspect and interpret TLS certificate fields and chains of trust",
    "Evaluate cryptographic implementations and identify weak algorithms",
    "Understand the cloud shared responsibility model for IaaS/PaaS/SaaS",
    "Apply resilience and redundancy patterns including the 3-2-1 backup rule",
  ],
  outcomes: [
    "Able to place services correctly in DMZ vs. internal network zones",
    "Can identify and replace plaintext protocols with encrypted alternatives",
    "Understands PKI, certificate chains, and the role of CAs",
    "Can identify weak cryptography and recommend strong replacements",
    "Understands cloud security groups, IAM, and shared responsibility",
    "Able to eliminate single points of failure through redundancy patterns",
  ],
  prerequisites: [
    "Completion of Security+ Domains 1 and 2 (recommended)",
    "Understanding of basic networking (ports, protocols, firewalls)",
  ],
  tools: [
    "OpenSSL — certificate inspection and cryptographic operations",
    "Network Architecture CLI — for designing and auditing network zones",
    "Cloud Security Auditor — for evaluating shared responsibility models",
  ],
};

export default function LabSecPlusDomain3() {
  return (
    <LabRunner
      labTitle="Security+ Domain 3: Security Architecture"
      chapterNum="3"
      difficulty="Intermediate"
      tags={["CompTIA", "Security+", "SY0-701", "Architecture", "PKI", "Resilience"]}
      terminalLabel="Security+ CLI — Security Architecture"
      duration={55}
      intro={intro}
      steps={steps}
    />
  );
}