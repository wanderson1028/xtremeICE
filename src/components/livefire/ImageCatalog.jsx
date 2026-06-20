import React, { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Server, HardDrive, Cpu, Monitor, Search, X, Check,
  Cloud, Database, Loader2, Terminal, MonitorPlay, Key,
  Globe, AlertTriangle, ChevronRight, Filter, Wrench
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

// OS family detection and default credentials
const OS_CREDENTIALS = {
  amazon_linux: { username: "ec2-user", access: "ssh", port: 22, label: "Amazon Linux" },
  ubuntu: { username: "ubuntu", access: "ssh", port: 22, label: "Ubuntu" },
  debian: { username: "admin", access: "ssh", port: 22, label: "Debian" },
  rhel: { username: "ec2-user", access: "ssh", port: 22, label: "RHEL" },
  centos: { username: "centos", access: "ssh", port: 22, label: "CentOS" },
  windows: { username: "Administrator", access: "rdp", port: 3389, label: "Windows" },
  kali: { username: "kali", access: "ssh", port: 22, label: "Kali Linux" },
  suse: { username: "ec2-user", access: "ssh", port: 22, label: "SUSE" },
};

function detectOSFamily(imageId, description = "", name = "") {
  const combined = `${imageId} ${description} ${name}`.toLowerCase();
  if (combined.includes("windows") || combined.includes("win-") || combined.includes("win20")) return "windows";
  if (combined.includes("ubuntu")) return "ubuntu";
  if (combined.includes("debian")) return "debian";
  if (combined.includes("rhel") || combined.includes("redhat") || combined.includes("red hat")) return "rhel";
  if (combined.includes("centos")) return "centos";
  if (combined.includes("kali")) return "kali";
  if (combined.includes("suse") || combined.includes("sles")) return "suse";
  if (combined.includes("amazon") || combined.includes("amzn") || combined.includes("al2023") || combined.includes("al2")) return "amazon_linux";
  return "amazon_linux"; // default
}

function getOsBadge(osFamily) {
  const creds = OS_CREDENTIALS[osFamily] || OS_CREDENTIALS.amazon_linux;
  const colors = {
    amazon_linux: "bg-orange-900/30 border-orange-700/40 text-orange-400",
    ubuntu: "bg-orange-700/30 border-orange-600/40 text-orange-300",
    debian: "bg-red-900/30 border-red-700/40 text-red-400",
    rhel: "bg-red-800/30 border-red-700/40 text-red-300",
    centos: "bg-purple-900/30 border-purple-700/40 text-purple-400",
    windows: "bg-blue-900/30 border-blue-700/40 text-blue-400",
    kali: "bg-gray-700/30 border-gray-600/40 text-gray-400",
    suse: "bg-green-900/30 border-green-700/40 text-green-400",
  };
  return { creds, color: colors[osFamily] || colors.amazon_linux };
}

export default function ImageCatalog({ isOpen, onClose, onSelect, cloudProvider = "aws", region = "us-west-2", selectedImageId }) {
  const [search, setSearch] = useState("");
  const [osFilter, setOsFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all"); // all, cloud, custom
  const [selectedPreview, setSelectedPreview] = useState(null);

  // Fetch custom images from database
  const { data: dbImages = [], isLoading: loadingDb } = useQuery({
    queryKey: ["livefire-images-catalog"],
    queryFn: () => base44.entities.LiveFireImage.filter({ status: "available" }, "vendor", 100),
    enabled: isOpen,
  });

  // Fetch cloud AMIs
  const { data: cloudData, isFetching: loadingCloud } = useQuery({
    queryKey: ["cloud-amis-catalog", cloudProvider, region],
    queryFn: async () => {
      if (cloudProvider === "aws") {
        try {
          const res = await base44.functions.invoke("cloudProviderAWS", {
            action: "listAMIs",
            params: { region },
          });
          return res.data?.groups || [];
        } catch { return []; }
      }
      return []; // Azure and GCP not yet implemented
    },
    enabled: isOpen && cloudProvider === "aws",
    staleTime: 300_000,
  });

  // Flatten cloud AMIs into unified image list
  const cloudImages = useMemo(() => {
    const all = [];
    (cloudData || []).forEach(group => {
      const osFamily = detectOSFamily(group.name, group.owner === "amazon" ? "Amazon Linux" : group.name);
      (group.images || []).forEach(img => {
        all.push({
          id: img.imageId,
          name: img.imageId,
          description: img.description || `${group.name}`,
          osFamily,
          architecture: img.architecture || "x86_64",
          creationDate: img.creationDate,
          source: "cloud",
          sourceLabel: `AWS (${group.name})`,
          cloudProvider,
          region,
        });
      });
    });
    return all;
  }, [cloudData, cloudProvider, region]);

  // Flatten custom images
  const customImages = useMemo(() => {
    return dbImages.map(img => ({
      id: img.id,
      name: `${img.vendor} ${img.product} v${img.version}`,
      description: img.description || "",
      osFamily: detectOSFamily(img.vendor, img.product, img.product),
      architecture: "x86_64",
      creationDate: img.updated_date || img.created_date,
      source: "custom",
      sourceLabel: `Repository (${img.vendor})`,
      dbImage: img,
      cpu: img.cpu_requirement,
      ram: img.ram_requirement_mb,
      storage: img.storage_requirement_gb,
      access: img.default_access_method || "ssh",
      username: img.default_username || "admin",
      port: img.default_access_port || 22,
    }));
  }, [dbImages]);

  // Merge and filter
  const allImages = useMemo(() => {
    let merged = [...cloudImages, ...customImages];
    if (sourceFilter === "cloud") merged = cloudImages;
    if (sourceFilter === "custom") merged = customImages;
    if (osFilter !== "all") merged = merged.filter(i => i.osFamily === osFilter);
    if (search) {
      const q = search.toLowerCase();
      merged = merged.filter(i => i.name.toLowerCase().includes(q) || i.description.toLowerCase().includes(q) || i.sourceLabel.toLowerCase().includes(q));
    }
    return merged;
  }, [cloudImages, customImages, sourceFilter, osFilter, search]);

  const handleSelectImage = (image) => {
    onSelect(image);
    setSelectedPreview(image);
  };

  const handleConfirm = () => {
    if (selectedPreview) {
      onClose();
    }
  };

  // Count unique OS families
  const osFamilies = useMemo(() => {
    const families = new Set();
    [...cloudImages, ...customImages].forEach(i => families.add(i.osFamily));
    return Array.from(families);
  }, [cloudImages, customImages]);

  if (!isOpen) return null;

  const isLoading = loadingDb || loadingCloud;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-red-900/40 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-red-900/30">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-cyan-900/30 border border-cyan-700/40 flex items-center justify-center">
              <Database className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Image Catalog</h2>
              <p className="text-[10px] font-mono text-gray-500">
                {cloudProvider.toUpperCase()} {region} — {allImages.length} images
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-gray-800 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-500" />
            <Input
              placeholder="Search images..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-gray-800 border-gray-700 text-white text-xs h-9 font-mono"
            />
          </div>
          <div className="flex gap-1.5">
            <button onClick={() => setSourceFilter("all")}
              className={`text-[10px] font-mono px-2.5 py-1.5 rounded-lg border transition-colors ${sourceFilter === "all" ? "bg-red-900/30 border-red-600/40 text-red-300" : "bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200"}`}>
              All Sources
            </button>
            <button onClick={() => setSourceFilter("cloud")}
              className={`text-[10px] font-mono px-2.5 py-1.5 rounded-lg border transition-colors ${sourceFilter === "cloud" ? "bg-cyan-900/30 border-cyan-600/40 text-cyan-300" : "bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200"}`}>
              <Cloud className="h-3 w-3 inline mr-1" />Cloud
            </button>
            <button onClick={() => setSourceFilter("custom")}
              className={`text-[10px] font-mono px-2.5 py-1.5 rounded-lg border transition-colors ${sourceFilter === "custom" ? "bg-purple-900/30 border-purple-600/40 text-purple-300" : "bg-gray-800 border-gray-700 text-gray-400 hover:text-gray-200"}`}>
              <Wrench className="h-3 w-3 inline mr-1" />Custom
            </button>
          </div>
        </div>

        {/* OS Family chips */}
        <div className="flex gap-1.5 px-5 py-2.5 border-b border-gray-800 overflow-x-auto">
          <button onClick={() => setOsFilter("all")}
            className={`text-[10px] font-mono px-2.5 py-1 rounded-full border whitespace-nowrap transition-colors ${osFilter === "all" ? "bg-red-900/30 border-red-600/40 text-red-300" : "bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300"}`}>
            All OS
          </button>
          {osFamilies.map(fam => {
            const info = getOsBadge(fam);
            return (
              <button key={fam} onClick={() => setOsFilter(fam)}
                className={`text-[10px] font-mono px-2.5 py-1 rounded-full border whitespace-nowrap transition-colors ${osFilter === fam ? info.color + " brightness-125" : "bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300"}`}>
                {info.creds.label}
              </button>
            );
          })}
        </div>

        {/* Content: split into list + preview */}
        <div className="flex-1 flex overflow-hidden">
          {/* Image list */}
          <div className="w-[55%] overflow-y-auto p-3 space-y-1.5 border-r border-gray-800">
            {isLoading ? (
              <div className="flex items-center justify-center py-20 gap-2">
                <Loader2 className="h-5 w-5 text-cyan-400 animate-spin" />
                <span className="text-xs font-mono text-gray-500">Loading images...</span>
              </div>
            ) : allImages.length === 0 ? (
              <div className="text-center py-20">
                <Database className="h-10 w-10 text-gray-700 mx-auto mb-3" />
                <p className="text-xs font-mono text-gray-600">No images found</p>
                <p className="text-[10px] font-mono text-gray-700 mt-1">Try different filters or search terms</p>
              </div>
            ) : (
              allImages.map((img) => {
                const osInfo = getOsBadge(img.osFamily);
                const isSelected = selectedPreview?.id === img.id || selectedImageId === img.id;
                const isDbImage = img.source === "custom";
                return (
                  <button
                    key={img.id}
                    onClick={() => handleSelectImage(img)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      isSelected
                        ? "bg-cyan-900/20 border-cyan-600/50 ring-1 ring-cyan-500/30"
                        : "bg-gray-800/40 border-gray-700 hover:border-gray-600 hover:bg-gray-800/60"
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <div className={`mt-0.5 h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${isDbImage ? "bg-purple-900/30 border border-purple-700/40" : "bg-cyan-900/20 border border-cyan-700/30"}`}>
                        {isDbImage ? <Wrench className="h-4 w-4 text-purple-400" /> : <Cloud className="h-4 w-4 text-cyan-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-bold text-white font-mono truncate">{img.name}</span>
                          <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded-full border ${osInfo.color}`}>{osInfo.creds.label}</span>
                          {isDbImage && <span className="text-[8px] font-mono text-purple-400 bg-purple-900/30 px-1 py-0.5 rounded border border-purple-800/30">Custom</span>}
                        </div>
                        <p className="text-[10px] text-gray-500 font-mono truncate mb-1">{img.description}</p>
                        <div className="flex items-center gap-2 text-[8px] font-mono text-gray-600">
                          <span className="flex items-center gap-1"><Monitor className="h-2.5 w-2.5" />{img.architecture}</span>
                          <span className="flex items-center gap-1"><Terminal className="h-2.5 w-2.5" />{osInfo.creds.access.toUpperCase()}:{osInfo.creds.port}</span>
                          <span className="flex items-center gap-1"><Key className="h-2.5 w-2.5" />{osInfo.creds.username}</span>
                          <span className="text-gray-700">{img.sourceLabel}</span>
                        </div>
                      </div>
                      {isSelected && <Check className="h-4 w-4 text-cyan-400 shrink-0 mt-1" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Preview panel */}
          <div className="w-[45%] p-4 overflow-y-auto bg-black/20">
            {selectedPreview ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${selectedPreview.source === "custom" ? "bg-purple-900/30 border border-purple-700/40" : "bg-cyan-900/20 border border-cyan-700/30"}`}>
                    {selectedPreview.source === "custom" ? <Wrench className="h-5 w-5 text-purple-400" /> : <Cloud className="h-5 w-5 text-cyan-400" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white font-mono">{selectedPreview.name}</h3>
                    <p className="text-[9px] font-mono text-gray-500">{selectedPreview.sourceLabel}</p>
                  </div>
                </div>

                {/* OS and Credentials */}
                <div className="bg-gray-800/60 rounded-xl p-3.5 border border-gray-700">
                  <h4 className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-2">OS &amp; Access</h4>
                  {(() => {
                    const osInfo = getOsBadge(selectedPreview.osFamily);
                    const creds = selectedPreview.username ? {
                      username: selectedPreview.username,
                      access: selectedPreview.access || osInfo.creds.access,
                      port: selectedPreview.port || osInfo.creds.port,
                      label: osInfo.creds.label,
                    } : osInfo.creds;
                    return (
                      <div className="space-y-2.5">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-black/30 rounded-lg p-2.5">
                            <p className="text-[7px] font-mono text-gray-500 uppercase">OS Family</p>
                            <p className={`text-[10px] font-mono font-bold ${osInfo.color.split(" ")[2] || "text-gray-300"}`}>{creds.label}</p>
                          </div>
                          <div className="bg-black/30 rounded-lg p-2.5">
                            <p className="text-[7px] font-mono text-gray-500 uppercase">Architecture</p>
                            <p className="text-[10px] font-mono font-bold text-gray-300">{selectedPreview.architecture}</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-black/30 rounded-lg p-2.5">
                            <p className="text-[7px] font-mono text-gray-500 uppercase">Default User</p>
                            <p className="text-[11px] font-mono font-bold text-green-400">{creds.username}</p>
                          </div>
                          <div className="bg-black/30 rounded-lg p-2.5">
                            <p className="text-[7px] font-mono text-gray-500 uppercase">Access</p>
                            <p className="text-[11px] font-mono font-bold text-cyan-400">{creds.access.toUpperCase()}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Connection Instructions */}
                <div className="bg-gray-800/60 rounded-xl p-3.5 border border-gray-700">
                  <h4 className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Terminal className="h-3 w-3 text-green-400" /> Connection
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
                            <div className="bg-black/30 rounded-lg p-3">
                              <p className="text-[9px] font-mono text-gray-400 mb-1.5">RDP Connection</p>
                              <code className="block text-[10px] font-mono text-green-400 bg-black/40 rounded-lg p-2.5 break-all">
                                mstsc /v:&lt;PUBLIC_IP&gt;:{creds.port}
                              </code>
                            </div>
                            <div className="bg-amber-950/20 border border-amber-800/30 rounded-lg p-3">
                              <div className="flex items-start gap-2">
                                <AlertTriangle className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                  <p className="text-[9px] font-mono text-amber-300 font-bold mb-1">Windows Password</p>
                                  <p className="text-[8px] font-mono text-amber-400/70">Use the lab's private key to decrypt the Administrator password from AWS. The decryption tool is available in the deployed lab's device panel.</p>
                                </div>
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="bg-black/30 rounded-lg p-3">
                              <p className="text-[9px] font-mono text-gray-400 mb-1.5">SSH Connection</p>
                              <code className="block text-[10px] font-mono text-green-400 bg-black/40 rounded-lg p-2.5 break-all">
                                chmod 400 lab-key.pem<br />
                                ssh -i lab-key.pem {creds.username}@&lt;PUBLIC_IP&gt;
                              </code>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3">
                              <p className="text-[9px] font-mono text-gray-400 mb-1">Access Details</p>
                              <div className="text-[10px] font-mono text-gray-300 space-y-1">
                                <p>Port: <span className="text-cyan-400">{creds.port}</span></p>
                                <p>User: <span className="text-green-400">{creds.username}</span></p>
                                <p>Key: <span className="text-yellow-400">.pem file</span> (generated on deploy)</p>
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
                  <div className="bg-gray-800/60 rounded-xl p-3.5 border border-gray-700">
                    <h4 className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-2">Resource Specs</h4>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-black/30 rounded-lg p-2 text-center">
                        <Cpu className="h-3 w-3 text-gray-500 mx-auto mb-0.5" />
                        <p className="text-[10px] font-mono text-gray-300">{selectedPreview.cpu || "—"} vCPU</p>
                      </div>
                      <div className="bg-black/30 rounded-lg p-2 text-center">
                        <Monitor className="h-3 w-3 text-gray-500 mx-auto mb-0.5" />
                        <p className="text-[10px] font-mono text-gray-300">{selectedPreview.ram ? `${(selectedPreview.ram / 1024).toFixed(1)}GB` : "—"}</p>
                      </div>
                      <div className="bg-black/30 rounded-lg p-2 text-center">
                        <HardDrive className="h-3 w-3 text-gray-500 mx-auto mb-0.5" />
                        <p className="text-[10px] font-mono text-gray-300">{selectedPreview.storage ? `${selectedPreview.storage}GB` : "—"}</p>
                      </div>
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleConfirm}
                  className="w-full bg-cyan-700 hover:bg-cyan-600 text-white gap-2 text-sm"
                >
                  <Check className="h-4 w-4" /> Use This Image
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="h-14 w-14 rounded-2xl bg-gray-800/40 border border-gray-700/50 flex items-center justify-center mb-4">
                  <Database className="h-7 w-7 text-gray-600" />
                </div>
                <p className="text-xs font-mono text-gray-600 mb-1">Select an image to preview</p>
                <p className="text-[10px] font-mono text-gray-700">Connection details and credentials will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}