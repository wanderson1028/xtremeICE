import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Review the AWS Shared Responsibility Model",
    explanation: "AWS operates under a Shared Responsibility Model: AWS is responsible for security OF the cloud (infrastructure), while the customer is responsible for security IN the cloud (data, configs, access). Review the model.",
    whyItMatters: "The Shared Responsibility Model is the single most tested concept in CLF-002 Domain 2. Misunderstanding it leads to false assumptions — e.g., assuming AWS patches your EC2 OS (it does not). Knowing exactly where the boundary lies prevents security gaps and compliance failures.",
    command: "aws security describe-shared-responsibility --output table",
    prompt: "awsadmin@cli:~$",
    output: [
      "----------------------------------------------------------",
      "|       AWS (Security OF the Cloud)  |  Customer (IN)   |",
      "+------------------------------------+-------------------+",
      "|  Physical security of data centers |  Data encryption  |",
      "|  Hardware (hosts, storage, network)|  IAM users/roles  |",
      "|  Region/AZ infrastructure           |  OS & app patches |",
      "|  Managed service patching (RDS)     |  Security groups  |",
      "|  Network infrastructure             |  Data classification|",
      "+------------------------------------+-------------------+",
    ],
    question: {
      text: "You deploy an EC2 instance and leave the OS unpatched for 6 months. A known vulnerability is exploited. Who is responsible for the compromise?",
      options: [
        "AWS, because they own the underlying hardware",
        "The customer, because patching the guest OS and applications is a customer responsibility under the Shared Responsibility Model (security IN the cloud)",
        "Shared equally — AWS patches half the OS and the customer patches the other half",
        "Neither — EC2 instances are automatically patched by AWS",
      ],
      correctIndex: 1,
      explanation: "Under the Shared Responsibility Model, AWS secures the infrastructure (physical facilities, host hardware, network, virtualization layer) — security OF the cloud. The customer secures everything above the hypervisor: the guest OS, applications, data, IAM, and network configuration (security groups) — security IN the cloud. EC2 is IaaS, so OS patching is explicitly the customer's job. AWS only patches managed services like RDS. Leaving an EC2 OS unpatched is a customer-side failure, not an AWS one.",
    },
  },
  {
    stepLabel: "List IAM users in the account",
    explanation: "AWS Identity and Access Management (IAM) controls who is authenticated and authorized to use AWS resources. List the IAM users in your account.",
    whyItMatters: "IAM is the front door to your AWS account. Unmanaged users, shared credentials, and over-privileged policies are leading causes of cloud breaches. Auditing who has access is a foundational security practice.",
    command: "aws iam list-users --query 'Users[].{User:UserName,Created:CreateDate}' --output table",
    prompt: "awsadmin@cli:~$",
    output: [
      "----------------------------------------------------",
      "|     User      |            Created               |",
      "+---------------+----------------------------------+",
      "|  admin        |  2026-01-15T10:00:00Z            |",
      "|  dev-user     |  2026-03-22T14:30:00Z            |",
      "|  ci-deploy    |  2026-05-10T08:15:00Z            |",
      "|  temp-contractor | 2026-06-01T09:00:00Z      ← REVIEW |",
      "+---------------+----------------------------------+",
      "",
      "[!] 'temp-contractor' created 3 months ago — verify if still needed",
    ],
    question: {
      text: "The audit shows a 'temp-contractor' user created 3 months ago. What is the principle of least privilege as applied to IAM, and what action does it imply here?",
      options: [
        "Grant all users AdministratorAccess so they can do anything needed",
        "Grant only the minimum permissions required for a role, and remove access when no longer needed — the temp-contractor account should be disabled or deleted if the engagement has ended",
        "Keep all IAM users active permanently in case they are needed later",
        "Least privilege means using the root account for all operations to avoid permission errors",
      ],
      correctIndex: 1,
      explanation: "Least privilege grants only the permissions necessary to perform a task — and only for as long as needed. A temporary contractor who finished their engagement 3 months ago should no longer have access. Stale accounts are a major attack surface: credentials leak, get brute-forced, or are abused by disgruntled former contractors. The correct action is to disable and then delete the user, or rotate credentials if the engagement is ongoing. Never grant broad permissions like AdministratorAccess unless truly required.",
    },
  },
  {
    stepLabel: "Check root account MFA status",
    explanation: "The AWS root account has unrestricted access to all resources. Verify whether MFA (multi-factor authentication) is enabled on the root account — this is the single most important account security control.",
    whyItMatters: "A compromised root account means total account takeover — an attacker can delete everything, create resources to mine crypto at your expense, or exfiltrate all data. MFA on root is non-negotiable. CLF-002 tests root account protection practices directly.",
    command: "aws iam get-account-summary --query 'SummaryMap.Users' --output text && aws iam list-virtual-mfa-devices --query 'VirtualMFADevices[].SerialNumber' --output table",
    prompt: "awsadmin@cli:~$",
    output: [
      "3",
      "---------------------------------------",
      "|            SerialNumber             |",
      "+-------------------------------------+",
      "|  arn:aws:iam::123456789012:mfa/admin |",
      "|  arn:aws:iam::123456789012:mfa/dev   |",
      "+-------------------------------------+",
      "",
      "[!] Root account MFA: NOT ENABLED — CRITICAL RISK",
      "[!] Action required: Enable hardware or virtual MFA on root immediately",
    ],
    question: {
      text: "Why is enabling MFA on the AWS root account considered the most critical single security action for an AWS account?",
      options: [
        "MFA makes the root account faster to log into",
        "The root account has unrestricted, irrevocable access to all resources and billing — MFA prevents an attacker with a stolen password from taking over the entire account, even if the password is compromised",
        "MFA is required to use any AWS service at all",
        "Root account MFA automatically patches all EC2 instances",
      ],
      correctIndex: 1,
      explanation: "The root account can do anything in the account — there are no permissions you can remove from root. If an attacker steals the root password, they own the account completely: they can delete all data, close the account, rack up massive crypto-mining bills, and lock you out. MFA adds a second factor (a code from a device) so a stolen password alone is not enough. Because root cannot be permission-scoped, MFA is the primary defense. AWS best practice is to lock away root credentials, use them only for account setup, enable MFA, and perform daily work as an IAM user or role.",
    },
  },
  {
    stepLabel: "Review an IAM policy document",
    explanation: "IAM policies are JSON documents that define permissions. Review a policy attached to an S3 access role and identify whether it follows least privilege.",
    whyItMatters: "Overly broad policies (e.g., Action: 's3:*' on Resource: '*') are a top cause of accidental data exposure and lateral movement. Reading and writing precise policies is a core IAM skill tested on CLF-002.",
    command: "aws iam get-role-policy --role-name S3AccessRole --policy-name S3ReadOnly",
    prompt: "awsadmin@cli:~$",
    output: [
      "{",
      "  \"RoleName\": \"S3AccessRole\",",
      "  \"PolicyName\": \"S3ReadOnly\",",
      "  \"PolicyDocument\": {",
      "    \"Version\": \"2012-10-17\",",
      "    \"Statement\": [",
      "      {",
      "        \"Effect\": \"Allow\",",
      "        \"Action\": [\"s3:Get*\", \"s3:List*\"],",
      "        \"Resource\": [\"arn:aws:s3:::company-docs\", \"arn:aws:s3:::company-docs/*\"]",
      "      }",
      "    ]",
      "  }",
      "}",
      "",
      "[*] This policy follows least privilege: read-only, scoped to one bucket",
    ],
    question: {
      text: "A colleague proposes changing the policy above to Effect: Allow, Action: 's3:*', Resource: '*' for convenience. What risk does this introduce?",
      options: [
        "No risk — it only affects one bucket",
        "It grants full S3 permissions (read, write, delete, bucket creation/deletion) across ALL buckets in the account, violating least privilege and enabling accidental or malicious data destruction and exfiltration",
        "It improves security by giving the role more flexibility",
        "It has no effect because IAM policies are not enforced until approved by AWS",
      ],
      correctIndex: 1,
      explanation: "Action: 's3:*' grants every S3 operation — not just read, but also s3:DeleteBucket, s3:PutObject, s3:DeleteObject, and s3:CreateBucket. Resource: '*' applies it to every bucket in the account. A role meant for read-only access to one bucket would suddenly be able to delete every bucket and overwrite every object. This violates least privilege and dramatically increases blast radius: a compromised role, a buggy script, or an insider could destroy or exfiltrate all S3 data. The original scoped policy (s3:Get*, s3:List* on one bucket) is the correct least-privilege approach.",
    },
  },
  {
    stepLabel: "Query CloudTrail for recent API activity",
    explanation: "AWS CloudTrail records API calls made in your account — who did what, when, and from where. Query recent management events to audit account activity.",
    whyItMatters: "CloudTrail is the audit backbone of AWS security and compliance. Without it, you cannot investigate incidents, prove compliance to auditors, or detect unauthorized access. CLF-002 expects you to know CloudTrail's purpose and how it supports governance.",
    command: "aws cloudtrail lookup-events --max-results 5 --query 'Events[].{Time:EventTime,User:Username,Event:EventName}' --output table",
    prompt: "awsadmin@cli:~$",
    output: [
      "----------------------------------------------------------",
      "|        Time        |    User    |       Event            |",
      "+--------------------+------------+-----------------------+",
      "|  2026-08-20 13:55  |  admin     |  ConsoleLogin          |",
      "|  2026-08-20 13:52  |  ci-deploy |  AssumeRole            |",
      "|  2026-08-20 13:40  |  dev-user  |  RunInstances          |",
      "|  2026-08-20 13:30  |  root      |  CreateBucket          |",
      "|  2026-08-20 13:15  |  unknown   |  DeleteUser            |  ← SUSPICIOUS",
      "+--------------------+------------+-----------------------+",
      "",
      "[!] 'unknown' user deleted an IAM user — investigate immediately",
    ],
    question: {
      text: "CloudTrail shows a 'DeleteUser' event by an 'unknown' principal. Why is CloudTrail essential for responding to this incident, and what compliance role does it serve?",
      options: [
        "CloudTrail automatically blocks suspicious API calls before they execute",
        "CloudTrail provides the immutable audit log of who did what and when — essential for incident investigation, root-cause analysis, and proving compliance to auditors (e.g., demonstrating access controls to HIPAA or PCI-DSS examiners)",
        "CloudTrail encrypts all data at rest so incidents cannot happen",
        "CloudTrail is only for billing, not security",
      ],
      correctIndex: 1,
      explanation: "CloudTrail records every API call (who, what, when, source IP) as an immutable audit trail. For this incident, it tells you exactly which principal deleted the user and from where — the starting point for investigation. Beyond incident response, CloudTrail is a core compliance control: HIPAA, PCI-DSS, SOC 2, and ISO 27001 all require auditable access logs. Without CloudTrail, you cannot prove to an auditor that access controls are working or investigate a breach. It does not block calls (that is IAM and service control policies) — it records them.",
    },
  },
  {
    stepLabel: "Review AWS compliance programs",
    explanation: "AWS maintains certifications and attestations so customers can run regulated workloads in the cloud. Review the compliance programs AWS supports.",
    whyItMatters: "AWS does not make you compliant — it provides controls and attestations that you can build on. Knowing which programs AWS participates in (HIPAA, PCI-DSS, SOC, ISO, FedRAMP) helps you choose services and satisfy your own compliance obligations. This is a key CLF-002 Domain 2 topic.",
    command: "aws auditmanager list-assessments --query 'Assessments[].{Name:AssessmentName,Status:Status}' --output table 2>/dev/null || echo '--- AWS Compliance Programs ---' && echo 'HIPAA | PCI-DSS | SOC 1/2/3 | ISO 27001 | FedRAMP | GDPR | CCPA'",
    prompt: "awsadmin@cli:~$",
    output: [
      "--- AWS Compliance Programs ---",
      "HIPAA        — Health Insurance Portability and Accountability Act",
      "PCI-DSS      — Payment Card Industry Data Security Standard",
      "SOC 1/2/3    — Service Organization Controls (AICPA)",
      "ISO 27001    — Information security management standard",
      "FedRAMP      — U.S. Federal Risk and Authorization Program",
      "GDPR         — General Data Protection Regulation (EU)",
      "CCPA         — California Consumer Privacy Act",
      "",
      "[*] AWS provides attestations; the customer builds compliant architectures on top",
    ],
    question: {
      text: "A healthcare startup wants to store patient records on AWS and claims 'AWS is HIPAA-compliant, so we are too.' What is the flaw in this reasoning?",
      options: [
        "AWS is not HIPAA-compliant at all",
        "AWS provides HIPAA-eligible services and a Business Associate Agreement (BAA), but HIPAA compliance is shared — the customer must also configure services correctly, encrypt PHI, enforce access controls, and sign the BAA. AWS's compliance does not automatically make the customer compliant",
        "HIPAA does not apply to cloud workloads",
        "Only the root account needs to be HIPAA-compliant",
      ],
      correctIndex: 1,
      explanation: "HIPAA compliance is shared. AWS provides HIPAA-eligible services, signs a BAA (required for covered entities), and maintains attestations — but that only covers the infrastructure side. The customer must also: configure encryption for PHI at rest and in transit, enforce least-privilege access, audit access via CloudTrail, use HIPAA-eligible services only for PHI, and sign the BAA with AWS. Simply putting data on AWS does not make you compliant — a misconfigured S3 bucket with public read on PHI is a HIPAA violation regardless of AWS's certifications. Compliance is a shared, active responsibility.",
    },
  },
];

