import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Download, Loader2, Copy, Check, Package, FileCode, FileText, Users, Network, Archive } from "lucide-react";
import { toast } from "sonner";
import JSZip from "jszip";
import { jsPDF } from "jspdf";
import { parseBase, generateDeviceConfig, configFileExtension, detectVendor } from "./deviceConfigGenerators";

// ── IP allocation helpers ─────────────────────────────────────────────────────

function allocateNetworkIPs(design) {
  const [b1, b2] = parseBase(design?.ip_scheme);
  const sites = design?.site_names?.filter(Boolean).length
    ? design.site_names.filter(Boolean)
    : Array.from({ length: design?.num_sites || 1 }, (_, i) => `Site${i + 1}`);

  // WAN links: 10.X.0.0/30 subnets (b1.b2.link_idx.0/30)
  // LAN networks: 10.X.site_idx.0/24
  const allocs = {};

  // Core loopback / management
  allocs["Core-Router"] = { loopback: `${b1}.${b2}.0.1/32`, mgmt: `${b1}.${b2}.255.1/24` };
  allocs["Core-Switch"] = { mgmt: `${b1}.${b2}.255.2/24` };
  if (design?.firewall_enabled) {
    allocs["Firewall"] = {
      outside: `${b1}.${b2}.0.2/30`,
      inside: `${b1}.${b2}.0.5/30`,
      dmz: design?.dmz_required ? `${b1}.${b2}.0.9/30` : null,
    };
  }
  if (design?.load_balancer) allocs["LoadBalancer"] = { vip: `${b1}.${b2}.0.50/24` };

  sites.forEach((site, i) => {
    const siteNet = `${b1}.${b2}.${i + 1}`;
    const wanNet = `${b1}.${b2 + 100}.${i * 4}`;
    allocs[`${site}-Router`] = {
      wan: `${wanNet}.1/30`,
      lan: `${siteNet}.1/24`,
      loopback: `${b1}.${b2}.0.${10 + i}/32`,
    };
    allocs[`${site}-Switch`] = { mgmt: `${siteNet}.2/24` };
    if (design?.firewall_enabled) allocs[`${site}-Firewall`] = { outside: `${siteNet}.253/24`, inside: `${siteNet}.254/24` };
    if (design?.wireless_enabled) allocs[`${site}-WAP`] = { ip: `${siteNet}.10/24`, gateway: `${siteNet}.1` };
  });

  if (design?.server_farm) {
    allocs["DC-CoreRouter"] = { wan: `${b1}.${b2}.200.1/30`, lan: `${b1}.${b2}.200.1/24`, loopback: `${b1}.${b2}.0.100/32` };
    allocs["DC-CoreSwitch"] = { mgmt: `${b1}.${b2}.200.2/24` };
    for (let i = 1; i <= Math.min(design.num_servers || 2, 4); i++) {
      allocs[`Server-${i}`] = { ip: `${b1}.${b2}.200.${10 + i}/24`, gateway: `${b1}.${b2}.200.1` };
    }
  }

  return allocs;
}

