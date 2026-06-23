import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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
import {
  ShieldCheck,
  Trash2,
  CheckCircle2,
  Database,
  Layers,
  Users,
  ListChecks,
  Plus,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { NICE_DATASET } from "@/lib/niceDataset";

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-800 bg-gray-900/60 p-3">
      <div className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${accent}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-white truncate">{value}</p>
      </div>
    </div>
  );
}

export default function NiceDatasetManager() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(null);
  const [confirmLoad, setConfirmLoad] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newVersion, setNewVersion] = useState({ version: "", label: "" });
  const [error, setError] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["nice-versions"],
    queryFn: () => base44.entities.NiceFrameworkVersion.list("-imported_at", 50),
    enabled: currentUser?.role === "admin",
  });

  const { data: settings } = useQuery({
    queryKey: ["nice-settings"],
    queryFn: () => base44.entities.NiceAppSettings.filter({ setting_key: "global" }),
    enabled: currentUser?.role === "admin",
  });

  if (currentUser?.role !== "admin") {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-2">
          <ShieldCheck className="h-10 w-10 text-gray-600 mx-auto" />
          <p className="text-sm text-gray-500">Admin access required.</p>
        </div>
      </div>
    );
  }

  const activeVersionId = settings?.[0]?.active_version_id;
  const activeVersion = versions.find((v) => v.id === activeVersionId);

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["nice-versions"] });
    queryClient.invalidateQueries({ queryKey: ["nice-settings"] });
  };

  const handleLoadDefault = async () => {
    setLoading("load_default");
    setError(null);
    try {
      const res = await base44.functions.invoke("niceDatasetManager", {
        action: "load_default",
        dataset: NICE_DATASET,
      });
      refresh();
      alert(res.data?.message || "NICE v2.2.0 loaded successfully.");
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(null);
      setConfirmLoad(false);
    }
  };

  const handleActivate = async (versionId) => {
    setLoading(`activate_${versionId}`);
    setError(null);
    try {
      const res = await base44.functions.invoke("niceDatasetManager", {
        action: "activate",
        version_id: versionId,
      });
      refresh();
      alert(res.data?.message || "Version activated.");
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(null);
    }
  };

  const handleDelete = async (versionId) => {
    setLoading(`delete_${versionId}`);
    setError(null);
    try {
      const res = await base44.functions.invoke("niceDatasetManager", {
        action: "delete",
        version_id: versionId,
      });
      refresh();
      alert(res.data?.message || "Version deleted.");
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(null);
      setConfirmDelete(null);
    }
  };

  const handleAddVersion = async () => {
    if (!newVersion.version.trim()) return;
    setLoading("add_version");
    setError(null);
    try {
      await base44.functions.invoke("niceDatasetManager", {
        action: "add_version",
        version: newVersion.version.trim(),
        label: newVersion.label.trim() || `NICE Framework v${newVersion.version.trim()}`,
        categories: NICE_DATASET.categories,
        work_roles: NICE_DATASET.work_roles,
        tasks: NICE_DATASET.tasks,
        knowledge: NICE_DATASET.knowledge,
        skills: NICE_DATASET.skills,
      });
      refresh();
      setShowAddForm(false);
      setNewVersion({ version: "", label: "" });
    } catch (e) {
      setError(e.response?.data?.error || e.message);
    } finally {
      setLoading(null);
    }
  };

  const totalCategories = activeVersion?.categories?.length || 0;
  const totalWorkRoles = activeVersion?.work_roles?.length || 0;
  const totalTasks = activeVersion?.tasks?.length || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-400" />
            NICE Dataset Manager
          </h2>
          <p className="text-sm text-gray-400 mt-1">
            Manage NICE Cybersecurity Workforce Framework reference data. This dataset is the exclusive source of truth for this workspace.
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm((v) => !v)}
          variant="outline"
          className="border-gray-700 text-gray-300 hover:text-white"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Version
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-900/50 bg-red-950/30 p-3">
          <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {showAddForm && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white text-base">Add New NICE Version</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label className="text-gray-300 text-sm">Version Number</Label>
                <Input
                  value={newVersion.version}
                  onChange={(e) => setNewVersion({ ...newVersion, version: e.target.value })}
                  placeholder="e.g., 2.3.0"
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                />
              </div>
              <div>
                <Label className="text-gray-300 text-sm">Display Label</Label>
                <Input
                  value={newVersion.label}
                  onChange={(e) => setNewVersion({ ...newVersion, label: e.target.value })}
                  placeholder="e.g., NICE Framework v2.3.0"
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500">
              If a version with the same number exists, it will be overwritten. This new version will use the current v2.2.0 reference data as its dataset.
            </p>
            <div className="flex gap-2">
              <Button
                onClick={handleAddVersion}
                disabled={loading === "add_version" || !newVersion.version.trim()}
                className="bg-blue-600 hover:bg-blue-500 text-white"
              >
                {loading === "add_version" ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : (
                  <Plus className="h-4 w-4 mr-1" />
                )}
                Create Version
              </Button>
              <Button
                onClick={() => { setShowAddForm(false); setNewVersion({ version: "", label: "" }); }}
                variant="outline"
                className="border-gray-700 text-gray-300"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Version Dashboard */}
      {activeVersion ? (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <CardTitle className="text-white flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-400" />
                Active: {activeVersion.label || `v${activeVersion.version}`}
              </CardTitle>
              <p className="text-xs text-gray-500 mt-1">
                Imported {activeVersion.imported_at ? new Date(activeVersion.imported_at).toLocaleDateString() : "—"}
              </p>
            </div>
            <Badge className="bg-green-950/50 text-green-400 border border-green-800/40">Active</Badge>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={Layers} label="Categories" value={totalCategories} accent="bg-blue-500/15 text-blue-400" />
              <StatCard icon={Users} label="Work Roles" value={totalWorkRoles} accent="bg-cyan-500/15 text-cyan-400" />
              <StatCard icon={ListChecks} label="Tasks" value={totalTasks} accent="bg-amber-500/15 text-amber-400" />
              <StatCard icon={Database} label="TKS" value={(activeVersion?.knowledge?.length || 0) + (activeVersion?.skills?.length || 0)} accent="bg-purple-500/15 text-purple-400" />
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-gray-900 border-amber-900/40">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm text-amber-300 font-medium">No active NICE version</p>
              <p className="text-xs text-gray-500">Load the default dataset to establish a source of truth.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Load Default Button */}
      <div className="flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900/60 p-4">
        <div>
          <p className="text-sm font-medium text-white">Load Default NICE v2.2.0</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Purges all existing NICE data and replaces it with the official v2.2.0 dataset. All labs will be flagged as stale for review.
          </p>
        </div>
        <Button
          onClick={() => setConfirmLoad(true)}
          disabled={loading === "load_default"}
          className="bg-blue-600 hover:bg-blue-500 text-white"
        >
          {loading === "load_default" ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <Database className="h-4 w-4 mr-1" />
          )}
          Load Default
        </Button>
      </div>

      {/* Version List */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-gray-300">All Versions</h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 text-gray-600 animate-spin" />
          </div>
        ) : versions.length === 0 ? (
          <div className="text-center py-8 text-sm text-gray-600">
            No NICE versions found. Load the default dataset to begin.
          </div>
        ) : (
          versions.map((v) => (
            <div
              key={v.id}
              className={`flex items-center justify-between rounded-lg border p-3 transition-colors ${
                v.id === activeVersionId
                  ? "border-green-800/40 bg-green-950/10"
                  : "border-gray-800 bg-gray-900/40 hover:border-gray-700"
              }`}
            >
              <div className="flex items-center gap-3">
                {v.id === activeVersionId ? (
                  <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                ) : (
                  <div className="h-4 w-4 rounded-full border border-gray-700 shrink-0" />
                )}
                <div>
                  <p className="text-sm text-white font-medium">{v.label || `v${v.version}`}</p>
                  <p className="text-xs text-gray-500">
                    {v.version} · {v.imported_at ? new Date(v.imported_at).toLocaleDateString() : "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {v.id !== activeVersionId && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleActivate(v.id)}
                    disabled={loading === `activate_${v.id}`}
                    className="border-gray-700 text-gray-300 hover:text-white h-8"
                  >
                    {loading === `activate_${v.id}` ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      "Activate"
                    )}
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setConfirmDelete(v)}
                  disabled={v.id === activeVersionId || loading === `delete_${v.id}`}
                  className="text-red-400 hover:text-red-300 hover:bg-red-950/30 h-8"
                >
                  {loading === `delete_${v.id}` ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Trash2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirm Load Default */}
      <AlertDialog open={confirmLoad} onOpenChange={setConfirmLoad}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Overwrite all NICE data?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This will permanently delete all existing NICE framework versions and app settings, replacing them with the official NICE v2.2.0 dataset. All labs will be flagged as stale for review. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 text-gray-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleLoadDefault}
              className="bg-blue-600 hover:bg-blue-500 text-white"
            >
              Overwrite & Load
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Delete */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(v) => !v && setConfirmDelete(null)}>
        <AlertDialogContent className="bg-gray-900 border-gray-700">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Delete NICE version?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Are you sure you want to delete "{confirmDelete?.label || `v${confirmDelete?.version}`}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-700 text-gray-300">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => confirmDelete && handleDelete(confirmDelete.id)}
              className="bg-red-600 hover:bg-red-500 text-white"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}