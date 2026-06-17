import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Terminal, Network, Loader2, Plus, Wifi, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPageUrl } from "@/utils";
import { AnimatePresence } from "framer-motion";
import NetworkConsole from "@/components/console/NetworkConsole";
import { useTranslation } from "react-i18next";

export default function VirtualLabs() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeDesign, setActiveDesign] = useState(null);

  const { data: designs = [], isLoading } = useQuery({
    queryKey: ["all-designs-vlab"],
    queryFn: () => base44.entities.NetworkDesign.list("-created_date", 50),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 bg-gradient-to-br from-black via-gray-950 to-red-950/20">
      <div className="max-w-4xl mx-auto">
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
              <Terminal className="h-5 w-5 text-green-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {t("virtualLabs.title")} <span className="text-green-400">{t("virtualLabs.titleHighlight")}</span>
              </h1>
              <p className="text-muted-foreground text-sm mt-0.5">
                {t("virtualLabs.subtitle")}
              </p>
            </div>
          </div>
        </div>

        {designs.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-border rounded-2xl">
            <Network className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground font-medium">{t("virtualLabs.noDesigns")}</p>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              {t("virtualLabs.noDesignsHint")}
            </p>
            <Button onClick={() => navigate(createPageUrl("NetworkWizard"))} className="gap-2">
              <Plus className="h-4 w-4" /> {t("virtualLabs.createDesign")}
            </Button>
          </div>
        ) : (
          <div className="grid gap-4">
            {designs.map(d => {
              const deviceCount = (d.num_sites || 1) * 2 + (d.firewall_enabled ? 1 : 0) + (d.server_farm ? Math.min(d.num_servers || 1, 3) : 0);
              return (
                <div
                  key={d.id}
                  className="group bg-gray-50 border border-gray-200 rounded-xl px-5 py-4 flex items-center justify-between hover:border-green-500/50 hover:bg-green-50/30 transition-all shadow-sm"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center shrink-0">
                      <Network className="h-6 w-6 text-green-400" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{d.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{d.company_name}</p>
                      <div className="flex flex-wrap gap-2 mt-1.5">
                        {d.topology_type && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">{d.topology_type}</span>
                        )}
                        {d.router_model && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-secondary border border-border text-muted-foreground">{d.router_model}</span>
                        )}
                        {d.firewall_vendor && d.firewall_vendor !== "None" && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center gap-1">
                            <Shield className="h-2.5 w-2.5" /> {d.firewall_vendor}
                          </span>
                        )}
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20 text-green-400 flex items-center gap-1">
                          <Wifi className="h-2.5 w-2.5" /> {t("virtualLabs.devices", { count: deviceCount })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => setActiveDesign(d)}
                    className="gap-2 bg-green-600 hover:bg-green-700 text-white shrink-0"
                  >
                    <Terminal className="h-4 w-4" /> {t("virtualLabs.launchConsole")}
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AnimatePresence>
        {activeDesign && (
          <NetworkConsole design={activeDesign} onClose={() => setActiveDesign(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}