// ── Link topology ─────────────────────────────────────────────────────────────
function buildLinks(design) {
  const sites = design?.site_names?.filter(Boolean).length
    ? design.site_names.filter(Boolean)
    : Array.from({ length: design?.num_sites || 1 }, (_, i) => `Site${i + 1}`);

  const links = [];
  const coreRouter = "Core-Router";
  const coreSwitch = "Core-Switch";

  if (design?.firewall_enabled) {
    links.push({ from: "Internet/ISP", to: "Firewall", iface_from: "Gi0/0", iface_to: "outside" });
    links.push({ from: "Firewall", to: coreRouter, iface_from: "inside", iface_to: "Gi0/0" });
  } else {
    links.push({ from: "Internet/ISP", to: coreRouter, iface_from: "—", iface_to: "Gi0/0" });
  }
  links.push({ from: coreRouter, to: coreSwitch, iface_from: "Gi0/1", iface_to: "Gi0/0" });
  if (design?.load_balancer) {
    links.push({ from: coreSwitch, to: "LoadBalancer", iface_from: "Gi0/1", iface_to: "Gi0/0" });
  }
  if (design?.server_farm) {
    links.push({ from: coreSwitch, to: "DC-CoreRouter", iface_from: "Gi0/2", iface_to: "Gi0/0" });
    links.push({ from: "DC-CoreRouter", to: "DC-CoreSwitch", iface_from: "Gi0/1", iface_to: "Gi0/0" });
    for (let i = 1; i <= Math.min(design.num_servers || 2, 4); i++) {
      links.push({ from: "DC-CoreSwitch", to: `Server-${i}`, iface_from: `Fa0/${i - 1}`, iface_to: "eth0" });
    }
  }
  sites.forEach((site, i) => {
    links.push({ from: coreSwitch, to: `${site}-Router`, iface_from: `Gi0/${3 + i}`, iface_to: "Gi0/0", wan: true });
    links.push({ from: `${site}-Router`, to: `${site}-Switch`, iface_from: "Gi0/1", iface_to: "Gi0/0" });
    if (design?.firewall_enabled) links.push({ from: `${site}-Switch`, to: `${site}-Firewall`, iface_from: "Gi0/1", iface_to: "outside" });
    if (design?.wireless_enabled) links.push({ from: `${site}-Switch`, to: `${site}-WAP`, iface_from: "Gi0/2", iface_to: "eth0" });
  });
  return links;
}

// ── Device list builder ───────────────────────────────────────────────────────
function buildDeviceList(design) {
  if (!design) return [];
  const sites = design.site_names?.filter(Boolean).length
    ? design.site_names.filter(Boolean)
    : Array.from({ length: design.num_sites || 1 }, (_, i) => `Site${i + 1}`);
  const devices = [];
  if (design.firewall_enabled) devices.push({ name: "Firewall", label: design.firewall_vendor || "Firewall", type: "firewall" });
  devices.push({ name: "Core-Router", label: "Core Router", type: "router" });
  devices.push({ name: "Core-Switch", label: "Core Switch", type: "switch" });
  if (design.load_balancer) devices.push({ name: "LoadBalancer", label: "Load Balancer", type: "loadbalancer" });
  sites.forEach(site => {
    devices.push({ name: `${site}-Router`, label: `${site} Router`, type: "router" });
    devices.push({ name: `${site}-Switch`, label: `${site} Switch`, type: "switch" });
    if (design.firewall_enabled) devices.push({ name: `${site}-Firewall`, label: `${site} Firewall`, type: "firewall" });
    if (design.wireless_enabled) devices.push({ name: `${site}-WAP`, label: `${site} WAP`, type: "wireless" });
  });
  if (design.server_farm) {
    devices.push({ name: "DC-CoreRouter", label: "DC Core Router", type: "router" });
    devices.push({ name: "DC-CoreSwitch", label: "DC Core Switch", type: "switch" });
    for (let i = 1; i <= Math.min(design.num_servers || 2, 4); i++) {
      devices.push({ name: `Server-${i}`, label: `Server ${i}`, type: "server" });
    }
  }
  return devices;
}

