import React from "react";

/* EVE-NG classic style icons — clean line-art matching the reference image.
   These use currentColor so they inherit the theme text color. */

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

/* ── Router (circle with 4 arrows pointing inward) ──────────── */
export function EveRouterIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <circle cx="36" cy="36" r="28" {...stroke} strokeWidth={2.5} />
      <line x1="36" y1="8" x2="36" y2="36" {...stroke} />
      <line x1="64" y1="36" x2="36" y2="36" {...stroke} />
      <line x1="36" y1="64" x2="36" y2="36" {...stroke} />
      <line x1="8" y1="36" x2="36" y2="36" {...stroke} />
      {/* arrowheads pointing inward */}
      <polygon points="36,14 32,22 40,22" fill="currentColor" stroke="none" />
      <polygon points="58,36 50,32 50,40" fill="currentColor" stroke="none" />
      <polygon points="36,58 32,50 40,50" fill="currentColor" stroke="none" />
      <polygon points="14,36 22,32 22,40" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ── Switch (square with X pattern) ─────────────────────────── */
export function EveSwitchIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="10" y="10" width="52" height="52" rx="4" {...stroke} strokeWidth={2.5} />
      <line x1="14" y1="14" x2="58" y2="58" {...stroke} />
      <line x1="58" y1="14" x2="14" y2="58" {...stroke} />
      {/* port indicators */}
      <circle cx="14" cy="14" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="58" cy="14" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="14" cy="58" r="2.5" fill="currentColor" stroke="none" />
      <circle cx="58" cy="58" r="2.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ── Firewall (brick wall pattern) ──────────────────────────── */
export function EveFirewallIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="8" y="12" width="56" height="48" rx="3" {...stroke} strokeWidth={2.5} />
      {/* brick rows */}
      <line x1="8" y1="26" x2="64" y2="26" {...stroke} />
      <line x1="8" y1="40" x2="64" y2="40" {...stroke} />
      <line x1="8" y1="54" x2="64" y2="54" {...stroke} />
      {/* brick verticals — staggered */}
      <line x1="22" y1="12" x2="22" y2="26" {...stroke} />
      <line x1="40" y1="12" x2="40" y2="26" {...stroke} />
      <line x1="14" y1="26" x2="14" y2="40" {...stroke} />
      <line x1="32" y1="26" x2="32" y2="40" {...stroke} />
      <line x1="50" y1="26" x2="50" y2="40" {...stroke} />
      <line x1="22" y1="40" x2="22" y2="54" {...stroke} />
      <line x1="40" y1="40" x2="40" y2="54" {...stroke} />
    </svg>
  );
}

/* ── Server (rack server block) ─────────────────────────────── */
export function EveServerIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="12" y="10" width="48" height="52" rx="3" {...stroke} strokeWidth={2.5} />
      <line x1="12" y1="24" x2="60" y2="24" {...stroke} />
      <line x1="12" y1="38" x2="60" y2="38" {...stroke} />
      <line x1="12" y1="52" x2="60" y2="52" {...stroke} />
      {/* LEDs */}
      <circle cx="18" cy="17" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="18" cy="31" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="18" cy="45" r="1.8" fill="currentColor" stroke="none" />
      <circle cx="18" cy="58" r="1.8" fill="currentColor" stroke="none" />
      {/* drive slots */}
      <line x1="26" y1="17" x2="52" y2="17" {...stroke} strokeWidth={1} />
      <line x1="26" y1="31" x2="52" y2="31" {...stroke} strokeWidth={1} />
      <line x1="26" y1="45" x2="52" y2="45" {...stroke} strokeWidth={1} />
    </svg>
  );
}

/* ── Workstation (monitor) ──────────────────────────────────── */
export function EveWorkstationIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="8" y="10" width="56" height="38" rx="3" {...stroke} strokeWidth={2.5} />
      <rect x="13" y="15" width="46" height="28" rx="1" {...stroke} strokeWidth={1} />
      <line x1="28" y1="48" x2="28" y2="56" {...stroke} />
      <line x1="44" y1="48" x2="44" y2="56" {...stroke} />
      <line x1="20" y1="56" x2="52" y2="56" {...stroke} strokeWidth={2.5} />
    </svg>
  );
}

/* ── Cloud (flat-bottomed stylized cloud) ───────────────────── */
export function EveCloudIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <path
        d="M16 48 C8 48 4 40 8 34 C6 26 14 18 22 20 C24 10 38 8 44 16 C52 10 64 16 62 26 C70 28 70 40 62 46 C62 48 60 48 58 48 Z"
        {...stroke}
        strokeWidth={2.5}
      />
      <line x1="16" y1="48" x2="58" y2="48" {...stroke} strokeWidth={2.5} />
    </svg>
  );
}

