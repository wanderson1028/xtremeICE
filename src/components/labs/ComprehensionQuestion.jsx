import React, { useState } from "react";
import { CheckCircle2, XCircle, HelpCircle } from "lucide-react";

export default function ComprehensionQuestion({ question, options, correctIndex, explanation, onCorrect }) {
  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const isCorrect = selected === correctIndex;

  const handleSubmit = () => {
    if (selected === null) return;
    setSubmitted(true);
    if (selected === correctIndex) {
      setTimeout(() => onCorrect(true), 1200);
    } else {
      setTimeout(() => onCorrect(false), 3500);
    }
  };

  return (
    <div className="shrink-0">
      <div className="w-full bg-gray-900 border border-yellow-600/40 rounded-xl p-4">
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <HelpCircle className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
          <span className="text-yellow-400 font-mono font-bold text-[11px] uppercase tracking-wider">Comprehension Check</span>
        </div>

        {/* Question */}
        <p className="text-white text-xs leading-relaxed mb-3 font-mono">{question}</p>

        {/* Options */}
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {options.map((opt, i) => {
            let style = "border-gray-700 bg-gray-800 text-gray-200 hover:border-gray-500 hover:bg-gray-700/80";
            if (submitted) {
              if (i === correctIndex) style = "border-green-500 bg-green-900/30 text-green-300";
              else if (i === selected) style = "border-red-500 bg-red-900/30 text-red-300";
              else style = "border-gray-700 bg-gray-800 text-gray-500 opacity-50";
            } else if (selected === i) {
              style = "border-cyan-500 bg-cyan-900/20 text-cyan-300";
            }

            return (
              <button
                key={i}
                onClick={() => !submitted && setSelected(i)}
                className={`w-full text-left px-3 py-2 rounded-lg border text-[11px] font-mono transition-all flex items-start gap-2 ${style}`}
              >
                <span className="shrink-0 mt-0.5 h-3.5 w-3.5 rounded-full border border-current flex items-center justify-center text-[9px] font-bold">
                  {String.fromCharCode(65 + i)}
                </span>
                <span className="leading-relaxed">{opt}</span>
                {submitted && i === correctIndex && <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0 ml-auto mt-0.5" />}
                {submitted && i === selected && i !== correctIndex && <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0 ml-auto mt-0.5" />}
              </button>
            );
          })}
        </div>

        {/* Feedback + actions */}
        {!submitted ? (
          <button
            onClick={handleSubmit}
            disabled={selected === null}
            className="w-full py-1.5 rounded-lg font-mono font-bold text-xs transition-all bg-red-700 hover:bg-red-600 text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Submit Answer
          </button>
        ) : isCorrect ? (
          <div className="flex items-center gap-2 justify-center text-green-400 font-mono text-xs">
            <CheckCircle2 className="h-3.5 w-3.5" />
            Correct! Proceeding…
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <div className="px-3 py-2 bg-red-900/20 border border-red-700/40 rounded-lg">
              <p className="text-red-400 font-mono text-xs font-bold mb-1">Incorrect</p>
              <p className="text-green-300 font-mono text-[11px] leading-relaxed mb-1">
                <span className="text-green-400 font-bold">Correct answer: </span>
                {options[correctIndex]}
              </p>
              {explanation && (
                <p className="text-gray-300 font-mono text-[11px] leading-relaxed border-t border-red-700/30 pt-1.5 mt-1.5">
                  <span className="text-yellow-400 font-bold">Why: </span>
                  {explanation}
                </p>
              )}
            </div>
            <p className="text-gray-500 font-mono text-[10px] text-center">Continuing in a moment…</p>
          </div>
        )}
      </div>
    </div>
  );
}