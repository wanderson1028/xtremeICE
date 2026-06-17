import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Router, Cpu, Globe, User, Lock, Monitor, Smartphone, Laptop, Printer, Phone, Tv, Radio, Settings, Database, Server, Terminal, Activity } from "lucide-react";

const routerModels = ["Cisco ISR", "Cisco CSR1000v", "Juniper vMX", "VyOS", "Generic Router"];
const switchModels = ["Cisco Catalyst", "Cisco Nexus", "Arista", "Juniper EX", "Generic L2/L3"];

const USER_DEVICE_OPTIONS = [
  { value: "Windows Workstation", icon: Monitor, category: "IT" },
  { value: "Windows Laptop", icon: Laptop, category: "IT" },
  { value: "MacBook", icon: Laptop, category: "IT" },
  { value: "Linux Workstation", icon: Monitor, category: "IT" },
  { value: "iPhone/iOS", icon: Smartphone, category: "IT" },
  { value: "Android Phone", icon: Smartphone, category: "IT" },
  { value: "IP Phone (VoIP)", icon: Phone, category: "IT" },
  { value: "Thin Client", icon: Monitor, category: "IT" },
  { value: "Network Printer", icon: Printer, category: "IT" },
  { value: "Smart TV / Display", icon: Tv, category: "IT" },
  { value: "PLC", icon: Settings, category: "OT/ICS" },
  { value: "RTU", icon: Radio, category: "OT/ICS" },
  { value: "HMI Terminal", icon: Terminal, category: "OT/ICS" },
  { value: "SCADA Server", icon: Server, category: "OT/ICS" },
  { value: "Historian Server", icon: Database, category: "OT/ICS" },
  { value: "Engineering Workstation", icon: Monitor, category: "OT/ICS" },
  { value: "Data Diode", icon: Activity, category: "OT/ICS" },
  { value: "Field Sensor / IED", icon: Radio, category: "OT/ICS" },
];

export default function StepDevices({ data, onChange }) {
  const selectedDeviceTypes = data.user_device_types || [];

  const toggleDeviceType = (val) => {
    if (selectedDeviceTypes.includes(val)) {
      onChange({ user_device_types: selectedDeviceTypes.filter(d => d !== val) });
    } else {
      onChange({ user_device_types: [...selectedDeviceTypes, val] });
    }
  };

  return (
    <div className="space-y-7">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-foreground">IP, Devices & Credentials</h2>
        <p className="text-muted-foreground mt-1">Configure devices, user endpoints, and access credentials</p>
      </div>

      {/* Network Devices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <Router className="h-4 w-4 text-primary" /> Router Model
          </Label>
          <Select value={data.router_model || ""} onValueChange={(v) => onChange({ router_model: v })}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Select router" />
            </SelectTrigger>
            <SelectContent>
              {routerModels.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <Cpu className="h-4 w-4 text-primary" /> Switch Model
          </Label>
          <Select value={data.switch_model || ""} onValueChange={(v) => onChange({ switch_model: v })}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Select switch" />
            </SelectTrigger>
            <SelectContent>
              {switchModels.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        <div className="md:col-span-2 space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <Globe className="h-4 w-4 text-primary" /> IP Addressing Scheme
          </Label>
          <Input
            placeholder="e.g. 10.0.0.0/8 or 172.16.0.0/12"
            value={data.ip_scheme || ""}
            onChange={(e) => onChange({ ip_scheme: e.target.value })}
            className="bg-secondary border-border"
          />
        </div>
      </div>

      {/* Device Credentials */}
      <div>
        <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">Device Credentials</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-primary" /> Username
            </Label>
            <Input
              placeholder="e.g. admin"
              value={data.device_username || ""}
              onChange={(e) => onChange({ device_username: e.target.value })}
              className="bg-secondary border-border"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Lock className="h-4 w-4 text-primary" /> Password
            </Label>
            <Input
              type="password"
              placeholder="Device password"
              value={data.device_password || ""}
              onChange={(e) => onChange({ device_password: e.target.value })}
              className="bg-secondary border-border"
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Lock className="h-4 w-4 text-primary" /> Enable Password
            </Label>
            <Input
              type="password"
              placeholder="Enable/privileged password"
              value={data.enable_password || ""}
              onChange={(e) => onChange({ enable_password: e.target.value })}
              className="bg-secondary border-border"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">Domain Name</Label>
            <Input
              placeholder="e.g. corp.local"
              value={data.domain_name || ""}
              onChange={(e) => onChange({ domain_name: e.target.value })}
              className="bg-secondary border-border"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">NTP Server</Label>
            <Input
              placeholder="e.g. 0.pool.ntp.org"
              value={data.ntp_server || ""}
              onChange={(e) => onChange({ ntp_server: e.target.value })}
              className="bg-secondary border-border"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm text-muted-foreground">DNS Servers</Label>
            <Input
              placeholder="8.8.8.8, 8.8.4.4"
              value={(data.dns_servers || []).join(", ")}
              onChange={(e) => onChange({ dns_servers: e.target.value.split(",").map(s => s.trim()) })}
              className="bg-secondary border-border"
            />
          </div>
        </div>
      </div>

      {/* User Devices */}
      <div>
        <h3 className="text-sm font-semibold text-primary uppercase tracking-wider mb-3">End-User Devices</h3>
        <div className="space-y-4">
          <div className="space-y-2 max-w-xs">
            <Label className="text-sm">Total Number of User Devices</Label>
            <Input
              type="number" min={0} max={10000}
              placeholder="e.g. 150"
              value={data.num_user_devices || ""}
              onChange={(e) => onChange({ num_user_devices: parseInt(e.target.value) || 0 })}
              className="bg-secondary border-border"
            />
          </div>

          <div>
            <Label className="text-sm mb-3 block">Device Types Present on Network</Label>
            {["IT", "OT/ICS"].map(cat => (
              <div key={cat} className="mb-4">
                <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-2">{cat} Devices</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {USER_DEVICE_OPTIONS.filter(d => d.category === cat).map(({ value, icon: Icon }) => {
                    const selected = selectedDeviceTypes.includes(value);
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => toggleDeviceType(value)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-left text-xs font-medium transition-all
                          ${selected
                            ? "border-primary bg-primary/10 text-primary"
                            : "border-border bg-secondary text-muted-foreground hover:border-muted-foreground/40"
                          }`}
                      >
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        {value}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}