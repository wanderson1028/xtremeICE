import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Generate RSA private key",
    explanation: "Use OpenSSL to generate a 2048-bit RSA private key and save it to private.pem. RSA is the most widely used asymmetric encryption algorithm.",
    whyItMatters: "RSA keys are used for SSH authentication, TLS certificates, code signing, and email encryption. Understanding key generation is fundamental to secure communications.",
    command: "openssl genpkey -algorithm RSA -out private.pem",
    prompt: "root@kali:~#",
    output: [
      "....................................................................+++++",
      "..........................................................................+++++",
      "",
      "[*] Private key saved to: private.pem",
    ],
    question: {
      text: "Why must private.pem be kept strictly secret while the public key can be freely shared?",
      options: [
        "The private key is larger and takes up more bandwidth to transmit securely",
        "The private key decrypts data encrypted with the public key and signs data to prove identity — anyone with the private key can impersonate you or decrypt your confidential messages",
        "Public keys expire after 30 days but private keys do not",
        "The private key is only used during key generation and can be deleted afterward",
      ],
      correctIndex: 1,
      explanation: "RSA is mathematically designed so that the private key can both decrypt and sign, while the public key can only encrypt and verify. The private key is the 'master' — anyone who possesses it can read all encrypted messages sent to you and impersonate you by producing valid signatures on any data. The public key, by design, cannot reverse this process.",
    },
  },
  {
    stepLabel: "Extract RSA public key",
    explanation: "Extract the public key from the private key and save it to public.pem. The public key can be shared freely — it can only encrypt, not decrypt.",
    whyItMatters: "Asymmetric encryption separates identity from access. Anyone can use your public key to encrypt data, but only you with your private key can decrypt it.",
    command: "openssl rsa -pubout -in private.pem -out public.pem",
    prompt: "root@kali:~#",
    output: [
      "writing RSA key",
      "",
      "[*] Public key extracted and saved to: public.pem",
    ],
    question: {
      text: "In which real-world scenario does the 'anyone can encrypt, only you can decrypt' property of asymmetric keys become critical?",
      options: [
        "Encrypting a hard drive — you want only yourself to encrypt and decrypt",
        "Receiving encrypted email — senders use your public key to encrypt so only your private key can read it; this protects sensitive communications even if intercepted in transit",
        "VPN tunnels — both endpoints need symmetric keys for performance",
        "Password hashing — asymmetric keys are the standard for storing passwords",
      ],
      correctIndex: 1,
      explanation: "Encrypted email is the textbook example: many people need to send you private messages, but only you should be able to read them. They all use your public key to encrypt, and your private key — held only by you — decrypts. Hard drive encryption (option A) is symmetric because you are both the encryptor and decryptor. VPNs (option C) do use symmetric keys, but asymmetric keys establish the shared secret first. Password hashing is a one-way function, not encryption at all.",
    },
  },
  {
    stepLabel: "Encrypt a file with AES-256",
    explanation: "Encrypt a message file using AES-256-CBC symmetric encryption. The -salt flag adds randomness to prevent identical plaintexts from producing identical ciphertext.",
    whyItMatters: "AES-256 is the gold standard for symmetric encryption. It's used by governments, banks, and VPNs worldwide. The salt prevents dictionary attacks on the encrypted output.",
    command: "openssl enc -aes-256-cbc -salt -in message.txt -out message.enc",
    prompt: "root@kali:~#",
    output: [
      "enter AES-256-CBC encryption password:",
      "Verifying - enter AES-256-CBC encryption password:",
      "",
      "[*] File encrypted: message.enc (binary ciphertext)",
    ],
    question: {
      text: "Why is AES-256 (symmetric) preferred over RSA for encrypting large files, even though RSA is also considered secure?",
      options: [
        "AES-256 is newer than RSA and therefore more trusted by the industry",
        "RSA is computationally expensive and slow for large data; AES-256 is orders of magnitude faster for bulk encryption — in practice, RSA is used to securely exchange an AES key, which then encrypts the actual data (hybrid encryption)",
        "RSA can only encrypt files smaller than 256 bytes",
        "AES-256 requires no password, making it easier to use than RSA",
      ],
      correctIndex: 1,
      explanation: "RSA performance degrades dramatically at scale because it relies on modular exponentiation of large numbers — encrypting a 1 GB file with RSA would take minutes or hours. AES uses simple bitwise operations that modern CPUs execute in nanoseconds. In practice, real systems use hybrid encryption: RSA to securely exchange an AES session key, then AES for the actual data. This is exactly how HTTPS works.",
    },
  },
  {
    stepLabel: "View encrypted binary output",
    explanation: "Try to read the encrypted file with xxd. You'll see garbled binary output — this is the ciphertext. Without the decryption password, the contents are completely unreadable.",
    whyItMatters: "This visual demonstration illustrates why encrypting sensitive files is so important. The original content is completely hidden from anyone without the key.",
    command: "xxd message.enc | head -5",
    prompt: "root@kali:~#",
    output: [
      "00000000: 5361 6c74 6564 5f5f e3a4 7c91 3f8b 2d45  Salted__..{.?.E",
      "00000010: 9f2c 4a1d 8b3e f7a2 c1d4 2e5f 8a19 b36c  .,J..>....._...l",
      "00000020: 7e4d 5a91 2f8c 3b60 a174 e92d 44c6 8f12  ~MZ./.;`.t.-D...",
      "00000030: 3c7a 81d4 5e90 2fbc 93e6 41d8 7f21 5a4b  <z..^./...A..!ZK",
    ],
    question: {
      text: "The output begins with 'Salted__'. What does the salt do, and what attack does it prevent?",
      options: [
        "The salt increases the file size so attackers know encryption was used",
        "The salt is a random value mixed into the key derivation; it ensures that encrypting the same plaintext twice with the same password produces different ciphertext, defeating rainbow table and precomputed dictionary attacks",
        "The salt is the IV (initialization vector) stored in plaintext for decryption purposes only",
        "Salt is only used with asymmetric encryption to identify the key pair used",
      ],
      correctIndex: 1,
      explanation: "Without salt, encrypting the same password always produces the same ciphertext — attackers can precompute a massive table of password→ciphertext pairs (a rainbow table) and look up any hash instantly. The salt is a random value mixed into the key derivation function before encryption, ensuring identical passwords produce unique ciphertext. This forces attackers to recompute every crack attempt from scratch, eliminating precomputed attacks.",
    },
  },
  {
    stepLabel: "Decrypt the file",
    explanation: "Decrypt the ciphertext back to the original plaintext using the -d (decrypt) flag and the same password.",
    whyItMatters: "Verifying that decryption correctly recovers the original data confirms the encryption implementation is correct. Errors here would mean data loss.",
    command: "openssl enc -d -aes-256-cbc -in message.enc -out decrypted.txt && cat decrypted.txt",
    prompt: "root@kali:~#",
    output: [
      "enter AES-256-CBC decryption password:",
      "",
      "SECRET: admin password is XtremSec2026!",
      "",
      "[*] Decryption successful. Original plaintext recovered.",
    ],
    question: {
      text: "The decrypted secret is stored in decrypted.txt on disk. What is the security risk of this, and how should secrets be handled instead?",
      options: [
        "There is no risk — decrypted.txt is protected by filesystem permissions",
        "Storing secrets in plaintext files risks exposure through file system access, backups, logs, or swap; secrets should live in memory only, be piped directly to the consuming process, or stored in a secrets manager (e.g., HashiCorp Vault)",
        "The risk is only present if the file is on an unencrypted disk",
        "Decrypted.txt should be renamed to hide it from automated scanning tools",
      ],
      correctIndex: 1,
      explanation: "Files on disk persist beyond process lifetime and are accessible to any process with filesystem read permissions — including backup agents, log shippers, swap files, and attackers with local access. Secrets managers (Vault, AWS Secrets Manager) store secrets encrypted at rest with strict access controls and full audit trails. Piping secrets directly to consuming processes keeps them in memory and out of the filesystem entirely.",
    },
  },
  {
    stepLabel: "Hash a file with SHA-256",
    explanation: "Generate a SHA-256 hash of a file using sha256sum. Hash values are fixed-length fingerprints that uniquely identify file content.",
    whyItMatters: "SHA-256 hashing is used for file integrity verification, digital signatures, and password storage. Changing even one byte in a file produces a completely different hash.",
    command: "sha256sum message.txt",
    prompt: "root@kali:~#",
    output: [
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855  message.txt",
      "",
      "[*] Hash generated. Store this to verify file integrity later.",
    ],
    question: {
      text: "If an attacker modifies even one character in message.txt and you re-run sha256sum, what happens to the hash output?",
      options: [
        "The hash changes by a small amount proportional to how much the file changed",
        "The hash changes completely and unpredictably (avalanche effect) — even a 1-bit change produces an entirely different 256-bit hash, making any tampering instantly detectable",
        "The hash stays the same because SHA-256 rounds to the nearest byte boundary",
        "SHA-256 only detects changes to files larger than 1 KB",
      ],
      correctIndex: 1,
      explanation: "This is the avalanche effect — a fundamental property of cryptographic hash functions. Even flipping a single bit in the input causes approximately 50% of output bits to change, making the new hash look completely unrelated to the original. This property is what makes SHA-256 useful for tamper detection: you cannot make a 'small' change that produces a 'similar' hash. Any modification, no matter how minor, produces a totally different 256-bit output.",
    },
  },
  {
    stepLabel: "Test SSL/TLS connection",
    explanation: "Use OpenSSL to examine the TLS certificate and cipher suite of a remote server. This reveals the server's certificate chain, expiration, and security configuration.",
    whyItMatters: "Auditing TLS configurations identifies weak cipher suites, expired certificates, and misconfigured certificate chains — common findings in security assessments.",
    command: "openssl s_client -connect example.com:443 -brief",
    prompt: "root@kali:~#",
    output: [
      "CONNECTION ESTABLISHED",
      "Protocol version: TLSv1.3",
      "Ciphersuite: TLS_AES_128_GCM_SHA256",
      "Peer certificate: CN=example.com",
      "Verification: OK",
      "",
      "Issuer:  C=US, O=DigiCert Inc, CN=DigiCert TLS RSA SHA256 2020 CA1",
      "Not After : Dec 28 23:59:59 2026 GMT",
      "",
      "[*] TLS 1.3 confirmed — strong cipher suite in use",
    ],
    question: {
      text: "The output shows TLSv1.3. Why is it a security concern if a server still accepts TLSv1.0 or TLSv1.1 connections?",
      options: [
        "TLS 1.0 and 1.1 are slower and cause performance issues on modern servers",
        "TLS 1.0 and 1.1 have known cryptographic weaknesses (BEAST, POODLE, RC4 attacks) and have been deprecated by all major standards bodies; clients connecting via these versions are vulnerable to downgrade and decryption attacks",
        "TLS 1.0 certificates are no longer issued by certificate authorities",
        "Older TLS versions only affect Internet Explorer users and are not a modern concern",
      ],
      correctIndex: 1,
      explanation: "TLS 1.0 (1999) and 1.1 (2006) were designed before modern cryptographic attacks were understood. BEAST exploits a CBC mode weakness in TLS 1.0, POODLE attacks TLS 1.0's padding, and RC4 (supported in older TLS versions) is cryptographically broken with known key recovery attacks. All major standards bodies — NIST, IETF, PCI DSS — formally deprecated TLS 1.0/1.1 by 2021. Servers still accepting them are exposing clients to known, practical decryption attacks.",
    },
  },
];