// ── Markdown builders ────────────────────────────────────────────────────────
function buildEvengScript(design, eventData) {
  const devices = buildDeviceList(design);
  const slug = (eventData.title || "CyberEvent").replace(/[^a-zA-Z0-9_]/g, "_");
  return `#!/usr/bin/env python3
"""EVE-NG Lab Script — ${eventData.title || "Cyber Exercise"}
Generated by Xtreme I.C.E. Network Designer
"""
import requests, json, sys

EVE_HOST = "http://YOUR-EVE-NG-HOST"   # <-- Update this
EVE_USER = "admin"
EVE_PASS = "eve"
LAB_NAME = "${slug}"

session = requests.Session()
r = session.post(f"{EVE_HOST}/api/auth/login", json={"username": EVE_USER, "password": EVE_PASS})
if r.status_code != 200:
    print("Login failed:", r.text); sys.exit(1)

lab_resp = session.post(f"{EVE_HOST}/api/labs", json={
    "name": LAB_NAME,
    "description": ${JSON.stringify(eventData.description || "")},
    "version": "1",
    "author": "Xtreme I.C.E."
})
print("Lab created:", lab_resp.status_code)
lab_path = f"/{LAB_NAME}.unl"

nodes = ${JSON.stringify(devices.map((d, i) => ({
  name: d.name,
  template: d.type === "router" ? "vios" : d.type === "firewall" ? "asav" : "viosl2",
  left: 80 + (i % 5) * 180,
  top: 80 + Math.floor(i / 5) * 140,
})), null, 2)}

node_ids = {}
for node in nodes:
    resp = session.post(f"{EVE_HOST}/api/labs{lab_path}/nodes", json={
        "name": node["name"], "type": "qemu", "template": node["template"],
        "left": node["left"], "top": node["top"], "ram": 512, "ethernet": 4,
    })
    data = resp.json()
    node_ids[node["name"]] = data.get("data", {}).get("id")
    print(f"Added node: {node['name']} -> id={node_ids[node['name']]}")

session.post(f"{EVE_HOST}/api/labs{lab_path}/networks", json={
    "name": "Management", "type": "bridge", "left": 400, "top": 20
})

print(f"\\nLab '{LAB_NAME}' created in EVE-NG!")
print("Apply configs from configs/ to each node startup config.")
`;
}

function buildFullDocumentation(eventData, design, links) {
  const devices = buildDeviceList(design);
  const ingress = eventData.ingress_points || [];
  const byTeam = (t) => ingress.filter(p => p.team === t);
  const ingressSection = (team) => {
    const pts = byTeam(team);
    if (pts.length === 0) return "_No ingress points defined._\n";
    return pts.map(p => `**Role:** ${p.role}\n- **System:** ${p.system}\n- **IP Address:** \`${p.ip}\`\n- **Credentials:** \`${p.credentials}\`\n- **Description:** ${p.description || "N/A"}`).join("\n\n---\n\n");
  };

  const linkTable = links.length > 0 ? [
    "| From Device | Interface | To Device | Interface | Type |",
    "|-------------|-----------|-----------|-----------|------|",
    ...links.map(l => `| ${l.from} | ${l.iface_from || "—"} | ${l.to} | ${l.iface_to || "—"} | ${l.wan ? "WAN" : "LAN"} |`)
  ].join("\n") : "_No links defined._";

  return `# ${eventData.title || "Cyber Exercise Event"}
## Red Team vs Blue Team Exercise
**Generated by Xtreme I.C.E. Network Designer** | ${new Date().toLocaleDateString()}

---

## 📋 Overview
${eventData.description || eventData.scenario_prompt || ""}

| Parameter | Value |
|-----------|-------|
| Difficulty | ${eventData.difficulty || "Intermediate"} |
| Duration | ${eventData.duration_minutes || 120} minutes |
| Red Team Size | ${eventData.red_team_size || 2} |
| Blue Team Size | ${eventData.blue_team_size || 2} |
| White Team Size | ${eventData.white_team_size || 1} |

---

## 📜 Rules of Engagement
${eventData.rules_of_engagement || "_Not defined._"}

---

## 🔴 RED TEAM (MITRE ATT&CK Framework)

### Objectives
${(eventData.red_team_objectives || []).map((o, i) => `${i + 1}. ${o}`).join("\n") || "_None defined._"}

### Mission Briefing
${eventData.red_team_directions || "_No directions generated._"}

### Ingress Points
${ingressSection("red")}

---

## 🔵 BLUE TEAM (NICE Cybersecurity Workforce Framework)

### Objectives
${(eventData.blue_team_objectives || []).map((o, i) => `${i + 1}. ${o}`).join("\n") || "_None defined._"}

### Mission Briefing
${eventData.blue_team_directions || "_No directions generated._"}

### Ingress Points
${ingressSection("blue")}

---

## ⚪ WHITE TEAM / EVENT CONTROLLER

### Objectives
${(eventData.white_team_objectives || []).map((o, i) => `${i + 1}. ${o}`).join("\n") || "_None defined._"}

### Instructions
${eventData.white_team_directions || "_No directions generated._"}

### Ingress Points
${ingressSection("white")}

---

## 🏆 SCORING CRITERIA
${eventData.scoring_criteria || "_Not defined._"}

---

## 🌐 NETWORK TOPOLOGY
${eventData.topology_summary || ""}
${design ? `
| Field | Value |
|-------|-------|
| Design Name | ${design.name} |
| Topology | ${design.topology_type} |
| Routing Protocol | ${design.routing_protocol} |
| WAN Technology | ${design.wan_technology} |
| Sites | ${design.num_sites} |
| IP Scheme | ${design.ip_scheme || "10.0.0.0/8"} |
| Firewall | ${design.firewall_enabled ? "Yes — " + (design.firewall_vendor || "Generic") : "No"} |
| DMZ | ${design.dmz_required ? "Yes" : "No"} |` : "_No network design linked._"}

### Link Table
${linkTable}

---

## 🖥️ DEVICE INVENTORY
${devices.length === 0 ? "_No devices._" : devices.map(d => `- **${d.label}** (\`${d.name}.cfg\`) — ${d.type}`).join("\n")}

