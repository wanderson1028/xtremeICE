import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, ArrowRight, Check, Save, Cloud, Layers,
  Shield, Globe, Lock, Users, Building2, Plus, Trash2,
  Monitor, Server, Wifi, HardDrive, Network, Router, Zap,
  Eye, EyeOff, Settings, Cpu, ShieldAlert, DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import TopologyBuilder from "@/components/livefire/TopologyBuilder";

const STEPS = ["Lab Info", "Cloud Provider", "Topology", "Review"];

const CATEGORIES = [
  "CCNA", "CCNP", "CCIE", "Network+", "Security+",
  "AWS", "Azure", "Fortinet", "Palo Alto", "SOC",
  "Blue Team", "Red Team", "Purple Team", "Active Directory",
  "Cloud Security", "Zero Trust", "Custom",
];

const DIFFICULTIES = ["Beginner", "Intermediate", "Advanced", "Expert"];
const VISIBILITIES = [
  { value: "private", label: "Private", icon: Lock, desc: "Only you" },
  { value: "shared", label: "Shared", icon: Users, desc: "Specific users" },
  { value: "organization", label: "Organization", icon: Building2, desc: "Your org" },
  { value: "public", label: "Public", icon: Globe, desc: "Anyone" },
];

export default function LabCreationWizard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const existingLabId = searchParams.get("lab");

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    name: "",
    description: "",
    tags: "",
    category: "Custom",
    difficulty: "Intermediate",
    visibility: "private",
    cloud_provider: "aws",
    region: "us-west-2",
    auto_shutdown_minutes: 0,
    collaboration_enabled: false,
    folder_id: null,
    topology_data: {
      devices: [],
      connections: [],
      vpcConfig: {
        cidr: "10.1.0.0/16",
        subnets: [{ name: "public", cidr: "10.1.1.0/24", zone: "us-west-2a" }, { name: "private", cidr: "10.1.2.0/24", zone: "us-west-2b" }],
        securityGroups: [{ name: "lab-sg", description: "Default lab security group", rules: [{ protocol: "tcp", port: 22, source: "0.0.0.0/0", desc: "SSH" }, { protocol: "tcp", port: 443, source: "0.0.0.0/0", desc: "HTTPS" }] }],
        enableInternetGateway: true,
      },
    },
    device_count: 0,
  });

  const { data: currentUser } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });
  const isAdmin = currentUser?.role === "admin";

  const { data: folders = [] } = useQuery({
    queryKey: ["livefire-folders"],
    queryFn: () => base44.entities.LiveFireFolder.list("sort_order", 200),
  });

  const getFolderPath = (folderId) => {
    if (!folderId) return "Uncategorized";
    const parts = [];
    let current = folders.find(f => f.id === folderId);
    while (current) {
      parts.unshift(current.name);
      current = folders.find(f => f.id === current.parent_folder_id);
    }
    return parts.join(" / ");
  };

  // Load existing lab
  const { data: existingLab } = useQuery({
    queryKey: ["livefire-lab-edit", existingLabId],
    queryFn: () => base44.entities.LiveFireLab.filter({ id: existingLabId }).then(r => r[0]),
    enabled: !!existingLabId,
  });

  React.useEffect(() => {
    if (existingLab) {
      const existingTopology = existingLab.topology_data || {};
      setForm({
        name: existingLab.name || "",
        description: existingLab.description || "",
        tags: (existingLab.tags || []).join(", "),
        category: existingLab.category || "Custom",
        difficulty: existingLab.difficulty || "Intermediate",
        visibility: existingLab.visibility || "private",
        cloud_provider: existingLab.cloud_provider || "aws",
        region: existingLab.region || "us-west-2",
        auto_shutdown_minutes: existingLab.auto_shutdown_minutes || 0,
        collaboration_enabled: existingLab.collaboration_enabled || false,
        folder_id: existingLab.folder_id || null,
        topology_data: {
          devices: existingTopology.devices || [],
          connections: existingTopology.connections || [],
          vpcConfig: existingTopology.vpcConfig || { cidr: "10.1.0.0/16", subnets: [{ name: "public", cidr: "10.1.1.0/24", zone: "us-west-2a" }, { name: "private", cidr: "10.1.2.0/24", zone: "us-west-2b" }], securityGroups: [{ name: "lab-sg", description: "Default lab security group", rules: [{ protocol: "tcp", port: 22, source: "0.0.0.0/0", desc: "SSH" }, { protocol: "tcp", port: 443, source: "0.0.0.0/0", desc: "HTTPS" }] }], enableInternetGateway: true },
        },
        device_count: existingLab.device_count || 0,
      });
    }
  }, [existingLab]);

  const update = (key, value) => setForm(f => ({ ...f, [key]: value }));

  const [savedLabId, setSavedLabId] = useState(null);

  const saveMutation = useMutation({
    mutationFn: async (opts = {}) => {
      const { goToTopology = false } = opts;
      const payload = {
        name: form.name,
        description: form.description,
        tags: form.tags.split(",").map(t => t.trim()).filter(Boolean),
        category: form.category,
        difficulty: form.difficulty,
        visibility: form.visibility,
        cloud_provider: form.cloud_provider,
        region: form.region,
        auto_shutdown_minutes: form.auto_shutdown_minutes,
        collaboration_enabled: form.collaboration_enabled,
        folder_id: form.folder_id || null,
        topology_data: form.topology_data,
        device_count: form.topology_data?.devices?.length || 0,
        status: existingLab?.status || "draft",
        admin_approved_cost: !!form.admin_approved_cost,
      };
      let result;
      if (existingLabId) {
        result = await base44.entities.LiveFireLab.update(existingLabId, payload);
      } else {
        result = await base44.entities.LiveFireLab.create(payload);
      }
      return { labId: result?.id || existingLabId, goToTopology };
    },
    onSuccess: ({ labId, goToTopology }) => {
      setSavedLabId(labId);
      queryClient.invalidateQueries(["my-livefire-labs"]);
      queryClient.invalidateQueries(["livefire-labs"]);
      queryClient.invalidateQueries(["livefire-lab-edit", labId]);
      if (goToTopology) {
        navigate(`/live-lab-topology?lab=${labId}`);
      } else {
        navigate("/my-labs");
      }
    },
  });

  const canProceed = () => {
    if (step === 0) return form.name.trim().length > 0;
    if (step === 1) return form.cloud_provider.length > 0 && !!form.region;
    if (step === 2) {
      const vc = form.topology_data?.vpcConfig;
      if (!vc?.cidr) return false;
      if (vc.existingVpcId && (!vc.subnets || vc.subnets.length === 0)) return false;
      return true;
    }
    return true;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <Link to="/my-labs" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-white">
              {existingLab ? "Edit Lab" : "Create Lab"}
            </h1>
            <p className="text-sm text-gray-400 font-mono">Cloud-Native Cyber Range Builder</p>
          </div>
          {(existingLab?.status === "running" || existingLab?.status === "deploying") && (
            <Link
              to={`/live-lab-topology?lab=${existingLabId}`}
              className="flex items-center gap-2 px-4 py-2 bg-green-900/40 border border-green-700/50 text-green-400 hover:bg-green-900/60 hover:text-green-300 rounded-lg text-xs font-mono font-bold transition-colors"
            >
              <Monitor className="h-4 w-4" /> View Topology
            </Link>
          )}
          {isAdmin && (
            <Badge className="bg-purple-900/30 text-purple-400 border-purple-700/30 gap-1">
              <Shield className="h-3 w-3" /> Admin Mode
            </Badge>
          )}
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <button
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-mono font-bold transition-all ${
                  i === step
                    ? "bg-red-900/40 border border-red-700/60 text-red-300"
                    : i < step
                    ? "bg-green-900/20 border border-green-700/30 text-green-400 cursor-pointer"
                    : "bg-gray-800/50 border border-gray-700 text-gray-600"
                }`}
              >
                {i < step ? <Check className="h-3.5 w-3.5" /> : <span className="h-3.5 w-3.5 rounded-full border border-current flex items-center justify-center text-[10px]">{i + 1}</span>}
                {s}
              </button>
              {i < STEPS.length - 1 && <div className="h-px flex-1 bg-gray-800" />}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {step === 0 && (
              <div className="bg-gray-900/80 border border-red-900/30 rounded-xl p-6 space-y-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="h-5 w-5 text-red-400" /> Lab Information
                </h2>

                <div>
                  <label className="text-[11px] font-mono text-gray-400 block mb-1.5">Lab Name *</label>
                  <Input
                    placeholder="e.g. Enterprise SOC Simulation"
                    value={form.name}
                    onChange={e => update("name", e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white h-10"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-gray-400 block mb-1.5">Description</label>
                  <Textarea
                    placeholder="Describe the lab scenario and objectives..."
                    value={form.description}
                    onChange={e => update("description", e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                    rows={4}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[11px] font-mono text-gray-400 block mb-1.5">Category</label>
                    <select
                      value={form.category}
                      onChange={e => update("category", e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-sm px-3 py-2.5 h-10"
                    >
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-mono text-gray-400 block mb-1.5">Difficulty</label>
                    <select
                      value={form.difficulty}
                      onChange={e => update("difficulty", e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-sm px-3 py-2.5 h-10"
                    >
                      {DIFFICULTIES.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-gray-400 block mb-1.5">Tags (comma separated)</label>
                  <Input
                    placeholder="e.g. SOC, SIEM, Blue Team"
                    value={form.tags}
                    onChange={e => update("tags", e.target.value)}
                    className="bg-gray-800 border-gray-700 text-white h-10"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-gray-400 block mb-1.5">Folder</label>
                  <select
                    value={form.folder_id || ""}
                    onChange={e => update("folder_id", e.target.value || null)}
                    className="w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-sm px-3 py-2.5 h-10 max-w-xs"
                  >
                    <option value="">Uncategorized</option>
                    {folders.map(f => (
                      <option key={f.id} value={f.id}>{getFolderPath(f.id)}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-mono text-gray-400 block mb-2">Visibility</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {VISIBILITIES.map(v => (
                      <button
                        key={v.value}
                        onClick={() => update("visibility", v.value)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                          form.visibility === v.value
                            ? "bg-red-900/30 border-red-600/60 text-red-300"
                            : "bg-gray-800/60 border-gray-700 text-gray-500 hover:text-gray-300"
                        }`}
                      >
                        <v.icon className="h-5 w-5" />
                        <span className="text-[10px] font-mono font-bold">{v.label}</span>
                        <span className="text-[8px] text-gray-500">{v.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {isAdmin && (
                  <div className="border-t border-red-900/20 pt-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-400" />
                      <h3 className="text-sm font-bold text-purple-300">Admin Options</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-mono text-gray-400 block mb-1.5">Auto Shutdown (minutes)</label>
                        <Input
                          type="number"
                          value={form.auto_shutdown_minutes}
                          onChange={e => update("auto_shutdown_minutes", parseInt(e.target.value) || 0)}
                          className="bg-gray-800 border-gray-700 text-white h-10"
                          placeholder="0 = disabled"
                        />
                      </div>
                      <div className="flex items-center gap-3 pt-5">
                        <button
                          onClick={() => update("collaboration_enabled", !form.collaboration_enabled)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-mono transition-all ${
                            form.collaboration_enabled ? "bg-purple-900/30 border-purple-600/60 text-purple-300" : "bg-gray-800 border-gray-700 text-gray-500"
                          }`}
                        >
                          {form.collaboration_enabled ? <Users className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                          Collaboration {form.collaboration_enabled ? "Enabled" : "Disabled"}
                        </button>
                      </div>
                    </div>
                    {/* Cost approval — allows expensive instances */}
                    <div className="pt-3 border-t border-red-900/20">
                      <button
                        onClick={() => update("admin_approved_cost", !form.admin_approved_cost)}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl border text-xs font-mono transition-all w-full text-left ${
                          form.admin_approved_cost
                            ? "bg-red-900/30 border-red-600/60 text-red-300"
                            : "bg-gray-800/40 border-gray-700 text-gray-500 hover:text-gray-300"
                        }`}
                      >
                        <ShieldAlert className={`h-5 w-5 ${form.admin_approved_cost ? "text-red-400" : "text-gray-600"}`} />
                        <div>
                          <span className="font-bold block text-[11px]">
                            {form.admin_approved_cost ? "High-Cost Instances Approved" : "Approve High-Cost Instances"}
                          </span>
                          <span className="text-[9px] text-gray-500">
                            {form.admin_approved_cost
                              ? "Enterprise and Extreme tier instances allowed for this lab"
                              : "Allow users to select enterprise/extreme instance types for this lab"
                            }
                          </span>
                        </div>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 1 && (
              <div className="bg-gray-900/80 border border-red-900/30 rounded-xl p-6 space-y-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Cloud className="h-5 w-5 text-cyan-400" /> Cloud Provider
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { value: "aws", label: "AWS", desc: "Amazon Web Services", color: "orange", available: true },
                    { value: "azure", label: "Azure", desc: "Microsoft Azure", color: "blue", available: true },
                    { value: "gcp", label: "GCP", desc: "Google Cloud Platform", color: "green", available: true },
                  ].map(p => (
                    <button
                      key={p.value}
                      onClick={() => update("cloud_provider", p.value)}
                      className={`flex flex-col items-center gap-2 p-5 rounded-xl border transition-all ${
                        form.cloud_provider === p.value
                          ? `bg-${p.color}-900/30 border-${p.color}-600/60 text-${p.color}-300`
                          : "bg-gray-800/60 border-gray-700 text-gray-500 hover:text-gray-300"
                      }`}
                    >
                      <Cloud className={`h-8 w-8 ${form.cloud_provider === p.value ? `text-${p.color}-400` : "text-gray-600"}`} />
                      <span className="text-sm font-bold">{p.label}</span>
                      <span className="text-[10px] font-mono text-gray-500">{p.desc}</span>
                      <span className={`text-[9px] font-mono px-2 py-0.5 rounded-full ${
                        form.cloud_provider === p.value ? `bg-${p.color}-900/40 text-${p.color}-400` : "bg-gray-800 text-gray-600"
                      }`}>
                        {p.available ? "Available" : "Coming Soon"}
                      </span>
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-[11px] font-mono text-gray-400 block mb-1.5">
                    Region {!isAdmin && <span className="text-gray-600 normal-case">(admin-configured)</span>}
                  </label>
                  {isAdmin ? (
                    <select
                      value={form.region}
                      onChange={e => update("region", e.target.value)}
                      className="w-full bg-gray-800 border border-gray-700 rounded-lg text-white text-sm px-3 py-2.5 h-10 max-w-xs"
                    >
                      <option value="us-east-1">us-east-1 (N. Virginia)</option>
                      <option value="us-east-2">us-east-2 (Ohio)</option>
                      <option value="us-west-1">us-west-1 (N. California)</option>
                      <option value="us-west-2">us-west-2 (Oregon)</option>
                      <option value="eu-west-1">eu-west-1 (Ireland)</option>
                      <option value="eu-central-1">eu-central-1 (Frankfurt)</option>
                      <option value="ap-southeast-1">ap-southeast-1 (Singapore)</option>
                    </select>
                  ) : (
                    <div className="flex items-center gap-2 px-3 py-2.5 h-10 max-w-xs bg-gray-800/50 border border-gray-700/50 rounded-lg text-sm font-mono text-gray-400">
                      <Lock className="h-3.5 w-3.5 text-gray-600" />
                      <span>{form.region || "us-east-1"}</span>
                    </div>
                  )}
                </div>

                {isAdmin && (
                  <div className="border-t border-red-900/20 pt-5 space-y-4">
                    <div className="flex items-center gap-2">
                      <Shield className="h-4 w-4 text-purple-400" />
                      <h3 className="text-sm font-bold text-purple-300">Advanced Cloud Config</h3>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="text-[11px] font-mono text-gray-400 block mb-1.5">Dedicated VPC ID</label>
                        <Input placeholder="vpc-xxxxxxxx" className="bg-gray-800 border-gray-700 text-white h-10" />
                      </div>
                      <div>
                        <label className="text-[11px] font-mono text-gray-400 block mb-1.5">Shared VPC ID</label>
                        <Input placeholder="vpc-xxxxxxxx" className="bg-gray-800 border-gray-700 text-white h-10" />
                      </div>
                      <div>
                        <label className="text-[11px] font-mono text-gray-400 block mb-1.5">Max Instance Count</label>
                        <Input type="number" defaultValue={20} className="bg-gray-800 border-gray-700 text-white h-10" />
                      </div>
                      <div>
                        <label className="text-[11px] font-mono text-gray-400 block mb-1.5">Budget Alert ($)</label>
                        <Input type="number" defaultValue={500} className="bg-gray-800 border-gray-700 text-white h-10" />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {step === 2 && (
              <div className="bg-gray-900/80 border border-red-900/30 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-red-900/20 flex items-center justify-between">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Network className="h-5 w-5 text-red-400" /> Topology Builder
                  </h2>
                  <span className="text-[10px] font-mono text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full">
                    {form.topology_data?.devices?.length || 0} devices
                  </span>
                </div>
                <TopologyBuilder
                  topology={form.topology_data}
                  onChange={(topology) => update("topology_data", topology)}
                  cloudProvider={form.cloud_provider}
                  isAdmin={isAdmin}
                  isLabApproved={!!form.admin_approved_cost}
                  region={form.region || "us-west-2"}
                />
              </div>
            )}

            {step === 3 && (
              <div className="bg-gray-900/80 border border-red-900/30 rounded-xl p-6 space-y-5">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Check className="h-5 w-5 text-green-400" /> Review & Deploy
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {[
                    { label: "Lab Name", value: form.name },
                    { label: "Category", value: form.category },
                    { label: "Difficulty", value: form.difficulty },
                    { label: "Visibility", value: form.visibility },
                    { label: "Cloud Provider", value: form.cloud_provider?.toUpperCase() },
                    { label: "Region", value: form.region },
                    { label: "Folder", value: getFolderPath(form.folder_id) },
                    { label: "Devices", value: form.topology_data?.devices?.length || 0 },
                    { label: "Auto Shutdown", value: form.auto_shutdown_minutes > 0 ? `${form.auto_shutdown_minutes} min` : "Disabled" },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center py-2.5 px-3 bg-black/30 rounded-lg border border-gray-800">
                      <span className="text-[10px] font-mono text-gray-500">{item.label}</span>
                      <span className="text-xs font-mono text-white">{item.value || "—"}</span>
                    </div>
                  ))}
                </div>

                {form.description && (
                  <div>
                    <label className="text-[10px] font-mono text-gray-500 block mb-1">Description</label>
                    <p className="text-xs text-gray-400 bg-black/30 rounded-lg p-3 border border-gray-800">{form.description}</p>
                  </div>
                )}

                {/* Estimated cost */}
                <div className="bg-green-950/20 border border-green-700/30 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono text-gray-400">Estimated Cost</span>
                    <div className="flex items-center gap-3">
                      {form.admin_approved_cost && (
                        <span className="text-[9px] font-mono bg-red-900/30 text-red-400 border border-red-700/40 px-2 py-0.5 rounded-full">
                          High-Cost Approved
                        </span>
                      )}
                      <span className="text-sm font-bold text-green-400 font-mono">
                        ${((form.topology_data?.devices?.length || 0) * 0.15).toFixed(2)}/hr
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6">
          <Button
            variant="outline"
            onClick={() => step > 0 ? setStep(s => s - 1) : navigate("/my-labs")}
            className="border-gray-700 text-gray-400 hover:text-white gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {step === 0 ? "Cancel" : STEPS[step - 1]}
          </Button>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isLoading}
              className="border-gray-700 text-gray-400 hover:text-white gap-2"
            >
              <Save className="h-4 w-4" /> Save Draft
            </Button>
            <Button
              variant="outline"
              onClick={() => saveMutation.mutate({ goToTopology: true })}
              disabled={saveMutation.isLoading}
              className="border-cyan-700/60 text-cyan-400 hover:text-cyan-300 hover:border-cyan-600 gap-2"
            >
              {saveMutation.isLoading ? (
                <div className="w-4 h-4 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
              ) : (
                <Monitor className="h-4 w-4" />
              )}
              Save & Topology
            </Button>
            {step < STEPS.length - 1 ? (
              <Button
                onClick={() => setStep(s => s + 1)}
                disabled={!canProceed()}
                className="bg-red-700 hover:bg-red-600 text-white gap-2"
              >
                {STEPS[step + 1]} <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isLoading}
                className="bg-green-700 hover:bg-green-600 text-white gap-2"
              >
                {saveMutation.isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {existingLab ? "Save Changes" : "Create Lab"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}