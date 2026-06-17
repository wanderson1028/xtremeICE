import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit, Download, Loader2 } from "lucide-react";
import EventSummaryPanel from "@/components/cyberevents/EventSummaryPanel";
import NetworkTopologyPreview from "@/components/cyberevents/NetworkTopologyPreview";

export default function EventView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [exporting, setExporting] = useState(false);

  const { data: event, isLoading } = useQuery({
    queryKey: ["event-view", id],
    queryFn: () => base44.entities.CyberEvent.filter({ id }),
    select: (d) => d[0],
  });

  const { data: design } = useQuery({
    queryKey: ["event-design", event?.network_design_id],
    queryFn: () =>
      base44.entities.NetworkDesign.filter({ id: event.network_design_id }),
    select: (d) => d[0],
    enabled: !!event?.network_design_id,
  });

  const handleExport = async () => {
    setExporting(true);
    try {
      const response = await base44.functions.invoke("generateCompleteEventBundle", {
        eventData: event,
        designData: design,
      });
      const blob = new Blob([response.data], { type: "application/zip" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${(event.title || "CyberEvent").replace(/\s+/g, "_")}_Complete.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("Export failed:", e);
    }
    setExporting(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen py-10 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-muted-foreground mb-4">Event not found</p>
          <Button variant="outline" onClick={() => navigate("/CyberEventBuilder")}>
            Back to Events
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/CyberEventBuilder")}
            className="gap-2 text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Events
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/CyberEventBuilder?edit=${event.id}`)}
              className="gap-2"
            >
              <Edit className="h-4 w-4" /> Edit
            </Button>
            <Button
              onClick={handleExport}
              disabled={exporting || !design}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export Complete Event
            </Button>
          </div>
        </div>

        {/* Main content grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Scenario summary - left side */}
          <div className="lg:col-span-2">
            <EventSummaryPanel event={event} onBack={() => navigate("/CyberEventBuilder")} onEdit={() => {}} onDelete={() => {}} onLinkDesign={() => {}} />
          </div>

          {/* Network topology preview - right side */}
          <div className="lg:col-span-1">
            <NetworkTopologyPreview design={design} />
          </div>
        </div>

        {/* Full width sections */}
        {design && (
          <div className="bg-card border border-border rounded-xl p-6">
            <h2 className="text-lg font-bold text-foreground mb-4">Network Topology Details</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: "Design Name", value: design.name },
                { label: "Topology", value: design.topology_type },
                { label: "Routing", value: design.routing_protocol },
                { label: "WAN Tech", value: design.wan_technology },
                { label: "Sites", value: design.num_sites },
                { label: "Firewall", value: design.firewall_vendor || "None" },
                { label: "DMZ", value: design.dmz_required ? "Yes" : "No" },
                { label: "Servers", value: design.num_servers || 0 },
              ].map((item, i) => (
                <div key={i} className="space-y-1">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">
                    {item.label}
                  </p>
                  <p className="text-sm font-semibold text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {!design && (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-6 text-center">
            <p className="text-sm text-yellow-400 font-semibold mb-3">No Network Design Linked</p>
            <p className="text-xs text-muted-foreground mb-4">
              Link a network design to complete this event, or create a new one.
            </p>
            <Button variant="outline" onClick={() => navigate(`/CyberEventBuilder?edit=${event.id}`)}>
              Link Network Design
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}