/* ── Container ──────────────────────────────────────────────── */
export function EveContainerIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="8" y="16" width="56" height="44" rx="3" {...stroke} strokeWidth={2.5} />
      <line x1="8" y1="26" x2="64" y2="26" {...stroke} />
      {/* vertical ribs */}
      {[16, 24, 32, 40, 48, 56].map(x => (
        <line key={x} x1={x} y1="26" x2={x} y2="60" {...stroke} strokeWidth={1} />
      ))}
      <rect x="28" y="8" width="16" height="8" rx="1" {...stroke} strokeWidth={1.5} />
    </svg>
  );
}

/* ── Load Balancer (distributor) ────────────────────────────── */
export function EveLoadBalancerIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="28" y="6" width="16" height="12" rx="2" {...stroke} strokeWidth={2} />
      <rect x="6" y="54" width="16" height="12" rx="2" {...stroke} strokeWidth={2} />
      <rect x="28" y="54" width="16" height="12" rx="2" {...stroke} strokeWidth={2} />
      <rect x="50" y="54" width="16" height="12" rx="2" {...stroke} strokeWidth={2} />
      {/* distribution lines */}
      <line x1="36" y1="18" x2="14" y2="54" {...stroke} />
      <line x1="36" y1="18" x2="36" y2="54" {...stroke} />
      <line x1="36" y1="18" x2="58" y2="54" {...stroke} />
    </svg>
  );
}

/* ── Security Appliance (shield) ────────────────────────────── */
export function EveSecurityApplianceIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <path d="M36 6 L60 16 L60 36 C60 52 48 62 36 66 C24 62 12 52 12 36 L12 16 Z" {...stroke} strokeWidth={2.5} />
      <path d="M28 36 L34 42 L46 28" {...stroke} strokeWidth={3} />
    </svg>
  );
}

/* ── Monitor / SIEM ─────────────────────────────────────────── */
export function EveMonitoringIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="8" y="10" width="56" height="38" rx="3" {...stroke} strokeWidth={2.5} />
      <polyline points="14,38 22,28 30,32 40,18 50,24 58,14" {...stroke} strokeWidth={2} />
      <line x1="28" y1="48" x2="28" y2="56" {...stroke} />
      <line x1="20" y1="56" x2="52" y2="56" {...stroke} strokeWidth={2.5} />
    </svg>
  );
}

/* ── Access Point (wireless) ────────────────────────────────── */
export function EveAccessPointIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="24" y="44" width="24" height="20" rx="3" {...stroke} strokeWidth={2.5} />
      <line x1="36" y1="36" x2="36" y2="44" {...stroke} />
      <circle cx="36" cy="30" r="3" fill="currentColor" stroke="none" />
      <path d="M28 30 C28 22 44 22 44 30" {...stroke} strokeWidth={2} />
      <path d="M24 30 C24 16 48 16 48 30" {...stroke} strokeWidth={2} />
      <path d="M20 30 C20 10 52 10 52 30" {...stroke} strokeWidth={2} />
      <circle cx="30" cy="52" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="36" cy="52" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="42" cy="52" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ── Wireless Controller ────────────────────────────────────── */
export function EveWirelessControllerIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="8" y="20" width="56" height="36" rx="4" {...stroke} strokeWidth={2.5} />
      <circle cx="18" cy="30" r="2" fill="currentColor" stroke="none" />
      <circle cx="26" cy="30" r="2" fill="currentColor" stroke="none" />
      <circle cx="34" cy="30" r="2" fill="currentColor" stroke="none" />
      <path d="M16 42 C16 36 56 36 56 42" {...stroke} strokeWidth={2} />
      <path d="M20 46 C20 42 52 42 52 46" {...stroke} strokeWidth={2} />
      <rect x="14" y="50" width="44" height="2" rx="1" fill="currentColor" fillOpacity="0.3" />
    </svg>
  );
}

/* ── L3 Switch (layer 3) ────────────────────────────────────── */
export function EveL3SwitchIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="8" y="16" width="56" height="40" rx="4" {...stroke} strokeWidth={2.5} />
      <text x="36" y="28" textAnchor="middle" fontSize="8" fill="currentColor" stroke="none" className="font-mono font-bold">L3</text>
      <line x1="14" y1="34" x2="58" y2="34" {...stroke} strokeWidth={1} />
      <line x1="14" y1="40" x2="58" y2="40" {...stroke} strokeWidth={1} />
      {[18, 26, 34, 42, 50].map(x => (
        <g key={x}>
          <rect x={x} y="36" width="4" height="4" rx="0.5" fill="currentColor" fillOpacity="0.4" />
          <rect x={x} y="42" width="4" height="4" rx="0.5" fill="currentColor" fillOpacity="0.3" />
        </g>
      ))}
      <circle cx="14" cy="50" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="20" cy="50" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ── Core Switch ────────────────────────────────────────────── */
