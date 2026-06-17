import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Check the log file size",
    explanation: "The web app went down at 3am. You need to investigate the logs. Start by checking how many lines are in the log file to gauge the scope.",
    whyItMatters: "Knowing the log size tells you how far back the data goes and whether you'll need to filter aggressively or can review more broadly.",
    securityInsight: "Log file size anomalies are an indicator of compromise. A log that's much smaller than usual may indicate log tampering or deletion (MITRE T1070.002 — Clear Linux or Mac System Logs). Always check file size and modification timestamps early in an investigation.",
    prompt: "analyst@server:~$",
    command: "wc -l /var/log/webapp.log",
    output: [
      "2847 /var/log/webapp.log",
    ],
    nextStepDirections: "2,847 lines — too many to read manually. Check the most recent entries first to understand the current state of the application.",
  },
  {
    stepLabel: "View recent log entries",
    explanation: "Use tail to view the last 20 lines of the log. This shows what was happening right before and after the outage.",
    whyItMatters: "tail shows you the most recent events — usually the most relevant data when diagnosing a live or recent outage.",
    securityInsight: "tail -f (follow mode) is used in real-time monitoring to watch live log streams for attack activity. In active incident response, analysts tail logs while an attack is ongoing to track adversary behavior in real time.",
    prompt: "analyst@server:~$",
    command: "tail -20 /var/log/webapp.log",
    output: [
      "2026-06-09 02:58:11 INFO  Request handled in 142ms",
      "2026-06-09 02:58:44 INFO  Request handled in 138ms",
      "2026-06-09 02:59:02 ERROR Database connection pool exhausted",
      "2026-06-09 02:59:03 ERROR Database connection pool exhausted",
      "2026-06-09 02:59:04 ERROR Failed to acquire DB connection after 30s",
      "2026-06-09 02:59:04 CRITICAL Application entering emergency shutdown mode",
      "2026-06-09 02:59:05 CRITICAL All workers terminated",
      "2026-06-09 02:59:05 INFO  Shutdown complete",
      "2026-06-09 03:00:00 INFO  Application starting...",
      "2026-06-09 03:00:02 INFO  Connected to database",
      "2026-06-09 03:00:03 INFO  Listening on port 8080",
      "2026-06-09 03:00:03 INFO  Ready to accept connections",
    ],
    nextStepDirections: "You can see DB connection errors right at 2:59am. Use grep to extract ALL error lines from the full log to build a complete picture.",
  },
  {
    stepLabel: "Extract all ERROR lines",
    explanation: "Use grep to search the entire log file for lines containing 'ERROR' and display them.",
    whyItMatters: "grep is the standard tool for finding patterns in text files. It can scan millions of lines in seconds.",
    securityInsight: "grep is a primary tool in log-based threat hunting. Security analysts use grep to extract authentication failures, privilege escalations, and suspicious command executions from logs. SIEM platforms essentially automate grep-like pattern matching at massive scale.",
    prompt: "analyst@server:~$",
    command: "grep \"ERROR\" /var/log/webapp.log",
    output: [
      "2026-06-09 01:45:22 ERROR Slow query detected: 8200ms on users table",
      "2026-06-09 02:15:09 ERROR Slow query detected: 9100ms on users table",
      "2026-06-09 02:44:33 ERROR Database connection pool exhausted",
      "2026-06-09 02:51:18 ERROR Database connection pool exhausted",
      "2026-06-09 02:55:47 ERROR Database connection pool exhausted",
      "2026-06-09 02:59:02 ERROR Database connection pool exhausted",
      "2026-06-09 02:59:03 ERROR Database connection pool exhausted",
      "2026-06-09 02:59:04 ERROR Failed to acquire DB connection after 30s",
    ],
    nextStepDirections: "You can see a clear escalation: slow queries started at 1:45am, then the connection pool started failing. Count the total errors to quantify the impact.",
  },
  {
    stepLabel: "Count the total errors",
    explanation: "Pipe the grep output into wc -l to count how many error events occurred in total.",
    whyItMatters: "Counting errors gives you a metric for the incident report and helps you detect similar patterns in the future.",
    securityInsight: "Quantifying events is essential for incident reporting and SLA compliance. A spike from 0 errors/hour to 8 errors/hour may seem small, but paired with a service outage, it's significant evidence. SIEMs use event counts to trigger threshold-based alerts.",
    prompt: "analyst@server:~$",
    command: "grep \"ERROR\" /var/log/webapp.log | wc -l",
    output: [
      "8",
    ],
    nextStepDirections: "8 error events. Now find the CRITICAL events — those represent the point of failure and are the most important for root cause analysis.",
  },
  {
    stepLabel: "Find CRITICAL events",
    explanation: "Search for CRITICAL-level log entries to identify the exact moment and reason for the service failure.",
    whyItMatters: "CRITICAL events typically indicate system failures that caused user impact. They are the heart of the root cause analysis.",
    securityInsight: "In a security context, CRITICAL log events often correspond to authentication failures, access denials, or integrity violations. Many compliance frameworks require CRITICAL events to be retained for 12+ months and reviewed within 24 hours of occurrence.",
    prompt: "analyst@server:~$",
    command: "grep \"CRITICAL\" /var/log/webapp.log",
    output: [
      "2026-06-09 02:59:04 CRITICAL Application entering emergency shutdown mode",
      "2026-06-09 02:59:05 CRITICAL All workers terminated",
    ],
    nextStepDirections: "Two critical events at 02:59:04-05. The root cause is clear: database connection pool exhausted → emergency shutdown. Now use awk to analyze the timeline by hour.",
  },
  {
    stepLabel: "Analyze event frequency by hour",
    explanation: "Use awk to extract the hour from each log timestamp, then sort and count them to see when activity spiked.",
    whyItMatters: "Understanding when an issue started helps identify if it was a sudden event (attack, deployment) or a gradual degradation (memory leak, load increase).",
    securityInsight: "Time-based log analysis is a core DFIR (Digital Forensics and Incident Response) technique. Unusual activity outside business hours (e.g., 2am spikes) is a strong indicator of automated attacks or compromised accounts being used by threat actors in different time zones.",
    prompt: "analyst@server:~$",
    command: "awk '{print substr($2,1,2)}' /var/log/webapp.log | sort | uniq -c | sort -rn",
    output: [
      "    842 02",
      "    756 03",
      "    621 01",
      "    410 00",
      "    218 23",
    ],
    nextStepDirections: "The spike is clear — 842 events at 02:xx compared to normal 400-600/hour. Combined with your grep findings, you have everything needed for a complete incident report.",
    finalGoal: "Root cause identified: DB connection pool exhaustion at 02:59am, preceded by slow query degradation since 01:45am. Event spike confirmed via log frequency analysis.",
  },
];

export default function LabText() {
  return (
    <LabRunner
      labTitle="Linux Text Processing"
      chapterNum="1.5"
      difficulty="Beginner"
      tags={["grep", "awk", "logs", "incident"]}
      duration={30}
      terminalLabel="analyst@server:~"
      intro={{
        overview: "SCENARIO: The monitoring system paged you at 3am — the web app went down and users are locked out. The application recovered on its own, but your manager wants a root cause report by 8am. Your job is to dig through /var/log/webapp.log and find exactly what happened and when.",
        outcomes: [
          "Use wc and tail to orient yourself in large log files",
          "Filter log entries with grep",
          "Count and quantify events",
          "Extract and analyze time-based patterns with awk",
        ],
        prerequisites: ["Basic command line usage"],
        tools: ["wc", "tail", "grep", "awk", "sort", "uniq"],
      }}
      steps={steps}
    />
  );
}