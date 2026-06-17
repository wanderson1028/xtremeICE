// Palo Alto PAN-OS Parser

export function parsePaloAlto(input, state) {
  const parts = input.split(/\s+/);
  const lparts = parts.map(p => p.toLowerCase());

  // configure → config mode
  if (lparts[0] === "configure") {
    state.mode = "config";
    return { state, output: [`Entering configuration mode`] };
  }

  // set rulebase security rules <name> from <zone>
  // set rulebase security rules <name> to <zone>
  // set rulebase security rules <name> source <src>
  // set rulebase security rules <name> destination <dst>
  // set rulebase security rules <name> application <app>
  // set rulebase security rules <name> service <svc>
  // set rulebase security rules <name> action allow|deny
  if (lparts[0] === "set" && lparts[1] === "rulebase" && lparts[2] === "security" && lparts[3] === "rules") {
    const ruleName = parts[4];
    const field    = lparts[5];
    const value    = parts[6] || "";

    let rule = state.rules.find(r => r.id === ruleName);
    if (!rule) {
      rule = { id: ruleName, action: null, src: "any", dst: "any", port: null, proto: "any", zone_from: null, zone_to: null };
      state.rules.push(rule);
    }

    if (field === "from") rule.zone_from = value.toLowerCase();
    if (field === "to")   rule.zone_to   = value.toLowerCase();
    if (field === "source") {
      rule.src = value;
      if (!rule.zone_from) rule.zone_from = inferZone(value);
    }
    if (field === "destination") {
      rule.dst = value;
      if (!rule.zone_to) rule.zone_to = inferZone(value);
    }
    if (field === "application") {
      const appPortMap = { "ssh": "22", "telnet": "23", "web-browsing": "80", "ssl": "443", "ping": "icmp", "icmp": "icmp" };
      const appProtoMap = { "ssh": "tcp", "telnet": "tcp", "web-browsing": "tcp", "ssl": "tcp", "ping": "icmp", "icmp": "icmp" };
      const v = value.toLowerCase();
      rule.port  = appPortMap[v] || value;
      rule.proto = appProtoMap[v] || "tcp";
    }
    if (field === "service") {
      // service application-default or service tcp/22 style
      if (value !== "application-default") rule.port = value;
    }
    if (field === "action") {
      rule.action = value === "allow" ? "permit" : "deny";
      if (rule.action === "deny" && (rule.src === "any" || rule.src === "0.0.0.0/0") && (rule.dst === "any" || rule.dst === "0.0.0.0/0")) {
        state.flags.deny_all = true;
      }
    }
    return { state, output: [] };
  }

  // set deviceconfig setting session tcp-reject-non-syn yes → stateful
  if (lparts[0] === "set" && lparts[1] === "deviceconfig" && lparts[2] === "setting") {
    state.flags.stateful = true;
    return { state, output: [`% Stateful session setting applied`] };
  }

  // set zone <name> network layer3 — defines a zone (informational)
  if (lparts[0] === "set" && lparts[1] === "zone") {
    return { state, output: [] };
  }

  // commit
  if (lparts[0] === "commit") {
    return { state, output: [`% Configuration committed`, `% Commit job ID: 1`] };
  }

  // show security policies
  if (lparts[0] === "show" && lparts[1] === "security") {
    if (state.rules.length === 0) return { state, output: ["% No security rules configured"] };
    const lines = ["Security rules:"];
    state.rules.forEach(r => {
      lines.push(`  Rule ${r.id}: ${r.action || "undefined"} from:${r.zone_from || "?"} to:${r.zone_to || "?"} src:${r.src} dst:${r.dst}${r.port ? " port:" + r.port : ""}`);
    });
    return { state, output: lines };
  }

  if (lparts[0] === "show") return { state, output: [`% Use 'show security rulebase' to view rules`] };

  return { state, output: [`% Unrecognized command: ${input}`] };
}

function inferZone(addr) {
  if (!addr || addr === "any" || addr === "any-ipv4") return "internet";
  if (addr.startsWith("10.10.10") || addr === "MGMT") return "mgmt";
  if (addr.startsWith("172.16") || addr === "DMZ") return "dmz";
  return "internet";
}