import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, RotateCcw } from "lucide-react";
import OspfConsole from "@/components/ospf/OspfConsole";
import OspfTopologyDiagram from "@/components/ospf/OspfTopologyDiagram";
import OspfValidationPanel from "@/components/ospf/OspfValidationPanel";
import OspfInterfaceTable from "@/components/ospf/OspfInterfaceTable";
import DifficultySelector from "@/components/ospf/DifficultySelector";
import OspfStepGuide from "@/components/ospf/OspfStepGuide";
import { createBlankState } from "@/components/ospf/ospfEngine";

const ROUTERS = ["R1", "R2", "R3", "R4", "R5", "R6", "R7", "R8"];

export default function OspfLab() {
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

  const handleSelect = (r) => {
    setSelectedRouter(r);
    setCompleted(false);
  };

  const handleComplete = () => setCompleted(true);

  const handleReset = () => {
    setRouterStates(prev => ({ ...prev, [selectedRouter]: createBlankState(selectedRouter) }));
    setCompleted(false);
    setResetKey(k => k + 1);
  };

  // Selection screen
  if (!selectedRouter) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/20 flex flex-col items-center justify-center p-6">
        <button onClick={() => navigate("/Labs")} className="self-start mb-6 flex items-center gap-2 text-gray-400 hover:text-white text-sm font-mono transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Labs
        </button>

        <div className="text-center mb-8">
          <div className="inline-block px-3 py-1 bg-red-900/40 border border-red-700/50 rounded-full text-red-400 text-xs font-mono mb-3">
            OSPF LAB — CISCO IOS SIMULATION
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Cisco OSPF Virtual Lab</h1>
          <p className="text-gray-400 text-sm max-w-xl mb-5">
            Select a router to configure. The other 7 routers are pre-configured with correct IPs and OSPF Area 0.
            Your goal: configure the selected router so it joins OSPF and you can ping <span className="text-green-400 font-mono">8.8.8.8</span>.
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

        {/* Topology preview */}
        <div className="w-full max-w-3xl mb-8">
          <OspfTopologyDiagram selectedRouter={null} onSelect={handleSelect} />
        </div>

        <p className="text-gray-300 text-xs font-mono mt-2">
          👆 Click any router node on the diagram above to begin
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
          <span className="text-white font-mono font-bold text-sm">Cisco OSPF Lab</span>
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
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-red-900/40 border border-gray-700 hover:border-red-600 rounded-lg text-gray-400 hover:text-red-400 text-xs font-mono transition-all"
          >
            <RotateCcw className="h-3.5 w-3.5" /> Reset Router
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 flex gap-0 min-h-0 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-96 shrink-0 flex flex-col gap-3 p-3 border-r border-gray-800 overflow-y-auto">
          <OspfTopologyDiagram selectedRouter={selectedRouter} onSelect={handleSelect} locked={true} />
          <OspfInterfaceTable routerName={selectedRouter} />
        </div>

        {/* Console — center */}
        <div className="flex-1 flex flex-col p-3 min-w-0">
          <OspfConsole
            key={selectedRouter}
            routerName={selectedRouter}
            onComplete={handleComplete}
            state={currentState}
            onStateChange={handleStateChange}
            resetKey={resetKey}
          />
        </div>

        {/* Right sidebar — validation */}
        <div className="w-64 shrink-0 flex flex-col gap-3 p-3 border-l border-gray-800 overflow-y-auto">
          {currentState && (
            <OspfValidationPanel state={currentState} routerName={selectedRouter} />
          )}

          <OspfStepGuide routerName={selectedRouter} difficulty={difficulty} />

          {/* Quick Reference — shown on medium/hard */}
          {difficulty !== "easy" && (
            <div className="bg-gray-950 border border-gray-700 rounded-xl p-3">
              <div className="text-xs text-gray-400 font-mono mb-2">Quick Reference</div>
              <div className="text-[11px] font-mono text-gray-500 space-y-1">
                <div className="text-gray-300">Configure interface:</div>
                <div className="text-cyan-400 pl-2">int g0/0</div>
                <div className="text-cyan-400 pl-2">ip add &lt;ip&gt; &lt;mask&gt;</div>
                <div className="text-cyan-400 pl-2">no shut</div>
                <div className="mt-2 text-gray-300">Enable OSPF:</div>
                <div className="text-cyan-400 pl-2">router ospf 1</div>
                <div className="text-cyan-400 pl-2">net &lt;net&gt; &lt;wild&gt; area 0</div>
                <div className="mt-2 text-gray-300">Verify:</div>
                <div className="text-cyan-400 pl-2">show ip int brief</div>
                <div className="text-cyan-400 pl-2">show ip ospf neighbor</div>
                <div className="text-cyan-400 pl-2">ping 8.8.8.8</div>
              </div>
            </div>
          )}

          {completed && (
            <div className="bg-green-950/50 border border-green-700 rounded-xl p-4 text-center">
              <Trophy className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
              <div className="text-green-400 font-bold text-sm font-mono mb-1">Lab Complete!</div>
              <div className="text-green-300 text-[11px] font-mono">
                Congratulations. You successfully configured OSPF and reached 8.8.8.8.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}