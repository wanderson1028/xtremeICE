import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, ChevronLeft } from "lucide-react";
import LabCard from "@/components/labs/LabCard";

const CATEGORIES = ["All", "Securely Provision", "Operate and Maintain", "Oversee and Govern", "Protect and Defend", "Analyze", "Collect and Operate", "Investigate"];
const DIFFICULTIES = ["All", "Beginner", "Intermediate", "Advanced", "Expert"];
const STATUSES = ["All", "draft", "review", "published", "archived"];

export default function LabTemplates() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [difficulty, setDifficulty] = useState("All");
  const [status, setStatus] = useState("All");

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ["lab-templates"],
    queryFn: () => base44.entities.LabTemplate.list("-created_date"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LabTemplate.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lab-templates"] }),
  });

  const filtered = templates.filter(t => {
    if (search && !t.title?.toLowerCase().includes(search.toLowerCase())) return false;
    if (category !== "All" && t.nice_category !== category) return false;
    if (difficulty !== "All" && t.difficulty !== difficulty) return false;
    if (status !== "All" && t.status !== status) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Back link */}
        <Link to="/LabBuilderDashboard" className="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-5 transition-colors">
          <ChevronLeft className="h-4 w-4" /> Course Lab Builder
        </Link>

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Lab Templates</h1>
            <p className="text-gray-400 text-sm mt-0.5">{templates.length} template{templates.length !== 1 ? "s" : ""}</p>
          </div>
          <Link to="/LabBuilder">
            <Button className="bg-red-700 hover:bg-red-600 text-white">
              <Plus className="h-4 w-4 mr-2" /> New Template
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3 mb-6">
          <div className="relative flex-1 min-w-48">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search templates..."
              className="pl-9 bg-gray-900 border-gray-700 text-white" />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="bg-gray-900 border-gray-700 text-white w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={difficulty} onValueChange={setDifficulty}>
            <SelectTrigger className="bg-gray-900 border-gray-700 text-white w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DIFFICULTIES.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="bg-gray-900 border-gray-700 text-white w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map(s => <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Grid */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-52 bg-gray-900 rounded-xl border border-gray-800 animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && filtered.length === 0 && (
          <div className="text-center py-20">
            <p className="text-gray-500 mb-4">No templates found.</p>
            <Link to="/LabBuilder">
              <Button className="bg-red-800/50 hover:bg-red-700/60 text-red-200 border-0">
                <Plus className="h-4 w-4 mr-2" /> Create First Template
              </Button>
            </Link>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map(t => (
            <LabCard key={t.id} template={t} onDelete={(id) => deleteMutation.mutate(id)} />
          ))}
        </div>
      </div>
    </div>
  );
}