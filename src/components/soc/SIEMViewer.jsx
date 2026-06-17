import React, { useState, useMemo } from "react";
import { Search, Filter } from "lucide-react";

const sevColor = {
  critical: "text-red-400 bg-red-500/10 border-red-500/30",
  high: "text-orange-400 bg-orange-500/10 border-orange-500/30",
  medium: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  low: "text-blue-400 bg-blue-500/10 border-blue-500/30",
  info: "text-gray-400 bg-gray-500/10 border-gray-500/30",
};

const typeColor = {
  endpoint: "text-purple-300",
  auth: "text-blue-300",
  network: "text-cyan-300",
  file: "text-yellow-300",
  process: "text-orange-300",
  web: "text-green-300",
  email: "text-pink-300",
  firewall: "text-red-300",
  cloud: "text-sky-300",
};

export default function SIEMViewer({ logs }) {
  const [search, setSearch] = useState("");
  const [sevFilter, setSevFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [expandedRow, setExpandedRow] = useState(null);

  const types = useMemo(() => ["all", ...new Set(logs.map(l => l.type))], [logs]);

  const filtered = useMemo(() => logs.filter(l => {
    if (sevFilter !== "all" && l.severity !== sevFilter) return false;
    if (typeFilter !== "all" && l.type !== typeFilter) return false;
    if (search && !l.message.toLowerCase().includes(search.toLowerCase()) && !l.source.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [logs, sevFilter, typeFilter, search]);

  return (
    <div className="h-full flex flex-col">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 border-b border-border/20 bg-[#0d0d0d] shrink-0">
        <div className="flex items-center gap-2 flex-1 min-w-48 bg-secondary/50 border border-border/40 rounded-lg px-3 py-1.5">
          <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search logs..."
            className="bg-transparent text-xs outline-none flex-1 text-foreground placeholder:text-muted-foreground font-mono"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <select
            value={sevFilter}
            onChange={e => setSevFilter(e.target.value)}
            className="bg-secondary border border-border/40 rounded-lg px-2 py-1.5 text-xs outline-none text-foreground"
          >
            <option value="all">All Severity</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="bg-secondary border border-border/40 rounded-lg px-2 py-1.5 text-xs outline-none text-foreground"
          >
            {types.map(t => <option key={t} value={t}>{t === "all" ? "All Types" : t}</option>)}
          </select>
        </div>
        <span className="text-[10px] text-muted-foreground font-mono ml-auto">{filtered.length}/{logs.length} events</span>
      </div>

      {/* Log table */}
      <div className="flex-1 overflow-y-auto font-mono text-xs">
        <table className="w-full border-collapse">
          <thead className="sticky top-0 bg-[#0a0a0a] z-10">
            <tr className="text-[10px] text-muted-foreground uppercase">
              <th className="px-4 py-2 text-left font-medium w-36">Time</th>
              <th className="px-2 py-2 text-left font-medium w-20">Severity</th>
              <th className="px-2 py-2 text-left font-medium w-20">Type</th>
              <th className="px-2 py-2 text-left font-medium w-32">Source</th>
              <th className="px-2 py-2 text-left font-medium">Message</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((log, i) => (
              <tr key={log.id} className={`border-b border-border/10 hover:bg-secondary/20 transition-colors ${i % 2 === 0 ? "" : "bg-white/[0.01]"}`}>
                <td className="px-4 py-2 text-muted-foreground text-[10px] whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleTimeString()}
                </td>
                <td className="px-2 py-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded border ${sevColor[log.severity] || sevColor.info}`}>{log.severity}</span>
                </td>
                <td className="px-2 py-2">
                  <span className={`text-[10px] ${typeColor[log.type] || "text-foreground"}`}>{log.type}</span>
                </td>
                <td className="px-2 py-2 text-[10px] text-foreground/70 truncate max-w-[120px]">{log.source}</td>
                <td
                  className="px-2 py-2 text-[10px] text-foreground/80 max-w-0 cursor-pointer"
                  onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                >
                  {expandedRow === log.id ? (
                    <div className="whitespace-normal break-words leading-relaxed">{log.message}</div>
                  ) : (
                    <div className="truncate" title={log.message}>{log.message}</div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-muted-foreground text-xs">No logs match your filters.</div>
        )}
      </div>
    </div>
  );
}