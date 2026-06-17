import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download, ChevronDown, ChevronRight } from "lucide-react";
import { jsPDF } from "jspdf";

export default function UserGuide() {
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState({});

  const sections = useMemo(() => [
    {
      id: "getting-started",
      title: "Getting Started",
      content: [
        {
          heading: "Creating Your First Network Design",
          steps: [
            "Click 'Start Network Design' or navigate to Network Wizard",
            "Follow the wizard steps to configure basic network parameters",
            "Enter company name, number of sites, and topology type",
            "Select your routing protocol, WAN technology, and security options",
            "Configure device types (routers, switches, firewalls, etc.)",
            "Set up network services (DNS, NTP, VLANs, etc.)",
            "Review your design and complete the wizard",
            "Your network diagram will be automatically generated"
          ]
        },
        {
          heading: "Wizard Overview",
          steps: [
            "Step 1 - Basics: Company name, site information, topology type",
            "Step 2 - Topology: Choose hub-and-spoke, full-mesh, partial-mesh, ring, or star",
            "Step 3 - Security: Configure firewall settings, DMZ, redundancy",
            "Step 4 - Services: Set up DNS, NTP, VLANs, and server farms",
            "Step 5 - Devices: Select device models for routers, switches, firewalls",
            "Step 6 - Config Scripts: Choose script generation options"
          ]
        }
      ]
    },
    {
      id: "diagram-editor",
      title: "Diagram Editor",
      content: [
        {
          heading: "Navigating the Diagram",
          steps: [
            "Use mouse wheel + Ctrl/Cmd to zoom in/out",
            "Drag with middle mouse button or Shift+drag to pan",
            "Hover over devices to see device information",
            "Click any device to view detailed properties and configuration"
          ]
        },
        {
          heading: "Editing Your Network",
          steps: [
            "Double-click any device to edit its properties",
            "Drag devices to reposition them on the canvas",
            "Hold Shift and drag to box-select multiple devices",
            "Hold Ctrl/Cmd and click to multi-select individual devices",
            "Use the Regenerate button to rebuild the diagram from design",
            "Click Save Layout to preserve custom device positions",
            "Use the Annotate tool to add text labels and notes to your diagram"
          ]
        },
        {
          heading: "View Modes",
          steps: [
            "Detailed View: Shows all devices, connections, and labels",
            "Topology View: High-level overview of network groups and connections"
          ]
        },
        {
          heading: "Export Options",
          steps: [
            "Click Export button to download diagram as PNG or SVG",
            "PNG export is ideal for presentations and documentation",
            "SVG export provides vector graphics for further editing"
          ]
        }
      ]
    },
    {
      id: "making-changes",
      title: "Making Design Changes",
      content: [
        {
          heading: "Request Changes Panel",
          steps: [
            "On the right side of the Diagram Preview, find 'Request Changes' section",
            "Describe your desired change in natural language",
            "Example: 'Add a second firewall for redundancy' or 'Change routing to BGP'",
            "Click 'Apply Changes' and wait for the AI to update your design",
            "The diagram will automatically regenerate with your changes",
            "Review the change history to track all modifications"
          ]
        },
        {
          heading: "Manual Editing",
          steps: [
            "Double-click devices to edit their properties directly",
            "Drag devices to custom positions and save the layout",
            "Use the Review Design page to edit design parameters",
            "Return to Network Wizard to make comprehensive changes"
          ]
        }
      ]
    },
    {
      id: "generating-configs",
      title: "Generating Configurations & Scripts",
      content: [
        {
          heading: "Device Configurations (Non-AI)",
          steps: [
            "Click 'Generate Xtreme I.C.E. Script' from the Diagram Preview",
            "Select 'Device Configs' platform",
            "Click 'Generate Device Configs'",
            "Each device will get a full CLI configuration based on the design",
            "Configurations are vendor-specific (Cisco or Juniper)",
            "Download individual device configs or all at once",
            "Configs are ready to paste directly into devices"
          ]
        },
        {
          heading: "Intelligent-Generated Configurations",
          steps: [
            "Select 'Intelligent Config' platform from the Script Generator",
            "Click 'Generate Intelligent Configs'",
            "The system generates detailed, role-aware configurations for each device",
            "Includes BGP/OSPF/EIGRP setup, security policies, QoS, VLANs, etc.",
            "Monitor generation progress - configs generate device by device",
            "Review each config before downloading",
            "Intelligent configs include inline comments explaining each section"
          ]
        },
        {
          heading: "Lab Automation Scripts",
          steps: [
            "Select EVE-NG or GNS3 platform from the Script Generator",
            "Click 'Generate [Platform] Script'",
            "A complete Python script will be generated",
            "The script uses REST APIs to automatically build your lab",
            "Download the script and run it with: python script.py",
            "Your lab topology will be built automatically in EVE-NG or GNS3"
          ]
        }
      ]
    },
    {
      id: "simulation",
      title: "Network Simulation",
      content: [
        {
          heading: "Enabling Simulation Mode",
          steps: [
            "From the Diagram Preview, click 'Simulation ON' button",
            "The diagram enters simulation mode with packet animation",
            "A Simulation Control Panel appears on the right side"
          ]
        },
        {
          heading: "Running Scenarios",
          steps: [
            "Select a preset scenario from the Scenario tab (DDoS, Link Failure, etc.)",
            "Or create custom events with your own parameters",
            "Click 'Run Scenario' to start the simulation",
            "Watch devices light up as events occur",
            "Animated packets flow through the network",
            "Monitor real-time metrics: bandwidth, latency, packet loss",
            "View event log to see what happened during simulation"
          ]
        },
        {
          heading: "Analyzing Results",
          steps: [
            "Check the Metrics Dashboard for performance data",
            "View historical sessions to compare different scenarios",
            "Use Bottleneck Analysis to identify network weak points",
            "Review Configuration Validation for design issues",
            "Export metrics and event logs for further analysis"
          ]
        },
        {
          heading: "Available Scenarios",
          steps: [
            "Link Failure: Simulates WAN or LAN link going down",
            "Device Failure: Device stops responding to traffic",
            "DDoS Attack: Simulates high-traffic attack on a target",
            "Packet Loss: Introduces packet loss on specific links",
            "High Latency: Increases latency to test performance"
          ]
        }
      ]
    },
    {
      id: "design-review",
      title: "Design Review & Validation",
      content: [
        {
          heading: "Reviewing Your Design",
          steps: [
            "Click 'Review' button from Diagram Preview",
            "View design summary with all parameters",
            "Check IP address allocations and VLAN assignments",
            "Review device inventory and connections",
            "Run configuration validation to identify issues",
            "Validation checks cover security, redundancy, and best practices"
          ]
        },
        {
          heading: "Design Scoring",
          steps: [
            "Configuration Validation provides a percentage score",
            "Score is based on best practices checklist",
            "Green checkmarks show passing criteria",
            "Red X marks show areas that need improvement",
            "Review feedback to strengthen your design"
          ]
        },
        {
          heading: "Configuration Validation Checks",
          steps: [
            "Security: Firewall enabled, AAA configured, encryption used",
            "Redundancy: Multiple paths, HA setup, backup devices",
            "Routing: Correct protocol selected, proper area design",
            "Services: NTP and DNS configured, logging enabled",
            "Device Quality: Supported models, proper interfaces",
            "WAN Design: Appropriate technology choice for topology"
          ]
        }
      ]
    },
    {
      id: "documentation",
      title: "Network Documentation",
      content: [
        {
          heading: "Generating Documentation",
          steps: [
            "From Diagram Preview, find the 'Network Documentation' panel",
            "Click 'Generate Documentation'",
            "System creates comprehensive network docs including design summary",
            "Includes device inventory with roles and IP addresses",
            "Lists all connections and link types",
            "Provides IP scheme and VLAN assignments"
          ]
        },
        {
          heading: "Exporting Documentation",
          steps: [
            "Generated documentation can be exported as PDF",
            "Click 'Export as PDF' button",
            "PDF includes all design details and configuration info",
            "Perfect for submitting to customers or team members",
            "Can also copy documentation text directly to clipboard"
          ]
        }
      ]
    },
    {
      id: "device-inventory",
      title: "Device Inventory Management",
      content: [
        {
          heading: "Viewing Inventory",
          steps: [
            "Navigate to Device Inventory from the main menu",
            "See all devices with serial numbers, models, and status",
            "Filter by role, location, or status",
            "Search for specific devices by name or IP"
          ]
        },
        {
          heading: "Managing Devices",
          steps: [
            "Add new devices to your inventory",
            "Edit device properties: name, model, serial number, location",
            "Update device status: Active, Inactive, Maintenance, Decommissioned",
            "Organize devices by location and role",
            "Track device information for auditing and planning"
          ]
        },
        {
          heading: "Device Templates",
          steps: [
            "Create reusable device templates for common equipment",
            "Templates include default properties and configurations",
            "Apply templates when adding new devices to save time",
            "Customize and save your own templates for your organization"
          ]
        }
      ]
    },
    {
      id: "sharing-collaboration",
      title: "Sharing & Collaboration",
      content: [
        {
          heading: "Design Visibility",
          steps: [
            "Each design can be Private (only you) or Public (shared)",
            "Click the Public/Private button from Diagram Preview",
            "Public designs appear in search results and can be viewed by others",
            "Private designs remain your own until you share"
          ]
        },
        {
          heading: "Sharing Your Work",
          steps: [
            "Export diagrams as PNG or SVG for presentations",
            "Generate PDF documentation for formal sharing",
            "Download all configurations for team deployment",
            "Share download links with team members or clients"
          ]
        }
      ]
    },
    {
      id: "tips-tricks",
      title: "Tips & Tricks",
      content: [
        {
          heading: "Workflow Tips",
          steps: [
            "Start with a basic design, then use 'Request Changes' to iterate quickly",
            "Use Diagram Preview's detailed view for editing, Topology view for planning",
            "Generate non-AI configs for quick baseline, then refine with Intelligent configs",
            "Run multiple scenarios to test your design's resilience",
            "Always validate your design before deployment",
            "Export diagrams at each major milestone for documentation"
          ]
        },
        {
          heading: "Generation Best Practices",
          steps: [
            "For production networks, use Intelligent configs - they include best practices",
            "Test generated configs in a lab (EVE-NG/GNS3) before production",
            "Review generated configurations for any custom requirements",
            "Keep design change history for audit trails",
            "Document any manual modifications you make to configs"
          ]
        },
        {
          heading: "Troubleshooting",
          steps: [
            "If diagram looks cluttered, click 'Regenerate' to auto-layout",
            "Save layout after manually repositioning devices",
            "If configs seem incomplete, check device roles and connections",
            "Use validation checks to identify design issues",
            "Run simulation to test design before final deployment"
          ]
        }
      ]
    }
  ], []);

  const toggleSection = (id) => {
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDownloadPDF = async () => {
    const pdf = new jsPDF("p", "mm", "a4");
    let yPosition = 20;
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 15;
    const maxWidth = 210 - margin * 2;

    pdf.setFontSize(20);
    pdf.text("Xtreme I.C.E. Network Designer", margin, yPosition);
    pdf.setFontSize(14);
    pdf.text("User Guide", margin, yPosition + 10);
    yPosition += 25;

    sections.forEach((section) => {
      pdf.setFontSize(14);
      pdf.setFont(undefined, "bold");
      if (yPosition > pageHeight - 30) {
        pdf.addPage();
        yPosition = 20;
      }
      pdf.text(section.title, margin, yPosition);
      yPosition += 10;

      pdf.setFontSize(11);
      pdf.setFont(undefined, "normal");
      section.content.forEach((subsection) => {
        if (yPosition > pageHeight - 20) {
          pdf.addPage();
          yPosition = 20;
        }
        pdf.setFont(undefined, "bold");
        pdf.text(subsection.heading, margin + 5, yPosition);
        yPosition += 8;

        pdf.setFont(undefined, "normal");
        subsection.steps.forEach((step, idx) => {
          if (yPosition > pageHeight - 15) {
            pdf.addPage();
            yPosition = 20;
          }
          const lines = pdf.splitTextToSize(`${idx + 1}. ${step}`, maxWidth - 10);
          lines.forEach((line) => {
            pdf.text(line, margin + 10, yPosition);
            yPosition += 6;
          });
        });

        yPosition += 4;
      });

      yPosition += 8;
    });

    pdf.save("Xtreme_ICE_User_Guide.pdf");
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
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
          <h1 className="text-4xl font-bold text-foreground mb-3">User Guide</h1>
          <p className="text-lg text-muted-foreground">
            Step-by-step instructions for using Xtreme I.C.E. Network Designer
          </p>
        </div>

        <div className="space-y-3">
          {sections.map(section => (
            <div
              key={section.id}
              className="bg-card border border-border rounded-lg overflow-hidden"
            >
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between p-5 hover:bg-secondary/50 transition-colors text-left"
              >
                <h2 className="text-lg font-semibold text-foreground">{section.title}</h2>
                {expanded[section.id] ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </button>

              {expanded[section.id] && (
                <div className="px-5 pb-5 pt-2 border-t border-border/50 space-y-6">
                  {section.content.map((subsection, idx) => (
                    <div key={idx}>
                      <h3 className="font-semibold text-foreground mb-3">{subsection.heading}</h3>
                      <ol className="space-y-2">
                        {subsection.steps.map((step, stepIdx) => (
                          <li key={stepIdx} className="flex gap-3 text-sm text-muted-foreground">
                            <span className="font-semibold text-primary shrink-0 min-w-6">
                              {stepIdx + 1}.
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

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
  );
}