---

## 🔧 SETUP GUIDE

### EVE-NG Import
\`\`\`bash
pip install requests
# Edit EVE_HOST, EVE_USER, EVE_PASS in eveng_lab.py
python3 eveng_lab.py
\`\`\`

### Team Packet Distribution
- 🔴 **Red Team:** \`RED_TEAM_PACKET.pdf\` only
- 🔵 **Blue Team:** \`BLUE_TEAM_PACKET.pdf\` only
- ⚪ **White Team:** Holds master \`DOCUMENTATION.md\`

### Environment Checklist
- [ ] EVE-NG / GNS3 deployed and accessible
- [ ] VM images available (Kali Linux, Windows Server 2022, Ubuntu 22.04)
- [ ] Monitoring stack deployed (Wazuh, Splunk, Zeek)
- [ ] Scoreboard configured
- [ ] Event timer set to **${eventData.duration_minutes || 120} minutes**

---
*Generated by Xtreme I.C.E. Network Designer — Red vs Blue Event Builder*
`;
}

function buildTeamPacketText(team, eventData, design, ipAllocs) {
  const cfg = {
    red: { emoji: "🔴", label: "RED TEAM", framework: "MITRE ATT&CK", objKey: "red_team_objectives", dirKey: "red_team_directions" },
    blue: { emoji: "🔵", label: "BLUE TEAM", framework: "NICE Framework", objKey: "blue_team_objectives", dirKey: "blue_team_directions" },
    white: { emoji: "⚪", label: "WHITE TEAM", framework: "Event Controller", objKey: "white_team_objectives", dirKey: "white_team_directions" },
  }[team];
  const ingress = (eventData.ingress_points || []).filter(p => p.team === team);
  return {
    title: `${cfg.emoji} ${cfg.label} PACKET`,
    subtitle: `${eventData.title || "Cyber Exercise"} — ${cfg.framework}`,
    objectives: eventData[cfg.objKey] || [],
    roe: eventData.rules_of_engagement || "See white team for full RoE.",
    directions: eventData[cfg.dirKey] || "No directions generated.",
    ingress,
    team,
    emoji: cfg.emoji,
    label: cfg.label,
    framework: cfg.framework,
  };
}

