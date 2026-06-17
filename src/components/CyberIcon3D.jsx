import React from "react";

/**
 * 3D-rendered SVG icons for cybersecurity/networking use cases.
 * Each icon uses layered SVG paths with gradients + drop shadows to simulate a 3D isometric look.
 */

const icons = {
  // Network topology / router
  network: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="net-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#22d3ee" />
          <stop offset="100%" stopColor="#0891b2" />
        </linearGradient>
        <linearGradient id="net-side" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0891b2" />
          <stop offset="100%" stopColor="#164e63" />
        </linearGradient>
        <filter id="net-shadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#06b6d4" floodOpacity="0.4" />
        </filter>
      </defs>
      {/* Central hub node */}
      <g filter="url(#net-shadow)">
        <ellipse cx="24" cy="26" rx="7" ry="3.5" fill="#164e63" opacity="0.5" />
        <rect x="18" y="16" width="12" height="12" rx="3" fill="url(#net-top)" />
        <path d="M18 28 L18 16 L16 18 L16 30 Z" fill="url(#net-side)" />
        <path d="M18 28 L30 28 L32 30 L20 30 Z" fill="#0e7490" />
      </g>
      {/* Satellite nodes */}
      <circle cx="9" cy="13" r="4" fill="url(#net-top)" opacity="0.9" />
      <circle cx="39" cy="13" r="4" fill="url(#net-top)" opacity="0.9" />
      <circle cx="9" cy="38" r="4" fill="url(#net-top)" opacity="0.9" />
      <circle cx="39" cy="38" r="4" fill="url(#net-top)" opacity="0.9" />
      {/* Connection lines */}
      <line x1="13" y1="15" x2="20" y2="20" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="2,2" opacity="0.7" />
      <line x1="35" y1="15" x2="28" y2="20" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="2,2" opacity="0.7" />
      <line x1="13" y1="36" x2="20" y2="28" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="2,2" opacity="0.7" />
      <line x1="35" y1="36" x2="28" y2="28" stroke="#22d3ee" strokeWidth="1.5" strokeDasharray="2,2" opacity="0.7" />
      {/* LED blink dot */}
      <circle cx="27" cy="19" r="1.5" fill="#a5f3fc" />
    </svg>
  ),

  // Visual Design Editor — monitor/display
  monitor: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="mon-screen" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#1e40af" />
        </linearGradient>
        <linearGradient id="mon-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#60a5fa" />
          <stop offset="100%" stopColor="#3b82f6" />
        </linearGradient>
        <linearGradient id="mon-side" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#1e3a8a" />
        </linearGradient>
        <filter id="mon-shadow">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#3b82f6" floodOpacity="0.4" />
        </filter>
      </defs>
      <g filter="url(#mon-shadow)">
        {/* Monitor body - front face */}
        <rect x="7" y="10" width="28" height="20" rx="2" fill="url(#mon-top)" />
        {/* Screen */}
        <rect x="9" y="12" width="24" height="16" rx="1" fill="url(#mon-screen)" />
        {/* Side face */}
        <path d="M35 10 L41 14 L41 34 L35 30 Z" fill="url(#mon-side)" />
        {/* Top face */}
        <path d="M7 10 L13 6 L41 6 L35 10 Z" fill="#93c5fd" />
        {/* Screen glare */}
        <path d="M10 13 L20 13 L17 20 L10 20 Z" fill="white" opacity="0.06" />
        {/* Code lines on screen */}
        <rect x="11" y="15" width="10" height="1.5" rx="0.5" fill="#60a5fa" opacity="0.8" />
        <rect x="11" y="18" width="14" height="1.5" rx="0.5" fill="#34d399" opacity="0.8" />
        <rect x="11" y="21" width="8" height="1.5" rx="0.5" fill="#f472b6" opacity="0.8" />
        <rect x="11" y="24" width="12" height="1.5" rx="0.5" fill="#60a5fa" opacity="0.8" />
        {/* Stand */}
        <rect x="18" y="30" width="6" height="5" rx="1" fill="#2563eb" />
        <rect x="15" y="35" width="12" height="2" rx="1" fill="#1d4ed8" />
      </g>
    </svg>
  ),

  // Cyber Range — crossed swords / targeting reticle
  cyberRange: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cr-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f87171" />
          <stop offset="100%" stopColor="#dc2626" />
        </linearGradient>
        <linearGradient id="cr-side" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b91c1c" />
          <stop offset="100%" stopColor="#7f1d1d" />
        </linearGradient>
        <filter id="cr-shadow">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#ef4444" floodOpacity="0.45" />
        </filter>
      </defs>
      <g filter="url(#cr-shadow)">
        {/* Target reticle circle */}
        <circle cx="24" cy="24" r="15" stroke="url(#cr-top)" strokeWidth="2" fill="none" />
        <circle cx="24" cy="24" r="9" stroke="#f87171" strokeWidth="1.5" fill="none" opacity="0.7" />
        <circle cx="24" cy="24" r="3" fill="url(#cr-top)" />
        {/* Crosshair lines */}
        <line x1="24" y1="7" x2="24" y2="15" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
        <line x1="24" y1="33" x2="24" y2="41" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
        <line x1="7" y1="24" x2="15" y2="24" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
        <line x1="33" y1="24" x2="41" y2="24" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
        {/* Corner brackets for 3D effect */}
        <path d="M10 10 L10 16 M10 10 L16 10" stroke="#fca5a5" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M38 10 L38 16 M38 10 L32 10" stroke="#fca5a5" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M10 38 L10 32 M10 38 L16 38" stroke="#fca5a5" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M38 38 L38 32 M38 38 L32 38" stroke="#fca5a5" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  ),

  // SOC Training — shield with checkmark
  socTraining: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="soc-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#34d399" />
          <stop offset="100%" stopColor="#059669" />
        </linearGradient>
        <linearGradient id="soc-side" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#047857" />
          <stop offset="100%" stopColor="#064e3b" />
        </linearGradient>
        <filter id="soc-shadow">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#10b981" floodOpacity="0.4" />
        </filter>
      </defs>
      <g filter="url(#soc-shadow)">
        {/* Shield front face */}
        <path d="M24 6 L38 12 L38 26 C38 34 24 42 24 42 C24 42 10 34 10 26 L10 12 Z" fill="url(#soc-top)" />
        {/* Shield side (3D depth) */}
        <path d="M38 12 L42 14 L42 28 C42 36 28 44 28 44 L24 42 C24 42 38 34 38 26 Z" fill="url(#soc-side)" />
        {/* Shield top */}
        <path d="M24 6 L28 4 L42 10 L38 12 Z" fill="#6ee7b7" />
        {/* Checkmark */}
        <path d="M17 24 L21 28 L31 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Shine */}
        <path d="M14 14 L20 12 L20 20 L14 22 Z" fill="white" opacity="0.1" />
      </g>
    </svg>
  ),

  // SOC Assessments — clipboard/chart
  socAssessments: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="sa-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id="sa-side" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#b45309" />
          <stop offset="100%" stopColor="#78350f" />
        </linearGradient>
        <filter id="sa-shadow">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#f59e0b" floodOpacity="0.4" />
        </filter>
      </defs>
      <g filter="url(#sa-shadow)">
        {/* Clipboard front */}
        <rect x="10" y="10" width="24" height="32" rx="2" fill="url(#sa-top)" />
        {/* Clipboard side */}
        <path d="M34 10 L40 14 L40 46 L34 42 Z" fill="url(#sa-side)" />
        {/* Clipboard top */}
        <path d="M10 10 L16 6 L40 6 L34 10 Z" fill="#fde68a" />
        {/* Clip bar */}
        <rect x="17" y="6" width="10" height="5" rx="2" fill="#92400e" />
        <rect x="19" y="5" width="6" height="3" rx="1.5" fill="#fbbf24" />
        {/* Chart bars on clipboard */}
        <rect x="13" y="28" width="4" height="10" rx="1" fill="#78350f" opacity="0.6" />
        <rect x="19" y="22" width="4" height="16" rx="1" fill="#78350f" opacity="0.6" />
        <rect x="25" y="25" width="4" height="13" rx="1" fill="#78350f" opacity="0.6" />
        {/* Lines */}
        <rect x="13" y="16" width="14" height="1.5" rx="0.5" fill="#92400e" opacity="0.5" />
        <rect x="13" y="19" width="10" height="1.5" rx="0.5" fill="#92400e" opacity="0.5" />
      </g>
    </svg>
  ),

  // Lab Scenarios — server/rack
  labs: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lab-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a78bfa" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
        <linearGradient id="lab-side" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#6d28d9" />
          <stop offset="100%" stopColor="#3b0764" />
        </linearGradient>
        <filter id="lab-shadow">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#8b5cf6" floodOpacity="0.4" />
        </filter>
      </defs>
      <g filter="url(#lab-shadow)">
        {/* Server rack front - 3 units */}
        <rect x="8" y="8" width="26" height="8" rx="1.5" fill="url(#lab-top)" />
        <rect x="8" y="18" width="26" height="8" rx="1.5" fill="url(#lab-top)" opacity="0.9" />
        <rect x="8" y="28" width="26" height="8" rx="1.5" fill="url(#lab-top)" opacity="0.8" />
        {/* Side face */}
        <path d="M34 8 L40 12 L40 38 L34 36 Z" fill="url(#lab-side)" />
        {/* Top face */}
        <path d="M8 8 L14 4 L40 4 L34 8 Z" fill="#c4b5fd" />
        {/* LEDs on each unit */}
        <circle cx="12" cy="12" r="1.5" fill="#4ade80" />
        <circle cx="16" cy="12" r="1.5" fill="#4ade80" opacity="0.6" />
        <circle cx="12" cy="22" r="1.5" fill="#facc15" />
        <circle cx="16" cy="22" r="1.5" fill="#4ade80" />
        <circle cx="12" cy="32" r="1.5" fill="#4ade80" />
        <circle cx="16" cy="32" r="1.5" fill="#f87171" opacity="0.7" />
        {/* Drive bays */}
        <rect x="21" y="10" width="10" height="4" rx="0.5" fill="#4c1d95" opacity="0.5" />
        <rect x="21" y="20" width="10" height="4" rx="0.5" fill="#4c1d95" opacity="0.5" />
        <rect x="21" y="30" width="10" height="4" rx="0.5" fill="#4c1d95" opacity="0.5" />
        {/* Bottom rack rails */}
        <rect x="8" y="38" width="26" height="2" rx="1" fill="#5b21b6" opacity="0.6" />
        <path d="M34 38 L40 42 L40 40 L34 40 Z" fill="#4c1d95" />
      </g>
    </svg>
  ),

  // Lock icon — 3D padlock
  lock: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lk-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="100%" stopColor="#64748b" />
        </linearGradient>
        <linearGradient id="lk-body" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="100%" stopColor="#1e293b" />
        </linearGradient>
        <filter id="lk-shadow">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#334155" floodOpacity="0.5" />
        </filter>
      </defs>
      <g filter="url(#lk-shadow)">
        {/* Shackle front arc */}
        <path d="M16 22 L16 16 Q16 8 24 8 Q32 8 32 16 L32 22" stroke="url(#lk-top)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
        {/* Shackle side (3D) */}
        <path d="M32 16 L35 18 L35 24 L32 22" fill="#475569" />
        {/* Lock body front */}
        <rect x="12" y="22" width="24" height="18" rx="3" fill="url(#lk-body)" />
        {/* Lock body side */}
        <path d="M36 22 L42 26 L42 44 L36 40 Z" fill="#1e293b" opacity="0.8" />
        {/* Lock body top */}
        <path d="M12 22 L18 18 L42 18 L36 22 Z" fill="#64748b" />
        {/* Keyhole */}
        <circle cx="24" cy="30" r="3.5" fill="#0f172a" />
        <rect x="22.5" y="30" width="3" height="5" rx="1" fill="#0f172a" />
        {/* Shine */}
        <rect x="14" y="24" width="5" height="8" rx="1" fill="white" opacity="0.07" />
      </g>
    </svg>
  ),

  // Course Lab Builder — open book with circuit lines
  courseLabBuilder: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="clb-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fb923c" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id="clb-side" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c2410c" />
          <stop offset="100%" stopColor="#7c2d12" />
        </linearGradient>
        <filter id="clb-shadow">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#f97316" floodOpacity="0.45" />
        </filter>
      </defs>
      <g filter="url(#clb-shadow)">
        {/* Book left page */}
        <path d="M7 12 L24 10 L24 38 L7 40 Z" fill="url(#clb-top)" />
        {/* Book right page */}
        <path d="M24 10 L41 12 L41 40 L24 38 Z" fill="#fb923c" opacity="0.85" />
        {/* Spine */}
        <rect x="22" y="10" width="4" height="28" rx="1" fill="#7c2d12" />
        {/* Top covers */}
        <path d="M7 12 L10 8 L27 6 L24 10 Z" fill="#fdba74" />
        <path d="M24 10 L27 6 L44 8 L41 12 Z" fill="#fed7aa" />
        {/* Circuit lines left page */}
        <line x1="11" y1="18" x2="20" y2="18" stroke="#fff7ed" strokeWidth="1.2" opacity="0.7" />
        <circle cx="11" cy="18" r="1.2" fill="#fef3c7" />
        <circle cx="20" cy="18" r="1.2" fill="#fef3c7" />
        <line x1="11" y1="23" x2="17" y2="23" stroke="#fff7ed" strokeWidth="1.2" opacity="0.7" />
        <line x1="11" y1="28" x2="20" y2="28" stroke="#fff7ed" strokeWidth="1.2" opacity="0.5" />
        {/* Circuit lines right page */}
        <line x1="27" y1="18" x2="37" y2="18" stroke="#fff7ed" strokeWidth="1.2" opacity="0.7" />
        <circle cx="27" cy="18" r="1.2" fill="#fef3c7" />
        <circle cx="37" cy="18" r="1.2" fill="#fef3c7" />
        <line x1="27" y1="23" x2="33" y2="23" stroke="#fff7ed" strokeWidth="1.2" opacity="0.7" />
        <line x1="27" y1="28" x2="37" y2="28" stroke="#fff7ed" strokeWidth="1.2" opacity="0.5" />
      </g>
    </svg>
  ),

  // Shield with check — admin/security
  adminShield: ({ size = 48, className = "" }) => (
    <svg width={size} height={size} viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="as-top" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#c084fc" />
          <stop offset="100%" stopColor="#9333ea" />
        </linearGradient>
        <linearGradient id="as-side" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#7e22ce" />
          <stop offset="100%" stopColor="#3b0764" />
        </linearGradient>
        <filter id="as-shadow">
          <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#a855f7" floodOpacity="0.5" />
        </filter>
      </defs>
      <g filter="url(#as-shadow)">
        <path d="M24 6 L38 12 L38 26 C38 34 24 42 24 42 C24 42 10 34 10 26 L10 12 Z" fill="url(#as-top)" />
        <path d="M38 12 L42 14 L42 28 C42 36 28 44 28 44 L24 42 C24 42 38 34 38 26 Z" fill="url(#as-side)" />
        <path d="M24 6 L28 4 L42 10 L38 12 Z" fill="#e9d5ff" />
        <path d="M17 24 L21 28 L31 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M14 14 L20 12 L20 20 L14 22 Z" fill="white" opacity="0.1" />
      </g>
    </svg>
  ),
};

export default function CyberIcon3D({ icon, size = 48, className = "" }) {
  const IconComponent = icons[icon];
  if (!IconComponent) return null;
  return <IconComponent size={size} className={className} />;
}

export { icons };