export function EveCoreSwitchIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="6" y="14" width="60" height="44" rx="4" {...stroke} strokeWidth={2.5} />
      <rect x="10" y="18" width="52" height="8" rx="2" fill="currentColor" fillOpacity="0.15" />
      <text x="36" y="24" textAnchor="middle" fontSize="6" fill="currentColor" stroke="none" className="font-mono">CORE</text>
      {[12, 20, 28, 36, 44, 52].map(x => (
        <rect key={x} x={x} y="30" width="5" height="6" rx="1" fill="currentColor" fillOpacity="0.4" />
      ))}
      {[12, 20, 28, 36, 44, 52].map(x => (
        <rect key={`r2-${x}`} x={x} y="40" width="5" height="6" rx="1" fill="currentColor" fillOpacity="0.3" />
      ))}
      <circle cx="12" cy="52" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="20" cy="52" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="28" cy="52" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ── VPN Concentrator ───────────────────────────────────────── */
export function EveVpnConcentratorIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="10" y="14" width="52" height="44" rx="4" {...stroke} strokeWidth={2.5} />
      <path d="M36 22 L48 28 L48 38 C48 44 42 48 36 50 C30 48 24 44 24 38 L24 28 Z" {...stroke} strokeWidth={2} />
      <rect x="32" y="32" width="8" height="7" rx="1.5" fill="currentColor" fillOpacity="0.4" />
      <path d="M33 32 L33 29 C33 27 39 27 39 29 L39 32" {...stroke} strokeWidth={1.5} />
      <circle cx="18" cy="48" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="24" cy="48" r="1.5" fill="currentColor" stroke="none" />
      <text x="36" y="60" textAnchor="middle" fontSize="6" fill="currentColor" stroke="none" className="font-mono">VPN</text>
    </svg>
  );
}

/* ── IDS / IPS ──────────────────────────────────────────────── */
export function EveIdsIpsIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="8" y="14" width="56" height="44" rx="4" {...stroke} strokeWidth={2.5} />
      <circle cx="36" cy="32" r="8" {...stroke} strokeWidth={2} />
      <circle cx="36" cy="32" r="3" fill="currentColor" fillOpacity="0.4" />
      <line x1="36" y1="20" x2="36" y2="24" {...stroke} />
      <line x1="36" y1="40" x2="36" y2="44" {...stroke} />
      <line x1="24" y1="32" x2="28" y2="32" {...stroke} />
      <line x1="44" y1="32" x2="48" y2="32" {...stroke} />
      <text x="36" y="52" textAnchor="middle" fontSize="6" fill="currentColor" stroke="none" className="font-mono">IDS/IPS</text>
    </svg>
  );
}

/* ── Proxy Server ───────────────────────────────────────────── */
export function EveProxyIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="10" y="16" width="52" height="40" rx="4" {...stroke} strokeWidth={2.5} />
      <rect x="16" y="22" width="18" height="12" rx="2" {...stroke} strokeWidth={1.5} />
      <rect x="38" y="22" width="18" height="12" rx="2" {...stroke} strokeWidth={1.5} />
      <line x1="34" y1="28" x2="38" y2="28" {...stroke} strokeWidth={2} />
      <polygon points="36,26 40,28 36,30" fill="currentColor" stroke="none" />
      <line x1="16" y1="42" x2="56" y2="42" {...stroke} strokeWidth={1} />
      <line x1="16" y1="48" x2="56" y2="48" {...stroke} strokeWidth={1} />
      <circle cx="20" cy="45" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ── DNS Server ─────────────────────────────────────────────── */
export function EveDnsIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="10" y="12" width="52" height="48" rx="4" {...stroke} strokeWidth={2.5} />
      <text x="36" y="26" textAnchor="middle" fontSize="7" fill="currentColor" stroke="none" className="font-mono font-bold">DNS</text>
      <circle cx="22" cy="40" r="6" {...stroke} strokeWidth={1.5} />
      <line x1="22" y1="34" x2="22" y2="46" {...stroke} strokeWidth={1} />
      <line x1="16" y1="40" x2="28" y2="40" {...stroke} strokeWidth={1} />
      <rect x="36" y="34" width="18" height="12" rx="2" fill="currentColor" fillOpacity="0.15" {...stroke} strokeWidth={1} />
      <line x1="39" y1="38" x2="51" y2="38" {...stroke} strokeWidth={0.8} />
      <line x1="39" y1="42" x2="51" y2="42" {...stroke} strokeWidth={0.8} />
      <circle cx="16" cy="52" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ── DHCP Server ────────────────────────────────────────────── */
