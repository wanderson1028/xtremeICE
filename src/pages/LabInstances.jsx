import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Link } from "react-router-dom";
import { ExternalLink, Search, StopCircle, RefreshCw, ChevronLeft } from "lucide-react";
import { format } from "date-fns";

const STATUS_STYLES = {
  pending:       "bg-gray-700 text-gray-300",
  provisioning:  "bg-yellow-900/60 text-yellow-300",
  running:       "bg-green-900/60 text-green-300",
  paused:        "bg-blue-900/60 text-blue-300",
  completed:     "bg-gray-700 text-gray-400",
  failed:        "bg-red-900/60 text-red-300",
  terminated:    "bg-gray-800 text-gray-600",
};

export default function LabInstances() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const { data: instances = [], isLoading } = useQuery({
    queryKey: ["lab-instances"],
    queryFn: () => base44.entities.LabInstance.list("-created_date"),
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["lab-templates"],
    queryFn: () => base44.entities.LabTemplate.list(),
  });

  const terminateMutation = useMutation({
    mutationFn: (id) => base44.entities.LabInstance.update(id, { status: "terminated" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lab-instances"] }),
  });

  const templateMap = Object.fromEntries(templates.map(t => [t.id, t]));

  const filtered = instances.filter(i => {
    if (statusFilter !== "All" && i.status !== statusFilter) return false;
    if (search && !i.user_email?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-7xl mx-auto">
        <Link to="/LabBuilderDashboard" className="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-5 transition-colors">
          <ChevronLeft className="h-4 w-4" /> Course Lab Builder
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Lab Instances</h1>
            <p className="text-gray-400 text-sm mt-0.5">{instances.length} total sessions</p>
          </div>
          <Button variant="ghost" onClick={() => queryClient.invalidateQueries({ queryKey: ["lab-instances"] })}
            className="text-gray-400 hover:text-white">
            <RefreshCw className="h-4 w-4 mr-2" /> Refresh
          </Button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <div className="relative flex-1 max-w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by email..."
              className="pl-9 bg-gray-900 border-gray-700 text-white" />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="bg-gray-900 border-gray-700 text-white w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {["All", "pending", "provisioning", "running", "paused", "completed", "failed", "terminated"].map(s => (
                <SelectItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-400 px-4 py-3 font-medium">User</th>
                <th className="text-left text-gray-400 px-4 py-3 font-medium">Template</th>
                <th className="text-left text-gray-400 px-4 py-3 font-medium">Status</th>
                <th className="text-left text-gray-400 px-4 py-3 font-medium">Started</th>
                <th className="text-left text-gray-400 px-4 py-3 font-medium">Progress</th>
                <th className="text-right text-gray-400 px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {isLoading && (
                <tr><td colSpan={6} className="text-center py-10 text-gray-500">Loading...</td></tr>
              )}
              {!isLoading && filtered.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-gray-500">No instances found.</td></tr>
              )}
              {filtered.map(inst => (
                <tr key={inst.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-4 py-3 text-gray-200">{inst.user_email}</td>
                  <td className="px-4 py-3 text-gray-300">
                    {templateMap[inst.template_id]?.title || <span className="text-gray-600 italic">Unknown</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={`${STATUS_STYLES[inst.status] || STATUS_STYLES.pending} border-0 text-xs`}>
                      {inst.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {inst.started_at ? format(new Date(inst.started_at), "MMM d, h:mm a") : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-red-500 rounded-full" style={{ width: `${inst.progress || 0}%` }} />
                      </div>
                      <span className="text-gray-400 text-xs">{inst.progress || 0}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {inst.kasm_session_url && (
                        <a href={inst.kasm_session_url} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="ghost" className="text-blue-400 hover:text-blue-300 px-2">
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </a>
                      )}
                      {["running", "provisioning", "paused"].includes(inst.status) && (
                        <Button size="sm" variant="ghost" className="text-red-500 hover:text-red-400 px-2"
                          onClick={() => terminateMutation.mutate(inst.id)}>
                          <StopCircle className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}