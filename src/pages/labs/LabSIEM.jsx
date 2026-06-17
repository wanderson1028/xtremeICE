import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Query Splunk for failed logins",
    explanation: "Run a Splunk search query to find all failed authentication events in the last 24 hours, grouped by source IP.",
    whyItMatters: "Failed login aggregation is one of the most fundamental SIEM use cases. A spike in failures from a single IP is the signature of a brute force attack — a pattern invisible without log aggregation.",
    command: "splunk search 'index=windows EventCode=4625 | stats count by src_ip | sort -count | head 10'",
    prompt: "analyst@siem:~$",
    output: [
      "Splunk Enterprise v9.2.0",
      "Search: index=windows EventCode=4625 | stats count by src_ip | sort -count",
      "",
      "src_ip            count",
      "192.168.1.200     18,432",
      "10.0.0.45         2,841",
      "192.168.1.100     312",
      "192.168.1.1       47",
      "10.0.0.1          12",
      "",
      "[!] 192.168.1.200: 18,432 failed logins — brute force in progress",
    ],
    question: {
      text: "192.168.1.200 generated 18,432 failed logins vs 312 for the next internal host. Why is log aggregation in a SIEM essential to detect this — couldn't each server's own logs show the attack?",
      options: [
        "Individual server logs don't record failed authentication events by default",
        "An attacker brute-forcing across many accounts on many servers generates only a few failures per server — only the SIEM, which aggregates logs from all sources, reveals the full attack volume from a single source IP",
        "Windows servers delete failed login logs after 24 hours to save disk space",
        "SIEMs encrypt log data so it cannot be read by attackers who compromise individual servers",
      ],
      correctIndex: 1,
      explanation: "A distributed brute force attack might try 10 passwords per account spread across 1,000 accounts — each individual server sees only 10 failed logins from that IP, well below any per-server alert threshold. The SIEM sees all 10,000 total failures from that source. This is the fundamental value proposition of log aggregation: visibility that no single system can provide on its own. Without a SIEM, distributed attacks are designed specifically to fly under per-host detection thresholds.",
    },
  },
  {
    stepLabel: "Correlate login with privilege escalation",
    explanation: "Correlate the brute force source IP with subsequent successful logins and privilege escalation events to determine if the attack succeeded.",
    whyItMatters: "Correlation is the SIEM's superpower. Individually, a failed login and a privilege escalation are both suspicious. Together, they tell a complete attack story — from initial access to escalation.",
    command: "splunk search 'index=windows (EventCode=4624 OR EventCode=4672) src_ip=192.168.1.200 | table _time, EventCode, src_ip, TargetUserName, IpAddress'",
    prompt: "analyst@siem:~$",
    output: [
      "_time                  EventCode  src_ip          TargetUserName  IpAddress",
      "2026-06-03 10:31:02    4624       192.168.1.200   jsmith          192.168.1.200",
      "2026-06-03 10:31:05    4672       192.168.1.200   jsmith          192.168.1.200",
      "2026-06-03 10:31:18    4624       192.168.1.200   Administrator   192.168.1.200",
      "2026-06-03 10:31:21    4672       192.168.1.200   Administrator   192.168.1.200",
      "",
      "[!] Brute force succeeded: jsmith compromised, then escalated to Administrator",
      "[!] Timeline: 18,432 failures → success in 2 minutes → privilege escalation in 3 seconds",
    ],
    question: {
      text: "EventCode 4672 (Special Privileges Assigned) fired 3 seconds after the successful login. What does this 3-second gap suggest about how the attacker gained Administrator access?",
      options: [
        "The attacker manually typed escalation commands very quickly",
        "The 3-second gap indicates an automated tool or script was pre-staged — human operators take minutes to manually escalate; near-instant privilege escalation after login suggests the attacker had a prepared exploit or the account was already an admin",
        "4672 fires automatically for all logins and doesn't indicate privilege escalation",
        "The attacker guessed the Administrator password, which is why it took 3 seconds longer",
      ],
      correctIndex: 1,
      explanation: "The 3-second gap between successful login (4624) and special privileges assigned (4672) is the key tell. Manually navigating Windows privilege escalation paths takes at minimum several minutes. A 3-second gap indicates the escalation was scripted or automated — either the account was already a domain admin (and 4672 fires automatically), or a pre-staged local exploit ran immediately. This pattern is typical of tools like Cobalt Strike or Impacket that execute privilege escalation automatically as part of their post-exploitation workflow.",
    },
  },
  {
    stepLabel: "Create SIEM alert rule",
    explanation: "Create a saved search alert in Splunk to automatically trigger when more than 100 failed logins occur from a single IP within 5 minutes.",
    whyItMatters: "Manual log review doesn't scale. Automated alerts let one analyst monitor thousands of systems. Well-tuned alerts fire on real threats and suppress noise — reducing mean time to detect (MTTD).",
    command: "splunk savedsearch create --name 'Brute Force Detection' --search 'index=windows EventCode=4625 | stats count by src_ip | where count>100' --alert-threshold 1 --alert-type 'number of results'",
    prompt: "analyst@siem:~$",
    output: [
      "[*] Saved search created: 'Brute Force Detection'",
      "[*] Schedule: Every 5 minutes",
      "[*] Trigger: count > 100 failed logins per source IP",
      "[*] Actions: Email SOC team, Create ticket in ServiceNow",
      "[*] Suppression: 1 hour (prevent duplicate alerts)",
      "",
      "[*] Alert rule active — brute force will be detected within 5 minutes of onset",
    ],
    question: {
      text: "The threshold is 100 failed logins per IP within 5 minutes. Why is choosing the right threshold critical, and what are the trade-offs of setting it too low vs too high?",
      options: [
        "The threshold only affects how many emails are sent — there are no security trade-offs",
        "Too low (e.g., 5 failures) causes alert fatigue from normal typos and locked accounts; too high (e.g., 10,000 failures) misses slow/distributed brute force attacks — the threshold must balance detection sensitivity against analyst workload and false positive rate",
        "Higher thresholds are always better because they ensure only confirmed attacks trigger alerts",
        "The threshold should match the account lockout policy — alerts are only useful after accounts lock",
      ],
      correctIndex: 1,
      explanation: "Alert thresholds are the central tuning challenge of SIEM deployment. Set too low (5 failures), every employee who mistype their password three times generates a P1 ticket — analysts drown in false positives and start ignoring alerts (alert fatigue). Set too high (10,000), a slow credential spray that tries 1 password per account across 10,000 accounts never triggers. The optimal threshold is determined by baselining normal failure rates per IP in your environment, then setting the alert 3-5x above normal variance.",
    },
  },
  {
    stepLabel: "Query Elastic SIEM for lateral movement",
    explanation: "Use Kibana's SIEM Query Language (EQL) to detect lateral movement via Windows administrative share access (Event 5140).",
    whyItMatters: "Lateral movement via admin shares (ADMIN$, C$) is a classic attacker technique. EQL's sequence queries can detect the specific order of events that indicate lateral movement — not just individual events.",
    command: "curl -k -u elastic:changeme -X POST 'https://localhost:9200/.siem-signals-*/_search' -H 'Content-Type: application/json' -d '{\"query\":{\"match\":{\"signal.rule.name\":\"Lateral Movement via Admin Shares\"}}}'",
    prompt: "analyst@siem:~$",
    output: [
      '{',
      '  "hits": {',
      '    "total": {"value": 3},',
      '    "hits": [',
      '      {"_source": {"source.ip": "192.168.1.200", "destination.ip": "192.168.1.105",',
      '                   "winlog.event_data.ShareName": "\\\\\\\\*\\\\ADMIN$",',
      '                   "@timestamp": "2026-06-03T10:31:30Z"}}',
      "    ]",
      "  }",
      "}",
      "",
      "[!] 3 lateral movement detections via ADMIN$ share — attacker pivoting through network",
    ],
    question: {
      text: "The attacker accessed ADMIN$ shares on multiple hosts. What does lateral movement via administrative shares reveal about the attacker's credentials at this point?",
      options: [
        "The attacker is using a zero-day exploit that bypasses share authentication",
        "Accessing ADMIN$ requires domain administrator or local admin credentials — the attacker has already escalated to admin privileges and is using those credentials (or hashes via Pass-the-Hash) to move laterally across the network",
        "ADMIN$ shares are accessible to all domain users by default",
        "The attacker is using a network scanning tool that doesn't require authentication",
      ],
      correctIndex: 1,
      explanation: "ADMIN$ is a hidden Windows administrative share that provides full access to the C: drive — only domain administrators and local administrators can connect to it. Successfully accessing ADMIN$ on multiple hosts means the attacker has admin credentials (or NTLM hashes for Pass-the-Hash) that are valid across those machines. This credential reuse is why local administrator password uniqueness (tools like Microsoft LAPS) is critical — shared admin passwords allow one compromised credential to unlock the entire domain.",
    },
  },
  {
    stepLabel: "Build SIEM dashboard",
    explanation: "Use Kibana Lens to create a threat overview dashboard showing top alert sources, alert severity over time, and MITRE ATT&CK technique coverage.",
    whyItMatters: "SIEM dashboards give SOC leadership real-time situational awareness. A well-designed dashboard turns millions of log events into actionable intelligence at a glance.",
    command: "curl -k -u elastic:changeme -X POST 'https://localhost:5601/api/saved_objects/dashboard' -H 'kbn-xsrf: true' -H 'Content-Type: application/json' -d '{\"attributes\":{\"title\":\"SOC Threat Overview Dashboard\",\"panels\":[]}}'",
    prompt: "analyst@siem:~$",
    output: [
      '{',
      '  "id": "threat-overview-2026",',
      '  "type": "dashboard",',
      '  "attributes": {',
      '    "title": "SOC Threat Overview Dashboard",',
      '    "description": "Real-time threat detection metrics"',
      "  }",
      "}",
      "",
      "[*] Dashboard created: SOC Threat Overview Dashboard",
      "[*] Panels added: Alert Volume, Top Sources, Severity Timeline, MITRE Coverage",
      "[*] Access at: https://localhost:5601/app/dashboards#/view/threat-overview-2026",
    ],
    question: {
      text: "The dashboard includes a 'MITRE Coverage' panel. Why is mapping detections to the MITRE ATT&CK framework valuable for a SOC team?",
      options: [
        "MITRE ATT&CK is required by all regulatory compliance frameworks",
        "ATT&CK maps known adversary techniques to detection coverage — gaps in the heatmap reveal which attack phases (e.g., Defense Evasion, Exfiltration) have no detections, enabling the team to prioritize new detection rules where coverage is weakest",
        "ATT&CK provides vendor-specific detection signatures that work directly in Splunk",
        "MITRE mapping is only relevant for nation-state threat actors, not common attackers",
      ],
      correctIndex: 1,
      explanation: "The ATT&CK heatmap shows which of the 14 tactics (Initial Access, Persistence, Defense Evasion, Lateral Movement, etc.) have detection rules and which don't. A gap in 'Defense Evasion' means an attacker using obfuscation or log clearing can operate undetected in that phase. A gap in 'Exfiltration' means data theft goes unnoticed. This structured gap analysis transforms 'we need more detections' from vague intent into a specific, prioritized engineering roadmap. It's why ATT&CK is the standard framework for SOC maturity measurement.",
    },
  },
];

