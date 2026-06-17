import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Acquire disk image with dd",
    explanation: "Create a forensic image of a USB drive using dd. The if= is the source device, of= is the output image file, and bs= sets the block size.",
    whyItMatters: "Forensic imaging creates an exact bit-for-bit copy of storage media. Investigators work from the image, never the original — preserving evidence integrity and chain of custody.",
    command: "dd if=/dev/sdb of=/forensics/usb_evidence.img bs=4096 status=progress",
    prompt: "root@forensics:~#",
    output: [
      "8053063680 bytes (8.1 GB, 7.5 GiB) copied, 142 s, 56.7 MB/s",
      "1966080+0 records in",
      "1966080+0 records out",
      "8053063680 bytes (8.1 GB) copied, 142.068 s, 56.7 MB/s",
      "",
      "[*] Image acquired: /forensics/usb_evidence.img",
    ],
    question: {
      text: "Why do forensic investigators always work from a dd image rather than the original device?",
      options: [
        "The image is faster to analyze than reading from the original device",
        "Working from the original would modify access timestamps and risk altering evidence, compromising chain of custody and court admissibility",
        "dd images compress the data, making storage more efficient",
        "The original device is too slow for most forensic tools to read directly",
      ],
      correctIndex: 1,
      explanation: "Every read operation on a storage device updates the 'last accessed' timestamp. Write operations modify 'last modified' timestamps. These MAC times are critical evidence in forensic timelines. Working on the original also risks accidentally overwriting deleted file sectors that hold recoverable evidence. The dd image is a snapshot — frozen in time — that can be re-imaged if needed without risking the original evidence.",
    },
  },
  {
    stepLabel: "Verify image hash (MD5)",
    explanation: "Generate MD5 hashes of both the original device and the image to verify they are identical. Matching hashes prove the image is a faithful copy.",
    whyItMatters: "Hash verification is legally required in forensic investigations. It proves to a court that evidence was not altered during acquisition — a foundational element of digital forensics.",
    command: "md5sum /dev/sdb /forensics/usb_evidence.img",
    prompt: "root@forensics:~#",
    output: [
      "a3f4b2c1d9e8f7a6b5c4d3e2f1a0b9c8  /dev/sdb",
      "a3f4b2c1d9e8f7a6b5c4d3e2f1a0b9c8  /forensics/usb_evidence.img",
      "",
      "[*] HASH MATCH CONFIRMED — image integrity verified",
    ],
    question: {
      text: "Both hashes are identical: a3f4b2c1d9e8f7a6b5c4d3e2f1a0b9c8. What does this prove?",
      options: [
        "The image was created quickly without errors",
        "Every single bit in the image is identical to the original device — the copy is forensically sound and unaltered",
        "The USB drive has no viruses or malware",
        "The dd command ran with the correct block size",
      ],
      correctIndex: 1,
      explanation: "Cryptographic hash functions produce a unique fingerprint of every bit in the input. Identical hashes with overwhelming mathematical certainty mean every single one of the 8 billion+ bytes is identical. In court, this establishes that the image was not altered between collection and examination. Hash mismatch is immediate grounds to question evidence integrity. This is why hashing before and after transport is standard practice.",
    },
  },
  {
    stepLabel: "Mount image read-only",
    explanation: "Mount the forensic image in read-only mode to prevent any accidental modification of the evidence while browsing the file system.",
    whyItMatters: "Read-only mounting is non-negotiable in forensics. Any write to the evidence could contaminate it, render it inadmissible, or be seen as tampering.",
    command: "mount -o ro,loop /forensics/usb_evidence.img /mnt/evidence",
    prompt: "root@forensics:~#",
    output: [
      "[*] Image mounted read-only at /mnt/evidence",
      "[*] File system: FAT32",
      "[*] Total size: 7.5 GiB",
      "[*] Files found: 2,847",
    ],
    question: {
      text: "What would happen if you accidentally mounted the image without the 'ro' (read-only) flag and created a file in it?",
      options: [
        "Nothing — modern file systems prevent unintentional writes automatically",
        "The image's hash would change, breaking the chain of custody and potentially making the evidence inadmissible in court",
        "The file would be saved to RAM only, not affecting the image",
        "The loop device would reject the write since it's an image file",
      ],
      correctIndex: 1,
      explanation: "Any write to an evidence image changes its content, which changes its hash. When the investigator re-hashes the image at court or during peer review, the hash will no longer match the acquisition hash — breaking the chain of custody. Defense attorneys can argue the evidence was tampered with between collection and trial, potentially making it inadmissible. Read-only mounting is a hard technical control that makes accidental writes impossible.",
    },
  },
  {
    stepLabel: "List deleted files with Autopsy",
    explanation: "Use the Autopsy CLI to list files that have been deleted from the image. Deleted files often remain recoverable until the sectors are overwritten.",
    whyItMatters: "Attackers routinely delete logs and evidence. Digital forensics tools can recover deleted files, exposing tools, stolen data, or communication records that were thought to be erased.",
    command: "autopsy --list-deleted /forensics/usb_evidence.img",
    prompt: "root@forensics:~#",
    output: [
      "Autopsy Forensic Browser v4.21",
      "Analyzing: /forensics/usb_evidence.img",
      "",
      "DELETED FILES FOUND:",
      "  [DEL] /RECYCLER/credentials_dump.txt  (89 KB) — recoverable",
      "  [DEL] /RECYCLER/mimikatz_output.log   (12 KB) — recoverable",
      "  [DEL] /Documents/exfil_payload.zip    (3.4 MB) — recoverable",
      "  [DEL] /RECYCLER/cmd_history.txt       (2 KB)  — recoverable",
      "",
      "[!] 4 deleted files detected with forensic evidence value",
    ],
    question: {
      text: "Why are deleted files still recoverable? What would make them permanently unrecoverable?",
      options: [
        "Deleted files are always permanently stored in a hidden system partition",
        "Deleting a file only removes its directory entry; the data remains until those sectors are overwritten by new data — secure wiping (e.g., shred, DBAN) or encryption makes recovery impossible",
        "Files can only be recovered if the Recycle Bin was not emptied",
        "The file system keeps a 30-day backup of all deleted files automatically",
      ],
      correctIndex: 1,
      explanation: "When a file is 'deleted,' the OS simply marks its directory entry as free and marks its storage sectors as available — the actual data bytes remain untouched until new data is written on top of them. On a USB drive with free space, those sectors may sit intact for months or years. Tools like Autopsy scan all sectors including 'unallocated' space for file signatures (magic bytes) to recover content. Secure wiping overwrites every sector with random data multiple times, making recovery computationally infeasible.",
    },
  },
  {
    stepLabel: "Recover deleted credential file",
    explanation: "Recover the deleted credentials dump file using Autopsy's extraction feature. The file content is recovered from unallocated clusters.",
    whyItMatters: "Recovering attacker artifacts like credential dumps reveals what was stolen and how the attack progressed. This directly informs incident response and breach notifications.",
    command: "autopsy --recover /forensics/usb_evidence.img '/RECYCLER/credentials_dump.txt' -o /forensics/recovered/",
    prompt: "root@forensics:~#",
    output: [
      "[*] Recovering /RECYCLER/credentials_dump.txt ...",
      "[*] Sectors: 0x1A3F0 - 0x1A5C8 (recoverable)",
      "[*] File recovered: /forensics/recovered/credentials_dump.txt",
      "",
      "--- FILE PREVIEW ---",
      "Administrator:500:aad3b435b51404eeaad3b435b51404ee:31d6cfe0d16ae931b73c59d7e0c089c0",
      "jsmith:1001:aad3b435b51404eeaad3b435b51404ee:8846f7eaee8fb117ad06bdd830b7586c",
      "svc_backup:1005:aad3b435b51404eeaad3b435b51404ee:5c7132617574cf22da3b7bddaef1f9e5",
      "[!] NTLM hashes recovered — requires immediate password reset and incident report",
    ],
    question: {
      text: "The recovered file contains NTLM hashes. Even without plaintext passwords, why does this require an immediate password reset?",
      options: [
        "NTLM hashes expire after 24 hours and must be refreshed",
        "NTLM hashes can be used in Pass-the-Hash attacks to authenticate without knowing the plaintext — the hash itself is the credential",
        "Password resets are required by policy whenever any file is recovered from deleted storage",
        "The hashes might be corrupted and cause login issues for the affected accounts",
      ],
      correctIndex: 1,
      explanation: "In Windows authentication (NTLM), the hash itself is the authentication credential — the system authenticates by proving knowledge of the hash, not knowledge of the plaintext. An attacker can take the NTLM hash and directly present it to authentication systems (SMB, WinRM, RDP with NLA disabled) without ever cracking it. This is the Pass-the-Hash technique. Resetting the password invalidates the current hash, cutting off the attacker's access.",
    },
  },
  {
    stepLabel: "Analyze file metadata with exiftool",
    explanation: "Extract metadata from an image file found on the drive. Metadata can reveal creation dates, GPS coordinates, device info, and software used.",
    whyItMatters: "Metadata is often overlooked by attackers and leaks critical attribution data — camera model, original filename, GPS location, editing software. It's a powerful investigative resource.",
    command: "exiftool /mnt/evidence/Documents/photo.jpg",
    prompt: "root@forensics:~#",
    output: [
      "ExifTool Version Number         : 12.76",
      "File Name                       : photo.jpg",
      "Create Date                     : 2026:05:28 22:14:33",
      "Camera Model Name               : iPhone 15 Pro",
      "GPS Latitude                    : 40 deg 42' 46.80\" N",
      "GPS Longitude                   : 74 deg 0' 21.60\" W",
      "Software                        : Adobe Photoshop 2026",
      "Author                          : Marcus Webb",
      "",
      "[*] GPS coordinates map to: Lower Manhattan, New York City",
      "[*] Metadata preserved — subject identified",
    ],
    question: {
      text: "The metadata shows GPS coordinates placing 'Marcus Webb' in Lower Manhattan at 22:14. How would an attacker try to remove this metadata before sharing files?",
      options: [
        "Renaming the file removes all embedded metadata",
        "Tools like ExifTool itself (exiftool -all= file.jpg), converting to a stripped format, or screenshot-reposting remove EXIF data — investigators look for suspiciously clean metadata as a sign of tampering",
        "Uploading to social media automatically strips GPS coordinates in all cases",
        "Compressing the file with zip removes all metadata",
      ],
      correctIndex: 1,
      explanation: "ExifTool with the -all= flag strips all metadata in-place. Converting to PNG (which has minimal EXIF support) or screenshotting the image also works. Social media platforms like Twitter and Facebook strip GPS coordinates, but not all platforms do this. Sophisticated investigators look for metadata-stripped files as a red flag — a legitimate photo almost always has camera metadata, so a completely clean file suggests intentional scrubbing.",
    },
  },
  {
    stepLabel: "Generate forensic timeline",
    explanation: "Use log2timeline/Plaso to generate a super-timeline of all file system activity, correlating MAC times (Modified, Accessed, Created) across all evidence.",
    whyItMatters: "Timelines are the backbone of forensic investigations. They show exactly when files were created, accessed, or modified — essential for reconstructing the sequence of an attack.",
    command: "log2timeline.py --storage-file /forensics/timeline.plaso /forensics/usb_evidence.img",
    prompt: "root@forensics:~#",
    output: [
      "log2timeline - Plaso 20260501",
      "Processing: /forensics/usb_evidence.img",
      "Extracting events: ████████████████████ 100% [2847 files]",
      "",
      "Storage file generated: /forensics/timeline.plaso",
      "Total events: 18,432",
      "Time range: 2026-04-10 09:23:11 — 2026-05-28 22:14:33",
      "",
      "[*] Timeline complete. Use psort.py to filter and export.",
    ],
    question: {
      text: "What are MAC times in digital forensics, and why would an attacker try to manipulate them (timestomping)?",
      options: [
        "MAC times are MAC address logs; attackers change them to hide their device identity",
        "MAC = Modified, Accessed, Created timestamps on files; attackers use timestomping tools to make malware appear older than the intrusion date, defeating timeline-based detection",
        "MAC times are only relevant on macOS systems, not cross-platform evidence",
        "MAC times cannot be changed by anyone — they are hardware-level records",
      ],
      correctIndex: 1,
      explanation: "MAC = Modified, Accessed, Created — the three filesystem timestamps on every file. Timestomping tools (Metasploit's timestomp, PowerShell, native Windows APIs) can set any file's timestamps to arbitrary values. Attackers use this to make their malware appear to have existed on the system for years, predating the intrusion date and disrupting timeline analysis. Forensic tools like Plaso cross-reference multiple timestamp sources (MFT, registry, prefetch, event logs) to detect inconsistencies that reveal timestomping.",
    },
  },
];

