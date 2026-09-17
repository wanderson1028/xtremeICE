import React, { useState } from "react";
import { CheckCircle2, XCircle, Gauge, ToggleLeft, ToggleRight, ChevronDown } from "lucide-react";

const AZURE = "#0078D4";

export default function DashboardInteraction({ interaction, onComplete }) {
  const [answers, setAnswers] = useState({});
  const [validated, setValidated] = useState(false);
  const [allCorrect, setAllCorrect] = useState(false);

  const setAnswer = (id, val) => {
    setAnswers(prev => ({ ...prev, [id]: val }));
    setValidated(false);
    setAllCorrect(false);
  };

  const handleValidate = () => {
    const correct = interaction.items.every(item => {
      const val = answers[item.id];
      if (item.type === "toggle") return val === item.correct;
      if (item.type === "slider") return val !== undefined && Math.abs(val - item.correct) <= item.tolerance || 0;
      return val === item.correct;
    });
    setAllCorrect(correct);
    setValidated(true);
    if (correct) onComplete();
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-2">
        <Gauge className="h-4 w-4" style={{ color: AZURE }} />
        <h3 className="text-sm font-bold text-white">{interaction.title}</h3>
      </div>
      {interaction.description && <p className="text-xs text-gray-400 mb-3">{interaction.description}</p>}

      <div className="grid gap-3">
        {interaction.items.map(item => {
          const val = answers[item.id];
          const isCorrect = validated && val === item.correct;
          const isWrong = validated && val !== item.correct;
          return (
            <div key={item.id} className={`bg-gray-900 border rounded-xl p-4 transition-colors ${isCorrect ? "border-green-700/50" : isWrong ? "border-red-800/50" : "border-gray-700"}`}>
              <div className="flex items-center justify-between gap-3">
                <label className="text-xs text-gray-300 font-medium flex-1">{item.label}</label>
                {isCorrect && <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />}
                {isWrong && <XCircle className="h-4 w-4 text-red-400 shrink-0" />}
              </div>
              <div className="mt-2">
                {item.type === "select" && (
                  <div className="flex flex-wrap gap-2">
                    {item.options.map(opt => (
                      <button
                        key={opt}
                        onClick={() => setAnswer(item.id, opt)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-mono border transition-all ${
                          val === opt ? "text-white border-2" : "bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500"
                        }`}
                        style={val === opt ? { backgroundColor: AZURE, borderColor: AZURE } : {}}
                      >
                        {opt}
                      </button>
                    ))}
                  </div>
                )}
                {item.type === "toggle" && (
                  <button onClick={() => setAnswer(item.id, val === undefined ? true : !val)} className="flex items-center gap-2">
                    {val ? <ToggleRight className="h-7 w-7" style={{ color: AZURE }} /> : <ToggleLeft className="h-7 w-7 text-gray-600" />}
                    <span className="text-xs font-mono text-gray-400">{val ? "Enabled" : "Disabled"}</span>
                  </button>
                )}
                {item.type === "slider" && (
                  <div className="flex items-center gap-3">
                    <input type="range" min={item.min || 0} max={item.max || 100} value={(val ?? item.min) || 0} onChange={e => setAnswer(item.id, Number(e.target.value))} className="flex-1 accent-blue-500" style={{ accentColor: AZURE }} />
                    <span className="text-xs font-mono w-12 text-right" style={{ color: AZURE }}>{(val ?? item.min) || 0}{item.unit || ""}</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {!allCorrect && (
        <button onClick={handleValidate} className="w-full py-2.5 rounded-xl text-white text-xs font-mono font-bold transition-colors" style={{ backgroundColor: AZURE }}>
          Validate Configuration
        </button>
      )}
      {validated && allCorrect && (
        <div className="bg-green-950/30 border border-green-700/40 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
          <span className="text-xs text-green-300">{interaction.feedback || "Configuration validated successfully!"}</span>
        </div>
      )}
      {validated && !allCorrect && (
        <div className="bg-red-950/30 border border-red-700/40 rounded-xl px-4 py-2.5 flex items-center gap-2">
          <XCircle className="h-4 w-4 text-red-400 shrink-0" />
          <span className="text-xs text-red-300">Some answers are incorrect. Review the scenarios and try again.</span>
        </div>
      )}
    </div>
  );
}