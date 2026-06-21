import React from "react";

// Realistic device icons as inline SVG components
// Each renders at a standard size and accepts a className for color/opacity

const baseClasses = "w-full h-full";

export function RouterIcon({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={`${baseClasses} ${className || ""}`} fill="none">
      {/* Chassis body */}
      <rect x="4" y="8" width="56" height="48" rx="4" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2.5"/>
      {/* Top bezel */}
      <rect x="4" y="8" width="56" height="10" rx="4" fill="currentColor" fillOpacity="0.25"/>
      {/* Rack ears */}
      <rect x="0" y="14" width="6" height="6" rx="1" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="1"/>
      <rect x="58" y="14" width="6" height="6" rx="1" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="1"/>
      <rect x="0" y="40" width="6" height="6" rx="1" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="1"/>
      <rect x="58" y="40" width="6" height="6" rx="1" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="1"/>
      {/* Ports row */}
      <rect x="10" y="24" width="6" height="8" rx="1" fill="currentColor" fillOpacity="0.6"/>
      <rect x="19" y="24" width="6" height="8" rx="1" fill="currentColor" fillOpacity="0.45"/>
      <rect x="28" y="24" width="6" height="8" rx="1" fill="currentColor" fillOpacity="0.45"/>
      <rect x="37" y="24" width="6" height="8" rx="1" fill="currentColor" fillOpacity="0.6"/>
      <rect x="46" y="24" width="6" height="8" rx="1" fill="currentColor" fillOpacity="0.45"/>
      {/* LED indicators */}
      <circle cx="12" cy="36" r="1.5" fill="#22c55e"/>
      <circle cx="18" cy="36" r="1.5" fill="#22c55e"/>
      <circle cx="24" cy="36" r="1.5" fill="#eab308"/>
      <circle cx="30" cy="36" r="1.5" fill="#22c55e"/>
      <circle cx="46" cy="36" r="1.5" fill="#3b82f6"/>
      {/* Antenna nubs */}
      <rect x="14" y="4" width="4" height="5" rx="1" fill="currentColor" fillOpacity="0.3"/>
      <rect x="46" y="4" width="4" height="5" rx="1" fill="currentColor" fillOpacity="0.3"/>
    </svg>
  );
}

export function SwitchIcon({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={`${baseClasses} ${className || ""}`} fill="none">
      {/* Chassis body */}
      <rect x="4" y="10" width="56" height="44" rx="4" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2.5"/>
      {/* Top bezel */}
      <rect x="4" y="10" width="56" height="8" rx="4" fill="currentColor" fillOpacity="0.25"/>
      {/* Rack ears */}
      <rect x="0" y="16" width="6" height="6" rx="1" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="1"/>
      <rect x="58" y="16" width="6" height="6" rx="1" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="1"/>
      <rect x="0" y="40" width="6" height="6" rx="1" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="1"/>
      <rect x="58" y="40" width="6" height="6" rx="1" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="1"/>
      {/* Port grid - 2 rows of 8 */}
      {[0,1,2,3,4,5,6,7].map(i => (
        <React.Fragment key={i}>
          <rect x={10 + i*6} y="24" width="4" height="6" rx="0.8" fill="currentColor" fillOpacity={i===0||i===3 ?0.55:0.35}/>
          <rect x={10 + i*6} y="35" width="4" height="6" rx="0.8" fill="currentColor" fillOpacity={i===5||i===7 ?0.55:0.35}/>
        </React.Fragment>
      ))}
      {/* LED row */}
      {[0,2,4,6].map(i => (
        <circle key={i} cx={12 + i*6} cy="48" r="1.2" fill="#22c55e"/>
      ))}
    </svg>
  );
}