export function EveDhcpIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="10" y="12" width="52" height="48" rx="4" {...stroke} strokeWidth={2.5} />
      <text x="36" y="24" textAnchor="middle" fontSize="6" fill="currentColor" stroke="none" className="font-mono font-bold">DHCP</text>
      <rect x="16" y="30" width="40" height="16" rx="2" fill="currentColor" fillOpacity="0.1" {...stroke} strokeWidth={1.5} />
      <text x="36" y="40" textAnchor="middle" fontSize="5" fill="currentColor" stroke="none" className="font-mono">10.0.0.0/24</text>
      <circle cx="22" cy="52" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="30" cy="52" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ── NAS / Storage ──────────────────────────────────────────── */
export function EveNasIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="12" y="10" width="48" height="52" rx="4" {...stroke} strokeWidth={2.5} />
      <rect x="16" y="14" width="40" height="10" rx="2" fill="currentColor" fillOpacity="0.12" {...stroke} strokeWidth={1} />
      <rect x="16" y="26" width="40" height="10" rx="2" fill="currentColor" fillOpacity="0.12" {...stroke} strokeWidth={1} />
      <rect x="16" y="38" width="40" height="10" rx="2" fill="currentColor" fillOpacity="0.12" {...stroke} strokeWidth={1} />
      <circle cx="50" cy="19" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="50" cy="31" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="50" cy="43" r="1.2" fill="currentColor" stroke="none" />
      <rect x="16" y="50" width="40" height="8" rx="2" fill="currentColor" fillOpacity="0.08" {...stroke} strokeWidth={1} />
    </svg>
  );
}

/* ── VoIP Phone ─────────────────────────────────────────────── */
export function EveVoipPhoneIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="14" y="18" width="44" height="36" rx="4" {...stroke} strokeWidth={2.5} />
      <rect x="18" y="22" width="36" height="10" rx="2" fill="currentColor" fillOpacity="0.15" {...stroke} strokeWidth={1} />
      <rect x="18" y="34" width="8" height="6" rx="1" fill="currentColor" fillOpacity="0.2" />
      <rect x="28" y="34" width="8" height="6" rx="1" fill="currentColor" fillOpacity="0.2" />
      <rect x="38" y="34" width="8" height="6" rx="1" fill="currentColor" fillOpacity="0.2" />
      <rect x="48" y="34" width="6" height="6" rx="1" fill="currentColor" fillOpacity="0.2" />
      <rect x="18" y="42" width="8" height="6" rx="1" fill="currentColor" fillOpacity="0.15" />
      <rect x="28" y="42" width="8" height="6" rx="1" fill="currentColor" fillOpacity="0.15" />
      <rect x="38" y="42" width="8" height="6" rx="1" fill="currentColor" fillOpacity="0.15" />
      <rect x="48" y="42" width="6" height="6" rx="1" fill="currentColor" fillOpacity="0.15" />
      <rect x="30" y="54" width="12" height="3" rx="1" fill="currentColor" fillOpacity="0.3" />
    </svg>
  );
}

/* ── Mobile Device ──────────────────────────────────────────── */
export function EveMobileIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="24" y="8" width="24" height="56" rx="4" {...stroke} strokeWidth={2.5} />
      <rect x="27" y="14" width="18" height="38" rx="2" fill="currentColor" fillOpacity="0.1" {...stroke} strokeWidth={1} />
      <circle cx="36" cy="57" r="2.5" {...stroke} strokeWidth={1.5} />
      <line x1="32" y1="11" x2="40" y2="11" {...stroke} strokeWidth={1.5} />
    </svg>
  );
}

/* ── Tablet ─────────────────────────────────────────────────── */
export function EveTabletIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="16" y="8" width="40" height="56" rx="4" {...stroke} strokeWidth={2.5} />
      <rect x="20" y="14" width="32" height="40" rx="2" fill="currentColor" fillOpacity="0.1" {...stroke} strokeWidth={1} />
      <circle cx="36" cy="59" r="2.5" {...stroke} strokeWidth={1.5} />
    </svg>
  );
}

/* ── Hub ────────────────────────────────────────────────────── */
export function EveHubIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="8" y="28" width="56" height="20" rx="3" {...stroke} strokeWidth={2.5} />
      <circle cx="36" cy="38" r="5" {...stroke} strokeWidth={2} />
      <circle cx="36" cy="38" r="2" fill="currentColor" stroke="none" />
      {[16, 24, 48, 56].map(x => (
        <rect key={x} x={x - 2} y="32" width="4" height="3" rx="0.5" fill="currentColor" fillOpacity="0.3" />
      ))}
      {[16, 24, 48, 56].map(x => (
        <rect key={`b-${x}`} x={x - 2} y="41" width="4" height="3" rx="0.5" fill="currentColor" fillOpacity="0.3" />
      ))}
    </svg>
  );
}

