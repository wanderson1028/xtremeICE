import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, AlertCircle, Network, Users, Shield, FileText, ExternalLink, Flag, Plus, Trash2, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

// ── Inline fix panels ──────────────────────────────────────────────────────────

function FixScenario({ data, onChange, onDone }) {
  return (
    <div className="space-y-3 bg-secondary/60 border border-primary/30 rounded-xl p-4 mt-3">
      <p className="text-xs font-semibold text-primary uppercase tracking-wider">Fix: Scenario Title & Description</p>
      <div className="space-y-2">
        <input
          value={data.title || ""}
          onChange={e => onChange({ title: e.target.value })}
          placeholder="Event title…"
          className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <textarea
          value={data.scenario_prompt || ""}
          onChange={e => onChange({ scenario_prompt: e.target.value })}
          placeholder="Scenario description / prompt…"
          rows={3}
          className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      </div>
      <Button size="sm" onClick={onDone} className="bg-primary text-primary-foreground hover:bg-primary/90">Done</Button>
    </div>
  );
}

function FixIngress({ data, onChange, onDone }) {
  const addPoint = () => {
    onChange({ ingress_points: [...(data.ingress_points || []), { team: "red", role: "", system: "", ip: "", credentials: "", description: "" }] });
  };
  const update = (i, field, val) => {
    const updated = [...data.ingress_points];
    updated[i] = { ...updated[i], [field]: val };
    onChange({ ingress_points: updated });
  };
  const remove = (i) => onChange({ ingress_points: data.ingress_points.filter((_, idx) => idx !== i) });

  return (
    <div className="space-y-3 bg-secondary/60 border border-primary/30 rounded-xl p-4 mt-3">
      <p className="text-xs font-semibold text-primary uppercase tracking-wider">Fix: Ingress Points</p>
      {(data.ingress_points || []).map((p, i) => (
        <div key={i} className="grid grid-cols-2 gap-2 bg-card border border-border rounded-lg p-3 relative">
          <button onClick={() => remove(i)} className="absolute top-2 right-2 text-muted-foreground hover:text-destructive"><X className="h-3.5 w-3.5" /></button>
          <select value={p.team} onChange={e => update(i, "team", e.target.value)} className="bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none">
            <option value="red">🔴 Red</option>
            <option value="blue">🔵 Blue</option>
            <option value="white">⚪ White</option>
          </select>
          <input value={p.role} onChange={e => update(i, "role", e.target.value)} placeholder="Role" className="bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none" />
          <input value={p.system} onChange={e => update(i, "system", e.target.value)} placeholder="System / Host" className="bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none" />
          <input value={p.ip} onChange={e => update(i, "ip", e.target.value)} placeholder="IP Address" className="bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground font-mono placeholder:text-muted-foreground focus:outline-none" />
          <input value={p.credentials || ""} onChange={e => update(i, "credentials", e.target.value)} placeholder="Credentials" className="bg-secondary border border-border rounded px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none col-span-2" />
        </div>
      ))}
      <button onClick={addPoint} className="flex items-center gap-1.5 text-xs text-primary font-medium"><Plus className="h-3.5 w-3.5" /> Add Ingress Point</button>
      <Button size="sm" onClick={onDone} className="bg-primary text-primary-foreground hover:bg-primary/90">Done</Button>
    </div>
  );
}

function FixTeamDirections({ data, onChange, onDone }) {
  return (
    <div className="space-y-3 bg-secondary/60 border border-primary/30 rounded-xl p-4 mt-3">
      <p className="text-xs font-semibold text-primary uppercase tracking-wider">Fix: Team Directions & Rules</p>
      <div className="space-y-2">
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Red Team Directions</label>
        <textarea value={data.red_team_directions || ""} onChange={e => onChange({ red_team_directions: e.target.value })} rows={3} className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" placeholder="Red team step-by-step directions…" />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Blue Team Directions</label>
        <textarea value={data.blue_team_directions || ""} onChange={e => onChange({ blue_team_directions: e.target.value })} rows={3} className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" placeholder="Blue team step-by-step directions…" />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Rules of Engagement</label>
        <textarea value={data.rules_of_engagement || ""} onChange={e => onChange({ rules_of_engagement: e.target.value })} rows={2} className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" placeholder="Rules of engagement…" />
      </div>
      <div className="space-y-2">
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Scoring Criteria</label>
        <textarea value={data.scoring_criteria || ""} onChange={e => onChange({ scoring_criteria: e.target.value })} rows={2} className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none" placeholder="Scoring criteria…" />
      </div>
      <Button size="sm" onClick={onDone} className="bg-primary text-primary-foreground hover:bg-primary/90">Done</Button>
    </div>
  );
}