export function FirewallIcon({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={`${baseClasses} ${className || ""}`} fill="none">
      {/* Shield body */}
      <path d="M32 4 L58 14 L58 34 C58 48 40 58 32 62 C24 58 6 48 6 34 L6 14 Z" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="2.5"/>
      {/* Inner shield accent */}
      <path d="M32 10 L50 18 L50 34 C50 44 36 52 32 54 C28 52 14 44 14 34 L14 18 Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.5"/>
      {/* Lock icon */}
      <rect x="26" y="24" width="12" height="10" rx="2" fill="currentColor" fillOpacity="0.6"/>
      <path d="M29 24 L29 20 C29 16 35 16 35 20 L35 24" stroke="currentColor" strokeWidth="2" strokeOpacity="0.6" fill="none"/>
      <circle cx="32" cy="29" r="1.5" fill="#fff" fillOpacity="0.9"/>
      {/* Gear/tech accents */}
      <rect x="22" y="40" width="4" height="4" rx="0.5" fill="currentColor" fillOpacity="0.3"/>
      <rect x="30" y="40" width="4" height="4" rx="0.5" fill="currentColor" fillOpacity="0.3"/>
      <rect x="38" y="40" width="4" height="4" rx="0.5" fill="currentColor" fillOpacity="0.3"/>
    </svg>
  );
}

export function ServerIcon({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={`${baseClasses} ${className || ""}`} fill="none">
      {/* Server chassis */}
      <rect x="8" y="4" width="48" height="56" rx="5" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="2.5"/>
      {/* Front panel */}
      <rect x="14" y="10" width="36" height="44" rx="3" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4"/>
      {/* Drive bays */}
      <rect x="20" y="14" width="24" height="6" rx="1.5" fill="currentColor" fillOpacity="0.3"/>
      <rect x="20" y="24" width="24" height="6" rx="1.5" fill="currentColor" fillOpacity="0.22"/>
      <rect x="20" y="34" width="24" height="6" rx="1.5" fill="currentColor" fillOpacity="0.22"/>
      {/* Drive activity LEDs */}
      <circle cx="20" cy="17" r="1.5" fill="#22c55e"/>
      <circle cx="20" cy="27" r="1.5" fill="#22c55e"/>
      <circle cx="20" cy="37" r="1.5" fill="#eab308"/>
      {/* Rack ears */}
      <rect x="4" y="12" width="6" height="6" rx="1" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="1"/>
      <rect x="54" y="12" width="6" height="6" rx="1" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="1"/>
      <rect x="4" y="40" width="6" height="6" rx="1" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="1"/>
      <rect x="54" y="40" width="6" height="6" rx="1" fill="currentColor" fillOpacity="0.4" stroke="currentColor" strokeWidth="1"/>
      {/* Status LEDs top */}
      <circle cx="28" cy="47" r="1.8" fill="#22c55e"/>
      <circle cx="36" cy="47" r="1.8" fill="#3b82f6"/>
      {/* Power button */}
      <circle cx="32" cy="55" r="3" fill="currentColor" fillOpacity="0.3" stroke="currentColor" strokeWidth="1"/>
      <line x1="32" y1="53" x2="32" y2="57" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  );
}

export function WorkstationIcon({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={`${baseClasses} ${className || ""}`} fill="none">
      {/* Monitor */}
      <rect x="10" y="6" width="44" height="30" rx="4" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="2.5"/>
      {/* Screen */}
      <rect x="15" y="10" width="34" height="22" rx="2" fill="currentColor" fillOpacity="0.18"/>
      {/* Screen glow highlight */}
      <rect x="20" y="14" width="10" height="4" rx="1" fill="#fff" fillOpacity="0.06"/>
      {/* Stand */}
      <rect x="26" y="36" width="12" height="4" rx="2" fill="currentColor" fillOpacity="0.35"/>
      {/* Base */}
      <rect x="20" y="40" width="24" height="5" rx="2.5" fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.5"/>
      {/* Keyboard hint */}
      <rect x="16" y="50" width="22" height="8" rx="2" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4"/>
      {/* Keys hint */}
      <rect x="20" y="52" width="3" height="2" rx="0.5" fill="currentColor" fillOpacity="0.2"/>
      <rect x="25" y="52" width="3" height="2" rx="0.5" fill="currentColor" fillOpacity="0.2"/>
      <rect x="30" y="52" width="3" height="2" rx="0.5" fill="currentColor" fillOpacity="0.2"/>
    </svg>
  );
}

