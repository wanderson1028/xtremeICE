import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Establish Governance and Policy",
    explanation: "Security governance provides the framework of policies, standards, and procedures that guide an organization's security program. Key documents include: security policy (high-level), standards (mandatory rules), guidelines (recommended), and procedures (step-by-step). Review the document hierarchy.",
    whyItMatters: "Security+ tests your understanding of the policy hierarchy and the difference between policies (mandatory, high-level), standards (mandatory, specific), guidelines (recommended), and procedures (step-by-step). Governance is the foundation — without it, technical controls lack direction and accountability.",
    command: "govctl hierarchy --output table",
    prompt: "analyst@secplus:~$",
    output: [
      "---------------------------------------------------------------",
      "|  Document     |  Level        |  Mandatory  |  Scope       |",
      "+---------------+---------------+-------------+---------------+",
      "|  Policy       |  High-level   |  Yes        |  Organization |",
      "|  Standard     |  Specific     |  Yes        |  Technical    |",
      "|  Guideline   |  Recommended  |  No         |  Best practice|",
      "|  Procedure    |  Step-by-step |  Yes        |  Operational  |",
      "|  Baseline     |  Minimum cfg  |  Yes        |  System       |",
      "|  AUP          |  User conduct |  Yes        |  All users    |",
      "+---------------+---------------+-------------+---------------+",
    ],
    question: {
      text: "A security manager writes a document that says 'All servers must have disk encryption enabled using AES-256.' Another document says 'Administrators should consider enabling multifactor authentication for remote access where feasible.' Which document types are these respectively?",
      options: [
        "Both are policies",
        "The first is a standard (mandatory, specific technical requirement: AES-256); the second is a guideline (recommended, not mandatory: 'should consider' and 'where feasible')",
        "The first is a guideline; the second is a standard",
        "Both are procedures",
      ],
      correctIndex: 1,
      explanation: "A standard is mandatory and specific — 'must have disk encryption using AES-256' is a concrete, enforceable technical requirement. A guideline is recommended and flexible — 'should consider' and 'where feasible' indicate it is advice, not a mandate. The key words: 'must' = mandatory (policy or standard), 'should consider' = recommended (guideline). Policies are high-level directives; standards specify the mandatory technical details; guidelines offer best-practice advice; procedures give step-by-step instructions.",
    },
  },
  {
    stepLabel: "Conduct a Risk Assessment",
    explanation: "Risk assessment identifies, analyzes, and evaluates risks to organizational assets. The risk equation is: Risk = Threat × Vulnerability × Asset Value. Risk responses include: mitigate (reduce), transfer (insurance), accept (acknowledge), and avoid (eliminate). Review the risk management process.",
    whyItMatters: "Security+ tests your ability to calculate risk and choose the appropriate response. You cannot eliminate all risk — the goal is to reduce it to an acceptable level (risk appetite). Understanding the four responses (mitigate, transfer, accept, avoid) is a core exam concept.",
    command: "riskctl assess --method qualitative --output table",
    prompt: "analyst@secplus:~$",
    output: [
      "---------------------------------------------------------------",
      "|  Risk ID  |  Threat        |  Vulnerability   |  Response  |",
      "+----------+----------------+-------------------+-----------+",
      "|  R-01     |  Data breach   |  No encryption   |  Mitigate  |",
      "|  R-02     |  DDoS attack   |  No mitigation    |  Transfer |",
      "|  R-03     |  Low-impact    |  Legacy printer   |  Accept   |",
      "|  R-04     |  Reg. violation|  No audit logs    |  Mitigate  |",
      "|  R-05     |  High-cost svc |  Unneeded feature |  Avoid    |",
      "+----------+----------------+-------------------+-----------+",
      "[*] Risk = Threat × Vulnerability × Asset Value",
    ],
    question: {
      text: "A company identifies a risk of flooding to its data center located in a flood plain. After analysis, they decide to purchase cyber insurance to cover potential flood-related losses. Which risk response strategy is this?",
      options: [
        "Mitigate — they are reducing the likelihood of flooding",
        "Transfer — they are shifting the financial impact of the risk to an insurance provider",
        "Accept — they are acknowledging the risk and doing nothing",
        "Avoid — they are eliminating the risk entirely",
      ],
      correctIndex: 1,
      explanation: "Transferring risk means shifting the financial impact to a third party — typically through insurance or a contract. The company cannot prevent flooding (they cannot mitigate the natural threat), and they choose not to move the data center (avoid). By purchasing insurance, they transfer the financial cost of a flood to the insurer. The risk still exists, but the financial burden is shared. Mitigation would be installing flood barriers; avoidance would be relocating the data center; acceptance would be doing nothing and absorbing the loss. Transfer is a valid strategy when mitigation is impractical or too expensive.",
    },
  },
  {
    stepLabel: "Map Compliance Frameworks",
    explanation: "Compliance frameworks define security requirements for specific industries and data types: HIPAA (healthcare), PCI-DSS (payment cards), SOX (public companies), GDPR (EU personal data), NIST 800-53 (government), and ISO 27001 (international). Review the frameworks.",
    whyItMatters: "Security+ tests your ability to match a framework to its scope. PCI-DSS applies to any organization processing card payments; HIPAA covers protected health information; GDPR governs EU residents' personal data. Non-compliance can result in fines, legal action, and loss of business.",
    command: "compliancectl frameworks --output table",
    prompt: "analyst@secplus:~$",
    output: [
      "---------------------------------------------------------------",
      "|  Framework    |  Scope              |  Regulator/Body   |",
      "+---------------+---------------------+-------------------+",
      "|  HIPAA        |  Healthcare (PHI)   |  HHS (US)         |",
      "|  PCI-DSS      |  Payment cards     |  PCI SSC          |",
      "|  SOX          |  Public companies  |  SEC (US)         |",
      "|  GDPR         |  EU personal data  |  EU Commission     |",
      "|  NIST 800-53  |  US Government     |  NIST             |",
      "|  ISO 27001    |  International     |  ISO/IEC          |",
      "+---------------+---------------------+-------------------+",
    ],
    question: {
      text: "An e-commerce company processes credit card payments on its website. Which compliance framework must it adhere to, and what is the primary focus of that framework?",
      options: [
        "HIPAA — protecting health information",
        "PCI-DSS (Payment Card Industry Data Security Standard) — protecting cardholder data and ensuring secure payment processing",
        "SOX — financial reporting controls for public companies",
        "GDPR — protecting EU personal data",
      ],
      correctIndex: 1,
      explanation: "PCI-DSS applies to any organization that stores, processes, or transmits cardholder data. The e-commerce site processes credit card payments, so it must comply with PCI-DSS. The framework's primary focus is protecting cardholder data (card numbers, CVVs) through requirements like encryption, access controls, network segmentation, and regular vulnerability scanning. HIPAA is for healthcare (PHI), SOX is for public company financial reporting, and GDPR is for EU personal data. A company can be subject to multiple frameworks simultaneously — e.g., an e-commerce site may need PCI-DSS and GDPR.",
    },
  },
  {
    stepLabel: "Implement Security Awareness Training",
    explanation: "Security awareness training educates users on security threats and their role in protecting the organization. Topics include phishing recognition, password hygiene, data handling, and incident reporting. Review the training program components.",
    whyItMatters: "Humans are the weakest link in security — most breaches involve social engineering. Security+ covers awareness training as a critical control. Phishing simulations, onboarding training, and periodic refreshers reduce the risk of successful social engineering attacks.",
    command: "awarenessctl program --components --output table",
    prompt: "analyst@secplus:~$",
    output: [
      "---------------------------------------------------------------",
      "|  Component          |  Audience    |  Frequency  |  Method  |",
      "+---------------------+--------------+-------------+----------+",
      "|  Onboarding training|  New hires   |  Once       |  Course  |",
      "|  Phishing simulation|  All staff   |  Monthly   |  Simulated|",
      "|  Annual refresher   |  All staff   |  Yearly     |  Course  |",
      "|  Role-based training|  IT/Admins   |  Quarterly  |  Workshop|",
      "|  Incident reporting |  All staff   |  Ongoing    |  Portal  |",
      "|  Executive briefing |  Leadership  |  Quarterly  |  Meeting |",
      "+---------------------+--------------+-------------+----------+",
    ],
    question: {
      text: "An organization sends simulated phishing emails to employees monthly. An employee clicks a simulated phishing link and is automatically enrolled in a short remediation training. What is the primary goal of this approach?",
      options: [
        "To punish employees who click links",
        "To provide immediate, contextual training to the employees who demonstrated a vulnerability, reinforcing correct behavior through real-time feedback rather than punishment",
        "To track which employees to fire",
        "To block all external email for those employees",
      ],
      correctIndex: 1,
      explanation: "Phishing simulation with immediate remediation training is a proven awareness technique. The goal is education, not punishment. When an employee clicks a simulated phishing link, they receive instant feedback ('This was a simulated phishing email — here's what to look for') and a short training module. This contextual, just-in-time training is far more effective than generic annual training because it connects the lesson to the employee's actual action. The program reduces click rates over time by building muscle memory for spotting phishing indicators. Tracking is for measuring program effectiveness, not for punitive action.",
    },
  },
  {
    stepLabel: "Manage Third-Party Risk",
    explanation: "Third-party (vendor) risk management assesses the security of suppliers, contractors, and service providers. Key activities include: due diligence (pre-contract assessment), contract terms (security requirements), ongoing monitoring, and incident notification clauses. Review the vendor risk lifecycle.",
    whyItMatters: "Security+ covers third-party risk as a growing threat vector — many breaches originate through vendors (the Target breach came through an HVAC contractor). Organizations must assess vendor security before granting access and monitor it throughout the relationship.",
    command: "vendorctl lifecycle --output table",
    prompt: "analyst@secplus:~$",
    output: [
      "---------------------------------------------------------------",
      "|  Stage           |  Activity                     |  When     |",
      "+------------------+-------------------------------+-----------+",
      "|  Due Diligence   |  Security assessment, SOC 2   |  Pre-contract|",
      "|  Contract Terms  |  Security clauses, SLA       |  Signing  |",
      "|  Onboarding      |  Access provisioning, baseline|  Start    |",
      "|  Monitoring      |  Continuous assessment, audit |  Ongoing |",
      "|  Incident Notify |  Vendor breach notification   |  As needed|",
      "|  Offboarding     |  Revoke access, data return   |  End      |",
      "+------------------+-------------------------------+-----------+",
    ],
    question: {
      text: "A SaaS vendor experiences a data breach that may have exposed your company's data. The vendor waits two weeks before notifying you. Why is this a problem, and what contract clause should have prevented it?",
      options: [
        "It is not a problem — the vendor handled it internally",
        "A breach notification clause specifying a maximum notification window (e.g., 24-72 hours) should have been in the contract; the two-week delay prevented your organization from containing the incident, notifying regulators, and protecting affected individuals within legal deadlines",
        "The vendor should have fixed the breach before telling anyone",
        "Only a non-disclosure agreement (NDA) is needed, not a notification clause",
      ],
      correctIndex: 1,
      explanation: "Breach notification clauses are critical in vendor contracts. They require the vendor to notify the customer within a specified timeframe (often 24-72 hours) after discovering a breach involving the customer's data. The two-week delay is a serious problem because: (1) your organization loses valuable containment time, (2) you may miss regulatory notification deadlines (GDPR requires 72 hours, some US laws are shorter), and (3) affected individuals are left unprotected longer. An NDA is about confidentiality, not breach response. The notification clause, along with right-to-audit and security requirement clauses, forms the backbone of third-party risk management in contracts.",
    },
  },
  {
    stepLabel: "Apply the NIST Risk Management Framework",
    explanation: "The NIST Risk Management Framework (RMF) provides a structured approach to managing security risk: Categorize, Select, Implement, Assess, Authorize, and Monitor (CSIAM). Review the RMF steps.",
    whyItMatters: "Security+ references the NIST RMF as a governance process for systems. The six steps ensure security controls are selected based on risk, implemented correctly, assessed for effectiveness, authorized by a senior official, and continuously monitored. This is the lifecycle that keeps security aligned with risk over time.",
    command: "rmfctl steps --framework nist --output table",
    prompt: "analyst@secplus:~$",
    output: [
      "---------------------------------------------------------------",
      "|  Step          |  Activity                     |  Output    |",
      "+----------------+-------------------------------+-----------+",
      "|  1. Categorize |  Classify system & data       |  FIPS 199 |",
      "|  2. Select    |  Choose security controls     |  Control set|",
      "|  3. Implement |  Deploy controls              |  Config    |",
      "|  4. Assess    |  Test control effectiveness   |  SAR       |",
      "|  5. Authorize |  Senior official approves     |  ATO       |",
      "|  6. Monitor   |  Continuous assessment        |  Ongoing   |",
      "+----------------+-------------------------------+-----------+",
    ],
    question: {
      text: "In the NIST RMF, what is the purpose of the 'Authorize' step, and who typically performs it?",
      options: [
        "It is a technical test of the controls; performed by the security engineer",
        "It is a formal acceptance of risk by a senior official (Authorizing Official) who decides whether the system can operate based on the assessed residual risk — it is a business decision, not a technical one",
        "It is the implementation of controls; performed by the IT team",
        "It is the categorization of the system; performed by the data owner",
      ],
      correctIndex: 1,
      explanation: "The Authorize step (producing an Authorization to Operate, or ATO) is a senior leadership decision, not a technical one. After controls are implemented (step 3) and assessed for effectiveness (step 4), the Authorizing Official (AO) — a senior executive like a CIO or system owner — reviews the residual risk and formally decides whether the system can go live. The AO accepts the remaining risk on behalf of the organization. This separates technical assessment (step 4, by assessors) from business risk acceptance (step 5, by leadership). If the residual risk is too high, the AO can deny the ATO and require additional controls before authorization.",
    },
  },
];

