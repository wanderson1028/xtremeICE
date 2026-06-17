import React from "react";
import { Network } from "lucide-react";

export default function NetworkTopologyPreview({ design }) {
  if (!design) {
    return (
      <div className="bg-card border border-border rounded-xl p-6 text-center space-y-3">
        <Network className="h-8 w-8 text-muted-foreground mx-auto opacity-50" />
        <p className="text-sm font-semibold text-foreground">No Network Design</p>
        <p className="text-xs text-muted-foreground">Link a design to see topology preview</p>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
        <Network className="h-4 w-4 text-primary" /> Network Topology
      </h3>

      <div className="space-y-3">
        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Type</p>
          <p className="text-xs font-semibold text-foreground capitalize">{design.topology_type}</p>
        </div>

        <div className="space-y-1">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Sites</p>
          <div className="flex flex-wrap gap-1">
            {(design.site_names || [])
              .filter(Boolean)
              .slice(0, 3)
              .map((site, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 rounded bg-secondary border border-border text-foreground">
                  {site}
                </span>
              ))}
            {(design.site_names || []).filter(Boolean).length > 3 && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-secondary border border-border text-muted-foreground">
                +{(design.site_names || []).filter(Boolean).length - 3} more
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          {design.firewall_enabled && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-medium">
              🔒 Firewall
            </span>
          )}
          {design.dmz_required && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 font-medium">
              DMZ
            </span>
          )}
          {design.redundancy_enabled && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-green-500/10 border border-green-500/20 text-green-400 font-medium">
              Redundancy
            </span>
          )}
          {design.server_farm && (
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-medium">
              Server Farm
            </span>
          )}
        </div>
      </div>
    </div>
  );
}