function FixNetworkDesign({ data, savedEventId, onChange, onDone, navigate }) {
  const { data: allDesigns = [] } = useQuery({
    queryKey: ["designs-fix-panel"],
    queryFn: () => base44.entities.NetworkDesign.list("-created_date", 50),
  });

  return (
    <div className="space-y-3 bg-secondary/60 border border-primary/30 rounded-xl p-4 mt-3">
      <p className="text-xs font-semibold text-primary uppercase tracking-wider">Fix: Network Design</p>
      <div className="space-y-2">
        <label className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Select Existing Design</label>
        <select
          value={data.network_design_id || ""}
          onChange={e => onChange({ network_design_id: e.target.value || null })}
          className="w-full bg-card border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">-- Select a design --</option>
          {allDesigns.map(d => (
            <option key={d.id} value={d.id}>{d.name}{d.company_name ? ` — ${d.company_name}` : ""}</option>
          ))}
        </select>
      </div>
      <p className="text-[10px] text-muted-foreground">— or —</p>
      <Button size="sm" variant="outline" onClick={() => {
        const { _recommended_network, ...dataToStore } = data;
        sessionStorage.setItem("cyber_event_return_data", JSON.stringify(dataToStore));
        if (savedEventId) sessionStorage.setItem("cyber_event_saved_id", savedEventId);
        navigate("/NetworkWizard");
      }} className="gap-2 text-xs">
        <Plus className="h-3.5 w-3.5" /> Create New Network Design
      </Button>
      <div className="flex gap-2 pt-1">
        <Button size="sm" onClick={onDone} className="bg-primary text-primary-foreground hover:bg-primary/90">Done</Button>
      </div>
    </div>
  );
}

// ── Shared components ──────────────────────────────────────────────────────────

