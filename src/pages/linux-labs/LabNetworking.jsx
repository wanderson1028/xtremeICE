import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Inspect network interfaces",
    explanation: "A new Ubuntu server arrived at the data center. Start by checking what network interfaces exist and whether they have IP addresses assigned.",
    whyItMatters: "You must know your network interfaces before configuring anything. Without an IP, the server is unreachable from the outside world.",
    securityInsight: "Unexpected network interfaces (e.g., a second NIC you didn't configure) can indicate a hardware implant or a misconfigured VM network bridge — both security concerns. Always audit interfaces on new systems (MITRE T1016 — System Network Configuration Discovery).",
    prompt: "ubuntu@newserver:~$",
    command: "ip addr show",
    output: [
      "1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default",
      "    link/loopback 00:00:00:00:00:00 brd 00:00:00:00:00:00",
      "    inet 127.0.0.1/8 scope host lo",
      "2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default",
      "    link/ether 02:42:ac:11:00:02 brd ff:ff:ff:ff:ff:ff",
      "    inet 10.0.0.45/24 brd 10.0.0.255 scope global dynamic eth0",
      "    valid_lft 85320sec preferred_lft 85320sec",
    ],
    nextStepDirections: "eth0 has a DHCP address of 10.0.0.45/24. Now check the routing table to confirm traffic can reach the default gateway.",
  },
  {
    stepLabel: "Check the routing table",
    explanation: "Use ip route show to view the current routing table, including the default gateway the server uses to reach the internet.",
    whyItMatters: "Without a correct default route, the server can communicate locally but can't reach external services like package repositories or APIs.",
    securityInsight: "Attackers who gain internal access often inspect routing tables to understand network segmentation and plan lateral movement (MITRE T1016). Unexpected routes can indicate a compromised gateway or an attacker-added pivot route.",
    prompt: "ubuntu@newserver:~$",
    command: "ip route show",
    output: [
      "default via 10.0.0.1 dev eth0 proto dhcp src 10.0.0.45 metric 100",
      "10.0.0.0/24 dev eth0 proto kernel scope link src 10.0.0.45",
    ],
    nextStepDirections: "Default route via 10.0.0.1 is set. Test actual internet connectivity with ping to confirm packets can reach an external host.",
  },
  {
    stepLabel: "Test internet connectivity",
    explanation: "Ping Google's public DNS server to test whether the server can actually send and receive packets over the internet.",
    whyItMatters: "Having a route entry doesn't guarantee packets flow. Ping tests the full path: local NIC → gateway → internet → return.",
    securityInsight: "ICMP ping is often blocked at perimeter firewalls in hardened environments. If ping fails but curl succeeds, it's likely ICMP filtering — not a network outage. Attackers also use ICMP for covert C2 channels (MITRE T1095).",
    prompt: "ubuntu@newserver:~$",
    command: "ping -c 3 8.8.8.8",
    output: [
      "PING 8.8.8.8 (8.8.8.8) 56(84) bytes of data.",
      "64 bytes from 8.8.8.8: icmp_seq=1 ttl=118 time=12.4 ms",
      "64 bytes from 8.8.8.8: icmp_seq=2 ttl=118 time=11.8 ms",
      "64 bytes from 8.8.8.8: icmp_seq=3 ttl=118 time=12.1 ms",
      "",
      "--- 8.8.8.8 ping statistics ---",
      "3 packets transmitted, 3 received, 0% packet loss, time 2003ms",
      "rtt min/avg/max/mdev = 11.8/12.1/12.4/0.2 ms",
    ],
    nextStepDirections: "0% packet loss — internet connectivity is confirmed. Now check DNS configuration so the server can resolve domain names.",
  },
  {
    stepLabel: "Check DNS configuration",
    explanation: "View /etc/resolv.conf to see which DNS servers are configured for name resolution.",
    whyItMatters: "Without working DNS, the server can reach IP addresses but cannot resolve hostnames. Package installs, API calls, and Git clones would all fail.",
    securityInsight: "DNS is a high-value target. Attackers modify /etc/resolv.conf to redirect DNS to a malicious server for credential harvesting (MITRE T1565.001 — Stored Data Manipulation). Always verify your DNS servers point to trusted resolvers.",
    prompt: "ubuntu@newserver:~$",
    command: "cat /etc/resolv.conf",
    output: [
      "# This file is managed by systemd-resolved.",
      "# DNS requests are handled via the stub resolver at 127.0.0.53.",
      "nameserver 127.0.0.53",
      "options edns0 trust-ad",
      "search localdomain",
    ],
    nextStepDirections: "DNS is managed by systemd-resolved via the local stub at 127.0.0.53. Test that it actually resolves names by querying a known hostname.",
  },
  {
    stepLabel: "Test DNS resolution",
    explanation: "Use nslookup to query the DNS server and confirm that github.com resolves to an IP address.",
    whyItMatters: "Testing DNS resolution confirms the full name→IP pipeline works, which is required for package installs, Git operations, and API calls.",
    securityInsight: "DNS resolution failures or unexpected IP responses can indicate DNS hijacking or a split-horizon DNS attack. Tools like dnstap or DNS logging on your resolver help detect anomalous resolution patterns used in C2 communications (MITRE T1071.004).",
    prompt: "ubuntu@newserver:~$",
    command: "nslookup github.com",
    output: [
      "Server:         127.0.0.53",
      "Address:        127.0.0.53#53",
      "",
      "Non-authoritative answer:",
      "Name:   github.com",
      "Address: 140.82.121.4",
      "Name:   github.com",
      "Address: 140.82.121.3",
    ],
    nextStepDirections: "DNS resolution working. Last check — inspect open ports and active sockets to understand what services are already running.",
  },
  {
    stepLabel: "Check listening services",
    explanation: "Use ss -tuln to display all TCP and UDP sockets that are actively listening on the server.",
    whyItMatters: "Knowing which ports are open is a fundamental security check. Unexpected open ports can indicate a misconfigured or compromised service.",
    securityInsight: "Every open port is an attack surface. CIS Benchmarks recommend running ss -tuln on every new server and disabling any service not explicitly required. Unexpected listeners on high ports (>1024) are especially suspicious — they don't need root and are often backdoors (MITRE T1049).",
    prompt: "ubuntu@newserver:~$",
    command: "ss -tuln",
    output: [
      "Netid  State   Recv-Q Send-Q  Local Address:Port  Peer Address:Port",
      "udp    UNCONN  0      0       127.0.0.53%lo:53     0.0.0.0:*",
      "udp    UNCONN  0      0       0.0.0.0:68           0.0.0.0:*",
      "tcp    LISTEN  0      128     0.0.0.0:22           0.0.0.0:*",
      "tcp    LISTEN  0      128     [::]:22              [::]:*",
    ],
    nextStepDirections: "Only SSH (port 22) and DNS stub are listening — expected for a fresh server. The network configuration is clean and complete.",
    finalGoal: "Server network fully verified: IP assigned, default route active, internet reachable, DNS resolving, only SSH listening.",
  },
];

export default function LabNetworking() {
  return (
    <LabRunner
      labTitle="Linux Networking Essentials"
      chapterNum="2.1"
      difficulty="Intermediate"
      tags={["networking", "ip", "dns", "ss"]}
      duration={35}
      terminalLabel="ubuntu@newserver:~"
      intro={{
        overview: "SCENARIO: A new server was racked in the data center overnight and connected to the network. You need to verify the full network stack is working before the infrastructure team closes the provisioning ticket: check interfaces, routing, internet connectivity, DNS, and open ports.",
        outcomes: [
          "Inspect network interfaces and IP assignments",
          "Read and understand routing tables",
          "Test connectivity at both L3 and DNS layers",
          "Audit listening services with ss",
        ],
        prerequisites: ["Basic command line usage"],
        tools: ["ip addr", "ip route", "ping", "nslookup", "ss"],
      }}
      steps={steps}
    />
  );
}