const intro = {
  overview: "This lab covers AWS security and compliance fundamentals from CLF-002 Domain 2. You'll explore the AWS Shared Responsibility Model, IAM users and policies, root account protection with MFA, CloudTrail auditing, and AWS compliance programs (HIPAA, PCI-DSS, SOC) using the AWS CLI.",
  niceCategory: "Security & Compliance",
  objectives: [
    "Explain the AWS Shared Responsibility Model and identify customer vs. AWS responsibilities",
    "Audit IAM users and apply the principle of least privilege",
    "Verify root account MFA status and explain why it is critical",
    "Read and evaluate IAM policy documents for least-privilege compliance",
    "Query CloudTrail to investigate API activity and support incident response",
    "Describe AWS compliance programs and the shared nature of regulatory compliance",
  ],
  outcomes: [
    "Able to articulate the Shared Responsibility Model boundary",
    "Can identify stale or over-privileged IAM users",
    "Understand why root account MFA is the most critical account control",
    "Able to read IAM policy JSON and spot overly broad permissions",
    "Can use CloudTrail logs for incident investigation and compliance audits",
    "Understand that AWS certifications support, but do not replace, customer compliance",
  ],
  prerequisites: [
    "Completion of the AWS Cloud Concepts lab is recommended",
    "Basic familiarity with JSON is helpful",
  ],
  tools: [
    "AWS IAM — identity and access management",
    "AWS CloudTrail — API call auditing and logging",
    "AWS Audit Manager — compliance evidence collection",
    "AWS Compliance Programs — HIPAA, PCI-DSS, SOC, ISO 27001, FedRAMP",
  ],
};

export default function LabAwsSecurityCompliance() {
  return (
    <LabRunner
      labTitle="AWS Security & Compliance"
      chapterNum="2"
      difficulty="Beginner"
      tags={["AWS", "CLF-002", "IAM", "CloudTrail", "Shared Responsibility", "Compliance"]}
      terminalLabel="AWS CLI — Security & Compliance Environment"
      duration={50}
      intro={intro}
      steps={steps}
    />
  );
}