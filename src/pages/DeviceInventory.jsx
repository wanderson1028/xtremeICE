import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Upload, Download, Pencil, Trash2, Server, Router, Shield, Wifi, Database, Layers, Settings } from "lucide-react";
import DeviceFormDialog from "../components/inventory/DeviceFormDialog";
import TemplateManager from "../components/inventory/TemplateManager";

const ROLE_ICONS = {
  Router: Router,
  Switch: Layers,
  Firewall: Shield,
  "Access Point": Wifi,
  Server: Server,
  "Load Balancer": Database,
  Other: Server,
};

const STATUS_COLORS = {
  Active: "bg-green-500/20 text-green-400 border-green-500/30",
  Inactive: "bg-gray-500/20 text-gray-400 border-gray-500/30",
  Maintenance: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  Decommissioned: "bg-red-500/20 text-red-400 border-red-500/30",
};

const CSV_FIELDS = ["device_name", "model", "serial_number", "ip_address", "location", "role", "status", "notes"];

function exportCSV(devices) {
  const header = CSV_FIELDS.join(",");
  const rows = devices.map(d =>
    CSV_FIELDS.map(f => `"${(d[f] || "").replace(/"/g, '""')}"`).join(",")
  );
  const blob = new Blob([header + "\n" + rows.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "device_inventory.csv";
  a.click();
  URL.revokeObjectURL(url);
}

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map(h => h.replace(/"/g, "").trim());
  return lines.slice(1).map(line => {
    const vals = line.match(/(".*?"|[^,]+|(?<=,)(?=,)|^(?=,))/g) || [];
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (vals[i] || "").replace(/^"|"$/g, "").replace(/""/g, '"').trim();
    });
    return obj;
  });
}

export default function DeviceInventoryPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editDevice, setEditDevice] = useState(null);
  const [activeTab, setActiveTab] = useState("devices");
  const fileRef = useRef();

  const { data: devices = [], isLoading } = useQuery({
    queryKey: ["DeviceInventory"],
    queryFn: () => base44.entities.DeviceInventory.list("-created_date"),
  });

  const createMut = useMutation({
    mutationFn: d => base44.entities.DeviceInventory.create(d),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["DeviceInventory"] }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }) => base44.entities.DeviceInventory.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["DeviceInventory"] }),
  });

  const deleteMut = useMutation({
    mutationFn: id => base44.entities.DeviceInventory.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["DeviceInventory"] }),
  });

  const handleSave = async (form) => {
    if (editDevice) {
      await updateMut.mutateAsync({ id: editDevice.id, data: form });
    } else {
      await createMut.mutateAsync(form);
    }
    setDialogOpen(false);
    setEditDevice(null);
  };

  const handleEdit = (device) => {
    setEditDevice(device);
    setDialogOpen(true);
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const parsed = parseCSV(ev.target.result);
      for (const item of parsed) {
        if (item.device_name) await createMut.mutateAsync(item);
      }
      qc.invalidateQueries({ queryKey: ["DeviceInventory"] });
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const filtered = devices.filter(d => {
    const matchSearch = !search ||
      [d.device_name, d.model, d.ip_address, d.location, d.serial_number]
        .some(v => (v || "").toLowerCase().includes(search.toLowerCase()));
    const matchRole = filterRole === "all" || d.role === filterRole;
    const matchStatus = filterStatus === "all" || d.status === filterStatus;
    return matchSearch && matchRole && matchStatus;
  });

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Device Inventory</h1>
            <p className="text-muted-foreground text-sm mt-1">{devices.length} device{devices.length !== 1 ? "s" : ""} cataloged</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-xs grid-cols-2 mb-6">
            <TabsTrigger value="devices">Devices</TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <Settings className="h-4 w-4" /> Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="devices" className="space-y-6">
            <div className="flex gap-2 flex-wrap">
              <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={handleImport} />
              <Button variant="outline" onClick={() => fileRef.current.click()}>
                <Upload className="h-4 w-4 mr-2" /> Import CSV
              </Button>
              <Button variant="outline" onClick={() => exportCSV(filtered)} disabled={filtered.length === 0}>
                <Download className="h-4 w-4 mr-2" /> Export CSV
              </Button>
              <Button onClick={() => { setEditDevice(null); setDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Add Device
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by name, IP, model, location..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="w-40"><SelectValue placeholder="All Roles" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Roles</SelectItem>
                  {["Router","Switch","Firewall","Access Point","Server","Load Balancer","Other"].map(r =>
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  )}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-44"><SelectValue placeholder="All Statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {["Active","Inactive","Maintenance","Decommissioned"].map(s =>
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Table */}
            {isLoading ? (
              <div className="text-center text-muted-foreground py-20">Loading inventory...</div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-border rounded-xl">
                <Server className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">No devices found. Add your first device or import a CSV.</p>
              </div>
            ) : (
              <div className="rounded-xl border border-border overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-secondary/50 text-muted-foreground border-b border-border">
                      <th className="text-left px-4 py-3 font-medium">Device</th>
                      <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Model</th>
                      <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Serial #</th>
                      <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">IP Address</th>
                      <th className="text-left px-4 py-3 font-medium hidden lg:table-cell">Location</th>
                      <th className="text-left px-4 py-3 font-medium">Role</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-right px-4 py-3 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((d, i) => {
                      const Icon = ROLE_ICONS[d.role] || Server;
                      return (
                        <tr key={d.id} className={`border-b border-border last:border-0 hover:bg-secondary/30 transition-colors ${i % 2 === 0 ? "" : "bg-secondary/10"}`}>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0">
                                <Icon className="h-4 w-4 text-primary" />
                              </div>
                              <span className="font-medium text-foreground">{d.device_name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">{d.model || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground font-mono text-xs hidden lg:table-cell">{d.serial_number || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground font-mono text-xs hidden sm:table-cell">{d.ip_address || "—"}</td>
                          <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell">{d.location || "—"}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs text-muted-foreground">{d.role || "—"}</span>
                          </td>
                          <td className="px-4 py-3">
                            {d.status ? (
                              <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${STATUS_COLORS[d.status] || ""}`}>
                                {d.status}
                              </span>
                            ) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEdit(d)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => deleteMut.mutate(d.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </TabsContent>

          <TabsContent value="templates">
            <div className="bg-card border border-border rounded-xl p-6">
              <TemplateManager />
            </div>
          </TabsContent>
        </Tabs>
      </div>

      <DeviceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        device={editDevice}
        onSave={handleSave}
      />
    </div>
  );
}