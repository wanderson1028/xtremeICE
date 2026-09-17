import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Map Devices to OSI Layers",
    explanation: "The OSI model has seven layers: Physical (1), Data Link (2), Network (3), Transport (4), Session (5), Presentation (6), and Application (7). Each network device operates at specific layers. Use the netctl CLI to map common devices to their OSI layers.",
    whyItMatters: "Network+ tests your ability to identify which OSI layer a device operates at. A switch is Layer 2 (MAC addresses), a router is Layer 3 (IP addresses), a firewall can operate at Layers 3-7. Knowing the layer tells you what kind of addressing and protocols the device uses.",
    command: "netctl osi-map --output table",
    prompt: "analyst@netplus:~$",
    output: [
      "-----------------------------------------------------",
      "|  Device            |  OSI Layer(s)  |  Addressing   |",
      "+--------------------+----------------+--------------+",
      "|  Hub               |  Layer 1       |  None         |",
      "|  Switch            |  Layer 2       |  MAC          |",
      "|  Router            |  Layer 3       |  IP           |",
      "|  Firewall (L3)     |  Layer 3-7     |  IP + App     |",
      "|  Load Balancer     |  Layer 4-7     |  IP + Port    |",
      "|  Proxy             |  Layer 7       |  Application |",
      "+--------------------+----------------+--------------+",
    ],
    question: {
      text: "A network engineer deploys a device that makes forwarding decisions based on MAC addresses and learns which ports have which devices. At which OSI layer does this device operate?",
      options: [
        "Layer 1 — Physical, because it uses cables",
        "Layer 2 — Data Link, because it forwards frames based on MAC addresses",
        "Layer 3 — Network, because it connects multiple network segments",
        "Layer 4 — Transport, because it manages end-to-end connections",
      ],
      correctIndex: 1,
      explanation: "A switch operates at Layer 2 (Data Link). It builds a MAC address table by learning source MACs from incoming frames, then forwards frames only out the port associated with the destination MAC. Hubs (Layer 1) repeat signals to all ports without learning. Routers (Layer 3) forward packets based on IP addresses. The key giveaway is MAC-based forwarding — that is Layer 2.",
    },
  },
  {
    stepLabel: "Compare Network Appliances",
    explanation: "Network appliances serve specific functions: firewalls filter traffic, load balancers distribute load, proxies act as intermediaries, NAS provides file storage, and SAN provides block storage. Review the appliance comparison.",
    whyItMatters: "Network+ requires you to match an appliance to its function and choose the right one for a scenario. A load balancer distributes web traffic across servers; a firewall enforces security policy; a proxy caches and filters web content; NAS is file-level storage; SAN is block-level storage for databases.",
    command: "netctl appliances --output table",
    prompt: "analyst@netplus:~$",
    output: [
      "-----------------------------------------------------------",
      "|  Appliance      |  Function               |  Layer      |",
      "+-----------------+-------------------------+------------+",
      "|  Firewall       |  Filter traffic by rules |  L3-L7      |",
      "|  Load Balancer  |  Distribute traffic     |  L4-L7      |",
      "|  Proxy          |  Intermediary/cache     |  L7         |",
      "|  NAS            |  File-level storage     |  L7 (NFS/CIFS)|",
      "|  SAN            |  Block-level storage    |  L2/L3 (FC/iSCSI)|",
      "|  IDS/IPS        |  Detect/prevent attacks |  L2-L7      |",
      "+-----------------+-------------------------+------------+",
    ],
    question: {
      text: "A company needs to store large database files and requires block-level access with low latency. Which appliance should they deploy?",
      options: [
        "NAS — it provides file-level storage over NFS/CIFS",
        "SAN — it provides block-level storage over Fibre Channel or iSCSI with low latency",
        "Proxy — it caches frequently accessed data",
        "Load Balancer — it distributes storage requests across disks",
      ],
      correctIndex: 1,
      explanation: "A SAN (Storage Area Network) provides block-level storage, typically over Fibre Channel or iSCSI. Block-level access allows the server's OS to manage the storage as if it were a locally attached disk — ideal for databases that need low-latency, direct block access. NAS provides file-level storage (NFS/CIFS/SMB), which adds file-system overhead and is better for shared documents. Proxies and load balancers are network appliances, not storage devices.",
    },
  },
  {
    stepLabel: "Summarize Cloud Connectivity Concepts",
    explanation: "Cloud networking includes NFV (Network Functions Virtualization), VPCs (Virtual Private Clouds), network security groups, cloud gateways, and deployment models (public, private, hybrid) and service models (IaaS, PaaS, SaaS). Review the cloud concepts.",
    whyItMatters: "Network+ tests whether you can identify cloud deployment and service models and explain how cloud networking differs from on-premises. IaaS gives you VMs and networking; PaaS gives you a platform; SaaS gives you a finished application. NFV replaces physical appliances with virtual ones.",
    command: "netctl cloud --concepts --output table",
    prompt: "analyst@netplus:~$",
    output: [
      "------------------------------------------------------------",
      "|  Concept    |  Description                          |  Example  |",
      "+------------+---------------------------------------+-----------+",
      "|  NFV       |  Virtualized network functions        |  vFW, vLB |",
      "|  VPC       |  Isolated virtual network             |  AWS VPC  |",
      "|  NSG       |  Cloud firewall rules                 |  Azure NSG|",
      "|  IaaS      |  Infrastructure as a Service          |  EC2, VM  |",
      "|  PaaS      |  Platform as a Service                |  Elastic  |",
      "|  SaaS      |  Software as a Service                |  M365     |",
      "+------------+---------------------------------------+-----------+",
    ],
    question: {
      text: "A company deploys a virtual firewall running on a standard server instead of purchasing a dedicated hardware appliance. Which cloud concept does this represent?",
      options: [
        "VPC — a virtual private cloud isolates the firewall",
        "NFV — Network Functions Virtualization replaces physical appliances with software running on commodity hardware",
        "SaaS — the firewall is delivered as a service from the cloud",
        "IaaS — the firewall is infrastructure provided by the cloud provider",
      ],
      correctIndex: 1,
      explanation: "NFV (Network Functions Virtualization) decouples network functions from dedicated hardware and runs them as software on standard servers. A virtual firewall (vFW), virtual load balancer (vLB), or virtual router are all examples of NFV. This reduces hardware costs and increases flexibility. VPC is an isolated network in the cloud, SaaS is a finished application, and IaaS is raw infrastructure — none of those describe replacing a physical appliance with software.",
    },
  },
  {
    stepLabel: "Identify Traffic Types",
    explanation: "Network traffic types include unicast (one-to-one), multicast (one-to-many subscribers), broadcast (one-to-all in a subnet), and anycast (one-to-nearest). Review the traffic types.",
    whyItMatters: "Network+ tests whether you can identify which traffic type a protocol uses and when to use each. Unicast is for direct communication; multicast is for streaming to subscribers (IGMP); broadcast is for ARP and DHCP discovery; anycast is used by DNS root servers and CDNs for routing to the nearest node.",
    command: "netctl traffic-types --output table",
    prompt: "analyst@netplus:~$",
    output: [
      "---------------------------------------------------------",
      "|  Type       |  Pattern           |  Example Protocol     |",
      "+------------+--------------------+-----------------------+",
      "|  Unicast   |  One-to-one        |  HTTP, SSH, SMTP      |",
      "|  Multicast |  One-to-many sub   |  IGMP, OSPF, mDNS     |",
      "|  Broadcast |  One-to-all subnet |  ARP, DHCP Discover   |",
      "|  Anycast   |  One-to-nearest    |  DNS root, BGP anycast|",
      "+------------+--------------------+-----------------------+",
    ],
    question: {
      text: "A video streaming service needs to send a live broadcast to 500 subscribers simultaneously while minimizing bandwidth usage on the network. Which traffic type should it use?",
      options: [
        "Unicast — send 500 separate streams, one to each subscriber",
        "Multicast — send a single stream that the network replicates only to subscribers who joined the group",
        "Broadcast — send to every device on the network so no one misses it",
        "Anycast — send to the nearest subscriber and let them relay it",
      ],
      correctIndex: 1,
      explanation: "Multicast sends a single copy of each packet, and the network routers replicate it only down paths that lead to subscribers who joined the multicast group (via IGMP). This is far more bandwidth-efficient than unicast, which would require 500 separate streams from the source. Broadcast goes to every device on the subnet, not just subscribers, and does not cross routers. Anycast routes to the nearest of a group of nodes — it is for service distribution, not media streaming.",
    },
  },
  {
    stepLabel: "Identify Transceivers and Connecters",
    explanation: "Fiber optic transceivers include SFP (Small Form-factor Pluggable), SFP+, QSFP, and connectors like SC, LC, ST, and MPO. Copper connectors include RJ45 (Ethernet), RJ11 (phone), and F-type (coax). Review the common connectors.",
    whyItMatters: "Network+ tests whether you can match a connector to its cable type. LC and SC are fiber connectors; RJ45 is the standard Ethernet copper connector; F-type is coaxial for cable broadband; BNC is older coax. Mixing connectors causes link failures.",
    command: "netctl connectors --output table",
    prompt: "analyst@netplus:~$",
    output: [
      "---------------------------------------------------------",
      "|  Connector  |  Cable Type   |  Common Use              |",
      "+------------+---------------+--------------------------+",
      "|  RJ45      |  Copper UTP   |  Ethernet (T568A/B)      |",
      "|  RJ11      |  Copper       |  Telephone, DSL          |",
      "|  LC        |  Fiber        |  SFP, SFP+ (duplex)      |",
      "|  SC        |  Fiber        |  Older fiber runs        |",
      "|  MPO       |  Fiber        |  High-density (QSFP)     |",
      "|  F-type    |  Coaxial      |  Cable broadband, DOCSIS |",
      "+------------+---------------+--------------------------+",
    ],
    question: {
      text: "A technician is connecting a new fiber uplink to an SFP+ port on a switch. Which connector is most commonly used for this transceiver?",
      options: [
        "RJ45 — the standard Ethernet connector",
        "LC — the small form-factor duplex connector used with SFP/SFP+ transceivers",
        "F-type — the coaxial connector for cable broadband",
        "RJ11 — the telephone connector",
      ],
      correctIndex: 1,
      explanation: "LC (Lucent Connector / Little Connector) is the most common connector paired with SFP and SFP+ fiber transceivers because its small form factor fits the duplex transmit/receive ports. SC is an older, larger fiber connector. RJ45 is copper Ethernet (not fiber), RJ11 is telephone, and F-type is coaxial — none of those fit an SFP+ fiber port.",
    },
  },
  {
    stepLabel: "Subnet with VLSM and CIDR",
    explanation: "Variable Length Subnet Masking (VLSM) allows different subnet masks within the same network, and CIDR (Classless Inter-domain Routing) uses slash notation (e.g., /24) to express the mask. RFC1918 defines private IP ranges. Review the subnetting reference.",
    whyItMatters: "Subnetting is the most heavily tested math skill on Network+. You must calculate the number of hosts per subnet, identify the network and broadcast addresses, and choose the right mask for a given number of hosts. VLSM lets you right-size subnets to avoid wasting addresses.",
    command: "netctl subnet --calc 192.168.10.0/26 --output table",
    prompt: "analyst@netplus:~$",
    output: [
      "----------------------------------------------------------",
      "|  Property          |  Value                              |",
      "+-------------------+-------------------------------------+",
      "|  Network Address  |  192.168.10.0                       |",
      "|  Subnet Mask      |  255.255.255.192 (/26)              |",
      "|  Usable Hosts     |  192.168.10.1 - 192.168.10.62 (62)  |",
      "|  Broadcast Addr   |  192.168.10.63                      |",
      "|  Block Size       |  64                                 |",
      "|  RFC1918 Private |  10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16 |",
      "+-------------------+-------------------------------------+",
    ],
    question: {
      text: "You need to subnet the 192.168.50.0/24 network to create subnets that each support 25 hosts. What is the optimal subnet mask to use?",
      options: [
        "/25 — gives 126 hosts per subnet, plenty of room",
        "/27 — gives 30 usable hosts per subnet, the smallest mask that still fits 25 hosts",
        "/28 — gives 14 usable hosts per subnet, which is too small",
        "/26 — gives 62 usable hosts per subnet, the only correct answer",
      ],
      correctIndex: 1,
      explanation: "To support 25 hosts, you need 2^h - 2 >= 25. A /27 mask leaves 5 host bits (32 - 27 = 5), giving 2^5 - 2 = 30 usable hosts — the smallest mask that fits 25 hosts without wasting addresses. A /28 leaves only 4 host bits (14 usable), which is too small. A /26 (62 hosts) and /25 (126 hosts) both work but waste addresses — VLSM asks for the optimal (tightest) fit. /27 is the right answer.",
    },
  },
];

