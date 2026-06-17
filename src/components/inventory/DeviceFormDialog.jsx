import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import TemplateSelector from "./TemplateSelector";
import { Copy } from "lucide-react";

const ROLES = ["Router", "Switch", "Firewall", "Access Point", "Server", "Load Balancer", "Other"];
const STATUSES = ["Active", "Inactive", "Maintenance", "Decommissioned"];

const empty = { device_name: "", model: "", serial_number: "", ip_address: "", location: "", role: "", status: "Active", notes: "" };

export default function DeviceFormDialog({ open, onOpenChange, device, onSave }) {
  const [form, setForm] = useState(empty);
  const [templateSelectorOpen, setTemplateSelectorOpen] = useState(false);

  useEffect(() => {
    setForm(device ? { ...empty, ...device } : empty);
  }, [device, open]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const handleSave = () => {
    if (!form.device_name.trim()) return;
    onSave(form);
  };

  const handleTemplateSelect = (template) => {
    setForm(f => ({
      ...f,
      model: template.model,
      role: template.device_role,
      ...(template.default_properties?.ip_address && { ip_address: template.default_properties.ip_address }),
      ...(template.default_properties?.location && { location: template.default_properties.location }),
      ...(template.default_properties?.status && { status: template.default_properties.status })
    }));
    setTemplateSelectorOpen(false);
  };

  return (
    <>
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <DialogTitle>{device ? "Edit Device" : "Add Device"}</DialogTitle>
            {!device && (
              <Button variant="outline" size="sm" onClick={() => setTemplateSelectorOpen(true)} className="gap-2">
                <Copy className="h-3.5 w-3.5" /> Template
              </Button>
            )}
          </div>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="col-span-2 space-y-1">
            <Label>Device Name *</Label>
            <Input value={form.device_name} onChange={e => set("device_name", e.target.value)} placeholder="e.g. CORP-RTR-01" />
          </div>
          <div className="space-y-1">
            <Label>Model</Label>
            <Input value={form.model} onChange={e => set("model", e.target.value)} placeholder="e.g. Cisco ISR 4331" />
          </div>
          <div className="space-y-1">
            <Label>Serial Number</Label>
            <Input value={form.serial_number} onChange={e => set("serial_number", e.target.value)} placeholder="FTX1234ABCD" />
          </div>
          <div className="space-y-1">
            <Label>IP Address</Label>
            <Input value={form.ip_address} onChange={e => set("ip_address", e.target.value)} placeholder="192.168.1.1" />
          </div>
          <div className="space-y-1">
            <Label>Location</Label>
            <Input value={form.location} onChange={e => set("location", e.target.value)} placeholder="HQ - Rack A2" />
          </div>
          <div className="space-y-1">
            <Label>Role</Label>
            <Select value={form.role} onValueChange={v => set("role", v)}>
              <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
              <SelectContent>
                {ROLES.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Status</Label>
            <Select value={form.status} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Notes</Label>
            <Textarea value={form.notes} onChange={e => set("notes", e.target.value)} placeholder="Any additional notes..." rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSave} disabled={!form.device_name.trim()}>Save Device</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <TemplateSelector
      open={templateSelectorOpen}
      onOpenChange={setTemplateSelectorOpen}
      onSelect={handleTemplateSelect}
    />
    </>
  );
}