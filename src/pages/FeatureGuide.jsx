import React from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, Network, Zap, Code, FileCode, Gauge, BookOpen, Layout, Cpu, Shield, Wifi, Server } from "lucide-react";
import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

export default function FeatureGuide() {
  const navigate = useNavigate();
  const contentRef = React.useRef(null);

  const handleDownloadPDF = async () => {
    if (!contentRef.current) return;
    
    const canvas = await html2canvas(contentRef.current, { scale: 2, backgroundColor: "#ffffff" });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const imgWidth = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= 297;

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
    }

    pdf.save("Xtreme_ICE_Features_Guide.pdf");
  };

  const features = [
    {
      icon: Network,
      title: "Network Topology Designer",
      description: "Visually design enterprise network topologies with intuitive drag-and-drop canvas. Support for routers, switches, firewalls, servers, load balancers, and more.",
      highlights: ["Hierarchical layer-based layout", "Multiple device types", "Flexible positioning", "Grid-based alignment"]
    },
    {
      icon: Layout,
      title: "Diagram Visualization",
      description: "Two powerful viewing modes: Detailed network diagram with all connections and Topology overview for high-level network structure.",
      highlights: ["Detailed diagram view", "Topology overview", "Zoom and pan controls", "Device filtering"]
    },
    {
      icon: Code,
      title: "Device Configuration Generation",
      description: "Generate production-ready CLI configurations for Cisco IOS, Juniper JunOS, and vendor-agnostic device configs automatically.",
      highlights: ["Cisco IOS/IOS-XE configs", "Juniper JunOS configs", "Per-device configurations", "Auto-populated best practices"]
    },
    {
      icon: Zap,
      title: "Intelligent Config Generation",
      description: "AI-powered configuration generation that creates detailed, best-practice CLIs tailored to each device's role, connections, and network context.",
      highlights: ["Role-aware configs", "BGP/OSPF/EIGRP routing", "IPSec VPN setup", "Zone-based firewalls", "VLAN SVIs", "QoS policies"]
    },
    {
      icon: FileCode,
      title: "Lab Script Generation",
      description: "Generate complete automation scripts for EVE-NG and GNS3 labs using Python and REST APIs to build entire network environments.",
      highlights: ["EVE-NG Python scripts", "GNS3 automation", "Device node mapping", "Connection wiring", "IP allocation"]
    },
    {
      icon: Gauge,
      title: "Network Simulation",
      description: "Run realistic network simulations with preset scenarios, custom events, traffic patterns, and device failures to test network resilience.",
      highlights: ["Pre-built scenarios", "Device failure testing", "Traffic pattern analysis", "Packet animation", "Latency simulation"]
    },
    {
      icon: Cpu,
      title: "Real-time Metrics Dashboard",
      description: "Monitor simulated network performance with bandwidth, latency, packet loss, and CPU metrics displayed in real-time charts.",
      highlights: ["Bandwidth utilization", "Latency tracking", "Packet loss monitoring", "CPU load analysis", "Live metrics refresh"]
    },
    {
      icon: Shield,
      title: "Configuration Validation",
      description: "Automatically validate network designs against security, redundancy, and best practice criteria with detailed scoring.",
      highlights: ["Security checks", "Redundancy validation", "Best practice scoring", "Detailed feedback", "Issue identification"]
    },
    {
      icon: Wifi,
      title: "WAN Technology Support",
      description: "Design networks with MPLS, SD-WAN, IPSec VPN, DMVPN, Metro Ethernet, and Leased Line technologies.",
      highlights: ["MPLS design", "SD-WAN architectures", "VPN tunneling", "DMVPN Phase 3", "Hybrid WAN"]
    },
    {
      icon: Server,
      title: "Data Center Support",
      description: "Build data center environments with server farms, load balancers, DMZ configurations, and redundancy options.",
      highlights: ["Server farm design", "Load balancer placement", "DMZ segmentation", "Redundancy setup", "High availability"]
    },
    {
      icon: Gauge,
      title: "IP Address Allocation",
      description: "Automatic IP addressing scheme allocation based on network design parameters with customizable base networks.",
      highlights: ["Automated IP planning", "Custom schemes", "Interface mapping", "Loopback IPs", "Link IPs"]
    },
    {
      icon: BookOpen,
      title: "Network Documentation",
      description: "Generate comprehensive network documentation and export as PDF with design summaries, device lists, and configurations.",
      highlights: ["Auto-generated docs", "Device inventory", "Connection summary", "PDF export", "Configuration reference"]
    },
    {
      icon: FileCode,
      title: "Multiple Export Formats",
      description: "Export diagrams and configurations in multiple formats including PNG, SVG, and standard CLI config files.",
      highlights: ["PNG export", "SVG export", ".cfg files", ".conf files", ".py scripts"]
    },
    {
      icon: Network,
      title: "Design Collaboration",
      description: "Save, review, and share network designs. Public/private visibility controls for team collaboration.",
      highlights: ["Save designs", "Public/private sharing", "Design history", "Change tracking", "Design templates"]
    }
  ];

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <div className="flex gap-2 mb-6">
            <Button
              variant="outline"
              onClick={() => navigate(createPageUrl("Home"))}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" /> Back to Home
            </Button>
            <Button
              onClick={handleDownloadPDF}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Download className="h-4 w-4" /> Download PDF
            </Button>
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-3">Features Guide</h1>
          <p className="text-lg text-muted-foreground">
            Explore all the powerful capabilities of Xtreme I.C.E. Network Designer
          </p>
        </div>

        {/* Content to Download */}
        <div ref={contentRef} className="bg-white p-8">
        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feature, idx) => {
            const Icon = feature.icon;
            return (
              <div
                key={idx}
                className="bg-card border border-border rounded-xl p-6 hover:border-primary/50 transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="p-3 rounded-lg bg-primary/10 border border-primary/20 shrink-0">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-foreground text-lg mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground mb-4">{feature.description}</p>
                    <ul className="space-y-1">
                      {feature.highlights.map((highlight, i) => (
                        <li key={i} className="text-xs text-muted-foreground flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-primary/60" />
                          {highlight}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Supported Technologies */}
        <div className="mt-12 bg-card border border-border rounded-xl p-8">
          <h2 className="text-2xl font-bold text-foreground mb-6">Supported Technologies & Platforms</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-foreground mb-3">Vendors</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✓ Cisco (ISR, CSR1000v, Catalyst, Nexus, ASA)</li>
                <li>✓ Juniper (vMX, EX series)</li>
                <li>✓ Palo Alto Networks</li>
                <li>✓ Fortinet</li>
                <li>✓ Arista</li>
                <li>✓ VyOS</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-3">Simulation Platforms</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✓ EVE-NG</li>
                <li>✓ GNS3</li>
                <li>✓ Built-in Simulator</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-3">Routing Protocols</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✓ OSPF</li>
                <li>✓ EIGRP</li>
                <li>✓ BGP</li>
                <li>✓ Static Routes</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-3">WAN Technologies</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>✓ MPLS</li>
                <li>✓ SD-WAN</li>
                <li>✓ IPSec VPN</li>
                <li>✓ DMVPN</li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <Button
            size="lg"
            onClick={() => navigate(createPageUrl("NetworkWizard"))}
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            Start Creating a Network
          </Button>
        </div>
        </div>
      </div>
    </div>
  );
}