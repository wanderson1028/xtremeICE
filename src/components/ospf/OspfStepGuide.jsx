import React, { useState } from "react";
import { ROUTER_INTERFACES } from "./ospfTopology";
import { ChevronDown, ChevronRight, Lightbulb } from "lucide-react";

// Generate exact commands for a given router
function buildSteps(routerName) {
  const ifaces = ROUTER_INTERFACES[routerName];
  if (!ifaces) return [];

  const steps = [{ title: "Enter Privileged EXEC Mode", cmds: ["enable"] }];

  steps.push({ title: "Enter Global Configuration Mode", cmds: ["configure terminal"] });

  ifaces.forEach((iface) => {
    steps.push({
      title: `Configure ${iface.iface} (${iface.short})`,
      cmds: [
        `interface ${iface.iface}`,
        `ip address ${iface.ip} ${iface.mask}`,
        `no shutdown`,
        `exit`,
      ],
    });
  });

  // Build network statements (wildcard = 0.0.0.3 for /30, 0.0.0.0 for /32)
  const netStatements = ifaces.map((iface) => {
    const wild = iface.mask === "255.255.255.252" ? "0.0.0.3" : "0.0.0.0";
    const parts = iface.ip.split(".").map(Number);
    const maskParts = iface.mask === "255.255.255.252" ? [255, 255, 255, 252] : [255, 255, 255, 255];
    const net = parts.map((o, i) => o & maskParts[i]).join(".");
    return `network ${net} ${wild} area 0`;
  });

  steps.push({
    title: "Enable OSPF Process 1",
    cmds: ["router ospf 1", ...netStatements, "exit"],
  });

  steps.push({
    title: "Verify Configuration",
    cmds: ["show ip interface brief", "show ip ospf neighbor", "ping 8.8.8.8"],
    note: "All interfaces should be Up/Up, neighbors should appear, and ping should succeed.",
  });

  return steps;
}

// Medium mode — hints only, no exact commands
function buildHints(routerName) {
  const ifaces = ROUTER_INTERFACES[routerName];
  if (!ifaces) return [];
  return [
    {
      title: "Step 1 — Configure Interfaces",
      hint: `This router has ${ifaces.length} interfaces to configure. Use the interface table on the left for exact IPs and masks. Remember to bring each interface up with no shutdown.`,
    },
    {
      title: "Step 2 — Enable OSPF",
      hint: "Start OSPF process 1. You need to advertise each connected network into Area 0. Use a wildcard mask (inverse of subnet mask).",
    },
    {
      title: "Step 3 — Verify & Test",
      hint: "Use show commands to confirm interfaces are up, OSPF neighbors are established, and you can reach the internet gateway.",
    },
  ];
}

export default function OspfStepGuide({ routerName, difficulty }) {
  const [openStep, setOpenStep] = useState(0);

  if (difficulty === "hard") return null;

  if (difficulty === "medium") {
    const hints = buildHints(routerName);
    return (
      <div className="bg-gray-950 border border-yellow-800/50 rounded-xl p-3">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb className="h-3.5 w-3.5 text-yellow-400" />
          <span className="text-xs font-mono text-yellow-400">Guided Hints</span>
        </div>
        <div className="space-y-2">
          {hints.map((h, i) => (
            <div key={i} className="border border-gray-800 rounded-lg overflow-hidden">
              <button
                className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-gray-800/40 transition-colors"
                onClick={() => setOpenStep(openStep === i ? -1 : i)}
              >
                <span className="text-[11px] font-mono text-yellow-300">{h.title}</span>
                {openStep === i ? (
                  <ChevronDown className="h-3 w-3 text-gray-500" />
                ) : (
                  <ChevronRight className="h-3 w-3 text-gray-500" />
                )}
              </button>
              {openStep === i && (
                <div className="px-3 py-2 bg-black/30 border-t border-gray-800">
                  <p className="text-[11px] font-mono text-gray-400 leading-relaxed">{h.hint}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Easy mode — full step-by-step commands
  const steps = buildSteps(routerName);
  return (
    <div className="bg-gray-950 border border-green-800/50 rounded-xl p-3">
      <div className="flex items-center gap-2 mb-3">
        <span className="h-2 w-2 rounded-full bg-green-400" />
        <span className="text-xs font-mono text-green-400">Step-by-Step Guide</span>
      </div>
      <div className="space-y-1.5">
        {steps.map((step, i) => (
          <div key={i} className="border border-gray-800 rounded-lg overflow-hidden">
            <button
              className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-gray-800/40 transition-colors"
              onClick={() => setOpenStep(openStep === i ? -1 : i)}
            >
              <span className="h-4 w-4 rounded-full bg-green-900/60 border border-green-700 text-green-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </span>
              <span className="text-[11px] font-mono text-green-300 flex-1">{step.title}</span>
              {openStep === i ? (
                <ChevronDown className="h-3 w-3 text-gray-500 shrink-0" />
              ) : (
                <ChevronRight className="h-3 w-3 text-gray-500 shrink-0" />
              )}
            </button>
            {openStep === i && (
              <div className="px-3 py-2 bg-black/30 border-t border-gray-800 space-y-1">
                {step.cmds.map((cmd, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <span className="text-green-600 text-[10px]">›</span>
                    <code className="text-[11px] text-cyan-300 font-mono">{cmd}</code>
                  </div>
                ))}
                {step.note && (
                  <p className="text-[10px] text-gray-500 font-mono mt-2 italic">{step.note}</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}