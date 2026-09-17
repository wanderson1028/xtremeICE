import React from "react";
import AzureLabRunner from "@/components/labs/azure/AzureLabRunner";

const steps = [
  {
    stepLabel: "Provision a Virtual Machine",
    explanation: "Azure Virtual Machines (VMs) are IaaS compute resources. To provision a VM, you configure the Basics blade (name, region, image, size), Networking blade (VNet, subnet, public IP), and then Review + Create. The VM runs a guest OS that you manage.",
    whyItMatters: "AZ-900 tests whether you know the required fields to create a VM and that VMs are IaaS. You choose the OS image (Ubuntu, Windows, RHEL), the VM size (B-series for low cost, D-series for general purpose), and the region (affects latency and availability).",
    interaction: {
      type: "portal",
      title: "Create a Virtual Machine",
      blades: [
        { name: "Basics", fields: [
          { id: "vmName", type: "text", label: "Virtual machine name", placeholder: "myAppVM", correct: "myAppVM", hint: "Name must be 1-15 characters, alphanumeric" },
          { id: "region", type: "select", label: "Region", options: ["East US", "West US 2", "North Europe", "Southeast Asia"], correct: "East US", hint: "Choose a region close to your users" },
          { id: "image", type: "select", label: "Image", options: ["Ubuntu Server 22.04", "Windows Server 2022", "RHEL 8.5", "Debian 11"], correct: "Ubuntu Server 22.04", hint: "Linux images are generally cheaper" },
        ]},
        { name: "Networking", fields: [
          { id: "vnet", type: "text", label: "Virtual network", placeholder: "myVNet", correct: "myVNet" },
          { id: "subnet", type: "text", label: "Subnet name", placeholder: "default", correct: "default" },
          { id: "publicIP", type: "select", label: "Public IP", options: ["None", "Basic", "Standard"], correct: "Standard" },
        ]},
      ],
      feedback: "VM configuration validated! The VM will be provisioned in East US with Ubuntu 22.04 on a Standard public IP.",
    },
    question: {
      text: "When creating an Azure Virtual Machine, which of the following is NOT configured in the Basics blade?",
      options: ["Virtual machine name", "Region/availability zone", "OS image (e.g., Ubuntu, Windows)", "Virtual network and subnet configuration"],
      correctIndex: 3,
      explanation: "Virtual network and subnet are configured in the Networking blade, not the Basics blade. The Basics blade covers the VM name, region, availability options, image, size, and administrator account. Networking is a separate blade that appears after Basics in the creation wizard.",
    },
    nextStepDirections: "Next, we'll create a Virtual Network and subnet for our VM.",
  },
  {
    stepLabel: "Create a Virtual Network",
    explanation: "Azure Virtual Network (VNet) provides isolated networking for your Azure resources. A VNet contains subnets, which segment the network. You define an address space (e.g., 10.0.0.0/16) and subnets within it (e.g., 10.0.1.0/24 for web, 10.0.2.0/24 for db).",
    whyItMatters: "AZ-900 tests whether you understand VNet structure: address space, subnets, and that resources in different VNets can't communicate by default (peering is required). Subnets must be within the VNet address space and must not overlap.",
    interaction: {
      type: "portal",
      title: "Create Virtual Network",
      blades: [
        { name: "Basics", fields: [
          { id: "vnetName", type: "text", label: "Virtual network name", placeholder: "prodVNet", correct: "prodVNet" },
          { id: "region", type: "select", label: "Region", options: ["East US", "West Europe", "Japan East", "Brazil South"], correct: "East US" },
        ]},
        { name: "Networking", fields: [
          { id: "addressSpace", type: "text", label: "Address space (CIDR)", placeholder: "10.0.0.0/16", correct: "10.0.0.0/16", hint: "Use RFC 1918 private ranges" },
          { id: "subnetName", type: "text", label: "Default subnet name", placeholder: "webSubnet", correct: "webSubnet" },
          { id: "subnetRange", type: "text", label: "Subnet address range", placeholder: "10.0.1.0/24", correct: "10.0.1.0/24", hint: "Must be within the address space" },
        ]},
      ],
      feedback: "VNet created! prodVNet in East US with address space 10.0.0.0/16 and webSubnet at 10.0.1.0/24.",
    },
    question: {
      text: "You create a VNet with address space 10.0.0.0/16. Which subnet address range is valid within this VNet?",
      options: ["172.16.1.0/24 — a different private range", "10.0.5.0/24 — within the 10.0.0.0/16 space", "192.168.1.0/24 — another private range", "10.1.0.0/16 — overlaps the VNet but in a different range"],
      correctIndex: 1,
      explanation: "A subnet must be within the VNet's address space. The VNet is 10.0.0.0/16, which covers 10.0.0.0 through 10.0.255.255. The subnet 10.0.5.0/24 falls within this range. 172.16.x.x and 192.168.x.x are different RFC 1918 ranges and would not be within the VNet. 10.1.0.0/16 is outside the 10.0.0.0/16 space (it's in 10.1.x.x).",
    },
    nextStepDirections: "Now let's deploy Azure Storage for blob and file storage.",
  },
  {
    stepLabel: "Deploy Azure Storage Account",
    explanation: "Azure Storage Account provides blob, file, table, and queue storage. Blob storage is for unstructured data (images, documents, backups). File storage is for managed file shares (SMB/NFS). You choose a performance tier (Standard or Premium) and replication (LRS, GRS, RA-GRS).",
    whyItMatters: "AZ-900 tests whether you know Azure Storage types and replication options. LRS (Locally Redundant Storage) keeps 3 copies in one datacenter; GRS (Geo-Redundant) replicates to a second region; RA-GRS allows read access to the secondary region.",
    interaction: {
      type: "portal",
      title: "Create Storage Account",
      blades: [
        { name: "Basics", fields: [
          { id: "storageName", type: "text", label: "Storage account name", placeholder: "mystorageacct2024", correct: "mystorageacct2024", hint: "3-24 lowercase letters and numbers, globally unique" },
          { id: "region", type: "select", label: "Region", options: ["East US", "West US 2", "North Europe", "Australia East"], correct: "East US" },
          { id: "performance", type: "select", label: "Performance", options: ["Standard", "Premium"], correct: "Standard", hint: "Standard = HDD/SSD, Premium = SSD only" },
        ]},
        { name: "Storage", fields: [
          { id: "redundancy", type: "select", label: "Replication", options: ["LRS", "GRS", "RA-GRS", "ZRS"], correct: "GRS", hint: "GRS replicates to a second region" },
          { id: "blobTier", type: "select", label: "Default blob access tier", options: ["Hot", "Cool", "Archive"], correct: "Hot", hint: "Hot = frequent access, Archive = rare access" },
        ]},
      ],
      feedback: "Storage account created with GRS replication and Hot access tier — data is replicated to a second Azure region.",
    },
    question: {
      text: "A company needs to store infrequently accessed backup data for 7 years at the lowest possible cost. Which storage configuration should they use?",
      options: ["Standard performance, LRS replication, Hot access tier", "Standard performance, GRS replication, Archive access tier", "Premium performance, LRS replication, Cool access tier", "Standard performance, ZRS replication, Hot access tier"],
      correctIndex: 1,
      explanation: "For infrequently accessed long-term backups, the Archive access tier is the cheapest (significantly cheaper than Hot or Cool). GRS (Geo-Redundant Storage) ensures backups survive a regional failure — important for disaster recovery. Standard performance is sufficient since backups don't need Premium SSD speeds. LRS alone would not protect against a regional outage.",
    },
    nextStepDirections: "Let's explore Azure SQL Database next.",
  },
  {
    stepLabel: "Configure Azure SQL Database",
    explanation: "Azure SQL Database is a fully managed PaaS database. Microsoft handles patching, backups, and high availability. You configure the database name, server, compute tier (DTU or vCore), and pricing model. Unlike SQL Server on a VM (IaaS), you don't manage the OS or SQL engine.",
    whyItMatters: "AZ-900 tests whether you can distinguish Azure SQL Database (PaaS) from SQL Server on VM (IaaS). PaaS means Microsoft manages the database engine, backups, and patching — you only manage data and schemas.",
    interaction: {
      type: "portal",
      title: "Create Azure SQL Database",
      blades: [
        { name: "Basics", fields: [
          { id: "dbName", type: "text", label: "Database name", placeholder: "appdb", correct: "appdb" },
          { id: "serverName", type: "text", label: "Server name", placeholder: "sqlserver-prod", correct: "sqlserver-prod" },
          { id: "region", type: "select", label: "Region", options: ["East US", "West Europe", "Southeast Asia", "UK South"], correct: "East US" },
        ]},
        { name: "Storage", fields: [
          { id: "computeTier", type: "select", label: "Compute tier", options: ["DTU", "vCore"], correct: "vCore", hint: "vCore offers more control and is recommended for new deployments" },
          { id: "backup", type: "select", label: "Backup storage redundancy", options: ["Locally redundant", "Geo-redundant", "Zone-redundant"], correct: "Geo-redundant" },
        ]},
      ],
      feedback: "Azure SQL Database created as a PaaS service — Microsoft manages the engine, backups, and patching.",
    },
    question: {
      text: "What is the key difference between Azure SQL Database and running SQL Server on an Azure VM?",
      options: ["Azure SQL Database is free; SQL Server on VM costs money", "Azure SQL Database is PaaS (Microsoft manages the engine); SQL Server on VM is IaaS (you manage the OS and engine)", "Azure SQL Database only supports NoSQL; SQL Server on VM supports SQL", "There is no difference — they are the same product"],
      correctIndex: 1,
      explanation: "Azure SQL Database is a PaaS offering — Microsoft manages the database engine, OS, patching, backups, and high availability. You only manage your data and schema. SQL Server on an Azure VM is IaaS — you manage the OS, SQL Server installation, patching, and backups yourself. PaaS is simpler to manage but offers less control; IaaS gives full control but requires more maintenance.",
    },
    nextStepDirections: "Now let's deploy a web app using Azure App Service (PaaS).",
  },
  {
    stepLabel: "Deploy Azure App Service",
    explanation: "Azure App Service is a PaaS offering for hosting web applications. Microsoft manages the infrastructure, OS, and runtime. You deploy your code (.NET, Node.js, Python, Java, PHP) and Azure handles scaling, load balancing, and TLS. You choose a pricing tier (Free, Shared, Basic, Standard, Premium).",
    whyItMatters: "AZ-900 tests whether you know App Service is PaaS and can identify when to use it vs. VMs. App Service is ideal for web apps that need auto-scaling without infrastructure management.",
    interaction: {
      type: "portal",
      title: "Create App Service Web App",
      blades: [
        { name: "Basics", fields: [
          { id: "appName", type: "text", label: "App name", placeholder: "mywebapp-prod", correct: "mywebapp-prod", hint: "Part of the URL: mywebapp-prod.azurewebsites.net" },
          { id: "runtime", type: "select", label: "Runtime stack", options: ["Node.js 18 LTS", "Python 3.11", ".NET 8", "Java 17"], correct: "Node.js 18 LTS" },
          { id: "region", type: "select", label: "Region", options: ["East US", "West Europe", "Central India", "Japan East"], correct: "East US" },
        ]},
        { name: "Storage", fields: [
          { id: "pricingTier", type: "select", label: "Pricing tier", options: ["Free (F1)", "Basic (B1)", "Standard (S1)", "Premium (P1V2)"], correct: "Standard (S1)", hint: "Standard supports auto-scale and custom domains" },
          { id: "autoScale", type: "toggle", label: "Enable auto-scaling", correct: true },
        ]},
      ],
      feedback: "App Service deployed as PaaS — Microsoft manages the infrastructure, you just deploy your code.",
    },
    question: {
      text: "A startup wants to host a Node.js web application with auto-scaling and custom domain support, without managing any servers. Which Azure service should they use?",
      options: ["Azure Virtual Machine — install Node.js manually and configure nginx", "Azure App Service — PaaS that supports Node.js with auto-scaling built in", "Azure Kubernetes Service — container orchestration for the web app", "Azure Functions — serverless execution for individual requests"],
      correctIndex: 1,
      explanation: "Azure App Service is a PaaS offering specifically designed for hosting web applications. It supports Node.js, .NET, Python, Java, and PHP out of the box. It provides auto-scaling, custom domains, TLS, and load balancing without managing any infrastructure. While AKS and Functions are also options, App Service is the simplest and most appropriate for a standard web app. VMs would require manual OS and runtime management (IaaS).",
    },
    nextStepDirections: "Finally, let's explore Azure Kubernetes Service (AKS).",
  },
  {
    stepLabel: "Explore Azure Kubernetes Service (AKS)",
    explanation: "Azure Kubernetes Service (AKS) is a managed Kubernetes service. Microsoft manages the Kubernetes control plane (API server, scheduler, etcd) for free. You manage the agent nodes (VMs) where your containers run. AKS is used for container orchestration — deploying, scaling, and managing Docker containers.",
    whyItMatters: "AZ-900 tests whether you know AKS is a managed container orchestration service and that Microsoft manages the control plane. AKS is PaaS-like for the control plane but you still manage the node pools.",
    interaction: {
      type: "portal",
      title: "Create AKS Cluster",
      blades: [
        { name: "Basics", fields: [
          { id: "clusterName", type: "text", label: "Cluster name", placeholder: "prod-aks-cluster", correct: "prod-aks-cluster" },
          { id: "region", type: "select", label: "Region", options: ["East US", "West Europe", "Australia East", "Canada Central"], correct: "East US" },
          { id: "k8sVersion", type: "select", label: "Kubernetes version", options: ["1.27", "1.28", "1.29", "1.30"], correct: "1.29" },
        ]},
        { name: "Networking", fields: [
          { id: "nodeCount", type: "select", label: "Node count", options: ["1", "2", "3", "5"], correct: "3", hint: "Minimum 3 nodes for production" },
          { id: "networkPlugin", type: "select", label: "Network plugin", options: ["Kubenet", "Azure CNI"], correct: "Azure CNI", hint: "Azure CNI provides native VNet integration" },
        ]},
      ],
      feedback: "AKS cluster created! Microsoft manages the control plane; you manage the 3 agent nodes running your containers.",
    },
    question: {
      text: "In Azure Kubernetes Service (AKS), which component does Microsoft manage at no additional cost?",
      options: ["The agent nodes (VMs) where containers run", "The Kubernetes control plane (API server, scheduler, etcd)", "The container images in your registry", "The application code running in the containers"],
      correctIndex: 1,
      explanation: "In AKS, Microsoft manages the Kubernetes control plane (API server, scheduler, controller manager, and etcd) at no additional cost. You only pay for the agent nodes (VMs) that run your containers. This is what makes AKS a 'managed' Kubernetes service — you don't need to maintain the complex control plane infrastructure. You still manage the node VMs, your container images, and your application code.",
    },
  },
];

