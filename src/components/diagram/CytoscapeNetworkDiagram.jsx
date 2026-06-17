import React, { useRef, useEffect, useState, forwardRef, useImperativeHandle } from "react";
import cytoscape from "cytoscape";
import cose from "cytoscape-cose-bilkent";
import ZoomPanControls from "./ZoomPanControls";
import SelectionControls from "./SelectionControls";
import DevicePropertiesEditor from "./DevicePropertiesEditor";

cytoscape.use(cose);

// Device type colors
const DEVICE_COLORS = {
  router: "#2e7fbf",
  switch: "#3a9ec7",
  firewall: "#cc2200",
  server: "#5b3ea8",
  internet: "#7ecef4",
  loadbalancer: "#b45309",
  wireless: "#065f46",
  workstation: "#2a4a6b",
  phone: "#2e5c80",
  nas: "#3730a3",
  vpn: "#047857",
  ids: "#9a3412",
  cloud: "#7c3aed",
  ups: "#78350f",
  ot: "#d97706",
};

const CytoscapeNetworkDiagram = forwardRef(function CytoscapeNetworkDiagram(
  { diagramData, onNodeClick, onNodeHover, onNodeUpdate, simulationMode = false },
  ref
) {
  const containerRef = useRef(null);
  const cyRef = useRef(null);
  const [selectedNodeIds, setSelectedNodeIds] = useState(new Set());
  const [editingNode, setEditingNode] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);

  useEffect(() => {
    if (!containerRef.current || !diagramData) return;

    // Create Cytoscape instance
    const cy = cytoscape({
      container: containerRef.current,
      headless: false,
      styleEnabled: true,
      elements: [],
      style: [
        {
          selector: "node",
          css: {
            "background-color": "data(color)",
            "label": "data(label)",
            "text-valign": "bottom",
            "text-margin-y": "10px",
            "font-size": "10px",
            "color": "#e2e8f0",
            "text-outline-width": "2px",
            "text-outline-color": "#0b1120",
            "font-weight": "bold",
            "width": "60px",
            "height": "60px",
            "padding": "5px",
            "border-width": "1px",
            "border-color": "rgba(255,255,255,0.2)",
            "background-opacity": 0.9,
          },
        },
        {
          selector: "node:selected",
          css: {
            "border-width": "3px",
            "border-color": "#0ea5e9",
            "box-shadow": "0 0 20px rgba(14,165,233,0.8)",
          },
        },
        {
          selector: "node:hover",
          css: {
            "border-width": "2px",
            "border-color": "rgba(148,163,184,0.8)",
            "box-shadow": "0 0 12px rgba(148,163,184,0.8)",
          },
        },
        {
          selector: "edge",
          css: {
            "stroke-width": "2px",
            "line-color": "rgba(148,163,184,0.6)",
            "curve-style": "bezier",
            "target-arrow-color": "rgba(148,163,184,0.6)",
            "target-arrow-shape": "triangle",
            "label": "data(label)",
            "font-size": "9px",
            "text-background-color": "#0b1120",
            "text-background-opacity": "0.9",
            "text-background-padding": "3px",
          },
        },
        {
          selector: "edge.wan",
          css: {
            "line-color": "rgba(99,102,241,0.8)",
            "target-arrow-color": "rgba(99,102,241,0.8)",
            "stroke-width": "2.5px",
          },
        },
        {
          selector: "edge.ha",
          css: {
            "line-color": "rgba(250,204,21,0.7)",
            "target-arrow-color": "rgba(250,204,21,0.7)",
            "line-style": "dashed",
            "stroke-width": "1.5px",
          },
        },
      ],
      layout: {
        name: "cose-bilkent",
        directed: false,
        roots: "#node-internet",
        animate: true,
        animationDuration: 500,
        randomize: false,
        gravity: -1500,
        nodeRepulsion: 50000,
        nodeOverlap: 50,
        idealEdgeLength: 250,
        edgeElasticity: 0.3,
        nestingFactor: 0.1,
        numIter: 2500,
        tile: true,
        tilingPaddingVertical: 20,
        tilingPaddingHorizontal: 20,
        gravityRange: 400,
      },
    });

    cyRef.current = cy;

    // Convert diagram data to Cytoscape format
    const elements = [];

    // Add nodes
    if (diagramData.nodes) {
      diagramData.nodes.forEach((node) => {
        elements.push({
          data: {
            id: node.id,
            label: node.label || node.type,
            color: DEVICE_COLORS[node.type] || "#64748b",
            type: node.type,
            ...node,
          },
          position: node.x ? { x: node.x * 2, y: node.y * 2 } : undefined,
        });
      });
    }

    // Add edges
    if (diagramData.links) {
      diagramData.links.forEach((link, idx) => {
        const style = link.label === "HA" ? "ha" : link.wan ? "wan" : "";
        elements.push({
          data: {
            id: `edge-${idx}`,
            source: link.from,
            target: link.to,
            label: link.label || "",
          },
          classes: style,
        });
      });
    }

    cy.elements().remove();
    cy.add(elements);

    // Run layout
    const layout = cy.layout({ name: "cose-bilkent" });
    layout.run();

    // Event handlers
    cy.on("tap", "node", (e) => {
      const node = e.target.data();
      const originalNode = diagramData.nodes.find((n) => n.id === node.id);
      
      if (e.originalEvent.detail === 2) {
        // Double click to edit
        setEditingNode(originalNode);
        return;
      }

      // Selection handling
      if (e.originalEvent.ctrlKey || e.originalEvent.metaKey) {
        e.target.toggleClass("selected");
        setSelectedNodeIds((prev) => {
          const next = new Set(prev);
          if (next.has(node.id)) {
            next.delete(node.id);
          } else {
            next.add(node.id);
          }
          return next;
        });
      } else {
        cy.elements().removeClass("selected");
        e.target.addClass("selected");
        setSelectedNodeIds(new Set([node.id]));
      }

      if (onNodeClick) onNodeClick(originalNode || null);
    });

    cy.on("mouseover", "node", (e) => {
      const node = e.target.data();
      const originalNode = diagramData.nodes.find((n) => n.id === node.id);
      if (onNodeHover) onNodeHover(originalNode || null, e);
    });

    cy.on("mouseout", "node", () => {
      if (onNodeHover) onNodeHover(null, null);
    });

    cy.on("tap", (e) => {
      if (e.target === cy) {
        cy.elements().removeClass("selected");
        setSelectedNodeIds(new Set());
      }
    });

    return () => {
      cy.destroy();
    };
  }, [diagramData, onNodeClick, onNodeHover]);

  useImperativeHandle(ref, () => ({
    exportPNG() {
      if (!cyRef.current) return;
      const png = cyRef.current.png();
      const a = document.createElement("a");
      a.href = png;
      a.download = "network-diagram.png";
      document.body.appendChild(a);
      a.click();
      a.remove();
    },
    exportSVG() {
      if (!cyRef.current) return;
      const svg = cyRef.current.svg();
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "network-diagram.svg";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    },
  }));

  const handleZoomIn = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 1.2);
      setZoomLevel((prev) => Math.min(3, prev * 1.2));
    }
  };

  const handleZoomOut = () => {
    if (cyRef.current) {
      cyRef.current.zoom(cyRef.current.zoom() * 0.8);
      setZoomLevel((prev) => Math.max(0.3, prev * 0.8));
    }
  };

  const handleFitToScreen = () => {
    if (cyRef.current) {
      cyRef.current.fit();
      setZoomLevel(1);
    }
  };

  const handleResetView = () => {
    if (cyRef.current) {
      cyRef.current.fit();
      cyRef.current.elements().removeClass("selected");
      setSelectedNodeIds(new Set());
      setZoomLevel(1);
    }
  };

  const handleDeleteSelected = () => {
    if (selectedNodeIds.size === 0 || !cyRef.current) return;
    
    selectedNodeIds.forEach((nodeId) => {
      const cyNode = cyRef.current.$(`#${nodeId}`);
      cyNode.remove();
      diagramData.nodes = diagramData.nodes.filter((n) => n.id !== nodeId);
      diagramData.links = diagramData.links.filter((l) => l.from !== nodeId && l.to !== nodeId);
    });
    
    setSelectedNodeIds(new Set());
  };

  return (
    <>
      <div className="w-full rounded-xl overflow-hidden border border-border relative" style={{ background: "#0b1120" }}>
        <div
          ref={containerRef}
          style={{
            width: "100%",
            height: "700px",
            background: "linear-gradient(135deg, #0b1120 0%, #0f172a 100%)",
          }}
        />
        <ZoomPanControls
          zoomLevel={zoomLevel}
          onZoomIn={handleZoomIn}
          onZoomOut={handleZoomOut}
          onFitToScreen={handleFitToScreen}
          onResetView={handleResetView}
        />
        <SelectionControls
          selectionCount={selectedNodeIds.size}
          onClear={() => {
            if (cyRef.current) {
              cyRef.current.elements().removeClass("selected");
              setSelectedNodeIds(new Set());
            }
          }}
          onDeleteSelected={handleDeleteSelected}
        />
        {selectedNodeIds.size > 0 && (
          <div className="absolute top-4 left-4 bg-card/80 backdrop-blur-sm border border-border rounded-lg px-3 py-2 text-xs text-muted-foreground z-10 space-y-1">
            <div>Ctrl+Click to select multiple • Double-click to edit</div>
          </div>
        )}
      </div>
      {editingNode && (
        <DevicePropertiesEditor
          node={editingNode}
          onSave={(updatedNode) => {
            const originalNode = diagramData.nodes.find((n) => n.id === updatedNode.id);
            if (originalNode) {
              Object.assign(originalNode, updatedNode);
              if (onNodeUpdate) onNodeUpdate(originalNode);
            }
            setEditingNode(null);
          }}
          onClose={() => setEditingNode(null)}
        />
      )}
    </>
  );
});

export default CytoscapeNetworkDiagram;