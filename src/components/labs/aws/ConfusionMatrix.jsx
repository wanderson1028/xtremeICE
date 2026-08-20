import React from "react";

// A 2x2 confusion matrix with TP / TN / FP / FN cells.
export default function ConfusionMatrix() {
  const cells = [
    { label: "True Positive", short: "TP", desc: "Predicted spam, is spam", color: "bg-green-900/50 border-green-700/50 text-green-300" },
    { label: "False Negative", short: "FN", desc: "Predicted ham, is spam", color: "bg-red-900/50 border-red-700/50 text-red-300" },
    { label: "False Positive", short: "FP", desc: "Predicted spam, is ham", color: "bg-red-900/50 border-red-700/50 text-red-300" },
    { label: "True Negative", short: "TN", desc: "Predicted ham, is ham", color: "bg-green-900/50 border-green-700/50 text-green-300" },
  ];
  return (
    <div>
      <div className="grid grid-cols-[auto_1fr_1fr] gap-1.5 max-w-md">
        <div />
        <div className="text-center text-[10px] font-mono text-gray-400 font-bold pb-1">Predicted Positive</div>
        <div className="text-center text-[10px] font-mono text-gray-400 font-bold pb-1">Predicted Negative</div>

        <div className="flex items-center justify-center text-[10px] font-mono text-gray-400 font-bold pr-1 rotate-180 [writing-mode:vertical-rl]">Actual Positive</div>
        <div className={`rounded-lg border p-3 flex flex-col items-center justify-center ${cells[0].color}`}>
          <span className="text-base font-mono font-bold">{cells[0].short}</span>
          <span className="text-[9px] font-mono text-center mt-0.5">{cells[0].desc}</span>
        </div>
        <div className={`rounded-lg border p-3 flex flex-col items-center justify-center ${cells[1].color}`}>
          <span className="text-base font-mono font-bold">{cells[1].short}</span>
          <span className="text-[9px] font-mono text-center mt-0.5">{cells[1].desc}</span>
        </div>

        <div className="flex items-center justify-center text-[10px] font-mono text-gray-400 font-bold pr-1 rotate-180 [writing-mode:vertical-rl]">Actual Negative</div>
        <div className={`rounded-lg border p-3 flex flex-col items-center justify-center ${cells[2].color}`}>
          <span className="text-base font-mono font-bold">{cells[2].short}</span>
          <span className="text-[9px] font-mono text-center mt-0.5">{cells[2].desc}</span>
        </div>
        <div className={`rounded-lg border p-3 flex flex-col items-center justify-center ${cells[3].color}`}>
          <span className="text-base font-mono font-bold">{cells[3].short}</span>
          <span className="text-[9px] font-mono text-center mt-0.5">{cells[3].desc}</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-mono">
        <div className="bg-gray-900/60 border border-gray-700 rounded px-2 py-1.5">
          <span className="text-cyan-400">Precision</span> = TP / (TP + FP) — of all spam predictions, how many were right
        </div>
        <div className="bg-gray-900/60 border border-gray-700 rounded px-2 py-1.5">
          <span className="text-cyan-400">Recall</span> = TP / (TP + FN) — of all real spam, how much we caught
        </div>
      </div>
    </div>
  );
}