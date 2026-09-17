import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Follow the Troubleshooting Methodology",
    explanation: "The CompTIA troubleshooting methodology has structured steps: 1) Identify the problem, 2) Establish a theory of probable cause, 3) Test the theory to determine the cause, 4) Establish a plan of action and implement the solution, 5) Verify full system functionality and implement preventative measures, 6) Document findings, actions, and outcomes. Review the methodology.",
    whyItMatters: "Network+ tests whether you know the order of the troubleshooting methodology and can apply it. Jumping straight to a fix without testing a theory wastes time and can make things worse. Documenting at the end builds a knowledge base for future issues.",
    command: "netctl troubleshoot --methodology --output table",
    prompt: "analyst@netplus:~$",
    output: [
      "----------------------------------------------------------------",
      "|  Step  |  Action                              |  Key Question  |",
      "+-------+--------------------------------------+----------------+",
      "|  1    |  Identify the problem               |  What is wrong? |",
      "|  2    |  Establish a theory of cause         |  Why?           |",
      "|  3    |  Test the theory                     |  Confirm cause  |",
      "|  4    |  Plan & implement the solution       |  How to fix?    |",
      "|  5    |  Verify functionality + prevent     |  Did it work?   |",
      "|  6    |  Document findings, actions, outcome |  Record it      |",
      "+-------+--------------------------------------+----------------+",
    ],
    question: {
      text: "A user reports they cannot reach a server. The technician suspects a bad cable but is not sure. According to the CompTIA troubleshooting methodology, what should they do before replacing the cable?",
      options: [
        "Replace the cable immediately — if it fixes the problem, the theory was right",
        "Test the theory to determine the cause — for example, swap the cable with a known-good one or test with a cable tester — before implementing a full fix",
        "Skip to documenting the issue and move on to the next ticket",
        "Escalate to a senior engineer without testing anything",
      ],
      correctIndex: 1,
      explanation: "Step 3 of the methodology is to test the theory to determine the cause before implementing a full solution. Testing might mean swapping the cable with a known-good one, using a cable tester, or checking link lights. If the test confirms the cable is bad, you then establish a plan of action (step 4) — replace the cable permanently. If the test disproves the theory, you form a new theory (back to step 2). Jumping straight to replacing the cable skips the testing step and can waste time if the cable was not the problem.",
    },
  },
  {
    stepLabel: "Diagnose Cabling and Physical Issues",
    explanation: "Cabling issues include incorrect cable type (crossover vs. straight-through), signal degradation, improper termination, and TX/RX transposed (fiber). Interface issues show as increasing error counters (CRC, runts, giants) or port status (up/down, down/down). Review the physical layer symptoms.",
    whyItMatters: "Network+ tests whether you can match a physical symptom to its cause. A port showing up/down means a physical connection exists but there is a Layer 2 issue (encapsulation mismatch, VLAN mismatch). Down/down means a physical problem (cable, transceiver, power). Increasing CRC errors suggest a cable or EMI problem.",
    command: "netctl physical --diagnose --output table",
    prompt: "analyst@netplus:~$",
    output: [
      "---------------------------------------------------------------",
      "|  Symptom          |  Likely Cause              |  Layer     |",
      "+------------------+----------------------------+-----------+",
      "|  Down/down        |  Cable, transceiver, power |  Layer 1   |",
      "|  Up/down         |  Encap/VLAN mismatch      |  Layer 2   |",
      "|  CRC errors rising|  EMI, bad cable, long run |  Layer 1   |",
      "|  TX/RX transposed |  Fiber crossed tx/rx       |  Layer 1   |",
      "|  PoE not working  |  Wrong cable class/power   |  Layer 1   |",
      "|  Intermittent     |  Loose connection, EMI     |  Layer 1   |",
      "+------------------+----------------------------+-----------+",
    ],
    question: {
      text: "A switch port shows a status of up/down (line protocol down) while the interface is physically connected. The cable has been tested and is good. What is the most likely cause?",
      options: [
        "A physical cable failure — but the cable tested good, so this is unlikely",
        "A Layer 2 issue such as an encapsulation mismatch, a VLAN mismatch, or a disabled interface on the other end — the physical link is up but Layer 2 is not negotiating",
        "A power failure on the switch — but the port shows up, so the switch has power",
        "An IP addressing conflict — but IP is Layer 3, and the port status is Layer 1/2",
      ],
      correctIndex: 1,
      explanation: "An up/down status (interface up, line protocol down) means the physical layer is connected (Layer 1 is up) but the data link layer (Layer 2) is not negotiating. Common causes include an encapsulation mismatch (e.g., one side HDLC, the other PPP), a VLAN mismatch on a trunk, the interface being administratively shut down on the other end, or a speed/duplex mismatch. Since the cable tested good, a Layer 1 failure is unlikely. Power and IP conflicts do not produce an up/down status — power issues give down/down, and IP is Layer 3.",
    },
  },
  {
    stepLabel: "Troubleshoot Switching Issues",
    explanation: "Switching issues include STP problems (loops, blocked ports), VLAN assignment errors (port in the wrong VLAN), ACLs blocking traffic, and trunk misconfigurations. Review the common switching issues and their symptoms.",
    whyItMatters: "Network+ tests whether you can diagnose a switching problem from its symptoms. A port in the wrong VLAN causes connectivity to the wrong subnet; a trunk mismatch drops VLAN traffic; STP blocking is expected in redundant topologies but can indicate a misconfiguration if it blocks the wrong port.",
    command: "netctl switching --troubleshoot --output table",
    prompt: "analyst@netplus:~$",
    output: [
      "----------------------------------------------------------------",
      "|  Symptom              |  Likely Cause            |  Fix       |",
      "+----------------------+--------------------------+-----------+",
      "|  Wrong subnet access |  Port in wrong VLAN       |  Reassign  |",
      "|  VLAN traffic drops  |  Trunk mismatch/missing  |  Add VLAN  |",
      "|  Broadcast storm     |  STP disabled / loop      |  Enable STP|",
      "|  Port blocked        |  STP blocking (expected) |  Verify    |",
      "|  ACL denies traffic  |  ACL rule too strict      |  Adjust    |",
      "|  No inter-VLAN routing|  Router on stick missing |  Configure |",
      "+----------------------+--------------------------+-----------+",
    ],
    question: {
      text: "A user on port Gi1/0/24 reports they can reach some servers but not others, and they are now in a different IP subnet than their colleagues on the same switch. What is the most likely cause?",
      options: [
        "A routing loop causing intermittent connectivity",
        "The switch port Gi1/0/24 is assigned to the wrong VLAN, so the user is getting an IP from a different DHCP scope",
        "A broadcast storm is overwhelming the switch",
        "An STP loop is blocking the port",
      ],
      correctIndex: 1,
      explanation: "If a user is in a different IP subnet than colleagues on the same switch, the most likely cause is that their switch port is assigned to the wrong VLAN. Each VLAN typically has its own DHCP scope, so a port in the wrong VLAN pulls an address from the wrong scope, putting the user in a different subnet with different access. The fix is to reassign the port to the correct VLAN. A routing loop would cause intermittent connectivity but not a wrong subnet. A broadcast storm would affect everyone, not just one user. STP blocking would drop the port entirely, not change its subnet.",
    },
  },
  {
    stepLabel: "Troubleshoot Routing Issues",
    explanation: "Routing issues include missing or incorrect default routes, routing table problems, address pool exhaustion, and incorrect gateway, IP, or subnet mask configuration. Review the common routing symptoms and their causes.",
    whyItMatters: "Network+ tests whether you can diagnose a routing problem from its symptoms. A missing default route means hosts can reach local but not remote networks; an incorrect gateway means traffic goes nowhere; address pool exhaustion means DHCP runs out of addresses to lease.",
    command: "netctl routing --troubleshoot --output table",
    prompt: "analyst@netplus:~$",
    output: [
      "----------------------------------------------------------------",
      "|  Symptom              |  Likely Cause            |  Fix       |",
      "+----------------------+--------------------------+-----------+",
      "|  Local only, no remote|  Missing default route  |  Add route |",
      "|  No traffic leaves LAN |  Wrong default gateway   |  Correct GW|",
      "|  Can't reach some nets |  Missing route in table  |  Add route |",
      "|  DHCP not handing IPs |  Address pool exhausted  |  Expand pool|",
      "|  Wrong subnet mask    |  Mask misconfigured      |  Correct   |",
      "|  Intermittent routing |  Route flapping          |  Stabilize |",
      "+----------------------+--------------------------+-----------+",
    ],
    question: {
      text: "Users on a LAN can reach other hosts on the same subnet but cannot reach any hosts on remote subnets or the internet. The switch and cabling are fine. What is the most likely cause?",
      options: [
        "A bad cable on the user's machine — but they can reach local hosts, so the cable is fine",
        "A missing or incorrect default gateway (or default route) on the hosts or the router, so traffic has no path to remote networks",
        "A VLAN mismatch on the switch — but that would affect local connectivity too",
        "An exhausted DHCP address pool — but users have addresses, so the pool is not exhausted",
      ],
      correctIndex: 1,
      explanation: "If hosts can reach local (same-subnet) hosts but not remote networks, the problem is the path to remote networks — the default gateway or default route. If the hosts have the wrong default gateway (or none), or the router lacks a default route, traffic destined for other subnets has nowhere to go. Local subnet traffic does not need a gateway (it is switched directly), so local connectivity works. The cable is fine (local works), a VLAN mismatch would break local connectivity, and DHCP pool exhaustion would leave users without any address at all.",
    },
  },
  {
    stepLabel: "Diagnose Performance Issues",
    explanation: "Performance issues include congestion (oversubscribed links), latency (delay), packet loss (dropped packets), and wireless interference. Each has distinct symptoms and tools. Review the performance issues and their diagnostic tools.",
    whyItMatters: "Network+ tests whether you can match a performance symptom to its cause and tool. Congestion shows as high interface utilization; latency shows as high round-trip times in ping; packet loss shows as drops in ping; wireless interference shows as low signal-to-noise ratio and retransmissions.",
    command: "netctl performance --diagnose --output table",
    prompt: "analyst@netplus:~$",
    output: [
      "------------------------------------------------------------------",
      "|  Issue        |  Symptom              |  Tool                   |",
      "+--------------+-----------------------+-------------------------+",
      "|  Congestion   |  High link utilization |  SNMP, interface stats |",
      "|  Latency      |  High RTT in ping      |  ping, traceroute      |",
      "|  Packet loss  |  Drops in ping         |  ping, mtr              |",
      "|  Wireless interf|  Low SNR, retransmits|  Wi-Fi analyzer         |",
      "|  Jitter       |  Variable RTT          |  iperf, ping            |",
      "|  Bottleneck   |  Throughput cap        |  iperf, speed test      |",
      "+--------------+-----------------------+-------------------------+",
    ],
    question: {
      text: "Users on a wireless network report slow and intermittent connectivity, especially when the microwave in the break room is running. A Wi-Fi analyzer shows low signal-to-noise ratio and high retransmission counts on the 2.4 GHz band. What is the most likely cause?",
      options: [
        "A routing loop causing packets to take a longer path",
        "Wireless interference — the 2.4 GHz band is being disrupted by the microwave (which also operates at 2.4 GHz), causing low SNR and retransmissions",
        "A congested uplink on the wired side of the access point",
        "An exhausted DHCP address pool",
      ],
      correctIndex: 1,
      explanation: "Microwaves operate at 2.4 GHz, the same frequency band as 802.11b/g/n Wi-Fi, and can cause significant interference. The Wi-Fi analyzer confirms this: low signal-to-noise ratio (SNR) and high retransmissions are classic symptoms of RF interference. The fix is to move the AP or clients to the 5 GHz band (802.11a/n/ac/ax), which is not affected by microwaves, or to relocate the AP away from the interference source. A routing loop, congested uplink, or DHCP exhaustion would not correlate with microwave use or show as low SNR on a Wi-Fi analyzer.",
    },
  },
  {
    stepLabel: "Use Troubleshooting Tools",
    explanation: "Network troubleshooting tools include protocol analyzers (Wireshark), command-line tools (ping, traceroute, ipconfig/ifconfig, nslookup, netstat, arp), cable testers, and Wi-Fi analyzers. Each tool serves a specific diagnostic purpose. Review the tools and their uses.",
    whyItMatters: "Network+ tests whether you can choose the right tool for a given symptom. ping tests reachability and latency; traceroute shows the path and where it breaks; nslookup tests DNS; a cable tester validates physical cabling; Wireshark captures and analyzes packets; a Wi-Fi analyzer surveys RF environment.",
    command: "netctl tools --list --output table",
    prompt: "analyst@netplus:~$",
    output: [
      "-----------------------------------------------------------------",
      "|  Tool          |  Tests                    |  Layer           |",
      "+---------------+---------------------------+-----------------+",
      "|  ping          |  Reachability, RTT, loss  |  Layer 3 (ICMP) |",
      "|  traceroute    |  Path, where it breaks    |  Layer 3        |",
      "|  nslookup/dig  |  DNS resolution           |  Layer 7        |",
      "|  arp           |  ARP cache               |  Layer 2        |",
      "|  netstat       |  Connections, ports       |  Layer 3/4      |",
      "|  Cable tester  |  Cable continuity        |  Layer 1        |",
      "|  Wi-Fi analyzer|  RF signal, SNR          |  Layer 1 (wireless) |",
      "|  Wireshark     |  Packet capture/analysis |  All layers     |",
      "+---------------+---------------------------+-----------------+",
    ],
    question: {
      text: "A user can ping a server by IP address (203.0.113.10) but cannot reach it by name (server.example.com). Which tool should the technician use to diagnose the problem?",
      options: [
        "ping — it already worked by IP, so it will not help with the name problem",
        "nslookup or dig — to test DNS resolution and see if the name resolves to the correct IP",
        "traceroute — to see the path to the server, but the path works (ping succeeded)",
        "A cable tester — the physical connection is fine (ping worked)",
      ],
      correctIndex: 1,
      explanation: "The symptom — reaching by IP but not by name — points to a DNS resolution problem. nslookup or dig tests DNS directly: you can query for server.example.com and see if it resolves, to which IP, and which DNS server is answering. If DNS fails, the fix is on the DNS side (wrong DNS server, stale record, misconfigured zone). ping, traceroute, and a cable tester all confirm connectivity (which already works by IP) — they do not test name resolution. nslookup is the right tool for a name-vs-IP discrepancy.",
    },
  },
];

