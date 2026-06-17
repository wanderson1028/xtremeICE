import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronUp, Shield, Network, FlaskConical, Swords, BookOpen, ShieldCheck } from "lucide-react";
import { useTranslation } from "react-i18next";

const FEATURE_KEYS = {
  network_design_wizard: { icon: Network, color: "text-cyan-400", nameKey: "platform.features.network_design_wizard_name", descKey: "platform.features.network_design_wizard_desc" },
  visual_design_editor:  { icon: Network, color: "text-blue-400",   nameKey: "platform.features.visual_design_editor_name",  descKey: "platform.features.visual_design_editor_desc" },
  cyber_range:           { icon: Swords,  color: "text-red-400",    nameKey: "platform.features.cyber_range_name",           descKey: "platform.features.cyber_range_desc" },
  soc_training:          { icon: ShieldCheck, color: "text-emerald-400", nameKey: "platform.features.soc_training_name",    descKey: "platform.features.soc_training_desc" },
  soc_assessments:       { icon: Shield,  color: "text-amber-400",  nameKey: "platform.features.soc_assessments_name",      descKey: "platform.features.soc_assessments_desc" },
  lab_scenarios:         { icon: FlaskConical, color: "text-violet-400", nameKey: "platform.features.lab_scenarios_name",   descKey: "platform.features.lab_scenarios_desc" },
  course_lab_builder:    { icon: BookOpen, color: "text-orange-400", nameKey: "platform.features.course_lab_builder_name",  descKey: "platform.features.course_lab_builder_desc" },
};

export default function PlatformNarrative({ assignedKeys = [], isAdmin }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);

  const accessibleFeatures = isAdmin
    ? Object.entries(FEATURE_KEYS).map(([k, v]) => ({ ...v, key: k, name: t(v.nameKey), desc: t(v.descKey) }))
    : assignedKeys.map((k) => FEATURE_KEYS[k] ? { ...FEATURE_KEYS[k], key: k, name: t(FEATURE_KEYS[k].nameKey), desc: t(FEATURE_KEYS[k].descKey) } : null).filter(Boolean);

  const platformSummary = isAdmin
    ? t("platform.adminSummary")
    : accessibleFeatures.length === 0
    ? t("platform.noAccess")
    : t(accessibleFeatures.length > 1 ? "platform.userSummaryPlural" : "platform.userSummary", { count: accessibleFeatures.length });

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="mb-6 rounded-xl border border-white/10 bg-gradient-to-br from-white/5 to-transparent overflow-hidden"
    >
      {/* Header row */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-start justify-between gap-4 p-5 text-left hover:bg-white/[0.03] transition-colors"
      >
        <div className="flex items-start gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg bg-red-500/15 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Shield className="h-5 w-5 text-red-400" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-100">{t("platform.overview")}</p>
            <p className="text-xs text-gray-400 mt-0.5 leading-snug">{platformSummary}</p>
          </div>
        </div>
        <div className="flex-shrink-0 mt-1 text-gray-500 hover:text-gray-300 transition-colors">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded feature breakdown */}
      <AnimatePresence>
        {expanded && accessibleFeatures.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-5 border-t border-white/8 pt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {accessibleFeatures.map((f) => (
                <div
                  key={f.name}
                  className="flex items-start gap-3 rounded-lg bg-white/5 border border-white/8 p-3"
                >
                  <div className={`h-7 w-7 rounded-md bg-white/5 flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <f.icon className={`h-4 w-4 ${f.color}`} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-semibold ${f.color}`}>{f.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5 leading-snug">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}