export function CloudIcon({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={`${baseClasses} ${className || ""}`} fill="none">
      {/* Cloud shape */}
      <path d="M18 44 C10 44 4 38 4 32 C4 26 8 22 14 22 C14 16 18 10 24 8 C30 6 36 8 40 14 C44 10 50 10 54 14 C58 18 60 24 58 28 C62 30 62 36 58 40 C56 42 52 44 48 44 Z"
        fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="2.5"/>
      {/* Server inside cloud */}
      <rect x="20" y="28" width="18" height="14" rx="2" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="24" y="30" width="10" height="3" rx="1" fill="currentColor" fillOpacity="0.35"/>
      <rect x="24" y="35" width="10" height="3" rx="1" fill="currentColor" fillOpacity="0.22"/>
      {/* Activity lights */}
      <circle cx="22" cy="31.5" r="1" fill="#22c55e"/>
      <circle cx="22" cy="36.5" r="1" fill="#eab308"/>
      {/* Connection lines */}
      <line x1="24" y1="50" x2="24" y2="56" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.5" strokeDasharray="2 2"/>
      <line x1="32" y1="50" x2="32" y2="56" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.5" strokeDasharray="2 2"/>
    </svg>
  );
}

export function ContainerIcon({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={`${baseClasses} ${className || ""}`} fill="none">
      {/* Outer box */}
      <rect x="6" y="8" width="52" height="48" rx="4" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2.5"/>
      {/* Docker whale silhouette */}
      <path d="M22 38 L18 34 L22 30 L28 32 L34 28 L40 30 L44 28 L48 30 L44 38 L38 40 L28 40 Z"
        fill="currentColor" fillOpacity="0.25" stroke="currentColor" strokeWidth="1.2"/>
      {/* Container layers hint */}
      <line x1="14" y1="20" x2="50" y2="20" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3"/>
      <line x1="14" y1="24" x2="44" y2="24" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.2"/>
      <line x1="14" y1="28" x2="38" y2="28" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.15"/>
      {/* Docker brand accent cross */}
      <line x1="35" y1="44" x2="38" y2="48" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3"/>
      <line x1="38" y1="44" x2="35" y2="48" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.3"/>
    </svg>
  );
}

export function LoadBalancerIcon({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={`${baseClasses} ${className || ""}`} fill="none">
      {/* Center hub */}
      <circle cx="32" cy="32" r="10" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2.5"/>
      {/* Inner gear */}
      <circle cx="32" cy="32" r="5" fill="currentColor" fillOpacity="0.25"/>
      <circle cx="32" cy="32" r="2" fill="currentColor" fillOpacity="0.5"/>
      {/* Top server */}
      <rect x="24" y="4" width="16" height="12" rx="3" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2"/>
      <rect x="27" y="7" width="10" height="2" rx="0.5" fill="currentColor" fillOpacity="0.35"/>
      {/* Bottom server */}
      <rect x="24" y="48" width="16" height="12" rx="3" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="2"/>
      <rect x="27" y="51" width="10" height="2" rx="0.5" fill="currentColor" fillOpacity="0.35"/>
      {/* Split arrows */}
      <path d="M28 16 L28 22" stroke="currentColor" strokeWidth="2" strokeOpacity="0.5"/>
      <path d="M36 16 L36 22" stroke="currentColor" strokeWidth="2" strokeOpacity="0.5"/>
      <path d="M28 42 L28 48" stroke="currentColor" strokeWidth="2" strokeOpacity="0.5"/>
      <path d="M36 42 L36 48" stroke="currentColor" strokeWidth="2" strokeOpacity="0.5"/>
      {/* Arrow heads */}
      <polygon points="26,24 30,24 28,27" fill="currentColor" fillOpacity="0.5"/>
      <polygon points="34,24 38,24 36,27" fill="currentColor" fillOpacity="0.5"/>
    </svg>
  );
}

