import React from "react";

const EXPLANATIONS = {
  cisco: [
    {
      match: (cmd) => /^enable$/i.test(cmd),
      title: "Enable Privileged Mode",
      explain: "Elevates the CLI session from user EXEC mode to privileged EXEC mode. Required before entering configuration commands.",
      color: "text-blue-300",
    },
    {
      match: (cmd) => /^conf(igure)?\s+t(erminal)?$/i.test(cmd),
      title: "Enter Global Config",
      explain: "Enters global configuration mode. All subsequent commands modify the running configuration of the ASA.",
      color: "text-blue-300",
    },
    {
      match: (cmd) => /^access-list\s+\S+\s+extended\s+deny\s+tcp\s+.*eq\s+23/i.test(cmd),
      title: "Block Telnet (TCP/23)",
      explain: "Creates an extended ACL entry that denies TCP traffic destined for port 23 (Telnet). Telnet sends credentials in plaintext — blocking it from the Internet is a critical hardening step.",
      color: "text-red-300",
    },
    {
      match: (cmd) => /^access-list\s+\S+\s+extended\s+permit\s+tcp\s+.*eq\s+22/i.test(cmd),
      title: "Allow SSH (TCP/22) from Management",
      explain: "Permits SSH connections from the management subnet (10.10.10.0/24) only. SSH encrypts credentials unlike Telnet. Restricting source to the management zone prevents brute-force from untrusted networks.",
      color: "text-green-300",
    },
    {
      match: (cmd) => /^access-list\s+\S+\s+extended\s+permit\s+tcp\s+.*eq\s+80/i.test(cmd),
      title: "Allow HTTP to DMZ Web Server",
      explain: "Permits TCP/80 (HTTP) traffic to the DMZ web server at 172.16.0.10. Only the web server IP is permitted, minimizing the attack surface in the DMZ zone.",
      color: "text-yellow-300",
    },
    {
      match: (cmd) => /^access-list\s+\S+\s+extended\s+permit\s+tcp\s+.*eq\s+443/i.test(cmd),
      title: "Allow HTTPS to DMZ Web Server",
      explain: "Permits TCP/443 (HTTPS) traffic to the DMZ web server. HTTPS uses TLS encryption and should be allowed alongside HTTP for secure web traffic.",
      color: "text-yellow-300",
    },
    {
      match: (cmd) => /^access-list\s+\S+\s+extended\s+deny\s+icmp/i.test(cmd),
      title: "Block ICMP from Internet",
      explain: "Denies ICMP echo requests from the Internet. This prevents external hosts from pinging internal infrastructure, reducing reconnaissance exposure.",
      color: "text-orange-300",
    },
    {
      match: (cmd) => /^inspect\s+/i.test(cmd),
      title: "Enable Stateful Inspection",
      explain: "Activates Cisco's Application Layer Gateway (ALG) for the specified protocol. Stateful inspection tracks connection state and permits return traffic without explicit allow rules.",
      color: "text-purple-300",
    },
    {
      match: (cmd) => /^access-list\s+\S+\s+extended\s+deny\s+ip\s+any\s+any/i.test(cmd),
      title: "Implicit Deny All",
      explain: "A catch-all deny rule at the end of the ACL. Any traffic not explicitly permitted above is dropped. This is a fundamental firewall hardening principle — deny by default.",
      color: "text-red-400",
    },
    {
      match: (cmd) => /^show\s+access-list/i.test(cmd),
      title: "Show Access Lists",
      explain: "Displays all configured ACL entries and their hit counters. Use this to verify rules were applied correctly and to check which rules are matching traffic.",
      color: "text-cyan-300",
    },
  ],
  juniper: [
    {
      match: (cmd) => /^set\s+firewall\s+filter\s+\S+\s+term\s+\S+\s+from\s+destination-port\s+23/i.test(cmd),
      title: "Filter: Match Telnet Destination Port",
      explain: "Defines the match condition for port 23 (Telnet) in a Junos firewall filter term. The 'from' clause specifies what traffic this term applies to.",
      color: "text-red-300",
    },
    {
      match: (cmd) => /^set\s+firewall\s+filter\s+\S+\s+term\s+\S+\s+then\s+reject/i.test(cmd),
      title: "Filter Action: Reject",
      explain: "The 'then' clause defines what happens to matched traffic. 'Reject' drops the packet and sends an ICMP unreachable message back — more informative than 'discard' but reveals firewall presence.",
      color: "text-red-300",
    },
    {
      match: (cmd) => /^set\s+firewall\s+filter\s+\S+\s+term\s+\S+\s+from\s+source-address/i.test(cmd),
      title: "Filter: Match Source Address",
      explain: "Restricts this filter term to traffic originating from the specified source prefix. Used here to allow SSH only from the management network (10.10.10.0/24).",
      color: "text-green-300",
    },
    {
      match: (cmd) => /^set\s+firewall\s+filter\s+\S+\s+term\s+\S+\s+then\s+accept/i.test(cmd),
      title: "Filter Action: Accept",
      explain: "Permits the matched traffic to pass through. In Junos, traffic not matching any term is dropped by the implicit default deny at the end of every filter.",
      color: "text-green-300",
    },
    {
      match: (cmd) => /^set\s+security\s+policies\s+from-zone\s+\S+\s+to-zone\s+\S+\s+policy\s+\S+\s+match\s+application\s+junos-http/i.test(cmd),
      title: "Security Policy: Match HTTP Application",
      explain: "Junos application objects like 'junos-http' encapsulate TCP/80. Using named applications is cleaner than raw port numbers and supports ALG (Application Layer Gateway) features.",
      color: "text-yellow-300",
    },
    {
      match: (cmd) => /^set\s+security\s+flow\s+stateful/i.test(cmd),
      title: "Enable Stateful Flow Tracking",
      explain: "Configures the SRX to track TCP/UDP session state. Stateful firewalls allow return traffic automatically without explicit reverse rules, reducing rule complexity.",
      color: "text-purple-300",
    },
    {
      match: (cmd) => /^set\s+security\s+policies.*then\s+permit/i.test(cmd),
      title: "Security Policy Action: Permit",
      explain: "The 'then permit' action allows the matched flow to proceed. In Junos zone-based policies, all permitted sessions are implicitly stateful.",
      color: "text-green-300",
    },
    {
      match: (cmd) => /^show\s+security/i.test(cmd),
      title: "Show Security Policies",
      explain: "Displays configured security policies and their hit counters. Use to verify your policy is in place and check if traffic is matching.",
      color: "text-cyan-300",
    },
  ],
  fortinet: [
    {
      match: (cmd) => /^config\s+firewall\s+policy/i.test(cmd),
      title: "Enter Firewall Policy Context",
      explain: "Navigates into the firewall policy configuration table. All subsequent 'edit', 'set', and 'next' commands will modify firewall policies within this context.",
      color: "text-blue-300",
    },
    {
      match: (cmd) => /^edit\s+\d+/i.test(cmd),
      title: "Edit Policy by ID",
      explain: "Selects a specific policy by its ID number for editing. FortiGate processes policies in order — lower ID numbers are evaluated first, so rule ordering matters.",
      color: "text-blue-300",
    },
    {
      match: (cmd) => /^set\s+srcintf/i.test(cmd),
      title: "Set Source Interface/Zone",
      explain: "Defines which interface or zone the traffic originates from. FortiGate uses interface-based zones — 'internet' for untrusted external, 'mgmt' for management traffic.",
      color: "text-orange-300",
    },
    {
      match: (cmd) => /^set\s+dstintf/i.test(cmd),
      title: "Set Destination Interface/Zone",
      explain: "Defines the egress interface or zone. Together with srcintf, this creates a directional traffic flow that the policy will match against.",
      color: "text-orange-300",
    },
    {
      match: (cmd) => /^set\s+service\s+telnet/i.test(cmd),
      title: "Match Telnet Service",
      explain: "Applies this policy to Telnet (TCP/23) traffic. FortiGate uses named service objects that bundle protocol and port definitions, making rules easier to read.",
      color: "text-red-300",
    },
    {
      match: (cmd) => /^set\s+service\s+ssh/i.test(cmd),
      title: "Match SSH Service",
      explain: "Applies this policy to SSH (TCP/22) traffic. SSH is the secure replacement for Telnet — we permit it only from the management zone.",
      color: "text-green-300",
    },
    {
      match: (cmd) => /^set\s+action\s+accept/i.test(cmd),
      title: "Policy Action: Accept",
      explain: "Allows matching traffic to pass through the FortiGate. Combined with UTM profiles, accepted traffic can also be inspected for threats.",
      color: "text-green-300",
    },
    {
      match: (cmd) => /^set\s+action\s+deny/i.test(cmd),
      title: "Policy Action: Deny",
      explain: "Blocks matching traffic silently. Unlike 'reject', deny drops packets without notification. Use deny for Internet-facing rules to avoid revealing firewall presence.",
      color: "text-red-300",
    },
    {
      match: (cmd) => /^set\s+inspection-mode\s+flow/i.test(cmd),
      title: "Enable Flow-Based Inspection",
      explain: "Switches FortiGate to stateful flow-based inspection mode. Flow mode is faster than proxy mode and enables full session tracking for TCP/UDP connections.",
      color: "text-purple-300",
    },
    {
      match: (cmd) => /^next$/i.test(cmd),
      title: "Save Policy and Move to Next",
      explain: "Saves the current policy edits and returns to the policy table context, ready to edit the next policy ID.",
      color: "text-gray-300",
    },
    {
      match: (cmd) => /^show\s+firewall\s+policy/i.test(cmd),
      title: "Show Firewall Policies",
      explain: "Displays all configured firewall policies including source/destination interfaces, services, and actions. Use to verify your hardening rules are correctly configured.",
      color: "text-cyan-300",
    },
  ],
  paloalto: [
    {
      match: (cmd) => /^configure$/i.test(cmd),
      title: "Enter Configuration Mode",
      explain: "Switches PAN-OS from operational mode to configuration mode (indicated by # prompt). All 'set' commands modify the candidate configuration until committed.",
      color: "text-blue-300",
    },
    {
      match: (cmd) => /^set\s+rulebase\s+security\s+rules\s+\S+\s+from/i.test(cmd),
      title: "Security Rule: Source Zone",
      explain: "Defines the source security zone for this rule. PAN-OS uses zone-based policy — traffic from 'internet' zone comes from untrusted external interfaces.",
      color: "text-orange-300",
    },
    {
      match: (cmd) => /^set\s+rulebase\s+security\s+rules\s+\S+\s+to/i.test(cmd),
      title: "Security Rule: Destination Zone",
      explain: "Specifies the destination security zone. Zone pairs (from/to) define the traffic direction. 'dmz' zone contains servers exposed to limited external access.",
      color: "text-orange-300",
    },
    {
      match: (cmd) => /^set\s+rulebase\s+security\s+rules\s+\S+\s+application\s+telnet/i.test(cmd),
      title: "Match Application: Telnet",
      explain: "PAN-OS identifies applications using App-ID™ — deep packet inspection technology. Matching 'telnet' catches the application regardless of the port it runs on, preventing port-hopping evasion.",
      color: "text-red-300",
    },
    {
      match: (cmd) => /^set\s+rulebase\s+security\s+rules\s+\S+\s+application\s+ssh/i.test(cmd),
      title: "Match Application: SSH",
      explain: "App-ID identifies SSH traffic. Permitting SSH by application name (rather than just port 22) ensures only legitimate SSH is allowed, not other services trying to masquerade on port 22.",
      color: "text-green-300",
    },
    {
      match: (cmd) => /^set\s+rulebase\s+security\s+rules\s+\S+\s+application\s+web-browsing/i.test(cmd),
      title: "Match Application: Web Browsing (HTTP)",
      explain: "App-ID 'web-browsing' matches standard HTTP traffic. Palo Alto tracks TCP/80 sessions and validates they are genuine HTTP — not arbitrary data tunneled on port 80.",
      color: "text-yellow-300",
    },
    {
      match: (cmd) => /^set\s+rulebase\s+security\s+rules\s+\S+\s+application\s+icmp/i.test(cmd),
      title: "Match Application: ICMP",
      explain: "Matches ICMP protocol traffic (ping, traceroute). Blocking ICMP from the Internet prevents external reconnaissance of your network topology.",
      color: "text-orange-300",
    },
    {
      match: (cmd) => /^set\s+rulebase\s+security\s+rules\s+\S+\s+action\s+allow/i.test(cmd),
      title: "Rule Action: Allow",
      explain: "Permits the matched traffic. PAN-OS security rules are stateful by default — return traffic for allowed sessions is automatically permitted without additional rules.",
      color: "text-green-300",
    },
    {
      match: (cmd) => /^set\s+rulebase\s+security\s+rules\s+\S+\s+action\s+deny/i.test(cmd),
      title: "Rule Action: Deny",
      explain: "Silently drops matching traffic. Palo Alto's default interzone policy is also deny-all, but adding an explicit deny rule provides visibility through logging.",
      color: "text-red-300",
    },
    {
      match: (cmd) => /^set\s+deviceconfig\s+setting/i.test(cmd),
      title: "Enable Stateful Session Settings",
      explain: "Configures device-level session tracking settings. PAN-OS is inherently stateful, but this ensures strict TCP session validation (SYN checking) is enabled.",
      color: "text-purple-300",
    },
    {
      match: (cmd) => /^commit$/i.test(cmd),
      title: "Commit Configuration",
      explain: "Applies all pending changes from the candidate configuration to the running configuration. In PAN-OS, changes are NOT active until committed — this is a safety mechanism.",
      color: "text-cyan-300",
    },
  ],
};

