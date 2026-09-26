import React from "react";
import { Lock, Mail, Cloud, Package, Database, Zap, Check } from "lucide-react";

const CATEGORY_META = {
  "Ransomware": { icon: Lock, hint: "Encryption and extortion" },
  "Business Email Compromise": { icon: Mail, hint: "Fraud and impersonation" },
  "Cloud Compromise": { icon: Cloud, hint: "Credentials and exposure" },
  "Supply Chain": { icon: Package, hint: "Vendors and updates" },
  "Data Breach": { icon: Database, hint: "Theft of sensitive data" },
  "Operational Disruption": { icon: Zap, hint: "Denial of service and outages" },
};

export default function AttackSelector({ categories, scenarios, selectedCategory, selectedScenario, onCategoryChange, onScenarioChange }) {
  return (
    <div className="space-y-5">
      <div>
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">Attack category</span>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {categories.map(cat => {
            const meta = CATEGORY_META[cat] || {};
            const Icon = meta.icon || Zap;
            const active = cat === selectedCategory;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => onCategoryChange(cat)}
                className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition ${active ? "border-cyan-400 bg-cyan-400/10" : "border-slate-700 bg-slate-950 hover:border-slate-500"}`}
              >
                <Icon className={`mt-0.5 h-5 w-5 shrink-0 ${active ? "text-cyan-300" : "text-slate-400"}`} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-slate-100">{cat}</span>
                  {meta.hint && <span className="mt-0.5 block text-xs text-slate-400">{meta.hint}</span>}
                </span>
                {active && <Check className="h-4 w-4 shrink-0 text-cyan-300" />}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <span className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-400">Attack scenario</span>
        <div className="grid gap-2.5 sm:grid-cols-2">
          {scenarios.map(scen => {
            const active = scen === selectedScenario;
            return (
              <button
                key={scen}
                type="button"
                onClick={() => onScenarioChange(scen)}
                className={`flex items-center gap-3 rounded-xl border p-3.5 text-left transition ${active ? "border-cyan-400 bg-cyan-400/10" : "border-slate-700 bg-slate-950 hover:border-slate-500"}`}
              >
                <span className="min-w-0 flex-1 text-sm text-slate-100">{scen}</span>
                {active && <Check className="h-4 w-4 shrink-0 text-cyan-300" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}