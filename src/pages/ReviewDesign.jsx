import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, Loader2, Plus, Network, ChevronRight, Trash2, Edit, Terminal } from "lucide-react";
import { useTranslation } from "react-i18next";
import { AnimatePresence } from "framer-motion";
import NetworkConsole from "@/components/console/NetworkConsole";
import DesignSummary from "@/components/review/DesignSummary";
import NetworkValidationPanel from "@/components/review/NetworkValidationPanel";
import NetworkValidationReport from "@/components/review/NetworkValidationReport";
import DesignEditor from "@/components/review/DesignEditor";
import InteractiveTopology from "@/components/review/InteractiveTopology";
import { validateNetworkDesign } from "@/utils/networkValidator";

function DesignList() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [consoleDesign, setConsoleDesign] = useState(null);

  const { data: designs = [], isLoading, refetch } = useQuery({
    queryKey: ["all-designs"],
    queryFn: () => base44.entities.NetworkDesign.list("-created_date", 50),
  });

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm(t("reviewDesign.deleteConfirm"))) return;
    await base44.entities.NetworkDesign.delete(id);
    refetch();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 bg-gradient-to-br from-black via-gray-950 to-red-950/20">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8 pb-5 border-b border-red-900/30">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{t("reviewDesign.savedDesigns")}</h1>
            <p className="text-muted-foreground mt-1">{t("reviewDesign.savedDesignsSubtitle")}</p>
          </div>
          <Button onClick={() => navigate(createPageUrl("NetworkWizard"))} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4" /> {t("reviewDesign.newDesign")}
          </Button>
        </div>

        {designs.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-border rounded-2xl">
            <Network className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">{t("reviewDesign.noDesigns")}</p>
            <p className="text-sm text-muted-foreground mt-1 mb-6">{t("reviewDesign.noDesignsHint")}</p>
            <Button onClick={() => navigate(createPageUrl("NetworkWizard"))} className="gap-2">
              <Plus className="h-4 w-4" /> {t("reviewDesign.createFirst")}
            </Button>
          </div>
        ) : (
          <div className="grid gap-3">
            {designs.map(d => (
              <div
                key={d.id}
                onClick={() => navigate(`/VisualDesignEditor?id=${d.id}`)}
                className="group bg-card border border-border rounded-xl px-5 py-4 flex items-center justify-between cursor-pointer shadow-sm hover:border-primary/50 hover:shadow-md transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <Network className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-semibold text-foreground group-hover:text-primary transition-colors">{d.name}</p>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {d.company_name && <span className="text-xs text-muted-foreground">{d.company_name}</span>}
                      {d.topology_type && <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">{d.topology_type}</span>}
                      {d.routing_protocol && <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">{d.routing_protocol}</span>}
                      {d.num_sites && <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">{d.num_sites} site{d.num_sites !== 1 ? "s" : ""}</span>}
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${d.status === "generated" ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-secondary border-border text-muted-foreground"}`}>{d.status || "draft"}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-muted-foreground hidden sm:block">
                    {new Date(d.created_date).toLocaleDateString()}
                  </span>
                  <button
                    onClick={e => { e.stopPropagation(); setConsoleDesign(d); }}
                    title="Launch Virtual Console"
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-green-400 hover:bg-green-500/10 transition-all"
                  >
                    <Terminal className="h-4 w-4" />
                  </button>
                  <button
                    onClick={e => handleDelete(e, d.id)}
                    className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {consoleDesign && (
          <NetworkConsole design={consoleDesign} onClose={() => setConsoleDesign(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ReviewDesign() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const [validationResult, setValidationResult] = useState(null);
  const [showValidation, setShowValidation] = useState(false);

  const { data: design, isLoading, refetch } = useQuery({
    queryKey: ["design", id],
    queryFn: async () => {
      if (!id) return null;
      try {
        return await base44.entities.NetworkDesign.get(id);
      } catch {
        // Fallback: filter by id in case get() fails
        const results = await base44.entities.NetworkDesign.filter({ id });
        return results?.[0] ?? null;
      }
    },
    enabled: !!id,
  });

  const handleDesignUpdate = async (updates) => {
    await base44.entities.NetworkDesign.update(id, updates);
    await refetch();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!id) {
    return <DesignList />;
  }

  if (!design) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">Design not found. It may have been deleted or the link is invalid.</p>
          <Button onClick={() => navigate(createPageUrl("NetworkWizard"))} className="gap-2">
            <Plus className="h-4 w-4" /> Create a New Design
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 bg-gradient-to-br from-black via-gray-950 to-red-950/20">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8 pb-5 border-b border-red-900/30">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{design.name}</h1>
            <p className="text-muted-foreground mt-1">{design.company_name} — Review your network design</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={() => navigate(`/VisualDesignEditor?id=${design.id}`)}
              className="gap-2 bg-amber-500 hover:bg-amber-400 text-black font-semibold shadow-lg shadow-amber-500/30"
            >
              <Edit className="h-4 w-4" /> Edit in Visual Designer
            </Button>
            <Button
              onClick={() => {
                const validation = validateNetworkDesign(design);
                setValidationResult(validation);
                setShowValidation(true);
              }}
              className="gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold shadow-lg shadow-emerald-600/30"
            >
              ✓ Validate Before Export
            </Button>
            <Button
              onClick={() => navigate(createPageUrl(`DiagramPreview?id=${design.id}`))}
              className="gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/30"
            >
              <Eye className="h-4 w-4" /> View & Export
            </Button>
            <Button variant="outline" onClick={() => navigate(createPageUrl("Home"))} className="gap-2 border-gray-600 text-gray-300 hover:text-white hover:border-gray-400">
              <ArrowLeft className="h-4 w-4" /> Back
            </Button>
          </div>
        </div>

        <InteractiveTopology design={design} onSaveTopology={handleDesignUpdate} />
        <div className="mt-6">
          <DesignSummary design={design} />
        </div>
        <NetworkValidationPanel design={design} onUpdateDesign={handleDesignUpdate} />
        <DesignEditor design={design} onSave={handleDesignUpdate} />

        <div className="flex justify-center gap-4 mt-8">
          <Button
            variant="outline"
            onClick={() => navigate(createPageUrl("NetworkWizard"))}
            className="gap-2 border-gray-600 text-gray-300 hover:text-white"
          >
            <Plus className="h-4 w-4" /> Create New Design
          </Button>
          <Button
            onClick={() => navigate(createPageUrl(`DiagramPreview?id=${design.id}`))}
            className="gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-600/30"
          >
            <Eye className="h-4 w-4" /> View & Export
          </Button>
        </div>

        {/* Validation Report Modal */}
        {showValidation && validationResult && (
          <NetworkValidationReport
            validation={validationResult}
            onClose={() => setShowValidation(false)}
            canExport={validationResult.isValid}
          />
        )}
      </div>

      {/* Validation Report Modal */}
      {showValidation && validationResult && (
        <NetworkValidationReport
          validation={validationResult}
          onClose={() => setShowValidation(false)}
          canExport={validationResult.isValid}
        />
      )}
    </div>
  );
}