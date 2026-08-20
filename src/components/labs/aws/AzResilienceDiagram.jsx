import React from "react";
import { Server, AlertTriangle, CheckCircle2, Cloud } from "lucide-react";

// Contrasts single-AZ (single point of failure) with multi-AZ behind a
// load balancer (high availability) — the core CLF-002 resilience concept.
export default function AzResilienceDiagram() {
  const azs = ["us-east-1a", "us-east-1b", "us-east-1c"];
  return (
    <div className="flex flex-col gap-4">
      {/* Risky: single AZ */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <span className="text-xs font-mono text-red-400 font-bold uppercase tracking-wider">Single AZ — single point of failure</span>
        </div>
        <div className="bg-black/40 border border-red-800/40 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Cloud className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-[11px] font-mono text-gray-400">Region: us-east-1</span>
          </div>
          <div className="flex gap-3">
            {azs.map((az, i) => (
              <div key={az} className={`flex-1 rounded-md border p-2 ${i === 0 ? "border-red-600/60 bg-red-950/40" : "border-gray-800 bg-gray-900/40 opacity-40"}`}>
                <div className="text-[10px] font-mono text-gray-400 mb-1">{az}</div>
                {i === 0 ? (
                  <span className="flex items-center gap-1.5 text-[11px] font-mono text-red-300">
                    <Server className="h-4 w-4 text-red-400" /> EC2
                    <AlertTriangle className="h-3 w-3 text-red-400" />
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-gray-600">idle</span>
                )}
              </div>
            ))}
          </div>
          <p className="text-[10px] font-mono text-red-300/80 mt-2">If us-east-1a fails → app is DOWN. No redundancy.</p>
        </div>
      </div>

      {/* Resilient: multi-AZ + LB */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle2 className="h-4 w-4 text-green-400" />
          <span className="text-xs font-mono text-green-400 font-bold uppercase tracking-wider">Multi-AZ + load balancer — high availability</span>
        </div>
        <div className="bg-black/40 border border-green-800/40 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <Cloud className="h-3.5 w-3.5 text-gray-400" />
            <span className="text-[11px] font-mono text-gray-400">Region: us-east-1</span>
          </div>
          <div className="flex justify-center mb-2">
            <div className="px-3 py-1 rounded-md bg-blue-950/60 border border-blue-700/50 text-[10px] font-mono text-blue-300 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-blue-400" /> Application Load Balancer
            </div>
          </div>
          <div className="flex gap-3">
            {azs.map((az, i) => (
              <div key={az} className={`flex-1 rounded-md border p-2 ${i < 2 ? "border-green-600/60 bg-green-950/30" : "border-gray-800 bg-gray-900/40 opacity-40"}`}>
                <div className="text-[10px] font-mono text-gray-400 mb-1">{az}</div>
                {i < 2 ? (
                  <span className="flex items-center gap-1.5 text-[11px] font-mono text-green-300">
                    <Server className="h-4 w-4 text-green-400" /> EC2
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-gray-600">idle</span>
                )}
              </div>
            ))}
          </div>
          <p className="text-[10px] font-mono text-green-300/80 mt-2">If us-east-1a fails → traffic routes to us-east-1b. App stays UP.</p>
        </div>
      </div>
    </div>
  );
}