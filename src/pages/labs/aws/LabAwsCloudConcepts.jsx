import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "List AWS Regions",
    explanation: "Use the AWS CLI to enumerate available Regions. Regions are geographic areas worldwide that host AWS infrastructure, each containing multiple isolated Availability Zones.",
    whyItMatters: "Choosing the right Region affects latency, compliance, and cost. Data residency laws (e.g., GDPR) may require workloads to stay within specific Regions. Knowing how to query Regions is a foundational cloud skill.",
    command: "aws ec2 describe-regions --query 'Regions[].RegionName' --output table",
    prompt: "awsadmin@cli:~$",
    output: [
      "---------------------------------------",
      "|              RegionName              |",
      "+-------------------------------------+",
      "|  us-east-1      (N. Virginia)        |",
      "|  us-west-2      (Oregon)             |",
      "|  eu-west-1      (Ireland)            |",
      "|  eu-central-1   (Frankfurt)          |",
      "|  ap-south-1     (Mumbai)             |",
      "|  ap-southeast-2 (Sydney)             |",
      "|  sa-east-1      (Sao Paulo)          |",
      "+-------------------------------------+",
    ],
    question: {
      text: "An EU-based customer must comply with GDPR data residency requirements. Which principle governs selecting a Region for their workloads?",
      options: [
        "Choose the Region with the lowest price regardless of location",
        "Choose the Region that keeps data within the regulatory jurisdiction (e.g., eu-west-1 or eu-central-1) to satisfy data sovereignty laws",
        "Always use us-east-1 because it is the oldest and most stable Region",
        "Region selection has no impact on compliance obligations",
      ],
      correctIndex: 1,
      explanation: "Data sovereignty laws like GDPR require personal data of EU residents to be processed and stored within the EU or in jurisdictions with equivalent legal protections. Selecting an EU Region (eu-west-1, eu-central-1) keeps data within that legal boundary. Choosing us-east-1 would transfer EU personal data to the US, which without specific safeguards can violate GDPR. Compliance, not price or age, drives Region selection for regulated workloads.",
    },
  },
  {
    stepLabel: "Describe Availability Zones in a Region",
    explanation: "Each Region contains multiple Availability Zones (AZs) — fully isolated partitions of infrastructure with independent power, cooling, and networking. Query the AZs in us-east-1.",
    whyItMatters: "Distributing workloads across multiple AZs is the core pattern for high availability. If one AZ fails, others remain operational. Understanding AZ isolation is critical to designing resilient cloud architectures.",
    command: "aws ec2 describe-availability-zones --region us-east-1 --query 'AvailabilityZones[].{Zone:ZoneName,State:State}' --output table",
    prompt: "awsadmin@cli:~$",
    output: [
      "-----------------------------",
      "|    Zone      |   State     |",
      "+--------------+------------+",
      "|  us-east-1a  |  available  |",
      "|  us-east-1b  |  available  |",
      "|  us-east-1c  |  available  |",
      "|  us-east-1d  |  available  |",
      "|  us-east-1e  |  available  |",
      "|  us-east-1f  |  available  |",
      "+--------------+------------+",
    ],
    question: {
      text: "You deploy a web application on a single EC2 instance in us-east-1a. What is the primary risk, and how do you mitigate it?",
      options: [
        "The instance might be too slow; mitigate by choosing a larger instance type",
        "A failure of us-east-1a (power, network, or physical event) takes down the entire application; mitigate by deploying across at least two AZs with a load balancer",
        "The instance will be billed at a higher rate in a single AZ; mitigate by spreading across Regions",
        "Single-AZ deployments are not supported by AWS and will be automatically deleted",
      ],
      correctIndex: 1,
      explanation: "An Availability Zone is an isolated location within a Region, but it can still fail — power outages, fiber cuts, or facility issues happen. A single-instance, single-AZ deployment has no redundancy: if that AZ fails, your app is down. The standard high-availability pattern is to deploy instances across at least two AZs behind an Application Load Balancer, so traffic routes to healthy AZs automatically. This is a core Well-Architected Reliability practice.",
    },
  },
  {
    stepLabel: "Review the Well-Architected Pillars",
    explanation: "The AWS Well-Architected Framework defines six pillars that guide cloud architecture decisions. Review them with the AWS CLI tool.",
    whyItMatters: "The Well-Architected Framework is AWS's blueprint for building secure, reliable, efficient, and cost-effective workloads. Every architectural decision should map to one or more pillars — it is the conceptual backbone of the CLF-002 Cloud Concepts domain.",
    command: "aws wellarchitected list-pillars --output table",
    prompt: "awsadmin@cli:~$",
    output: [
      "-----------------------------------------",
      "|            Pillar            |  Focus  |",
      "+------------------------------+--------+",
      "|  Operational Excellence      |  Run    |",
      "|  Security                    |  Protect|",
      "|  Reliability                 |  Recover|",
      "|  Performance Efficiency     |  Scale  |",
      "|  Cost Optimization          |  Save   |",
      "|  Sustainability             |  Green  |",
      "+------------------------------+--------+",
    ],
    question: {
      text: "A team encrypts all data at rest and in transit, rotates keys quarterly, and enforces least-privilege IAM. Which Well-Architected Pillar are they primarily exercising?",
      options: [
        "Reliability — encryption prevents data loss",
        "Cost Optimization — encryption reduces storage costs",
        "Security — protecting data, identities, and infrastructure is the Security pillar's focus",
        "Operational Excellence — key rotation is an operational task",
      ],
      correctIndex: 2,
      explanation: "The Security pillar focuses on protecting information, systems, and assets — confidentiality, integrity, and availability of data. Encryption at rest and in transit, key management (rotation), and least-privilege access control are all core Security pillar practices. Reliability is about workload recovery from failures; Cost Optimization is about avoiding unnecessary spend; Operational Excellence is about running and monitoring systems. While key rotation has an operational component, its purpose is protective, so it belongs to Security.",
    },
  },
  {
    stepLabel: "Identify cloud service models",
    explanation: "Cloud computing offers three primary service models: IaaS, PaaS, and SaaS. Each shifts the responsibility boundary between provider and customer. Review the models.",
    whyItMatters: "Knowing where responsibility divides is essential for both cost planning and security. The Shared Responsibility Model differs by service model — in IaaS you patch the OS; in SaaS the provider does. CLF-002 tests this distinction heavily.",
    command: "aws cloud describe-service-models --output table",
    prompt: "awsadmin@cli:~$",
    output: [
      "------------------------------------------------------",
      "| Model | Example AWS Service | Customer Manages     |",
      "+-------+---------------------+---------------------+",
      "| IaaS  | EC2, VPC            | OS, apps, data, patch|",
      "| PaaS  | RDS, Elastic Beanstalk| Apps, data only    |",
      "| SaaS  | Chime, WorkMail      | Data only            |",
      "+-------+---------------------+---------------------+",
    ],
    question: {
      text: "Your team deploys a managed PostgreSQL database using Amazon RDS. Under which service model does this fall, and what is the customer responsible for?",
      options: [
        "IaaS — the customer manages the OS, database engine, and backups",
        "PaaS — the customer manages only the database schema and data; AWS manages the OS, engine patching, and backups",
        "SaaS — the customer manages nothing; AWS handles everything including the application data model",
        "On-premises — RDS runs in the customer's own data center",
      ],
      correctIndex: 1,
      explanation: "Amazon RDS is a Platform-as-a-Service (PaaS) offering. AWS manages the underlying infrastructure, the operating system, the database engine installation, patching, and automated backups. The customer is responsible for the database itself — schema design, data, indexes, and security group configuration. This is the PaaS value proposition: focus on your application and data, not on infrastructure operations. EC2 would be IaaS (you manage the OS); Chime/WorkMail are SaaS (you only manage your user data).",
    },
  },
  {
    stepLabel: "Compare deployment models",
    explanation: "Cloud deployment models describe where infrastructure runs: public cloud (shared, multi-tenant), private cloud (single organization), and hybrid (a mix of both). Review the deployment models.",
    whyItMatters: "Many enterprises use hybrid cloud to keep sensitive workloads on-premises while using public cloud for elastic workloads. Understanding deployment models helps architects choose the right strategy for compliance, cost, and performance — a key CLF-002 concept.",
    command: "aws cloud describe-deployment-models --output table",
    prompt: "awsadmin@cli:~$",
    output: [
      "---------------------------------------------------",
      "|   Model   |   Ownership   |   Multi-tenant?    |",
      "+-----------+---------------+--------------------+",
      "|  Public   |  AWS          |  Yes (shared)      |",
      "|  Private  |  Customer     |  No (dedicated)    |",
      "|  Hybrid   |  Both         |  Mixed             |",
      "+-----------+---------------+--------------------+",
    ],
    question: {
      text: "A hospital runs its electronic health records (EHR) on-premises for HIPAA control but bursts genomic analysis workloads to AWS during peak research periods. Which deployment model is this?",
      options: [
        "Public cloud — all workloads run on shared AWS infrastructure",
        "Private cloud — the hospital owns all infrastructure",
        "Hybrid cloud — sensitive workloads stay on-premises while elastic or bursty workloads use public cloud",
        "Multi-cloud — the hospital uses multiple public cloud providers",
      ],
      correctIndex: 2,
      explanation: "Hybrid cloud connects on-premises (private) infrastructure with public cloud, letting workloads and data move between them. The hospital keeps regulated EHR data on-premises for tight HIPAA control, but uses AWS public cloud for bursty genomic analysis that needs elastic scale. This is the classic hybrid pattern: control where you need it, scale where you want it. Multi-cloud would mean using multiple public providers (e.g., AWS + Azure), not on-premises + cloud.",
    },
  },
  {
    stepLabel: "List AWS edge locations (CloudFront)",
    explanation: "AWS edge locations are endpoints used by CloudFront and Route 53 to cache content and serve DNS closer to end users worldwide. They are separate from Regions and AZs.",
    whyItMatters: "Edge locations power content delivery and low-latency DNS. Understanding the difference between Regions, AZs, and edge locations is a frequent CLF-002 question — edge locations serve cached content, not compute workloads.",
    command: "aws cloudfront list-distributions --query 'DistributionList.Items[0].Origins' --output text && echo '--- Edge Locations: 400+ globally ---'",
    prompt: "awsadmin@cli:~$",
    output: [
      "Origins:",
      "  - Id: S3-origin, DomainName: my-bucket.s3.amazonaws.com",
      "",
      "CloudFront Edge Locations: 400+ across 90+ cities",
      "  Example edge cities: New York, London, Tokyo, Singapore, Sao Paulo",
      "",
      "[*] Edge locations cache content close to users — they do NOT run EC2 instances",
    ],
    question: {
      text: "What is the key difference between an AWS Region and an AWS edge location?",
      options: [
        "Regions and edge locations are the same thing with different names",
        "Regions host full service offerings (compute, storage, databases) and run your workloads; edge locations cache content (CloudFront) and resolve DNS (Route 53) closer to end users, but do not run EC2 instances",
        "Edge locations host more services than Regions because they are closer to customers",
        "Regions are only for government customers; edge locations are for everyone else",
      ],
      correctIndex: 1,
      explanation: "A Region is a geographic cluster of Availability Zones that hosts the full range of AWS services — you run EC2, RDS, Lambda, and most workloads there. An edge location is a smaller site in a city (often many more than Regions) used by CloudFront to cache content and by Route 53 for DNS resolution, placing data closer to end users for low latency. Edge locations do not run compute workloads like EC2 — they serve cached responses. This distinction (Region = compute, edge = cache/DNS) is a common CLF-002 exam point.",
    },
  },
];

