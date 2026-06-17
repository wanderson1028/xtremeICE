import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Wifi, Server, Scale, Cloud } from "lucide-react";

export default function StepServices({ data, onChange }) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">Network Services</h2>
        <p className="text-muted-foreground mt-1">Configure additional services</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-5 rounded-xl border border-border bg-secondary/50 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Scale className="h-4 w-4 text-primary" /> Load Balancer
            </Label>
            <Switch
              checked={data.load_balancer ?? false}
              onCheckedChange={(v) => onChange({ load_balancer: v })}
            />
          </div>
          <p className="text-xs text-muted-foreground">Distribute traffic across servers</p>
        </div>

        <div className="p-5 rounded-xl border border-border bg-secondary/50 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Wifi className="h-4 w-4 text-primary" /> Wireless
            </Label>
            <Switch
              checked={data.wireless_enabled ?? false}
              onCheckedChange={(v) => onChange({ wireless_enabled: v })}
            />
          </div>
          <p className="text-xs text-muted-foreground">Include wireless access points</p>
        </div>

        <div className="p-5 rounded-xl border border-border bg-secondary/50 space-y-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Server className="h-4 w-4 text-primary" /> On-Premise Server Farm
            </Label>
            <Switch
              checked={data.server_farm ?? false}
              onCheckedChange={(v) => onChange({ server_farm: v })}
            />
          </div>
          {data.server_farm && (
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Number of Servers</Label>
              <Input
                type="number" min={1} max={50}
                placeholder="e.g. 5"
                value={data.num_servers || ""}
                onChange={(e) => onChange({ num_servers: parseInt(e.target.value) || 0 })}
                className="bg-secondary border-border max-w-xs"
              />
            </div>
          )}
        </div>

        <div className="p-5 rounded-xl border border-border bg-secondary/50 space-y-4 md:col-span-2">
          <div className="flex items-center justify-between">
            <Label className="flex items-center gap-2">
              <Cloud className="h-4 w-4 text-primary" /> Cloud Server Farm
            </Label>
            <Switch
              checked={data.cloud_server_farm ?? false}
              onCheckedChange={(v) => onChange({ cloud_server_farm: v, cloud_provider: v ? (data.cloud_provider || "AWS") : null })}
            />
          </div>
          <p className="text-xs text-muted-foreground">Connect to a cloud-hosted server farm</p>
          {data.cloud_server_farm && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Cloud Provider</Label>
                <div className="flex gap-2 flex-wrap">
                  {["AWS", "Azure", "GCP", "Oracle Cloud"].map(provider => (
                    <button
                      key={provider}
                      onClick={() => onChange({ cloud_provider: provider })}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
                        ${(data.cloud_provider || "AWS") === provider
                          ? "bg-primary/20 border-primary/50 text-primary"
                          : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}
                    >
                      {provider}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Number of Cloud Instances</Label>
                <Input
                  type="number" min={1} max={100}
                  placeholder="e.g. 10"
                  value={data.num_cloud_instances || ""}
                  onChange={(e) => onChange({ num_cloud_instances: parseInt(e.target.value) || 0 })}
                  className="bg-secondary border-border max-w-xs"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-muted-foreground">Connectivity Type</Label>
                <div className="flex gap-2 flex-wrap">
                  {["VPN Gateway", "Direct Connect", "SD-WAN"].map(ct => (
                    <button
                      key={ct}
                      onClick={() => onChange({ cloud_connectivity: ct })}
                      className={`px-3 py-1.5 rounded-lg border text-xs font-medium transition-all
                        ${(data.cloud_connectivity || "VPN Gateway") === ct
                          ? "bg-primary/20 border-primary/50 text-primary"
                          : "bg-secondary border-border text-muted-foreground hover:text-foreground"}`}
                    >
                      {ct}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}