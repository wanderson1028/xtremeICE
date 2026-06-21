import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  Cloud, Search, Plus, ArrowLeft, CheckCircle2, XCircle,
  Settings, BarChart3, HardDrive, Cpu, Globe, Trash2,
  Network, AlertTriangle, ChevronDown, ChevronRight,
  Wifi, Shield, ExternalLink, RefreshCw, Filter,
  Server, Play, Square, StopCircle, Power
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const STATE_COLORS = {
  running: "text-green-400 bg-green-900/30 border-green-700/30",
  stopped: "text-amber-400 bg-amber-900/30 border-amber-700/30",
  stopping: "text-amber-300 bg-amber-900/20 border-amber-700/20",
  pending: "text-blue-400 bg-blue-900/30 border-blue-700/30",
  provisioning: "text-blue-400 bg-blue-900/30 border-blue-700/30",
  "shutting-down": "text-red-400 bg-red-900/30 border-red-700/30",
  terminated: "text-gray-500 bg-gray-800 border-gray-700",
};

const PROVIDER_COLORS = {
  aws: "from-orange-600/20 to-orange-800/10 border-orange-700/30",
  azure: "from-blue-600/20 to-blue-800/10 border-blue-700/30",
  gcp: "from-green-600/20 to-green-800/10 border-green-700/30",
};

