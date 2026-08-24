import React from "react";
import LabRunner from "@/components/labs/LabRunner";
import MlSharedResponsibilityBar from "@/components/labs/aws/MlSharedResponsibilityBar";

const steps = [
  {
    stepLabel: "Review the ML shared responsibility model",
    explanation: "Just as AWS has a shared responsibility model for cloud security, ML extends it: AWS secures the foundation models and infrastructure, while you are responsible for your prompts, training data, model outputs, and governance.",
    whyItMatters: "AIF-C01 Domain 5 starts here. The exam tests whether you know that putting customer data into prompts, fine-tuning on proprietary data, and governing model outputs are all customer responsibilities — AWS does not secure what you send to or get from a model. Confusing this boundary is a common security failure.",
    visual: <MlSharedResponsibilityBar />,
    command: "aws bedrock describe-shared-responsibility --output table",
    prompt: "mladmin@cli:~$",
    output: [
      "---------------------------------------------------------",
      "|  Layer                    |  Responsible Party         |",
      "+---------------------------+---------------------------+",
      "|  Infrastructure           |  AWS                      |",
      "|  Foundation models (base) |  AWS                      |",
      "|  Fine-tuned weights       |  Customer                 |",
      "|  Prompts & app logic      |  Customer                 |",
      "|  Model outputs & user data|  Customer                 |",
      "|  Governance & compliance  |  Customer                 |",
      "+---------------------------+---------------------------+",
    ],
    question: {
      text: "A company fine-tunes a Bedrock model on proprietary customer data and deploys it. Who is responsible for securing the fine-tuned weights and the customer data in prompts?",
      options: [
        "AWS — it secures all models and data on Bedrock",
        "The customer — fine-tuned weights, prompts, and user data are customer responsibilities under the ML shared responsibility model; AWS only secures the base model and infrastructure",
        "Shared equally — both parties are jointly liable",
        "The model provider (e.g., Anthropic) — it owns the model",
      ],
      correctIndex: 1,
      explanation: "Under the ML shared responsibility model, the customer is responsible for fine-tuned weights, prompts, application logic, and user data — everything above the base foundation model. AWS secures the infrastructure and the base model, but once you fine-tune or send data to the model, securing that data and those weights is your job. This is why encryption, IAM, and data governance on your prompts and outputs are critical. Confusing this boundary (assuming AWS secures your prompts) is a common AIF-C01-tested failure.",
    },
  },
  {
    stepLabel: "Secure training data",
    explanation: "Training and fine-tuning data must be secured and governed. AWS services like Macie (PII discovery), Glue (data catalog), and KMS (encryption) help protect training datasets. Review the data security toolkit.",
    whyItMatters: "AIF-C01 tests data security for ML. Training data often contains PII or sensitive information; if leaked through a model, it violates privacy regulations. Macie discovers PII in S3 buckets before they're used for training. KMS encrypts data at rest. Knowing these services maps to the privacy & security dimension of responsible ML.",
    command: "aws macie2 describe-classification-jobs --output table && aws kms list-keys --query 'Keys[].KeyId' --output table",
    prompt: "mladmin@cli:~$",
    output: [
      "Macie Classification Jobs:",
      "  Job: training-data-scan | Status: COMPLETE",
      "  Findings: 14 PII records in s3://ml-training-dataset/",
      "    - 8 SSN, 4 credit_card, 2 email",
      "",
      "KMS Keys:",
      "  Key: alias/ml-training-data (ENABLED)",
      "  Key: alias/bedrock-inference (ENABLED)",
    ],
    question: {
      text: "Before using an S3 bucket of customer records to fine-tune a model, which AWS service should you run to discover and redact PII, and why is this critical?",
      options: [
        "Amazon Macie — it automatically discovers and classifies PII (SSNs, credit cards, emails) in S3 so you can redact or encrypt before training, preventing PII leakage through the model",
        "Amazon SageMaker — it trains the model and removes PII automatically during training",
        "Amazon Bedrock — it has built-in PII redaction for all training data",
        "AWS CloudTrail — it logs who accessed the training data",
      ],
      correctIndex: 0,
      explanation: "Amazon Macie discovers and classifies PII in S3 buckets using ML. Running Macie before fine-tuning lets you find and redact or encrypt PII (SSNs, credit cards, emails) so it doesn't leak through the model — models can memorize and regurgitate training data. SageMaker doesn't auto-remove PII. Bedrock doesn't auto-redact training data. CloudTrail logs access but doesn't find PII. Macie is the right service for pre-training data hygiene, a core AIF-C01 security practice.",
    },
  },
  {
    stepLabel: "Protect model endpoints",
    explanation: "Model endpoints (SageMaker endpoints, Bedrock inference) must be protected with IAM (least-privilege access), encryption in transit (TLS), and network controls (VPC endpoints, security groups). Review endpoint security controls.",
    whyItMatters: "AIF-C01 tests ML endpoint security. A publicly exposed model endpoint can be abused for data exfiltration (prompt injection to extract training data), cost attacks (unbounded inference), or unauthorized use. IAM, VPC endpoints, and encryption are the same AWS security primitives applied to ML — the exam expects you to know they extend to model endpoints.",
    command: "aws sagemaker describe-endpoint --endpoint-name chatbot-endpoint --query 'EndpointConfig' --output table",
    prompt: "mladmin@cli:~$",
    output: [
      "Endpoint: chatbot-endpoint",
      "  IAM Role: arn:aws:iam::123:role/sagemaker-inference (least-privilege)",
      "  Encryption: TLS 1.2 (in transit), KMS (at rest)",
      "  VPC: private subnet, no public internet",
      "  Security Group: port 443 from app-subnet only",
      "  Auto-scaling: min=1, max=10, target=70% CPU",
    ],
    question: {
      text: "A model endpoint is deployed with a public internet-facing URL and no IAM restrictions. What are the primary risks, and which two controls should you apply first?",
      options: [
        "Risk: cost only; apply auto-scaling and a larger instance type",
        "Risk: unauthorized access, prompt injection, data exfiltration, and cost attacks; apply IAM least-privilege access and move the endpoint to a private VPC subnet with no public internet exposure",
        "Risk: the model will produce low-quality output; apply a larger model and higher temperature",
        "Risk: none — Bedrock endpoints are secure by default and need no configuration",
      ],
      correctIndex: 1,
      explanation: "A public, unrestricted model endpoint risks unauthorized access, prompt injection (extracting training data or bypassing safety), data exfiltration, and unbounded cost from abuse. The first two controls: IAM least-privilege (only authorized services/users can invoke) and a private VPC subnet (no public internet exposure). Encryption (TLS/KMS) and auto-scaling are also important but access control and network isolation are the foundational first steps. ML endpoints use the same AWS security primitives as any workload — AIF-C01 tests this.",
    },
  },
  {
    stepLabel: "Audit ML usage with CloudTrail",
    explanation: "AWS CloudTrail logs every API call, including Bedrock and SageMaker invocations. Audit logs let you trace who called which model, when, and with what input — essential for compliance, incident response, and governance.",
    whyItMatters: "AIF-C01 tests ML auditing. If a model produces harmful output or a data breach occurs, CloudTrail logs are how you reconstruct what happened — who invoked the model, what prompt was sent, and when. Without audit logs, you cannot investigate incidents or prove compliance to regulators. Logging is a governance requirement.",
    command: "aws cloudtrail lookup-events --lookup-attributes AttributeKey=EventSource,AttributeValue=bedrock.amazonaws.com --max-results 10 --output table",
    prompt: "mladmin@cli:~$",
    output: [
      "-----------------------------------------------------------",
      "|  Time              |  User      |  Event                 |",
      "+-------------------+------------+-------------------------+",
      "|  2026-08-20 14:02 |  app-svc    |  InvokeModel (claude)  |",
      "|  2026-08-20 14:05 |  data-svc   |  InvokeModel (titan)   |",
      "|  2026-08-20 14:10 |  admin      |  CreateGuardrail       |",
      "|  2026-08-20 14:15 |  app-svc    |  InvokeModel (claude)  |",
      "+-------------------+------------+-------------------------+",
    ],
    question: {
      text: "After a security incident where a chatbot generated inappropriate content, the security team needs to determine which user prompt triggered it. Which AWS service provides the audit trail, and what must be enabled to capture prompt-level detail?",
      options: [
        "Amazon CloudWatch — it monitors model performance metrics",
        "AWS CloudTrail — it logs Bedrock API calls including InvokeModel events; enable CloudTrail data event logging on Bedrock to capture invocation details for audit and incident response",
        "AWS Config — it records resource configuration changes",
        "Amazon GuardDuty — it detects threats but does not log individual prompts",
      ],
      correctIndex: 1,
      explanation: "AWS CloudTrail logs Bedrock API calls, including InvokeModel events, with the caller identity, timestamp, and (with data event logging enabled) invocation details. This audit trail is how you trace which user/prompt triggered an incident. CloudWatch monitors metrics, not audit trails. Config tracks resource configuration, not API invocations. GuardDuty detects threats but doesn't log individual prompts. Enabling CloudTrail on ML services is a governance requirement tested in AIF-C01 Domain 5.",
    },
  },
  {
    stepLabel: "Govern models with model cards and registries",
    explanation: "Model governance requires documenting models (Model Cards), versioning them (Model Registry), and controlling which models are approved for production. Review the governance toolkit.",
    whyItMatters: "AIF-C01 tests ML governance. Model Cards document intended use, risks, and limitations (transparency). Model Registry versions models and controls promotion (accountability). Without governance, teams deploy untracked models with no accountability — a compliance and safety failure. Governance is the dimension that ties the others together.",
    command: "aws sagemaker describe-model-card --model-name credit-model-v2 --output table",
    prompt: "mladmin@cli:~$",
    output: [
      "Model Card: credit-model-v2",
      "  Version: 2.1.0 (approved)",
      "  Intended Use: Credit scoring for consumer loans",
      "  Training Data: 1.2M applications (2020-2025)",
      "  Performance: AUC 0.89, Disparate Impact 0.91 (pass)",
      "  Limitations: Not validated for small-business loans",
      "  Approver: risk-governance-team@company.com",
    ],
    question: {
      text: "A regulated bank must prove to auditors that its credit model was properly reviewed before deployment. Which two governance artifacts provide this evidence?",
      options: [
        "A Model Card documenting intended use, performance, and limitations, plus a Model Registry approval record showing who approved the model version for production",
        "The model's training script and a CloudWatch dashboard of its latency",
        "A prompt template and a list of test prompts",
        "An S3 bucket policy and a VPC flow log",
      ],
      correctIndex: 0,
      explanation: "A Model Card documents the model's intended use, training data, performance, and limitations (transparency), and a Model Registry approval record shows which version was approved, by whom, and when (accountability). Together they prove to auditors that the model was reviewed and approved before deployment — core governance evidence. Training scripts and latency dashboards are operational, not governance. Prompt templates and S3 policies don't document model review. Model Cards + Registry approval are the governance artifacts AIF-C01 tests.",
    },
  },
  {
    stepLabel: "Apply compliance frameworks to ML",
    explanation: "ML solutions must comply with existing frameworks (HIPAA for healthcare, GDPR for EU data, SOC 2 for service orgs) plus emerging ML-specific regulations. Review how AWS helps map ML workloads to compliance programs.",
    whyItMatters: "AIF-C01 tests whether you know that ML workloads inherit the compliance requirements of the data they process — a healthcare ML must be HIPAA-compliant, an ML processing EU data must be GDPR-compliant. AWS provides compliance-ready services (HIPAA-eligible Bedrock/SageMaker) and Artifact (compliance reports). Compliance is the governance dimension in practice.",
    command: "aws artifact list-reports --output table && aws bedrock describe-compliance-programs --output table",
    prompt: "mladmin@cli:~$",
    output: [
      "AWS Artifact Reports:",
      "  - HIPAA (Health Insurance Portability and Accountability Act)",
      "  - SOC 2 (Service Organization Control)",
      "  - ISO 27001 (Information Security)",
      "",
      "Bedrock Compliance Eligibility:",
      "  - HIPAA Eligible: Yes",
      "  - SOC 2 Compliant: Yes",
      "  - GDPR Ready: Yes",
      "  - PCI-DSS: Not eligible (do not process cardholder data)",
    ],
    question: {
      text: "A hospital wants to use Amazon Bedrock to build a clinical note-summarization tool that processes patient health information (PHI). What must they verify, and which compliance framework applies?",
      options: [
        "No verification needed — Bedrock is secure by default for any data",
        "They must verify Bedrock is HIPAA-eligible and configure it under a Business Associate Agreement (BAA); HIPAA governs the processing of Protected Health Information (PHI)",
        "They must verify Bedrock is PCI-DSS compliant because healthcare involves payments",
        "GDPR applies because all ML processing falls under EU law",
      ],
      correctIndex: 1,
      explanation: "Processing PHI requires HIPAA compliance: the hospital must verify Bedrock is HIPAA-eligible (it is) and operate under a Business Associate Agreement (BAA) with AWS. HIPAA governs Protected Health Information. PCI-DSS is for cardholder data, not healthcare. GDPR applies to EU personal data, not all ML. 'Secure by default' doesn't satisfy HIPAA — you need the BAA and HIPAA-eligible service configuration. Mapping the compliance framework to the data type is a core AIF-C01 Domain 5 skill.",
    },
  },
];

