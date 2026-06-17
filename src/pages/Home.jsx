import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Network, LogOut, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useTranslation } from "react-i18next";

export default function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen py-16 px-4 bg-gradient-to-br from-black via-gray-950 to-red-950/20">
      {/* Background glow effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-red-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-red-950/15 rounded-full blur-3xl" />
      </div>
      <div className="max-w-2xl mx-auto relative z-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="h-20 w-20 rounded-2xl bg-red-900/20 border border-red-700/30 shadow-lg shadow-red-900/20 flex items-center justify-center mx-auto mb-6">
          <Network className="h-10 w-10 text-red-400" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
          {t("home.title")}
        </h1>
        <p className="mt-2 text-base font-semibold text-red-400 tracking-widest uppercase">
          {t("home.subtitle")}
        </p>
        <p className="mt-4 text-lg text-gray-400">
          {t("home.tagline")}
        </p>

        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-0.5 bg-red-900/50"></div>
          <span className="text-red-500 text-xs font-bold uppercase tracking-widest font-mono px-2">Platform Features</span>
          <div className="flex-1 h-0.5 bg-red-900/50"></div>
        </div>

        <p className="text-sm text-gray-400 leading-relaxed">
          {t("home.intro")}
        </p>
        <ul className="mt-4 text-sm text-gray-400 text-left space-y-2 mx-auto max-w-md border border-red-900/30 rounded-xl p-4 bg-black/40 shadow-sm backdrop-blur-sm">
          <li className="flex gap-2 pb-2 border-b border-red-900/20 last:border-0 last:pb-0"><span className="text-red-700">•</span><span><span className="text-gray-200 font-medium">{t("home.feature_network_wizard")}</span> — {t("home.feature_network_wizard_desc")}</span></li>
          <li className="flex gap-2 pb-2 border-b border-red-900/20 last:border-0 last:pb-0"><span className="text-red-700">•</span><span><span className="text-gray-200 font-medium">{t("home.feature_visual_editor")}</span> — {t("home.feature_visual_editor_desc")}</span></li>
          <li className="flex gap-2 pb-2 border-b border-red-900/20 last:border-0 last:pb-0"><span className="text-red-700">•</span><span><span className="text-red-400 font-medium">{t("home.feature_cyber_range")}</span> — {t("home.feature_cyber_range_desc")}</span></li>
          <li className="flex gap-2 pb-2 border-b border-red-900/20 last:border-0 last:pb-0"><span className="text-red-700">•</span><span><span className="text-emerald-400 font-medium">{t("home.feature_soc_training")}</span> — {t("home.feature_soc_training_desc")}</span></li>
          <li className="flex gap-2 pb-2 border-b border-red-900/20 last:border-0 last:pb-0"><span className="text-red-700">•</span><span><span className="text-yellow-400 font-medium">{t("home.feature_soc_assessments")}</span> — {t("home.feature_soc_assessments_desc")}</span></li>
          <li className="flex gap-2 pb-2 border-b border-red-900/20"><span className="text-red-700">•</span><span><span className="text-gray-200 font-medium">{t("home.feature_labs")}</span> — {t("home.feature_labs_desc")}</span></li>
          <li className="flex gap-2 pb-2 border-b border-red-900/20"><span className="text-red-700">•</span><span><span className="text-purple-400 font-medium">Course Lab Builder</span> — AI-powered tool to design, build, and publish hands-on cybersecurity lab scenarios mapped to the NICE Framework.</span></li>
          <li className="flex gap-2"><span className="text-red-700">•</span><span><span className="text-blue-400 font-medium">Candidate Assessments</span> — Generate role-specific hands-on technical assessments for hiring, invite candidates via email, and receive AI-scored evaluation reports with hiring recommendations.</span></li>
        </ul>

        <div className="flex items-center gap-4 my-8">
          <div className="flex-1 h-0.5 bg-red-900/50"></div>
          <span className="text-red-500 text-xs font-bold uppercase tracking-widest font-mono px-2">Get Started</span>
          <div className="flex-1 h-0.5 bg-red-900/50"></div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <Button
            size="lg"
            className="gap-2 bg-red-700 hover:bg-red-600 text-white text-base px-10 shadow-lg shadow-red-900/40"
            onClick={() => navigate("/EnvironmentHub")}
          >
            <ArrowRight className="h-5 w-5" /> {t("home.enter")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-gray-500 hover:text-gray-300"
            onClick={() => base44.auth.logout()}
          >
            <LogOut className="h-4 w-4" /> {t("home.logout")}
          </Button>
        </div>
      </motion.div>
      </div>
    </div>
  );
}