import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Save } from "lucide-react";

export default function DevicePropertiesEditor({ node, onSave, onClose }) {
  const [formData, setFormData] = useState({
    // Basic info
    label: node.label || "",
    type: node.type || "",
    description: node.description || "",
    // Network config
    ip: node.ip || "",
    hostname: node.hostname || "",
    gateway: node.gateway || "",
    subnet: node.subnet || "",
    // Additional config
    vlans: node.vlans || "",
    mac: node.mac || "",
    serial: node.serial || "",
    firmware: node.firmware || "",
    // Custom notes
    notes: node.notes || "",
    // Device config (advanced)
    deviceConfig: node.deviceConfig || "",
  });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    onSave({
      ...node,
      ...formData,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-card border border-border rounded-xl p-6 w-[600px] max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-foreground">Edit Device Configuration</h3>
          <button onClick={onClose} className="p-1 hover:bg-secondary rounded-md">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-3 pb-4 border-b border-border">
            <h4 className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">Basic Information</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Device Label</label>
                <Input
                  value={formData.label}
                  onChange={(e) => handleChange("label", e.target.value)}
                  placeholder="e.g. Core Router"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Device Type</label>
                <Input
                  value={formData.type}
                  onChange={(e) => handleChange("type", e.target.value)}
                  placeholder="e.g. router"
                  disabled
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => handleChange("description", e.target.value)}
                placeholder="Device description"
              />
            </div>
          </div>

          {/* Network Configuration */}
          <div className="space-y-3 pb-4 border-b border-border">
            <h4 className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">Network Configuration</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">IP Address</label>
                <Input
                  value={formData.ip}
                  onChange={(e) => handleChange("ip", e.target.value)}
                  placeholder="192.168.1.1"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Subnet Mask</label>
                <Input
                  value={formData.subnet}
                  onChange={(e) => handleChange("subnet", e.target.value)}
                  placeholder="255.255.255.0"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Gateway</label>
                <Input
                  value={formData.gateway}
                  onChange={(e) => handleChange("gateway", e.target.value)}
                  placeholder="192.168.1.254"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Hostname</label>
                <Input
                  value={formData.hostname}
                  onChange={(e) => handleChange("hostname", e.target.value)}
                  placeholder="router-core-01"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">VLANs</label>
              <Input
                value={formData.vlans}
                onChange={(e) => handleChange("vlans", e.target.value)}
                placeholder="e.g. 10,20,30"
              />
            </div>
          </div>

          {/* Hardware Details */}
          <div className="space-y-3 pb-4 border-b border-border">
            <h4 className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">Hardware Details</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">MAC Address</label>
                <Input
                  value={formData.mac}
                  onChange={(e) => handleChange("mac", e.target.value)}
                  placeholder="00:11:22:33:44:55"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">Serial Number</label>
                <Input
                  value={formData.serial}
                  onChange={(e) => handleChange("serial", e.target.value)}
                  placeholder="ABC123456"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Firmware Version</label>
              <Input
                value={formData.firmware}
                onChange={(e) => handleChange("firmware", e.target.value)}
                placeholder="e.g. 16.12.03"
              />
            </div>
          </div>

          {/* Device Configuration */}
          <div className="space-y-3 pb-4 border-b border-border">
            <h4 className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">Device Configuration</h4>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Config (Advanced)</label>
              <Textarea
                value={formData.deviceConfig}
                onChange={(e) => handleChange("deviceConfig", e.target.value)}
                placeholder="Paste device configuration here..."
                className="font-mono text-xs min-h-[120px]"
              />
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <h4 className="text-xs uppercase tracking-widest font-semibold text-muted-foreground">Notes</h4>
            <Textarea
              value={formData.notes}
              onChange={(e) => handleChange("notes", e.target.value)}
              placeholder="Additional notes about this device..."
              className="min-h-[80px]"
            />
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t border-border">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={handleSave} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              <Save className="h-4 w-4" /> Save Changes
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}