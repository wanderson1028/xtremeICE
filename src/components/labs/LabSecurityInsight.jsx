import React, { useState } from "react";
import { ShieldAlert, ChevronRight } from "lucide-react";

export default function LabSecurityInsight({ insight }) {
  const [open, setOpen] = useState(true);
  if (!insight) return null;

  // Support both plain string and { title, content } object formats
  const title = typeof insight === "object" ? insight.title : null;
  const text = typeof insight === "object" ? insight.content : insight;

  return (
    <div className="bg-purple-950/30 border border-purple-700/40 rounded-xl shrink-0 overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-purple-950/30 transition-colors"
      >
        <ShieldAlert className="h-4 w-4 text-purple-400 shrink-0" />
        <span className="text-[10px] font-mono font-bold text-purple-400 uppercase tracking-wide flex-1 text-left">
          {title ? `Security Insight: ${title}` : "Security Insight"}
        </span>
        <ChevronRight className={`h-3.5 w-3.5 text-gray-500 transition-transform ${open ? "rotate-90" : ""}`} />
      </button>
      {open && (
        <div className="px-4 pb-3">
          <p className="text-purple-200 text-xs leading-relaxed">{text}</p>
        </div>
      )}
    </div>
  );
}