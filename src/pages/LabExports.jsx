import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Download, FileJson, Package, ChevronLeft } from "lucide-react";
import LabStatusBadge from "@/components/labs/LabStatusBadge";

function exportSingle(template) {
  const blob = new Blob([JSON.stringify(template, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lab-${template.title?.replace(/\s+/g, "-").toLowerCase() || "template"}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function exportAll(templates) {
  const bundle = { exported_at: new Date().toISOString(), count: templates.length, templates };
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `lab-templates-export-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function LabExports() {
  const [selected, setSelected] = useState(new Set());

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["lab-templates"],
    queryFn: () => base44.entities.LabTemplate.list("-created_date"),
  });

  const toggleSelect = (id) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedTemplates = templates.filter(t => selected.has(t.id));

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-4xl mx-auto">
        <Link to="/LabBuilderDashboard" className="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-5 transition-colors">
          <ChevronLeft className="h-4 w-4" /> Course Lab Builder
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Export Lab Templates</h1>
            <p className="text-gray-400 text-sm mt-0.5">Download templates as JSON bundles</p>
          </div>
          <div className="flex gap-2">
            {selected.size > 0 && (
              <Button className="bg-red-800/50 hover:bg-red-700/60 text-red-200 border-0"
                onClick={() => exportAll(selectedTemplates)}>
                <Package className="h-4 w-4 mr-2" /> Export Selected ({selected.size})
              </Button>
            )}
            <Button className="bg-red-700 hover:bg-red-600 text-white"
              onClick={() => exportAll(templates)} disabled={templates.length === 0}>
              <Download className="h-4 w-4 mr-2" /> Export All
            </Button>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          {isLoading && <p className="text-gray-500 text-center py-10 animate-pulse">Loading...</p>}
          {!isLoading && templates.length === 0 && (
            <p className="text-gray-500 text-center py-10">No templates to export.</p>
          )}
          <div className="divide-y divide-gray-800">
            {templates.map(t => (
              <div key={t.id}
                className={`flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-800/50 transition-colors ${selected.has(t.id) ? "bg-red-950/20" : ""}`}
                onClick={() => toggleSelect(t.id)}
              >
                <input type="checkbox" checked={selected.has(t.id)} onChange={() => toggleSelect(t.id)}
                  className="accent-red-500 h-4 w-4 flex-shrink-0" onClick={e => e.stopPropagation()} />
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-medium truncate">{t.title}</p>
                  <div className="flex gap-2 mt-1">
                    {t.nice_category && <span className="text-xs text-gray-500">{t.nice_category}</span>}
                    <span className="text-xs text-gray-600">•</span>
                    <span className="text-xs text-gray-500">{t.difficulty}</span>
                  </div>
                </div>
                <LabStatusBadge status={t.status} />
                <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white flex-shrink-0"
                  onClick={(e) => { e.stopPropagation(); exportSingle(t); }}>
                  <FileJson className="h-4 w-4 mr-1" /> JSON
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}