import React from "react";
import AzureLabRunner from "@/components/labs/azure/AzureLabRunner";

const steps = [
  {
    stepLabel: "Explore Cost Management",
    explanation: "Azure Cost Management provides tools to monitor, allocate, and optimize Azure spending. You can view cost by resource, resource group, or tag; set budgets and alerts; and use Azure Advisor for cost-saving recommendations. Understanding cost management is critical for cloud governance.",
    whyItMatters: "AZ-900 tests whether you know how to monitor and control Azure costs. Budgets alert you when spending exceeds thresholds; Cost Analysis shows spending trends; Azure Advisor recommends cost optimizations like underutilized VMs.",
    interaction: {
      type: "dashboard",
      title: "Cost Management Dashboard",
      description: "Review the cost dashboard and select the right cost optimization actions.",
      items: [
        { id: "s1", label: "A VM has been running at 5% CPU for 30 days. What should you do?", type: "select", options: ["Keep it — it might spike", "Right-size to a smaller VM tier", "Delete it immediately", "Upgrade to a larger VM"], correct: "Right-size to a smaller VM tier" },
        { id: "s2", label: "You want to be alerted when monthly Azure spend exceeds $5,000.", type: "select", options: ["Set up a Budget alert", "Check Cost Analysis weekly", "Use Azure Monitor", "Enable Azure Advisor"], correct: "Set up a Budget alert" },
        { id: "s3", label: "You need to allocate costs to different departments.", type: "select", options: ["Use resource tags", "Create separate subscriptions", "Use cost analysis only", "Export billing data"], correct: "Use resource tags" },
        { id: "s4", label: "A dev VM runs only 9-5 but is never deallocated. Enable auto-shutdown?", type: "toggle", correct: true },
      ],
      feedback: "Cost optimization plan validated! Right-sizing, budget alerts, resource tags, and auto-shutdown will significantly reduce Azure spend.",
    },
    question: {
      text: "A company wants to track Azure costs by department (Engineering, Marketing, Sales). What is the most efficient way to allocate costs?",
      options: ["Create a separate Azure subscription for each department", "Apply resource tags (e.g., Department=Engineering) to resources and use Cost Management to filter by tag", "Manually review the invoice each month and split costs", "Create a separate Azure AD tenant for each department"],
      correctIndex: 1,
      explanation: "Applying resource tags (e.g., Department=Engineering, Department=Marketing) to Azure resources is the most efficient way to allocate costs. Azure Cost Management can then filter and group costs by tag, showing each department's spending without requiring separate subscriptions. While separate subscriptions also work, they add management overhead. Tags are the recommended approach for cost allocation in a shared subscription.",
    },
    nextStepDirections: "Next, we'll configure RBAC role assignments for access control.",
  },
  {
    stepLabel: "Configure RBAC Role Assignments",
    explanation: "Azure Role-Based Access Control (RBAC) manages who can access Azure resources and what they can do. Roles are assigned at a scope (Management Group > Subscription > Resource Group > Resource). Built-in roles include Owner, Contributor, Reader, and User Access Administrator. Assign the least privilege necessary.",
    whyItMatters: "AZ-900 tests whether you know RBAC scopes, built-in roles, and the principle of least privilege. Owner can do everything including access management; Contributor can manage resources but not access; Reader can only view.",
    interaction: {
      type: "portal",
      title: "Assign RBAC Roles",
      blades: [
        { name: "Basics", fields: [
          { id: "scope", type: "select", label: "Scope", options: ["Subscription", "Resource Group", "Resource", "Management Group"], correct: "Resource Group", hint: "Assign at the smallest scope needed" },
          { id: "principal", type: "text", label: "User/Group name", placeholder: "dev-team-group", correct: "dev-team-group" },
        ]},
        { name: "Roles", fields: [
          { id: "role", type: "select", label: "Role", options: ["Owner", "Contributor", "Reader", "User Access Administrator"], correct: "Contributor", hint: "Contributor can manage resources but not access assignments" },
          { id: "duration", type: "select", label: "Assignment type", options: ["Permanent", "Eligible (PIM)"], correct: "Permanent" },
        ]},
      ],
      feedback: "RBAC role assigned! The dev-team-group now has Contributor access at the Resource Group scope — they can manage resources but not change access.",
    },
    question: {
      text: "A new team member needs to view Azure resources but should NOT be able to modify them. Which built-in RBAC role should they be assigned?",
      options: ["Owner — full access including access management", "Contributor — can create and manage resources", "Reader — can view resources but cannot make changes", "User Access Administrator — can manage role assignments"],
      correctIndex: 2,
      explanation: "The Reader role allows viewing Azure resources but cannot create, modify, or delete them. This follows the principle of least privilege — give only the access needed. Owner has full access including managing others' permissions. Contributor can create and modify resources. User Access Administrator can manage role assignments. For read-only access, Reader is the correct choice.",
    },
    nextStepDirections: "Now let's apply Azure Policy for governance.",
  },
  {
    stepLabel: "Apply Azure Policy",
    explanation: "Azure Policy enforces compliance rules on Azure resources. Policies can restrict resource types, enforce naming conventions, require tags, or mandate regions. Non-compliant resources are flagged or blocked. Policy is evaluated at resource creation and at regular intervals.",
    whyItMatters: "AZ-900 tests whether you know Azure Policy enforces standards and that it can prevent non-compliant resources from being created. This is different from RBAC (which controls who can act) — Policy controls what can be created.",
    interaction: {
      type: "portal",
      title: "Create Azure Policy Assignment",
      blades: [
        { name: "Basics", fields: [
          { id: "policyName", type: "text", label: "Policy assignment name", placeholder: "enforce-tag-policy", correct: "enforce-tag-policy" },
          { id: "scope", type: "select", label: "Scope", options: ["Management Group", "Subscription", "Resource Group"], correct: "Subscription" },
        ]},
        { name: "Policy", fields: [
          { id: "policyDef", type: "select", label: "Policy definition", options: ["Require tag and its value", "Allowed locations", "Allowed VM SKUs", "Enforce HTTPS on storage"], correct: "Allowed locations" },
          { id: "effect", type: "select", label: "Effect", options: ["Deny", "Audit", "AuditIfNotExists", "DeployIfNotExists"], correct: "Deny", hint: "Deny blocks creation; Audit logs non-compliance" },
        ]},
      ],
      feedback: "Azure Policy assigned! Resources can now only be created in allowed locations — non-compliant deployments will be denied.",
    },
    question: {
      text: "What is the key difference between Azure RBAC and Azure Policy?",
      options: ["RBAC controls what resources can be created; Policy controls who can access them", "RBAC controls who can access resources and what actions they can perform; Policy controls what resource configurations are allowed or denied", "They are the same service with different names", "RBAC is free; Policy requires a premium license"],
      correctIndex: 1,
      explanation: "RBAC (Role-Based Access Control) controls WHO can access resources and WHAT actions they can perform (read, write, delete). Azure Policy controls WHAT resource configurations are allowed — it can enforce naming conventions, restrict regions, require tags, or mandate encryption. They are complementary: RBAC controls user permissions; Policy controls resource compliance. A user with Contributor RBAC access can still be blocked by Policy from creating a non-compliant resource.",
    },
    nextStepDirections: "Let's set up monitoring alerts next.",
  },
  {
    stepLabel: "Set Up Monitoring Alerts",
    explanation: "Azure Monitor collects telemetry from Azure resources. You can set up alert rules that trigger when metrics cross thresholds (e.g., CPU > 80% for 5 minutes). Alerts can send email/SMS, call a webhook, or trigger an Azure Function. Log Analytics workspaces store log data for querying.",
    whyItMatters: "AZ-900 tests whether you know Azure Monitor provides metrics and logs, that alerts trigger based on conditions, and that Log Analytics is used for log queries with KQL (Kusto Query Language).",
    interaction: {
      type: "portal",
      title: "Create an Alert Rule",
      blades: [
        { name: "Basics", fields: [
          { id: "alertName", type: "text", label: "Alert rule name", placeholder: "high-cpu-alert", correct: "high-cpu-alert" },
          { id: "resource", type: "select", label: "Target resource", options: ["myVM (Virtual Machine)", "myApp (App Service)", "myDB (SQL Database)"], correct: "myVM (Virtual Machine)" },
        ]},
        { name: "Condition", fields: [
          { id: "metric", type: "select", label: "Metric", options: ["CPU Percentage", "Memory Usage", "Disk IOPS", "Network In"], correct: "CPU Percentage" },
          { id: "threshold", type: "text", label: "Threshold (%)", placeholder: "80", correct: "80" },
          { id: "window", type: "select", label: "Aggregation window", options: ["1 min", "5 min", "15 min", "30 min"], correct: "5 min" },
        ]},
      ],
      feedback: "Alert rule created! You'll be notified when CPU exceeds 80% for 5 consecutive minutes on myVM.",
    },
    question: {
      text: "A team needs to query and analyze Azure resource logs using a query language. Which Azure service and language should they use?",
      options: ["Azure Monitor Metrics and REST API", "Log Analytics workspace with KQL (Kusto Query Language)", "Azure Advisor recommendations", "Azure Security Center alerts"],
      correctIndex: 1,
      explanation: "Log Analytics workspaces store log data from Azure resources, and you query them using KQL (Kusto Query Language). KQL is a powerful query language designed for log analytics that lets you filter, aggregate, and join log data. Azure Monitor Metrics provides numeric data (CPU, memory) but not log querying. Azure Advisor provides recommendations, and Security Center provides security alerts — neither is a log query tool.",
    },
    nextStepDirections: "Let's explore Azure Resource Manager (ARM) templates next.",
  },
  {
    stepLabel: "Use ARM Templates (IaC)",
    explanation: "Azure Resource Manager (ARM) templates are JSON files that define infrastructure as code. You deploy the template once and Azure creates all resources consistently. ARM templates support parameters, variables, and functions for reusability. They enable repeatable, version-controlled deployments.",
    whyItMatters: "AZ-900 tests whether you know ARM templates are Infrastructure as Code (IaC) and that they enable declarative, repeatable deployments. Bicep is a newer, simpler language that compiles to ARM JSON.",
    interaction: {
      type: "dashboard",
      title: "ARM Template Concepts",
      description: "Match each ARM template concept to its description.",
      items: [
        { id: "s1", label: "A value provided at deployment time to customize the template.", type: "select", options: ["Parameter", "Variable", "Resource", "Output"], correct: "Parameter" },
        { id: "s2", label: "A computed value used within the template for reuse.", type: "select", options: ["Parameter", "Variable", "Resource", "Output"], correct: "Variable" },
        { id: "s3", label: "A value returned after deployment for use by other scripts.", type: "select", options: ["Parameter", "Variable", "Resource", "Output"], correct: "Output" },
        { id: "s4", label: "An Azure resource to be created (e.g., VM, VNet, Storage).", type: "select", options: ["Parameter", "Variable", "Resource", "Output"], correct: "Resource" },
      ],
      feedback: "All ARM template concepts matched correctly! Parameters = input, Variables = computed, Resources = to create, Outputs = returned.",
    },
    question: {
      text: "What is the primary benefit of using ARM templates for Azure deployments?",
      options: ["They are required for all Azure deployments", "They enable declarative, repeatable, version-controlled infrastructure deployments (Infrastructure as Code)", "They are faster than the Azure Portal for creating a single resource", "They provide a graphical interface for resource management"],
      correctIndex: 1,
      explanation: "ARM templates enable Infrastructure as Code (IaC) — you define your infrastructure declaratively in JSON (or Bicep), and Azure creates/updates resources consistently every time. Benefits include: repeatability (same template = same result), version control (templates can be stored in Git), and consistency across environments (dev/test/prod). They are not required for Azure deployments, and for a single resource, the Portal is often faster. But for complex, repeatable deployments, ARM templates are the recommended approach.",
    },
    nextStepDirections: "Finally, let's review Azure Advisor recommendations.",
  },
  {
    stepLabel: "Review Azure Advisor",
    explanation: "Azure Advisor analyzes your Azure resources and provides personalized recommendations across five categories: Cost, Security, Reliability, Operational Excellence, and Performance. It's a free service that helps you follow Azure best practices.",
    whyItMatters: "AZ-900 tests whether you know the five Advisor categories and that Advisor is free. It proactively identifies issues like unsecured storage accounts, underutilized VMs, and missing backup configurations.",
    interaction: {
      type: "dashboard",
      title: "Azure Advisor Recommendations",
      description: "Match each Advisor recommendation to its correct category.",
      items: [
        { id: "s1", label: "Right-size underutilized VMs to save money.", type: "select", options: ["Cost", "Security", "Reliability", "Performance"], correct: "Cost" },
        { id: "s2", label: "Enable MFA for privileged accounts.", type: "select", options: ["Cost", "Security", "Reliability", "Performance"], correct: "Security" },
        { id: "s3", label: "Enable backup on VMs that have no backup configured.", type: "select", options: ["Cost", "Security", "Reliability", "Performance"], correct: "Reliability" },
        { id: "s4", label: "Upgrade to the latest VM size for better throughput.", type: "select", options: ["Cost", "Security", "Reliability", "Performance"], correct: "Performance" },
      ],
      feedback: "All recommendations categorized correctly! Advisor covers Cost, Security, Reliability, Operational Excellence, and Performance.",
    },
    question: {
      text: "Azure Advisor provides recommendations in which of the following categories?",
      options: ["Cost, Security, Reliability, Operational Excellence, and Performance", "Only Cost and Security", "Only Performance and Reliability", "Cost, Security, and Compliance only"],
      correctIndex: 0,
      explanation: "Azure Advisor provides recommendations across five categories: Cost (save money), Security (improve security posture), Reliability (ensure business continuity), Operational Excellence (best practices for operations), and Performance (improve speed). It's a free service that continuously analyzes your resources and provides actionable recommendations. It does not cover compliance directly — that's handled by Azure Policy and Defender for Cloud.",
    },
  },
];

