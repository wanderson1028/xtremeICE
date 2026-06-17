import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Capture live traffic with tcpdump",
    explanation: "Start a packet capture on the eth0 interface, filtering for HTTP traffic on port 80. Save to a .pcap file for later analysis.",
    whyItMatters: "Packet capture is the foundation of network forensics. tcpdump is lightweight, scriptable, and available on virtually every Linux system — making it the universal go-to for live capture.",
    command: "tcpdump -i eth0 -w /captures/traffic.pcap port 80",
    prompt: "root@soc:~#",
    output: [
      "tcpdump: listening on eth0, link-type EN10MB (Ethernet), snapshot length 262144 bytes",
      "^C",
      "1,847 packets captured",
      "1,847 packets received by filter",
      "0 packets dropped by kernel",
      "",
      "[*] Capture saved: /captures/traffic.pcap (2.3 MB)",
    ],
    question: {
      text: "Why is capturing only port 80 traffic potentially insufficient for a full incident investigation?",
      options: [
        "tcpdump cannot capture more than 2,000 packets reliably",
        "Attackers and malware commonly use non-standard ports (443, 4444, 8080) or encrypted channels — limiting capture to port 80 misses HTTPS, C2 beacons, and most modern attack traffic",
        "Port 80 traffic is the only unencrypted protocol on most networks",
        "Capturing all ports produces files that are too large to analyze with tshark",
      ],
      correctIndex: 1,
      explanation: "Modern attack traffic almost exclusively uses encrypted channels (443, 8443) or well-known ports that firewalls allow. Meterpreter defaults to port 4444 but is trivially reconfigured. C2 tools like Cobalt Strike use HTTPS on 443. Ransomware and data exfiltration tools prefer 443 or 80. A capture limited to port 80 also misses all internal east-west traffic between compromised hosts. A complete investigation requires capturing all traffic or at minimum a broad protocol-based filter.",
    },
  },
  {
    stepLabel: "Analyze pcap with tshark",
    explanation: "Use tshark (the command-line version of Wireshark) to read and display HTTP requests from the capture file.",
    whyItMatters: "tshark can parse thousands of packets in seconds, filter on any protocol field, and output structured data for scripting — essential for automated network analysis pipelines.",
    command: "tshark -r /captures/traffic.pcap -Y 'http.request' -T fields -e http.host -e http.request.uri",
    prompt: "root@soc:~#",
    output: [
      "Running as user root.",
      "192.168.1.80\t/login.php",
      "192.168.1.80\t/admin/",
      "192.168.1.80\t/backup/db.sql",
      "malicious-c2.ru\t/beacon.php",
      "malicious-c2.ru\t/upload.php",
      "192.168.1.80\t/index.php",
      "",
      "[!] Traffic to malicious-c2.ru detected — C2 beaconing pattern",
    ],
    question: {
      text: "Two requests go to malicious-c2.ru: /beacon.php and /upload.php. What do these endpoint names suggest about the malware's behavior?",
      options: [
        "The malware is a web scraper downloading content from a Russian website",
        "/beacon.php indicates regular check-ins to receive attacker commands; /upload.php suggests the malware is exfiltrating data — files, credentials, or screenshots — to the attacker's server",
        "Both endpoints are standard PHP files used by legitimate content management systems",
        "The malware is performing reconnaissance by enumerating the C2 server's directories",
      ],
      correctIndex: 1,
      explanation: "A beacon is a periodic check-in to a C2 server — the malware 'phones home' at regular intervals to receive commands, indicating an established persistent backdoor with a live operator connection. An upload endpoint (/upload.php) receiving connections from a compromised host means data is actively being exfiltrated — files, credentials, screenshots, or keystrokes are being sent to the attacker. Together they indicate both persistence and active data theft in progress.",
    },
  },
  {
    stepLabel: "Extract credentials from plaintext HTTP",
    explanation: "Use tshark to extract POST data from captured HTTP traffic. Many older or misconfigured apps transmit credentials in cleartext.",
    whyItMatters: "Unencrypted HTTP is completely transparent on the network. Anyone with access to network traffic — switches, routers, ISP — can read credentials. This is why HTTPS everywhere is essential.",
    command: "tshark -r /captures/traffic.pcap -Y 'http.request.method==POST' -T fields -e http.file_data",
    prompt: "root@soc:~#",
    output: [
      "username=admin&password=Password1&submit=Login",
      "username=jsmith&password=Summer2026!&submit=Login",
      "user=svc_backup&pass=Backup#Secure99&action=auth",
      "",
      "[!] CLEARTEXT CREDENTIALS captured over HTTP:",
      "[!] admin:Password1, jsmith:Summer2026!, svc_backup:Backup#Secure99",
      "[!] REMEDIATION: Enable HTTPS and HSTS. Never use HTTP for authentication.",
    ],
    question: {
      text: "Credentials were captured in plaintext. Beyond enabling HTTPS, what HTTP header prevents browsers from ever downgrading back to HTTP after the first secure visit?",
      options: [
        "X-Content-Type-Options: nosniff — prevents MIME type sniffing attacks",
        "Strict-Transport-Security (HSTS) — instructs browsers to only use HTTPS for a specified duration; even if a user types 'http://', the browser automatically upgrades to HTTPS before sending any data",
        "Content-Security-Policy: upgrade-insecure-requests — rewrites HTTP links to HTTPS",
        "Referrer-Policy: no-referrer — prevents the HTTP referrer header from leaking credentials",
      ],
      correctIndex: 1,
      explanation: "HSTS (HTTP Strict Transport Security) works by telling the browser: 'For the next [max-age] seconds, only connect to this site over HTTPS, even if the user types http://.' On subsequent visits, the browser upgrades the connection before any data is sent, preventing network-level attackers from intercepting the initial HTTP request. HTTPS alone doesn't protect the very first visit if the user types http:// — HSTS closes this window. Option C (CSP upgrade-insecure-requests) only rewrites resource URLs in the page, not the initial navigation.",
    },
  },
  {
    stepLabel: "Detect port scan in traffic",
    explanation: "Analyze the capture for TCP SYN packets sent to many ports in rapid succession — the signature pattern of a port scan.",
    whyItMatters: "Port scans are reconnaissance. Detecting them early gives defenders time to prepare, block the scanner's IP, and alert on further activity from that host.",
    command: "tshark -r /captures/traffic.pcap -Y 'tcp.flags.syn==1 && tcp.flags.ack==0' | awk '{print $3}' | sort | uniq -c | sort -rn | head",
    prompt: "root@soc:~#",
    output: [
      "   1842 192.168.1.200",
      "     47 192.168.1.1",
      "     12 192.168.1.100",
      "",
      "[!] 192.168.1.200 sent 1,842 SYN packets — active port scanner detected",
      "[*] Expected: legitimate hosts send < 50 SYN packets per capture window",
      "[*] Action: Block 192.168.1.200 and investigate the source",
    ],
    question: {
      text: "192.168.1.200 sent 1,842 SYN packets. Why does a port scan primarily send SYN packets without completing the TCP handshake?",
      options: [
        "SYN packets are smaller than full handshakes, making the scan run faster",
        "A SYN scan (half-open scan) sends SYN and waits for SYN-ACK (port open) or RST (closed/filtered) without completing the handshake — this avoids creating full TCP connections that appear in application logs, reducing detection by the target",
        "Complete TCP handshakes are blocked by most routers, making SYN the only option",
        "SYN-only scanning is required by RFC standards when testing third-party systems",
      ],
      correctIndex: 1,
      explanation: "A SYN scan exploits the TCP handshake design: a SYN-ACK response means the port is open, a RST means closed. By never completing the handshake (never sending the final ACK), the scanner never creates a fully established TCP connection. Many application-layer logs (web servers, database logs) only log completed connections — a half-open scan is invisible to them. The scan appears in network-level firewall and IDS logs, but not in application logs, reducing the detection surface.",
    },
  },
  {
    stepLabel: "Reconstruct TCP stream",
    explanation: "Follow a suspicious TCP stream to reconstruct the full conversation between attacker and target, revealing the data that was transferred.",
    whyItMatters: "Reconstructing streams reveals the full context of a connection — what commands were run, what data was exfiltrated, or what malware was downloaded. It's how analysts build attack timelines.",
    command: "tshark -r /captures/traffic.pcap -q -z follow,tcp,ascii,0",
    prompt: "root@soc:~#",
    output: [
      "===================================================================",
      "Follow: tcp,ascii",
      "Filter: tcp.stream eq 0",
      "Node 0: 192.168.1.200:54321",
      "Node 1: 192.168.1.105:4444",
      "===================================================================",
      "whoami",
      "corp\\administrator",
      "ipconfig",
      "net user administrator H4x0r2026! /domain",
      "powershell -enc JABjAGwAaQBlAG4AdAA...",
      "",
      "[!] Meterpreter session — attacker changed domain admin password and ran PowerShell payload",
    ],
    question: {
      text: "The attacker ran 'net user administrator H4x0r2026! /domain' — changing the domain admin password. What is the immediate incident response priority upon discovering this?",
      options: [
        "Document the new password for auditing purposes before resetting it",
        "Immediately reset the domain administrator password AND review all other domain admin accounts for unauthorized changes — the attacker may have created backdoor accounts or changed multiple passwords during the session",
        "Reboot the domain controller to flush the password change from memory",
        "Isolate only the compromised workstation (192.168.1.200) from the network",
      ],
      correctIndex: 1,
      explanation: "The attacker changed the domain admin password — giving themselves persistent privileged access. But they likely also explored the network during the session (the reconnaisance commands suggest this), potentially creating backdoor accounts or modifying other admin credentials. Resetting only one password while leaving other admin accounts unreviewed risks leaving the attacker's persistence intact. A thorough response audits all privileged account changes in the Active Directory event logs for the session's duration.",
    },
  },
  {
    stepLabel: "Identify DNS exfiltration",
    explanation: "Examine DNS queries for anomalous patterns — unusually long subdomains are a hallmark of DNS tunneling used for data exfiltration.",
    whyItMatters: "DNS exfiltration bypasses most firewalls because DNS is rarely blocked. Attackers encode data in subdomains, turning your DNS infrastructure into a covert data channel.",
    command: "tshark -r /captures/traffic.pcap -Y 'dns.qry.type==1' -T fields -e dns.qry.name | awk 'length>50'",
    prompt: "root@soc:~#",
    output: [
      "aGVsbG8gd29ybGQ.exfil.attacker.com",
      "c2VjcmV0IGZpbGUgY29udGVudHM.exfil.attacker.com",
      "dXNlcm5hbWU6YWRtaW4gcGFzc3dvcmQ6UGFzc3dvcmQx.exfil.attacker.com",
      "",
      "[!] DNS TUNNELING DETECTED — Base64 encoded data in subdomains",
      "[*] Decoded: 'hello world', 'secret file contents', 'username:admin password:Password1'",
      "[*] Remediation: DNS filtering, RPZ, block unknown external resolvers",
    ],
    question: {
      text: "DNS tunneling is hard to block because DNS is essential for normal operations. What detection approach is most effective against it?",
      options: [
        "Block all DNS traffic to external resolvers and only allow 8.8.8.8",
        "Behavioral analysis: alert on hosts generating high DNS query volumes, queries with subdomains longer than 50 characters, or high entropy (random-looking) subdomain strings — these patterns are statistically abnormal for legitimate DNS usage",
        "DNS tunneling can only be blocked with a next-generation firewall (NGFW)",
        "Implement DNSSEC — it cryptographically signs DNS responses and prevents tunneling",
      ],
      correctIndex: 1,
      explanation: "Blocking all DNS would break everything — browsers, email, virtually every networked application depends on DNS. The behavioral approach works because legitimate DNS has consistent statistical properties: short hostnames, standard A/AAAA/MX/CNAME record types, low query volumes per host. DNS tunneling breaks these norms in measurable ways: subdomains become base64-encoded data blobs (high entropy, unusual length), query rates spike dramatically, and unusual record types (NULL, TXT) are used. These statistical anomalies can be detected without blocking DNS entirely.",
    },
  },
];