const intro = {
  overview: "This lab covers Microsoft Azure Fundamentals (AZ-900) Domain 2: Azure Core Services. You'll provision virtual machines, create virtual networks, deploy storage accounts, configure Azure SQL Database, deploy App Service web apps, and explore AKS through a simulated Azure Portal interface.",
  niceCategory: "Core Services",
  objectives: [
    "Provision an Azure Virtual Machine with correct configuration",
    "Create a Virtual Network with proper address spaces and subnets",
    "Deploy an Azure Storage Account with appropriate replication",
    "Configure Azure SQL Database as a PaaS data service",
    "Deploy a web app using Azure App Service",
    "Explore Azure Kubernetes Service (AKS) for container orchestration",
  ],
  outcomes: [
    "Able to navigate the Azure Portal to create core resources",
    "Understands VNet address spaces and subnet requirements",
    "Can choose the right storage replication and access tier",
    "Knows the difference between Azure SQL Database (PaaS) and SQL on VM (IaaS)",
    "Can deploy a web app to App Service with auto-scaling",
    "Understands the AKS managed control plane model",
  ],
  prerequisites: [
    "Completion of AZ-900 Domain 1 (Cloud Concepts) is recommended",
    "Basic understanding of virtual machines and networking",
  ],
  tools: [
    "Azure Portal simulation — navigate blades and configure resources",
    "Resource provisioning — VMs, VNets, Storage, SQL, App Service, AKS",
    "Interactive forms — fill in required fields and validate",
  ],
};

export default function LabAz900Domain2() {
  return (
    <AzureLabRunner
      labTitle="AZ-900 D2: Azure Core Services"
      chapterNum="2"
      difficulty="Beginner"
      tags={["Microsoft", "Azure", "AZ-900", "Core Services", "VMs", "Storage"]}
      toolLabel="Azure Portal Simulation"
      duration={50}
      intro={intro}
      steps={steps}
    />
  );
}