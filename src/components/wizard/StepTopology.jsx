import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { GitBranch, Route, Wifi } from "lucide-react";

const topologies = [
  { value: "hub-and-spoke", label: "Hub & Spoke", desc: "Central hub connects all spokes", icon: "🕸️" },
  { value: "full-mesh", label: "Full Mesh", desc: "Every site connected to every other", icon: "🔗" },
  { value: "partial-mesh", label: "Partial Mesh", desc: "Strategic connections between sites", icon: "🔀" },
  { value: "ring", label: "Ring", desc: "Sites connected in a loop", icon: "⭕" },
  { value: "star", label: "Star", desc: "All nodes connect to one center", icon: "⭐" },
];

const routingProtocols = ["OSPF", "EIGRP", "BGP", "Static", "IS-IS", "RIP"];
const wanTechnologies = ["MPLS", "SD-WAN", "IPSec VPN", "DMVPN", "Metro Ethernet", "Leased Line"];

export default function StepTopology({ data, onChange }) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-foreground">Network Topology</h2>
        <p className="text-muted-foreground mt-1">Define how your network connects</p>
      </div>

      <div className="space-y-2">
        <Label className="flex items-center gap-2 text-sm">
          <GitBranch className="h-4 w-4 text-primary" /> Topology Type
        </Label>
        <Select value={data.topology_type || ""} onValueChange={(v) => onChange({ topology_type: v })}>
          <SelectTrigger className="bg-secondary border-border">
            <SelectValue placeholder="Select topology type" />
          </SelectTrigger>
          <SelectContent>
            {topologies.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                <div className="flex items-center gap-3 py-1">
                  <span className="text-lg">{t.icon}</span>
                  <div>
                    <div className="font-semibold text-sm">{t.label}</div>
                    <div className="text-xs text-muted-foreground">{t.desc}</div>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {data.topology_type && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
            {topologies.find(t => t.value === data.topology_type)?.desc}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <Route className="h-4 w-4 text-primary" /> Routing Protocol
          </Label>
          <Select value={data.routing_protocol || ""} onValueChange={(v) => onChange({ routing_protocol: v })}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Select protocol" />
            </SelectTrigger>
            <SelectContent>
              {routingProtocols.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm">
            <Wifi className="h-4 w-4 text-primary" /> WAN Technology
          </Label>
          <Select value={data.wan_technology || ""} onValueChange={(v) => onChange({ wan_technology: v })}>
            <SelectTrigger className="bg-secondary border-border">
              <SelectValue placeholder="Select WAN type" />
            </SelectTrigger>
            <SelectContent>
              {wanTechnologies.map((w) => (
                <SelectItem key={w} value={w}>{w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label className="text-sm">VLANs per Site</Label>
          <Input
            type="number" min={1} max={100}
            placeholder="e.g. 4"
            value={data.num_vlans_per_site || ""}
            onChange={(e) => onChange({ num_vlans_per_site: parseInt(e.target.value) || 0 })}
            className="bg-secondary border-border"
          />
        </div>

        <div className="space-y-2">
          <Label className="text-sm">VLAN Names</Label>
          <Input
            placeholder="Management, Users, Servers, VoIP"
            value={(data.vlan_names || []).join(", ")}
            onChange={(e) => onChange({ vlan_names: e.target.value.split(",").map(s => s.trim()) })}
            className="bg-secondary border-border"
          />
          <p className="text-xs text-muted-foreground">Comma-separated</p>
        </div>
      </div>
    </div>
  );
}