const intro = {
  overview: "This lab covers the practical application of cryptographic concepts using industry-standard tools. You'll generate RSA key pairs, encrypt and decrypt files with AES-256, verify file integrity with SHA-256, and inspect live TLS connections — the same skills used daily by security engineers and system administrators.",
  niceCategory: "Securely Provision",
  objectives: [
    "Generate RSA 2048-bit public/private key pairs using OpenSSL",
    "Encrypt and decrypt files using AES-256-CBC symmetric encryption",
    "Understand the role of salting in preventing ciphertext pattern attacks",
    "Generate and verify SHA-256 file integrity hashes",
    "Inspect live TLS 1.3 connections and certificate chains",
  ],
  outcomes: [
    "Able to generate and manage RSA key pairs for secure communications",
    "Understand the difference between symmetric and asymmetric encryption",
    "Able to encrypt sensitive files at rest using AES-256",
    "Understand how SHA-256 hashing enables file integrity verification",
    "Able to audit TLS configurations for cipher suite strength",
  ],
  prerequisites: [
    "Basic Linux terminal comfort (file navigation, running commands)",
    "High-level understanding of what encryption means conceptually",
    "Completion of Cybersecurity Essentials lab recommended",
  ],
  tools: [
    "openssl — Swiss army knife for cryptographic operations",
    "sha256sum — file integrity hashing utility",
    "xxd — binary/hex dump viewer to inspect ciphertext",
    "openssl s_client — TLS connection inspection and certificate auditing",
  ],
};

export default function LabCryptography() {
  return (
    <LabRunner
      labTitle="Introduction to Cryptography"
      chapterNum="5"
      difficulty="Intermediate"
      tags={["OpenSSL", "GPG", "Encryption", "Hashing"]}
      terminalLabel="Kali Linux — OpenSSL / GPG Terminal"
      duration={50}
      intro={intro}
      steps={steps}
    />
  );
}