const intro = {
  overview: "This lab covers Microsoft Azure Fundamentals (AZ-900) Domain 4: Azure Management & Governance. You'll explore cost management, configure RBAC role assignments, apply Azure Policy, set up monitoring alerts, use ARM templates, and review Azure Advisor recommendations through interactive portal and dashboard exercises.",
  niceCategory: "Management & Governance",
  objectives: [
    "Monitor and optimize Azure costs using Cost Management",
    "Configure RBAC role assignments with least privilege",
    "Apply Azure Policy for resource compliance enforcement",
    "Set up monitoring alerts with Azure Monitor",
    "Understand ARM templates for Infrastructure as Code",
    "Review Azure Advisor recommendations across all categories",
  ],
  outcomes: [
    "Able to right-size resources and set budget alerts",
    "Can assign the correct RBAC role at the appropriate scope",
    "Understands the difference between RBAC (who) and Policy (what)",
    "Can create alert rules based on metric thresholds",
    "Knows the components of an ARM template (parameters, variables, resources, outputs)",
    "Can categorize Azure Advisor recommendations",
  ],
  prerequisites: [
    "Completion of AZ-900 Domains 1-3 is recommended",
    "Basic understanding of access control and governance concepts",
  ],
  tools: [
    "Azure Portal simulation — configure RBAC, Policy, and alerts",
    "Interactive dashboard — cost management and ARM template exercises",
    "Azure Advisor — review and categorize recommendations",
  ],
};

export default function LabAz900Domain4() {
  return (
    <AzureLabRunner
      labTitle="AZ-900 D4: Management & Governance"
      chapterNum="4"
      difficulty="Intermediate"
      tags={["Microsoft", "Azure", "AZ-900", "Governance", "RBAC", "Policy"]}
      toolLabel="Azure Portal & Dashboard"
      duration={55}
      intro={intro}
      steps={steps}
    />
  );
}