// Cisco ASA Parser
// Supported: access-list, access-group, inspect, deny-all

export function parseCisco(input, state) {
  const parts = input.split(/\s+/);
  const lparts = parts.map(p => p.toLowerCase());
  let output = [];

  // enable -> conf t
  if (lparts[0] === "enable") { state.mode = "enable"; return { state, output: [] }; }
  if ((lparts[0] === "configure" || lparts[0] === "conf") && (lparts[1] === "terminal" || lparts[1] === "t")) {
    state.mode = "config";
    output.push("Enter configuration commands, one per line.  End with CNTL/Z.");
    return { state, output };
  }

  if (state.mode !== "config") {
    // allow show commands from enable mode
    if (lparts[0] === "show") return handleCiscoShow(lparts, state);
    if (state.mode === "enable") return { state, output: [`% Type 'configure terminal' to enter config mode`] };
    return { state, output: [`% Not in config mode`] };
  }

  // access-list <name> extended <permit|deny> <proto> <src> <srcmask> <dst> <dstmask> [eq <port>]
  // access-list <name> extended <permit|deny> icmp <src> <srcmask> <dst> <dstmask>
  if (lparts[0] === "access-list") {
    const name = parts[1];
    if (lparts[2] !== "extended") return { state, output: [`% Syntax: access-list <name> extended <permit|deny> ...`] };
    const action = lparts[3] === "permit" ? "permit" : "deny";
    const proto = lparts[4] || "ip";
    const src = parts[5] || "any";
    // wildcard at parts[6], dst at parts[7], dstmask at parts[8]
    const dst = parts[7] || "any";
    // eq <port>
    let port = null;
    const eqIdx = lparts.indexOf("eq");
    if (eqIdx !== -1) port = parts[eqIdx + 1];

    // Infer zones from src/dst
    const zone_from = inferZone(src);
    const zone_to   = inferZone(dst);

    state.rules.push({ id: name, action, src, dst, port, proto, zone_from, zone_to });

    // Detect stateful: if class-map/inspect mentioned — approximation via "inspect" keyword
    return { state, output: [] };
  }

  // inspect protocol → enables stateful
  if (lparts[0] === "inspect") {
    state.flags.stateful = true;
    return { state, output: [`% Inspection enabled for ${parts[1] || "ip"}`] };
  }

  // policy-map → stateful
  if (lparts[0] === "policy-map") {
    state.flags.stateful = true;
    return { state, output: [] };
  }

  // access-list DENY_ALL extended deny ip any any  → deny-all
  if (lparts[0] === "access-list" && lparts[3] === "deny" && (lparts[5] === "any" || lparts[5] === "any4") && (lparts[7] === "any" || lparts[7] === "any4")) {
    state.flags.deny_all = true;
    state.rules.push({ id: parts[1], action: "deny", src: "any", dst: "any", port: null, proto: lparts[4] || "ip", zone_from: "internet", zone_to: "any" });
    return { state, output: [] };
  }

  if (lparts[0] === "show") return handleCiscoShow(lparts, state);

  return { state, output: [`% Unrecognized command: ${input}`] };
}

function handleCiscoShow(lparts, state) {
  if (lparts[1] === "access-list") {
    if (state.rules.length === 0) return { state, output: ["% No access lists configured"] };
    const lines = ["Extended IP access list:"];
    state.rules.forEach(r => {
      lines.push(`  ${r.id}: ${r.action} ${r.proto} ${r.src} -> ${r.dst}${r.port ? " eq " + r.port : ""}`);
    });
    return { state, output: lines };
  }
  if (lparts[1] === "running-config" || lparts[1] === "run") {
    const lines = [`hostname ${state.hostname}`, `!`];
    state.rules.forEach(r => {
      lines.push(`access-list ${r.id} extended ${r.action} ${r.proto} ${r.src} 0.0.0.0 ${r.dst} 0.0.0.0${r.port ? " eq " + r.port : ""}`);
    });
    if (state.flags.stateful) lines.push(`inspect tcp`);
    return { state, output: lines };
  }
  return { state, output: [`% Invalid show command`] };
}

function inferZone(addr) {
  if (!addr || addr === "any" || addr === "any4" || addr === "0.0.0.0") return "internet";
  if (addr.startsWith("10.10.10")) return "mgmt";
  if (addr.startsWith("172.16")) return "dmz";
  if (addr === "MGMT_NET" || addr === "mgmt") return "mgmt";
  if (addr === "DMZ_NET" || addr === "dmz") return "dmz";
  return "internet";
}