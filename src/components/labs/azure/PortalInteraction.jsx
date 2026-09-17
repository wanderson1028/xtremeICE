import React, { useState } from "react";
import { CheckCircle2, XCircle, ChevronRight, Server, Cloud, Database, Network, Shield, Monitor, Layers } from "lucide-react";

const AZURE = "#0078D4";

const bladeIcons = { Basics: Server, Networking: Network, Storage: Database, Security: Shield, Monitoring: Monitor, Tags: Layers, Review: CheckCircle2 };

export default function PortalInteraction({ interaction, onComplete }) {
  const [activeBlade, setActiveBlade] = useState(0);
  const [formValues, setFormValues] = useState({});
  const [validated, setValidated] = useState(false);
  const [allCorrect, setAllCorrect] = useState(false);
  const [showReview, setShowReview] = useState(false);

  const blades = interaction.blades || [];
  const currentBlade = blades[activeBlade];

  const setField = (id, val) => {
    setFormValues(prev => ({ ...prev, [id]: val }));
    setValidated(false);
    setAllCorrect(false);
  };

  const handleValidate = () => {
    const correct = blades.every(blade =>
      (blade.fields || []).every(field => formValues[field.id] === field.correct)
    );
    setAllCorrect(correct);
    setValidated(true);
    if (correct) onComplete();
  };

  return (
    <div className="rounded-xl border border-gray-700 overflow-hidden" style={{ backgroundColor: "#0d1117" }}>
      {/* Portal header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-700" style={{ backgroundColor: "#161b22" }}>
        <Cloud className="h-4 w-4" style={{ color: AZURE }} />
        <span className="text-xs font-bold text-white">Azure Portal</span>
        <span className="text-gray-600 mx-1">›</span>
        <span className="text-xs text-gray-400">{interaction.title}</span>
      </div>

      <div className="flex min-h-[280px]">
        {/* Left rail — blade navigation */}
        <div className="w-36 shrink-0 border-r border-gray-700 p-2 space-y-1" style={{ backgroundColor: "#0d1117" }}>
          {blades.map((blade, i) => {
            const Icon = bladeIcons[blade.name] || Layers;
            const active = i === activeBlade;
            return (
              <button
                key={i}
                onClick={() => { setActiveBlade(i); setShowReview(false); }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-mono transition-all ${
                  active ? "text-white" : "text-gray-400 hover:text-gray-300 hover:bg-gray-800"
                }`}
                style={active ? { backgroundColor: "rgba(0,120,212,0.15)" } : {}}
              >
                <Icon className="h-3.5 w-3.5 shrink-0" style={active ? { color: AZURE } : {}} />
                <span className="text-left flex-1">{blade.name}</span>
                {active && <ChevronRight className="h-3 w-3" style={{ color: AZURE }} />}
              </button>
            );
          })}
          <button
            onClick={() => { setShowReview(true); setActiveBlade(-1); }}
            className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs font-mono transition-all ${
              showReview ? "text-white" : "text-gray-400 hover:text-gray-300 hover:bg-gray-800"
            }`}
            style={showReview ? { backgroundColor: "rgba(0,120,212,0.15)" } : {}}
          >
            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={showReview ? { color: AZURE } : {}} />
            <span>Review + Create</span>
          </button>
        </div>

        {/* Blade content */}
        <div className="flex-1 p-4">
          {showReview ? (
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-white mb-2">Review Configuration</h3>
              {blades.map(blade => (
                <div key={blade.name} className="bg-gray-900 border border-gray-700 rounded-lg p-3">
                  <div className="text-[10px] font-mono uppercase mb-2" style={{ color: AZURE }}>{blade.name}</div>
                  <div className="space-y-1">
                    {(blade.fields || []).map(field => (
                      <div key={field.id} className="flex justify-between text-xs">
                        <span className="text-gray-400">{field.label}</span>
                        <span className="font-mono text-gray-200">{formValues[field.id] || "—"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <button onClick={handleValidate} className="w-full py-2.5 rounded-xl text-white text-xs font-mono font-bold transition-colors" style={{ backgroundColor: AZURE }}>
                Create Resource
              </button>
              {validated && allCorrect && (
                <div className="bg-green-950/30 border border-green-700/40 rounded-xl px-4 py-2.5 flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                  <span className="text-xs text-green-300">{interaction.feedback || "Resource deployed successfully!"}</span>
                </div>
              )}
              {validated && !allCorrect && (
                <div className="bg-red-950/30 border border-red-700/40 rounded-xl px-4 py-2.5 flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-400 shrink-0" />
                  <span className="text-xs text-red-300">Validation failed. Check the blade fields and try again.</span>
                </div>
              )}
            </div>
          ) : currentBlade ? (
            <div className="space-y-4">
              <h3 className="text-sm font-bold text-white">{currentBlade.name}</h3>
              {(currentBlade.fields || []).map(field => (
                <div key={field.id}>
                  <label className="text-xs text-gray-300 font-medium block mb-1.5">{field.label}</label>
                  {field.type === "text" && (
                    <input
                      type="text"
                      value={formValues[field.id] || ""}
                      onChange={e => setField(field.id, e.target.value)}
                      placeholder={field.placeholder || ""}
                      className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none focus:border-blue-500"
                      style={{ "--tw-border-opacity": 1 }}
                    />
                  )}
                  {field.type === "select" && (
                    <div className="flex flex-wrap gap-2">
                      {field.options.map(opt => (
                        <button
                          key={opt}
                          onClick={() => setField(field.id, opt)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                            formValues[field.id] === opt ? "text-white border-2" : "bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500"
                          }`}
                          style={formValues[field.id] === opt ? { backgroundColor: AZURE, borderColor: AZURE } : {}}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}
                  {field.type === "toggle" && (
                    <button onClick={() => setField(field.id, formValues[field.id] === undefined ? true : !formValues[field.id])} className="flex items-center gap-2">
                      <span className={`px-4 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                        formValues[field.id] ? "text-white border-2" : "bg-gray-800 border-gray-600 text-gray-400"
                      }`} style={formValues[field.id] ? { backgroundColor: AZURE, borderColor: AZURE } : {}}>
                        {formValues[field.id] ? "Enabled" : "Disabled"}
                      </span>
                    </button>
                  )}
                  {field.hint && <p className="text-[10px] text-gray-500 mt-1">{field.hint}</p>}
                </div>
              ))}
              {activeBlade < blades.length - 1 && (
                <button onClick={() => setActiveBlade(activeBlade + 1)} className="text-xs font-mono flex items-center gap-1" style={{ color: AZURE }}>
                  Next: {blades[activeBlade + 1].name} <ChevronRight className="h-3 w-3" />
                </button>
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}