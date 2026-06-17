import React from "react";
import { Router, Zap, Shield, Server, Radio, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

const DEVICE_ICONS = {
  router: Router,
  switch: Zap,
  firewall: Shield,
  server: Server,
  ap: Radio,
};

const STATUS_CONFIG = {
  healthy: { color: "text-green-500", bgColor: "bg-green-500/20", label: "Healthy" },
  warning: { color: "text-yellow-500", bgColor: "bg-yellow-500/20", label: "Warning" },
  critical: { color: "text-red-500", bgColor: "bg-red-500/20", label: "Critical" },
  offline: { color: "text-gray-500", bgColor: "bg-gray-500/20", label: "Offline" },
};

export default function DeviceStatusGrid({ devices, onSelectDevice }) {
  return (
    <div className="bg-card border border-border rounded-lg p-6">
      <h2 className="text-lg font-semibold text-foreground mb-4">Device Status</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {devices.map(device => {
          const Icon = DEVICE_ICONS[device.type] || Radio;
          const statusConfig = STATUS_CONFIG[device.status] || STATUS_CONFIG.healthy;

          return (
            <div
              key={device.id}
              className="bg-secondary border border-border rounded-lg p-4 hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => onSelectDevice(device)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${statusConfig.bgColor}`}>
                    <Icon className={`h-5 w-5 ${statusConfig.color}`} />
                  </div>
                  <div>
                    <p className="font-medium text-foreground">{device.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{device.type}</p>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Status</span>
                  <span className={`px-2 py-1 rounded-full font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                    {statusConfig.label}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">CPU Usage</span>
                  <span className="text-foreground">{(20 + Math.random() * 60).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Memory</span>
                  <span className="text-foreground">{(30 + Math.random() * 50).toFixed(0)}%</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Uptime</span>
                  <span className="text-foreground">{(10 + Math.random() * 100).toFixed(0)}d</span>
                </div>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full mt-4 text-xs h-8"
                onClick={e => {
                  e.stopPropagation();
                  onSelectDevice(device);
                }}
              >
                View Details
              </Button>
            </div>
          );
        })}
      </div>
    </div>
  );
}