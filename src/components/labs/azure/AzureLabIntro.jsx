import React from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Target, CheckCircle2, BookOpen, AlertTriangle, Clock, BarChart2, Tag, ChevronRight, Cloud } from "lucide-react";

const AZURE = "#0078D4";

export default function AzureLabIntro({ labTitle, chapterNum, difficulty, tags = [], toolLabel, duration, intro, onStart }) {
  const navigate = useNavigate();

  const diffColor = {
    Beginner: "text-green-400 border-green-600/50 bg-green-900/20",
    Intermediate: "text-yellow-400 border-yellow-600/50 bg-yellow-900/20",
    Advanced: "text-orange-400 border-orange-600/50 bg-orange-900/20",
    Expert: "text-red-400 border-red-600/50 bg-red-900/20",
  }[difficulty] || "text-gray-400 border-gray-600/50 bg-gray-900/20";

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-blue-950/20 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-black/60 shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/InteractiveVirtualLabs")} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs font-mono transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Training Labs
          </button>
          <span className="text-gray-600">|</span>
          <span className="text-white font-mono font-bold text-sm">Ch.{chapterNum} — {labTitle}</span>
        </div>
        <div className="flex items-center gap-2">
          {tags.map(t => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700 font-mono hidden sm:inline">{t}</span>
          ))}
          <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-mono font-semibold ${diffColor}`}>{difficulty}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-6 py-10">
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Cloud className="h-6 w-6" style={{ color: AZURE }} />
              <span className={`text-xs font-mono px-2.5 py-1 rounded-full border ${diffColor}`}>{difficulty}</span>
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">{labTitle}</h1>
            <p className="text-gray-300 text-sm leading-relaxed">{intro.overview}</p>
          </div>

          <div className="flex flex-wrap gap-4 mb-8 text-xs font-mono text-gray-400">
            {duration && (
              <div className="flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-gray-500" />
                <span>{duration} min estimated</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <Tag className="h-3.5 w-3.5 text-gray-500" />
              <span>{intro.niceCategory}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <BarChart2 className="h-3.5 w-3.5 text-gray-500" />
              <span>{toolLabel}</span>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2">
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <Target className="h-4 w-4" style={{ color: AZURE }} />
                <h2 className="text-sm font-bold text-white">Learning Objectives</h2>
              </div>
              <ul className="space-y-2">
                {(intro.objectives || []).map((obj, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-300 leading-relaxed">
                    <span className="h-4 w-4 shrink-0 rounded-full border text-[9px] font-mono font-bold flex items-center justify-center mt-0.5" style={{ backgroundColor: "rgba(0,120,212,0.2)", borderColor: AZURE, color: AZURE }}>{i + 1}</span>
                    {obj}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                <h2 className="text-sm font-bold text-white">Expected Outcomes</h2>
              </div>
              <ul className="space-y-2">
                {(intro.outcomes || []).map((out, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-300 leading-relaxed">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-green-500 mt-0.5" />
                    {out}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="h-4 w-4 text-blue-400" />
                <h2 className="text-sm font-bold text-white">Prerequisites</h2>
              </div>
              <ul className="space-y-2">
                {(intro.prerequisites || []).map((pre, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-300 leading-relaxed">
                    <span className="w-1 h-1 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                    {pre}
                  </li>
                ))}
              </ul>
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-xl p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <h2 className="text-sm font-bold text-white">Tools & Environment</h2>
              </div>
              <ul className="space-y-2">
                {(intro.tools || []).map((tool, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-gray-300 leading-relaxed">
                    <Cloud className="h-3 w-3 shrink-0 mt-0.5" style={{ color: AZURE }} />
                    {tool}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              onClick={onStart}
              className="flex items-center gap-2 px-8 py-3 text-white rounded-xl font-mono font-bold text-sm transition-colors shadow-lg"
              style={{ backgroundColor: AZURE, boxShadow: `0 4px 12px rgba(0,120,212,0.3)` }}
            >
              Start Lab
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}