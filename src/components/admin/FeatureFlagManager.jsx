import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Switch } from "@/components/ui/switch";
import { Flag, Plus, Trash2, Loader2 } from "lucide-react";

export default function FeatureFlagManager() {
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ key: "", name: "", description: "" });
  const [creating, setCreating] = useState(false);

  const { data: flags = [], isLoading } = useQuery({
    queryKey: ["feature-flags-admin"],
    queryFn: () => base44.entities.FeatureFlag.list(),
    staleTime: 30_000,
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["feature-flags-admin"] });
    // Also bust individual flag queries
    queryClient.invalidateQueries({ queryKey: ["feature-flag"] });
  };

  const handleToggle = async (flag) => {
    setSaving(flag.id);
    await base44.entities.FeatureFlag.update(flag.id, { is_enabled: !flag.is_enabled });
    invalidate();
    setSaving(null);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this feature flag?")) return;
    await base44.entities.FeatureFlag.delete(id);
    invalidate();
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.key.trim() || !form.name.trim()) return;
    setCreating(true);
    await base44.entities.FeatureFlag.create({
      key: form.key.trim().toLowerCase().replace(/\s+/g, "_"),
      name: form.name.trim(),
      description: form.description.trim(),
      is_enabled: false,
    });
    setForm({ key: "", name: "", description: "" });
    setShowForm(false);
    setCreating(false);
    invalidate();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag className="h-5 w-5 text-red-400" />
          <h2 className="text-lg font-semibold text-white">Feature Flags</h2>
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700">
            {flags.length} flags
          </span>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm font-medium transition-colors"
        >
          <Plus className="h-4 w-4" /> New Flag
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-gray-900 border border-red-900/40 rounded-xl p-4 space-y-3"
        >
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Add Feature Flag</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Key <span className="text-red-400">*</span></label>
              <input
                className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white font-mono placeholder-gray-600 focus:outline-none focus:border-red-500"
                placeholder="e.g. new_network_wizard"
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Display Name <span className="text-red-400">*</span></label>
              <input
                className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500"
                placeholder="New Network Wizard"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Description</label>
            <input
              className="w-full bg-black/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-red-500"
              placeholder="What does enabling this flag do?"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-1.5 rounded-lg border border-gray-600 text-gray-400 hover:text-white text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-4 py-1.5 rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm font-medium transition-colors disabled:opacity-50"
            >
              {creating ? "Creating…" : "Create Flag"}
            </button>
          </div>
        </form>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-gray-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading flags…
        </div>
      ) : flags.length === 0 ? (
        <div className="text-center py-10 text-gray-500 text-sm border border-dashed border-gray-800 rounded-xl">
          No feature flags yet. Create one to control feature rollouts.
        </div>
      ) : (
        <div className="space-y-2">
          {flags.map((flag) => (
            <div
              key={flag.id}
              className="flex items-center justify-between gap-4 bg-gray-900 border border-gray-800 hover:border-gray-700 rounded-xl px-4 py-3 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-white">{flag.name}</span>
                  <span className="text-xs font-mono text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded">
                    {flag.key}
                  </span>
                </div>
                {flag.description && (
                  <p className="text-xs text-gray-500 mt-0.5 truncate">{flag.description}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className={`text-xs font-mono font-bold ${flag.is_enabled ? "text-green-400" : "text-gray-600"}`}>
                  {flag.is_enabled ? "ON" : "OFF"}
                </span>
                {saving === flag.id ? (
                  <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                ) : (
                  <Switch
                    checked={flag.is_enabled}
                    onCheckedChange={() => handleToggle(flag)}
                  />
                )}
                <button
                  onClick={() => handleDelete(flag.id)}
                  className="text-gray-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}