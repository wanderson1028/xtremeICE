import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Cpu, MemoryStick, HardDrive, ChevronLeft } from "lucide-react";

const DEFAULT_ENV = {
  name: "", description: "", os_type: "Ubuntu",
  cpu_cores: 2, memory_mb: 4096, storage_gb: 20,
  kasm_image_id: "", kasm_image_name: "", category: "custom", is_active: true,
};

function EnvForm({ env, onSave, onCancel, saving }) {
  const [form, setForm] = useState(env || DEFAULT_ENV);
  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));
  return (
    <div className="space-y-4">
      <div><Label className="text-gray-300 mb-1 block">Name *</Label>
        <Input value={form.name} onChange={e => update("name", e.target.value)} className="bg-gray-800 border-gray-700 text-white" /></div>
      <div><Label className="text-gray-300 mb-1 block">Description</Label>
        <Textarea value={form.description} onChange={e => update("description", e.target.value)} className="bg-gray-800 border-gray-700 text-white h-16" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label className="text-gray-300 mb-1 block">OS Type</Label>
          <Select value={form.os_type} onValueChange={v => update("os_type", v)}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent>{["Linux","Windows","Kali","Ubuntu","Custom"].map(o=><SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
          </Select></div>
        <div><Label className="text-gray-300 mb-1 block">Category</Label>
          <Select value={form.category} onValueChange={v => update("category", v)}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white"><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="built-in">Built-in</SelectItem><SelectItem value="custom">Custom</SelectItem></SelectContent>
          </Select></div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <div><Label className="text-gray-300 mb-1 block">vCPU</Label>
          <Input type="number" value={form.cpu_cores} onChange={e => update("cpu_cores", parseInt(e.target.value)||2)} className="bg-gray-800 border-gray-700 text-white" /></div>
        <div><Label className="text-gray-300 mb-1 block">RAM (MB)</Label>
          <Input type="number" value={form.memory_mb} onChange={e => update("memory_mb", parseInt(e.target.value)||4096)} className="bg-gray-800 border-gray-700 text-white" /></div>
        <div><Label className="text-gray-300 mb-1 block">Storage (GB)</Label>
          <Input type="number" value={form.storage_gb} onChange={e => update("storage_gb", parseInt(e.target.value)||20)} className="bg-gray-800 border-gray-700 text-white" /></div>
      </div>
      <div><Label className="text-gray-300 mb-1 block">Kasm Image ID</Label>
        <Input value={form.kasm_image_id} onChange={e => update("kasm_image_id", e.target.value)} className="bg-gray-800 border-gray-700 text-white" placeholder="kasm image UUID" /></div>
      <div><Label className="text-gray-300 mb-1 block">Kasm Image Name</Label>
        <Input value={form.kasm_image_name} onChange={e => update("kasm_image_name", e.target.value)} className="bg-gray-800 border-gray-700 text-white" placeholder="e.g. kali-rolling:latest" /></div>
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" onClick={onCancel} className="bg-transparent border-gray-700 text-gray-300">Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={!form.name || saving} className="bg-red-700 hover:bg-red-600 text-white">
          {saving ? "Saving..." : env?.id ? "Update" : "Create"}
        </Button>
      </div>
    </div>
  );
}

export default function LabEnvironments() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);

  const { data: profiles = [], isLoading } = useQuery({
    queryKey: ["environment-profiles"],
    queryFn: () => base44.entities.EnvironmentProfile.list(),
  });

  const handleSave = async (form) => {
    setSaving(true);
    try {
      if (editing?.id) await base44.entities.EnvironmentProfile.update(editing.id, form);
      else await base44.entities.EnvironmentProfile.create(form);
      queryClient.invalidateQueries({ queryKey: ["environment-profiles"] });
      setDialogOpen(false); setEditing(null);
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    await base44.entities.EnvironmentProfile.delete(id);
    queryClient.invalidateQueries({ queryKey: ["environment-profiles"] });
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-5xl mx-auto">
        <Link to="/LabBuilderDashboard" className="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-5 transition-colors">
          <ChevronLeft className="h-4 w-4" /> Course Lab Builder
        </Link>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Lab Environments</h1>
            <p className="text-gray-400 text-sm mt-0.5">Kasm workspace configurations for labs</p>
          </div>
          <Button className="bg-red-700 hover:bg-red-600 text-white"
            onClick={() => { setEditing(null); setDialogOpen(true); }}>
            <Plus className="h-4 w-4 mr-2" /> New Environment
          </Button>
        </div>

        {isLoading && <p className="text-gray-500 animate-pulse">Loading...</p>}

        {!isLoading && profiles.length === 0 && (
          <div className="text-center py-20 border border-dashed border-gray-700 rounded-xl">
            <p className="text-gray-500 mb-4">No environments yet.</p>
            <Button className="bg-red-800/50 hover:bg-red-700/60 text-red-200 border-0"
              onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Create First Environment
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {profiles.map(p => (
            <div key={p.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-white">{p.name}</h3>
                  {p.description && <p className="text-gray-400 text-xs mt-0.5">{p.description}</p>}
                </div>
                <div className="flex gap-1">
                  <Badge className={`border-0 text-xs ${p.category === "built-in" ? "bg-blue-900/50 text-blue-300" : "bg-gray-700 text-gray-300"}`}>
                    {p.category}
                  </Badge>
                </div>
              </div>
              <div className="flex gap-4 text-xs text-gray-500 mb-4">
                <span className="flex items-center gap-1"><Cpu className="h-3 w-3" />{p.cpu_cores} vCPU</span>
                <span className="flex items-center gap-1"><MemoryStick className="h-3 w-3" />{p.memory_mb}MB</span>
                <span className="flex items-center gap-1"><HardDrive className="h-3 w-3" />{p.storage_gb}GB</span>
                <span>{p.os_type}</span>
              </div>
              {p.kasm_image_name && <p className="text-xs text-gray-600 mb-3 font-mono">{p.kasm_image_name}</p>}
              <div className="flex gap-2">
                <Button size="sm" variant="ghost" className="text-gray-400 hover:text-white px-2"
                  onClick={() => { setEditing(p); setDialogOpen(true); }}>
                  <Pencil className="h-3.5 w-3.5 mr-1" /> Edit
                </Button>
                <Button size="sm" variant="ghost" className="text-gray-600 hover:text-red-400 px-2"
                  onClick={() => handleDelete(p.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Environment" : "New Environment"}</DialogTitle>
          </DialogHeader>
          <EnvForm env={editing} onSave={handleSave} onCancel={() => { setDialogOpen(false); setEditing(null); }} saving={saving} />
        </DialogContent>
      </Dialog>
    </div>
  );
}