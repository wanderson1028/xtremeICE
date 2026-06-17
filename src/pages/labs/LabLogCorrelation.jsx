import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    label: "Deploy Centralized Log Collector",
    command: "sudo apt install -y filebeat && sudo filebeat modules enable system nginx && sudo filebeat setup && sudo systemctl start filebeat",
    expectedOutput: "Modules enabled: system, nginx | Index templates loaded | filebeat.service started",
    hint: "Install Filebeat and enable the system and nginx modules to begin log shipping.",
    securityInsight: "Centralized log collection is foundational for threat detection. Logs stored only on the originating host can be deleted by attackers. Shipping to a SIEM in real time provides a tamper-resistant audit trail.",
  },
  {
    label: "Ingest Authentication Logs",
    command: "sudo grep 'Failed password' /var/log/auth.log | awk '{print $1,$2,$3,$9,$11}' | sort | uniq -c | sort -rn | head -20",
    expectedOutput: "247 Jun 15 03:21 root 192.168.1.105\n189 Jun 15 03:21 admin 192.168.1.105\n134 Jun 15 03:22 ubuntu 192.168.1.105",
    hint: "Parse auth.log to identify repeated failed SSH login attempts per source IP.",
    securityInsight: "247 failed attempts for 'root' from a single IP in under a minute is a textbook brute-force attack. The consistent source IP (192.168.1.105) is the primary IoC and should be blocked immediately.",
  },
  {
    label: "Write Correlation Rule",
    command: "cat /etc/ossec/rules/local_rules.xml | grep -A10 'brute_force'",
    expectedOutput: "<rule id='100010' level='10'><if_matched_sid>5710</if_matched_sid><same_source_ip/><description>SSH Brute Force: 10+ failures from same IP</description></rule>",
    hint: "View the correlation rule that fires when 10+ failed SSH logins come from the same source IP.",
    securityInsight: "Correlation rules reduce noise by combining individual low-fidelity events into high-fidelity alerts. A single failed login is noise; 10 failures in 60 seconds from one IP is a high-confidence attack.",
  },
  {
    label: "Build Detection Dashboard",
    command: "curl -X POST 'http://localhost:5601/api/saved_objects/dashboard' -H 'kbn-xsrf: true' -d '{\"attributes\":{\"title\":\"Auth Brute Force Monitor\",\"panelsJSON\":\"[{\\\"type\\\":\\\"visualization\\\"}]\"}}' | jq '.id'",
    expectedOutput: "Dashboard created: auth-bruteforce-monitor-001",
    hint: "Create a Kibana dashboard to visualize failed authentication attempts over time.",
    securityInsight: "Dashboards turn raw log data into actionable intelligence. A real-time view of authentication failures allows SOC analysts to spot attacks within seconds rather than hours.",
  },
  {
    label: "Automate IP Block Response",
    command: "sudo fail2ban-client set sshd banip 192.168.1.105 && sudo fail2ban-client status sshd",
    expectedOutput: "Banned: 192.168.1.105 | Status sshd: Currently banned: 1 | IP list: 192.168.1.105",
    hint: "Use fail2ban to automatically block the attacking IP after the correlation rule fires.",
    securityInsight: "Automated response (SOAR) closes the gap between detection and containment. Fail2ban reads logs and updates iptables rules in real time — manual processes are too slow for high-volume brute-force attacks.",
  },
];

export default function LabLogCorrelation() {
  return (
    <LabRunner
      title="Log Aggregation & Correlation"
      difficulty="Intermediate"
      duration={65}
      category="Analyze"
      tags={["Filebeat", "Elastic", "fail2ban", "SIEM", "Correlation Rules"]}
      objectives={[
        "Deploy Filebeat for centralized log collection and shipping",
        "Parse authentication logs to identify brute-force patterns",
        "Write and validate a custom SIEM correlation rule",
        "Build a real-time detection dashboard in Kibana",
        "Automate IP blocking in response to triggered alerts",
      ]}
      prerequisites={["Basic Linux administration", "Familiarity with log formats"]}
      steps={steps}
    />
  );
}