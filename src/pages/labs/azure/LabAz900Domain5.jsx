import React from "react";
import AzureLabRunner from "@/components/labs/azure/AzureLabRunner";

const steps = [
  {
    stepLabel: "Review Defender for Cloud Posture",
    explanation: "Microsoft Defender for Cloud (formerly Azure Security Center) provides unified security management and advanced threat protection. It assesses your security posture with a Secure Score, identifies vulnerabilities, and provides recommendations. Defender plans cover VMs, SQL, Storage, Containers, and more.",
    whyItMatters: "AZ-900 tests whether you know Defender for Cloud provides security posture management and threat protection, and that the Secure Score measures how well you've implemented security recommendations.",
    interaction: {
      type: "portal",
      title: "Review Security Posture in Defender for Cloud",
      blades: [
        { name: "Overview", fields: [
          { id: "secureScore", type: "select", label: "Current Secure Score status", options: ["Low (0-40)", "Medium (41-70)", "High (71-100)"], correct: "Medium (41-70)", hint: "Higher score = better security posture" },
          { id: "coverage", type: "select", label: "Defender plan coverage", options: ["VMs only", "VMs + SQL + Storage + Containers (all)", "Not enabled"], correct: "VMs + SQL + Storage + Containers (all)" },
        ]},
        { name: "Recommendations", fields: [
          { id: "rec1", type: "select", label: "Top recommendation: Enable disk encryption on VMs", options: ["Apply now", "Dismiss", "Postpone", "Ignore"], correct: "Apply now" },
          { id: "rec2", type: "select", label: "Recommendation: Enable just-in-time VM access", options: ["Apply now", "Dismiss", "Postpone", "Ignore"], correct: "Apply now" },
        ]},
      ],
      feedback: "Security posture reviewed! Applying disk encryption and JIT access will significantly improve your Secure Score.",
    },
    question: {
      text: "What does the Secure Score in Microsoft Defender for Cloud represent?",
      options: ["The number of security alerts in the last 30 days", "A percentage indicating how well you've implemented security recommendations (0-100)", "The total cost of security services used", "The number of compliance frameworks you're certified for"],
      correctIndex: 1,
      explanation: "The Secure Score is a percentage (0-100) that measures how well you've implemented the security recommendations from Defender for Cloud. A higher score means you've addressed more of the identified security gaps. It's not a count of alerts, costs, or certifications — it's a measure of your security posture based on best practices. Improving your Secure Score means addressing the recommendations that Defender for Cloud identifies.",
    },
    nextStepDirections: "Next, let's configure identity with Microsoft Entra ID.",
  },
  {
    stepLabel: "Configure Microsoft Entra ID (Azure AD)",
    explanation: "Microsoft Entra ID (formerly Azure Active Directory) is Azure's cloud-based identity and access management service. It manages users, groups, and applications. Entra ID supports SSO, MFA, conditional access, and B2B collaboration. It's the identity provider for Azure, Microsoft 365, and many SaaS apps.",
    whyItMatters: "AZ-900 tests whether you know Entra ID manages identities and access, supports SSO and MFA, and is different from on-premises Active Directory Domain Services (AD DS). Entra ID is cloud-native; AD DS requires domain controllers.",
    interaction: {
      type: "portal",
      title: "Configure Entra ID Security",
      blades: [
        { name: "Users", fields: [
          { id: "user", type: "text", label: "New user email", placeholder: "admin@company.com", correct: "admin@company.com" },
          { id: "mfa", type: "toggle", label: "Require MFA for all users", correct: true, hint: "Multi-factor authentication adds a second verification factor" },
        ]},
        { name: "Security", fields: [
          { id: "sso", type: "toggle", label: "Enable Single Sign-On (SSO)", correct: true },
          { id: "conditionalAccess", type: "select", label: "Conditional access policy", options: ["Block all access", "Require MFA from non-trusted IPs", "Allow all access", "Require password reset"], correct: "Require MFA from non-trusted IPs", hint: "Conditional access enforces policies based on conditions" },
        ]},
      ],
      feedback: "Entra ID security configured! MFA, SSO, and conditional access are now active — identity is significantly more secure.",
    },
    question: {
      text: "What is the primary difference between Microsoft Entra ID and on-premises Active Directory Domain Services (AD DS)?",
      options: ["Entra ID is cloud-based identity management; AD DS requires on-premises domain controllers", "Entra ID is free; AD DS requires a license", "Entra ID only supports Linux; AD DS only supports Windows", "They are the same product with different names"],
      correctIndex: 0,
      explanation: "Microsoft Entra ID (formerly Azure AD) is a cloud-based identity and access management service — no on-premises infrastructure required. It provides SSO, MFA, and conditional access for cloud apps. AD DS (Active Directory Domain Services) is an on-premises directory service that requires domain controllers and uses protocols like LDAP, Kerberos, and Group Policy. They can be synced using Azure AD Connect for a hybrid identity setup.",
    },
    nextStepDirections: "Let's implement Network Security Groups next.",
  },
  {
    stepLabel: "Implement Network Security Groups (NSGs)",
    explanation: "Network Security Groups (NSGs) filter network traffic to and from Azure resources. NSGs contain security rules that allow or deny traffic based on source/destination IP, port, and protocol. NSGs can be applied to subnets or individual network interfaces. Default rules allow internal VNet traffic and deny inbound from internet.",
    whyItMatters: "AZ-900 tests whether you know NSGs filter traffic at the network layer (L3/L4), can be applied to subnets or NICs, and use priority-based rules (lower number = higher priority). Application Security Groups (ASGs) simplify rule management for groups of VMs.",
    interaction: {
      type: "portal",
      title: "Configure Network Security Group Rules",
      blades: [
        { name: "Basics", fields: [
          { id: "nsgName", type: "text", label: "NSG name", placeholder: "webSubnet-nsg", correct: "webSubnet-nsg" },
          { id: "attachTo", type: "select", label: "Attach to", options: ["Subnet (webSubnet)", "Network Interface (VM1-nic)", "Both"], correct: "Subnet (webSubnet)" },
        ]},
        { name: "Rules", fields: [
          { id: "inboundHTTP", type: "select", label: "Inbound: Allow HTTP (port 80)?", options: ["Allow from Internet", "Allow from VNet only", "Deny all"], correct: "Allow from Internet" },
          { id: "inboundSSH", type: "select", label: "Inbound: Allow SSH (port 22)?", options: ["Allow from Internet", "Allow from specific IPs only", "Deny all"], correct: "Allow from specific IPs only", hint: "Never allow SSH from the entire internet" },
          { id: "outbound", type: "select", label: "Outbound: Allow internet access?", options: ["Allow all", "Deny all", "Allow HTTP/HTTPS only"], correct: "Allow HTTP/HTTPS only" },
        ]},
      ],
      feedback: "NSG configured! HTTP is open to the internet, SSH is restricted to specific IPs, and outbound is limited to HTTP/HTTPS.",
    },
    question: {
      text: "A company needs to restrict SSH (port 22) access to their Azure VMs so that only their office IP (203.0.113.50) can connect. How should they configure the NSG?",
      options: ["Create an inbound rule: Allow port 22 from source 203.0.113.50/32, priority 100, and a rule: Deny port 22 from source *, priority 200", "Create a single rule: Allow port 22 from source * (any)", "Disable the NSG — RBAC will handle access control", "Create a rule: Deny port 22 from source 203.0.113.50/32"],
      correctIndex: 0,
      explanation: "To restrict SSH to a single IP, create two NSG inbound rules: (1) Allow port 22 from source 203.0.113.50/32 (a /32 CIDR covers exactly one IP) with a lower priority number (e.g., 100), and (2) Deny port 22 from source * (any) with a higher priority number (e.g., 200). NSG rules are evaluated by priority — lower numbers are processed first. The allow rule matches the office IP, and the deny rule blocks everything else. Never allow SSH from * (the entire internet).",
    },
    nextStepDirections: "Now let's explore Azure Key Vault for secrets management.",
  },
  {
    stepLabel: "Explore Azure Key Vault",
    explanation: "Azure Key Vault securely stores and manages secrets, keys, and certificates. It provides: Secrets (passwords, connection strings), Keys (cryptographic keys for encryption), Certificates (TLS/SSL certificates), and Hardware Security Module (HSM) support. Applications access Key Vault via managed identities — no hardcoded credentials.",
    whyItMatters: "AZ-900 tests whether you know Key Vault stores secrets/keys/certificates and that managed identities eliminate the need to store credentials in code. Key Vault integrates with Azure services for encryption-at-rest and TLS management.",
    interaction: {
      type: "portal",
      title: "Create Azure Key Vault",
      blades: [
        { name: "Basics", fields: [
          { id: "vaultName", type: "text", label: "Key Vault name", placeholder: "myapp-kv-prod", correct: "myapp-kv-prod" },
          { id: "region", type: "select", label: "Region", options: ["East US", "West Europe", "North Europe", "Japan East"], correct: "East US" },
          { id: "pricingTier", type: "select", label: "Pricing tier", options: ["Standard", "Premium"], correct: "Standard", hint: "Premium includes HSM-backed keys" },
        ]},
        { name: "Access", fields: [
          { id: "accessPolicy", type: "select", label: "Access policy model", options: ["Vault access policy", "Azure RBAC", "Both"], correct: "Azure RBAC", hint: "RBAC is the recommended model for new vaults" },
          { id: "softDelete", type: "toggle", label: "Enable soft delete (recovery)", correct: true },
        ]},
      ],
      feedback: "Key Vault created! Store your secrets, keys, and certificates here — applications access them via managed identities without hardcoded credentials.",
    },
    question: {
      text: "An application needs to access a database connection string stored in Azure Key Vault without hardcoding credentials. What is the recommended approach?",
      options: ["Store the Key Vault URL and access key in the application config file", "Use a managed identity for the application and grant it Key Vault access via RBAC — no credentials in code", "Store the connection string directly in environment variables on the VM", "Create a service principal and store its client secret in the app code"],
      correctIndex: 1,
      explanation: "Using a managed identity is the recommended approach. A managed identity is an automatically managed identity in Entra ID that the application can use to authenticate to Key Vault — no credentials stored in code or config files. You grant the managed identity RBAC access to Key Vault, and the application retrieves secrets at runtime using its identity. This eliminates credential rotation, reduces risk of credential theft, and is a security best practice in Azure.",
    },
    nextStepDirections: "Let's review Azure compliance offerings next.",
  },
  {
    stepLabel: "Review Azure Compliance Offerings",
    explanation: "Azure complies with a wide range of international and industry-specific compliance standards: ISO 27001, SOC 1/2/3, HIPAA, PCI DSS, GDPR, FedRAMP, and more. The Microsoft Trust Center provides compliance documentation, audit reports, and compliance guides. Azure Compliance Manager helps track compliance status.",
    whyItMatters: "AZ-900 tests whether you know Azure has extensive compliance certifications and where to find them (Trust Center / Service Trust Portal). Compliance is a shared responsibility — Azure provides the infrastructure compliance; you ensure your configuration is compliant.",
    interaction: {
      type: "dashboard",
      title: "Match Compliance Standards to Industries",
      description: "Match each compliance standard to the industry it primarily serves.",
      items: [
        { id: "s1", label: "HIPAA / HITRUST", type: "select", options: ["Healthcare", "Finance", "Government", "Retail"], correct: "Healthcare" },
        { id: "s2", label: "PCI DSS", type: "select", options: ["Healthcare", "Finance/Payments", "Government", "Manufacturing"], correct: "Finance/Payments" },
        { id: "s3", label: "FedRAMP", type: "select", options: ["Healthcare", "Finance", "US Government", "Education"], correct: "US Government" },
        { id: "s4", label: "GDPR", type: "select", options: ["US Privacy Law", "EU Data Protection", "China Data Law", "Global Standard"], correct: "EU Data Protection" },
      ],
      feedback: "All compliance standards matched correctly! Azure supports all of these and many more — check the Trust Center for details.",
    },
    question: {
      text: "Where can a customer find Azure compliance documentation, audit reports, and compliance guides?",
      options: ["Azure Portal > Compliance section", "Microsoft Trust Center / Service Trust Portal", "Azure Advisor > Compliance recommendations", "Azure Policy > Compliance dashboard"],
      correctIndex: 1,
      explanation: "The Microsoft Trust Center (aka Service Trust Portal) is the central resource for Azure compliance documentation. It provides audit reports (ISO, SOC, HIPAA), compliance guides, data protection addendums, and privacy statements. The Azure Portal shows your own resource compliance via Azure Policy, but the Trust Center is where you find the official certifications and audit reports for Azure's infrastructure. Access requires a Microsoft account.",
    },
    nextStepDirections: "Finally, let's implement Azure Information Protection.",
  },
  {
    stepLabel: "Implement Azure Information Protection",
    explanation: "Azure Information Protection (AIP), now part of Microsoft Purview Information Protection, classifies and protects sensitive data. You can label documents (e.g., Public, Internal, Confidential, Secret), apply encryption, and track usage. Labels can be applied manually or automatically based on content discovery.",
    whyItMatters: "AZ-900 tests whether you know AIP/Purview provides data classification and protection (labels, encryption, tracking) and that it helps prevent data leaks by controlling who can access, print, or forward sensitive documents.",
    interaction: {
      type: "dashboard",
      title: "Configure Data Classification Labels",
      description: "Select the correct sensitivity label for each document type.",
      items: [
        { id: "s1", label: "Public marketing brochure for the company website.", type: "select", options: ["Public", "Internal", "Confidential", "Secret"], correct: "Public" },
        { id: "s2", label: "Internal employee handbook shared within the company.", type: "select", options: ["Public", "Internal", "Confidential", "Secret"], correct: "Internal" },
        { id: "s3", label: "Customer database with PII — restricted to authorized staff.", type: "select", options: ["Public", "Internal", "Confidential", "Secret"], correct: "Confidential" },
        { id: "s4", label: "Source code for proprietary algorithms — executives only.", type: "select", options: ["Public", "Internal", "Confidential", "Secret"], correct: "Secret" },
      ],
      feedback: "All labels assigned correctly! Proper data classification ensures each document is protected with the right level of encryption and access controls.",
    },
    question: {
      text: "What is the primary purpose of Azure Information Protection (Microsoft Purview Information Protection)?",
      options: ["To protect Azure VMs from malware", "To classify, label, and protect sensitive documents with encryption and access controls", "To monitor network traffic for threats", "To manage user passwords and authentication"],
      correctIndex: 1,
      explanation: "Azure Information Protection (now part of Microsoft Purview Information Protection) classifies and protects sensitive data by applying sensitivity labels (Public, Internal, Confidential, Secret). Labels can trigger encryption, watermarks, and access restrictions — controlling who can view, edit, print, or forward a document. It also tracks document usage and can revoke access remotely. It's about data-level protection, not VM security, network monitoring, or authentication.",
    },
  },
  {
    stepLabel: "Configure a Network Security Group Rule",
    explanation: "Now let's simulate configuring a Network Security Group (NSG) rule and a Key Vault access policy — the core security configuration tasks in Azure. You'll set the rule name, priority, direction, ports, protocol, action, and configure Key Vault access for an application identity.",
    whyItMatters: "AZ-900 tests whether you know NSG rule anatomy (priority, direction, source/destination, port, protocol, action) and Key Vault access model (access policies vs RBAC). NSGs control network traffic; Key Vault secures secrets, keys, and certificates.",
    interaction: {
      type: "config",
      title: "Configure Security Controls",
      description: "Contoso needs to allow HTTPS traffic to their web servers and secure their database connection string in Key Vault. Configure the NSG inbound rule and Key Vault access policy.",
      sections: [
        {
          title: "NSG Inbound Security Rule",
          fields: [
            { id: "ruleName", label: "Rule name", type: "text", placeholder: "e.g. Allow-HTTPS-Inbound", expectedRegex: "^[a-zA-Z0-9_-]{3,80}$", hint: "3-80 characters, letters/numbers/hyphens/underscores", required: true, correctFeedback: "Valid rule name", wrongFeedback: "Must be 3-80 chars with letters, numbers, hyphens, or underscores" },
            { id: "priority", label: "Priority (100-4096, lower = higher priority)", type: "number", placeholder: "e.g. 100", expected: 100, hint: "Lower number = evaluated first; 100 is a common high-priority value", required: true, correctFeedback: "Priority 100 is evaluated before lower-priority rules", wrongFeedback: "100 is the standard high-priority value for allow-HTTPS rules" },
            { id: "direction", label: "Direction", type: "select", options: ["Inbound", "Outbound"], expected: "Inbound", hint: "We're controlling incoming traffic to the web servers", required: true, correctFeedback: "Inbound rules control traffic coming to the resource", wrongFeedback: "Outbound controls traffic leaving the resource" },
            { id: "port", label: "Destination port", type: "number", placeholder: "e.g. 443", expected: 443, hint: "HTTPS uses port 443", required: true, correctFeedback: "Port 443 is HTTPS", wrongFeedback: "443 is the standard HTTPS port" },
            { id: "protocol", label: "Protocol", type: "select", options: ["TCP", "UDP", "Any", "ICMP"], expected: "TCP", hint: "HTTPS runs over TCP", required: true, correctFeedback: "HTTPS uses TCP", wrongFeedback: "HTTPS requires TCP, not UDP" },
            { id: "action", label: "Action", type: "select", options: ["Allow", "Deny"], expected: "Allow", hint: "We want to permit HTTPS traffic to the web servers", required: true, correctFeedback: "Allow permits the HTTPS traffic", wrongFeedback: "Deny would block HTTPS traffic" },
          ],
        },
        {
          title: "Key Vault Access Policy",
          fields: [
            { id: "kvPerms", label: "Secret permissions for app identity", type: "multiselect", options: ["Get", "List", "Set", "Delete", "Recover", "Purge"], expected: ["Get", "List"], hint: "The app needs to read secrets but not create or delete them (least privilege)", required: true, correctFeedback: "Get + List is least privilege for reading secrets", wrongFeedback: "Set/Delete/Purge are too much privilege — the app only needs to read secrets" },
            { id: "kvRbac", label: "Use Azure RBAC for Key Vault data plane", type: "toggle", expected: false, hint: "Access policies are used here; RBAC is an alternative model", correctFeedback: "Access policy model is configured", wrongFeedback: "This vault uses access policies, not RBAC" },
          ],
        },
      ],
      feedback: "Security controls configured correctly! NSG allows HTTPS on port 443/TCP with priority 100, and Key Vault access is limited to Get+List (least privilege).",
    },
    question: {
      text: "You need to allow HTTPS traffic to your web servers and secure a database connection string. Which configuration provides the correct NSG rule and least-privilege Key Vault access for the application?",
      options: ["Inbound + Port 80 + TCP + Allow + Key Vault: Get, List, Set, Delete", "Inbound + Port 443 + TCP + Allow + Key Vault: Get, List", "Outbound + Port 443 + UDP + Allow + Key Vault: Get, List", "Inbound + Port 443 + TCP + Deny + Key Vault: Get only"],
      correctIndex: 1,
      explanation: "HTTPS uses port 443 over TCP. The NSG rule must be Inbound (controlling traffic to the web servers) with Allow action. For Key Vault, least privilege means the application identity should only have Get and List permissions on secrets — not Set, Delete, or Purge, which would allow modifying or removing secrets. Deny would block the traffic, and UDP is wrong for HTTPS. Port 80 is HTTP, not HTTPS.",
    },
    nextStepDirections: "You've configured complete security controls. You've finished all AZ-900 domains!",
  },
];

