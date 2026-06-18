import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  Users, Search, ArrowLeft, Globe, Building2, Lock,
  Copy, Eye, Download, Flame, Cloud
} from "lucide-react";
import { Input } from "@/components/ui/input";

const VISIBILITY_ICONS = {
  public: Globe,
  organization: Building2,
  shared: Users,
  private: Lock,
};

export default function SharedLabs() {
  const [search, setSearch] = useState("");

  const { data: labs = [], isLoading } = useQuery({
    queryKey: ["shared-livefire-labs"],
    queryFn: async () => {
      const [shared, public_, org] = await Promise.all([
        base44.entities.LiveFireLab.filter({ visibility: "shared" }, "-updated_date", 50),
        base44.entities.LiveFireLab.filter({ visibility: "public" }, "-updated_date", 50),
        base44.entities.LiveFireLab.filter({ visibility: "organization" }, "-updated_date", 50),
      ]);
      return [...shared, ...public_, ...org].filter((l, i, arr) => arr.findIndex(x => x.id === l.id) === i);
    },
  });

  const filtered = labs.filter(l =>
    !search || l.name?.toLowerCase().includes(search.toLowerCase()) ||
    l.category?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/LiveFireDashboard" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Shared Labs</h1>
            <p className="text-sm text-gray-400 font-mono">Browse labs shared by the community</p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search shared labs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-gray-900 border-gray-700 text-white text-sm h-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-blue-600/30 border-t-blue-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Users className="h-12 w-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 font-mono text-sm">No shared labs available</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(lab => {
              const VIcon = VISIBILITY_ICONS[lab.visibility] || Globe;
              return (
                <div key={lab.id} className="bg-gray-900/80 border border-blue-900/30 hover:border-blue-500/30 rounded-xl overflow-hidden transition-all group cursor-pointer">
                  <div className="h-1.5 bg-gradient-to-r from-blue-700 to-cyan-600" />
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-bold text-white truncate">{lab.name}</h3>
                        <p className="text-[10px] font-mono text-gray-500 mt-0.5">{lab.category || "Uncategorized"}</p>
                      </div>
                      <div className="flex items-center gap-1 text-gray-500">
                        <VIcon className="h-3 w-3" />
                        <span className="text-[9px] font-mono">{lab.visibility}</span>
                      </div>
                    </div>
                    {lab.description && (
                      <p className="text-xs text-gray-500 line-clamp-2 mb-3">{lab.description}</p>
                    )}
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                        {lab.difficulty}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                        {lab.cloud_provider?.toUpperCase()}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                        {lab.device_count || 0} devices
                      </span>
                    </div>
                    <div className="flex gap-2 pt-3 border-t border-gray-800">
                      <button className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-900/30 border border-blue-700/40 text-blue-400 hover:bg-blue-900/50 rounded-lg text-[10px] font-mono transition-colors flex-1 justify-center">
                        <Copy className="h-3 w-3" /> Clone
                      </button>
                      <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-400 hover:text-gray-200 rounded-lg text-[10px] font-mono transition-colors">
                        <Eye className="h-3 w-3" /> Preview
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}