import React from "react";
import { CheckCircle, XCircle, Circle } from "lucide-react";
import { validateHardening } from "./firewallEngine";
import { HARDENING_OBJECTIVES } from "./firewallTopology";

const tierColors = {
  1: "text-yellow-400",
  2: "text-orange-400",
  3: "text-red-400",
};

const tierLabels = {
  1: "Tier 1 — Management Plane",
  2: "Tier 2 — Data Plane",
  3: "Tier 3 — Advanced",
};

export default function FirewallValidationPanel({ state }) {
  const { checks, passed, total } = validateHardening(state);

  const byTier = [1, 2, 3].map(tier => ({
    tier,
    objectives: HARDENING_OBJECTIVES.filter(o => o.tier === tier),
  }));

  return (
    <div className="bg-gray-950 border border-gray-700 rounded-xl p-3">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs text-gray-400 font-mono">Hardening Checklist</span>
        <span className="text-xs font-mono text-green-400">{passed}/{total}</span>
      </div>

      <div className="space-y-3">
        {byTier.map(({ tier, objectives }) => (
          <div key={tier}>
            <div className={`text-[10px] font-mono font-semibold mb-1 ${tierColors[tier]}`}>
              {tierLabels[tier]}
            </div>
            <div className="space-y-1">
              {objectives.map(obj => {
                const pass = checks[obj.id];
                return (
                  <div key={obj.id} className="flex items-start gap-2">
                    {pass ? (
                      <CheckCircle className="h-3 w-3 text-green-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-3 w-3 text-red-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className={`text-[10px] font-mono leading-tight ${pass ? "text-green-300" : "text-gray-500"}`}>
                        {obj.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}