const intro = {
  overview: "Packet analysis is a foundational SOC skill. In this lab you'll capture live network traffic, apply display filters to isolate protocols, reconstruct TCP streams, identify cleartext credentials, and detect DNS tunneling — one of the most common covert data exfiltration methods used in the wild.",
  niceCategory: "Analyze",
  objectives: [
    "Capture live packets on a network interface using tcpdump",
    "Apply BPF filters to isolate specific protocols and IP ranges",
    "Use tshark to decode and analyze PCAP files from the command line",
    "Reconstruct TCP sessions to recover cleartext application data",
    "Detect DNS tunneling by identifying high-entropy, oversized DNS queries",
  ],
  outcomes: [
    "Able to capture and save network traffic for offline analysis",
    "Understand Berkeley Packet Filter (BPF) syntax for traffic filtering",
    "Able to extract credentials and sensitive data from unencrypted protocols",
    "Understand how DNS is abused for covert data exfiltration",
    "Able to correlate packet-level data with SIEM and IDS alerts",
  ],
  prerequisites: [
    "Intermediate Linux terminal proficiency",
    "Basic understanding of TCP/IP, DNS, and common network protocols",
    "Completion of Cybersecurity Essentials lab recommended",
  ],
  tools: [
    "tcpdump — packet capture utility with BPF filtering",
    "tshark — Wireshark's command-line packet analyzer",
    "Wireshark — GUI-based network protocol analyzer",
    "strings — extract human-readable text from binary PCAP files",
    "zeek-cut — process Zeek log fields for DNS analysis",
  ],
};

export default function LabNetworkTrafficAnalysis() {
  return (
    <LabRunner
      labTitle="Network Traffic Analysis"
      chapterNum="8"
      difficulty="Intermediate"
      tags={["tcpdump", "tshark", "Wireshark", "DNS"]}
      terminalLabel="SOC Workstation — tcpdump / tshark (Packet Analysis)"
      duration={55}
      intro={intro}
      steps={steps}
    />
  );
}