import React, { useMemo, useState } from "react";
import { Activity, Network, Terminal } from "lucide-react";
import InfrastructureDeviceIcon from "@/components/lab/InfrastructureDeviceIcon";

const POSITIONS = [
  { x: 12, y: 48 },
  { x: 25, y: 22 },
  { x: 25, y: 72 },
  { x: 48, y: 48 },
  { x: 72, y: 22 },
  { x: 72, y: 72 },
  { x: 88, y: 48 },
];

const DEVICE_STYLES = {
  target: "border-red-400/70 bg-red-500/15 text-red-200 shadow-red-950/40",
  selected: "border-cyan-300 bg-cyan-500/20 text-cyan-100 shadow-cyan-950/50",
  complete: "border-emerald-400/50 bg-emerald-500/10 text-emerald-200 shadow-emerald-950/30",
  normal: "border-slate-700 bg-slate-950/95 text-slate-200 shadow-black/30",
};

function courseDevices(scenario) {
  const text = `${scenario?.title || ""} ${scenario?.description || ""} ${(scenario?.tags || []).join(" ")} ${scenario?.nice_category || ""}`.toLowerCase();
  const isCloud = /aws|azure|cloud|iam|s3|ec2/.test(text);
  const isSoc = /soc|siem|incident|forensic|threat|detect/.test(text);
  const isNetwork = /network|router|switch|ospf|eigrp|vlan|subnet/.test(text);
  const isSecurity = /security|penetration|vulnerab|attack|firewall|cyber/.test(text);

  const devices = [
    { id: "learner", name: isSecurity ? "Analyst Workstation" : "Student Workstation", type: "workstation", role: "Learner console", ip: "192.168.1.50", status: "online" },
    { id: "edge", name: isCloud ? "Cloud Gateway" : "Edge Firewall", type: isCloud ? "cloud" : "firewall", role: isCloud ? "Cloud access boundary" : "Security boundary", ip: "192.168.1.1", status: "online" },
    { id: "core", name: isNetwork ? "Core Router" : "Core Switch", type: isNetwork ? "router" : "switch", role: "Network transit", ip: "192.168.1.254", status: "online" },
    { id: "target", name: isCloud ? "Cloud Workload" : "Target Server", type: isCloud ? "cloud" : "server", role: isCloud ? "Certification workload" : "Primary lab target", ip: "192.168.1.10", status: "attention" },
    { id: "data", name: isSoc ? "SIEM Platform" : "Data Service", type: isSoc ? "console" : "database", role: isSoc ? "Monitoring and investigation" : "Protected application data", ip: "192.168.1.20", status: "online" },
  ];

  if (isSecurity) devices.unshift({ id: "test", name: "Test System", type: "attacker", role: "Authorized test source", ip: "10.10.10.25", status: "online" });
  if (isCloud) devices.push({ id: "internet", name: "Cloud Services", type: "internet", role: "Managed services", ip: "Public endpoint", status: "online" });
  return devices.slice(0, 7).map((device, index) => ({ ...device, ...POSITIONS[index] }));
}

function targetForTask(task, devices) {
  const text = `${task?.title || ""} ${task?.description || ""} ${(task?.expected_commands || []).join(" ")}`.toLowerCase();
  const rules = [
    [/siem|log|alert|incident|event|splunk|elastic/, "data"],
    [/database|sql|mysql|data/, "data"],
    [/firewall|acl|rule|gateway|security group/, "edge"],
    [/router|route|ospf|eigrp|bgp|vlan|switch/, "core"],
    [/scan|nmap|nikto|exploit|attack|kali|recon/, devices.some((d) => d.id === "test") ? "test" : "learner"],
    [/server|host|service|web|patch|vulnerab/, "target"],
  ];
  return rules.find(([pattern]) => pattern.test(text))?.[1] || "learner";
}

