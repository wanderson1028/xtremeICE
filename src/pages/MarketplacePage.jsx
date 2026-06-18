import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  Store, Search, Plus, ArrowLeft, Star, Download, Copy,
  Tag, Eye, TrendingUp, Clock, Flame
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const TYPES = ["lab", "template", "network_design", "security_exercise", "cyber_range"];

export default function MarketplacePage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("all");

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ["marketplace-assets"],
    queryFn: () => base44.entities.LiveFireMarketplaceAsset.filter({ status: "published" }, "-downloads", 100),
  });

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const cloneMutation = useMutation({
    mutationFn: async (asset) => {
      if (asset.source_template_id) {
        const templates = await base44.entities.LiveFireTemplate.filter({ id: asset.source_template_id });
        if (templates[0]) {
          return base44.entities.LiveFireLab.create({
            name: `${templates[0].name} (imported)`,
            description: templates[0].description,
            category: templates[0].category,
            difficulty: templates[0].difficulty,
            cloud_provider: templates[0].cloud_provider,
            topology_data: templates[0].topology_data,
            template_id: templates[0].id,
            status: "draft",
          });
        }
      }
      return base44.entities.LiveFireLab.create({
        name: `${asset.title} (imported)`,
        description: asset.description,
        category: asset.category,
        difficulty: asset.difficulty,
        status: "draft",
      });
    },
    onSuccess: () => queryClient.invalidateQueries(["my-livefire-labs"]),
  });

  const filtered = assets.filter(a => {
    if (type !== "all" && a.asset_type !== type) return false;
    if (search && !a.title?.toLowerCase().includes(search.toLowerCase())) return false;
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
            <h1 className="text-2xl font-bold text-white">Marketplace</h1>
            <p className="text-sm text-gray-400 font-mono">Discover and import labs, templates, and cyber ranges</p>
          </div>
          <Button className="bg-red-700 hover:bg-red-600 text-white gap-2">
            <Plus className="h-4 w-4" /> Publish
          </Button>
        </div>

        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search marketplace..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-gray-900 border-gray-700 text-white text-sm h-9"
            />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            <button
              onClick={() => setType("all")}
              className={`text-[11px] font-mono px-3 py-1.5 rounded-lg border transition-colors ${
                type === "all" ? "bg-red-900/40 border-red-700/60 text-red-300" : "bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200"
              }`}
            >
              All
            </button>
            {TYPES.map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`text-[11px] font-mono px-3 py-1.5 rounded-lg border transition-colors ${
                  type === t ? "bg-red-900/40 border-red-700/60 text-red-300" : "bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200"
                }`}
              >
                {t.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase())}
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
            <Store className="h-12 w-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 font-mono text-sm">No marketplace assets available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(asset => (
              <div key={asset.id} className="bg-gray-900/80 border border-yellow-900/30 hover:border-yellow-500/30 rounded-xl overflow-hidden transition-all">
                <div className="h-1.5 bg-gradient-to-r from-yellow-600 to-amber-500" />
                <div className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-white truncate">{asset.title}</h3>
                      <p className="text-[10px] font-mono text-gray-500 mt-0.5">{asset.asset_type?.replace(/_/g, " ")} · {asset.category}</p>
                    </div>
                    <div className="flex items-center gap-1 text-yellow-400">
                      <Star className="h-3 w-3 fill-yellow-400" />
                      <span className="text-[10px] font-mono">{asset.rating || "—"}</span>
                    </div>
                  </div>

                  {asset.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">{asset.description}</p>
                  )}

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                      {asset.difficulty}
                    </span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700 flex items-center gap-1">
                      <Download className="h-2.5 w-2.5" /> {asset.downloads || 0}
                    </span>
                    {asset.price > 0 ? (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-green-900/30 text-green-400 border border-green-700/30">
                        ${asset.price}
                      </span>
                    ) : (
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-green-900/30 text-green-400 border border-green-700/30">
                        Free
                      </span>
                    )}
                  </div>

                  <div className="flex gap-2 pt-3 border-t border-gray-800">
                    <button
                      onClick={() => cloneMutation.mutate(asset)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900/30 border border-blue-700/40 text-blue-400 hover:bg-blue-900/50 rounded-lg text-[10px] font-mono transition-colors flex-1 justify-center"
                    >
                      <Copy className="h-3 w-3" /> Import
                    </button>
                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-400 hover:text-gray-200 rounded-lg text-[10px] font-mono transition-colors">
                      <Eye className="h-3 w-3" /> Preview
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