function Section({ title, icon: SectionIcon, color = "text-primary", children, complete }) {
  const Icon = SectionIcon;
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-secondary/40">
        <div className="flex items-center gap-2">
          <Icon className={`h-4 w-4 ${color}`} />
          <span className="text-sm font-semibold text-foreground">{title}</span>
        </div>
        {complete
          ? <CheckCircle2 className="h-4 w-4 text-green-400" />
          : <AlertCircle className="h-4 w-4 text-yellow-400" />}
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

function TeamCard({ emoji, label, color, borderColor, objectives, directions, ingress }) {
  return (
    <div className={`rounded-xl border p-4 space-y-3 ${borderColor}`}>
      <h4 className={`text-sm font-bold flex items-center gap-2 ${color}`}>{emoji} {label}</h4>
      {objectives?.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Objectives</p>
          <ul className="space-y-1">
            {objectives.map((o, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-foreground">
                <span className={`shrink-0 mt-0.5 font-bold ${color}`}>{i + 1}.</span> {o}
              </li>
            ))}
          </ul>
        </div>
      )}
      {ingress?.length > 0 && (
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Ingress Points</p>
          {ingress.map((p, i) => (
            <div key={i} className="text-[10px] text-muted-foreground bg-secondary/50 rounded px-2 py-1 mb-1 font-mono">
              [{p.role}] {p.system} — {p.ip}
            </div>
          ))}
        </div>
      )}
      {directions && (
        <div>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Directions Preview</p>
          <div className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
            {directions.replace(/#{1,6}\s/g, "").slice(0, 300)}{directions.length > 300 ? "…" : ""}
          </div>
        </div>
      )}
    </div>
  );
}

function FlagsEditor({ flags, onChange }) {
  const addFlag = () => {
    onChange([...(flags || []), { name: "", team: "white", points: 100, description: "" }]);
  };
  const updateFlag = (i, field, value) => {
    const updated = [...flags];
    updated[i] = { ...updated[i], [field]: field === "points" ? Number(value) : value };
    onChange(updated);
  };
  const removeFlag = (i) => onChange(flags.filter((_, idx) => idx !== i));

  return (
    <div className="space-y-3">
      {(flags || []).map((flag, i) => (
        <div key={i} className="bg-secondary border border-border rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Flag #{i + 1}</span>
            <button onClick={() => removeFlag(i)} className="text-muted-foreground hover:text-destructive">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">Flag Name</label>
              <input value={flag.name} onChange={e => updateFlag(i, "name", e.target.value)} placeholder="e.g. FLAG{root_access}" className="w-full bg-card border border-border rounded px-2 py-1 text-xs text-foreground font-mono placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">Points</label>
              <input type="number" value={flag.points} onChange={e => updateFlag(i, "points", e.target.value)} className="w-full bg-card border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">Held By</label>
              <select value={flag.team} onChange={e => updateFlag(i, "team", e.target.value)} className="w-full bg-card border border-border rounded px-2 py-1 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                <option value="white">⚪ White Team (holds)</option>
                <option value="red">🔴 Red Team (captures)</option>
                <option value="blue">🔵 Blue Team (defends)</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-muted-foreground">Description</label>
              <input value={flag.description} onChange={e => updateFlag(i, "description", e.target.value)} placeholder="Where/how to find this flag" className="w-full bg-card border border-border rounded px-2 py-1 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary" />
            </div>
          </div>
        </div>
      ))}
      <button onClick={addFlag} className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium">
        <Plus className="h-3.5 w-3.5" /> Add Flag
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function StepReview({ data, onChange, onGoToStep, savedEventId }) {
  const navigate = useNavigate();
  // Which inline fix panel is open: null | "scenario" | "ingress" | "directions" | "network"
  const [openFix, setOpenFix] = useState(null);

  const { data: design } = useQuery({
    queryKey: ["design-review", data.network_design_id],
    queryFn: () => base44.entities.NetworkDesign.filter({ id: data.network_design_id }),
    select: d => d[0],
    enabled: !!data.network_design_id,
  });

  // Map check → which fix panel to open
  const getFixKey = (step, label) => {
    if (label.includes("Scenario")) return "scenario";
    if (label.includes("Ingress")) return "ingress";
    if (label.includes("team directions") || label.includes("Rules") || label.includes("Scoring")) return "directions";
    if (label.includes("Network")) return "network";
    return null;
  };

  const checks = [
    { label: "Scenario title & description", ok: !!(data.title && data.scenario_prompt), fixKey: "scenario" },
    { label: "Ingress points defined", ok: (data.ingress_points || []).length > 0, fixKey: "ingress" },
    { label: "Red team directions", ok: !!(data.red_team_directions && data.red_team_objectives?.length), fixKey: "directions" },
    { label: "Blue team directions", ok: !!(data.blue_team_directions && data.blue_team_objectives?.length), fixKey: "directions" },
    { label: "Rules of engagement", ok: !!data.rules_of_engagement, fixKey: "directions" },
    { label: "Scoring criteria", ok: !!data.scoring_criteria, fixKey: "directions" },
    { label: "Network design linked", ok: !!data.network_design_id, fixKey: "network" },
  ];

  const score = checks.filter(c => c.ok).length;
  const allGood = score === checks.length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">Event Review</h2>
        <p className="text-sm text-muted-foreground">Review all components before exporting. Fix any incomplete sections inline.</p>
      </div>

      {/* Completeness score */}
      <div className={`rounded-xl border p-5 ${allGood ? "border-green-500/30 bg-green-500/5" : "border-yellow-500/30 bg-yellow-500/5"}`}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-foreground">Event Completeness</p>
          <span className={`text-sm font-bold ${allGood ? "text-green-400" : "text-yellow-400"}`}>{score}/{checks.length}</span>
        </div>
        <div className="w-full bg-secondary rounded-full h-2 mb-4 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${allGood ? "bg-green-500" : "bg-yellow-400"}`}
            style={{ width: `${(score / checks.length) * 100}%` }}
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {checks.map((c, i) => (
            <div key={i} className="flex items-center gap-2">
              {c.ok
                ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
                : <AlertCircle className="h-3.5 w-3.5 text-yellow-400 shrink-0" />}
              <span className="text-xs text-foreground flex-1">{c.label}</span>
              {!c.ok && (
                <button
                  onClick={() => setOpenFix(prev => prev === c.fixKey ? null : c.fixKey)}
                  className="text-[10px] text-primary hover:underline shrink-0 flex items-center gap-0.5"
                >
                  Fix {openFix === c.fixKey ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Inline fix panels */}
        {openFix === "scenario" && (
          <FixScenario data={data} onChange={onChange} onDone={() => setOpenFix(null)} />
        )}
        {openFix === "ingress" && (
          <FixIngress data={data} onChange={onChange} onDone={() => setOpenFix(null)} />
        )}
        {openFix === "directions" && (
          <FixTeamDirections data={data} onChange={onChange} onDone={() => setOpenFix(null)} />
        )}
        {openFix === "network" && (
          <FixNetworkDesign data={data} savedEventId={savedEventId} onChange={onChange} onDone={() => setOpenFix(null)} navigate={navigate} />
        )}
      </div>

      {/* Overview */}
      <Section title="Scenario Overview" icon={FileText} complete={!!(data.title && data.scenario_prompt)}>
        <div className="space-y-2">
          <p className="text-base font-bold text-foreground">{data.title || "Untitled"}</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{data.scenario_prompt}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            {[
              { label: "Difficulty", value: data.difficulty },
              { label: "Duration", value: `${data.duration_minutes} min` },
              { label: "Red Team", value: `${data.red_team_size} members` },
              { label: "Blue Team", value: `${data.blue_team_size} members` },
            ].map(item => (
              <span key={item.label} className="text-[10px] px-2 py-1 rounded-full bg-secondary border border-border text-muted-foreground">
                {item.label}: <strong className="text-foreground">{item.value}</strong>
              </span>
            ))}
          </div>
        </div>
      </Section>

      {/* Teams */}
      <Section title="Teams" icon={Users} complete={(data.ingress_points || []).length > 0 && !!data.red_team_directions && !!data.blue_team_directions}>
        <div className="space-y-4">
          <TeamCard emoji="🔴" label="Red Team (MITRE ATT&CK)" color="text-red-400" borderColor="border-red-500/20 bg-red-500/5" objectives={data.red_team_objectives} directions={data.red_team_directions} ingress={(data.ingress_points || []).filter(p => p.team === "red")} />
          <TeamCard emoji="🔵" label="Blue Team (NICE Framework)" color="text-blue-400" borderColor="border-blue-500/20 bg-blue-500/5" objectives={data.blue_team_objectives} directions={data.blue_team_directions} ingress={(data.ingress_points || []).filter(p => p.team === "blue")} />
          <TeamCard emoji="⚪" label="White Team" color="text-gray-300" borderColor="border-gray-500/20 bg-gray-500/5" objectives={data.white_team_objectives} directions={data.white_team_directions} ingress={(data.ingress_points || []).filter(p => p.team === "white")} />
        </div>
      </Section>

      {/* Rules & Scoring */}
      <Section title="Rules & Scoring" icon={Shield} complete={!!(data.rules_of_engagement && data.scoring_criteria)}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Rules of Engagement</p>
            <p className="text-xs text-foreground leading-relaxed line-clamp-4">{data.rules_of_engagement || <span className="italic text-muted-foreground">Not defined</span>}</p>
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 font-semibold">Scoring Criteria</p>
            <p className="text-xs text-foreground leading-relaxed line-clamp-4">{data.scoring_criteria || <span className="italic text-muted-foreground">Not defined</span>}</p>
          </div>
        </div>
      </Section>

      {/* Flags */}
      <Section title="Event Flags (White Team)" icon={Flag} color="text-gray-300" complete={(data.flags || []).length > 0}>
        <FlagsEditor flags={data.flags || []} onChange={v => onChange({ flags: v })} />
        {(data.flags || []).length > 0 && (
          <div className="mt-3 pt-3 border-t border-border">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2 font-semibold">Flag Summary</p>
            <div className="flex flex-wrap gap-2">
              {data.flags.map((f, i) => (
                <span key={i} className="text-[10px] px-2 py-1 rounded bg-secondary border border-border text-foreground font-mono">
                  {f.name || `Flag #${i + 1}`} — {f.points}pts
                  <span className="ml-1 text-muted-foreground">({f.team})</span>
                </span>
              ))}
            </div>
          </div>
        )}
      </Section>

      {/* Network */}
      <Section title="Network Topology" icon={Network} complete={!!data.network_design_id}>
        {data.topology_summary && (
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">{data.topology_summary}</p>
        )}
        {design ? (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-foreground">{design.name}</p>
            <div className="flex flex-wrap gap-2">
              {[design.topology_type, design.routing_protocol, design.wan_technology, `${design.num_sites} site(s)`]
                .filter(Boolean).map(v => (
                  <span key={v} className="text-[10px] px-2 py-0.5 rounded bg-secondary border border-border text-muted-foreground">{v}</span>
                ))}
              {design.firewall_enabled && <span className="text-[10px] px-2 py-0.5 rounded bg-secondary border border-border text-muted-foreground">Firewall: {design.firewall_vendor}</span>}
              {design.dmz_required && <span className="text-[10px] px-2 py-0.5 rounded bg-secondary border border-border text-muted-foreground">DMZ</span>}
            </div>
            <Button
              size="sm" variant="outline"
              className="gap-1.5 text-xs h-7 mt-2"
              onClick={() => {
                // Save current event state so we can restore it when returning
                sessionStorage.setItem("cyber_event_snapshot", JSON.stringify({ eventData: { ...data }, returnStep: 4 }));
                navigate(`/DiagramPreview?id=${design.id}&returnTo=CyberEventBuilder`);
              }}
            >
              <ExternalLink className="h-3 w-3" /> View Diagram
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2 text-xs text-yellow-400">
            <AlertCircle className="h-3.5 w-3.5" />
            No network design linked yet. Use the "Fix" button above to link one.
          </div>
        )}
      </Section>
    </div>
  );
}