// EIGRP CLI Engine — mirrors ospfEngine.js structure

import { ROUTER_INTERFACES, NEIGHBORS } from "./eigrpTopology";

function normalizeIface(raw) {
  const s = raw.trim().toLowerCase();
  const map = {
    "g0/0": "GigabitEthernet0/0", "g0/1": "GigabitEthernet0/1", "g0/2": "GigabitEthernet0/2",
    "gi0/0": "GigabitEthernet0/0", "gi0/1": "GigabitEthernet0/1", "gi0/2": "GigabitEthernet0/2",
    "gigabitethernet0/0": "GigabitEthernet0/0", "gigabitethernet0/1": "GigabitEthernet0/1", "gigabitethernet0/2": "GigabitEthernet0/2",
    "lo0": "Loopback0", "loopback0": "Loopback0",
  };
  return map[s] || raw;
}

export function createBlankState(routerName) {
  return {
    hostname: routerName,
    interfaces: {},
    eigrp: {
      enabled: false,
      as: null,
      networks: [],   // [{ network, wildcard }]
      noAutoSummary: false,
    },
    mode: "user",
    currentIface: null,
    saved: false,
  };
}

export function getPrompt(state) {
  const h = state.hostname || "Router";
  switch (state.mode) {
    case "user":           return `${h}>`;
    case "enable":         return `${h}#`;
    case "config":         return `${h}(config)#`;
    case "config-if":      return `${h}(config-if)#`;
    case "config-router":  return `${h}(config-router)#`;
    default:               return `${h}>`;
  }
}

function networkCoversInterface(netStmt, ip) {
  function toNum(s) { return s.split(".").reduce((a, b) => (a << 8) | parseInt(b), 0) >>> 0; }
  const netN = toNum(netStmt.network);
  const ipN  = toNum(ip);
  const wildN = toNum(netStmt.wildcard);
  return (ipN & ~wildN) >>> 0 === (netN & ~wildN) >>> 0;
}

