import React from "react";
import AzureLabRunner from "@/components/labs/azure/AzureLabRunner";

const steps = [
  {
    stepLabel: "Cloud Deployment Models",
    explanation: "Azure supports three primary cloud deployment models: Public Cloud (resources owned and operated by Microsoft), Private Cloud (resources operated solely for one organization), and Hybrid Cloud (combines public and private resources). Understanding which model fits a scenario is foundational to AZ-900.",
    whyItMatters: "AZ-900 tests your ability to identify the correct deployment model from a business scenario. Hybrid cloud is increasingly common as organizations keep sensitive data on-premises while leveraging public cloud for compute-intensive workloads.",
    interaction: {
      type: "dashboard",
      title: "Match Scenarios to Deployment Models",
      description: "Select the correct cloud deployment model for each business scenario.",
      items: [
        { id: "s1", label: "A startup hosts all infrastructure on Azure VMs and Azure SQL — no on-premises servers.", type: "select", options: ["Public", "Private", "Hybrid"], correct: "Public" },
        { id: "s2", label: "A bank keeps customer databases in an on-prem datacenter but runs analytics on Azure.", type: "select", options: ["Public", "Private", "Hybrid"], correct: "Hybrid" },
        { id: "s3", label: "A government agency runs Azure Stack in its own facility for full isolation.", type: "select", options: ["Public", "Private", "Hybrid"], correct: "Private" },
      ],
      feedback: "All scenarios matched correctly! Public = all-cloud, Private = on-prem/isolated, Hybrid = mix of both.",
    },
    question: {
      text: "A company wants to use Azure for web hosting but must keep its customer database on-premises due to regulatory requirements. Which deployment model should they use?",
      options: ["Public Cloud — migrate everything to Azure", "Private Cloud — run Azure Stack on-premises only", "Hybrid Cloud — use Azure for web tier and on-premises for the database", "Multi-cloud — use both Azure and AWS"],
      correctIndex: 2,
      explanation: "Hybrid Cloud combines public cloud resources (Azure for web hosting) with on-premises infrastructure (database kept locally for compliance). This is the most flexible model and is increasingly common in regulated industries.",
    },
    nextStepDirections: "Next, we'll explore the three cloud service models: IaaS, PaaS, and SaaS.",
  },
  {
    stepLabel: "Cloud Service Models (IaaS, PaaS, SaaS)",
    explanation: "Cloud service models define the level of control and responsibility: IaaS (Infrastructure as a Service) gives you VMs and networking — you manage the OS and apps; PaaS (Platform as a Service) gives you a managed platform — you manage only your app code; SaaS (Software as a Service) gives you a finished application — you just use it.",
    whyItMatters: "AZ-900 requires you to identify which service model a product belongs to and what the shared responsibility split is. Azure VMs = IaaS, Azure App Service = PaaS, Microsoft 365 = SaaS.",
    interaction: {
      type: "dashboard",
      title: "Classify Azure Services by Model",
      description: "Match each Azure service to its cloud service model.",
      items: [
        { id: "s1", label: "Azure Virtual Machines — you manage the OS, patches, and apps.", type: "select", options: ["IaaS", "PaaS", "SaaS"], correct: "IaaS" },
        { id: "s2", label: "Azure App Service — Microsoft manages the platform, you deploy code.", type: "select", options: ["IaaS", "PaaS", "SaaS"], correct: "PaaS" },
        { id: "s3", label: "Microsoft 365 / Outlook — fully managed application, you just use it.", type: "select", options: ["IaaS", "PaaS", "SaaS"], correct: "SaaS" },
        { id: "s4", label: "Azure SQL Database — Microsoft manages the DB engine, you manage data.", type: "select", options: ["IaaS", "PaaS", "SaaS"], correct: "PaaS" },
      ],
      feedback: "All services classified correctly! Remember: IaaS = you manage OS, PaaS = you manage app, SaaS = you manage nothing.",
    },
    question: {
      text: "Your team deploys a web application to Azure App Service. Microsoft manages the underlying servers, OS, and runtime. Your team only manages the application code and configuration. Which service model is this?",
      options: ["IaaS — because you're running software in the cloud", "PaaS — because the platform is managed and you focus on app code", "SaaS — because it's a software service", "On-premises — because you still manage the app"],
      correctIndex: 1,
      explanation: "Azure App Service is PaaS (Platform as a Service). Microsoft manages the infrastructure, OS, and runtime environment. Your team is responsible only for the application code, configuration, and data. This is the key distinction: PaaS shifts OS and runtime management to the provider.",
    },
    nextStepDirections: "Now let's explore the key benefits of cloud computing.",
  },
  {
    stepLabel: "Cloud Benefits & Characteristics",
    explanation: "Cloud computing provides several key benefits: Scalability (scale up/out as needed), Elasticity (automatically scale up/down based on demand), Reliability (fault tolerance and high availability), Predictability (performance and cost predictability), Security (provider invests heavily), and Fault Tolerance (resilience to failures).",
    whyItMatters: "AZ-900 tests whether you can identify which benefit a scenario describes. Scalability is about capacity; elasticity is about automatic adjustment; reliability is about uptime; fault tolerance is about surviving failures.",
    interaction: {
      type: "dashboard",
      title: "Identify Cloud Benefits",
      description: "Match each scenario to the cloud benefit it demonstrates.",
      items: [
        { id: "s1", label: "An e-commerce site adds 10 more VMs automatically during Black Friday, then removes them after.", type: "select", options: ["Scalability", "Elasticity", "Reliability", "Predictability"], correct: "Elasticity" },
        { id: "s2", label: "A database is replicated across 3 availability zones so if one fails, the others continue.", type: "select", options: ["Scalability", "Elasticity", "Reliability", "Fault Tolerance"], correct: "Fault Tolerance" },
        { id: "s3", label: "A company manually increases VM size from 2 vCPU to 8 vCPU to handle more traffic.", type: "select", options: ["Scalability", "Elasticity", "Reliability", "Predictability"], correct: "Scalability" },
        { id: "s4", label: "Azure Cost Management shows projected monthly spend so you can budget accurately.", type: "select", options: ["Scalability", "Elasticity", "Reliability", "Predictability"], correct: "Predictability" },
      ],
      feedback: "All benefits identified correctly! Scalability = manual/automatic capacity change, Elasticity = automatic up/down, Fault Tolerance = survive failures, Predictability = budget/performance forecasting.",
    },
    question: {
      text: "A video streaming service automatically provisions additional encoding servers when traffic spikes, then automatically deallocates them when traffic subsides. Which cloud characteristic does this describe?",
      options: ["Scalability — because capacity increased", "Elasticity — because the system automatically scales up AND down based on demand", "Reliability — because the service stayed up", "Fault Tolerance — because the system handled the load"],
      correctIndex: 1,
      explanation: "Elasticity is the automatic scaling of resources both up (when demand increases) and down (when demand decreases). Scalability is the ability to increase capacity (manual or automatic), but elasticity specifically refers to the automatic, dynamic nature of adding AND removing resources. This automatic bidirectional scaling is what makes cloud cost-efficient.",
    },
    nextStepDirections: "Let's examine cloud pricing and consumption models next.",
  },
  {
    stepLabel: "Cloud Pricing & Consumption Models",
    explanation: "Azure pricing follows several models: Pay-as-you-go (per-second billing for compute), Reserved Instances (1- or 3-year commitment for discount), Spot VMs (use unused capacity at deep discount), and Free Tier (12 months free + always-free services). Understanding these helps optimize cost.",
    whyItMatters: "AZ-900 tests whether you can recommend the right pricing model for a scenario. Steady-state workloads benefit from reserved instances; variable workloads from pay-as-you-go; batch/flexible workloads from spot VMs.",
    interaction: {
      type: "dashboard",
      title: "Select the Right Pricing Model",
      description: "Choose the most cost-effective Azure pricing model for each workload.",
      items: [
        { id: "s1", label: "A production database that runs 24/7 for the next 3 years.", type: "select", options: ["Pay-as-you-go", "Reserved (3-year)", "Spot VM", "Free Tier"], correct: "Reserved (3-year)" },
        { id: "s2", label: "A dev/test VM that runs only during business hours, unpredictable schedule.", type: "select", options: ["Pay-as-you-go", "Reserved (1-year)", "Spot VM", "Free Tier"], correct: "Pay-as-you-go" },
        { id: "s3", label: "A batch processing job that can be interrupted and restarted.", type: "select", options: ["Pay-as-you-go", "Reserved (1-year)", "Spot VM", "Free Tier"], correct: "Spot VM" },
        { id: "s4", label: "A new user wants to try Azure App Service for a personal project.", type: "select", options: ["Pay-as-you-go", "Reserved (1-year)", "Spot VM", "Free Tier"], correct: "Free Tier" },
      ],
      feedback: "All pricing models matched correctly! Reserved = steady/long-term, Pay-as-you-go = variable, Spot = interruptible, Free Tier = trial.",
    },
    question: {
      text: "A company runs a critical web API that must be available 24/7 and is expected to run for at least 3 years. They want to minimize cost. Which pricing model should they choose?",
      options: ["Pay-as-you-go — billed per second of usage", "Reserved VM Instance (3-year term) — commit to 3 years for up to 72% discount", "Spot VM — use unused Azure capacity at a deep discount", "Free Tier — use the first 12 months free"],
      correctIndex: 1,
      explanation: "A Reserved VM Instance with a 3-year term provides the largest discount (up to 72% compared to pay-as-you-go). For a 24/7 steady-state workload running for 3 years, reserved instances are optimal. Spot VMs are not suitable because they can be evicted. Pay-as-you-go is more expensive for steady workloads. Free Tier is limited and expires.",
    },
    nextStepDirections: "Now let's compare cloud costs using the TCO calculator.",
  },
  {
    stepLabel: "Total Cost of Ownership (TCO)",
    explanation: "The Total Cost of Ownership (TCO) compares the full cost of running workloads on-premises vs. in the cloud. On-prem costs include hardware, power, cooling, IT staff, and datacenter space. Cloud costs include compute, storage, networking, and support. Azure provides a TCO Calculator to estimate savings.",
    whyItMatters: "AZ-900 tests whether you understand what costs are included in TCO and how cloud can reduce them. Cloud shifts CapEx (capital expenditure — buying hardware) to OpEx (operational expenditure — pay-as-you-go).",
    interaction: {
      type: "dashboard",
      title: "TCO Analysis: On-Prem vs. Cloud",
      description: "Classify each cost as CapEx, OpEx, or Cloud OpEx.",
      items: [
        { id: "s1", label: "Purchasing 20 physical servers for a datacenter.", type: "select", options: ["CapEx", "OpEx", "Cloud OpEx"], correct: "CapEx" },
        { id: "s2", label: "Monthly Azure VM billing for compute resources.", type: "select", options: ["CapEx", "OpEx", "Cloud OpEx"], correct: "Cloud OpEx" },
        { id: "s3", label: "Annual datacenter electricity and cooling costs.", type: "select", options: ["CapEx", "OpEx", "Cloud OpEx"], correct: "OpEx" },
        { id: "s4", label: "Paying Azure support plan fees monthly.", type: "select", options: ["CapEx", "OpEx", "Cloud OpEx"], correct: "Cloud OpEx" },
      ],
      feedback: "All costs classified correctly! CapEx = buying hardware, OpEx = ongoing on-prem costs, Cloud OpEx = cloud service billing.",
    },
    question: {
      text: "A company is deciding whether to build a new on-premises datacenter or migrate to Azure. Which tool should they use to compare the total 3-year cost of both options?",
      options: ["Azure Pricing Calculator — estimates monthly Azure costs only", "Azure TCO Calculator — compares total cost of on-premises vs. cloud over time", "Azure Cost Management — tracks current Azure spending", "Azure Advisor — provides cost optimization recommendations"],
      correctIndex: 1,
      explanation: "The Azure TCO (Total Cost of Ownership) Calculator is designed specifically to compare the full cost of on-premises infrastructure (hardware, power, cooling, staff, space) against the cost of running the same workloads in Azure. The Pricing Calculator only estimates Azure costs without the on-premises comparison. Cost Management tracks existing spend, and Advisor gives optimization tips.",
    },
    nextStepDirections: "Finally, let's explore the Azure Marketplace and third-party services.",
  },
  {
    stepLabel: "Azure Marketplace & Third-Party Services",
    explanation: "Azure Marketplace is an online store with thousands of pre-configured solutions from Microsoft and third-party partners — including VM images, SaaS apps, managed services, and consulting services. It enables quick deployment of validated solutions without building from scratch.",
    whyItMatters: "AZ-900 tests whether you know what Azure Marketplace offers and when to use it. You can deploy pre-configured VMs (e.g., a WordPress appliance), purchase SaaS apps, or find consulting partners — all through a single marketplace.",
    interaction: {
      type: "dashboard",
      title: "Azure Marketplace Scenarios",
      description: "Determine whether each scenario is a good fit for Azure Marketplace.",
      items: [
        { id: "s1", label: "Deploy a pre-configured WordPress VM with one click instead of installing from scratch.", type: "toggle", correct: true },
        { id: "s2", label: "Purchase a third-party SaaS monitoring tool through the Azure portal.", type: "toggle", correct: true },
        { id: "s3", label: "Build a custom application from scratch using raw Azure VMs.", type: "toggle", correct: false },
        { id: "s4", label: "Find a certified consulting partner for a cloud migration project.", type: "toggle", correct: true },
      ],
      feedback: "All scenarios evaluated correctly! Marketplace is for pre-configured solutions, SaaS apps, and consulting — not for building custom apps from scratch.",
    },
    question: {
      text: "A company needs to deploy a F5 BIG-IP load balancer in Azure. They want the fastest, most reliable deployment method. What should they use?",
      options: ["Build a custom VM and manually install F5 software", "Search Azure Marketplace for a pre-configured F5 BIG-IP VM image and deploy it directly", "Contact F5 directly and wait for their engineering team to assist", "Use Azure Load Balancer instead — it's the only option in Azure"],
      correctIndex: 1,
      explanation: "Azure Marketplace offers pre-configured, validated VM images from partners like F5. Deploying from Marketplace ensures you get a tested, supported configuration with one click — much faster and more reliable than manual installation. Azure also has its own Azure Load Balancer, but if the company specifically needs F5 BIG-IP, Marketplace is the right choice.",
    },
  },
];

