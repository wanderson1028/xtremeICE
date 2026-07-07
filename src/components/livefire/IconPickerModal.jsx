import React, { useState, useMemo } from "react";
import { Search, X, Check } from "lucide-react";
import { getIconOptions } from "@/components/livefire/DeviceIcons";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

const TYPE_COLORS = {
  router: "text-blue-400",
  switch: "text-cyan-400",
  firewall: "text-red-400",
  server: "text-green-400",
  workstation: "text-yellow-400",
  cloud_resource: "text-purple-400",
  container: "text-orange-400",
  load_balancer: "text-teal-400",
  monitoring: "text-gray-400",
  security_appliance: "text-pink-400",
};

export default function IconPickerModal({ open, onClose, onSelect, currentIconId, deviceType }) {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const allIcons = useMemo(() => getIconOptions(), []);

  const categories = useMemo(() => {
    const cats = new Set(allIcons.map(i => i.category || "Detailed"));
    return ["All", ...Array.from(cats)];
  }, [allIcons]);

  const filtered = useMemo(() => {
    return allIcons.filter(icon => {
      const matchesCategory = activeCategory === "All" || icon.category === activeCategory;
      const matchesSearch = !search ||
        icon.label.toLowerCase().includes(search.toLowerCase()) ||
        icon.id.toLowerCase().includes(search.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [allIcons, activeCategory, search]);

  const colorClass = TYPE_COLORS[deviceType] || "text-gray-400";

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="bg-gray-900 border border-red-900/40 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            Select Icon Style
          </DialogTitle>
        </DialogHeader>

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search icons..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-gray-800 border-gray-700 text-white text-sm h-9"
          />
        </div>

        {/* Category tabs */}
        <div className="flex gap-1.5 mb-3">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-[10px] font-mono px-3 py-1.5 rounded-lg border transition-colors ${
                activeCategory === cat
                  ? "bg-red-900/30 border-red-600/60 text-red-300"
                  : "bg-gray-800/60 border-gray-700 text-gray-500 hover:text-gray-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Icon grid */}
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-[400px] overflow-y-auto p-1">
          {filtered.map(opt => {
            const isActive = currentIconId === opt.id;
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                onClick={() => { onSelect(opt.id); onClose(); }}
                className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                  isActive
                    ? "bg-red-900/30 border-red-500/60 ring-1 ring-red-500/40"
                    : "bg-gray-800/60 border-gray-700 hover:border-gray-600 hover:bg-gray-800"
                }`}
                title={opt.label}
              >
                <div className={`w-12 h-12 ${isActive ? colorClass : "text-gray-400"}`}>
                  <Icon className={isActive ? colorClass : "text-gray-400"} />
                </div>
                <span className={`text-[9px] font-mono truncate w-full text-center ${isActive ? "text-red-300" : "text-gray-500"}`}>
                  {opt.label}
                </span>
                {isActive && (
                  <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-600 flex items-center justify-center">
                    <Check className="h-2.5 w-2.5 text-white" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-8">
            <p className="text-xs text-gray-500 font-mono">No icons found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}