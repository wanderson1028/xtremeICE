import React, { useState, useMemo } from "react";
import { X, Activity, Zap, TrendingDown, AlertTriangle, BarChart3, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LineChart, Line, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function DeviceDrilldownModal({ device, onClose }) {
  const [activeTab, setActiveTab] = useState("metrics");

  // Generate time-series data for this device
  const deviceMetrics = useMemo(() => {
    const data = [];
    const now = Date.now();
    for (let i = 0; i < 50; i++) {
      data.push({
        time: new Date(now - i * 2000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        cpu: 30 + Math.random() * 40,
        memory: 40 + Math.random() * 35,
        latency: 10 + Math.random() * 30,
        packetLoss: Math.random() * 1.5,
        throughput: 100 + Math.random() * 200,
      });
    }
    return data.reverse();
  }, [device]);

  const interfaceData = [
    { name: "Eth0", status: "up", speed: "10G", rxPackets: "125M", txPackets: "98M", errors: 0 },
    { name: "Eth1", status: "up", speed: "1G", rxPackets: "45M", txPackets: "42M", errors: 0 },
    { name: "Eth2", status: "down", speed: "1G", rxPackets: "0", txPackets: "0", errors: 5 },
  ];

  const systemLogs = [
    { timestamp: new Date(Date.now() - 5 * 60000), level: "info", message: "BGP session established" },
    { timestamp: new Date(Date.now() - 10 * 60000), level: "warning", message: "High CPU usage detected" },
    { timestamp: new Date(Date.now() - 15 * 60000), level: "info", message: "Interface Eth0 up" },
  ];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="w-full max-w-4xl bg-card border border-border rounded-t-lg shadow-2xl max-h-[80vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">{device.name}</h2>
            <p className="text-xs text-muted-foreground mt-1 capitalize">{device.type} · Status: {device.status}</p>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-border px-6">
          <div className="flex gap-6">
            {["metrics", "interfaces", "logs"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-4 px-4 text-sm font-medium border-b-2 transition-colors capitalize
                  ${
                    activeTab === tab
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Metrics Tab */}
          {activeTab === "metrics" && (
            <div className="space-y-6">
              {/* Key Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-secondary rounded-lg p-4 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">CPU Usage</p>
                  <p className="text-2xl font-bold text-foreground">65%</p>
                  <p className="text-xs text-yellow-500 mt-1">↑ High</p>
                </div>
                <div className="bg-secondary rounded-lg p-4 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Memory</p>
                  <p className="text-2xl font-bold text-foreground">52%</p>
                  <p className="text-xs text-green-500 mt-1">↓ Normal</p>
                </div>
                <div className="bg-secondary rounded-lg p-4 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Avg Latency</p>
                  <p className="text-2xl font-bold text-foreground">24ms</p>
                  <p className="text-xs text-green-500 mt-1">↓ Good</p>
                </div>
                <div className="bg-secondary rounded-lg p-4 border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Packet Loss</p>
                  <p className="text-2xl font-bold text-foreground">0.3%</p>
                  <p className="text-xs text-green-500 mt-1">↓ Low</p>
                </div>
              </div>

              {/* Charts */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">CPU & Memory Trend</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={deviceMetrics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} />
                      <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                      <Legend />
                      <Line type="monotone" dataKey="cpu" stroke="#3b82f6" name="CPU %" isAnimationActive={false} />
                      <Line type="monotone" dataKey="memory" stroke="#10b981" name="Memory %" isAnimationActive={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Throughput</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <AreaChart data={deviceMetrics}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="time" stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} />
                      <YAxis stroke="hsl(var(--muted-foreground))" style={{ fontSize: "12px" }} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))" }} />
                      <Area type="monotone" dataKey="throughput" stroke="#8b5cf6" fill="#8b5cf6" name="Throughput (Mbps)" isAnimationActive={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}

          {/* Interfaces Tab */}
          {activeTab === "interfaces" && (
            <div>
              <table className="w-full text-sm">
                <thead className="border-b border-border">
                  <tr className="text-muted-foreground">
                    <th className="text-left py-3 px-3 font-medium">Interface</th>
                    <th className="text-left py-3 px-3 font-medium">Status</th>
                    <th className="text-left py-3 px-3 font-medium">Speed</th>
                    <th className="text-left py-3 px-3 font-medium">RX Packets</th>
                    <th className="text-left py-3 px-3 font-medium">TX Packets</th>
                    <th className="text-left py-3 px-3 font-medium">Errors</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {interfaceData.map((iface, idx) => (
                    <tr key={idx} className="hover:bg-secondary/50">
                      <td className="py-3 px-3 text-foreground font-medium">{iface.name}</td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${iface.status === "up" ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>
                          {iface.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-foreground">{iface.speed}</td>
                      <td className="py-3 px-3 text-foreground">{iface.rxPackets}</td>
                      <td className="py-3 px-3 text-foreground">{iface.txPackets}</td>
                      <td className="py-3 px-3 text-foreground">{iface.errors}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Logs Tab */}
          {activeTab === "logs" && (
            <div className="space-y-2">
              {systemLogs.map((log, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-secondary rounded-lg border border-border">
                  <Clock className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-xs font-mono text-muted-foreground">{log.timestamp.toLocaleTimeString()}</p>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${log.level === "warning" ? "bg-yellow-500/20 text-yellow-400" : "bg-blue-500/20 text-blue-400"}`}>
                        {log.level}
                      </span>
                    </div>
                    <p className="text-sm text-foreground mt-1">{log.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}