import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Factory, Cpu, Building2, Server, Activity, Landmark, Loader2, Zap, ArrowRight, Layers, Globe, Shield } from "lucide-react";
import { motion } from "framer-motion";

const NETWORK_PRESETS = [
  {
    id: "scada-ics",
    name: "SCADA / ICS",
    icon: Factory,
    color: "#dc2626",
    description: "Industrial control system with PLCs, SCADA servers, and HMIs across a control center and remote site, segmented by a Palo Alto firewall with a DMZ historian zone.",
    layers: ["OT-Control VLAN", "DMZ Historian", "MPLS WAN", "Purdue Model Segmentation"],
    preset: {
      name: "SCADA/ICS Industrial Network",
      company_name: "Industrial Operations",
      num_sites: 2,
      site_names: ["Control Center", "Remote Site"],
      topology_type: "hub-and-spoke",
      routing_protocol: "OSPF",
      wan_technology: "MPLS",
      firewall_enabled: true,
      firewall_vendor: "Palo Alto",
      dmz_required: true,
      redundancy_enabled: true,
      load_balancer: false,
      wireless_enabled: false,
      server_farm: true,
      num_servers: 3,
      router_model: "Cisco ISR",
      switch_model: "Cisco Catalyst",
      ip_scheme: "10.0.0.0/8",
      num_vlans_per_site: 3,
      vlan_names: ["Management", "OT-Control", "DMZ-Historian"],
      num_user_devices: 8,
      user_device_types: ["PLC", "SCADA", "HMI"],
      domain_name: "scada.local",
      ntp_server: "10.0.0.1",
      dns_servers: ["10.0.0.2", "10.0.0.3"],
      status: "draft",
    },
  },
  {
    id: "iot",
    name: "IoT Network",
    icon: Cpu,
    color: "#059669",
    description: "Internet of Things campus with wireless sensor gateways, cloud connectivity, and a Fortinet firewall. High device count with lightweight segmentation.",
    layers: ["IoT Device VLAN", "Wireless AP", "Cloud WAN", "Gateway Segmentation"],
    preset: {
      name: "IoT Sensor Network",
      company_name: "IoT Operations",
      num_sites: 1,
      site_names: ["IoT Campus"],
      topology_type: "star",
      routing_protocol: "Static",
      wan_technology: "Broadband",
      firewall_enabled: true,
      firewall_vendor: "Fortinet",
      dmz_required: false,
      redundancy_enabled: false,
      load_balancer: false,
      wireless_enabled: true,
      server_farm: true,
      num_servers: 2,
      router_model: "Cisco ISR",
      switch_model: "Cisco Catalyst",
      ip_scheme: "192.168.0.0/16",
      num_vlans_per_site: 2,
      vlan_names: ["Management", "IoT-Devices"],
      num_user_devices: 12,
      user_device_types: ["IoT Sensor", "IoT Sensor", "IoT Gateway"],
      domain_name: "iot.local",
      ntp_server: "192.168.1.1",
      dns_servers: ["192.168.1.2", "8.8.8.8"],
      status: "draft",
    },
  },
  {
    id: "enterprise",
    name: "Enterprise Corporate",
    icon: Building2,
    color: "#3b82f6",
    description: "Multi-site corporate network with HQ and branch offices, DMZ, load balancer, wireless, and redundant MPLS WAN links. The classic enterprise reference architecture.",
    layers: ["Corporate LAN", "DMZ", "MPLS WAN", "Wireless Guest", "Server Farm"],
    preset: {
      name: "Enterprise Corporate Network",
      company_name: "Enterprise Corp",
      num_sites: 3,
      site_names: ["HQ", "Branch-1", "Branch-2"],
      topology_type: "hub-and-spoke",
      routing_protocol: "OSPF",
      wan_technology: "MPLS",
      firewall_enabled: true,
      firewall_vendor: "Cisco ASA",
      dmz_required: true,
      redundancy_enabled: true,
      load_balancer: true,
      wireless_enabled: true,
      server_farm: true,
      num_servers: 4,
      router_model: "Cisco ISR",
      switch_model: "Cisco Catalyst",
      ip_scheme: "10.0.0.0/8",
      num_vlans_per_site: 4,
      vlan_names: ["Management", "Data", "Voice", "Guest"],
      num_user_devices: 15,
      user_device_types: ["Windows", "macOS", "Ubuntu"],
      domain_name: "enterprise.local",
      ntp_server: "10.0.0.1",
      dns_servers: ["10.0.0.2", "10.0.0.3"],
      status: "draft",
    },
  },
  {
    id: "datacenter",
    name: "Datacenter",
    icon: Server,
    color: "#8b5cf6",
    description: "High-density datacenter with full-mesh BGP core, load balancers, multi-tier server farm (Web/App/DB), DMZ, and redundant uplinks for maximum availability.",
    layers: ["Web Tier", "App Tier", "Database Tier", "DMZ", "Storage VLAN", "Metro Ethernet WAN"],
    preset: {
      name: "Datacenter Network",
      company_name: "Datacenter Ops",
      num_sites: 1,
      site_names: ["Datacenter"],
      topology_type: "full-mesh",
      routing_protocol: "BGP",
      wan_technology: "Metro Ethernet",
      firewall_enabled: true,
      firewall_vendor: "Palo Alto",
      dmz_required: true,
      redundancy_enabled: true,
      load_balancer: true,
      wireless_enabled: false,
      server_farm: true,
      num_servers: 8,
      router_model: "Cisco CSR1000v",
      switch_model: "Cisco Nexus",
      ip_scheme: "172.16.0.0/12",
      num_vlans_per_site: 5,
      vlan_names: ["Management", "Web", "App", "DB", "Storage"],
      num_user_devices: 4,
      user_device_types: ["Windows", "Linux"],
      domain_name: "dc.local",
      ntp_server: "172.16.0.1",
      dns_servers: ["172.16.0.2", "172.16.0.3"],
      status: "draft",
    },
  },
  {
    id: "healthcare",
    name: "Healthcare",
    icon: Activity,
    color: "#0ea5e9",
    description: "Hospital network with clinical, guest, and medical-device VLAN segmentation, HIPAA-grade Palo Alto firewall, DMZ, and wireless guest access across main hospital and clinic.",
    layers: ["Clinical VLAN", "Medical Device VLAN", "Guest Wireless", "DMZ", "MPLS WAN"],
    preset: {
      name: "Healthcare Network",
      company_name: "Regional Hospital",
      num_sites: 2,
      site_names: ["Main Hospital", "Clinic"],
      topology_type: "hub-and-spoke",
      routing_protocol: "OSPF",
      wan_technology: "MPLS",
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
      num_vlans_per_site: 4,
      vlan_names: ["Management", "Clinical", "Guest", "Medical-Devices"],
      num_user_devices: 10,
      user_device_types: ["Windows", "macOS", "IoT Medical"],
      domain_name: "hospital.local",
      ntp_server: "10.0.0.1",
      dns_servers: ["10.0.0.2", "10.0.0.3"],
      status: "draft",
    },
  },
  {
    id: "financial",
    name: "Financial / Banking",
    icon: Landmark,
    color: "#f59e0b",
    description: "High-security financial network with full-mesh BGP, redundant Palo Alto firewalls, multi-tier DMZ, load balancers, and strict VLAN segmentation for trading and back-office.",
    layers: ["Trading Floor VLAN", "Back-Office VLAN", "Database VLAN", "Multi-Tier DMZ", "SD-WAN"],
    preset: {
      name: "Financial Network",
      company_name: "Financial Services",
      num_sites: 2,
      site_names: ["Trading Floor", "Backup Site"],
      topology_type: "full-mesh",
      routing_protocol: "BGP",
      wan_technology: "SD-WAN",
      firewall_enabled: true,
      firewall_vendor: "Palo Alto",
      dmz_required: true,
      redundancy_enabled: true,
      load_balancer: true,
      wireless_enabled: false,
      server_farm: true,
      num_servers: 5,
      router_model: "Cisco CSR1000v",
      switch_model: "Cisco Nexus",
      ip_scheme: "10.0.0.0/8",
      num_vlans_per_site: 5,
      vlan_names: ["Management", "Trading", "Back-Office", "DMZ", "Database"],
      num_user_devices: 8,
      user_device_types: ["Windows", "Linux"],
      domain_name: "fin.local",
      ntp_server: "10.0.0.1",
      dns_servers: ["10.0.0.2", "10.0.0.3"],
      status: "draft",
    },
  },
];