const intro = {
  overview: "Security Information and Event Management (SIEM) platforms are the nerve center of modern SOC operations. This lab covers Splunk SPL query writing, alert tuning, dashboard creation, and advanced threat hunting using Elastic EQL — the same skills tested in SOC Analyst certifications and required for Tier 2+ analyst roles.",
  niceCategory: "Analyze",
  objectives: [
    "Write Splunk SPL queries to search, filter, and aggregate security log data",
    "Build detection rules and scheduled alerts for common attack patterns",
    "Create operational dashboards to visualize threat activity across log sources",
    "Use Elastic EQL (Event Query Language) to detect lateral movement sequences",
    "Correlate multi-source events (EDR, firewall, DNS) to reconstruct attack chains",
  ],
  outcomes: [
    "Proficient in SPL for log searching, statistical analysis, and field extraction",
    "Able to create SIEM detection rules with appropriate thresholds and timeframes",
    "Understand how to reduce alert fatigue through tuning and whitelisting",
    "Able to use EQL for sequence-based behavioral detection in Elastic",
    "Able to reconstruct a full attack chain by correlating events across log sources",
  ],
  prerequisites: [
    "Solid Linux terminal proficiency",
    "Understanding of common log formats (Windows Event, Syslog, CEF)",
    "Completion of Network Traffic Analysis and NSM labs required",
    "Completion of Cybersecurity Essentials lab required",
  ],
  tools: [
    "Splunk Enterprise — industry-leading SIEM platform with SPL query language",
    "Splunk CLI — command-line access to search, index management, and alerts",
    "Elastic Stack (ELK) — open-source log aggregation with Kibana and EQL",
    "elasticsearch-cli — Elasticsearch index and query management",
    "sigma — open-source detection rule format for cross-SIEM compatibility",
  ],
};

export default function LabSIEM() {
  return (
    <LabRunner
      labTitle="SIEM Operations & Threat Hunting"
      chapterNum="11"
      difficulty="Advanced"
      tags={["Splunk", "Elastic", "EQL", "Threat Hunting"]}
      terminalLabel="SIEM Console — Splunk / Elastic Stack"
      duration={70}
      intro={intro}
      steps={steps}
    />
  );
}