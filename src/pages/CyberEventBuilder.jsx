import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Swords, Check, Save, Loader2, Plus, ChevronRight, Trash2 } from "lucide-react";
import ScenarioCatalogPDF from "@/components/cyberevents/ScenarioCatalogPDF";
import { toast } from "sonner";

import StepScenarioSetup from "@/components/cyberevents/StepScenarioSetup";
import StepIngressPoints from "@/components/cyberevents/StepIngressPoints";
import StepTeamDirections from "@/components/cyberevents/StepTeamDirections";
import StepReview from "@/components/cyberevents/StepReview";
import StepNetworkTopology from "@/components/cyberevents/StepNetworkTopology";
import StepExportBundle from "@/components/cyberevents/StepExportBundle";
import StepFinancialImpact from "@/components/cyberevents/StepFinancialImpact";
import EventSummaryPanel from "@/components/cyberevents/EventSummaryPanel";

// Phase 1: Build Scenario (sub-steps)
const SCENARIO_STEPS = [
  { id: "scenario", label: "Scenario Setup" },
  { id: "ingress", label: "Ingress Points" },
  { id: "directions", label: "Team Directions" },
  { id: "financial", label: "Financial Impact" },
  { id: "review", label: "Review" },
];

// Top-level phases
const PHASES = [
  { id: "scenario", label: "1. Build Scenario" },
  { id: "network", label: "2. Network Topology" },
  { id: "export", label: "3. Link & Export" },
];

const DEFAULT_DATA = {
  title: "",
  scenario_prompt: "",
  difficulty: "Intermediate",
  duration_minutes: 120,
  red_team_size: 2,
  blue_team_size: 2,
  white_team_size: 1,
  ingress_points: [],
  red_team_objectives: [],
  blue_team_objectives: [],
  white_team_objectives: [],
  red_team_directions: "",
  blue_team_directions: "",
  white_team_directions: "",
  rules_of_engagement: "",
  scoring_criteria: "",
  topology_summary: "",
  network_design_id: null,
  status: "draft",
};

