import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    label: "Deploy EDR Agent",
    command: "sudo apt install wazuh-agent && sudo systemctl start wazuh-agent",
    expectedOutput: "wazuh-agent.service started successfully",
    hint: "Install the Wazuh EDR agent and verify the service is running.",
    securityInsight: "EDR agents run at kernel level to capture syscalls, file events, and network connections in real time. They're the cornerstone of modern endpoint visibility.",
  },
  {
    label: "Simulate Malicious Process",
    command: "sudo bash -c 'echo \"/tmp/c2beacon &\" >> /etc/rc.local && chmod +x /etc/rc.local'",
    expectedOutput: "Persistence mechanism written to /etc/rc.local",
    hint: "Simulate a persistence technique attackers use to survive reboots.",
    securityInsight: "Writing to rc.local is a classic Linux persistence technique (MITRE ATT&CK T1037.004). EDR rules should alert on modifications to startup files.",
  },
  {
    label: "Detect Suspicious Activity",
    command: "sudo cat /var/ossec/logs/alerts/alerts.log | grep -i 'rc.local'",
    expectedOutput: "Rule: 550 (level 7) - 'Integrity checksum changed for /etc/rc.local'",
    hint: "Check the Wazuh alert log to confirm the EDR flagged the persistence mechanism.",
    securityInsight: "File Integrity Monitoring (FIM) detects unauthorized changes to critical system files. A level 7+ alert warrants immediate investigation.",
  },
  {
    label: "Isolate the Endpoint",
    command: "sudo iptables -I INPUT -j DROP && sudo iptables -I OUTPUT -j DROP && sudo iptables -I INPUT -s 192.168.1.1 -j ACCEPT",
    expectedOutput: "iptables: Applying rules...",
    hint: "Isolate the host by dropping all traffic except the management console IP.",
    securityInsight: "Network isolation (containment) is the first step in the NIST IR lifecycle after detection. It prevents lateral movement while preserving forensic state.",
  },
  {
    label: "Generate Incident Report",
    command: "sudo /var/ossec/bin/agent_control -l && sudo wazuh-logtest",
    expectedOutput: "Agent: 001 - Status: Active | Alerts generated: 3 | Risk level: HIGH",
    hint: "Run the Wazuh control command to list agent status and summarize alerts.",
    securityInsight: "Incident reports must capture IoCs, affected assets, timeline, and containment actions. This data feeds into threat intelligence platforms for future prevention.",
  },
];

export default function LabEndpointDetection() {
  return (
    <LabRunner
      title="Endpoint Detection & Response"
      difficulty="Intermediate"
      duration={60}
      category="Protect and Defend"
      tags={["Wazuh", "EDR", "FIM", "Containment", "MITRE ATT&CK"]}
      objectives={[
        "Deploy and configure an EDR agent on a Linux endpoint",
        "Simulate a persistence-based threat and trigger detection alerts",
        "Perform endpoint isolation using network-level containment",
        "Generate a structured incident summary from EDR telemetry",
      ]}
      prerequisites={["Basic Linux command line", "Understanding of systemd services"]}
      steps={steps}
    />
  );
}