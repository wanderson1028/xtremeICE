// Firewall Hardening Engine — routes commands to the correct vendor parser

import { parseCisco }   from "./parsers/ciscoParser";
import { parseJuniper } from "./parsers/juniperParser";
import { parseFortinet } from "./parsers/fortinetParser";
import { parsePaloAlto } from "./parsers/paloaltoParser";
import { HARDENING_OBJECTIVES } from "./firewallTopology";

export const VENDORS = {
  cisco:    { label: "Cisco ASA",       prompt: (h, m) => m === "config" ? `${h}(config)#` : m === "config-if" ? `${h}(config-if)#` : `${h}#` },
  juniper:  { label: "Juniper SRX",     prompt: (h, m) => m === "config" ? `root@${h}#` : `root@${h}>` },
  fortinet: { label: "Fortinet FortiGate", prompt: (h, m) => m === "config" ? `${h} (policy) #` : m === "global" ? `${h} (global) #` : `${h} #` },
  paloalto: { label: "Palo Alto PAN-OS", prompt: (h, m) => m === "config" ? `admin@${h}#` : `admin@${h}>` },
};

export function createBlankState(vendor) {
  return {
    vendor,
    hostname: { cisco: "ASA-FW", juniper: "srx-fw", fortinet: "FortiGate", paloalto: "PA-FW" }[vendor] || "FW",
    mode: "enable",
    rules: [],       // { id, action, src, dst, port, proto, zone_from, zone_to }
    flags: {},       // { stateful: bool, deny_all: bool, ... }
    currentCtx: null,
  };
}

export function getPrompt(state) {
  return VENDORS[state.vendor]?.prompt(state.hostname, state.mode) || `${state.hostname}#`;
}

export function processCommand(input, state) {
  const trimmed = input.trim();
  if (!trimmed) return { state, output: [] };

  const newState = JSON.parse(JSON.stringify(state));
  const lower = trimmed.toLowerCase();

  // Universal: exit / end / quit
  if (lower === "exit" || lower === "quit") {
    if (newState.mode === "config" || newState.mode === "config-if" || newState.mode === "global") {
      newState.mode = "enable";
      newState.currentCtx = null;
      return { state: newState, output: [] };
    }
    return { state: newState, output: [] };
  }

  if (lower === "end") {
    newState.mode = "enable";
    newState.currentCtx = null;
    return { state: newState, output: [] };
  }

  // Route to vendor parser
  switch (state.vendor) {
    case "cisco":    return parseCisco(trimmed, newState);
    case "juniper":  return parseJuniper(trimmed, newState);
    case "fortinet": return parseFortinet(trimmed, newState);
    case "paloalto": return parsePaloAlto(trimmed, newState);
    default: return { state: newState, output: [`%Unknown vendor`] };
  }
}

// Evaluate current state against all hardening objectives
export function validateHardening(state) {
  const checks = {};
  const rules = state.rules || [];
  const flags = state.flags || {};

  // block_telnet: any deny rule covering port 23 from internet
  checks.block_telnet = rules.some(r =>
    r.action === "deny" && (r.port === "23" || r.port === "telnet") &&
    (r.zone_from === "internet" || r.src === "any" || r.src === "0.0.0.0/0")
  );

  // allow_ssh_mgmt: permit rule for port 22, src mgmt only
  checks.allow_ssh_mgmt = rules.some(r =>
    r.action === "permit" && (r.port === "22" || r.port === "ssh") &&
    (r.src === "10.10.10.0/24" || r.src === "mgmt" || r.src === "MGMT_NET" || r.zone_from === "mgmt")
  );

  // allow_http_dmz: permit 80 or 443 to DMZ
  checks.allow_http_dmz = rules.some(r =>
    r.action === "permit" &&
    (r.port === "80" || r.port === "443" || r.port === "http" || r.port === "https") &&
    (r.dst === "172.16.0.10" || r.dst === "DMZ_WEB" || r.zone_to === "dmz")
  );

  // block_icmp_internet: deny icmp from internet
  checks.block_icmp_internet = rules.some(r =>
    r.action === "deny" && r.proto === "icmp" &&
    (r.zone_from === "internet" || r.src === "any" || r.src === "0.0.0.0/0")
  );

  // enable_stateful: flag set by parser
  checks.enable_stateful = !!flags.stateful;

  // deny_all_implicit: flag set by parser
  checks.deny_all_implicit = !!flags.deny_all;

  const passed = Object.values(checks).filter(Boolean).length;
  const total = HARDENING_OBJECTIVES.length;
  const complete = passed === total;

  return { checks, passed, total, complete };
}