export default function CyberEventBuilder() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isNewFromUrl = new URLSearchParams(window.location.search).get("new") === "true";

  const [phase, setPhase] = useState("scenario"); // "scenario" | "network" | "export"
  const [subStep, setSubStep] = useState(0); // within scenario phase
  const [eventData, setEventData] = useState(DEFAULT_DATA);
  const [savedEventId, setSavedEventId] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState(isNewFromUrl ? "edit" : null);

  useEffect(() => {
    if (isNewFromUrl) window.history.replaceState({}, "", window.location.pathname);
  }, []);

  const { data: savedEvents = [], isLoading: loadingEvents, refetch: refetchEvents } = useQuery({
    queryKey: ["cyber-events"],
    queryFn: () => base44.entities.CyberEvent.list("-created_date", 50),
  });

  // Restore state when returning from NetworkWizard or DiagramPreview
  useEffect(() => {
    const snapshot = sessionStorage.getItem("cyber_event_snapshot");
    if (snapshot) {
      try {
        const { eventData: restored, returnPhase } = JSON.parse(snapshot);
        sessionStorage.removeItem("cyber_event_snapshot");
        setEventData(prev => ({ ...prev, ...restored }));
        setPhase(returnPhase ?? "network");
        setViewMode("edit");
        return;
      } catch (_) {}
    }

    const returnDesignId = sessionStorage.getItem("cyber_event_linked_design_id");
    if (returnDesignId) {
      sessionStorage.removeItem("cyber_event_linked_design_id");
      const restoredEventId = sessionStorage.getItem("cyber_event_saved_id");
      if (restoredEventId) {
        sessionStorage.removeItem("cyber_event_saved_id");
        setSavedEventId(restoredEventId);
      }
      const savedSnapshot = sessionStorage.getItem("cyber_event_return_data");
      if (savedSnapshot) {
        try {
          const restored = JSON.parse(savedSnapshot);
          sessionStorage.removeItem("cyber_event_return_data");
          setEventData({ ...DEFAULT_DATA, ...restored, network_design_id: returnDesignId });
        } catch (_) {
          setEventData(prev => ({ ...prev, network_design_id: returnDesignId }));
        }
      } else {
        setEventData(prev => ({ ...prev, network_design_id: returnDesignId }));
      }
      setPhase("export");
      setViewMode("edit");
      toast.success("Network design linked! Proceed to Link & Export.");
    }
  }, []);

  const updateData = (patch) => setEventData(prev => ({ ...prev, ...patch }));

  const handleLoadEvent = (event) => {
    setEventData(event);
    setSavedEventId(event.id);
    setViewMode("summary");
  };

  const handleNewEvent = () => {
    setEventData(DEFAULT_DATA);
    setSavedEventId(null);
    setPhase("scenario");
    setSubStep(0);
    setViewMode("edit");
  };

  const handleEditEvent = (event) => {
    setEventData(event);
    setSavedEventId(event.id);
    setPhase("scenario");
    setSubStep(0);
    setViewMode("edit");
  };

  const handleBackToList = () => {
    setViewMode(null);
    refetchEvents();
  };

  const handleDeleteEvent = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Delete this event?")) return;
    await base44.entities.CyberEvent.delete(id);
    refetchEvents();
  };

  const handleGenerateScenario = async (overrides = {}) => {
    const prompt = overrides.scenario_prompt || eventData.scenario_prompt;
    const title = overrides.title || eventData.title;
    if (!prompt?.trim()) return;
    setGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert Cyber Range exercise designer, generating content for a multi-tenant Cyber Range platform consistent with NATO/NSPA Cyber Range standards and active defence exercise requirements.

Generate a complete Red Team vs Blue Team Cyber Range exercise package based on this scenario:

"${prompt}"

Exercise title: "${title}"

Exercise parameters:
- Difficulty: ${eventData.difficulty}
- Duration: ${eventData.duration_minutes} minutes
- Red Team Size: ${eventData.red_team_size} (MITRE ATT&CK Framework roles)
- Blue Team Size: ${eventData.blue_team_size} (NICE Cybersecurity Workforce Framework roles)

Language and terminology requirements:
- Use "Cyber Range exercise" or "live-fire exercise" throughout
- Red Team objectives should reflect MITRE ATT&CK attack scenario categories: initial access, lateral movement, persistence, C2, data exfiltration, ransomware deployment, ICS/SCADA attacks, zero-day exploitation, APT campaign techniques
- Blue Team objectives should reflect NICE Framework competencies: threat detection, incident response, digital forensics, malware analysis, log correlation (SIEM/LCE), threat hunting, vulnerability assessment
- White Team acts as Exercise Controller / Inject Operator / Scorekeeper — include inject scheduling, adjudication duties, and scoring oversight
- Directions should reference real Cyber Range tools and platforms (Metasploit, Nmap, Wazuh, Splunk, Zeek, Suricata, MISP, Arkime, Graylog, Cuckoo Sandbox, Elasticsearch)
- Rules of Engagement must specify what is permitted within the simulated network environment (e.g. no attacks on Cyber Range infrastructure, only within designated tenant environment)
- Scoring criteria should include CTF-style flag submission, blue team detection checkpoints, and incident response performance indicators

IMPORTANT: Write the 'description' field as an immersive operational scenario briefing placing participants inside the simulated environment. Use language such as "Your organisation's simulated network has just..." or "The Cyber Range exercise commences with..." or "It is 02:47 and your SOC's SIEM has triggered a Severity 1 alert...". Make it urgent, operationally realistic, and gripping — 2-4 sentences maximum.`,
        response_json_schema: {
          type: "object",
          properties: {
            description: { type: "string" },
            red_team_objectives: { type: "array", items: { type: "string" } },
            blue_team_objectives: { type: "array", items: { type: "string" } },
            white_team_objectives: { type: "array", items: { type: "string" } },
            red_team_directions: { type: "string" },
            blue_team_directions: { type: "string" },
            white_team_directions: { type: "string" },
            rules_of_engagement: { type: "string" },
            scoring_criteria: { type: "string" },
            topology_summary: { type: "string" },
          }
        }
      });

      updateData({
        description: result.description,
        red_team_objectives: result.red_team_objectives || [],
        blue_team_objectives: result.blue_team_objectives || [],
        white_team_objectives: result.white_team_objectives || [],
        red_team_directions: result.red_team_directions || "",
        blue_team_directions: result.blue_team_directions || "",
        white_team_directions: result.white_team_directions || "",
        rules_of_engagement: result.rules_of_engagement || "",
        scoring_criteria: result.scoring_criteria || "",
        topology_summary: result.topology_summary || "",
      });

      toast.success("Scenario generated! Review and customize each section.");
      setSubStep(1);
    } catch (e) {
      toast.error("Generation failed. Please try again.");
    }
    setGenerating(false);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (savedEventId) {
        await base44.entities.CyberEvent.update(savedEventId, eventData);
        toast.success("Event saved.");
      } else {
        const created = await base44.entities.CyberEvent.create(eventData);
        setSavedEventId(created.id);
        toast.success("Event created and saved.");
      }
    } catch (e) {
      toast.error("Save failed.");
    }
    setSaving(false);
  };

  const handlePublish = async () => {
    setSaving(true);
    const updated = { ...eventData, status: "published" };
    try {
      if (savedEventId) {
        await base44.entities.CyberEvent.update(savedEventId, updated);
      } else {
        const created = await base44.entities.CyberEvent.create(updated);
        setSavedEventId(created.id);
      }
      setEventData(updated);
      toast.success("Event published!");
    } catch (e) {
      toast.error("Publish failed.");
    }
    setSaving(false);
  };

  // ── Summary view ──────────────────────────────────────────────────────────────
  if (viewMode === "summary" && savedEventId) {
    const event = savedEvents.find(e => e.id === savedEventId);
    return (
      <div className="min-h-screen py-10 px-4 bg-gradient-to-br from-black via-gray-950 to-red-950/20">
        {/* Background glows */}
        <div className="fixed inset-0 pointer-events-none -z-10">
          <div className="absolute top-20 left-1/3 w-[600px] h-[500px] bg-red-900/8 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-[700px] h-[500px] bg-orange-900/8 rounded-full blur-3xl" />
        </div>
        <div className="max-w-3xl mx-auto relative z-10">
          <EventSummaryPanel
            event={event}
            onBack={handleBackToList}
            onEdit={handleEditEvent}
            onDelete={async (id) => {
              if (!confirm("Delete this event?")) return;
              await base44.entities.CyberEvent.delete(id);
              refetchEvents();
              handleBackToList();
            }}
            onLinkDesign={() => refetchEvents()}
          />
        </div>
      </div>
    );
  }

  // ── Edit view ─────────────────────────────────────────────────────────────────
  if (viewMode === "edit") {
    const phaseIndex = PHASES.findIndex(p => p.id === phase);

    return (
      <div className="min-h-screen py-10 px-4 bg-gradient-to-br from-black via-gray-950 to-red-950/20">
        {/* Background glows */}
        <div className="fixed inset-0 pointer-events-none -z-10">
          <div className="absolute top-0 left-1/4 w-[600px] h-[500px] bg-red-900/8 rounded-full blur-3xl" />
          <div className="absolute bottom-1/3 right-1/3 w-[700px] h-[500px] bg-orange-900/8 rounded-full blur-3xl" />
        </div>
        <div className="max-w-4xl mx-auto relative z-10">

          {/* Header */}
          <div className="flex items-center justify-between mb-8 flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground" onClick={handleBackToList}>
                <ArrowLeft className="h-4 w-4" /> All Events
              </Button>
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
                    <Swords className="h-4 w-4 text-red-400" />
                  </div>
                  <div>
                    <h1 className="text-lg font-bold bg-gradient-to-r from-red-400 via-orange-400 to-red-400 bg-clip-text text-transparent">Red vs. Blue Builder</h1>
                  <p className="text-xs text-muted-foreground">{eventData.title || "Untitled Event"}</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSave} disabled={saving} className="gap-2">
                {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                Save Draft
              </Button>
              {phase === "export" && (
                <Button size="sm" onClick={handlePublish} disabled={saving} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                  <Check className="h-3.5 w-3.5" /> Publish Event
                </Button>
              )}
            </div>
          </div>

          {/* Phase tabs */}
          <div className="flex items-center gap-2 mb-8">
            {PHASES.map((p, i) => (
              <React.Fragment key={p.id}>
                <button
                  onClick={() => { setPhase(p.id); if (p.id === "scenario") setSubStep(0); }}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all
                    ${phase === p.id
                      ? "bg-primary/20 border border-primary/40 text-primary"
                      : i < phaseIndex
                      ? "text-green-400 hover:bg-secondary border border-transparent"
                      : "text-muted-foreground hover:bg-secondary border border-transparent"
                    }`}
                >
                  <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0
                    ${phase === p.id ? "bg-primary text-primary-foreground" :
                    i < phaseIndex ? "bg-green-500/20 border border-green-500/40 text-green-400" :
                    "bg-secondary border border-border text-muted-foreground"}`}>
                    {i < phaseIndex ? <Check className="h-3 w-3" /> : i + 1}
                  </span>
                  {p.label}
                </button>
                {i < PHASES.length - 1 && (
                  <div className={`h-px w-8 shrink-0 ${i < phaseIndex ? "bg-green-500/40" : "bg-border"}`} />
                )}
              </React.Fragment>
            ))}
          </div>

          {/* ── Phase: Build Scenario ── */}
          {phase === "scenario" && (
            <>
              {/* Sub-step tabs */}
              <div className="flex items-center gap-0 mb-6 overflow-x-auto pb-1">
                {SCENARIO_STEPS.map((s, i) => (
                  <React.Fragment key={s.id}>
                    <button
                      onClick={() => setSubStep(i)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all
                        ${i === subStep ? "bg-primary/20 border border-primary/40 text-primary" :
                        i < subStep ? "text-green-400 hover:bg-secondary" : "text-muted-foreground hover:bg-secondary"}`}
                    >
                      <span className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0
                        ${i === subStep ? "bg-primary text-primary-foreground" :
                        i < subStep ? "bg-green-500/20 border border-green-500/40 text-green-400" :
                        "bg-secondary border border-border text-muted-foreground"}`}>
                        {i < subStep ? <Check className="h-3 w-3" /> : i + 1}
                      </span>
                      {s.label}
                    </button>
                    {i < SCENARIO_STEPS.length - 1 && (
                      <div className={`h-px w-5 shrink-0 mx-1 ${i < subStep ? "bg-green-500/40" : "bg-border"}`} />
                    )}
                  </React.Fragment>
                ))}
              </div>

              <div className="bg-card/70 border border-red-400/20 rounded-2xl p-6 mb-6 backdrop-blur-sm shadow-lg hover:border-red-400/40 transition-colors">
                 {subStep === 0 && <StepScenarioSetup data={eventData} onChange={updateData} onGenerate={handleGenerateScenario} generating={generating} onDocumentScanned={(patch) => { updateData(patch); setSubStep(2); }} />}
                 {subStep === 1 && <StepIngressPoints data={eventData} onChange={updateData} />}
                 {subStep === 2 && <StepTeamDirections data={eventData} onChange={updateData} />}
                 {subStep === 3 && <StepFinancialImpact data={eventData} onChange={updateData} />}
                 {subStep === 4 && <StepReview data={eventData} onChange={updateData} savedEventId={savedEventId} />}
               </div>

              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setSubStep(s => Math.max(0, s - 1))} disabled={subStep === 0} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Previous
                </Button>
                <span className="text-xs text-muted-foreground">Step {subStep + 1} of {SCENARIO_STEPS.length}</span>
                {subStep < SCENARIO_STEPS.length - 1 ? (
                  <Button onClick={() => setSubStep(s => s + 1)} className="gap-2">
                    Next <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={() => setPhase("network")} className="gap-2 bg-primary text-primary-foreground">
                    Next: Network Topology <ArrowRight className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </>
          )}

          {/* ── Phase: Network Topology ── */}
          {phase === "network" && (
            <>
              <div className="bg-card/70 border border-red-400/20 rounded-2xl p-6 mb-6 backdrop-blur-sm shadow-lg hover:border-red-400/40 transition-colors">
                <StepNetworkTopology data={eventData} onChange={updateData} savedEventId={savedEventId} />
              </div>
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setPhase("scenario")} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Back to Scenario
                </Button>
                <Button onClick={async () => { await handleSave(); setPhase("export"); }} className="gap-2 bg-primary text-primary-foreground">
                Next: Link & Export <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </>
          )}

          {/* ── Phase: Link & Export ── */}
          {phase === "export" && (
            <>
              <div className="bg-card/70 border border-red-400/20 rounded-2xl p-6 mb-6 backdrop-blur-sm shadow-lg hover:border-red-400/40 transition-colors">
                <StepExportBundle eventData={eventData} savedEventId={savedEventId} onSave={handleSave} />
              </div>
              <div className="flex items-center justify-between">
                <Button variant="outline" onClick={() => setPhase("network")} className="gap-2">
                  <ArrowLeft className="h-4 w-4" /> Back to Topology
                </Button>
                <Button onClick={handlePublish} disabled={saving} className="gap-2 bg-green-600 hover:bg-green-700 text-white">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  Publish Event
                </Button>
              </div>
            </>
          )}

        </div>
      </div>
    );
  }

  // ── Event list ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen py-10 px-4 bg-gradient-to-br from-black via-gray-950 to-red-950/20">
      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-0 left-1/4 w-[600px] h-[500px] bg-red-900/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-[700px] h-[500px] bg-orange-900/8 rounded-full blur-3xl" />
      </div>
      <div className="max-w-4xl mx-auto relative z-10">
        {/* Introduction Section */}
        <div className="mb-10 p-6 bg-gradient-to-br from-red-500/15 to-orange-500/10 border border-red-400/30 rounded-2xl hover:border-red-400/50 hover:shadow-lg transition-all">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0 mt-0.5">
              <Swords className="h-5 w-5 text-red-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground mb-2">What is a Red vs Blue Exercise?</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-3">
                A Red vs Blue (adversarial) cyber range exercise simulates realistic attacks and defenses. The <span className="text-red-400 font-medium">Red Team</span> acts as attackers executing MITRE ATT&CK techniques, while the <span className="text-blue-400 font-medium">Blue Team</span> detects and responds using defensive security practices. A <span className="font-medium text-muted-foreground">White Team</span> manages the exercise, injects events, and scores performance.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex gap-3">
                  <div className="text-lg">🎯</div>
                  <div>
                    <p className="font-medium text-sm text-foreground">Hands-On Learning</p>
                    <p className="text-xs text-muted-foreground">Develop real attack and defense skills in a safe environment.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="text-lg">🔴🔵</div>
                  <div>
                    <p className="font-medium text-sm text-foreground">Team Competition</p>
                    <p className="text-xs text-muted-foreground">Red attacks, Blue defends—measure success with scoring.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="text-lg">🛠️</div>
                  <div>
                    <p className="font-medium text-sm text-foreground">Customizable Scenarios</p>
                    <p className="text-xs text-muted-foreground">Design network topologies, objectives, and rules for any organization.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center">
              <Swords className="h-4 w-4 text-red-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-red-400 via-orange-400 to-red-400 bg-clip-text text-transparent">Red vs Blue Events</h1>
              <p className="text-muted-foreground text-sm mt-0.5">Your saved cyber exercise scenarios</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ScenarioCatalogPDF events={savedEvents} />
            <Button onClick={handleNewEvent} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4" /> New Event
            </Button>
          </div>
        </div>

        {loadingEvents ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : savedEvents.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-border rounded-2xl">
            <Swords className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">No events saved yet.</p>
            <p className="text-sm text-muted-foreground mt-1 mb-6">Create a new event to get started.</p>
            <Button onClick={handleNewEvent} className="gap-2">
              <Plus className="h-4 w-4" /> Create Your First Event
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {savedEvents.map(ev => (
              <div
                key={ev.id}
                onClick={() => handleLoadEvent(ev)}
                className="group bg-card/70 border border-red-400/20 rounded-xl px-5 py-4 flex items-center justify-between cursor-pointer hover:border-red-400/50 hover:shadow-lg hover:shadow-red-900/20 transition-all backdrop-blur-sm"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                    <Swords className="h-5 w-5 text-red-400" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground group-hover:text-red-400 transition-colors">{ev.title || "Untitled Event"}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {ev.difficulty && <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">{ev.difficulty}</span>}
                      {ev.duration_minutes && <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">{ev.duration_minutes} min</span>}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${ev.status === "published" ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-secondary border-border text-muted-foreground"}`}>{ev.status || "draft"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground hidden sm:block">{new Date(ev.created_date).toLocaleDateString()}</span>
                  <button onClick={e => handleDeleteEvent(e, ev.id)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all">
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-red-400 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}