import React, { useState } from "react";
import { ChevronDown, ChevronUp, Swords, Shield, Target, Users } from "lucide-react";

export default function ExerciseBriefingPanel({ config, compact = false }) {
  const [open, setOpen] = useState(!compact);
  if (!config) return null;

  const teams = [
    { key: "red", label: "Red Team", color: "text-red-400", objectives: config.red_team_objectives || [] },
    { key: "blue", label: "Blue Team", color: "text-blue-400", objectives: config.blue_team_objectives || [] },
    { key: "white", label: "White Team", color: "text-gray-300", objectives: config.white_team_objectives || [] },
  ];

  return (
    <section className="rounded-xl border border-red-900/40 bg-gradient-to-r from-gray-950 to-red-950/20 text-white overflow-hidden">
      <button type="button" onClick={() => setOpen(v => !v)} className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.03]">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-red-500/15 border border-red-500/25 flex items-center justify-center"><Swords className="h-4 w-4 text-red-400" /></div>
          <div><p className="text-sm font-semibold">{config.title || "Red vs Blue Exercise"}</p><p className="text-xs text-gray-400">Linked scenario briefing · {(config.duration_minutes || 0)} min</p></div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
      </button>
      {open && (
        <div className="border-t border-gray-800 px-4 py-4 space-y-4">
          {config.description && <p className="text-sm leading-relaxed text-gray-300">{config.description}</p>}
          <div className="grid gap-3 md:grid-cols-3">
            {teams.map(team => (
              <div key={team.key} className="rounded-lg border border-gray-800 bg-black/20 p-3">
                <p className={`mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide ${team.color}`}><Users className="h-3.5 w-3.5" />{team.label} · {config.team_sizes?.[team.key] || config[`${team.key}_team_size`] || 0}</p>
                {team.objectives.slice(0, 3).map((objective, index) => <p key={index} className="mt-1.5 text-xs leading-relaxed text-gray-400">• {objective}</p>)}
                {!team.objectives.length && <p className="text-xs italic text-gray-600">No objectives configured</p>}
              </div>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {config.rules_of_engagement && <div className="rounded-lg bg-gray-900/70 p-3"><p className="mb-1 flex items-center gap-2 text-xs font-semibold text-gray-200"><Shield className="h-3.5 w-3.5" />Rules of Engagement</p><p className="text-xs leading-relaxed text-gray-400 line-clamp-4">{config.rules_of_engagement}</p></div>}
            {config.scoring_criteria && <div className="rounded-lg bg-gray-900/70 p-3"><p className="mb-1 flex items-center gap-2 text-xs font-semibold text-gray-200"><Target className="h-3.5 w-3.5" />Scoring Criteria</p><p className="text-xs leading-relaxed text-gray-400 line-clamp-4">{config.scoring_criteria}</p></div>}
          </div>
        </div>
      )}
    </section>
  );
}