export default function CertificationTopology({ scenario, tasks = [], completedTaskIds, onOpenConsole }) {
  const [selectedId, setSelectedId] = useState("learner");
  const devices = useMemo(() => courseDevices(scenario), [scenario]);
  const activeTask = tasks.find((task) => !completedTaskIds?.has(task.id)) || tasks[0];
  const targetId = targetForTask(activeTask, devices);
  const completed = tasks.length > 0 && tasks.every((task) => completedTaskIds?.has(task.id));

  const connections = devices.slice(1).map((device, index) => {
    const prior = index === 0 ? devices[0] : devices[Math.min(index, 2)];
    return { from: prior, to: device };
  });

  const selectDevice = (device) => {
    setSelectedId(device.id);
    onOpenConsole?.(device);
  };

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-cyan-500/20 bg-gradient-to-br from-slate-950 via-slate-950 to-cyan-950/20">
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 px-5 py-4">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-100">
            <Network className="h-4 w-4 text-cyan-300" />
            Interactive course topology
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Select any device to enter its console. The pulsing device is associated with the current task.
          </p>
        </div>
        <div className="flex flex-wrap gap-2 text-[10px]">
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-emerald-300">Online</span>
          <span className="rounded-full border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-red-300">Current task</span>
          <span className="rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2.5 py-1 text-cyan-300">Selected</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_250px]">
        <div className="relative min-h-[360px] overflow-hidden bg-[radial-gradient(circle_at_center,rgba(34,211,238,.08),transparent_58%)]">
          <svg className="pointer-events-none absolute inset-0 h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="course-link" x1="0" x2="1">
                <stop offset="0%" stopColor="#334155" />
                <stop offset="50%" stopColor="#22d3ee" />
                <stop offset="100%" stopColor="#334155" />
              </linearGradient>
            </defs>
            {connections.map(({ from, to }) => (
              <g key={`${from.id}-${to.id}`}>
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#1e293b" strokeWidth="1.5" />
                <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="url(#course-link)" strokeWidth=".32" strokeDasharray="2 2" className="animate-pulse" />
              </g>
            ))}
          </svg>

          {devices.map((device) => {
            const isTarget = device.id === targetId && !completed;
            const isSelected = device.id === selectedId;
            const style = completed ? DEVICE_STYLES.complete : isSelected ? DEVICE_STYLES.selected : isTarget ? DEVICE_STYLES.target : DEVICE_STYLES.normal;
            return (
              <button
                key={device.id}
                type="button"
                onClick={() => selectDevice(device)}
                className={`absolute w-28 -translate-x-1/2 -translate-y-1/2 rounded-xl border p-3 text-left shadow-xl transition duration-200 hover:z-20 hover:scale-105 ${style}`}
                style={{ left: `${device.x}%`, top: `${device.y}%` }}
                aria-label={`Open ${device.name} console`}
              >
                {isTarget && <span className="absolute -right-1 -top-1 h-3 w-3 animate-ping rounded-full bg-red-400" />}
                <div className="flex items-center justify-between">
                  <InfrastructureDeviceIcon type={device.type} className="h-7 w-7" />
                  <span className={`h-2 w-2 rounded-full ${device.status === "attention" ? "bg-amber-400" : "bg-emerald-400"}`} />
                </div>
                <div className="mt-2 truncate text-[11px] font-semibold">{device.name}</div>
                <div className="mt-1 truncate font-mono text-[9px] opacity-60">{device.ip}</div>
              </button>
            );
          })}
        </div>

        <aside className="border-t border-slate-800 bg-slate-950/70 p-5 lg:border-l lg:border-t-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">Current objective</div>
          <div className="mt-2 text-sm font-semibold text-slate-100">{activeTask?.title || "Explore the lab environment"}</div>
          <p className="mt-2 line-clamp-4 text-xs leading-5 text-slate-400">
            {activeTask?.description || "Select a device to review its role and open the practice console."}
          </p>
          <div className="mt-5 border-t border-slate-800 pt-4">
            <div className="text-[10px] uppercase tracking-wider text-slate-500">Selected device</div>
            {devices.filter((device) => device.id === selectedId).map((device) => (
              <div key={device.id}>
                <div className="mt-2 text-sm font-semibold text-slate-100">{device.name}</div>
                <div className="mt-1 text-xs text-slate-400">{device.role}</div>
                <div className="mt-3 flex items-center gap-2 text-[10px] text-emerald-300">
                  <Activity className="h-3.5 w-3.5" /> Available for lab access
                </div>
                <button
                  type="button"
                  onClick={() => onOpenConsole?.(device)}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-cyan-400 px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300"
                >
                  <Terminal className="h-3.5 w-3.5" /> Open console
                </button>
              </div>
            ))}
          </div>
        </aside>
      </div>
    </section>
  );
}
