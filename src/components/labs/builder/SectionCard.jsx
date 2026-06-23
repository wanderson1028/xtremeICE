import React, { useState } from "react";
import { ChevronDown, ChevronUp, Info } from "lucide-react";

export default function SectionCard({ id, icon: Icon, title, subtitle, tip, complete, defaultExpanded = true, children }) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <div id={id} className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden scroll-mt-24">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full p-5 hover:bg-gray-800/40 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-lg bg-gray-800 flex items-center justify-center flex-shrink-0">
            {Icon && <Icon className="h-4 w-4 text-gray-400" />}
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-white">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {complete !== undefined && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${complete ? "bg-green-900/50 text-green-400" : "bg-gray-800 text-gray-500"}`}>
              {complete ? "Complete" : "Pending"}
            </span>
          )}
          {expanded
            ? <ChevronUp className="h-4 w-4 text-gray-500" />
            : <ChevronDown className="h-4 w-4 text-gray-500" />}
        </div>
      </button>

      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-800 pt-4">
          {tip && (
            <div className="flex items-start gap-2 mb-4 p-3 bg-blue-950/20 border border-blue-900/30 rounded-lg">
              <Info className="h-3.5 w-3.5 text-blue-400 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-blue-300/80 leading-relaxed">{tip}</p>
            </div>
          )}
          {children}
        </div>
      )}
    </div>
  );
}