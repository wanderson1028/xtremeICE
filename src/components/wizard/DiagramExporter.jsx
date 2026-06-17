import React, { useRef, useState, useEffect } from "react";
import { X, FileImage, FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

// ── Cost helpers ─────────────────────────────────────────────────────────────
const HW_COSTS = {
  router:       { "Cisco ISR": 3500, "Cisco CSR1000v": 1200, "Juniper vMX": 2800, "VyOS": 0, "Generic Router": 800, default: 1500 },
  switch:       { "Cisco Catalyst": 2200, "Cisco Nexus": 6500, "Arista": 4800, "Juniper EX": 3200, "Generic L2/L3": 600, default: 1200 },
  firewall:     { "Cisco ASA": 4500, "Palo Alto": 9000, "Fortinet": 5500, "pfSense": 800, "None": 0, default: 3500 },
  loadbalancer: 4000, server: 3200, wireless: 650,
};
const SW_COSTS = {
  router:       { "Cisco ISR": 1200, "Cisco CSR1000v": 800, "Juniper vMX": 1000, "VyOS": 0, default: 500 },
  switch:       { "Cisco Catalyst": 600, "Cisco Nexus": 1400, "Arista": 900, "Juniper EX": 700, default: 300 },
  firewall:     { "Cisco ASA": 1800, "Palo Alto": 4200, "Fortinet": 2200, "pfSense": 0, default: 1500 },
  loadbalancer: 2000, server: 1500, wireless: 200,
};
function hwCost(type, model) {
  if (typeof HW_COSTS[type] === "number") return HW_COSTS[type];
  const m = HW_COSTS[type] || {}; return m[model] ?? m.default ?? 0;
}
function swCost(type, model) {
  if (typeof SW_COSTS[type] === "number") return SW_COSTS[type];
  const m = SW_COSTS[type] || {}; return m[model] ?? m.default ?? 0;
}
function fmt(n) { return n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }); }

function buildLineItems(design, nodes) {
  const items = [];
  const siteCount = Math.max(design?.num_sites || 1, (design?.site_names?.filter(Boolean).length) || 1);
  const routerModel = design?.router_model || "Generic Router";
  const switchModel = design?.switch_model || "Generic L2/L3";
  const fwVendor = design?.firewall_vendor;

  items.push({ label: "Core Router", model: routerModel, qty: 1, hw: hwCost("router", routerModel), sw: swCost("router", routerModel) });
  if (design?.firewall_enabled && fwVendor !== "None")
    items.push({ label: "Firewall", model: fwVendor || "Generic", qty: design.redundancy_enabled ? 2 : 1, hw: hwCost("firewall", fwVendor), sw: swCost("firewall", fwVendor) });
  items.push({ label: "Core Switch", model: switchModel, qty: design?.redundancy_enabled ? 2 : 1, hw: hwCost("switch", switchModel), sw: swCost("switch", switchModel) });
  if (design?.load_balancer) items.push({ label: "Load Balancer", model: "Hardware LB", qty: 1, hw: HW_COSTS.loadbalancer, sw: SW_COSTS.loadbalancer });
  if (siteCount > 0) {
    items.push({ label: `Site Routers ×${siteCount}`, model: routerModel, qty: siteCount, hw: hwCost("router", routerModel), sw: swCost("router", routerModel) });
    items.push({ label: `Site Switches ×${siteCount}`, model: switchModel, qty: siteCount, hw: hwCost("switch", switchModel), sw: swCost("switch", switchModel) });
  }
  const numServers = design?.server_farm ? (design.num_servers || 2) : 0;
  if (numServers > 0) items.push({ label: `Servers ×${numServers}`, model: "Rack Server", qty: numServers, hw: HW_COSTS.server, sw: SW_COSTS.server });
  if (design?.wireless_enabled) {
    const apCount = siteCount * 2;
    items.push({ label: `Wireless APs ×${apCount}`, model: "Enterprise AP", qty: apCount, hw: HW_COSTS.wireless, sw: SW_COSTS.wireless });
  }
  return items;
}

