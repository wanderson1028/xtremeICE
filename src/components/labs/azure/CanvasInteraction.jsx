import React, { useState } from "react";
import { CheckCircle2, XCircle, Plus, Trash2, MapPin } from "lucide-react";

const AZURE = "#0078D4";

export default function CanvasInteraction({ interaction, onComplete }) {
  const [placed, setPlaced] = useState([]);
  const [validated, setValidated] = useState(false);
  const [allCorrect, setAllCorrect] = useState(false);

  const palette = interaction.palette || [];
  const required = interaction.required || [];

  const addResource = (item) => {
    setPlaced(prev => [...prev, { ...item, uid: `${item.id}-${Date.now()}` }]);
    setValidated(false);
    setAllCorrect(false);
  };

  const removeResource = (uid) => {
    setPlaced(prev => prev.filter(p => p.uid !== uid));
    setValidated(false);
    setAllCorrect(false);
  };

  const handleValidate = () => {
    const placedIds = placed.map(p => p.id);
    const correct = required.every(r => placedIds.includes(r));
    setAllCorrect(correct);
    setValidated(true);
    if (correct) onComplete();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <MapPin className="h-4 w-4" style={{ color: AZURE }} />
        <h3 className="text-sm font-bold text-white">{interaction.title}</h3>
      </div>
      {interaction.description && <p className="text-xs text-gray-400 mb-2">{interaction.description}</p>}

      <div className="flex gap-3 min-h-[260px]">
        {/* Resource palette */}
        <div className="w-40 shrink-0 space-y-1.5">
          <div className="text-[10px] font-mono uppercase text-gray-500 mb-1">Resources</div>
          {palette.map(item => (
            <button
              key={item.id}
              onClick={() => addResource(item)}
              className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-gray-900 border border-gray-700 hover:border-gray-500 transition-colors group"
            >
              <span className="h-7 w-7 rounded-lg flex items-center justify-center text-sm shrink-0" style={{ backgroundColor: `${item.color || AZURE}22`, border: `1px solid ${item.color || AZURE}55` }}>
                {item.icon}
              </span>
              <span className="text-[11px] text-gray-300 font-mono text-left flex-1">{item.label}</span>
              <Plus className="h-3 w-3 text-gray-500 group-hover:text-white shrink-0" />
            </button>
          ))}
        </div>

        {/* Canvas */}
        <div className="flex-1 rounded-xl border-2 border-dashed border-gray-700 p-3 min-h-[260px]" style={{ backgroundColor: "#0d1117" }}>
          <div className="text-[10px] font-mono uppercase text-gray-500 mb-2">Architecture Canvas</div>
          {placed.length === 0 ? (
            <div className="flex items-center justify-center h-48 text-xs text-gray-600 font-mono">
              Click resources from the palette to add them here
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {placed.map(item => (
                <div key={item.uid} className="relative group bg-gray-900 border rounded-lg p-2.5 flex items-center gap-2" style={{ borderColor: `${item.color || AZURE}55` }}>
                  <span className="h-8 w-8 rounded-lg flex items-center justify-center text-base" style={{ backgroundColor: `${item.color || AZURE}22`, border: `1px solid ${item.color || AZURE}55` }}>
                    {item.icon}
                  </span>
                  <span className="text-[11px] text-gray-200 font-mono pr-4">{item.label}</span>
                  <button onClick={() => removeResource(item.uid)} className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="h-3 w-3 text-red-400 hover:text-red-300" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {!allCorrect && (
          <button onClick={handleValidate} className="px-5 py-2 rounded-xl text-white text-xs font-mono font-bold transition-colors" style={{ backgroundColor: AZURE }}>
            Validate Architecture
          </button>
        )}
        {placed.length > 0 && (
          <span className="text-[10px] font-mono text-gray-500">{placed.length} resource(s) placed · {required.length} required</span>
        )}
      </div>

      {validated && allCorrect && (
        <div className="bg-green-950/30 border border-green-700/40 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
          <span className="text-xs text-green-300">{interaction.feedback || "Architecture validated successfully!"}</span>
        </div>
      )}
      {validated && !allCorrect && (
        <div className="bg-red-950/30 border border-red-700/40 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-400 shrink-0" />
          <span className="text-xs text-red-300">Missing required resources. Review the architecture requirements and add the missing components.</span>
        </div>
      )}
    </div>
  );
}