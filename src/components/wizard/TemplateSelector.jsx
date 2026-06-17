import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Plus, Check, Trash2, Loader2, MousePointer2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";

const BUILT_IN_TEMPLATES = [
  {
    id: "small-office",
    name: "Small Office",
    description: "Simple flat network for 10–50 users. Single site, basic firewall, wireless, and internet access.",
    icon: "🏠",
    category: "built-in",
    data: {
      topology_type: "star",
      routing_protocol: "Static",
      wan_technology: "Metro Ethernet",
      num_sites: 1,
      site_names: ["Office"],
      num_vlans_per_site: 2,
      vlan_names: ["Data", "Voice"],
      firewall_enabled: true,
      firewall_vendor: "Fortinet",
      dmz_required: false,
      redundancy_enabled: false,
      load_balancer: false,
      wireless_enabled: true,
      server_farm: false,
      num_servers: 0,
      router_model: "Cisco ISR",
      switch_model: "Cisco Catalyst",
      ip_scheme: "192.168.1.0/24",
      num_user_devices: 30,
      user_device_types: ["Laptop", "Phone"],
    },
  },
  {
    id: "enterprise-branch",
    name: "Enterprise Branch",
    description: "Multi-site hub-and-spoke WAN with OSPF routing, MPLS, redundancy, and segmented VLANs.",
    icon: "🏢",
    category: "built-in",
    data: {
      topology_type: "hub-and-spoke",
      routing_protocol: "OSPF",
      wan_technology: "MPLS",
      num_sites: 3,
      site_names: ["HQ", "Branch-1", "Branch-2"],
      num_vlans_per_site: 4,
      vlan_names: ["Management", "Data", "Voice", "Guest"],
      firewall_enabled: true,
      firewall_vendor: "Palo Alto",
      dmz_required: true,
      redundancy_enabled: true,
      load_balancer: false,
      wireless_enabled: true,
      server_farm: true,
      num_servers: 3,
      router_model: "Cisco ISR",
      switch_model: "Cisco Catalyst",
      ip_scheme: "10.0.0.0/8",
      num_user_devices: 150,
      user_device_types: ["Workstation", "Laptop", "Phone"],
    },
  },
  {
    id: "data-center",
    name: "Data Center",
    description: "High-availability data center with full-mesh topology, BGP, load balancing, and a large server farm.",
    icon: "🖥️",
    category: "built-in",
    data: {
      topology_type: "full-mesh",
      routing_protocol: "BGP",
      wan_technology: "Leased Line",
      num_sites: 1,
      site_names: ["DC-Primary"],
      num_vlans_per_site: 5,
      vlan_names: ["Management", "Storage", "Application", "DMZ", "Backup"],
      firewall_enabled: true,
      firewall_vendor: "Cisco ASA",
      dmz_required: true,
      redundancy_enabled: true,
      load_balancer: true,
      wireless_enabled: false,
      server_farm: true,
      num_servers: 5,
      router_model: "Cisco CSR1000v",
      switch_model: "Cisco Nexus",
      ip_scheme: "172.16.0.0/12",
      num_user_devices: 10,
      user_device_types: ["Workstation"],
    },
  },
  {
    id: "sd-wan",
    name: "SD-WAN Branch",
    description: "Modern SD-WAN deployment with BGP, multiple branches, and cloud-first connectivity.",
    icon: "🌐",
    category: "built-in",
    data: {
      topology_type: "partial-mesh",
      routing_protocol: "BGP",
      wan_technology: "SD-WAN",
      num_sites: 4,
      site_names: ["HQ", "East-Branch", "West-Branch", "Cloud-Hub"],
      num_vlans_per_site: 3,
      vlan_names: ["Corporate", "Guest", "IoT"],
      firewall_enabled: true,
      firewall_vendor: "Fortinet",
      dmz_required: false,
      redundancy_enabled: true,
      load_balancer: true,
      wireless_enabled: true,
      server_farm: false,
      num_servers: 0,
      router_model: "VyOS",
      switch_model: "Arista",
      ip_scheme: "10.10.0.0/16",
      num_user_devices: 200,
      user_device_types: ["Laptop", "Phone", "Workstation"],
    },
  },
  {
    id: "retail-chain",
    name: "Retail Chain",
    description: "Ring topology for retail stores with POS systems, wireless coverage, and centralized management.",
    icon: "🏪",
    category: "built-in",
    data: {
      topology_type: "ring",
      routing_protocol: "EIGRP",
      wan_technology: "DMVPN",
      num_sites: 5,
      site_names: ["HQ", "Store-1", "Store-2", "Store-3", "Store-4"],
      num_vlans_per_site: 3,
      vlan_names: ["POS", "Staff", "Guest-WiFi"],
      firewall_enabled: true,
      firewall_vendor: "pfSense",
      dmz_required: false,
      redundancy_enabled: false,
      load_balancer: false,
      wireless_enabled: true,
      server_farm: false,
      num_servers: 0,
      router_model: "Cisco ISR",
      switch_model: "Generic L2/L3",
      ip_scheme: "192.168.0.0/16",
      num_user_devices: 80,
      user_device_types: ["Workstation", "Phone"],
    },
  },
  {
    id: "ics-network",
    name: "ICS Network",
    description: "Industrial Control System network with segmented OT/IT zones, Purdue model hierarchy, SCADA historian, and air-gapped DMZ.",
    icon: "🏭",
    category: "built-in",
    data: {
      topology_type: "star",
      routing_protocol: "OSPF",
      wan_technology: "Leased Line",
      num_sites: 2,
      site_names: ["Control-Center", "Plant-Floor"],
      num_vlans_per_site: 5,
      vlan_names: ["Enterprise", "DMZ", "SCADA-Server", "Control", "Field-Devices"],
      firewall_enabled: true,
      firewall_vendor: "Cisco ASA",
      dmz_required: true,
      redundancy_enabled: true,
      load_balancer: false,
      wireless_enabled: false,
      server_farm: true,
      num_servers: 4,
      router_model: "Cisco ISR",
      switch_model: "Cisco Catalyst",
      ip_scheme: "192.168.100.0/22",
      num_user_devices: 20,
      user_device_types: ["HMI Terminal", "Engineering Workstation", "SCADA Server", "Historian Server"],
    },
  },
  {
    id: "scada-network",
    name: "SCADA Network",
    description: "Full SCADA deployment with RTUs, PLCs, master station, and redundant communications for critical infrastructure.",
    icon: "⚙️",
    category: "built-in",
    data: {
      topology_type: "hub-and-spoke",
      routing_protocol: "OSPF",
      wan_technology: "MPLS",
      num_sites: 3,
      site_names: ["Master-Station", "Remote-Site-1", "Remote-Site-2"],
      num_vlans_per_site: 4,
      vlan_names: ["OT-Control", "OT-Monitoring", "IT-Enterprise", "Management"],
      firewall_enabled: true,
      firewall_vendor: "Fortinet",
      dmz_required: true,
      redundancy_enabled: true,
      load_balancer: false,
      wireless_enabled: false,
      server_farm: true,
      num_servers: 5,
      router_model: "Cisco ISR",
      switch_model: "Cisco Catalyst",
      ip_scheme: "10.100.0.0/16",
      num_user_devices: 30,
      user_device_types: ["PLC", "RTU", "HMI Terminal", "SCADA Server", "Historian Server", "Engineering Workstation"],
    },
  },
];