/* ── Modem ──────────────────────────────────────────────────── */
export function EveModemIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="10" y="30" width="52" height="28" rx="3" {...stroke} strokeWidth={2.5} />
      <line x1="20" y1="20" x2="20" y2="30" {...stroke} />
      <line x1="52" y1="20" x2="52" y2="30" {...stroke} />
      <path d="M14 18 C14 12 58 12 58 18" {...stroke} strokeWidth={1.5} />
      <circle cx="20" cy="42" r="2" fill="currentColor" stroke="none" />
      <circle cx="30" cy="42" r="2" fill="currentColor" stroke="none" />
      <circle cx="40" cy="42" r="2" fill="currentColor" stroke="none" />
      <rect x="16" y="48" width="40" height="4" rx="1" fill="currentColor" fillOpacity="0.1" />
    </svg>
  );
}

/* ── Bridge ─────────────────────────────────────────────────── */
export function EveBridgeIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="6" y="30" width="60" height="16" rx="3" {...stroke} strokeWidth={2.5} />
      <path d="M6 38 C18 28 30 28 36 38 C42 28 54 28 66 38" {...stroke} strokeWidth={1.5} />
      <line x1="18" y1="38" x2="18" y2="46" {...stroke} />
      <line x1="36" y1="38" x2="36" y2="46" {...stroke} />
      <line x1="54" y1="38" x2="54" y2="46" {...stroke} />
      <circle cx="18" cy="38" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="36" cy="38" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="54" cy="38" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ── Repeater ───────────────────────────────────────────────── */
export function EveRepeaterIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="26" y="28" width="20" height="30" rx="3" {...stroke} strokeWidth={2.5} />
      <circle cx="36" cy="20" r="4" {...stroke} strokeWidth={2} />
      <line x1="36" y1="24" x2="36" y2="28" {...stroke} />
      <path d="M30 20 C30 14 42 14 42 20" {...stroke} strokeWidth={1.5} />
      <path d="M26 20 C26 10 46 10 46 20" {...stroke} strokeWidth={1.5} />
      <circle cx="32" cy="40" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="40" cy="40" r="1.5" fill="currentColor" stroke="none" />
      <rect x="30" y="48" width="12" height="4" rx="1" fill="currentColor" fillOpacity="0.2" />
    </svg>
  );
}

/* ── Laptop ─────────────────────────────────────────────────── */
export function EveLaptopIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="14" y="12" width="44" height="32" rx="3" {...stroke} strokeWidth={2.5} />
      <rect x="18" y="16" width="36" height="24" rx="1" fill="currentColor" fillOpacity="0.1" {...stroke} strokeWidth={1} />
      <path d="M8 48 L64 48 L60 56 L12 56 Z" {...stroke} strokeWidth={2.5} />
      <line x1="30" y1="52" x2="42" y2="52" {...stroke} strokeWidth={1.5} />
    </svg>
  );
}

/* ── Printer ────────────────────────────────────────────────── */
export function EvePrinterIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="16" y="28" width="40" height="24" rx="3" {...stroke} strokeWidth={2.5} />
      <rect x="20" y="16" width="32" height="12" rx="2" {...stroke} strokeWidth={2} />
      <rect x="22" y="50" width="28" height="10" rx="1" fill="currentColor" fillOpacity="0.1" {...stroke} strokeWidth={1.5} />
      <line x1="26" y1="54" x2="46" y2="54" {...stroke} strokeWidth={0.8} />
      <line x1="26" y1="57" x2="46" y2="57" {...stroke} strokeWidth={0.8} />
      <circle cx="48" cy="36" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="42" cy="36" r="1.5" fill="currentColor" stroke="none" />
      <rect x="22" y="42" width="20" height="3" rx="1" fill="currentColor" fillOpacity="0.15" />
    </svg>
  );
}

/* ── ICS / SCADA ────────────────────────────────────────────── */
export function EveScadaIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="8" y="14" width="56" height="44" rx="4" {...stroke} strokeWidth={2.5} />
      <circle cx="24" cy="30" r="6" {...stroke} strokeWidth={2} />
      <line x1="24" y1="24" x2="24" y2="36" {...stroke} />
      <line x1="18" y1="30" x2="30" y2="30" {...stroke} />
      <rect x="38" y="24" width="18" height="12" rx="2" fill="currentColor" fillOpacity="0.12" {...stroke} strokeWidth={1.5} />
      <line x1="42" y1="28" x2="52" y2="28" {...stroke} strokeWidth={0.8} />
      <line x1="42" y1="32" x2="52" y2="32" {...stroke} strokeWidth={0.8} />
      <rect x="16" y="42" width="40" height="10" rx="2" fill="currentColor" fillOpacity="0.08" {...stroke} strokeWidth={1} />
      <circle cx="22" cy="47" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="30" cy="47" r="1.5" fill="currentColor" stroke="none" />
      <text x="44" y="50" fontSize="5" fill="currentColor" stroke="none" className="font-mono">SCADA</text>
    </svg>
  );
}

