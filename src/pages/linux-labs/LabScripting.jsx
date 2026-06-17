import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Identify the backup targets",
    explanation: "The ops team manually backs up log files every night. Before automating it, identify exactly which files in /var/log need to be backed up.",
    whyItMatters: "Automation scripts that back up the wrong files — or miss files — can cause silent data loss. Know your targets before scripting.",
    securityInsight: "Security logs (auth.log, kern.log, syslog) are primary targets for attackers who want to cover their tracks. Backing them up to a separate location before tampering occurs is a key forensic preservation step required by many compliance frameworks.",
    prompt: "ubuntu@server:~$",
    command: "ls /var/log/",
    output: [
      "alternatives.log  apt  auth.log  dpkg.log  kern.log",
      "nginx             syslog  syslog.1  ufw.log  wtmp",
    ],
    nextStepDirections: "The key files to back up are syslog, auth.log, and kern.log. Create a destination directory for the backups first.",
  },
  {
    stepLabel: "Create the backup directory",
    explanation: "Create /tmp/log_backups as the destination directory for tonight's backup. The -p flag prevents errors if it already exists.",
    whyItMatters: "Always ensure your destination exists before a script tries to write to it — a missing destination causes the entire backup to fail silently.",
    securityInsight: "Using /tmp as a backup destination is convenient for demos but insecure in production — /tmp is world-writable and cleared on reboot. Real backup destinations should be on dedicated storage with restricted permissions (700) owned by the backup service user.",
    prompt: "ubuntu@server:~$",
    command: "mkdir -p /tmp/log_backups",
    output: [
      "# mkdir: created directory '/tmp/log_backups'",
    ],
    nextStepDirections: "Destination ready. Create the backup script file — use touch to create the empty file first.",
  },
  {
    stepLabel: "Create the script file",
    explanation: "Create an empty file called backup_logs.sh in your home directory. This is the script file you'll build step by step.",
    whyItMatters: "Creating the file first lets you verify it exists and set permissions before adding content — a clean and predictable workflow.",
    securityInsight: "Script files in home directories are readable by the owner but should never contain hardcoded credentials. Before a script touches production systems, it should be reviewed for secret leakage and stored in version control with commit signing enabled.",
    prompt: "ubuntu@server:~$",
    command: "touch ~/backup_logs.sh",
    output: [
      "# Created: /home/ubuntu/backup_logs.sh (0 bytes, no content yet)",
    ],
    nextStepDirections: "File created. Make it executable now — setting the +x bit before adding content ensures it's ready to run as soon as the content is added.",
  },
  {
    stepLabel: "Make the script executable",
    explanation: "Use chmod +x to add execute permission to backup_logs.sh so it can be run as a program.",
    whyItMatters: "Without the execute bit, running ./backup_logs.sh returns 'Permission denied'. Setting it now prevents that confusion later.",
    securityInsight: "chmod +x grants execute to owner, group, AND others by default (equivalent to a+x). For sensitive scripts, prefer chmod 700 or chmod 750 to restrict execution to the owner or a specific group — preventing other users from running your backup scripts.",
    prompt: "ubuntu@server:~$",
    command: "chmod +x ~/backup_logs.sh",
    output: [
      "# mode of '/home/ubuntu/backup_logs.sh' changed to 0755 (-rwxr-xr-x)",
      "# File is now executable.",
    ],
    nextStepDirections: "Executable bit set. Now initialize the script with a shebang line that tells the OS to run it with bash.",
  },
  {
    stepLabel: "Add the shebang line",
    explanation: "Write the shebang (#!/bin/bash) as the first line of the script. This tells the kernel which interpreter to use when running the file.",
    whyItMatters: "Without a shebang, the script may run with the wrong shell or fail entirely. #!/bin/bash ensures consistent behavior across all environments.",
    securityInsight: "The shebang interpreter path is a subtle attack vector — if /bin/bash is replaced with a malicious binary (path hijacking), all scripts using that shebang inherit the compromise. Use absolute paths for all commands within scripts to reduce this risk.",
    prompt: "ubuntu@server:~$",
    command: "echo '#!/bin/bash' > ~/backup_logs.sh",
    output: [
      "# Written to backup_logs.sh:",
      "#!/bin/bash",
    ],
    nextStepDirections: "Shebang written. Append the backup command — copy syslog to the backup dir with a timestamp in the filename.",
  },
  {
    stepLabel: "Add the backup command",
    explanation: "Append a cp command to the script that copies syslog to the backup directory with a date-stamped filename.",
    whyItMatters: "Timestamped filenames prevent newer backups from overwriting older ones — critical for recovering from multi-day incidents.",
    securityInsight: "Timestamped backups are required for forensic integrity. In incident response, being able to compare logs from before and after a breach is critical. Without timestamps, backups overwrite each other and you lose the historical evidence trail.",
    prompt: "ubuntu@server:~$",
    command: "echo 'cp /var/log/syslog /tmp/log_backups/syslog_$(date +%Y%m%d).log' >> ~/backup_logs.sh",
    output: [
      "# Appended to backup_logs.sh:",
      "cp /var/log/syslog /tmp/log_backups/syslog_$(date +%Y%m%d).log",
    ],
    nextStepDirections: "Backup command added. Run the script and verify it actually creates the backup file.",
  },
  {
    stepLabel: "Execute the script",
    explanation: "Run the script with bash to test it. Then check that the backup file was created in /tmp/log_backups/.",
    whyItMatters: "Every script must be tested before being scheduled. An untested script in cron can fail silently for weeks.",
    securityInsight: "Cron jobs running scripts that fail silently are a common gap in backup programs. Production backup scripts should include error handling (set -e), logging, and alerting on failure — so security teams know immediately when log preservation is broken.",
    prompt: "ubuntu@server:~$",
    command: "bash ~/backup_logs.sh",
    output: [
      "# Executing: /home/ubuntu/backup_logs.sh",
      "# Copying /var/log/syslog → /tmp/log_backups/syslog_20260609.log",
      "# Backup complete. (1.4M written)",
    ],
    nextStepDirections: "Script ran without errors. Verify the timestamped backup file was actually created.",
  },
  {
    stepLabel: "Verify the backup was created",
    explanation: "List the contents of /tmp/log_backups/ to confirm the script produced a date-stamped backup file.",
    whyItMatters: "A script that runs without errors but produces no output is a silent failure. Always verify the artifact was created.",
    securityInsight: "Backup verification is a compliance requirement under PCI-DSS, HIPAA, and SOC 2. Many organizations automate verification by having scripts report their output to a centralized monitoring system — so any backup failure triggers an immediate alert to the security team.",
    prompt: "ubuntu@server:~$",
    command: "ls -lh /tmp/log_backups/",
    output: [
      "total 1.4M",
      "-rw-r--r-- 1 ubuntu ubuntu 1.4M Jun  9 08:45 syslog_20260609.log",
    ],
    nextStepDirections: "The backup file syslog_20260609.log was created successfully with today's date. The script is working correctly and ready to be scheduled with cron.",
    finalGoal: "Automated backup script created, tested, and verified — syslog is now backed up to /tmp/log_backups/ with daily timestamps.",
  },
];

export default function LabScripting() {
  return (
    <LabRunner
      labTitle="Bash Scripting Basics"
      chapterNum="2.3"
      difficulty="Intermediate"
      tags={["bash", "scripting", "automation", "cron"]}
      duration={40}
      terminalLabel="ubuntu@server:~"
      intro={{
        overview: "SCENARIO: The ops team spends 15 minutes every night manually copying log files. Your manager asked you to automate it. Your task is to write a bash script that backs up /var/log/syslog with a timestamp in the filename — then verify it works before the nightly window.",
        outcomes: [
          "Create and structure a bash script from scratch",
          "Use shebang, echo, and append operators",
          "Apply date-stamping to backup filenames",
          "Test and verify script execution",
        ],
        prerequisites: ["Basic command line usage", "Understanding of files and directories"],
        tools: ["touch", "chmod", "echo", "bash", "date"],
      }}
      steps={steps}
    />
  );
}