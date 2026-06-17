import React from "react";
import { ROUTER_INTERFACES } from "./eigrpTopology";

export default function EigrpStepGuide({ routerName, difficulty }) {
  const ifaces = ROUTER_INTERFACES[routerName] || [];
  const physIfaces = ifaces.filter(i => i.iface !== "Loopback0");
  const lb = ifaces.find(i => i.iface === "Loopback0");

  if (difficulty === "hard") return null;

  if (difficulty === "easy") {
    return (
      <div className="bg-gray-950 border border-gray-700 rounded-xl p-3 text-[11px] font-mono space-y-2">
        <div className="text-gray-400 font-semibold">Step-by-Step Guide</div>

        <div className="text-gray-300">1. Enter privileged & config mode:</div>
        <div className="bg-black/40 rounded p-1.5 text-cyan-300 space-y-0.5">
          <div>enable</div>
          <div>conf t</div>
        </div>

        {physIfaces.map(iface => (
          <div key={iface.iface}>
            <div className="text-gray-300">Configure {iface.short}:</div>
            <div className="bg-black/40 rounded p-1.5 text-cyan-300 space-y-0.5">
              <div>int {iface.short.toLowerCase()}</div>
              <div>ip address {iface.ip} {iface.mask}</div>
              <div>no shut</div>
              <div>exit</div>
            </div>
          </div>
        ))}

        {lb && (
          <div>
            <div className="text-gray-300">Configure Loopback:</div>
            <div className="bg-black/40 rounded p-1.5 text-cyan-300 space-y-0.5">
              <div>int lo0</div>
              <div>ip address {lb.ip} {lb.mask}</div>
              <div>no shut</div>
              <div>exit</div>
            </div>
          </div>
        )}

        <div className="text-gray-300">Enable EIGRP:</div>
        <div className="bg-black/40 rounded p-1.5 text-cyan-300 space-y-0.5">
          <div>router eigrp 100</div>
          {ifaces.map(i => (
            <div key={i.iface}>network {i.ip} 0.0.0.0</div>
          ))}
          <div>no auto-summary</div>
        </div>

        <div className="text-gray-300">Verify:</div>
        <div className="bg-black/40 rounded p-1.5 text-cyan-300 space-y-0.5">
          <div>end</div>
          <div>show ip eigrp neighbors</div>
          <div>ping 2.2.2.2</div>
        </div>
      </div>
    );
  }

  // Medium: hints only
  return (
    <div className="bg-gray-950 border border-gray-700 rounded-xl p-3 text-[11px] font-mono space-y-1">
      <div className="text-gray-400 font-semibold">Hints</div>
      <div className="text-gray-500">• Configure all interfaces with correct IPs</div>
      <div className="text-gray-500">• Use <span className="text-cyan-400">router eigrp 100</span></div>
      <div className="text-gray-500">• Advertise each subnet with <span className="text-cyan-400">network &lt;ip&gt; 0.0.0.0</span></div>
      <div className="text-gray-500">• Run <span className="text-cyan-400">no auto-summary</span></div>
      <div className="text-gray-500">• Verify with <span className="text-cyan-400">show ip eigrp neighbors</span></div>
    </div>
  );
}