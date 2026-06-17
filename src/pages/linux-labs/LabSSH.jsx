import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Check the SSH service",
    explanation: "Your company's new production server uses password authentication for SSH — a major security risk. Start by confirming the SSH service is running and its current configuration.",
    whyItMatters: "Password-based SSH is vulnerable to brute-force attacks. Many breaches start exactly this way. Migrating to key-based auth is one of the highest-impact security improvements you can make.",
    securityInsight: "The failed password attempts in the status output indicate an active brute-force attack. This is extremely common — automated bots scan the entire internet for port 22 and attempt millions of password combinations per hour (MITRE T1110 — Brute Force). Key-based auth completely eliminates this attack vector.",
    prompt: "ubuntu@prodserver:~$",
    command: "systemctl status sshd",
    output: [
      "● ssh.service - OpenBSD Secure Shell server",
      "     Loaded: loaded (/lib/systemd/system/ssh.service; enabled; vendor preset: enabled)",
      "     Active: active (running) since Sun 2026-06-08 18:00:00 UTC; 15h ago",
      "   Main PID: 892 (sshd)",
      "      Tasks: 1 (limit: 4915)",
      "     Memory: 5.2M",
      "",
      "Jun 08 18:00:00 prodserver systemd[1]: Starting OpenBSD Secure Shell server...",
      "Jun 08 18:00:00 prodserver sshd[892]: Server listening on 0.0.0.0 port 22.",
      "Jun 09 04:11:22 prodserver sshd[4821]: Failed password for root from 192.168.1.100 port 52441 ssh2",
      "Jun 09 04:11:25 prodserver sshd[4822]: Failed password for root from 192.168.1.100 port 52442 ssh2",
      "Jun 09 04:11:28 prodserver sshd[4823]: Failed password for root from 192.168.1.100 port 52443 ssh2",
    ],
    nextStepDirections: "SSH is running — but you can already see multiple failed password attempts for root, confirming this is an active brute-force target. Generate an SSH key pair to replace password auth.",
  },
  {
    stepLabel: "Generate an SSH key pair",
    explanation: "Use ssh-keygen to generate an Ed25519 key pair. Ed25519 is modern, fast, and more secure than the older RSA algorithm.",
    whyItMatters: "SSH key pairs use asymmetric cryptography — the private key never leaves your machine, making brute-force attacks computationally infeasible.",
    securityInsight: "Ed25519 keys are preferred over RSA-2048 for several reasons: smaller key size, faster operations, and resistance to certain side-channel attacks. NIST and CIS both recommend Ed25519 or ECDSA over legacy RSA for new key generation. Never reuse SSH keys across different environments.",
    prompt: "ubuntu@prodserver:~$",
    command: "ssh-keygen -t ed25519 -f ~/.ssh/prod_key -N \"\"",
    output: [
      "Generating public/private ed25519 key pair.",
      "Your identification has been saved in /home/ubuntu/.ssh/prod_key",
      "Your public key has been saved in /home/ubuntu/.ssh/prod_key.pub",
      "The key fingerprint is:",
      "SHA256:kZn9mRQ4pL7cDfV2hXsYbN1tqW8eAjE3vM5uKiP6oR0 ubuntu@prodserver",
      "The key's randomart image is:",
      "+--[ED25519 256]--+",
      "|    ..o.=+       |",
      "|   o . B.+o      |",
      "|  . o o.+o.      |",
      "|   . + o.o .     |",
      "|    . o S = .    |",
      "+----[SHA256]-----+",
    ],
    nextStepDirections: "Key pair generated: prod_key (private) and prod_key.pub (public). The public key is safe to share and copy to servers — the private key must stay secure. View the public key content now.",
  },
  {
    stepLabel: "View the public key",
    explanation: "Display the contents of the public key file. This is the value you'll add to the server's authorized_keys file.",
    whyItMatters: "You must know what your public key looks like to copy it correctly to remote systems. One wrong character invalidates the entire key.",
    securityInsight: "The public key is safe to distribute — it's mathematically impossible to derive the private key from it. However, your private key (prod_key) must never leave your secure workstation. Storing private keys on shared servers, in version control, or in cloud storage is a critical security mistake.",
    prompt: "ubuntu@prodserver:~$",
    command: "cat ~/.ssh/prod_key.pub",
    output: [
      "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOd8qLpK3vMhRn7xY2wZtJ4cPqE9sUfAbNgXo6VDiR1m ubuntu@prodserver",
    ],
    nextStepDirections: "The public key starts with 'ssh-ed25519' — that's correct. Now secure the .ssh directory with proper permissions. The directory must be 700 or SSH will refuse to use the keys.",
  },
  {
    stepLabel: "Secure the .ssh directory",
    explanation: "Set the .ssh directory to permission mode 700 — only the owner can read, write, and enter it.",
    whyItMatters: "SSH enforces strict permission requirements. If ~/.ssh is readable by others, OpenSSH will refuse to use your keys as a security measure.",
    securityInsight: "OpenSSH's permission enforcement is a built-in defense against credential theft. If ~/.ssh were world-readable, any user on the system could copy your private keys. The 700 requirement ensures only you can access the directory — enforcing the same least-privilege principle as file permissions.",
    prompt: "ubuntu@prodserver:~$",
    command: "chmod 700 ~/.ssh",
    output: [
      "# mode of '/home/ubuntu/.ssh' changed to 0700 (drwx------)",
      "# SSH directory is now owner-only accessible.",
    ],
    nextStepDirections: "Directory secured. Create the authorized_keys file — this is where SSH looks to validate incoming public key authentication attempts.",
  },
  {
    stepLabel: "Create authorized_keys",
    explanation: "Create the authorized_keys file if it doesn't already exist. This file stores the public keys of users allowed to log in.",
    whyItMatters: "authorized_keys is the gatekeeper for key-based SSH access. Each line is one public key — only holders of the matching private key can log in.",
    securityInsight: "The authorized_keys file is a high-value target for attackers with write access — adding their own public key grants persistent access that survives password resets (MITRE T1098.004 — SSH Authorized Keys). Monitor this file for unauthorized changes using file integrity monitoring (FIM) tools like AIDE or Tripwire.",
    prompt: "ubuntu@prodserver:~$",
    command: "touch ~/.ssh/authorized_keys",
    output: [
      "# Created: /home/ubuntu/.ssh/authorized_keys (0 bytes)",
    ],
    nextStepDirections: "File created. Set its permissions to 600 — owner read/write only. If authorized_keys has loose permissions, SSH ignores it entirely.",
  },
  {
    stepLabel: "Secure authorized_keys",
    explanation: "Apply chmod 600 to restrict authorized_keys to owner-only read/write access.",
    whyItMatters: "This is an SSH requirement, not just a best practice. Without 600 permissions, SSH will reject the file and fall back to password authentication — defeating the purpose entirely.",
    securityInsight: "SSH's strict permission checking on authorized_keys (600) and .ssh (700) is a defense-in-depth mechanism. Even if an attacker plants a key in your authorized_keys file, if the permissions are wrong, SSH won't use the file at all — providing an accidental protection layer.",
    prompt: "ubuntu@prodserver:~$",
    command: "chmod 600 ~/.ssh/authorized_keys",
    output: [
      "# mode of '/home/ubuntu/.ssh/authorized_keys' changed to 0600 (-rw-------)",
      "# SSH will now accept this file for key authentication.",
    ],
    nextStepDirections: "authorized_keys is secured. Now append your public key to it — this is the final step that enables key-based login.",
  },
  {
    stepLabel: "Authorize the public key",
    explanation: "Append your public key to the authorized_keys file using >>. This grants SSH access to anyone holding the matching private key (prod_key).",
    whyItMatters: "Using >> appends without overwriting. Using > instead would delete all existing authorized keys — potentially locking out other administrators.",
    securityInsight: "The >> vs > distinction is critical in security operations. Using > to 'add' a key instead of >> would remove all other authorized admins — a form of accidental denial-of-service. Attackers also use > deliberately to lock out legitimate users before establishing their own persistence.",
    prompt: "ubuntu@prodserver:~$",
    command: "cat ~/.ssh/prod_key.pub >> ~/.ssh/authorized_keys",
    output: [
      "# Appended 1 public key to authorized_keys.",
      "# Key type: ssh-ed25519",
      "# Fingerprint: SHA256:kZn9mRQ4pL7cDfV2hXsYbN1tqW8eAjE3vM5uKiP6oR0",
      "# authorized_keys now contains 1 entry.",
    ],
    nextStepDirections: "Public key added to authorized_keys. Verify the file contains the key correctly.",
  },
  {
    stepLabel: "Verify authorized_keys",
    explanation: "View the authorized_keys file to confirm the public key was appended correctly and the file has the right permissions.",
    whyItMatters: "A final verification step catches any errors before you disconnect and potentially lock yourself out of the server.",
    securityInsight: "After configuring key-based auth, the next hardening step is to disable PasswordAuthentication in /etc/ssh/sshd_config (set to 'no'). This eliminates brute-force as an attack vector entirely. Without this change, password auth remains as a fallback — and attackers will still try it.",
    prompt: "ubuntu@prodserver:~$",
    command: "cat ~/.ssh/authorized_keys",
    output: [
      "ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIOd8qLpK3vMhRn7xY2wZtJ4cPqE9sUfAbNgXo6VDiR1m ubuntu@prodserver",
    ],
    nextStepDirections: "The key is present and correct. The server is now configured to accept key-based SSH login using prod_key. Next step in a real environment: disable password authentication in /etc/ssh/sshd_config to eliminate the brute-force attack surface entirely.",
    finalGoal: "SSH key authentication configured: Ed25519 key pair generated, public key authorized, .ssh directory and authorized_keys secured with correct permissions.",
  },
];

export default function LabSSH() {
  return (
    <LabRunner
      labTitle="SSH Key Authentication"
      chapterNum="2.5"
      difficulty="Intermediate"
      tags={["ssh", "security", "keys", "hardening"]}
      duration={40}
      terminalLabel="ubuntu@prodserver:~"
      intro={{
        overview: "SCENARIO: Your production server is using password-based SSH and you can already see brute-force login attempts in the logs. Your security lead has given you a change window to migrate to SSH key authentication. Complete the setup before the window closes at 10am.",
        outcomes: [
          "Generate Ed25519 SSH key pairs",
          "Configure the .ssh directory with correct permissions",
          "Set up authorized_keys for public key authentication",
          "Understand why each permission setting is required by SSH",
        ],
        prerequisites: ["Basic command line usage", "Understanding of public-key cryptography concepts"],
        tools: ["ssh-keygen", "chmod", "cat", "systemctl"],
      }}
      steps={steps}
    />
  );
}