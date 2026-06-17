import React, { useState } from "react";
import { Plus, Trash2, AlertTriangle, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

const FAILURE_MODES = [
  { id: "complete_outage", label: "Complete Outage", duration: "30-300s", impact: "critical" },
  { id: "degraded_performance", label: "Degraded Performance", duration: "60-600s", impact: "warning" },
  { id: "intermittent_drops", label: "Intermittent Drops", duration: "15-120s", impact: "warning" },
  { id: "cascading_failure", label: "Cascading Failure", duration: "20-180s", impact: "critical" },
  { id: "resource_exhaustion", label: "Resource Exhaustion", duration: "45-300s", impact: "critical" },
  { id: "connection_timeout", label: "Connection Timeout", duration: "10-60s", impact: "warning" },
];

export default function DeviceFailureScenarios({ scenarios = [], onAdd, onRemove, nodes = [] }) {
  const [selectedDevice, setSelectedDevice] = useState(nodes[0]?.id || "");
  const [failureMode, setFailureMode] = useState("complete_outage");
  const [mttr, setMttr] = useState(60); // Mean time to recovery in seconds
  const [cascadeChance, setCascadeChance] = useState(20);

  const handleAdd = () => {
    if (!selectedDevice) return;
    const device = nodes.find(n => n.id === selectedDevice);
    const mode = FAILURE_MODES.find(m => m.id === failureMode);
    
    onAdd({
      id: Date.now(),
      deviceId: selectedDevice,
      deviceLabel: device?.label || "Unknown",
      failureMode,
      modeLabel: mode?.label,
      impact: mode?.impact,
      mttr,
      cascadeChance,
    });
  };

  const activeDevices = nodes.filter(n => ["router", "switch", "firewall", "server"].includes(n.type));

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-2">
          Target Device
        </label>
        <select
          value={selectedDevice}
          onChange={(e) => setSelectedDevice(e.target.value)}
          className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">Select device...</option>
          {activeDevices.map(n => (
            <option key={n.id} value={n.id}>
              {n.label.replace(/\n/g, " ")} ({n.type})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-2">
          Failure Mode
        </label>
        <select
          value={failureMode}
          onChange={(e) => setFailureMode(e.target.value)}
          className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        >
          {FAILURE_MODES.map(fm => (
            <option key={fm.id} value={fm.id}>
              {fm.label} ({fm.duration})
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-2">
            MTTR: {mttr}s
          </label>
          <input
            type="range"
            min="5"
            max="600"
            value={mttr}
            onChange={(e) => setMttr(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground uppercase tracking-wider font-medium block mb-2">
            Cascade: {cascadeChance}%
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={cascadeChance}
            onChange={(e) => setCascadeChance(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      <Button
        onClick={handleAdd}
        disabled={!selectedDevice}
        className="w-full gap-2 text-xs h-8 bg-red-500/20 border border-red-500/40 text-red-400 hover:bg-red-500/30 disabled:opacity-50"
      >
        <AlertTriangle className="h-3 w-3" /> Add Failure
      </Button>

      {scenarios.length > 0 && (
        <div className="space-y-1.5">
          {scenarios.map(sc => (
            <div
              key={sc.id}
              className="flex items-center justify-between rounded-lg px-3 py-2 text-xs border bg-red-500/10 border-red-500/30"
            >
              <div>
                <div className="font-medium text-red-400">{sc.deviceLabel}</div>
                <div className="text-[10px] text-red-300 opacity-70">
                  {sc.modeLabel} • MTTR: {sc.mttr}s • Cascade: {sc.cascadeChance}%
                </div>
              </div>
              <button
                onClick={() => onRemove(sc.id)}
                className="text-red-400 hover:opacity-70 transition-opacity"
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