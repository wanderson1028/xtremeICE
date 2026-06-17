import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, RotateCcw } from "lucide-react";
import EigrpConsole from "@/components/eigrp/EigrpConsole";
import EigrpTopologyDiagram from "@/components/eigrp/EigrpTopologyDiagram";
import EigrpValidationPanel from "@/components/eigrp/EigrpValidationPanel";
import EigrpInterfaceTable from "@/components/eigrp/EigrpInterfaceTable";
import EigrpStepGuide from "@/components/eigrp/EigrpStepGuide";
import DifficultySelector from "@/components/ospf/DifficultySelector";
import { createBlankState } from "@/components/eigrp/eigrpEngine";

const ROUTERS = ["R1", "R2", "R3", "R4", "R5", "R6"];

export default function EigrpLab() {
  const navigate = useNavigate();
  const [selectedRouter, setSelectedRouter] = useState(null);
  const [routerStates, setRouterStates] = useState({});
  const [completed, setCompleted] = useState(false);
  const [difficulty, setDifficulty] = useState("easy");
  const [resetKey, setResetKey] = useState(0);

  const currentState = selectedRouter
    ? (routerStates[selectedRouter] || createBlankState(selectedRouter))
    : null;

  const handleStateChange = (newState) => {
    setRouterStates(prev => ({ ...prev, [selectedRouter]: newState }));
  };

  const handleReset = () => {
    setRouterStates(prev => ({ ...prev, [selectedRouter]: createBlankState(selectedRouter) }));
    setCompleted(false);
    setResetKey(k => k + 1);
  };

  if (!selectedRouter) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/20 flex flex-col items-center justify-center p-6">
        <button onClick={() => navigate("/InteractiveVirtualLabs")} className="self-start mb-6 flex items-center gap-2 text-gray-400 hover:text-white text-sm font-mono transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Active Labs
        </button>

        <div className="text-center mb-8">
          <div className="inline-block px-3 py-1 bg-red-900/40 border border-red-700/50 rounded-full text-red-400 text-xs font-mono mb-3">
            EIGRP LAB — CISCO IOS SIMULATION
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Cisco EIGRP Virtual Lab</h1>
          <p className="text-gray-400 text-sm max-w-xl mb-5">
            Configure a 6-router EIGRP AS 100 topology. Select a router, configure interfaces, enable EIGRP, run{" "}
            <span className="text-green-400 font-mono">no auto-summary</span>, then verify neighbors and ping a remote loopback.
          </p>
          <div className="flex items-center justify-center gap-4">
            <span className="text-xs font-mono text-gray-500">Select difficulty:</span>
            <DifficultySelector difficulty={difficulty} onChange={setDifficulty} />
          </div>
          <div className="mt-2 text-[11px] font-mono text-gray-600">
            {difficulty === "easy" && "Easy — exact commands shown step by step"}
            {difficulty === "medium" && "Medium — guided hints, no exact commands"}
            {difficulty === "hard" && "Hard — no guidance, sink or swim"}
          </div>
        </div>

        <div className="w-full max-w-2xl mb-8">
          <EigrpTopologyDiagram selectedRouter={null} onSelect={setSelectedRouter} />
        </div>
        <p className="text-gray-300 text-xs font-mono mt-2">
          👆 Click any router node to begin
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/20 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-black/60 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setSelectedRouter(null)} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs font-mono transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Router Select
          </button>
          <span className="text-gray-600">|</span>
          <span className="text-white font-mono font-bold text-sm">Cisco EIGRP Lab</span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono text-gray-500">Configuring:</span>
          <span className="px-3 py-1 bg-red-900/50 border border-red-600 rounded-lg text-red-300 font-mono font-bold text-sm">{selectedRouter}</span>
        </div>

        <div className="flex items-center gap-3">
          <DifficultySelector difficulty={difficulty} onChange={setDifficulty} />
          {completed && (
            <div className="flex items-center gap-1.5 text-yellow-400 text-xs font-mono">
              <Trophy className="h-4 w-4" /> Lab Complete!
            </div>
          )}
          <button onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-red-900/40 border border-gray-700 hover:border-red-600 rounded-lg text-gray-400 hover:text-red-400 text-xs font-mono transition-all">
            <RotateCcw className="h-3.5 w-3.5" /> Reset Router
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 flex gap-0 min-h-0 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-96 shrink-0 flex flex-col gap-3 p-3 border-r border-gray-800 overflow-y-auto">
          <EigrpTopologyDiagram selectedRouter={selectedRouter} onSelect={setSelectedRouter} locked={true} />
          <EigrpInterfaceTable routerName={selectedRouter} />
        </div>

        {/* Console — center */}
        <div className="flex-1 flex flex-col p-3 min-w-0">
          <EigrpConsole
            key={`${selectedRouter}-${resetKey}`}
            routerName={selectedRouter}
            onComplete={() => setCompleted(true)}
            state={currentState}
            onStateChange={handleStateChange}
            resetKey={resetKey}
          />
        </div>

        {/* Right sidebar */}
        <div className="w-64 shrink-0 flex flex-col gap-3 p-3 border-l border-gray-800 overflow-y-auto">
          {currentState && (
            <EigrpValidationPanel state={currentState} routerName={selectedRouter} />
          )}
          <EigrpStepGuide routerName={selectedRouter} difficulty={difficulty} />

          {difficulty !== "easy" && (
            <div className="bg-gray-950 border border-gray-700 rounded-xl p-3">
              <div className="text-xs text-gray-400 font-mono mb-2">Quick Reference</div>
              <div className="text-[11px] font-mono text-gray-500 space-y-1">
                <div className="text-gray-300">Configure interface:</div>
                <div className="text-cyan-400 pl-2">int g0/0</div>
                <div className="text-cyan-400 pl-2">ip add &lt;ip&gt; &lt;mask&gt;</div>
                <div className="text-cyan-400 pl-2">no shut</div>
                <div className="mt-2 text-gray-300">Enable EIGRP:</div>
                <div className="text-cyan-400 pl-2">router eigrp 100</div>
                <div className="text-cyan-400 pl-2">network &lt;ip&gt; 0.0.0.0</div>
                <div className="text-cyan-400 pl-2">no auto-summary</div>
                <div className="mt-2 text-gray-300">Verify:</div>
                <div className="text-cyan-400 pl-2">show ip eigrp neighbors</div>
                <div className="text-cyan-400 pl-2">show ip route</div>
                <div className="text-cyan-400 pl-2">ping &lt;loopback&gt;</div>
              </div>
            </div>
          )}

          {completed && (
            <div className="bg-green-950/50 border border-green-700 rounded-xl p-4 text-center">
              <Trophy className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
              <div className="text-green-400 font-bold text-sm font-mono mb-1">Lab Complete!</div>
              <div className="text-green-300 text-[11px] font-mono">
                EIGRP adjacencies established and remote loopback reachable.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}