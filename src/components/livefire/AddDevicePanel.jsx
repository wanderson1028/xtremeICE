import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { X, Zap, RefreshCw, ImagePlus, Plus, Globe, Lock, ChevronDown, ChevronRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DeviceIconRenderer from "@/components/livefire/DeviceIcons";
import ImageCatalog, { OS_CREDENTIALS_MAP } from "@/components/livefire/ImageCatalog";

const DEVICE_TEMPLATES = [
  { type: "server", name: "Server", cpu: 2, ram: 4096, storage: 20, access: "ssh", subtitle: "Linux/Windows server" },
  { type: "workstation", name: "Workstation", cpu: 2, ram: 4096, storage: 20, access: "rdp", subtitle: "Desktop workstation" },
  { type: "router", name: "Router", cpu: 1, ram: 2048, storage: 10, access: "ssh", subtitle: "Network router" },
  { type: "firewall", name: "Firewall", cpu: 2, ram: 4096, storage: 20, access: "ssh", subtitle: "Security appliance" },
];

export default function AddDevicePanel({ lab, deployment, onClose, onDeploy, deploying }) {
  const queryClient = useQueryClient();
  const vpcId = deployment?.vpc_id || lab?.vpc_id;
  const region = lab?.region || "us-east-1";

  const [selected, setSelected] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [showImageCatalog, setShowImageCatalog] = useState(false);
  const [selectedSubnetId, setSelectedSubnetId] = useState(null);
  const [showCreateSubnet, setShowCreateSubnet] = useState(false);
  const [newSubnetCidr, setNewSubnetCidr] = useState("");
  const [newSubnetName, setNewSubnetName] = useState("");
  const [newSubnetAz, setNewSubnetAz] = useState("");
  const [newSubnetPublic, setNewSubnetPublic] = useState(true);
  const [creatingSubnet, setCreatingSubnet] = useState(false);
  const [subnetError, setSubnetError] = useState(null);
  const [deviceName, setDeviceName] = useState("");
  const [cpu, setCpu] = useState(2);
  const [ram, setRam] = useState(4096);
  const [storage, setStorage] = useState(20);
  const [manualAmiId, setManualAmiId] = useState("");
  const [error, setError] = useState(null);

  // Fetch subnets for this VPC
  const { data: vpcSubnetsData, isLoading: loadingSubnets, refetch: refetchSubnets } = useQuery({
    queryKey: ["vpc-subnets", vpcId, region],
    queryFn: async () => {
      const res = await base44.functions.invoke("cloudProviderAWS", {
        action: "listVpcSubnets",
        params: { vpc_id: vpcId, region },
      });
      return res.data;
    },
    enabled: !!vpcId,
    staleTime: 30_000,
  });

  const vpcCidr = vpcSubnetsData?.vpcCidr || deployment?.vpc_cidr || "";
  const vpcName = vpcSubnetsData?.vpcName || "";
  const isDefaultVpc = vpcSubnetsData?.isDefault || false;
  const subnets = vpcSubnetsData?.subnets || [];

  // Auto-select first subnet when data loads
  React.useEffect(() => {
    if (subnets.length > 0 && !selectedSubnetId) {
      // Prefer the deployment's default subnet, else first public subnet, else first
      const depSubnet = deployment?.subnet_ids?.[0];
      const match = depSubnet
        ? subnets.find(s => s.subnetId === depSubnet)
        : null;
      const firstPublic = subnets.find(s => s.isPublic);
      setSelectedSubnetId(match?.subnetId || firstPublic?.subnetId || subnets[0]?.subnetId);
    }
  }, [subnets, selectedSubnetId, deployment]);

  const handleTemplateSelect = (tpl) => {
    setSelected(tpl);
    setDeviceName(tpl.name);
    setCpu(tpl.cpu);
    setRam(tpl.ram);
    setStorage(tpl.storage);
    setError(null);
  };

  const handleManualAmi = (value) => {
    const trimmed = value.trim();
    setManualAmiId(trimmed);
    if (trimmed.startsWith("ami-") && trimmed.length >= 12) {
      setSelectedImage({
        id: trimmed,
        name: trimmed,
        sourceLabel: "Custom AMI (pasted)",
        sourceCategory: "Manual",
        osFamily: "amazon_linux",
        username: null,
        access: null,
        cpu: null,
        ram: null,
        storage: null,
        port: null,
      });
      setError(null);
    } else if (trimmed === "") {
      setSelectedImage(null);
    }
  };

  const handleImageSelect = (image) => {
    setSelectedImage(image);
    setManualAmiId("");
    const osCreds = OS_CREDENTIALS_MAP[image.osFamily] || OS_CREDENTIALS_MAP.amazon_linux;
    if (image.username) {
      setSelected(prev => ({ ...prev, access: image.access || osCreds.access }));
    } else {
      setSelected(prev => ({ ...prev, access: osCreds.access }));
    }
    if (image.cpu) setCpu(image.cpu);
    if (image.ram) setRam(image.ram);
    if (image.storage) setStorage(image.storage);
    setError(null);
  };

  const handleCreateSubnet = async () => {
    if (!newSubnetCidr.trim()) { setSubnetError("CIDR block is required"); return; }
    setCreatingSubnet(true);
    setSubnetError(null);
    try {
      const res = await base44.functions.invoke("cloudProviderAWS", {
        action: "createSubnet",
        params: {
          vpc_id: vpcId,
          cidr: newSubnetCidr.trim(),
          availability_zone: newSubnetAz.trim() || undefined,
          name: newSubnetName.trim() || undefined,
          is_public: newSubnetPublic,
          region,
        },
      });
      if (res.data?.error) throw new Error(res.data.message || res.data.error);
      // Refresh subnet list and select the new one
      await refetchSubnets();
      setSelectedSubnetId(res.data.subnetId);
      setShowCreateSubnet(false);
      setNewSubnetCidr("");
      setNewSubnetName("");
      setNewSubnetAz("");
      queryClient.invalidateQueries(["vpc-subnets", vpcId, region]);
    } catch (err) {
      setSubnetError(err?.response?.data?.error || err?.message || "Failed to create subnet");
    } finally {
      setCreatingSubnet(false);
    }
  };

  const handleDeploy = () => {
    if (!deviceName.trim()) { setError("Device name is required"); return; }
    if (!selected) { setError("Select a device type"); return; }
    if (!selectedSubnetId) { setError("Select a subnet for this device"); return; }
    const osCreds = selectedImage
      ? OS_CREDENTIALS_MAP[selectedImage.osFamily] || OS_CREDENTIALS_MAP.amazon_linux
      : null;
    const deploySpec = {
      name: deviceName.trim(),
      type: selected.type,
      cpu_cores: cpu,
      ram_mb: ram,
      storage_gb: storage,
      access_method: selected.access,
      position_x: 400,
      position_y: 200,
      subnet_id: selectedSubnetId,
    };
    if (selectedImage) {
      deploySpec.ami_image_id = selectedImage.id;
      deploySpec.default_username = selectedImage.username || osCreds?.username || "ec2-user";
      deploySpec.access_method = selectedImage.access || selected.access || osCreds?.access || "ssh";
      deploySpec.access_port = selectedImage.port || (deploySpec.access_method === "rdp" ? 3389 : 22);
    }
    onDeploy(deploySpec);
  };

  const selectedSubnet = subnets.find(s => s.subnetId === selectedSubnetId);

  // Suggest a CIDR for new subnet based on VPC CIDR
  const suggestNextCidr = () => {
    if (!vpcCidr) return "";
    const parts = vpcCidr.split("/");
    const ipParts = parts[0].split(".").map(Number);
    const usedOctets = subnets.map(s => {
      const sp = s.cidrBlock.split(".")[2];
      return parseInt(sp);
    });
    let next = 1;
    while (usedOctets.includes(next) && next < 255) next++;
    return `${ipParts[0]}.${ipParts[1]}.${next}.0/24`;
  };

  return (
    <>
      <div className="absolute right-4 top-4 w-96 bg-gray-900/95 border border-red-900/40 rounded-xl shadow-2xl z-30 overflow-hidden">
        <div className="flex items-center justify-between p-3 border-b border-red-900/20 bg-gray-950">
          <span className="text-sm font-bold text-white">Add Device</span>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-4 space-y-3 max-h-[600px] overflow-y-auto">
          {/* ── VPC Info ── */}
          {vpcId ? (
            <div className="bg-indigo-950/30 border border-indigo-700/40 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <Globe className="h-3.5 w-3.5 text-indigo-400" />
                <span className="text-[10px] font-mono font-bold text-indigo-300 uppercase">VPC</span>
                {isDefaultVpc && (
                  <span className="text-[8px] font-mono text-amber-400 bg-amber-950/50 px-1.5 py-0.5 rounded">DEFAULT</span>
                )}
              </div>
              {vpcName ? (
                <p className="text-[11px] font-mono font-bold text-white truncate">{vpcName}</p>
              ) : (
                <p className="text-[10px] font-mono text-gray-500 italic">No Name tag</p>
              )}
              <div className="flex items-center justify-between gap-2">
                <code className="text-[9px] font-mono text-indigo-300 break-all">{vpcId}</code>
                {vpcCidr && (
                  <span className="text-[10px] font-mono text-indigo-400 bg-indigo-950/50 px-2 py-0.5 rounded shrink-0">{vpcCidr}</span>
                )}
              </div>
              <p className="text-[8px] font-mono text-gray-500">{region} • {subnets.length} subnet{subnets.length !== 1 ? "s" : ""}</p>
            </div>
          ) : (
            <div className="bg-amber-950/30 border border-amber-700/40 rounded-lg p-3">
              <p className="text-[10px] font-mono text-amber-400">No VPC deployed for this lab yet. Deploy the lab first.</p>
            </div>
          )}

          {/* ── Subnet Selector ── */}
          {vpcId && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[9px] font-mono text-gray-500 uppercase">Subnet</label>
                <button
                  onClick={() => setShowCreateSubnet(v => !v)}
                  className="text-[9px] font-mono text-cyan-400 hover:text-cyan-300 flex items-center gap-0.5"
                >
                  {showCreateSubnet ? <ChevronDown className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                  {showCreateSubnet ? "Cancel" : "New Subnet"}
                </button>
              </div>

              {loadingSubnets ? (
                <div className="flex items-center gap-2 p-2 text-[10px] font-mono text-gray-500">
                  <RefreshCw className="h-3 w-3 animate-spin" /> Loading subnets...
                </div>
              ) : subnets.length === 0 ? (
                <p className="text-[10px] font-mono text-amber-400 p-2">No subnets found in this VPC. Create one below.</p>
              ) : (
                <div className="space-y-1 max-h-36 overflow-y-auto">
                  {subnets.map(sub => (
                    <button
                      key={sub.subnetId}
                      onClick={() => setSelectedSubnetId(sub.subnetId)}
                      className={`w-full flex items-center gap-2 p-2 rounded-lg border text-left transition-all ${
                        selectedSubnetId === sub.subnetId
                          ? "border-cyan-500/60 bg-cyan-950/30"
                          : "border-gray-700 bg-gray-800/60 hover:border-gray-600"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                        selectedSubnetId === sub.subnetId ? "border-cyan-400 bg-cyan-400" : "border-gray-600"
                      }`}>
                        {selectedSubnetId === sub.subnetId && <Check className="h-2.5 w-2.5 text-gray-900" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          {sub.isPublic ? (
                            <Globe className="h-3 w-3 text-green-400 shrink-0" />
                          ) : (
                            <Lock className="h-3 w-3 text-gray-500 shrink-0" />
                          )}
                          <span className="text-[10px] font-mono text-gray-300 truncate">{sub.name}</span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <code className="text-[9px] font-mono text-cyan-500">{sub.cidrBlock}</code>
                          <span className="text-[8px] font-mono text-gray-600">{sub.availabilityZone}</span>
                          <span className="text-[8px] font-mono text-gray-600">{sub.availableIps} free</span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Selected subnet summary */}
              {selectedSubnet && (
                <div className="mt-1.5 bg-gray-800/40 rounded px-2 py-1 flex items-center gap-1.5">
                  <span className="text-[8px] font-mono text-gray-500">→</span>
                  <code className="text-[9px] font-mono text-cyan-400 truncate">{selectedSubnet.subnetId}</code>
                  <span className="text-[8px] font-mono text-gray-600 ml-auto">{selectedSubnet.isPublic ? "Public" : "Private"}</span>
                </div>
              )}
            </div>
          )}

          {/* ── Create Subnet Form ── */}
          {showCreateSubnet && vpcId && (
            <div className="bg-gray-800/40 border border-gray-700 rounded-lg p-3 space-y-2">
              <p className="text-[9px] font-mono text-gray-400 uppercase">Create New Subnet in {vpcCidr || "VPC"}</p>
              <div>
                <label className="text-[9px] font-mono text-gray-500 uppercase block mb-1">CIDR Block</label>
                <div className="flex gap-1.5">
                  <Input
                    value={newSubnetCidr}
                    onChange={e => setNewSubnetCidr(e.target.value)}
                    placeholder="10.0.5.0/24"
                    className="bg-gray-800 border-gray-700 text-white text-xs h-8 font-mono flex-1"
                  />
                  <Button
                    onClick={() => setNewSubnetCidr(suggestNextCidr())}
                    size="sm"
                    variant="outline"
                    className="border-gray-600 text-gray-400 hover:text-white text-[9px] h-8 px-2"
                    title="Auto-suggest next available /24"
                  >
                    Auto
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[9px] font-mono text-gray-500 uppercase block mb-1">Name (opt)</label>
                  <Input
                    value={newSubnetName}
                    onChange={e => setNewSubnetName(e.target.value)}
                    placeholder="lab-subnet-5"
                    className="bg-gray-800 border-gray-700 text-white text-xs h-8 font-mono"
                  />
                </div>
                <div>
                  <label className="text-[9px] font-mono text-gray-500 uppercase block mb-1">AZ (opt)</label>
                  <Input
                    value={newSubnetAz}
                    onChange={e => setNewSubnetAz(e.target.value)}
                    placeholder={`${region}a`}
                    className="bg-gray-800 border-gray-700 text-white text-xs h-8 font-mono"
                  />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={newSubnetPublic}
                  onChange={e => setNewSubnetPublic(e.target.checked)}
                  className="w-3.5 h-3.5 accent-cyan-500"
                />
                <span className="text-[10px] font-mono text-gray-300">Auto-assign public IP</span>
              </label>
              {subnetError && <p className="text-[10px] text-red-400 font-mono">{subnetError}</p>}
              <Button
                onClick={handleCreateSubnet}
                disabled={creatingSubnet}
                size="sm"
                className="w-full bg-cyan-700 hover:bg-cyan-600 text-white text-xs"
              >
                {creatingSubnet ? (
                  <><RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> Creating...</>
                ) : (
                  <><Plus className="h-3.5 w-3.5 mr-1.5" /> Create Subnet</>
                )}
              </Button>
            </div>
          )}

          {/* ── Device Type Selection ── */}
          <p className="text-[10px] font-mono text-gray-500 uppercase">Device Type</p>
          <div className="grid grid-cols-2 gap-2">
            {DEVICE_TEMPLATES.map(tpl => (
              <button
                key={tpl.type}
                onClick={() => handleTemplateSelect(tpl)}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${
                  selected?.type === tpl.type
                    ? "border-red-500/60 bg-red-950/30"
                    : "border-gray-700 bg-gray-800/60 hover:border-gray-600"
                }`}
              >
                <div className="w-7 h-7">
                  <DeviceIconRenderer type={tpl.type} iconId={tpl.type} className="text-gray-300" />
                </div>
                <span className="text-[10px] font-mono text-gray-300">{tpl.name}</span>
                <span className="text-[8px] font-mono text-gray-600">{tpl.subtitle}</span>
              </button>
            ))}
          </div>

          {/* ── Config ── */}
          {selected && (
            <>
              <div>
                <label className="text-[9px] font-mono text-gray-500 uppercase block mb-1">Name</label>
                <Input value={deviceName} onChange={e => setDeviceName(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white text-xs h-8 font-mono" />
              </div>

              {/* AWS Image / AMI Selector */}
              <div>
                <label className="text-[9px] font-mono text-gray-500 uppercase block mb-1">AWS Image (AMI)</label>
                {selectedImage ? (
                  <div className="bg-cyan-950/30 border border-cyan-700/50 rounded-lg p-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-mono font-bold text-cyan-300 truncate">{selectedImage.sourceLabel || selectedImage.name}</p>
                        {selectedImage.name?.startsWith("ami-") && (
                          <code className="text-[9px] font-mono text-cyan-500 break-all">{selectedImage.name}</code>
                        )}
                        <p className="text-[9px] font-mono text-gray-400 mt-0.5">
                          {selectedImage.osFamily ? (OS_CREDENTIALS_MAP[selectedImage.osFamily]?.label || selectedImage.osFamily) : ""}
                          {selectedImage.username ? ` — ${selectedImage.username}` : ""}
                        </p>
                      </div>
                      <button onClick={() => setShowImageCatalog(true)}
                        className="text-[9px] font-mono text-cyan-400 hover:text-cyan-300 shrink-0 underline">
                        Change
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowImageCatalog(true)}
                    className="w-full flex items-center justify-center gap-2 p-2.5 rounded-lg border border-cyan-700/40 bg-cyan-950/20 hover:bg-cyan-900/30 hover:border-cyan-600/50 transition-colors">
                    <ImagePlus className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="text-[11px] font-mono text-cyan-300">Select AWS Image</span>
                  </button>
                )}
                {!selectedImage && (
                  <p className="text-[8px] font-mono text-gray-600 mt-1">If skipped, a default Amazon Linux AMI will be used.</p>
                )}
                {/* Manual AMI paste field */}
                <div className="mt-1.5">
                  <label className="text-[9px] font-mono text-gray-500 uppercase block mb-1">Or paste AMI ID</label>
                  <Input
                    value={manualAmiId}
                    onChange={e => handleManualAmi(e.target.value)}
                    onPaste={e => e.stopPropagation()}
                    placeholder="ami-0abcdef1234567890"
                    className="bg-gray-800 border-gray-700 text-white text-xs h-8 font-mono"
                  />
                  {manualAmiId && !manualAmiId.startsWith("ami-") && (
                    <p className="text-[8px] font-mono text-amber-400 mt-0.5">AMI ID should start with "ami-"</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-[9px] font-mono text-gray-500 uppercase block mb-1">vCPU</label>
                  <Input type="number" min={1} max={64} value={cpu} onChange={e => setCpu(Number(e.target.value))}
                    className="bg-gray-800 border-gray-700 text-white text-xs h-8 font-mono" />
                </div>
                <div>
                  <label className="text-[9px] font-mono text-gray-500 uppercase block mb-1">RAM MB</label>
                  <Input type="number" min={512} step={512} value={ram} onChange={e => setRam(Number(e.target.value))}
                    className="bg-gray-800 border-gray-700 text-white text-xs h-8 font-mono" />
                </div>
                <div>
                  <label className="text-[9px] font-mono text-gray-500 uppercase block mb-1">Storage GB</label>
                  <Input type="number" min={8} value={storage} onChange={e => setStorage(Number(e.target.value))}
                    className="bg-gray-800 border-gray-700 text-white text-xs h-8 font-mono" />
                </div>
              </div>
            </>
          )}

          {error && <p className="text-[10px] text-red-400 font-mono">{error}</p>}

          <Button onClick={handleDeploy} disabled={!selected || deploying || !selectedSubnetId}
            size="sm" className="w-full bg-red-700 hover:bg-red-600 disabled:bg-gray-800 text-white">
            {deploying ? (
              <><RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> Deploying...</>
            ) : (
              <><Zap className="h-3.5 w-3.5 mr-1.5" /> Deploy Device</>
            )}
          </Button>
        </div>
      </div>

      <ImageCatalog
        isOpen={showImageCatalog}
        onClose={() => setShowImageCatalog(false)}
        onSelect={handleImageSelect}
        cloudProvider={lab?.cloud_provider || "aws"}
        region={region}
        selectedImageId={selectedImage?.id}
      />
    </>
  );
}