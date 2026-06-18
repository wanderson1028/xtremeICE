import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  Activity, Search, ArrowLeft, Play, Pause, Square, Trash2,
  Monitor, Server, Globe, ExternalLink, Terminal, Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function RunningLabs() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: labs = [], isLoading } = useQuery({
    queryKey: ["running-livefire-labs"],
    queryFn: async () => {
      const [running, deploying] = await Promise.all([
        base44.entities.LiveFireLab.filter({ status: "running" }, "-updated_date", 50),
        base44.entities.LiveFireLab.filter({ status: "deploying" }, "-updated_date", 50),
      ]);
      return [...deploying, ...running];
    },
    refetchInterval: 10000,
  });

  const { data: devices = [] } = useQuery({
    queryKey: ["running-devices"],
    queryFn: () => base44.entities.LiveFireDevice.filter({}, "-updated_date", 200),
    refetchInterval: 15000,
  });

  const filtered = labs.filter(l =>
    !search || l.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getDevicesForLab = (labId) => devices.filter(d => d.lab_id === labId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/LiveFireDashboard" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Running Labs</h1>
            <p className="text-sm text-gray-400 font-mono">Active cloud deployments and live devices</p>
          </div>
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-gray-900 border-gray-700 text-white text-sm h-9"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-green-600/30 border-t-green-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Activity className="h-12 w-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 font-mono text-sm mb-4">No running labs</p>
            <Link to="/lab-creation-wizard" className="inline-flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-xl font-mono text-sm transition-colors">
              <Play className="h-4 w-4" /> Deploy a Lab
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(lab => {
              const labDevices = getDevicesForLab(lab.id);
              return (
                <div key={lab.id} className="bg-gray-900/80 border border-red-900/30 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-red-900/20">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${lab.status === "running" ? "bg-green-500 animate-pulse" : "bg-yellow-500 animate-pulse"}`} />
                      <div>
                        <h3 className="text-sm font-bold text-white">{lab.name}</h3>
                        <p className="text-[10px] font-mono text-gray-500">
                          {lab.cloud_provider?.toUpperCase()} · {lab.region} · {labDevices.length} devices · ${lab.estimated_cost_hourly?.toFixed(2)}/hr
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        lab.status === "running" ? "bg-green-900/30 text-green-400 border-green-700/30" : "bg-yellow-900/30 text-yellow-400 border-yellow-700/30"
                      }`}>
                        {lab.status}
                      </span>
                      <button className="p-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-yellow-400 hover:border-yellow-700/40 transition-colors">
                        <Pause className="h-3.5 w-3.5" />
                      </button>
                      <button className="p-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-red-400 hover:border-red-700/40 transition-colors">
                        <Square className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {/* Devices table */}
                  {labDevices.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b border-gray-800">
                            <th className="text-[10px] font-mono text-gray-500 px-4 py-2 uppercase">Device</th>
                            <th className="text-[10px] font-mono text-gray-500 px-4 py-2 uppercase">Type</th>
                            <th className="text-[10px] font-mono text-gray-500 px-4 py-2 uppercase">Status</th>
                            <th className="text-[10px] font-mono text-gray-500 px-4 py-2 uppercase">IP</th>
                            <th className="text-[10px] font-mono text-gray-500 px-4 py-2 uppercase">Access</th>
                          </tr>
                        </thead>
                        <tbody>
                          {labDevices.map(device => (
                            <tr key={device.id} className="border-b border-gray-800/50 hover:bg-red-950/10 transition-colors">
                              <td className="px-4 py-2.5">
                                <div className="flex items-center gap-2">
                                  <Server className="h-3.5 w-3.5 text-gray-500" />
                                  <span className="text-xs text-white font-mono">{device.name}</span>
                                </div>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className="text-[10px] font-mono text-gray-400">{device.device_type}</span>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                                  device.status === "running" ? "bg-green-900/30 text-green-400 border border-green-700/30" :
                                  device.status === "provisioning" ? "bg-yellow-900/30 text-yellow-400 border border-yellow-700/30" :
                                  "bg-gray-800 text-gray-500"
                                }`}>{device.status}</span>
                              </td>
                              <td className="px-4 py-2.5">
                                <span className="text-[10px] font-mono text-gray-500">{device.public_ip || device.private_ip || "—"}</span>
                              </td>
                              <td className="px-4 py-2.5">
                                {device.access_url ? (
                                  <a href={device.access_url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[10px] font-mono text-cyan-400 hover:text-cyan-300">
                                    <ExternalLink className="h-3 w-3" /> Connect
                                  </a>
                                ) : (
                                  <span className="text-[10px] font-mono text-gray-600">—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {labDevices.length === 0 && (
                    <div className="p-4 text-center">
                      <p className="text-xs text-gray-600 font-mono">No devices deployed yet</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}