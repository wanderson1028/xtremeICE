import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Trophy, Medal, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";
import { aggregateUserScores, rankUsers, CATEGORIES } from "@/lib/labScoring";
import { useTranslation } from "react-i18next";

function getMedalColor(rank) {
  if (rank === 0) return "text-yellow-400";
  if (rank === 1) return "text-gray-300";
  if (rank === 2) return "text-amber-600";
  return "text-gray-600";
}

export default function LabLeaderboard() {
  const { t } = useTranslation();
  const [activeCategory, setActiveCategory] = useState("Overall");

  const { data: labScores = [], isLoading: loadingLabs } = useQuery({
    queryKey: ["lab-scores-leaderboard"],
    queryFn: () => base44.entities.LabScore.list("-completed_at", 500),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: socSessions = [], isLoading: loadingSoc } = useQuery({
    queryKey: ["soc-sessions-leaderboard"],
    queryFn: () => base44.entities.SOCSession.list("-completed_at", 500),
    staleTime: 0,
    refetchOnMount: "always",
  });

  const isLoading = loadingLabs || loadingSoc;
  const byUser = aggregateUserScores(labScores, socSessions);
  const ranked = rankUsers(byUser, activeCategory).slice(0, 10);

  return (
    <div className="w-full bg-black/60 border border-yellow-600/30 rounded-2xl overflow-hidden backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-yellow-600/20 bg-yellow-900/10">
        <Trophy className="h-4 w-4 text-yellow-400" />
        <span className="text-yellow-400 font-mono font-bold text-sm uppercase tracking-wider">{t("leaderboard.title")}</span>
        <span className="ml-auto text-[10px] text-gray-500 font-mono">{t("leaderboard.subtitle")}</span>
      </div>

      {/* Category tabs */}
      <div className="flex gap-1 px-4 py-2.5 border-b border-gray-800 bg-black/30 overflow-x-auto">
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`shrink-0 text-[10px] font-mono px-2.5 py-1 rounded-md border transition-all ${
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
        <div className="py-8 text-center text-gray-600 font-mono text-xs">{t("leaderboard.loading")}</div>
      ) : ranked.length === 0 ? (
        <div className="py-8 text-center text-gray-600 font-mono text-xs">{t("leaderboard.noScores")}</div>
      ) : (
        <div className="divide-y divide-gray-800/60">
          {ranked.map((u, i) => {
            const accuracy = u.questions_total > 0 ? Math.round((u.questions_correct / u.questions_total) * 100) : null;
            return (
              <Link
                key={u.user_email}
                to={`/lab-leaderboard-detail?email=${encodeURIComponent(u.user_email)}`}
                className="flex items-center gap-3 px-5 py-3 hover:bg-gray-900/60 transition-colors group"
              >
                {/* Rank */}
                <div className={`w-6 shrink-0 text-center font-mono font-bold text-sm ${getMedalColor(i)}`}>
                  {i < 3 ? <Medal className="h-4 w-4 mx-auto" /> : <span>{i + 1}</span>}
                </div>

                {/* Avatar */}
                <div className="h-8 w-8 rounded-full bg-red-900/40 border border-red-700/40 flex items-center justify-center shrink-0">
                  <span className="text-red-300 font-mono font-bold text-xs">
                    {(u.user_name || "?").charAt(0).toUpperCase()}
                  </span>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-mono text-sm font-semibold truncate">{u.user_name}</span>
                    <span className="text-[10px] text-gray-500 font-mono shrink-0">
                      {t("leaderboard.completed", { count: u.labs.length + u.soc_sessions.length })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {accuracy !== null && (
                      <div className="flex-1 h-1 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 rounded-full"
                          style={{ width: `${accuracy}%` }}
                        />
                      </div>
                    )}
                    {accuracy !== null && (
                      <span className="text-[10px] text-gray-500 font-mono shrink-0">{t("leaderboard.accuracy", { pct: accuracy })}</span>
                    )}
                  </div>
                </div>

                {/* Score */}
                <div className="shrink-0 text-right">
                  <div className="text-yellow-400 font-mono font-bold text-sm">{Math.round(u.score).toLocaleString()}</div>
                  <div className="text-[10px] text-gray-600 font-mono">pts</div>
                </div>

                <ChevronRight className="h-3.5 w-3.5 text-gray-700 group-hover:text-gray-400 shrink-0 transition-colors" />
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}