const intro = {
  overview: "This lab covers CompTIA Security+ (SY0-701) Domain 5: Security Program Management and Oversight. You'll establish governance and policy, conduct risk assessments, map compliance frameworks, implement security awareness training, manage third-party risk, and apply the NIST Risk Management Framework through hands-on CLI exercises.",
  niceCategory: "Security Program Management and Oversight",
  objectives: [
    "Distinguish between policies, standards, guidelines, and procedures in the governance hierarchy",
    "Conduct risk assessments and select appropriate risk responses (mitigate, transfer, accept, avoid)",
    "Map compliance frameworks (HIPAA, PCI-DSS, SOX, GDPR, NIST, ISO 27001) to their scopes",
    "Design security awareness training programs with phishing simulation",
    "Manage third-party risk through due diligence, contract clauses, and ongoing monitoring",
    "Apply the NIST Risk Management Framework (Categorize, Select, Implement, Assess, Authorize, Monitor)",
  ],
  outcomes: [
    "Able to classify governance documents by type and authority level",
    "Can calculate risk and choose the appropriate risk response strategy",
    "Understands which compliance framework applies to a given industry or data type",
    "Able to design a phishing simulation program with remediation training",
    "Can identify necessary vendor contract clauses for third-party risk management",
    "Understands the NIST RMF lifecycle and the business nature of the Authorize step",
  ],
  prerequisites: [
    "Completion of Security+ Domains 1-4 (recommended)",
    "Understanding of organizational security concepts",
  ],
  tools: [
    "Governance CLI — for managing policies, standards, and procedures",
    "Risk Assessment Tool — for identifying and evaluating organizational risks",
    "Compliance Framework Reference — for mapping regulatory requirements",
  ],
};

export default function LabSecPlusDomain5() {
  return (
    <LabRunner
      labTitle="Security+ Domain 5: Security Program Management & Oversight"
      chapterNum="5"
      difficulty="Intermediate"
      tags={["CompTIA", "Security+", "SY0-701", "Governance", "Risk", "Compliance", "GRC"]}
      terminalLabel="Security+ CLI — Program Management & Oversight"
      duration={55}
      intro={intro}
      steps={steps}
    />
  );
}