import React from "react";
import { Database, Cpu, CheckSquare, Server, Activity } from "lucide-react";

// The ML pipeline / lifecycle: data → train → validate → deploy → monitor.
const STAGES = [
  { icon: Database, label: "Data Collection", desc: "Gather & label", color: "text-blue-400", bg: "bg-blue-950/40 border-blue-700/40" },
  { icon: Cpu, label: "Training", desc: "Fit model to data", color: "text-purple-400", bg: "bg-purple-950/40 border-purple-700/40" },
  { icon: CheckSquare, label: "Validation", desc: "Evaluate on held-out data", color: "text-amber-400", bg: "bg-amber-950/40 border-amber-700/40" },
  { icon: Server, label: "Deployment", desc: "Serve predictions", color: "text-green-400", bg: "bg-green-950/40 border-green-700/40" },
  { icon: Activity, label: "Monitoring", desc: "Drift & retrain", color: "text-red-400", bg: "bg-red-950/40 border-red-700/40" },
];

export default function MlPipelineDiagram() {
  return (
    <div>
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {STAGES.map((s, i) => {
          const Icon = s.icon;
          return (
            <React.Fragment key={s.label}>
              <div className={`flex flex-col items-center rounded-lg border p-2.5 min-w-[110px] ${s.bg}`}>
                <Icon className={`h-5 w-5 ${s.color} mb-1.5`} />
                <div className={`text-[10px] font-mono font-bold ${s.color}`}>{s.label}</div>
                <div className="text-[9px] font-mono text-gray-500 text-center leading-tight mt-0.5">{s.desc}</div>
              </div>
              {i < STAGES.length - 1 && (
                <span className="text-gray-600 text-lg font-mono shrink-0">→</span>
              )}
            </React.Fragment>
          );
        })}
      </div>
      <p className="text-[10px] font-mono text-gray-500 mt-3 text-center">The ML lifecycle is iterative — monitoring feeds back into data collection and retraining</p>
    </div>
  );
}