import React, { useState } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { CheckCircle2, XCircle, Cloud, Server, Box, Layers, RefreshCw } from "lucide-react";

const AZURE = "#0078D4";
const AZURE_LIGHT = "#50A0E0";
const AZURE_DARK = "#005A9E";

const CONCEPTS = [
  { id: "iaas", label: "IaaS", icon: "🖥️", desc: "Infrastructure as a Service", zone: "service", color: "#0078D4" },
  { id: "paas", label: "PaaS", icon: "📦", desc: "Platform as a Service", zone: "service", color: "#00BCF2" },
  { id: "saas", label: "SaaS", icon: "☁️", desc: "Software as a Service", zone: "service", color: "#50A0E0" },
  { id: "public", label: "Public Cloud", icon: "🌐", desc: "Shared infrastructure, multi-tenant", zone: "deploy", color: "#0078D4" },
  { id: "private", label: "Private Cloud", icon: "🔒", desc: "Dedicated to one organization", zone: "deploy", color: "#005A9E" },
  { id: "hybrid", label: "Hybrid Cloud", icon: "🔗", desc: "Combines public + private", zone: "deploy", color: "#50A0E0" },
];

const ZONES = [
  { id: "deploy", title: "Deployment Models", icon: Cloud, desc: "Where resources are owned and operated", color: AZURE },
  { id: "service", title: "Service Models", icon: Layers, desc: "What level of service the provider manages", color: AZURE_LIGHT },
];