const intro = {
  overview: "This foundational lab introduces the core concepts of cloud computing on AWS as covered in CLF-002 Domain 1. You'll explore AWS global infrastructure (Regions, Availability Zones, edge locations), the Well-Architected Framework pillars, cloud service models (IaaS/PaaS/SaaS), and deployment models (public/private/hybrid) using the AWS CLI.",
  niceCategory: "Cloud Concepts",
  objectives: [
    "Enumerate AWS Regions and explain how Region selection affects compliance and latency",
    "Describe Availability Zones and their role in high-availability architecture",
    "Identify the six pillars of the AWS Well-Architected Framework",
    "Distinguish between IaaS, PaaS, and SaaS service models and their responsibility boundaries",
    "Compare public, private, and hybrid cloud deployment models",
    "Explain the difference between Regions, AZs, and edge locations",
  ],
  outcomes: [
    "Able to query AWS Regions and Availability Zones using the AWS CLI",
    "Understand how data sovereignty laws drive Region selection",
    "Can map architectural decisions to Well-Architected pillars",
    "Able to classify AWS services by service model (IaaS/PaaS/SaaS)",
    "Understand the hybrid cloud pattern for regulated workloads",
    "Can differentiate Regions, AZs, and edge locations by purpose",
  ],
  prerequisites: [
    "Basic understanding of what cloud computing is (no prior AWS experience required)",
    "Familiarity with a command-line interface is helpful but not required",
  ],
  tools: [
    "AWS CLI — command-line interface for AWS service management",
    "AWS Global Infrastructure — Regions, Availability Zones, and edge locations",
    "AWS Well-Architected Framework — architectural best practices",
  ],
};

export default function LabAwsCloudConcepts() {
  return (
    <LabRunner
      labTitle="AWS Cloud Concepts"
      chapterNum="1"
      difficulty="Beginner"
      tags={["AWS", "CLF-002", "Regions", "Well-Architected", "IaaS/PaaS/SaaS"]}
      terminalLabel="AWS CLI — Cloud Practitioner Environment"
      duration={40}
      intro={intro}
      steps={steps}
    />
  );
}