const intro = {
  overview: "This lab covers AIF-C01 Domain 5: security, compliance, and governance for ML solutions. You'll explore the ML shared responsibility model, securing training data with Macie and KMS, protecting model endpoints with IAM and VPC controls, auditing ML usage with CloudTrail, governing models with Model Cards and Registries, and applying compliance frameworks (HIPAA, GDPR, SOC 2) to ML workloads — all through the AWS CLI.",
  niceCategory: "Security, Compliance, and Governance for ML Solutions",
  objectives: [
    "Explain the ML shared responsibility model and what the customer vs. AWS secures",
    "Secure training data using Amazon Macie (PII discovery) and KMS (encryption)",
    "Protect model endpoints with IAM least-privilege, VPC isolation, and encryption",
    "Audit ML usage with CloudTrail to support incident response and compliance",
    "Govern models with SageMaker Model Cards and Model Registry",
    "Map ML workloads to compliance frameworks (HIPAA, GDPR, SOC 2)",
  ],
  outcomes: [
    "Able to identify customer vs. AWS responsibilities in an ML workload",
    "Know how to discover and redact PII before fine-tuning",
    "Can secure a model endpoint against unauthorized access and abuse",
    "Understand how CloudTrail enables ML audit and incident investigation",
    "Able to produce governance evidence (Model Cards, approval records)",
    "Can determine which compliance framework applies to an ML workload",
  ],
  prerequisites: [
    "Completion of the Guidelines for Responsible ML lab (Domain 4) is recommended",
    "Basic familiarity with AWS security (IAM, KMS, VPC) is helpful",
  ],
  tools: [
    "AWS CLI — command-line interface for AWS service management",
    "Amazon Macie — PII discovery and data classification",
    "AWS CloudTrail — API audit logging",
    "SageMaker Model Cards & Model Registry — governance and versioning",
  ],
};

export default function LabAifSecurityGovernance() {
  return (
    <LabRunner
      labTitle="Security, Compliance & Governance for ML"
      chapterNum="5"
      difficulty="Intermediate"
      tags={["AWS", "AIF-C01", "Security", "Compliance", "Governance", "CloudTrail"]}
      terminalLabel="AWS CLI — ML Practitioner Environment"
      duration={55}
      intro={intro}
      steps={steps}
    />
  );
}