import React from "react";

const baseClasses = "w-full h-full drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]";

/* ── Router ─────────────────────────────────────────────────── */
export function RouterIcon({ className }) {
  const cls = `${baseClasses} ${className || ""}`;
  return (
    <svg viewBox="0 0 72 72" className={cls} fill="none">
      {/* shadow */}
      <rect x="7" y="13" width="58" height="48" rx="5" fill="#000" fillOpacity="0.3"/>
      {/* chassis */}
      <rect x="5" y="9" width="58" height="48" rx="5" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="2"/>
      {/* front panel */}
      <rect x="8" y="13" width="52" height="38" rx="3" fill="currentColor" fillOpacity="0.1"/>
      {/* top vent line */}
      <line x1="12" y1="17" x2="56" y2="17" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.2" strokeDasharray="3 2"/>
      {/* port block */}
      <rect x="12" y="23" width="44" height="17" rx="2" fill="currentColor" fillOpacity="0.07" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.25"/>
      {/* ports row 1 */}
      {[16,24,32,40,48].map((x,i) => (
        <g key={`r1-${i}`}>
          <rect x={x} y="25" width="6" height="6" rx="1" fill="currentColor" fillOpacity={i%2===0?0.55:0.38}/>
          <rect x={x+0.5} y="25.5" width="5" height="5" rx="0.7" fill="currentColor" fillOpacity={i%2===0?0.25:0.15}/>
        </g>
      ))}
      {/* ports row 2 */}
      {[16,24,32,40,48].map((x,i) => (
        <g key={`r2-${i}`}>
          <rect x={x} y="33" width="6" height="6" rx="1" fill="currentColor" fillOpacity={i%3===0?0.55:0.38}/>
          <rect x={x+0.5} y="33.5" width="5" height="5" rx="0.7" fill="currentColor" fillOpacity={i%3===0?0.25:0.15}/>
        </g>
      ))}
      {/* separator line */}
      <line x1="11" y1="44" x2="57" y2="44" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.2"/>
      {/* status LEDs */}
      <circle cx="14" cy="48" r="1.8" fill="#22c55e"/><circle cx="14" cy="48" r="1.8" fill="#22c55e" opacity="0.5" filter="blur(0.5px)"/>
      <circle cx="20" cy="48" r="1.8" fill="#22c55e"/><circle cx="20" cy="48" r="1.8" fill="#22c55e" opacity="0.5" filter="blur(0.5px)"/>
      <circle cx="26" cy="48" r="1.8" fill="#eab308"/><circle cx="26" cy="48" r="1.8" fill="#eab308" opacity="0.5" filter="blur(0.5px)"/>
      <circle cx="32" cy="48" r="1.8" fill="#22c55e"/><circle cx="32" cy="48" r="1.8" fill="#22c55e" opacity="0.5" filter="blur(0.5px)"/>
      <circle cx="38" cy="48" r="1.8" fill="#22c55e"/><circle cx="38" cy="48" r="1.8" fill="#22c55e" opacity="0.5" filter="blur(0.5px)"/>
      <circle cx="44" cy="48" r="1.8" fill="#3b82f6"/><circle cx="44" cy="48" r="1.8" fill="#3b82f6" opacity="0.5" filter="blur(0.5px)"/>
      {/* rack ears */}
      <rect x="1" y="14" width="5" height="8" rx="1.5" fill="currentColor" fillOpacity="0.35" stroke="currentColor" strokeWidth="0.8"/>
      <rect x="62" y="14" width="5" height="8" rx="1.5" fill="currentColor" fillOpacity="0.35" stroke="currentColor" strokeWidth="0.8"/>
      <rect x="1" y="42" width="5" height="8" rx="1.5" fill="currentColor" fillOpacity="0.35" stroke="currentColor" strokeWidth="0.8"/>
      <rect x="62" y="42" width="5" height="8" rx="1.5" fill="currentColor" fillOpacity="0.35" stroke="currentColor" strokeWidth="0.8"/>
      {/* antennas */}
      <path d="M16 4 L14 9 L18 9 Z" fill="currentColor" fillOpacity="0.25"/>
      <path d="M48 4 L50 9 L46 9 Z" fill="currentColor" fillOpacity="0.25"/>
    </svg>
  );
}

