import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Server, HardDrive, Cpu, Monitor, Search, X, Check,
  Cloud, Database, Loader2, Terminal, MonitorPlay, Key,
  Globe, AlertTriangle, Filter, Wrench, Zap, User, ShoppingCart,
  Users, ChevronDown, ChevronRight, Store, Package, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// OS family detection and default credentials
const OS_CREDENTIALS = {
  amazon_linux: { username: "ec2-user", access: "ssh", port: 22, label: "Amazon Linux" },
  ubuntu: { username: "ubuntu", access: "ssh", port: 22, label: "Ubuntu" },
  debian: { username: "admin", access: "ssh", port: 22, label: "Debian" },
  rhel: { username: "ec2-user", access: "ssh", port: 22, label: "RHEL" },
  centos: { username: "centos", access: "ssh", port: 22, label: "CentOS" },
  windows: { username: "Administrator", access: "rdp", port: 3389, label: "Windows" },
  kali: { username: "kali", access: "ssh", port: 22, label: "Kali Linux" },
  rocky: { username: "rocky", access: "ssh", port: 22, label: "Rocky Linux" },
  alma: { username: "ec2-user", access: "ssh", port: 22, label: "AlmaLinux" },
  suse: { username: "ec2-user", access: "ssh", port: 22, label: "SUSE" },
  // Marketplace/Appliance types
  cisco: { username: "admin", access: "ssh", port: 22, label: "Cisco IOS-XE" },
  fortinet: { username: "admin", access: "ssh", port: 22, label: "FortiGate" },
  paloalto: { username: "admin", access: "ssh", port: 443, label: "PAN-OS" },
};

function detectOSFamily(imageId, description = "", name = "", groupName = "") {
  const combined = `${imageId} ${description} ${name} ${groupName}`.toLowerCase();
  if (combined.includes("windows") || combined.includes("win-") || combined.includes("win20")) return "windows";
  if (combined.includes("ubuntu") && !combined.includes("pro")) return "ubuntu";
  if (combined.includes("ubuntu") && combined.includes("pro")) return "ubuntu";
  if (combined.includes("debian")) return "debian";
  if (combined.includes("rhel") || combined.includes("redhat") || combined.includes("red hat")) return "rhel";
  if (combined.includes("centos")) return "centos";
  if (combined.includes("rocky")) return "rocky";
  if (combined.includes("almalinux") || combined.includes("alma")) return "alma";
  if (combined.includes("kali")) return "kali";
  if (combined.includes("suse") || combined.includes("sles")) return "suse";
  if (combined.includes("cisco") || combined.includes("csr")) return "cisco";
  if (combined.includes("fortinet") || combined.includes("fortigate")) return "fortinet";
  if (combined.includes("palo") || combined.includes("pan-os") || combined.includes("vm-series")) return "paloalto";
  if (combined.includes("amazon") || combined.includes("amzn") || combined.includes("al2023") || combined.includes("al2")) return "amazon_linux";
  return "amazon_linux";
}

function getOsBadge(osFamily) {
  const creds = OS_CREDENTIALS[osFamily] || OS_CREDENTIALS.amazon_linux;
  const colors = {
    amazon_linux: "bg-orange-900/40 border-orange-700/50 text-orange-300",
    ubuntu: "bg-orange-800/40 border-orange-600/50 text-orange-300",
    debian: "bg-red-900/40 border-red-700/50 text-red-300",
    rhel: "bg-red-800/40 border-red-700/50 text-red-300",
    centos: "bg-purple-900/40 border-purple-700/50 text-purple-300",
    rocky: "bg-green-900/40 border-green-700/50 text-green-300",
    alma: "bg-teal-900/40 border-teal-700/50 text-teal-300",
    windows: "bg-blue-900/40 border-blue-700/50 text-blue-300",
    kali: "bg-slate-700/40 border-slate-600/50 text-slate-300",
    cisco: "bg-cyan-900/40 border-cyan-700/50 text-cyan-300",
    fortinet: "bg-red-900/40 border-red-700/50 text-red-300",
    paloalto: "bg-amber-900/40 border-amber-700/50 text-amber-300",
    suse: "bg-green-900/40 border-green-700/50 text-green-300",
  };
  return { creds, color: colors[osFamily] || colors.amazon_linux };
}

const CATEGORY_ICONS = {
  "Quick Start AMIs": Zap,
  "My AMIs": User,
  "AWS Marketplace AMIs": ShoppingCart,
  "Community AMIs": Users,
};

