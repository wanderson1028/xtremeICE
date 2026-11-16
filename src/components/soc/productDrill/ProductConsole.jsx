import React from "react";
import { ShieldAlert } from "lucide-react";

const STATUS_TONE = {
  ok: "text-emerald-400",
  warn: "text-amber-400",
  bad: "text-red-400",
  off: "text-gray-500",
};

function elementClasses(id, { solvedIds, wrongId }) {
  if (wrongId === id) return "border-red-500/70 bg-red-500/15 ring-2 ring-red-500/50";
  if (solvedIds.includes(id)) return "border-emerald-500/60 bg-emerald-500/10 ring-2 ring-emerald-500/40";
  return "border-white/10 hover:border-cyan-400/60 hover:bg-cyan-400/5";
}

export default function ProductConsole({ spec, onElementClick, solvedIds = [], wrongId = null, locked = false }) {
  if (!spec) return null;
  const click = (id) => {
    if (!locked) onElementClick(id);
  };
  const cls = (id) => elementClasses(id, { solvedIds, wrongId });

  return (
    <div className="rounded-2xl overflow-hidden border border-white/15 bg-[#0b1017] shadow-2xl">
      {/* Window chrome */}
      <div className="flex items-center gap-3 px-4 py-2.5 bg-gradient-to-b from-[#1a2230] to-[#141b25] border-b border-white/10">
        <div className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400/80" />
          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/80" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-xs font-semibold text-gray-100 truncate">
            {spec.interface_name || `${spec.vendor} ${spec.product}`}
          </div>
          <div className="text-[10px] text-gray-400 font-mono truncate">
            {spec.vendor} · {spec.product}
          </div>
        </div>
        <span className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider px-2 py-1 rounded border border-amber-500/40 bg-amber-500/10 text-amber-300 shrink-0">
          <ShieldAlert className="h-3 w-3" /> Simulated
        </span>
      </div>

      {spec.banner && (
        <div className="px-4 py-2 bg-cyan-500/5 border-b border-cyan-500/20 text-[11px] text-cyan-200/90">
          {spec.banner}
        </div>
      )}

      <div className="flex min-h-[340px]">
        {/* Sidebar */}
        {(spec.nav || []).length > 0 && (
          <div className="w-40 shrink-0 bg-[#0e141c] border-r border-white/10 py-2 hidden sm:block">
            {spec.nav.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => click(item.id)}
                className={`w-full text-left px-3 py-2 text-[11px] font-medium text-gray-300 border-l-2 transition-colors ${cls(item.id)} border-y-0 border-r-0 border-l-2`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {/* Main panel */}
        <div className="flex-1 min-w-0 p-3 space-y-3">
          {(spec.toolbar || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 bg-[#0e141c] border border-white/10 rounded-lg p-1.5">
              {spec.toolbar.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => click(item.id)}
                  className={`px-2.5 py-1 rounded text-[11px] font-medium text-gray-200 border transition-colors ${cls(item.id)}`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
            {(spec.sections || []).map((section) => (
              <div key={section.id} className="rounded-lg border border-white/10 bg-[#0e141c] overflow-hidden">
                <div className="px-3 py-1.5 border-b border-white/10 text-[10px] font-semibold uppercase tracking-wider text-gray-400">
                  {section.title}
                </div>
                <div className="divide-y divide-white/5">
                  {(section.rows || []).map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => click(row.id)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-left border transition-colors ${cls(row.id)}`}
                    >
                      <span className="text-[11px] text-gray-300 flex-1 truncate">{row.label}</span>
                      <span className={`text-[11px] font-mono shrink-0 ${STATUS_TONE[row.status] || "text-gray-100"}`}>
                        {row.value}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="px-3 py-1.5 border-t border-white/10 bg-[#0e141c] flex items-center gap-2 text-[10px] text-gray-500 font-mono">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        simulated session · no real equipment is connected
      </div>
    </div>
  );
}