import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate } from "react-router-dom";
import {
  Activity, Search, ArrowLeft, Play, Pause, Square, Trash2,
  Monitor, Server, Globe, ExternalLink, Terminal, Shield,
  DollarSign, AlertTriangle, XCircle, RefreshCw, BarChart3,
  Network, Save, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const DEVICE_COST_MAP = {
  router: 0.18, switch: 0.14, firewall: 0.22, server: 0.15,
  workstation: 0.12, cloud_resource: 0.20, container: 0.10,
  security_appliance: 0.25, load_balancer: 0.16, monitoring: 0.12,
};

export default function RunningLabs() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [confirmTerminate, setConfirmTerminate] = useState(null);
  const [terminatingLabs, setTerminatingLabs] = useState(new Set());
  const [activeTab, setActiveTab] = useState("labs");
  const [confirmDeleteNetwork, setConfirmDeleteNetwork] = useState(null);
  const [deletingNetworks, setDeletingNetworks] = useState(new Set());
  const [saveDialogOpen, setSaveDialogOpen] = useState(null);
  const [savingNetworks, setSavingNetworks] = useState(new Set());
  const [selectedRegion, setSelectedRegion] = useState("us-west-2");

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

  // Fetch deployments (saved VPCs from DB) — always available
  const { data: deployments = [] } = useQuery({
    queryKey: ["livefire-deployments-vpc"],
    queryFn: () => base44.entities.LiveFireDeployment.list("-updated_date", 50),
    refetchInterval: 15000,
  });

  // Live AWS VPC scan (may fail if region/creds mismatch)
  const { data: liveVpcs = [], isLoading: networksLoading, refetch: refetchNetworks } = useQuery({
    queryKey: ["livefire-networks"],
    queryFn: async () => {
      try {
        const res = await base44.functions.invoke("cloudProviderAWS", {
          action: "listNetworks",
          params: { region: selectedRegion },
        });
        return (res.data?.vpcs || []).map(v => ({ ...v, source: "aws" }));
      } catch {
        return [];
      }
    },
    refetchInterval: 30000,
    enabled: activeTab === "networks",
  });

  // Merge deployed VPCs from DB with live AWS results
  const networksData = (() => {
    const seen = new Set();
    const merged = [];
    // Add DB deployments with VPC IDs
    for (const dep of deployments) {
      if (dep.vpc_id && !seen.has(dep.vpc_id)) {
        seen.add(dep.vpc_id);
        merged.push({
          vpcId: dep.vpc_id,
          cidrBlock: dep.vpc_cidr || "—",
          state: dep.status === "running" ? "available" : dep.status,
          name: dep.vpc_id,
          labId: dep.lab_id,
          source: "deployment",
          deploymentId: dep.id,
          region: dep.region,
        });
      }
    }
    // Add live AWS VPCs not already in DB
    for (const v of liveVpcs) {
      if (!seen.has(v.vpcId)) {
        seen.add(v.vpcId);
        merged.push(v);
      }
    }
    return merged;
  })();

  const deleteNetworkMutation = useMutation({
    mutationFn: async (vpcId) => {
      setDeletingNetworks(prev => new Set([...prev, vpcId]));
      const res = await base44.functions.invoke("cloudProviderAWS", {
        action: "deleteNetwork",
        params: { vpc_id: vpcId, region: selectedRegion },
      });
      return res.data;
    },
    onSuccess: () => {
      refetchNetworks();
      queryClient.invalidateQueries(["running-livefire-labs"]);
      setDeletingNetworks(prev => { const n = new Set(prev); n.delete(confirmDeleteNetwork); return n; });
      setConfirmDeleteNetwork(null);
    },
    onError: () => {
      setDeletingNetworks(prev => { const n = new Set(prev); n.delete(confirmDeleteNetwork); return n; });
    },
  });

  const saveNetworkMutation = useMutation({
    mutationFn: async ({ vpcId, name, cidrBlock }) => {
      setSavingNetworks(prev => new Set([...prev, vpcId]));
      // Create or update a deployment record to persist the VPC
      const existing = await base44.entities.LiveFireDeployment.filter({ vpc_id: vpcId });
      if (existing.length > 0) {
        await base44.entities.LiveFireDeployment.update(existing[0].id, {
          status: "running",
          vpc_cidr: cidrBlock,
        });
      } else {
        await base44.entities.LiveFireDeployment.create({
          lab_id: saveDialogOpen?.labId || "standalone",
          provider: "aws",
          region: "us-east-1",
          status: "running",
          vpc_id: vpcId,
          vpc_cidr: cidrBlock,
          estimated_cost_hourly: 0.05,
        });
      }
      return { success: true };
    },
    onSuccess: () => {
      refetchNetworks();
      queryClient.invalidateQueries(["livefire-deployments"]);
      setSavingNetworks(prev => { const n = new Set(prev); n.delete(saveDialogOpen?.vpcId); return n; });
      setSaveDialogOpen(null);
    },
    onError: () => {
      setSavingNetworks(prev => { const n = new Set(prev); n.delete(saveDialogOpen?.vpcId); return n; });
    },
  });

  const terminateMutation = useMutation({
    mutationFn: async (labId) => {
      setTerminatingLabs(prev => new Set([...prev, labId]));
      const result = await base44.functions.invoke("cloudOrchestrator", {
        action: "terminateLab",
        params: { lab_id: labId },
      });
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["running-livefire-labs"]);
      queryClient.invalidateQueries(["running-devices"]);
      queryClient.invalidateQueries(["livefire-labs"]);
      setTerminatingLabs(prev => {
        const next = new Set(prev);
        next.delete(confirmTerminate);
        return next;
      });
      setConfirmTerminate(null);
    },
    onError: () => {
      setTerminatingLabs(prev => {
        const next = new Set(prev);
        next.delete(confirmTerminate);
        return next;
      });
    },
  });

  const filtered = labs.filter(l =>
    !search || l.name?.toLowerCase().includes(search.toLowerCase())
  );

  const getDevicesForLab = (labId) => devices.filter(d => d.lab_id === labId);

  const getLabHourlyCost = (lab) => {
    const labDevices = getDevicesForLab(lab.id);
    return labDevices.reduce((sum, d) => sum + (d.cost_per_hour || DEVICE_COST_MAP[d.device_type] || 0.15), 0).toFixed(2);
  };

  const totalRunningCost = labs.reduce((sum, lab) => {
    const labDevices = getDevicesForLab(lab.id);
    return sum + labDevices.reduce((s, d) => s + (0.15), 0);
  }, 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-4">
          <Link to="/LiveFireDashboard" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Running Labs</h1>
            <p className="text-sm text-gray-400 font-mono">Active cloud deployments and live devices</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="text-xs font-mono bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-red-700/50"
            >
              {["us-east-1", "us-east-2", "us-west-1", "us-west-2", "eu-west-1", "eu-central-1", "ap-southeast-1", "ap-northeast-1"].map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
            <button onClick={() => { queryClient.invalidateQueries(["running-livefire-labs"]); queryClient.invalidateQueries(["running-devices"]); refetchNetworks(); }}
              className="p-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors">
              <RefreshCw className="h-4 w-4" />
            </button>
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <Input placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)}
                className="pl-9 bg-gray-900 border-gray-700 text-white text-sm h-9" />
            </div>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 mb-6 bg-gray-900/60 rounded-xl p-1 border border-red-900/20 w-fit">
          {[
            { key: "labs", label: "Lab Deployments", icon: Server },
            { key: "networks", label: "VPC Networks", icon: Network },
          ].map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-mono transition-all ${
                activeTab === t.key ? "bg-red-900/40 text-red-300 border border-red-700/30" : "text-gray-500 hover:text-gray-300"
              }`}>
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* Labs Tab Content */}
        {activeTab === "labs" && (<>

        {/* Cost & Resource Summary */}
        {filtered.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Running Labs", value: filtered.filter(l => l.status === "running").length, icon: Activity, color: "green" },
              { label: "Deploying", value: filtered.filter(l => l.status === "deploying").length, icon: RefreshCw, color: "yellow" },
              { label: "Total Devices", value: devices.filter(d => d.status === "running" || d.status === "provisioning").length, icon: Server, color: "cyan" },
              { label: "Est. Cost/hr", value: `$${filtered.reduce((sum, lab) => sum + parseFloat(getLabHourlyCost(lab) || 0), 0).toFixed(2)}`, icon: DollarSign, color: "green" },
            ].map(s => (
              <div key={s.label} className="bg-gray-900/80 border border-red-900/30 rounded-xl p-3 flex items-center gap-3">
                <div className={`h-9 w-9 rounded-lg bg-${s.color}-900/30 border border-${s.color}-700/30 flex items-center justify-center shrink-0`}>
                  <s.icon className={`h-4 w-4 text-${s.color}-400`} />
                </div>
                <div><p className="text-lg font-bold text-white font-mono">{s.value}</p><p className="text-[10px] text-gray-500 font-mono">{s.label}</p></div>
              </div>
            ))}
          </div>
        )}

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
                      <button onClick={(e) => { e.stopPropagation(); navigate(`/lab-creation-wizard?lab=${lab.id}`); }}
                        className="p-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-cyan-400 hover:border-cyan-700/40 transition-colors" title="Edit topology">
                        <BarChart3 className="h-3.5 w-3.5" />
                      </button>
                      {confirmTerminate === lab.id ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => terminateMutation.mutate(lab.id)}
                            disabled={terminatingLabs.has(lab.id)}
                            className="text-[10px] font-mono px-2 py-1 rounded bg-red-800 border border-red-600 text-red-200 hover:bg-red-700 transition-colors">
                            {terminatingLabs.has(lab.id) ? "Destroying..." : "Confirm"}
                          </button>
                          <button onClick={() => setConfirmTerminate(null)}
                            className="text-[10px] font-mono px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-400 hover:text-gray-200 transition-colors">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmTerminate(lab.id)}
                          disabled={terminatingLabs.has(lab.id)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            terminatingLabs.has(lab.id)
                              ? "bg-red-900/30 border-red-700/40 text-red-400 animate-pulse"
                              : "bg-gray-800 border-gray-700 text-gray-400 hover:text-red-400 hover:border-red-700/40"
                          }`} title="Destroy lab">
                          {terminatingLabs.has(lab.id) ? (
                            <div className="w-3.5 h-3.5 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin" />
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
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
                            <th className="text-[10px] font-mono text-gray-500 px-4 py-2 uppercase">Cost/hr</th>
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
                                <span className="text-[10px] font-mono text-green-400">${(device.cost_per_hour || DEVICE_COST_MAP[device.device_type] || 0.15).toFixed(2)}</span>
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
        </>)}

        {/* Networks Tab Content */}
        {activeTab === "networks" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-gray-500 font-mono">
                {networksData.length} network{networksData.length !== 1 ? "s" : ""} found
                {liveVpcs.length > 0 && <span className="text-green-500 ml-1">({liveVpcs.length} live)</span>}
              </p>
              <button onClick={() => { refetchNetworks(); queryClient.invalidateQueries(["livefire-deployments-vpc"]); }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-400 hover:text-white rounded-lg text-[10px] font-mono transition-colors">
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
            </div>
            {networksLoading && liveVpcs.length === 0 ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-2 border-cyan-600/30 border-t-cyan-500 rounded-full animate-spin" />
              </div>
            ) : (networksData || []).length === 0 ? (
              <div className="text-center py-20">
                <Network className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 font-mono text-sm mb-4">No VPC networks found</p>
                <p className="text-xs text-gray-600 font-mono">Deploy a lab to create network infrastructure</p>
              </div>
            ) : (
              (networksData || []).map(vpc => (
                <div key={vpc.vpcId} className="bg-gray-900/80 border border-red-900/30 rounded-xl overflow-hidden">
                  <div className="flex items-center justify-between p-4 border-b border-red-900/20">
                    <div className="flex items-center gap-3">
                      <div className={`h-3 w-3 rounded-full ${vpc.state === "available" ? "bg-green-500 animate-pulse" : "bg-yellow-500"}`} />
                      <div>
                        <h3 className="text-sm font-bold text-white">
                          {vpc.name}
                          {vpc.source === "aws" && <span className="ml-2 text-[9px] font-mono text-green-500 bg-green-900/20 px-1.5 py-0.5 rounded">LIVE</span>}
                          {vpc.source === "deployment" && <span className="ml-2 text-[9px] font-mono text-blue-400 bg-blue-900/20 px-1.5 py-0.5 rounded">SAVED</span>}
                        </h3>
                        <p className="text-[10px] font-mono text-gray-500">
                          {vpc.vpcId} · {vpc.cidrBlock} · {vpc.state}
                          {vpc.region && <span className="ml-1">· {vpc.region}</span>}
                          {vpc.labId && vpc.labId !== "standalone" && <span className="ml-2 text-cyan-400">· Lab: {vpc.labId}</span>}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
                        vpc.state === "available" ? "bg-green-900/30 text-green-400 border-green-700/30" : "bg-yellow-900/30 text-yellow-400 border-yellow-700/30"
                      }`}>
                        {vpc.state}
                      </span>

                      {/* Save Button */}
                      {saveDialogOpen?.vpcId === vpc.vpcId ? (
                        <div className="flex items-center gap-1">
                          <select
                            onChange={(e) => setSaveDialogOpen({ vpcId: vpc.vpcId, labId: e.target.value })}
                            className="text-[10px] font-mono bg-gray-800 border border-gray-700 text-white rounded px-2 py-1"
                            defaultValue=""
                          >
                            <option value="" disabled>Select lab...</option>
                            <option value="standalone">Standalone</option>
                            {labs.map(l => (
                              <option key={l.id} value={l.id}>{l.name}</option>
                            ))}
                          </select>
                          <button onClick={() => saveNetworkMutation.mutate({ vpcId: vpc.vpcId, name: vpc.name, cidrBlock: vpc.cidrBlock })}
                            disabled={savingNetworks.has(vpc.vpcId)}
                            className="text-[10px] font-mono px-2 py-1 rounded bg-green-800 border border-green-600 text-green-200 hover:bg-green-700 transition-colors">
                            {savingNetworks.has(vpc.vpcId) ? "Saving..." : "Save"}
                          </button>
                          <button onClick={() => setSaveDialogOpen(null)}
                            className="text-[10px] font-mono px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-400 hover:text-gray-200 transition-colors">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setSaveDialogOpen({ vpcId: vpc.vpcId, labId: "standalone" })}
                          disabled={savingNetworks.has(vpc.vpcId)}
                          className="p-1.5 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-green-400 hover:border-green-700/40 transition-colors" title="Save to deployment">
                          <Save className="h-3.5 w-3.5" />
                        </button>
                      )}

                      {/* Delete Button */}
                      {confirmDeleteNetwork === vpc.vpcId ? (
                        <div className="flex items-center gap-1">
                          <button onClick={() => deleteNetworkMutation.mutate(vpc.vpcId)}
                            disabled={deletingNetworks.has(vpc.vpcId)}
                            className="text-[10px] font-mono px-2 py-1 rounded bg-red-800 border border-red-600 text-red-200 hover:bg-red-700 transition-colors">
                            {deletingNetworks.has(vpc.vpcId) ? "Deleting..." : "Confirm"}
                          </button>
                          <button onClick={() => setConfirmDeleteNetwork(null)}
                            className="text-[10px] font-mono px-2 py-1 rounded bg-gray-800 border border-gray-700 text-gray-400 hover:text-gray-200 transition-colors">
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setConfirmDeleteNetwork(vpc.vpcId)}
                          disabled={deletingNetworks.has(vpc.vpcId)}
                          className={`p-1.5 rounded-lg border transition-colors ${
                            deletingNetworks.has(vpc.vpcId)
                              ? "bg-red-900/30 border-red-700/40 text-red-400 animate-pulse"
                              : "bg-gray-800 border-gray-700 text-gray-400 hover:text-red-400 hover:border-red-700/40"
                          }`} title="Delete network">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  {/* VPC Details */}
                  <div className="p-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: "VPC ID", value: vpc.vpcId },
                      { label: "CIDR Block", value: vpc.cidrBlock },
                      { label: "State", value: vpc.state },
                      { label: "Lab", value: vpc.labId || "Unassigned" },
                    ].map(d => (
                      <div key={d.label}>
                        <p className="text-[9px] font-mono text-gray-600 uppercase">{d.label}</p>
                        <p className="text-xs font-mono text-white">{d.value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}