export default function TemplateSelector({ onSelect, onBlank, onVisualDesign }) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const templatesRef = useRef(null);

  const { data: customTemplates = [], refetch } = useQuery({
    queryKey: ["network-templates"],
    queryFn: () => base44.entities.NetworkTemplate.filter({ category: "custom" }),
  });

  const handleDelete = async (tpl, e) => {
    e.stopPropagation();
    setDeleting(tpl.id);
    await base44.entities.NetworkTemplate.delete(tpl.id);
    await refetch();
    setDeleting(null);
    if (selected?.id === tpl.id) setSelected(null);
  };

  const handleApply = () => {
    if (!selected) return;
    let data;
    if (selected.category === "built-in") {
      data = selected.data;
    } else {
      try { data = JSON.parse(selected.template_data); } catch { data = {}; }
    }
    onSelect(data);
  };

  const allTemplates = [
    ...BUILT_IN_TEMPLATES,
    ...customTemplates.map(t => ({ ...t, isCustom: true })),
  ];

  return (
    <div className="min-h-screen py-10 px-4 bg-gradient-to-br from-black via-gray-950 to-red-950/20">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-foreground">{t("templateSelector.title")}</h1>
          <p className="text-muted-foreground mt-2">Create a detailed network topology.</p>
        </div>

        {/* Quick start options */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <button
            onClick={onBlank}
            className="text-left rounded-xl border border-gray-700 bg-gray-900/50 hover:border-primary/50 hover:bg-primary/10 p-5 transition-all group shadow-sm"
          >
            <div className="h-9 w-9 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center mb-3 group-hover:border-primary/40 transition-colors">
              <Plus className="h-5 w-5 text-gray-400 group-hover:text-primary transition-colors" />
            </div>
            <p className="font-bold text-sm text-gray-100 mb-1">{t("templateSelector.startFromScratch")}</p>
            <p className="text-xs text-gray-400 leading-relaxed">Answer a few guided questions to define your topology step by step. Best for when you know exactly what you want.</p>
          </button>

          {onVisualDesign && (
            <button
              onClick={onVisualDesign}
              className="text-left rounded-xl border border-primary/40 bg-primary/5 hover:border-primary/70 hover:bg-primary/10 p-5 transition-all group shadow-sm"
            >
              <div className="h-9 w-9 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center mb-3 group-hover:border-primary/50 transition-colors">
                <MousePointer2 className="h-5 w-5 text-primary" />
              </div>
              <p className="font-bold text-sm text-gray-100 mb-1">Visual Designer</p>
              <p className="text-xs text-gray-400 leading-relaxed">Drag and drop devices onto a canvas to visually build your network. Great for complex or custom topologies.</p>
            </button>
          )}

          <button
            onClick={() => templatesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            className="rounded-xl border border-gray-700 bg-gray-900/50 hover:border-primary/50 hover:bg-primary/10 p-5 transition-all group shadow-sm text-left"
          >
            <div className="h-9 w-9 rounded-lg bg-gray-800 border border-gray-700 flex items-center justify-center mb-3 group-hover:border-primary/40 transition-colors">
              <span className="text-base">📋</span>
            </div>
            <p className="font-bold text-sm text-gray-100 mb-1">Use a Template</p>
            <p className="text-xs text-gray-400 leading-relaxed">Pick from pre-built topologies like Enterprise, Data Center, SD-WAN, or ICS/SCADA. Instantly pre-fills all settings.</p>
          </button>
        </div>

        {/* Strong separator */}
        <div className="my-12 flex items-center gap-4">
          <div className="flex-1 h-px bg-border"></div>
          <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Choose a Template</p>
          <div className="flex-1 h-px bg-border"></div>
        </div>

        <div ref={templatesRef} className="scroll-mt-4"></div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
           {allTemplates.map((tpl) => {
             const isSelected = selected?.id === tpl.id;
             return (
               <button
                 key={tpl.id}
                 onClick={() => setSelected(isSelected ? null : tpl)}
                 className={`relative text-left rounded-xl border p-5 transition-all group
                   ${isSelected
                     ? "border-primary bg-primary/10 shadow-lg shadow-primary/20"
                     : "border-gray-700 bg-gray-900/50 hover:border-primary/50 hover:bg-primary/5"
                   }`}
               >
                 {isSelected && (
                   <div className="absolute top-3 right-3 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                     <Check className="h-3 w-3 text-primary-foreground" />
                   </div>
                 )}
                 {tpl.isCustom && !isSelected && (
                   <button
                     onClick={(e) => handleDelete(tpl, e)}
                     className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity h-6 w-6 rounded flex items-center justify-center bg-destructive/20 hover:bg-destructive/40 text-destructive"
                   >
                     {deleting === tpl.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Trash2 className="h-3 w-3" />}
                   </button>
                 )}
                 <div className="text-2xl mb-3">{tpl.icon || "📋"}</div>
                 <div className="flex items-center gap-2 mb-1">
                   <h3 className="font-bold text-sm text-gray-100">{tpl.name}</h3>
                   {tpl.category === "built-in"
                     ? <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/15 text-primary font-medium">{t("templateSelector.builtIn")}</span>
                     : <span className="text-[10px] px-1.5 py-0.5 rounded bg-secondary border border-border text-muted-foreground font-medium">{t("templateSelector.custom")}</span>
                   }
                 </div>
                 <p className="text-xs text-gray-400 leading-relaxed">{tpl.description || tpl.name}</p>
               </button>
             );
           })}
        </div>

        <div className="flex justify-end">
          <Button
            onClick={handleApply}
            disabled={!selected}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {t("templateSelector.useTemplate")}
          </Button>
        </div>
      </div>
    </div>
  );
}