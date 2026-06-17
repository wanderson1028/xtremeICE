import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Copy } from "lucide-react";

export default function TemplateSelector({ open, onOpenChange, onSelect }) {
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [filterRole, setFilterRole] = useState("all");

  const { data: templates = [] } = useQuery({
    queryKey: ["DeviceTemplate"],
    queryFn: () => base44.entities.DeviceTemplate.list("-created_date"),
    enabled: open,
  });

  const filtered = templates.filter(t =>
    filterRole === "all" || t.device_role === filterRole
  );

  const handleSelect = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate);
      setSelectedTemplate(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Select Device Template</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">Filter by Role</label>
            <Select value={filterRole} onValueChange={setFilterRole}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="All Roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {["Router", "Switch", "Firewall", "Access Point", "Server", "Load Balancer", "Other"].map(r =>
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            {filtered.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No templates available for this role.
              </div>
            ) : (
              filtered.map(template => (
                <div
                  key={template.id}
                  onClick={() => setSelectedTemplate(template.id)}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${
                    selectedTemplate === template.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/50 bg-card"
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{template.name}</h3>
                      {template.description && (
                        <p className="text-sm text-muted-foreground mt-1">{template.description}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        <Badge variant="outline" className="text-xs">{template.device_role}</Badge>
                        <span className="text-xs text-muted-foreground">{template.model}</span>
                        {template.category === "built-in" && (
                          <Badge className="text-xs bg-blue-500/20 text-blue-400 border-blue-500/30">Built-in</Badge>
                        )}
                      </div>
                    </div>
                    <Copy className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={handleSelect} disabled={!selectedTemplate}>Use Template</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}