import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Zap, Activity } from "lucide-react";
import { toast } from "sonner";

const TRAFFIC_TYPES = [
  { id: "http", label: "HTTP/HTTPS Web Traffic", icon: "🌐", color: "bg-blue-500/10 border-blue-500/30 text-blue-400" },
  { id: "dns", label: "DNS Queries", icon: "📡", color: "bg-purple-500/10 border-purple-500/30 text-purple-400" },
  { id: "smb", label: "SMB File Sharing", icon: "📁", color: "bg-orange-500/10 border-orange-500/30 text-orange-400" },
  { id: "rtp", label: "VoIP / RTP", icon: "📞", color: "bg-green-500/10 border-green-500/30 text-green-400" },
  { id: "ldap", label: "LDAP / Directory Queries", icon: "🔐", color: "bg-red-500/10 border-red-500/30 text-red-400" },
  { id: "ntp", label: "NTP Time Sync", icon: "⏱️", color: "bg-cyan-500/10 border-cyan-500/30 text-cyan-400" },
  { id: "syslog", label: "Syslog Monitoring", icon: "📊", color: "bg-yellow-500/10 border-yellow-500/30 text-yellow-400" },
];

const INTENSITY_LEVELS = [
  { value: "light", label: "Light (10-25 Mbps)" },
  { value: "moderate", label: "Moderate (25-50 Mbps)" },
  { value: "heavy", label: "Heavy (50-100 Mbps)" },
  { value: "extreme", label: "Extreme (100+ Mbps)" },
];

export default function TrafficPatternBuilder({ patterns = [], onChange }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    type: "http",
    intensity: "moderate",
    source: "User-VLAN",
    destination: "Servers-VLAN",
  });

  const handleAddPattern = () => {
    if (!formData.type) {
      toast.error("Select a traffic type");
      return;
    }
    const newPattern = {
      id: Math.random().toString(36).slice(2),
      ...formData,
    };
    onChange([...patterns, newPattern]);
    setFormData({ type: "http", intensity: "moderate", source: "User-VLAN", destination: "Servers-VLAN" });
    setShowForm(false);
    toast.success("Traffic pattern added");
  };

  const handleRemove = (id) => {
    onChange(patterns.filter(p => p.id !== id));
  };

  const getTrafficLabel = (typeId) => TRAFFIC_TYPES.find(t => t.id === typeId)?.label || typeId;
  const getTrafficColor = (typeId) => TRAFFIC_TYPES.find(t => t.id === typeId)?.color || "";
  const getTrafficIcon = (typeId) => TRAFFIC_TYPES.find(t => t.id === typeId)?.icon || "📡";

  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <h3 className="text-sm font-bold text-foreground">Background Traffic Patterns</h3>
        </div>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="gap-1.5 h-8 text-xs bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30"
        >
          <Plus className="h-3 w-3" /> Add Pattern
        </Button>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed">
        Define background traffic to simulate realistic enterprise load during Red vs. Blue exercises.
      </p>

      {/* Add Pattern Form */}
      {showForm && (
        <div className="bg-secondary/30 border border-border/50 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase font-semibold block mb-1">Traffic Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full bg-card border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {TRAFFIC_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.icon} {t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase font-semibold block mb-1">Intensity</label>
              <select
                value={formData.intensity}
                onChange={(e) => setFormData({ ...formData, intensity: e.target.value })}
                className="w-full bg-card border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              >
                {INTENSITY_LEVELS.map(l => (
                  <option key={l.value} value={l.value}>{l.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-muted-foreground uppercase font-semibold block mb-1">Source</label>
              <input
                type="text"
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                placeholder="e.g., User-VLAN"
                className="w-full bg-card border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="text-[10px] text-muted-foreground uppercase font-semibold block mb-1">Destination</label>
              <input
                type="text"
                value={formData.destination}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
                placeholder="e.g., Servers-VLAN"
                className="w-full bg-card border border-border rounded-md px-2.5 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowForm(false)}
              className="h-7 text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleAddPattern}
              className="h-7 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Add Pattern
            </Button>
          </div>
        </div>
      )}

      {/* Traffic Patterns List */}
      <div className="space-y-2">
        {patterns.length === 0 ? (
          <div className="text-center py-4 text-xs text-muted-foreground border border-dashed border-border/50 rounded-lg">
            No traffic patterns defined yet. Click "Add Pattern" to start.
          </div>
        ) : (
          patterns.map(pattern => (
            <div
              key={pattern.id}
              className={`flex items-center justify-between px-3 py-2.5 rounded-lg border ${getTrafficColor(pattern.type)}`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-base">{getTrafficIcon(pattern.type)}</span>
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-foreground">{getTrafficLabel(pattern.type)}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {pattern.source} → {pattern.destination} • {INTENSITY_LEVELS.find(l => l.value === pattern.intensity)?.label}
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleRemove(pattern.id)}
                className="ml-2 p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded transition-colors shrink-0"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))
        )}
      </div>

      {patterns.length > 0 && (
        <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-start gap-2">
          <Zap className="h-4 w-4 text-primary shrink-0 mt-0.5" />
          <p className="text-xs text-foreground">
            <strong>{patterns.length} traffic pattern{patterns.length !== 1 ? 's' : ''} active.</strong> These will simulate realistic enterprise load and can be toggled on/off during exercises.
          </p>
        </div>
      )}
    </div>
  );
}