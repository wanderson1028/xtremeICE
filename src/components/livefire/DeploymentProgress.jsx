import React, { useState, useEffect } from "react";
import {
  Server, Network, Shield, Globe, CheckCircle, XCircle,
  Loader2, Zap, Cloud, Layers, X
} from "lucide-react";

const TYPE_ICONS = {
  router: Zap, switch: Layers, firewall: Shield, server: Server,
  workstation: Server, cloud_resource: Cloud, container: Layers,
  security_appliance: Shield, load_balancer: Layers, monitoring: Server,
};

const TYPE_LABELS = {
  router: "Router", switch: "Switch", firewall: "Firewall",
  server: "Server", workstation: "Workstation", cloud_resource: "Cloud Resource",
  container: "Container", security_appliance: "Security Appliance",
  load_balancer: "Load Balancer", monitoring: "Monitor",
};

const STEPS = [
  { key: "vpc", label: "Creating VPC & Network", icon: Network },
  { key: "subnets", label: "Provisioning Subnets", icon: Layers },
  { key: "security", label: "Configuring Security Groups", icon: Shield },
  { key: "devices", label: "Launching Instances", icon: Server },
  { key: "finalize", label: "Finalizing Deployment", icon: CheckCircle },
];

export default function DeploymentProgress({ lab, deployState, deployResult, deployErrorMsg, onClose }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [deviceStatuses, setDeviceStatuses] = useState({});

  const devices = lab?.topology_data?.devices || [];
  const vpcConfig = lab?.topology_data?.vpcConfig || {};
  const status = deployState || "running";

  useEffect(() => {
    const initial = {};
    devices.forEach(d => { initial[d.id] = "pending"; });
    setDeviceStatuses(initial);
  }, []);

  // Step progression animation while deploying
  useEffect(() => {
    if (status !== "running") return;
    const timers = [];
    timers.push(setTimeout(() => setCurrentStep(1), 800));
    timers.push(setTimeout(() => setCurrentStep(2), 1800));
    timers.push(setTimeout(() => setCurrentStep(3), 2800));

    devices.forEach((_, idx) => {
      timers.push(setTimeout(() => {
        setDeviceStatuses(prev => {
          const next = { ...prev };
          if (devices[idx]) next[devices[idx].id] = "provisioning";
          return next;
        });
      }, 3500 + idx * 600));
    });

    return () => timers.forEach(clearTimeout);
  }, [status, devices.length]);

  // When deployment succeeds, mark all complete
  useEffect(() => {
    if (status === "success") {
      setCurrentStep(STEPS.length);
      setDeviceStatuses(prev => {
        const next = { ...prev };
        devices.forEach(d => { next[d.id] = "running"; });
        return next;
      });
    }
  }, [status, devices]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900/95 border border-red-900/40 rounded-2xl w-full max-w-lg mx-4 shadow-2xl shadow-red-900/10 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-red-900/20 bg-gradient-to-r from-red-950/40 to-transparent">
          <div className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-xl flex items-center justify-center ${
              status === "success" ? "bg-green-900/30 border border-green-700/40" :
              status === "error" ? "bg-red-900/30 border border-red-700/40" :
              "bg-yellow-900/30 border border-yellow-700/40"
            }`}>
              {status === "success" ? (
                <CheckCircle className="h-4 w-4 text-green-400" />
              ) : status === "error" ? (
                <XCircle className="h-4 w-4 text-red-400" />
              ) : (
                <Cloud className="h-4 w-4 text-yellow-400 animate-pulse" />
              )}
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">
                {status === "success" ? "Deployment Complete" :
                 status === "error" ? "Deployment Failed" :
                 "Deploying Lab"}
              </h3>
              <p className="text-[10px] font-mono text-gray-500">{lab?.name}</p>
            </div>
          </div>
          <button onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-800 text-gray-500 hover:text-gray-300 transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
          {/* Resource Summary */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "VPC", value: vpcConfig?.cidr || "—", icon: Globe, color: "cyan" },
              { label: "Subnets", value: vpcConfig?.subnets?.length || 0, icon: Layers, color: "blue" },
              { label: "Devices", value: devices.length, icon: Server, color: "green" },
            ].map(s => (
              <div key={s.label} className="bg-black/30 border border-gray-800 rounded-xl p-2.5 text-center">
                <s.icon className={`h-4 w-4 text-${s.color}-400 mx-auto mb-1`} />
                <p className="text-xs font-mono text-white font-bold">{s.value}</p>
                <p className="text-[8px] text-gray-500 uppercase tracking-wider">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Progress Steps */}
          <div className="space-y-1.5">
            {STEPS.map((step, idx) => {
              const isDone = idx < currentStep || status === "success";
              const isCurrent = idx === currentStep && status === "running";
              const isFailed = status === "error" && idx === currentStep;

              return (
                <div key={step.key} className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                  isDone ? "bg-green-950/10" :
                  isCurrent ? "bg-yellow-950/10 border border-yellow-800/30" :
                  isFailed ? "bg-red-950/20 border border-red-800/30" :
                  "bg-transparent"
                }`}>
                  <div className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 ${
                    isDone ? "bg-green-900/30 text-green-400" :
                    isCurrent ? "bg-yellow-900/30 text-yellow-400" :
                    isFailed ? "bg-red-900/30 text-red-400" :
                    "bg-gray-800 text-gray-600"
                  }`}>
                    {isDone ? <CheckCircle className="h-3.5 w-3.5" /> :
                     isCurrent ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> :
                     isFailed ? <XCircle className="h-3.5 w-3.5" /> :
                     <step.icon className="h-3.5 w-3.5" />}
                  </div>
                  <span className={`text-[11px] font-mono flex-1 ${
                    isDone ? "text-green-400" :
                    isCurrent ? "text-yellow-300" :
                    isFailed ? "text-red-400" :
                    "text-gray-600"
                  }`}>{step.label}</span>
                  {isCurrent && (
                    <span className="text-[8px] font-mono text-yellow-500/60 animate-pulse">in progress</span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Device Status List */}
          {devices.length > 0 && (
            <div>
              <p className="text-[9px] font-mono text-gray-500 uppercase tracking-wider mb-2">Devices</p>
              <div className="space-y-1">
                {devices.map(device => {
                  const IconComp = TYPE_ICONS[device.type] || Server;
                  const devStatus = deviceStatuses[device.id] || "pending";
                  return (
                    <div key={device.id} className="flex items-center gap-2.5 px-3 py-2 bg-black/20 rounded-lg border border-gray-800/50">
                      <IconComp className="h-3.5 w-3.5 text-gray-500 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] font-mono text-gray-300 truncate">{device.name}</p>
                        <p className="text-[8px] font-mono text-gray-600">{TYPE_LABELS[device.type] || device.type} · {device.cpu_cores || 2}vCPU · {device.ram_mb >= 1024 ? `${device.ram_mb/1024}GB` : `${device.ram_mb}MB`}</p>
                      </div>
                      {devStatus === "running" && <CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0" />}
                      {devStatus === "provisioning" && <Loader2 className="h-3.5 w-3.5 text-yellow-400 animate-spin shrink-0" />}
                      {devStatus === "pending" && <span className="h-1.5 w-1.5 rounded-full bg-gray-600 shrink-0" />}
                      {devStatus === "failed" && <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Deployment Summary (on success) */}
          {deployResult && status === "success" && (
            <div className="bg-green-950/20 border border-green-700/30 rounded-xl p-3">
              <p className="text-[9px] font-mono text-green-400 uppercase tracking-wider mb-2">Deployment Summary</p>
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                {deployResult.vpc_id && (
                  <div><span className="text-gray-500">VPC:</span> <span className="text-green-300 truncate">{deployResult.vpc_id}</span></div>
                )}
                {deployResult.vpc_cidr && (
                  <div>
                    <span className="text-gray-500">CIDR:</span>{" "}
                    <span className={`${deployResult.cidr_auto_resolved ? "text-yellow-300" : "text-green-300"}`}>
                      {deployResult.vpc_cidr}
                    </span>
                    {deployResult.cidr_auto_resolved && (
                      <span className="text-yellow-600 ml-1">(auto)</span>
                    )}
                  </div>
                )}
                {deployResult.devices_deployed != null && (
                  <div><span className="text-gray-500">Devices:</span> <span className="text-green-300">{deployResult.devices_deployed}</span></div>
                )}
                {deployResult.estimated_cost_hourly != null && (
                  <div><span className="text-gray-500">Cost:</span> <span className="text-green-300">${deployResult.estimated_cost_hourly.toFixed(2)}/hr</span></div>
                )}
                {deployResult.subnet_ids && (
                  <div><span className="text-gray-500">Subnets:</span> <span className="text-green-300">{deployResult.subnet_ids.length}</span></div>
                )}
              </div>
            </div>
          )}

          {/* Error display */}
          {deployErrorMsg && status === "error" && (
            <div className="bg-red-950/20 border border-red-700/30 rounded-xl p-3">
              <div className="flex items-start gap-2">
                <XCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-[10px] font-mono text-red-300 font-bold">Deployment Failed</p>
                  <p className="text-[9px] font-mono text-red-400/80 mt-1">{deployErrorMsg}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-red-900/20 bg-black/30">
          {status === "running" ? (
            <div className="flex items-center justify-center gap-2 text-[10px] font-mono text-yellow-400/80">
              <Loader2 className="h-3 w-3 animate-spin" />
              Deploying resources — this may take 30-60 seconds
            </div>
          ) : status === "success" ? (
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-green-700 hover:bg-green-600 text-white rounded-xl font-mono text-sm font-bold transition-colors"
            >
              View Lab Topology
            </button>
          ) : (
            <button
              onClick={onClose}
              className="w-full py-2.5 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 rounded-xl font-mono text-sm transition-colors"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}