export default function CloudConceptsCanvas({ onComplete }) {
  const [pool, setPool] = useState(CONCEPTS);
  const [zones, setZones] = useState({ deploy: [], service: [] });
  const [validated, setValidated] = useState(false);
  const [allCorrect, setAllCorrect] = useState(false);

  const reset = () => {
    setPool(CONCEPTS);
    setZones({ deploy: [], service: [] });
    setValidated(false);
    setAllCorrect(false);
  };

  const onDragEnd = (result) => {
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    setValidated(false);
    setAllCorrect(false);

    const sourceId = source.droppableId;
    const destId = destination.droppableId;

    let moved = null;

    if (sourceId === "pool") {
      moved = pool[source.index];
      setPool(prev => prev.filter((_, i) => i !== source.index));
    } else {
      const srcList = zones[sourceId];
      moved = srcList[source.index];
      setZones(prev => ({ ...prev, [sourceId]: srcList.filter((_, i) => i !== source.index) }));
    }

    if (destId === "pool") {
      setPool(prev => {
        const next = [...prev];
        next.splice(destination.index, 0, moved);
        return next;
      });
    } else {
      setZones(prev => {
        const destList = prev[destId] ? [...prev[destId]] : [];
        destList.splice(destination.index, 0, moved);
        return { ...prev, [destId]: destList };
      });
    }
  };

  const handleValidate = () => {
    const correct = CONCEPTS.every(c => {
      const zoneItems = zones[c.zone] || [];
      return zoneItems.some(item => item.id === c.id);
    });
    // Also check no items are in the wrong zone
    const noWrong = Object.entries(zones).every(([zoneId, items]) =>
      items.every(item => item.zone === zoneId)
    );
    const passed = correct && noWrong && pool.length === 0;
    setAllCorrect(passed);
    setValidated(true);
    if (passed) onComplete?.();
  };

  const isItemCorrect = (item, zoneId) => {
    return validated && item.zone === zoneId;
  };
  const isItemWrong = (item, zoneId) => {
    return validated && item.zone !== zoneId;
  };

  return (
    <div className="space-y-4">
      <DragDropContext onDragEnd={onDragEnd}>
        {/* Concept pool */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Box className="h-4 w-4" style={{ color: AZURE }} />
              <span className="text-xs font-mono uppercase text-gray-400">Cloud Concepts</span>
            </div>
            <span className="text-[10px] font-mono text-gray-500">{pool.length} remaining</span>
          </div>
          <Droppable droppableId="pool" direction="horizontal">
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`min-h-[72px] flex flex-wrap gap-2 rounded-lg p-2 transition-colors ${snapshot.isDraggingOver ? "bg-blue-950/30" : ""}`}
              >
                {pool.length === 0 && (
                  <div className="flex items-center justify-center w-full text-[11px] text-gray-600 font-mono">
                    All concepts placed — validate your answers
                  </div>
                )}
                {pool.map((item, index) => (
                  <Draggable key={item.id} draggableId={item.id} index={index}>
                    {(prov, snap) => (
                      <div
                        ref={prov.innerRef}
                        {...prov.draggableProps}
                        {...prov.dragHandleProps}
                        className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-grab transition-all ${snap.isDragging ? "shadow-lg scale-105" : ""}`}
                        style={{
                          backgroundColor: `${item.color}22`,
                          borderColor: `${item.color}66`,
                          ...prov.draggableProps.style,
                        }}
                      >
                        <span className="text-base">{item.icon}</span>
                        <div>
                          <div className="text-xs font-mono font-bold text-white leading-tight">{item.label}</div>
                          <div className="text-[9px] text-gray-400 leading-tight">{item.desc}</div>
                        </div>
                      </div>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        {/* Drop zones */}
        <div className="grid gap-4 md:grid-cols-2">
          {ZONES.map(zone => {
            const ZoneIcon = zone.icon;
            const items = zones[zone.id] || [];
            return (
              <Droppable key={zone.id} droppableId={zone.id}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`rounded-xl border-2 border-dashed p-4 min-h-[200px] transition-colors ${snapshot.isDraggingOver ? "border-blue-500 bg-blue-950/20" : "border-gray-700"}`}
                    style={{ backgroundColor: "#0d1117" }}
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <div className="h-7 w-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${zone.color}22`, border: `1px solid ${zone.color}55` }}>
                        <ZoneIcon className="h-4 w-4" style={{ color: zone.color }} />
                      </div>
                      <div>
                        <div className="text-xs font-mono font-bold text-white">{zone.title}</div>
                        <div className="text-[9px] text-gray-500">{zone.desc}</div>
                      </div>
                    </div>
                    {items.length === 0 && !snapshot.isDraggingOver && (
                      <div className="flex items-center justify-center h-32 text-[11px] text-gray-600 font-mono">
                        Drag concepts here
                      </div>
                    )}
                    <div className="space-y-2">
                      {items.map((item, index) => {
                        const correct = isItemCorrect(item, zone.id);
                        const wrong = isItemWrong(item, zone.id);
                        return (
                          <Draggable key={item.id} draggableId={item.id} index={index}>
                            {(prov, snap) => (
                              <div
                                ref={prov.innerRef}
                                {...prov.draggableProps}
                                {...prov.dragHandleProps}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg border transition-all ${snap.isDragging ? "shadow-lg" : ""} ${correct ? "border-green-600/60 bg-green-950/20" : wrong ? "border-red-700/60 bg-red-950/20" : ""}`}
                                style={{
                                  backgroundColor: correct || wrong ? undefined : `${item.color}22`,
                                  borderColor: correct || wrong ? undefined : `${item.color}55`,
                                  ...prov.draggableProps.style,
                                }}
                              >
                                <span className="text-base">{item.icon}</span>
                                <div className="flex-1">
                                  <div className="text-xs font-mono font-bold text-white leading-tight">{item.label}</div>
                                  <div className="text-[9px] text-gray-400 leading-tight">{item.desc}</div>
                                </div>
                                {correct && <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />}
                                {wrong && <XCircle className="h-4 w-4 text-red-400 shrink-0" />}
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  </div>
                )}
              </Droppable>
            );
          })}
        </div>
      </DragDropContext>

      {/* Actions */}
      <div className="flex items-center gap-3">
        {!allCorrect && (
          <button
            onClick={handleValidate}
            disabled={pool.length > 0}
            className="px-5 py-2.5 rounded-xl text-white text-xs font-mono font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ backgroundColor: AZURE }}
          >
            Validate Answers
          </button>
        )}
        <button
          onClick={reset}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-gray-300 text-xs font-mono border border-gray-700 hover:border-gray-500 transition-colors"
        >
          <RefreshCw className="h-3 w-3" /> Reset
        </button>
        {pool.length > 0 && (
          <span className="text-[10px] font-mono text-gray-500">Place all {pool.length} remaining concept(s) to validate</span>
        )}
      </div>

      {validated && allCorrect && (
        <div className="bg-green-950/30 border border-green-700/40 rounded-xl px-4 py-3 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
          <span className="text-xs text-green-300">All cloud concepts matched correctly! You understand deployment and service models.</span>
        </div>
      )}
      {validated && !allCorrect && (
        <div className="bg-red-950/30 border border-red-700/40 rounded-xl px-4 py-3 flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-400 shrink-0" />
          <span className="text-xs text-red-300">Some concepts are in the wrong zone. Review the definitions and try again.</span>
        </div>
      )}
    </div>
  );
}