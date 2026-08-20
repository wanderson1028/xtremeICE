import React from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";

// Training vs. validation loss — the canonical overfitting visualization.
// Training loss keeps dropping; validation loss drops then climbs back up.
const data = [
  { epoch: 1, train: 0.90, val: 0.92 },
  { epoch: 2, train: 0.72, val: 0.74 },
  { epoch: 3, train: 0.55, val: 0.58 },
  { epoch: 4, train: 0.40, val: 0.45 },
  { epoch: 5, train: 0.28, val: 0.35 },
  { epoch: 6, train: 0.20, val: 0.30 },
  { epoch: 7, train: 0.14, val: 0.28 },
  { epoch: 8, train: 0.10, val: 0.30 },
  { epoch: 9, train: 0.07, val: 0.34 },
  { epoch: 10, train: 0.05, val: 0.39 },
];

export default function LossCurveChart() {
  return (
    <div>
      <div className="h-48 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis dataKey="epoch" stroke="#6b7280" fontSize={10} tickLine={false} label={{ value: "Epoch", position: "insideBottomRight", offset: 0, fill: "#6b7280", fontSize: 10 }} />
            <YAxis stroke="#6b7280" fontSize={10} tickLine={false} domain={[0, 1]} />
            <Tooltip contentStyle={{ backgroundColor: "#1f2937", border: "1px solid #374151", borderRadius: "8px", fontSize: "11px" }} />
            <Legend wrapperStyle={{ fontSize: "11px" }} />
            <ReferenceLine x={7} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: "overfit begins", fill: "#f59e0b", fontSize: 9, position: "top" }} />
            <Line type="monotone" dataKey="train" name="Training loss" stroke="#3b82f6" strokeWidth={2} dot={false} />
            <Line type="monotone" dataKey="val" name="Validation loss" stroke="#ef4444" strokeWidth={2} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="grid grid-cols-2 gap-3 mt-3">
        <div className="bg-blue-950/40 border border-blue-800/40 rounded-lg p-2.5">
          <div className="text-[10px] font-mono text-blue-400 font-bold mb-1">Training loss (blue)</div>
          <p className="text-[10px] font-mono text-gray-400 leading-relaxed">Keeps decreasing — the model memorizes the training set.</p>
        </div>
        <div className="bg-red-950/40 border border-red-800/40 rounded-lg p-2.5">
          <div className="text-[10px] font-mono text-red-400 font-bold mb-1">Validation loss (red)</div>
          <p className="text-[10px] font-mono text-gray-400 leading-relaxed">Drops, then rises after epoch 7 — the model stops generalizing. This gap is overfitting.</p>
        </div>
      </div>
    </div>
  );
}