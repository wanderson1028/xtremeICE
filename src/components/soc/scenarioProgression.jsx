// Per-scenario dynamic progression models for adaptive SOC training.
// Each scenario escalates differently — new alerts/logs appear over time,
// compromise spreads to new endpoints, and the threat level rises until contained.

export const COMPROMISED_MAP = {
  phishing_compromise: ["win-ws-01", "win-srv-01"],
  ransomware_outbreak: ["win-ws-01", "win-ws-02", "win-srv-01"],
  brute_force_vpn: ["vpn-gw"],
  lateral_movement: ["win-ws-01", "win-srv-01", "dc-01"],
  data_exfiltration: ["linux-srv-01"],
  insider_threat: ["win-ws-02"],
  web_compromise: ["linux-web-01"],
  ransomware_note_found: ["win-ws-01"],
  malicious_macro: ["win-ws-01"],
  dns_anomaly: ["win-ws-01"],
  av_detection: ["win-ws-01", "win-ws-02", "win-srv-01"],
  suspicious_login: ["win-ws-01"],
  malware_usb: ["win-ws-01"],
  password_spray: [],
  port_scan: [],
  rogue_wifi: [],
  account_lockout: [],
  spam_campaign: ["win-ws-02"],
  dlp_alert: [],
  web_phishing_report: [],
  unusual_process: ["win-ws-01"],
  privileged_misuse: [],
  rdp_external: ["win-srv-01"],
  crypto_miner: ["linux-srv-01"],
  fake_helpdesk: ["win-ws-02"],
  data_on_pastebin: [],
  shadow_it: [],
};

// ─── Escalation Events ──────────────────────────────────────────────────────
// Each event fires at a specific elapsed minute if the attack hasn't been contained.
// This is what makes scenarios feel different — each one escalates uniquely.

