import React from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Clock, ChevronRight, Tag, Award, Loader2, Terminal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "react-i18next";

const difficultyColor = {
  Beginner: "bg-green-500/20 text-green-400 border-green-500/30",
  Intermediate: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Advanced: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Expert: "bg-red-500/20 text-red-400 border-red-500/30",
};

export default function Labs() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const { data: scenarios = [], isLoading } = useQuery({
    queryKey: ["lab-scenarios"],
    queryFn: () => base44.entities.LabScenario.filter({ status: "published" }),
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
      <div className="max-w-5xl mx-auto">
        <div className="mb-8 pb-6 border-b-2 border-red-800/50">
          <h1 className="text-4xl font-bold text-white tracking-tight">
            Training <span className="text-red-500">Labs</span>
          </h1>
          <p className="text-gray-300 mt-2 text-base leading-relaxed">
            Hands-on cybersecurity training through interactive virtual labs and structured lab courses — from CLI-based network simulations to NICE Framework-aligned scenarios.
          </p>
        </div>

        {/* Built-in Interactive Labs */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-0.5 bg-red-900/50"></div>
            <span className="text-red-500 text-sm font-bold uppercase tracking-widest font-mono px-3">— Interactive Virtual Labs —</span>
            <div className="flex-1 h-0.5 bg-red-900/50"></div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <button
              onClick={() => navigate("/OspfLab")}
              className="group text-left bg-gray-900 border border-gray-700 hover:border-red-600 rounded-xl p-6 shadow-sm transition-all duration-200"
            >
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-red-900/30 border border-red-700/40 flex items-center justify-center shrink-0">
                  <Terminal className="h-5 w-5 text-red-400" />
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                  Intermediate
                </span>
              </div>
              <h2 className="font-semibold text-white text-base mb-1 group-hover:text-red-400 transition-colors">
                Cisco OSPF Virtual Lab
              </h2>
              <p className="text-xs text-gray-400 line-clamp-2 mb-4">
                Configure an 8-router OSPF Area 0 topology using Cisco IOS commands. Select a router, configure interfaces, enable OSPF, and ping 8.8.8.8.
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" />60 min</span>
                <span className="flex items-center gap-1"><Award className="h-3.5 w-3.5" />80% to pass</span>
                <span className="flex items-center gap-1"><Tag className="h-3.5 w-3.5" />Routing</span>
              </div>
              <div className="flex flex-wrap gap-1.5 mb-4">
                {["OSPF", "Cisco IOS", "Routing", "Area 0", "CLI"].map(tag => (
                  <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">{tag}</span>
                ))}
              </div>
              <div className="flex items-center justify-end text-red-400 text-xs font-medium gap-1 group-hover:gap-2 transition-all">
                Launch Lab <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </button>
          </div>
        </div>

        {/* Dynamic Scenarios */}
        {scenarios.length === 0 ? (
          <div className="text-center py-12 text-gray-600 font-mono text-sm">
            No additional lab courses available yet.
          </div>
        ) : (
          <>
          <div className="flex items-center gap-4 my-10">
            <div className="flex-1 h-0.5 bg-red-900/50"></div>
            <span className="text-red-500 text-sm font-bold uppercase tracking-widest font-mono px-3">— Lab Courses —</span>
            <div className="flex-1 h-0.5 bg-red-900/50"></div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {scenarios.map((s) => (
              <button
                key={s.id}
                onClick={() => navigate(`/CourseDashboard?id=${s.id}`)}
                className="group text-left bg-gray-50 border border-gray-200 rounded-xl p-6 shadow-sm hover:border-primary/50 hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${difficultyColor[s.difficulty] || difficultyColor.Beginner}`}>
                    {s.difficulty}
                  </span>
                </div>

                <h2 className="font-semibold text-gray-900 text-base mb-1 group-hover:text-primary transition-colors">
                  {s.title}
                </h2>
                <p className="text-xs text-gray-600 line-clamp-2 mb-4">
                  {s.description}
                </p>

                <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                  {s.estimated_duration_minutes && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {s.estimated_duration_minutes} min
                    </span>
                  )}
                  {s.passing_score && (
                    <span className="flex items-center gap-1">
                      <Award className="h-3.5 w-3.5" />
                      {s.passing_score}% {t("labs.toPass")}
                    </span>
                  )}
                  {s.nice_category && (
                    <span className="flex items-center gap-1">
                      <Tag className="h-3.5 w-3.5" />
                      {s.nice_category}
                    </span>
                  )}
                </div>

                {s.tags?.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {s.tags.slice(0, 4).map((tag) => (
                      <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-300">
                        {tag}
                      </span>
                    ))}
                    {s.tags.length > 4 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-300">
                        +{s.tags.length - 4} {t("common.more", "more")}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-end text-primary text-xs font-medium gap-1 group-hover:gap-2 transition-all">
                  {t("labs.viewCourse")} <ChevronRight className="h-3.5 w-3.5" />
                </div>
              </button>
            ))}
          </div>
          </>
        )}
      </div>
    </div>
  );
}