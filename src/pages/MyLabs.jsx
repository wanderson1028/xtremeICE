import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Layers, Plus, Search, Filter, MoreVertical, Play, Pause,
  Trash2, Copy, Share2, Eye, Edit3, Cloud, Clock, Users,
  ArrowLeft, Flame, Download, Upload, Tag, Loader2, CheckCircle, XCircle
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import DeploymentProgress from "@/components/livefire/DeploymentProgress";

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
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const [deployingLabs, setDeployingLabs] = useState(new Set());
  const [deployError, setDeployError] = useState(null);
  const [activeDeployment, setActiveDeployment] = useState(null); // { lab, state, result, errorMsg }
  const [deleteConfirmLab, setDeleteConfirmLab] = useState(null); // lab object to confirm deletion

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: labs = [], isLoading, refetch } = useQuery({
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

  const handleDeploy = async (lab, e) => {
    e.stopPropagation();
    if (deployingLabs.has(lab.id)) return;
    setDeployError(null);
    setDeployingLabs(prev => new Set([...prev, lab.id]));

    // Show deployment progress modal
    setActiveDeployment({ lab, deployState: "running", deployResult: null, deployErrorMsg: null });

    try {
      await base44.entities.LiveFireLab.update(lab.id, { status: "deploying" });
      queryClient.invalidateQueries(["my-livefire-labs"]);

      const res = await base44.functions.invoke("cloudOrchestrator", {
        action: "deployLab",
        provider: lab.cloud_provider || "aws",
        params: { lab_id: lab.id, topology_data: lab.topology_data },
      });

      if (res.data?.error) {
        const errMsg = res.data.message || res.data.error;
        setDeployError(errMsg);
        await base44.entities.LiveFireLab.update(lab.id, { status: "failed" });
        setActiveDeployment({ lab, deployState: "error", deployResult: null, deployErrorMsg: errMsg });
      } else {
        queryClient.invalidateQueries(["my-livefire-labs"]);
        queryClient.invalidateQueries(["running-livefire-labs"]);
        queryClient.invalidateQueries(["running-devices"]);
        setActiveDeployment({ lab, deployState: "success", deployResult: res.data, deployErrorMsg: null });
      }
    } catch (err) {
      // Extract human-readable message from Axios error (4xx/5xx responses have body in err.response.data)
      const body = err?.response?.data;
      let errMsg;
      if (body?.error === "CIDR_CONFLICT") {
        errMsg = `CIDR Conflict: ${body.message || "VPC address range overlaps with existing networks."}` + (body.suggested_cidr ? ` Try: ${body.suggested_cidr}` : "");
      } else if (body?.message) {
        errMsg = body.message;
      } else if (body?.error) {
        errMsg = body.error;
      } else {
        errMsg = err?.message || "Deployment failed";
      }
      setDeployError(errMsg);
      try { await base44.entities.LiveFireLab.update(lab.id, { status: "failed" }); } catch {}
      setActiveDeployment({ lab, deployState: "error", deployResult: null, deployErrorMsg: errMsg });
    } finally {
      setDeployingLabs(prev => { const next = new Set(prev); next.delete(lab.id); return next; });
      queryClient.invalidateQueries(["my-livefire-labs"]);
    }
  };

  const handleDeployClose = () => {
    const deployment = activeDeployment;
    setActiveDeployment(null);
    // If success, navigate to live topology view
    if (deployment?.deployState === "success") {
      navigate(`/live-lab-topology?lab=${deployment.lab.id}`);
    }
  };

  const handleCreateLab = async () => {
    if (creating) return;
    setCreating(true);
    setCreateError(null);
    try {
      const count = (labs.length || 0) + 1;
      const newLab = await base44.entities.LiveFireLab.create({
        name: `New Lab ${count}`,
        cloud_provider: "aws",
        region: "us-east-1",
        category: "Custom",
        difficulty: "Intermediate",
        visibility: "private",
        status: "draft",
        topology_data: { devices: [], connections: [] },
        device_count: 0,
      });
      navigate(`/lab-creation-wizard?lab=${newLab.id}`);
    } catch (err) {
      setCreateError(err?.message || "Create lab failed");
      setCreating(false);
    }
  };

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
          <button
            onClick={handleCreateLab}
            disabled={creating}
            className="flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-600 disabled:bg-red-800 disabled:cursor-wait text-white rounded-lg font-mono text-sm font-bold transition-colors shadow-lg shadow-red-900/30 min-w-[110px] justify-center"
          >
            {creating ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>
            ) : (
              <><Plus className="h-4 w-4" /> New Lab</>
            )}
          </button>
        </div>

        {/* Error state */}
        {(createError || deployError) && (
          <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg flex items-center justify-between">
            <span className="text-red-300 text-sm font-mono">{createError || deployError}</span>
            <button onClick={() => { setCreateError(null); setDeployError(null); }} className="text-red-400 hover:text-red-300 text-lg leading-none">&times;</button>
          </div>
        )}

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
            <button
              onClick={handleCreateLab}
              disabled={creating}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-600 disabled:bg-red-800 disabled:cursor-wait text-white rounded-lg font-mono text-sm font-bold transition-colors shadow-lg shadow-red-900/30 min-w-[140px] justify-center"
            >
              {creating ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</>
              ) : (
                <><Plus className="h-4 w-4" /> Create First Lab</>
              )}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(lab => (
              <div
                key={lab.id}
                className="bg-gray-900/80 border border-red-900/30 hover:border-red-500/30 rounded-xl overflow-hidden transition-all group cursor-pointer"
                onClick={() => {
                  if (lab.status === "running" || lab.status === "deploying") {
                    navigate(`/live-lab-topology?lab=${lab.id}`);
                  } else {
                    navigate(`/lab-creation-wizard?lab=${lab.id}`);
                  }
                }}
              >
                {/* Top bar */}
                <div className={`h-1.5 bg-gradient-to-r ${lab.status === "deploying" ? "from-yellow-600 to-yellow-400 animate-pulse" : lab.status === "running" ? "from-green-600 to-green-400" : lab.status === "failed" ? "from-red-600 to-red-400" : "from-red-700 to-orange-600"}`} />
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
                        onClick={(e) => handleDeploy(lab, e)}
                        disabled={deployingLabs.has(lab.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-green-900/30 border border-green-700/40 text-green-400 hover:bg-green-900/50 disabled:bg-green-900/20 disabled:text-green-600 rounded-lg text-[10px] font-mono transition-colors"
                      >
                        {deployingLabs.has(lab.id) ? (
                          <><div className="w-3 h-3 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" /> Deploying...</>
                        ) : (
                          <><Play className="h-3 w-3" /> Deploy</>
                        )}
                      </button>
                    )}
                    {lab.status === "deploying" && (
                      <div className="flex items-center gap-1 px-2.5 py-1.5 bg-yellow-900/20 border border-yellow-700/40 text-yellow-400 rounded-lg text-[10px] font-mono">
                        <div className="w-3 h-3 border-2 border-yellow-400/30 border-t-yellow-400 rounded-full animate-spin" /> Deploying
                      </div>
                    )}
                    {lab.status === "failed" && (
                      <button
                        onClick={(e) => handleDeploy(lab, e)}
                        disabled={deployingLabs.has(lab.id)}
                        className="flex items-center gap-1 px-2.5 py-1.5 bg-red-900/30 border border-red-700/40 text-red-400 hover:bg-red-900/50 rounded-lg text-[10px] font-mono transition-colors"
                      >
                        <XCircle className="h-3 w-3" /> Retry
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
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirmLab(lab); }}
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

      {/* Deployment Progress Modal */}
      {activeDeployment && (
        <DeploymentProgress
          lab={activeDeployment.lab}
          deployState={activeDeployment.deployState}
          deployResult={activeDeployment.deployResult}
          deployErrorMsg={activeDeployment.deployErrorMsg}
          onClose={handleDeployClose}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirmLab} onOpenChange={(open) => { if (!open) setDeleteConfirmLab(null); }}>
        <AlertDialogContent className="bg-gray-900 border border-red-800/40 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white text-lg">Delete Lab</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete <span className="text-red-400 font-bold font-mono">{deleteConfirmLab?.name}</span>?
              {deleteConfirmLab?.status === "running" && (
                <span className="block mt-2 text-red-400 font-mono text-xs">⚠ This lab is currently running — its cloud resources will remain active and continue to incur costs unless terminated first.</span>
              )}
              <span className="block mt-2">This action cannot be undone.</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-700 hover:bg-red-600 text-white"
              onClick={() => {
                if (deleteConfirmLab) {
                  deleteMutation.mutate(deleteConfirmLab.id);
                  setDeleteConfirmLab(null);
                }
              }}
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}