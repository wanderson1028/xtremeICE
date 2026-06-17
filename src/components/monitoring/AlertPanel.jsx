import React from "react";
import { AlertTriangle, Info, AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const SEVERITY_CONFIG = {
  critical: { icon: AlertTriangle, color: "text-red-500", bgColor: "bg-red-500/20", borderColor: "border-red-500/30" },
  warning: { icon: AlertCircle, color: "text-yellow-500", bgColor: "bg-yellow-500/20", borderColor: "border-yellow-500/30" },
  info: { icon: Info, color: "text-blue-500", bgColor: "bg-blue-500/20", borderColor: "border-blue-500/30" },
};

export default function AlertPanel({ alerts, onDismiss }) {
  const getSeverityConfig = severity => SEVERITY_CONFIG[severity] || SEVERITY_CONFIG.info;

  return (
    <div className="bg-card border border-border rounded-lg p-6 h-fit">
      <h2 className="text-lg font-semibold text-foreground mb-4">Recent Alerts</h2>

      {alerts.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No active alerts</p>
      ) : (
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {alerts.map(alert => {
            const config = getSeverityConfig(alert.severity);
            const Icon = config.icon;

            return (
              <div
                key={alert.id}
                className={`border rounded-lg p-3 ${config.bgColor} ${config.borderColor} flex items-start gap-3`}
              >
                <Icon className={`h-4 w-4 ${config.color} mt-0.5 flex-shrink-0`} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-foreground capitalize">{alert.severity}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{alert.device}</p>
                  <p className="text-xs text-foreground mt-1">{alert.message}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {alert.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                <button
                  onClick={() => onDismiss(alert.id)}
                  className="text-muted-foreground hover:text-foreground transition-colors flex-shrink-0 mt-0.5"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}