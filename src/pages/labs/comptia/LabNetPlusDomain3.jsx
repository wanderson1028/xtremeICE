import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Maintain Network Documentation",
    explanation: "Network documentation includes physical diagrams (where devices and cables are), logical diagrams (IP subnets and VLANs), rack diagrams (equipment in racks), cable maps, asset inventory, IPAM (IP Address Management), SLAs, and wireless surveys. Review the documentation types.",
    whyItMatters: "Network+ tests whether you can match a documentation type to its purpose. Physical diagrams show where things are; logical diagrams show how they are addressed and segmented; IPAM tracks IP assignments; SLAs define service commitments. Good documentation is essential for troubleshooting and onboarding.",
    command: "netctl docs --types --output table",
    prompt: "analyst@netplus:~$",
    output: [
      "------------------------------------------------------------",
      "|  Doc Type        |  Shows                          |  Use  |",
      "+-----------------+---------------------------------+-------+",
      "|  Physical diag.  |  Device locations, cabling      |  Install |",
      "|  Logical diag.   |  IP subnets, VLANs, routing     |  Design |",
      "|  Rack diagram    |  Equipment in racks (U units)   |  DC    |",
      "|  Cable map       |  Cable runs, patch panel ports  |  Trace |",
      "|  IPAM            |  IP address assignments        |  Track |",
      "|  SLA             |  Service commitments, uptime    |  Agree |",
      "+-----------------+---------------------------------+-------+",
    ],
    question: {
      text: "A network engineer needs to trace a cable from a user's wall jack back to the patch panel in the server room. Which documentation should they consult?",
      options: [
        "Logical diagram — it shows IP subnets and VLANs",
        "Physical diagram — it shows device locations but not individual cable runs",
        "Cable map — it documents individual cable runs and patch panel port assignments",
        "Rack diagram — it shows equipment mounted in racks",
      ],
      correctIndex: 2,
      explanation: "A cable map documents individual cable runs, including the path from wall jacks to patch panel ports and from patch panels to switch ports. This is the document you use to trace a single cable end-to-end. A physical diagram shows where devices are located but typically not every individual cable run. A logical diagram shows IP and VLAN structure, not physical cabling. A rack diagram shows equipment placement in racks, not cable runs to wall jacks.",
    },
  },
  {
    stepLabel: "Manage Device Life-cycle",
    explanation: "Network equipment has a life-cycle: introduction, deployment, maintenance, and eventually End of Life (EOL) and End of Support (EOS). Decommissioning must be done securely (wipe configs, dispose of hardware). Review the life-cycle stages.",
    whyItMatters: "Network+ tests whether you understand EOL vs. EOS and the importance of secure decommissioning. EOL means the vendor stops selling the product; EOS means they stop supporting it (no patches, no fixes). Running equipment past EOS creates security and reliability risk.",
    command: "netctl lifecycle --show --output table",
    prompt: "analyst@netplus:~$",
    output: [
      "-------------------------------------------------------------",
      "|  Stage          |  Description                        |  Action  |",
      "+----------------+-------------------------------------+----------+",
      "|  Introduction  |  Product launched                  |  Deploy  |",
      "|  Deployment    |  Installed in production           |  Maintain|",
      "|  Maintenance   |  Patches, firmware updates         |  Monitor |",
      "|  EOL           |  Vendor stops selling               |  Plan    |",
      "|  EOS           |  Vendor stops support/patches      |  Replace |",
      "|  Decommission  |  Remove, wipe config, dispose      |  Secure  |",
      "+----------------+-------------------------------------+----------+",
    ],
    question: {
      text: "A company's core switch has reached End of Support (EOS) from the vendor. What is the primary risk of continuing to use it in production?",
      options: [
        "The switch will immediately stop forwarding traffic",
        "The vendor will no longer provide firmware patches or security fixes, leaving known vulnerabilities unpatched",
        "The switch will consume more power than newer models",
        "The switch cannot be managed anymore because the vendor revokes the management license",
      ],
      correctIndex: 1,
      explanation: "End of Support (EOS) means the vendor stops providing firmware updates, security patches, and technical support. The switch keeps running, but any new vulnerabilities discovered after EOS will never be patched, creating an escalating security and reliability risk. EOL (End of Life) is when the vendor stops selling the product — it may still be supported for a while. The switch does not stop forwarding, the management license is not revoked, and while newer models may be more efficient, the primary risk is unpatched vulnerabilities.",
    },
  },
  {
    stepLabel: "Apply Change Management",
    explanation: "Change management is a formal process for making network changes: submit a change request, assess impact, get approval, schedule a maintenance window, implement, verify, and document. This prevents outages from unplanned or poorly communicated changes. Review the change management workflow.",
    whyItMatters: "Network+ tests whether you understand the change management process and why it matters. Unplanned changes are a leading cause of outages. The process ensures changes are reviewed, tested, scheduled during maintenance windows, and rolled back if they fail.",
    command: "netctl change --workflow --output table",
    prompt: "analyst@netplus:~$",
    output: [
      "----------------------------------------------------------",
      "|  Step  |  Action                  |  Purpose             |",
      "+-------+--------------------------+----------------------+",
      "|  1    |  Submit change request   |  Document intent     |",
      "|  2    |  Assess impact & risk    |  Identify downsides  |",
      "|  3    |  Approve (CAB)           |  Authorize           |",
      "|  4    |  Schedule maintenance    |  Minimize disruption |",
      "|  5    |  Implement & verify      |  Execute safely      |",
      "|  6    |  Document & close        |  Record outcome      |",
      "+-------+--------------------------+----------------------+",
    ],
    question: {
      text: "A network engineer wants to upgrade the firmware on a production core switch during peak business hours because a new feature is urgently needed. What should they do according to change management best practice?",
      options: [
        "Proceed immediately — urgent features justify skipping the process",
        "Submit a change request, assess impact, get approval from the Change Advisory Board (CAB), and schedule the upgrade during a maintenance window to minimize disruption",
        "Upgrade a test switch first, then proceed on the core switch without approval since testing covers the risk",
        "Wait until the switch fails, then upgrade as part of the repair",
      ],
      correctIndex: 1,
      explanation: "Change management requires submitting a change request, assessing impact and risk, obtaining approval (often from a Change Advisory Board or CAB), and scheduling the change during a maintenance window that minimizes business disruption. Even urgent changes go through an expedited version of this process. Testing is part of the impact assessment, but it does not replace approval and scheduling. Upgrading during peak hours risks an outage affecting the whole business.",
    },
  },
  {
    stepLabel: "Monitor with SNMP and Flow Data",
    explanation: "Network monitoring uses SNMP (Simple Network Management Protocol) to poll device metrics, flow data (NetFlow, sFlow) to analyze traffic patterns, packet capture (pcap) for deep inspection, and port mirroring (SPAN) to copy traffic to an analyzer. Review the monitoring methods.",
    whyItMatters: "Network+ tests whether you can match a monitoring tool to its purpose. SNMP polls CPU, memory, and interface counters; NetFlow records conversations between hosts; pcap captures every packet for analysis; SPAN mirrors traffic to a monitoring port. Baselines help detect anomalies.",
    command: "netctl monitor --methods --output table",
    prompt: "analyst@netplus:~$",
    output: [
      "--------------------------------------------------------------",
      "|  Method      |  What It Captures            |  Overhead  |",
      "+--------------+------------------------------+-----------+",
      "|  SNMP poll   |  CPU, memory, interface stats |  Low       |",
      "|  NetFlow     |  Traffic flows (src/dst/bytes)|  Medium    |",
      "|  Packet cap  |  Every packet (pcap)         |  High      |",
      "|  Port mirror |  Copy traffic to analyzer   |  Low on dev|",
      "|  Log aggreg. |  Syslog events               |  Low       |",
      "+--------------+------------------------------+-----------+",
    ],
    question: {
      text: "A network operations team needs to identify which applications are consuming the most bandwidth between two offices, without capturing every packet. Which monitoring method is the best fit?",
      options: [
        "SNMP polling — it collects interface counters but not per-application traffic detail",
        "NetFlow — it records traffic flows (source, destination, ports, byte counts) with lower overhead than full packet capture",
        "Packet capture (pcap) — it captures every packet, but the overhead is too high for ongoing monitoring",
        "Port mirroring — it copies traffic to an analyzer but does not summarize bandwidth by application",
      ],
      correctIndex: 1,
      explanation: "NetFlow (and sFlow) records metadata about traffic flows — source IP, destination IP, ports, protocol, and byte/packet counts — without capturing packet payloads. This gives you per-application and per-conversation bandwidth usage at a fraction of the overhead of full packet capture. SNMP only gives interface-level counters (total bytes in/out), not per-application breakdown. Packet capture is too heavy for continuous monitoring. Port mirroring copies traffic but does not summarize it — you would still need an analyzer to process the mirrored traffic.",
    },
  },
  {
    stepLabel: "Plan Disaster Recovery",
    explanation: "Disaster recovery planning defines RPO (Recovery Point Objective — how much data loss is acceptable), RTO (Recovery Time Objective — how quickly you must be back online), MTTR (Mean Time to Repair), and MTBF (Mean Time Between Failures). Sites can be cold (power only), warm (hardware + some data), or hot (live replica). Review the DR concepts.",
    whyItMatters: "Network+ tests whether you can distinguish RPO from RTO and cold/warm/hot sites. RPO is about data loss (measured in time before the event); RTO is about downtime (measured in time after the event). A hot site can failover in minutes; a cold site takes days.",
    command: "netctl dr --metrics --output table",
    prompt: "analyst@netplus:~$",
    output: [
      "--------------------------------------------------------------",
      "|  Metric  |  Measures                      |  Direction    |",
      "+---------+--------------------------------+---------------+",
      "|  RPO    |  Max acceptable data loss      |  Backward     |",
      "|  RTO    |  Max acceptable downtime       |  Forward      |",
      "|  MTTR   |  Avg time to repair            |  Forward      |",
      "|  MTBF   |  Avg time between failures    |  Reliability  |",
      "|  Cold   |  Power only, no hardware       |  Days to recover |",
      "|  Warm   |  Hardware, stale data          |  Hours        |",
      "|  Hot    |  Live replica, ready           |  Minutes      |",
      "+---------+--------------------------------+---------------+",
    ],
    question: {
      text: "A business defines its Recovery Point Objective (RPO) as 1 hour and its Recovery Time Objective (RTO) as 4 hours. What does this mean?",
      options: [
        "The system can be down for 1 hour and must be repaired within 4 hours",
        "The system can lose up to 1 hour of data (RPO) and must be back online within 4 hours of an outage (RTO)",
        "Backups must run every 4 hours and recovery must complete within 1 hour",
        "The system must be repaired within 1 hour and can lose 4 hours of data",
      ],
      correctIndex: 1,
      explanation: "RPO (Recovery Point Objective) is the maximum acceptable amount of data loss, measured in time before the incident — an RPO of 1 hour means you can lose at most 1 hour of data, so backups must run at least hourly. RTO (Recovery Time Objective) is the maximum acceptable downtime, measured from the moment of the incident — an RTO of 4 hours means the system must be back online within 4 hours of a failure. RPO is about data loss (backward-looking); RTO is about downtime (forward-looking). The other options swap or confuse the two metrics.",
    },
  },
  {
    stepLabel: "Configure Network Services",
    explanation: "Core network services include DHCP (dynamic IP assignment), DNS (name resolution), NTP (time synchronization), and SLAAC (IPv6 auto-configuration). Review the common services and their ports.",
    whyItMatters: "Network+ tests whether you know what each service does, its default port, and its role in the network. DHCP assigns IPs (UDP 67/68); DNS resolves names (UDP/TCP 53); NTP synchronizes time (UDP 123); SLAAC lets IPv6 hosts self-configure using Router Advertisements.",
    command: "netctl services --show --output table",
    prompt: "analyst@netplus:~$",
    output: [
      "-------------------------------------------------------------",
      "|  Service |  Function            |  Port(s)     |  Protocol |",
      "+---------+----------------------+--------------+----------+",
      "|  DHCP   |  IP assignment       |  67, 68      |  UDP     |",
      "|  DNS    |  Name resolution     |  53          |  UDP/TCP |",
      "|  NTP    |  Time sync           |  123         |  UDP     |",
      "|  SLAAC  |  IPv6 auto-config    |  RA/RS (ICMPv6) | IPv6 |",
      "|  SSH    |  Secure management   |  22          |  TCP     |",
      "|  SNMP   |  Monitoring          |  161, 162    |  UDP     |",
      "+---------+----------------------+--------------+----------+",
    ],
    question: {
      text: "A network administrator wants IPv6 hosts on a LAN to automatically configure their own IP addresses without a stateful DHCPv6 server. Which mechanism should they enable on the router?",
      options: [
        "DHCPv4 — it only handles IPv4, not IPv6",
        "SLAAC (Stateless Address Autoconfiguration) — the router advertises a prefix via ICMPv6 Router Advertisements and hosts build their own address",
        "NAT — it translates addresses but does not assign them",
        "DNS — it resolves names, it does not assign IP addresses",
      ],
      correctIndex: 1,
      explanation: "SLAAC (Stateless Address Autoconfiguration) is the IPv6 mechanism where a router periodically sends ICMPv6 Router Advertisement (RA) messages containing a network prefix. Hosts on the LAN use the prefix and their own interface identifier (often EUI-64 or a random value) to build a full IPv6 address — no stateful DHCPv6 server needed. DHCPv4 is for IPv4 only. NAT translates addresses but does not assign them. DNS resolves names to addresses but does not assign addresses. SLAAC is the correct IPv6 auto-configuration mechanism.",
    },
  },
];

