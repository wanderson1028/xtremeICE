import React from "react";
import { ROUTER_INTERFACES } from "./eigrpTopology";

export default function EigrpInterfaceTable({ routerName }) {
  const ifaces = ROUTER_INTERFACES[routerName] || [];
  return (
    <div className="bg-gray-950 border border-gray-700 rounded-xl p-3">
      <div className="text-xs text-gray-400 font-mono mb-2">Required Interface Config</div>
      <table className="w-full text-[10px] font-mono">
        <thead>
          <tr className="text-gray-500 border-b border-gray-800">
            <th className="text-left pb-1">Interface</th>
            <th className="text-left pb-1">IP Address</th>
            <th className="text-left pb-1">Mask</th>
          </tr>
        </thead>
        <tbody>
          {ifaces.map(iface => (
            <tr key={iface.iface} className="border-b border-gray-900">
              <td className="py-1 text-cyan-400">{iface.short}</td>
              <td className="py-1 text-yellow-300">{iface.ip}</td>
              <td className="py-1 text-gray-400">{iface.mask}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}