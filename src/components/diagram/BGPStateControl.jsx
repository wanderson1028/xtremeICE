import React, { useState } from "react";
import { GitBranch, ChevronDown, ChevronUp } from "lucide-react";

const BGP_STATES = [
  { id: "Idle", label: "Idle", description: "Initial state, no BGP connection established" },
  { id: "Connect", label: "Connect", description: "TCP connection in progress" },
  { id: "Active", label: "Active", description: "Attempting to establish TCP session" },
  { id: "OpenSent", label: "OpenSent", description: "OPEN message sent, waiting for reply" },
  { id: "OpenConfirm", label: "OpenConfirm", description: "OPEN message received, exchanging capabilities" },
  { id: "Established", label: "Established", description: "BGP session fully established and routing" },
];

export default function BGPStateControl({ selectedState = "Idle", onSelect }) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="rounded-lg border border-border bg-secondary/30 overflow-hidden">
      <button
        onClick={() => setExpanded(v => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <GitBranch className="h-4 w-4 text-purple-400" />
          <span className="text-xs font-semibold text-foreground">BGP Session State Control</span>
        </div>
        {expanded ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 py-3 space-y-2 border-t border-border">
          {BGP_STATES.map(state => (
            <button
              key={state.id}
              onClick={() => onSelect(state.id)}
              className={`w-full text-left px-3 py-2 rounded-lg border transition-all text-xs
                ${selectedState === state.id
                  ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                  : "bg-background border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
                }`}
            >
              <p className="font-medium">{state.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{state.description}</p>
            </button>
          ))}
          <p className="text-[10px] text-muted-foreground pt-2 border-t border-border">
            Force BGP neighbors into a specific state during simulation. Used for testing failover scenarios.
          </p>
        </div>
      )}
    </div>
  );
}