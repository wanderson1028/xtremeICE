import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Apply the CIA Triad",
    explanation: "The CIA Triad — Confidentiality, Integrity, and Availability — is the foundational model for information security. Every security control maps to at least one leg of the triad. Use the security CLI to classify controls.",
    whyItMatters: "Every Security+ question ultimately ties back to the CIA Triad. Understanding which leg of the triad a control protects lets you reason about any security scenario, from encryption (confidentiality) to hashing (integrity) to backups (availability).",
    command: "secctl classify --control encryption --output table",
    prompt: "analyst@secplus:~$",
    output: [
      "-----------------------------------------",
      "|  Control       |  CIA Property  |  Type  |",
      "+----------------+---------------+-------+",
      "|  Encryption    |  Confidentiality | Preventive |",
      "|  Hashing       |  Integrity       | Detective  |",
      "|  Backups       |  Availability    | Corrective |",
      "|  RAID          |  Availability    | Preventive |",
      "|  Access Control|  Confidentiality | Preventive |",
      "+----------------+---------------+-------+",
    ],
    question: {
      text: "A company implements daily offsite backups and a disaster recovery plan. Which CIA Triad property are they primarily protecting?",
      options: [
        "Confidentiality — backups prevent unauthorized access",
        "Integrity — backups ensure data is not modified",
        "Availability — backups and DR ensure systems and data can be restored and accessed after a disruption",
        "Non-repudiation — backups prove who accessed the data",
      ],
      correctIndex: 2,
      explanation: "Availability ensures that systems and data are accessible when needed. Backups and disaster recovery plans are classic availability controls — if a system fails, is hit by ransomware, or a natural disaster occurs, backups allow you to restore data and bring services back online. Encryption protects confidentiality, hashing protects integrity, and non-repudiation is a separate concept (proving an action occurred).",
    },
  },
  {
    stepLabel: "Classify Security Control Types",
    explanation: "Security controls are categorized by function: preventive (stop attacks), detective (identify attacks), corrective (fix after an attack), deterrent (discourage), compensating (alternative when primary fails), and directive (policies). Review the classifications.",
    whyItMatters: "Security+ tests your ability to classify a control by type. A firewall is preventive; an IDS is detective; a backup restore is corrective. Knowing the category tells you when to deploy it in a defense-in-depth strategy.",
    command: "secctl list-controls --category all --output table",
    prompt: "analyst@secplus:~$",
    output: [
      "---------------------------------------------------",
      "|  Control Type   |  Example              |  When      |",
      "+-----------------+-----------------------+-----------+",
      "|  Preventive     |  Firewall, Encryption |  Before    |",
      "|  Detective      |  IDS, Audit Logs      |  During    |",
      "|  Corrective     |  Backup Restore      |  After     |",
      "|  Deterrent      |  Warning Banners     |  Before    |",
      "|  Compensating   |  VPN for no MFA      |  Fallback  |",
      "|  Directive      |  AUP Policy          |  Always    |",
      "+-----------------+-----------------------+-----------+",
    ],
    question: {
      text: "An organization deploys a honeypot to lure attackers and study their techniques. Which type of control is this?",
      options: [
        "Preventive — it stops the attack before it happens",
        "Detective — it identifies and gathers intelligence on attacker behavior",
        "Corrective — it repairs damage after an incident",
        "Directive — it is a policy mandating behavior",
      ],
      correctIndex: 1,
      explanation: "A honeypot is a detective control. It does not prevent attacks — instead it detects and collects information about attackers who interact with it. Honeypots are used to study attack patterns, gather IOCs, and provide early warning of targeted activity. Preventive controls block the attack; detective controls reveal it. Some honeypots can also act as deterrents by making attackers think they are being watched, but their primary classification is detective.",
    },
  },
  {
    stepLabel: "Review Authentication Factors (MFA)",
    explanation: "Multi-factor authentication combines factors from three categories: something you know (password), something you have (token), and somewhere you are (biometric). Review MFA factor types.",
    whyItMatters: "MFA is one of the most effective controls against credential compromise. Security+ tests whether you can identify which factor a given method belongs to and why combining factors from different categories is stronger than multiple from the same category.",
    command: "authctl list-factors --output table",
    prompt: "analyst@secplus:~$",
    output: [
      "-----------------------------------------------------",
      "|  Factor Category    |  Example           |  Type    |",
      "+---------------------+--------------------+----------+",
      "|  Something you know |  Password, PIN     |  Type 1  |",
      "|  Something you have |  OTP token, Smart card | Type 2 |",
      "|  Something you are  |  Fingerprint, Retina | Type 3  |",
      "|  Somewhere you are  |  GPS, IP range     |  Context |",
      "|  Something you do   |  Keystroke dynamics | Behavioral|",
      "+---------------------+--------------------+----------+",
    ],
    question: {
      text: "A user logs in with a password and then receives a push notification on their phone that they tap to approve. Which factors are being used?",
      options: [
        "Two Type 1 factors — both are knowledge-based",
        "Something you know (password) and something you have (the phone receiving the push) — two different factor categories",
        "Something you are (biometric) and something you know",
        "Single factor — the phone is just a convenience, not a separate factor",
      ],
      correctIndex: 1,
      explanation: "The password is 'something you know' (Type 1). The push notification goes to the user's phone, which is 'something you have' (Type 2). This is true multi-factor authentication because it combines two different factor categories. Even if an attacker steals the password, they cannot approve the push without the phone. Two passwords would be single-factor (both Type 1). The phone is a possession factor, not a convenience.",
    },
  },
  {
    stepLabel: "Compare Symmetric and Asymmetric Cryptography",
    explanation: "Symmetric encryption uses one shared key for both encryption and decryption (fast, good for bulk data). Asymmetric uses a key pair — public and private (slower, good for key exchange and digital signatures). Review the comparison.",
    whyItMatters: "Security+ requires you to know when to use each type and how they work together. TLS uses asymmetric to exchange a symmetric session key, then uses symmetric for the actual data. Digital signatures use asymmetric (private key signs, public key verifies).",
    command: "cryptctl compare --output table",
    prompt: "analyst@secplus:~$",
    output: [
      "---------------------------------------------------------",
      "|  Property      |  Symmetric (AES)  |  Asymmetric (RSA) |",
      "+----------------+-------------------+-------------------+",
      "|  Keys          |  1 shared         |  2 (public/private)|",
      "|  Speed         |  Fast             |  Slow             |",
      "|  Key Exchange  |  Pre-shared needed |  Public key math |",
      "|  Use Case      |  Bulk data        |  Key exchange, sig |",
      "|  Key Length    |  128-256 bit      |  2048-4096 bit   |",
      "|  Examples      |  AES, ChaCha20    |  RSA, ECC         |",
      "+----------------+-------------------+-------------------+",
    ],
    question: {
      text: "Why does TLS use asymmetric encryption to begin a session but then switch to symmetric encryption for the data transfer?",
      options: [
        "Asymmetric is more secure for data, so it is used for the important part",
        "Asymmetric is too slow for bulk data; it is used only to securely exchange a symmetric session key, which is fast for encrypting the actual data",
        "Symmetric encryption is outdated and only used for legacy compatibility",
        "TLS only uses asymmetric encryption throughout the entire session",
      ],
      correctIndex: 1,
      explanation: "Asymmetric encryption involves complex math (modular exponentiation with large primes), making it orders of magnitude slower than symmetric. TLS uses asymmetric encryption briefly during the handshake to authenticate the server and securely exchange a shared symmetric session key. Once both sides have the session key, they switch to symmetric (typically AES) for the actual data because it is fast enough for bulk transfer. This hybrid approach gets the security of asymmetric key exchange with the speed of symmetric encryption.",
    },
  },
  {
    stepLabel: "Identify Access Control Models",
    explanation: "Access control models define how permissions are assigned: MAC (mandatory, label-based), DAC (discretionary, owner-controlled), RBAC (role-based), and ABAC (attribute-based). Review the models.",
    whyItMatters: "Security+ tests your ability to match a scenario to the correct access control model. Military environments use MAC; file sharing uses DAC; enterprise roles use RBAC; dynamic policies use ABAC. Knowing the model tells you how permissions are managed.",
    command: "aclctl list-models --output table",
    prompt: "analyst@secplus:~$",
    output: [
      "-----------------------------------------------------------",
      "|  Model |  Basis          |  Example Environment          |",
      "+-------+------------------+-------------------------------+",
      "|  MAC   |  Security labels |  Military, Government (TS/S)  |",
      "|  DAC   |  Owner decides   |  File shares, Windows NTFS   |",
      "|  RBAC  |  Job role        |  Enterprise AD groups        |",
      "|  ABAC  |  Attributes/rules|  Dynamic (time, location)   |",
      "+-------+------------------+-------------------------------+",
    ],
    question: {
      text: "A hospital uses an access control system where doctors can view patient records only when they are physically in the hospital, during their shift, and have an active patient assignment. Which access control model is this?",
      options: [
        "MAC — mandatory access control with security labels",
        "DAC — the data owner decides who gets access",
        "ABAC — attribute-based access control evaluates contextual attributes (location, time, assignment) at access time",
        "RBAC — role-based access control assigns permissions by job title alone",
      ],
      correctIndex: 2,
      explanation: "ABAC (Attribute-Based Access Control) evaluates multiple attributes at the moment of access — the user's role, their location (in the hospital), the time (during shift), and the resource context (active patient assignment). Unlike RBAC, which grants static permissions by role, ABAC makes dynamic, context-aware decisions. This is the most granular model. MAC uses security labels (classified/secret), DAC lets the owner decide, and RBAC only considers the role — none of those account for time and location.",
    },
  },
  {
    stepLabel: "Understand Non-repudiation",
    explanation: "Non-repudiation ensures that a sender cannot deny having sent a message and a recipient cannot deny having received it. Digital signatures provide non-repudiation through asymmetric cryptography. Review the concept.",
    whyItMatters: "Non-repudiation is critical for legal and audit contexts — contracts, financial transactions, and evidence. Security+ tests whether you can identify which controls provide non-repudiation (digital signatures, audit logs) and which do not (symmetric encryption alone).",
    command: "cryptctl verify --concept non-repudiation --output table",
    prompt: "analyst@secplus:~$",
    output: [
      "-----------------------------------------------------------",
      "|  Mechanism            |  Provides Non-repudiation?  |  Why  |",
      "+-----------------------+----------------------------+-------+",
      "|  Digital Signature    |  Yes                        |  Private key is unique |",
      "|  Audit Log (tamper-proof) |  Yes                   |  Immutable record     |",
      "|  Symmetric Encryption |  No                        |  Shared key = no proof |",
      "|  Hash Alone           |  No                        |  No identity binding   |",
      "|  Digital Signature + Hash |  Yes                  |  Identity + integrity |",
      "+-----------------------+----------------------------+-------+",
    ],
    question: {
      text: "Why does symmetric encryption alone NOT provide non-repudiation?",
      options: [
        "Because symmetric encryption is too slow to prove anything",
        "Because both parties share the same key, so either could have created the message — there is no way to prove which one sent it",
        "Because symmetric encryption does not actually encrypt data",
        "Because symmetric encryption uses public keys which anyone can access",
      ],
      correctIndex: 1,
      explanation: "Non-repudiation requires that only one party could have produced a message. With symmetric encryption, both the sender and receiver share the same key — so either party could have encrypted or decrypted the message. There is no way to prove who created it. Digital signatures solve this using asymmetric keys: only the holder of the private key can sign, and anyone with the public key can verify. The private key is unique to the signer, providing non-repudiation.",
    },
  },
];

