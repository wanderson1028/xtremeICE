import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";

const TEAM_CONFIG = {
  red: { label: "Red Team Directions", emoji: "🔴", border: "border-red-500/30", bg: "bg-red-500/5", headerBg: "bg-red-500/10 text-red-400", framework: "MITRE ATT&CK" },
  blue: { label: "Blue Team Directions", emoji: "🔵", border: "border-blue-500/30", bg: "bg-blue-500/5", headerBg: "bg-blue-500/10 text-blue-400", framework: "NICE Framework" },
  white: { label: "White Team / Controller Directions", emoji: "⚪", border: "border-gray-500/30", bg: "bg-gray-500/5", headerBg: "bg-gray-500/10 text-gray-300", framework: null },
};

function DirectionsPanel({ teamKey, directions, objectives, onChange, onObjectivesChange, scenarioPrompt }) {
  const cfg = TEAM_CONFIG[teamKey];
  const [generating, setGenerating] = useState(false);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const frameworkNote = teamKey === "red"
        ? "Use MITRE ATT&CK tactics and techniques (Initial Access, Execution, Persistence, Privilege Escalation, Defense Evasion, Credential Access, Discovery, Lateral Movement, Collection, C2, Exfiltration, Impact)."
        : teamKey === "blue"
        ? "Use NICE Cybersecurity Workforce Framework work roles and defensive best practices (detection, analysis, incident response, threat hunting, forensics)."
        : "From the White Team / Event Controller perspective: scoring, observation, adjudication.";

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a cyber exercise designer. Generate ${cfg.label} content for this scenario:

"${scenarioPrompt || "Generic cyber exercise"}"

${frameworkNote}

Provide:
1. 4-6 specific, actionable mission objectives for the ${teamKey} team
2. Detailed step-by-step directions (markdown format, realistic and specific)
3. Rules of engagement relevant to this team
4. Scoring criteria with point values for key actions`,
        response_json_schema: {
          type: "object",
          properties: {
            objectives: { type: "array", items: { type: "string" } },
            directions: { type: "string" },
            rules: { type: "string" },
            scoring: { type: "string" },
          }
        }
      });

      if (result.objectives) onObjectivesChange(result.objectives);
      if (result.directions) onChange(result.directions);
      toast.success(`${cfg.label} generated!`);
    } catch (e) {
      toast.error("Generation failed.");
    }
    setGenerating(false);
  };

  return (
    <div className={`border rounded-xl overflow-hidden ${cfg.border}`}>
      <div className={`px-5 py-3 font-semibold text-sm flex items-center justify-between ${cfg.headerBg}`}>
        <span className="flex items-center gap-2">
          <span>{cfg.emoji}</span> {cfg.label}
          {cfg.framework && <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/20 border border-white/10 font-normal opacity-80">{cfg.framework}</span>}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={handleGenerate}
          disabled={generating}
          className="h-6 gap-1 text-[10px] opacity-80 hover:opacity-100"
        >
          {generating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          {generating ? "Generating…" : "Auto-Generate"}
        </Button>
      </div>
      <div className={`p-5 space-y-4 ${cfg.bg}`}>
        {/* Objectives */}
        <div className="space-y-2">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Mission Objectives</label>
          {(objectives || []).map((obj, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-5 shrink-0">{i + 1}.</span>
              <input
                value={obj}
                onChange={e => {
                  const updated = [...objectives];
                  updated[i] = e.target.value;
                  onObjectivesChange(updated);
                }}
                className="flex-1 bg-secondary border border-border rounded-md px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <button onClick={() => onObjectivesChange(objectives.filter((_, j) => j !== i))} className="text-muted-foreground hover:text-destructive text-xs px-2">✕</button>
            </div>
          ))}
          <button onClick={() => onObjectivesChange([...(objectives || []), ""])} className="text-xs text-primary hover:text-primary/80 transition-colors">
            + Add objective
          </button>
        </div>

        {/* Directions */}
        <div className="space-y-2">
          <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Full Directions</label>
          <textarea
            value={directions || ""}
            onChange={e => onChange(e.target.value)}
            rows={8}
            className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none leading-relaxed"
            placeholder={`Detailed step-by-step directions for the ${cfg.label.split(" ")[0]} team… (Markdown supported)`}
          />
        </div>

        {directions && (
          <div className="bg-card border border-border rounded-lg p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Preview</p>
            <div className="prose prose-sm prose-invert max-w-none text-xs leading-relaxed">
              <ReactMarkdown>{directions}</ReactMarkdown>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function StepTeamDirections({ data, onChange }) {
  const [generatingRules, setGeneratingRules] = useState(false);
  const [generatingScoring, setGeneratingScoring] = useState(false);

  const generateRules = async () => {
    setGeneratingRules(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate realistic rules of engagement for this cyber exercise scenario: "${data.scenario_prompt || "Generic cyber exercise"}". Include: in-scope systems, out-of-scope systems, prohibited actions, emergency procedures, and escalation path. Return as plain text.`,
      });
      onChange({ rules_of_engagement: typeof result === "string" ? result : JSON.stringify(result) });
      toast.success("Rules of engagement generated!");
    } catch (e) { toast.error("Generation failed."); }
    setGeneratingRules(false);
  };

  const generateScoring = async () => {
    setGeneratingScoring(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate detailed scoring criteria for this cyber exercise: "${data.scenario_prompt || "Generic cyber exercise"}". Include: flag categories (Initial Access, Lateral Movement, Data Exfil, Detection, Containment, Recovery), point values per action (10–100 pts), bonus conditions, and penalties. Return as plain text with clear point values.`,
      });
      onChange({ scoring_criteria: typeof result === "string" ? result : JSON.stringify(result) });
      toast.success("Scoring criteria generated!");
    } catch (e) { toast.error("Generation failed."); }
    setGeneratingScoring(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">Team Directions</h2>
        <p className="text-sm text-muted-foreground">Review and edit AI-generated directions. Use "AI Generate" per-team or edit manually. Markdown is supported.</p>
      </div>

      {/* Rules of Engagement */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Rules of Engagement</label>
          <Button size="sm" variant="outline" onClick={generateRules} disabled={generatingRules} className="h-6 gap-1 text-[10px]">
            {generatingRules ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Auto-Generate
          </Button>
        </div>
        <textarea
          value={data.rules_of_engagement || ""}
          onChange={e => onChange({ rules_of_engagement: e.target.value })}
          rows={3}
          className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          placeholder="What is in/out of scope? What are the boundaries? What happens in case of emergency?"
        />
      </div>

      <DirectionsPanel
        teamKey="red"
        directions={data.red_team_directions}
        objectives={data.red_team_objectives}
        scenarioPrompt={data.scenario_prompt}
        onChange={v => onChange({ red_team_directions: v })}
        onObjectivesChange={v => onChange({ red_team_objectives: v })}
      />
      <DirectionsPanel
        teamKey="blue"
        directions={data.blue_team_directions}
        objectives={data.blue_team_objectives}
        scenarioPrompt={data.scenario_prompt}
        onChange={v => onChange({ blue_team_directions: v })}
        onObjectivesChange={v => onChange({ blue_team_objectives: v })}
      />
      <DirectionsPanel
        teamKey="white"
        directions={data.white_team_directions}
        objectives={data.white_team_objectives}
        scenarioPrompt={data.scenario_prompt}
        onChange={v => onChange({ white_team_directions: v })}
        onObjectivesChange={v => onChange({ white_team_objectives: v })}
      />

      {/* Scoring */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-foreground uppercase tracking-wider">Scoring Criteria</label>
          <Button size="sm" variant="outline" onClick={generateScoring} disabled={generatingScoring} className="h-6 gap-1 text-[10px]">
            {generatingScoring ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Auto-Generate
          </Button>
        </div>
        <textarea
          value={data.scoring_criteria || ""}
          onChange={e => onChange({ scoring_criteria: e.target.value })}
          rows={5}
          className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          placeholder="How will teams be scored? What flags exist? What are point values?"
        />
      </div>
    </div>
  );
}