/* ── Database ───────────────────────────────────────────────── */
export function EveDatabaseIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <ellipse cx="36" cy="16" rx="22" ry="8" {...stroke} strokeWidth={2.5} />
      <path d="M14 16 L14 36 C14 40 26 44 36 44 C46 44 58 40 58 36 L58 16" {...stroke} strokeWidth={2.5} />
      <path d="M14 36 L14 56 C14 60 26 64 36 64 C46 64 58 60 58 56 L58 36" {...stroke} strokeWidth={2.5} />
      <ellipse cx="36" cy="36" rx="22" ry="8" {...stroke} strokeWidth={1} strokeOpacity="0.4" />
      <ellipse cx="36" cy="56" rx="22" ry="8" {...stroke} strokeWidth={1} strokeOpacity="0.4" />
    </svg>
  );
}

/* ── Wireless Bridge ────────────────────────────────────────── */
export function EveWirelessBridgeIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="8" y="30" width="20" height="16" rx="3" {...stroke} strokeWidth={2.5} />
      <rect x="44" y="30" width="20" height="16" rx="3" {...stroke} strokeWidth={2.5} />
      <path d="M28 38 C32 28 40 28 44 38" {...stroke} strokeWidth={2} strokeDasharray="3 2" />
      <circle cx="20" cy="38" r="2" fill="currentColor" stroke="none" />
      <circle cx="52" cy="38" r="2" fill="currentColor" stroke="none" />
      <path d="M14 26 C14 20 58 20 58 26" {...stroke} strokeWidth={1.5} />
    </svg>
  );
}

/* ── WAN Optimizer ──────────────────────────────────────────── */
export function EveWanOptimizerIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="10" y="20" width="52" height="32" rx="4" {...stroke} strokeWidth={2.5} />
      <path d="M16 36 L24 36 L28 28 L34 44 L38 32 L42 36 L56 36" {...stroke} strokeWidth={2} />
      <circle cx="20" cy="44" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="28" cy="44" r="1.5" fill="currentColor" stroke="none" />
      <text x="36" y="50" textAnchor="middle" fontSize="5" fill="currentColor" stroke="none" className="font-mono">WAN OPT</text>
    </svg>
  );
}

/* ── Router with Firewall ───────────────────────────────────── */
export function EveRouterFirewallIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="8" y="14" width="56" height="44" rx="4" {...stroke} strokeWidth={2.5} />
      <circle cx="24" cy="30" r="6" {...stroke} strokeWidth={2} />
      <line x1="24" y1="24" x2="24" y2="36" {...stroke} />
      <line x1="18" y1="30" x2="30" y2="30" {...stroke} />
      <rect x="38" y="24" width="18" height="14" rx="2" fill="currentColor" fillOpacity="0.1" {...stroke} strokeWidth={1.5} />
      <line x1="42" y1="28" x2="52" y2="28" {...stroke} strokeWidth={0.8} />
      <line x1="42" y1="32" x2="52" y2="32" {...stroke} strokeWidth={0.8} />
      <rect x="16" y="44" width="40" height="8" rx="1" fill="currentColor" fillOpacity="0.08" {...stroke} strokeWidth={1} />
      <circle cx="22" cy="48" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

/* ── Wireless Mesh Node ─────────────────────────────────────── */
export function EveMeshNodeIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <circle cx="36" cy="36" r="6" fill="currentColor" fillOpacity="0.3" {...stroke} strokeWidth={2} />
      <circle cx="14" cy="14" r="4" {...stroke} strokeWidth={2} />
      <circle cx="58" cy="14" r="4" {...stroke} strokeWidth={2} />
      <circle cx="14" cy="58" r="4" {...stroke} strokeWidth={2} />
      <circle cx="58" cy="58" r="4" {...stroke} strokeWidth={2} />
      <line x1="18" y1="18" x2="30" y2="30" {...stroke} strokeWidth={1.5} strokeDasharray="2 2" />
      <line x1="54" y1="18" x2="42" y2="30" {...stroke} strokeWidth={1.5} strokeDasharray="2 2" />
      <line x1="18" y1="54" x2="30" y2="42" {...stroke} strokeWidth={1.5} strokeDasharray="2 2" />
      <line x1="54" y1="54" x2="42" y2="42" {...stroke} strokeWidth={1.5} strokeDasharray="2 2" />
    </svg>
  );
}

