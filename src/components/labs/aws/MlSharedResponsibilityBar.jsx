import React from "react";

// ML shared-responsibility model: what AWS manages vs. what the customer manages,
// with the ML-specific layer (prompts, training data, model outputs).
const LAYERS = [
  { name: "Foundation infrastructure", example: "Hardware, network, virtualization", provider: true },
  { name: "Foundation models (base)", example: "Bedrock base models, Titan, Claude", provider: true },
  { name: "Model fine-tuning & customization", example: "Fine-tuned weights, training data", customer: true },
  { name: "Prompts & application logic", example: "Prompt templates, RAG pipeline, orchestration", customer: true },
  { name: "Model outputs & user data", example: "Generated text, user PII in prompts/outputs", customer: true },
  { name: "Governance & compliance", example: "Model cards, audit logs, usage policies", customer: true },
];

export default function MlSharedResponsibilityBar() {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-4 text-[10px] font-mono">
        <span className="flex items-center gap-1.5 text-gray-400"><span className="h-3 w-3 rounded-sm bg-gray-600" /> AWS manages</span>
        <span className="flex items-center gap-1.5 text-blue-300"><span className="h-3 w-3 rounded-sm bg-blue-600" /> Customer manages</span>
      </div>
      <div className="flex flex-col gap-1.5">
        {LAYERS.map(l => (
          <div key={l.name} className="flex items-stretch gap-0">
            <div className={`flex-1 rounded-l-md px-3 py-2 ${l.provider ? "bg-gray-600" : "bg-transparent border border-dashed border-gray-700"}`}>
              {l.provider && (
                <>
                  <div className="text-[11px] font-mono font-bold text-white">{l.name}</div>
                  <div className="text-[9px] font-mono text-gray-300">{l.example}</div>
                </>
              )}
            </div>
            <div className={`flex-1 rounded-r-md px-3 py-2 ${l.customer ? "bg-blue-600" : "bg-transparent border border-dashed border-gray-700"}`}>
              {l.customer && (
                <>
                  <div className="text-[11px] font-mono font-bold text-white">{l.name}</div>
                  <div className="text-[9px] font-mono text-blue-100">{l.example}</div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <p className="text-[10px] font-mono text-gray-500 text-center">AWS secures the models and infrastructure. You are responsible for what you put in (prompts, training data) and what comes out (responses, governance).</p>
    </div>
  );
}