export default function CloudResources() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("instances");
  const [search, setSearch] = useState("");
  const [expandedVpc, setExpandedVpc] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [forceDelete, setForceDelete] = useState(false);
  const [deletingVpc, setDeletingVpc] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [subnetSuggestions, setSubnetSuggestions] = useState(null);
  const [loadingSubnets, setLoadingSubnets] = useState(null);
  const [actionConfirm, setActionConfirm] = useState(null); // { instanceId, action, label }

  // ── Instances query ──
  const { data: instancesData, isLoading: instLoading, refetch: refetchInstances } = useQuery({
    queryKey: ["all-region-instances"],
    queryFn: async () => {
      const res = await base44.functions.invoke("cloudProviderAWS", {
        action: "listAllRegionInstances",
        params: {},
      });
      return res.data;
    },
    staleTime: 15000,
    refetchInterval: 60000,
  });

  // ── Devices query (for lab cross-reference) ──
  const { data: devices = [] } = useQuery({
    queryKey: ["all-livefire-devices"],
    queryFn: () => base44.entities.LiveFireDevice.filter({}),
    staleTime: 30000,
  });

  // ── Labs for names ──
  const { data: labs = [] } = useQuery({
    queryKey: ["all-labs-cloud"],
    queryFn: () => base44.entities.LiveFireLab.filter({}),
    staleTime: 30000,
  });

  // ── VPCs query ──
  const { data: vpcData, isLoading: vpcsLoading, refetch: refetchVpcs } = useQuery({
    queryKey: ["all-region-vpcs"],
    queryFn: async () => {
      const res = await base44.functions.invoke("cloudProviderAWS", {
        action: "listAllRegionVpcs",
        params: {},
      });
      return res.data;
    },
    staleTime: 30000,
  });

  const { data: accounts = [], isLoading: acctsLoading } = useQuery({
    queryKey: ["cloud-accounts"],
    queryFn: () => base44.entities.LiveFireCloudAccount.list("-updated_date", 50),
  });

  const { data: deployments = [] } = useQuery({
    queryKey: ["livefire-deployments"],
    queryFn: () => base44.entities.LiveFireDeployment.list("-updated_date", 50),
  });

  // ── Instance actions ──
  const instanceMutation = useMutation({
    mutationFn: async ({ action, instanceId }) => {
      const res = await base44.functions.invoke("cloudProviderAWS", {
        action,
        params: { instance_id: instanceId },
      });
      return res.data;
    },
    onSuccess: () => {
      setActionConfirm(null);
      refetchInstances();
      queryClient.invalidateQueries({ queryKey: ["all-livefire-devices"] });
    },
    onError: (err) => {
      console.error("Instance action failed:", err);
      setActionConfirm(null);
    },
  });

  // ── VPC delete ──
  const deleteVpcMutation = useMutation({
    mutationFn: async ({ vpcId, force }) => {
      const res = await base44.functions.invoke("cloudProviderAWS", {
        action: "deleteVpc",
        params: { vpc_id: vpcId, force },
      });
      return res.data;
    },
    onSuccess: (data) => {
      if (data?.error) {
        setDeleteError(data.error);
      } else {
        setDeleteConfirm(null);
        setForceDelete(false);
        setDeletingVpc(null);
        setDeleteError(null);
        refetchVpcs();
      }
    },
    onError: (err) => {
      setDeleteError(err?.response?.data?.error || err.message || "Delete failed");
    },
  });

  const handleInstanceAction = (action, instanceId, label) => {
    setActionConfirm({ instanceId, action, label });
  };

  const executeInstanceAction = () => {
    if (!actionConfirm) return;
    instanceMutation.mutate({
      action: actionConfirm.action === "terminate" ? "deleteVM" : actionConfirm.action === "stop" ? "stopVM" : "startVM",
      instanceId: actionConfirm.instanceId,
    });
  };

  // ── Build enriched instance list ──
  const rawInstances = instancesData?.instances || [];
  const deviceByInstanceId = {};
  devices.forEach(d => { if (d.instance_id) deviceByInstanceId[d.instance_id] = d; });
  const labById = {};
  labs.forEach(l => { labById[l.id] = l; });

  const enrichedInstances = rawInstances.map(inst => {
    const device = deviceByInstanceId[inst.instanceId];
    const lab = device ? labById[device.lab_id] : null;
    const isManaged = !!lab;
    return {
      ...inst,
      deviceName: device?.name || inst.instanceId,
      deviceType: device?.device_type || "instance",
      labId: device?.lab_id || null,
      labName: lab?.name || null,
      isManaged,
      cpu: device?.cpu_cores || 2,
      ram: device?.ram_mb || 4096,
      isWindows: (device?.access_method || "").toLowerCase() === "rdp" || (device?.name || "").toLowerCase().includes("windows"),
      accessMethod: device?.access_method || "ssh",
      region: inst.region || device?.region || "us-east-1",
    };
  });

  const filteredInstances = enrichedInstances.filter(inst => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      inst.instanceId.toLowerCase().includes(q) ||
      (inst.deviceName || "").toLowerCase().includes(q) ||
      (inst.labName || "").toLowerCase().includes(q) ||
      (inst.publicIp || "").includes(q) ||
      (inst.instanceId || "").toLowerCase().includes(q)
    );
  });

  const runningCount = enrichedInstances.filter(i => i.state === "running").length;
  const stoppedCount = enrichedInstances.filter(i => i.state === "stopped").length;

  // ── VPC data ──
  const vpcs = vpcData?.vpcs || [];
  const vpcRegions = instancesData?.regions || vpcData?.regions || [];
  const activeRegions = vpcRegions.filter(r => r.count > 0 || r.vpcCount > 0).length;
  const totalRegions = vpcRegions.length;
  const orphanCount = vpcs.filter(v => v.isOrphaned).length;
  const inUseCount = vpcs.filter(v => !v.isOrphaned && !v.isDefault).length;

  const filteredVpcs = vpcs.filter(v => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      v.vpcId.toLowerCase().includes(q) ||
      v.cidrBlock.toLowerCase().includes(q) ||
      (v.name || "").toLowerCase().includes(q) ||
      (v.linkedLab?.name || "").toLowerCase().includes(q)
    );
  });

  const loadSubnets = async (vpcId, vpcCidr) => {
    setLoadingSubnets(vpcId);
    try {
      const res = await base44.functions.invoke("cloudProviderAWS", {
        action: "suggestSubnets",
        params: { vpc_id: vpcId, vpc_cidr: vpcCidr },
      });
      setSubnetSuggestions(res.data);
    } catch { /* ignore */ }
    setLoadingSubnets(null);
  };

  const handleDeleteVpc = () => {
    if (!deleteConfirm) return;
    setDeletingVpc(deleteConfirm.vpcId);
    deleteVpcMutation.mutate({ vpcId: deleteConfirm.vpcId, force: forceDelete || !deleteConfirm.hasInstances });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link to="/LiveFireDashboard" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Cloud Resources</h1>
            <p className="text-sm text-gray-400 font-mono">Manage instances, VPCs, and infrastructure</p>
          </div>
          <Button
            onClick={() => { refetchInstances(); refetchVpcs(); }}
            variant="outline"
            className="border-gray-700 text-gray-400 hover:text-white gap-2"
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-3.5">
            <p className="text-[10px] font-mono text-gray-500 uppercase mb-1">Instances</p>
            <p className="text-xl font-bold text-white">{enrichedInstances.length}</p>
          </div>
          <div className="bg-gray-900/80 border border-green-800/30 rounded-xl p-3.5">
            <p className="text-[10px] font-mono text-gray-500 uppercase mb-1">Running</p>
            <p className="text-xl font-bold text-green-400">{runningCount}</p>
          </div>
          <div className="bg-gray-900/80 border border-amber-800/30 rounded-xl p-3.5">
            <p className="text-[10px] font-mono text-gray-500 uppercase mb-1">Stopped</p>
            <p className="text-xl font-bold text-amber-400">{stoppedCount}</p>
          </div>
          <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-3.5">
            <p className="text-[10px] font-mono text-gray-500 uppercase mb-1">VPCs</p>
            <p className="text-xl font-bold text-white">{vpcs.length}</p>
          </div>
          <div className="bg-gray-900/80 border border-amber-800/30 rounded-xl p-3.5">
            <p className="text-[10px] font-mono text-gray-500 uppercase mb-1">Orphaned</p>
            <p className="text-xl font-bold text-amber-400">{orphanCount}</p>
          </div>
          <div className="bg-gray-900/80 border border-blue-800/30 rounded-xl p-3.5">
            <p className="text-[10px] font-mono text-gray-500 uppercase mb-1">Regions</p>
            <p className="text-lg font-bold text-blue-400 font-mono">{activeRegions}<span className="text-sm text-gray-600">/{totalRegions}</span></p>
          </div>
        </div>

        {/* Search */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
            <Input
              placeholder={`Search ${activeTab === "instances" ? "by name, lab, IP, or instance ID" : "by VPC ID, CIDR, or lab name"}...`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-gray-800 border-gray-700 text-white h-9 text-sm font-mono"
            />
          </div>
          <span className="text-[10px] font-mono text-gray-500">
            {activeTab === "instances"
              ? `${filteredInstances.length} of ${enrichedInstances.length}`
              : `${filteredVpcs.length} of ${vpcs.length}`}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 mb-6">
          {["instances", "vpcs", "accounts"].map(tab => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setSearch(""); }}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-t-lg text-sm font-mono font-bold transition-all ${
                activeTab === tab
                  ? "bg-gray-900 border border-b-0 border-red-800/40 text-red-400"
                  : "bg-gray-900/40 border border-b border-gray-800 text-gray-500 hover:text-gray-300"
              }`}
            >
              {tab === "instances" && <Server className="h-4 w-4" />}
              {tab === "vpcs" && <Network className="h-4 w-4" />}
              {tab === "accounts" && <Cloud className="h-4 w-4" />}
              {tab === "instances" ? "Instances" : tab === "vpcs" ? "VPCs & Networks" : "Cloud Accounts"}
            </button>
          ))}
        </div>

        {/* ── INSTANCES TAB ── */}
        {activeTab === "instances" && (
          <div>
            {instLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-2 border-red-600/30 border-t-red-500 rounded-full animate-spin" />
              </div>
            ) : filteredInstances.length === 0 ? (
              <div className="text-center py-20 bg-gray-900/40 border border-gray-800 rounded-xl">
                <Server className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 font-mono text-sm mb-2">
                  {search ? "No instances match your search" : "No instances found"}
                </p>
                <p className="text-gray-700 font-mono text-xs">
                  Instances will appear here when labs are deployed
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredInstances.map(inst => (
                  <div
                    key={inst.instanceId}
                    className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 flex items-center gap-3 hover:border-gray-700 transition-colors"
                  >
                    <Server className={`h-4 w-4 shrink-0 ${
                      inst.state === "running" ? "text-green-400" :
                      inst.state === "stopped" ? "text-amber-400" :
                      "text-gray-500"
                    }`} />

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-white truncate">{inst.deviceName}</span>
                        <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full border ${STATE_COLORS[inst.state] || "text-gray-500 bg-gray-800 border-gray-700"}`}>
                          {inst.state}
                        </span>
                        {inst.isWindows && <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-blue-900/30 text-blue-400 border border-blue-700/30">Windows</span>}
                        {!inst.isManaged && (
                          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded-full bg-gray-800 text-gray-500 border border-gray-700">External</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-mono text-gray-500">{inst.instanceId}</span>
                        {inst.labName && (
                          <Link to={`/live-lab-topology?labId=${inst.labId}`} className="text-[10px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5">
                            {inst.labName} <ExternalLink className="h-2.5 w-2.5" />
                          </Link>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1">
                        {inst.publicIp && (
                          <span className="text-[9px] font-mono text-green-400">{inst.publicIp}</span>
                        )}
                        {inst.privateIp && (
                          <span className="text-[9px] font-mono text-gray-500">{inst.privateIp}</span>
                        )}
                        <span className="text-[9px] font-mono text-gray-600">{inst.cpu}vCPU / {inst.ram}MB</span>
                        <span className="text-[9px] font-mono text-blue-400/70">{inst.region}</span>
                      </div>
                    </div>

                    {/* Lifecycle Actions — only for managed (lab-linked) instances */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {inst.isManaged ? (
                        <>
                          {inst.state === "stopped" && (
                            <button
                              onClick={() => handleInstanceAction("start", inst.instanceId, `Start ${inst.deviceName}`)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-900/30 border border-green-700/40 text-green-400 hover:bg-green-800/40 text-[10px] font-mono transition-colors"
                            >
                              <Play className="h-3 w-3" /> Start
                            </button>
                          )}
                          {inst.state === "running" && (
                            <button
                              onClick={() => handleInstanceAction("stop", inst.instanceId, `Stop ${inst.deviceName}`)}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-900/30 border border-amber-700/40 text-amber-400 hover:bg-amber-800/40 text-[10px] font-mono transition-colors"
                            >
                              <Square className="h-3 w-3" /> Stop
                            </button>
                          )}
                          <button
                            onClick={() => handleInstanceAction("terminate", inst.instanceId, `Terminate ${inst.deviceName}`)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-900/20 border border-red-800/40 text-red-400 hover:bg-red-800/40 text-[10px] font-mono transition-colors"
                          >
                            <Trash2 className="h-3 w-3" /> Terminate
                          </button>
                        </>
                      ) : (
                        <span className="text-[9px] font-mono text-gray-600 italic px-2">View only — not linked to any lab</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── VPCS TAB ── */}
        {activeTab === "vpcs" && (
          <div>
            {vpcsLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-2 border-red-600/30 border-t-red-500 rounded-full animate-spin" />
              </div>
            ) : filteredVpcs.length === 0 ? (
              <div className="text-center py-20 bg-gray-900/40 border border-gray-800 rounded-xl">
                <Network className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 font-mono text-sm mb-2">
                  {search ? "No VPCs match your search" : "No VPCs found"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {filteredVpcs.map(vpc => {
                  const isExpanded = expandedVpc === vpc.vpcId;
                  const isDefault = vpc.isDefault;
                  const isOrphaned = vpc.isOrphaned;

                  return (
                    <div key={vpc.vpcId} className={`rounded-xl border overflow-hidden transition-all ${
                      isOrphaned ? "bg-amber-950/10 border-amber-800/30" :
                      isDefault ? "bg-gray-900/40 border-gray-800" :
                      "bg-gray-900/60 border-red-900/20"
                    }`}>
                      <div className="flex items-center gap-3 p-4">
                        <button
                          onClick={() => {
                            setExpandedVpc(isExpanded ? null : vpc.vpcId);
                            if (!isExpanded) loadSubnets(vpc.vpcId, vpc.cidrBlock);
                          }}
                          className="text-gray-400 hover:text-white transition-colors"
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Network className={`h-4 w-4 shrink-0 ${isDefault ? "text-blue-400" : isOrphaned ? "text-amber-400" : "text-cyan-400"}`} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-mono font-bold text-white truncate">{vpc.name || vpc.vpcId}</span>
                              <span className="text-[10px] font-mono text-gray-400">{vpc.cidrBlock}</span>
                            </div>
                            <p className="text-[9px] font-mono text-gray-600 truncate">{vpc.vpcId}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 ml-auto shrink-0">
                          {isDefault && (
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-400 border border-blue-700/30">Default</span>
                          )}
                          {isOrphaned && (
                            <span className="flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-900/30 text-amber-400 border border-amber-700/30">
                              <AlertTriangle className="h-2.5 w-2.5" /> Orphaned
                            </span>
                          )}
                          {vpc.linkedLab && (
                            <Link to={`/live-lab-topology?labId=${vpc.linkedLab.id}`}
                              className="flex items-center gap-1 text-[9px] font-mono px-2 py-0.5 rounded-full bg-green-900/30 text-green-400 border border-green-700/30 hover:bg-green-800/30 transition-colors">
                              {vpc.linkedLab.name} <ExternalLink className="h-2.5 w-2.5" />
                            </Link>
                          )}
                          {vpc.region && (
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-blue-900/30 text-blue-400 border border-blue-700/30">
                              {vpc.region}
                            </span>
                          )}
                          {vpc.instanceCount > 0 && (
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-900/30 text-cyan-400 border border-cyan-700/30">
                              {vpc.instanceCount} inst
                            </span>
                          )}
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${
                            vpc.state === "available" ? "bg-green-900/30 text-green-400 border border-green-700/30" : "bg-gray-800 text-gray-500"
                          }`}>{vpc.state}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!isDefault && vpc.linkedLab && (
                            <button
                              onClick={() => setDeleteConfirm({ vpcId: vpc.vpcId, vpcName: vpc.name || vpc.cidrBlock, hasInstances: vpc.instanceCount > 0 })}
                              className="p-1.5 rounded-lg bg-red-900/20 border border-red-800/30 text-red-400 hover:bg-red-800/40 hover:border-red-700/50 transition-colors"
                              title="Delete VPC"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {!isDefault && !vpc.linkedLab && (
                            <span className="text-[8px] font-mono text-gray-600 italic">External VPC — view only</span>
                          )}
                        </div>
                      </div>

                      {isExpanded && (
                        <div className="border-t border-gray-800 px-4 py-3 bg-black/20">
                          <div className="flex items-center gap-2 mb-3">
                            <Wifi className="h-3.5 w-3.5 text-cyan-400" />
                            <span className="text-[10px] font-mono text-gray-400 uppercase tracking-wider">
                              Subnets {vpc.subnets?.length > 0 ? `(${vpc.subnets.length})` : ""}
                            </span>
                            {loadingSubnets === vpc.vpcId && (
                              <div className="w-3 h-3 border border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin ml-2" />
                            )}
                          </div>
                          {subnetSuggestions && expandedVpc === vpc.vpcId ? (
                            <div>
                              <div className="flex items-center gap-3 mb-2 text-[9px] font-mono">
                                <span className="text-gray-500">Available: <span className="text-green-400">{subnetSuggestions.availableCount}</span></span>
                                <span className="text-gray-500">Used: <span className="text-amber-400">{subnetSuggestions.usedCount}</span></span>
                              </div>
                              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-1 max-h-40 overflow-y-auto p-1">
                                {subnetSuggestions.subnets.map(s => (
                                  <div key={s.cidr} className={`text-[9px] font-mono px-1.5 py-1 rounded text-center truncate ${
                                    s.isTaken
                                      ? "bg-amber-900/20 border border-amber-800/30 text-amber-400/70"
                                      : "bg-gray-800/40 border border-gray-700/40 text-gray-400"
                                  }`} title={s.cidr}>
                                    {s.cidr.split("/")[0].split(".").pop()}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : vpc.subnets?.length > 0 ? (
                            <div className="space-y-1.5">
                              {vpc.subnets.map(s => (
                                <div key={s.subnetId} className="flex items-center gap-3 bg-gray-800/30 rounded-lg px-3 py-2 border border-gray-800">
                                  <div className="flex-1 min-w-0">
                                    <span className="text-[10px] font-mono text-gray-200">{s.cidrBlock}</span>
                                    <span className="text-[8px] font-mono text-gray-600 block truncate">{s.subnetId}</span>
                                  </div>
                                  <span className="text-[9px] font-mono text-gray-500">{s.availabilityZone}</span>
                                  <span className="text-[9px] font-mono text-cyan-400">{s.availableIps} IPs</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-[10px] font-mono text-gray-600">No subnets found</p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── CLOUD ACCOUNTS TAB ── */}
        {activeTab === "accounts" && (
          <div>
            {acctsLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-2 border-red-600/30 border-t-red-500 rounded-full animate-spin" />
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center py-20 bg-gray-900/40 border border-gray-800 rounded-xl">
                <Cloud className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 font-mono text-sm mb-4">No cloud accounts configured</p>
                <Button className="bg-red-700 hover:bg-red-600 text-white gap-2">
                  <Plus className="h-4 w-4" /> Connect First Account
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {accounts.map(acct => {
                  const usage = acct.quota_max_instances > 0 ? Math.round((acct.current_instances / acct.quota_max_instances) * 100) : 0;
                  return (
                    <div key={acct.id} className={`bg-gradient-to-br ${PROVIDER_COLORS[acct.provider] || PROVIDER_COLORS.aws} border rounded-xl overflow-hidden`}>
                      <div className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Cloud className="h-4 w-4 text-gray-300" />
                              <span className="text-[10px] font-mono uppercase text-gray-400">{acct.provider}</span>
                            </div>
                            <h3 className="text-sm font-bold text-white">{acct.account_name}</h3>
                            <p className="text-[10px] font-mono text-gray-500">{acct.region}</p>
                          </div>
                          <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono ${
                            acct.status === "active" ? "bg-green-900/30 text-green-400 border border-green-700/30" : "bg-red-900/30 text-red-400 border border-red-700/30"
                          }`}>
                            <div className={`h-1.5 w-1.5 rounded-full ${acct.status === "active" ? "bg-green-400" : "bg-red-400"}`} />
                            {acct.status}
                          </div>
                        </div>
                        <div className="space-y-2 mb-3">
                          <div>
                            <div className="flex justify-between text-[9px] font-mono text-gray-500 mb-0.5">
                              <span>Instances</span>
                              <span>{acct.current_instances}/{acct.quota_max_instances}</span>
                            </div>
                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 rounded-full" style={{ width: `${usage}%` }} />
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 pt-3 border-t border-gray-800">
                          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-400 rounded-lg text-[10px] font-mono transition-colors flex-1 justify-center">
                            <Settings className="h-3 w-3" /> Settings
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── Instance Action Confirmation Dialog ── */}
        <AlertDialog open={!!actionConfirm} onOpenChange={(open) => { if (!open) setActionConfirm(null); }}>
          <AlertDialogContent className="bg-gray-900 border border-red-800/40 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white text-lg flex items-center gap-2">
                {actionConfirm?.action === "terminate" ? (
                  <Trash2 className="h-5 w-5 text-red-400" />
                ) : actionConfirm?.action === "stop" ? (
                  <Square className="h-5 w-5 text-amber-400" />
                ) : (
                  <Play className="h-5 w-5 text-green-400" />
                )}
                {actionConfirm?.label || "Confirm Action"}
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400 space-y-3">
                <p>
                  Are you sure you want to <span className="font-bold text-white">{actionConfirm?.action}</span>{" "}
                  <span className="text-cyan-400 font-mono">{actionConfirm?.instanceId}</span>?
                </p>
                {actionConfirm?.action === "terminate" && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950/30 border border-red-800/40 text-red-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold">This will permanently destroy the instance</p>
                      <p className="text-xs mt-0.5 text-red-400/80">
                        All data on this instance will be lost. This action cannot be undone.
                      </p>
                    </div>
                  </div>
                )}
                {actionConfirm?.action === "stop" && (
                  <p className="text-xs text-amber-400/80">
                    The instance will be stopped. You can start it again later. EBS storage costs still apply.
                  </p>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className={
                  actionConfirm?.action === "terminate" ? "bg-red-700 hover:bg-red-600 text-white" :
                  actionConfirm?.action === "stop" ? "bg-amber-700 hover:bg-amber-600 text-white" :
                  "bg-green-700 hover:bg-green-600 text-white"
                }
                onClick={executeInstanceAction}
                disabled={instanceMutation.isPending}
              >
                {instanceMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Working...
                  </span>
                ) : (
                  actionConfirm?.action === "terminate" ? "Terminate Instance" :
                  actionConfirm?.action === "stop" ? "Stop Instance" : "Start Instance"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ── Delete VPC Confirmation Dialog ── */}
        <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) { setDeleteConfirm(null); setForceDelete(false); setDeleteError(null); } }}>
          <AlertDialogContent className="bg-gray-900 border border-red-800/40 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white text-lg flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-400" />
                Delete VPC
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400 space-y-3">
                <p>
                  Delete VPC{" "}
                  <span className="text-red-400 font-bold font-mono">{deleteConfirm?.vpcName}</span>
                  {" "}({deleteConfirm?.vpcId})?
                </p>
                {deleteConfirm?.hasInstances && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold">This VPC has running instances</p>
                      <p className="text-xs mt-0.5 text-amber-400/80">
                        Check <strong>Force Terminate Instances</strong> to terminate them before deleting.
                      </p>
                    </div>
                  </div>
                )}
                {deleteConfirm?.hasInstances && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={forceDelete}
                      onChange={(e) => setForceDelete(e.target.checked)}
                      className="rounded border-gray-600 bg-gray-800"
                    />
                    <span className="text-sm text-gray-300">Force terminate instances before deleting VPC</span>
                  </label>
                )}
                {deleteError && (
                  <div className="p-3 rounded-lg bg-red-950/30 border border-red-800/40 text-red-300 text-sm font-mono">
                    {deleteError}
                  </div>
                )}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="bg-gray-800 border-gray-700 text-gray-300 hover:bg-gray-700 hover:text-white">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="bg-red-700 hover:bg-red-600 text-white"
                onClick={handleDeleteVpc}
                disabled={deletingVpc === deleteConfirm?.vpcId}
              >
                {deletingVpc === deleteConfirm?.vpcId ? "Deleting..." : "Delete VPC"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}