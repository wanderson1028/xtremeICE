import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    label: "Harden SSH Configuration",
    command: "sudo sed -i 's/#PermitRootLogin yes/PermitRootLogin no/' /etc/ssh/sshd_config && sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config && sudo systemctl restart sshd",
    expectedOutput: "sshd restarted | PermitRootLogin: no | PasswordAuthentication: no",
    hint: "Edit sshd_config to disable root login and password-based authentication.",
    securityInsight: "SSH is one of the most targeted services on the internet. Disabling root login and password auth (using key-based auth only) eliminates two of the most common attack vectors (CIS Benchmark L1).",
  },
  {
    label: "Configure Kernel Hardening",
    command: "sudo bash -c 'echo \"net.ipv4.conf.all.rp_filter=1\nnet.ipv4.tcp_syncookies=1\nkernel.randomize_va_space=2\" >> /etc/sysctl.conf' && sudo sysctl -p",
    expectedOutput: "net.ipv4.conf.all.rp_filter = 1 | net.ipv4.tcp_syncookies = 1 | kernel.randomize_va_space = 2",
    hint: "Apply kernel-level network and memory protections via sysctl.",
    securityInsight: "rp_filter prevents IP spoofing, TCP SYN cookies mitigate SYN flood DDoS attacks, and ASLR (randomize_va_space=2) makes memory exploitation significantly harder.",
  },
  {
    label: "Remove Unnecessary Services",
    command: "sudo systemctl disable --now avahi-daemon cups bluetooth && sudo apt purge -y telnet rsh-client ftp",
    expectedOutput: "Removed: avahi-daemon, cups, bluetooth | Purged: telnet, rsh-client, ftp",
    hint: "Disable unused services and remove legacy insecure network clients.",
    securityInsight: "Attack surface reduction is a core hardening principle. Avahi (mDNS), CUPS, and Bluetooth are rarely needed on servers. Telnet, RSH, and FTP transmit credentials in plaintext.",
  },
  {
    label: "Enable Auditd Logging",
    command: "sudo apt install -y auditd && sudo auditctl -w /etc/passwd -p wa -k passwd_changes && sudo auditctl -w /etc/sudoers -p wa -k sudoers_changes",
    expectedOutput: "auditd installed | Watch rules added for /etc/passwd and /etc/sudoers",
    hint: "Install auditd and add watch rules for critical system files.",
    securityInsight: "Auditd provides kernel-level syscall auditing. Watching /etc/passwd and /etc/sudoers ensures any privilege escalation attempts are logged (maps to NIST AC-2 and AU-12).",
  },
  {
    label: "Verify Hardening Score",
    command: "sudo apt install -y lynis && sudo lynis audit system --quick",
    expectedOutput: "Lynis security scan | Hardening index: 78 | Warnings: 3 | Suggestions: 12",
    hint: "Run a Lynis audit to score the system's overall hardening posture.",
    securityInsight: "Lynis performs a comprehensive CIS benchmark audit. A hardening index above 75 is considered acceptable for most production servers. Document and remediate all warnings.",
  },
];

export default function LabLinuxHardening() {
  return (
    <LabRunner
      title="Linux Server Hardening"
      difficulty="Intermediate"
      duration={55}
      category="Operate and Maintain"
      tags={["Lynis", "auditd", "sysctl", "SSH", "CIS Benchmark"]}
      objectives={[
        "Harden SSH to eliminate password-based and root login",
        "Apply kernel-level network and memory security parameters",
        "Remove unnecessary services and insecure legacy tools",
        "Implement file integrity auditing with auditd",
        "Score system hardening posture with Lynis",
      ]}
      prerequisites={["Basic Linux administration", "Understanding of systemd"]}
      steps={steps}
    />
  );
}