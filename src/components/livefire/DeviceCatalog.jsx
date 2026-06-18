import React, { useState } from "react";
import { Search, Server, Router, Shield, Monitor, HardDrive, Wifi, Cloud, Container, Zap, GitBranch, Eye } from "lucide-react";
import { Input } from "@/components/ui/input";

const DEVICE_CATALOG = [
  { type: "router", label: "Routers", icon: Router, devices: [
    { name: "Cisco CSR 1000v", vendor: "Cisco", cpu: 4, ram: 4096, storage: 8 },
    { name: "Cisco Catalyst 8000v", vendor: "Cisco", cpu: 4, ram: 8192, storage: 16 },
    { name: "Juniper vSRX", vendor: "Juniper", cpu: 2, ram: 4096, storage: 16 },
    { name: "VyOS Router", vendor: "VyOS", cpu: 1, ram: 512, storage: 2 },
    { name: "MikroTik CHR", vendor: "MikroTik", cpu: 1, ram: 256, storage: 1 },
    { name: "Arista vEOS", vendor: "Arista", cpu: 2, ram: 2048, storage: 8 },
  ]},
  { type: "switch", label: "Switches", icon: GitBranch, devices: [
    { name: "Cisco Nexus 9000v", vendor: "Cisco", cpu: 4, ram: 8192, storage: 16 },
    { name: "Arista vEOS Switch", vendor: "Arista", cpu: 2, ram: 2048, storage: 8 },
  ]},
  { type: "firewall", label: "Firewalls", icon: Shield, devices: [
    { name: "FortiGate VM", vendor: "Fortinet", cpu: 2, ram: 4096, storage: 32 },
    { name: "Palo Alto VM-Series", vendor: "Palo Alto", cpu: 4, ram: 8192, storage: 60 },
    { name: "pfSense", vendor: "pfSense", cpu: 2, ram: 2048, storage: 8 },
    { name: "Check Point R81", vendor: "Check Point", cpu: 4, ram: 8192, storage: 50 },
    { name: "Sophos XG", vendor: "Sophos", cpu: 2, ram: 4096, storage: 40 },
  ]},
  { type: "server", label: "Servers", icon: Server, devices: [
    { name: "Ubuntu Server 22.04", vendor: "Ubuntu", cpu: 2, ram: 4096, storage: 20 },
    { name: "Windows Server 2022", vendor: "Windows", cpu: 4, ram: 8192, storage: 40 },
    { name: "Kali Linux", vendor: "Kali", cpu: 4, ram: 8192, storage: 30 },
    { name: "Debian 12", vendor: "Debian", cpu: 2, ram: 2048, storage: 20 },
  ]},
  { type: "workstation", label: "Workstations", icon: Monitor, devices: [
    { name: "Ubuntu Desktop 22.04", vendor: "Ubuntu", cpu: 2, ram: 4096, storage: 20 },
    { name: "Windows 11", vendor: "Windows", cpu: 4, ram: 8192, storage: 40 },
  ]},
  { type: "cloud_resource", label: "Cloud Resources", icon: Cloud, devices: [
    { name: "AWS EC2 t3.medium", vendor: "AWS", cpu: 2, ram: 4096, storage: 20 },
    { name: "Azure VM B2s", vendor: "Azure", cpu: 2, ram: 4096, storage: 20 },
    { name: "GCP e2-medium", vendor: "GCP", cpu: 2, ram: 4096, storage: 20 },
  ]},
  { type: "container", label: "Containers", icon: Container, devices: [
    { name: "Docker Host", vendor: "Docker", cpu: 4, ram: 8192, storage: 40 },
    { name: "Kubernetes Node", vendor: "Kubernetes", cpu: 4, ram: 16384, storage: 50 },
  ]},
  { type: "security_appliance", label: "Security", icon: Shield, devices: [
    { name: "Wazuh EDR", vendor: "Wazuh", cpu: 4, ram: 8192, storage: 50 },
    { name: "Splunk Enterprise", vendor: "Splunk", cpu: 8, ram: 16384, storage: 100 },
    { name: "Suricata IDS", vendor: "Suricata", cpu: 4, ram: 8192, storage: 30 },
  ]},
  { type: "monitoring", label: "Monitoring", icon: Eye, devices: [
    { name: "Zabbix Server", vendor: "Zabbix", cpu: 2, ram: 4096, storage: 20 },
    { name: "Grafana", vendor: "Grafana", cpu: 2, ram: 2048, storage: 10 },
  ]},
];

const TYPE_COLORS = {
  router: "border-blue-600 text-blue-400",
  switch: "border-cyan-600 text-cyan-400",
  firewall: "border-red-600 text-red-400",
  server: "border-green-600 text-green-400",
  workstation: "border-yellow-600 text-yellow-400",
  cloud_resource: "border-purple-600 text-purple-400",
  container: "border-orange-600 text-orange-400",
  security_appliance: "border-pink-600 text-pink-400",
  monitoring: "border-gray-600 text-gray-400",
};

export default function DeviceCatalog({ onSelectDevice, selectedType = "all" }) {
  const [search, setSearch] = useState("");

  const filtered = DEVICE_CATALOG.filter(cat => {
    if (selectedType !== "all" && cat.type !== selectedType) return false;
    return true;
  }).map(cat => ({
    ...cat,
    devices: cat.devices.filter(d =>
      !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.vendor.toLowerCase().includes(search.toLowerCase())
    ),
  })).filter(cat => cat.devices.length > 0);

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
        <Input
          placeholder="Search devices..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-9 bg-gray-800 border-gray-700 text-white text-sm h-9"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-8">
          <Server className="h-8 w-8 text-gray-700 mx-auto mb-2" />
          <p className="text-xs text-gray-500 font-mono">No devices found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(cat => (
            <div key={cat.type}>
              <div className="flex items-center gap-2 mb-2">
                <cat.icon className="h-3.5 w-3.5 text-gray-500" />
                <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">{cat.label}</span>
                <span className="text-[9px] font-mono text-gray-600">({cat.devices.length})</span>
              </div>
              <div className="space-y-1">
                {cat.devices.map(device => (
                  <button
                    key={device.name}
                    onClick={() => onSelectDevice?.({ ...device, type: cat.type })}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-gray-800/60 border border-gray-700 hover:border-red-700/40 transition-all text-left group"
                  >
                    <cat.icon className="h-4 w-4 text-gray-500 group-hover:text-gray-300 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-white font-mono truncate">{device.name}</p>
                      <p className="text-[9px] text-gray-500 font-mono">{device.vendor}</p>
                    </div>
                    <div className="flex items-center gap-2 text-[9px] font-mono text-gray-600 shrink-0">
                      <span>{device.cpu} vCPU</span>
                      <span>{device.ram >= 1024 ? `${device.ram / 1024}GB` : `${device.ram}MB`}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}