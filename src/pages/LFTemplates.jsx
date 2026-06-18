import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import {
  BookOpen, Search, Plus, ArrowLeft, Copy, Trash2,
  Star, Download, Upload, Tag, Eye, Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CATEGORIES = [
  "CCNA", "CCNP", "CCIE", "Network+", "Security+",
  "AWS", "Azure", "Fortinet", "Palo Alto", "SOC",
  "Blue Team", "Red Team", "Purple Team", "Active Directory",
  "Cloud Security", "Zero Trust",
];

export default function LFTemplates() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["livefire-templates-all"],
    queryFn: () => base44.entities.LiveFireTemplate.list("-updated_date", 100),
  });

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const launchMutation = useMutation({
    mutationFn: async (template) => {
      return base44.entities.LiveFireLab.create({
        name: `${template.name} (from template)`,
        description: template.description,
        category: template.category,
        difficulty: template.difficulty,
        cloud_provider: template.cloud_provider,
        topology_data: template.topology_data,
        template_id: template.id,
        status: "draft",
      });
    },
    onSuccess: (data) => {
      navigate(`/lab-creation-wizard?lab=${data.id}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LiveFireTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["livefire-templates-all"]),
  });

  const filtered = templates.filter(t => {
    if (category !== "all" && t.category !== category) return false;
    if (search && !t.name?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/LiveFireDashboard" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Templates</h1>
            <p className="text-sm text-gray-400 font-mono">Launch labs from pre-built templates</p>
          </div>
          <Button onClick={() => navigate("/lab-creation-wizard")} className="bg-red-700 hover:bg-red-600 text-white gap-2">
            <Plus className="h-4 w-4" /> New Template
          </Button>
        </div>

        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search templates..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-gray-900 border-gray-700 text-white text-sm h-9"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setCategory("all")}
              className={`text-[11px] font-mono px-3 py-1.5 rounded-lg border transition-colors ${
                category === "all" ? "bg-red-900/40 border-red-700/60 text-red-300" : "bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200"
              }`}
            >
              All
            </button>
            {CATEGORIES.slice(0, 8).map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`text-[11px] font-mono px-3 py-1.5 rounded-lg border transition-colors ${
                  category === c ? "bg-red-900/40 border-red-700/60 text-red-300" : "bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-red-600/30 border-t-red-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <BookOpen className="h-12 w-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 font-mono text-sm">No templates found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(t => (
              <div key={t.id} className="bg-gray-900/80 border border-red-900/30 hover:border-red-500/30 rounded-xl overflow-hidden transition-all">
                <div className="h-1.5 bg-gradient-to-r from-purple-700 to-blue-600" />
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-white truncate">{t.name}</h3>
                      <p className="text-[10px] font-mono text-gray-500 mt-0.5">{t.category}</p>
                    </div>
                    {t.is_marketplace && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-yellow-900/30 text-yellow-400 border border-yellow-700/30 flex items-center gap-1">
                        <Star className="h-2.5 w-2.5" /> {t.rating || 0}
                      </span>
                    )}
                  </div>
                  {t.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">{t.description}</p>
                  )}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                      {t.difficulty}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                      {t.cloud_provider?.toUpperCase()}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                      v{t.version || "1.0"}
                    </span>
                  </div>
                  <div className="flex gap-2 pt-3 border-t border-gray-800">
                    <button
                      onClick={() => launchMutation.mutate(t)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-green-900/30 border border-green-700/40 text-green-400 hover:bg-green-900/50 rounded-lg text-[10px] font-mono transition-colors flex-1 justify-center"
                    >
                      <Play className="h-3 w-3" /> Launch
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-400 hover:text-gray-200 rounded-lg text-[10px] font-mono transition-colors">
                      <Eye className="h-3 w-3" /> Preview
                    </button>
                    {t.created_by_id === currentUser?.id && (
                      <button
                        onClick={() => deleteMutation.mutate(t.id)}
                        className="flex items-center gap-1 px-2 py-1.5 bg-gray-800 border border-gray-700 text-gray-400 hover:text-red-400 rounded-lg text-[10px] font-mono transition-colors"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}