export default function FirewallCommandExplainer({ lastCommand = "", vendor }) {
  const vendorExplanations = EXPLANATIONS[vendor] || [];

  const cmdText = lastCommand.trim();

  if (!cmdText) {
    return (
      <div className="bg-gray-950 border border-gray-700 rounded-xl p-3">
        <div className="text-xs text-gray-400 font-mono mb-2">Command Explainer</div>
        <div className="text-[10px] font-mono text-gray-600 italic">
          Type a command in the console to see an explanation here.
        </div>
      </div>
    );
  }

  const match = vendorExplanations.find(e => e.match(cmdText));

  return (
    <div className="bg-gray-950 border border-gray-700 rounded-xl p-3">
      <div className="text-xs text-gray-400 font-mono mb-2">Command Explainer</div>
      <div className="bg-black/50 rounded-lg px-2 py-1.5 mb-2">
        <span className="text-[10px] font-mono text-white break-all">{cmdText}</span>
      </div>
      {match ? (
        <div>
          <div className={`text-[11px] font-mono font-semibold mb-1 ${match.color}`}>{match.title}</div>
          <div className="text-[10px] font-mono text-gray-400 leading-relaxed">{match.explain}</div>
        </div>
      ) : (
        <div className="text-[10px] font-mono text-gray-600 italic">
          No explanation available for this command.
        </div>
      )}
    </div>
  );
}