export function processCommand(input, state, routerName) {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();
  const parts = trimmed.split(/\s+/);
  const lparts = lower.split(/\s+/);
  const newState = JSON.parse(JSON.stringify(state));
  let output = [];

  if ((lparts[0] === "enable" || lparts[0] === "en") && newState.mode === "user") {
    newState.mode = "enable";
    return { state: newState, output: [] };
  }

  if ((lparts[0] === "configure" || lparts[0] === "conf") && (lparts[1] === "terminal" || lparts[1] === "t") && newState.mode === "enable") {
    newState.mode = "config";
    output.push("Enter configuration commands, one per line.  End with CNTL/Z.");
    return { state: newState, output };
  }

  if (lparts[0] === "hostname" && newState.mode === "config") {
    newState.hostname = parts[1] || newState.hostname;
    return { state: newState, output: [] };
  }

  if ((lparts[0] === "interface" || lparts[0] === "int") && parts[1] && newState.mode === "config") {
    const ifName = normalizeIface(parts.slice(1).join(""));
    newState.currentIface = ifName;
    newState.mode = "config-if";
    if (!newState.interfaces[ifName]) {
      newState.interfaces[ifName] = { ip: null, mask: null, shutdown: true };
    }
    return { state: newState, output: [] };
  }

  if (lparts[0] === "ip" && (lparts[1] === "address" || lparts[1] === "add") && newState.mode === "config-if") {
    const ip = parts[2]; const mask = parts[3];
    if (!ip || !mask) return { state: newState, output: ["%Invalid command"] };
    newState.interfaces[newState.currentIface].ip = ip;
    newState.interfaces[newState.currentIface].mask = mask;
    return { state: newState, output: [] };
  }

  if (lparts[0] === "no" && (lparts[1] === "shutdown" || lparts[1] === "shut") && newState.mode === "config-if") {
    if (newState.currentIface) {
      newState.interfaces[newState.currentIface].shutdown = false;
      output.push(`%LINK-5-CHANGED: Interface ${newState.currentIface}, changed state to up`);
      output.push(`%LINEPROTO-5-UPDOWN: Line protocol on Interface ${newState.currentIface}, changed state to up`);
    }
    return { state: newState, output };
  }

  // router eigrp <AS>
  if (lparts[0] === "router" && lparts[1] === "eigrp" && newState.mode === "config") {
    const asNum = parts[2] || "100";
    newState.eigrp.enabled = true;
    newState.eigrp.as = asNum;
    newState.mode = "config-router";
    return { state: newState, output: [] };
  }

  // network <ip> <wildcard>
  if ((lparts[0] === "network" || lparts[0] === "net") && newState.mode === "config-router") {
    const network = parts[1];
    const wildcard = parts[2] || "0.0.0.255";
    if (!network) return { state: newState, output: ["%Invalid command. Syntax: network <ip> [wildcard]"] };
    const existing = newState.eigrp.networks.find(n => n.network === network && n.wildcard === wildcard);
    if (!existing) newState.eigrp.networks.push({ network, wildcard });
    return { state: newState, output: [] };
  }

  // no auto-summary
  if (lparts[0] === "no" && lparts[1] === "auto-summary" && newState.mode === "config-router") {
    newState.eigrp.noAutoSummary = true;
    return { state: newState, output: [] };
  }

  if (lparts[0] === "end") {
    newState.mode = "enable";
    newState.currentIface = null;
    output.push("%SYS-5-CONFIG_I: Configured from console by console");
    return { state: newState, output };
  }

  if (lparts[0] === "exit") {
    if (newState.mode === "config-if" || newState.mode === "config-router") {
      newState.mode = "config";
      newState.currentIface = null;
    } else if (newState.mode === "config") {
      newState.mode = "enable";
    } else if (newState.mode === "enable") {
      newState.mode = "user";
    }
    return { state: newState, output: [] };
  }

  if ((lparts[0] === "write" && lparts[1] === "memory") || lparts[0] === "wr") {
    if (newState.mode !== "enable") return { state: newState, output: ["%Error: Not in privileged mode"] };
    newState.saved = true;
    return { state: newState, output: ["Building configuration...", "[OK]"] };
  }

  if (lparts[0] === "show") return handleShow(lparts, newState, routerName);
  if (lparts[0] === "ping") return handlePing(parts[1], newState, routerName);

  return { state: newState, output: [`%Error: Unrecognized command: "${trimmed}"`] };
}

