import React, { useState, useRef, useEffect } from "react";
import { X, Terminal, ChevronDown, Wifi, Shield, Server, Router, Save, AlertTriangle, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from "@/api/base44Client";
import DeviceMonitor from "./DeviceMonitor";

// ─── Device simulation engine ───────────────────────────────────────────────

function getDeviceList(design) {
  const devices = [];
  const sites = design.site_names || ["Site-1"];

  sites.forEach((site, si) => {
    if (design.router_model) {
      devices.push({
        id: `router-${si}`,
        name: `${site}-Router`,
        type: "router",
        vendor: design.router_model?.toLowerCase().includes("juniper") || design.router_model?.toLowerCase().includes("vmx") ? "juniper" : "cisco",
        model: design.router_model,
        ip: `10.${si + 1}.0.1`,
        site,
      });
    }
    if (design.switch_model) {
      devices.push({
        id: `switch-${si}`,
        name: `${site}-Switch`,
        type: "switch",
        vendor: design.switch_model?.toLowerCase().includes("arista") ? "arista" : design.switch_model?.toLowerCase().includes("juniper") ? "juniper" : "cisco",
        model: design.switch_model,
        ip: `10.${si + 1}.0.2`,
        site,
      });
    }
  });

  if (design.firewall_enabled && design.firewall_vendor && design.firewall_vendor !== "None") {
    const fw_vendor = design.firewall_vendor?.toLowerCase().includes("palo") ? "paloalto"
      : design.firewall_vendor?.toLowerCase().includes("fortinet") ? "fortinet"
      : design.firewall_vendor?.toLowerCase().includes("pfsense") ? "pfsense"
      : "cisco_asa";
    devices.push({
      id: "firewall-0",
      name: "HQ-Firewall",
      type: "firewall",
      vendor: fw_vendor,
      model: design.firewall_vendor,
      ip: "10.0.0.254",
      site: "HQ",
    });
  }

  if (design.server_farm && (design.num_servers || 1) > 0) {
    for (let i = 0; i < Math.min(design.num_servers || 1, 3); i++) {
      devices.push({
        id: `server-${i}`,
        name: `Server-${i + 1}`,
        type: "server",
        vendor: "linux",
        model: "Generic Server",
        ip: `192.168.100.${10 + i}`,
        site: "HQ",
      });
    }
  }

  if (devices.length === 0) {
    devices.push({
      id: "demo-router",
      name: "HQ-Router",
      type: "router",
      vendor: "cisco",
      model: "Cisco ISR",
      ip: "10.0.0.1",
      site: "HQ",
    });
  }

  return devices;
}

// ─── Session state per device ────────────────────────────────────────────────

function createSession(device) {
  return {
    mode: "user",        // user | privileged | global_config | interface_config | line_config
    hostname: device.name,
    interface: null,
    line: null,
    config: {
      hostname: device.name,
      interfaces: [],
      banner: "",
      aaa: false,
      ssh: false,
    },
  };
}

function getPrompt(session) {
  const h = session.hostname;
  switch (session.mode) {
    case "user": return `${h}>`;
    case "privileged": return `${h}#`;
    case "global_config": return `${h}(config)#`;
    case "interface_config": return `${h}(config-if)#`;
    case "line_config": return `${h}(config-line)#`;
    default: return `${h}>`;
  }
}

// ─── Abbreviation expander ───────────────────────────────────────────────────

function expandAbbreviations(raw, vendor) {
  const lower = raw.toLowerCase().trim();

  // Cisco / Arista abbreviations
  const ciscoMap = [
    // show commands
    [/^sh(?:ow)?\s+ver(?:sion)?$/, "show version"],
    [/^sh(?:ow)?\s+run(?:ning)?(?:-config)?$/, "show running-config"],
    [/^sh(?:ow)?\s+ip\s+int(?:erface)?\s+br(?:ief)?$/, "show ip interface brief"],
    [/^sh(?:ow)?\s+ip\s+ro(?:ute)?$/, "show ip route"],
    [/^sh(?:ow)?\s+int(?:erfaces?)?$/, "show interfaces"],
    [/^sh(?:ow)?\s+int\s+(.+)$/, (m) => `show interfaces ${m[1]}`],
    [/^sh(?:ow)?\s+ip\s+ospf$/, "show ip ospf"],
    [/^sh(?:ow)?\s+ip\s+bgp$/, "show ip bgp"],
    [/^sh(?:ow)?\s+ip\s+arp$/, "show ip arp"],
    [/^sh(?:ow)?\s+cdp\s+nei?(?:ghbors?)?$/, "show cdp neighbors"],
    [/^sh(?:ow)?\s+vlan$/, "show vlan"],
    [/^sh(?:ow)?\s+span(?:ning-tree)?$/, "show spanning-tree"],
    // config
    [/^conf(?:igure)?\s+t(?:erminal)?$/, "configure terminal"],
    [/^int(?:erface)?\s+(.+)$/, (m) => `interface ${m[1]}`],
    [/^no\s+sh(?:ut(?:down)?)?$/, "no shutdown"],
    [/^sh(?:ut(?:down)?)?$/, (m, ctx) => ctx === "interface_config" ? "shutdown" : null],
    // save
    [/^wr(?:ite)?(?:\s+mem(?:ory)?)?$/, "copy running-config startup-config"],
    [/^copy\s+run\s+start$/, "copy running-config startup-config"],
    // enable/disable
    [/^en(?:able)?$/, "enable"],
    [/^dis(?:able)?$/, "disable"],
    // ip address shorthand
    [/^ip\s+add\s+(.+)$/, (m) => `ip address ${m[1]}`],
    // line
    [/^lin(?:e)?\s+(.+)$/, (m) => `line ${m[1]}`],
    // hostname
    [/^host(?:name)?\s+(.+)$/, (m) => `hostname ${m[1]}`],
    // desc
    [/^desc(?:ription)?\s+(.+)$/, (m) => `description ${m[1]}`],
    // reload
    [/^rel(?:oad)?$/, "reload"],
    // crypto
    [/^cry(?:pto)?\s+key\s+gen(?:erate)?\s+rsa$/, "crypto key generate rsa"],
    // banner
    [/^ban(?:ner)?\s+(.+)$/, (m) => `banner ${m[1]}`],
    // login
    [/^log(?:in)?\s+loc(?:al)?$/, "login local"],
    // transport
    [/^tra(?:nsport)?\s+inp(?:ut)?\s+(.+)$/, (m) => `transport input ${m[1]}`],
    // end
    [/^en(?:d)?$/, (m, ctx) => ["global_config","interface_config","line_config"].includes(ctx) ? "end" : null],
  ];

  // Juniper abbreviations
  const juniperMap = [
    [/^sh(?:ow)?\s+ver(?:sion)?$/, "show version"],
    [/^sh(?:ow)?\s+int(?:erfaces?)?\s+ter(?:se)?$/, "show interfaces terse"],
    [/^con(?:figure)?$/, "configure"],
    [/^ed(?:it)?$/, "configure"],
    [/^com(?:mit)?$/, "commit"],
    [/^rol(?:lback)?\s+0$/, "rollback 0"],
    [/^sh(?:ow)?\s+\|\s+com(?:pare)?$/, "show | compare"],
    [/^exit\s+con(?:figuration)?(?:-mode)?$/, "exit configuration-mode"],
    [/^set\s+int(?:erfaces?)\s+(.+)$/, (m) => `set interfaces ${m[1]}`],
    [/^set\s+sys(?:tem)?\s+host(?:name)?\s+(.+)$/, (m) => `set system hostname ${m[1]}`],
    [/^set\s+sys(?:tem)?\s+(.+)$/, (m) => `set system ${m[1]}`],
    [/^set\s+rou(?:ting-options)?\s+(.+)$/, (m) => `set routing-options ${m[1]}`],
    [/^set\s+sec(?:urity)?\s+(.+)$/, (m) => `set security ${m[1]}`],
  ];

  // Palo Alto abbreviations
  const paloMap = [
    [/^sh(?:ow)?\s+sys(?:tem)?\s+inf(?:o)?$/, "show system info"],
    [/^sh(?:ow)?\s+int(?:erface)?\s*(.*)$/, (m) => `show interface ${m[1]}`.trim()],
    [/^sh(?:ow)?\s+sec(?:urity)?(?:-policy)?$/, "show security-policy"],
    [/^con(?:figure)?$/, "configure"],
    [/^com(?:mit)?$/, "commit"],
    [/^set\s+net(?:work)?\s+(.+)$/, (m) => `set network ${m[1]}`],
    [/^set\s+sec(?:urity)?\s+(.+)$/, (m) => `set security ${m[1]}`],
    [/^set\s+add(?:ress)?\s+(.+)$/, (m) => `set address ${m[1]}`],
  ];

  // Fortinet abbreviations
  const fortiMap = [
    [/^get\s+sys(?:tem)?\s+st(?:atus)?$/, "get system status"],
    [/^con(?:fig)?\s+(.+)$/, (m) => `config ${m[1]}`],
    [/^sh(?:ow)?\s+fire(?:wall)?\s+pol(?:icy)?$/, "show firewall policy"],
    [/^diag(?:nose)?\s+ping\s+(.+)$/, (m) => `diagnose ping ${m[1]}`],
    [/^com(?:mit)?$/, "end"],
  ];

  // Linux abbreviations
  const linuxMap = [
    [/^ip\s+a(?:ddr)?$/, "ip a"],
    [/^ip\s+ro(?:ute)?$/, "ip route"],
    [/^ifc(?:onfig)?$/, "ifconfig"],
    [/^nets(?:tat)?\s+-rn$/, "netstat -rn"],
  ];

  const maps = {
    cisco: ciscoMap,
    arista: ciscoMap,
    juniper: juniperMap,
    paloalto: paloMap,
    fortinet: fortiMap,
    pfsense: linuxMap,
    linux: linuxMap,
  };

  const activeMap = maps[vendor] || [];

  for (const [pattern, replacement] of activeMap) {
    const match = lower.match(pattern);
    if (match) {
      if (typeof replacement === "function") {
        const result = replacement(match, null);
        if (result) return result;
      } else {
        return replacement;
      }
    }
  }

  return raw; // return original if no abbreviation matched
}

// ─── Command processor per vendor ───────────────────────────────────────────

function processCommand(cmd, session, device) {
  const raw = expandAbbreviations(cmd.trim(), device.vendor);
  const lower = raw.toLowerCase();
  const setMode = (m) => { session.mode = m; };

  // Universal quit/exit
  if (lower === "exit" || lower === "quit") {
    if (session.mode === "global_config" || session.mode === "interface_config" || session.mode === "line_config") {
      session.mode = session.mode === "global_config" ? "privileged" : "global_config";
      return [""];
    }
    return ["Connection closed."];
  }

  if (lower === "?" || lower === "help") {
    return getHelp(session, device);
  }

  // ── CISCO / Arista ──────────────────────────────────────────────────────
  if (device.vendor === "cisco" || device.vendor === "arista") {
    if (session.mode === "user") {
      if (lower === "enable") { setMode("privileged"); return [""]; }
      if (lower === "show version") return showVersion(device);
      if (lower.startsWith("ping")) return simulatePing(lower);
      if (lower === "show ip interface brief") return showIpIntBrief(device, session);
      return [`% Unknown command at '>' mode: ${raw}`];
    }
    if (session.mode === "privileged") {
      if (lower === "configure terminal" || lower === "conf t") { setMode("global_config"); return ["Enter configuration commands, one per line. End with CNTL/Z."]; }
      if (lower === "disable") { setMode("user"); return [""]; }
      if (lower === "show version") return showVersion(device);
      if (lower === "show running-config" || lower === "show run") return showRunningConfig(device, session);
      if (lower === "show ip interface brief" || lower === "sh ip int br") return showIpIntBrief(device, session);
      if (lower === "show ip route") return showIpRoute(device);
      if (lower === "show interfaces") return showInterfaces(device);
      if (lower.startsWith("ping")) return simulatePing(lower);
      if (lower === "copy running-config startup-config" || lower === "wr") return ["Building configuration...", "OK"];
      if (lower === "reload") return ["Proceed with reload? [confirm]y", "System Bootstrap, Version 15.1", "... Reloading ..."];
      return [`% Invalid input detected at '^' marker.`];
    }
    if (session.mode === "global_config") {
      if (lower.startsWith("hostname ")) {
        const newName = raw.split(" ")[1];
        session.hostname = newName;
        session.config.hostname = newName;
        return [""];
      }
      if (lower.startsWith("interface ") || lower.startsWith("int ")) {
        const iface = raw.split(" ").slice(1).join(" ");
        session.interface = iface;
        setMode("interface_config");
        return [""];
      }
      if (lower.startsWith("line ")) {
        const line = raw.split(" ").slice(1).join(" ");
        session.line = line;
        setMode("line_config");
        return [""];
      }
      if (lower === "crypto key generate rsa") {
        session.config.ssh = true;
        return ["The name for the keys will be: " + session.hostname + ".domain", "Choose the size of the key modulus in the range of 360 to 4096", "% Generating 2048 bit RSA keys, keys will be non-exportable...", "[OK] (elapsed time was 2 seconds)"];
      }
      if (lower.startsWith("ip domain-name")) return [""];
      if (lower.startsWith("username")) return [""];
      if (lower.startsWith("banner motd")) { session.config.banner = raw; return ["Enter TEXT message, End with the character '/'.", "MOTD banner set."]; }
      if (lower.startsWith("enable secret") || lower.startsWith("enable password")) return [""];
      if (lower === "service password-encryption") return [""];
      if (lower === "no shutdown" || lower === "shutdown") return ["% Interface command not available in global config mode"];
      if (lower === "end") { setMode("privileged"); return [""]; }
      return [`% Invalid input detected at '^' marker.`];
    }
    if (session.mode === "interface_config") {
      if (lower.startsWith("ip address ")) {
        return [`% Interface ${session.interface} configured.`];
      }
      if (lower === "no shutdown") return [`%LINK-5-CHANGED: Interface ${session.interface}, changed state to up`, `%LINEPROTO-5-UPDOWN: Line protocol on Interface ${session.interface}, changed state to up`];
      if (lower === "shutdown") return [`%LINK-5-CHANGED: Interface ${session.interface}, changed state to administratively down`];
      if (lower.startsWith("description ")) return [""];
      if (lower.startsWith("duplex") || lower.startsWith("speed")) return [""];
      if (lower === "end") { setMode("privileged"); return [""]; }
      return [""];
    }
    if (session.mode === "line_config") {
      if (lower === "login local" || lower === "login") return [""];
      if (lower === "transport input ssh" || lower === "transport input all") return [""];
      if (lower.startsWith("password ")) return [""];
      if (lower === "end") { setMode("privileged"); return [""]; }
      return [""];
    }
  }

  // ── JUNIPER ──────────────────────────────────────────────────────────────
  if (device.vendor === "juniper") {
    if (session.mode === "user") {
      if (lower === "cli") return ["Entering Junos CLI mode"];
      if (lower === "show version") return showVersion(device);
      if (lower === "configure" || lower === "edit") { setMode("global_config"); return ["Entering configuration mode", "[edit]"]; }
      if (lower.startsWith("ping")) return simulatePing(lower);
      if (lower === "show interfaces terse") return showInterfacesTerse(device);
      return [`Unknown command: ${raw}`];
    }
    if (session.mode === "global_config") {
      if (lower === "commit") return ["commit complete"];
      if (lower === "rollback 0") return ["load complete"];
      if (lower.startsWith("set interfaces")) return [""];
      if (lower.startsWith("set system hostname")) {
        session.hostname = raw.split(" ").pop();
        return [""];
      }
      if (lower.startsWith("set system")) return [""];
      if (lower.startsWith("set routing-options")) return [""];
      if (lower.startsWith("set security")) return [""];
      if (lower === "show | compare") return ["[edit]", "# No pending changes"];
      if (lower === "exit configuration-mode" || lower === "exit") { setMode("user"); return ["Exiting configuration mode"]; }
      return [`error: unknown command: ${raw}`];
    }
  }

  // ── PALO ALTO ────────────────────────────────────────────────────────────
  if (device.vendor === "paloalto") {
    if (session.mode === "user") {
      if (lower === "show system info") return showPaloSystemInfo(device);
      if (lower.startsWith("ping")) return simulatePing(lower);
      if (lower === "configure") { setMode("global_config"); return ["Entering configuration mode"]; }
      if (lower.startsWith("show interface")) return showPaloInterfaces(device);
      if (lower === "show security-policy") return showPaloPolicy();
      return [`Unknown command: ${raw}`];
    }
    if (session.mode === "global_config") {
      if (lower === "commit") return ["Commit job enqueued with jobid 1", "100%  13/13 jobs", "Commit  success"];
      if (lower.startsWith("set network interface")) return [""];
      if (lower.startsWith("set security")) return [""];
      if (lower.startsWith("set address")) return [""];
      if (lower === "exit") { setMode("user"); return [""]; }
      return [`Invalid syntax.`];
    }
  }

  // ── FORTINET ─────────────────────────────────────────────────────────────
  if (device.vendor === "fortinet") {
    if (session.mode === "user") {
      if (lower === "get system status") return showFortiStatus(device);
      if (lower.startsWith("config")) { setMode("global_config"); return ["(config)#"]; }
      if (lower.startsWith("diagnose ping")) return simulatePing(lower);
      if (lower.startsWith("show firewall policy")) return showFortiPolicy();
      return [`Command fail. Return code -6`];
    }
    if (session.mode === "global_config") {
      if (lower === "end") { setMode("user"); return [""]; }
      if (lower.startsWith("edit")) return ["(edit)#"];
      if (lower.startsWith("set")) return [""];
      if (lower === "next") return [""];
      return [""];
    }
  }

  // ── PFSENSE / Linux ───────────────────────────────────────────────────────
  if (device.vendor === "pfsense" || device.vendor === "linux") {
    if (lower.startsWith("ping")) return simulatePing(lower);
    if (lower === "ifconfig" || lower === "ip a") return showLinuxInterfaces(device);
    if (lower === "netstat -rn" || lower === "ip route") return showLinuxRoute(device);
    if (lower.startsWith("sudo")) return simulateSudo(lower);
    if (lower === "uptime") return [`${new Date().toLocaleTimeString()}  up 4 days,  3:22,  1 user,  load average: 0.02, 0.05, 0.01`];
    if (lower === "uname -a") return [`Linux ${device.name} 5.15.0 #1 SMP x86_64 GNU/Linux`];
    return [`-bash: ${raw.split(" ")[0]}: command not found`];
  }

  return [`Unknown command: ${raw}`];
}

// ─── Output helpers ──────────────────────────────────────────────────────────

function showVersion(device) {
  if (device.vendor === "cisco") return [
    `Cisco IOS Software, Version 15.7(3)M6, RELEASE SOFTWARE (fc1)`,
    `Technical Support: http://www.cisco.com/techsupport`,
    `ROM: System Bootstrap, Version 15.6(3r)T`,
    ``,
    `${device.name} uptime is 4 days, 3 hours, 22 minutes`,
    `System image file is "flash:/c1900-universalk9-mz.SPA.157-3.M6.bin"`,
    ``,
    `cisco ${device.model || "ISR4331"} (revision 1.0) with 1048576K bytes of memory.`,
    `Processor board ID FTX1936AHH2`,
    `1 Gigabit Ethernet interface`,
    `Configuration register is 0x2102`,
  ];
  if (device.vendor === "juniper") return [
    `Hostname: ${device.name}`,
    `Model: ${device.model || "vMX"}`,
    `JUNOS Base OS boot [18.4R1.8]`,
    `JUNOS Base OS Software Suite [18.4R1.8]`,
    `JUNOS Routing Software Suite [18.4R1.8]`,
  ];
  if (device.vendor === "arista") return [
    `Arista ${device.model || "DCS-7050TX"}`,
    `Hardware version:    01.07`,
    `Serial number:       HSH14280088`,
    `System MAC address:  001c.731e.57d4`,
    `Software image version: 4.23.2F`,
    `Architecture:           i686`,
  ];
  return [`Version info not available for ${device.vendor}`];
}

function showIpIntBrief(device, session) {
  return [
    `Interface              IP-Address      OK? Method Status                Protocol`,
    `GigabitEthernet0/0/0   ${device.ip}    YES NVRAM  up                    up      `,
    `GigabitEthernet0/0/1   unassigned      YES NVRAM  administratively down down    `,
    `Loopback0              1.1.1.1         YES NVRAM  up                    up      `,
  ];
}

function showRunningConfig(device, session) {
  return [
    `Building configuration...`, ``,
    `Current configuration : 1842 bytes`,
    `!`,
    `version 15.7`,
    `service timestamps debug datetime msec`,
    `service timestamps log datetime msec`,
    `no service password-encryption`,
    `!`,
    `hostname ${session.config.hostname}`,
    `!`,
    `interface GigabitEthernet0/0/0`,
    ` ip address ${device.ip} 255.255.255.0`,
    ` no shutdown`,
    `!`,
    `interface GigabitEthernet0/0/1`,
    ` no ip address`,
    ` shutdown`,
    `!`,
    `ip route 0.0.0.0 0.0.0.0 ${device.ip.split(".").slice(0, 3).join(".")}.254`,
    `!`,
    `end`,
  ];
}

function showIpRoute(device) {
  return [
    `Codes: C - connected, S - static, R - RIP, M - mobile, B - BGP`,
    `       D - EIGRP, EX - EIGRP external, O - OSPF, IA - OSPF inter area`,
    ``,
    `Gateway of last resort is ${device.ip.split(".").slice(0, 3).join(".")}.254 to network 0.0.0.0`,
    ``,
    `C    ${device.ip.split(".").slice(0, 3).join(".")}.0/24 is directly connected, GigabitEthernet0/0/0`,
    `S*   0.0.0.0/0 [1/0] via ${device.ip.split(".").slice(0, 3).join(".")}.254`,
  ];
}

function showInterfaces(device) {
  return [
    `GigabitEthernet0/0/0 is up, line protocol is up`,
    `  Hardware is ISR4331-3x1GE, address is aabb.cc00.0100 (bia aabb.cc00.0100)`,
    `  Internet address is ${device.ip}/24`,
    `  MTU 1500 bytes, BW 1000000 Kbit/sec, DLY 10 usec,`,
    `     reliability 255/255, txload 1/255, rxload 1/255`,
    `  Encapsulation ARPA, loopback not set`,
    `  Full-duplex, 1000Mb/s, media type is RJ45`,
    `  5 minute input rate 2000 bits/sec, 3 packets/sec`,
    `  5 minute output rate 1000 bits/sec, 2 packets/sec`,
  ];
}

function showInterfacesTerse(device) {
  return [
    `Interface               Admin Link Proto    Local                 Remote`,
    `ge-0/0/0                up    up   inet     ${device.ip}/24`,
    `ge-0/0/1                up    down`,
    `lo0                     up    up   inet     127.0.0.1/8`,
  ];
}

function showPaloSystemInfo(device) {
  return [
    `Hostname: ${device.name}`,
    `IP address: ${device.ip}`,
    `Model: PA-VM`,
    `Serial: 007201004217`,
    `SW Version: 10.1.6`,
    `App Version: 8468-6979`,
    `Threat Version: 8468-6979`,
    `Uptime: 4 days, 3:22:17`,
    `Family: vm`,
    `VM Mode: hypervisor`,
  ];
}

function showPaloInterfaces(device) {
  return [
    `Name          Id   Vsys  Zone     IP                     MAC               Speed`,
    `ethernet1/1   1    1     untrust  ${device.ip}/24         00:50:56:9a:0b:4f  1G`,
    `ethernet1/2   2    1     trust    192.168.1.1/24         00:50:56:9a:0b:50  1G`,
    `loopback.1    257  1     mgmt     127.0.0.1              -                  -`,
  ];
}

function showPaloPolicy() {
  return [
    `Name             Src Zone    Dst Zone    Src Addr    Dst Addr    App         Action`,
    `Allow-Inside     trust       untrust     any         any         any         allow`,
    `Deny-All         any         any         any         any         any         deny`,
  ];
}

function showFortiStatus(device) {
  return [
    `Version: FortiGate-VM64 v7.0.5,build0304`,
    `Virus-DB: 1.00000(2018-04-09 18:07)`,
    `Extended DB: 1.00000(2018-04-09 18:07)`,
    `IPS-DB: 6.00741(2015-12-01 02:30)`,
    `Serial-Number: FGVMEVTM18000033`,
    `BIOS version: 04000002`,
    `Hostname: ${device.name}`,
    `Operation Mode: NAT`,
    `Current virtual domain: root`,
    `HA override: disable`,
    `Distribution: International`,
    `Branch point: 304`,
    `System time: ${new Date().toUTCString()}`,
  ];
}

function showFortiPolicy() {
  return [
    `config firewall policy`,
    `    edit 1`,
    `        set name "LAN-to-WAN"`,
    `        set srcintf "internal"`,
    `        set dstintf "wan1"`,
    `        set srcaddr "all"`,
    `        set dstaddr "all"`,
    `        set action accept`,
    `        set schedule "always"`,
    `        set service "ALL"`,
    `        set nat enable`,
    `    next`,
    `end`,
  ];
}

function showLinuxInterfaces(device) {
  return [
    `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500`,
    `        inet ${device.ip}  netmask 255.255.255.0  broadcast ${device.ip.split(".").slice(0, 3).join(".")}.255`,
    `        ether 00:50:56:9a:01:1a  txqueuelen 1000  (Ethernet)`,
    `lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536`,
    `        inet 127.0.0.1  netmask 255.0.0.0`,
  ];
}

function showLinuxRoute(device) {
  return [
    `Kernel IP routing table`,
    `Destination     Gateway         Genmask         Flags   MSS Window  irtt Iface`,
    `0.0.0.0         ${device.ip.split(".").slice(0, 3).join(".")}.1   0.0.0.0         UG        0 0          0 eth0`,
    `${device.ip.split(".").slice(0, 3).join(".")}.0   0.0.0.0         255.255.255.0   U         0 0          0 eth0`,
  ];
}

function simulatePing(cmd) {
  const parts = cmd.split(" ");
  const target = parts[parts.length - 1];
  return [
    `Sending 5, 100-byte ICMP Echos to ${target}, timeout is 2 seconds:`,
    `!!!!!`,
    `Success rate is 100 percent (5/5), round-trip min/avg/max = 1/2/4 ms`,
  ];
}

function simulateSudo(cmd) {
  const rest = cmd.replace(/^sudo\s+/, "");
  if (rest.startsWith("iptables")) return [`iptables rule applied.`];
  if (rest.startsWith("systemctl")) return [`Unit operation completed.`];
  return [`Command executed with elevated privileges.`];
}

function getHelp(session, device) {
  if (device.vendor === "cisco" || device.vendor === "arista") {
    if (session.mode === "user") return [
      `enable           - Enter privileged EXEC mode`,
      `ping <ip>        - Send ICMP echo`,
      `show version     - Show system software version`,
      `show ip interface brief - Summary of interfaces`,
      `exit / quit      - Exit session`,
    ];
    if (session.mode === "privileged") return [
      `configure terminal - Enter global config mode`,
      `disable          - Return to user EXEC`,
      `show version     - Software version`,
      `show running-config - Active configuration`,
      `show ip interface brief - Interface summary`,
      `show ip route    - Routing table`,
      `show interfaces  - Detailed interface info`,
      `ping <ip>        - Ping test`,
      `copy running-config startup-config - Save config`,
      `exit             - Exit mode`,
    ];
    if (session.mode === "global_config") return [
      `hostname <name>  - Set device hostname`,
      `interface <int>  - Enter interface config (e.g. GigabitEthernet0/0/0)`,
      `line vty 0 4     - Enter line config mode`,
      `ip domain-name <name> - Set domain`,
      `username <u> secret <p> - Create local user`,
      `crypto key generate rsa - Generate SSH keys`,
      `enable secret <pwd> - Set privileged password`,
      `banner motd /msg/ - Set MOTD banner`,
      `end              - Return to privileged mode`,
    ];
    if (session.mode === "interface_config") return [
      `ip address <ip> <mask> - Assign IP address`,
      `no shutdown      - Enable interface`,
      `shutdown         - Disable interface`,
      `description <text> - Set interface description`,
      `duplex auto      - Set duplex`,
      `speed auto       - Set speed`,
      `end              - Return to privileged`,
      `exit             - Return to global config`,
    ];
  }
  if (device.vendor === "juniper") return [
    `show version              - System version`,
    `show interfaces terse     - Interface summary`,
    `configure                 - Enter config mode`,
    `set interfaces ge-0/0/0 unit 0 family inet address <ip/mask>`,
    `set system hostname <name>`,
    `commit                    - Commit pending changes`,
    `show | compare            - Preview uncommitted changes`,
    `rollback 0                - Discard changes`,
    `exit configuration-mode   - Leave config mode`,
  ];
  if (device.vendor === "paloalto") return [
    `show system info          - System information`,
    `show interface all        - Interface list`,
    `show security-policy      - Security policies`,
    `configure                 - Enter config mode`,
    `set network interface ethernet ethernet1/1 layer3 ip <ip/mask>`,
    `set security policy rules <name> from trust to untrust action allow`,
    `commit                    - Push configuration`,
    `exit                      - Leave config mode`,
  ];
  if (device.vendor === "fortinet") return [
    `get system status         - System status`,
    `config system interface   - Interface config`,
    `config firewall policy    - Firewall policy`,
    `show firewall policy       - Display policies`,
    `diagnose ping <ip>        - Ping test`,
    `end                       - Exit config block`,
  ];
  return ["? - Show help", "exit - Exit session"];
}

// ─── Detect if a command mutates config ──────────────────────────────────────

function isConfigMutation(expandedCmd) {
  const l = expandedCmd.toLowerCase().trim();
  return (
    l.startsWith("hostname ") ||
    l.startsWith("interface ") ||
    l.startsWith("ip address ") ||
    l.startsWith("ip domain-name") ||
    l.startsWith("username ") ||
    l.startsWith("banner ") ||
    l.startsWith("enable secret") ||
    l.startsWith("enable password") ||
    l === "service password-encryption" ||
    l === "crypto key generate rsa" ||
    l.startsWith("line ") ||
    l === "no shutdown" ||
    l === "shutdown" ||
    l.startsWith("description ") ||
    l.startsWith("duplex") ||
    l.startsWith("speed") ||
    l.startsWith("transport input") ||
    l === "login local" ||
    l === "login" ||
    l.startsWith("set interfaces") ||
    l.startsWith("set system") ||
    l.startsWith("set routing-options") ||
    l.startsWith("set security") ||
    l.startsWith("set network interface") ||
    l.startsWith("set address") ||
    l.startsWith("config ") ||
    l.startsWith("edit ") ||
    (l.startsWith("set ") && !l.startsWith("set system info"))
  );
}

// ─── Build exportable config diff ────────────────────────────────────────────

function buildConfigDiff(deviceName, vendor, changes) {
  if (!changes.length) return "";
  const lines = [`! Config changes for ${deviceName} (${vendor.toUpperCase()})`, `! Saved: ${new Date().toLocaleString()}`, ``];
  changes.forEach(c => lines.push(c));
  lines.push(``);
  return lines.join("\n");
}

// ─── Save Prompt Modal ────────────────────────────────────────────────────────

function SavePromptModal({ deviceName, changes, onSave, onDiscard }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-[#1a1a1a] border border-yellow-500/40 rounded-2xl p-6 w-full max-w-md shadow-2xl"
      >
        <div className="flex items-center gap-3 mb-4">
          <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0" />
          <h2 className="text-yellow-300 font-mono font-semibold text-sm">Unsaved Configuration Changes</h2>
        </div>
        <p className="text-green-300/70 font-mono text-xs mb-3">
          You made the following changes to <span className="text-green-300">{deviceName}</span>:
        </p>
        <div className="bg-[#0d0d0d] rounded-lg p-3 mb-4 max-h-40 overflow-y-auto border border-green-500/10">
          {changes.map((c, i) => (
            <div key={i} className="text-green-200/80 font-mono text-xs whitespace-pre-wrap">{c}</div>
          ))}
        </div>
        <p className="text-green-300/60 font-mono text-xs mb-5">Save these changes to the device configuration?</p>
        <div className="flex gap-3">
          <button
            onClick={onSave}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600/20 hover:bg-green-600/30 border border-green-500/40 text-green-300 rounded-lg font-mono text-xs transition-all"
          >
            <Save className="h-3.5 w-3.5" />
            Save to Config
          </button>
          <button
            onClick={onDiscard}
            className="flex-1 py-2.5 bg-red-600/10 hover:bg-red-600/20 border border-red-500/30 text-red-400 rounded-lg font-mono text-xs transition-all"
          >
            Discard Changes
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function NetworkConsole({ design, onClose }) {
  const devices = getDeviceList(design);
  const [selectedDevice, setSelectedDevice] = useState(devices[0]);
  const [session, setSession] = useState(() => createSession(devices[0]));
  const [history, setHistory] = useState(() => [
    { type: "banner", text: `╔══════════════════════════════════════════════════════╗` },
    { type: "banner", text: `║        Xtreme I.C.E. — Virtual Network Console       ║` },
    { type: "banner", text: `╚══════════════════════════════════════════════════════╝` },
    { type: "output", text: `` },
    { type: "output", text: `Connected to: ${devices[0].name} (${devices[0].ip})` },
    { type: "output", text: `Vendor: ${devices[0].model}` },
    { type: "output", text: `Type "?" or "help" for available commands.` },
    { type: "output", text: `` },
  ]);
  const [input, setInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState([]);
  const [cmdIndex, setCmdIndex] = useState(-1);
  const [showDropdown, setShowDropdown] = useState(false);

  // Unsaved change tracking — per device
  const [pendingChanges, setPendingChanges] = useState({}); // { [deviceId]: string[] }
  const [savePrompt, setSavePrompt] = useState(null); // { deviceId, deviceName, changes, afterSave }
  // Saved config store — per device
  const [savedConfigs, setSavedConfigs] = useState({}); // { [deviceId]: string }

  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [selectedDevice]);

  const getDeviceChanges = (devId) => pendingChanges[devId] || [];

  const persistConfigToDesign = async (deviceId, deviceName, vendor, allChanges) => {
    const configDiff = buildConfigDiff(deviceName, vendor, allChanges);
    const existingBundle = design.eve_ng_script || "";
    const separator = "\n! ──────────────────────────────────────────\n";
    const updatedBundle = existingBundle + separator + configDiff;
    await base44.entities.NetworkDesign.update(design.id, {
      eve_ng_script: updatedBundle,
      change_history: [
        ...(design.change_history || []),
        `[${new Date().toLocaleString()}] Console: config saved for ${deviceName}`,
      ],
    });
  };

  const handleSave = async () => {
    if (!savePrompt) return;
    const { deviceId, deviceName, vendor, changes, afterSave } = savePrompt;
    setSavedConfigs(prev => ({
      ...prev,
      [deviceId]: (prev[deviceId] || "") + changes.join("\n") + "\n",
    }));
    setPendingChanges(prev => ({ ...prev, [deviceId]: [] }));
    setSavePrompt(null);
    setHistory(prev => [
      ...prev,
      { type: "system", text: `✔ Configuration saved for ${deviceName}.` },
    ]);
    await persistConfigToDesign(deviceId, deviceName, vendor, changes);
    if (afterSave) afterSave();
  };

  const handleDiscard = () => {
    if (!savePrompt) return;
    const { deviceId, afterSave } = savePrompt;
    setPendingChanges(prev => ({ ...prev, [deviceId]: [] }));
    setSavePrompt(null);
    setHistory(prev => [
      ...prev,
      { type: "output", text: `Changes discarded.` },
    ]);
    if (afterSave) afterSave();
  };

  const maybePromptSave = (deviceId, deviceName, vendor, changes, afterSave) => {
    if (changes.length === 0) { afterSave && afterSave(); return; }
    setSavePrompt({ deviceId, deviceName, vendor, changes, afterSave });
  };

  const switchDevice = (device) => {
    const changes = getDeviceChanges(selectedDevice.id);
    const doSwitch = () => {
      setSelectedDevice(device);
      const newSession = createSession(device);
      setSession(newSession);
      setHistory(prev => [
        ...prev,
        { type: "output", text: `` },
        { type: "system", text: `━━━ Switching to ${device.name} (${device.ip}) ━━━` },
        { type: "output", text: `Vendor: ${device.model}` },
        { type: "output", text: `Type "?" for available commands.` },
        { type: "output", text: `` },
      ]);
      setShowDropdown(false);
    };
    maybePromptSave(selectedDevice.id, selectedDevice.name, selectedDevice.vendor, changes, doSwitch);
    if (changes.length === 0) setShowDropdown(false);
  };

  const handleClose = () => {
    const changes = getDeviceChanges(selectedDevice.id);
    maybePromptSave(selectedDevice.id, selectedDevice.name, selectedDevice.vendor, changes, onClose);
    if (changes.length === 0) onClose();
  };

  const submitCommand = () => {
    const cmd = input.trim();
    if (!cmd) return;

    const prompt = getPrompt(session);
    const newSession = { ...session, config: { ...session.config } };
    const expandedCmd = expandAbbreviations(cmd, selectedDevice.vendor);
    const output = processCommand(cmd, newSession, selectedDevice);

    // Track config mutations as pending changes
    if (isConfigMutation(expandedCmd)) {
      setPendingChanges(prev => ({
        ...prev,
        [selectedDevice.id]: [...(prev[selectedDevice.id] || []), expandedCmd],
      }));
    }

    // If saving via CLI command (wr / copy run start / commit), persist immediately
    const lower = expandedCmd.toLowerCase();
    if (
      lower === "copy running-config startup-config" ||
      lower === "wr" ||
      lower === "commit"
    ) {
      const changes = pendingChanges[selectedDevice.id] || [];
      persistConfigToDesign(selectedDevice.id, selectedDevice.name, selectedDevice.vendor, changes);
      setSavedConfigs(prev => ({
        ...prev,
        [selectedDevice.id]: (prev[selectedDevice.id] || "") + changes.join("\n") + "\n",
      }));
      setPendingChanges(prev => ({ ...prev, [selectedDevice.id]: [] }));
    }

    setSession(newSession);
    setCmdHistory(prev => [cmd, ...prev]);
    setCmdIndex(-1);

    setHistory(prev => [
      ...prev,
      { type: "input", text: `${prompt} ${cmd}` },
      ...output.map(line => ({ type: "output", text: line })),
    ]);
    setInput("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") { submitCommand(); return; }
    if (e.key === "ArrowUp") {
      const idx = Math.min(cmdIndex + 1, cmdHistory.length - 1);
      setCmdIndex(idx);
      setInput(cmdHistory[idx] || "");
    }
    if (e.key === "ArrowDown") {
      const idx = Math.max(cmdIndex - 1, -1);
      setCmdIndex(idx);
      setInput(cmdHistory[idx] || "");
    }
  };

  const hasPending = (getDeviceChanges(selectedDevice.id).length > 0);
  const [activeTab, setActiveTab] = useState("terminal"); // "terminal" | "monitor"

  const vendorColor = {
    cisco: "text-blue-400",
    arista: "text-green-400",
    juniper: "text-orange-400",
    paloalto: "text-red-400",
    fortinet: "text-red-300",
    pfsense: "text-cyan-400",
    linux: "text-green-300",
  };

  const deviceIcon = (type) => {
    if (type === "firewall") return <Shield className="h-3 w-3" />;
    if (type === "server") return <Server className="h-3 w-3" />;
    return <Router className="h-3 w-3" />;
  };

  return (
    <>
    {savePrompt && (
      <SavePromptModal
        deviceName={savePrompt.deviceName}
        changes={savePrompt.changes}
        onSave={handleSave}
        onDiscard={handleDiscard}
      />
    )}
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => e.target === e.currentTarget && handleClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-4xl h-[85vh] flex flex-col rounded-2xl overflow-hidden border border-green-500/30 shadow-2xl shadow-green-500/10"
      >
        {/* Title Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-[#1a1a1a] border-b border-green-500/20">
          <div className="flex items-center gap-2">
            <div className="flex gap-1.5">
              <div className="h-3 w-3 rounded-full bg-red-500"></div>
              <div className="h-3 w-3 rounded-full bg-yellow-500"></div>
              <div className="h-3 w-3 rounded-full bg-green-500"></div>
            </div>
            <Terminal className="h-4 w-4 text-green-400 ml-2" />
            <span className="text-green-400 text-sm font-mono font-semibold">
              {selectedDevice.name} — Virtual Console
            </span>
            {hasPending && activeTab === "terminal" && (
              <span className="flex items-center gap-1 ml-2 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/30 rounded text-yellow-400 text-[10px] font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-yellow-400 animate-pulse inline-block" />
                unsaved changes
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Tabs */}
            <div className="flex items-center bg-[#252525] border border-green-500/20 rounded-lg p-0.5">
              <button
                onClick={() => setActiveTab("terminal")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono transition-all ${activeTab === "terminal" ? "bg-green-500/20 text-green-300" : "text-green-700 hover:text-green-400"}`}
              >
                <Terminal className="h-3 w-3" />
                Terminal
              </button>
              <button
                onClick={() => setActiveTab("monitor")}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-mono transition-all ${activeTab === "monitor" ? "bg-green-500/20 text-green-300" : "text-green-700 hover:text-green-400"}`}
              >
                <Activity className="h-3 w-3" />
                Monitor
                <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse inline-block ml-0.5" />
              </button>
            </div>

            {/* Device selector (terminal only) */}
            {activeTab === "terminal" && (
              <div className="relative">
                <button
                  onClick={() => setShowDropdown(v => !v)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-[#252525] border border-green-500/20 rounded-lg text-xs font-mono text-green-300 hover:border-green-500/50 transition-all"
                >
                  <Wifi className="h-3 w-3" />
                  {selectedDevice.name}
                  <ChevronDown className="h-3 w-3" />
                </button>
                <AnimatePresence>
                  {showDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="absolute right-0 top-full mt-1 bg-[#1e1e1e] border border-green-500/20 rounded-xl shadow-xl z-50 min-w-[220px] py-1"
                    >
                      {devices.map(dev => (
                        <button
                          key={dev.id}
                          onClick={() => switchDevice(dev)}
                          className={`w-full text-left px-4 py-2.5 flex items-center gap-3 hover:bg-green-500/10 transition-colors ${selectedDevice.id === dev.id ? "bg-green-500/5" : ""}`}
                        >
                          <span className={`${vendorColor[dev.vendor] || "text-green-400"}`}>{deviceIcon(dev.type)}</span>
                          <div>
                            <p className="text-xs font-mono text-green-200">{dev.name}</p>
                            <p className="text-[10px] text-green-600">{dev.ip} · {dev.model}</p>
                          </div>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}

            <button
              onClick={handleClose}
              className="p-1.5 text-green-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Device info bar — terminal only */}
        {activeTab === "terminal" && (
          <div className="flex items-center gap-4 px-4 py-1.5 bg-[#111] border-b border-green-500/10 text-[11px] font-mono">
            <span className={vendorColor[selectedDevice.vendor] || "text-green-400"}>● {selectedDevice.vendor.toUpperCase()}</span>
            <span className="text-green-700">IP: {selectedDevice.ip}</span>
            <span className="text-green-700">Model: {selectedDevice.model}</span>
            <span className="text-green-700">Mode: <span className="text-green-400">{session.mode.replace("_", " ")}</span></span>
            <span className="text-green-700">Site: {selectedDevice.site}</span>
          </div>
        )}

        {/* Terminal output */}
        {activeTab === "terminal" && (
          <>
            <div
              className="flex-1 overflow-y-auto bg-[#0d0d0d] px-4 py-3 font-mono text-sm cursor-text"
              onClick={() => inputRef.current?.focus()}
            >
              {history.map((line, i) => (
                <div
                  key={i}
                  className={
                    line.type === "input" ? "text-green-300 whitespace-pre-wrap" :
                    line.type === "banner" ? "text-green-500 whitespace-pre" :
                    line.type === "system" ? "text-cyan-400 whitespace-pre-wrap" :
                    "text-green-200/80 whitespace-pre-wrap"
                  }
                >
                  {line.text || "\u00A0"}
                </div>
              ))}
              <div className="flex items-center gap-1 mt-1">
                <span className="text-green-300 shrink-0">{getPrompt(session)}</span>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="flex-1 bg-transparent outline-none text-green-200 caret-green-400 font-mono"
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck={false}
                />
              </div>
              <div ref={bottomRef} />
            </div>
            <div className="flex items-center gap-4 px-4 py-2 bg-[#111] border-t border-green-500/10 text-[10px] font-mono text-green-700">
              <span><kbd className="text-green-500">↑↓</kbd> History</span>
              <span><kbd className="text-green-500">?</kbd> Help</span>
              <span><kbd className="text-green-500">exit</kbd> Back</span>
              <span className="ml-auto">Click device dropdown to switch nodes</span>
            </div>
          </>
        )}

        {/* Monitor tab */}
        {activeTab === "monitor" && (
          <div className="flex-1 overflow-hidden">
            <DeviceMonitor devices={devices} />
          </div>
        )}
      </motion.div>
    </motion.div>
    </>
  );
}