const ESCALATION_EVENTS = {
  ransomware_note_found: [
    {
      atMinute: 1,
      alert: { id: "esc1", title: "Encryption Started on DESKTOP-WIN01", sev: "critical", src: "DESKTOP-WIN01", tactic: "Impact", rule: "SIGMA: Mass file encryption detected" },
      log: { src: "10.0.1.10", type: "endpoint", sev: "critical", msg: "Mass file rename detected: 342 files renamed with .LOCKED extension in C:\\Users\\jsmith\\Documents" },
      spreadTo: ["win-ws-01"],
      threatIncrease: 10,
      message: "Ransomware has started encrypting files on DESKTOP-WIN01!",
    },
    {
      atMinute: 2,
      alert: { id: "esc2", title: "Encryption Spreading to SERVER-WIN01", sev: "critical", src: "SERVER-WIN01", tactic: "Impact", rule: "SIGMA: Lateral encryption via SMB" },
      log: { src: "10.0.2.10", type: "endpoint", sev: "critical", msg: "Encryption activity detected on SERVER-WIN01: 1,847 files affected via SMB share" },
      spreadTo: ["win-srv-01"],
      threatIncrease: 12,
      message: "Ransomware spread to SERVER-WIN01 — file server encrypting!",
    },
    {
      atMinute: 3,
      alert: { id: "esc3", title: "Backup Snapshots Destroyed", sev: "critical", src: "SERVER-WIN01", tactic: "Impact", rule: "SIGMA: VSS deletion on backup server" },
      log: { src: "10.0.2.10", type: "process", sev: "critical", msg: "vssadmin.exe delete shadows /all /quiet — all backup snapshots destroyed" },
      threatIncrease: 15,
      message: "CRITICAL: Backup server under attack — shadow copies being deleted!",
    },
  ],
  brute_force_vpn: [
    {
      atMinute: 1,
      alert: { id: "esc1", title: "Internal Network Scan from VPN", sev: "high", src: "10.10.0.55", tactic: "Discovery", rule: "SIGMA: Nmap scan from VPN IP" },
      log: { src: "10.10.0.55", type: "network", sev: "high", msg: "Port scan detected from VPN session — scanning 10.0.0.0/16" },
      threatIncrease: 8,
      message: "Attacker scanning internal network from compromised VPN session!",
    },
    {
      atMinute: 2,
      alert: { id: "esc2", title: "SMB Enumeration from VPN IP", sev: "high", src: "10.10.0.55", tactic: "Discovery", rule: "SIGMA: SMB enumeration" },
      log: { src: "10.10.0.55", type: "auth", sev: "high", msg: "SMB enumeration attempt from 10.10.0.55 to all internal hosts — preparing for lateral movement" },
      spreadTo: ["win-srv-01"],
      threatIncrease: 10,
      message: "Attacker enumerating internal shares — preparing for lateral movement!",
    },
    {
      atMinute: 3,
      alert: { id: "esc3", title: "Data Exfiltration via VPN", sev: "critical", src: "VPN-GATEWAY", tactic: "Exfiltration", rule: "DLP: 2.3GB outbound over VPN" },
      log: { src: "vpn-gw", type: "network", sev: "critical", msg: "Unusual data transfer: 2.3GB outbound over VPN session mjohnson to external IP" },
      threatIncrease: 12,
      message: "CRITICAL: Data being exfiltrated through VPN tunnel!",
    },
  ],
  malicious_macro: [
    {
      atMinute: 1,
      alert: { id: "esc1", title: "PowerShell C2 Beacon Established", sev: "critical", src: "DESKTOP-WIN01", tactic: "Command and Control", rule: "TI: Known C2 IP contacted" },
      log: { src: "10.0.1.10", type: "network", sev: "critical", msg: "Outbound connection to 185.220.101.5:443 from powershell.exe — C2 channel established" },
      threatIncrease: 8,
      message: "Malware has established C2 communication — attacker controlling endpoint!",
    },
    {
      atMinute: 2,
      alert: { id: "esc2", title: "Credential Dumping Detected", sev: "critical", src: "DESKTOP-WIN01", tactic: "Credential Access", rule: "SIGMA: LSASS memory read" },
      log: { src: "10.0.1.10", type: "process", sev: "critical", msg: "Mimikatz pattern detected: lsass.exe memory read by encoded PowerShell — credentials likely stolen" },
      spreadTo: ["win-srv-01"],
      threatIncrease: 10,
      message: "Attacker dumping credentials — preparing for lateral movement!",
    },
    {
      atMinute: 3,
      alert: { id: "esc3", title: "Lateral Movement to Server", sev: "critical", src: "SERVER-WIN01", tactic: "Lateral Movement", rule: "SIGMA: Remote execution via stolen creds" },
      log: { src: "10.0.2.10", type: "auth", sev: "critical", msg: "Successful authentication to SERVER-WIN01 using stolen jsmith credentials from 10.0.1.10" },
      threatIncrease: 12,
      message: "CRITICAL: Attacker moving laterally to file server using stolen credentials!",
    },
  ],
  dns_anomaly: [
    {
      atMinute: 1,
      alert: { id: "esc1", title: "C2 Communication Confirmed", sev: "critical", src: "DESKTOP-WIN01", tactic: "Command and Control", rule: "TI: Known DGA malware C2 domain" },
      log: { src: "10.0.1.10", type: "network", sev: "critical", msg: "C2 confirmed: DGA queries resolving to 91.213.85.10 — known C2 server for Dridex banking trojan" },
      threatIncrease: 8,
      message: "DGA malware confirmed as active C2 — attacker controlling endpoint!",
    },
    {
      atMinute: 2,
      alert: { id: "esc2", title: "Banking Credentials Staged", sev: "high", src: "DESKTOP-WIN01", tactic: "Collection", rule: "DLP: Browser credential access" },
      log: { src: "10.0.1.10", type: "process", sev: "high", msg: "Browser credential database accessed — banking and corporate credentials being exfiltrated" },
      spreadTo: ["win-ws-02"],
      threatIncrease: 10,
      message: "Malware harvesting banking credentials — spreading to new endpoint!",
    },
    {
      atMinute: 3,
      alert: { id: "esc3", title: "DNS Tunneling Exfiltration", sev: "critical", src: "dns-srv", tactic: "Exfiltration", rule: "SIGMA: DNS TXT data exfil" },
      log: { src: "dns-srv", type: "network", sev: "critical", msg: "DNS tunneling confirmed: encoded data being exfiltrated via TXT queries to attacker domain" },
      threatIncrease: 12,
      message: "CRITICAL: Data being exfiltrated through DNS tunnel!",
    },
  ],
  av_detection: [
    {
      atMinute: 1,
      alert: { id: "esc1", title: "Malware Spreading to New Host", sev: "high", src: "DESKTOP-WIN02", tactic: "Lateral Movement", rule: "AV: Same trojan family detected" },
      log: { src: "10.0.1.11", type: "endpoint", sev: "high", msg: "AV Alert: Trojan.GenericKD.47821 detected on DESKTOP-WIN02 — spreading via network share" },
      spreadTo: ["win-ws-02"],
      threatIncrease: 8,
      message: "Malware spreading to additional workstations via network shares!",
    },
    {
      atMinute: 2,
      alert: { id: "esc2", title: "Server Compromised", sev: "critical", src: "SERVER-WIN01", tactic: "Lateral Movement", rule: "AV: Trojan on server" },
      log: { src: "10.0.2.10", type: "endpoint", sev: "critical", msg: "AV Alert: Trojan.GenericKD detected on SERVER-WIN01 — quarantine failed, malware executing" },
      spreadTo: ["win-srv-01"],
      threatIncrease: 10,
      message: "Malware reached the file server — quarantine failed!",
    },
    {
      atMinute: 3,
      alert: { id: "esc3", title: "Persistence Mechanism Detected", sev: "critical", src: "SERVER-WIN01", tactic: "Persistence", rule: "SIGMA: Registry Run key modified" },
      log: { src: "10.0.2.10", type: "process", sev: "critical", msg: "Persistence detected: HKCU Run key 'svcupdate' added — malware will survive reboot" },
      threatIncrease: 12,
      message: "CRITICAL: Malware establishing persistence on server — will survive reboot!",
    },
  ],
  suspicious_login: [
    {
      atMinute: 1,
      alert: { id: "esc1", title: "Mailbox Access from Foreign IP", sev: "high", src: "auth-svc", tactic: "Collection", rule: "UBA: Email access from anomalous location" },
      log: { src: "auth-svc", type: "auth", sev: "high", msg: "jsmith mailbox accessed from 212.58.244.18 (London) — 342 emails read, 8 forwarded externally" },
      threatIncrease: 7,
      message: "Compromised account accessing corporate email from foreign location!",
    },
    {
      atMinute: 2,
      alert: { id: "esc2", title: "Email Forwarding Rule Created", sev: "critical", src: "mail-gw", tactic: "Collection", rule: "SIGMA: Auto-forwarding to external" },
      log: { src: "mail-gw", type: "email", sev: "critical", msg: "Email forwarding rule created: ALL incoming mail forwarded to attacker@gmail.com by jsmith session" },
      spreadTo: ["win-srv-01"],
      threatIncrease: 9,
      message: "Attacker creating email forwarding rules — exfiltrating corporate communications!",
    },
    {
      atMinute: 3,
      alert: { id: "esc3", title: "SharePoint Bulk Download", sev: "critical", src: "auth-svc", tactic: "Collection", rule: "DLP: Mass file access" },
      log: { src: "auth-svc", type: "file", sev: "critical", msg: "jsmith accessed 847 files in SharePoint Confidential folder in 3 minutes — data exfiltration likely" },
      threatIncrease: 11,
      message: "CRITICAL: Compromised account downloading confidential documents en masse!",
    },
  ],
  malware_usb: [
    {
      atMinute: 1,
      alert: { id: "esc1", title: "Malware Executing from USB", sev: "critical", src: "DESKTOP-WIN01", tactic: "Execution", rule: "EDR: AutoRun payload executing" },
      log: { src: "10.0.1.10", type: "process", sev: "critical", msg: "Trojan.AutoRun payload executing from E:\\setup.exe — establishing persistence on host" },
      threatIncrease: 8,
      message: "USB malware executing and establishing persistence on the endpoint!",
    },
    {
      atMinute: 2,
      alert: { id: "esc2", title: "C2 Beacon from Infected Host", sev: "high", src: "DESKTOP-WIN01", tactic: "Command and Control", rule: "TI: Known Trojan C2 IP" },
      log: { src: "10.0.1.10", type: "network", sev: "high", msg: "Outbound beacon to 194.165.22.10:443 every 30 seconds — C2 communication active" },
      spreadTo: ["win-ws-02"],
      threatIncrease: 9,
      message: "Malware beaconing to C2 server — attacker has remote access!",
    },
    {
      atMinute: 3,
      alert: { id: "esc3", title: "Lateral Movement via USB Share", sev: "critical", src: "DESKTOP-WIN02", tactic: "Lateral Movement", rule: "SIGMA: Infected file on network share" },
      log: { src: "10.0.1.11", type: "file", sev: "critical", msg: "Infected file copied to \\\\SERVER-WIN01\\Public\\ — users may execute via AutoRun" },
      threatIncrease: 11,
      message: "CRITICAL: Malware spreading via network shares — more endpoints at risk!",
    },
  ],
  password_spray: [
    {
      atMinute: 1,
      alert: { id: "esc1", title: "Additional Accounts Compromised", sev: "critical", src: "auth-svc", tactic: "Credential Access", rule: "AUTH: Multiple spray successes" },
      log: { src: "auth-svc", type: "auth", sev: "critical", msg: "Password spray success: 3 more accounts authenticated — svc_backup, svc_monitor, helpdesk02" },
      threatIncrease: 8,
      message: "Password spray succeeding on more accounts — multiple compromises!",
    },
    {
      atMinute: 2,
      alert: { id: "esc2", title: "Privileged Account Access", sev: "critical", src: "auth-svc", tactic: "Privilege Escalation", rule: "AUTH: Admin account spray success" },
      log: { src: "auth-svc", type: "auth", sev: "critical", msg: "CRITICAL: svc_backup account has Domain Admin privileges — attacker escalating" },
      spreadTo: ["dc-01"],
      threatIncrease: 10,
      message: "Attacker compromised a privileged account — domain admin access!",
    },
    {
      atMinute: 3,
      alert: { id: "esc3", title: "Domain Controller Access", sev: "critical", src: "DC-PRIMARY", tactic: "Lateral Movement", rule: "AUTH: DC login from external IP" },
      log: { src: "dc-01", type: "auth", sev: "critical", msg: "Domain Controller accessed using compromised svc_backup credentials from 91.108.56.180" },
      threatIncrease: 12,
      message: "CRITICAL: Attacker accessing Domain Controller with stolen credentials!",
    },
  ],
  crypto_miner: [
    {
      atMinute: 1,
      alert: { id: "esc1", title: "Mining Pool Connection Active", sev: "high", src: "LINUX-APP01", tactic: "Impact", rule: "TI: Mining pool connection confirmed" },
      log: { src: "linux-srv-01", type: "network", sev: "high", msg: "xmrig connected to pool.minexmr.com:443 — mining actively consuming server resources" },
      threatIncrease: 7,
      message: "Cryptominer actively mining — server performance degrading!",
    },
    {
      atMinute: 2,
      alert: { id: "esc2", title: "Miner Spreading to New Host", sev: "high", src: "LINUX-WEB01", tactic: "Lateral Movement", rule: "EDR: xmrig binary on new host" },
      log: { src: "linux-web-01", type: "process", sev: "high", msg: "xmrig binary detected on LINUX-WEB01 — miner spreading via SSH key reuse" },
      spreadTo: ["linux-web-01"],
      threatIncrease: 9,
      message: "Cryptominer spreading to additional servers!",
    },
    {
      atMinute: 3,
      alert: { id: "esc3", title: "Persistence via Systemd", sev: "critical", src: "LINUX-APP01", tactic: "Persistence", rule: "SIGMA: Malicious systemd service" },
      log: { src: "linux-srv-01", type: "process", sev: "critical", msg: "systemd service 'update-checker' modified to auto-start xmrig on boot — persistence established" },
      threatIncrease: 11,
      message: "CRITICAL: Miner establishing persistence — will survive reboots!",
    },
  ],
  rdp_external: [
    {
      atMinute: 1,
      alert: { id: "esc1", title: "RDP Brute Force Intensifying", sev: "high", src: "SERVER-WIN01", tactic: "Credential Access", rule: "SIGMA: RDP attempts increasing" },
      log: { src: "10.0.2.10", type: "auth", sev: "high", msg: "RDP brute force escalating: 312 attempts from 91.92.247.11 — password list becoming more targeted" },
      threatIncrease: 7,
      message: "RDP brute force attack intensifying — more password guesses per second!",
    },
    {
      atMinute: 2,
      alert: { id: "esc2", title: "Successful RDP Login from Attacker", sev: "critical", src: "SERVER-WIN01", tactic: "Initial Access", rule: "AUTH: RDP success from external" },
      log: { src: "10.0.2.10", type: "auth", sev: "critical", msg: "CRITICAL: Successful RDP login — Administrator from 91.92.247.11, attacker has server access" },
      spreadTo: ["win-srv-01"],
      threatIncrease: 10,
      message: "Attacker brute-forced RDP — they have direct access to the server!",
    },
    {
      atMinute: 3,
      alert: { id: "esc3", title: "Malware Deployed via RDP", sev: "critical", src: "SERVER-WIN01", tactic: "Execution", rule: "EDR: Remote execution of malware" },
      log: { src: "10.0.2.10", type: "process", sev: "critical", msg: "Malware deployed: attacker executed setup.exe via RDP session — ransomware payload detected" },
      threatIncrease: 12,
      message: "CRITICAL: Attacker deploying ransomware through RDP session!",
    },
  ],
  rogue_wifi: [
    {
      atMinute: 1,
      alert: { id: "esc1", title: "More Devices Connecting to Rogue AP", sev: "high", src: "wlan-sensor", tactic: "Collection", rule: "WLAN: Additional devices on rogue AP" },
      log: { src: "wlan-sensor", type: "network", sev: "high", msg: "7 corporate devices now connected to rogue AP — credentials being captured" },
      threatIncrease: 7,
      message: "More corporate devices connecting to rogue AP — credential capture active!",
    },
    {
      atMinute: 2,
      alert: { id: "esc2", title: "Credential Interception Confirmed", sev: "critical", src: "wlan-sensor", tactic: "Credential Access", rule: "DLP: Cleartext auth on rogue AP" },
      log: { src: "wlan-sensor", type: "network", sev: "critical", msg: "Credential capture confirmed: 3 users authenticated through rogue AP — NTLM hashes intercepted" },
      spreadTo: ["win-ws-01"],
      threatIncrease: 9,
      message: "Attacker intercepting credentials through rogue AP — corporate accounts at risk!",
    },
    {
      atMinute: 3,
      alert: { id: "esc3", title: "Rogue AP Pivot to Internal Network", sev: "critical", src: "fw-01", tactic: "Lateral Movement", rule: "FW: Traffic from rogue AP to internal" },
      log: { src: "fw-01", type: "firewall", sev: "critical", msg: "Rogue AP bridging to internal network — attacker accessing internal resources via captured credentials" },
      threatIncrease: 11,
      message: "CRITICAL: Attacker using captured credentials to access internal network!",
    },
  ],
  account_lockout: [
    {
      atMinute: 1,
      alert: { id: "esc1", title: "Lockout Storm Spreading", sev: "high", src: "dc-01", tactic: "Credential Access", rule: "AUTH: Lockouts increasing" },
      log: { src: "dc-01", type: "auth", sev: "high", msg: "Account lockout count: 127 accounts locked in 15 minutes — help desk overwhelmed" },
      threatIncrease: 7,
      message: "Account lockout storm escalating — business operations disrupted!",
    },
    {
      atMinute: 2,
      alert: { id: "esc2", title: "Successful Auth on Locked Account", sev: "critical", src: "vpn-gw", tactic: "Initial Access", rule: "AUTH: Success after lockout reset" },
      log: { src: "vpn-gw", type: "auth", sev: "critical", msg: "CRITICAL: Locked account svc_helpdesk successfully authenticated from 91.92.0.50 after password reset — attacker exploiting reset workflow" },
      spreadTo: ["vpn-gw"],
      threatIncrease: 10,
      message: "Attacker exploiting password reset workflow — compromised account active!",
    },
    {
      atMinute: 3,
      alert: { id: "esc3", title: "Service Disruption — All Accounts Locked", sev: "critical", src: "dc-01", tactic: "Impact", rule: "AUTH: Mass lockout threshold" },
      log: { src: "dc-01", type: "auth", sev: "critical", msg: "Business impact: 340+ accounts locked — employees unable to work, IT operations paralyzed" },
      threatIncrease: 12,
      message: "CRITICAL: Mass account lockout causing business-wide service disruption!",
    },
  ],
  spam_campaign: [
    {
      atMinute: 1,
      alert: { id: "esc1", title: "More Users Opening Malicious Attachments", sev: "high", src: "mail-gw", tactic: "Execution", rule: "DLP: Macro execution spreading" },
      log: { src: "mail-gw", type: "email", sev: "high", msg: "Macro execution detected on 4 additional endpoints — Invoice_March.xlsm opened by multiple users" },
      spreadTo: ["win-ws-01"],
      threatIncrease: 8,
      message: "More employees opening malicious attachments — malware spreading!",
    },
    {
      atMinute: 2,
      alert: { id: "esc2", title: "C2 Beacon from Multiple Hosts", sev: "critical", src: "Multiple", tactic: "Command and Control", rule: "TI: Multiple C2 connections" },
      log: { src: "fw-01", type: "firewall", sev: "critical", msg: "C2 beaconing detected from 5 endpoints to 185.220.101.5 — coordinated malware activation" },
      spreadTo: ["win-ws-02"],
      threatIncrease: 10,
      message: "Multiple endpoints now beaconing to C2 — coordinated attack active!",
    },
    {
      atMinute: 3,
      alert: { id: "esc3", title: "Email Server Relay Abuse", sev: "critical", src: "mail-gw", tactic: "Impact", rule: "DLP: Outbound spam from compromised accounts" },
      log: { src: "mail-gw", type: "email", sev: "critical", msg: "Compromised accounts sending spam externally — company domain being blacklisted by RBLs" },
      threatIncrease: 12,
      message: "CRITICAL: Company email domain being blacklisted — outbound reputation damaged!",
    },
  ],
  dlp_alert: [
    {
      atMinute: 1,
      alert: { id: "esc1", title: "Additional Credit Card Data Sent", sev: "high", src: "mail-gw", tactic: "Exfiltration", rule: "DLP: More PCI data in email" },
      log: { src: "mail-gw", type: "email", sev: "high", msg: "DLP: Second email with 67 credit card numbers sent to personal@gmail.com — pattern continuing" },
      threatIncrease: 7,
      message: "Additional credit card data being exfiltrated — breach expanding!",
    },
    {
      atMinute: 2,
      alert: { id: "esc2", title: "Customer Database Access", sev: "critical", src: "LINUX-APP01", tactic: "Collection", rule: "DLP: Bulk PII access" },
      log: { src: "10.0.2.20", type: "file", sev: "critical", msg: "jsmith accessed customer_database — 4,200 records containing full PII and payment data" },
      spreadTo: ["linux-srv-01"],
      threatIncrease: 9,
      message: "Attacker accessing customer database — bulk PII at risk!",
    },
    {
      atMinute: 3,
      alert: { id: "esc3", title: "External Upload of Customer Data", sev: "critical", src: "fw-01", tactic: "Exfiltration", rule: "DLP: Large outbound transfer" },
      log: { src: "fw-01", type: "firewall", sev: "critical", msg: "1.8GB outbound transfer to personal cloud storage — customer PII likely exfiltrated" },
      threatIncrease: 11,
      message: "CRITICAL: Customer data exfiltrated — regulatory breach notification required!",
    },
  ],
  web_phishing_report: [
    {
      atMinute: 1,
      alert: { id: "esc1", title: "Additional Users Clicked Phishing Link", sev: "high", src: "proxy", tactic: "Initial Access", rule: "PROXY: Multiple visits to phishing URL" },
      log: { src: "proxy", type: "web", sev: "high", msg: "Proxy logs show 5 additional employees visited the phishing URL — credentials likely harvested" },
      spreadTo: ["win-ws-02"],
      threatIncrease: 8,
      message: "More employees fell for the phishing link — multiple accounts compromised!",
    },
    {
      atMinute: 2,
      alert: { id: "esc2", title: "Credential Harvesting Confirmed", sev: "critical", src: "auth-svc", tactic: "Credential Access", rule: "AUTH: Multiple accounts from phishing IP" },
      log: { src: "auth-svc", type: "auth", sev: "critical", msg: "5 accounts authenticated from phishing server IP 91.92.247.18 — credentials harvested from fake login page" },
      threatIncrease: 10,
      message: "Attacker harvested credentials from multiple employees — mass account takeover!",
    },
    {
      atMinute: 3,
      alert: { id: "esc3", title: "Email Account Takeover", sev: "critical", src: "mail-gw", tactic: "Collection", rule: "UBA: Multiple mailbox access from phishing IP" },
      log: { src: "mail-gw", type: "email", sev: "critical", msg: "Compromised accounts being used to send phishing emails internally — attack propagating from within" },
      threatIncrease: 12,
      message: "CRITICAL: Compromised accounts sending phishing internally — attack spreading!",
    },
  ],
  unusual_process: [
    {
      atMinute: 1,
      alert: { id: "esc1", title: "C2 Beacon Pattern Confirmed", sev: "critical", src: "DESKTOP-WIN01", tactic: "Command and Control", rule: "TI: Known C2 IP" },
      log: { src: "10.0.1.10", type: "network", sev: "critical", msg: "C2 confirmed: svchost32.exe beaconing to 5.188.10.220 every 60 seconds — known C2 server" },
      threatIncrease: 8,
      message: "Unknown process confirmed as C2 malware — attacker has remote control!",
    },
    {
      atMinute: 2,
      alert: { id: "esc2", title: "Persistence Mechanism Installed", sev: "high", src: "DESKTOP-WIN01", tactic: "Persistence", rule: "SIGMA: Registry Run key added" },
      log: { src: "10.0.1.10", type: "process", sev: "high", msg: "Persistence: HKCU\\Run\\svcupdate registry key added — svchost32.exe will auto-start on login" },
      spreadTo: ["win-ws-02"],
      threatIncrease: 9,
      message: "Malware establishing persistence — will survive reboots and spreading!",
    },
    {
      atMinute: 3,
      alert: { id: "esc3", title: "Credential Dumping Detected", sev: "critical", src: "DESKTOP-WIN01", tactic: "Credential Access", rule: "EDR: LSASS access" },
      log: { src: "10.0.1.10", type: "process", sev: "critical", msg: "Credential dump: svchost32.exe reading LSASS memory — domain credentials being stolen" },
      threatIncrease: 11,
      message: "CRITICAL: Malware dumping credentials — domain accounts at risk!",
    },
  ],
  privileged_misuse: [
    {
      atMinute: 1,
      alert: { id: "esc1", title: "More Financial Files Accessed", sev: "high", src: "SERVER-WIN01", tactic: "Collection", rule: "UBA: Continued unusual file access" },
      log: { src: "10.0.2.10", type: "file", sev: "high", msg: "svc-backup accessed additional 247 financial documents — Q4 payroll, vendor payments, tax filings" },
      threatIncrease: 7,
      message: "Privileged account continuing to access financial data — bulk exfiltration risk!",
    },
    {
      atMinute: 2,
      alert: { id: "esc2", title: "Data Staged for Exfiltration", sev: "critical", src: "SERVER-WIN01", tactic: "Collection", rule: "DLP: Archive creation on server" },
      log: { src: "10.0.2.10", type: "process", sev: "critical", msg: "Archive created: 7z.exe a -mhe=on financial_dump.7z Finance/ — 1.2GB of sensitive data staged" },
      spreadTo: ["win-srv-01"],
      threatIncrease: 9,
      message: "Financial data being staged for exfiltration — archive created on server!",
    },
    {
      atMinute: 3,
      alert: { id: "esc3", title: "Data Uploaded to Personal Cloud", sev: "critical", src: "fw-01", tactic: "Exfiltration", rule: "DLP: Large outbound to personal cloud" },
      log: { src: "fw-01", type: "firewall", sev: "critical", msg: "1.2GB outbound upload to personal cloud storage from SERVER-WIN01 — financial data exfiltration confirmed" },
      threatIncrease: 11,
      message: "CRITICAL: Financial data exfiltrated — regulatory and legal implications!",
    },
  ],
  fake_helpdesk: [
    {
      atMinute: 1,
      alert: { id: "esc1", title: "Remote Access Tool Spreading", sev: "high", src: "DESKTOP-WIN02", tactic: "Execution", rule: "EDR: RAT installed on new host" },
      log: { src: "10.0.1.11", type: "process", sev: "high", msg: "AnyDesk installed on DESKTOP-WIN02 — attacker using compromised session to install RAT on additional hosts" },
      spreadTo: ["win-ws-02"],
      threatIncrease: 8,
      message: "Remote access tool spreading to additional endpoints — attacker expanding control!",
    },
    {
      atMinute: 2,
      alert: { id: "esc2", title: "Credential Theft via RAT", sev: "critical", src: "DESKTOP-WIN02", tactic: "Credential Access", rule: "EDR: Password manager access" },
      log: { src: "10.0.1.11", type: "process", sev: "critical", msg: "Attacker accessing Chrome password manager via AnyDesk — 47 saved corporate credentials extracted" },
      threatIncrease: 10,
      message: "Attacker stealing saved credentials via remote access — mass account compromise!",
    },
    {
      atMinute: 3,
      alert: { id: "esc3", title: "Domain Controller Access Attempt", sev: "critical", src: "DC-PRIMARY", tactic: "Lateral Movement", rule: "AUTH: DC login from compromised host" },
      log: { src: "dc-01", type: "auth", sev: "critical", msg: "Authentication attempt to DC-PRIMARY using stolen admin credentials from DESKTOP-WIN02 — attacker targeting domain" },
      threatIncrease: 12,
      message: "CRITICAL: Attacker using stolen credentials to access Domain Controller!",
    },
  ],
  data_on_pastebin: [
    {
      atMinute: 1,
      alert: { id: "esc1", title: "More Credentials Found on Dark Web", sev: "high", src: "ti-feed", tactic: "Credential Access", rule: "TI: Additional leaks found" },
      log: { src: "ti-feed", type: "cloud", sev: "high", msg: "Threat Intel: 234 additional employee credentials found on dark web forum — leak larger than initially reported" },
      threatIncrease: 7,
      message: "More employee credentials found on dark web — breach scope expanding!",
    },
    {
      atMinute: 2,
      alert: { id: "esc2", title: "Credential Stuffing Attack Detected", sev: "critical", src: "auth-svc", tactic: "Initial Access", rule: "AUTH: Multiple logins from leaked creds" },
      log: { src: "auth-svc", type: "auth", sev: "critical", msg: "Credential stuffing: 47 login attempts using leaked credentials — 12 successful authentications" },
      spreadTo: ["win-ws-01"],
      threatIncrease: 9,
      message: "Attackers using leaked credentials for credential stuffing — accounts being compromised!",
    },
    {
      atMinute: 3,
      alert: { id: "esc3", title: "Privileged Account Compromise", sev: "critical", src: "auth-svc", tactic: "Privilege Escalation", rule: "AUTH: Admin login from foreign IP" },
      log: { src: "auth-svc", type: "auth", sev: "critical", msg: "CRITICAL: Domain admin account svc_admin authenticated from 91.108.56.50 — privileged access using leaked password" },
      threatIncrease: 11,
      message: "CRITICAL: Privileged account compromised using leaked credentials — domain at risk!",
    },
  ],
  shadow_it: [
    {
      atMinute: 1,
      alert: { id: "esc1", title: "More Employees Using Unsanctioned Apps", sev: "high", src: "proxy", tactic: "Exfiltration", rule: "DLP: Additional unsanctioned uploads" },
      log: { src: "proxy", type: "web", sev: "high", msg: "Shadow IT: 18 additional employees uploading to unsanctioned cloud apps — policy violations increasing" },
      threatIncrease: 7,
      message: "More employees using unsanctioned cloud apps — data governance failing!",
    },
    {
      atMinute: 2,
      alert: { id: "esc2", title: "Confidential Data Uploaded", sev: "critical", src: "dlp-engine", tactic: "Exfiltration", rule: "DLP: Confidential classification in upload" },
      log: { src: "dlp-engine", type: "file", sev: "critical", msg: "DLP: 'merger_acquisition_2026.docx' uploaded to personal Box account — confidential corporate strategy at risk" },
      spreadTo: ["win-ws-01"],
      threatIncrease: 9,
      message: "Confidential corporate documents being uploaded to personal cloud — data leak!",
    },
    {
      atMinute: 3,
      alert: { id: "esc3", title: "External App Account Compromised", sev: "critical", src: "ti-feed", tactic: "Credential Access", rule: "TI: Cloud app credentials leaked" },
      log: { src: "ti-feed", type: "cloud", sev: "critical", msg: "Threat Intel: Corporate Box account credentials found in breach database — attacker accessing uploaded files" },
      threatIncrease: 11,
      message: "CRITICAL: Cloud app credentials compromised — attacker accessing exfiltrated corporate data!",
    },
  ],
  port_scan: [
    {
      atMinute: 1,
      alert: { id: "esc1", title: "Scan Intensifying — New Ports Probed", sev: "high", src: "fw-01", tactic: "Reconnaissance", rule: "FW: Scan expanding to high ports" },
      log: { src: "fw-01", type: "firewall", sev: "high", msg: "Port scan expanding: now probing ports 22, 3389, 5432, 3306, 6379, 27017 — targeting database and remote access services" },
      threatIncrease: 6,
      message: "Port scan intensifying — attacker probing for database and remote access services!",
    },
    {
      atMinute: 2,
      alert: { id: "esc2", title: "Vulnerable Service Identified", sev: "critical", src: "fw-01", tactic: "Reconnaissance", rule: "FW: Scan response on vulnerable port" },
      log: { src: "fw-01", type: "firewall", sev: "critical", msg: "Scan confirmed: port 3389 (RDP) open on SERVER-WIN01 — attacker identified exploitable service" },
      spreadTo: ["win-srv-01"],
      threatIncrease: 8,
      message: "Attacker identified open RDP port — preparing exploitation!",
    },
    {
      atMinute: 3,
      alert: { id: "esc3", title: "Exploitation Attempt Detected", sev: "critical", src: "SERVER-WIN01", tactic: "Initial Access", rule: "IDS: RDP exploit attempt" },
      log: { src: "10.0.2.10", type: "auth", sev: "critical", msg: "Exploitation attempt: RDP connection from 185.234.219.5 to SERVER-WIN01 — brute force using scan results" },
      threatIncrease: 10,
      message: "CRITICAL: Attacker exploiting discovered services — server under active attack!",
    },
  ],
};

