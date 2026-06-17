import React, { useState, useEffect, useCallback } from "react";
import { Wifi, WifiOff, Shield, Server, Router, Activity, Cpu, MemoryStick, Clock, RefreshCw, AlertTriangle, CheckCircle2, XCircle } from "lucide-react";

// Simulate realistic fluctuating metrics per device
function generateMetrics(device, seed) {
  const base = {
    router:   { cpuBase: 12, memBase: 38, rxBase: 2400, txBase: 1800 },
    switch:   { cpuBase: 6,  memBase: 22, rxBase: 8200, txBase: 7900 },
    firewall: { cpuBase: 28, memBase: 55, rxBase: 5100, txBase: 4700 },
    server:   { cpuBase: 45, memBase: 68, rxBase: 3300, txBase: 2100 },
  }[device.type] || { cpuBase: 15, memBase: 40, rxBase: 2000, txBase: 1500 };

  const jitter = (base, range) => Math.max(0, Math.min(100, base + (Math.sin(seed * 0.7 + base) * range)));
  const bitsJitter = (base, range) => Math.max(0, base + Math.floor(Math.sin(seed * 0.5 + base * 0.01) * range));

  const cpu = jitter(base.cpuBase, 15);
  const mem = jitter(base.memBase, 8);
  const rxKbps = bitsJitter(base.rxBase, 800);
  const txKbps = bitsJitter(base.txBase, 600);

  const uptimeSeconds = 345600 + Math.floor(seed * 10); // ~4 days + drift

  // Status: mostly up, firewall has slight chance of warning
  const status = device.type === "firewall" && cpu > 85 ? "warning"
    : device.type === "server" && mem > 90 ? "warning"
    : "up";

  return { cpu, mem, rxKbps, txKbps, uptimeSeconds, status, interfaces: getInterfaceStatus(device) };
}

function getInterfaceStatus(device) {
  const bases = {
    router:   [{ name: "GigabitEthernet0/0/0", state: "up" }, { name: "GigabitEthernet0/0/1", state: "down" }, { name: "Loopback0", state: "up" }],
    switch:   [{ name: "GigabitEthernet1/0/1", state: "up" }, { name: "GigabitEthernet1/0/2", state: "up" }, { name: "GigabitEthernet1/0/3", state: "down" }, { name: "GigabitEthernet1/0/4", state: "up" }],
    firewall: [{ name: "ethernet1/1 (untrust)", state: "up" }, { name: "ethernet1/2 (trust)", state: "up" }, { name: "loopback.1", state: "up" }],
    server:   [{ name: "eth0", state: "up" }, { name: "lo", state: "up" }],
  };
  return (bases[device.type] || bases.router).map(i => ({ ...i, ip: i.name.includes("Loopback") || i.name === "lo" ? "127.0.0.1" : device.ip }));
}

function formatUptime(seconds) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${d}d ${h}h ${m}m`;
}

function formatKbps(kbps) {
  if (kbps >= 1000) return `${(kbps / 1000).toFixed(1)} Mbps`;
  return `${kbps} Kbps`;
}

function MetricBar({ value, label, colorFn }) {
  const color = colorFn(value);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[11px] font-mono">
        <span className="text-green-600">{label}</span>
        <span className={color}>{value.toFixed(1)}%</span>
      </div>
      <div className="h-1.5 rounded-full bg-[#1a1a1a] overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color.replace("text-", "bg-")}`}
          style={{ width: `${Math.min(value, 100)}%` }}
        />
      </div>
    </div>
  );
}

function cpuColor(v)  { return v > 80 ? "text-red-400" : v > 60 ? "text-yellow-400" : "text-green-400"; }
function memColor(v)  { return v > 85 ? "text-red-400" : v > 70 ? "text-yellow-400" : "text-cyan-400"; }

function StatusBadge({ status }) {
  if (status === "up")      return <span className="flex items-center gap-1 text-green-400 text-[10px] font-mono"><CheckCircle2 className="h-3 w-3" /> UP</span>;
  if (status === "warning") return <span className="flex items-center gap-1 text-yellow-400 text-[10px] font-mono"><AlertTriangle className="h-3 w-3" /> WARN</span>;
  return                           <span className="flex items-center gap-1 text-red-400 text-[10px] font-mono"><XCircle className="h-3 w-3" /> DOWN</span>;
}

function DeviceIcon({ type, vendor }) {
  const colorMap = { cisco: "text-blue-400", arista: "text-green-400", juniper: "text-orange-400", paloalto: "text-red-400", fortinet: "text-red-300", linux: "text-green-300" };
  const cls = `h-4 w-4 ${colorMap[vendor] || "text-green-400"}`;
  if (type === "firewall") return <Shield className={cls} />;
  if (type === "server")   return <Server className={cls} />;
  return                          <Router className={cls} />;
}

