import React, { useState, useRef, useEffect, useCallback } from "react";
import { CheckCircle, XCircle, Terminal, RotateCcw, Copy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * Normalizes a CLI command string for flexible matching:
 * - Collapses multiple spaces
 * - Lowercase comparison
 * - Strips trailing punctuation
 */
function normalizeCmd(cmd) {
  return cmd.trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Check if the user's input matches an expected command.
 * Supports exact match, prefix wildcard (starts-with), and regex patterns enclosed in /.
 */
function matchesCommand(input, expected) {
  const inp = normalizeCmd(input);
  const exp = normalizeCmd(expected);

  // Regex pattern: /pattern/
  if (exp.startsWith("/") && exp.endsWith("/") && exp.length > 2) {
    try {
      const pattern = new RegExp(exp.slice(1, -1), "i");
      return pattern.test(inp);
    } catch {
      return false;
    }
  }

  // Wildcard suffix: "show ip route *"
  if (exp.endsWith("*")) {
    return inp.startsWith(exp.slice(0, -1).trim());
  }

  return inp === exp;
}

/**
 * Given the full history of entered commands and the expected_commands array,
 * returns which criteria indices are satisfied.
 */
function evaluateCriteria(history, validationCriteria, expectedCommands) {
  // Map each criterion to the expected command at the same index (if any)
  return (validationCriteria || []).map((criterion, idx) => {
    const targetCmd = expectedCommands?.[idx];
    if (!targetCmd) return false;
    return history.some(h => matchesCommand(h.cmd, targetCmd));
  });
}

const MOTD = `
Xtreme I.C.E. — Lab Terminal Emulator
Type commands below. Validated against task expectations.
Type 'help' for available commands, 'clear' to reset output.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`.trim();

const PROMPT = "Router# ";

export default function TerminalEmulator({ task, onValidationUpdate }) {
  const [lines, setLines] = useState([{ type: "motd", text: MOTD }]);
  const [input, setInput] = useState("");
  const [history, setHistory] = useState([]); // { cmd, matched: bool }
  const [histIdx, setHistIdx] = useState(-1);
  const [cmdHistory, setCmdHistory] = useState([]); // for up/down arrow nav
  const [matchedCriteria, setMatchedCriteria] = useState([]);
  const termRef = useRef(null);
  const inputRef = useRef(null);

  const expectedCommands = task?.expected_commands || [];
  const validationCriteria = task?.validation_criteria || [];

  // Re-evaluate criteria whenever history changes
  useEffect(() => {
    const results = evaluateCriteria(history, validationCriteria, expectedCommands);
    setMatchedCriteria(results);
    if (onValidationUpdate) onValidationUpdate(results, history);
  }, [history, task]);

  // Scroll to bottom
  useEffect(() => {
    if (termRef.current) {
      termRef.current.scrollTop = termRef.current.scrollHeight;
    }
  }, [lines]);

  const addLines = useCallback((newLines) => {
    setLines(prev => [...prev, ...newLines]);
  }, []);

  const handleCommand = useCallback((raw) => {
    const cmd = raw.trim();
    if (!cmd) return;

    // Check if matches any expected command
    const matched = expectedCommands.some(exp => matchesCommand(cmd, exp));

    // Build simulated output
    const outputLines = simulateOutput(cmd, matched, expectedCommands, validationCriteria);

    addLines([
      { type: "input", text: PROMPT + cmd },
      ...outputLines,
    ]);

    setHistory(prev => [...prev, { cmd, matched }]);
    setCmdHistory(prev => [cmd, ...prev]);
    setHistIdx(-1);
  }, [expectedCommands, validationCriteria, addLines]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleCommand(input);
      setInput("");
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHistIdx(prev => {
        const next = Math.min(prev + 1, cmdHistory.length - 1);
        setInput(cmdHistory[next] || "");
        return next;
      });
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setHistIdx(prev => {
        const next = Math.max(prev - 1, -1);
        setInput(next === -1 ? "" : cmdHistory[next] || "");
        return next;
      });
    } else if (e.key === "Tab") {
      e.preventDefault();
      // Autocomplete from expected commands
      const partial = normalizeCmd(input);
      const match = expectedCommands.find(exp => normalizeCmd(exp).startsWith(partial) && partial.length > 0);
      if (match) setInput(match);
    }
  };

  const handleClear = () => {
    setLines([{ type: "motd", text: MOTD }]);
  };

  const handleReset = () => {
    setLines([{ type: "motd", text: MOTD }]);
    setHistory([]);
    setMatchedCriteria([]);
    setCmdHistory([]);
    setInput("");
    setHistIdx(-1);
    if (onValidationUpdate) onValidationUpdate([], []);
  };

  const completedCount = matchedCriteria.filter(Boolean).length;
  const totalCriteria = validationCriteria.length;

  return (
    <div className="flex flex-col h-full bg-[#0d1117] rounded-xl border border-[#30363d] overflow-hidden font-mono text-sm">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-[#161b22] border-b border-[#30363d]">
        <div className="flex items-center gap-2">
          <Terminal className="h-4 w-4 text-green-400" />
          <span className="text-green-400 font-semibold text-xs tracking-wide">TERMINAL</span>
          {task && (
            <span className="text-[#8b949e] text-xs truncate max-w-[200px]">— {task.title}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {totalCriteria > 0 && (
            <Badge className={`text-xs ${completedCount === totalCriteria ? "bg-green-500/20 text-green-300" : "bg-yellow-500/20 text-yellow-300"}`}>
              {completedCount}/{totalCriteria} checks
            </Badge>
          )}
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-[#8b949e] hover:text-white" onClick={handleClear} title="Clear output">
            <Copy className="h-3 w-3" />
          </Button>
          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-[#8b949e] hover:text-red-400" onClick={handleReset} title="Reset terminal">
            <RotateCcw className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {/* Output area */}
      <div
        ref={termRef}
        className="flex-1 overflow-y-auto p-4 space-y-0.5 cursor-text"
        onClick={() => inputRef.current?.focus()}
        style={{ minHeight: 220, maxHeight: 340 }}
      >
        {lines.map((line, i) => (
          <TermLine key={i} line={line} />
        ))}

        {/* Current input line */}
        <div className="flex items-center">
          <span className="text-green-400 select-none">{PROMPT}</span>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-[#e6edf3] caret-green-400 ml-1"
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            placeholder=""
          />
        </div>
      </div>

      {/* Validation Criteria Panel */}
      {validationCriteria.length > 0 && (
        <div className="border-t border-[#30363d] bg-[#161b22] p-3 space-y-1.5">
          <p className="text-[#8b949e] text-xs font-semibold uppercase tracking-wide mb-2">Validation Checks</p>
          {validationCriteria.map((crit, i) => {
            const passed = matchedCriteria[i] ?? false;
            return (
              <div key={i} className={`flex items-start gap-2 text-xs rounded-md px-2 py-1.5 transition-colors ${passed ? "bg-green-500/10" : "bg-[#0d1117]"}`}>
                {passed
                  ? <CheckCircle className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
                  : <XCircle className="h-3.5 w-3.5 text-[#484f58] shrink-0 mt-0.5" />
                }
                <div className="flex-1 min-w-0">
                  <p className={passed ? "text-green-300" : "text-[#8b949e]"}>{crit.description || crit.check}</p>
                  {expectedCommands[i] && !passed && (
                    <p className="text-[#484f58] mt-0.5 font-mono text-[10px]">Expected: <span className="text-[#6e7681]">{expectedCommands[i]}</span></p>
                  )}
                  {crit.points && (
                    <p className={`text-[10px] mt-0.5 ${passed ? "text-green-400" : "text-[#484f58]"}`}>
                      {passed ? "+" : ""}{crit.points} pts
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TermLine({ line }) {
  if (line.type === "motd") {
    return (
      <pre className="text-[#8b949e] text-xs whitespace-pre-wrap leading-relaxed mb-2">{line.text}</pre>
    );
  }
  if (line.type === "input") {
    return <div className="text-[#e6edf3]">{line.text}</div>;
  }
  if (line.type === "success") {
    return <div className="text-green-400">{line.text}</div>;
  }
  if (line.type === "error") {
    return <div className="text-red-400">{line.text}</div>;
  }
  if (line.type === "info") {
    return <div className="text-[#58a6ff]">{line.text}</div>;
  }
  return <div className="text-[#8b949e]">{line.text}</div>;
}

/**
 * Simulate plausible CLI output for the entered command.
 */
function simulateOutput(cmd, matched, expectedCommands, validationCriteria) {
  const c = normalizeCmd(cmd);

  if (c === "help") {
    return [
      { type: "info", text: "Available built-in commands:" },
      { type: "default", text: "  help              — Show this help message" },
      { type: "default", text: "  clear             — Clear terminal output" },
      { type: "default", text: "  show ip interface — Display interface summary" },
      { type: "default", text: "  show ip route     — Display routing table" },
      { type: "default", text: "  show running-config — Display current configuration" },
      { type: "info", text: "↑/↓ arrows to navigate history. Tab to autocomplete." },
    ];
  }

  if (c === "clear") {
    return [];
  }

  if (c.startsWith("show ip route")) {
    const lines = [
      { type: "default", text: "Codes: C - connected, S - static, R - RIP, O - OSPF" },
      { type: "default", text: "       B - BGP, * - candidate default" },
      { type: "default", text: "" },
      { type: matched ? "success" : "default", text: "O    192.168.1.0/24 [110/2] via 10.0.0.1, 00:03:15, Gi0/0" },
      { type: "default", text: "C    10.0.0.0/30 is directly connected, Gi0/0" },
      { type: "default", text: "S*   0.0.0.0/0 [1/0] via 10.0.0.2" },
    ];
    return lines;
  }

  if (c.startsWith("show ip interface") || c.startsWith("show interfaces")) {
    return [
      { type: "default", text: "GigabitEthernet0/0 is up, line protocol is up" },
      { type: "default", text: "  Internet address is 10.0.0.1/30" },
      { type: "default", text: "  MTU 1500 bytes, BW 1000000 Kbit, DLY 10 usec" },
      { type: "default", text: "GigabitEthernet0/1 is administratively down" },
    ];
  }

  if (c.startsWith("show running-config") || c === "sh run") {
    return [
      { type: "default", text: "Building configuration..." },
      { type: "default", text: "Current configuration : 1024 bytes" },
      { type: "default", text: "!" },
      { type: "default", text: "hostname Router" },
      { type: "default", text: "!" },
      { type: "default", text: "interface GigabitEthernet0/0" },
      { type: "default", text: " ip address 10.0.0.1 255.255.255.252" },
      { type: "default", text: " no shutdown" },
      { type: "default", text: "!" },
    ];
  }

  if (c.startsWith("ping")) {
    const target = c.split(" ")[1] || "8.8.8.8";
    return [
      { type: "default", text: `Type escape sequence to abort.` },
      { type: "default", text: `Sending 5, 100-byte ICMP Echos to ${target}, timeout is 2 seconds:` },
      { type: matched ? "success" : "error", text: matched ? "!!!!!" : "....." },
      { type: matched ? "success" : "error", text: matched ? "Success rate is 100 percent (5/5), round-trip min/avg/max = 1/2/4 ms" : "Success rate is 0 percent (0/5)" },
    ];
  }

  if (c.includes("no shutdown") || c.includes("no shut")) {
    return [{ type: matched ? "success" : "info", text: matched ? "%LINK-5-CHANGED: Interface GigabitEthernet0/0, changed state to up" : "%Interface state changed." }];
  }

  if (c.startsWith("router ospf") || c.startsWith("router eigrp") || c.startsWith("router bgp")) {
    return [{ type: "info", text: `Router(config-router)#` }];
  }

  if (c.startsWith("ip route")) {
    return [{ type: matched ? "success" : "info", text: matched ? "% Static route added successfully." : "% Route configuration applied." }];
  }

  if (c.startsWith("access-list") || c.startsWith("ip access")) {
    return [{ type: matched ? "success" : "info", text: matched ? "% ACL entry applied." : "% ACL configuration processed." }];
  }

  if (matched) {
    // Known expected command — give positive feedback
    return [{ type: "success", text: `% Command accepted. ✓` }];
  }

  // Unknown / unmatched command — generic error
  if (c.includes("%") || c.includes("?")) {
    return [{ type: "error", text: `% Ambiguous command: "${cmd.split(" ")[0]}"` }];
  }

  return [
    { type: "error", text: `% Invalid input detected at '^' marker.` },
    { type: "error", text: `         ${" ".repeat(Math.max(0, cmd.indexOf(cmd.split(" ").pop())))}^` },
  ];
}