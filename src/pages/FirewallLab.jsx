import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, RotateCcw, Shield, ChevronDown } from "lucide-react";
import FirewallConsole from "@/components/firewall/FirewallConsole";
import FirewallValidationPanel from "@/components/firewall/FirewallValidationPanel";
import FirewallRuleTable from "@/components/firewall/FirewallRuleTable";
import FirewallStepGuide from "@/components/firewall/FirewallStepGuide";
import FirewallZoneDiagram from "@/components/firewall/FirewallZoneDiagram";
import DifficultySelector from "@/components/ospf/DifficultySelector";
import { createBlankState, validateHardening, VENDORS } from "@/components/firewall/firewallEngine";
import FirewallCommandExplainer from "@/components/firewall/FirewallCommandExplainer";

const VENDOR_COLORS = {
  cisco:    "border-blue-600 text-blue-300 bg-blue-900/40",
  juniper:  "border-green-600 text-green-300 bg-green-900/40",
  fortinet: "border-orange-500 text-orange-300 bg-orange-900/40",
  paloalto: "border-purple-600 text-purple-300 bg-purple-900/40",
};

export default function FirewallLab() {
  const navigate = useNavigate();
  const [vendor, setVendor] = useState(null);
  const [fwState, setFwState] = useState(null);
  const [difficulty, setDifficulty] = useState("easy");
  const [resetKey, setResetKey] = useState(0);
  const [consoleHistory, setConsoleHistory] = useState([]);
  const [lastCommand, setLastCommand] = useState("");

  const handleSelectVendor = (v) => {
    setVendor(v);
    setFwState(createBlankState(v));
  };

  const handleReset = () => {
    setFwState(createBlankState(vendor));
    setResetKey(k => k + 1);
    setConsoleHistory([]);
    setLastCommand("");
  };

  const { passed, total, complete } = fwState ? validateHardening(fwState) : { passed: 0, total: 6, complete: false };

  // Vendor selection screen
  if (!vendor) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/20 flex flex-col items-center justify-center p-6">
        <button onClick={() => navigate("/InteractiveVirtualLabs")} className="self-start mb-6 flex items-center gap-2 text-gray-400 hover:text-white text-sm font-mono transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Active Labs
        </button>

        <div className="text-center mb-10">
          <div className="inline-block px-3 py-1 bg-red-900/40 border border-red-700/50 rounded-full text-red-400 text-xs font-mono mb-3">
            FIREWALL HARDENING LAB — MULTI-VENDOR
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">Firewall Hardening Lab</h1>
          <p className="text-gray-400 text-sm max-w-2xl">
            Harden a firewall using real CLI syntax. Choose a vendor, then apply 6 hardening objectives across
            Management Plane, Data Plane, and Advanced tiers.
          </p>
        </div>

        {/* Difficulty */}
        <div className="flex items-center gap-3 mb-10">
          <span className="text-xs font-mono text-gray-500">Difficulty:</span>
          <DifficultySelector difficulty={difficulty} onChange={setDifficulty} />
        </div>

        {/* Vendor cards */}
        <div className="grid grid-cols-2 gap-5 max-w-2xl w-full mb-10">
          {Object.entries(VENDORS).map(([key, v]) => (
            <button
              key={key}
              onClick={() => handleSelectVendor(key)}
              className={`group p-6 rounded-xl border-2 transition-all hover:scale-105 hover:shadow-xl text-left
                ${VENDOR_COLORS[key]}`}
            >
              <Shield className="h-8 w-8 mb-3 opacity-80" />
              <div className="text-lg font-bold font-mono mb-1">{v.label}</div>
              <div className="text-xs text-gray-400">
                {{
                  cisco:    "ASA / IOS — access-list extended syntax",
                  juniper:  "SRX / JunOS — set security policies hierarchy",
                  fortinet: "FortiGate / FortiOS — config firewall policy",
                  paloalto: "PAN-OS — set rulebase security rules",
                }[key]}
              </div>
              <div className="mt-4 text-xs font-mono opacity-70 group-hover:opacity-100">Click to start →</div>
            </button>
          ))}
        </div>

        {/* Zone reference */}
        <div className="max-w-sm w-full">
          <FirewallZoneDiagram vendor={null} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/20 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-black/60 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => setVendor(null)} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs font-mono transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Vendor Select
          </button>
          <span className="text-gray-600">|</span>
          <span className="text-white font-mono font-bold text-sm">Firewall Hardening Lab</span>
        </div>

        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-lg border font-mono font-bold text-sm ${VENDOR_COLORS[vendor]}`}>
            {VENDORS[vendor]?.label}
          </span>
          <span className="text-xs font-mono text-gray-500 ml-2">{passed}/{total} objectives</span>
        </div>

        <div className="flex items-center gap-3">
          <DifficultySelector difficulty={difficulty} onChange={setDifficulty} />
          {complete && (
            <div className="flex items-center gap-1.5 text-yellow-400 text-xs font-mono">
              <Trophy className="h-4 w-4" /> Lab Complete!
            </div>
          )}
          <button onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-800 hover:bg-red-900/40 border border-gray-700 hover:border-red-600 rounded-lg text-gray-400 hover:text-red-400 text-xs font-mono transition-all">
            <RotateCcw className="h-3.5 w-3.5" /> Reset
          </button>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 flex gap-0 min-h-0 overflow-hidden">
        {/* Left sidebar */}
        <div className="w-80 shrink-0 flex flex-col gap-3 p-3 border-r border-gray-800 overflow-y-auto">
          <FirewallZoneDiagram vendor={vendor} />
          {fwState && <FirewallRuleTable rules={fwState.rules} />}
          <FirewallCommandExplainer lastCommand={lastCommand} vendor={vendor} />
        </div>

        {/* Console — center */}
        <div className="flex-1 flex flex-col p-3 min-w-0">
          {fwState && (
            <FirewallConsole
              key={`${vendor}-${resetKey}`}
              vendor={vendor}
              onComplete={() => {}}
              state={fwState}
              onStateChange={setFwState}
              onHistoryChange={setConsoleHistory}
              onCommandEntered={setLastCommand}
              resetKey={resetKey}
            />
          )}
        </div>

        {/* Right sidebar */}
        <div className="w-80 shrink-0 flex flex-col gap-3 p-3 border-l border-gray-800 overflow-y-auto">
          {fwState && <FirewallValidationPanel state={fwState} />}
          <FirewallStepGuide vendor={vendor} difficulty={difficulty} />

          {complete && (
            <div className="bg-green-950/50 border border-green-700 rounded-xl p-4 text-center">
              <Trophy className="h-8 w-8 text-yellow-400 mx-auto mb-2" />
              <div className="text-green-400 font-bold text-sm font-mono mb-1">Lab Complete!</div>
              <div className="text-green-300 text-[11px] font-mono">
                All 6 hardening objectives achieved on {VENDORS[vendor]?.label}.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}