// ── Node colors by type ──────────────────────────────────────────────────────
const NODE_COLORS = {
  router: "#3b82f6", switch: "#8b5cf6", firewall: "#ef4444",
  server: "#10b981", wireless: "#f59e0b", workstation: "#64748b",
  loadbalancer: "#0ea5e9", cloud: "#6366f1", internet: "#06b6d4",
  plc: "#dc2626", scada: "#b45309", hmi: "#7c3aed", iot: "#059669",
};

// ── SVG Topology Diagram ─────────────────────────────────────────────────────
function TopologyDiagram({ nodes, links }) {
  if (!nodes || nodes.length === 0) return null;

  const PAD = 40;
  const minX = Math.min(...nodes.map(n => n.x)) - PAD;
  const minY = Math.min(...nodes.map(n => n.y)) - PAD;
  const maxX = Math.max(...nodes.map(n => n.x)) + PAD + 60;
  const maxY = Math.max(...nodes.map(n => n.y)) + PAD + 40;
  const rawW = maxX - minX;
  const rawH = maxY - minY;

  // Fit into 820×300
  const TARGET_W = 820;
  const TARGET_H = 300;
  const scale = Math.min(TARGET_W / rawW, TARGET_H / rawH, 1);
  const svgW = rawW * scale;
  const svgH = rawH * scale;

  const tx = (x) => (x - minX) * scale;
  const ty = (y) => (y - minY) * scale;

  const nodeById = Object.fromEntries(nodes.map(n => [n.id, n]));

  return (
    <svg
      width={svgW}
      height={svgH}
      style={{ display: "block", background: "#f8fafc", borderRadius: 8, border: "1px solid #e2e8f0" }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Grid dots */}
      <defs>
        <pattern id="exportgrid" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="0.7" fill="rgba(148,163,184,0.25)" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#exportgrid)" />

      {/* Links */}
      {(links || []).map((link, i) => {
        const from = nodeById[link.from];
        const to = nodeById[link.to];
        if (!from || !to) return null;
        const isWan = link.wan;
        return (
          <line
            key={link.id || i}
            x1={tx(from.x + 28)} y1={ty(from.y + 28)}
            x2={tx(to.x + 28)} y2={ty(to.y + 28)}
            stroke={isWan ? "#f59e0b" : "#94a3b8"}
            strokeWidth={isWan ? 1.5 : 1}
            strokeDasharray={isWan ? "5,3" : "none"}
            opacity={0.8}
          />
        );
      })}

      {/* Nodes */}
      {nodes.map(node => {
        const color = NODE_COLORS[node.type] || "#94a3b8";
        const cx = tx(node.x + 28);
        const cy = ty(node.y + 28);
        const r = Math.max(12, 14 * scale);
        const label = node.label || node.type;
        const shortLabel = label.length > 12 ? label.slice(0, 11) + "…" : label;
        return (
          <g key={node.id}>
            <circle cx={cx} cy={cy} r={r} fill={color + "22"} stroke={color} strokeWidth={1.5} />
            <text x={cx} y={cy + 1} textAnchor="middle" dominantBaseline="middle" fontSize={Math.max(7, 9 * scale)} fill={color} fontWeight="600">
              {node.type.slice(0, 2).toUpperCase()}
            </text>
            <text x={cx} y={cy + r + 8} textAnchor="middle" fontSize={Math.max(6, 8 * scale)} fill="#374151">
              {shortLabel}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Printable report ─────────────────────────────────────────────────────────
function PrintReport({ design, nodes, links, reportRef }) {
  const items = buildLineItems(design, nodes);
  const totalHw = items.reduce((s, i) => s + i.hw * i.qty, 0);
  const totalSw = items.reduce((s, i) => s + i.sw * i.qty, 0);
  const installation = totalHw * 0.15;
  const grandTotal = totalHw + totalSw + installation;
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div ref={reportRef} style={{ width: 900, background: "#fff", color: "#111", fontFamily: "Arial, sans-serif", padding: 40 }}>
      {/* Header */}
      <div style={{ borderBottom: "3px solid #0ea5e9", paddingBottom: 16, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#0ea5e9" }}>Xtreme I.C.E. Network Designer</div>
          <div style={{ fontSize: 14, color: "#555", marginTop: 2 }}>Network Design Export Report</div>
        </div>
        <div style={{ textAlign: "right", fontSize: 12, color: "#555" }}>
          <div style={{ fontWeight: 600 }}>{design?.name || "Untitled Design"}</div>
          {design?.company_name && <div>{design.company_name}</div>}
          <div>{today}</div>
        </div>
      </div>

      {/* Topology Diagram */}
      {nodes?.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0ea5e9", borderBottom: "1px solid #e2e8f0", paddingBottom: 6, marginBottom: 12 }}>
            Network Topology
          </div>
          <TopologyDiagram nodes={nodes} links={links} />
        </div>
      )}

      {/* Design Summary */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0ea5e9", borderBottom: "1px solid #e2e8f0", paddingBottom: 6, marginBottom: 12 }}>Design Summary</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px 20px", fontSize: 12 }}>
          {[
            ["Topology", design?.topology_type],
            ["Routing Protocol", design?.routing_protocol],
            ["WAN Technology", design?.wan_technology],
            ["Sites", design?.num_sites],
            ["VLANs / Site", design?.num_vlans_per_site],
            ["IP Scheme", design?.ip_scheme],
            ["Firewall", design?.firewall_enabled ? (design?.firewall_vendor || "Enabled") : "None"],
            ["DMZ", design?.dmz_required ? "Yes" : "No"],
            ["Redundancy", design?.redundancy_enabled ? "Yes" : "No"],
            ["Load Balancer", design?.load_balancer ? "Yes" : "No"],
            ["Wireless", design?.wireless_enabled ? "Yes" : "No"],
            ["Router Model", design?.router_model],
            ["Switch Model", design?.switch_model],
            ["Domain", design?.domain_name],
            ["NTP Server", design?.ntp_server],
          ].filter(([, v]) => v).map(([k, v]) => (
            <div key={k} style={{ display: "flex", gap: 6 }}>
              <span style={{ color: "#555", minWidth: 110 }}>{k}:</span>
              <span style={{ fontWeight: 600 }}>{String(v)}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Device inventory */}
      {nodes?.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: "#0ea5e9", borderBottom: "1px solid #e2e8f0", paddingBottom: 6, marginBottom: 12 }}>
            Canvas Device Inventory ({nodes.length} devices, {links?.length || 0} links)
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: "#f1f5f9" }}>
                {["Device", "Type", "Vendor / Model"].map(h => (
                  <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600, color: "#374151" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {nodes.map((n, i) => {
                // vendor is stored as n.vendor; if missing, fall back to the label which is often set to the vendor string
                const vendorDisplay = n.vendor || (n.label !== n.type ? n.label : null) || "—";
                return (
                  <tr key={n.id} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                    <td style={{ padding: "5px 10px" }}>{n.label}</td>
                    <td style={{ padding: "5px 10px", textTransform: "capitalize" }}>{n.type}</td>
                    <td style={{ padding: "5px 10px", color: "#555" }}>{vendorDisplay}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Cost Estimate */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: "#0ea5e9", borderBottom: "1px solid #e2e8f0", paddingBottom: 6, marginBottom: 12 }}>Budget Estimate</div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ background: "#f1f5f9" }}>
              {["Item", "Model", "Qty", "Unit HW Cost", "HW Total", "Annual SW License"].map(h => (
                <th key={h} style={{ textAlign: "left", padding: "6px 10px", fontWeight: 600, color: "#374151" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, i) => (
              <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#f8fafc" }}>
                <td style={{ padding: "5px 10px" }}>{item.label}</td>
                <td style={{ padding: "5px 10px", color: "#555" }}>{item.model}</td>
                <td style={{ padding: "5px 10px" }}>{item.qty}</td>
                <td style={{ padding: "5px 10px" }}>{fmt(item.hw)}</td>
                <td style={{ padding: "5px 10px", fontWeight: 600 }}>{fmt(item.hw * item.qty)}</td>
                <td style={{ padding: "5px 10px", color: "#555" }}>{item.sw > 0 ? fmt(item.sw * item.qty) : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ marginTop: 12, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "12px 16px" }}>
          {[
            ["Hardware Subtotal", totalHw],
            ["Software Licensing (Annual)", totalSw],
            ["Installation & Setup (15%)", installation],
          ].map(([label, val]) => (
            <div key={label} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: "#374151" }}>{label}</span>
              <span style={{ fontWeight: 600 }}>{fmt(val)}</span>
            </div>
          ))}
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, fontWeight: 700, borderTop: "1px solid #86efac", paddingTop: 8, marginTop: 8 }}>
            <span style={{ color: "#166534" }}>Total Project Budget</span>
            <span style={{ color: "#16a34a" }}>{fmt(grandTotal)}</span>
          </div>
        </div>
      </div>

      {/* Disclaimer */}
      <div style={{ background: "#fefce8", border: "1px solid #fde047", borderRadius: 8, padding: "10px 14px", fontSize: 11, color: "#713f12" }}>
        <strong>Disclaimer:</strong> These figures are rough estimates based on typical list prices and may vary significantly depending on vendor negotiations, regional pricing, existing infrastructure, support contracts, and deployment complexity. This estimate is provided for planning purposes only and does not constitute a formal quote.
      </div>
    </div>
  );
}

// ── Main modal ───────────────────────────────────────────────────────────────
export default function DiagramExporter({ design, nodes, links, onClose }) {
  const reportRef = useRef(null);
  const [exporting, setExporting] = useState(false);

  const capture = async () => {
    const el = reportRef.current;
    if (!el) return null;
    // Temporarily make it fully visible for capture
    const prev = { position: el.style.position, left: el.style.left, top: el.style.top };
    return await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff", logging: false });
  };

  const exportPNG = async () => {
    setExporting(true);
    const canvas = await capture();
    if (!canvas) { setExporting(false); return; }
    const link = document.createElement("a");
    link.download = `${(design?.name || "network-design").replace(/\s+/g, "_")}_report.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
    setExporting(false);
  };

  const exportPDF = async () => {
    setExporting(true);
    const canvas = await capture();
    if (!canvas) { setExporting(false); return; }
    const imgData = canvas.toDataURL("image/png");
    const pxW = canvas.width / 2;
    const pxH = canvas.height / 2;
    const pdf = new jsPDF({ orientation: pxW > pxH ? "landscape" : "portrait", unit: "px", format: [pxW, pxH] });
    pdf.addImage(imgData, "PNG", 0, 0, pxW, pxH);
    pdf.save(`${(design?.name || "network-design").replace(/\s+/g, "_")}_report.pdf`);
    setExporting(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-2xl shadow-2xl flex flex-col" style={{ maxWidth: 980, width: "100%", maxHeight: "92vh" }} onClick={e => e.stopPropagation()}>
        {/* Modal header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border shrink-0">
          <div>
            <p className="font-semibold text-foreground">Export Design Report</p>
            <p className="text-xs text-muted-foreground mt-0.5">Includes topology diagram, device inventory, and cost estimate</p>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={exportPNG} disabled={exporting} className="gap-2">
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileImage className="h-3.5 w-3.5" />}
              Export PNG
            </Button>
            <Button size="sm" onClick={exportPDF} disabled={exporting} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
              {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FileText className="h-3.5 w-3.5" />}
              Export PDF
            </Button>
            <button onClick={onClose} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Scrollable preview */}
        <div className="overflow-auto flex-1 bg-slate-200 p-6">
          <div className="shadow-xl inline-block">
            <PrintReport design={design} nodes={nodes} links={links} reportRef={reportRef} />
          </div>
        </div>
      </div>
    </div>
  );
}