const intro = {
  overview: "This lab covers Microsoft Azure Fundamentals (AZ-900) Domain 1: Cloud Concepts. You'll explore cloud deployment models, service models (IaaS/PaaS/SaaS), cloud benefits, pricing models, TCO analysis, and Azure Marketplace through interactive dashboard exercises.",
  niceCategory: "Cloud Concepts",
  objectives: [
    "Identify cloud deployment models (public, private, hybrid)",
    "Classify Azure services by cloud service model (IaaS, PaaS, SaaS)",
    "Recognize key cloud benefits (scalability, elasticity, reliability, fault tolerance)",
    "Select appropriate Azure pricing models for different workloads",
    "Understand TCO analysis and CapEx vs. OpEx",
    "Explore Azure Marketplace for pre-configured solutions",
  ],
  outcomes: [
    "Able to match business scenarios to the correct cloud deployment model",
    "Can classify any Azure service as IaaS, PaaS, or SaaS",
    "Understands the difference between scalability and elasticity",
    "Can recommend the right pricing model for a given workload",
    "Able to use the TCO Calculator to compare on-prem vs. cloud costs",
    "Knows when to use Azure Marketplace for faster deployment",
  ],
  prerequisites: [
    "Basic understanding of IT concepts",
    "No prior Azure experience required — this is a fundamentals course",
  ],
  tools: [
    "Interactive dashboard — configure cloud models and pricing scenarios",
    "Azure TCO Calculator — compare on-premises vs. cloud costs",
    "Azure Marketplace — explore pre-configured solutions",
  ],
};

export default function LabAz900Domain1() {
  return (
    <AzureLabRunner
      labTitle="AZ-900 D1: Cloud Concepts"
      chapterNum="1"
      difficulty="Beginner"
      tags={["Microsoft", "Azure", "AZ-900", "Cloud Concepts"]}
      toolLabel="Interactive Dashboard"
      duration={40}
      intro={intro}
      steps={steps}
    />
  );
}