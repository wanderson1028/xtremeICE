import React, { useState, useEffect, useRef, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link, useSearchParams } from "react-router-dom";
import {
  ArrowLeft, Terminal, Wifi, Plus, X, Play, Square, RefreshCw, ExternalLink,
  ChevronRight, Cpu, HardDrive, Network, Globe, Zap, Download, Key, Check, Copy,
  Power, PowerOff, Rocket, Server, Wand2, Sun, Moon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import DeviceIconRenderer, { getDeviceIcon, getIconOptions } from "@/components/livefire/DeviceIcons";
import { EVE_NG_ICONS, EVE_NG_ICON_LIST } from "@/components/livefire/EveNgIcons";

const TYPE_COLORS = {
  router: "border-amber-500 bg-amber-500/10", switch: "border-cyan-500 bg-cyan-500/10",
  firewall: "border-red-500 bg-red-500/10", server: "border-blue-500 bg-blue-500/10",
  workstation: "border-purple-500 bg-purple-500/10", cloud_resource: "border-sky-500 bg-sky-500/10",
  container: "border-green-500 bg-green-500/10", security_appliance: "border-rose-500 bg-rose-500/10",
  load_balancer: "border-teal-500 bg-teal-500/10", monitoring: "border-indigo-500 bg-indigo-500/10",
};

const STATUS_COLORS = {
  running: "bg-green-500", provisioning: "bg-yellow-500 animate-pulse",
  pending: "bg-gray-500", stopped: "bg-red-500", failed: "bg-red-600",
  terminated: "bg-gray-700",
};

const DEVICE_TEMPLATES = [
  { type: "server", name: "Server", cpu: 2, ram: 4096, storage: 20, access: "ssh", subtitle: "Linux/Windows server" },
  { type: "workstation", name: "Workstation", cpu: 2, ram: 4096, storage: 20, access: "rdp", subtitle: "Desktop workstation" },
  { type: "router", name: "Router", cpu: 1, ram: 2048, storage: 10, access: "ssh", subtitle: "Network router" },
  { type: "firewall", name: "Firewall", cpu: 2, ram: 4096, storage: 20, access: "ssh", subtitle: "Security appliance" },
];

// ---- Device Node on Canvas (EVE-NG style) ----
function DeviceNode({ device, deployed, isSelected, onClick, style, isDark }) {
  const status = deployed?.status || "pending";
  const statusColor = STATUS_COLORS[status] || STATUS_COLORS.pending;
  const iconId = device.icon_id || `eve_${device.type}`;
  const EveIcon = EVE_NG_ICONS[iconId] || EVE_NG_ICONS[`eve_${device.type}`];

  return (
    <div
      onClick={(e) => onClick(device.id, e)}
      className={`absolute flex flex-col items-center cursor-pointer transition-all ${isSelected ? "z-20" : "z-10"}`}
      style={{ left: style.x, top: style.y }}
    >
      {/* Status dot */}
      <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 ${isDark ? "border-gray-900" : "border-white"} ${statusColor} z-10`} />
      {/* Device box — EVE-NG style square */}
      <div className={`w-16 h-16 rounded-lg border-2 backdrop-blur-sm flex items-center justify-center shadow-lg transition-all ${
        isSelected
          ? "border-red-500 ring-2 ring-red-500/40"
          : isDark
            ? "border-gray-500/60 hover:border-gray-300 bg-gray-900/90"
            : "border-gray-400 hover:border-gray-600 bg-white/90"
      }`}>
        {EveIcon ? (
          <EveIcon className={`w-10 h-10 ${isDark ? "text-gray-200" : "text-gray-700"}`} />
        ) : (
          <DeviceIconRenderer type={device.type} iconId={iconId} className={`w-8 h-8 ${isDark ? "text-gray-200" : "text-gray-700"}`} />
        )}
      </div>
      <span className={`text-[9px] font-mono mt-1 text-center leading-tight max-w-[90px] truncate ${isDark ? "text-gray-300" : "text-gray-700"}`}>
        {device.name}
      </span>
      {deployed?.public_ip && (
        <span className="text-[8px] font-mono text-green-500 mt-0.5">{deployed.public_ip}</span>
      )}
    </div>
  );
}

// ---- Connection Line (EVE-NG style with link labels) ----
function ConnectionLine({ conn, topologyDevices, deployedMap, isDark }) {
  const from = topologyDevices.find(d => d.id === conn.from || d.id === conn.target_device_id);
  const to = topologyDevices.find(d => d.id === conn.to || d.id === conn.target_device_id);
  if (!from || !to) return null;

  const cx = 32, cy = 32; // half of 64px node
  const x1 = (from.position_x || 100) + cx;
  const y1 = (from.position_y || 100) + cy;
  const x2 = (to.position_x || 300) + cx;
  const y2 = (to.position_y || 200) + cy;

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const label = conn.source_interface || conn.label;
  const ipLabel = conn.source_ip;
  const lineColor = isDark ? "rgba(156,163,175,0.5)" : "rgba(80,90,100,0.6)";
  const textColor = isDark ? "rgba(156,163,175,0.8)" : "rgba(60,70,80,0.8)";

  return (
    <g>
      <line
        x1={x1} y1={y1} x2={x2} y2={y2}
        stroke={lineColor} strokeWidth={1.5}
        strokeDasharray={conn.type === "internet" || conn.connection_type === "internet" ? "4,3" : "none"}
      />
      {label && (
        <text x={midX} y={midY - 4} textAnchor="middle"
          className="font-mono" fontSize={8} fill={textColor}>
          {label}
        </text>
      )}
      {ipLabel && (
        <text x={midX} y={midY + 8} textAnchor="middle"
          className="font-mono" fontSize={7} fill="rgba(74,222,128,0.7)">
          {ipLabel}
        </text>
      )}
    </g>
  );
}

// ---- Device Detail Panel ----
function DeviceDetailPanel({ device, deployed, onClose, lab, refetchDevices, queryClient, labId }) {
  const [connecting, setConnecting] = useState(false);
  const [passwordData, setPasswordData] = useState(null);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState(null);
  const [verifyResult, setVerifyResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [deviceAction, setDeviceAction] = useState(null); // 'stopping' | 'starting'
  const [rdpCopied, setRdpCopied] = useState(false);
  const [pwdCopied, setPwdCopied] = useState(false);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const status = deployed?.status || "pending";
  const isWindows = (deployed?.access_method || device.access_method) === "rdp";

  const handleChangeIcon = async (iconId) => {
    const topologyData = lab?.topology_data || {};
    const devices = [...(topologyData.devices || [])];
    const idx = devices.findIndex(d => d.id === device.id);
    if (idx !== -1) {
      devices[idx] = { ...devices[idx], icon_id: iconId };
      await base44.entities.LiveFireLab.update(labId, {
        topology_data: { ...topologyData, devices },
      });
      queryClient.invalidateQueries(["livefire-lab", labId]);
    }
  };

  const handleDownloadKey = () => {
    if (!lab?.ssh_private_key) return;
    const blob = new Blob([lab.ssh_private_key], { type: "application/x-pem-file" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${lab.ssh_key_name || "livefire-key"}.pem`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleGetPassword = async () => {
    console.log("[GetPassword] clicked, deployed:", deployed);
    if (!deployed?.instance_id) {
      console.log("[GetPassword] no instance_id, returning");
      setPasswordError("No instance ID available");
      return;
    }
    setLoadingPassword(true);
    setPasswordError(null);
    setPasswordData(null);
    setVerifyResult(null);
    try {
      console.log("[GetPassword] calling decryptWindowsPassword with instance:", deployed.instance_id);
      const res = await base44.functions.invoke("cloudProviderAWS", {
        action: "decryptWindowsPassword",
        params: {
          instance_id: deployed.instance_id,
          lab_id: labId,
          region: lab?.region || "us-east-1",
          private_key_pem: lab?.ssh_private_key || "",
        },
      });
      console.log("[GetPassword] response:", res.data);
      const pwdData = res.data;

      if (pwdData?.success && pwdData?.password) {
        setPasswordData({ password: pwdData.password, timestamp: pwdData.timestamp });
        setPasswordError(null);
      } else if (pwdData?.error === "Password not ready") {
        setPasswordError(pwdData.message || "Password not ready yet. Windows instances need 4-8 minutes after launch.");
        setPasswordData({ notReady: true });
      } else {
        setPasswordError(pwdData?.message || pwdData?.error || "Failed to decrypt password");
        if (pwdData?.passwordData) setPasswordData({ passwordData: pwdData.passwordData, decryptFailed: true, manualCmd: pwdData.manualDecryptCmd });
      }
    } catch (err) {
      console.error("[GetPassword] error:", err);
      setPasswordError(err?.response?.data?.error || err?.message || "Failed to retrieve password data");
    } finally {
      setLoadingPassword(false);
    }
  };

  const handleVerifyKey = async () => {
    if (!deployed?.instance_id) return;
    setVerifying(true);
    setVerifyResult(null);
    try {
      const res = await base44.functions.invoke("cloudProviderAWS", {
        action: "verifyKeyPair",
        params: {
          instance_id: deployed.instance_id,
          private_key_pem: lab?.ssh_private_key || "",
          region: lab?.region || "us-east-1",
        },
      });
      setVerifyResult(res.data);
    } catch (err) {
      setVerifyResult({ verdict: "Error: " + (err?.response?.data?.error || err?.message) });
    } finally {
      setVerifying(false);
    }
  };

  const handleStopDevice = async () => {
    if (!deployed?.id) return;
    setDeviceAction("stopping");
    try {
      await base44.functions.invoke("cloudOrchestrator", {
        action: "stopDevice",
        params: { lab_id: labId, device_id: deployed.id },
      });
      refetchDevices();
      queryClient.invalidateQueries(["livefire-devices", labId]);
    } catch (err) {
      console.error("Stop failed:", err);
    } finally {
      setDeviceAction(null);
    }
  };

  const handleStartDevice = async () => {
    if (!deployed?.id) return;
    setDeviceAction("starting");
    try {
      await base44.functions.invoke("cloudOrchestrator", {
        action: "startDevice",
        params: { lab_id: labId, device_id: deployed.id },
      });
      refetchDevices();
      queryClient.invalidateQueries(["livefire-devices", labId]);
    } catch (err) {
      console.error("Start failed:", err);
    } finally {
      setDeviceAction(null);
    }
  };

  const handleConnect = async () => {
    if (!deployed?.public_ip) return;
    setConnecting(true);

    const method = deployed.access_method || device.access_method || "ssh";
    const port = deployed.access_port || (method === "rdp" ? 3389 : 22);
    const user = deployed.default_username || (method === "rdp" ? "Administrator" : "ec2-user");

    if (method === "ssh") {
      window.open(`ssh://${user}@${deployed.public_ip}:${port}`, "_blank");
    } else if (method === "rdp") {
      // RDP needs a native client — copy connection info and show instructions
      const rdpInfo = `IP: ${deployed.public_ip}\nPort: ${port}\nUsername: ${user}`;
      try {
        await navigator.clipboard.writeText(rdpInfo);
        setRdpCopied(true);
        setTimeout(() => setRdpCopied(false), 3000);
      } catch { /* clipboard may not be available */ }
    } else if (deployed.access_url) {
      window.open(deployed.access_url, "_blank");
    }

    setConnecting(false);
  };

  return (
    <div className="absolute right-4 top-4 w-80 bg-gray-900/95 border border-red-900/40 rounded-xl shadow-2xl z-30 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-red-900/20 bg-gray-950">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5">
            <DeviceIconRenderer type={device.type} iconId={device.icon_id || device.type} className="text-red-400" />
          </div>
          <span className="text-sm font-bold text-white">{device.name}</span>
        </div>
        <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="h-4 w-4" /></button>
      </div>

      <div className="p-4 space-y-3">
        {/* Status */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-mono text-gray-500 uppercase">Status</span>
          <Badge className={`text-[10px] font-mono ${status === "running" ? "bg-green-900/40 text-green-400 border-green-700/40" : status === "provisioning" ? "bg-yellow-900/40 text-yellow-400 border-yellow-700/40" : "bg-gray-800 text-gray-400 border-gray-700"}`}>
            {status}
          </Badge>
        </div>

        {/* Icon Picker — collapsible */}
        <div className="bg-gray-800/40 rounded-lg border border-gray-700/60 overflow-hidden">
          <button
            onClick={() => setShowIconPicker(!showIconPicker)}
            className="flex items-center justify-between w-full p-3 hover:bg-gray-800/60 transition-colors"
          >
            <div className="flex items-center gap-1.5">
              <Wand2 className="h-3 w-3 text-amber-400" />
              <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider font-bold">Icon Style</span>
            </div>
            <span className="text-gray-500 text-xs">{showIconPicker ? "▲" : "▼"}</span>
          </button>
          {showIconPicker && (
            <div className="px-3 pb-3 grid grid-cols-5 gap-1.5">
              {EVE_NG_ICON_LIST.map(opt => {
                const Icon = opt.icon;
                const isActive = (device.icon_id || `eve_${device.type}`) === opt.id;
                return (
                  <button key={opt.id}
                    onClick={() => handleChangeIcon(opt.id)}
                    className={`flex flex-col items-center gap-1 p-2 rounded-lg border transition-all ${
                      isActive
                        ? "bg-red-900/40 border-red-500/70 shadow-[0_0_8px_rgba(239,68,68,0.2)]"
                        : "bg-gray-800/80 border-gray-600/60 hover:border-red-700/40 hover:bg-gray-750"
                    }`}
                    title={opt.label}
                  >
                    <div className="w-7 h-7">
                      {Icon && <Icon className={isActive ? "text-red-400 w-full h-full" : "text-gray-400 w-full h-full"} />}
                    </div>
                    <span className={`text-[8px] font-mono leading-tight text-center ${isActive ? "text-red-300 font-bold" : "text-gray-500"}`}>
                      {opt.label}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Specs */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "vCPU", value: deployed?.cpu_cores || device.cpu_cores || 2, icon: Cpu },
            { label: "RAM", value: `${(deployed?.ram_mb || device.ram_mb || 4096) / 1024} GB`, icon: HardDrive },
            { label: "Storage", value: `${deployed?.storage_gb || device.storage_gb || 20} GB`, icon: HardDrive },
          ].map(s => (
            <div key={s.label} className="bg-gray-800/60 rounded-lg p-2 text-center">
              <s.icon className="h-3 w-3 text-gray-500 mx-auto mb-0.5" />
              <p className="text-[8px] font-mono text-gray-500">{s.label}</p>
              <p className="text-[10px] font-mono text-white">{s.value}</p>
            </div>
          ))}
        </div>

        {/* IP Addresses */}
        {(deployed?.public_ip || deployed?.private_ip) && (
          <div className="space-y-1.5">
            {deployed.public_ip && (
              <div className="flex items-center justify-between bg-gray-800/60 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <Globe className="h-3 w-3 text-green-400" />
                  <span className="text-[9px] font-mono text-gray-500">Public</span>
                </div>
                <span className="text-[10px] font-mono text-green-400">{deployed.public_ip}</span>
              </div>
            )}
            {deployed.private_ip && (
              <div className="flex items-center justify-between bg-gray-800/60 rounded-lg px-3 py-2">
                <div className="flex items-center gap-2">
                  <Network className="h-3 w-3 text-blue-400" />
                  <span className="text-[9px] font-mono text-gray-500">Private</span>
                </div>
                <span className="text-[10px] font-mono text-blue-400">{deployed.private_ip}</span>
              </div>
            )}
          </div>
        )}

        {/* Username hint */}
        {deployed?.default_username && (
          <div className="flex items-center justify-between bg-gray-800/60 rounded-lg px-3 py-2">
            <span className="text-[9px] font-mono text-gray-500">User</span>
            <code className="text-[10px] font-mono text-amber-400">{deployed.default_username}</code>
          </div>
        )}

        {/* Power Controls */}
        {deployed?.instance_id && deployed?.id && (
          <div className="grid grid-cols-2 gap-2">
            <Button
              onClick={handleStopDevice}
              disabled={status === "stopped" || status === "terminated" || deviceAction}
              size="sm"
              variant="outline"
              className="border-red-700/40 text-red-400 hover:bg-red-950/30 hover:text-red-300 text-xs"
            >
              {deviceAction === "stopping" ? (
                <><RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" /> Stopping...</>
              ) : (
                <><PowerOff className="h-3.5 w-3.5 mr-1" /> Stop</>
              )}
            </Button>
            <Button
              onClick={handleStartDevice}
              disabled={status === "running" || status === "provisioning" || status === "terminated" || deviceAction}
              size="sm"
              variant="outline"
              className="border-green-700/40 text-green-400 hover:bg-green-950/30 hover:text-green-300 text-xs"
            >
              {deviceAction === "starting" ? (
                <><RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" /> Starting...</>
              ) : (
                <><Power className="h-3.5 w-3.5 mr-1" /> Start</>
              )}
            </Button>
          </div>
        )}

        {/* Connect */}
        <Button
          onClick={handleConnect}
          disabled={!deployed?.public_ip || connecting || status !== "running"}
          size="sm"
          className={`w-full disabled:bg-gray-800 disabled:text-gray-600 text-white ${isWindows && rdpCopied ? "bg-cyan-700 hover:bg-cyan-600" : "bg-green-700 hover:bg-green-600"}`}
        >
          {connecting ? (
            <><RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> Connecting...</>
          ) : isWindows && rdpCopied ? (
            <><Check className="h-3.5 w-3.5 mr-1.5" /> Connection Info Copied</>
          ) : deployed?.public_ip ? (
            <><Terminal className="h-3.5 w-3.5 mr-1.5" /> {isWindows ? "Copy RDP Info" : `Connect (${deployed.access_method || "ssh"})`}</>
          ) : (
            <><Wifi className="h-3.5 w-3.5 mr-1.5" /> No public IP</>
          )}
        </Button>

        {/* Download SSH Key */}
        {lab?.ssh_private_key && (
          <Button
            onClick={handleDownloadKey}
            size="sm"
            variant="outline"
            className="w-full border-amber-700/40 text-amber-400 hover:bg-amber-950/30 hover:text-amber-300 text-xs"
          >
            <Download className="h-3.5 w-3.5 mr-1.5" /> Download {isWindows ? "PEM Key (for RDP password)" : "SSH Key (.pem)"}
          </Button>
        )}

        {/* Windows RDP: Get Password */}
        {isWindows && deployed?.instance_id && status === "running" && lab?.ssh_private_key && (
          <div className="space-y-2 pt-2 border-t border-gray-800">
            <p className="text-[9px] font-mono text-gray-500">Windows Admin Password is encrypted with the PEM key. Retrieve it from AWS:</p>

            {/* Get Password + Copy icon side by side */}
            <div className="flex gap-2">
              <Button
                onClick={handleGetPassword}
                disabled={loadingPassword}
                size="sm"
                variant="outline"
                className="flex-1 border-purple-700/40 text-purple-400 hover:bg-purple-950/30 hover:text-purple-300 text-xs"
              >
                {loadingPassword ? (
                  <><RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> Fetching...</>
                ) : (
                  <><Key className="h-3.5 w-3.5 mr-1.5" /> Get Windows Admin Password</>
                )}
              </Button>
              <Button
                onClick={async () => {
                  if (!passwordData?.password) return;
                  try {
                    await navigator.clipboard.writeText(passwordData.password);
                    setPwdCopied(true);
                    setTimeout(() => setPwdCopied(false), 2000);
                  } catch { /* clipboard may not be available */ }
                }}
                disabled={!passwordData?.password}
                size="sm"
                variant="outline"
                className="border-green-700/40 text-green-400 hover:bg-green-950/30 hover:text-green-300 text-xs px-3"
                title={passwordData?.password ? "Copy password to clipboard" : "Retrieve password first"}
              >
                {pwdCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              </Button>
            </div>

            {/* Diagnostic: Verify key match */}
            <Button
              onClick={handleVerifyKey}
              disabled={verifying}
              size="sm"
              variant="ghost"
              className="w-full border-gray-700/40 text-gray-400 hover:text-white text-[9px] h-7"
            >
              {verifying ? (
                <><RefreshCw className="h-3 w-3 animate-spin mr-1" /> Checking...</>
              ) : (
                <>🔍 Verify Key Match</>
              )}
            </Button>

            {/* Verify result — dismissible */}
            {verifyResult && (
              <div className={`relative bg-gray-800/60 rounded-lg p-2 pr-7 border text-[9px] font-mono ${
                verifyResult.fingerprintsMatch === true
                  ? "border-green-700/40 text-green-400"
                  : verifyResult.fingerprintsMatch === false
                    ? "border-red-700/40 text-red-400"
                    : "border-yellow-700/40 text-yellow-400"
              }`}>
                <button
                  onClick={() => setVerifyResult(null)}
                  className="absolute top-1 right-1 text-gray-500 hover:text-white"
                  title="Dismiss"
                >
                  <X className="h-3 w-3" />
                </button>
                <p className="font-bold">{verifyResult.verdict}</p>
                {verifyResult.instanceKeyName && <p className="mt-1 text-gray-500">Instance key: {verifyResult.instanceKeyName}</p>}
                {verifyResult.awsFingerprint && <p className="text-gray-500">AWS fingerprint: {verifyResult.awsFingerprint}</p>}
                {verifyResult.pemFingerprint && <p className="text-gray-500">PEM fingerprint: {verifyResult.pemFingerprint}</p>}
                {verifyResult.decryptError && <p className="mt-1 text-gray-500">Decrypt error: {verifyResult.decryptError}</p>}
              </div>
            )}

            {/* Password error — dismissible, does NOT block password display */}
            {passwordError && (
              <div className="flex items-start justify-between gap-2 bg-red-950/30 border border-red-800/40 rounded-lg px-2 py-1.5">
                <p className="text-[9px] text-red-400 font-mono">{passwordError}</p>
                <button onClick={() => setPasswordError(null)} className="text-red-500 hover:text-red-300 shrink-0" title="Dismiss">
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}

            {/* Password display — shows independently of passwordError */}
            {passwordData && (
              <div className="bg-gray-800/60 rounded-lg p-3 space-y-2">
                {passwordData.password ? (
                  <>
                    <p className="text-[9px] font-mono text-green-400 font-bold mb-1">Admin Password Retrieved</p>
                    <div className="bg-green-950/30 border border-green-900/30 rounded-lg p-2">
                      <code className="block text-[11px] font-mono text-green-300 break-all select-all text-center tracking-wider">
                        {passwordData.password}
                      </code>
                    </div>
                    <p className="text-[8px] font-mono text-gray-500 text-center">
                      Connect via RDP with username <code className="text-amber-400">{deployed?.default_username || "Administrator"}</code>
                    </p>
                  </>
                ) : passwordData.notReady ? (
                  <p className="text-[9px] font-mono text-yellow-400 text-center">
                    Password not yet available. Windows needs 4-8 minutes after launch to generate it.
                  </p>
                ) : passwordData.decryptFailed ? (
                  <>
                    <p className="text-[9px] font-mono text-yellow-400 mb-1">Auto-decrypt failed. Encrypted password:</p>
                    <code className="block text-[9px] font-mono text-purple-300 break-all bg-gray-950/60 p-2 rounded border border-purple-900/30 max-h-28 overflow-y-auto">
                      {passwordData.passwordData}
                    </code>
                    {passwordData.manualCmd && (
                      <p className="text-[8px] font-mono text-gray-600 leading-relaxed">
                        Try manually:<br />
                        <code className="text-amber-400/80 text-[8px]">{passwordData.manualCmd}</code>
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-[9px] font-mono text-yellow-400 text-center">
                    Waiting for Windows to generate admin password...
                  </p>
                )}
                {passwordData.timestamp && (
                  <p className="text-[8px] font-mono text-gray-600 text-right">Fetched: {new Date(passwordData.timestamp).toLocaleTimeString()}</p>
                )}
              </div>
            )}
          </div>
        )}

        {lab?.ssh_private_key && !isWindows && (
          <p className="text-[8px] text-gray-600 font-mono text-center leading-relaxed">
            Save the key and run: <code className="text-amber-500/70">chmod 400 key.pem</code><br />
            then <code className="text-amber-500/70">ssh -i key.pem {deployed?.default_username || "ec2-user"}@{deployed?.public_ip || "&lt;ip&gt;"}</code>
          </p>
        )}

        {lab?.ssh_private_key && isWindows && (
          <p className="text-[8px] text-gray-600 font-mono text-center leading-relaxed">
            Download the PEM key above, then use <strong>Get Windows Admin Password</strong> to retrieve the RDP password.<br />
            Connect via: <code className="text-purple-400">RDP to {deployed?.public_ip || "&lt;ip&gt;"}:3389</code>
          </p>
        )}
      </div>
    </div>
  );
}

// ---- Add Device Panel ----
function AddDevicePanel({ lab, onClose, onDeploy, deploying }) {
  const [selected, setSelected] = useState(null);
  const [deviceName, setDeviceName] = useState("");
  const [cpu, setCpu] = useState(2);
  const [ram, setRam] = useState(4096);
  const [storage, setStorage] = useState(20);
  const [error, setError] = useState(null);

  const handleTemplateSelect = (tpl) => {
    setSelected(tpl);
    setDeviceName(tpl.name);
    setCpu(tpl.cpu);
    setRam(tpl.ram);
    setStorage(tpl.storage);
    setError(null);
  };

  const handleDeploy = () => {
    if (!deviceName.trim()) { setError("Device name is required"); return; }
    if (!selected) { setError("Select a device type"); return; }
    onDeploy({
      name: deviceName.trim(),
      type: selected.type,
      cpu_cores: cpu,
      ram_mb: ram,
      storage_gb: storage,
      access_method: selected.access,
      position_x: 400,
      position_y: 200,
    });
  };

  return (
    <div className="absolute right-4 top-4 w-80 bg-gray-900/95 border border-red-900/40 rounded-xl shadow-2xl z-30 overflow-hidden">
      <div className="flex items-center justify-between p-3 border-b border-red-900/20 bg-gray-950">
        <span className="text-sm font-bold text-white">Add Device</span>
        <button onClick={onClose} className="text-gray-500 hover:text-white"><X className="h-4 w-4" /></button>
      </div>
      <div className="p-4 space-y-3 max-h-[500px] overflow-y-auto">
        {/* Device type selection */}
        <p className="text-[10px] font-mono text-gray-500 uppercase">Device Type</p>
        <div className="grid grid-cols-2 gap-2">
          {DEVICE_TEMPLATES.map(tpl => {
            return (
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
            );
          })}
        </div>

        {/* Config */}
        {selected && (
          <>
            <div>
              <label className="text-[9px] font-mono text-gray-500 uppercase block mb-1">Name</label>
              <Input value={deviceName} onChange={e => setDeviceName(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white text-xs h-8 font-mono" />
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

        <Button onClick={handleDeploy} disabled={!selected || deploying}
          size="sm" className="w-full bg-red-700 hover:bg-red-600 disabled:bg-gray-800 text-white">
          {deploying ? (
            <><RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" /> Deploying...</>
          ) : (
            <><Zap className="h-3.5 w-3.5 mr-1.5" /> Deploy Device</>
          )}
        </Button>
      </div>
    </div>
  );
}

// ---- Main Page ----
export default function LiveLabTopology() {
  const [searchParams] = useSearchParams();
  const labId = searchParams.get("lab");
  const queryClient = useQueryClient();
  const canvasRef = useRef(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showAddDevice, setShowAddDevice] = useState(false);
  const [deployingDevice, setDeployingDevice] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [bulkAction, setBulkAction] = useState(null); // 'stopping-all' | 'starting-all' | 'deploying-all'
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDarkMode, setIsDarkMode] = useState(true);

  // Fetch lab
  const { data: lab, isLoading: labLoading } = useQuery({
    queryKey: ["livefire-lab", labId],
    queryFn: () => base44.entities.LiveFireLab.get(labId),
    enabled: !!labId,
  });

  // Fetch deployed devices
  const { data: deployedDevices = [], refetch: refetchDevices } = useQuery({
    queryKey: ["livefire-devices", labId],
    queryFn: () => base44.entities.LiveFireDevice.filter({ lab_id: labId }, "-updated_date", 100),
    enabled: !!labId,
    refetchInterval: 15000,
  });

  const topologyData = lab?.topology_data || {};
  const topologyDevices = topologyData.devices || [];
  const topologyConnections = topologyData.connections || [];

  // Build deployed-device lookup by name
  const deployedMap = {};
  deployedDevices.forEach(d => {
    const matchName = d.name?.toLowerCase();
    if (!deployedMap[matchName]) deployedMap[matchName] = d;
  });

  const handleDeviceClick = useCallback((deviceId, e) => {
    e.stopPropagation();
    const device = topologyDevices.find(d => d.id === deviceId);
    const deployed = deployedDevices.find(d => d.name?.toLowerCase() === device?.name?.toLowerCase());
    setSelectedDevice(selectedDevice?.id === deviceId ? null : { ...device, deployed_id: deployed?.id });
    setShowAddDevice(false);
  }, [topologyDevices, deployedDevices, selectedDevice]);

  const handleRefreshStatus = useCallback(async () => {
    setRefreshing(true);
    try {
      await base44.functions.invoke("cloudOrchestrator", {
        action: "refreshDeviceStatus",
        params: { lab_id: labId },
      });
      refetchDevices();
    } catch (e) {
      console.log("Refresh failed:", e.message);
    } finally {
      setRefreshing(false);
    }
  }, [labId, refetchDevices]);

  const handleCanvasClick = () => {
    setSelectedDevice(null);
    setShowAddDevice(false);
  };

  // Bulk actions
  const handleStopAll = async () => {
    if (!confirm(`Stop all ${deployedDevices.length} devices in this lab? Stopped instances retain their EBS storage but won't incur compute charges.`)) return;
    setBulkAction("stopping-all");
    setError(null);
    try {
      await base44.functions.invoke("cloudOrchestrator", {
        action: "stopAllDevices",
        params: { lab_id: labId },
      });
      refetchDevices();
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to stop devices");
    } finally {
      setBulkAction(null);
    }
  };

  const handleStartAll = async () => {
    const stoppedDevices = deployedDevices.filter(d => d.status === "stopped" && d.instance_id);
    if (stoppedDevices.length === 0) {
      setError("No stopped devices to start");
      return;
    }
    setBulkAction("starting-all");
    setError(null);
    try {
      await base44.functions.invoke("cloudOrchestrator", {
        action: "startAllDevices",
        params: { lab_id: labId },
      });
      refetchDevices();
      // Poll for public IPs after starting
      setTimeout(() => handleRefreshStatus(), 15000);
    } catch (err) {
      setError(err?.response?.data?.error || "Failed to start devices");
    } finally {
      setBulkAction(null);
    }
  };

  const handleDeployAll = async () => {
    const pendingCount = topologyDevices.filter(d =>
      !deployedDevices.some(dd => dd.name?.toLowerCase() === d.name?.toLowerCase())
    ).length;
    if (pendingCount === 0) {
      setError("All topology devices are already deployed");
      return;
    }
    if (!confirm(`Deploy ${pendingCount} topology devices? Estimated cost: $${(pendingCount * 0.15).toFixed(2)}/hr total.`)) return;
    setBulkAction("deploying-all");
    setError(null);
    try {
      const res = await base44.functions.invoke("cloudOrchestrator", {
        action: "deployAllDevices",
        params: { lab_id: labId },
      });
      const data = res.data;
      if (data?.errors?.length) {
        setError(`${data.deployed} deployed, ${data.errors.length} failed: ${data.errors.map(e => e.device).join(", ")}`);
      }
      refetchDevices();
      queryClient.invalidateQueries(["livefire-lab", labId]);
      setTimeout(() => handleRefreshStatus(), 12000);
    } catch (err) {
      setError(err?.response?.data?.error || err?.response?.data?.message || "Deploy all failed");
    } finally {
      setBulkAction(null);
    }
  };

  // Add new device to running lab
  const handleDeployDevice = async (deviceSpec) => {
    setDeployingDevice(true);
    setError(null);
    try {
      // Step 1: Get deployment info for subnet/security group
      const deployments = await base44.entities.LiveFireDeployment.filter({ lab_id: labId });
      const dep = deployments[0];
      if (!dep?.subnet_ids?.length) throw new Error("No subnet found for this lab");

      // Step 2: Deploy via cloud provider
      const createParams = {
        lab_id: labId,
        device_name: deviceSpec.name,
        device_type: deviceSpec.type,
        cpu_cores: deviceSpec.cpu_cores,
        ram_mb: deviceSpec.ram_mb,
        storage_gb: deviceSpec.storage_gb,
        subnet_id: dep.subnet_ids[0],
        security_group_ids: dep.security_group_ids || [],
        region: lab?.region || "us-east-1",
      };
      if (lab?.ssh_key_name) createParams.key_name = lab.ssh_key_name;

      const res = await base44.functions.invoke("cloudProviderAWS", {
        action: "createVM",
        params: createParams,
      });

      if (res.data?.error) throw new Error(res.data.message || res.data.error);

      // Step 3: Create device record
      const instanceId = res.data?.instanceId || `i-${Date.now()}`;
      const defaultUser = deviceSpec.access_method === "rdp" ? "Administrator" : "ec2-user";
      const newDevice = await base44.entities.LiveFireDevice.create({
        lab_id: labId,
        name: deviceSpec.name,
        device_type: deviceSpec.type,
        instance_id: instanceId,
        public_ip: res.data?.publicIp || "",
        private_ip: res.data?.privateIp || "",
        status: "provisioning",
        cpu_cores: deviceSpec.cpu_cores,
        ram_mb: deviceSpec.ram_mb,
        storage_gb: deviceSpec.storage_gb,
        position_x: deviceSpec.position_x,
        position_y: deviceSpec.position_y,
        connections: [],
        access_method: deviceSpec.access_method || "ssh",
        default_username: defaultUser,
        access_port: deviceSpec.access_method === "rdp" ? 3389 : 22,
      });

      // Step 4: Update topology data in lab
      const updatedDevices = [...topologyDevices, {
        id: `dev-${Date.now()}`,
        name: deviceSpec.name,
        type: deviceSpec.type,
        cpu_cores: deviceSpec.cpu_cores,
        ram_mb: deviceSpec.ram_mb,
        storage_gb: deviceSpec.storage_gb,
        access_method: deviceSpec.access_method || "ssh",
        position_x: deviceSpec.position_x,
        position_y: deviceSpec.position_y,
        subnet: "public",
      }];
      await base44.entities.LiveFireLab.update(labId, {
        topology_data: { ...topologyData, devices: updatedDevices },
        device_count: updatedDevices.length,
      });

      setShowAddDevice(false);
      refetchDevices();
      queryClient.invalidateQueries(["livefire-lab", labId]);
    } catch (err) {
      setError(err?.response?.data?.error || err?.message || "Deploy failed");
    } finally {
      setDeployingDevice(false);
    }
  };

  // Zoom handlers
  const handleWheel = (e) => {
    e.preventDefault();
    setZoom(z => Math.max(0.3, Math.min(2, z - e.deltaY * 0.001)));
  };

  // Pan with mouse drag
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  const handleMouseDown = (e) => {
    if (e.target === canvasRef.current || e.target.tagName === "svg") {
      setDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e) => {
    if (dragging) {
      setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
    }
  };

  const handleMouseUp = () => setDragging(false);

  const isRunning = lab?.status === "running";
  const isDeploying = lab?.status === "deploying";

  // Auto-refresh device status every 30s for active labs
  useEffect(() => {
    if (!isRunning && !isDeploying) return;
    handleRefreshStatus();
    const interval = setInterval(handleRefreshStatus, 30000);
    return () => clearInterval(interval);
  }, [labId, isRunning, isDeploying, handleRefreshStatus]);

  if (labLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/20 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-red-600/30 border-t-red-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!lab) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/20 flex items-center justify-center">
        <div className="text-center">
          <Server className="h-12 w-12 text-gray-700 mx-auto mb-4" />
          <p className="text-gray-500 font-mono">Lab not found</p>
          <Link to="/my-labs" className="text-red-400 hover:text-red-300 text-sm mt-2 inline-block">Back to My Labs</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/20 flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-950/80 border-b border-red-900/30 shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/my-labs" className="text-gray-400 hover:text-white transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-sm font-bold text-white">{lab.name}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <div className={`w-2 h-2 rounded-full ${isRunning ? "bg-green-500 animate-pulse" : isDeploying ? "bg-yellow-500 animate-pulse" : "bg-gray-500"}`} />
              <span className="text-[10px] font-mono text-gray-500">{lab.status} · {lab.cloud_provider?.toUpperCase()} · {lab.region} · {deployedDevices.length} devices</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Bulk Deploy */}
          {isRunning && topologyDevices.some(d => !deployedDevices.some(dd => dd.name?.toLowerCase() === d.name?.toLowerCase())) && (
            <button onClick={handleDeployAll} disabled={bulkAction}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-gradient-to-r from-cyan-800 to-cyan-700 border border-cyan-600/50 text-cyan-300 hover:from-cyan-700 hover:to-cyan-600 rounded-lg text-[10px] font-mono transition-all"
              title="Deploy all topology devices at once">
              {bulkAction === "deploying-all" ? (
                <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Deploying...</>
              ) : (
                <><Rocket className="h-3.5 w-3.5" /> Deploy All</>
              )}
            </button>
          )}
          {/* Stop All */}
          {isRunning && deployedDevices.some(d => d.status === "running" || d.status === "provisioning") && (
            <button onClick={handleStopAll} disabled={bulkAction}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-900/40 border border-red-700/40 text-red-300 hover:bg-red-900/60 rounded-lg text-[10px] font-mono transition-colors"
              title="Stop all running devices to save costs">
              {bulkAction === "stopping-all" ? (
                <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Stopping...</>
              ) : (
                <><PowerOff className="h-3.5 w-3.5" /> Stop All</>
              )}
            </button>
          )}
          {/* Start All — always visible when lab is running */}
          {isRunning && (
            <button onClick={handleStartAll} disabled={bulkAction || !deployedDevices.some(d => d.status === "stopped")}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono transition-colors ${
                deployedDevices.some(d => d.status === "stopped")
                  ? "bg-green-900/40 border border-green-700/40 text-green-300 hover:bg-green-900/60"
                  : "bg-gray-800/60 border border-gray-700/40 text-gray-600 cursor-not-allowed"
              }`}
              title={deployedDevices.some(d => d.status === "stopped") ? "Start all stopped devices" : "No stopped devices to start"}>
              {bulkAction === "starting-all" ? (
                <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Starting...</>
              ) : (
                <><Power className="h-3.5 w-3.5" /> Start All</>
              )}
            </button>
          )}
          <button onClick={handleRefreshStatus} disabled={refreshing}
            className="p-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors disabled:opacity-50" title="Refresh device status">
            <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
          </button>
          {lab?.ssh_private_key && (
            <button onClick={() => {
              const blob = new Blob([lab.ssh_private_key], { type: "application/x-pem-file" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = `${lab.ssh_key_name || "livefire-key"}.pem`;
              a.click();
              URL.revokeObjectURL(url);
            }}
              className="flex items-center gap-1.5 px-2.5 py-1.5 bg-amber-900/30 border border-amber-700/40 text-amber-400 hover:bg-amber-900/50 rounded-lg text-[10px] font-mono transition-colors"
              title="Download SSH private key">
              <Download className="h-3.5 w-3.5" /> Key
            </button>
          )}
          {/* Zoom */}
          <div className="flex items-center gap-1 bg-gray-800 rounded-lg border border-gray-700 px-2 py-1">
            <button onClick={() => setZoom(z => Math.max(0.3, z - 0.1))} className="text-gray-400 hover:text-white text-xs px-1">−</button>
            <span className="text-[10px] font-mono text-gray-400 w-10 text-center">{Math.round(zoom * 100)}%</span>
            <button onClick={() => setZoom(z => Math.min(2, z + 0.1))} className="text-gray-400 hover:text-white text-xs px-1">+</button>
          </div>
          {/* Dark/Light toggle */}
          <button
            onClick={() => setIsDarkMode(d => !d)}
            className="p-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-400 hover:text-white transition-colors"
            title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          {/* Add Device */}
          {isRunning && (
            <Button onClick={() => { setShowAddDevice(!showAddDevice); setSelectedDevice(null); }}
              size="sm" className="bg-green-700 hover:bg-green-600 text-white text-xs">
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Device
            </Button>
          )}
        </div>
      </div>

      {/* VPC Info bar */}
      {lab.vpc_id && (
        <div className="flex items-center gap-4 px-4 py-2 bg-gray-900/60 border-b border-red-900/20 text-[10px] font-mono text-gray-500 shrink-0">
          <span>VPC: <span className="text-gray-300">{lab.vpc_id}</span></span>
          <span>CIDR: <span className="text-gray-300">{topologyData?.vpcConfig?.cidr || "—"}</span></span>
          <span>Subnets: <span className="text-gray-300">{(topologyData?.vpcConfig?.subnets || []).map(s => s.cidr).join(", ") || "—"}</span></span>
        </div>
      )}

      {/* Canvas */}
      <div
        ref={canvasRef}
        className={`flex-1 relative overflow-hidden cursor-grab ${isDarkMode ? "" : "bg-gray-100"}`}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={handleCanvasClick}
      >
        {/* Grid background — EVE-NG graph paper style */}
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: isDarkMode ? "#0a0a0a" : "#f0f0f0",
            backgroundImage: isDarkMode
              ? `linear-gradient(rgba(120,130,145,0.25) 1px, transparent 1px),
                 linear-gradient(90deg, rgba(120,130,145,0.25) 1px, transparent 1px),
                 linear-gradient(rgba(120,130,145,0.12) 1px, transparent 1px),
                 linear-gradient(90deg, rgba(120,130,145,0.12) 1px, transparent 1px)`
              : `linear-gradient(rgba(100,110,125,0.3) 1px, transparent 1px),
                 linear-gradient(90deg, rgba(100,110,125,0.3) 1px, transparent 1px),
                 linear-gradient(rgba(100,110,125,0.15) 1px, transparent 1px),
                 linear-gradient(90deg, rgba(100,110,125,0.15) 1px, transparent 1px)`,
            backgroundSize: `${40 * zoom}px ${40 * zoom}px, ${40 * zoom}px ${40 * zoom}px, ${10 * zoom}px ${10 * zoom}px, ${10 * zoom}px ${10 * zoom}px`,
            backgroundPosition: `${pan.x}px ${pan.y}px`,
          }}
        />

        {/* Zoom + Pan wrapper */}
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: "0 0",
            position: "relative",
            width: "100%",
            height: "100%",
          }}
        >
          {/* Area Regions — EVE-NG style dashed ellipses */}
          {(topologyData.areas || []).map(area => (
            <div
              key={area.id}
              className="absolute border-2 border-dashed border-cyan-600/30 rounded-[50%] pointer-events-none"
              style={{
                left: area.x || 50,
                top: area.y || 50,
                width: area.width || 320,
                height: area.height || 200,
              }}
            >
              <span className="absolute -top-4 left-2 text-[10px] font-mono text-cyan-400/60 bg-gray-950/60 px-1.5 rounded">
                {area.label || "Area"}
              </span>
            </div>
          ))}

          {/* Floating Text Annotations */}
          {(topologyData.annotations || []).map(ann => (
            <div
              key={ann.id}
              className="absolute pointer-events-none"
              style={{ left: ann.x, top: ann.y }}
            >
              <span className="text-[10px] font-mono text-gray-400 bg-gray-950/50 px-1.5 py-0.5 rounded">
                {ann.text}
              </span>
            </div>
          ))}

          {/* Connection Lines SVG */}
          <svg className="absolute inset-0 pointer-events-none" style={{ width: "100%", height: "100%" }}>
            {topologyConnections.map((conn, i) => (
              <ConnectionLine key={i} conn={conn} topologyDevices={topologyDevices} deployedMap={deployedMap} isDark={isDarkMode} />
            ))}
          </svg>

          {/* Device Nodes */}
          {topologyDevices.map(device => {
            const deployed = deployedDevices.find(d => d.name?.toLowerCase() === device.name?.toLowerCase());
            return (
              <DeviceNode
                key={device.id}
                device={device}
                deployed={deployed}
                isSelected={selectedDevice?.id === device.id}
                onClick={handleDeviceClick}
                style={{ x: device.position_x || 100, y: device.position_y || 100 }}
                isDark={isDarkMode}
              />
            );
          })}

          {/* Empty state */}
          {topologyDevices.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Network className="h-12 w-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 font-mono text-sm">No devices in topology</p>
                <p className="text-xs text-gray-600 font-mono mt-1">Use the wizard to design the lab topology</p>
              </div>
            </div>
          )}
        </div>

        {/* Side panels — stopPropagation prevents canvas click from closing them */}
        {selectedDevice && (
          <div onClick={(e) => e.stopPropagation()}>
            <DeviceDetailPanel
              device={selectedDevice}
              deployed={deployedDevices.find(d => d.name?.toLowerCase() === selectedDevice.name?.toLowerCase())}
              onClose={() => setSelectedDevice(null)}
              lab={lab}
              refetchDevices={refetchDevices}
              queryClient={queryClient}
              labId={labId}
            />
          </div>
        )}

        {showAddDevice && (
          <div onClick={(e) => e.stopPropagation()}>
            <AddDevicePanel
              lab={lab}
              onClose={() => setShowAddDevice(false)}
              onDeploy={handleDeployDevice}
              deploying={deployingDevice}
            />
          </div>
        )}

        {/* Error toast */}
        {error && (
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-red-900/90 border border-red-700 text-red-200 px-4 py-2 rounded-lg text-xs font-mono">
            {error}
            <button onClick={() => setError(null)} className="ml-2 text-red-400 hover:text-red-300">&times;</button>
          </div>
        )}
      </div>
    </div>
  );
}