// Sparkline — tiny 20-point history chart
function Sparkline({ values, color = "#4ade80" }) {
  if (values.length < 2) return null;
  const max = Math.max(...values, 1);
  const w = 80, h = 24;
  const pts = values.map((v, i) => `${(i / (values.length - 1)) * w},${h - (v / max) * h}`).join(" ");
  return (
    <svg width={w} height={h} className="opacity-70">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export default function DeviceMonitor({ devices }) {
  const [tick, setTick] = useState(0);
  const [history, setHistory] = useState(() => Object.fromEntries(devices.map(d => [d.id, []])));
  const [selectedDevice, setSelectedDevice] = useState(devices[0]);

  // Auto-refresh every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => setTick(t => t + 1), 2000);
    return () => clearInterval(interval);
  }, []);

  // Build metrics for all devices at current tick
  const allMetrics = Object.fromEntries(
    devices.map(d => [d.id, generateMetrics(d, tick + d.id.charCodeAt(0))])
  );

  // Track CPU history for sparkline
  useEffect(() => {
    setHistory(prev => {
      const next = { ...prev };
      devices.forEach(d => {
        const arr = [...(prev[d.id] || []), allMetrics[d.id].cpu];
        next[d.id] = arr.slice(-20);
      });
      return next;
    });
  }, [tick]);

  const metrics = allMetrics[selectedDevice.id];
  const devHistory = history[selectedDevice.id] || [];

  return (
    <div className="flex h-full bg-[#0d0d0d] font-mono overflow-hidden">
      {/* Left sidebar — device list */}
      <div className="w-52 border-r border-green-500/15 flex flex-col bg-[#111] shrink-0">
        <div className="px-3 py-2 border-b border-green-500/10 flex items-center justify-between">
          <span className="text-green-500 text-[10px] uppercase tracking-widest">Devices</span>
          <span className="text-green-700 text-[10px] flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse inline-block" />
            Live
          </span>
        </div>
        <div className="flex-1 overflow-y-auto py-1">
          {devices.map(dev => {
            const m = allMetrics[dev.id];
            return (
              <button
                key={dev.id}
                onClick={() => setSelectedDevice(dev)}
                className={`w-full text-left px-3 py-2.5 flex items-start gap-2.5 transition-colors hover:bg-green-500/5 ${selectedDevice.id === dev.id ? "bg-green-500/10 border-l-2 border-green-500" : "border-l-2 border-transparent"}`}
              >
                <DeviceIcon type={dev.type} vendor={dev.vendor} />
                <div className="flex-1 min-w-0">
                  <p className="text-green-200 text-[11px] truncate">{dev.name}</p>
                  <p className="text-green-700 text-[9px] truncate">{dev.ip}</p>
                  <div className="mt-0.5">
                    <StatusBadge status={m.status} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Right panel — device detail */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Device header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <DeviceIcon type={selectedDevice.type} vendor={selectedDevice.vendor} />
            <div>
              <h2 className="text-green-200 text-sm font-semibold">{selectedDevice.name}</h2>
              <p className="text-green-600 text-[10px]">{selectedDevice.model} · {selectedDevice.ip} · {selectedDevice.site}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <StatusBadge status={metrics.status} />
            <span className="text-green-700 text-[10px] flex items-center gap-1">
              <RefreshCw className="h-2.5 w-2.5 animate-spin" style={{ animationDuration: "3s" }} />
              auto-refresh 2s
            </span>
          </div>
        </div>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {/* CPU */}
          <div className="bg-[#111] border border-green-500/15 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-green-600 text-[10px] uppercase tracking-wider flex items-center gap-1"><Cpu className="h-3 w-3" /> CPU</span>
              <Sparkline values={devHistory} color={metrics.cpu > 80 ? "#f87171" : metrics.cpu > 60 ? "#facc15" : "#4ade80"} />
            </div>
            <p className={`text-2xl font-bold ${cpuColor(metrics.cpu)}`}>{metrics.cpu.toFixed(1)}<span className="text-sm font-normal">%</span></p>
          </div>

          {/* Memory */}
          <div className="bg-[#111] border border-green-500/15 rounded-lg p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-green-600 text-[10px] uppercase tracking-wider flex items-center gap-1"><MemoryStick className="h-3 w-3" /> Mem</span>
            </div>
            <p className={`text-2xl font-bold ${memColor(metrics.mem)}`}>{metrics.mem.toFixed(1)}<span className="text-sm font-normal">%</span></p>
          </div>

          {/* RX */}
          <div className="bg-[#111] border border-green-500/15 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3 text-green-600" />
              <span className="text-green-600 text-[10px] uppercase tracking-wider">RX</span>
            </div>
            <p className="text-2xl font-bold text-cyan-400">{formatKbps(metrics.rxKbps)}</p>
          </div>

          {/* TX */}
          <div className="bg-[#111] border border-green-500/15 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-1">
              <Activity className="h-3 w-3 text-green-600" />
              <span className="text-green-600 text-[10px] uppercase tracking-wider">TX</span>
            </div>
            <p className="text-2xl font-bold text-purple-400">{formatKbps(metrics.txKbps)}</p>
          </div>
        </div>

        {/* Utilization bars */}
        <div className="bg-[#111] border border-green-500/15 rounded-lg p-4 space-y-3">
          <h3 className="text-green-500 text-[10px] uppercase tracking-wider mb-3">Utilization</h3>
          <MetricBar value={metrics.cpu} label="CPU Usage" colorFn={cpuColor} />
          <MetricBar value={metrics.mem} label="Memory Usage" colorFn={memColor} />
        </div>

        {/* Uptime & system info */}
        <div className="bg-[#111] border border-green-500/15 rounded-lg p-4">
          <h3 className="text-green-500 text-[10px] uppercase tracking-wider mb-3 flex items-center gap-1"><Clock className="h-3 w-3" /> System Info</h3>
          <div className="grid grid-cols-2 gap-3 text-[11px]">
            <div><span className="text-green-700">Uptime</span><p className="text-green-200 mt-0.5">{formatUptime(metrics.uptimeSeconds)}</p></div>
            <div><span className="text-green-700">Vendor</span><p className="text-green-200 mt-0.5">{selectedDevice.vendor.toUpperCase()}</p></div>
            <div><span className="text-green-700">Type</span><p className="text-green-200 mt-0.5 capitalize">{selectedDevice.type}</p></div>
            <div><span className="text-green-700">Site</span><p className="text-green-200 mt-0.5">{selectedDevice.site}</p></div>
          </div>
        </div>

        {/* Interface status */}
        <div className="bg-[#111] border border-green-500/15 rounded-lg p-4">
          <h3 className="text-green-500 text-[10px] uppercase tracking-wider mb-3 flex items-center gap-1"><Wifi className="h-3 w-3" /> Interfaces</h3>
          <div className="space-y-2">
            {metrics.interfaces.map((iface, i) => (
              <div key={i} className="flex items-center justify-between text-[11px]">
                <div className="flex items-center gap-2">
                  {iface.state === "up"
                    ? <Wifi className="h-3 w-3 text-green-400" />
                    : <WifiOff className="h-3 w-3 text-red-400" />
                  }
                  <span className="text-green-300">{iface.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-green-700">{iface.ip}</span>
                  <span className={iface.state === "up" ? "text-green-400" : "text-red-400"}>{iface.state.toUpperCase()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* All devices summary table */}
        <div className="bg-[#111] border border-green-500/15 rounded-lg p-4">
          <h3 className="text-green-500 text-[10px] uppercase tracking-wider mb-3">All Devices Overview</h3>
          <table className="w-full text-[11px]">
            <thead>
              <tr className="text-green-700 border-b border-green-500/10">
                <th className="text-left pb-2">Device</th>
                <th className="text-left pb-2">IP</th>
                <th className="text-right pb-2">CPU</th>
                <th className="text-right pb-2">Mem</th>
                <th className="text-right pb-2">RX</th>
                <th className="text-right pb-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {devices.map(dev => {
                const m = allMetrics[dev.id];
                return (
                  <tr
                    key={dev.id}
                    onClick={() => setSelectedDevice(dev)}
                    className={`border-b border-green-500/5 cursor-pointer hover:bg-green-500/5 transition-colors ${selectedDevice.id === dev.id ? "bg-green-500/5" : ""}`}
                  >
                    <td className="py-2 flex items-center gap-1.5">
                      <DeviceIcon type={dev.type} vendor={dev.vendor} />
                      <span className="text-green-200">{dev.name}</span>
                    </td>
                    <td className="py-2 text-green-600">{dev.ip}</td>
                    <td className={`py-2 text-right ${cpuColor(m.cpu)}`}>{m.cpu.toFixed(0)}%</td>
                    <td className={`py-2 text-right ${memColor(m.mem)}`}>{m.mem.toFixed(0)}%</td>
                    <td className="py-2 text-right text-cyan-400">{formatKbps(m.rxKbps)}</td>
                    <td className="py-2 text-right"><StatusBadge status={m.status} /></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}