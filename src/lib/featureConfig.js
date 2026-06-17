import { createPageUrl } from "@/utils";

/**
 * Central feature registry — single source of truth.
 *
 * To add a new feature:
 *  1. Add its service_key to the UserService entity enum (entities/UserService.json)
 *  2. Add an entry to the FEATURES array below
 *  3. If it needs a new nav group, add the access flag to getAccessFromKeys + ADMIN_ACCESS
 */
export const FEATURES = [
  {
    key: "network_design_wizard",
    labelKey: "home.feature_network_wizard",
    icon: "network",
    bg: "bg-cyan-400/10 border-cyan-400/20",
    path: createPageUrl("NetworkWizard"),
    nav_group: "design",
  },
  {
    key: "visual_design_editor",
    labelKey: "home.feature_visual_editor",
    icon: "monitor",
    bg: "bg-blue-400/10 border-blue-400/20",
    path: "/VisualDesignEditor",
    nav_group: "design",
  },
  {
    key: "cyber_range",
    labelKey: "home.feature_cyber_range",
    icon: "cyberRange",
    bg: "bg-red-400/10 border-red-400/20",
    path: createPageUrl("CyberEventBuilder") + "?new=true",
    nav_group: "collaboration",
  },
  {
    key: "soc_training",
    labelKey: "home.feature_soc_training",
    icon: "socTraining",
    bg: "bg-emerald-400/10 border-emerald-400/20",
    path: "/soc-training",
    nav_group: "training",
    nav_sub_group: "soc",
  },
  {
    key: "soc_assessments",
    labelKey: "home.feature_soc_assessments",
    icon: "socAssessments",
    bg: "bg-amber-400/10 border-amber-400/20",
    path: "/soc-assessments",
    nav_group: "training",
    nav_sub_group: "soc",
  },
  {
    key: "lab_scenarios",
    labelKey: "home.feature_labs",
    icon: "labs",
    bg: "bg-violet-400/10 border-violet-400/20",
    path: "/LabCourses",
    nav_group: "training",
  },
  {
    key: "course_lab_builder",
    labelKey: "home.feature_course_lab_builder",
    icon: "courseLabBuilder",
    bg: "bg-orange-400/10 border-orange-400/20",
    path: "/LabBuilderDashboard",
    nav_group: "special",
  },
];

/**
 * Derive nav access flags from a list of assigned service keys.
 * Add a new flag here when a new nav group is introduced.
 */
export function getAccessFromKeys(keys) {
  const has = (key) => keys.includes(key);
  return {
    hasDesign:        has("network_design_wizard") || has("visual_design_editor"),
    hasCollaboration: has("cyber_range"),
    hasTraining:      has("lab_scenarios") || has("soc_training") || has("soc_assessments"),
    hasLabScenarios:  has("lab_scenarios"),
    hasSocTraining:   has("soc_training"),
    hasSocAssessments:has("soc_assessments"),
    hasLabBuilder:    has("course_lab_builder"),
  };
}

/** Full access object granted to admin users. */
export const ADMIN_ACCESS = {
  hasDesign: true,
  hasCollaboration: true,
  hasTraining: true,
  hasLabScenarios: true,
  hasSocTraining: true,
  hasSocAssessments: true,
  hasLabBuilder: true,
};