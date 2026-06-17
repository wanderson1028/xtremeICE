import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Network, Plus, ExternalLink, LinkIcon, ChevronLeft } from "lucide-react";

const STATUS_COLORS = {
  draft:     "bg-gray-700 text-gray-300",
  reviewed:  "bg-blue-900/50 text-blue-300",
  previewed: "bg-yellow-900/50 text-yellow-300",
  generated: "bg-green-900/50 text-green-300",
};

export default function NetworkLabDesigner() {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState("");

  const { data: designs = [], isLoading: loadingDesigns } = useQuery({
    queryKey: ["network-designs-lab"],
    queryFn: () => base44.entities.NetworkDesign.list("-updated_date", 50),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["lab-templates-published"],
    queryFn: () => base44.entities.LabTemplate.list(),
  });

  const handleLink = async (designId) => {
    if (!selectedTemplate) return;
    await base44.entities.LabTemplate.update(selectedTemplate, { network_topology: { design_id: designId } });
    setSelectedTemplate("");
    alert("Network design linked to lab template!");
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-6xl mx-auto">
        <Link to="/LabBuilderDashboard" className="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-5 transition-colors">
          <ChevronLeft className="h-4 w-4" /> Course Lab Builder
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Network Lab Designer</h1>
            <p className="text-gray-400 text-sm mt-0.5">Associate network topologies with lab templates</p>
          </div>
          <Link to="/NetworkWizard">
            <Button className="bg-red-700 hover:bg-red-600 text-white">
              <Plus className="h-4 w-4 mr-2" /> New Network Design
            </Button>
          </Link>
        </div>

        {/* Link to template helper */}
        <div className="bg-gray-900 border border-red-900/20 rounded-xl p-4 mb-6 flex flex-wrap items-center gap-3">
          <LinkIcon className="h-4 w-4 text-red-400 flex-shrink-0" />
          <p className="text-gray-300 text-sm flex-1">Link a selected design to a lab template:</p>
          <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white w-56">
              <SelectValue placeholder="Select a lab template..." />
            </SelectTrigger>
            <SelectContent>
              {templates.map(t => <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>)}
            </SelectContent>
          </Select>
          <p className="text-gray-500 text-xs">Then click "Link" on a design below.</p>
        </div>

        {loadingDesigns && <p className="text-gray-500 animate-pulse">Loading network designs...</p>}

        {!loadingDesigns && designs.length === 0 && (
          <div className="text-center py-20 border border-dashed border-gray-700 rounded-xl">
            <Network className="h-10 w-10 text-gray-700 mx-auto mb-3" />
            <p className="text-gray-500 mb-4">No network designs found.</p>
            <Link to="/NetworkWizard">
              <Button className="bg-red-800/50 hover:bg-red-700/60 text-red-200 border-0">
                <Plus className="h-4 w-4 mr-2" /> Create a Network Design
              </Button>
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {designs.map(d => (
            <div key={d.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-white text-sm">{d.name}</h3>
                <Badge className={`border-0 text-xs ${STATUS_COLORS[d.status] || STATUS_COLORS.draft}`}>
                  {d.status}
                </Badge>
              </div>
              {d.topology_type && (
                <p className="text-xs text-gray-400 mb-1">Topology: {d.topology_type}</p>
              )}
              {d.routing_protocol && (
                <p className="text-xs text-gray-400 mb-3">Routing: {d.routing_protocol}</p>
              )}
              <div className="flex gap-2 mt-3">
                <Link to={`/ReviewDesign?id=${d.id}`} className="flex-1">
                  <Button size="sm" variant="ghost" className="w-full text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 text-xs">
                    <ExternalLink className="h-3 w-3 mr-1" /> Open
                  </Button>
                </Link>
                <Button size="sm" className="bg-red-900/40 hover:bg-red-800/60 text-red-200 border-0 text-xs flex-1"
                  disabled={!selectedTemplate}
                  onClick={() => handleLink(d.id)}>
                  <LinkIcon className="h-3 w-3 mr-1" /> Link
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}