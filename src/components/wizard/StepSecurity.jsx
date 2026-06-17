import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Shield, ShieldCheck, Server } from "lucide-react";

const firewallVendors = ["Cisco ASA", "Palo Alto", "Fortinet", "pfSense", "None"];

export default function StepSecurity({ data, onChange }) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">Security Configuration</h2>
        <p className="text-muted-foreground mt-1">Set up firewalls and security zones</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl border border-border bg-secondary/50 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" /> Enable Firewall
            </Label>
            <Switch
              checked={data.firewall_enabled ?? true}
              onCheckedChange={(v) => onChange({ firewall_enabled: v })}
            />
          </div>
          {(data.firewall_enabled ?? true) && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Firewall Vendor</Label>
              <Select value={data.firewall_vendor || ""} onValueChange={(v) => onChange({ firewall_vendor: v })}>
                <SelectTrigger className="bg-secondary border-border">
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {firewallVendors.map((f) => (
                    <SelectItem key={f} value={f}>{f}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>

        <div className="p-5 rounded-xl border border-border bg-secondary/50 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-primary" /> DMZ Required
            </Label>
            <Switch
              checked={data.dmz_required ?? false}
              onCheckedChange={(v) => onChange({ dmz_required: v })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Add a demilitarized zone for public-facing servers
          </p>
        </div>

        <div className="p-5 rounded-xl border border-border bg-secondary/50 space-y-4">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" /> Redundancy / HA
            </Label>
            <Switch
              checked={data.redundancy_enabled ?? false}
              onCheckedChange={(v) => onChange({ redundancy_enabled: v })}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Enable high-availability with redundant links and devices
          </p>
        </div>
      </div>
    </div>
  );
}