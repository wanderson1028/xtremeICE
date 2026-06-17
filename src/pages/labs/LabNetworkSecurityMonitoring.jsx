import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Check Suricata alert logs",
    explanation: "Inspect Suricata's eve.json alert log to review IDS alerts generated from network traffic. Suricata is an open-source intrusion detection and prevention system.",
    whyItMatters: "Suricata correlates traffic against thousands of threat signatures in real time. Reading its alerts is a core daily task for SOC analysts — it's the first layer of automated threat detection.",
    command: "cat /var/log/suricata/eve.json | jq 'select(.event_type==\"alert\")' | head -30",
    prompt: "analyst@soc:~$",
    output: [
      '{  "timestamp": "2026-06-03T10:14:23.123Z",',
      '   "event_type": "alert",',
      '   "src_ip": "192.168.1.200",',
      '   "dest_ip": "192.168.1.105",',
      '   "dest_port": 4444,',
      '   "alert": {',
      '     "signature": "ET TROJAN Meterpreter Reverse TCP Session",',
      '     "severity": 1,',
      '     "category": "A Network Trojan was detected"',
      "   }",
      "}",
      "",
      "[!] Severity 1 alert: Meterpreter reverse shell detected on port 4444",
    ],
    question: {
      text: "The alert is severity 1 (highest). What is the correct SOC analyst response upon seeing a 'Meterpreter Reverse TCP Session' alert?",
      options: [
        "Log the alert in the ticketing system and review it during the next daily standup",
        "Immediately escalate as a P1 incident: isolate the destination host (192.168.1.105) from the network, begin forensic preservation, notify the incident response team, and trace the source IP — active Meterpreter means an attacker has live interactive access",
        "Verify the alert is not a false positive by waiting for a second alert from the same source",
        "Block port 4444 on the firewall and mark the alert as resolved",
      ],
      correctIndex: 1,
      explanation: "A Meterpreter reverse shell means an attacker has a live, interactive command prompt on the target with the ability to run arbitrary commands, upload tools, escalate privileges, and pivot to other hosts — in real time. Waiting even minutes means the attacker can dump credentials, establish persistence, and exfiltrate data. The P1 response (isolate immediately) is driven by the fact that the attacker is actively present and every second of delay expands the damage radius.",
    },
  },
  {
    stepLabel: "Query Zeek connection logs",
    explanation: "Use Zeek's conn.log to get a high-level view of all network connections, including duration, bytes transferred, and connection state.",
    whyItMatters: "Zeek provides rich network metadata without storing full packet payloads. This metadata-first approach scales to high-speed networks and is the backbone of many enterprise NSM deployments.",
    command: "zeek-cut id.orig_h id.resp_h id.resp_p duration orig_bytes resp_bytes conn_state < /var/log/zeek/conn.log | sort -k5 -rn | head -10",
    prompt: "analyst@soc:~$",
    output: [
      "id.orig_h       id.resp_h        port   dur       orig_b    resp_b    state",
      "192.168.1.105   185.220.101.47   4444   3847.2    2847392   98234512  SF",
      "192.168.1.200   192.168.1.105    445    12.4      45213     891234    SF",
      "192.168.1.100   8.8.8.8          53     0.002     128       256       SF",
      "192.168.1.1     192.168.1.0      80     0.08      512       8192      SF",
      "",
      "[!] 192.168.1.105 → 185.220.101.47:4444 transferred 98 MB over 64 min — data exfiltration likely",
    ],
    question: {
      text: "The Zeek log shows 98 MB transferred outbound to 185.220.101.47 over 64 minutes. What does the 'SF' connection state indicate, and why is the data volume significant?",
      options: [
        "SF means 'Security Filtered' — the firewall blocked most of the connection",
        "SF means the connection completed normally (normal SYN-SYN_ACK-FIN teardown) — 98 MB of completed outbound transfer to a suspicious IP strongly indicates successful data exfiltration, not just a brief C2 check-in",
        "SF indicates a split connection that was interrupted by a network error",
        "SF means the source host was scanned, not that it was the initiator of the connection",
      ],
      correctIndex: 1,
      explanation: "In Zeek's conn.log, 'SF' stands for 'normal SYN-SYN_ACK-FIN' — the standard TCP connection teardown, meaning the connection was established, data was exchanged, and it closed cleanly. This is significant because it rules out connection attempts that were blocked or reset. A completed connection that transferred 98 MB outbound to a known-malicious IP over 64 minutes is a textbook data exfiltration pattern — sustained, bidirectional, and successful.",
    },
  },
  {
    stepLabel: "Baseline normal traffic patterns",
    explanation: "Establish a traffic baseline by counting connections per host over a 1-hour window. Anomalies stand out against the baseline.",
    whyItMatters: "Effective NSM depends on knowing what 'normal' looks like. Without a baseline, everything looks suspicious. Baselining enables automated anomaly detection and reduces false positives.",
    command: "zeek-cut id.orig_h < /var/log/zeek/conn.log | sort | uniq -c | sort -rn | head -15",
    prompt: "analyst@soc:~$",
    output: [
      "   4821 192.168.1.100",
      "   3204 192.168.1.1",
      "   1847 192.168.1.105",
      "   1203 192.168.1.80",
      "  18432 192.168.1.200   ← ANOMALY: 4x normal volume",
      "    892 192.168.1.150",
      "",
      "[!] 192.168.1.200 generated 18,432 connections — far above baseline of ~4,000",
      "[*] Indicates scanning, brute force, or beaconing activity",
    ],
    question: {
      text: "192.168.1.200 generated 4x the connection volume of the next highest host. Besides port scanning, what other malicious behavior produces extremely high connection counts?",
      options: [
        "Normal software updates — patch management agents connect to many servers simultaneously",
        "Beaconing malware (connecting to C2 on a timer), credential stuffing attacks, worm propagation, and lateral movement tools like Mimikatz all generate abnormally high connection counts that stand out against baseline",
        "High connection counts only indicate port scanning — no other attack generates this pattern",
        "DNS servers always show the highest connection counts and should be excluded from baselines",
      ],
      correctIndex: 1,
      explanation: "Beaconing malware checks in to C2 at regular intervals, creating periodic connection bursts. Credential stuffing tools try hundreds of accounts per second across many services. Worms propagate by probing every reachable host, generating massive connection volumes. All of these produce anomalous connection counts that stand out against a baseline of normal user or server behavior. Baselining is what separates meaningful anomaly alerts from noise.",
    },
  },
  {
    stepLabel: "Configure Snort detection rule",
    explanation: "Write a custom Snort rule to detect traffic to the known C2 server IP address and generate an alert for the SOC.",
    whyItMatters: "Custom detection rules allow security teams to immediately codify new threat intelligence into their defensive tooling — turning IOCs into automated detections within minutes.",
    command: "echo 'alert tcp any any -> 185.220.101.47 any (msg:\"Known C2 Server Traffic\"; sid:9000001; rev:1;)' >> /etc/snort/rules/local.rules && snort -T -c /etc/snort/snort.conf",
    prompt: "root@soc:~#",
    output: [
      "Running in Test mode",
      "",
      "        --== Initializing Snort ==--",
      "Initializing Output Plugins!",
      "Verifying Preprocessor Configurations!",
      "",
      "        --== Initialization Complete ==--",
      "",
      "Rule application order: pass->drop->sdrop->reject->alert->log",
      "Snort successfully validated the configuration!",
      "",
      "[*] Rule added: sid:9000001 — Known C2 Server Traffic",
      "[*] Snort configuration validated successfully",
    ],
    question: {
      text: "This rule only alerts on traffic to 185.220.101.47. Why would a sophisticated attacker make this rule ineffective without changing their C2 infrastructure?",
      options: [
        "They would use a VPN to hide their real IP address from Snort",
        "They would use domain generation algorithms (DGA), fast-flux DNS, or CDN-fronting to constantly rotate C2 IPs — making static IP-based rules useless; defenders must also use domain-based, behavioral, and JA3 TLS fingerprint rules",
        "They would send traffic over IPv6 where the Snort rule only applies to IPv4",
        "Attackers simply change their C2 port from 4444 to 443 to bypass IP-based rules",
      ],
      correctIndex: 1,
      explanation: "Static IP-based rules are trivially defeated by changing infrastructure. Domain Generation Algorithms (DGAs) programmatically create thousands of pseudo-random domain names daily — only the attacker's C2 knows which one is active, so defenders can't blocklist them all. Fast-flux DNS rotates the IP behind a domain every few minutes. CDN-fronting hides C2 behind legitimate cloud providers' IPs. Defenders must layer domain reputation, behavioral patterns (beacon timing), and JA3 TLS fingerprinting to catch infrastructure-agnostic indicators.",
    },
  },
  {
    stepLabel: "Set up real-time alert notification",
    explanation: "Configure Suricata to forward alerts to a syslog server for SIEM integration using the eve.json unified output format.",
    whyItMatters: "NSM tools are most powerful when integrated with a SIEM. Real-time log forwarding enables correlation with endpoint, authentication, and cloud events — turning isolated alerts into attack timelines.",
    command: "suricata-update && systemctl restart suricata && tail -f /var/log/suricata/eve.json | jq 'select(.event_type==\"alert\") | {time:.timestamp, src:.src_ip, sig:.alert.signature}'",
    prompt: "root@soc:~#",
    output: [
      "Suricata rules updated: 47,823 rules loaded",
      "suricata.service restarted",
      "",
      "Monitoring live alerts...",
      '{',
      '  "time": "2026-06-03T10:31:12.456Z",',
      '  "src": "192.168.1.200",',
      '  "sig": "ET SCAN Nmap Scripting Engine User-Agent Detected"',
      '}',
      '{',
      '  "time": "2026-06-03T10:31:45.789Z",',
      '  "src": "192.168.1.105",',
      '  "sig": "ET TROJAN Meterpreter Reverse TCP Session"',
      '}',
      "",
      "[*] Live monitoring active — alerts streaming to SIEM",
    ],
    question: {
      text: "Two alerts fired 33 seconds apart: first an Nmap scan from .200, then a Meterpreter session from .105. What does this timeline suggest about the attack sequence?",
      options: [
        "These are unrelated events from two different attackers on the same network",
        "The attacker at .200 scanned the network, identified .105 as a target, exploited it within 33 seconds, and established a reverse shell — the Nmap alert was the first indicator of an imminent compromise",
        "The Meterpreter alert is a false positive triggered by legitimate administrative tools",
        "The 33-second gap indicates an automated vulnerability scanner, not a human attacker",
      ],
      correctIndex: 1,
      explanation: "33 seconds is too fast for a human to manually find, exploit, and establish a shell — this is fully automated exploitation. The attacker (or their tool) ran Nmap, identified a vulnerable service on .105, triggered an exploit (likely EternalBlue or a similar pre-staged payload), and got a shell back automatically. The Nmap alert was the leading indicator: seeing it should have triggered immediate network isolation of the target hosts before the exploit completed. This demonstrates why real-time alerting with automated blocking is more effective than human-reviewed alerts.",
    },
  },
];

