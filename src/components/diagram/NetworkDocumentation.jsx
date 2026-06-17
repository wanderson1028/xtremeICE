import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { FileText, Download, Copy, Loader2 } from "lucide-react";
import jsPDF from "jspdf";

export default function NetworkDocumentation({ diagramData, designName }) {
  const [documentation, setDocumentation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateDocumentation = async () => {
    setLoading(true);
    try {
      const response = await base44.functions.invoke("generateNetworkDocumentation", {
        diagramData,
        designName
      });
      setDocumentation(response.data);
    } catch (error) {
      console.error("Failed to generate documentation:", error);
    } finally {
      setLoading(false);
    }
  };

  const exportPDF = () => {
    if (!documentation) return;

    const doc = new jsPDF();
    let yPos = 20;

    // Title
    doc.setFontSize(18);
    doc.text("Network Documentation", 20, yPos);
    yPos += 10;

    // Header info
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Generated: ${documentation.generatedDate}`, 20, yPos);
    yPos += 8;

    // Summary
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Summary", 20, yPos);
    yPos += 6;
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Total Devices: ${documentation.summary.totalDevices}`, 25, yPos);
    yPos += 5;
    doc.text(`Total Connections: ${documentation.summary.totalConnections}`, 25, yPos);
    yPos += 8;

    // Device Types
    doc.setFontSize(11);
    doc.setTextColor(0);
    doc.text("Device Breakdown:", 20, yPos);
    yPos += 5;
    doc.setFontSize(9);
    doc.setTextColor(100);
    documentation.summary.deviceTypes.forEach(dt => {
      doc.text(`  • ${dt.type}: ${dt.count}`, 25, yPos);
      yPos += 4;
    });
    yPos += 4;

    // Devices
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Devices", 20, yPos);
    yPos += 6;
    doc.setFontSize(9);
    documentation.devices.forEach(device => {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      doc.setTextColor(0);
      doc.text(`${device.label} (${device.type})`, 25, yPos);
      yPos += 4;
      doc.setTextColor(100);
      doc.text(`IP: ${device.ip}`, 30, yPos);
      yPos += 4;
      doc.text(`Config: ${device.config.substring(0, 40)}...`, 30, yPos);
      yPos += 6;
    });

    yPos += 4;

    // Connections
    doc.setFontSize(12);
    doc.setTextColor(0);
    doc.text("Connections", 20, yPos);
    yPos += 6;
    doc.setFontSize(9);
    documentation.connections.forEach(conn => {
      if (yPos > 280) {
        doc.addPage();
        yPos = 20;
      }
      doc.setTextColor(0);
      doc.text(`${conn.from} → ${conn.to}`, 25, yPos);
      yPos += 4;
      doc.setTextColor(100);
      doc.text(`Type: ${conn.type} | Link: ${conn.label}`, 30, yPos);
      yPos += 6;
    });

    doc.save(`${documentation.title || "network-documentation"}.pdf`);
  };

  const copyToClipboard = () => {
    if (!documentation) return;
    const text = formatDocumentationAsText(documentation);
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatDocumentationAsText = (doc) => {
    let text = `${doc.title}\nGenerated: ${doc.generatedDate}\n\n`;
    text += `SUMMARY\nTotal Devices: ${doc.summary.totalDevices}\nTotal Connections: ${doc.summary.totalConnections}\n\n`;
    text += `DEVICE BREAKDOWN\n`;
    doc.summary.deviceTypes.forEach(dt => {
      text += `  • ${dt.type}: ${dt.count}\n`;
    });
    text += `\nDEVICES\n`;
    doc.devices.forEach(d => {
      text += `${d.label} (${d.type})\n  IP: ${d.ip}\n  Config: ${d.config}\n\n`;
    });
    text += `CONNECTIONS\n`;
    doc.connections.forEach(c => {
      text += `${c.from} → ${c.to}\n  Type: ${c.type} | Link: ${c.label}\n\n`;
    });
    return text;
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <FileText className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-sm text-foreground">Network Documentation</h3>
      </div>

      {!documentation ? (
        <Button
          onClick={generateDocumentation}
          disabled={loading}
          className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
          Generate Documentation
        </Button>
      ) : (
        <>
          <div className="bg-secondary rounded-lg p-4 space-y-3 max-h-64 overflow-y-auto">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Summary</p>
              <p className="text-sm text-foreground">
                {documentation.summary.totalDevices} devices • {documentation.summary.totalConnections} connections
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Device Types</p>
              <div className="space-y-1">
                {documentation.summary.deviceTypes.map(dt => (
                  <p key={dt.type} className="text-sm text-foreground">
                    {dt.type}: {dt.count}
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              onClick={exportPDF}
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
            >
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
            <Button
              onClick={copyToClipboard}
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
            >
              <Copy className="h-4 w-4" />
              {copied ? "Copied!" : "Copy Text"}
            </Button>
          </div>

          <Button
            onClick={() => setDocumentation(null)}
            variant="ghost"
            size="sm"
            className="w-full"
          >
            Clear
          </Button>
        </>
      )}
    </div>
  );
}