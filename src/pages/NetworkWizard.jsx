import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Save, Loader2, Network, Lock, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import StepIndicator from "@/components/wizard/StepIndicator";
import StepBasics from "@/components/wizard/StepBasics";
import StepTopology from "@/components/wizard/StepTopology";
import StepSecurity from "@/components/wizard/StepSecurity";
import StepServices from "@/components/wizard/StepServices";
import StepDevices from "@/components/wizard/StepDevices";
import StepConfigScripts from "@/components/wizard/StepConfigScripts";
import TemplateSelector from "@/components/wizard/TemplateSelector";
import VisualDesignBuilder from "@/components/wizard/VisualDesignBuilder";

export default function NetworkWizard() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  // Check for pre-fill from Cyber Event Builder
  const prefill = (() => {
    try {
      const raw = sessionStorage.getItem("cyber_event_topology_prefill");
      if (raw) { sessionStorage.removeItem("cyber_event_topology_prefill"); return JSON.parse(raw); }
    } catch (_) {}
    return null;
  })();

  const [showTemplates, setShowTemplates] = useState(!prefill);
  const [showVisualDesign, setShowVisualDesign] = useState(false);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    company_name: "",
    num_sites: 1,
    site_names: [],
    topology_type: "",
    routing_protocol: "",
    wan_technology: "",
    num_vlans_per_site: 0,
    vlan_names: [],
    firewall_enabled: true,
    firewall_vendor: "",
    dmz_required: false,
    redundancy_enabled: false,
    load_balancer: false,
    wireless_enabled: false,
    server_farm: false,
    num_servers: 0,
    router_model: "",
    switch_model: "",
    ip_scheme: "",
    device_username: "",
    device_password: "",
    enable_password: "",
    domain_name: "",
    ntp_server: "",
    dns_servers: [],
    num_user_devices: 0,
    user_device_types: [],
    status: "draft",
    ...(prefill || {}),
  });

  const updateData = (partial) => {
    setFormData((prev) => ({ ...prev, ...partial }));
  };

  const handleTemplateSelect = (templateData) => {
    setFormData((prev) => ({ ...prev, ...templateData }));
    setShowTemplates(false);
  };

  const stepComponents = [
    <StepBasics data={formData} onChange={updateData} />,
    <StepTopology data={formData} onChange={updateData} />,
    <StepSecurity data={formData} onChange={updateData} />,
    <StepServices data={formData} onChange={updateData} />,
    <StepDevices data={formData} onChange={updateData} />,
    <StepConfigScripts data={formData} />,
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        base44.auth.redirectToLogin(window.location.href);
        return;
      }
      const created = await base44.entities.NetworkDesign.create(formData);
      // If from a cyber event, store the design ID and return flag
      const returnData = sessionStorage.getItem("cyber_event_return_data");
      if (returnData || prefill?._from_cyber_event) {
        // Store linked design ID BEFORE removing return data so builder can restore both
        sessionStorage.setItem("cyber_event_linked_design_id", created.id);
        // Keep cyber_event_return_data intact for the builder to restore event state
        navigate("/CyberEventBuilder");
      } else {
        navigate(createPageUrl(`ReviewDesign?id=${created.id}`));
      }
    } catch (err) {
      console.error("Save failed:", err);
      alert("Save failed: " + err.message);
      setSaving(false);
    }
  };

  const canProceed = () => {
    if (step === 0) return formData.name && formData.num_sites > 0;
    if (step === 1) return formData.topology_type && formData.routing_protocol;
    return true;
  };

  if (showVisualDesign) {
    return (
      <VisualDesignBuilder
        onBack={() => setShowVisualDesign(false)}
        onDone={(visualData) => {
          setFormData(prev => ({ ...prev, ...visualData }));
          setShowVisualDesign(false);
          setShowTemplates(false);
        }}
      />
    );
  }

  if (showTemplates) {
    return (
      <TemplateSelector
        onSelect={handleTemplateSelect}
        onBlank={() => setShowTemplates(false)}
        onVisualDesign={() => setShowVisualDesign(true)}
      />
    );
  }

  return (
    <div className="min-h-screen py-10 px-4 bg-gradient-to-br from-black via-gray-950 to-red-950/20">
      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-20 left-1/4 w-[500px] h-[400px] bg-cyan-900/8 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-[600px] h-[400px] bg-blue-900/8 rounded-full blur-3xl" />
      </div>
      <div className="max-w-3xl mx-auto relative z-10">
        {/* Introduction Section */}
        <div className="mb-8 p-6 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-400/30 rounded-2xl shadow-sm hover:shadow-lg hover:border-cyan-400/50 transition-all">
          <div className="flex items-start gap-4">
            <div className="h-10 w-10 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0 mt-0.5">
              <Network className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-foreground mb-2">Design Your Network Topology</h2>
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">
                Build a realistic enterprise network from scratch or use a template. Configure sites, routing, security, services, and devices to match your organization's infrastructure.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="flex gap-3">
                  <div className="text-lg">🏢</div>
                  <div>
                    <p className="font-medium text-sm text-foreground">Multi-Site Support</p>
                    <p className="text-xs text-muted-foreground">Design hub-and-spoke, mesh, or ring topologies.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="text-lg">🔒</div>
                  <div>
                    <p className="font-medium text-sm text-foreground">Security Controls</p>
                    <p className="text-xs text-muted-foreground">Add firewalls, DMZ, VLANs, and redundancy.</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="text-lg">⚙️</div>
                  <div>
                    <p className="font-medium text-sm text-foreground">Auto-Generated Configs</p>
                    <p className="text-xs text-muted-foreground">Get ready-to-deploy CLI scripts for all devices.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Cyber event context banner */}
        {prefill?._from_cyber_event && (
          <div className="mb-4 flex items-center gap-3 bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3">
            <span className="text-lg">⚔️</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-400">{t("wizard.designingFor")} {prefill._event_title}</p>
              <p className="text-xs text-muted-foreground">{t("wizard.returnNote")}</p>
            </div>
          </div>
        )}
        <div className="flex justify-end mb-2">
          <button
            onClick={() => setShowTemplates(true)}
            className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
          >
            {t("wizard.backToTemplates")}
          </button>
        </div>
        <StepIndicator currentStep={step} />

        <div className="bg-card/80 border border-cyan-400/20 rounded-2xl p-6 sm:p-8 shadow-lg hover:shadow-cyan-900/30 transition-all backdrop-blur-sm">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {stepComponents[step]}
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between mt-10 pt-6 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              disabled={step === 0}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> {t("wizard.back")}
            </Button>

            <div className="flex items-center gap-2">
              {step < stepComponents.length - 1 ? (
                <Button
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canProceed()}
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {t("wizard.next")} <ArrowRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {t("wizard.saveReview")}
                </Button>
              )}
            </div>
          </div>
        </div>


      </div>
    </div>
  );
}