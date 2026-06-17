import React, { useEffect, useRef, useImperativeHandle } from "react";
import cytoscape from "cytoscape";
import coseLayout from "cytoscape-cose-bilkent";

cytoscape.use(coseLayout);

const CytoscapeHierarchical = React.forwardRef(({ diagramData, onNodeClick, onNodeHover }, ref) => {
  const cyRef = useRef(null);
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current || !diagramData) return;

    const elements = [];

    // Add nodes
    diagramData.nodes.forEach((node) => {
      elements.push({
        data: {
          id: node.id,
          label: node.label.replace(/\n/g, " "),
          type: node.type,
        },
      });
    });

    // Add edges
    diagramData.links.forEach((link) => {
      elements.push({
        data: {
          id: `${link.from}-${link.to}`,
          source: link.from,
          target: link.to,
          label: link.label || "",
          wan: link.wan || false,
        },
      });
    });

    // Create or update Cytoscape instance
    if (cyRef.current) cyRef.current.destroy();

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      layout: {
        name: "cose-bilkent",
        animate: false,
        nodeDimensionsIncludeLabels: true,
        nodeSpacing: 50,
        tile: true,
        quality: "proof",
      },
      style: [
        {
          selector: "node",
          style: {
            "background-color": (ele) => {
              const colors = {
                router: "#1e90ff",
                switch: "#00bcd4",
                firewall: "#ff6b35",
                server: "#8b5cf6",
                loadbalancer: "#f59e0b",
                wireless: "#10b981",
                internet: "#7c3aed",
                workstation: "#1e3a8a",
                phone: "#1e40af",
                ot: "#dc2626",
              };
              return colors[ele.data("type")] || "#7c3aed";
            },
            "border-width": 2,
            "border-color": (ele) => {
              const colors = {
                router: "#0047ab",
                switch: "#006064",
                firewall: "#8b1f00",
                server: "#5b21b6",
                loadbalancer: "#b45309",
                wireless: "#065f46",
                internet: "#5b21b6",
                workstation: "#0f172a",
                phone: "#0c1642",
                ot: "#991b1b",
              };
              return colors[ele.data("type")] || "#5b21b6";
            },
            width: 70,
            height: 70,
            "text-valign": "bottom",
            "text-halign": "center",
            label: "data(label)",
            "font-size": 9,
            color: "#e0e7ff",
            "text-background-color": "#1a1a2e",
            "text-background-opacity": 0.9,
            "text-background-padding": 3,
          },
        },
        {
          selector: "edge",
          style: {
            "line-color": (ele) => (ele.data("wan") ? "#6366f1" : "#94a3b8"),
            "target-arrow-color": (ele) => (ele.data("wan") ? "#6366f1" : "#94a3b8"),
            "target-arrow-shape": "triangle",
            "curve-style": "bezier",
            "stroke-dasharray": (ele) => (ele.data("wan") ? "5,5" : "none"),
            width: 2,
            label: "data(label)",
            "font-size": 9,
            color: "#94a3b8",
          },
        },
        {
          selector: "node:selected",
          style: {
            "border-color": "#fbbf24",
            "border-width": 3,
          },
        },
      ],
      wheelSensitivity: 0.1,
    });

    cyRef.current = cy;

    // Event handlers
    cy.on("tap", "node", (evt) => {
      const node = evt.target;
      onNodeClick?.(diagramData.nodes.find((n) => n.id === node.id()));
    });

    cy.on("mouseover", "node", (evt) => {
      const node = evt.target;
      onNodeHover?.(diagramData.nodes.find((n) => n.id === node.id()), evt);
    });

    cy.on("mouseout", "node", () => {
      onNodeHover?.(null);
    });

    return () => {
      if (cyRef.current) cyRef.current.destroy();
    };
  }, [diagramData, onNodeClick, onNodeHover]);

  useImperativeHandle(ref, () => ({
    exportPNG: () => {
      if (cyRef.current) {
        const png = cyRef.current.png({ maxWidth: 2400, maxHeight: 2400 });
        const link = document.createElement("a");
        link.href = png;
        link.download = "network-diagram.png";
        link.click();
      }
    },
    exportSVG: () => {
      if (cyRef.current) {
        const svg = cyRef.current.svg({ maxWidth: 2400, maxHeight: 2400 });
        const link = document.createElement("a");
        link.href = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
        link.download = "network-diagram.svg";
        link.click();
      }
    },
  }));

  return (
    <div
      ref={containerRef}
      className="w-full bg-background border border-border rounded-lg"
      style={{ height: "800px" }}
    />
  );
});

CytoscapeHierarchical.displayName = "CytoscapeHierarchical";
export default CytoscapeHierarchical;