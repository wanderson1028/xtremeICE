import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "List EC2 instance types",
    explanation: "Amazon EC2 (Elastic Compute Cloud) provides virtual servers (instances) in the cloud. Instance types are grouped into families optimized for different workloads (general purpose, compute, memory, storage, GPU). List available instance types.",
    whyItMatters: "Choosing the right instance type balances cost and performance. A memory-optimized instance for a compute-heavy web server wastes money; a compute-optimized instance for a database may starve it of RAM. CLF-002 expects you to know the main instance families and their use cases.",
    command: "aws ec2 describe-instance-types --query 'InstanceTypes[].{Type:InstanceType,VCPU:VCpuInfo.DefaultVCpus,Mem:MemoryInfo.SizeInMiB}' --output table | head -10",
    prompt: "awsadmin@cli:~$",
    output: [
      "--------------------------------------------------",
      "|      Type       | VCPU |   Memory (MiB)        |",
      "+-----------------+------+-----------------------+",
      "|  t3.micro       |  2   |  1024   (general)     |",
      "|  t3.large       |  2   |  8192   (general)     |",
      "|  c6i.xlarge     |  4   |  8192   (compute)    |",
      "|  m6i.2xlarge    |  8   |  32768  (general)    |",
      "|  r6i.4xlarge    |  16  |  131072 (memory)     |",
      "|  g5.xlarge      |  4   |  16384  (GPU)        |",
      "|  i4i.large      |  2   |  16384  (storage)   |",
      "+-----------------+------+-----------------------+",
    ],
    question: {
      text: "You need to run an in-memory database (e.g., Redis) that requires large amounts of RAM. Which instance family is most appropriate?",
      options: [
        "t3 (general purpose) — balanced for any workload",
        "c6i (compute optimized) — for CPU-heavy tasks",
        "r6i (memory optimized) — designed for memory-intensive workloads like in-memory databases and big data processing",
        "i4i (storage optimized) — for local disk-heavy workloads",
      ],
      correctIndex: 2,
      explanation: "The 'r' family (r6i, r6a, etc.) is memory-optimized — it provides a high ratio of RAM to vCPU, which is exactly what in-memory databases (Redis, Memcached, SAP HANA) and large-scale analytics need. t3 is general purpose (balanced), c6i is compute optimized (more CPU per GB RAM, for web servers and batch processing), and i4i is storage optimized (fast local NVMe disks, for NoSQL and data warehousing). Matching instance family to workload profile is a core cost-and-performance skill on CLF-002.",
    },
  },
  {
    stepLabel: "List S3 buckets",
    explanation: "Amazon S3 (Simple Storage Service) is object storage for files of any size. List the S3 buckets in your account.",
    whyItMatters: "S3 is AWS's most-used storage service and a frequent exam topic. Understanding bucket-level vs. object-level concepts, storage classes, and permissions is essential. Misconfigured S3 buckets are a leading cause of public data leaks.",
    command: "aws s3 ls",
    prompt: "awsadmin@cli:~$",
    output: [
      "2026-01-20 10:00:00  company-docs",
      "2026-03-15 14:30:00  app-logs-archive",
      "2026-05-10 08:15:00  website-assets",
      "2026-06-01 09:00:00  data-lake-raw",
      "",
      "[*] 4 buckets found — verify each has Block Public Access enabled",
    ],
    question: {
      text: "Which S3 storage class offers the lowest cost for data accessed only once or twice a year, with retrieval times of several hours?",
      options: [
        "S3 Standard — frequent access, default class",
        "S3 Intelligent-Tiering — automatically moves data between tiers",
        "S3 Glacier Deep Archive — lowest cost, designed for long-term archives with retrieval in 12+ hours",
        "S3 One Zone-IA — infrequent access but still in one AZ with fast retrieval",
      ],
      correctIndex: 2,
      explanation: "S3 Glacier Deep Archive is the lowest-cost storage class, designed for long-term retention (compliance archives, backups) accessed rarely (once or twice a year). Retrieval takes 12 hours or more, which is acceptable for cold archives. S3 Standard is for frequent access; Intelligent-Tiering automatically moves objects between access tiers (a small monitoring fee applies); One Zone-IA stores infrequently accessed data in a single AZ with millisecond retrieval but is not as cheap as Deep Archive. Choosing the right storage class can cut storage costs by 90%+ for cold data — a key CLF-002 pricing concept.",
    },
  },
  {
    stepLabel: "Describe VPC and subnets",
    explanation: "Amazon VPC (Virtual Private Cloud) is your private network in AWS. Subnets divide a VPC into segments, typically across multiple AZs. Describe the VPC and its subnets.",
    whyItMatters: "VPC is the networking foundation of every AWS deployment. Understanding VPCs, subnets, route tables, and internet gateways is essential for designing secure, isolated architectures. CLF-002 tests VPC concepts like public vs. private subnets.",
    command: "aws ec2 describe-vpcs --query 'Vpcs[].{VpcId:VpcId,Cidr:CidrBlock}' --output table && aws ec2 describe-subnets --query 'Subnets[].{SubnetId:SubnetId,AZ:AvailabilityZone,Cidr:CidrBlock,Public:MapPublicIpOnLaunch}' --output table",
    prompt: "awsadmin@cli:~$",
    output: [
      "-----------------------------",
      "|    VpcId    |    Cidr     |",
      "+-------------+-------------+",
      "|  vpc-abc123 |  10.0.0.0/16|",
      "+-------------+-------------+",
      "------------------------------------------------------",
      "|  SubnetId  |    AZ       |    Cidr       | Public  |",
      "+------------+-------------+---------------+---------+",
      "|  subnet-1a |  us-east-1a |  10.0.1.0/24  |  true   |",
      "|  subnet-1b |  us-east-1b |  10.0.2.0/24  |  true   |",
      "|  subnet-1c |  us-east-1c |  10.0.3.0/24  |  false  |",
      "|  subnet-1d |  us-east-1d |  10.0.4.0/24  |  false  |",
      "+------------+-------------+---------------+---------+",
      "",
      "[*] Public subnets: 1a, 1b (internet gateway) | Private: 1c, 1d (no direct internet)",
    ],
    question: {
      text: "Why are database instances typically placed in private subnets (subnet-1c, 1d) rather than public subnets?",
      options: [
        "Private subnets are cheaper than public subnets",
        "Private subnets have no route to the internet gateway, so databases are not directly reachable from the internet — this protects them from external attacks while still allowing access from application servers in the same VPC",
        "Databases cannot run in public subnets due to AWS restrictions",
        "Private subnets have more storage capacity than public subnets",
      ],
      correctIndex: 1,
      explanation: "A public subnet has a route to an internet gateway, so instances with public IPs are reachable from the internet. A private subnet has no such route — its instances are not directly internet-accessible. Databases should live in private subnets so attackers cannot reach them directly; only application servers (in public or private subnets) communicate with them over private IPs. This is the classic three-tier VPC pattern (public web → private app → private DB) and a fundamental security best practice. Cost and capacity are identical; the difference is routing.",
    },
  },
  {
    stepLabel: "List RDS database instances",
    explanation: "Amazon RDS (Relational Database Service) is a managed database service for engines like MySQL, PostgreSQL, and SQL Server. List your RDS instances.",
    whyItMatters: "RDS is a PaaS offering — AWS handles patching, backups, and failover. Knowing when to choose RDS vs. self-managed databases on EC2 is a key CLF-002 decision. RDS reduces operational overhead but offers less control.",
    command: "aws rds describe-db-instances --query 'DBInstances[].{Name:DBInstanceIdentifier,Engine:Engine,Class:DBInstanceClass,Status:DBInstanceStatus}' --output table",
    prompt: "awsadmin@cli:~$",
    output: [
      "--------------------------------------------------------",
      "|     Name     |   Engine    |    Class    |  Status   |",
      "+--------------+-------------+-------------+-----------+",
      "|  prod-db     |  postgres   |  db.r6g.xl  |  available|",
      "|  staging-db  |  mysql      |  db.t3.med  |  available|",
      "|  analytics   |  postgres   |  db.r6g.2xl |  available|",
      "+--------------+-------------+-------------+-----------+",
      "",
      "[*] RDS is PaaS — AWS manages OS, engine patching, and automated backups",
    ],
    question: {
      text: "What is the primary advantage of Amazon RDS over running a database on EC2, and what is the trade-off?",
      options: [
        "RDS is always free; EC2 databases always cost money",
        "RDS reduces operational overhead (AWS manages patching, backups, and failover) but offers less control over the OS and database engine configuration than a self-managed EC2 database",
        "RDS is faster because it uses a special database engine",
        "EC2 databases cannot be backed up; RDS can",
      ],
      correctIndex: 1,
      explanation: "RDS is a managed (PaaS) service: AWS handles OS patching, database engine patching, automated backups, point-in-time recovery, and Multi-AZ failover — tasks that would otherwise require a DBA's time. The trade-off is control: you cannot SSH into the RDS host, install custom OS packages, or modify certain engine parameters that a self-managed EC2 database would allow. For most standard workloads, the reduced operational burden is worth the trade-off; for workloads needing deep customization or unsupported engines, EC2 is the better choice. This managed-vs-self-managed decision is a classic CLF-002 comparison.",
    },
  },
  {
    stepLabel: "List Lambda functions",
    explanation: "AWS Lambda is a serverless compute service that runs code in response to events without provisioning servers. List the Lambda functions in your account.",
    whyItMatters: "Lambda is the flagship serverless service and a major CLF-002 topic. Understanding the serverless model (no servers to manage, pay-per-use, automatic scaling) is essential for modern cloud architecture decisions.",
    command: "aws lambda list-functions --query 'Functions[].{Name:FunctionName,Runtime:Runtime,Memory:MemorySize,Timeout:Timeout}' --output table",
    prompt: "awsadmin@cli:~$",
    output: [
      "----------------------------------------------------------",
      "|      Name       |  Runtime  | Memory(MB) | Timeout(s) |",
      "+-----------------+-----------+------------+-----------+",
      "|  image-resizer  |  python3.12 | 512      |    30     |",
      "|  api-handler    |  nodejs20  | 256        |    15     |",
      "|  data-processor |  python3.12 | 1024     |    300    |",
      "+-----------------+-----------+------------+-----------+",
      "",
      "[*] Serverless: no servers to patch, pay only for execution time",
    ],
    question: {
      text: "Which scenario is the BEST fit for AWS Lambda, and which is the WORST?",
      options: [
        "BEST: a long-running 24/7 video transcoding server; WORST: an event-triggered image resizer",
        "BEST: an event-triggered image resizer that runs for 2 seconds on each upload; WORST: a long-running 24/7 server that must maintain persistent TCP connections",
        "BEST: a relational database; WORST: an API endpoint",
        "BEST: a static website; WORST: a batch job that runs nightly",
      ],
      correctIndex: 1,
      explanation: "Lambda excels at short, event-driven, stateless workloads — an image resizer triggered by S3 uploads, running for 2 seconds, is ideal: it scales automatically and you pay only for the 2 seconds of compute. Lambda has a 15-minute timeout, so a 24/7 server or a workload needing persistent connections is a poor fit — use EC2 or ECS for those. Lambda is not a database or a static site host (use RDS and S3+CloudFront respectively). The serverless model trades server management for execution-time billing and statelessness, which suits bursty, short workloads best.",
    },
  },
  {
    stepLabel: "Map services to global infrastructure",
    explanation: "Some AWS services are Regional (deployed in a specific Region), some are Global (not tied to a Region), and some are edge-based. Review how key services map to the global infrastructure.",
    whyItMatters: "Knowing whether a service is Regional, Global, or edge-based determines where your data lives and how it is managed. CLF-002 tests this mapping — e.g., IAM is Global, S3 buckets are Regional, CloudFront is edge-based.",
    command: "aws service-quotas list-services --query 'Services[].{Service:ServiceName,Quota:QuotaName}' --output table 2>/dev/null || echo '--- Service to Infrastructure Mapping ---' && echo 'Global: IAM, Route 53, CloudFront, WAF | Regional: EC2, S3, RDS, VPC, Lambda | Edge: CloudFront caches'",
    prompt: "awsadmin@cli:~$",
    output: [
      "--- Service to Infrastructure Mapping ---",
      "GLOBAL services (not tied to a Region):",
      "  IAM, Route 53, CloudFront, WAF, Organizations",
      "REGIONAL services (deployed in a specific Region):",
      "  EC2, S3 (bucket is Regional), RDS, VPC, Lambda, DynamoDB",
      "EDGE-based services:",
      "  CloudFront (caches at edge locations), Route 53 (DNS at edge)",
      "",
      "[*] IAM users and policies are Global — available in every Region",
    ],
    question: {
      text: "You create an IAM user in us-east-1. If you then switch the CLI to eu-west-1, can that user still be used, and why?",
      options: [
        "No — IAM users are Regional and only exist in the Region where they were created",
        "Yes — IAM is a Global service; users, roles, and policies are not tied to a Region and are available across all Regions in the account",
        "Only if you manually replicate the user to eu-west-1",
        "Yes, but only after a 24-hour propagation delay",
      ],
      correctIndex: 1,
      explanation: "IAM is a Global service — it is not tied to any Region. An IAM user, role, group, or policy created in one Region is immediately available in every Region in the account. This is by design: identities and permissions are account-wide, so you don't manage separate users per Region. In contrast, Regional services like EC2 and S3 buckets exist in a specific Region — an S3 bucket in us-east-1 is not in eu-west-1 (though bucket names are globally unique). Knowing which services are Global vs. Regional is a common CLF-002 question.",
    },
  },
];

