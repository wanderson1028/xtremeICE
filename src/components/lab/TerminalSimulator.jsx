import React, { useState, useRef, useEffect } from "react";
import { Terminal, X, Minus, Square, RotateCcw, Copy, Check } from "lucide-react";

// ── Simulated command outputs ─────────────────────────────────────────────────

const SIMULATED_OUTPUTS = {
  // ifconfig variants
  "ifconfig": () => `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.1.50  netmask 255.255.255.0  broadcast 192.168.1.255
        inet6 fe80::a00:27ff:fe4b:9c2d  prefixlen 64  scopeid 0x20<link>
        ether 08:00:27:4b:9c:2d  txqueuelen 1000  (Ethernet)
        RX packets 1482  bytes 143291 (139.9 KiB)
        TX packets 963   bytes 98023 (95.7 KiB)

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        inet6 ::1  prefixlen 128  scopeid 0x10<host>
        loop  txqueuelen 1000  (Local Loopback)`,

  "ifconfig -a": () => `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.1.50  netmask 255.255.255.0  broadcast 192.168.1.255
        ether 08:00:27:4b:9c:2d  txqueuelen 1000  (Ethernet)

eth1: flags=4098<BROADCAST,MULTICAST>  mtu 1500
        ether 08:00:27:aa:bb:cc  txqueuelen 1000  (Ethernet)
        [INACTIVE - no IP assigned]

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0`,

  "ifconfig eth0": () => `eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 192.168.1.50  netmask 255.255.255.0  broadcast 192.168.1.255
        inet6 fe80::a00:27ff:fe4b:9c2d  prefixlen 64  scopeid 0x20<link>
        ether 08:00:27:4b:9c:2d  txqueuelen 1000  (Ethernet)
        RX packets 1482  bytes 143291 (139.9 KiB)
        TX packets 963   bytes 98023 (95.7 KiB)`,

  // nmap variants
  "nmap 192.168.1.10": () => `Starting Nmap 7.94 ( https://nmap.org ) at ${new Date().toLocaleString()}
Nmap scan report for 192.168.1.10
Host is up (0.00042s latency).
Not shown: 994 closed tcp ports (reset)
PORT     STATE SERVICE
22/tcp   open  ssh
80/tcp   open  http
443/tcp  open  https
3306/tcp open  mysql
8080/tcp open  http-proxy
8443/tcp open  https-alt
MAC Address: 08:00:27:1A:2B:3C (Oracle VirtualBox virtual NIC)

Nmap done: 1 IP address (1 host up) scanned in 0.84 seconds`,

  "nmap -sn 192.168.1.0/24": () => `Starting Nmap 7.94 ( https://nmap.org ) at ${new Date().toLocaleString()}
Nmap scan report for 192.168.1.1
Host is up (0.00021s latency).
Nmap scan report for 192.168.1.10
Host is up (0.00033s latency).
Nmap scan report for 192.168.1.50
Host is up (0.00011s latency).
Nmap scan report for 192.168.1.100
Host is up (0.00087s latency).
Nmap scan report for 192.168.1.254
Host is up (0.00019s latency).
MAC Address: 08:00:27:FF:AA:BB (Oracle VirtualBox virtual NIC)

Nmap done: 256 IP addresses (5 hosts up) scanned in 2.43 seconds`,

  "nmap -sv 192.168.1.10": () => `Starting Nmap 7.94 ( https://nmap.org ) at ${new Date().toLocaleString()}
Nmap scan report for 192.168.1.10
Host is up (0.00041s latency).
PORT     STATE SERVICE  VERSION
22/tcp   open  ssh      OpenSSH 8.9p1 Ubuntu 3ubuntu0.4 (Ubuntu Linux; protocol 2.0)
80/tcp   open  http     Apache httpd 2.4.52 ((Ubuntu))
443/tcp  open  ssl/http Apache httpd 2.4.52 ((Ubuntu))
3306/tcp open  mysql    MySQL 8.0.32-0ubuntu0.22.04.2
8080/tcp open  http     nginx 1.18.0 (Ubuntu)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 7.12 seconds`,

  "nmap -on lab_scan.txt 192.168.1.10": () => `Starting Nmap 7.94 ( https://nmap.org ) at ${new Date().toLocaleString()}
Nmap scan report for 192.168.1.10
Host is up (0.00039s latency).
PORT     STATE SERVICE
22/tcp   open  ssh
80/tcp   open  http
443/tcp  open  https
3306/tcp open  mysql
8080/tcp open  http-proxy

Nmap done: 1 IP address (1 host up) scanned in 0.91 seconds
[+] Output saved to lab_scan.txt`,

  "cat lab_scan.txt": () => `# Nmap 7.94 scan initiated
# Nmap scan report for 192.168.1.10
Host: 192.168.1.10 ()   Status: Up
Host: 192.168.1.10 ()   Ports: 22/open/tcp//ssh///, 80/open/tcp//http///, 443/open/tcp//https///, 3306/open/tcp//mysql///, 8080/open/tcp//http-proxy///
# Nmap done -- 1 IP address (1 host up) scanned in 0.91 seconds`,

  // netdiscover
  "netdiscover -r 192.168.1.0/24": () => `Currently scanning: Finished!   |   Screen View: Unique Hosts

 5 Captured ARP Req/Rep packets, from 5 hosts.   Total size: 300
 _____________________________________________________________________________
   IP            At MAC Address     Count     Len  MAC Vendor / Hostname
 -----------------------------------------------------------------------------
 192.168.1.1     c8:3a:35:1a:2b:3c      1      60  Cisco Systems, Inc.
 192.168.1.10    08:00:27:1a:2b:3c      1      60  Oracle VirtualBox (Target Server)
 192.168.1.50    08:00:27:4b:9c:2d      1      60  Oracle VirtualBox (Kali - YOU)
 192.168.1.100   b8:27:eb:aa:bb:cc      1      60  Raspberry Pi Foundation
 192.168.1.254   00:50:56:c0:00:08      1      60  VMware, Inc. (Gateway)`,

  // nikto
  "nikto -h http://192.168.1.10": () => `- Nikto v2.1.6
---------------------------------------------------------------------------
+ Target IP:          192.168.1.10
+ Target Hostname:    192.168.1.10
+ Target Port:        80
+ Start Time:         ${new Date().toLocaleString()}
---------------------------------------------------------------------------
+ Server: Apache/2.4.52 (Ubuntu)
+ /: The anti-clickjacking X-Frame-Options header is not present. See: https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers/X-Frame-Options
+ /: The X-Content-Type-Options header is not set. This could allow the browser to interpret files as a different MIME type to what is specified.
+ No CGI Directories found (use '-C all' to force check all possible dirs)
+ Apache/2.4.52 appears to be outdated (current is at least Apache/2.4.57).
+ /: Web Server returns a valid response with junk HTTP methods which may cause false positives.
+ /config.php: PHP Config file may contain database credentials and other sensitive information.
+ /admin/: This might be interesting: /admin/ found.
+ /phpinfo.php: Output from the phpinfo() function was found.
+ OSVDB-3268: /icons/: Directory indexing found.
+ 8102 requests: 0 error(s) and 9 item(s) reported on remote host
+ End Time:           ${new Date(Date.now() + 45000).toLocaleString()} (45 seconds)
---------------------------------------------------------------------------
+ 1 host(s) tested`,

  "nikto -h http://192.168.1.10 -o nikto_report.txt": () => `- Nikto v2.1.6
---------------------------------------------------------------------------
+ Target IP:          192.168.1.10
+ Target Port:        80
+ Start Time:         ${new Date().toLocaleString()}
---------------------------------------------------------------------------
+ Server: Apache/2.4.52 (Ubuntu)
+ /: Missing X-Frame-Options header.
+ /: Missing X-Content-Type-Options header.
+ Apache/2.4.52 appears to be outdated.
+ /config.php: PHP Config file may contain database credentials.
+ /admin/: Admin directory found.
+ /phpinfo.php: phpinfo() output exposed.
+ 9 item(s) reported on remote host
---------------------------------------------------------------------------
[+] Report saved to nikto_report.txt`,

  // man pages
  "man nmap": () => `NMAP(1)                     Network exploration tool                    NMAP(1)

NAME
       nmap - Network exploration tool and security / port scanner

SYNOPSIS
       nmap [Scan Type...] [Options] {target specification}

DESCRIPTION
       Nmap ("Network Mapper") is an open source tool for network exploration
       and security auditing. It was designed to rapidly scan large networks,
       although it works fine against single hosts.

SCAN TYPES
       -sS/sT/sA/sW/sM: TCP SYN/Connect()/ACK/Window/Maimon scans
       -sU: UDP Scan
       -sN/sF/sX: TCP Null, FIN, and Xmas scans
       -sP/-sn: Ping Scan (host discovery)
       -sV: Probe open ports to determine service/version info

OPTIONS
       -p <port ranges>: Only scan specified ports
       -oN/-oX/-oG <file>: Output scan in normal, XML, and grepable format
       -v: Increase verbosity level
       -A: Enable OS detection, version detection, script scanning

(press q to quit)`,

  "man -k network": () => `arp (8)              - manipulate the system ARP cache
ifconfig (8)         - configure a network interface
ip (8)               - show / manipulate routing, network devices, interfaces
netstat (8)          - Print network connections, routing tables, interface stats
nmap (1)             - Network exploration tool and security / port scanner
netdiscover (8)      - active/passive ARP reconnaissance tool
ping (8)             - send ICMP ECHO_REQUEST to network hosts
route (8)            - show / manipulate the IP routing table
tcpdump (8)          - dump traffic on a network
traceroute (8)       - print the route packets trace to network host`,

  "man -f nikto": () => `nikto (1)            - Scan web server for dangerous files/CGIs`,

  // apt update
  "sudo apt-get update": () => `Hit:1 http://kali.download/kali kali-rolling InRelease
Get:2 http://kali.download/kali kali-rolling/main amd64 Packages [19.7 MB]
Get:3 http://kali.download/kali kali-rolling/main i386 Packages [17.2 MB]
Fetched 36.9 MB in 12s (3,075 kB/s)
Reading package lists... Done
Building dependency tree... Done
Reading state information... Done
All packages are up to date.`,

  // clear
  "clear": () => "__CLEAR__",

  // help
  "help": () => `Available simulated commands:
  nmap 192.168.1.10               - Basic port scan
  nmap -sn 192.168.1.0/24        - Host discovery (ping scan)
  nmap -sV 192.168.1.10          - Service version detection
  nmap -oN lab_scan.txt 192.168.1.10  - Save output to file
  cat lab_scan.txt               - View saved scan file
  netdiscover -r 192.168.1.0/24  - ARP-based host discovery
  nikto -h http://192.168.1.10   - Web vulnerability scan
  nikto -h http://192.168.1.10 -o nikto_report.txt
  man nmap                       - Nmap manual page
  man -k network                 - Search man pages for 'network'
  man -f nikto                   - Short description of nikto
  ifconfig                       - Show active interfaces
  ifconfig -a                    - Show all interfaces
  ifconfig eth0                  - Show specific interface
  sudo apt-get update            - Update package lists
  clear                          - Clear terminal
  help                           - Show this help`,
};

