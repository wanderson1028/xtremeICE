import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Compare Routing Technologies",
    explanation: "Routing can be static (manually configured routes) or dynamic (learned via routing protocols). Dynamic protocols include distance-vector (RIP, EIGRP), link-state (OSPF, IS-IS), and path-vector (BGP). Review the routing protocol comparison.",
    whyItMatters: "Network+ tests your ability to choose the right routing protocol for a scenario. OSPF is best for large enterprise interiors (fast convergence, link-state); BGP is the internet routing protocol (path-vector, policy-based); EIGRP is Cisco-proprietary (fast, easy); static routes are simple but don't adapt to failures.",
    command: "netctl routing --protocols --output table",
    prompt: "analyst@netplus:~$",
    output: [
      "------------------------------------------------------------",
      "|  Protocol |  Type           |  Metric        |  Scope     |",
      "+----------+-----------------+----------------+-----------+",
      "|  Static   |  Manual         |  N/A           |  Small     |",
      "|  RIP      |  Distance-vector|  Hop count     |  Small     |",
      "|  EIGRP    |  Distance-vector|  Bandwidth/delay| Mid      |",
      "|  OSPF     |  Link-state     |  Cost          |  Interior  |",
      "|  IS-IS    |  Link-state     |  Cost          |  Interior  |",
      "|  BGP      |  Path-vector    |  Path attrs    |  Exterior |",
      "+----------+-----------------+----------------+-----------+",
    ],
    question: {
      text: "An enterprise needs to route between its internal sites and wants fast convergence and support for variable-length subnet masks. Which routing protocol is the best choice?",
      options: [
        "RIP — simple and widely supported, but slow convergence and no VLSM",
        "BGP — designed for internet routing between autonomous systems, too complex for internal use",
        "OSPF — a link-state protocol with fast convergence and full VLSM support, ideal for enterprise interiors",
        "Static routes — manually configured, no convergence to speak of",
      ],
      correctIndex: 2,
      explanation: "OSPF (Open Shortest Path First) is a link-state protocol that converges quickly, supports VLSM and CIDR, and scales well in enterprise interiors. RIP is a distance-vector protocol with slow convergence and a 15-hop limit, and RIPv1 does not support VLSM. BGP is the exterior gateway protocol used between autonomous systems on the internet — too complex for internal routing. Static routes do not adapt to topology changes. OSPF is the best fit.",
    },
  },
  {
    stepLabel: "Configure NAT and PAT",
    explanation: "Network Address Translation (NAT) translates private IPs to a public IP, and Port Address Translation (PAT, also called NAT overload) maps many private IPs to one public IP using unique port numbers. Review the NAT/PAT reference.",
    whyItMatters: "Network+ tests whether you can distinguish NAT (one-to-one) from PAT (many-to-one with ports) and explain why NAT conserves public IPv4 addresses. PAT is what home routers use to allow many devices to share one public IP.",
    command: "netctl nat --show --output table",
    prompt: "analyst@netplus:~$",
    output: [
      "--------------------------------------------------------------",
      "|  Type  |  Mapping              |  Use Case                  |",
      "+-------+-----------------------+----------------------------+",
      "|  Static NAT  |  1 private : 1 public |  Published servers   |",
      "|  Dynamic NAT |  1 private : 1 from pool|  Outbound bursts    |",
      "|  PAT (Overload) | Many private : 1 public + ports | Home/office |",
      "+-------+-----------------------+----------------------------+",
    ],
    question: {
      text: "A small office has 50 internal computers but only one public IP address assigned by the ISP. All 50 computers need internet access simultaneously. Which technology makes this possible?",
      options: [
        "Static NAT — maps one private IP to the public IP, but only one computer at a time",
        "Dynamic NAT — maps each private IP to a public IP from a pool, but there is only one public IP",
        "PAT (NAT overload) — maps all 50 private IPs to the single public IP using unique source ports to distinguish sessions",
        "DNS — resolves domain names so the computers can share the IP",
      ],
      correctIndex: 2,
      explanation: "PAT (Port Address Translation), also called NAT overload, allows many private IP addresses to share a single public IP by assigning each session a unique source port. The router maintains a translation table mapping (private IP, private port) to (public IP, unique public port). This is how home and small-office routers let dozens of devices share one ISP-assigned address. Static and dynamic NAT require one public IP per concurrent private host, which is impossible with a single public IP.",
    },
  },
  {
    stepLabel: "Configure VLANs and 802.1Q Tagging",
    explanation: "VLANs (Virtual LANs) logically segment a switch into multiple broadcast domains. 802.1Q tagging inserts a 4-byte VLAN tag into the Ethernet frame header so switches can carry multiple VLANs over a trunk link. Review the VLAN configuration.",
    whyItMatters: "Network+ tests whether you understand VLAN segmentation, trunk vs. access ports, and the 802.1Q tag. Access ports carry one VLAN for end devices; trunk ports carry multiple VLANs between switches using 802.1Q tags. The native VLAN on a trunk is sent untagged.",
    command: "netctl vlan --show --output table",
    prompt: "analyst@netplus:~$",
    output: [
      "-----------------------------------------------------------",
      "|  Port  |  Mode    |  VLAN(s)         |  Tagging          |",
      "+-------+----------+------------------+-------------------+",
      "|  Gi1  |  Access  |  VLAN 10 (Data)  |  Untagged         |",
      "|  Gi2  |  Access  |  VLAN 20 (Voice) |  Untagged         |",
      "|  Gi24 |  Trunk   |  10,20,30        |  802.1Q tagged    |",
      "|  Gi24 |  Native  |  VLAN 99          |  Untagged         |",
      "+-------+----------+------------------+-------------------+",
    ],
    question: {
      text: "A switch port is configured as a trunk carrying VLANs 10, 20, and 30, with VLAN 99 set as the native VLAN. How are frames from VLAN 99 handled on this trunk?",
      options: [
        "They are tagged with an 802.1Q VLAN 99 tag, like all other VLANs",
        "They are sent untagged, because the native VLAN frames are not tagged on an 802.1Q trunk",
        "They are dropped, because the native VLAN cannot cross a trunk",
        "They are encapsulated in a separate tunnel to avoid collision with tagged frames",
      ],
      correctIndex: 1,
      explanation: "On an 802.1Q trunk, frames belonging to the native VLAN are sent untagged. Frames from all other VLANs (10, 20, 30) carry a 4-byte 802.1Q tag identifying the VLAN. The receiving switch knows that any untagged frame on that trunk belongs to the native VLAN (99). This is why the native VLAN must match on both ends of a trunk — a mismatch causes traffic to leak between VLANs. The native VLAN is not dropped or tunneled; it is simply untagged.",
    },
  },
  {
    stepLabel: "Understand Spanning Tree Protocol",
    explanation: "Spanning Tree Protocol (STP, IEEE 802.1D) prevents switching loops in redundant topologies by blocking ports. The bridge with the lowest bridge ID (priority + MAC) becomes the root bridge. Review the STP port roles.",
    whyItMatters: "Network+ tests whether you understand why STP exists (to prevent broadcast storms from loops), how the root bridge is elected (lowest bridge ID), and what port roles mean (root, designated, blocked). RSTP (802.1w) is the faster modern version.",
    command: "netctl stp --show --output table",
    prompt: "analyst@netplus:~$",
    output: [
      "------------------------------------------------------------",
      "|  Switch    |  Bridge ID        |  Role      |  Port State |",
      "+-----------+-------------------+-----------+-------------+",
      "|  SW-Core   |  4096.0011.2233.4455 |  Root   |  Forwarding |",
      "|  SW-A      |  32768.00aa.bbcc.dd01 |  Non-root|  Forwarding |",
      "|  SW-B      |  32768.00aa.bbcc.dd02 |  Non-root|  Blocking   |",
      "+-----------+-------------------+-----------+-------------+",
    ],
    question: {
      text: "In an STP topology, Switch A has bridge priority 4096 and MAC 0011.2233.4455. Switch B has priority 32768 and MAC 00aa.bbcc.dd01. Switch C has priority 4096 and MAC 0099.8877.6655. Which switch becomes the root bridge?",
      options: [
        "Switch A — it has the lowest MAC address among all switches",
        "Switch C — it has the lowest bridge ID because priority ties are broken by the lowest MAC address",
        "Switch B — it has the highest priority value, which wins the election",
        "All three switches share the root role in a round-robin fashion",
      ],
      correctIndex: 1,
      explanation: "STP elects the root bridge based on the lowest bridge ID, which is the combination of priority and MAC address (priority compared first). Switches A and C both have priority 4096, which is lower than B's 32768, so B is eliminated. The tie between A and C is broken by MAC address: 0099.8877.6655 (C) is lower than 0011.2233.4455 (A), so Switch C has the lowest bridge ID and becomes the root. The lowest priority wins, and MAC is only the tiebreaker. Higher priority values do not win — lower does.",
    },
  },
  {
    stepLabel: "Configure Wireless Standards",
    explanation: "802.11 wireless standards differ in frequency, speed, and range: 802.11a (5 GHz, 54 Mbps), 802.11g (2.4 GHz, 54 Mbps), 802.11n (2.4/5 GHz, 600 Mbps, MIMO), 802.11ac (5 GHz, multi-Gbps, MU-MIMO), and 802.11ax (Wi-Fi 6, OFDMA). Review the standards.",
    whyItMatters: "Network+ tests whether you can match an 802.11 standard to its frequency band and speed, and choose the right one for a scenario. 2.4 GHz has better range but more interference; 5 GHz has less interference but shorter range. Wi-Fi 6 (802.11ax) adds OFDMA for dense environments.",
    command: "netctl wifi --standards --output table",
    prompt: "analyst@netplus:~$",
    output: [
      "------------------------------------------------------------",
      "|  Standard  |  Freq (GHz)  |  Max Speed  |  Key Feature   |",
      "+-----------+--------------+------------+----------------+",
      "|  802.11a  |  5           |  54 Mbps   |  OFDM          |",
      "|  802.11g  |  2.4         |  54 Mbps   |  Backward w/ b |",
      "|  802.11n  |  2.4 / 5     |  600 Mbps  |  MIMO          |",
      "|  802.11ac |  5           |  Multi-Gbps|  MU-MIMO, wide  |",
      "|  802.11ax |  2.4 / 5 / 6 |  Multi-Gbps|  OFDMA (Wi-Fi 6)|",
      "+-----------+--------------+------------+----------------+",
    ],
    question: {
      text: "A company is deploying Wi-Fi in a crowded office building with many neighboring access points and hundreds of client devices. They want the best performance in a dense environment. Which standard should they deploy?",
      options: [
        "802.11g — 2.4 GHz penetrates walls better, so it works in crowded spaces",
        "802.11n — MIMO improves throughput, good enough for most offices",
        "802.11ax (Wi-Fi 6) — OFDMA splits channels into sub-channels, dramatically improving performance in dense environments with many clients",
        "802.11a — 5 GHz has less interference, so it is automatically the best",
      ],
      correctIndex: 2,
      explanation: "802.11ax (Wi-Fi 6) introduces OFDMA (Orthogonal Frequency Division Multiple Access), which divides each channel into smaller sub-channels (resource units) so multiple clients can transmit simultaneously in the same channel. This is specifically designed for dense environments with many devices. 802.11ac and 802.11n use MU-MIMO but do not have OFDMA. 802.11g uses the crowded 2.4 GHz band, which makes interference worse, not better. 802.11a is older and slow. Wi-Fi 6 is the best choice for dense deployments.",
    },
  },
  {
    stepLabel: "Configure FHRP for Redundancy",
    explanation: "First Hop Redundancy Protocols (FHRPs) provide a virtual IP (VIP) that end devices use as their default gateway, so if one router fails, another takes over without changing the client config. Common FHRPs: HSRP (Cisco), VRRP (standard), GLBP (Cisco, load-balancing). Review the FHRP comparison.",
    whyItMatters: "Network+ tests whether you understand why FHRPs exist (to eliminate the default gateway as a single point of failure) and can distinguish HSRP, VRRP, and GLBP. The VIP is what clients use; the active router owns it until it fails, then the standby takes over.",
    command: "netctl fhrp --show --output table",
    prompt: "analyst@netplus:~$",
    output: [
      "-----------------------------------------------------------",
      "|  Protocol |  Standard   |  Load Balancing |  Vendor     |",
      "+----------+-------------+-----------------+-------------+",
      "|  HSRP    |  Cisco      |  No (active/standby) | Cisco  |",
      "|  VRRP    |  RFC 5798   |  No (master/backup) | Open   |",
      "|  GLBP    |  Cisco      |  Yes (AVF)      |  Cisco      |",
      "+----------+-------------+-----------------+-------------+",
    ],
    question: {
      text: "A company has two routers serving as the default gateway for a subnet and wants clients to keep working if one router fails, without reconfiguring the clients. Which technology should they deploy?",
      options: [
        "Static routes on the clients pointing to both routers",
        "An FHRP (HSRP, VRRP, or GLBP) that presents a virtual IP to clients and fails over to the standby router automatically",
        "DNS round-robin to alternate the gateway between the two routers",
        "STP to block one router's port until the other fails",
      ],
      correctIndex: 1,
      explanation: "First Hop Redundancy Protocols (HSRP, VRRP, GLBP) solve exactly this problem. They create a virtual IP (VIP) that clients use as their default gateway. One router is active and owns the VIP; the other is standby. If the active fails, the standby takes over the VIP and traffic continues without any change to client configuration. Static routes require manual reconfiguration, DNS round-robin does not provide failover (it just alternates), and STP prevents switching loops — it has nothing to do with default gateway redundancy.",
    },
  },
];

