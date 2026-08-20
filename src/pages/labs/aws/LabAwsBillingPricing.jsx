import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Review AWS pricing models",
    explanation: "AWS offers several pricing models for EC2 and other services. The three main EC2 models are On-Demand (pay per second, no commitment), Reserved (commit to 1 or 3 years for a discount), and Spot (use spare capacity at up to 90% discount, but can be interrupted). Review the models.",
    whyItMatters: "Choosing the right pricing model can cut compute costs by 40-90%. CLF-002 tests the trade-offs: On-Demand for flexibility, Reserved for steady workloads, Spot for fault-tolerant batch jobs. Knowing when to use each is a core billing skill.",
    command: "aws ec2 describe-spot-price-history --instance-types t3.medium --max-results 1 --output table && echo '--- EC2 Pricing Models ---' && echo 'On-Demand | Reserved (1/3 yr) | Spot (up to 90% off)'",
    prompt: "awsadmin@cli:~$",
    output: [
      "----------------------------------------------------------",
      "|  InstanceType  |  SpotPrice  |  AvailabilityZone       |",
      "+----------------+-------------+------------------------+",
      "|  t3.medium     |  0.0167     |  us-east-1a            |",
      "+----------------+-------------+------------------------+",
      "",
      "--- EC2 Pricing Models ---",
      "On-Demand   : Pay per second, no commitment  (highest $)",
      "Reserved    : 1-yr or 3-yr commitment         (~40-72% off)",
      "Spot        : Spare capacity, interruptible   (up to 90% off)",
      "Savings Plan: Commit to $/hour spend          (flexible discount)",
    ],
    question: {
      text: "You run a batch image-processing job that can be paused and restarted, processing millions of images nightly. Which EC2 pricing model is most cost-effective?",
      options: [
        "On-Demand — pay per second for maximum flexibility, even though it is the most expensive",
        "Reserved Instances — commit to 3 years for a steady discount",
        "Spot Instances — use spare AWS capacity at up to 90% discount; the job tolerates interruption and can resume when capacity returns",
        "Dedicated Hosts — pay for a physical server for compliance",
      ],
      correctIndex: 2,
      explanation: "Spot Instances use AWS spare capacity at up to 90% off On-Demand prices. The trade-off is that AWS can reclaim the capacity with a 2-minute warning (interruption). A batch image-processing job that can checkpoint and resume is ideal for Spot — if interrupted, it simply continues later, and the savings are enormous at scale. On-Demand is too expensive for millions of images; Reserved Instances suit steady 24/7 workloads (like a database), not bursty batch jobs; Dedicated Hosts are for license/compliance needs, not cost optimization. Matching pricing model to workload tolerance is a key CLF-002 billing concept.",
    },
  },
  {
    stepLabel: "Check Free Tier usage",
    explanation: "The AWS Free Tier offers limited free usage for new accounts (12 months) and some always-free services. Review your Free Tier usage to avoid unexpected charges.",
    whyItMatters: "Many beginners accidentally exceed Free Tier limits and receive surprise bills. Knowing how to monitor Free Tier usage is a practical billing skill. CLF-002 tests awareness of the Free Tier and its limits.",
    command: "aws ce get-cost-and-usage --time-period Start=2026-08-01,End=2026-08-20 --granularity MONTHLY --metrics UsageQuantity --group-by Type=DIMENSION,Key=SERVICE --output table | head -12",
    prompt: "awsadmin@cli:~$",
    output: [
      "----------------------------------------------------------",
      "|          Service         |   UsageQuantity   |  Amount |",
      "+--------------------------+-------------------+---------+",
      "|  Amazon EC2              |  720 hours        |  $12.40 |",
      "|  Amazon S3               |  5 GB             |  $0.00  |",
      "|  AWS Lambda              |  1M req           |  $0.00  |",
      "|  Amazon RDS              |  750 hours        |  $0.00  |",
      "+--------------------------+-------------------+---------+",
      "",
      "[!] EC2 exceeded Free Tier (750 hrs/mo) — 720 hrs billed at On-Demand",
      "[*] S3, Lambda, RDS within Free Tier limits",
    ],
    question: {
      text: "Your Free Tier includes 750 hours/month of t2.micro EC2. This month you ran 720 hours of t2.micro AND 50 hours of t3.medium. What will you be charged?",
      options: [
        "Nothing — all usage is covered by the Free Tier",
        "The 50 hours of t3.medium are billed at On-Demand rates (t3.medium is not part of the Free Tier); the 720 hours of t2.micro are within the 750-hour Free Tier limit and are free",
        "All 770 hours are billed because you exceeded 750 total hours",
        "The Free Tier covers any instance type, so nothing is charged",
      ],
      correctIndex: 1,
      explanation: "The EC2 Free Tier covers 750 hours/month of specific instance types (t2.micro or t3.micro, depending on Region). It does not cover t3.medium at all. The 720 hours of t2.micro are within the 750-hour limit, so they are free. The 50 hours of t3.medium are billed at full On-Demand rates because that instance type is not part of the Free Tier. Free Tier limits are per instance type, not a combined pool — mixing non-Free-Tier instance types incurs charges immediately. This is a common beginner billing mistake and a CLF-002 concept.",
    },
  },
  {
    stepLabel: "Create a billing budget alert",
    explanation: "AWS Budgets lets you set custom cost budgets and receive alerts when spending exceeds thresholds. Create a monthly budget with an alert at 80% of the limit.",
    whyItMatters: "Budgets are the primary tool to prevent bill shock — you get an email before costs spiral. CLF-002 expects you to know how to proactively monitor and alert on spend, not just react to invoices.",
    command: "aws budgets create-budget --account-id 123456789012 --budget '{\"BudgetName\":\"MonthlySpendLimit\",\"BudgetLimit\":{\"Amount\":\"100\",\"Unit\":\"USD\"},\"TimeUnit\":\"MONTHLY\",\"BudgetType\":\"COST\"}' --notifications-with-subscribers '[{\"Notification\":{\"NotificationType\":\"ACTUAL\",\"ComparisonOperator\":\"GREATER_THAN\",\"Threshold\":80.0},\"Subscribers\":[{\"SubscriptionType\":\"EMAIL\",\"Address\":\"finance@company.com\"}]}]'",
    prompt: "awsadmin@cli:~$",
    output: [
      "[*] Budget 'MonthlySpendLimit' created",
      "    Limit: $100.00 USD / month",
      "    Alert: 80% threshold ($80) → finance@company.com",
      "    Type: ACTUAL spend alert",
      "",
      "[*] Best practice: set BOTH actual and forecasted alerts",
      "    ACTUAL: alerts when you cross the threshold",
      "    FORECASTED: alerts when AWS predicts you will cross it",
    ],
    question: {
      text: "What is the difference between an ACTUAL budget alert and a FORECASTED budget alert, and why use both?",
      options: [
        "ACTUAL alerts are sent by email; FORECASTED alerts are sent by SMS",
        "ACTUAL alerts fire when spending has already crossed the threshold; FORECASTED alerts fire when AWS predicts (based on current trajectory) that you will cross it — using both gives you early warning before the money is spent and confirmation when it is",
        "There is no difference — they are the same alert with different names",
        "FORECASTED alerts are always more accurate than ACTUAL alerts",
      ],
      correctIndex: 1,
      explanation: "An ACTUAL alert fires after you have already spent past the threshold — it confirms the spend happened. A FORECASTED alert uses your spending trajectory to predict you will exceed the threshold before the period ends, giving you time to act (shut down resources, buy Reserved Instances) before the money is gone. Using both is best practice: FORECASTED gives early warning (e.g., 'at this rate you'll exceed $100 by day 20'), and ACTUAL confirms if you do. Relying only on ACTUAL means you learn about overspend after it happens; relying only on FORECASTED risks false alarms. Together they cover both early and confirmed notification.",
    },
  },
  {
    stepLabel: "Query Cost Explorer for monthly spend",
    explanation: "AWS Cost Explorer (the 'ce' CLI namespace) lets you analyze spending over time, by service, by tag, or by linked account. Query your monthly spend by service.",
    whyItMatters: "Cost Explorer is the primary tool for understanding where your money goes. You cannot optimize what you cannot see. CLF-002 tests awareness of Cost Explorer and Cost & Usage Reports as cost analysis tools.",
    command: "aws ce get-cost-and-usage --time-period Start=2026-07-01,End=2026-07-31 --granularity MONTHLY --metrics BlendedCost --group-by Type=DIMENSION,Key=SERVICE --sort-by Key=Amount,Direction=DESCENDING --output table",
    prompt: "awsadmin@cli:~$",
    output: [
      "----------------------------------------------------------",
      "|          Service         |    Start      |    Amount   |",
      "+--------------------------+---------------+-------------+",
      "|  Amazon EC2              |  2026-07-01   |  $142.50    |",
      "|  Amazon RDS              |  2026-07-01   |  $68.20     |",
      "|  Amazon S3               |  2026-07-01   |  $23.10     |",
      "|  AWS Lambda              |  2026-07-01   |  $4.80      |",
      "|  CloudFront              |  2026-07-01   |  $2.30      |",
      "+--------------------------+---------------+-------------+",
      "",
      "[*] EC2 is 58% of spend — consider Reserved Instances for steady workloads",
    ],
    question: {
      text: "Cost Explorer shows EC2 is 58% of your monthly spend, mostly from a 24/7 production web server. What is the most cost-effective action?",
      options: [
        "Switch the web server to Spot Instances to get 90% off",
        "Purchase a Reserved Instance or Compute Savings Plan for the steady web-server workload to get a 40-72% discount, since it runs 24/7 and won't be interrupted",
        "Move the web server to a smaller Region where EC2 is cheaper",
        "Delete the web server to eliminate the cost entirely",
      ],
      correctIndex: 1,
      explanation: "A 24/7 production web server is the ideal candidate for a Reserved Instance or Compute Savings Plan: you commit to 1 or 3 years and receive a 40-72% discount vs. On-Demand. Because the workload is steady and cannot tolerate interruption, Spot is too risky (AWS can reclaim it). Moving Regions doesn't reduce On-Demand rates meaningfully and adds latency. Deleting the server is not an option for a production workload. Reserved/Savings Plans are the standard way to cut steady-state compute costs — a core CLF-002 pricing optimization. Spot is for interruptible workloads; Reserved is for predictable ones.",
    },
  },
  {
    stepLabel: "Review AWS Support plans",
    explanation: "AWS offers four Support plans with different features and prices: Basic (free), Developer ($29/mo), Business ($100/mo), and Enterprise ($15,000+/mo). Review the plans.",
    whyItMatters: "Choosing the right Support plan affects how fast you get help and what guidance you receive. CLF-002 tests the plan tiers and their key differences (response times, access to engineers, Trusted Advisor).",
    command: "aws support describe-services --output table 2>/dev/null || echo '--- AWS Support Plans ---' && echo 'Basic | Developer | Business | Enterprise'",
    prompt: "awsadmin@cli:~$",
    output: [
      "--- AWS Support Plans ---",
      "Basic       : Free — billing & account support, no technical chat",
      "Developer   : ~$29/mo — email-only technical support, 12-24h response",
      "Business    : ~$100/mo — 24x7 chat/phone, 1h response, Trusted Advisor (all checks)",
      "Enterprise  : ~$15,000/mo — 15-min response, TAM, Concierge, IEM",
      "",
      "[*] Response time targets: Basic (none) | Dev (12-24h) | Biz (1h) | Ent (15min)",
    ],
    question: {
      text: "A startup runs a production e-commerce site on AWS and needs 24/7 access to technical support engineers with a 1-hour response time for production-down issues. Which Support plan is the minimum that meets this requirement?",
      options: [
        "Basic — it is free and includes account support",
        "Developer — it includes technical support via email",
        "Business — it provides 24x7 chat/phone access to engineers with a 1-hour response target for production-down cases",
        "Enterprise — it is the only plan with any technical support",
      ],
      correctIndex: 2,
      explanation: "The Business plan is the minimum that provides 24x7 access to technical support engineers via chat and phone, with a 1-hour response time target for production-down (urgent) cases. Basic has no technical support (only billing/account). Developer offers email-only technical support with 12-24 hour response — insufficient for production-down urgency. Enterprise adds a 15-minute response, a Technical Account Manager (TAM), and Concierge support, but is far more expensive and beyond the minimum need. For a production e-commerce site needing fast 24/7 engineering access, Business is the right minimum tier.",
    },
  },
  {
    stepLabel: "Identify AWS cost-optimization tools",
    explanation: "AWS provides several tools to monitor and optimize costs: Cost Explorer, Budgets, Cost & Usage Reports, and Trusted Advisor. Review the toolset.",
    whyItMatters: "Knowing which tool does what is a practical billing skill and a CLF-002 topic. Trusted Advisor also covers security and fault-tolerance checks, not just cost — a common exam point.",
    command: "aws support describe-trusted-advisor-checks --language en --query 'checks[?category==`cost_optimization`].{Name:name,Desc:description}' --output table | head -8",
    prompt: "awsadmin@cli:~$",
    output: [
      "----------------------------------------------------------",
      "|            Name           |        Description          |",
      "+---------------------------+----------------------------+",
      "|  Low Utilization EC2      |  Idle instances to stop    |",
      "|  Idle Load Balancers      |  Unused ELBs to remove     |",
      "|  Unassociated Elastic IPs |  EIPs not attached (billed)|",
      "|  Underutilized EBS Volumes|  Volumes to snapshot/delete |",
      "+---------------------------+----------------------------+",
      "",
      "[*] Trusted Advisor categories: Cost | Performance | Security | Fault Tolerance",
    ],
    question: {
      text: "Which AWS tool would identify that you are being billed for an Elastic IP (EIP) that is not attached to any running instance?",
      options: [
        "AWS CloudTrail — it logs API calls, not cost waste",
        "AWS Trusted Advisor — it runs checks across cost, performance, security, and fault tolerance, and flags unassociated Elastic IPs (which incur hourly charges when not attached to a running instance)",
        "AWS IAM — it manages identities, not costs",
        "Amazon Route 53 — it is a DNS service, not a cost tool",
      ],
      correctIndex: 1,
      explanation: "AWS Trusted Advisor runs automated checks across four categories: cost optimization, performance, security, and fault tolerance. One of its cost checks flags unassociated Elastic IPs — AWS charges an hourly fee for EIPs not attached to a running instance (to discourage hoarding public IPs). Trusted Advisor surfaces this so you can release the EIP and stop paying. CloudTrail logs API calls (useful for audit, not cost detection), IAM manages access, and Route 53 is DNS. Trusted Advisor is the operational cost-optimization tool; Cost Explorer and Budgets are for analysis and alerting.",
    },
  },
];