function resolveCommand(raw) {
  const cmd = raw.trim().toLowerCase().replace(/\s+/g, " ");
  if (SIMULATED_OUTPUTS[cmd]) return SIMULATED_OUTPUTS[cmd]();
  // Fuzzy: nmap -sV (case-insensitive flag order)
  if (cmd.startsWith("nmap") && cmd.includes("-sv")) return SIMULATED_OUTPUTS["nmap -sv 192.168.1.10"]?.();
  if (cmd.startsWith("nmap") && cmd.includes("-on")) return SIMULATED_OUTPUTS["nmap -on lab_scan.txt 192.168.1.10"]?.();
  return `bash: ${raw.split(" ")[0]}: command not found\nType 'help' to see available simulated commands.`;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function TerminalSimulator({ suggestedCommands = [], onCommandRun }) {
  const [history, setHistory] = useState([
    { type: "system", text: "Kali Linux 2023.4 — Lab Terminal Simulator" },
    { type: "system", text: "Type 'help' to see available commands. Type a command and press Enter." },
    { type: "system", text: "─────────────────────────────────────────────────────────────────" },
  ]);
  const [input, setInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const [copied, setCopied] = useState(false);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const runCommand = (cmd) => {
    const trimmed = cmd.trim();
    if (!trimmed) return;
    const output = resolveCommand(trimmed);
    if (output === "__CLEAR__") {
      setHistory([
        { type: "system", text: "Terminal cleared." },
      ]);
    } else {
      setHistory((prev) => [
        ...prev,
        { type: "input", text: trimmed },
        { type: "output", text: output },
      ]);
    }
    setCmdHistory((prev) => [trimmed, ...prev.slice(0, 49)]);
    setHistIdx(-1);
    setInput("");
    if (onCommandRun) onCommandRun(trimmed);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      runCommand(input);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const nextIdx = Math.min(histIdx + 1, cmdHistory.length - 1);
      setHistIdx(nextIdx);
      setInput(cmdHistory[nextIdx] || "");
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const nextIdx = Math.max(histIdx - 1, -1);
      setHistIdx(nextIdx);
      setInput(nextIdx === -1 ? "" : cmdHistory[nextIdx] || "");
    }
  };

  const handleCopy = () => {
    const text = history.map(h => h.type === "input" ? `$ ${h.text}` : h.text).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="bg-[#0d1117] border border-border rounded-xl overflow-hidden font-mono text-xs shadow-2xl">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#161b22] border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex gap-1.5">
            <div className="h-3 w-3 rounded-full bg-red-500/80" />
            <div className="h-3 w-3 rounded-full bg-yellow-500/80" />
            <div className="h-3 w-3 rounded-full bg-green-500/80" />
          </div>
          <span className="text-muted-foreground text-[11px] ml-2 flex items-center gap-1.5">
            <Terminal className="h-3 w-3" /> kali@lab:~
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 text-[10px]"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => {
              setHistory([{ type: "system", text: "Terminal cleared. Type 'help' for available commands." }]);
              setInput("");
            }}
            className="text-muted-foreground hover:text-foreground transition-colors"
            title="Clear"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Suggested commands */}
      {suggestedCommands.length > 0 && (
        <div className="px-4 py-2 bg-[#0d1117] border-b border-border/50 flex flex-wrap gap-1.5">
          <span className="text-muted-foreground text-[10px] mr-1 self-center">Quick run:</span>
          {suggestedCommands.map((cmd, i) => (
            <button
              key={i}
              onClick={() => { setInput(cmd); inputRef.current?.focus(); }}
              className="text-[10px] px-2 py-0.5 rounded bg-secondary border border-border text-green-400 hover:bg-primary/10 hover:border-primary/30 transition-colors"
            >
              {cmd}
            </button>
          ))}
        </div>
      )}

      {/* Output area */}
      <div
        className="h-80 overflow-y-auto p-4 space-y-1 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {history.map((line, i) => (
          <div key={i}>
            {line.type === "input" && (
              <div className="flex items-start gap-2">
                <span className="text-green-400 shrink-0">┌──(kali㉿lab)-[~]<br />└─$</span>
                <span className="text-white ml-1">{line.text}</span>
              </div>
            )}
            {line.type === "output" && (
              <pre className="text-green-300/90 whitespace-pre-wrap leading-relaxed pl-4">{line.text}</pre>
            )}
            {line.type === "system" && (
              <p className="text-primary/70 text-[10px]">{line.text}</p>
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div className="flex items-center gap-2 px-4 py-3 border-t border-border bg-[#0d1117]">
        <span className="text-green-400 shrink-0 text-[11px]">┌──(kali㉿lab)-[~]<br />└─$</span>
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 bg-transparent outline-none text-white caret-green-400 text-xs placeholder:text-muted-foreground/40"
          placeholder="type a command..."
          autoComplete="off"
          spellCheck={false}
        />
      </div>
    </div>
  );
}