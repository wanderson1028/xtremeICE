import React, { useState } from "react";
import { DollarSign, ChevronDown, ChevronUp, Info } from "lucide-react";

// Hardware unit costs (USD)
const HW_COSTS = {
  router: {
    "Cisco ISR": 3500,
    "Cisco CSR1000v": 1200,
    "Juniper vMX": 2800,
    "VyOS": 0,
    "Generic Router": 800,
    default: 1500,
  },
  switch: {
    "Cisco Catalyst": 2200,
    "Cisco Nexus": 6500,
    "Arista": 4800,
    "Juniper EX": 3200,
    "Generic L2/L3": 600,
    default: 1200,
  },
  firewall: {
    "Cisco ASA": 4500,
    "Palo Alto": 9000,
    "Fortinet": 5500,
    "pfSense": 800,
    "None": 0,
    default: 3500,
  },
  loadbalancer: 4000,
  server: 3200,
  wireless: 650,
};

// Software licensing annual costs (USD/device)
const SW_COSTS = {
  router: {
    "Cisco ISR": 1200,
    "Cisco CSR1000v": 800,
    "Juniper vMX": 1000,
    "VyOS": 0,
    default: 500,
  },
  switch: {
    "Cisco Catalyst": 600,
    "Cisco Nexus": 1400,
    "Arista": 900,
    "Juniper EX": 700,
    default: 300,
  },
  firewall: {
    "Cisco ASA": 1800,
    "Palo Alto": 4200,
    "Fortinet": 2200,
    "pfSense": 0,
    default: 1500,
  },
  loadbalancer: 2000,
  server: 1500, // OS + basic mgmt
  wireless: 200, // controller licensing
};

function getHwCost(type, model) {
  if (typeof HW_COSTS[type] === "number") return HW_COSTS[type];
  const map = HW_COSTS[type] || {};
  return map[model] ?? map["default"] ?? 0;
}

function getSwCost(type, model) {
  if (typeof SW_COSTS[type] === "number") return SW_COSTS[type];
  const map = SW_COSTS[type] || {};
  return map[model] ?? map["default"] ?? 0;
}

function fmt(n) {
  return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

export default function CostEstimator({ design }) {
  const [open, setOpen] = useState(false);

  if (!design) return null;

  const siteCount = Math.max(design.num_sites || 1, (design.site_names?.filter(Boolean).length) || 1);
  const numServers = design.server_farm ? (design.num_servers || 2) : 0;

  const lineItems = [];

  // Core router
  lineItems.push({
    label: "Core Router",
    model: design.router_model || "Generic Router",
    type: "router",
    qty: 1,
    hw: getHwCost("router", design.router_model),
    sw: getSwCost("router", design.router_model),
  });

  // Firewall
  if (design.firewall_enabled && design.firewall_vendor !== "None") {
    lineItems.push({
      label: "Firewall",
      model: design.firewall_vendor || "Generic Firewall",
      type: "firewall",
      qty: design.redundancy_enabled ? 2 : 1,
      hw: getHwCost("firewall", design.firewall_vendor),
      sw: getSwCost("firewall", design.firewall_vendor),
    });
  }

  // Core switch
  lineItems.push({
    label: "Core Switch",
    model: design.switch_model || "Generic L2/L3",
    type: "switch",
    qty: design.redundancy_enabled ? 2 : 1,
    hw: getHwCost("switch", design.switch_model),
    sw: getSwCost("switch", design.switch_model),
  });

  // Load balancer
  if (design.load_balancer) {
    lineItems.push({ label: "Load Balancer", model: "Hardware LB", type: "loadbalancer", qty: 1, hw: HW_COSTS.loadbalancer, sw: SW_COSTS.loadbalancer });
  }

  // Site routers + switches
  if (siteCount > 0) {
    lineItems.push({
      label: `Site Routers (×${siteCount})`,
      model: design.router_model || "Generic Router",
      type: "router",
      qty: siteCount,
      hw: getHwCost("router", design.router_model),
      sw: getSwCost("router", design.router_model),
    });
    lineItems.push({
      label: `Site Switches (×${siteCount})`,
      model: design.switch_model || "Generic L2/L3",
      type: "switch",
      qty: siteCount,
      hw: getHwCost("switch", design.switch_model),
      sw: getSwCost("switch", design.switch_model),
    });
  }

  // Servers
  if (numServers > 0) {
    lineItems.push({ label: `Servers (×${numServers})`, model: "Rack Server", type: "server", qty: numServers, hw: HW_COSTS.server, sw: SW_COSTS.server });
  }

  // Wireless APs
  if (design.wireless_enabled) {
    const apCount = siteCount * 2;
    lineItems.push({ label: `Wireless APs (×${apCount})`, model: "Enterprise AP", type: "wireless", qty: apCount, hw: HW_COSTS.wireless, sw: SW_COSTS.wireless });
  }

  const totalHw = lineItems.reduce((s, i) => s + i.hw * i.qty, 0);
  const totalSwAnnual = lineItems.reduce((s, i) => s + i.sw * i.qty, 0);
  const installation = totalHw * 0.15;
  const grandTotal = totalHw + totalSwAnnual + installation;

  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-400" />
          <span className="font-semibold text-sm text-foreground">Budget Estimate</span>
          <span className="text-xs text-green-400 font-medium ml-1">{fmt(grandTotal)}</span>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">
          {/* Hardware */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Hardware</p>
            <div className="space-y-1.5">
              {lineItems.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div>
                    <span className="text-foreground">{item.label}</span>
                    <span className="text-muted-foreground ml-1.5 text-[10px]">{item.model}</span>
                  </div>
                  <span className="text-foreground tabular-nums">{fmt(item.hw * item.qty)}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs pt-1 border-t border-border font-medium">
                <span className="text-muted-foreground">Hardware Subtotal</span>
                <span className="text-foreground">{fmt(totalHw)}</span>
              </div>
            </div>
          </div>

          {/* Software */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Software Licensing (Annual)</p>
            <div className="space-y-1.5">
              {lineItems.filter(i => i.sw > 0).map((item, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <span className="text-foreground">{item.label}</span>
                  <span className="text-foreground tabular-nums">{fmt(item.sw * item.qty)}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs pt-1 border-t border-border font-medium">
                <span className="text-muted-foreground">Licensing Subtotal</span>
                <span className="text-foreground">{fmt(totalSwAnnual)}</span>
              </div>
            </div>
          </div>

          {/* Installation */}
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground flex items-center gap-1">
              Installation & Setup <Info className="h-3 w-3" />
            </span>
            <span className="text-foreground">{fmt(installation)}</span>
          </div>

          {/* Total */}
          <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-3">
            <div className="flex justify-between items-center">
              <span className="text-sm font-semibold text-green-300">Total Project Budget</span>
              <span className="text-lg font-bold text-green-400">{fmt(grandTotal)}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Includes hardware + 1yr licensing + 15% installation. Estimates only.</p>
          </div>

          {/* Disclaimer */}
          <div className="flex gap-2 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-2.5">
            <Info className="h-4 w-4 text-yellow-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-yellow-200/80 leading-relaxed">
              <span className="font-semibold text-yellow-300">Disclaimer:</span> These figures are rough estimates based on typical list prices and may vary significantly depending on vendor negotiations, regional pricing, existing infrastructure, support contracts, and deployment complexity. This estimate is provided for planning purposes only and does not constitute a formal quote. Contact your vendor or network integrator for accurate pricing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}