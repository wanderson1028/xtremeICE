import React, { useState } from "react";
import { AlertTriangle, Percent, ChevronDown, ChevronUp } from "lucide-react";

const LINK_TYPES = [
  { id: "WAN", label: "WAN Links", icon: "🌐", description: "Wide area network connections (MPLS, SD-WAN, etc.)" },
  { id: "LAN", label: "LAN Links", icon: "🏢", description: "Local area network switches and ports" },
  { id: "HA", label: "HA Links", icon: "🔗", description: "High-availability redundancy links" },
  { id: "DMZ", label: "DMZ Links", icon: "🔒", description: "Demilitarized zone connections" },
];

export default function LinkFailureConfig({ linkProbabilities = {}, onUpdate }) {
  const [expanded, setExpanded] = useState(true);

  const handleProbabilityChange = (linkType, value) => {
    onUpdate({ ...linkProbabilities, [linkType]: Number(value) });
  };

  return (
    <div className="rounded-lg border border-border bg-secondary/30 overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <span className="text-xs font-semibold text-foreground">Link Failure Injection</span>
        </div>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 py-3 space-y-3 border-t border-border">
          {LINK_TYPES.map(lt => {
            const prob = linkProbabilities[lt.id] ?? 0;
            return (
              <div key={lt.id} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <span className="text-sm">{lt.icon}</span> {lt.label}
                  </label>
                  <span className="text-xs font-bold text-primary">{prob}%</span>
                </div>
                <p className="text-[10px] text-muted-foreground leading-tight">{lt.description}</p>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={prob}
                  onChange={e => handleProbabilityChange(lt.id, e.target.value)}
                  className="w-full accent-primary h-2 rounded-full cursor-pointer"
                />
              </div>
            );
          })}
          <p className="text-[10px] text-muted-foreground pt-2 border-t border-border">
            Set individual failure probability for each link type. Affects only links matching the selected type during simulation.
          </p>
        </div>
      )}
    </div>
  );
}