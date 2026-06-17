import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Trophy, CheckCircle2, XCircle, BookOpen, Star, Monitor } from "lucide-react";
import { Link } from "react-router-dom";
import { aggregateUserScores, CATEGORIES, DIFF_MULT, SOC_MODE_MULT } from "@/lib/labScoring";

const DIFF_COLOR = {
  Beginner: "text-green-400 bg-green-900/20 border-green-700/40",
  Intermediate: "text-yellow-400 bg-yellow-900/20 border-yellow-700/40",
  Advanced: "text-orange-400 bg-orange-900/20 border-orange-700/40",
  Expert: "text-red-400 bg-red-900/20 border-red-700/40",
};

export default function LabLeaderboardDetail() {
  const params = new URLSearchParams(window.location.search);
  const email = params.get("email") || "";
  const [activeCategory, setActiveCategory] = useState("Overall");

  const { data: labScores = [], isLoading: loadingLabs } = useQuery({
    queryKey: ["lab-scores-detail", email],
    queryFn: () => base44.entities.LabScore.filter({ user_email: email }),
    enabled: !!email,
  });

  const { data: socSessions = [], isLoading: loadingSoc } = useQuery({
    queryKey: ["soc-sessions-detail", email],
    queryFn: () => base44.entities.SOCSession.filter({ user_email: email, status: "completed" }),
    enabled: !!email,
  });

  const isLoading = loadingLabs || loadingSoc;

  const byUser = aggregateUserScores(labScores, socSessions);
  const userData = byUser[email];
  const userName = userData?.user_name || labScores[0]?.user_name || email;

  const totalScore = userData?.total_adjusted || 0;
  const accuracy = (userData?.questions_total || 0) > 0
    ? Math.round((userData.questions_correct / userData.questions_total) * 100)
    : null;

  const categories = CATEGORIES.filter(c => c !== "Overall");

  // Filter displayed labs/sessions by category
  const displayedLabs = (userData?.labs || []).filter(
    l => activeCategory === "Overall" || l.category === activeCategory
  );
  const displayedSoc = (userData?.soc_sessions || []).filter(
    () => activeCategory === "Overall" || activeCategory === "SOC Simulations"
  );

  // Get raw attempts for a lab for the step breakdown
  const labAttemptsByTitle = {};
  for (const s of labScores) {
    if (!labAttemptsByTitle[s.lab_title]) labAttemptsByTitle[s.lab_title] = [];
    labAttemptsByTitle[s.lab_title].push(s);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/20 p-6">
      <div className="max-w-4xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-1.5 text-gray-400 hover:text-white text-xs font-mono transition-colors mb-6">
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
        </Link>

        {/* Hero header */}
        <div className="bg-black/60 border border-yellow-600/30 rounded-2xl p-6 mb-6 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-full bg-red-900/40 border border-red-700/40 flex items-center justify-center shrink-0">
              <span className="text-red-300 font-mono font-bold text-2xl">{userName.charAt(0).toUpperCase()}</span>
            </div>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-white font-mono">{userName}</h1>
              <p className="text-gray-500 font-mono text-xs mt-0.5">{email}</p>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end">
                <Trophy className="h-5 w-5 text-yellow-400" />
                <span className="text-3xl font-bold text-yellow-400 font-mono">{Math.round(totalScore).toLocaleString()}</span>
              </div>
              <p className="text-gray-500 font-mono text-xs mt-0.5">difficulty-adjusted pts</p>
            </div>
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 pt-5 border-t border-gray-800">
            {[
              { label: "Labs Completed", value: userData?.labs.length || 0 },
              { label: "SOC Sessions", value: userData?.soc_sessions.length || 0 },
              { label: "Questions Correct", value: `${Math.round(userData?.questions_correct || 0)}/${Math.round(userData?.questions_total || 0)}` },
              { label: "Knowledge Accuracy", value: accuracy !== null ? `${accuracy}%` : "—" },
            ].map(({ label, value }) => (
              <div key={label} className="bg-gray-900/60 rounded-xl p-3 text-center border border-gray-800">
                <div className="text-white font-mono font-bold text-lg">{value}</div>
                <div className="text-gray-500 font-mono text-[10px] mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          {/* Category score bar breakdown */}
          {userData && (
            <div className="mt-4 pt-4 border-t border-gray-800 space-y-2">
              {categories.filter(c => (userData.category_scores[c] || 0) > 0).map(cat => {
                const catScore = Math.round(userData.category_scores[cat] || 0);
                const pct = totalScore > 0 ? (catScore / totalScore) * 100 : 0;
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-[10px] font-mono text-gray-400 w-36 shrink-0">{cat}</span>
                    <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-red-700 to-red-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-[10px] text-yellow-400 font-mono w-14 text-right shrink-0">{catScore} pts</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Category filter tabs */}
        <div className="flex gap-1 mb-5 flex-wrap">
          {["Overall", ...categories].map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`text-[10px] font-mono px-2.5 py-1 rounded-md border transition-all ${
                activeCategory === cat
                  ? "border-yellow-600/60 bg-yellow-900/20 text-yellow-400"
                  : "border-gray-700/50 bg-gray-900/30 text-gray-500 hover:text-gray-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="text-center text-gray-600 font-mono text-xs py-12">Loading…</div>
        ) : (
          <div className="space-y-4">
            {/* Lab results */}
            {displayedLabs.map((lab, idx) => {
              const attempts = labAttemptsByTitle[lab.lab_title] || [];
              const diffClass = DIFF_COLOR[lab.difficulty] || "text-gray-400 bg-gray-900/20 border-gray-700/40";
              const mult = DIFF_MULT[lab.difficulty] || 1;

              return (
                <div key={idx} className="bg-black/60 border border-gray-700/50 rounded-2xl overflow-hidden backdrop-blur-sm">
                  <div className="flex items-center gap-3 px-5 py-4 border-b border-gray-800 bg-gray-900/30">
                    <BookOpen className="h-4 w-4 text-red-400 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-mono font-bold text-sm">{lab.lab_title}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full border font-mono font-semibold ${diffClass}`}>
                          {lab.difficulty}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">×{mult} multiplier</span>
                        {lab.attempts > 1 && (
                          <span className="text-[10px] text-blue-400 font-mono">{lab.attempts} attempts (avg)</span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">{lab.category}</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Star className="h-3.5 w-3.5 text-yellow-400" />
                      <span className="text-yellow-400 font-mono font-bold text-sm">{Math.round(lab.adjusted)}</span>
                      <span className="text-gray-600 font-mono text-xs">pts</span>
                    </div>
                  </div>

                  {/* Show step results from most recent attempt */}
                  {attempts.length > 0 && attempts[attempts.length - 1].step_results?.length > 0 && (
                    <div className="divide-y divide-gray-800/50">
                      {attempts[attempts.length - 1].step_results.map((step, si) => (
                        <div key={si} className="flex items-start gap-3 px-5 py-3">
                          <div className="shrink-0 mt-0.5">
                            {step.commandCompleted
                              ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                              : <XCircle className="h-3.5 w-3.5 text-gray-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-gray-300 font-mono text-xs">{step.stepLabel}</span>
                              {step.hasQuestion && (
                                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${
                                  step.questionCorrect
                                    ? "text-green-400 bg-green-900/20 border-green-700/30"
                                    : "text-red-400 bg-red-900/20 border-red-700/30"
                                }`}>
                                  {step.questionCorrect ? "✓ Correct" : "✗ Incorrect"}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className={`font-mono text-xs font-bold shrink-0 ${step.pointsEarned > 0 ? "text-yellow-400" : "text-gray-600"}`}>
                            +{step.pointsEarned} pts
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {/* SOC session results */}
            {displayedSoc.map((soc, idx) => {
              const mult = SOC_MODE_MULT[soc.mode] || 1;
              return (
                <div key={`soc-${idx}`} className="bg-black/60 border border-blue-700/30 rounded-2xl overflow-hidden backdrop-blur-sm">
                  <div className="flex items-center gap-3 px-5 py-4 bg-blue-900/10">
                    <Monitor className="h-4 w-4 text-blue-400 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-mono font-bold text-sm">{soc.scenario_name || soc.scenario_id}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded-full border font-mono font-semibold text-blue-400 bg-blue-900/20 border-blue-700/40">
                          {soc.mode === "assessment" ? "Assessment" : "Training"}
                        </span>
                        <span className="text-[10px] text-gray-500 font-mono">×{mult} multiplier</span>
                        {soc.attempts > 1 && (
                          <span className="text-[10px] text-blue-400 font-mono">{soc.attempts} attempts (avg)</span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono mt-0.5">SOC Simulations</div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Star className="h-3.5 w-3.5 text-yellow-400" />
                      <span className="text-yellow-400 font-mono font-bold text-sm">{Math.round(soc.adjusted)}</span>
                      <span className="text-gray-600 font-mono text-xs">pts</span>
                    </div>
                  </div>
                </div>
              );
            })}

            {displayedLabs.length === 0 && displayedSoc.length === 0 && (
              <div className="text-center text-gray-600 font-mono text-xs py-12">No activity in this category yet.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}