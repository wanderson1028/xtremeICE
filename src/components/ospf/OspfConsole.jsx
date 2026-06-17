import React, { useState, useRef, useEffect } from "react";
import { processCommand, getPrompt, createBlankState } from "./ospfEngine";
import { validateConfig } from "./ospfEngine";

const BANNER = (routerName) => [
  ``,
  `Cisco IOS Software, Version 15.7(3)M - ${routerName} (unconfigured)`,
  `Copyright (c) 1986-2022 by Cisco Systems, Inc.`,
  ``,
  `This router is UNCONFIGURED. Configure it to join OSPF Area 0.`,
  `Objective: Configure interfaces, OSPF, and ping 8.8.8.8`,
  ``,
];

export default function OspfConsole({ routerName, onComplete, state, onStateChange, resetKey }) {
  const [history, setHistory] = useState(() =>
    BANNER(routerName).map(l => ({ type: "output", text: l }))
  );
  const [input, setInput] = useState("");
  const [cmdHistory, setCmdHistory] = useState([]);
  const [histIdx, setHistIdx] = useState(-1);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);

  // Reset when router changes or resetKey changes
  useEffect(() => {
    setHistory(BANNER(routerName).map(l => ({ type: "output", text: l })));
    setInput("");
    setCmdHistory([]);
    setHistIdx(-1);
  }, [routerName, resetKey]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const submit = () => {
    const cmd = input.trim();
    const prompt = getPrompt(state);
    const newHistory = [...history, { type: "input", text: `${prompt} ${cmd}` }];

    if (!cmd) {
      setHistory(newHistory);
      setInput("");
      return;
    }

    const result = processCommand(cmd, state, routerName);
    result.output.forEach(line => newHistory.push({ type: "output", text: line }));

    onStateChange && onStateChange(result.state);
    setHistory(newHistory);
    setInput("");
    setCmdHistory(prev => [cmd, ...prev]);
    setHistIdx(-1);

    if (result.completed) {
      setTimeout(() => {
        newHistory.push({ type: "success", text: "" });
        newHistory.push({ type: "success", text: "╔══════════════════════════════════════════════════════════╗" });
        newHistory.push({ type: "success", text: "║  🎉  Congratulations! Lab Complete!                      ║" });
        newHistory.push({ type: "success", text: "║  You successfully configured OSPF and reached 8.8.8.8    ║" });
        newHistory.push({ type: "success", text: "╚══════════════════════════════════════════════════════════╝" });
        setHistory([...newHistory]);
        onComplete && onComplete();
      }, 300);
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter") { submit(); return; }
    if (e.key === "ArrowUp") {
      const idx = Math.min(histIdx + 1, cmdHistory.length - 1);
      setHistIdx(idx);
      setInput(cmdHistory[idx] || "");
      e.preventDefault();
    }
    if (e.key === "ArrowDown") {
      const idx = Math.max(histIdx - 1, -1);
      setHistIdx(idx);
      setInput(idx === -1 ? "" : cmdHistory[idx] || "");
      e.preventDefault();
    }
  };

  const prompt = getPrompt(state);

  return (
    <div
      className="flex flex-col h-full bg-black rounded-xl border border-gray-700 overflow-hidden font-mono text-sm"
      onClick={() => inputRef.current?.focus()}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 px-4 py-2 bg-gray-900 border-b border-gray-700 shrink-0">
        <div className="h-3 w-3 rounded-full bg-red-500" />
        <div className="h-3 w-3 rounded-full bg-yellow-500" />
        <div className="h-3 w-3 rounded-full bg-green-500" />
        <span className="ml-2 text-xs text-gray-400">{routerName} — Cisco IOS Console</span>
      </div>

      {/* Output */}
      <div className="flex-1 overflow-y-auto p-3 space-y-0.5 min-h-0">
        {history.map((line, i) => (
          <div key={i} className={
            line.type === "input" ? "text-white" :
            line.type === "success" ? "text-green-400 font-bold" :
            "text-green-300"
          }>
            {line.text || "\u00A0"}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-950 border-t border-gray-800 shrink-0">
        <span className="text-green-400 text-xs whitespace-nowrap">{prompt}</span>
        <input
          ref={inputRef}
          className="flex-1 bg-transparent text-white text-xs outline-none caret-green-400"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          spellCheck={false}
          placeholder="type a command..."
        />
      </div>
    </div>
  );
}