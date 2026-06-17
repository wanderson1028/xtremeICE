import React from "react";

// 3D-style SVG icons rendered inline
const Icons = {
  Project: () => (
    <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
      <rect x="4" y="8" width="32" height="24" rx="4" fill="#1e40af" />
      <rect x="4" y="8" width="32" height="24" rx="4" fill="url(#bldg)" />
      <rect x="8" y="12" width="6" height="6" rx="1" fill="#93c5fd" />
      <rect x="17" y="12" width="6" height="6" rx="1" fill="#93c5fd" />
      <rect x="26" y="12" width="6" height="6" rx="1" fill="#93c5fd" />
      <rect x="8" y="22" width="6" height="6" rx="1" fill="#93c5fd" />
      <rect x="17" y="22" width="6" height="6" rx="1" fill="#93c5fd" />
      <rect x="26" y="22" width="6" height="6" rx="1" fill="#93c5fd" />
      <defs><linearGradient id="bldg" x1="4" y1="8" x2="36" y2="32" gradientUnits="userSpaceOnUse"><stop stopColor="#2563eb"/><stop offset="1" stopColor="#1e3a8a"/></linearGradient></defs>
    </svg>
  ),
  Globe: () => (
    <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
      <circle cx="20" cy="20" r="16" fill="url(#globe)"/>
      <ellipse cx="20" cy="20" rx="7" ry="16" stroke="#7dd3fc" strokeWidth="1.5" fill="none"/>
      <line x1="4" y1="20" x2="36" y2="20" stroke="#7dd3fc" strokeWidth="1.5"/>
      <line x1="20" y1="4" x2="20" y2="36" stroke="#7dd3fc" strokeWidth="1.5"/>
      <defs><linearGradient id="globe" x1="4" y1="4" x2="36" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#0ea5e9"/><stop offset="1" stopColor="#0369a1"/></linearGradient></defs>
    </svg>
  ),
  Map: () => (
    <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
      <path d="M20 4C14 4 10 9 10 14c0 8 10 22 10 22s10-14 10-22c0-5-4-10-10-10z" fill="url(#map)"/>
      <circle cx="20" cy="14" r="4" fill="#bfdbfe"/>
      <defs><linearGradient id="map" x1="10" y1="4" x2="30" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#f43f5e"/><stop offset="1" stopColor="#be123c"/></linearGradient></defs>
    </svg>
  ),
  Branch: () => (
    <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
      <circle cx="20" cy="8" r="5" fill="#6366f1"/>
      <circle cx="8" cy="32" r="5" fill="#6366f1"/>
      <circle cx="32" cy="32" r="5" fill="#6366f1"/>
      <line x1="20" y1="13" x2="8" y2="27" stroke="#a5b4fc" strokeWidth="2"/>
      <line x1="20" y1="13" x2="32" y2="27" stroke="#a5b4fc" strokeWidth="2"/>
      <line x1="8" y1="32" x2="32" y2="32" stroke="#a5b4fc" strokeWidth="2" strokeDasharray="3 2"/>
    </svg>
  ),
  Route: () => (
    <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
      <rect x="4" y="16" width="32" height="8" rx="4" fill="url(#route)"/>
      <circle cx="10" cy="20" r="4" fill="#fbbf24"/>
      <circle cx="30" cy="20" r="4" fill="#fbbf24"/>
      <defs><linearGradient id="route" x1="4" y1="16" x2="36" y2="24" gradientUnits="userSpaceOnUse"><stop stopColor="#d97706"/><stop offset="1" stopColor="#92400e"/></linearGradient></defs>
    </svg>
  ),
  Wifi: () => (
    <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
      <path d="M6 18 C11 12 29 12 34 18" stroke="#34d399" strokeWidth="3" strokeLinecap="round"/>
      <path d="M11 23 C14 19 26 19 29 23" stroke="#34d399" strokeWidth="3" strokeLinecap="round"/>
      <path d="M15 28 C17 25 23 25 25 28" stroke="#34d399" strokeWidth="3" strokeLinecap="round"/>
      <circle cx="20" cy="32" r="2.5" fill="#34d399"/>
    </svg>
  ),
  Shield: () => (
    <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
      <path d="M20 4L6 10v10c0 8 6 14 14 16 8-2 14-8 14-16V10L20 4z" fill="url(#shield)"/>
      <path d="M14 20l4 4 8-8" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      <defs><linearGradient id="shield" x1="6" y1="4" x2="34" y2="36" gradientUnits="userSpaceOnUse"><stop stopColor="#f43f5e"/><stop offset="1" stopColor="#9f1239"/></linearGradient></defs>
    </svg>
  ),
  Server: () => (
    <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
      <rect x="6" y="6" width="28" height="8" rx="2" fill="url(#srv1)"/>
      <rect x="6" y="16" width="28" height="8" rx="2" fill="url(#srv2)"/>
      <rect x="6" y="26" width="28" height="8" rx="2" fill="url(#srv3)"/>
      <circle cx="29" cy="10" r="1.5" fill="#4ade80"/>
      <circle cx="29" cy="20" r="1.5" fill="#4ade80"/>
      <circle cx="29" cy="30" r="1.5" fill="#facc15"/>
      <defs>
        <linearGradient id="srv1" x1="6" y1="6" x2="34" y2="14" gradientUnits="userSpaceOnUse"><stop stopColor="#7c3aed"/><stop offset="1" stopColor="#4c1d95"/></linearGradient>
        <linearGradient id="srv2" x1="6" y1="16" x2="34" y2="24" gradientUnits="userSpaceOnUse"><stop stopColor="#6d28d9"/><stop offset="1" stopColor="#3b0764"/></linearGradient>
        <linearGradient id="srv3" x1="6" y1="26" x2="34" y2="34" gradientUnits="userSpaceOnUse"><stop stopColor="#5b21b6"/><stop offset="1" stopColor="#2e1065"/></linearGradient>
      </defs>
    </svg>
  ),
  Router: () => (
    <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
      <rect x="4" y="14" width="32" height="14" rx="3" fill="url(#rtr)"/>
      <line x1="10" y1="14" x2="10" y2="8" stroke="#7dd3fc" strokeWidth="2"/>
      <line x1="18" y1="14" x2="18" y2="6" stroke="#7dd3fc" strokeWidth="2"/>
      <line x1="26" y1="14" x2="26" y2="9" stroke="#7dd3fc" strokeWidth="2"/>
      <circle cx="12" cy="23" r="2" fill="#4ade80"/>
      <circle cx="20" cy="23" r="2" fill="#4ade80"/>
      <circle cx="28" cy="23" r="2" fill="#facc15"/>
      <defs><linearGradient id="rtr" x1="4" y1="14" x2="36" y2="28" gradientUnits="userSpaceOnUse"><stop stopColor="#0ea5e9"/><stop offset="1" stopColor="#075985"/></linearGradient></defs>
    </svg>
  ),
  Switch: () => (
    <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
      <rect x="4" y="15" width="32" height="10" rx="2" fill="url(#sw)"/>
      {[8,13,18,23,28].map((x,i) => (
        <rect key={i} x={x} y="18" width="3" height="4" rx="0.5" fill="#1e293b"/>
      ))}
      <circle cx="33" cy="17" r="1.5" fill="#4ade80"/>
      <defs><linearGradient id="sw" x1="4" y1="15" x2="36" y2="25" gradientUnits="userSpaceOnUse"><stop stopColor="#22d3ee"/><stop offset="1" stopColor="#164e63"/></linearGradient></defs>
    </svg>
  ),
  Scale: () => (
    <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
      <rect x="18" y="6" width="4" height="28" rx="2" fill="#f59e0b"/>
      <rect x="8" y="34" width="24" height="3" rx="1.5" fill="#d97706"/>
      <path d="M20 10 L8 22 L20 22Z" fill="url(#sc1)"/>
      <path d="M20 10 L32 22 L20 22Z" fill="url(#sc2)"/>
      <defs>
        <linearGradient id="sc1" gradientUnits="userSpaceOnUse" x1="8" y1="10" x2="20" y2="22"><stop stopColor="#fbbf24"/><stop offset="1" stopColor="#b45309"/></linearGradient>
        <linearGradient id="sc2" gradientUnits="userSpaceOnUse" x1="20" y1="10" x2="32" y2="22"><stop stopColor="#fbbf24"/><stop offset="1" stopColor="#b45309"/></linearGradient>
      </defs>
    </svg>
  ),
  Layers: () => (
    <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
      <path d="M6 28l14 6 14-6-14-6-14 6z" fill="url(#ly1)"/>
      <path d="M6 20l14 6 14-6-14-6-14 6z" fill="url(#ly2)"/>
      <path d="M6 12l14 6 14-6-14-6-14 6z" fill="url(#ly3)"/>
      <defs>
        <linearGradient id="ly1" x1="6" y1="22" x2="34" y2="34" gradientUnits="userSpaceOnUse"><stop stopColor="#818cf8"/><stop offset="1" stopColor="#3730a3"/></linearGradient>
        <linearGradient id="ly2" x1="6" y1="14" x2="34" y2="26" gradientUnits="userSpaceOnUse"><stop stopColor="#a5b4fc"/><stop offset="1" stopColor="#4338ca"/></linearGradient>
        <linearGradient id="ly3" x1="6" y1="6" x2="34" y2="18" gradientUnits="userSpaceOnUse"><stop stopColor="#c7d2fe"/><stop offset="1" stopColor="#6366f1"/></linearGradient>
      </defs>
    </svg>
  ),
  User: () => (
    <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
      <circle cx="20" cy="14" r="8" fill="url(#usr)"/>
      <path d="M6 36c0-7.7 6.3-14 14-14s14 6.3 14 14" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <defs><linearGradient id="usr" x1="12" y1="6" x2="28" y2="22" gradientUnits="userSpaceOnUse"><stop stopColor="#38bdf8"/><stop offset="1" stopColor="#0369a1"/></linearGradient></defs>
    </svg>
  ),
  Monitor: () => (
    <svg viewBox="0 0 40 40" className="h-8 w-8" fill="none">
      <rect x="4" y="6" width="32" height="22" rx="3" fill="url(#mon)"/>
      <rect x="8" y="10" width="24" height="14" rx="1" fill="#0f172a"/>
      <rect x="15" y="29" width="10" height="3" rx="1" fill="#475569"/>
      <rect x="12" y="32" width="16" height="2" rx="1" fill="#475569"/>
      <defs><linearGradient id="mon" x1="4" y1="6" x2="36" y2="28" gradientUnits="userSpaceOnUse"><stop stopColor="#334155"/><stop offset="1" stopColor="#0f172a"/></linearGradient></defs>
    </svg>
  ),
};