const intro = {
  overview: "This lab covers AWS core technology and services from CLF-002 Domain 3. You'll explore compute (EC2, Lambda), storage (S3), networking (VPC), databases (RDS), and how services map to AWS global infrastructure, using the AWS CLI to inspect real service configurations.",
  niceCategory: "Cloud Technology and Services",
  objectives: [
    "List and classify EC2 instance types by workload optimization",
    "Describe S3 buckets and storage classes",
    "Inspect a VPC and distinguish public from private subnets",
    "List RDS instances and explain the managed-service trade-off",
    "Enumerate Lambda functions and identify serverless use cases",
    "Map AWS services to Global, Regional, and edge infrastructure",
  ],
  outcomes: [
    "Able to select the right EC2 instance family for a workload",
    "Understand S3 storage classes and their cost/access trade-offs",
    "Can design a public/private subnet architecture in a VPC",
    "Able to decide between RDS and self-managed databases",
    "Can identify workloads suited to Lambda vs. EC2",
    "Understand which AWS services are Global vs. Regional vs. edge-based",
  ],
  prerequisites: [
    "Completion of the AWS Cloud Concepts lab is recommended",
    "Basic networking knowledge (IP addresses, subnets) is helpful",
  ],
  tools: [
    "Amazon EC2 — virtual compute instances",
    "Amazon S3 — object storage",
    "Amazon VPC — virtual private cloud networking",
    "Amazon RDS — managed relational databases",
    "AWS Lambda — serverless compute",
  ],
};

export default function LabAwsCloudServices() {
  return (
    <LabRunner
      labTitle="AWS Cloud Technology & Services"
      chapterNum="3"
      difficulty="Intermediate"
      tags={["AWS", "CLF-002", "EC2", "S3", "VPC", "RDS", "Lambda"]}
      terminalLabel="AWS CLI — Cloud Services Environment"
      duration={55}
      intro={intro}
      steps={steps}
    />
  );
}