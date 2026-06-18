import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  HardDrive, Search, Plus, ArrowLeft, Upload, Filter,
  CheckCircle2, Clock, AlertTriangle, XCircle, Tag,
  Cpu, Monitor, Server, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const CATEGORIES = [
  "Routers", "Switches", "Firewalls", "Servers", "Workstations",
  "Cloud Resources", "Containers", "Security Appliances",
  "Monitoring Tools", "Load Balancers",
];

const VENDORS = [
  "Cisco", "Juniper", "Fortinet", "Palo Alto", "Arista",
  "Ubuntu", "Kali", "Windows", "pfSense", "VyOS",
];

const STATUS_ICONS = {
  available: CheckCircle2,
  uploading: Clock,
  validating: AlertTriangle,
  offline: XCircle,
  deprecated: XCircle,
};

const STATUS_COLORS = {
  available: "text-green-400",
  uploading: "text-yellow-400",
  validating: "text-orange-400",
  offline: "text-red-400",
  deprecated: "text-gray-500",
};

export default function ImageRepository() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const { data: images = [], isLoading } = useQuery({
    queryKey: ["livefire-images-all"],
    queryFn: () => base44.entities.LiveFireImage.list("-updated_date", 200),
  });

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === "admin";

  const filtered = images.filter(img => {
    if (category !== "all" && img.category !== category) return false;
    if (search && !img.product?.toLowerCase().includes(search.toLowerCase()) && !img.vendor?.toLowerCase().includes(search.toLowerCase())) return false;
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
            <h1 className="text-2xl font-bold text-white">Image Repository</h1>
            <p className="text-sm text-gray-400 font-mono">Manage device images for cloud deployment</p>
          </div>
          {isAdmin && (
            <Button className="bg-red-700 hover:bg-red-600 text-white gap-2">
              <Upload className="h-4 w-4" /> Upload Image
            </Button>
          )}
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search by vendor or product..."
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
            {CATEGORIES.map(c => (
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

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total Images", value: images.length, icon: HardDrive, color: "purple" },
            { label: "Available", value: images.filter(i => i.status === "available").length, icon: CheckCircle2, color: "green" },
            { label: "Pending", value: images.filter(i => i.status === "uploading" || i.status === "validating").length, icon: Clock, color: "yellow" },
            { label: "Vendors", value: [...new Set(images.map(i => i.vendor))].length, icon: Server, color: "blue" },
          ].map(s => (
            <div key={s.label} className="bg-gray-900/80 border border-red-900/30 rounded-xl p-3 flex items-center gap-3">
              <div className={`h-8 w-8 rounded-lg bg-${s.color}-900/30 border border-${s.color}-700/30 flex items-center justify-center`}>
                <s.icon className={`h-4 w-4 text-${s.color}-400`} />
              </div>
              <div>
                <p className="text-lg font-bold text-white font-mono">{s.value}</p>
                <p className="text-[10px] text-gray-500 font-mono">{s.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Images Grid */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-red-600/30 border-t-red-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <HardDrive className="h-12 w-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 font-mono text-sm">No images found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map(img => {
              const StatusIcon = STATUS_ICONS[img.status] || CheckCircle2;
              return (
                <div key={img.id} className="bg-gray-900/80 border border-red-900/30 hover:border-red-500/30 rounded-xl overflow-hidden transition-all group">
                  <div className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">{img.vendor}</span>
                        <h3 className="text-sm font-bold text-white mt-1.5">{img.product}</h3>
                        <p className="text-[10px] font-mono text-gray-500">v{img.version}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <StatusIcon className={`h-3.5 w-3.5 ${STATUS_COLORS[img.status] || "text-gray-400"}`} />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 mb-3">
                      <div className="bg-black/30 rounded-lg p-2 text-center">
                        <Cpu className="h-3 w-3 text-gray-500 mx-auto mb-0.5" />
                        <p className="text-[9px] font-mono text-gray-400">{img.cpu_requirement} vCPU</p>
                      </div>
                      <div className="bg-black/30 rounded-lg p-2 text-center">
                        <Monitor className="h-3 w-3 text-gray-500 mx-auto mb-0.5" />
                        <p className="text-[9px] font-mono text-gray-400">{img.ram_requirement_mb}MB</p>
                      </div>
                      <div className="bg-black/30 rounded-lg p-2 text-center">
                        <HardDrive className="h-3 w-3 text-gray-500 mx-auto mb-0.5" />
                        <p className="text-[9px] font-mono text-gray-400">{img.storage_requirement_gb}GB</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-2">
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                        {img.category}
                      </span>
                      <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-gray-800 text-gray-400 border border-gray-700">
                        {img.license_type}
                      </span>
                    </div>

                    {/* Cloud compatibility */}
                    <div className="flex gap-1.5">
                      {img.cloud_compatibility?.aws && (
                        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-orange-900/30 text-orange-400 border border-orange-700/30">AWS</span>
                      )}
                      {img.cloud_compatibility?.azure && (
                        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-blue-900/30 text-blue-400 border border-blue-700/30">Azure</span>
                      )}
                      {img.cloud_compatibility?.gcp && (
                        <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-green-900/30 text-green-400 border border-green-700/30">GCP</span>
                      )}
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