const intro = {
  overview: "This lab covers CompTIA Network+ (N10-009) Domain 5: Network Troubleshooting. You'll explore the structured troubleshooting methodology, cabling and physical interface issues, switching and routing problems, performance issues (congestion, latency, packet loss, wireless interference), and the tools used to diagnose each through hands-on CLI exercises.",
  niceCategory: "Network Troubleshooting",
  objectives: [
    "Follow the CompTIA troubleshooting methodology in the correct order",
    "Diagnose cabling and physical interface issues from port status and error counters",
    "Troubleshoot switching issues (VLAN assignment, trunk mismatches, STP, ACLs)",
    "Troubleshoot routing issues (missing default routes, wrong gateway, pool exhaustion)",
    "Diagnose performance issues (congestion, latency, packet loss, wireless interference)",
    "Select the right troubleshooting tool for a given symptom (ping, traceroute, nslookup, Wireshark, cable tester, Wi-Fi analyzer)",
  ],
  outcomes: [
    "Able to apply the troubleshooting methodology step by step",
    "Can interpret up/down vs. down/down port status and error counters",
    "Able to diagnose a VLAN or trunk misconfiguration from symptoms",
    "Can identify a missing default route or wrong gateway as the cause of remote connectivity failure",
    "Able to match a performance symptom to its likely cause and tool",
    "Knows which tool to use for reachability, DNS, cabling, and packet-level diagnosis",
  ],
  prerequisites: [
    "Completion of Network+ Domains 1-4 or equivalent networking knowledge",
    "Familiarity with IP addressing, routing, switching, and basic security",
  ],
  tools: [
    "Network CLI — simulated command-line interface for troubleshooting",
    "Diagnostic toolkit — ping, traceroute, nslookup, netstat, arp simulations",
    "Cable and Wi-Fi analyzers — for physical and wireless layer diagnosis",
  ],
};

export default function LabNetPlusDomain5() {
  return (
    <LabRunner
      labTitle="Network+ Domain 5: Network Troubleshooting"
      chapterNum="5"
      difficulty="Intermediate"
      tags={["CompTIA", "Network+", "N10-009", "Troubleshooting", "Methodology", "Tools"]}
      terminalLabel="Network+ CLI — Network Troubleshooting"
      duration={55}
      intro={intro}
      steps={steps}
    />
  );
}