import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Pencil, Trash2, Plus } from "lucide-react";

const ROLES = ["Router", "Switch", "Firewall", "Access Point", "Server", "Load Balancer", "Other"];

export default function TemplateManager() {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState(null);
  const [form, setForm] = useState({
    name: "",
    description: "",
    device_role: "",
    model: "",
    default_properties: {}
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["DeviceTemplate"],
    queryFn: () => base44.entities.DeviceTemplate.list("-created_date"),
  });

  const createMut = useMutation({
    mutationFn: d => base44.entities.DeviceTemplate.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["DeviceTemplate"] });
      resetForm();
      setDialogOpen(false);
    },
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DeviceTemplate.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["DeviceTemplate"] });
      resetForm();
      setDialogOpen(false);
    },
  });

  const deleteMut = useMutation({
    mutationFn: id => base44.entities.DeviceTemplate.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["DeviceTemplate"] }),
  });

  const resetForm = () => {
    setForm({
      name: "",
      description: "",
      device_role: "",
      model: "",
      default_properties: {}
    });
    setEditTemplate(null);
  };

  const handleOpenDialog = (template = null) => {
    if (template) {
      setEditTemplate(template);
      setForm({
        name: template.name,
        description: template.description || "",
        device_role: template.device_role,
        model: template.model,
        default_properties: template.default_properties || {}
      });
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.device_role || !form.model.trim()) return;

    if (editTemplate) {
      await updateMut.mutateAsync({ id: editTemplate.id, data: form });
    } else {
      await createMut.mutateAsync(form);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-foreground">Device Templates</h3>
        <Button onClick={() => handleOpenDialog()} size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> New Template
        </Button>
      </div>

      <div className="grid gap-2">
        {templates.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border border-dashed border-border rounded-lg">
            No templates yet. Create one to get started.
          </div>
        ) : (
          templates.map(t => (
            <div key={t.id} className="flex items-start justify-between gap-3 p-3 border border-border rounded-lg bg-card hover:bg-secondary/50 transition-colors">
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-foreground">{t.name}</h4>
                {t.description && <p className="text-xs text-muted-foreground mt-1">{t.description}</p>}
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded">{t.device_role}</span>
                  <span className="text-xs text-muted-foreground">{t.model}</span>
                </div>
              </div>
              <div className="flex gap-1 flex-shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleOpenDialog(t)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMut.mutate(t.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-4">
            <div className="col-span-2 space-y-1">
              <Label>Template Name *</Label>
              <Input
                value={form.name}
                onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Cisco ISR 4331"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Describe this template..."
                rows={2}
              />
            </div>
            <div className="space-y-1">
              <Label>Role *</Label>
              <Select value={form.device_role} onValueChange={v => setForm({ ...form, device_role: v })}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Model *</Label>
              <Input
                value={form.model}
                onChange={e => setForm({ ...form, model: e.target.value })}
                placeholder="e.g. ISR 4331"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Default IP Address (optional)</Label>
              <Input
                value={form.default_properties.ip_address || ""}
                onChange={e => setForm({
                  ...form,
                  default_properties: { ...form.default_properties, ip_address: e.target.value }
                })}
                placeholder="192.168.1.1"
              />
            </div>
            <div className="col-span-2 space-y-1">
              <Label>Default Location (optional)</Label>
              <Input
                value={form.default_properties.location || ""}
                onChange={e => setForm({
                  ...form,
                  default_properties: { ...form.default_properties, location: e.target.value }
                })}
                placeholder="HQ - Rack A2"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name.trim() || !form.device_role || !form.model.trim()}>
              Save Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}