/* ── SDN Controller ─────────────────────────────────────────── */
export function EveSdnControllerIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="10" y="14" width="52" height="44" rx="4" {...stroke} strokeWidth={2.5} />
      <text x="36" y="24" textAnchor="middle" fontSize="6" fill="currentColor" stroke="none" className="font-mono font-bold">SDN</text>
      <circle cx="20" cy="36" r="4" {...stroke} strokeWidth={1.5} />
      <circle cx="36" cy="36" r="4" {...stroke} strokeWidth={1.5} />
      <circle cx="52" cy="36" r="4" {...stroke} strokeWidth={1.5} />
      <line x1="24" y1="36" x2="32" y2="36" {...stroke} strokeWidth={1} />
      <line x1="40" y1="36" x2="48" y2="36" {...stroke} strokeWidth={1} />
      <line x1="20" y1="40" x2="20" y2="48" {...stroke} strokeWidth={1} />
      <line x1="36" y1="40" x2="36" y2="48" {...stroke} strokeWidth={1} />
      <line x1="52" y1="40" x2="52" y2="48" {...stroke} strokeWidth={1} />
      <rect x="14" y="48" width="44" height="6" rx="1" fill="currentColor" fillOpacity="0.08" {...stroke} strokeWidth={1} />
    </svg>
  );
}

/* ── IPSec Gateway ──────────────────────────────────────────── */
export function EveIpsecGatewayIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="10" y="16" width="52" height="40" rx="4" {...stroke} strokeWidth={2.5} />
      <path d="M36 24 L46 28 L46 36 C46 42 42 46 36 48 C30 46 26 42 26 36 L26 28 Z" {...stroke} strokeWidth={2} />
      <rect x="32" y="34" width="8" height="6" rx="1" fill="currentColor" fillOpacity="0.4" />
      <path d="M33 34 L33 31 C33 29 39 29 39 31 L39 34" {...stroke} strokeWidth={1.5} />
      <text x="36" y="52" textAnchor="middle" fontSize="5" fill="currentColor" stroke="none" className="font-mono">IPSec</text>
    </svg>
  );
}

/* ── Bastion Host ───────────────────────────────────────────── */
export function EveBastionHostIcon({ className }) {
  return (
    <svg viewBox="0 0 72 72" className={className} fill="none">
      <rect x="10" y="12" width="52" height="48" rx="4" {...stroke} strokeWidth={2.5} />
      <rect x="16" y="18" width="40" height="24" rx="2" fill="currentColor" fillOpacity="0.1" {...stroke} strokeWidth={1} />
      <text x="36" y="32" textAnchor="middle" fontSize="6" fill="currentColor" stroke="none" className="font-mono font-bold">BASTION</text>
      <rect x="16" y="46" width="40" height="8" rx="2" fill="currentColor" fillOpacity="0.08" {...stroke} strokeWidth={1} />
      <circle cx="22" cy="50" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="28" cy="50" r="1.5" fill="currentColor" stroke="none" />
    </svg>
  );
}

export const EVE_NG_ICONS = {
  eve_router: EveRouterIcon,
  eve_switch: EveSwitchIcon,
  eve_firewall: EveFirewallIcon,
  eve_server: EveServerIcon,
  eve_workstation: EveWorkstationIcon,
  eve_cloud: EveCloudIcon,
  eve_container: EveContainerIcon,
  eve_load_balancer: EveLoadBalancerIcon,
  eve_security_appliance: EveSecurityApplianceIcon,
  eve_monitoring: EveMonitoringIcon,
  eve_access_point: EveAccessPointIcon,
  eve_wireless_controller: EveWirelessControllerIcon,
  eve_l3_switch: EveL3SwitchIcon,
  eve_core_switch: EveCoreSwitchIcon,
  eve_vpn_concentrator: EveVpnConcentratorIcon,
  eve_ids_ips: EveIdsIpsIcon,
  eve_proxy: EveProxyIcon,
  eve_dns: EveDnsIcon,
  eve_dhcp: EveDhcpIcon,
  eve_nas: EveNasIcon,
  eve_voip_phone: EveVoipPhoneIcon,
  eve_mobile: EveMobileIcon,
  eve_tablet: EveTabletIcon,
  eve_hub: EveHubIcon,
  eve_modem: EveModemIcon,
  eve_bridge: EveBridgeIcon,
  eve_repeater: EveRepeaterIcon,
  eve_laptop: EveLaptopIcon,
  eve_printer: EvePrinterIcon,
  eve_scada: EveScadaIcon,
  eve_database: EveDatabaseIcon,
  eve_wireless_bridge: EveWirelessBridgeIcon,
  eve_wan_optimizer: EveWanOptimizerIcon,
  eve_router_firewall: EveRouterFirewallIcon,
  eve_mesh_node: EveMeshNodeIcon,
  eve_sdn_controller: EveSdnControllerIcon,
  eve_ipsec_gateway: EveIpsecGatewayIcon,
  eve_bastion_host: EveBastionHostIcon,
};