const intro = {
  overview: "This lab covers CompTIA Network+ (N10-009) Domain 2: Network Implementation. You'll explore routing technologies (static, OSPF, BGP, EIGRP), NAT and PAT, VLANs and 802.1Q tagging, Spanning Tree Protocol, wireless standards, and First Hop Redundancy Protocols through hands-on CLI exercises.",
  niceCategory: "Network Implementation",
  objectives: [
    "Compare static and dynamic routing protocols (RIP, EIGRP, OSPF, IS-IS, BGP)",
    "Configure NAT and PAT and distinguish one-to-one from many-to-one translation",
    "Configure VLANs, access and trunk ports, and 802.1Q tagging",
    "Understand Spanning Tree Protocol port roles and root bridge election",
    "Match 802.11 wireless standards to their frequency, speed, and key features",
    "Explain how FHRPs (HSRP, VRRP, GLBP) provide default gateway redundancy",
  ],
  outcomes: [
    "Able to choose the right routing protocol for a given network scope",
    "Can explain how PAT allows many hosts to share one public IP",
    "Understands the difference between access and trunk ports and the native VLAN",
    "Can identify the root bridge in an STP topology from bridge IDs",
    "Able to select the right 802.11 standard for a deployment scenario",
    "Understands why FHRPs eliminate the default gateway as a single point of failure",
  ],
  prerequisites: [
    "Completion of Network+ Domain 1 or equivalent networking fundamentals",
    "Familiarity with IP addressing and the OSI model",
  ],
  tools: [
    "Network CLI — simulated command-line interface for routing and switching configuration",
    "VLAN manager — for configuring access, trunk, and native VLANs",
    "Wireless configurator — for 802.11 standard selection and comparison",
  ],
};

export default function LabNetPlusDomain2() {
  return (
    <LabRunner
      labTitle="Network+ Domain 2: Network Implementation"
      chapterNum="2"
      difficulty="Intermediate"
      tags={["CompTIA", "Network+", "N10-009", "Routing", "VLANs", "Wireless", "STP"]}
      terminalLabel="Network+ CLI — Network Implementation"
      duration={50}
      intro={intro}
      steps={steps}
    />
  );
}