const intro = {
  overview: "This lab covers Microsoft Azure Fundamentals (AZ-900) Domain 5: Security, Privacy & Compliance. You'll review Defender for Cloud security posture, configure Microsoft Entra ID identity, implement Network Security Groups, explore Azure Key Vault, review compliance offerings, and implement data protection through a simulated Azure Security Center portal.",
  niceCategory: "Security & Compliance",
  objectives: [
    "Review security posture with Microsoft Defender for Cloud",
    "Configure identity and access with Microsoft Entra ID",
    "Implement Network Security Groups for traffic filtering",
    "Explore Azure Key Vault for secrets and key management",
    "Review Azure compliance offerings (ISO, SOC, HIPAA, PCI DSS, GDPR)",
    "Implement data classification and protection with Azure Information Protection",
  ],
  outcomes: [
    "Understands the Secure Score and Defender for Cloud recommendations",
    "Can configure MFA, SSO, and conditional access in Entra ID",
    "Able to create NSG rules with proper priority and least-privilege access",
    "Knows how to use managed identities with Key Vault for credential-free access",
    "Can identify compliance standards by industry (HIPAA, PCI DSS, FedRAMP, GDPR)",
    "Understands sensitivity labels for data classification and protection",
  ],
  prerequisites: [
    "Completion of AZ-900 Domains 1-4 is recommended",
    "Basic understanding of security, identity, and compliance concepts",
  ],
  tools: [
    "Azure Security Center simulation — review posture and configure security",
    "Interactive dashboard — compliance and data classification exercises",
    "Azure Portal simulation — configure Entra ID, NSGs, and Key Vault",
  ],
};

export default function LabAz900Domain5() {
  return (
    <AzureLabRunner
      labTitle="AZ-900 D5: Security, Privacy & Compliance"
      chapterNum="5"
      difficulty="Intermediate"
      tags={["Microsoft", "Azure", "AZ-900", "Security", "Compliance", "Entra ID"]}
      toolLabel="Azure Security Portal"
      duration={55}
      intro={intro}
      steps={steps}
    />
  );
}