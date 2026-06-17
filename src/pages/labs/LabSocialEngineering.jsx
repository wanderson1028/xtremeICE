import React from "react";
import LabRunner from "@/components/labs/LabRunner";

const steps = [
  {
    stepLabel: "Identify phishing email headers",
    explanation: "Use the 'mail' tool to inspect email headers of a suspicious message. Headers reveal the true sender, relay servers, and routing path.",
    whyItMatters: "Phishing emails often spoof the 'From' address. Reading raw headers exposes the actual origin IP, relay chain, and forged fields attackers use to impersonate trusted senders.",
    command: "mail -H",
    prompt: "analyst@soc:~$",
    output: [
      "Heirloom Mail version 12.5 7/5/10. Type ? for help.",
      "/var/mail/analyst: 3 messages 1 new",
      ">N  1 noreply@paypa1.com   Mon Jun  2 08:14  27/892   URGENT: Verify your account",
      "   2 it-support@corp.com  Mon Jun  2 09:03  18/510   Scheduled maintenance",
      "   3 ceo@c0rp.com         Mon Jun  2 11:45  22/610   Wire transfer request",
    ],
    question: {
      text: "Looking at the inbox listing, which message is the strongest phishing indicator and why?",
      options: [
        "Message 2 from it-support@corp.com — internal IT emails are always suspicious",
        "Message 1 from noreply@paypa1.com — 'paypa1.com' is a typosquat of paypal.com and uses urgency tactics",
        "Message 3 from ceo@c0rp.com — wire transfer requests are always legitimate CEO directives",
        "All three messages look identical in risk level",
      ],
      correctIndex: 1,
      explanation: "Typosquatting replaces letters with lookalikes (e.g. 'l' → '1') to create convincing fake domains. Combined with an 'URGENT' subject line — a classic pressure tactic — this is a textbook phishing setup. Message 2 is from a legitimate internal domain, and Message 3's premise (CEO wire transfer) is suspicious but the domain clue is less obvious at a glance.",
    },
  },
  {
    stepLabel: "Analyze suspicious email headers",
    explanation: "Read the full headers of message 1 to check the Return-Path, Received-From chain, and DKIM/SPF alignment.",
    whyItMatters: "DKIM and SPF failures are strong indicators of spoofing. The Return-Path and Received headers expose the true originating mail server — often a compromised or rented host.",
    command: "mail -p 1",
    prompt: "analyst@soc:~$",
    output: [
      "Message  1:",
      "From: noreply@paypa1.com",
      "Return-Path: <bounce@smtp-bulk-247.ru>",
      "Received: from smtp-bulk-247.ru (185.220.101.45)",
      "DKIM-Signature: FAIL",
      "SPF: FAIL (domain paypa1.com not authorized)",
      "Subject: URGENT: Verify your account",
      "",
      "Dear valued customer, your PayPal account has been limited...",
      "[LINK] http://paypa1.com.verify-now.xyz/login",
      "",
      "[!] PHISHING INDICATORS DETECTED: Typosquat domain, SPF/DKIM fail, suspicious link",
    ],
    question: {
      text: "The Return-Path shows 'bounce@smtp-bulk-247.ru' but the From address says 'noreply@paypa1.com'. What does this discrepancy tell you?",
      options: [
        "Nothing — it's normal for From and Return-Path to differ in bulk email systems",
        "The email was sent from a Russian bulk mail server, not PayPal — the From address is spoofed to impersonate a trusted brand",
        "The .ru domain proves the sender is in Russia, which makes it automatically malicious",
        "Return-Path is only used for delivery receipts and has no security significance",
      ],
      correctIndex: 1,
      explanation: "The Return-Path is the actual envelope sender — the address mail servers use for bounce handling. When it differs from the From address and points to a bulk mail server in a foreign country, it means the From field was manually crafted to impersonate a trusted brand. This is a core email spoofing technique. Option A is partially true for bulk mail but ignores the security implication, and option C is an overgeneralization.",
    },
  },
  {
    stepLabel: "Extract URLs from the email body",
    explanation: "Use grep to extract all URLs from the raw email and identify malicious links. Attackers embed redirect chains to obfuscate the final destination.",
    whyItMatters: "Phishing links often use URL shorteners, redirectors, or lookalike domains. Extracting and inspecting every URL is critical to understanding the full attack chain.",
    command: "grep -Eo 'https?://[^\"[:space:]]+' /var/mail/analyst",
    prompt: "analyst@soc:~$",
    output: [
      "http://paypa1.com.verify-now.xyz/login",
      "http://bit.ly/3xZ9mPa",
      "http://185.220.101.45/payload.exe",
      "",
      "[*] 3 URLs extracted. Cross-reference with threat intel feeds.",
    ],
    question: {
      text: "Of the 3 extracted URLs, which one is the most immediately dangerous and why?",
      options: [
        "http://bit.ly/3xZ9mPa — URL shorteners always hide malicious destinations",
        "http://paypa1.com.verify-now.xyz/login — it's a credential harvesting page on a typosquat domain",
        "http://185.220.101.45/payload.exe — it's a direct link to an executable file being served from a raw IP address",
        "All three are equally dangerous and should be treated the same way",
      ],
      correctIndex: 2,
      explanation: "A direct link to a .exe file hosted on a raw IP address (no domain, no HTTPS) is the clearest sign of a malware dropper — clicking it would immediately download and potentially execute a malicious payload. The typosquat credential page is dangerous too, but it requires the victim to enter credentials. URL shorteners are suspicious but not inherently malicious — many legitimate services use them.",
    },
  },
  {
    stepLabel: "Check URL reputation via CLI",
    explanation: "Query a threat intelligence source for the reputation of the suspicious domain using curl against an API endpoint.",
    whyItMatters: "Automating threat intel lookups at scale is a core SOC skill. Integrating tools like VirusTotal, URLhaus, or AbuseIPDB into workflows reduces mean time to detect (MTTD).",
    command: "curl -s 'https://urlhaus-api.abuse.ch/v1/url/' -d 'url=http://paypa1.com.verify-now.xyz/login'",
    prompt: "analyst@soc:~$",
    output: [
      "{",
      '  "query_status": "is_listed",',
      '  "urlhaus_reference": "https://urlhaus.abuse.ch/url/2847139/",',
      '  "threat": "malware_download",',
      '  "blacklists": {',
      '    "gsb": "listed",',
      '    "surbl": "listed"',
      "  },",
      '  "date_added": "2026-06-01 14:23:00 UTC"',
      "}",
      "",
      "[!] URL is BLACKLISTED — confirmed phishing/malware delivery site",
    ],
    question: {
      text: "The API response shows 'gsb: listed' and 'surbl: listed'. What does being listed on both blacklists mean for incident response priority?",
      options: [
        "It means the URL was reported once and may be a false positive — low priority",
        "GSB (Google Safe Browsing) and SURBL are independent reputation systems; dual listing confirms the URL is widely known as malicious and should be blocked immediately at the email gateway and proxy",
        "Blacklist listings expire quickly, so this URL is probably safe to visit now",
        "It only matters if the user actually clicked the link — no action needed otherwise",
      ],
      correctIndex: 1,
      explanation: "GSB (Google Safe Browsing) and SURBL are entirely independent blacklists maintained by different organizations. Appearing on both means the URL has been flagged from multiple sources and multiple industries — this virtually eliminates the chance of a false positive. The priority should be maximum: block at the email gateway, proxy, and DNS level immediately. Waiting for a user to click is reactive, not proactive.",
    },
  },
  {
    stepLabel: "Simulate SET phishing page creation",
    explanation: "Launch the Social-Engineer Toolkit (SET) in simulation mode to see how an attacker clones a login page for credential harvesting.",
    whyItMatters: "Understanding attacker tools is essential for defenders. SET can clone any website in seconds. Recognizing these cloned pages helps you train users to spot subtle URL differences.",
    command: "setoolkit --simulate credential_harvester --clone https://example-bank.com",
    prompt: "root@kali:~#",
    output: [
      "[*] Social-Engineer Toolkit (SET) v9.0.3",
      "[*] SIMULATION MODE — no real network activity",
      "[*] Cloning https://example-bank.com ...",
      "[*] Page cloned successfully to /var/www/html/index.html",
      "[*] Credential harvester listening on 0.0.0.0:80",
      "",
      "[SIMULATION] Victim visits http://192.168.1.50",
      "[SIMULATION] Victim enters: username=jsmith password=Password123",
      "[*] CREDENTIALS HARVESTED: jsmith:Password123",
      "",
      "[!] DEFENDER NOTE: HTTPS with valid cert + user training defeats most harvesting attacks",
    ],
    question: {
      text: "SET harvested 'jsmith:Password123' from the cloned page. As a defender, what single control would have most effectively prevented this credential theft?",
      options: [
        "A stronger password policy requiring 16+ characters — longer passwords can't be stolen this way",
        "Multi-Factor Authentication (MFA) — even with the correct password, the attacker cannot log in without the second factor",
        "HTTPS on the real bank site — cloned pages can't use HTTPS so users would notice",
        "Blocking SET on all company computers — attackers would just use a different tool",
      ],
      correctIndex: 1,
      explanation: "MFA means an attacker who steals a password still cannot access the account — they lack the second factor (e.g. a one-time code from an authenticator app). A stronger password doesn't help because the actual plaintext password was captured, not guessed. HTTPS on the real site doesn't prevent SET from deploying its own HTTPS-enabled clone. Blocking SET only removes one tool from an attacker's large arsenal.",
    },
  },
  {
    stepLabel: "Generate awareness report",
    explanation: "Create a phishing awareness report summarizing the attack vectors identified during this exercise.",
    whyItMatters: "Documenting findings in clear, actionable reports is how security teams communicate risk to leadership and drive defensive improvements across the organization.",
    command: "echo 'Phishing Analysis Complete. 3 attack vectors identified: typosquat domain, credential harvester, malware dropper. Recommend: email gateway filters, user awareness training, MFA enforcement.' > /tmp/phishing_report.txt && cat /tmp/phishing_report.txt",
    prompt: "analyst@soc:~$",
    output: [
      "Phishing Analysis Complete. 3 attack vectors identified: typosquat domain, credential harvester, malware dropper.",
      "Recommend: email gateway filters, user awareness training, MFA enforcement.",
      "",
      "[*] Report saved to /tmp/phishing_report.txt",
    ],
    question: {
      text: "Your report recommends 'email gateway filters'. Which filtering capability specifically addresses the SPF/DKIM failures observed in this lab?",
      options: [
        "Attachment sandboxing — it detonates suspicious files before delivery",
        "DMARC enforcement — it instructs receiving mail servers to reject or quarantine messages that fail SPF and DKIM alignment checks",
        "Link rewriting — it replaces URLs with safe redirects before delivery",
        "Content filtering — it scans email body text for phishing keywords",
      ],
      correctIndex: 1,
      explanation: "DMARC (Domain-based Message Authentication, Reporting & Conformance) is the policy layer built on top of SPF and DKIM. It tells receiving mail servers what to do when a message fails those checks — reject it, quarantine it, or report it. Without DMARC enforcement, even a perfect SPF/DKIM setup is informational only. Attachment sandboxing, link rewriting, and content filtering are valuable but address different threat vectors.",
    },
  },
];

