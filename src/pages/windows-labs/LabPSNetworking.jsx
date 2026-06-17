import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Inspect Network Adapters",
    prompt: "PS C:\\Users\\Analyst>",
    command: "Get-NetAdapter | Select-Object Name, Status, MacAddress, LinkSpeed",
    explanation: "Get-NetAdapter lists all network interfaces. Checking the MAC address and link speed helps verify the physical network configuration and detect unexpected adapters.",
    whyItMatters: "Unexpected network adapters (e.g., VirtualBox or VMware adapters when not expected) can indicate that an attacker has installed virtualization software to tunnel traffic or pivot.",
    output: [
      "",
      "Name         Status   MacAddress         LinkSpeed",
      "----         ------   ----------         ---------",
      "Ethernet     Up       00-11-22-33-44-55     1 Gbps",
      "Wi-Fi        Up       66-77-88-99-AA-BB   300 Mbps",
      "",
    ],
    nextStepDirections: "Two adapters — both look legitimate. Now check IP configuration.",
    securityInsight: {
      title: "Unexpected Network Adapters",
      content: "MITRE ATT&CK T1599 — Attackers install virtual network adapters to create covert tunnels. Tools like OpenVPN, WireGuard, and Tor create TAP/TUN adapters. Any adapter named 'TAP', 'tun', or from unknown vendors warrants investigation.",
    },
  },
  {
    stepLabel: "View IP Configuration",
    prompt: "PS C:\\Users\\Analyst>",
    command: "Get-NetIPAddress | Where-Object { $_.AddressFamily -eq 'IPv4' } | Select-Object InterfaceAlias, IPAddress, PrefixLength",
    explanation: "Get-NetIPAddress returns IP address configuration. Filtering for IPv4 and selecting key properties gives you a clean view of all assigned IPs on all interfaces.",
    whyItMatters: "Multiple IP addresses on an interface can indicate IP spoofing or that the system is acting as a router. Unexpected addresses outside the corporate subnet are a major red flag.",
    output: [
      "",
      "InterfaceAlias   IPAddress        PrefixLength",
      "--------------   ---------        ------------",
      "Ethernet         10.0.1.45                  24",
      "Wi-Fi            192.168.1.102              24",
      "Loopback Pseudo  127.0.0.1                   8",
      "",
    ],
    nextStepDirections: "IP configuration looks normal. Now test connectivity to a known-good host.",
    securityInsight: {
      title: "Multiple Interface Exposure",
      content: "CWE-668 — A host connected to both a corporate network (10.x) and a personal Wi-Fi network (192.168.x) simultaneously creates a potential bridging risk. Corporate security policy should disable Wi-Fi on domain-joined workstations.",
    },
  },
  {
    stepLabel: "Test Network Connectivity",
    prompt: "PS C:\\Users\\Analyst>",
    command: "Test-NetConnection -ComputerName 8.8.8.8 -Port 443",
    explanation: "Test-NetConnection tests both ICMP reachability and TCP port connectivity. It's the PowerShell replacement for ping + telnet, and works even when ICMP is blocked.",
    whyItMatters: "Testing specific port connectivity helps verify firewall rules are working as expected. An unexpected open connection to an external IP on port 443 can indicate C2 traffic (attackers use HTTPS to blend in).",
    output: [
      "",
      "ComputerName     : 8.8.8.8",
      "RemoteAddress    : 8.8.8.8",
      "RemotePort       : 443",
      "InterfaceAlias   : Ethernet",
      "SourceAddress    : 10.0.1.45",
      "TcpTestSucceeded : True",
      "",
    ],
    nextStepDirections: "Outbound port 443 is open (expected). Now audit all active TCP connections.",
    securityInsight: {
      title: "Port 443 C2 Channels",
      content: "MITRE ATT&CK T1071.001 — Attackers tunnel C2 traffic over HTTPS (port 443) to blend with legitimate web traffic. Use Test-NetConnection to verify that only expected external hosts are reachable on HTTPS from internal systems.",
    },
  },
  {
    stepLabel: "Audit Active TCP Connections",
    prompt: "PS C:\\Users\\Analyst>",
    command: "Get-NetTCPConnection -State Established | Select-Object LocalAddress, LocalPort, RemoteAddress, RemotePort, OwningProcess | Sort-Object RemoteAddress",
    explanation: "Get-NetTCPConnection shows all active TCP connections. Filtering for Established state and sorting by remote address makes it easy to spot unexpected external connections.",
    whyItMatters: "Reviewing active connections is one of the first steps in an active compromise. Any established connection to an unknown external IP — especially on uncommon ports — is a potential C2 channel.",
    output: [
      "",
      "LocalAddress  LocalPort RemoteAddress   RemotePort OwningProcess",
      "------------  --------- -------------   ---------- -------------",
      "10.0.1.45         49234 142.250.80.46         443          5284",
      "10.0.1.45         49891 192.168.1.200        8080          4892",
      "10.0.1.45         52001 10.0.1.1               53           892",
      "",
    ],
    nextStepDirections: "ALERT: Process 4892 has an established connection to 192.168.1.200:8080 — the same C2 we found in the PowerShell logs! Resolve DNS to confirm.",
    securityInsight: {
      title: "Active C2 Connection Identified",
      content: "MITRE ATT&CK T1071 — An established connection from the suspicious PowerShell process (PID 4892) to the known C2 server (192.168.1.200:8080) confirms active compromise. Immediately isolate the host from the network and preserve the memory image.",
    },
  },
  {
    stepLabel: "Resolve DNS for an IP",
    prompt: "PS C:\\Users\\Analyst>",
    command: "Resolve-DnsName -Name 192.168.1.200 -Type PTR",
    explanation: "Resolve-DnsName performs forward and reverse DNS lookups. A PTR (pointer) query resolves an IP back to a hostname, helping identify the remote system.",
    whyItMatters: "Reverse DNS lookups can help identify C2 infrastructure. Legitimate services usually have proper PTR records. An IP with no PTR record or a suspicious hostname is a strong IOC.",
    output: [
      "",
      "Name                           Type   TTL   Section    NameHost",
      "----                           ----   ---   -------    --------",
      "200.1.168.192.in-addr.arpa     PTR    3600  Answer     attacker-c2.evil-domain.com",
      "",
    ],
    finalGoal: "You inspected network adapters and IP config, tested connectivity, audited active TCP connections to discover an active C2 channel, and resolved DNS to identify the attacker's C2 hostname — a complete network forensics workflow.",
    nextStepDirections: "Lab complete! C2 hostname confirmed: attacker-c2.evil-domain.com. The host should be immediately isolated.",
    securityInsight: {
      title: "C2 Domain as IOC",
      content: "MITRE ATT&CK T1568 — The resolved C2 hostname should be submitted to threat intel platforms (VirusTotal, Shodan), added to DNS sinkholes, and blocked at all perimeter controls. Search your SIEM for this domain and IP across all endpoints to find other compromised hosts.",
    },
  },
];

export default function LabPSNetworking() {
  return (
    <LabRunner
      labTitle="Network Configuration & Diagnostics"
      chapterNum={9}
      difficulty="Intermediate"
      tags={["PowerShell", "Networking", "Windows"]}
      terminalLabel="Windows PowerShell 5.1"
      duration={30}
      steps={steps}
      intro={{
        overview: "Continuing the ANALYST-WS01 investigation, you need to perform full network forensics. An active compromise is suspected — you'll enumerate network interfaces, audit active connections, and trace the C2 channel using PowerShell networking cmdlets.",
        objectives: [
          "Inspect network adapters with Get-NetAdapter",
          "Review IP configuration with Get-NetIPAddress",
          "Test port-level connectivity with Test-NetConnection",
          "Audit active TCP connections and correlate with processes",
          "Perform reverse DNS lookups to identify C2 infrastructure",
        ],
        tools: ["Get-NetAdapter", "Get-NetIPAddress", "Test-NetConnection", "Get-NetTCPConnection", "Resolve-DnsName"],
        prerequisites: ["Variables & the Pipeline", "Process & Service Management"],
      }}
    />
  );
}