const intro = {
  overview: "This lab covers CompTIA Network+ (N10-009) Domain 1: Networking Concepts. You'll explore the OSI model, network appliances, cloud connectivity concepts, traffic types, transceivers and connectors, and IPv4 subnetting with VLSM and CIDR through hands-on CLI exercises.",
  niceCategory: "Networking Concepts",
  objectives: [
    "Map network devices to their corresponding OSI model layers",
    "Compare and contrast network appliances (firewall, load balancer, proxy, NAS, SAN, IDS/IPS)",
    "Summarize cloud connectivity concepts (NFV, VPC, NSG, IaaS, PaaS, SaaS)",
    "Differentiate between unicast, multicast, broadcast, and anycast traffic",
    "Identify common transceivers and connectors (LC, SC, MPO, RJ45, F-type)",
    "Subnet IPv4 networks using VLSM and CIDR notation",
  ],
  outcomes: [
    "Able to identify the OSI layer at which a device operates",
    "Can choose the right network appliance for a given scenario",
    "Understands cloud deployment and service models and their differences",
    "Can match a protocol to its traffic type",
    "Able to select the correct connector for a given cable and transceiver",
    "Can calculate subnet boundaries and choose the optimal mask with VLSM",
  ],
  prerequisites: [
    "Basic understanding of IT concepts",
    "Familiarity with a command-line interface is helpful but not required",
  ],
  tools: [
    "Network CLI — simulated command-line interface for network device and concept exploration",
    "Subnet calculator — for IPv4 VLSM and CIDR calculations",
    "Connector reference — for identifying transceivers and cable types",
  ],
};

export default function LabNetPlusDomain1() {
  return (
    <LabRunner
      labTitle="Network+ Domain 1: Networking Concepts"
      chapterNum="1"
      difficulty="Beginner"
      tags={["CompTIA", "Network+", "N10-009", "OSI Model", "Subnetting", "Cloud"]}
      terminalLabel="Network+ CLI — Networking Concepts"
      duration={45}
      intro={intro}
      steps={steps}
    />
  );
}