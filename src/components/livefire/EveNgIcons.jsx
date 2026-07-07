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
];