import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Trash2, Link as LinkIcon, Download, Loader2, Eye } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function EventSummaryPanel({ event, onBack, onEdit, onDelete, onLinkDesign }) {
  const navigate = useNavigate();
  const [showLinkDialog, setShowLinkDialog] = useState(false);
  const [selectedDesignId, setSelectedDesignId] = useState(event.network_design_id || "");
  const [saving, setSaving] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data: designs = [] } = useQuery({
    queryKey: ["designs-for-link"],
    queryFn: () => base44.entities.NetworkDesign.list("-created_date", 50),
  });

  const linkedDesign = designs.find(d => d.id === selectedDesignId);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const response = await base44.functions.invoke("generateCyberEventPDF", { eventData: event });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(event.title || "CyberEvent").replace(/\s+/g, "_")}_Scenario.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success("PDF downloaded!");
    } catch (e) {
      toast.error("Export failed");
      console.error(e);
    }
    setExporting(false);
  };

  const handleSaveDesignLink = async () => {
    setSaving(true);
    try {
      await base44.entities.CyberEvent.update(event.id, { network_design_id: selectedDesignId || null });
      onLinkDesign?.(selectedDesignId || null);
      setShowLinkDialog(false);
      toast.success(selectedDesignId ? "Design linked!" : "Design unlinked!");
    } catch (e) {
      toast.error("Failed to link design");
    }
    setSaving(false);
  };

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={onBack} className="gap-2 -ml-2 text-muted-foreground">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </div>
          <h2 className="text-2xl font-bold text-foreground truncate">{event.title || "Untitled Event"}</h2>
          <p className="text-sm text-muted-foreground mt-1">{event.description}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          {event.network_design_id && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/EventView/${event.id}`)}
              className="gap-2"
              title="View complete event with network"
            >
              <Eye className="h-4 w-4" /> View Event
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPDF}
            disabled={exporting}
            className="gap-2"
            title="Export scenario as PDF"
          >
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          </Button>
          <Button variant="outline" size="sm" onClick={() => onEdit(event)} className="gap-2">
            <Edit className="h-4 w-4" /> Edit
          </Button>
          <Button variant="outline" size="sm" onClick={() => onDelete(event.id)} className="gap-2 text-destructive hover:text-destructive">
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Metadata Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 py-4 border-b border-border">
        {[
          { label: "Difficulty", value: event.difficulty },
          { label: "Duration", value: `${event.duration_minutes} min` },
          { label: "Red Team", value: `${event.red_team_size} members` },
          { label: "Blue Team", value: `${event.blue_team_size} members` },
          { label: "Status", value: event.status },
          { label: "White Team", value: `${event.white_team_size} members` },
          { label: "Created", value: new Date(event.created_date).toLocaleDateString() },
          { label: "Flags", value: event.flags?.length || 0 },
        ].map((item, i) => (
          <div key={i} className="text-xs">
            <p className="text-muted-foreground font-medium uppercase tracking-wider mb-1">{item.label}</p>
            <p className="text-sm font-semibold text-foreground">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Description */}
      {event.description && (
        <div className="py-4 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Scenario Description</p>
          <p className="text-sm text-foreground leading-relaxed">{event.description}</p>
        </div>
      )}

      {/* Ingress Points Count */}
      {event.ingress_points?.length > 0 && (
        <div className="py-4 border-b border-border">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Access Points</p>
          <div className="space-y-2">
            {event.ingress_points.slice(0, 3).map((point, i) => (
              <div key={i} className="text-xs flex items-center gap-2">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary"></span>
                <span className="text-muted-foreground"><strong>{point.team.toUpperCase()}</strong> — {point.role} on {point.system}</span>
              </div>
            ))}
            {event.ingress_points.length > 3 && (
              <div className="text-xs text-muted-foreground italic">+ {event.ingress_points.length - 3} more access point{event.ingress_points.length - 3 !== 1 ? 's' : ''}</div>
            )}
          </div>
        </div>
      )}

      {/* Objectives Preview */}
      {(event.red_team_objectives?.length > 0 || event.blue_team_objectives?.length > 0) && (
        <div className="py-4 border-b border-border space-y-4">
          {event.red_team_objectives?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">🔴 Red Team Objectives</p>
              <ul className="space-y-1">
                {event.red_team_objectives.slice(0, 2).map((obj, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-red-400 shrink-0">•</span> <span className="line-clamp-1">{obj}</span>
                  </li>
                ))}
                {event.red_team_objectives.length > 2 && (
                  <p className="text-xs text-muted-foreground italic">+ {event.red_team_objectives.length - 2} more objective{event.red_team_objectives.length - 2 !== 1 ? 's' : ''}</p>
                )}
              </ul>
            </div>
          )}
          {event.blue_team_objectives?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2">🔵 Blue Team Objectives</p>
              <ul className="space-y-1">
                {event.blue_team_objectives.slice(0, 2).map((obj, i) => (
                  <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                    <span className="text-blue-400 shrink-0">•</span> <span className="line-clamp-1">{obj}</span>
                  </li>
                ))}
                {event.blue_team_objectives.length > 2 && (
                  <p className="text-xs text-muted-foreground italic">+ {event.blue_team_objectives.length - 2} more objective{event.blue_team_objectives.length - 2 !== 1 ? 's' : ''}</p>
                )}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Network Design Link */}
      <div className="bg-secondary rounded-lg p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Network Design</p>
            {linkedDesign ? (
              <div className="space-y-1">
                <p className="text-sm font-semibold text-foreground">{linkedDesign.name}</p>
                <p className="text-xs text-muted-foreground">{linkedDesign.company_name} • {linkedDesign.topology_type}</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground italic">No design linked yet</p>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowLinkDialog(!showLinkDialog)}
            className="gap-2 shrink-0"
          >
            <LinkIcon className="h-4 w-4" /> Link Design
          </Button>
        </div>

        {showLinkDialog && (
          <div className="mt-3 space-y-2 pt-3 border-t border-border">
            <select
              value={selectedDesignId}
              onChange={e => setSelectedDesignId(e.target.value)}
              className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">-- No Design --</option>
              {designs.map(d => (
                <option key={d.id} value={d.id}>{d.name} ({d.company_name})</option>
              ))}
            </select>
            <div className="flex gap-2">
              <Button
                size="sm"
                onClick={handleSaveDesignLink}
                disabled={saving}
                className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Save Link
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setShowLinkDialog(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Flags */}
      {(event.flags?.length > 0) && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">🚩 {event.flags.length} CTF Flags</p>
          <div className="grid gap-2">
            {event.flags.slice(0, 3).map((flag, i) => (
              <div key={i} className="flex items-center justify-between text-xs bg-secondary rounded px-3 py-2">
                <span className="font-semibold text-foreground">{flag.name}</span>
                <span className="text-primary font-bold">{flag.points} pts</span>
              </div>
            ))}
            {event.flags.length > 3 && (
              <p className="text-xs text-muted-foreground px-3">+ {event.flags.length - 3} more flags</p>
            )}
          </div>
        </div>
      )}

      {/* Directions Preview */}
      {event.red_team_directions && (
        <div className="bg-secondary rounded-lg p-4 max-h-32 overflow-y-auto">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wider mb-2">Red Team Directions</p>
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{event.red_team_directions}</p>
        </div>
      )}
    </div>
  );
}