// ── Generate PDF for a team packet ───────────────────────────────────────────
function generateTeamPDF(packetData) {
  const pdf = new jsPDF({ orientation: "portrait", unit: "pt", format: "letter" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const margin = 50;
  const contentW = pageW - margin * 2;
  let y = margin;

  const colors = {
    red: [220, 38, 38],
    blue: [37, 99, 235],
    white: [100, 116, 139],
  };
  const teamColor = colors[packetData.team] || [0, 0, 0];

  const checkPage = (needed = 20) => {
    if (y + needed > pageH - 40) { pdf.addPage(); y = margin; }
  };

  const drawSectionHeader = (text) => {
    checkPage(30);
    pdf.setFillColor(...teamColor);
    pdf.rect(margin, y, contentW, 20, "F");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.setTextColor(255, 255, 255);
    pdf.text(text, margin + 8, y + 14);
    pdf.setTextColor(0, 0, 0);
    y += 28;
  };

  const drawText = (text, fontSize = 10, bold = false, color = [30, 30, 30]) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(fontSize);
    pdf.setTextColor(...color);
    const lines = pdf.splitTextToSize(text, contentW);
    lines.forEach(line => {
      checkPage(fontSize + 4);
      pdf.text(line, margin, y);
      y += fontSize + 4;
    });
    y += 2;
  };

  // Header banner
  pdf.setFillColor(...teamColor);
  pdf.rect(0, 0, pageW, 70, "F");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(22);
  pdf.setTextColor(255, 255, 255);
  pdf.text(packetData.title, margin, 35);
  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(12);
  pdf.text(packetData.subtitle, margin, 55);
  pdf.setTextColor(0, 0, 0);
  y = 90;

  // Classification banner
  pdf.setFillColor(254, 252, 232);
  pdf.setDrawColor(253, 224, 71);
  pdf.rect(margin, y, contentW, 22, "FD");
  pdf.setFont("helvetica", "bold");
  pdf.setFontSize(9);
  pdf.setTextColor(113, 63, 18);
  pdf.text(`⚠  FOR ${packetData.label} EYES ONLY — DO NOT SHARE WITH OTHER TEAMS`, margin + 8, y + 15);
  pdf.setTextColor(0, 0, 0);
  y += 32;

  // Objectives
  drawSectionHeader("OBJECTIVES");
  if (packetData.objectives.length === 0) {
    drawText("No objectives defined.", 10, false, [120, 120, 120]);
  } else {
    packetData.objectives.forEach((o, i) => drawText(`${i + 1}. ${o}`));
  }

  // Rules of Engagement
  drawSectionHeader("RULES OF ENGAGEMENT");
  drawText(packetData.roe);

  // Directions / Mission Briefing
  drawSectionHeader("MISSION BRIEFING / DIRECTIONS");
  drawText(packetData.directions);

  // Ingress Points
  drawSectionHeader("YOUR INGRESS POINTS");
  if (packetData.ingress.length === 0) {
    drawText("No ingress points defined.", 10, false, [120, 120, 120]);
  } else {
    packetData.ingress.forEach((p, i) => {
      checkPage(70);
      if (i > 0) y += 6;
      drawText(`Role: ${p.role}`, 10, true);
      drawText(`System: ${p.system}`);
      drawText(`IP Address: ${p.ip}`, 10, false, [37, 99, 235]);
      drawText(`Credentials: ${p.credentials}`, 10, false, [220, 38, 38]);
      if (p.description) drawText(`Note: ${p.description}`, 9, false, [100, 116, 139]);
      y += 4;
    });
  }

  // Footer on each page
  const totalPages = pdf.internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    pdf.setPage(i);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    pdf.text(
      `Generated by Xtreme I.C.E. Network Designer | Page ${i} of ${totalPages} | ${packetData.label} CONFIDENTIAL`,
      pageW / 2, pageH - 20, { align: "center" }
    );
  }

  return pdf.output("arraybuffer");
}

