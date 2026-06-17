import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Clock, ChevronRight, Tag, Terminal, CheckCircle2, Search, X, ChevronDown, BookOpen, Filter } from "lucide-react";
import { VIRTUAL_LABS, LINUX_LABS, POWERSHELL_LABS, LAB_COURSES } from "@/lib/labCatalog";
import { useTranslation } from "react-i18next";

function CategoryDropdown({ categories, onSelect }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-2 bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-300 hover:border-red-600 transition-colors"
      >
        <Filter className="h-4 w-4 text-gray-500" />
        <span>{t("activeLabs.jumpToCategory")}</span>
        <ChevronDown className={`h-4 w-4 text-gray-500 ml-1 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute top-full left-0 mt-1 w-56 bg-gray-950 border border-gray-700 rounded-xl shadow-xl z-20 py-1 overflow-hidden">
          {categories.map(cat => (
            <button
              key={cat.key}
              onClick={() => { onSelect(cat.key); setOpen(false); }}
              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-gray-800 transition-colors ${cat.color}`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const difficultyColor = {
  Beginner:     "bg-green-500/20 text-green-400 border-green-500/30",
  Intermediate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Advanced:     "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Expert:       "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function InteractiveVirtualLabs() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [search, setSearch] = useState("");
  const [collapsed, setCollapsed] = useState({});
  const [showCompleted, setShowCompleted] = useState(false);

  const sectionRefs = {
    network: useRef(null),
    linux: useRef(null),
    powershell: useRef(null),
    courses: useRef(null),
  };

  const CATEGORIES = [
    { key: "network",    label: t("activeLabs.categories.network"),    color: "text-red-400" },
    { key: "linux",      label: t("activeLabs.categories.linux"),      color: "text-green-400" },
    { key: "powershell", label: t("activeLabs.categories.powershell"), color: "text-blue-400" },
    { key: "courses",    label: t("activeLabs.categories.courses"),    color: "text-purple-400" },
  ];

  const handleCategorySelect = (key) => {
    // Collapse all others, expand the chosen one
    setCollapsed({ network: true, linux: true, powershell: true, courses: true, [key]: false });
    // Scroll to section after state update
    setTimeout(() => {
      sectionRefs[key]?.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  };

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ["lab-assignments-user", currentUser?.email, "lab_scenarios"],
    queryFn: () => base44.entities.UserLabAssignment.filter({
      user_email: currentUser.email,
      service_key: "lab_scenarios",
    }),
    enabled: !!currentUser?.email,
  });

  const { data: labScores = [] } = useQuery({
    queryKey: ["my-lab-scores-ivl", currentUser?.email],
    queryFn: () => base44.entities.LabScore.filter({ user_email: currentUser.email }, "-created_date", 200),
    enabled: !!currentUser?.email,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const completedTitles = new Set(labScores.map(s => s.lab_title));

  const isAdmin = currentUser?.role === "admin";
  const hasAssignments = assignments.length > 0;
  const assignedIds = new Set(assignments.map(a => a.lab_id));
  const q = search.toLowerCase();

  const applyFilters = (list) => list
    .filter(l => !showCompleted || completedTitles.has(l.title))
    .filter(l => !q || l.title.toLowerCase().includes(q) || l.category?.toLowerCase().includes(q) || l.tags?.some(t => t.toLowerCase().includes(q)));

  const visibleNetworkLabs = applyFilters(isAdmin || !hasAssignments ? VIRTUAL_LABS : VIRTUAL_LABS.filter(l => assignedIds.has(l.id)));
  const visibleLinuxLabs   = applyFilters(isAdmin || !hasAssignments ? LINUX_LABS   : LINUX_LABS.filter(l => assignedIds.has(l.id)));
  const visiblePSLabs      = applyFilters(isAdmin || !hasAssignments ? POWERSHELL_LABS : POWERSHELL_LABS.filter(l => assignedIds.has(l.id)));
  const visibleCourseLabs  = applyFilters(isAdmin || !hasAssignments ? LAB_COURSES  : LAB_COURSES.filter(l => assignedIds.has(l.id)));

  const LabCard = ({ lab, icon, accentColor = "red" }) => {
    const isCompleted = completedTitles.has(lab.title);
    const hoverBorder = isCompleted ? "hover:border-green-500" : accentColor === "purple" ? "hover:border-purple-600" : "hover:border-red-600";
    const iconBg = isCompleted ? "bg-green-900/30 border-green-700/40" : accentColor === "purple" ? "bg-purple-900/30 border-purple-700/40" : "bg-red-900/30 border-red-700/40";
    const textHover = isCompleted ? "group-hover:text-green-400" : accentColor === "purple" ? "group-hover:text-purple-400" : "group-hover:text-red-400";
    const actionColor = isCompleted ? "text-green-400" : accentColor === "purple" ? "text-purple-400" : "text-red-400";
    return (
      <button
        onClick={() => navigate(lab.route)}
        className={`group text-left bg-gray-900 border rounded-xl p-6 shadow-sm transition-all duration-200 ${isCompleted ? "border-green-700/60" : "border-gray-700"} ${hoverBorder}`}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className={`h-10 w-10 rounded-lg border flex items-center justify-center shrink-0 ${iconBg}`}>
            {isCompleted
              ? <CheckCircle2 className="h-5 w-5 text-green-400" />
              : (icon || <Terminal className="h-5 w-5 text-red-400" />)}
          </div>
          <div className="flex items-center gap-2">
            {isCompleted && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-green-500/20 text-green-400 border-green-500/30">
                {t("activeLabs.completed")}
              </span>
            )}
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${difficultyColor[lab.difficulty] || difficultyColor.Intermediate}`}>
              {lab.difficulty}
            </span>
          </div>
        </div>
        <h2 className={`font-semibold text-white text-base mb-1 transition-colors ${textHover}`}>
          {lab.title}
        </h2>
        <p className="text-xs text-gray-400 line-clamp-2 mb-4">{lab.description}</p>
        <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
          <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{lab.duration} min</span>
          <span className="flex items-center gap-1"><Tag className="h-3.5 w-3.5" />{lab.category}</span>
        </div>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {lab.tags.map(tag => (
            <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">{tag}</span>
          ))}
        </div>
        <div className={`flex items-center justify-end text-xs font-medium gap-1 group-hover:gap-2 transition-all ${actionColor}`}>
          {isCompleted ? t("activeLabs.launchAgain") : t("activeLabs.launchLab")} <ChevronRight className="h-3.5 w-3.5" />
        </div>
      </button>
    );
  };

  return (
    <div className="min-h-screen py-12 px-4 bg-gradient-to-br from-black via-gray-950 to-red-950/20">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 pb-6 border-b-2 border-red-800/50">
          <h1 className="text-4xl font-bold text-white tracking-tight">
            <span className="text-red-500">{t("activeLabs.titleHighlight")}</span> {t("activeLabs.title").replace(t("activeLabs.titleHighlight"), "").trim()}
          </h1>
          <p className="text-gray-300 mt-2 text-base leading-relaxed">
            {t("activeLabs.subtitle")}
          </p>
        </div>

        {/* Category selector + Search row */}
        <div className="flex gap-3 mb-6 flex-wrap items-center">
          <CategoryDropdown categories={CATEGORIES} onSelect={handleCategorySelect} />
          <button
            onClick={() => setShowCompleted(v => !v)}
            className={`flex items-center gap-2 shrink-0 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors ${
              showCompleted
                ? "bg-green-900/30 border-green-700/50 text-green-400 hover:bg-green-900/50"
                : "bg-gray-900 border-gray-700 text-gray-400 hover:border-green-700/50 hover:text-green-400"
            }`}
          >
            <CheckCircle2 className="h-4 w-4" />
            {showCompleted ? t("activeLabs.completedOnly") : t("activeLabs.showCompleted")}
          </button>
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500 pointer-events-none" />
            <input
              type="text"
              placeholder={t("activeLabs.searchPlaceholder")}
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl pl-10 pr-10 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-red-600 transition-colors"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Network Labs */}
        {visibleNetworkLabs.length > 0 && (
          <div className="mb-10" ref={sectionRefs.network}>
            <button onClick={() => setCollapsed(c => ({ ...c, network: !c.network }))} className="w-full flex items-center gap-2 mb-4 group">
              <span className="h-1.5 w-1.5 rounded-full bg-red-500 shrink-0" />
              <h2 className="text-lg font-semibold text-white">{t("activeLabs.networkSims")}</h2>
              <span className="text-xs text-gray-500 ml-1">({visibleNetworkLabs.length})</span>
              <ChevronDown className={`h-4 w-4 text-gray-400 ml-auto transition-transform ${collapsed.network ? "-rotate-90" : ""}`} />
            </button>
            {!collapsed.network && (
              <div className="grid gap-5 sm:grid-cols-2">
                {visibleNetworkLabs.map(lab => <LabCard key={lab.id} lab={lab} />)}
              </div>
            )}
          </div>
        )}

        {/* Linux Labs */}
        {visibleLinuxLabs.length > 0 && (
          <div className="mb-10" ref={sectionRefs.linux}>
            <button onClick={() => setCollapsed(c => ({ ...c, linux: !c.linux }))} className="w-full flex items-center gap-2 mb-4 group">
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
              <h2 className="text-lg font-semibold text-white">{t("activeLabs.linuxLabs")}</h2>
              <span className="text-xs text-gray-500 ml-1">({visibleLinuxLabs.length})</span>
              <ChevronDown className={`h-4 w-4 text-gray-400 ml-auto transition-transform ${collapsed.linux ? "-rotate-90" : ""}`} />
            </button>
            {!collapsed.linux && (
              <div className="grid gap-5 sm:grid-cols-2">
                {visibleLinuxLabs.map(lab => <LabCard key={lab.id} lab={lab} />)}
              </div>
            )}
          </div>
        )}

        {/* PowerShell / Windows Labs */}
        {visiblePSLabs.length > 0 && (
          <div className="mb-10" ref={sectionRefs.powershell}>
            <button onClick={() => setCollapsed(c => ({ ...c, powershell: !c.powershell }))} className="w-full flex items-center gap-2 mb-4 group">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0" />
              <h2 className="text-lg font-semibold text-white">{t("activeLabs.psLabs")}</h2>
              <span className="text-xs text-gray-500 ml-1">({visiblePSLabs.length})</span>
              <ChevronDown className={`h-4 w-4 text-gray-400 ml-auto transition-transform ${collapsed.powershell ? "-rotate-90" : ""}`} />
            </button>
            {!collapsed.powershell && (
              <div className="grid gap-5 sm:grid-cols-2">
                {visiblePSLabs.map(lab => <LabCard key={lab.id} lab={lab} />)}
              </div>
            )}
          </div>
        )}

        {/* Workrole Courses */}
        {visibleCourseLabs.length > 0 && (
          <div className="mb-10" ref={sectionRefs.courses}>
            <button onClick={() => setCollapsed(c => ({ ...c, courses: !c.courses }))} className="w-full flex items-center gap-2 mb-4 group">
              <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0" />
              <h2 className="text-lg font-semibold text-white">{t("activeLabs.workroleCourses")}</h2>
              <span className="text-xs text-gray-500 ml-1">({visibleCourseLabs.length})</span>
              <ChevronDown className={`h-4 w-4 text-gray-400 ml-auto transition-transform ${collapsed.courses ? "-rotate-90" : ""}`} />
            </button>
            {!collapsed.courses && (
              <div className="grid gap-5 sm:grid-cols-2">
                {visibleCourseLabs.map(lab => (
                  <LabCard key={lab.id} lab={lab} icon={<BookOpen className="h-5 w-5 text-purple-400" />} accentColor="purple" />
                ))}
              </div>
            )}
          </div>
        )}

        {visibleNetworkLabs.length === 0 && visibleLinuxLabs.length === 0 && visiblePSLabs.length === 0 && visibleCourseLabs.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            {t("activeLabs.noLabs")}
          </div>
        )}
      </div>
    </div>
  );
}