// Fortinet FortiGate Parser (FortiOS CLI)

export function parseFortinet(input, state) {
  const parts = input.split(/\s+/);
  const lparts = parts.map(p => p.toLowerCase());

  // config firewall policy → enter policy config context
  if (lparts[0] === "config" && lparts[1] === "firewall" && lparts[2] === "policy") {
    state.mode = "config";
    state.currentCtx = "policy";
    return { state, output: [`% Entering firewall policy configuration...`] };
  }

  // config system settings → global context (for stateful)
  if (lparts[0] === "config" && lparts[1] === "system" && lparts[2] === "settings") {
    state.mode = "global";
    state.currentCtx = "settings";
    return { state, output: [] };
  }

  // set inspection-mode flow (in global/settings) → stateful
  if ((state.mode === "global" || state.mode === "config") && lparts[0] === "set" && lparts[1] === "inspection-mode" && lparts[2] === "flow") {
    state.flags.stateful = true;
    return { state, output: [`% Stateful flow inspection enabled`] };
  }

  // In policy context:
  if (state.mode === "config" && state.currentCtx === "policy") {
    // edit <id>  → start/select a policy
    if (lparts[0] === "edit") {
      const id = parts[1] || "1";
      state._editingPolicy = id;
      let rule = state.rules.find(r => r.id === id);
      if (!rule) {
        rule = { id, action: null, src: "any", dst: "any", port: null, proto: "tcp", zone_from: null, zone_to: null };
        state.rules.push(rule);
      }
      return { state, output: [] };
    }

    if (lparts[0] === "set" && state._editingPolicy) {
      const rule = state.rules.find(r => r.id === state._editingPolicy);
      if (!rule) return { state, output: [`% No policy being edited`] };

      const field = lparts[1];
      const value = parts[2] || "";

      if (field === "srcintf") rule.zone_from = value.toLowerCase();
      if (field === "dstintf") rule.zone_to   = value.toLowerCase();
      if (field === "srcaddr") {
        rule.src = value;
        if (!rule.zone_from) rule.zone_from = inferZone(value);
      }
      if (field === "dstaddr") {
        rule.dst = value;
        if (!rule.zone_to) rule.zone_to = inferZone(value);
      }
      if (field === "action") {
        rule.action = value === "accept" ? "permit" : "deny";
        if (rule.action === "deny" && (rule.src === "all" || rule.src === "any") && (rule.dst === "all" || rule.dst === "any")) {
          state.flags.deny_all = true;
        }
      }
      if (field === "service") {
        const svcMap = { "ssh": "22", "telnet": "23", "http": "80", "https": "443", "all": null, "ping": "icmp" };
        const svc = value.toLowerCase();
        if (svc === "ping") { rule.proto = "icmp"; rule.port = null; }
        else { rule.port = svcMap[svc] || value; }
        if (svc === "ssh" || svc === "telnet" || svc === "http" || svc === "https") rule.proto = "tcp";
      }
      if (field === "status" && value === "enable") rule._enabled = true;
      return { state, output: [] };
    }

    if (lparts[0] === "next") {
      state._editingPolicy = null;
      return { state, output: [] };
    }
  }

  // show firewall policy
  if (lparts[0] === "show" && lparts[1] === "firewall" && lparts[2] === "policy") {
    if (state.rules.length === 0) return { state, output: ["% No firewall policies configured"] };
    const lines = ["Firewall policies:"];
    state.rules.forEach(r => {
      lines.push(`  Policy ${r.id}: ${r.action || "undefined"} srcintf:${r.zone_from || "?"} dstintf:${r.zone_to || "?"} src:${r.src} dst:${r.dst}${r.port ? " svc:" + r.port : ""}`);
    });
    return { state, output: lines };
  }

  if (lparts[0] === "show") return { state, output: [`% Use 'show firewall policy' to view rules`] };

  return { state, output: [`% Unrecognized command: ${input}`] };
}

function inferZone(addr) {
  if (!addr || addr === "any" || addr === "all") return "internet";
  if (addr.startsWith("10.10.10") || addr === "MGMT_NET" || addr === "mgmt") return "mgmt";
  if (addr.startsWith("172.16") || addr === "DMZ_WEB" || addr === "dmz") return "dmz";
  return "internet";
}