/* ── Switch ─────────────────────────────────────────────────── */
export function SwitchIcon({ className }) {
  const cls = `${baseClasses} ${className || ""}`;
  return (
    <svg viewBox="0 0 72 72" className={cls} fill="none">
      <rect x="7" y="15" width="58" height="44" rx="5" fill="#000" fillOpacity="0.3"/>
      <rect x="5" y="11" width="58" height="44" rx="5" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="2"/>
      <rect x="8" y="15" width="52" height="34" rx="3" fill="currentColor" fillOpacity="0.1"/>
      {/* top vent */}
      <line x1="12" y1="18.5" x2="56" y2="18.5" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.18" strokeDasharray="2.5 2"/>
      {/* 2 rows x 8 ports */}
      {[0,1,2,3,4,5,6,7].map(i => (
        <React.Fragment key={`sw-${i}`}>
          <rect x={12 + i*5.5} y="23" width="4" height="5" rx="1" fill="currentColor" fillOpacity={i%2===0?0.5:0.32}/>
          <rect x={12 + i*5.5} y="33" width="4" height="5" rx="1" fill="currentColor" fillOpacity={i%3===0?0.5:0.32}/>
        </React.Fragment>
      ))}
      {/* LED row */}
      {[13,19,25,31,37,43,49,55].map((x,i) => (
        <React.Fragment key={`swl-${i}`}>
          <circle cx={x} cy="42" r="1.3" fill={i<6?"#22c55e":i===6?"#eab308":"#ef4444"}/>
          <circle cx={x} cy="42" r="1.3" fill={i<6?"#22c55e":i===6?"#eab308":"#ef4444"} opacity="0.5" filter="blur(0.4px)"/>
        </React.Fragment>
      ))}
      {/* separator */}
      <line x1="11" y1="46" x2="57" y2="46" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.15"/>
      {/* bottom panel label */}
      <rect x="24" y="48.5" width="20" height="3" rx="0.5" fill="currentColor" fillOpacity="0.12"/>
      {/* rack ears */}
      <rect x="1" y="16" width="5" height="8" rx="1.5" fill="currentColor" fillOpacity="0.35" stroke="currentColor" strokeWidth="0.8"/>
      <rect x="62" y="16" width="5" height="8" rx="1.5" fill="currentColor" fillOpacity="0.35" stroke="currentColor" strokeWidth="0.8"/>
      <rect x="1" y="40" width="5" height="8" rx="1.5" fill="currentColor" fillOpacity="0.35" stroke="currentColor" strokeWidth="0.8"/>
      <rect x="62" y="40" width="5" height="8" rx="1.5" fill="currentColor" fillOpacity="0.35" stroke="currentColor" strokeWidth="0.8"/>
    </svg>
  );
}

