import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  Cloud, Search, Plus, ArrowLeft, CheckCircle2, XCircle,
  Settings, BarChart3, HardDrive, Cpu, Globe, Trash2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [showAdd, setShowAdd] = useState(false);

  const { data: accounts = [], isLoading } = useQuery({
    queryKey: ["cloud-accounts"],
    queryFn: () => base44.entities.LiveFireCloudAccount.list("-updated_date", 50),
  });

  const { data: deployments = [] } = useQuery({
    queryKey: ["livefire-deployments"],
    queryFn: () => base44.entities.LiveFireDeployment.list("-updated_date", 50),
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
            <p className="text-sm text-gray-400 font-mono">Manage cloud provider accounts and infrastructure</p>
          </div>
          <Button onClick={() => setShowAdd(!showAdd)} className="bg-red-700 hover:bg-red-600 text-white gap-2">
            <Plus className="h-4 w-4" /> Add Account
          </Button>
        </div>

        {/* Add Account Form */}
        {showAdd && (
          <div className="bg-gray-900/80 border border-red-900/30 rounded-xl p-5 mb-6">
            <h3 className="text-sm font-bold text-white mb-4">Add Cloud Account</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[10px] font-mono text-gray-500 block mb-1">Provider</label>
                <select className="w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-sm px-3 py-2">
                  <option value="aws">AWS</option>
                  <option value="azure">Azure</option>
                  <option value="gcp">GCP</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-mono text-gray-500 block mb-1">Account Name</label>
                <Input placeholder="e.g. Production AWS" className="bg-gray-800 border-gray-700 text-white h-9 text-sm" />
              </div>
              <div>
                <label className="text-[10px] font-mono text-gray-500 block mb-1">Region</label>
                <Input placeholder="us-east-1" className="bg-gray-800 border-gray-700 text-white h-9 text-sm" />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-4">
              <Button variant="outline" onClick={() => setShowAdd(false)} className="border-gray-700 text-gray-400">Cancel</Button>
              <Button className="bg-red-700 hover:bg-red-600 text-white">Connect Account</Button>
            </div>
          </div>
        )}

        {/* Accounts */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-red-600/30 border-t-red-500 rounded-full animate-spin" />
          </div>
        ) : accounts.length === 0 ? (
          <div className="text-center py-20">
            <Cloud className="h-12 w-12 text-gray-700 mx-auto mb-4" />
            <p className="text-gray-500 font-mono text-sm mb-4">No cloud accounts configured</p>
            <Button onClick={() => setShowAdd(true)} className="bg-red-700 hover:bg-red-600 text-white gap-2">
              <Plus className="h-4 w-4" /> Connect First Account
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
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

                    {/* Utilization */}
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

        {/* Deployments Section */}
        {deployments.length > 0 && (
          <div className="bg-gray-900/80 border border-red-900/30 rounded-xl overflow-hidden">
            <div className="flex items-center gap-2.5 px-5 py-4 border-b border-red-900/20">
              <Globe className="h-4 w-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white">Active Deployments</h2>
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
      </div>
    </div>
  );
}