import React from "react";
import { Search, FileText, Database, Cpu, MessageSquare } from "lucide-react";

// RAG architecture flow: query → embed → vector search → augment prompt → LLM → grounded answer.
const STEPS = [
  { icon: Search, label: "User Query", sub: '"What is our refund policy?"', color: "text-blue-400 bg-blue-950/40 border-blue-700/40" },
  { icon: FileText, label: "Embed Query", sub: "text → vector", color: "text-purple-400 bg-purple-950/40 border-purple-700/40" },
  { icon: Database, label: "Vector Search", sub: "find similar docs", color: "text-amber-400 bg-amber-950/40 border-amber-700/40" },
  { icon: MessageSquare, label: "Augmented Prompt", sub: "query + retrieved context", color: "text-cyan-400 bg-cyan-950/40 border-cyan-700/40" },
  { icon: Cpu, label: "LLM Generates", sub: "grounded response", color: "text-green-400 bg-green-950/40 border-green-700/40" },
];

export default function RagArchitectureDiagram() {
  return (
    <div>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          return (
            <React.Fragment key={s.label}>
              <div className={`flex flex-col items-center rounded-lg border p-2.5 min-w-[120px] ${s.color}`}>
                <Icon className="h-5 w-5 mb-1.5" />
                <div className="text-[10px] font-mono font-bold">{s.label}</div>
                <div className="text-[9px] font-mono opacity-80 text-center mt-0.5">{s.sub}</div>
              </div>
              {i < STEPS.length - 1 && <span className="text-gray-600 text-lg font-mono shrink-0">→</span>}
            </React.Fragment>
          );
        })}
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="bg-gray-900/60 border border-gray-700 rounded-lg p-2.5">
          <div className="text-[10px] font-mono text-green-400 font-bold mb-1">Without RAG</div>
          <p className="text-[10px] font-mono text-gray-400 leading-relaxed">LLM answers from its training data — may be outdated or hallucinate about your private data.</p>
        </div>
        <div className="bg-gray-900/60 border border-green-800/40 rounded-lg p-2.5">
          <div className="text-[10px] font-mono text-green-400 font-bold mb-1">With RAG</div>
          <p className="text-[10px] font-mono text-gray-400 leading-relaxed">LLM answers from retrieved context — grounded, citeable, and current.</p>
        </div>
      </div>
    </div>
  );
}