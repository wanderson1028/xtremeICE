import React from "react";
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, ResponsiveContainer, Tooltip } from "recharts";

// 2D embedding space: similar concepts cluster together. This is what
// embeddings *are* — vectors where distance = semantic similarity.
const clusters = [
  // Animals cluster (top-left)
  { x: 1.2, y: 7.5, label: "dog" },
  { x: 1.8, y: 8.1, label: "cat" },
  { x: 1.5, y: 7.0, label: "horse" },
  { x: 2.2, y: 7.8, label: "cow" },
  // Vehicles cluster (bottom-right)
  { x: 7.5, y: 2.2, label: "car" },
  { x: 8.1, y: 1.8, label: "truck" },
  { x: 7.8, y: 2.8, label: "bus" },
  { x: 8.4, y: 2.0, label: "van" },
  // Fruits cluster (top-right)
  { x: 7.2, y: 7.8, label: "apple" },
  { x: 7.8, y: 8.2, label: "orange" },
  { x: 8.0, y: 7.4, label: "banana" },
  { x: 7.5, y: 8.5, label: "grape" },
];

const animalData = clusters.filter(c => ["dog", "cat", "horse", "cow"].includes(c.label));
const vehicleData = clusters.filter(c => ["car", "truck", "bus", "van"].includes(c.label));
const fruitData = clusters.filter(c => ["apple", "orange", "banana", "grape"].includes(c.label));

function PointTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-gray-900 border border-gray-600 rounded px-2 py-1 text-[11px] font-mono text-white">
      {p.label}
    </div>
  );
}

export default function EmbeddingSpaceScatter() {
  return (
    <div>
      <div className="h-56 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 15, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
            <XAxis type="number" dataKey="x" domain={[0, 10]} stroke="#6b7280" fontSize={10} tickLine={false} />
            <YAxis type="number" dataKey="y" domain={[0, 10]} stroke="#6b7280" fontSize={10} tickLine={false} />
            <ZAxis type="number" dataKey="label" range={[60, 60]} />
            <Tooltip content={<PointTooltip />} cursor={{ strokeDasharray: "3 3", stroke: "#4b5563" }} />
            <Scatter data={animalData} fill="#3b82f6" />
            <Scatter data={vehicleData} fill="#ef4444" />
            <Scatter data={fruitData} fill="#22c55e" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <div className="flex items-center gap-4 justify-center text-[10px] font-mono mt-1">
        <span className="flex items-center gap-1.5 text-blue-400"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Animals</span>
        <span className="flex items-center gap-1.5 text-red-400"><span className="h-2.5 w-2.5 rounded-full bg-red-500" /> Vehicles</span>
        <span className="flex items-center gap-1.5 text-green-400"><span className="h-2.5 w-2.5 rounded-full bg-green-500" /> Fruits</span>
      </div>
      <p className="text-[10px] font-mono text-gray-500 mt-2 text-center">Embeddings place semantically similar words near each other — distance = meaning. This is how semantic search and RAG retrieve relevant context.</p>
    </div>
  );
}