const intro = {
  overview: "This lab covers CompTIA Network+ (N10-009) Domain 3: Network Operations. You'll explore network documentation, device life-cycle management, change management, network monitoring (SNMP, NetFlow, packet capture), disaster recovery (RPO, RTO, cold/warm/hot sites), and core network services (DHCP, DNS, NTP, SLAAC) through hands-on CLI exercises.",
  niceCategory: "Network Operations",
  objectives: [
    "Identify and maintain network documentation types (physical, logical, rack, cable map, IPAM, SLA)",
    "Understand device life-cycle stages including EOL, EOS, and secure decommissioning",
    "Apply the change management process for network changes",
    "Compare network monitoring methods (SNMP, NetFlow, packet capture, port mirroring)",
    "Define RPO, RTO, MTTR, MTBF and compare cold, warm, and hot disaster recovery sites",
    "Configure core network services (DHCP, DNS, NTP, SLAAC) and identify their ports",
  ],
  outcomes: [
    "Able to choose the right documentation type for a given task",
    "Understands the risk of running equipment past End of Support",
    "Can follow the change management workflow for a network change",
    "Able to select the right monitoring tool for a given need",
    "Can distinguish RPO from RTO and cold from hot sites",
    "Knows the default ports and functions of core network services",
  ],
  prerequisites: [
    "Completion of Network+ Domains 1 and 2 or equivalent networking knowledge",
    "Familiarity with IP addressing, routing, and switching",
  ],
  tools: [
    "Network CLI — simulated command-line interface for operations management",
    "Monitoring console — for SNMP, NetFlow, and packet capture review",
    "DR planner — for RPO/RTO and site type planning",
  ],
};

export default function LabNetPlusDomain3() {
  return (
    <LabRunner
      labTitle="Network+ Domain 3: Network Operations"
      chapterNum="3"
      difficulty="Intermediate"
      tags={["CompTIA", "Network+", "N10-009", "Documentation", "Monitoring", "Disaster Recovery", "DHCP"]}
      terminalLabel="Network+ CLI — Network Operations"
      duration={55}
      intro={intro}
      steps={steps}
    />
  );
}