const CATEGORY_COLORS = {
  "Quick Start AMIs": "text-amber-400",
  "My AMIs": "text-blue-400",
  "AWS Marketplace AMIs": "text-purple-400",
  "Community AMIs": "text-green-400",
};

export default function ImageCatalog({ isOpen, onClose, onSelect, cloudProvider = "aws", region = "us-west-2", selectedImageId }) {
  const [search, setSearch] = useState("");
  const [osFilter, setOsFilter] = useState("all");
  const [selectedPreview, setSelectedPreview] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState({
    "Quick Start AMIs": true,
    "My AMIs": false,
    "AWS Marketplace AMIs": false,
    "Community AMIs": false,
  });

  // Fetch custom images from database
  const { data: dbImages = [], isLoading: loadingDb } = useQuery({
    queryKey: ["livefire-images-catalog"],
    queryFn: () => base44.entities.LiveFireImage.filter({ status: "available" }, "vendor", 100),
    enabled: isOpen,
  });

  // Fetch categorized cloud AMIs
  const { data: cloudData, isFetching: loadingCloud } = useQuery({
    queryKey: ["cloud-amis-catalog-v2", cloudProvider, region],
    queryFn: async () => {
      if (cloudProvider === "aws") {
        try {
          const res = await base44.functions.invoke("cloudProviderAWS", {
            action: "listAMIs",
            params: { region },
          });
          return res.data?.categories || [];
        } catch { return []; }
      }
      return [];
    },
    enabled: isOpen && cloudProvider === "aws",
    staleTime: 300_000,
  });

  // Flatten cloud images grouped by category
  const categorizedImages = useMemo(() => {
    const cats = {};
    (cloudData || []).forEach(cat => {
      const catName = cat.category || "Other";
      if (!cats[catName]) cats[catName] = { category: catName, icon: cat.icon, images: [] };
      (cat.groups || []).forEach(group => {
        const osFamily = detectOSFamily(group.name, group.description || "", group.name, group.name);
        (group.images || []).forEach(img => {
          cats[catName].images.push({
            id: img.imageId,
            name: img.imageId,
            description: img.description || group.description || group.name,
            groupName: group.name,
            osFamily,
            architecture: img.architecture || "x86_64",
            creationDate: img.creationDate,
            source: "cloud",
            sourceCategory: catName,
            sourceLabel: group.name,
            cloudProvider,
            region,
          });
        });
      });
    });
    return cats;
  }, [cloudData, cloudProvider, region]);

  // Flatten custom images
  const customImages = useMemo(() => {
    return dbImages.map(img => ({
      id: img.id,
      name: `${img.vendor} ${img.product} v${img.version}`,
      description: img.description || "",
      groupName: "Custom Image",
      osFamily: detectOSFamily(img.vendor, img.product, img.product),
      architecture: "x86_64",
      creationDate: img.updated_date || img.created_date,
      source: "custom",
      sourceCategory: "Custom Images",
      sourceLabel: `${img.vendor} ${img.product}`,
      dbImage: img,
      cpu: img.cpu_requirement,
      ram: img.ram_requirement_mb,
      storage: img.storage_requirement_gb,
      access: img.default_access_method || "ssh",
      username: img.default_username || "admin",
      port: img.default_access_port || 22,
    }));
  }, [dbImages]);

  // Collect all flat images for search filtering
  const allFlatImages = useMemo(() => {
    const flat = [];
    Object.values(categorizedImages).forEach(cat => flat.push(...cat.images));
    flat.push(...customImages);
    return flat;
  }, [categorizedImages, customImages]);

  // Filtered images
  const filteredImages = useMemo(() => {
    let merged = allFlatImages;
    if (osFilter !== "all") merged = merged.filter(i => i.osFamily === osFilter);
    if (search) {
      const q = search.toLowerCase();
      merged = merged.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.sourceLabel.toLowerCase().includes(q) ||
        i.sourceCategory.toLowerCase().includes(q)
      );
    }
    return merged;
  }, [allFlatImages, osFilter, search]);

  // Group filtered images by category for display
  const filteredByCategory = useMemo(() => {
    const cats = {};
    filteredImages.forEach(img => {
      const cat = img.sourceCategory || "Other";
      if (!cats[cat]) cats[cat] = [];
      cats[cat].push(img);
    });
    return cats;
  }, [filteredImages]);

  const handleSelectImage = (image) => {
    onSelect(image);
    setSelectedPreview(image);
  };

  const handleConfirm = () => {
    if (selectedPreview) onClose();
  };

  const toggleCategory = (cat) => {
    setExpandedCategories(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Count unique OS families
  const osFamilies = useMemo(() => {
    const families = new Set();
    allFlatImages.forEach(i => families.add(i.osFamily));
    return Array.from(families);
  }, [allFlatImages]);

  if (!isOpen) return null;

  const isLoading = loadingDb || loadingCloud;

  const categoryOrder = ["Quick Start AMIs", "My AMIs", "AWS Marketplace AMIs", "Community AMIs", "Custom Images"];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
      <div className="bg-gray-900 border-2 border-red-900/50 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl shadow-red-950/30 ring-1 ring-red-800/20">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-800/80">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-900/50 to-purple-900/30 border border-cyan-700/50 flex items-center justify-center shadow-lg shadow-cyan-900/20">
              <Package className="h-5 w-5 text-cyan-300" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">{cloudProvider.toUpperCase()} AMI Catalog</h2>
              <p className="text-[10px] font-mono text-gray-400">
                {region} — {filteredImages.length} image{filteredImages.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-800/80">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
            <Input
              placeholder="Search by name, OS, or description..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-gray-800/80 border-gray-700 text-white text-xs h-9 font-mono placeholder:text-gray-600"
            />
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => setOsFilter("all")}
              className={`text-[10px] font-mono px-2.5 py-1.5 rounded-lg border transition-colors ${osFilter === "all" ? "bg-red-900/30 border-red-600/40 text-red-300" : "bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200"}`}>
              All OS
            </button>
            {osFamilies.slice(0, 6).map(fam => {
              const info = getOsBadge(fam);
              return (
                <button key={fam} onClick={() => setOsFilter(osFilter === fam ? "all" : fam)}
                  className={`text-[10px] font-mono px-2 py-1 rounded-full border whitespace-nowrap transition-colors ${osFilter === fam ? info.color + " brightness-125 shadow-sm" : "bg-gray-800/60 border-gray-700 text-gray-500 hover:text-gray-300"}`}>
                  {info.creds.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Content: split into list + preview */}
        <div className="flex-1 flex overflow-hidden">
          {/* Image list with collapsible categories */}
          <div className="w-[55%] overflow-y-auto border-r border-gray-800/80">
            {isLoading ? (
              <div className="flex items-center justify-center py-20 gap-2">
                <Loader2 className="h-5 w-5 text-cyan-400 animate-spin" />
                <span className="text-xs font-mono text-gray-400">Fetching AMI catalog...</span>
              </div>
            ) : Object.keys(filteredByCategory).length === 0 ? (
              <div className="text-center py-20 px-4">
                <Database className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                <p className="text-xs font-mono text-gray-500">No images found</p>
                <p className="text-[10px] font-mono text-gray-600 mt-1">Try different filters or check your IAM permissions</p>
              </div>
            ) : (
              <div className="p-2">
                {categoryOrder.map(catName => {
                  const images = filteredByCategory[catName];
                  if (!images || images.length === 0) return null;
                  const CatIcon = CATEGORY_ICONS[catName] || Database;
                  const catColor = CATEGORY_COLORS[catName] || "text-gray-400";
                  const isExpanded = expandedCategories[catName] !== false;
                  const isCustom = catName === "Custom Images";

                  return (
                    <div key={catName} className="mb-1">
                      {/* Category header */}
                      <button
                        onClick={() => toggleCategory(catName)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:bg-gray-800/50 group`}
                      >
                        <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${isCustom ? "bg-purple-900/30 border border-purple-700/40" : "bg-gray-800/60 border border-gray-700"}`}>
                          <CatIcon className={`h-3.5 w-3.5 ${catColor}`} />
                        </div>
                        <div className="flex-1 text-left">
                          <span className="text-[11px] font-mono font-bold text-gray-200">{catName}</span>
                          <span className="ml-2 text-[9px] font-mono text-gray-600">({images.length})</span>
                        </div>
                        {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-gray-500" /> : <ChevronRight className="h-3.5 w-3.5 text-gray-500" />}
                      </button>

                      {/* Image list under category */}
                      {isExpanded && (
                        <div className="space-y-1 ml-1 pl-6 border-l border-gray-800/50">
                          {images.map((img) => {
                            const osInfo = getOsBadge(img.osFamily);
                            const isSelected = selectedPreview?.id === img.id || selectedImageId === img.id;
                            return (
                              <button
                                key={img.id}
                                onClick={() => handleSelectImage(img)}
                                className={`w-full text-left p-2.5 rounded-xl border transition-all ${
                                  isSelected
                                    ? "bg-cyan-900/20 border-cyan-600/60 ring-1 ring-cyan-500/30"
                                    : "bg-gray-800/30 border-gray-700/60 hover:border-gray-600 hover:bg-gray-800/50"
                                }`}
                              >
                                <div className="flex items-start gap-2.5">
                                  <div className={`mt-0.5 h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${img.source === "custom" ? "bg-purple-900/30 border border-purple-700/40" : "bg-cyan-900/20 border border-cyan-700/30"}`}>
                                    {img.source === "custom" ? <Wrench className="h-3.5 w-3.5 text-purple-400" /> : <Cloud className="h-3.5 w-3.5 text-cyan-400" />}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1.5 mb-0.5">
                                      <span className="text-[10px] font-bold text-white font-mono truncate">{img.sourceLabel || img.name}</span>
                                      <span className={`text-[7px] font-mono px-1.5 py-0.5 rounded-full border shrink-0 ${osInfo.color}`}>{osInfo.creds.label}</span>
                                    </div>
                                    <p className="text-[9px] text-gray-500 font-mono truncate mb-1">{img.description}</p>
                                    <div className="flex items-center gap-2 text-[7px] font-mono text-gray-600">
                                      <span className="flex items-center gap-1"><Monitor className="h-2.5 w-2.5" />{img.architecture}</span>
                                      <span className="flex items-center gap-1"><Terminal className="h-2.5 w-2.5" />{osInfo.creds.access.toUpperCase()}</span>
                                      <span className="flex items-center gap-1"><Key className="h-2.5 w-2.5" />{osInfo.creds.username}</span>
                                    </div>
                                  </div>
                                  {isSelected && <Check className="h-4 w-4 text-cyan-400 shrink-0 mt-0.5" />}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Preview panel */}
          <div className="w-[45%] p-4 overflow-y-auto bg-black/30">
            {selectedPreview ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className={`h-11 w-11 rounded-xl flex items-center justify-center ${
                    selectedPreview.source === "custom"
                      ? "bg-purple-900/40 border border-purple-700/50"
                      : "bg-cyan-900/30 border border-cyan-700/40"
                  }`}>
                    {selectedPreview.source === "custom"
                      ? <Wrench className="h-5 w-5 text-purple-300" />
                      : <Cloud className="h-5 w-5 text-cyan-300" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-mono">{selectedPreview.sourceLabel || selectedPreview.name}</h3>
                    <p className="text-[9px] font-mono text-gray-500">{selectedPreview.sourceCategory}</p>
                  </div>
                </div>

                {/* Image ID */}
                {selectedPreview.name?.startsWith("ami-") && (
                  <div className="bg-gray-800/40 rounded-lg p-2.5 border border-gray-700/50">
                    <p className="text-[8px] font-mono text-gray-500 uppercase mb-1">AMI ID</p>
                    <code className="text-[10px] font-mono text-cyan-400 break-all">{selectedPreview.name}</code>
                  </div>
                )}

                {/* OS and Credentials */}
                <div className="bg-gray-800/40 rounded-xl p-3.5 border border-gray-700/50">
                  <h4 className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-2.5">OS &amp; Access</h4>
                  {(() => {
                    const osInfo = getOsBadge(selectedPreview.osFamily);
                    const creds = selectedPreview.username ? {
                      username: selectedPreview.username,
                      access: selectedPreview.access || osInfo.creds.access,
                      port: selectedPreview.port || osInfo.creds.port,
                      label: osInfo.creds.label,
                    } : osInfo.creds;
                    return (
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-black/40 rounded-lg p-2.5">
                            <p className="text-[7px] font-mono text-gray-500 uppercase">OS Family</p>
                            <p className="text-[10px] font-mono font-bold text-white">{creds.label}</p>
                          </div>
                          <div className="bg-black/40 rounded-lg p-2.5">
                            <p className="text-[7px] font-mono text-gray-500 uppercase">Architecture</p>
                            <p className="text-[10px] font-mono font-bold text-gray-300">{selectedPreview.architecture}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-black/40 rounded-lg p-2.5">
                            <p className="text-[7px] font-mono text-gray-500 uppercase">Default User</p>
                            <p className="text-[11px] font-mono font-bold text-green-400">{creds.username}</p>
                          </div>
                          <div className="bg-black/40 rounded-lg p-2.5">
                            <p className="text-[7px] font-mono text-gray-500 uppercase">Access Method</p>
                            <p className="text-[11px] font-mono font-bold text-cyan-400">{creds.access.toUpperCase()} :{creds.port}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Connection Instructions */}
                <div className="bg-gray-800/40 rounded-xl p-3.5 border border-gray-700/50">
                  <h4 className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
                    <Terminal className="h-3 w-3 text-green-400" /> Connection Instructions
                  </h4>
                  {(() => {
                    const osInfo = getOsBadge(selectedPreview.osFamily);
                    const creds = selectedPreview.username ? {
                      username: selectedPreview.username,
                      access: selectedPreview.access || osInfo.creds.access,
                      port: selectedPreview.port || osInfo.creds.port,
                    } : osInfo.creds;
                    const isRdp = creds.access === "rdp";
                    return (
                      <div className="space-y-2.5">
                        {isRdp ? (
                          <>
                            <div className="bg-black/40 rounded-lg p-3">
                              <p className="text-[9px] font-mono text-gray-400 mb-1.5">RDP Connection</p>
                              <code className="block text-[10px] font-mono text-blue-300 bg-black/60 rounded-lg p-2.5 break-all border border-blue-900/30">
                                mstsc /v:&lt;PUBLIC_IP&gt;:{creds.port}
                              </code>
                            </div>
                            <div className="bg-amber-950/30 border border-amber-800/40 rounded-lg p-3">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-[9px] font-mono text-amber-300 font-bold mb-1">Windows Password</p>
                                  <p className="text-[8px] font-mono text-amber-400/80">Decrypt the Administrator password using the lab's private key (.pem) via AWS GetPasswordData — available after deployment.</p>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="bg-black/40 rounded-lg p-3">
                              <p className="text-[9px] font-mono text-gray-400 mb-1.5">SSH Connection</p>
                              <code className="block text-[10px] font-mono text-green-300 bg-black/60 rounded-lg p-2.5 border border-green-900/30">
                                chmod 400 lab-key.pem{'\n'}
                                ssh -i lab-key.pem {creds.username}@&lt;PUBLIC_IP&gt;
                              </code>
                            </div>
                            <div className="bg-black/40 rounded-lg p-3">
                              <p className="text-[9px] font-mono text-gray-400 mb-1">Connection Details</p>
                              <div className="text-[10px] font-mono text-gray-300 space-y-1.5">
                                <p className="flex items-center gap-2">
                                  <span className="text-gray-500">Port:</span>
                                  <span className="text-cyan-400 font-bold">{creds.port}</span>
                                </p>
                                <p className="flex items-center gap-2">
                                  <span className="text-gray-500">User:</span>
                                  <span className="text-green-400 font-bold">{creds.username}</span>
                                </p>
                                <p className="flex items-center gap-2">
                                  <span className="text-gray-500">Auth:</span>
                                  <span className="text-yellow-400">SSH Key Pair (.pem)</span>
                                </p>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })()}
                </div>

                {/* Resource Specs (custom images) */}
                {selectedPreview.dbImage && (
                  <div className="bg-gray-800/40 rounded-xl p-3.5 border border-gray-700/50">
                    <h4 className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-2.5">Resource Specs</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-black/40 rounded-lg p-2.5 text-center">
                        <Cpu className="h-3 w-3 text-gray-500 mx-auto mb-1" />
                        <p className="text-[10px] font-mono text-gray-300">{selectedPreview.cpu || "—"} vCPU</p>
                      </div>
                      <div className="bg-black/40 rounded-lg p-2.5 text-center">
                        <Monitor className="h-3 w-3 text-gray-500 mx-auto mb-1" />
                        <p className="text-[10px] font-mono text-gray-300">{selectedPreview.ram ? `${(selectedPreview.ram / 1024).toFixed(1)}GB` : "—"}</p>
                      </div>
                      <div className="bg-black/40 rounded-lg p-2.5 text-center">
                        <HardDrive className="h-3 w-3 text-gray-500 mx-auto mb-1" />
                        <p className="text-[10px] font-mono text-gray-300">{selectedPreview.storage ? `${selectedPreview.storage}GB` : "—"}</p>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleConfirm}
                  className="w-full bg-gradient-to-r from-cyan-700 to-cyan-600 hover:from-cyan-600 hover:to-cyan-500 text-white gap-2 text-sm shadow-lg shadow-cyan-900/30"
                >
                  <Check className="h-4 w-4" /> Use This Image
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="h-14 w-14 rounded-2xl bg-gray-800/40 border border-gray-700/60 flex items-center justify-center mb-4">
                  <Star className="h-7 w-7 text-gray-600" />
                </div>
                <p className="text-xs font-mono text-gray-500 mb-1">Select an image to preview</p>
                <p className="text-[10px] font-mono text-gray-600">Connection details and credentials will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}