export const EVE_NG_ICON_LIST = [
  { id: "eve_router", label: "Router", icon: EveRouterIcon, category: "EVE-NG Classic" },
  { id: "eve_switch", label: "Switch", icon: EveSwitchIcon, category: "EVE-NG Classic" },
  { id: "eve_firewall", label: "Firewall", icon: EveFirewallIcon, category: "EVE-NG Classic" },
  { id: "eve_server", label: "Server", icon: EveServerIcon, category: "EVE-NG Classic" },
  { id: "eve_workstation", label: "Desktop", icon: EveWorkstationIcon, category: "EVE-NG Classic" },
  { id: "eve_cloud", label: "Cloud", icon: EveCloudIcon, category: "EVE-NG Classic" },
  { id: "eve_container", label: "Container", icon: EveContainerIcon, category: "EVE-NG Classic" },
  { id: "eve_load_balancer", label: "Load Balancer", icon: EveLoadBalancerIcon, category: "EVE-NG Classic" },
  { id: "eve_security_appliance", label: "Security", icon: EveSecurityApplianceIcon, category: "EVE-NG Classic" },
  { id: "eve_monitoring", label: "Monitor", icon: EveMonitoringIcon, category: "EVE-NG Classic" },
  { id: "eve_access_point", label: "Access Point", icon: EveAccessPointIcon, category: "EVE-NG Classic" },
  { id: "eve_wireless_controller", label: "WLAN Controller", icon: EveWirelessControllerIcon, category: "EVE-NG Classic" },
  { id: "eve_l3_switch", label: "L3 Switch", icon: EveL3SwitchIcon, category: "EVE-NG Classic" },
  { id: "eve_core_switch", label: "Core Switch", icon: EveCoreSwitchIcon, category: "EVE-NG Classic" },
  { id: "eve_vpn_concentrator", label: "VPN Concentrator", icon: EveVpnConcentratorIcon, category: "EVE-NG Classic" },
  { id: "eve_ids_ips", label: "IDS/IPS", icon: EveIdsIpsIcon, category: "EVE-NG Classic" },
  { id: "eve_proxy", label: "Proxy", icon: EveProxyIcon, category: "EVE-NG Classic" },
  { id: "eve_dns", label: "DNS Server", icon: EveDnsIcon, category: "EVE-NG Classic" },
  { id: "eve_dhcp", label: "DHCP Server", icon: EveDhcpIcon, category: "EVE-NG Classic" },
  { id: "eve_nas", label: "NAS Storage", icon: EveNasIcon, category: "EVE-NG Classic" },
  { id: "eve_voip_phone", label: "VoIP Phone", icon: EveVoipPhoneIcon, category: "EVE-NG Classic" },
  { id: "eve_mobile", label: "Mobile", icon: EveMobileIcon, category: "EVE-NG Classic" },
  { id: "eve_tablet", label: "Tablet", icon: EveTabletIcon, category: "EVE-NG Classic" },
  { id: "eve_hub", label: "Hub", icon: EveHubIcon, category: "EVE-NG Classic" },
  { id: "eve_modem", label: "Modem", icon: EveModemIcon, category: "EVE-NG Classic" },
  { id: "eve_bridge", label: "Bridge", icon: EveBridgeIcon, category: "EVE-NG Classic" },
  { id: "eve_repeater", label: "Repeater", icon: EveRepeaterIcon, category: "EVE-NG Classic" },
  { id: "eve_laptop", label: "Laptop", icon: EveLaptopIcon, category: "EVE-NG Classic" },
  { id: "eve_printer", label: "Printer", icon: EvePrinterIcon, category: "EVE-NG Classic" },
  { id: "eve_scada", label: "SCADA/ICS", icon: EveScadaIcon, category: "EVE-NG Classic" },
  { id: "eve_database", label: "Database", icon: EveDatabaseIcon, category: "EVE-NG Classic" },
  { id: "eve_wireless_bridge", label: "Wireless Bridge", icon: EveWirelessBridgeIcon, category: "EVE-NG Classic" },
  { id: "eve_wan_optimizer", label: "WAN Optimizer", icon: EveWanOptimizerIcon, category: "EVE-NG Classic" },
  { id: "eve_router_firewall", label: "Router+FW", icon: EveRouterFirewallIcon, category: "EVE-NG Classic" },
  { id: "eve_mesh_node", label: "Mesh Node", icon: EveMeshNodeIcon, category: "EVE-NG Classic" },
  { id: "eve_sdn_controller", label: "SDN Controller", icon: EveSdnControllerIcon, category: "EVE-NG Classic" },
  { id: "eve_ipsec_gateway", label: "IPSec Gateway", icon: EveIpsecGatewayIcon, category: "EVE-NG Classic" },
  { id: "eve_bastion_host", label: "Bastion Host", icon: EveBastionHostIcon, category: "EVE-NG Classic" },
];