// Generic fallback for scenarios without specific escalation events
function generateGenericEscalation(scenarioId) {
  return [
    {
      atMinute: 1,
      alert: { id: "esc1", title: "Attack Activity Increasing", sev: "high", src: "Multiple", tactic: "Execution", rule: "SIGMA: Increased malicious activity" },
      log: { src: "multiple", type: "process", sev: "high", msg: "Multiple endpoints showing increased suspicious activity — attack escalating" },
      threatIncrease: 7,
      message: "Attack activity increasing — more systems showing signs of compromise!",
    },
    {
      atMinute: 2,
      alert: { id: "esc2", title: "Lateral Movement Detected", sev: "critical", src: "Internal", tactic: "Lateral Movement", rule: "SIGMA: Cross-host authentication anomaly" },
      log: { src: "internal", type: "auth", sev: "critical", msg: "Lateral movement detected — attacker pivoting between internal hosts using stolen credentials" },
      spreadTo: ["win-srv-01"],
      threatIncrease: 9,
      message: "Attacker moving laterally — additional systems at risk!",
    },
    {
      atMinute: 3,
      alert: { id: "esc3", title: "Critical System Targeted", sev: "critical", src: "DC-PRIMARY", tactic: "Credential Access", rule: "SIGMA: Domain controller targeted" },
      log: { src: "dc-01", type: "auth", sev: "critical", msg: "Authentication anomaly targeting domain controller — attacker attempting privileged access" },
      threatIncrease: 11,
      message: "CRITICAL: Domain controller under active attack — privileged systems at risk!",
    },
  ];
}

