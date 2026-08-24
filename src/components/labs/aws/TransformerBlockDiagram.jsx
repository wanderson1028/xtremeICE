import React from "react";
import { ArrowRight } from "lucide-react";

// Simplified transformer block diagram: input → embedding + positional encoding
// → self-attention → feed-forward → output. The core of generative ML models.
export default function TransformerBlockDiagram() {
  const blocks = [
    { label: "Tokenized Input", sub: "text → tokens", color: "bg-blue-950/50 border-blue-700/50 text-blue-300" },
    { label: "Embeddings + Positional Encoding", sub: "tokens → vectors", color: "bg-purple-950/50 border-purple-700/50 text-purple-300" },
    { label: "Self-Attention", sub: "each token weighs others", color: "bg-amber-950/50 border-amber-700/50 text-amber-300" },
    { label: "Feed-Forward Network", sub: "non-linear transform", color: "bg-green-950/50 border-green-700/50 text-green-300" },
    { label: "Output Probabilities", sub: "next-token distribution", color: "bg-red-950/50 border-red-700/50 text-red-300" },
  ];
  return (
    <div>
      <div className="flex flex-col gap-1.5">
        {blocks.map((b, i) => (
          <React.Fragment key={b.label}>
            <div className={`rounded-lg border px-3 py-2 ${b.color}`}>
              <div className="text-[11px] font-mono font-bold">{b.label}</div>
              <div className="text-[9px] font-mono opacity-80 mt-0.5">{b.sub}</div>
            </div>
            {i < blocks.length - 1 && (
              <div className="flex justify-center"><ArrowRight className="h-3.5 w-3.5 text-gray-600 rotate-90" /></div>
            )}
          </React.Fragment>
        ))}
      </div>
      <p className="text-[10px] font-mono text-gray-500 mt-3 text-center">Self-attention lets every token consider every other token — the mechanism that lets transformers model long-range context.</p>
    </div>
  );
}