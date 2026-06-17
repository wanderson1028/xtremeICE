// CLI parsing and validation engine for OSPF lab

import { ROUTER_INTERFACES, NEIGHBORS } from "./ospfTopology";

// Normalize interface names
function normalizeIface(raw) {
  const s = raw.trim().toLowerCase();
  const map = {
    "g0/0": "GigabitEthernet0/0", "g0/1": "GigabitEthernet0/1", "g0/2": "GigabitEthernet0/2",
    "gi0/0": "GigabitEthernet0/0", "gi0/1": "GigabitEthernet0/1", "gi0/2": "GigabitEthernet0/2",
    "gigabitethernet0/0": "GigabitEthernet0/0", "gigabitethernet0/1": "GigabitEthernet0/1", "gigabitethernet0/2": "GigabitEthernet0/2",
    "lo0": "Loopback0", "loopback0": "Loopback0", "loop0": "Loopback0",
  };
  return map[s] || raw;
}

// Create fresh blank state for the learner's router
export function createBlankState(routerName) {
  return {
    hostname: routerName,
    interfaces: {},   // { "GigabitEthernet0/0": { ip, mask, shutdown } }
    ospf: {
      enabled: false,
      networks: [],   // [{ network, wildcard, area }]
    },
    mode: "user",     // user | enable | config | config-if | config-router
    currentIface: null,
    saved: false,
  };
}

// Get prompt string
export function getPrompt(state) {
  const h = state.hostname || "Router";
  switch (state.mode) {
    case "user":          return `${h}>`;
    case "enable":        return `${h}#`;
    case "config":        return `${h}(config)#`;
    case "config-if":     return `${h}(config-if)#`;
    case "config-router": return `${h}(config-router)#`;
    default:              return `${h}>`;
  }
}

// Mask to wildcard
function maskToWild(mask) {
  return mask.split(".").map(o => 255 - parseInt(o)).join(".");
}

// Check if a network statement covers a given IP/mask
function networkCoversInterface(netStmt, ip, mask) {
  // Simple check: wildcard 0.0.0.3 covers /30, 0.0.0.0 covers /32
  const wild = netStmt.wildcard;
  const net = netStmt.network;
  // Convert to numbers
  function toNum(s) { return s.split(".").reduce((a, b) => (a << 8) | parseInt(b), 0) >>> 0; }
  const netN = toNum(net);
  const ipN = toNum(ip);
  const wildN = toNum(wild);
  return (ipN & ~wildN) >>> 0 === (netN & ~wildN) >>> 0;
}

// Main command processor
export function processCommand(input, state, routerName) {
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();
  const parts = trimmed.split(/\s+/);
  const lparts = lower.split(/\s+/);
  const newState = JSON.parse(JSON.stringify(state));
  let output = [];

  // --- ENABLE ---
  if ((lparts[0] === "enable" || lparts[0] === "en") && newState.mode === "user") {
    newState.mode = "enable";
    return { state: newState, output: [] };
  }

  // --- CONFIGURE TERMINAL ---
  if ((lparts[0] === "configure" || lparts[0] === "conf") &&
      (lparts[1] === "terminal" || lparts[1] === "t") &&
      newState.mode === "enable") {
    newState.mode = "config";
    output.push("Enter configuration commands, one per line.  End with CNTL/Z.");
    return { state: newState, output };
  }
  if (lparts[0] === "conf" && lparts[1] === "t" && newState.mode === "enable") {
    newState.mode = "config";
    output.push("Enter configuration commands, one per line.  End with CNTL/Z.");
    return { state: newState, output };
  }

  // --- HOSTNAME ---
  if (lparts[0] === "hostname" && newState.mode === "config") {
    newState.hostname = parts[1] || newState.hostname;
    return { state: newState, output: [] };
  }

  // --- INTERFACE ---
  if ((lparts[0] === "interface" || lparts[0] === "int") && parts[1] && newState.mode === "config") {
    const ifName = normalizeIface(parts.slice(1).join(""));
    newState.currentIface = ifName;
    newState.mode = "config-if";
    if (!newState.interfaces[ifName]) {
      newState.interfaces[ifName] = { ip: null, mask: null, shutdown: true };
    }
    return { state: newState, output: [] };
  }

  // --- IP ADDRESS ---
  if ((lparts[0] === "ip" && (lparts[1] === "address" || lparts[1] === "add")) && newState.mode === "config-if") {
    const ip = parts[2];
    const mask = parts[3];
    if (!ip || !mask) { return { state: newState, output: ["%Invalid command"] }; }
    newState.interfaces[newState.currentIface].ip = ip;
    newState.interfaces[newState.currentIface].mask = mask;
    return { state: newState, output: [] };
  }

  // --- NO SHUTDOWN ---
  if ((lparts[0] === "no") && (lparts[1] === "shutdown" || lparts[1] === "shut") && newState.mode === "config-if") {
    if (newState.currentIface) {
      newState.interfaces[newState.currentIface].shutdown = false;
      output.push(`%LINK-5-CHANGED: Interface ${newState.currentIface}, changed state to up`);
      output.push(`%LINEPROTO-5-UPDOWN: Line protocol on Interface ${newState.currentIface}, changed state to up`);
    }
    return { state: newState, output };
  }

  // --- ROUTER OSPF ---
  if (lparts[0] === "router" && lparts[1] === "ospf" && newState.mode === "config") {
    newState.ospf.enabled = true;
    newState.mode = "config-router";
    return { state: newState, output: [] };
  }

  // --- NETWORK / NET ---
  if ((lparts[0] === "network" || lparts[0] === "net") && newState.mode === "config-router") {
    const network = parts[1];
    const wildcard = parts[2];
    const areaKw = lparts[3];
    const areaId = parts[4];
    if (!network || !wildcard || areaKw !== "area") {
      return { state: newState, output: ["%Invalid command. Syntax: network <ip> <wildcard> area <id>"] };
    }
    const existing = newState.ospf.networks.find(n => n.network === network && n.wildcard === wildcard);
    if (!existing) {
      newState.ospf.networks.push({ network, wildcard, area: areaId || "0" });
    }
    return { state: newState, output: [] };
  }

  // --- END ---
  if (lparts[0] === "end") {
    newState.mode = "enable";
    newState.currentIface = null;
    output.push("%SYS-5-CONFIG_I: Configured from console by console");
    return { state: newState, output };
  }

  // --- EXIT ---
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

  // --- WRITE MEMORY / WR ---
  if (lparts[0] === "write" && lparts[1] === "memory" || lparts[0] === "wr") {
    if (newState.mode !== "enable") { return { state: newState, output: ["%Error: Not in privileged mode"] }; }
    newState.saved = true;
    output.push("Building configuration...");
    output.push("[OK]");
    return { state: newState, output };
  }

  // --- SHOW COMMANDS ---
  if (lparts[0] === "show") {
    return handleShow(lparts, newState, routerName);
  }

  // --- PING ---
  if (lparts[0] === "ping") {
    return handlePing(parts[1], newState, routerName);
  }

  // --- TRACEROUTE ---
  if (lparts[0] === "traceroute") {
    return handleTraceroute(parts[1], newState, routerName);
  }

  // Unknown
  return { state: newState, output: [`%Error: Unrecognized command: "${trimmed}"`] };
}