const intro = {
  overview: "This lab walks you through a complete digital forensics workflow — from acquiring a bit-for-bit disk image to analyzing file metadata, recovering deleted evidence, and producing a forensic timeline. You'll use the same tools employed by incident responders and law enforcement digital forensics units worldwide.",
  niceCategory: "Investigate",
  objectives: [
    "Acquire a forensically sound disk image using dd with SHA-256 verification",
    "Extract and interpret EXIF metadata from image files using exiftool",
    "Recover deleted files from a disk image using Autopsy/The Sleuth Kit",
    "Analyze file system MAC times to establish an event timeline",
    "Generate a comprehensive forensic super-timeline using log2timeline/Plaso",
  ],
  outcomes: [
    "Able to create verified forensic disk images suitable for court evidence",
    "Understand how metadata embedded in files reveals attacker activity",
    "Able to recover deleted files and understand how deletion works at the filesystem level",
    "Understand MAC time analysis and how attackers attempt timestomping",
    "Able to produce and interpret Plaso forensic timelines",
  ],
  prerequisites: [
    "Intermediate Linux command-line proficiency",
    "Basic understanding of file systems (FAT, NTFS, ext4)",
    "Completion of Cybersecurity Essentials lab recommended",
  ],
  tools: [
    "dd — raw disk imaging and forensic acquisition",
    "exiftool — metadata extraction from documents and images",
    "Autopsy / The Sleuth Kit — open-source digital forensics platform",
    "log2timeline / Plaso — forensic super-timeline generation",
    "sha256sum — hash verification for evidence integrity",
  ],
};

export default function LabDigitalForensics() {
  return (
    <LabRunner
      labTitle="Digital Forensics & Incident Response"
      chapterNum="3"
      difficulty="Intermediate"
      tags={["dd", "Autopsy", "exiftool", "Forensics"]}
      terminalLabel="DFIR Workstation — Kali Linux (Forensics Mode)"
      duration={60}
      intro={intro}
      steps={steps}
    />
  );
}