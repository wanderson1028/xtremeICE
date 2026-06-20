import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  Cloud, Search, Plus, ArrowLeft, CheckCircle2, XCircle,
  Settings, BarChart3, HardDrive, Cpu, Globe, Trash2,
  Network, AlertTriangle, ChevronDown, ChevronRight,
  Wifi, Shield, ExternalLink, RefreshCw, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const PROVIDER_COLORS = {
  aws: "from-orange-600/20 to-orange-800/10 border-orange-700/30",
  azure: "from-blue-600/20 to-blue-800/10 border-blue-700/30",
  gcp: "from-green-600/20 to-green-800/10 border-green-700/30",
};

const PROVIDER_LABELS = {
  aws: "Amazon Web Services",
  azure: "Microsoft Azure",
  gcp: "Google Cloud Platform",
};

export default function CloudResources() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("vpcs"); // vpcs | accounts
  const [searchVpc, setSearchVpc] = useState("");
  const [expandedVpc, setExpandedVpc] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // { vpcId, vpcName, hasInstances }
  const [forceDelete, setForceDelete] = useState(false);
  const [deletingVpc, setDeletingVpc] = useState(null);
  const [deleteError, setDeleteError] = useState(null);
  const [subnetSuggestions, setSubnetSuggestions] = useState(null);
  const [loadingSubnets, setLoadingSubnets] = useState(null);

  const { data: vpcData, isLoading: vpcsLoading, refetch: refetchVpcs } = useQuery({
    queryKey: ["all-vpcs"],
    queryFn: async () => {
      const res = await base44.functions.invoke("cloudProviderAWS", {
        action: "listAllVpcs",
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

  const vpcs = vpcData?.vpcs || [];
  const region = vpcData?.region || "us-east-1";
  const orphanCount = vpcs.filter(v => v.isOrphaned).length;
  const inUseCount = vpcs.filter(v => !v.isOrphaned && !v.isDefault).length;

  const filteredVpcs = vpcs.filter(v => {
    if (!searchVpc) return true;
    const q = searchVpc.toLowerCase();
    return (
      v.vpcId.toLowerCase().includes(q) ||
      v.cidrBlock.toLowerCase().includes(q) ||
      (v.name || "").toLowerCase().includes(q) ||
      (v.linkedLab?.name || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link to="/LiveFireDashboard" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">Cloud Resources</h1>
            <p className="text-sm text-gray-400 font-mono">VPC management & cloud infrastructure</p>
          </div>
          <Button onClick={() => refetchVpcs()} variant="outline" className="border-gray-700 text-gray-400 hover:text-white gap-2">
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>

        {/* Stats Bar */}
        {vpcData && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <div className="bg-gray-900/80 border border-gray-800 rounded-xl p-3.5">
              <p className="text-[10px] font-mono text-gray-500 uppercase mb-1">Total VPCs</p>
              <p className="text-xl font-bold text-white">{vpcs.length}</p>
            </div>
            <div className="bg-gray-900/80 border border-green-800/30 rounded-xl p-3.5">
              <p className="text-[10px] font-mono text-gray-500 uppercase mb-1">In Use</p>
              <p className="text-xl font-bold text-green-400">{inUseCount}</p>
            </div>
            <div className="bg-gray-900/80 border border-amber-800/30 rounded-xl p-3.5">
              <p className="text-[10px] font-mono text-gray-500 uppercase mb-1">Orphaned</p>
              <p className="text-xl font-bold text-amber-400">{orphanCount}</p>
            </div>
            <div className="bg-gray-900/80 border border-blue-800/30 rounded-xl p-3.5">
              <p className="text-[10px] font-mono text-gray-500 uppercase mb-1">Region</p>
              <p className="text-lg font-bold text-blue-400 font-mono">{region}</p>
            </div>
            <div className="bg-gray-900/80 border border-red-800/30 rounded-xl p-3.5">
              <p className="text-[10px] font-mono text-gray-500 uppercase mb-1">Deployments</p>
              <p className="text-xl font-bold text-red-400">{deployments.length}</p>
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex gap-0 mb-6">
          <button
            onClick={() => setActiveTab("vpcs")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-t-lg text-sm font-mono font-bold transition-all ${
              activeTab === "vpcs"
                ? "bg-gray-900 border border-b-0 border-red-800/40 text-red-400"
                : "bg-gray-900/40 border border-b border-gray-800 text-gray-500 hover:text-gray-300"
            }`}
          >
            <Network className="h-4 w-4" /> VPCs & Subnets
          </button>
          <button
            onClick={() => setActiveTab("accounts")}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-t-lg text-sm font-mono font-bold transition-all ${
              activeTab === "accounts"
                ? "bg-gray-900 border border-b-0 border-red-800/40 text-red-400"
                : "bg-gray-900/40 border border-b border-gray-800 text-gray-500 hover:text-gray-300"
            }`}
          >
            <Cloud className="h-4 w-4" /> Cloud Accounts
          </button>
        </div>

        {/* VPC Management Tab */}
        {activeTab === "vpcs" && (
          <div>
            {/* Search & Filters */}
            <div className="flex items-center gap-3 mb-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <Input
                  placeholder="Search by VPC ID, CIDR, or lab name..."
                  value={searchVpc}
                  onChange={(e) => setSearchVpc(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-700 text-white h-9 text-sm font-mono"
                />
              </div>
              <div className="flex gap-2">
                <span className="text-[10px] font-mono text-gray-500 self-center">
                  {filteredVpcs.length} of {vpcs.length}
                </span>
              </div>
            </div>

            {vpcsLoading ? (
              <div className="flex justify-center py-20">
                <div className="w-8 h-8 border-2 border-red-600/30 border-t-red-500 rounded-full animate-spin" />
              </div>
            ) : filteredVpcs.length === 0 ? (
              <div className="text-center py-20 bg-gray-900/40 border border-gray-800 rounded-xl">
                <Network className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 font-mono text-sm mb-2">No VPCs found</p>
                <p className="text-gray-700 font-mono text-xs">VPCs will appear here when labs are deployed</p>
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
                      {/* VPC Row */}
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

                        {/* Badges */}
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
                          {!vpc.linkedLab && !isOrphaned && !isDefault && (
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-gray-800 text-gray-500">Unknown</span>
                          )}
                          {vpc.instanceCount > 0 && (
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-cyan-900/30 text-cyan-400 border border-cyan-700/30">
                              {vpc.instanceCount} instance{vpc.instanceCount !== 1 ? "s" : ""}
                            </span>
                          )}
                          <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${
                            vpc.state === "available" ? "bg-green-900/30 text-green-400 border border-green-700/30" : "bg-gray-800 text-gray-500"
                          }`}>{vpc.state}</span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          {!isDefault && (
                            <button
                              onClick={() => setDeleteConfirm({ vpcId: vpc.vpcId, vpcName: vpc.name || vpc.cidrBlock, hasInstances: vpc.instanceCount > 0 })}
                              className="p-1.5 rounded-lg bg-red-900/20 border border-red-800/30 text-red-400 hover:bg-red-800/40 hover:border-red-700/50 transition-colors"
                              title="Delete VPC"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Expanded Subnets */}
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
                            /* Full subnet grid from CIDR analysis */
                            <div>
                              <div className="flex items-center gap-3 mb-2 text-[9px] font-mono">
                                <span className="text-gray-500">
                                  Available: <span className="text-green-400">{subnetSuggestions.availableCount}</span>
                                </span>
                                <span className="text-gray-500">
                                  Used: <span className="text-amber-400">{subnetSuggestions.usedCount}</span>
                                </span>
                                <span className="text-gray-600">| {subnetSuggestions.subnetCount} total /24s</span>
                              </div>
                              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-1 max-h-40 overflow-y-auto p-1">
                                {subnetSuggestions.subnets.map(s => (
                                  <div key={s.cidr} className={`text-[9px] font-mono px-1.5 py-1 rounded text-center truncate ${
                                    s.isTaken
                                      ? "bg-amber-900/20 border border-amber-800/30 text-amber-400/70"
                                      : "bg-gray-800/40 border border-gray-700/40 text-gray-400 hover:text-cyan-400 hover:border-cyan-700/40 cursor-pointer"
                                  }`} title={s.isTaken ? `${s.cidr} (in use)` : s.cidr}>
                                    {s.cidr.split("/")[0].split(".").pop()}
                                  </div>
                                ))}
                              </div>
                            </div>
                          ) : vpc.subnets?.length > 0 ? (
                            /* Existing subnets from AWS */
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
                            <p className="text-[10px] font-mono text-gray-600">No subnets found in this VPC</p>
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

        {/* Cloud Accounts Tab */}
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
                  const acctDeployments = deployments.filter(d => d.cloud_account_id === acct.id);
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
                          <div>
                            <div className="flex justify-between text-[9px] font-mono text-gray-500 mb-0.5">
                              <span>vCPUs</span>
                              <span>{acct.current_vcpus}/{acct.quota_max_vcpus}</span>
                            </div>
                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
                              <div className="h-full bg-gradient-to-r from-purple-600 to-purple-400 rounded-full" style={{ width: `${Math.min((acct.current_vcpus / acct.quota_max_vcpus) * 100, 100)}%` }} />
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2 pt-3 border-t border-gray-800">
                          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-400 hover:text-gray-200 rounded-lg text-[10px] font-mono transition-colors flex-1 justify-center">
                            <Settings className="h-3 w-3" /> Settings
                          </button>
                          <button className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-400 hover:text-green-400 rounded-lg text-[10px] font-mono transition-colors">
                            <BarChart3 className="h-3 w-3" />
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

        {/* Deployments Table */}
        {deployments.length > 0 && (
          <div className="mt-8 bg-gray-900/80 border border-red-900/30 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-red-900/20">
              <Globe className="h-4 w-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Deployment History</h2>
              <span className="text-[10px] font-mono text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">{deployments.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-gray-800">
                    <th className="text-[10px] font-mono text-gray-500 px-4 py-2 uppercase">Provider</th>
                    <th className="text-[10px] font-mono text-gray-500 px-4 py-2 uppercase">Region</th>
                    <th className="text-[10px] font-mono text-gray-500 px-4 py-2 uppercase">Status</th>
                    <th className="text-[10px] font-mono text-gray-500 px-4 py-2 uppercase">VPC</th>
                    <th className="text-[10px] font-mono text-gray-500 px-4 py-2 uppercase">Cost/hr</th>
                  </tr>
                </thead>
                <tbody>
                  {deployments.slice(0, 10).map(d => (
                    <tr key={d.id} className="border-b border-gray-800/50 hover:bg-red-950/10 transition-colors">
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] font-mono text-gray-300 uppercase">{d.provider}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] font-mono text-gray-500">{d.region}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full ${
                          d.status === "running" ? "bg-green-900/30 text-green-400 border border-green-700/30" :
                          d.status === "provisioning" ? "bg-yellow-900/30 text-yellow-400 border border-yellow-700/30" :
                          "bg-gray-800 text-gray-500"
                        }`}>{d.status}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] font-mono text-gray-500 font-mono">{d.vpc_id || "—"}</span>
                      </td>
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] font-mono text-gray-400">${d.estimated_cost_hourly?.toFixed(2)}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Delete VPC Confirmation Dialog */}
        <AlertDialog open={!!deleteConfirm} onOpenChange={(open) => { if (!open) { setDeleteConfirm(null); setForceDelete(false); setDeleteError(null); } }}>
          <AlertDialogContent className="bg-gray-900 border border-red-800/40 text-white">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-white text-lg flex items-center gap-2">
                <Trash2 className="h-5 w-5 text-red-400" />
                Delete VPC
              </AlertDialogTitle>
              <AlertDialogDescription className="text-gray-400 space-y-3">
                <p>
                  Are you sure you want to delete VPC{" "}
                  <span className="text-red-400 font-bold font-mono">{deleteConfirm?.vpcName}</span>
                  {" "}({deleteConfirm?.vpcId})?
                </p>
                {deleteConfirm?.hasInstances && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-950/30 border border-amber-800/40 text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-bold">This VPC has running instances</p>
                      <p className="text-xs mt-0.5 text-amber-400/80">
                        Check <strong>Force Terminate Instances</strong> below to terminate them before deleting the VPC.
                        Without this, the delete will fail.
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
                <p className="text-xs text-gray-600">
                  This will delete the VPC, all subnets, internet gateways, security groups, and route tables.
                  This action cannot be undone.
                </p>
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
                {deletingVpc === deleteConfirm?.vpcId ? (
                  <span className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </span>
                ) : (
                  "Delete VPC"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}