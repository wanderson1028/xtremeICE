import React from "react";

const GUIDES = {
  cisco: {
    label: "Cisco ASA",
    steps: [
      { title: "Enter config mode", cmds: ["enable", "configure terminal"] },
      { title: "Block Telnet from Internet", cmds: ["access-list HARDEN extended deny tcp any any eq 23"] },
      { title: "Allow SSH from Management only", cmds: ["access-list HARDEN extended permit tcp 10.10.10.0 255.255.255.0 any eq 22"] },
      { title: "Allow HTTP/HTTPS to DMZ", cmds: ["access-list HARDEN extended permit tcp any 172.16.0.10 255.255.255.255 eq 80", "access-list HARDEN extended permit tcp any 172.16.0.10 255.255.255.255 eq 443"] },
      { title: "Block ICMP from Internet", cmds: ["access-list HARDEN extended deny icmp any any"] },
      { title: "Enable stateful inspection", cmds: ["inspect tcp"] },
      { title: "Deny all (catch-all)", cmds: ["access-list DENY_ALL extended deny ip any any"] },
      { title: "Verify", cmds: ["show access-list"] },
    ],
  },
  juniper: {
    label: "Juniper SRX",
    steps: [
      { title: "Block Telnet from Internet", cmds: ["set firewall filter HARDEN term BLOCK-TELNET from destination-port 23", "set firewall filter HARDEN term BLOCK-TELNET then reject"] },
      { title: "Allow SSH from Management only", cmds: ["set firewall filter HARDEN term ALLOW-SSH from source-address 10.10.10.0/24", "set firewall filter HARDEN term ALLOW-SSH from destination-port 22", "set firewall filter HARDEN term ALLOW-SSH then accept"] },
      { title: "Allow HTTP/HTTPS to DMZ", cmds: ["set security policies from-zone untrust to-zone dmz policy ALLOW-WEB match application junos-http", "set security policies from-zone untrust to-zone dmz policy ALLOW-WEB then permit"] },
      { title: "Block ICMP from Internet", cmds: ["set firewall filter HARDEN term BLOCK-ICMP from protocol icmp", "set firewall filter HARDEN term BLOCK-ICMP then discard"] },
      { title: "Enable stateful inspection", cmds: ["set security flow stateful-configuration"] },
      { title: "Deny all (catch-all)", cmds: ["set firewall filter HARDEN term DENY-ALL from source-address 0.0.0.0/0", "set firewall filter HARDEN term DENY-ALL then reject"] },
      { title: "Verify", cmds: ["show security policies"] },
    ],
  },
  fortinet: {
    label: "Fortinet FortiGate",
    steps: [
      { title: "Enter policy config", cmds: ["config firewall policy"] },
      { title: "Block Telnet (Policy 1)", cmds: ["edit 1", "set srcintf internet", "set dstintf any", "set service TELNET", "set action deny", "next"] },
      { title: "Allow SSH from Mgmt (Policy 2)", cmds: ["edit 2", "set srcintf mgmt", "set dstintf any", "set srcaddr MGMT_NET", "set service SSH", "set action accept", "next"] },
      { title: "Allow HTTP/HTTPS to DMZ (Policy 3)", cmds: ["edit 3", "set srcintf internet", "set dstintf dmz", "set dstaddr DMZ_WEB", "set service HTTP", "set action accept", "next"] },
      { title: "Block ICMP from Internet (Policy 4)", cmds: ["edit 4", "set srcintf internet", "set dstintf any", "set service PING", "set action deny", "next"] },
      { title: "Enable stateful inspection", cmds: ["config system settings", "set inspection-mode flow", "exit"] },
      { title: "Deny all (Policy 99)", cmds: ["edit 99", "set srcintf internet", "set dstintf any", "set srcaddr all", "set dstaddr all", "set action deny", "next", "exit"] },
      { title: "Verify", cmds: ["show firewall policy"] },
    ],
  },
  paloalto: {
    label: "Palo Alto PAN-OS",
    steps: [
      { title: "Enter configure mode", cmds: ["configure"] },
      { title: "Block Telnet", cmds: ["set rulebase security rules BLOCK-TELNET from internet", "set rulebase security rules BLOCK-TELNET application telnet", "set rulebase security rules BLOCK-TELNET action deny"] },
      { title: "Allow SSH from Management", cmds: ["set rulebase security rules ALLOW-SSH from mgmt", "set rulebase security rules ALLOW-SSH source 10.10.10.0/24", "set rulebase security rules ALLOW-SSH application ssh", "set rulebase security rules ALLOW-SSH action allow"] },
      { title: "Allow HTTP/HTTPS to DMZ", cmds: ["set rulebase security rules ALLOW-WEB from internet", "set rulebase security rules ALLOW-WEB to dmz", "set rulebase security rules ALLOW-WEB destination 172.16.0.10", "set rulebase security rules ALLOW-WEB application web-browsing", "set rulebase security rules ALLOW-WEB action allow"] },
      { title: "Block ICMP from Internet", cmds: ["set rulebase security rules BLOCK-ICMP from internet", "set rulebase security rules BLOCK-ICMP application icmp", "set rulebase security rules BLOCK-ICMP action deny"] },
      { title: "Enable stateful inspection", cmds: ["set deviceconfig setting session stateful-configuration yes"] },
      { title: "Deny all (catch-all)", cmds: ["set rulebase security rules DENY-ALL from internet", "set rulebase security rules DENY-ALL source any", "set rulebase security rules DENY-ALL destination any", "set rulebase security rules DENY-ALL action deny", "commit"] },
      { title: "Verify", cmds: ["show security rulebase"] },
    ],
  },
};

export default function FirewallStepGuide({ vendor, difficulty }) {
  const guide = GUIDES[vendor];
  if (!guide || difficulty === "hard") return null;

  if (difficulty === "medium") {
    return (
      <div className="bg-gray-950 border border-gray-700 rounded-xl p-3 text-[11px] font-mono space-y-1">
        <div className="text-gray-400 font-semibold">Hints — {guide.label}</div>
        {guide.steps.slice(0, -1).map((s, i) => (
          <div key={i} className="text-gray-500">• {s.title}</div>
        ))}
      </div>
    );
  }

  // easy
  return (
    <div className="bg-gray-950 border border-gray-700 rounded-xl p-3 text-[11px] font-mono space-y-2 max-h-80 overflow-y-auto">
      <div className="text-gray-400 font-semibold">Step Guide — {guide.label}</div>
      {guide.steps.map((step, i) => (
        <div key={i}>
          <div className="text-gray-300">{i + 1}. {step.title}</div>
          <div className="bg-black/40 rounded p-1.5 mt-0.5 space-y-0.5">
            {step.cmds.map((cmd, j) => (
              <div key={j} className="text-cyan-300">{cmd}</div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}