const intro = {
  overview: "This lab covers CompTIA Security+ (SY0-701) Domain 1: General Security Concepts. You'll explore the CIA Triad, security control classifications, multi-factor authentication, symmetric vs. asymmetric cryptography, access control models, and non-repudiation through hands-on CLI exercises.",
  niceCategory: "General Security Concepts",
  objectives: [
    "Classify security controls using the CIA Triad (Confidentiality, Integrity, Availability)",
    "Distinguish between preventive, detective, corrective, deterrent, compensating, and directive controls",
    "Identify multi-factor authentication factors and their categories",
    "Compare symmetric and asymmetric cryptography and their use cases",
    "Differentiate between MAC, DAC, RBAC, and ABAC access control models",
    "Explain how digital signatures provide non-repudiation",
  ],
  outcomes: [
    "Able to map any security control to a CIA Triad property",
    "Can classify controls by function (preventive, detective, corrective)",
    "Understands MFA factor categories and why cross-category matters",
    "Able to choose the right cryptographic approach for a given scenario",
    "Can match access control models to real-world environments",
    "Understands why symmetric encryption alone cannot provide non-repudiation",
  ],
  prerequisites: [
    "Basic understanding of IT and networking concepts",
    "Familiarity with a command-line interface is helpful but not required",
  ],
  tools: [
    "Security CLI — simulated command-line interface for security control management",
    "OpenSSL — cryptography toolkit for key and certificate operations",
    "Access control utilities — for reviewing authentication and authorization models",
  ],
};

export default function LabSecPlusDomain1() {
  return (
    <LabRunner
      labTitle="Security+ Domain 1: General Security Concepts"
      chapterNum="1"
      difficulty="Beginner"
      tags={["CompTIA", "Security+", "SY0-701", "CIA Triad", "MFA", "Cryptography"]}
      terminalLabel="Security+ CLI — General Security Concepts"
      duration={45}
      intro={intro}
      steps={steps}
    />
  );
}