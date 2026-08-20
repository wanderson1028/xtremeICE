import React from "react";

// Static visual: how temperature affects token selection from the same prompt.
// Low temp = deterministic/peaked; high temp = creative/spread.
const LEVELS = [
  {
    level: "Temperature 0.0",
    label: "Deterministic",
    desc: "Always picks the top token. Reproducible, safe, factual.",
    tokens: [
      { word: "capital", p: 100, color: "bg-blue-500" },
      { word: "city", p: 0, color: "bg-gray-700" },
      { word: "hub", p: 0, color: "bg-gray-700" },
    ],
    accent: "text-blue-400 border-blue-700/40",
  },
  {
    level: "Temperature 0.7",
    label: "Balanced",
    desc: "Mostly top token, some variety. Good default for most tasks.",
    tokens: [
      { word: "capital", p: 70, color: "bg-blue-500" },
      { word: "city", p: 22, color: "bg-purple-500" },
      { word: "hub", p: 8, color: "bg-amber-500" },
    ],
    accent: "text-purple-400 border-purple-700/40",
  },
  {
    level: "Temperature 1.0+",
    label: "Creative",
    desc: "Flat distribution. Diverse, surprising — higher hallucination risk.",
    tokens: [
      { word: "capital", p: 40, color: "bg-blue-500" },
      { word: "city", p: 35, color: "bg-purple-500" },
      { word: "hub", p: 25, color: "bg-amber-500" },
    ],
    accent: "text-amber-400 border-amber-700/40",
  },
];

export default function TemperatureEffect() {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-[10px] font-mono text-gray-400 text-center">Prompt: "Paris is the ___ of France." — same prompt, three temperature settings:</div>
      {LEVELS.map(l => (
        <div key={l.level} className={`bg-black/40 border rounded-lg p-3 ${l.accent}`}>
          <div className="flex items-center justify-between mb-2">
            <span className={`text-xs font-mono font-bold ${l.accent.split(" ")[0]}`}>{l.level}</span>
            <span className="text-[10px] font-mono text-gray-500">{l.label}</span>
          </div>
          <div className="flex gap-1.5 h-5 rounded-md overflow-hidden mb-2">
            {l.tokens.map(t => (
              <div key={t.word} className={`${t.color} flex items-center justify-center text-[9px] font-mono text-white/90`} style={{ width: `${Math.max(t.p, 4)}%` }}>
                {t.p > 12 ? `${t.word} ${t.p}%` : ""}
              </div>
            ))}
          </div>
          <p className="text-[10px] font-mono text-gray-400 leading-relaxed">{l.desc}</p>
        </div>
      ))}
      <p className="text-[10px] font-mono text-gray-500 text-center">Higher temperature flattens the probability distribution → more random, creative, and risky output.</p>
    </div>
  );
}