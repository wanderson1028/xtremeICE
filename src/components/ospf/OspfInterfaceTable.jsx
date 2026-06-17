import React from "react";
import { ROUTER_INTERFACES } from "./ospfTopology";

export default function OspfInterfaceTable({ routerName }) {
  const ifaces = ROUTER_INTERFACES[routerName];

  return (
    <div className="bg-gray-950 border border-gray-700 rounded-xl p-3">
      <div className="text-xs text-gray-400 font-mono mb-2">{routerName} — Interface Reference</div>
      <table className="w-full text-[11px] font-mono">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800">
            <th className="text-left py-1 pr-2">Interface</th>
            <th className="text-left py-1 pr-2">IP Address</th>
            <th className="text-left py-1">Mask</th>
            <th className="text-left py-1">Neighbor</th>
          </tr>
        </thead>
        <tbody>
          {ifaces.map((iface, i) => (
            <tr key={i} className="border-b border-gray-900 hover:bg-gray-900/50">
              <td className="py-1 pr-2 text-cyan-400">{iface.short}</td>
              <td className="py-1 pr-2 text-yellow-300">{iface.ip}</td>
              <td className="py-1 text-gray-400">{iface.mask}</td>
              <td className="py-1 text-gray-400">{iface.neighbor || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}