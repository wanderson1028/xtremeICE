import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Check service status",
    explanation: "Monitoring alerted that Nginx is down. First, check the service status to understand the current state and see any error messages.",
    whyItMatters: "systemctl status gives you the service state, recent log entries, and the PID — all the initial context you need before taking action.",
    securityInsight: "Failed services with 'bind() failed' errors are an early sign of port conflicts — but can also indicate a rootkit or malware that started before the legitimate service and grabbed the port (MITRE T1205 — Traffic Signaling). Always investigate what took the port before assuming it's benign.",
    prompt: "ubuntu@webserver:~$",
    command: "systemctl status nginx",
    output: [
      "● nginx.service - A high performance web server and a reverse proxy server",
      "     Loaded: loaded (/lib/systemd/system/nginx.service; disabled; vendor preset: enabled)",
      "     Active: failed (Result: exit-code) since Mon 2026-06-09 06:00:14 UTC; 23min ago",
      "    Process: 14821 ExecStartPre=/usr/sbin/nginx -t (code=exited, status=1/FAILURE)",
      "",
      "Jun 09 06:00:14 webserver nginx[14821]: nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)",
      "Jun 09 06:00:14 webserver nginx[14821]: nginx: configuration file /etc/nginx/nginx.conf test failed",
      "Jun 09 06:00:14 webserver systemd[1]: nginx.service: Control process exited with error code.",
      "Jun 09 06:00:14 webserver systemd[1]: Failed to start A high performance web server.",
    ],
    nextStepDirections: "Nginx failed because port 80 is already in use. Another process grabbed the port during startup. Check what's using port 80 — then kill it so Nginx can bind.",
  },
  {
    stepLabel: "Find what's using port 80",
    explanation: "Use ss to find which process is occupying port 80 and preventing Nginx from starting.",
    whyItMatters: "You can't just kill a random process — you need to identify it first. ss -tlnp gives you the PID and process name alongside port information.",
    securityInsight: "This exact technique — ss -tlnp | grep :<port> — is used in incident response to identify malicious listeners. Attackers frequently set up backdoors on common ports like 80, 443, or 8080 to blend in with legitimate web traffic (MITRE T1049 — System Network Connections Discovery).",
    prompt: "ubuntu@webserver:~$",
    command: "ss -tlnp | grep :80",
    output: [
      "LISTEN  0  128  0.0.0.0:80  0.0.0.0:*  users:((\"apache2\",pid=12483,fd=4))",
    ],
    nextStepDirections: "Apache2 (pid 12483) is running on port 80. This is a conflict — both Apache and Nginx can't use port 80. Stop Apache to free the port for Nginx.",
  },
  {
    stepLabel: "Stop the conflicting process",
    explanation: "Stop the Apache2 service that's holding port 80 hostage so Nginx can start properly.",
    whyItMatters: "Port conflicts are a common cause of service failures after reboots or updates. Identifying and resolving them cleanly prevents future occurrences.",
    securityInsight: "Before stopping a service, confirm it's legitimate. In this case Apache2 is a known web server. But in the real world, a process named with a subtle typo (e.g., 'apachee2' or 'ngnix') holding a well-known port is a red flag for a masquerading malware process (MITRE T1036).",
    prompt: "ubuntu@webserver:~$",
    command: "sudo systemctl stop apache2",
    output: [
      "# Stopping apache2 (via systemctl): apache2.service...",
      "#   ...done.",
      "# Port 80 is now free.",
    ],
    nextStepDirections: "Apache stopped. Now start Nginx — it should be able to bind to port 80 successfully this time.",
  },
  {
    stepLabel: "Start Nginx",
    explanation: "Start the Nginx service now that the port conflict is resolved.",
    whyItMatters: "Starting a service after fixing its root cause is always safer than a simple restart — it gives you a clean state.",
    securityInsight: "Always check the nginx.conf before starting in production — a misconfigured server_name or proxy_pass can expose internal services. The config test (nginx -t) that runs automatically during start is your safety net, but it doesn't catch logical misconfigurations.",
    prompt: "ubuntu@webserver:~$",
    command: "sudo systemctl start nginx",
    output: [
      "# Starting nginx (via systemctl): nginx.service...",
      "#   nginx: the configuration file /etc/nginx/nginx.conf syntax is ok",
      "#   nginx: configuration file /etc/nginx/nginx.conf test is successful",
      "#   ...done.",
    ],
    nextStepDirections: "No error output — that's good. Verify the service is actually running and check recent logs to confirm it started cleanly.",
  },
  {
    stepLabel: "Confirm Nginx is running",
    explanation: "Check Nginx status again to confirm it's in the 'active (running)' state.",
    whyItMatters: "A successful start command doesn't always mean the service stayed up. Always confirm the running state explicitly.",
    securityInsight: "The 'disabled' flag in the output is a security concern beyond just availability — a disabled service that only runs when manually started can be missed during automated security scans and patch audits. Enable it to ensure it's consistently tracked.",
    prompt: "ubuntu@webserver:~$",
    command: "systemctl status nginx",
    output: [
      "● nginx.service - A high performance web server and a reverse proxy server",
      "     Loaded: loaded (/lib/systemd/system/nginx.service; disabled; vendor preset: enabled)",
      "     Active: active (running) since Mon 2026-06-09 06:24:52 UTC; 5s ago",
      "    Process: 15240 ExecStartPre=/usr/sbin/nginx -t (code=exited, status=0/SUCCESS)",
      "   Main PID: 15241 (nginx)",
      "      Tasks: 2 (limit: 2310)",
      "     Memory: 2.8M",
      "        CPU: 28ms",
      "",
      "Jun 09 06:24:52 webserver systemd[1]: Starting A high performance web server...",
      "Jun 09 06:24:52 webserver systemd[1]: Started A high performance web server.",
    ],
    nextStepDirections: "Nginx is active and running. But it's showing 'disabled' — meaning it won't start automatically if the server reboots. Fix that now.",
  },
  {
    stepLabel: "Enable Nginx on boot",
    explanation: "Use systemctl enable to make Nginx start automatically every time the server boots.",
    whyItMatters: "A service that doesn't start on boot will cause an outage after every server restart. Enabling auto-start is a critical post-recovery step.",
    securityInsight: "Attackers abuse systemctl enable to persist malicious services across reboots (MITRE T1543.002 — Create or Modify System Process: Systemd Service). Audit /etc/systemd/system/ regularly for unexpected service unit files — they're a common persistence mechanism.",
    prompt: "ubuntu@webserver:~$",
    command: "sudo systemctl enable nginx",
    output: [
      "Synchronizing state of nginx.service with SysV service script with /lib/systemd/systemd-sysv-install.",
      "Executing: /lib/systemd/systemd-sysv-install enable nginx",
      "Created symlink /etc/systemd/system/multi-user.target.wants/nginx.service → /lib/systemd/system/nginx.service.",
    ],
    nextStepDirections: "Auto-start symlink created. Validate the HTTP response to confirm users can actually access the website again.",
  },
  {
    stepLabel: "Validate HTTP response",
    explanation: "Use curl to send an HTTP request to localhost and confirm Nginx returns a 200 OK status code.",
    whyItMatters: "Confirming an HTTP 200 proves the full stack is working — not just the service, but also the config and port binding.",
    securityInsight: "HTTP status codes are critical in security monitoring. A 200 where you expect a 403 can mean an access control bypass. A sudden spike in 500 errors can indicate a SQL injection attack. Monitoring HTTP status codes via your web server logs is a key detection strategy.",
    prompt: "ubuntu@webserver:~$",
    command: "curl -s -o /dev/null -w \"%{http_code}\" http://localhost",
    output: [
      "200",
    ],
    nextStepDirections: "HTTP 200 confirmed. The web server is fully restored and will survive a reboot.",
    finalGoal: "Nginx restored: port conflict with Apache resolved, service running and enabled for auto-start, HTTP 200 confirmed.",
  },
];

export default function LabServices() {
  return (
    <LabRunner
      labTitle="Linux Service Management"
      chapterNum="2.2"
      difficulty="Intermediate"
      tags={["systemd", "nginx", "services", "incident"]}
      duration={35}
      terminalLabel="ubuntu@webserver:~"
      intro={{
        overview: "SCENARIO: You're on call and an alert fires at 6am — Nginx is down and the company website is unreachable. You SSH into the web server and need to diagnose why Nginx failed, resolve the root cause, restore service, and ensure it won't happen again after the next reboot.",
        outcomes: [
          "Diagnose service failures using systemctl and journalctl",
          "Identify and resolve port conflicts",
          "Start and enable services with systemd",
          "Validate recovery with curl",
        ],
        prerequisites: ["Basic command line usage", "Understanding of ports and services"],
        tools: ["systemctl", "ss", "curl", "journalctl"],
      }}
      steps={steps}
    />
  );
}