export default function SmartDesign() {
  const navigate = useNavigate();
  const [generating, setGenerating] = useState(null); // preset id being generated

  const handleSelect = async (presetObj) => {
    setGenerating(presetObj.id);
    try {
      const isAuth = await base44.auth.isAuthenticated();
      if (!isAuth) {
        base44.auth.redirectToLogin(window.location.href);
        return;
      }
      const created = await base44.entities.NetworkDesign.create(presetObj.preset);
      navigate(`/DiagramPreview?id=${created.id}`);
    } catch (err) {
      console.error("Smart Design generation failed:", err);
      alert("Failed to generate design: " + err.message);
      setGenerating(null);
    }
  };

  return (
    <div className="min-h-screen py-12 px-4 bg-gradient-to-br from-black via-gray-950 to-red-950/20">
      {/* Background glows */}
      <div className="fixed inset-0 pointer-events-none -z-10">
        <div className="absolute top-20 left-1/4 w-[500px] h-[400px] bg-cyan-900/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/4 w-[600px] h-[400px] bg-blue-900/10 rounded-full blur-3xl" />
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8 p-6 bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-400/30 rounded-2xl shadow-sm">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-cyan-500/20 border border-cyan-400/30 flex items-center justify-center shrink-0">
              <Zap className="h-6 w-6 text-cyan-400" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white mb-2">Smart Design</h1>
              <p className="text-sm text-gray-300 leading-relaxed">
                Choose a network type and the system automatically builds all TCP/IP layers — LAN, WAN, firewalls,
                DMZ, servers, and endpoints — then drops you into the network designer where you can inject
                simulated attacks, run traffic scenarios, and analyze the results.
              </p>
              <div className="flex flex-wrap gap-4 mt-4 text-xs text-gray-400">
                <span className="flex items-center gap-1.5"><Layers className="h-3.5 w-3.5 text-cyan-400" /> Full TCP/IP Layer Stack</span>
                <span className="flex items-center gap-1.5"><Globe className="h-3.5 w-3.5 text-cyan-400" /> LAN + WAN Auto-Generated</span>
                <span className="flex items-center gap-1.5"><Shield className="h-3.5 w-3.5 text-cyan-400" /> Security Controls Included</span>
                <span className="flex items-center gap-1.5"><Zap className="h-3.5 w-3.5 text-cyan-400" /> Attack Simulation Ready</span>
              </div>
            </div>
          </div>
        </div>

        {/* Network type grid */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {NETWORK_PRESETS.map((preset, idx) => {
            const Icon = preset.icon;
            const isGenerating = generating === preset.id;
            return (
              <motion.div
                key={preset.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: idx * 0.05 }}
              >
                <button
                  onClick={() => handleSelect(preset)}
                  disabled={generating !== null}
                  className="group w-full text-left bg-gray-900 border border-gray-700 rounded-2xl p-6 shadow-lg transition-all duration-200 hover:border-cyan-500/60 hover:shadow-cyan-900/30 disabled:opacity-50 disabled:cursor-wait h-full flex flex-col"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div
                      className="h-11 w-11 rounded-xl flex items-center justify-center border-2 transition-all group-hover:scale-110"
                      style={{ backgroundColor: `${preset.color}22`, borderColor: `${preset.color}55` }}
                    >
                      <Icon className="h-5 w-5" style={{ color: preset.color }} />
                    </div>
                    <h3 className="font-semibold text-white text-base">{preset.name}</h3>
                  </div>
                  <p className="text-xs text-gray-400 leading-relaxed mb-4 flex-1">{preset.description}</p>
                  <div className="space-y-1.5 mb-4">
                    {preset.layers.map((layer) => (
                      <div key={layer} className="flex items-center gap-2 text-[11px] text-gray-500">
                        <span className="h-1 w-1 rounded-full bg-cyan-500 shrink-0" />
                        {layer}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-end text-xs font-medium text-cyan-400 gap-1 group-hover:gap-2 transition-all">
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" /> Generating…
                      </>
                    ) : (
                      <>
                        Build Network <ArrowRight className="h-3.5 w-3.5" />
                      </>
                    )}
                  </div>
                </button>
              </motion.div>
            );
          })}
        </div>

        {generating && (
          <div className="mt-8 flex items-center justify-center gap-3 text-sm text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin text-cyan-400" />
            Building TCP/IP layers, LAN, WAN, and security controls…
          </div>
        )}
      </div>
    </div>
  );
}