export function SecurityApplianceIcon({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={`${baseClasses} ${className || ""}`} fill="none">
      {/* Shield body */}
      <path d="M32 4 L56 14 L56 34 C56 48 40 58 32 62 C24 58 8 48 8 34 L8 14 Z"
        fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="2.5"/>
      {/* Horizontal bands */}
      <line x1="14" y1="24" x2="50" y2="24" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.25"/>
      <line x1="18" y1="32" x2="46" y2="32" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.25"/>
      {/* Radar arc */}
      <path d="M20 44 C24 52 40 52 44 44" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4" fill="none"/>
      <path d="M24 40 C28 46 36 46 40 40" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" fill="none"/>
      {/* Center dot */}
      <circle cx="32" cy="40" r="2" fill="currentColor" fillOpacity="0.5"/>
      {/* Top check */}
      <path d="M26 16 L30 20 L38 12" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export function MonitoringIcon({ className }) {
  return (
    <svg viewBox="0 0 64 64" className={`${baseClasses} ${className || ""}`} fill="none">
      {/* Screen */}
      <rect x="8" y="6" width="48" height="36" rx="4" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="2.5"/>
      {/* Screen glow */}
      <rect x="13" y="10" width="38" height="26" rx="2" fill="currentColor" fillOpacity="0.08"/>
      {/* Chart line */}
      <polyline points="16,32 22,26 28,28 34,18 40,22 46,14" stroke="currentColor" strokeWidth="2" strokeOpacity="0.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Pulse line */}
      <polyline points="16,26 20,26 22,20 24,30 26,24 28,26 30,26" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.35" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {/* Stand */}
      <rect x="26" y="42" width="12" height="3" rx="1.5" fill="currentColor" fillOpacity="0.3"/>
      <rect x="20" y="45" width="24" height="6" rx="3" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1.2"/>
      {/* Activity dots */}
      <circle cx="16" cy="14" r="1.5" fill="#22c55e"/>
      <circle cx="22" cy="14" r="1.5" fill="#22c55e"/>
      <circle cx="28" cy="14" r="1.5" fill="#eab308"/>
    </svg>
  );
}

// Map device types to their custom icon components
export const DEVICE_ICONS = {
  router: RouterIcon,
  switch: SwitchIcon,
  firewall: FirewallIcon,
  server: ServerIcon,
  workstation: WorkstationIcon,
  cloud_resource: CloudIcon,
  container: ContainerIcon,
  load_balancer: LoadBalancerIcon,
  security_appliance: SecurityApplianceIcon,
  monitoring: MonitoringIcon,
};

// Full icon catalog — every device can use any icon
const ALL_ICONS = [
  { id: "server", label: "Server Rack", icon: ServerIcon },
  { id: "workstation", label: "Desktop", icon: WorkstationIcon },
  { id: "router", label: "Router", icon: RouterIcon },
  { id: "switch", label: "Switch", icon: SwitchIcon },
  { id: "firewall", label: "Firewall", icon: FirewallIcon },
  { id: "cloud_resource", label: "Cloud", icon: CloudIcon },
  { id: "container", label: "Container", icon: ContainerIcon },
  { id: "load_balancer", label: "Load Balancer", icon: LoadBalancerIcon },
  { id: "security_appliance", label: "Security App", icon: SecurityApplianceIcon },
  { id: "monitoring", label: "Monitor", icon: MonitoringIcon },
];

// Get available icon choices — returns all icons so any device can pick any icon
export function getIconOptions(deviceType) {
  return ALL_ICONS;
}

// Get the icon component by ID (maps to one of the DEVICE_ICONS keys)
export function getDeviceIcon(iconId, fallbackType) {
  const icon = DEVICE_ICONS[iconId];
  if (icon) return icon;
  return DEVICE_ICONS[fallbackType] || ServerIcon;
}

export default function DeviceIconRenderer({ type, iconId, className }) {
  const IconComponent = getDeviceIcon(iconId, type);
  return <IconComponent className={className} />;
}