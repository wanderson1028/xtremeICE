import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORIES = [
  "Securely Provision", "Operate and Maintain", "Oversee and Govern",
  "Protect and Defend", "Analyze", "Collect and Operate", "Investigate"
];

const CATEGORY_COLORS = {
  "Securely Provision":  "border-blue-700/50 bg-blue-950/20",
  "Operate and Maintain":"border-green-700/50 bg-green-950/20",
  "Oversee and Govern":  "border-purple-700/50 bg-purple-950/20",
  "Protect and Defend":  "border-red-700/50 bg-red-950/20",
  "Analyze":             "border-yellow-700/50 bg-yellow-950/20",
  "Collect and Operate": "border-orange-700/50 bg-orange-950/20",
  "Investigate":         "border-pink-700/50 bg-pink-950/20",
};
const DIFF_COLORS = {
  Beginner: "bg-green-900/40 text-green-300",
  Intermediate: "bg-blue-900/40 text-blue-300",
  Advanced: "bg-orange-900/40 text-orange-300",
  Expert: "bg-red-900/40 text-red-300",
};

export default function NiceMapping() {
  const [filter, setFilter] = useState("All");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["lab-templates"],
    queryFn: () => base44.entities.LabTemplate.list("-created_date"),
  });

  const publishedTemplates = templates.filter(t => t.status === "published");
  const categoriesToShow = filter === "All" ? CATEGORIES : [filter];

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/LabBuilderDashboard" className="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-5 transition-colors">
          <ChevronLeft className="h-4 w-4" /> Course Lab Builder
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">NICE Framework Mapping</h1>
            <p className="text-gray-400 text-sm mt-0.5">Lab coverage across NICE Cybersecurity Workforce Framework categories</p>
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="bg-gray-900 border-gray-700 text-white w-52">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Categories</SelectItem>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {isLoading && <p className="text-gray-500 animate-pulse">Loading...</p>}

        <div className="space-y-6">
          {categoriesToShow.map(cat => {
            const catTemplates = publishedTemplates.filter(t => t.nice_category === cat);
            const allInCat = templates.filter(t => t.nice_category === cat);
            const colorClass = CATEGORY_COLORS[cat] || "border-gray-700 bg-gray-900/20";

            return (
              <div key={cat} className={`rounded-xl border ${colorClass} p-5`}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-white">{cat}</h2>
                  <div className="flex gap-2 text-xs text-gray-400">
                    <span>{catTemplates.length} published</span>
                    <span>•</span>
                    <span>{allInCat.length} total</span>
                  </div>
                </div>

                {allInCat.length === 0 ? (
                  <p className="text-gray-600 text-sm italic">No labs mapped to this category yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {allInCat.map(t => (
                      <Link key={t.id} to={`/LabBuilder?id=${t.id}`}
                        className="flex items-center gap-3 p-3 bg-gray-900/60 rounded-lg hover:bg-gray-800/80 transition-colors">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-medium truncate">{t.title}</p>
                          <p className="text-gray-500 text-xs truncate mt-0.5">{t.nice_work_role || "No work role assigned"}</p>
                        </div>
                        <div className="flex flex-col gap-1 items-end flex-shrink-0">
                          <Badge className={`text-xs border-0 ${DIFF_COLORS[t.difficulty] || DIFF_COLORS.Beginner}`}>
                            {t.difficulty}
                          </Badge>
                          {t.nice_task_ids?.length > 0 && (
                            <span className="text-xs text-gray-600">{t.nice_task_ids.length} tasks</span>
                          )}
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}