import React, { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Activity, Wifi, AlertTriangle } from "lucide-react";

const EVENTS_BY_TYPE = {
  router: [
    { status: "connected", label: "BGP session established", icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/15 border-green-500/40" },
    { status: "connected", label: "Route table updated (12 prefixes)", icon: Activity, color: "text-green-400", bg: "bg-green-500/15 border-green-500/40" },
    { status: "error", label: "Interface Gi0/1 down — link failure", icon: XCircle, color: "text-red-400", bg: "bg-red-500/15 border-red-500/40" },
    { status: "warning", label: "High CPU: 87% utilization detected", icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/40" },
  ],
  switch: [
    { status: "connected", label: "STP topology converged (port Gi1/0/3)", icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/15 border-green-500/40" },
    { status: "connected", label: "VLAN 10 — 24 hosts active", icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/15 border-green-500/40" },
    { status: "error", label: "MAC flooding detected on port Fa0/5", icon: XCircle, color: "text-red-400", bg: "bg-red-500/15 border-red-500/40" },
    { status: "warning", label: "Port Fa0/8 entering err-disabled state", icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/40" },
  ],
  firewall: [
    { status: "connected", label: "Policy rule #7 — ALLOW passed", icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/15 border-green-500/40" },
    { status: "error", label: "Intrusion attempt blocked: 192.168.1.45", icon: XCircle, color: "text-red-400", bg: "bg-red-500/15 border-red-500/40" },
    { status: "error", label: "DDoS traffic detected — rate limited", icon: XCircle, color: "text-red-400", bg: "bg-red-500/15 border-red-500/40" },
    { status: "connected", label: "VPN tunnel UP — 4 sessions active", icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/15 border-green-500/40" },
  ],
  server: [
    { status: "connected", label: "HTTP 200 — service responding", icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/15 border-green-500/40" },
    { status: "error", label: "Service timeout — connection refused", icon: XCircle, color: "text-red-400", bg: "bg-red-500/15 border-red-500/40" },
    { status: "warning", label: "Disk usage at 91% — low space", icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/40" },
    { status: "connected", label: "Backup completed — 3.2GB transferred", icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/15 border-green-500/40" },
  ],
  wireless: [
    { status: "connected", label: "AP associated — 18 clients on 5GHz", icon: Wifi, color: "text-green-400", bg: "bg-green-500/15 border-green-500/40" },
    { status: "warning", label: "Channel interference detected (ch 6)", icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/40" },
    { status: "error", label: "AP unreachable — CAPWAP tunnel down", icon: XCircle, color: "text-red-400", bg: "bg-red-500/15 border-red-500/40" },
    { status: "connected", label: "WPA3 handshake success — client joined", icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/15 border-green-500/40" },
  ],
  workstation: [
    { status: "connected", label: "DHCP lease obtained — 10.0.1.42", icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/15 border-green-500/40" },
    { status: "connected", label: "Ping to gateway: 4ms RTT", icon: Activity, color: "text-green-400", bg: "bg-green-500/15 border-green-500/40" },
    { status: "error", label: "DNS resolution failed — timeout", icon: XCircle, color: "text-red-400", bg: "bg-red-500/15 border-red-500/40" },
  ],
  phone: [
    { status: "connected", label: "SIP registration successful", icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/15 border-green-500/40" },
    { status: "error", label: "VoIP quality degraded — jitter 80ms", icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/15 border-yellow-500/40" },
  ],
  internet: [
    { status: "connected", label: "ISP uplink: 987 Mbps / 412 Mbps", icon: Activity, color: "text-green-400", bg: "bg-green-500/15 border-green-500/40" },
    { status: "error", label: "ISP link down — failover triggered", icon: XCircle, color: "text-red-400", bg: "bg-red-500/15 border-red-500/40" },
  ],
};

const FALLBACK_EVENTS = [
  { status: "connected", label: "Device reachable — ping OK", icon: CheckCircle2, color: "text-green-400", bg: "bg-green-500/15 border-green-500/40" },
  { status: "error", label: "No response — device may be offline", icon: XCircle, color: "text-red-400", bg: "bg-red-500/15 border-red-500/40" },
];

export default function SimulationEvent({ node, onDone }) {
  const [visible, setVisible] = useState(true);

  const pool = EVENTS_BY_TYPE[node?.type] || FALLBACK_EVENTS;
  const event = pool[Math.floor(Math.random() * pool.length)];
  const Icon = event.icon;

  useEffect(() => {
    const hide = setTimeout(() => setVisible(false), 2800);
    const done = setTimeout(() => onDone(), 3200);
    return () => { clearTimeout(hide); clearTimeout(done); };
  }, []);

  return (
    <div
      className={`
        flex items-start gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg
        transition-all duration-500
        ${event.bg}
        ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}
      `}
      style={{ transition: "opacity 0.4s ease, transform 0.4s ease" }}
    >
      <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${event.color}`} />
      <div className="min-w-0">
        <p className="font-semibold text-foreground text-xs">{node.label.replace(/\n/g, " ")}</p>
        <p className={`text-xs mt-0.5 ${event.color}`}>{event.label}</p>
      </div>
      <span className={`ml-auto text-[10px] font-bold uppercase tracking-wider ${event.color} opacity-70`}>
        {event.status}
      </span>
    </div>
  );
}