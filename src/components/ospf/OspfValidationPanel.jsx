import React from "react";
import { CheckCircle, Circle, XCircle } from "lucide-react";
import { ROUTER_INTERFACES } from "./ospfTopology";
import { validateConfig } from "./ospfEngine";

export default function OspfValidationPanel({ state, routerName }) {
  const { checks } = validateConfig(state, routerName);
  const ifaces = ROUTER_INTERFACES[routerName];

  const items = [
    ...ifaces.map(iface => ({
      label: `${iface.short} IP configured (${iface.ip})`,
      pass: checks[`ip_${iface.short}`],
    })),
    ...ifaces.map(iface => ({
      label: `${iface.short} no shutdown`,
      pass: checks[`up_${iface.short}`],
    })),
    { label: "OSPF process 1 enabled", pass: checks.ospf_enabled },
    { label: "Networks advertised in Area 0", pass: checks.networks_advertised },
    { label: "OSPF adjacencies formed", pass: checks.ospf_ready },
    { label: "Can reach 8.8.8.8", pass: checks.can_reach_8888 },
  ];

  const passed = items.filter(i => i.pass).length;

  return (
    <div className="bg-gray-950 border border-gray-700 rounded-xl p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 font-mono">Validation Checklist</span>
        <span className="text-xs font-mono text-green-400">{passed}/{items.length}</span>
      </div>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            {item.pass === true ? (
              <CheckCircle className="h-3 w-3 text-green-400 shrink-0" />
            ) : item.pass === false ? (
              <XCircle className="h-3 w-3 text-red-500 shrink-0" />
            ) : (
              <Circle className="h-3 w-3 text-gray-600 shrink-0" />
            )}
            <span className={`text-[11px] font-mono ${item.pass ? "text-green-300" : "text-gray-500"}`}>
              {item.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}