// ─── Action Consequences ────────────────────────────────────────────────────
// When an action is performed correctly, it has real effects on the simulation:
// closes related alerts, isolates endpoints, and reduces the threat level.

const ACTION_CONSEQUENCES = {
  isolate_host: {
    threatReduction: 15,
    closeAlertTactics: ["Lateral Movement", "Impact"],
    isolateFirstCompromised: true,
    message: "Host isolated — lateral movement blocked from this endpoint",
  },
  block_ip: {
    threatReduction: 12,
    closeAlertTactics: ["Command and Control"],
    message: "Attacker IP blocked — C2 traffic severed",
  },
  disable_user: {
    threatReduction: 10,
    closeAlertTactics: ["Initial Access", "Credential Access"],
    message: "Compromised account disabled — attacker loses access",
  },
  reset_password: {
    threatReduction: 8,
    closeAlertTactics: ["Credential Access"],
    message: "Password reset — credential-based access revoked",
  },
  kill_process: {
    threatReduction: 10,
    closeAlertTactics: ["Execution"],
    message: "Malicious process terminated — immediate threat neutralized",
  },
  quarantine_file: {
    threatReduction: 8,
    closeAlertTactics: ["Persistence"],
    message: "Malware quarantined — cannot re-execute",
  },
  collect_forensics: {
    threatReduction: 4,
    message: "Forensic evidence collected — preserved for investigation",
  },
  preserve_evidence: {
    threatReduction: 4,
    message: "Evidence preserved with hash verification",
  },
  update_fw_rule: {
    threatReduction: 8,
    closeAlertTactics: ["Command and Control", "Initial Access"],
    message: "Firewall rule updated — attack vector blocked at perimeter",
  },
  patch_system: {
    threatReduction: 10,
    closeAlertTactics: ["Initial Access"],
    message: "Emergency patch deployed — vulnerability closed",
  },
  restore_backup: {
    threatReduction: 15,
    message: "System restored from backup — clean state recovered",
  },
  remove_persistence: {
    threatReduction: 12,
    closeAlertTactics: ["Persistence"],
    message: "Persistence mechanisms removed — attacker can't maintain foothold",
  },
  escalate_ir: {
    threatReduction: 5,
    message: "IR team engaged — full investigation underway",
  },
  notify_customer: {
    threatReduction: 3,
    message: "Customer notified per breach notification policy",
  },
  open_ticket: {
    threatReduction: 2,
    message: "Incident ticket created — tracking active",
  },
  start_coc: {
    threatReduction: 5,
    message: "Chain of custody started — evidence tracked",
  },
};

export function getProgressionConfig(scenarioId) {
  const escalation = ESCALATION_EVENTS[scenarioId] || generateGenericEscalation(scenarioId);
  return {
    initialThreat: 30,
    threatRatePerMin: 5,
    escalationEvents: escalation,
    actionConsequences: ACTION_CONSEQUENCES,
    containmentThreshold: 15,
    failureMessage: "The attack has succeeded — critical systems have been compromised. Review your response timeline and try again.",
    successMessage: "Incident successfully contained! Generate your report to complete the drill.",
  };
}