function handleShow(lparts, state, routerName) {
  const ifaces = ROUTER_INTERFACES[routerName];
  const configured = state.interfaces;

  if (lparts[1] === "ip" && lparts[2] === "interface" && lparts[3] === "brief") {
    const lines = ["Interface              IP-Address      OK? Method Status                Protocol"];
    ifaces.forEach(iface => {
      const cfg = configured[iface.iface];
      const ip = cfg?.ip || "unassigned";
      const ok = cfg?.ip ? "YES" : "NO";
      const status = cfg && !cfg.shutdown ? "up" : "administratively down";
      const proto = cfg && !cfg.shutdown && cfg.ip ? "up" : "down";
      lines.push(`${iface.iface.padEnd(22)} ${ip.padEnd(16)}${ok}  manual ${status.padEnd(22)}${proto}`);
    });
    return { state, output: lines };
  }

  if (lparts[1] === "ip" && lparts[2] === "eigrp" && lparts[3] === "neighbors") {
    const validation = validateConfig(state, routerName);
    if (!validation.eigrpReady) {
      return { state, output: ["EIGRP-IPv4 Neighbors for AS(100)", "% No EIGRP neighbors. Check interface IPs and network statements."] };
    }
    const neighbors = NEIGHBORS[routerName];
    const loopbacks = { R1: "1.1.1.1", R2: "2.2.2.2", R3: "3.3.3.3", R4: "4.4.4.4", R5: "5.5.5.5", R6: "6.6.6.6" };
    const lines = ["EIGRP-IPv4 Neighbors for AS(100)", "H   Address         Interface       Hold Uptime   SRTT   RTO  Q  Seq"];
    neighbors.forEach((n, i) => {
      lines.push(`${i}   ${loopbacks[n].padEnd(16)}Gi0/${i}            12 00:02:15    1    50  0  12`);
    });
    return { state, output: lines };
  }

  if (lparts[1] === "ip" && lparts[2] === "route") {
    const validation = validateConfig(state, routerName);
    const lines = ["Codes: C - connected, S - static, D - EIGRP"];
    ifaces.forEach(iface => {
      const cfg = state.interfaces[iface.iface];
      if (cfg?.ip && !cfg.shutdown) {
        lines.push(`C    ${iface.ip}/30 is directly connected, ${iface.iface}`);
      }
    });
    if (validation.eigrpReady) {
      const others = ["R1","R2","R3","R4","R5","R6"].filter(r => r !== routerName);
      const lbs = { R1:"1.1.1.1",R2:"2.2.2.2",R3:"3.3.3.3",R4:"4.4.4.4",R5:"5.5.5.5",R6:"6.6.6.6" };
      others.forEach(r => lines.push(`D    ${lbs[r]}/32 [90/2816] via <neighbor>, GigabitEthernet0/0`));
    }
    return { state, output: lines.length > 1 ? lines : ["% No routes in table"] };
  }

  if (lparts[1] === "running-config" || lparts[1] === "run") {
    const lines = [`!`, `hostname ${state.hostname}`, `!`];
    Object.entries(state.interfaces).forEach(([name, cfg]) => {
      lines.push(`interface ${name}`);
      if (cfg.ip) lines.push(` ip address ${cfg.ip} ${cfg.mask}`);
      if (!cfg.shutdown) lines.push(` no shutdown`);
      lines.push(`!`);
    });
    if (state.eigrp.enabled) {
      lines.push(`router eigrp ${state.eigrp.as || 100}`);
      state.eigrp.networks.forEach(n => lines.push(` network ${n.network} ${n.wildcard}`));
      if (state.eigrp.noAutoSummary) lines.push(` no auto-summary`);
      lines.push(`!`);
    }
    lines.push("end");
    return { state, output: lines };
  }

  return { state, output: ["%Invalid show command"] };
}

function handlePing(target, state, routerName) {
  const validation = validateConfig(state, routerName);
  const lbs = { R1:"1.1.1.1",R2:"2.2.2.2",R3:"3.3.3.3",R4:"4.4.4.4",R5:"5.5.5.5",R6:"6.6.6.6" };
  const isLoopback = Object.values(lbs).includes(target);

  if (isLoopback && validation.eigrpReady) {
    return {
      state,
      output: [
        `Type escape sequence to abort.`,
        `Sending 5, 100-byte ICMP Echos to ${target}, timeout is 2 seconds:`,
        `!!!!!`,
        `Success rate is 100 percent (5/5), round-trip min/avg/max = 1/2/4 ms`,
      ],
      completed: validation.eigrpReady,
    };
  }

  return {
    state,
    output: [
      `Type escape sequence to abort.`,
      `Sending 5, 100-byte ICMP Echos to ${target}, timeout is 2 seconds:`,
      `.....`,
      `Success rate is 0 percent (0/5)`,
    ],
  };
}

export function validateConfig(state, routerName) {
  const required = ROUTER_INTERFACES[routerName];
  const configured = state.interfaces;
  const checks = {};

  required.forEach(iface => {
    const cfg = configured[iface.iface];
    checks[`ip_${iface.short}`] = !!(cfg?.ip === iface.ip && cfg?.mask === iface.mask);
    checks[`up_${iface.short}`] = !!(cfg && !cfg.shutdown);
  });

  checks.eigrp_enabled = state.eigrp.enabled;

  const allNetworksCovered = required.every(iface =>
    state.eigrp.networks.some(n => networkCoversInterface(n, iface.ip))
  );
  checks.networks_advertised = allNetworksCovered;

  const allIfacesOk = required.every(iface => {
    const cfg = configured[iface.iface];
    return cfg?.ip === iface.ip && cfg?.mask === iface.mask && !cfg.shutdown;
  });

  checks.no_auto_summary = state.eigrp.noAutoSummary;

  const eigrpReady = state.eigrp.enabled && allNetworksCovered && allIfacesOk;
  checks.eigrp_ready = eigrpReady;

  return { checks, eigrpReady };
}