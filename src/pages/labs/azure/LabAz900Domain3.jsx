import React from "react";
import AzureLabRunner from "@/components/labs/azure/AzureLabRunner";

const steps = [
  {
    stepLabel: "Place Regions and Availability Zones",
    explanation: "Azure Regions are geographic areas (e.g., East US, North Europe) containing one or more datacenters. Availability Zones are physically separate locations within a region with independent power, cooling, and networking. Not all regions support availability zones.",
    whyItMatters: "AZ-900 tests whether you understand the hierarchy: Region > Availability Zone > Datacenter. A region may have 1-3+ availability zones. Deploying across zones protects against datacenter failures.",
    interaction: {
      type: "canvas",
      title: "Build the Regional Foundation",
      description: "Place the required Azure geography components to establish a regional foundation for your architecture.",
      palette: [
        { id: "geo", icon: "🌐", label: "Geography", color: "#0078D4" },
        { id: "region", icon: "📍", label: "Region (East US)", color: "#00BCF2" },
        { id: "az1", icon: "🟦", label: "Availability Zone 1", color: "#50A0E0" },
        { id: "az2", icon: "🟦", label: "Availability Zone 2", color: "#50A0E0" },
        { id: "az3", icon: "🟦", label: "Availability Zone 3", color: "#50A0E0" },
      ],
      required: ["geo", "region", "az1", "az2", "az3"],
      feedback: "Architecture validated! You've placed a Geography containing a Region with 3 Availability Zones for maximum resilience.",
    },
    question: {
      text: "What is the relationship between an Azure Region and an Availability Zone?",
      options: ["A region is inside an availability zone", "An availability zone is a physically separate location within a region", "They are the same thing with different names", "A region spans multiple countries; a zone is within a country"],
      correctIndex: 1,
      explanation: "An Availability Zone is a physically separate location within an Azure Region. A region can have 1, 2, or 3 (or more) availability zones, each with independent power, cooling, and networking. This means a failure in one zone doesn't affect others in the same region. Deploying across multiple zones provides zone-level fault tolerance within a single region.",
    },
    nextStepDirections: "Now let's organize resources into Resource Groups.",
  },
  {
    stepLabel: "Build Resource Group Structure",
    explanation: "Resource Groups are logical containers for Azure resources. A resource can only belong to one resource group. Resources in the same group share a lifecycle (typically deployed, updated, and deleted together). You can organize by environment (prod, dev, test), by application, or by department.",
    whyItMatters: "AZ-900 tests whether you know resource group rules: a resource can only be in ONE resource group, resources can span regions within a group, and RBAC permissions can be applied at the group level.",
    interaction: {
      type: "canvas",
      title: "Organize Resources into Resource Groups",
      description: "Place the required resource groups and resources to organize your Azure architecture.",
      palette: [
        { id: "rgProd", icon: "📦", label: "RG: production", color: "#0078D4" },
        { id: "rgDev", icon: "📦", label: "RG: development", color: "#00BCF2" },
        { id: "vmProd", icon: "💻", label: "VM (prod)", color: "#50A0E0" },
        { id: "vmDev", icon: "💻", label: "VM (dev)", color: "#50A0E0" },
        { id: "dbProd", icon: "🗄️", label: "SQL DB (prod)", color: "#50A0E0" },
        { id: "storageDev", icon: "💾", label: "Storage (dev)", color: "#50A0E0" },
      ],
      required: ["rgProd", "rgDev", "vmProd", "vmDev", "dbProd", "storageDev"],
      feedback: "Resource groups organized! Production and development resources are separated into logical containers.",
    },
    question: {
      text: "Which of the following statements about Azure Resource Groups is TRUE?",
      options: ["A resource can belong to multiple resource groups simultaneously", "A resource can only belong to one resource group, but resources in a group can be in different regions", "All resources in a resource group must be in the same Azure region", "Resource groups can only contain resources of the same type (e.g., only VMs)"],
      correctIndex: 1,
      explanation: "A resource can only belong to ONE resource group at a time. However, resources within a resource group can be in different Azure regions — the resource group itself is a logical container, not a geographic one. Resource groups can contain any mix of resource types (VMs, databases, storage, etc.). You can move a resource between groups, but it can never be in two groups at once.",
    },
    nextStepDirections: "Next, let's deploy VMs across Availability Zones for high availability.",
  },
  {
    stepLabel: "Deploy VMs Across Availability Zones",
    explanation: "To achieve high availability, deploy VMs across multiple Availability Zones using a VM Scale Set or individual VMs. If one zone goes down, the VMs in other zones continue running. Azure Load Balancer or Application Gateway distributes traffic across the zones.",
    whyItMatters: "AZ-900 tests whether you know that VMs in different availability zones provide zone-level fault tolerance. This is different from availability sets, which protect against rack/power failures within a single datacenter.",
    interaction: {
      type: "canvas",
      title: "Deploy VMs for High Availability",
      description: "Place VMs across availability zones and add a load balancer for traffic distribution.",
      palette: [
        { id: "vm1", icon: "💻", label: "VM in Zone 1", color: "#0078D4" },
        { id: "vm2", icon: "💻", label: "VM in Zone 2", color: "#0078D4" },
        { id: "vm3", icon: "💻", label: "VM in Zone 3", color: "#0078D4" },
        { id: "lb", icon: "⚖️", label: "Load Balancer", color: "#00BCF2" },
        { id: "nsg", icon: "🛡️", label: "Network Security Group", color: "#50A0E0" },
      ],
      required: ["vm1", "vm2", "vm3", "lb", "nsg"],
      feedback: "High availability architecture validated! 3 VMs across 3 zones with a load balancer and NSG for security.",
    },
    question: {
      text: "What is the difference between Availability Zones and Availability Sets in Azure?",
      options: ["They are the same thing with different names", "Availability Zones protect against datacenter failures; Availability Sets protect against rack/power failures within a single datacenter", "Availability Sets protect against region failures; Availability Zones protect against rack failures", "Availability Zones are for VMs; Availability Sets are for databases"],
      correctIndex: 1,
      explanation: "Availability Zones are physically separate datacenters within a region with independent power, cooling, and networking — they protect against datacenter-level failures. Availability Sets place VMs across different fault domains (racks) and update domains within a SINGLE datacenter — they protect against rack-level failures and staggered updates. Zones provide higher resilience than sets, but not all regions support zones.",
    },
    nextStepDirections: "Let's add a Load Balancer for traffic distribution.",
  },
  {
    stepLabel: "Configure Load Balancing",
    explanation: "Azure Load Balancer distributes incoming traffic across multiple VMs. It operates at Layer 4 (TCP/UDP). Azure Application Gateway is a Layer 7 load balancer with HTTP-based routing, SSL termination, and cookie affinity. Choose Load Balancer for simple TCP/UDP; Application Gateway for HTTP/web traffic.",
    whyItMatters: "AZ-900 tests whether you can choose between Load Balancer (L4) and Application Gateway (L7). Application Gateway supports URL-based routing, SSL offloading, and web application firewall (WAF).",
    interaction: {
      type: "canvas",
      title: "Add Load Balancing Components",
      description: "Place the correct load balancing components for this web application architecture.",
      palette: [
        { id: "appGw", icon: "🚪", label: "Application Gateway (L7)", color: "#0078D4" },
        { id: "lb", icon: "⚖️", label: "Load Balancer (L4)", color: "#00BCF2" },
        { id: "waf", icon: "🧱", label: "Web Application Firewall", color: "#50A0E0" },
        { id: "vm1", icon: "💻", label: "Web VM 1", color: "#50A0E0" },
        { id: "vm2", icon: "💻", label: "Web VM 2", color: "#50A0E0" },
        { id: "vmDb", icon: "🗄️", label: "Database VM", color: "#50A0E0" },
      ],
      required: ["appGw", "lb", "waf", "vm1", "vm2", "vmDb"],
      feedback: "Load balancing architecture validated! Application Gateway with WAF handles HTTP; Load Balancer distributes to the DB tier.",
    },
    question: {
      text: "A company hosts a web application and needs SSL termination, URL-based routing, and a Web Application Firewall (WAF). Which Azure load balancing service should they use?",
      options: ["Azure Load Balancer — distributes traffic at Layer 4", "Azure Application Gateway — Layer 7 load balancer with WAF, SSL termination, and URL routing", "Azure Traffic Manager — DNS-based traffic distribution", "Azure Front Door — global HTTP load balancing"],
      correctIndex: 1,
      explanation: "Azure Application Gateway is a Layer 7 (HTTP/HTTPS) load balancer that supports SSL termination, URL-based routing, cookie-based session affinity, and integrates with Web Application Firewall (WAF). Azure Load Balancer operates at Layer 4 (TCP/UDP) and doesn't support HTTP-specific features. Traffic Manager is DNS-based and doesn't handle SSL. Front Door is for global, multi-region HTTP routing.",
    },
    nextStepDirections: "Now let's connect two VNets with VNet Peering.",
  },
  {
    stepLabel: "Configure VNet Peering",
    explanation: "VNet Peering connects two Virtual Networks so resources in each can communicate with each other directly. Peering is non-transitive (A peered with B, B peered with C does NOT mean A can talk to C). Global VNet Peering connects VNets across different regions.",
    whyItMatters: "AZ-900 tests whether you know VNet peering is non-transitive and that peered VNets can communicate without going through the public internet. Traffic stays on the Azure backbone.",
    interaction: {
      type: "canvas",
      title: "Connect Two VNets with Peering",
      description: "Place the required networking components to connect two virtual networks.",
      palette: [
        { id: "vnet1", icon: "🌐", label: "VNet 1 (East US)", color: "#0078D4" },
        { id: "vnet2", icon: "🌐", label: "VNet 2 (West US)", color: "#0078D4" },
        { id: "peering", icon: "🔗", label: "VNet Peering", color: "#00BCF2" },
        { id: "vm1", icon: "💻", label: "VM in VNet 1", color: "#50A0E0" },
        { id: "vm2", icon: "💻", label: "VM in VNet 2", color: "#50A0E0" },
      ],
      required: ["vnet1", "vnet2", "peering", "vm1", "vm2"],
      feedback: "VNet peering configured! VMs in both VNets can now communicate over the Azure backbone — no public internet required.",
    },
    question: {
      text: "You have three VNets: VNetA, VNetB, and VNetC. VNetA is peered with VNetB, and VNetB is peered with VNetC. Can VNetA communicate directly with VNetC?",
      options: ["Yes — peering is transitive, so A can reach C through B", "No — VNet peering is non-transitive; VNetA would need its own peering with VNetC", "Yes — but only if VNetB allows forwarding", "No — VNet peering only works within the same region"],
      correctIndex: 1,
      explanation: "VNet peering is non-transitive. VNetA peered with VNetB, and VNetB peered with VNetC does NOT allow VNetA to communicate with VNetC. To connect VNetA and VNetC, you must create a direct peering between them. If you need transitive connectivity, you can use Azure Virtual WAN or a VPN gateway with BGP route propagation, but standard VNet peering is not transitive.",
    },
    nextStepDirections: "Finally, let's add Azure Backup and Site Recovery for disaster resilience.",
  },
  {
    stepLabel: "Implement Azure Backup & Site Recovery",
    explanation: "Azure Backup provides cloud-based backup for VMs, files, and databases. Azure Site Recovery (now called Azure Recovery Services) replicates VMs to a secondary region so they can fail over during a regional disaster. Together, they provide a comprehensive disaster recovery strategy.",
    whyItMatters: "AZ-900 tests whether you know the difference between Azure Backup (data backup and restore) and Azure Site Recovery (full VM replication and failover). Backup is for data protection; Site Recovery is for business continuity.",
    interaction: {
      type: "canvas",
      title: "Add Disaster Recovery Components",
      description: "Place the required components for a complete backup and disaster recovery architecture.",
      palette: [
        { id: "vm", icon: "💻", label: "Production VM", color: "#0078D4" },
        { id: "backup", icon: "💾", label: "Azure Backup Vault", color: "#00BCF2" },
        { id: "recovery", icon: "🔄", label: "Recovery Services Vault", color: "#00BCF2" },
        { id: "replica", icon: "💻", label: "Replica VM (secondary region)", color: "#50A0E0" },
        { id: "policy", icon: "📋", label: "Backup Policy", color: "#50A0E0" },
      ],
      required: ["vm", "backup", "recovery", "replica", "policy"],
      feedback: "Disaster recovery architecture validated! Azure Backup protects data; Site Recovery replicates VMs for regional failover.",
    },
    question: {
      text: "What is the primary difference between Azure Backup and Azure Site Recovery?",
      options: ["Azure Backup is for VMs; Site Recovery is for databases", "Azure Backup provides data backup and restore; Site Recovery replicates entire VMs to a secondary region for failover", "Azure Backup is free; Site Recovery costs money", "They are the same service with different names"],
      correctIndex: 1,
      explanation: "Azure Backup is a data protection service — it backs up files, VMs, and databases so you can restore them if data is lost or corrupted. Azure Site Recovery is a business continuity service — it continuously replicates entire VMs to a secondary region and can fail over automatically if the primary region goes down. Backup is for data recovery; Site Recovery is for keeping the entire workload running during a regional disaster.",
    },
  },
  {
    stepLabel: "Configure a High-Availability Architecture",
    explanation: "Now let's simulate configuring a complete high-availability architecture for a customer-facing web application. You'll configure the availability option, zone count, load balancer, health probes, and VNet peering — the same settings you'd set in the Azure Portal when creating a resilient deployment.",
    whyItMatters: "AZ-900 tests whether you can configure the right availability and load balancing options for a given SLA. Availability Zones protect against datacenter failures; the Application Gateway provides layer 7 load balancing with WAF; health probes remove unhealthy instances from rotation.",
    interaction: {
      type: "config",
      title: "Configure High Availability",
      description: "Configure the HA architecture for Contoso's customer portal. It needs 99.99% SLA, protection against datacenter failures, layer 7 load balancing with WAF, and connectivity to a partner VNet.",
      sections: [
        {
          title: "Availability Settings",
          fields: [
            { id: "avail", label: "Availability option", type: "select", options: ["Availability Set", "Availability Zone", "Virtual Machine Scale Set"], expected: "Availability Zone", hint: "Protect against datacenter-level failures for 99.99% SLA", required: true, correctFeedback: "Availability Zones protect against datacenter failures", wrongFeedback: "Availability Sets only protect against rack failures, not datacenter failures" },
            { id: "zones", label: "Number of availability zones", type: "select", options: ["1", "2", "3"], expected: "2", hint: "Minimum 2 zones for failover; 3 is ideal but 2 meets the SLA", required: true, correctFeedback: "2 zones provide failover capability", wrongFeedback: "1 zone has no failover; 3 is more than needed for this SLA" },
          ],
        },
        {
          title: "Load Balancing & Networking",
          fields: [
            { id: "lb", label: "Load balancer type", type: "select", options: ["Public Load Balancer (L4)", "Internal Load Balancer (L4)", "Application Gateway (L7 + WAF)"], expected: "Application Gateway (L7 + WAF)", hint: "Customer portal needs layer 7 routing and web application firewall", required: true, correctFeedback: "App Gateway provides L7 routing + WAF for web apps", wrongFeedback: "L4 load balancers don't provide WAF or URL-based routing" },
            { id: "probe", label: "Enable health probes", type: "toggle", expected: true, hint: "Remove unhealthy instances from the load balancer rotation", correctFeedback: "Health probes are essential for HA", wrongFeedback: "Without health probes, traffic goes to dead instances" },
            { id: "peering", label: "Enable VNet peering to partner VNet", type: "toggle", expected: true, hint: "Connect to the partner's VNet for API calls", correctFeedback: "VNet peering enables cross-VNet communication", wrongFeedback: "Peering is needed for the partner API integration" },
          ],
        },
      ],
      feedback: "HA architecture configured correctly! 2 Availability Zones + Application Gateway with WAF + health probes + VNet peering for 99.99% SLA.",
    },
    question: {
      text: "A customer-facing web application requires a 99.99% SLA and protection against datacenter failures. It also needs a web application firewall (WAF). Which configuration should you choose?",
      options: ["Availability Set + Public Load Balancer (L4)", "Availability Zone (2 zones) + Application Gateway (L7 + WAF)", "Single VM + Internal Load Balancer", "Virtual Machine Scale Set in 1 zone + Public Load Balancer"],
      correctIndex: 1,
      explanation: "Availability Zones across 2+ zones protect against datacenter failures and enable a 99.99% SLA. Application Gateway provides layer 7 load balancing and includes WAF (Web Application Firewall) capabilities. Availability Sets only protect against rack-level failures (99.95%). A single VM has no redundancy. One zone doesn't provide datacenter failure protection.",
    },
    nextStepDirections: "You've configured a complete HA architecture. You're ready for Domain 4: Management & Governance.",
  },
];

