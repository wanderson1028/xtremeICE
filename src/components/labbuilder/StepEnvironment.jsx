import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Server, Router, Shield, Monitor, Plus, X } from "lucide-react";

const DEVICE_TYPES = [
  { value: "server", label: "Server", icon: Server },
  { value: "router", label: "Router", icon: Router },
  { value: "firewall", label: "Firewall", icon: Shield },
  { value: "workstation", label: "Workstation", icon: Monitor },
];

export default function StepEnvironment({ data, update }) {
  const [envProfile, setEnvProfile] = useState(data.environment_profile_id || "");
  const [topologyName, setTopologyName] = useState(data.network_topology?.name || "");
  const [topologyDesc, setTopologyDesc] = useState(data.network_topology?.description || "");
  const [devices, setDevices] = useState(data.network_topology?.devices || []);

  const applyEnvProfile = (val) => {
    setEnvProfile(val);
    update({ environment_profile_id: val });
  };

  const applyTopology = (field, value) => {
    if (field === "name") setTopologyName(value);
    if (field === "description") setTopologyDesc(value);
    update({
      network_topology: {
        ...data.network_topology,
        name: field === "name" ? value : topologyName,
        description: field === "description" ? value : topologyDesc,
        devices,
      },
    });
  };

  const addDevice = (type) => {
    const newDevices = [...devices, { id: `dev-${Date.now()}`, type, name: `${type}-${devices.length + 1}` }];
    setDevices(newDevices);
    update({
      network_topology: {
        ...data.network_topology,
        name: topologyName,
        description: topologyDesc,
        devices: newDevices,
      },
    });
  };

  const removeDevice = (id) => {
    const newDevices = devices.filter((d) => d.id !== id);
    setDevices(newDevices);
    update({
      network_topology: {
        ...data.network_topology,
        name: topologyName,
        description: topologyDesc,
        devices: newDevices,
      },
    });
  };

  return (
    <div className="space-y-5">
      <div>
        <Label className="text-gray-200 text-sm font-medium">Environment Profile ID</Label>
        <Input
          value={envProfile}
          onChange={(e) => applyEnvProfile(e.target.value)}
          placeholder="e.g., linux-ubuntu-2204-base"
          className="mt-1.5 bg-gray-900 border-gray-700 text-gray-200 placeholder-gray-500 focus:border-red-600"
        />
        <p className="text-xs text-gray-500 mt-1">Reference to a pre-configured environment image/profile.</p>
      </div>

      <div className="pt-3 border-t border-gray-800">
        <p className="text-sm font-semibold text-gray-200 mb-3">Network Topology</p>

        <div className="space-y-4">
          <div>
            <Label className="text-gray-200 text-sm font-medium">Topology Name</Label>
            <Input
              value={topologyName}
              onChange={(e) => applyTopology("name", e.target.value)}
              placeholder="e.g., Simple LAN with Firewall"
              className="mt-1.5 bg-gray-900 border-gray-700 text-gray-200 placeholder-gray-500 focus:border-red-600"
            />
          </div>

          <div>
            <Label className="text-gray-200 text-sm font-medium">Topology Description</Label>
            <Textarea
              value={topologyDesc}
              onChange={(e) => applyTopology("description", e.target.value)}
              placeholder="Describe the network layout and device roles..."
              className="mt-1.5 bg-gray-900 border-gray-700 text-gray-200 placeholder-gray-500 focus:border-red-600 min-h-[70px]"
            />
          </div>

          <div>
            <Label className="text-gray-200 text-sm font-medium">Devices</Label>
            <div className="flex gap-2 mt-1.5 mb-3">
              {DEVICE_TYPES.map((dt) => (
                <button
                  key={dt.value}
                  type="button"
                  onClick={() => addDevice(dt.value)}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-gray-900 border border-gray-700 text-gray-400 hover:border-red-600 hover:text-red-300 transition-all"
                >
                  <Plus className="h-3 w-3" />
                  {dt.label}
                </button>
              ))}
            </div>

            {devices.length === 0 ? (
              <p className="text-xs text-gray-500 italic py-4 text-center border border-dashed border-gray-800 rounded-lg">
                No devices added. Click a device type above to add one.
              </p>
            ) : (
              <div className="space-y-2">
                {devices.map((d) => {
                  const dt = DEVICE_TYPES.find((t) => t.value === d.type);
                  return (
                    <div
                      key={d.id}
                      className="flex items-center gap-2 bg-gray-900 border border-gray-800 rounded-lg px-3 py-2"
                    >
                      {dt && <dt.icon className="h-4 w-4 text-red-400 shrink-0" />}
                      <span className="text-sm text-gray-300">{d.name}</span>
                      <span className="text-[10px] text-gray-600 uppercase">{d.type}</span>
                      <button
                        type="button"
                        onClick={() => removeDevice(d.id)}
                        className="ml-auto text-gray-600 hover:text-red-400 transition-colors"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}