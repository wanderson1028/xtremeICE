import React, { useState } from "react";
import { Plus, Trash2, AlertTriangle, Clock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const EVENT_TYPES = [
  { id: "interface_flap", label: "Interface Flap", severity: "warning", duration: "5-30s" },
  { id: "cpu_spike", label: "CPU Spike", severity: "warning", duration: "10-60s" },
  { id: "memory_leak", label: "Memory Leak", severity: "critical", duration: "30-120s" },
  { id: "config_change", label: "Config Change", severity: "info", duration: "instant" },
  { id: "qos_drop", label: "QoS Drop", severity: "warning", duration: "5-120s" },
  { id: "routing_loop", label: "Routing Loop", severity: "critical", duration: "15-60s" },
  { id: "dns_failure", label: "DNS Failure", severity: "critical", duration: "10-300s" },
  { id: "ntp_sync_loss", label: "NTP Sync Loss", severity: "warning", duration: "20-180s" },
];

export default function AdvancedEventBuilder({ events = [], onAdd, onRemove }) {
  const [selectedType, setSelectedType] = useState("interface_flap");
  const [intensity, setIntensity] = useState(50);
  const [probability, setProbability] = useState(30);

  const handleAdd = () => {
    const eventType = EVENT_TYPES.find(e => e.id === selectedType);
    onAdd({
      id: Date.now(),
      type: selectedType,
      label: eventType.label,
      severity: eventType.severity,
      intensity,
      probability,
      duration: eventType.duration,
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-2">
          Event Type
        </label>
        <select
          value={selectedType}
          onChange={(e) => setSelectedType(e.target.value)}
          className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {EVENT_TYPES.map(et => (
            <option key={et.id} value={et.id}>{et.label} ({et.severity})</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-2">
            Intensity: {intensity}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-2">
            Probability: {probability}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={probability}
            onChange={(e) => setProbability(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      <Button
        onClick={handleAdd}
        className="w-full gap-2 text-xs h-8 bg-primary/20 border border-primary/40 text-primary hover:bg-primary/30"
      >
        <Plus className="h-3 w-3" /> Add Event
      </Button>

      {events.length > 0 && (
        <div className="space-y-1.5">
          {events.map(ev => (
            <div
              key={ev.id}
              className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs border
                ${ev.severity === "critical"
                  ? "bg-red-500/10 border-red-500/30 text-red-400"
                  : ev.severity === "warning"
                  ? "bg-yellow-500/10 border-yellow-500/30 text-yellow-400"
                  : "bg-blue-500/10 border-blue-500/30 text-blue-400"
                }`}
            >
              <div className="flex items-center gap-2">
                <Zap className="h-3 w-3" />
                <div>
                  <div className="font-medium">{ev.label}</div>
                  <div className="text-[10px] opacity-70">
                    Intensity: {ev.intensity}% | Prob: {ev.probability}%
                  </div>
                </div>
              </div>
              <button
                onClick={() => onRemove(ev.id)}
                className="text-current hover:opacity-70 transition-opacity"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}