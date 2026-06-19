import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Layers, Plus, Search, Filter, MoreVertical, Play, Pause,
  Trash2, Copy, Share2, Eye, Edit3, Cloud, Clock, Users,
  ArrowLeft, Flame, Download, Upload, Tag
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const STATUS_COLORS = {
  draft: "bg-gray-800 text-gray-400 border-gray-700",
  building: "bg-blue-900/30 text-blue-400 border-blue-700/30",
  deploying: "bg-yellow-900/30 text-yellow-400 border-yellow-700/30",
  running: "bg-green-900/30 text-green-400 border-green-700/30",
  paused: "bg-orange-900/30 text-orange-400 border-orange-700/30",
  completed: "bg-purple-900/30 text-purple-400 border-purple-700/30",
  failed: "bg-red-900/30 text-red-400 border-red-700/30",
  archived: "bg-gray-900/30 text-gray-500 border-gray-800",
};

const DIFF_COLORS = {
  Beginner: "text-green-400 border-green-600/40 bg-green-900/20",
  Intermediate: "text-yellow-400 border-yellow-600/40 bg-yellow-900/20",
  Advanced: "text-orange-400 border-orange-600/40 bg-orange-900/20",
  Expert: "text-red-400 border-red-600/40 bg-red-900/20",
};

export default function MyLabs() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: labs = [], isLoading } = useQuery({
    queryKey: ["my-livefire-labs"],
    queryFn: () => base44.entities.LiveFireLab.list("-updated_date", 100),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LiveFireLab.delete(id),
    onSuccess: () => queryClient.invalidateQueries(["my-livefire-labs"]),
  });

  const cloneMutation = useMutation({
    mutationFn: async (lab) => {
      const { id, created_date, updated_date, created_by_id, ...rest } = lab;
      return base44.entities.LiveFireLab.create({ ...rest, name: `${lab.name} (Copy)`, status: "draft" });
    },
    onSuccess: () => queryClient.invalidateQueries(["my-livefire-labs"]),
  });

  const filtered = labs.filter(l => {
    if (filter !== "all" && l.status !== filter) return false;
    if (search && !l.name?.toLowerCase().includes(search.toLowerCase()) && !l.category?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/LiveFireDashboard" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">My Labs</h1>
            <p className="text-sm text-gray-400 font-mono">Manage your cloud cyber range labs</p>
          </div>
          <Link to="/lab-creation-wizard" className="flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg font-mono text-sm font-bold transition-colors shadow-lg shadow-red-900/30">
            <Plus className="h-4 w-4" /> New Lab
          </Link>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search labs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-gray-900 border-gray-700 text-white text-sm h-9"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {["all", "running", "deploying", "draft", "paused", "failed"].map(s => (
              <button
                key={s}
                onClick={() => setFilter(s)}
                className={`text-[11px] font-mono px-3 py-1.5 rounded-lg border transition-colors ${
                  filter === s ? "bg-red-900/40 border-red-700/60 text-red-300" : "bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200"
                }`}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Labs Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-red-600/30 border-t-red-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Layers className="h-12 w-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 font-mono text-sm mb-4">No labs found</p>
            <Link to="/lab-creation-wizard" className="inline-flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg font-mono text-sm font-bold transition-colors shadow-lg shadow-red-900/30">
              <Plus className="h-4 w-4" /> Create First Lab
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(lab => (
              <div
                key={lab.id}
                className="bg-gray-900/80 border border-red-900/30 hover:border-red-500/30 rounded-xl overflow-hidden transition-all group cursor-pointer"
                onClick={() => navigate(`/lab-creation-wizard?lab=${lab.id}`)}
              >
                {/* Top bar */}
                <div className="h-1.5 bg-gradient-to-r from-red-700 to-orange-600" />
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-white truncate">{lab.name}</h3>
                      <p className="text-[10px] font-mono text-gray-500 mt-0.5">{lab.category || "Uncategorized"}</p>
                    </div>
                    <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${STATUS_COLORS[lab.status] || STATUS_COLORS.draft}`}>
                      {lab.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${DIFF_COLORS[lab.difficulty] || DIFF_COLORS.Beginner}`}>
                      {lab.difficulty}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                      {lab.cloud_provider?.toUpperCase()}
                    </span>
                    {lab.device_count > 0 && (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                        {lab.device_count} devices
                      </span>
                    )}
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                      {lab.visibility}
                    </span>
                  </div>

                  {lab.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">{lab.description}</p>
                  )}

                  <div className="flex items-center justify-between text-[10px] font-mono text-gray-600">
                    <div className="flex items-center gap-1.5">
                      <Cloud className="h-3 w-3" />
                      <span>{lab.region || "us-east-1"}</span>
                    </div>
                    <span>{new Date(lab.updated_date).toLocaleDateString()}</span>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-1.5 mt-3 pt-3 border-t border-gray-800">
                    {lab.status === "draft" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-green-900/30 border border-green-700/40 text-green-400 hover:bg-green-900/50 rounded-lg text-[10px] font-mono transition-colors"
                      >
                        <Play className="h-3 w-3" /> Deploy
                      </button>
                    )}
                    {lab.status === "running" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); }}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-yellow-900/30 border border-yellow-700/40 text-yellow-400 hover:bg-yellow-900/50 rounded-lg text-[10px] font-mono transition-colors"
                      >
                        <Pause className="h-3 w-3" /> Pause
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); cloneMutation.mutate(lab); }}
                      className="flex items-center gap-1 px-2 py-1.5 bg-gray-800 border border-gray-700 text-gray-400 hover:text-gray-200 rounded-lg text-[10px] font-mono transition-colors"
                    >
                      <Copy className="h-3 w-3" /> Clone
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(lab.id); }}
                      className="flex items-center gap-1 px-2 py-1.5 bg-gray-800 border border-gray-700 text-gray-400 hover:text-red-400 rounded-lg text-[10px] font-mono transition-colors ml-auto"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
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