import React, { useState } from "react";
import { Cpu, Terminal, CheckCircle, RefreshCw } from "lucide-react";

const statusColor = {
  healthy: "bg-green-500 text-green-400",
  compromised: "bg-red-500 text-red-400",
  isolated: "bg-orange-500 text-orange-400",
};

const RMM_ACTIONS = [
  { id: "rmm_patch", label: "Deploy Patch", icon: "🩹", actionId: "patch_system" },
  { id: "rmm_restart", label: "Restart Service", icon: "🔄", actionId: "open_ticket" },
  { id: "rmm_backup", label: "Verify Backup", icon: "💾", actionId: "preserve_evidence" },
  { id: "rmm_restore", label: "Restore Backup", icon: "♻️", actionId: "restore_backup" },
];

const FAKE_SHELL_RESPONSES = {
  "netstat -an": `Active Connections:
  TCP  10.0.1.10:49234   185.220.101.47:443   ESTABLISHED
  TCP  10.0.1.10:49240   10.0.2.5:445         ESTABLISHED
  TCP  0.0.0.0:3389      0.0.0.0:0            LISTENING`,
  "ps aux": `USER       PID  %CPU  %MEM  COMMAND
  www-data   1337  0.0   0.1  /bin/bash -i
  root        600  0.0   1.2  /sbin/init
  root       4892  2.1   0.8  powershell.exe -enc JABj...`,
  "whoami": "CORP\\jsmith (elevated — UAC bypassed)",
  "ifconfig": `eth0: 10.0.1.10 netmask 255.255.255.0 broadcast 10.0.1.255`,
  "help": "Available: netstat, ps, whoami, ifconfig, ls /tmp",
  "ls /tmp": `shell.php
customers_export.7z
mimikatz.exe
svchost32.exe`,
};

export default function RMMModule({ endpoints, onAction }) {
  const [selected, setSelected] = useState(endpoints[0] || null);
  const [taken, setTaken] = useState(new Set());
  const [shellInput, setShellInput] = useState("");
  const [shellHistory, setShellHistory] = useState([
    { cmd: null, out: `Connected to ${endpoints[0]?.name || "host"} via RMM Agent v3.2\nType 'help' for available commands.` }
  ]);

  const handleAction = (act) => {
    if (!selected) return;
    const key = `${act.id}-${selected.name}`;
    if (taken.has(key)) return;
    setTaken(prev => new Set([...prev, key]));
    onAction({ id: act.actionId, label: act.label, icon: act.icon, target: selected.name, time: new Date().toLocaleTimeString() });
  };

  const runShell = () => {
    if (!shellInput.trim()) return;
    const cmd = shellInput.trim();
    const out = FAKE_SHELL_RESPONSES[cmd.toLowerCase()] || `bash: ${cmd}: command simulated\n[No output]`;
    setShellHistory(prev => [...prev, { cmd, out }]);
    setShellInput("");
  };

  const switchEndpoint = (ep) => {
    setSelected(ep);
    setShellHistory([{ cmd: null, out: `Connected to ${ep.name} (${ep.ip}) via RMM Agent\nStatus: ${ep.status}` }]);
  };

  return (
    <div className="h-full flex overflow-hidden">
      {/* Endpoint list */}
      <div className="w-48 shrink-0 border-r border-border/20 overflow-y-auto bg-[#0d0d0d]">
        <div className="px-3 py-2.5 border-b border-border/20">
          <span className="text-[10px] font-semibold text-muted-foreground uppercase">Devices</span>
        </div>
        {endpoints.map(ep => (
          <button
            key={ep.id}
            onClick={() => switchEndpoint(ep)}
            className={`w-full px-3 py-2.5 text-left border-b border-border/10 hover:bg-secondary/30 transition-colors ${selected?.id === ep.id ? "bg-secondary/40 border-l-2 border-l-primary" : ""}`}
          >
            <div className="flex items-center gap-2">
              <div className={`h-1.5 w-1.5 rounded-full ${statusColor[ep.status]?.split(" ")[0] || "bg-gray-500"}`} />
              <div>
                <div className="text-[10px] font-mono text-foreground truncate max-w-[110px]">{ep.name}</div>
                <div className="text-[9px] text-muted-foreground">{ep.role}</div>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Main panel */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {selected && (
          <>
            {/* Header */}
            <div className="px-4 py-3 border-b border-border/20 bg-[#0d0d0d] flex items-center gap-3 shrink-0">
              <Cpu className="h-4 w-4 text-primary" />
              <div>
                <div className="text-sm font-semibold font-mono">{selected.name}</div>
                <div className="text-[10px] text-muted-foreground">{selected.os} · {selected.ip}</div>
              </div>
              <span className={`ml-auto text-[10px] font-mono ${statusColor[selected.status]?.split(" ")[1] || "text-muted-foreground"}`}>{selected.status}</span>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Remote shell */}
              <div className="flex-1 flex flex-col overflow-hidden border-r border-border/20">
                <div className="px-3 py-2 border-b border-border/10 flex items-center gap-2">
                  <Terminal className="h-3.5 w-3.5 text-green-400" />
                  <span className="text-[10px] font-mono text-muted-foreground">Remote Shell — {selected.name}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-3 font-mono text-[10px] bg-black/40 space-y-2">
                  {shellHistory.map((h, i) => (
                    <div key={i}>
                      {h.cmd && <div className="text-green-400">$ {h.cmd}</div>}
                      <div className="text-foreground/70 whitespace-pre-wrap">{h.out}</div>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-2 px-3 py-2 border-t border-border/20 bg-black/20 shrink-0">
                  <span className="text-green-400 text-[10px] font-mono shrink-0">$</span>
                  <input
                    value={shellInput}
                    onChange={e => setShellInput(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && runShell()}
                    placeholder="Enter command..."
                    className="flex-1 bg-transparent text-[10px] font-mono text-foreground outline-none"
                  />
                  <button onClick={runShell} className="text-[10px] text-primary hover:text-primary/80 font-mono">Run</button>
                </div>
              </div>

              {/* Actions */}
              <div className="w-44 shrink-0 overflow-y-auto p-3 space-y-2">
                <div className="text-[10px] font-semibold text-muted-foreground uppercase mb-3">RMM Actions</div>
                {RMM_ACTIONS.map(act => {
                  const key = `${act.id}-${selected.name}`;
                  const done = taken.has(key);
                  return (
                    <button
                      key={act.id}
                      onClick={() => handleAction(act)}
                      disabled={done}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition-all ${done ? "opacity-40 cursor-not-allowed border-border/20 text-muted-foreground" : "text-cyan-400 border-cyan-500/30 hover:bg-cyan-500/10"}`}
                    >
                      <span>{act.icon}</span>
                      <span className="flex-1 text-left">{act.label}</span>
                      {done && <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}