function InfoRow({ iconKey, label, value }) {
  if (!value && value !== false && value !== 0) return null;
  const Icon3D = Icons[iconKey];
  const display = typeof value === "boolean" ? (
    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${value ? "bg-green-500/15 text-green-400" : "bg-red-500/15 text-red-400"}`}>
      {value ? "✓ Enabled" : "✗ Disabled"}
    </span>
  ) : (
    <span className="text-white font-semibold text-sm text-right max-w-[55%] truncate">{String(value)}</span>
  );

  return (
    <div className="flex items-center justify-between py-2.5 border-b border-gray-700/50 last:border-0">
      <div className="flex items-center gap-3 text-gray-400 min-w-0">
        {Icon3D && <div className="shrink-0 h-7 w-7 flex items-center justify-center"><Icon3D /></div>}
        <span className="text-sm truncate">{label}</span>
      </div>
      {display}
    </div>
  );
}

function Section({ title, children, accent }) {
  return (
    <div className={`bg-gray-900/80 rounded-xl border border-gray-700 p-5 relative overflow-hidden`}>
      <div className={`absolute top-0 left-0 w-1.5 h-full rounded-l-xl ${accent}`} />
      <h3 className="text-sm font-bold text-white uppercase tracking-widest mb-4 pl-3">{title}</h3>
      <div className="pl-3">{children}</div>
    </div>
  );
}

export default function DesignSummary({ design }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <Section title="Project Basics" accent="bg-blue-500">
        <InfoRow iconKey="Project" label="Project Name" value={design.name} />
        <InfoRow iconKey="Globe" label="Company" value={design.company_name} />
        <InfoRow iconKey="Map" label="Number of Sites" value={design.num_sites} />
        <InfoRow iconKey="Map" label="Site Names" value={(design.site_names || []).join(", ")} />
      </Section>

      <Section title="Topology" accent="bg-indigo-500">
        <InfoRow iconKey="Branch" label="Topology Type" value={design.topology_type} />
        <InfoRow iconKey="Route" label="Routing Protocol" value={design.routing_protocol} />
        <InfoRow iconKey="Wifi" label="WAN Technology" value={design.wan_technology} />
        <InfoRow iconKey="Layers" label="VLANs per Site" value={design.num_vlans_per_site} />
        <InfoRow iconKey="Layers" label="VLAN Names" value={(design.vlan_names || []).join(", ")} />
      </Section>

      <Section title="Security" accent="bg-rose-500">
        <InfoRow iconKey="Shield" label="Firewall" value={design.firewall_enabled} />
        <InfoRow iconKey="Shield" label="Firewall Vendor" value={design.firewall_vendor} />
        <InfoRow iconKey="Shield" label="DMZ" value={design.dmz_required} />
        <InfoRow iconKey="Shield" label="Redundancy / HA" value={design.redundancy_enabled} />
      </Section>

      <Section title="Services & Devices" accent="bg-purple-500">
        <InfoRow iconKey="Scale" label="Load Balancer" value={design.load_balancer} />
        <InfoRow iconKey="Wifi" label="Wireless APs" value={design.wireless_enabled} />
        <InfoRow iconKey="Server" label="Server Farm" value={design.server_farm} />
        <InfoRow iconKey="Server" label="Number of Servers" value={design.num_servers} />
        <InfoRow iconKey="Router" label="Router Model" value={design.router_model} />
        <InfoRow iconKey="Switch" label="Switch Model" value={design.switch_model} />
        <InfoRow iconKey="Globe" label="IP Scheme" value={design.ip_scheme} />
      </Section>

      <Section title="Credentials & Config" accent="bg-cyan-500">
        <InfoRow iconKey="User" label="Device Username" value={design.device_username} />
        <InfoRow iconKey="Globe" label="Domain Name" value={design.domain_name} />
        <InfoRow iconKey="Globe" label="NTP Server" value={design.ntp_server} />
        <InfoRow iconKey="Globe" label="DNS Servers" value={(design.dns_servers || []).join(", ")} />
      </Section>

      <Section title="End-User Devices" accent="bg-emerald-500">
        <InfoRow iconKey="Monitor" label="Total User Devices" value={design.num_user_devices} />
        <InfoRow iconKey="Monitor" label="Device Types" value={(design.user_device_types || []).join(", ")} />
      </Section>
    </div>
  );
}