/* ── Firewall ───────────────────────────────────────────────── */
export function FirewallIcon({ className }) {
  const cls = `${baseClasses} ${className || ""}`;
  return (
    <svg viewBox="0 0 72 72" className={cls} fill="none">
      {/* outer shield glow */}
      <path d="M36 5 L62 16 L62 38 C62 54 42 64 36 68 C30 64 10 54 10 38 L10 16 Z" fill="#000" fillOpacity="0.3"/>
      {/* outer shield */}
      <path d="M36 3 L60 13 L60 35 C60 52 42 62 36 66 C30 62 12 52 12 35 L12 13 Z" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="2"/>
      {/* inner shield */}
      <path d="M36 9 L53 17 L53 34 C53 46 41 56 36 58 C31 56 19 46 19 34 L19 17 Z" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4"/>
      {/* lock */}
      <rect x="30" y="25" width="12" height="11" rx="2.5" fill="currentColor" fillOpacity="0.5"/>
      <rect x="31" y="26" width="10" height="8" rx="1.2" fill="currentColor" fillOpacity="0.2"/>
      <path d="M33 25 L33 20.5 C33 17 39 17 39 20.5 L39 25" stroke="currentColor" strokeWidth="2" strokeOpacity="0.55" fill="none" strokeLinecap="round"/>
      <circle cx="36" cy="30.5" r="2" fill="#fff" fillOpacity="0.85"/>
      {/* grid detail */}
      <rect x="26" y="42" width="4" height="4" rx="0.7" fill="currentColor" fillOpacity="0.2"/>
      <rect x="34" y="42" width="4" height="4" rx="0.7" fill="currentColor" fillOpacity="0.2"/>
      <rect x="42" y="42" width="4" height="4" rx="0.7" fill="currentColor" fillOpacity="0.2"/>
      {/* checkmark */}
      <path d="M29 21 L33 25 L43 15" stroke="currentColor" strokeWidth="2" strokeOpacity="0.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Server ─────────────────────────────────────────────────── */
export function ServerIcon({ className }) {
  const cls = `${baseClasses} ${className || ""}`;
  return (
    <svg viewBox="0 0 72 72" className={cls} fill="none">
      <rect x="11" y="6" width="50" height="60" rx="5" fill="#000" fillOpacity="0.3"/>
      <rect x="9" y="4" width="50" height="60" rx="5" fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="2"/>
      {/* front fascia */}
      <rect x="13" y="9" width="42" height="50" rx="3" fill="currentColor" fillOpacity="0.07" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.3"/>
      {/* drive bays */}
      {[12,22,32,42].map((y,i) => (
        <React.Fragment key={`drv-${i}`}>
          <rect x="18" y={y} width="32" height="8" rx="2" fill="currentColor" fillOpacity={i===0?0.3:0.18}/>
          <rect x="19" y={y+1} width="30" height="6" rx="1.3" fill="currentColor" fillOpacity={i===0?0.12:0.06}/>
          {/* drive LED */}
          <circle cx="20" cy={y+4} r="1.3" fill={i===0?"#22c55e":i===1?"#22c55e":"#6b7280"}/>
          <circle cx="20" cy={y+4} r="1.3" fill={i===0?"#22c55e":i===1?"#22c55e":"#6b7280"} opacity="0.5" filter="blur(0.4px)"/>
        </React.Fragment>
      ))}
      {/* bottom info panel */}
      <line x1="15" y1="51" x2="53" y2="51" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.15"/>
      <circle cx="24" cy="55" r="2" fill="#22c55e"/><circle cx="24" cy="55" r="2" fill="#22c55e" opacity="0.5" filter="blur(0.5px)"/>
      <circle cx="32" cy="55" r="2" fill="#3b82f6"/><circle cx="32" cy="55" r="2" fill="#3b82f6" opacity="0.5" filter="blur(0.5px)"/>
      <circle cx="40" cy="55" r="2" fill="#eab308"/><circle cx="40" cy="55" r="2" fill="#eab308" opacity="0.5" filter="blur(0.5px)"/>
      {/* power indicator */}
      <circle cx="48" cy="55" r="2.5" fill="currentColor" fillOpacity="0.2" stroke="currentColor" strokeWidth="1"/>
      <circle cx="48" cy="55" r="1" fill="#22c55e"/>
      {/* rack ears */}
      <rect x="5" y="10" width="5" height="10" rx="1.5" fill="currentColor" fillOpacity="0.35" stroke="currentColor" strokeWidth="0.8"/>
      <rect x="58" y="10" width="5" height="10" rx="1.5" fill="currentColor" fillOpacity="0.35" stroke="currentColor" strokeWidth="0.8"/>
      <rect x="5" y="44" width="5" height="10" rx="1.5" fill="currentColor" fillOpacity="0.35" stroke="currentColor" strokeWidth="0.8"/>
      <rect x="58" y="44" width="5" height="10" rx="1.5" fill="currentColor" fillOpacity="0.35" stroke="currentColor" strokeWidth="0.8"/>
      {/* top vent slots */}
      {[18,24,30,36,42,48].map((x,i) => (
        <rect key={`vtop-${i}`} x={x} y="7" width="2" height="1.2" rx="0.5" fill="currentColor" fillOpacity="0.2"/>
      ))}
    </svg>
  );
}

/* ── Desktop / Workstation ──────────────────────────────────── */
export function WorkstationIcon({ className }) {
  const cls = `${baseClasses} ${className || ""}`;
  return (
    <svg viewBox="0 0 72 72" className={cls} fill="none">
      {/* monitor shadow */}
      <rect x="13" y="10" width="46" height="33" rx="6" fill="#000" fillOpacity="0.3"/>
      {/* monitor body */}
      <rect x="11" y="6" width="46" height="33" rx="6" fill="currentColor" fillOpacity="0.14" stroke="currentColor" strokeWidth="2"/>
      {/* bezel inner */}
      <rect x="15" y="10" width="38" height="25" rx="3" fill="currentColor" fillOpacity="0.08"/>
      {/* screen */}
      <rect x="17" y="12" width="34" height="21" rx="2" fill="currentColor" fillOpacity="0.18"/>
      {/* screen glare diagonal */}
      <path d="M18 13 L26 13 L18 21 Z" fill="#fff" fillOpacity="0.04"/>
      {/* webcam dot */}
      <circle cx="33" cy="8.5" r="1" fill="currentColor" fillOpacity="0.4"/>
      {/* stand neck */}
      <rect x="27" y="39" width="12" height="5" rx="2" fill="currentColor" fillOpacity="0.3"/>
      {/* stand base */}
      <ellipse cx="33" cy="46" rx="15" ry="4" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4"/>
      {/* keyboard */}
      <rect x="16" y="52" width="26" height="10" rx="3" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.3"/>
      {/* spacebar */}
      <rect x="22" y="56.5" width="14" height="2.5" rx="1" fill="currentColor" fillOpacity="0.15"/>
      {/* key hints */}
      {[19,23,27,31,35,39].map((x,i) => (
        <rect key={`key-${i}`} x={x} y="53.5" width="2.5" height="1.5" rx="0.4" fill="currentColor" fillOpacity="0.12"/>
      ))}
    </svg>
  );
}

/* ── Cloud ──────────────────────────────────────────────────── */
export function CloudIcon({ className }) {
  const cls = `${baseClasses} ${className || ""}`;
  return (
    <svg viewBox="0 0 72 72" className={cls} fill="none">
      {/* cloud shadow */}
      <path d="M19 49 C10 49 4 43 4 36 C4 30 9 25 15 25 C15 18 20 12 27 10 C34 8 41 10 45 16 C50 12 57 12 61 17 C65 22 67 28 64 33 C68 35 69 42 66 46 C63 49 58 51 53 51 Z" fill="#000" fillOpacity="0.25"/>
      {/* cloud body */}
      <path d="M17 47 C9 47 3 41 3 35 C3 29 8 24 14 24 C14 17 19 11 26 9 C33 7 40 9 44 15 C49 11 56 11 60 16 C64 21 66 27 63 32 C67 34 68 41 65 45 C62 48 57 50 52 50 Z" fill="currentColor" fillOpacity="0.13" stroke="currentColor" strokeWidth="2"/>
      {/* rack inside */}
      <rect x="22" y="30" width="26" height="17" rx="3" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.4"/>
      {/* drive bays in rack */}
      <rect x="26" y="32" width="18" height="4" rx="1" fill="currentColor" fillOpacity="0.25"/>
      <rect x="26" y="38" width="18" height="4" rx="1" fill="currentColor" fillOpacity="0.15"/>
      {/* LEDs */}
      <circle cx="24" cy="34" r="1.2" fill="#22c55e"/>
      <circle cx="24" cy="40" r="1.2" fill="#eab308"/>
      {/* connector */}
      <rect x="32" y="44" width="6" height="2" rx="0.5" fill="currentColor" fillOpacity="0.3"/>
      {/* uplink lines */}
      <line x1="30" y1="50" x2="30" y2="56" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.35" strokeDasharray="2 3"/>
      <line x1="37" y1="50" x2="37" y2="56" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.35" strokeDasharray="2 3"/>
      <line x1="44" y1="50" x2="44" y2="56" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.35" strokeDasharray="2 3"/>
    </svg>
  );
}

/* ── Container ──────────────────────────────────────────────── */
export function ContainerIcon({ className }) {
  const cls = `${baseClasses} ${className || ""}`;
  return (
    <svg viewBox="0 0 72 72" className={cls} fill="none">
      {/* box shadow */}
      <rect x="8" y="10" width="56" height="52" rx="5" fill="#000" fillOpacity="0.3"/>
      {/* box body */}
      <rect x="6" y="8" width="56" height="52" rx="5" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="2"/>
      {/* top lid */}
      <rect x="6" y="8" width="56" height="10" rx="5" fill="currentColor" fillOpacity="0.2"/>
      <rect x="6" y="14" width="56" height="4" rx="0" fill="currentColor" fillOpacity="0.12"/>
      {/* container logo */}
      <circle cx="20" cy="13" r="3" fill="currentColor" fillOpacity="0.3"/>
      <line x1="25" y1="13" x2="55" y2="13" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.2"/>
      {/* layers */}
      <line x1="12" y1="22" x2="58" y2="22" stroke="currentColor" strokeWidth="1" strokeOpacity="0.2"/>
      <line x1="12" y1="27" x2="52" y2="27" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.15"/>
      <line x1="12" y1="32" x2="46" y2="32" stroke="currentColor" strokeWidth="0.6" strokeOpacity="0.1"/>
      {/* whale shape */}
      <path d="M24 42 L22 37 L26 33 L33 35 L39 30 L45 33 L48 31 L52 33 L50 42 L44 44 L33 44 Z" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.3"/>
      {/* containers stacked */}
      <rect x="14" y="48" width="14" height="8" rx="1.5" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.3"/>
      <rect x="31" y="48" width="14" height="8" rx="1.5" fill="currentColor" fillOpacity="0.1" stroke="currentColor" strokeWidth="0.8" strokeOpacity="0.3"/>
      {/* dots in containers */}
      <circle cx="21" cy="52" r="1.2" fill="#22c55e"/>
      <circle cx="38" cy="52" r="1.2" fill="#3b82f6"/>
    </svg>
  );
}

/* ── Load Balancer ──────────────────────────────────────────── */
export function LoadBalancerIcon({ className }) {
  const cls = `${baseClasses} ${className || ""}`;
  return (
    <svg viewBox="0 0 72 72" className={cls} fill="none">
      {/* hub shadow */}
      <circle cx="36" cy="36" r="13" fill="#000" fillOpacity="0.25"/>
      {/* hub outer ring */}
      <circle cx="36" cy="36" r="13" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="2"/>
      {/* hub inner */}
      <circle cx="36" cy="36" r="8" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.4"/>
      <circle cx="36" cy="36" r="3.5" fill="currentColor" fillOpacity="0.35"/>
      <circle cx="36" cy="36" r="1.5" fill="#fff" fillOpacity="0.3"/>
      {/* top server */}
      <rect x="26" y="5" width="20" height="14" rx="3.5" fill="#000" fillOpacity="0.2"/>
      <rect x="25" y="4" width="20" height="14" rx="3.5" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.8"/>
      <rect x="28" y="7" width="14" height="2.5" rx="0.8" fill="currentColor" fillOpacity="0.3"/>
      <rect x="28" y="11" width="14" height="2.5" rx="0.8" fill="currentColor" fillOpacity="0.18"/>
      <circle cx="27" cy="8.2" r="1" fill="#22c55e"/>
      <circle cx="27" cy="12.2" r="1" fill="#3b82f6"/>
      {/* bottom server */}
      <rect x="26" y="53" width="20" height="14" rx="3.5" fill="#000" fillOpacity="0.2"/>
      <rect x="25" y="52" width="20" height="14" rx="3.5" fill="currentColor" fillOpacity="0.18" stroke="currentColor" strokeWidth="1.8"/>
      <rect x="28" y="55" width="14" height="2.5" rx="0.8" fill="currentColor" fillOpacity="0.3"/>
      <rect x="28" y="59" width="14" height="2.5" rx="0.8" fill="currentColor" fillOpacity="0.18"/>
      <circle cx="27" cy="56.2" r="1" fill="#22c55e"/>
      <circle cx="27" cy="60.2" r="1" fill="#3b82f6"/>
      {/* links */}
      <line x1="29" y1="18" x2="29" y2="23" stroke="currentColor" strokeWidth="2" strokeOpacity="0.4"/>
      <line x1="41" y1="18" x2="41" y2="23" stroke="currentColor" strokeWidth="2" strokeOpacity="0.4"/>
      <line x1="29" y1="49" x2="29" y2="52" stroke="currentColor" strokeWidth="2" strokeOpacity="0.4"/>
      <line x1="41" y1="49" x2="41" y2="52" stroke="currentColor" strokeWidth="2" strokeOpacity="0.4"/>
      {/* arrow heads */}
      <polygon points="27,25 31,25 29,28" fill="currentColor" fillOpacity="0.4"/>
      <polygon points="39,25 43,25 41,28" fill="currentColor" fillOpacity="0.4"/>
      <polygon points="27,51 31,51 29,48" fill="currentColor" fillOpacity="0.4"/>
      <polygon points="39,51 43,51 41,48" fill="currentColor" fillOpacity="0.4"/>
    </svg>
  );
}

/* ── Security Appliance ─────────────────────────────────────── */
export function SecurityApplianceIcon({ className }) {
  const cls = `${baseClasses} ${className || ""}`;
  return (
    <svg viewBox="0 0 72 72" className={cls} fill="none">
      {/* shadow */}
      <path d="M36 5 L60 15 L60 37 C60 53 43 63 36 67 C29 63 12 53 12 37 L12 15 Z" fill="#000" fillOpacity="0.25"/>
      {/* shield */}
      <path d="M36 3 L58 12 L58 34 C58 50 42 60 36 64 C30 60 14 50 14 34 L14 12 Z" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="2"/>
      {/* inner detail */}
      <path d="M36 8 L52 15 L52 32 C52 45 39 54 36 56 C33 54 20 45 20 32 L20 15 Z" fill="currentColor" fillOpacity="0.08" stroke="currentColor" strokeWidth="1" strokeOpacity="0.35"/>
      {/* radar arcs */}
      <path d="M23 42 C27 51 45 51 49 42" stroke="currentColor" strokeWidth="1.8" strokeOpacity="0.35" fill="none"/>
      <path d="M27 38 C30 44 42 44 45 38" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.2" fill="none"/>
      {/* radar dot */}
      <circle cx="36" cy="38" r="2.5" fill="currentColor" fillOpacity="0.35" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4"/>
      <circle cx="36" cy="38" r="0.8" fill="#fff" fillOpacity="0.3"/>
      {/* horizontal bands */}
      <line x1="16" y1="22" x2="56" y2="22" stroke="currentColor" strokeWidth="1.2" strokeOpacity="0.2"/>
      <line x1="20" y1="28" x2="52" y2="28" stroke="currentColor" strokeWidth="1" strokeOpacity="0.15"/>
      {/* checkmark */}
      <path d="M30 16 L33 20 L42 12" stroke="currentColor" strokeWidth="2.5" strokeOpacity="0.4" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Monitor / SIEM ─────────────────────────────────────────── */
export function MonitoringIcon({ className }) {
  const cls = `${baseClasses} ${className || ""}`;
  return (
    <svg viewBox="0 0 72 72" className={cls} fill="none">
      {/* screen shadow */}
      <rect x="12" y="9" width="48" height="34" rx="5" fill="#000" fillOpacity="0.25"/>
      {/* screen bezel */}
      <rect x="10" y="7" width="48" height="34" rx="5" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="2"/>
      {/* display */}
      <rect x="13" y="10" width="42" height="27" rx="2.5" fill="currentColor" fillOpacity="0.08"/>
      {/* graph line */}
      <polyline points="17,32 24,24 32,27 40,16 48,21 55,12" stroke="currentColor" strokeWidth="2" strokeOpacity="0.45" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {/* area fill */}
      <polygon points="17,33 24,25 32,28 40,17 48,22 55,13 55,33" fill="currentColor" fillOpacity="0.06"/>
      {/* pulse line */}
      <polyline points="17,25 21,25 23,18 25,29 27,22 29,25 31,25" stroke="currentColor" strokeWidth="1.3" strokeOpacity="0.28" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
      {/* stand */}
      <rect x="28" y="41" width="12" height="3" rx="1.5" fill="currentColor" fillOpacity="0.3"/>
      <rect x="22" y="44" width="24" height="7" rx="3.5" fill="currentColor" fillOpacity="0.12" stroke="currentColor" strokeWidth="1.2"/>
      {/* control lights */}
      <circle cx="17" cy="14" r="1.5" fill="#22c55e"/><circle cx="17" cy="14" r="1.5" fill="#22c55e" opacity="0.45" filter="blur(0.4px)"/>
      <circle cx="23" cy="14" r="1.5" fill="#22c55e"/><circle cx="23" cy="14" r="1.5" fill="#22c55e" opacity="0.45" filter="blur(0.4px)"/>
      <circle cx="29" cy="14" r="1.5" fill="#eab308"/><circle cx="29" cy="14" r="1.5" fill="#eab308" opacity="0.45" filter="blur(0.4px)"/>
      <circle cx="35" cy="14" r="1.5" fill="#3b82f6"/><circle cx="35" cy="14" r="1.5" fill="#3b82f6" opacity="0.45" filter="blur(0.4px)"/>
    </svg>
  );
}

/* ── Registry ───────────────────────────────────────────────── */
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

/* ── Icon Catalog ───────────────────────────────────────────── */
const ALL_ICONS = [
  { id: "server", label: "Server", icon: ServerIcon },
  { id: "workstation", label: "Desktop", icon: WorkstationIcon },
  { id: "router", label: "Router", icon: RouterIcon },
  { id: "switch", label: "Switch", icon: SwitchIcon },
  { id: "firewall", label: "Firewall", icon: FirewallIcon },
  { id: "cloud_resource", label: "Cloud", icon: CloudIcon },
  { id: "container", label: "Container", icon: ContainerIcon },
  { id: "load_balancer", label: "LB", icon: LoadBalancerIcon },
  { id: "security_appliance", label: "SecApp", icon: SecurityApplianceIcon },
  { id: "monitoring", label: "Monitor", icon: MonitoringIcon },
];

export function getIconOptions() {
  return ALL_ICONS;
}

export function getDeviceIcon(iconId, fallbackType) {
  const icon = DEVICE_ICONS[iconId];
  if (icon) return icon;
  return DEVICE_ICONS[fallbackType] || ServerIcon;
}

export default function DeviceIconRenderer({ type, iconId, className }) {
  const IconComponent = getDeviceIcon(iconId, type);
  return <IconComponent className={className} />;
}