const intro = {
  overview: "This lab covers AWS billing, pricing, and support from CLF-002 Domain 4. You'll explore EC2 pricing models (On-Demand, Reserved, Spot), the Free Tier, AWS Budgets alerts, Cost Explorer analysis, and AWS Support plans using the AWS CLI.",
  niceCategory: "Billing, Pricing, and Support",
  objectives: [
    "Compare EC2 pricing models (On-Demand, Reserved, Spot) and match them to workloads",
    "Monitor Free Tier usage to avoid unexpected charges",
    "Create billing budgets with ACTUAL and FORECASTED alerts",
    "Analyze monthly spend by service using Cost Explorer",
    "Differentiate the four AWS Support plans by response time and features",
    "Identify cost-optimization findings with Trusted Advisor",
  ],
  outcomes: [
    "Able to choose the most cost-effective EC2 pricing model for a workload",
    "Understand Free Tier limits are per instance type, not a combined pool",
    "Can set up proactive billing alerts before spend exceeds budget",
    "Able to use Cost Explorer to identify top spend drivers",
    "Know which Support plan meets a given response-time requirement",
    "Understand the role of Trusted Advisor in cost, security, and reliability checks",
  ],
  prerequisites: [
    "Completion of the AWS Cloud Concepts lab is recommended",
    "Basic familiarity with cloud service billing is helpful",
  ],
  tools: [
    "AWS Budgets — cost budgeting and alerts",
    "AWS Cost Explorer — spend analysis and forecasting",
    "AWS Cost & Usage Reports — detailed billing data",
    "AWS Trusted Advisor — cost, performance, security, and fault-tolerance checks",
    "AWS Support Plans — Basic, Developer, Business, Enterprise",
  ],
};

export default function LabAwsBillingPricing() {
  return (
    <LabRunner
      labTitle="AWS Billing, Pricing & Support"
      chapterNum="4"
      difficulty="Intermediate"
      tags={["AWS", "CLF-002", "Pricing", "Budgets", "Cost Explorer", "Support Plans"]}
      terminalLabel="AWS CLI — Billing & Pricing Environment"
      duration={50}
      intro={intro}
      steps={steps}
    />
  );
}