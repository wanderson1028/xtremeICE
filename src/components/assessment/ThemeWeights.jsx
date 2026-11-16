import React from "react";
import { SlidersHorizontal, AlertCircle } from "lucide-react";

const inputCls =
  "w-20 bg-gray-900 border border-gray-700 text-white rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:border-red-600 transition-colors";

export default function ThemeWeights({ themes, weights, onChange }) {
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-1">
        <SlidersHorizontal className="h-4 w-4 text-red-400" />
        <h2 className="text-white font-semibold">Theme Scoring Weights</h2>
      </div>
      <p className="text-gray-500 text-xs mb-4">
        How much each question theme counts toward the final score. A theme at 2 counts twice as much as one at 1 —
        the score stays a percentage of the weighted total.
      </p>

      {themes.length === 0 ? (
        <div className="flex items-center gap-2 text-gray-500 text-xs border border-dashed border-gray-800 rounded-lg px-3 py-4">
          <AlertCircle className="h-4 w-4 shrink-0" />
          Give your questions a theme to control how much each one counts.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {themes.map((theme) => (
            <div
              key={theme}
              className="flex items-center justify-between gap-3 rounded-lg border border-gray-800 bg-gray-950/50 px-3 py-2"
            >
              <span className="text-sm text-gray-200 truncate">{theme}</span>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[10px] text-gray-500 uppercase tracking-wider">×</span>
                <input
                  type="number"
                  min="0.1"
                  max="10"
                  step="0.1"
                  className={inputCls}
                  value={weights[theme] ?? 1}
                  onChange={(e) => onChange({ ...weights, [theme]: e.target.value })}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}