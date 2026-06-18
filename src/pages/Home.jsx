import React from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Network, LogOut, ArrowRight, Wrench, ScanLine, Shield,
  Crosshair, FlaskConical, GraduationCap
} from "lucide-react";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { useTranslation } from "react-i18next";

export default function Home() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  return (
    <div className="min-h-screen py-16 px-4 bg-gradient-to-br from-black via-gray-950 to-red-950/20">
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
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-xl bg-red-900/20 border border-red-700/30 shadow-lg shadow-red-900/10 mx-auto mb-6">
            <Network className="h-8 w-8 text-red-400" />
          </div>

          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            {t("home.title")}
          </h1>
          <p className="mt-2 text-sm font-semibold text-red-400 tracking-[0.15em] uppercase">
            {t("home.subtitle")}
          </p>
          <p className="mt-4 text-base text-gray-400 max-w-md mx-auto leading-relaxed">
            {t("home.tagline")}
          </p>

          {/* Feature cards grid */}
          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-900/50 to-transparent" />
            <span className="text-red-500 text-xs font-bold uppercase tracking-widest font-mono">Platform Features</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-900/50 to-transparent" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-xl mx-auto">
            {[
              { icon: Wrench, color: "text-sky-400", bg: "bg-sky-500/10 border-sky-500/20", title: "home.feature_network_wizard", desc: "home.feature_network_wizard_desc" },
              { icon: ScanLine, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20", title: "home.feature_visual_editor", desc: "home.feature_visual_editor_desc" },
              { icon: Shield, color: "text-red-400", bg: "bg-red-500/10 border-red-500/20", title: "home.feature_cyber_range", desc: "home.feature_cyber_range_desc" },
              { icon: Crosshair, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", title: "home.feature_soc_training", desc: "home.feature_soc_training_desc" },
              { icon: FlaskConical, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20", title: "home.feature_soc_assessments", desc: "home.feature_soc_assessments_desc" },
              { icon: GraduationCap, color: "text-teal-400", bg: "bg-teal-500/10 border-teal-500/20", title: "home.feature_labs", desc: "home.feature_labs_desc" },
            ].map((f, i) => {
              const Icon = f.icon;
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 p-4 rounded-xl bg-black/40 border border-red-900/20 backdrop-blur-sm text-left hover:border-red-800/40 transition-all duration-200"
                >
                  <div className={`h-8 w-8 rounded-lg ${f.bg} flex items-center justify-center shrink-0 mt-0.5`}>
                    <Icon className={`h-4 w-4 ${f.color}`} strokeWidth={1.5} />
                  </div>
                  <div className="min-w-0">
                    <span className="text-sm font-semibold text-white block">{t(f.title)}</span>
                    <span className="text-xs text-gray-500">{t(f.desc)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4 my-8">
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-900/50 to-transparent" />
            <span className="text-red-500 text-xs font-bold uppercase tracking-widest font-mono">Get Started</span>
            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-900/50 to-transparent" />
          </div>

          <div className="flex flex-col items-center gap-3">
            <Button
              size="lg"
              className="gap-2 bg-red-600 hover:bg-red-500 text-white font-medium text-sm px-10 py-6 rounded-xl shadow-lg shadow-red-900/30 transition-all duration-200 hover:shadow-red-800/40 hover:-translate-y-0.5"
              onClick={() => navigate("/EnvironmentHub")}
            >
              {t("home.enter")}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 text-gray-500 hover:text-gray-300"
              onClick={() => base44.auth.logout()}
            >
              <LogOut className="h-3.5 w-3.5" /> {t("home.logout")}
            </Button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}