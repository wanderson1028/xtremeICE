import React, { useState, useEffect, useRef } from "react";
import { Zap, AlertTriangle, Clock, Waves, Plus, Play, RotateCcw, ChevronDown, ChevronUp, Trash2, Power, Shuffle, Shield, ServerCrash, Timer, Percent, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/button";
import LinkFailureConfig from "@/components/diagram/LinkFailureConfig";
import BGPStateControl from "@/components/diagram/BGPStateControl";
import ScheduledEventBuilder from "@/components/diagram/ScheduledEventBuilder";
import AdvancedEventBuilder from "@/components/simulation/AdvancedEventBuilder";
import DeviceFailureScenarios from "@/components/simulation/DeviceFailureScenarios";
import CustomTrafficPattern from "@/components/simulation/CustomTrafficPattern";

const PRESET_SCENARIOS = [
  { id: "link_failure", label: "Link Failure", icon: AlertTriangle, color: "text-red-400", bg: "bg-red-500/10 border-red-500/30", description: "WAN or core link goes down", defaults: { targetType: "router", event: "link_failure", severity: "critical" } },
  { id: "device_reboot", label: "Device Reboot", icon: Power, color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30", description: "Force-reboot a router or switch", defaults: { targetType: "router", event: "device_reboot", severity: "critical" } },
  { id: "high_latency", label: "High Latency", icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", description: "Inject high RTT on a path (100–500ms)", defaults: { targetType: "any", event: "high_latency", severity: "warning" } },
  { id: "ddos", label: "DDoS Attack", icon: Waves, color: "text-red-500", bg: "bg-red-600/10 border-red-600/30", description: "Flood traffic toward firewall / internet edge", defaults: { targetType: "firewall", event: "ddos", severity: "critical" } },
  { id: "bandwidth_surge", label: "Bandwidth Surge", icon: Zap, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/30", description: "Heavy traffic burst on core switch", defaults: { targetType: "switch", event: "bandwidth_surge", severity: "warning" } },
  { id: "bgp_flap", label: "BGP Flap", icon: Shuffle, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30", description: "BGP neighbor resets, routes withdrawn", defaults: { targetType: "router", event: "bgp_flap", severity: "critical" } },
  { id: "firewall_breach", label: "Firewall Breach", icon: Shield, color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/30", description: "Unauthorized traffic bypasses firewall rules", defaults: { targetType: "firewall", event: "firewall_breach", severity: "critical" } },
  { id: "server_crash", label: "Server Crash", icon: ServerCrash, color: "text-red-300", bg: "bg-red-400/10 border-red-400/30", description: "Application server becomes unresponsive", defaults: { targetType: "server", event: "server_crash", severity: "critical" } },
];

const TRAFFIC_PATTERNS = [
  { id: "steady", label: "Steady" },
  { id: "bursty", label: "Bursty" },
  { id: "ramp_up", label: "Ramp-up" },
  { id: "sine", label: "Sinusoidal" },
];

const BGP_STATES = ["Idle", "Connect", "Active", "OpenSent", "OpenConfirm", "Established"];

const LINK_TYPES = ["WAN", "LAN", "HA", "DMZ", "Any"];

export default function SimulationControlPanel({ nodes = [], onRunScenario, onReset, running }) {
  const [expanded, setExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState("scenarios"); // "scenarios" | "failure" | "schedule" | "advanced" | "traffic"
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [trafficPattern, setTrafficPattern] = useState("steady");
  const [targetNode, setTargetNode] = useState("auto");
  const [customEvents, setCustomEvents] = useState([]);
  const [newEventLabel, setNewEventLabel] = useState("");
  
  // Advanced event control
  const [advancedEvents, setAdvancedEvents] = useState([]);
  
  // Device failure scenarios
  const [deviceFailures, setDeviceFailures] = useState([]);
  
  // Custom traffic patterns
  const [customTrafficPatterns, setCustomTrafficPatterns] = useState([]);

  // Failure injection state - per-link-type probabilities
  const [linkProbabilities, setLinkProbabilities] = useState({
    WAN: 30,
    LAN: 20,
    HA: 25,
    DMZ: 15,
  });
  const [bgpTargetState, setBgpTargetState] = useState("Idle");

  // Scheduled events state
  const [scheduledEvents, setScheduledEvents] = useState([]);
  const schedulerRef = useRef([]);

  // Clear scheduled timers on reset
  useEffect(() => {
    if (!running) {
      schedulerRef.current.forEach(t => clearTimeout(t));
      schedulerRef.current = [];
    }
  }, [running]);

  const handleResetControls = () => {
    // Clear all scheduled timers
    schedulerRef.current.forEach(t => { clearTimeout(t); clearInterval(t); });
    schedulerRef.current = [];
    setSelectedScenario(null);
    setTrafficPattern("steady");
    setTargetNode("auto");
    setCustomEvents([]);
    setNewEventLabel("");
    setAdvancedEvents([]);
    setDeviceFailures([]);
    setCustomTrafficPatterns([]);
    setLinkProbabilities({ WAN: 30, LAN: 20, HA: 25, DMZ: 15 });
    setBgpTargetState("Idle");
    setScheduledEvents([]);
    setActiveTab("scenarios");
    onReset();
  };

  const handleRun = () => {
    if (!selectedScenario) return;

    onRunScenario({
      scenario: selectedScenario,
      trafficPattern,
      targetNode,
      customEvents,
      linkProbabilities,
      bgpTargetState: selectedScenario.id === "bgp_flap" ? bgpTargetState : null,
    });

    // Fire scheduled events with granular failure injection
    scheduledEvents.forEach(ev => {
      const tid = setTimeout(() => {
        onRunScenario({
          scenario: selectedScenario,
          trafficPattern,
          targetNode,
          customEvents: [{ id: Date.now(), label: `[Scheduled] ${ev.label}` }],
          linkProbabilities,
          bgpTargetState: null,
        });
        if (ev.interval > 0) {
          const intervalId = setInterval(() => {
            onRunScenario({
              scenario: selectedScenario,
              trafficPattern,
              targetNode,
              customEvents: [{ id: Date.now(), label: `[Scheduled] ${ev.label}` }],
              linkProbabilities,
              bgpTargetState: null,
            });
          }, ev.interval * 1000);
          schedulerRef.current.push(intervalId);
        }
      }, ev.delay * 1000);
      schedulerRef.current.push(tid);
    });
  };

  const addCustomEvent = () => {
    if (!newEventLabel.trim()) return;
    setCustomEvents(prev => [...prev, { id: Date.now(), label: newEventLabel.trim() }]);
    setNewEventLabel("");
  };

  const routers = nodes.filter(n => ["router", "switch", "firewall", "server", "internet"].includes(n.type));

  const tabs = [
    { id: "scenarios", label: "Scenarios" },
    { id: "advanced", label: "Advanced Events" },
    { id: "devices", label: "Device Failures" },
    { id: "traffic", label: "Traffic Patterns" },
    { id: "failure", label: "Failure Logic" },
    { id: "schedule", label: "Schedule" },
  ];

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/50 transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          <span className="font-semibold text-sm text-foreground">Simulation Controls</span>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="border-t border-border">
          {/* Tabs */}
          <div className="flex border-b border-border">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`flex-1 py-2 text-xs font-medium transition-all
                  ${activeTab === t.id ? "text-primary border-b-2 border-primary" : "text-muted-foreground hover:text-foreground"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="px-5 pb-5 space-y-4">
            {/* ── SCENARIOS TAB ── */}
            {activeTab === "scenarios" && (
              <>
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Preset Events</p>
                  <div className="grid grid-cols-2 gap-2">
                    {PRESET_SCENARIOS.map(s => {
                      const Icon = s.icon;
                      const active = selectedScenario?.id === s.id;
                      return (
                        <button
                          key={s.id}
                          onClick={() => setSelectedScenario(active ? null : s)}
                          className={`flex flex-col items-start gap-1 rounded-lg border px-3 py-2.5 text-xs text-left transition-all
                            ${active ? s.bg + " " + s.color : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}
                        >
                          <div className="flex items-center gap-1.5 font-semibold">
                            <Icon className={`h-3.5 w-3.5 ${active ? s.color : ""}`} />
                            {s.label}
                          </div>
                          <span className="text-[10px] opacity-70 leading-tight">{s.description}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Traffic Pattern</p>
                  <div className="flex flex-wrap gap-1.5">
                    {TRAFFIC_PATTERNS.map(p => (
                      <button key={p.id} onClick={() => setTrafficPattern(p.id)}
                        className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all
                          ${trafficPattern === p.id ? "bg-primary/20 border-primary/50 text-primary" : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}>
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Target Device</p>
                  <select value={targetNode} onChange={e => setTargetNode(e.target.value)}
                    className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary">
                    <option value="auto">Auto (based on scenario)</option>
                    {routers.map(n => (
                      <option key={n.id} value={n.id}>{n.label.replace(/\n/g, " ")} ({n.type})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wider">Custom Events</p>
                  <div className="flex gap-2">
                    <input value={newEventLabel} onChange={e => setNewEventLabel(e.target.value)}
                      onKeyDown={e => e.key === "Enter" && addCustomEvent()}
                      placeholder="e.g. Interface flap on Gi0/1"
                      className="flex-1 bg-secondary border border-border rounded-lg px-3 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground" />
                    <button onClick={addCustomEvent} className="p-1.5 rounded-lg bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30 transition-colors">
                      <Plus className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {customEvents.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {customEvents.map(ev => (
                        <div key={ev.id} className="flex items-center justify-between rounded-md bg-secondary px-3 py-1.5 text-xs text-foreground">
                          <span>{ev.label}</span>
                          <button onClick={() => setCustomEvents(prev => prev.filter(e => e.id !== ev.id))} className="text-muted-foreground hover:text-red-400 transition-colors">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {/* ── ADVANCED EVENTS TAB ── */}
            {activeTab === "advanced" && (
              <div className="mt-4">
                <AdvancedEventBuilder
                  events={advancedEvents}
                  onAdd={ev => setAdvancedEvents(prev => [...prev, ev])}
                  onRemove={id => setAdvancedEvents(prev => prev.filter(e => e.id !== id))}
                />
              </div>
            )}

            {/* ── DEVICE FAILURES TAB ── */}
            {activeTab === "devices" && (
              <div className="mt-4">
                <DeviceFailureScenarios
                  scenarios={deviceFailures}
                  nodes={nodes}
                  onAdd={sc => setDeviceFailures(prev => [...prev, sc])}
                  onRemove={id => setDeviceFailures(prev => prev.filter(s => s.id !== id))}
                />
              </div>
            )}

            {/* ── TRAFFIC PATTERNS TAB ── */}
            {activeTab === "traffic" && (
              <div className="mt-4">
                <CustomTrafficPattern
                  patterns={customTrafficPatterns}
                  onAdd={p => setCustomTrafficPatterns(prev => [...prev, p])}
                  onRemove={id => setCustomTrafficPatterns(prev => prev.filter(p => p.id !== id))}
                />
              </div>
            )}

            {/* ── FAILURE LOGIC TAB ── */}
            {activeTab === "failure" && (
              <div className="mt-4 space-y-4">
                <LinkFailureConfig
                  linkProbabilities={linkProbabilities}
                  onUpdate={setLinkProbabilities}
                />
                <BGPStateControl
                  selectedState={bgpTargetState}
                  onSelect={setBgpTargetState}
                />
              </div>
            )}

            {/* ── SCHEDULE TAB ── */}
            {activeTab === "schedule" && (
              <div className="mt-4">
                <ScheduledEventBuilder
                  events={scheduledEvents}
                  onAdd={ev => setScheduledEvents(prev => [...prev, ev])}
                  onRemove={id => setScheduledEvents(prev => prev.filter(e => e.id !== id))}
                />
              </div>
            )}

            {/* Action buttons (always visible) */}
            <div className="flex gap-2 pt-1">
              <Button onClick={handleRun} disabled={!selectedScenario || running}
                className="flex-1 gap-2 text-xs h-8 bg-primary text-primary-foreground hover:bg-primary/90">
                <Play className="h-3.5 w-3.5" />
                {running ? "Running…" : "Run Scenario"}
              </Button>
              <Button onClick={handleResetControls} variant="outline" size="sm" className="gap-2 text-xs h-8">
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}