// ── Main component ────────────────────────────────────────────────────────────
export default function StepExportBundle({ eventData, savedEventId, onSave }) {
  const [generating, setGenerating] = useState(false);
  const [bundle, setBundle] = useState(null);
  const [copied, setCopied] = useState("");

  const { data: design } = useQuery({
    queryKey: ["design-for-export", eventData.network_design_id],
    queryFn: () => base44.entities.NetworkDesign.filter({ id: eventData.network_design_id }),
    select: d => d[0],
    enabled: !!eventData.network_design_id,
  });

  const handleGenerate = async () => {
    setGenerating(true);
    if (onSave) await onSave();

    const devices = buildDeviceList(design);
    const ipAllocs = allocateNetworkIPs(design);
    const links = buildLinks(design);
    const deviceConfigs = devices.map(d => ({
      name: d.name,
      label: d.label,
      ext: configFileExtension(d, design),
      vendor: detectVendor(d, design),
      config: generateDeviceConfig(d, design, ipAllocs, links),
    }));

    const docs = buildFullDocumentation(eventData, design, links);
    const evengScript = buildEvengScript(design, eventData);

    const redData = buildTeamPacketText("red", eventData, design, ipAllocs);
    const blueData = buildTeamPacketText("blue", eventData, design, ipAllocs);
    const whiteData = buildTeamPacketText("white", eventData, design, ipAllocs);

    setBundle({ docs, evengScript, deviceConfigs, redData, blueData, whiteData });

    if (savedEventId) {
      await base44.entities.CyberEvent.update(savedEventId, {
        export_bundle: JSON.stringify({ generated_at: new Date().toISOString() }),
      }).catch(() => {});
    }
    setGenerating(false);
    toast.success("Export bundle ready!");
  };

  const downloadZip = async () => {
    if (!bundle) return;
    const slug = (eventData.title || "CyberEvent").replace(/[^a-zA-Z0-9_]/g, "_");
    const zip = new JSZip();

    zip.file("DOCUMENTATION.md", bundle.docs);
    zip.file("eveng_lab.py", bundle.evengScript);

    // Team packets as PDFs
    zip.file("TEAM_PACKETS/RED_TEAM_PACKET.pdf", generateTeamPDF(bundle.redData));
    zip.file("TEAM_PACKETS/BLUE_TEAM_PACKET.pdf", generateTeamPDF(bundle.blueData));
    zip.file("TEAM_PACKETS/WHITE_TEAM_PACKET.pdf", generateTeamPDF(bundle.whiteData));

    // Device configs (vendor-appropriate file extension)
    const configs = zip.folder("configs");
    bundle.deviceConfigs.forEach(d => configs.file(`${d.name}${d.ext}`, d.config));

    const blob = await zip.generateAsync({ type: "blob" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slug}_CyberEvent_Bundle.zip`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("ZIP downloaded with PDF team packets!");
  };

  const downloadFile = (filename, content) => {
    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadTeamPDF = (data, filename) => {
    const pdfBytes = generateTeamPDF(data);
    const blob = new Blob([pdfBytes], { type: "application/pdf" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  const copyToClipboard = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(""), 2000);
  };

  const slug = (eventData.title || "CyberEvent").replace(/[^a-zA-Z0-9_]/g, "_");

  const missingFields = [
    !eventData.red_team_directions && "Red Team Directions",
    !eventData.blue_team_directions && "Blue Team Directions",
    !(eventData.red_team_objectives?.length) && "Red Team Objectives",
    !(eventData.blue_team_objectives?.length) && "Blue Team Objectives",
    !eventData.rules_of_engagement && "Rules of Engagement",
    !eventData.scoring_criteria && "Scoring Criteria",
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-foreground mb-1">Link & Export Bundle</h2>
        <p className="text-sm text-muted-foreground">
          Generates a ZIP with full documentation, EVE-NG script, per-device configs with IPs & links, and PDF team packets.
        </p>
      </div>

      {missingFields.length > 0 && (
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
          <p className="text-xs font-semibold text-yellow-400 mb-2">⚠️ Some fields are empty — go back to fill them in for a complete export:</p>
          <ul className="flex flex-wrap gap-2">
            {missingFields.map(f => (
              <li key={f} className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-500/30 text-yellow-300">{f}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Scenario summary */}
      <div className="bg-secondary border border-border rounded-xl p-4 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Scenario Summary</p>
        <p className="text-sm font-bold text-foreground">{eventData.title || "Untitled Event"}</p>
        <div className="flex flex-wrap gap-2 text-[10px]">
          {eventData.difficulty && <span className="px-2 py-0.5 rounded-full bg-card border border-border text-muted-foreground">{eventData.difficulty}</span>}
          {eventData.duration_minutes && <span className="px-2 py-0.5 rounded-full bg-card border border-border text-muted-foreground">{eventData.duration_minutes} min</span>}
          <span className={`px-2 py-0.5 rounded-full border font-medium ${eventData.red_team_objectives?.length ? "bg-red-500/10 border-red-500/30 text-red-400" : "bg-secondary border-border text-muted-foreground"}`}>
            🔴 {eventData.red_team_objectives?.length || 0} red objectives
          </span>
          <span className={`px-2 py-0.5 rounded-full border font-medium ${eventData.blue_team_objectives?.length ? "bg-blue-500/10 border-blue-500/30 text-blue-400" : "bg-secondary border-border text-muted-foreground"}`}>
            🔵 {eventData.blue_team_objectives?.length || 0} blue objectives
          </span>
          <span className={`px-2 py-0.5 rounded-full border ${eventData.ingress_points?.length ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-secondary border-border text-muted-foreground"}`}>
            {eventData.ingress_points?.length || 0} ingress points
          </span>
          {eventData.network_design_id && <span className="px-2 py-0.5 rounded-full bg-primary/10 border border-primary/30 text-primary">Network linked ✓</span>}
        </div>
      </div>

      {/* What's included */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { icon: FileText, label: "Master Docs", desc: "Full documentation with link table & IP scheme" },
          { icon: FileCode, label: "EVE-NG Script", desc: "Python script to auto-build the lab" },
          { icon: Network, label: "Device Configs", desc: "Cisco IOS, Juniper JunOS & Palo Alto PAN-OS with hardening" },
          { icon: Users, label: "PDF Team Packets", desc: "Printable PDF packets for Red / Blue / White" },
        ].map(item => (
          <div key={item.label} className="bg-card border border-border rounded-xl p-4 text-center space-y-2">
            <item.icon className="h-6 w-6 text-primary mx-auto" />
            <p className="text-xs font-semibold text-foreground">{item.label}</p>
            <p className="text-[10px] text-muted-foreground leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>

      <Button onClick={handleGenerate} disabled={generating} className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
        {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Package className="h-4 w-4" />}
        {generating ? "Building Bundle…" : "Generate Export Bundle"}
      </Button>

      {bundle && (
        <div className="space-y-4">
          {/* ZIP download */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-green-400 flex items-center gap-2">
                <Archive className="h-4 w-4" /> Bundle Ready
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {bundle.deviceConfigs.length} device configs + PDF team packets (Red/Blue/White)
              </p>
            </div>
            <Button onClick={downloadZip} className="gap-2 bg-green-600 hover:bg-green-700 text-white shrink-0">
              <Download className="h-4 w-4" /> Download ZIP
            </Button>
          </div>

          {/* PDF Team Packets */}
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-secondary border-b border-border">
              <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-primary" /> PDF Team Packets (individual download)
              </span>
            </div>
            <div className="divide-y divide-border">
              {[
                { data: bundle.redData, label: "🔴 Red Team Packet", filename: "RED_TEAM_PACKET.pdf", color: "text-red-400" },
                { data: bundle.blueData, label: "🔵 Blue Team Packet", filename: "BLUE_TEAM_PACKET.pdf", color: "text-blue-400" },
                { data: bundle.whiteData, label: "⚪ White Team Packet", filename: "WHITE_TEAM_PACKET.pdf", color: "text-slate-400" },
              ].map(({ data, label, filename, color }) => (
                <div key={filename} className="flex items-center justify-between px-4 py-3">
                  <span className={`text-xs font-semibold ${color}`}>{label}</span>
                  <button onClick={() => downloadTeamPDF(data, filename)} className="text-xs text-primary hover:underline flex items-center gap-1">
                    <Download className="h-3 w-3" /> Download PDF
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Documentation preview */}
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-secondary border-b border-border">
              <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                <FileText className="h-3.5 w-3.5 text-primary" /> DOCUMENTATION.md
              </span>
              <div className="flex gap-3">
                <button onClick={() => copyToClipboard(bundle.docs, "docs")} className="text-xs text-muted-foreground hover:text-foreground">
                  {copied === "docs" ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => downloadFile(`${slug}_DOCUMENTATION.md`, bundle.docs)} className="text-xs text-primary hover:underline">Download</button>
              </div>
            </div>
            <pre className="p-4 text-xs overflow-y-auto max-h-40 leading-relaxed whitespace-pre-wrap text-muted-foreground">
              {bundle.docs}
            </pre>
          </div>

          {/* EVE-NG Script */}
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-secondary border-b border-border">
              <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                <FileCode className="h-3.5 w-3.5 text-primary" /> eveng_lab.py
              </span>
              <div className="flex gap-3">
                <button onClick={() => copyToClipboard(bundle.evengScript, "eveng")} className="text-xs text-muted-foreground hover:text-foreground">
                  {copied === "eveng" ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
                <button onClick={() => downloadFile(`${slug}_eveng_lab.py`, bundle.evengScript)} className="text-xs text-primary hover:underline">Download</button>
              </div>
            </div>
            <pre className="p-4 text-xs overflow-y-auto max-h-40 leading-relaxed whitespace-pre-wrap bg-[#0a0e1a] text-green-400 font-mono">
              {bundle.evengScript}
            </pre>
          </div>

          {/* Device configs list */}
          <div className="border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 bg-secondary border-b border-border flex items-center justify-between">
              <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                <Network className="h-3.5 w-3.5 text-primary" /> Device Configs — {bundle.deviceConfigs.length} files (IPs, links & hardening pre-configured)
              </span>
              <div className="flex gap-1.5 text-[9px]">
                {["cisco", "juniper", "paloalto"].map(v => {
                  const count = bundle.deviceConfigs.filter(d => d.vendor === v).length;
                  if (!count) return null;
                  const colors = { cisco: "text-blue-400 bg-blue-500/10 border-blue-500/30", juniper: "bg-orange-500/10 border-orange-500/30 text-orange-400", paloalto: "bg-red-500/10 border-red-500/30 text-red-400" };
                  const labels = { cisco: "Cisco IOS", juniper: "Juniper JunOS", paloalto: "Palo Alto PAN-OS" };
                  return <span key={v} className={`px-1.5 py-0.5 rounded border font-medium ${colors[v]}`}>{count}× {labels[v]}</span>;
                })}
              </div>
            </div>
            <div className="divide-y divide-border max-h-56 overflow-y-auto">
              {bundle.deviceConfigs.map(d => (
                <div key={d.name} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-foreground font-mono">{d.name}{d.ext}</span>
                    <span className={`text-[9px] px-1.5 py-0.5 rounded border font-medium ${
                      d.vendor === "juniper" ? "bg-orange-500/10 border-orange-500/20 text-orange-400" :
                      d.vendor === "paloalto" ? "bg-red-500/10 border-red-500/20 text-red-400" :
                      "bg-blue-500/10 border-blue-500/20 text-blue-400"
                    }`}>{d.vendor === "paloalto" ? "PAN-OS" : d.vendor === "juniper" ? "JunOS" : "IOS"}</span>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={() => copyToClipboard(d.config, d.name)} className="text-xs text-muted-foreground hover:text-foreground">
                      {copied === d.name ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                    </button>
                    <button onClick={() => downloadFile(`${d.name}${d.ext}`, d.config)} className="text-xs text-primary hover:underline">Download</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}