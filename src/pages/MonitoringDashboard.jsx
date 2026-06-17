import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, TrendingDown, Zap, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import MetricsOverview from "@/components/monitoring/MetricsOverview.jsx";
import DeviceStatusGrid from "@/components/monitoring/DeviceStatusGrid.jsx";
import AlertPanel from "@/components/monitoring/AlertPanel.jsx";
import DeviceDrilldownModal from "@/components/monitoring/DeviceDrilldownModal.jsx";

export default function MonitoringDashboard() {
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [timeRange, setTimeRange] = useState("5m");
  const [metrics, setMetrics] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [devices, setDevices] = useState([]);

  // Fetch network designs to get device information
  const { data: designs } = useQuery({
    queryKey: ["networkDesigns"],
    queryFn: () => base44.entities.NetworkDesign.list(),
    initialData: [],
  });

  // Generate mock metrics and alerts (in production, would connect to real monitoring system)
  useEffect(() => {
    const generateMetrics = () => {
      const mockDevices = [
        { id: "router-hq", name: "HQ Router", type: "router", status: "healthy" },
        { id: "switch-hq", name: "HQ Switch", type: "switch", status: "healthy" },
        { id: "router-branch1", name: "Branch 1 Router", type: "router", status: "warning" },
        { id: "router-branch2", name: "Branch 2 Router", type: "router", status: "healthy" },
        { id: "fw-hq", name: "HQ Firewall", type: "firewall", status: "healthy" },
        { id: "server-dc", name: "Data Center Server", type: "server", status: "healthy" },
      ];

      setDevices(mockDevices);

      // Generate time-series metrics
      const now = Date.now();
      const newMetrics = [];
      for (let i = 0; i < 60; i++) {
        newMetrics.push({
          timestamp: now - i * 1000,
          latency: 15 + Math.random() * 20 + (i % 10 === 0 ? 30 : 0),
          bandwidth: 45 + Math.random() * 35,
          packetLoss: Math.random() * 2 + (i % 15 === 0 ? 3 : 0),
        });
      }
      setMetrics(newMetrics.reverse());

      // Generate alerts
      setAlerts([
        {
          id: 1,
          severity: "critical",
          device: "Branch 1 Router",
          message: "High latency detected (125ms)",
          timestamp: new Date(now - 2 * 60000),
        },
        {
          id: 2,
          severity: "warning",
          device: "HQ Firewall",
          message: "CPU usage above threshold (85%)",
          timestamp: new Date(now - 5 * 60000),
        },
        {
          id: 3,
          severity: "info",
          device: "Data Center Server",
          message: "Successful backup completed",
          timestamp: new Date(now - 10 * 60000),
        },
      ]);
    };

    generateMetrics();

    // Update metrics every 2 seconds
    const interval = setInterval(generateMetrics, 2000);
    return () => clearInterval(interval);
  }, []);

  const criticalAlerts = alerts.filter(a => a.severity === "critical").length;
  const warningAlerts = alerts.filter(a => a.severity === "warning").length;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
              <Activity className="h-8 w-8 text-primary" />
              Network Monitoring Dashboard
            </h1>
            <p className="text-sm text-muted-foreground mt-1">Real-time performance metrics and device status</p>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={timeRange}
              onChange={e => setTimeRange(e.target.value)}
              className="bg-secondary border border-border rounded-lg px-4 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="5m">Last 5 minutes</option>
              <option value="15m">Last 15 minutes</option>
              <option value="1h">Last hour</option>
              <option value="24h">Last 24 hours</option>
            </select>
          </div>
        </div>

        {/* Alert Summary */}
        {(criticalAlerts > 0 || warningAlerts > 0) && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 flex items-start gap-4">
            <AlertTriangle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-red-400">Active Alerts</p>
              <p className="text-sm text-red-300 mt-1">
                {criticalAlerts} critical, {warningAlerts} warning
              </p>
            </div>
          </div>
        )}

        {/* Metrics Overview */}
        <MetricsOverview metrics={metrics} />

        {/* Devices and Alerts Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Device Status */}
          <div className="lg:col-span-2">
            <DeviceStatusGrid devices={devices} onSelectDevice={setSelectedDevice} />
          </div>

          {/* Alert Panel */}
          <div className="lg:col-span-1">
            <AlertPanel alerts={alerts} onDismiss={id => setAlerts(prev => prev.filter(a => a.id !== id))} />
          </div>
        </div>
      </div>

      {/* Device Drill-down Modal */}
      {selectedDevice && (
        <DeviceDrilldownModal device={selectedDevice} onClose={() => setSelectedDevice(null)} />
      )}
    </div>
  );
}