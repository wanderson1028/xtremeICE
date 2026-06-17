import React from "react";

export default function FirewallZoneDiagram({ vendor }) {
  return (
    <div className="bg-gray-950 border border-gray-700 rounded-xl p-3">
      <div className="text-xs text-gray-400 font-mono mb-2">Network Zones</div>
      <svg viewBox="0 0 300 260" className="w-full" style={{ maxHeight: 200 }}>
        {/* Internet cloud */}
        <rect x="90" y="10" width="120" height="40" rx="8" fill="#7f1d1d" stroke="#ef4444" strokeWidth="1.5" />
        <text x="150" y="35" textAnchor="middle" fill="#fca5a5" fontSize="11" fontFamily="monospace">INTERNET</text>

        {/* Arrow down to firewall */}
        <line x1="150" y1="50" x2="150" y2="90" stroke="#6b7280" strokeWidth="1.5" strokeDasharray="4 2" />

        {/* Firewall box */}
        <rect x="85" y="90" width="130" height="40" rx="8" fill="#1f2937" stroke="#f59e0b" strokeWidth="2" />
        <text x="150" y="115" textAnchor="middle" fill="#fcd34d" fontSize="11" fontFamily="monospace" fontWeight="bold">
          FIREWALL
        </text>

        {/* Left branch: Management */}
        <line x1="85" y1="110" x2="40" y2="170" stroke="#6b7280" strokeWidth="1.5" />
        <rect x="2" y="170" width="76" height="36" rx="6" fill="#14532d" stroke="#22c55e" strokeWidth="1.5" />
        <text x="40" y="186" textAnchor="middle" fill="#86efac" fontSize="9" fontFamily="monospace">MANAGEMENT</text>
        <text x="40" y="198" textAnchor="middle" fill="#86efac" fontSize="8" fontFamily="monospace">10.10.10.0/24</text>

        {/* Right branch: DMZ */}
        <line x1="215" y1="110" x2="260" y2="170" stroke="#6b7280" strokeWidth="1.5" />
        <rect x="222" y="170" width="76" height="36" rx="6" fill="#78350f" stroke="#f59e0b" strokeWidth="1.5" />
        <text x="260" y="186" textAnchor="middle" fill="#fcd34d" fontSize="9" fontFamily="monospace">DMZ</text>
        <text x="260" y="198" textAnchor="middle" fill="#fcd34d" fontSize="8" fontFamily="monospace">172.16.0.0/24</text>

        {/* Label: Web Server */}
        <text x="260" y="225" textAnchor="middle" fill="#9ca3af" fontSize="8" fontFamily="monospace">Web: 172.16.0.10</text>
      </svg>
    </div>
  );
}