const intro = {
  overview: "This lab covers Microsoft Azure Fundamentals (AZ-900) Domain 3: Azure Architecture & Core Solutions. You'll design resilient architectures using regions, availability zones, resource groups, load balancers, VNet peering, and disaster recovery through an interactive drag-and-drop canvas.",
  niceCategory: "Architecture",
  objectives: [
    "Place Azure regions and availability zones for geographic resilience",
    "Organize resources into logical resource groups",
    "Deploy VMs across availability zones for high availability",
    "Configure load balancing with Application Gateway and Load Balancer",
    "Connect virtual networks using VNet peering",
    "Implement Azure Backup and Site Recovery for disaster resilience",
  ],
  outcomes: [
    "Understands the Azure geography > region > availability zone hierarchy",
    "Can organize resources into properly structured resource groups",
    "Able to design a zone-redundant VM architecture with load balancing",
    "Knows when to use Application Gateway (L7) vs. Load Balancer (L4)",
    "Understands VNet peering is non-transitive and stays on the Azure backbone",
    "Can distinguish Azure Backup (data protection) from Site Recovery (regional failover)",
  ],
  prerequisites: [
    "Completion of AZ-900 Domains 1 and 2 is recommended",
    "Basic understanding of networking and high availability concepts",
  ],
  tools: [
    "Interactive canvas — drag and drop Azure resources to build architectures",
    "Resource palette — select from regions, zones, VMs, load balancers, and more",
    "Architecture validation — verify your design meets the requirements",
  ],
};

export default function LabAz900Domain3() {
  return (
    <AzureLabRunner
      labTitle="AZ-900 D3: Architecture & Core Solutions"
      chapterNum="3"
      difficulty="Intermediate"
      tags={["Microsoft", "Azure", "AZ-900", "Architecture", "Availability Zones"]}
      toolLabel="Architecture Canvas"
      duration={50}
      intro={intro}
      steps={steps}
    />
  );
}