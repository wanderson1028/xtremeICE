import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Check system load",
    explanation: "Users are reporting the app server is slow. Start with uptime to see the system load averages over the last 1, 5, and 15 minutes.",
    whyItMatters: "Load averages above the number of CPU cores indicate the system is overloaded. This is the fastest way to confirm a performance problem.",
    securityInsight: "Unexpectedly high CPU load on a server with no known workload change can indicate cryptomining malware (MITRE T1496 — Resource Hijacking). Cryptominers consume 80-100% CPU continuously — uptime load averages often expose this before any other alert fires.",
    prompt: "ubuntu@appserver:~$",
    command: "uptime",
    output: [
      " 09:14:52 up 14 days,  3:22,  2 users,  load average: 7.82, 6.41, 5.03",
    ],
    nextStepDirections: "Load average of 7.82 on what appears to be a standard 4-core VM is very high (ideally should be < 4). The server is CPU-bound. Check memory next — high load can also come from memory exhaustion causing swap thrashing.",
  },
  {
    stepLabel: "Check memory usage",
    explanation: "Use free -h to see physical RAM and swap usage in human-readable units.",
    whyItMatters: "If RAM is exhausted and the system is using swap disk space, it dramatically slows everything down. This is a common cause of high load averages.",
    securityInsight: "Memory exhaustion can be triggered deliberately via a DoS attack — an attacker sends requests that cause the application to allocate large amounts of memory until the system crashes (MITRE T1499 — Endpoint Denial of Service). Monitoring memory trends helps distinguish attacks from legitimate load spikes.",
    prompt: "ubuntu@appserver:~$",
    command: "free -h",
    output: [
      "               total        used        free      shared  buff/cache   available",
      "Mem:           7.7Gi       7.4Gi       128Mi       244Mi       312Mi       128Mi",
      "Swap:          2.0Gi       1.8Gi       204Mi",
    ],
    nextStepDirections: "Memory nearly exhausted (7.4/7.7GB used) and swap is 90% full (1.8/2.0GB). The system is severely memory-starved. Check disk space next, then identify which processes are consuming the memory.",
  },
  {
    stepLabel: "Check disk space",
    explanation: "Use df -h to check all mounted filesystems for disk usage. A full disk can also cause performance degradation and failures.",
    whyItMatters: "A disk at 100% capacity will prevent new writes, crash databases, and stop logging. It must be ruled out alongside CPU and memory issues.",
    securityInsight: "Attackers intentionally fill disks to stop logging — if /var/log fills up, security events stop being written to disk, blinding your SIEM (MITRE T1485 — Data Destruction / T1070). Disk space monitoring and log rotation are critical detective controls.",
    prompt: "ubuntu@appserver:~$",
    command: "df -h",
    output: [
      "Filesystem      Size  Used Avail Use% Mounted on",
      "udev            3.9G     0  3.9G   0% /dev",
      "tmpfs           786M  1.4M  785M   1% /run",
      "/dev/sda1        49G   41G  5.6G  88% /",
      "tmpfs           3.9G  244M  3.7G   6% /dev/shm",
      "tmpfs           5.0M     0  5.0M   0% /run/lock",
    ],
    nextStepDirections: "Disk is 88% full — not critical yet but worth monitoring. Memory is the immediate problem. Find the top CPU consumers to narrow down the culprit process.",
  },
  {
    stepLabel: "Find top CPU consumers",
    explanation: "Use ps aux sorted by CPU usage to identify which processes are consuming the most CPU right now.",
    whyItMatters: "Identifying the specific process causing CPU pressure lets you make a targeted decision: kill it, scale it, or fix a bug — rather than blindly rebooting.",
    securityInsight: "ps aux is a primary reconnaissance tool used by attackers post-compromise (MITRE T1057 — Process Discovery). But it's equally powerful for defenders — a process with an unusual name, unexpected user, or suspicious path consuming high CPU is a strong indicator of malware.",
    prompt: "ubuntu@appserver:~$",
    command: "ps aux --sort=-%cpu | head -10",
    output: [
      "USER       PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND",
      "ubuntu   18432 89.4 42.1 2145332 3321456 ?    Sl   07:22  95:14 python3 /opt/app/worker.py",
      "ubuntu   18433 31.2 18.6  945120 1465344 ?    Sl   07:22  33:07 python3 /opt/app/worker.py",
      "ubuntu   18434 12.1  9.4  612400  741200 ?    Sl   07:22  12:54 python3 /opt/app/worker.py",
      "root      1241  0.3  0.1  65436   8120 ?      Ss   Jun01   2:41 /usr/sbin/sshd",
      "ubuntu     892  0.1  0.0  14240   3100 pts/0  Ss   09:10   0:00 -bash",
    ],
    nextStepDirections: "Three worker.py processes are consuming 89%, 31%, and 12% CPU and eating most of the RAM. Check disk usage in /var/log — large log files from these workers may also be filling the disk.",
  },
  {
    stepLabel: "Check log directory sizes",
    explanation: "Use du -sh to see the sizes of individual items in /var/log and find any oversized log files.",
    whyItMatters: "Runaway application logging is a common issue. Log files that grow unchecked can fill disks and slow I/O for everything on the system.",
    securityInsight: "A 14GB log file is both a performance problem and a forensic goldmine. In incident response, oversized logs often contain the entire attack timeline. Before truncating or rotating logs, always preserve a copy — it may be required as evidence (chain of custody matters).",
    prompt: "ubuntu@appserver:~$",
    command: "du -sh /var/log/*",
    output: [
      "4.0K    /var/log/alternatives.log",
      "12K     /var/log/apt",
      "48K     /var/log/auth.log",
      "4.0K    /var/log/dpkg.log",
      "8.0K    /var/log/kern.log",
      "8.0K    /var/log/nginx",
      "4.0K    /var/log/syslog",
      "14G     /var/log/worker_debug.log",
      "8.0K    /var/log/wtmp",
    ],
    nextStepDirections: "worker_debug.log is 14GB — that's the disk culprit. This explains both the disk usage and likely the CPU/memory pressure from excessive debug logging. Check the last few lines to confirm what's being logged.",
  },
  {
    stepLabel: "Inspect the runaway log",
    explanation: "Use tail to view the most recent entries in the oversized worker debug log to understand what's being written.",
    whyItMatters: "Before truncating or deleting a log file, you need to understand what it contains. It may hold evidence of the root cause.",
    securityInsight: "DEBUG-level logging in production is a significant security risk beyond just performance. Debug logs often include sensitive data: request parameters, authentication tokens, database queries, and internal IP addresses — all valuable to an attacker who gains log access (CWE-532 — Insertion of Sensitive Information into Log File).",
    prompt: "ubuntu@appserver:~$",
    command: "tail -20 /var/log/worker_debug.log",
    output: [
      "2026-06-09 09:14:48 DEBUG processing item 4721891",
      "2026-06-09 09:14:48 DEBUG processing item 4721892",
      "2026-06-09 09:14:48 DEBUG processing item 4721893",
      "2026-06-09 09:14:48 DEBUG processing item 4721894",
      "2026-06-09 09:14:48 DEBUG processing item 4721895",
      "2026-06-09 09:14:48 DEBUG processing item 4721896",
      "2026-06-09 09:14:48 DEBUG processing item 4721897",
      "2026-06-09 09:14:48 DEBUG processing item 4721898",
      "2026-06-09 09:14:48 DEBUG processing item 4721899",
      "2026-06-09 09:14:48 DEBUG processing item 4721900",
    ],
    nextStepDirections: "The workers are logging every single item they process — millions of DEBUG lines per hour. Root cause confirmed. Document your findings: runaway debug logging filling disk, exhausting memory, saturating CPU.",
    finalGoal: "Root cause identified: worker.py running with DEBUG logging enabled — generating 14GB of logs, exhausting RAM and CPU. Fix: disable debug logging and truncate the log file.",
  },
];

export default function LabSysadmin() {
  return (
    <LabRunner
      labTitle="System Administration & Diagnostics"
      chapterNum="2.4"
      difficulty="Intermediate"
      tags={["sysadmin", "performance", "monitoring", "diagnosis"]}
      duration={40}
      terminalLabel="ubuntu@appserver:~"
      intro={{
        overview: "SCENARIO: It's 9am and your Slack is blowing up — the application server is extremely slow and users can't get work done. You SSH in and need to systematically diagnose the bottleneck. Work through CPU, memory, disk, and processes to find the root cause before escalating to the dev team.",
        outcomes: [
          "Assess system health with uptime, free, and df",
          "Identify top CPU and memory consumers with ps",
          "Find disk space hogs with du",
          "Correlate multiple diagnostic signals into a root cause",
        ],
        prerequisites: ["Basic command line usage", "Understanding of processes and resources"],
        tools: ["uptime", "free", "df", "ps", "du", "tail"],
      }}
      steps={steps}
    />
  );
}