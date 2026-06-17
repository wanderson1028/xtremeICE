// Juniper SRX Parser (Junos-style "set" commands)

export function parseJuniper(input, state) {
  const parts = input.split(/\s+/);
  const lparts = parts.map(p => p.toLowerCase());
  let output = [];

  // cli / set cli
  if (lparts[0] === "cli") { state.mode = "enable"; return { state, output: [] }; }

  // set firewall filter <name> term <term> from <criteria> then <action>
  if (lparts[0] === "set" && lparts[1] === "firewall" && lparts[2] === "filter") {
    return parseFilter(parts, lparts, state);
  }

  // set security policies from-zone <z> to-zone <z> policy <name> match source-address <src>
  if (lparts[0] === "set" && lparts[1] === "security" && lparts[2] === "policies") {
    return parseSecPolicy(parts, lparts, state);
  }

  // set security flow stateful-configuration — enables stateful
  if (lparts[0] === "set" && lparts[1] === "security" && lparts[2] === "flow") {
    state.flags.stateful = true;
    return { state, output: [`% Stateful flow enabled`] };
  }

  // show security policies
  if (lparts[0] === "show" && lparts[1] === "security") {
    if (state.rules.length === 0) return { state, output: ["% No security policies configured"] };
    const lines = ["Security policies:"];
    state.rules.forEach(r => {
      lines.push(`  Policy ${r.id}: from-zone ${r.zone_from} to-zone ${r.zone_to} ${r.action} ${r.proto || "any"} src:${r.src} dst:${r.dst}${r.port ? " port:" + r.port : ""}`);
    });
    return { state, output: lines };
  }

  if (lparts[0] === "show") return { state, output: [`% Use 'show security policies' to view rules`] };

  return { state, output: [`% Unrecognized command: ${input}`] };
}

function parseFilter(parts, lparts, state) {
  // set firewall filter <name> term <term> from source-address <ip/cidr>
  // set firewall filter <name> term <term> from destination-address <ip/cidr>
  // set firewall filter <name> term <term> from protocol <proto>
  // set firewall filter <name> term <term> from destination-port <port>
  // set firewall filter <name> term <term> then <accept|reject|discard>
  const name = parts[3];
  const termIdx = lparts.indexOf("term");
  if (termIdx === -1) return { state, output: [`% Syntax: set firewall filter <name> term <term> ...`] };
  const termName = parts[termIdx + 1];

  let rule = state.rules.find(r => r.id === `${name}-${termName}`);
  if (!rule) {
    rule = { id: `${name}-${termName}`, action: null, src: "any", dst: "any", port: null, proto: "any", zone_from: "internet", zone_to: "any" };
    state.rules.push(rule);
  }

  const fromIdx = lparts.indexOf("from");
  const thenIdx = lparts.indexOf("then");

  if (fromIdx !== -1) {
    const criteria = lparts[fromIdx + 1];
    if (criteria === "source-address") {
      rule.src = parts[fromIdx + 2];
      rule.zone_from = inferZone(rule.src);
    }
    if (criteria === "destination-address") {
      rule.dst = parts[fromIdx + 2];
      rule.zone_to = inferZone(rule.dst);
    }
    if (criteria === "protocol") rule.proto = parts[fromIdx + 2];
    if (criteria === "destination-port") rule.port = parts[fromIdx + 2];
  }

  if (thenIdx !== -1) {
    const act = lparts[thenIdx + 1];
    rule.action = act === "accept" ? "permit" : "deny";
    if (act === "reject" || act === "discard") rule.action = "deny";
    // catch-all deny → deny_all flag
    if (rule.action === "deny" && rule.src === "any" && rule.dst === "any") {
      state.flags.deny_all = true;
    }
  }

  return { state, output: [] };
}

function parseSecPolicy(parts, lparts, state) {
  // set security policies from-zone <zf> to-zone <zt> policy <name> match source-address <src>
  // set security policies from-zone <zf> to-zone <zt> policy <name> match application junos-ssh
  // set security policies from-zone <zf> to-zone <zt> policy <name> then permit|deny
  const fromZoneIdx = lparts.indexOf("from-zone");
  const toZoneIdx   = lparts.indexOf("to-zone");
  const policyIdx   = lparts.indexOf("policy");
  const matchIdx    = lparts.indexOf("match");
  const thenIdx     = lparts.indexOf("then");

  if (fromZoneIdx === -1 || toZoneIdx === -1 || policyIdx === -1) {
    return { state, output: [`% Syntax: set security policies from-zone <z> to-zone <z> policy <name> ...`] };
  }

  const zone_from = parts[fromZoneIdx + 1] || "any";
  const zone_to   = parts[toZoneIdx + 1] || "any";
  const policyName = parts[policyIdx + 1];

  let rule = state.rules.find(r => r.id === policyName);
  if (!rule) {
    rule = { id: policyName, action: null, src: "any", dst: "any", port: null, proto: "any", zone_from, zone_to };
    state.rules.push(rule);
  }

  rule.zone_from = zone_from;
  rule.zone_to   = zone_to;

  if (matchIdx !== -1) {
    const matchType = lparts[matchIdx + 1];
    if (matchType === "source-address") rule.src = parts[matchIdx + 2];
    if (matchType === "destination-address") rule.dst = parts[matchIdx + 2];
    if (matchType === "application") {
      const app = parts[matchIdx + 2] || "";
      const appMap = { "junos-ssh": "22", "junos-telnet": "23", "junos-http": "80", "junos-https": "443" };
      const portMap = { "junos-ssh": "ssh", "junos-telnet": "telnet", "junos-http": "http", "junos-https": "https" };
      rule.port = appMap[app.toLowerCase()] || app;
      rule.proto = portMap[app.toLowerCase()] ? "tcp" : "any";
    }
  }

  if (thenIdx !== -1) {
    const act = lparts[thenIdx + 1];
    rule.action = act === "permit" ? "permit" : "deny";
    if (rule.action === "deny" && rule.src === "any" && rule.dst === "any") state.flags.deny_all = true;
    // zone-based stateful: juniper policies are implicitly stateful when "permit"
    if (rule.action === "permit") state.flags.stateful = true;
  }

  return { state, output: [] };
}

function inferZone(addr) {
  if (!addr || addr === "any") return "internet";
  if (addr.startsWith("10.10.10") || addr === "mgmt" || addr === "trust") return "mgmt";
  if (addr.startsWith("172.16") || addr === "dmz") return "dmz";
  return "internet";
}