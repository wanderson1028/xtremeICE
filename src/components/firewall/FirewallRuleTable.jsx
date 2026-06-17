import React from "react";

export default function FirewallRuleTable({ rules = [] }) {
  if (rules.length === 0) {
    return (
      <div className="bg-gray-950 border border-gray-700 rounded-xl p-3">
        <div className="text-xs text-gray-400 font-mono mb-2">Current Rules</div>
        <div className="text-[10px] font-mono text-gray-600">No rules configured yet.</div>
      </div>
    );
  }

  return (
    <div className="bg-gray-950 border border-gray-700 rounded-xl p-3">
      <div className="text-xs text-gray-400 font-mono mb-2">Current Rules ({rules.length})</div>
      <div className="space-y-1.5 max-h-48 overflow-y-auto">
        {rules.map((rule, i) => (
          <div key={i} className="rounded bg-black/40 px-2 py-1">
            <div className="flex items-center gap-2">
              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded ${rule.action === "permit" ? "bg-green-900 text-green-400" : "bg-red-900 text-red-400"}`}>
                {rule.action?.toUpperCase() || "?"}
              </span>
              <span className="text-[10px] font-mono text-gray-300 truncate">{rule.id}</span>
            </div>
            <div className="text-[9px] font-mono text-gray-500 mt-0.5">
              {rule.src} → {rule.dst}
              {rule.port ? ` : ${rule.port}` : ""}
              {rule.proto && rule.proto !== "any" ? ` (${rule.proto})` : ""}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}