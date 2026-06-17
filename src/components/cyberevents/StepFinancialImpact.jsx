import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, DollarSign, TrendingDown, AlertTriangle, Clock, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

const METRIC_TYPES = [
  { key: "downtime_cost_per_hour", label: "Downtime Cost", icon: Clock, color: "text-orange-400", prefix: "$", suffix: "/hr", placeholder: "e.g. 50000" },
  { key: "revenue_loss_percent", label: "Revenue Loss", icon: TrendingDown, color: "text-red-400", prefix: "", suffix: "%", placeholder: "e.g. 15" },
  { key: "regulatory_fine", label: "Regulatory Fine", icon: AlertTriangle, color: "text-yellow-400", prefix: "$", suffix: "", placeholder: "e.g. 2500000" },
  { key: "recovery_cost", label: "Recovery Cost", icon: DollarSign, color: "text-blue-400", prefix: "$", suffix: "", placeholder: "e.g. 750000" },
];

function formatCurrency(val) {
  if (!val) return "—";
  const n = parseFloat(val);
  if (isNaN(n)) return "—";
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toLocaleString()}`;
}

export default function StepFinancialImpact({ data, onChange }) {
  const [generating, setGenerating] = useState(false);

  const impact = data.financial_impact || {};
  const objectives = data.red_team_objectives || [];

  const updateImpact = (patch) => onChange({ financial_impact: { ...impact, ...patch } });

  const updateObjectiveMapping = (objIndex, field, value) => {
    const mappings = impact.objective_mappings ? [...impact.objective_mappings] : objectives.map(() => ({}));
    // ensure array is long enough
    while (mappings.length < objectives.length) mappings.push({});
    mappings[objIndex] = { ...mappings[objIndex], [field]: value };
    updateImpact({ objective_mappings: mappings });
  };

  const getMapping = (i) => {
    const mappings = impact.objective_mappings || [];
    return mappings[i] || {};
  };

  const handleAutoGenerate = async () => {
    if (!data.scenario_prompt && !data.title) return;
    setGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a cyber risk quantification expert. For this cyber exercise scenario:

Title: "${data.title || "Cyber Exercise"}"
Description: "${data.scenario_prompt || ""}"
Difficulty: ${data.difficulty || "Intermediate"}
Duration: ${data.duration_minutes || 120} minutes

Red Team Objectives:
${objectives.map((o, i) => `${i + 1}. ${o}`).join("\n") || "Not defined"}

Estimate realistic financial impact values for this scenario. Base estimates on industry benchmarks (IBM Cost of Data Breach, Ponemon Institute, etc.).

For each red team objective, estimate:
- downtime_cost_per_hour: operational downtime cost per hour in USD
- revenue_loss_percent: projected revenue loss as a percentage
- regulatory_fine: potential regulatory fine in USD (GDPR, HIPAA, PCI-DSS, etc.)
- recovery_cost: total recovery/remediation cost in USD

Also provide overall scenario-level estimates.`,
        response_json_schema: {
          type: "object",
          properties: {
            scenario_downtime_cost_per_hour: { type: "number" },
            scenario_revenue_loss_percent: { type: "number" },
            scenario_regulatory_fine: { type: "number" },
            scenario_recovery_cost: { type: "number" },
            scenario_total_exposure: { type: "number" },
            scenario_notes: { type: "string" },
            objective_mappings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  downtime_cost_per_hour: { type: "number" },
                  revenue_loss_percent: { type: "number" },
                  regulatory_fine: { type: "number" },
                  recovery_cost: { type: "number" },
                  rationale: { type: "string" },
                }
              }
            }
          }
        }
      });

      updateImpact({
        scenario_downtime_cost_per_hour: result.scenario_downtime_cost_per_hour || "",
        scenario_revenue_loss_percent: result.scenario_revenue_loss_percent || "",
        scenario_regulatory_fine: result.scenario_regulatory_fine || "",
        scenario_recovery_cost: result.scenario_recovery_cost || "",
        scenario_total_exposure: result.scenario_total_exposure || "",
        scenario_notes: result.scenario_notes || "",
        objective_mappings: result.objective_mappings || [],
      });

      toast.success("Financial impact estimates generated!");
    } catch (e) {
      toast.error("Generation failed. Please try again.");
    }
    setGenerating(false);
  };

  // Calculate total exposure from scenario-level fields if not set by AI
  const totalExposure = impact.scenario_total_exposure
    ? parseFloat(impact.scenario_total_exposure)
    : (parseFloat(impact.scenario_recovery_cost || 0) + parseFloat(impact.scenario_regulatory_fine || 0));

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">Financial Impact Mapping</h2>
        <p className="text-sm text-muted-foreground">
          Map red team objectives to quantified business impact — downtime costs, revenue loss, regulatory fines, and recovery costs.
        </p>
      </div>

      {/* Auto-generate button */}
      <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-5 py-4">
        <div>
          <p className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> AI-Powered Estimation
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">Generate industry-benchmark estimates based on your scenario and objectives</p>
        </div>
        <Button size="sm" onClick={handleAutoGenerate} disabled={generating} className="gap-1.5 bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 shrink-0">
          {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {generating ? "Estimating…" : "Auto-Estimate"}
        </Button>
      </div>

      {/* Scenario-level totals */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4">
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Scenario-Level Exposure</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {METRIC_TYPES.map(m => (
            <div key={m.key} className="space-y-1.5">
              <label className={`text-[10px] font-semibold uppercase tracking-wider flex items-center gap-1 ${m.color}`}>
                <m.icon className="h-3 w-3" /> {m.label}
              </label>
              <div className="relative">
                {m.prefix && <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{m.prefix}</span>}
                <input
                  type="number"
                  value={impact[`scenario_${m.key}`] || ""}
                  onChange={e => updateImpact({ [`scenario_${m.key}`]: e.target.value })}
                  placeholder={m.placeholder}
                  className={`w-full bg-secondary border border-border rounded-lg py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary ${m.prefix ? "pl-5 pr-3" : "px-3"}`}
                />
                {m.suffix && <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{m.suffix}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Total exposure summary */}
        {totalExposure > 0 && (
          <div className="flex items-center justify-between bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            <span className="text-xs font-semibold text-red-400">Estimated Total Exposure</span>
            <span className="text-lg font-bold text-red-400">{formatCurrency(totalExposure)}</span>
          </div>
        )}

        {impact.scenario_notes && (
          <div className="bg-secondary rounded-lg px-4 py-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">AI Rationale</p>
            <p className="text-xs text-foreground leading-relaxed">{impact.scenario_notes}</p>
          </div>
        )}
      </div>

      {/* Per-objective mappings */}
      {objectives.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Per-Objective Impact Mapping</p>
          {objectives.map((obj, i) => {
            const mapping = getMapping(i);
            return (
              <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <span className="h-5 w-5 rounded-full bg-red-500/20 border border-red-500/30 text-red-400 text-[10px] font-bold flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
                  <p className="text-sm text-foreground leading-snug flex-1">{obj}</p>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {METRIC_TYPES.map(m => (
                    <div key={m.key} className="space-y-1">
                      <label className={`text-[10px] font-medium flex items-center gap-1 ${m.color}`}>
                        <m.icon className="h-2.5 w-2.5" /> {m.label}
                        {m.suffix && <span className="text-muted-foreground">{m.suffix}</span>}
                      </label>
                      <div className="relative">
                        {m.prefix && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">{m.prefix}</span>}
                        <input
                          type="number"
                          value={mapping[m.key] || ""}
                          onChange={e => updateObjectiveMapping(i, m.key, e.target.value)}
                          placeholder="0"
                          className={`w-full bg-secondary border border-border rounded-md py-1.5 text-[11px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary ${m.prefix ? "pl-4 pr-2" : "px-2"}`}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                {mapping.rationale && (
                  <p className="text-[10px] text-muted-foreground italic leading-relaxed border-t border-border pt-2">{mapping.rationale}</p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {objectives.length === 0 && (
        <div className="text-center py-8 border border-dashed border-border rounded-xl">
          <TrendingDown className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">No red team objectives defined yet.</p>
          <p className="text-xs text-muted-foreground mt-1">Go back to Scenario Setup and generate objectives first, then return here to map financial impact.</p>
        </div>
      )}

      {/* Summary table */}
      {objectives.length > 0 && (impact.objective_mappings || []).some(m => m && Object.values(m).some(v => v)) && (
        <div className="bg-secondary border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-3 border-b border-border">
            <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Impact Summary</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left text-muted-foreground font-medium">Objective</th>
                  <th className="px-4 py-2 text-right text-orange-400 font-medium">Downtime/hr</th>
                  <th className="px-4 py-2 text-right text-red-400 font-medium">Rev. Loss</th>
                  <th className="px-4 py-2 text-right text-yellow-400 font-medium">Reg. Fine</th>
                  <th className="px-4 py-2 text-right text-blue-400 font-medium">Recovery</th>
                </tr>
              </thead>
              <tbody>
                {objectives.map((obj, i) => {
                  const m = getMapping(i);
                  return (
                    <tr key={i} className="border-b border-border/50 hover:bg-card transition-colors">
                      <td className="px-4 py-2.5 text-foreground max-w-[200px] truncate">{obj}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{formatCurrency(m.downtime_cost_per_hour)}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{m.revenue_loss_percent ? `${m.revenue_loss_percent}%` : "—"}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{formatCurrency(m.regulatory_fine)}</td>
                      <td className="px-4 py-2.5 text-right text-muted-foreground">{formatCurrency(m.recovery_cost)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}