const intro = {
  overview: "Network Security Monitoring (NSM) is the practice of collecting, detecting, and analyzing network data to identify and respond to intrusions. This lab covers deployment and tuning of three leading open-source NSM tools — Suricata, Zeek, and Snort — used in enterprise SOCs and government security operations centers worldwide.",
  niceCategory: "Protect and Defend",
  objectives: [
    "Deploy and configure Suricata IDS in network monitoring mode",
    "Write and test custom Suricata detection rules for specific threat patterns",
    "Analyze Zeek connection logs and HTTP logs to identify suspicious behavior",
    "Configure Snort with community rulesets and validate alert generation",
    "Correlate IDS alerts with packet captures for incident validation",
  ],
  outcomes: [
    "Able to deploy Suricata as a network-based IDS/IPS",
    "Understand Suricata/Snort rule syntax and able to write custom signatures",
    "Able to use Zeek logs for network behavior analysis and threat hunting",
    "Understand the difference between signature-based and behavior-based detection",
    "Able to tune IDS rules to reduce false positives in a production environment",
  ],
  prerequisites: [
    "Intermediate Linux terminal proficiency",
    "Basic understanding of TCP/IP and common network protocols",
    "Completion of Network Traffic Analysis lab required",
  ],
  tools: [
    "Suricata — high-performance network IDS/IPS/NSM engine",
    "Zeek (formerly Bro) — network analysis framework for behavior-based detection",
    "Snort 3 — industry-standard open-source IDS with community ruleset",
    "suricata-update — rule management and community ruleset updater",
    "jq — JSON processor for parsing Zeek and Suricata log output",
  ],
};

export default function LabNetworkSecurityMonitoring() {
  return (
    <LabRunner
      labTitle="Network Security Monitoring"
      chapterNum="9"
      difficulty="Intermediate"
      tags={["Suricata", "Zeek", "Snort", "NSM"]}
      terminalLabel="NSM Sensor — Suricata / Zeek / Snort"
      duration={65}
      intro={intro}
      steps={steps}
    />
  );
}