function handleShow(lparts, state, routerName) {
  const ifaces = ROUTER_INTERFACES[routerName];
  const configured = state.interfaces;

  // show ip interface brief
  if (lparts[1] === "ip" && lparts[2] === "interface" && lparts[3] === "brief") {
    const lines = [
      "Interface              IP-Address      OK? Method Status                Protocol",
    ];
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

  // show ip route
  if (lparts[1] === "ip" && lparts[2] === "route" && !lparts[3]) {
    return buildShowRoute(state, routerName, false);
  }

  // show ip route ospf
  if (lparts[1] === "ip" && lparts[2] === "route" && lparts[3] === "ospf") {
    return buildShowRoute(state, routerName, true);
  }

  // show ip ospf neighbor
  if (lparts[1] === "ip" && lparts[2] === "ospf" && lparts[3] === "neighbor") {
    return buildOspfNeighbors(state, routerName);
  }

  // show running-config
  if (lparts[1] === "running-config" || (lparts[1] === "run")) {
    return buildRunningConfig(state, routerName);
  }

  return { state, output: ["%Invalid show command"] };
}

function buildShowRoute(state, routerName, ospfOnly) {
  const validation = validateConfig(state, routerName);
  const lines = [];

  if (!ospfOnly) {
    lines.push("Codes: L - local, C - connected, S - static, O - OSPF");
    lines.push("");
    // Connected routes
    const ifaces = ROUTER_INTERFACES[routerName];
    ifaces.forEach(iface => {
      const cfg = state.interfaces[iface.iface];
      if (cfg?.ip && !cfg.shutdown) {
        lines.push(`C    ${iface.ip}/30 is directly connected, ${iface.iface}`);
        lines.push(`L    ${iface.ip}/32 is directly connected, ${iface.iface}`);
      }
    });
  }

  if (validation.ospfReady) {
    // Show learned OSPF routes (all other loopbacks and subnets)
    const allRouters = ["R1","R2","R3","R4","R5","R6","R7","R8"].filter(r => r !== routerName);
    allRouters.forEach(r => {
      const lb = { R1:"1.1.1.1",R2:"2.2.2.2",R3:"3.3.3.3",R4:"4.4.4.4",R5:"5.5.5.5",R6:"6.6.6.6",R7:"7.7.7.7",R8:"8.8.8.8" }[r];
      lines.push(`O    ${lb}/32 [110/2] via <neighbor>, 00:01:00, GigabitEthernet0/0`);
    });
  } else if (ospfOnly) {
    lines.push("% No OSPF routes learned yet. Check your OSPF configuration.");
  }

  return { state, output: lines.length ? lines : ["% No routes in table"] };
}

function buildOspfNeighbors(state, routerName) {
  const validation = validateConfig(state, routerName);
  if (!validation.ospfReady) {
    return { state, output: ["Neighbor ID     Pri   State           Dead Time   Address         Interface", "% No OSPF neighbors. Check your interface IPs and network statements."] };
  }
  const neighbors = NEIGHBORS[routerName];
  const loopbacks = { R1:"1.1.1.1",R2:"2.2.2.2",R3:"3.3.3.3",R4:"4.4.4.4",R5:"5.5.5.5",R6:"6.6.6.6",R7:"7.7.7.7",R8:"8.8.8.8" };
  const lines = ["Neighbor ID     Pri   State           Dead Time   Address         Interface"];
  neighbors.forEach(n => {
    lines.push(`${loopbacks[n].padEnd(16)}1     FULL/DR         00:00:37    <ip>            GigabitEthernet`);
  });
  return { state, output: lines };
}

function buildRunningConfig(state, routerName) {
  const lines = [
    `!`,
    `hostname ${state.hostname}`,
    `!`,
  ];
  Object.entries(state.interfaces).forEach(([name, cfg]) => {
    lines.push(`interface ${name}`);
    if (cfg.ip) lines.push(` ip address ${cfg.ip} ${cfg.mask}`);
    if (!cfg.shutdown) lines.push(` no shutdown`);
    lines.push(`!`);
  });
  if (state.ospf.enabled) {
    lines.push(`router ospf 1`);
    state.ospf.networks.forEach(n => {
      lines.push(` network ${n.network} ${n.wildcard} area ${n.area}`);
    });
    lines.push(`!`);
  }
  lines.push(`end`);
  return { state, output: lines };
}

function handlePing(target, state, routerName) {
  const validation = validateConfig(state, routerName);

  if (target === "8.8.8.8") {
    if (validation.canReach8888) {
      return {
        state,
        output: [
          `Type escape sequence to abort.`,
          `Sending 5, 100-byte ICMP Echos to 8.8.8.8, timeout is 2 seconds:`,
          `!!!!!`,
          `Success rate is 100 percent (5/5), round-trip min/avg/max = 1/2/4 ms`,
        ],
        completed: true,
      };
    } else {
      return {
        state,
        output: [
          `Type escape sequence to abort.`,
          `Sending 5, 100-byte ICMP Echos to 8.8.8.8, timeout is 2 seconds:`,
          `.....`,
          `Success rate is 0 percent (0/5)`,
        ],
      };
    }
  }

  // Ping neighbor IPs
  const ifaces = ROUTER_INTERFACES[routerName];
  const isLocalIP = ifaces.some(i => i.ip === target);
  if (isLocalIP) {
    return {
      state,
      output: [`!!!!!`, `Success rate is 100 percent (5/5)`],
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

function handleTraceroute(target, state, routerName) {
  const validation = validateConfig(state, routerName);
  if (validation.canReach8888 && target === "8.8.8.8") {
    return {
      state,
      output: [
        `Tracing the route to 8.8.8.8`,
        `  1 <next-hop> 4 msec`,
        `  2 8.8.8.8 8 msec`,
      ],
    };
  }
  return {
    state,
    output: [`Tracing the route to ${target}`, `  1  *  *  *`, `  2  *  *  *`, `Trace complete.`],
  };
}

// Validate learner's config
export function validateConfig(state, routerName) {
  const required = ROUTER_INTERFACES[routerName];
  const configured = state.interfaces;
  const checks = {};

  // Check each interface
  required.forEach(iface => {
    const cfg = configured[iface.iface];
    checks[`ip_${iface.short}`] = !!(cfg?.ip === iface.ip && cfg?.mask === iface.mask);
    checks[`up_${iface.short}`] = !!(cfg && !cfg.shutdown);
  });

  // OSPF enabled
  checks.ospf_enabled = state.ospf.enabled;

  // Network statements cover all interfaces
  const allNetworksCovered = required.every(iface => {
    if (iface.iface === "Loopback0") {
      return state.ospf.networks.some(n =>
        networkCoversInterface(n, iface.ip, iface.mask)
      );
    }
    return state.ospf.networks.some(n =>
      networkCoversInterface(n, iface.ip, iface.mask)
    );
  });
  checks.networks_advertised = allNetworksCovered;

  // All physical interfaces up and configured
  const allIfacesOk = required.every(iface => {
    const cfg = configured[iface.iface];
    return cfg?.ip === iface.ip && cfg?.mask === iface.mask && !cfg.shutdown;
  });

  const ospfReady = state.ospf.enabled && allNetworksCovered && allIfacesOk;
  checks.ospf_ready = ospfReady;

  const canReach8888 = ospfReady;
  checks.can_reach_8888 = canReach8888;

  return {
    checks,
    ospfReady,
    canReach8888,
  };
}