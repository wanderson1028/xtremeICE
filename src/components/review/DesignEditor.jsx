import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, Save, X, Plus, Trash2 } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const FIREWALL_VENDORS = ["Cisco ASA", "Palo Alto", "Fortinet", "pfSense", "None"];
const ROUTING_PROTOCOLS = ["OSPF", "EIGRP", "BGP", "Static", "IS-IS", "RIP"];
const WAN_TECHNOLOGIES = ["MPLS", "SD-WAN", "IPSec VPN", "DMVPN", "Metro Ethernet", "Leased Line"];
const ROUTER_MODELS = ["Cisco ISR", "Cisco CSR1000v", "Juniper vMX", "VyOS", "Generic Router"];
const SWITCH_MODELS = ["Cisco Catalyst", "Cisco Nexus", "Arista", "Juniper EX", "Generic L2/L3"];

export default function DesignEditor({ design, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ ...design });

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleArrayChange = (field, index, value) => {
    const arr = [...(formData[field] || [])];
    arr[index] = value;
    setFormData(prev => ({ ...prev, [field]: arr }));
  };

  const handleAddArrayItem = (field) => {
    setFormData(prev => ({
      ...prev,
      [field]: [...(prev[field] || []), ""]
    }));
  };

  const handleRemoveArrayItem = (field, index) => {
    const arr = [...(formData[field] || [])];
    arr.splice(index, 1);
    setFormData(prev => ({ ...prev, [field]: arr }));
  };

  const handleSave = async () => {
    await onSave(formData);
    setIsEditing(false);
  };

  if (!isEditing) {
    return (
      <Button
        variant="outline"
        onClick={() => setIsEditing(true)}
        className="gap-2"
      >
        <Pencil className="h-4 w-4" /> Edit Design
      </Button>
    );
  }

  return (
    <div className="bg-card border border-border rounded-xl p-6 mt-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-foreground">Edit Design</h3>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setFormData({ ...design });
              setIsEditing(false);
            }}
            className="gap-1"
          >
            <X className="h-4 w-4" /> Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            className="gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Save className="h-4 w-4" /> Save Changes
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Basics */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Basics</h4>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Project Name</label>
            <Input
              value={formData.name || ""}
              onChange={(e) => handleChange("name", e.target.value)}
              placeholder="Network Design Name"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Company</label>
            <Input
              value={formData.company_name || ""}
              onChange={(e) => handleChange("company_name", e.target.value)}
              placeholder="Company Name"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Number of Sites</label>
            <Input
              type="number"
              value={formData.num_sites || ""}
              onChange={(e) => handleChange("num_sites", parseInt(e.target.value) || 0)}
              placeholder="1"
            />
          </div>
        </div>

        {/* Topology */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Topology</h4>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Routing Protocol</label>
            <Select value={formData.routing_protocol || ""} onValueChange={(v) => handleChange("routing_protocol", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select protocol" />
              </SelectTrigger>
              <SelectContent>
                {ROUTING_PROTOCOLS.map(p => (
                  <SelectItem key={p} value={p}>{p}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">WAN Technology</label>
            <Select value={formData.wan_technology || ""} onValueChange={(v) => handleChange("wan_technology", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select WAN tech" />
              </SelectTrigger>
              <SelectContent>
                {WAN_TECHNOLOGIES.map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Security */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Security</h4>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="firewall"
              checked={formData.firewall_enabled || false}
              onChange={(e) => handleChange("firewall_enabled", e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="firewall" className="text-sm text-foreground cursor-pointer">Enable Firewall</label>
          </div>
          {formData.firewall_enabled && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Firewall Vendor</label>
              <Select value={formData.firewall_vendor || ""} onValueChange={(v) => handleChange("firewall_vendor", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {FIREWALL_VENDORS.map(v => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="dmz"
              checked={formData.dmz_required || false}
              onChange={(e) => handleChange("dmz_required", e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="dmz" className="text-sm text-foreground cursor-pointer">DMZ Required</label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="redundancy"
              checked={formData.redundancy_enabled || false}
              onChange={(e) => handleChange("redundancy_enabled", e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="redundancy" className="text-sm text-foreground cursor-pointer">Redundancy / HA</label>
          </div>
        </div>

        {/* Services */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Services & Devices</h4>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="lb"
              checked={formData.load_balancer || false}
              onChange={(e) => handleChange("load_balancer", e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="lb" className="text-sm text-foreground cursor-pointer">Load Balancer</label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="wireless"
              checked={formData.wireless_enabled || false}
              onChange={(e) => handleChange("wireless_enabled", e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="wireless" className="text-sm text-foreground cursor-pointer">Wireless APs</label>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="servers"
              checked={formData.server_farm || false}
              onChange={(e) => handleChange("server_farm", e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="servers" className="text-sm text-foreground cursor-pointer">Server Farm</label>
          </div>
          {formData.server_farm && (
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">Number of Servers</label>
              <Input
                type="number"
                value={formData.num_servers || ""}
                onChange={(e) => handleChange("num_servers", parseInt(e.target.value) || 0)}
                placeholder="2"
              />
            </div>
          )}
        </div>

        {/* Hardware */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Hardware Models</h4>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Router Model</label>
            <Select value={formData.router_model || ""} onValueChange={(v) => handleChange("router_model", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select router" />
              </SelectTrigger>
              <SelectContent>
                {ROUTER_MODELS.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Switch Model</label>
            <Select value={formData.switch_model || ""} onValueChange={(v) => handleChange("switch_model", v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select switch" />
              </SelectTrigger>
              <SelectContent>
                {SWITCH_MODELS.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* IP & Config */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Configuration</h4>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">IP Scheme</label>
            <Input
              value={formData.ip_scheme || ""}
              onChange={(e) => handleChange("ip_scheme", e.target.value)}
              placeholder="e.g. 10.0.0.0/8"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Domain Name</label>
            <Input
              value={formData.domain_name || ""}
              onChange={(e) => handleChange("domain_name", e.target.value)}
              placeholder="corp.local"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">NTP Server</label>
            <Input
              value={formData.ntp_server || ""}
              onChange={(e) => handleChange("ntp_server", e.target.value)}
              placeholder="pool.ntp.org"
            />
          </div>
        </div>

        {/* Site Names */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">Site Names</h4>
          <div className="space-y-2">
            {(formData.site_names || []).map((name, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  value={name}
                  onChange={(e) => handleArrayChange("site_names", idx, e.target.value)}
                  placeholder={`Site ${idx + 1}`}
                />
                <button
                  onClick={() => handleRemoveArrayItem("site_names", idx)}
                  className="p-2 hover:bg-secondary rounded-md transition-colors"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddArrayItem("site_names")}
              className="gap-1 w-full"
            >
              <Plus className="h-3 w-3" /> Add Site
            </Button>
          </div>
        </div>

        {/* User Device Types */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">User Device Types</h4>
          <div className="space-y-2">
            {(formData.user_device_types || []).map((type, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  value={type}
                  onChange={(e) => handleArrayChange("user_device_types", idx, e.target.value)}
                  placeholder="e.g. Laptop, Desktop, Phone, OT Device"
                />
                <button
                  onClick={() => handleRemoveArrayItem("user_device_types", idx)}
                  className="p-2 hover:bg-secondary rounded-md transition-colors"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddArrayItem("user_device_types")}
              className="gap-1 w-full"
            >
              <Plus className="h-3 w-3" /> Add Device Type
            </Button>
          </div>
        </div>

        {/* Number of User Devices */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">User Devices</h4>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Total User Devices</label>
            <Input
              type="number"
              value={formData.num_user_devices || ""}
              onChange={(e) => handleChange("num_user_devices", parseInt(e.target.value) || 0)}
              placeholder="Number of devices"
            />
          </div>
        </div>

        {/* DNS Servers */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-foreground">DNS Servers</h4>
          <div className="space-y-2">
            {(formData.dns_servers || []).map((server, idx) => (
              <div key={idx} className="flex gap-2">
                <Input
                  value={server}
                  onChange={(e) => handleArrayChange("dns_servers", idx, e.target.value)}
                  placeholder="8.8.8.8"
                />
                <button
                  onClick={() => handleRemoveArrayItem("dns_servers", idx)}
                  className="p-2 hover:bg-secondary rounded-md transition-colors"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </button>
              </div>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleAddArrayItem("dns_servers")}
              className="gap-1 w-full"
            >
              <Plus className="h-3 w-3" /> Add DNS Server
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}