const intro = {
  overview: "This lab introduces you to the techniques attackers use to manipulate people into revealing credentials or installing malware. You'll analyze real phishing email headers, extract malicious URLs, query threat intelligence feeds, and simulate a credential harvesting attack using SET — all from a SOC analyst's perspective.",
  niceCategory: "Protect and Defend",
  objectives: [
    "Inspect raw email headers to identify spoofed senders and failed SPF/DKIM validation",
    "Extract and enumerate malicious URLs embedded in phishing emails",
    "Query live threat intelligence APIs to classify malicious infrastructure",
    "Simulate a credential harvesting attack using the Social-Engineer Toolkit (SET)",
    "Produce a structured phishing incident report with remediation recommendations",
  ],
  outcomes: [
    "Able to triage phishing emails using command-line mail inspection tools",
    "Understand how SPF, DKIM, and DMARC protect against email spoofing",
    "Able to classify malicious domains using threat intel APIs (URLhaus, VirusTotal)",
    "Understand how attackers clone legitimate sites to harvest credentials",
    "Able to write a concise incident report documenting phishing attack vectors",
  ],
  prerequisites: [
    "Basic Linux command-line familiarity (ls, cat, grep)",
    "General understanding of how email is sent and received",
    "No prior cybersecurity experience required",
  ],
  tools: [
    "mail / Heirloom Mail — CLI email client for header inspection",
    "grep — pattern matching to extract URLs from email bodies",
    "curl — HTTP requests to query threat intelligence APIs",
    "SET (Social-Engineer Toolkit) — phishing simulation framework",
    "URLhaus API — abuse.ch threat intelligence feed",
  ],
};

export default function LabSocialEngineering() {
  return (
    <LabRunner
      labTitle="Social Engineering & Phishing Analysis"
      chapterNum="2"
      difficulty="Beginner"
      tags={["SET", "Phishing", "Email Analysis", "Threat Intel"]}
      terminalLabel="SOC Analyst Workstation — Ubuntu 22.04"
      duration={45}
      intro={intro}
      steps={steps}
    />
  );
}