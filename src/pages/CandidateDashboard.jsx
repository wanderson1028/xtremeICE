import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import {
  Shield, Clock, CheckCircle2, XCircle, Trophy, Target, BarChart2,
  ArrowRight, Loader2, AlertCircle, BookOpen, TrendingUp, Timer,
} from "lucide-react";
import { formatDistanceToNow, parseISO, format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";

function StatCard({ icon: Icon, label, value, sub, color = "text-cyan-400", bg = "bg-cyan-400/10" }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-start gap-3">
      <div className={`h-10 w-10 rounded-lg ${bg} flex items-center justify-center shrink-0`}>
        <Icon className={`h-5 w-5 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-white leading-tight">{value}</p>
        <p className="text-xs text-gray-400 mt-0.5">{label}</p>
        {sub && <p className={`text-xs mt-1 font-medium ${color}`}>{sub}</p>}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  const map = {
    submitted: { label: "Submitted", cls: "bg-blue-900/40 text-blue-400 border-blue-700/40" },
    evaluated: { label: "Evaluated", cls: "bg-green-900/40 text-green-400 border-green-700/40" },
    in_progress: { label: "In Progress", cls: "bg-yellow-900/40 text-yellow-400 border-yellow-700/40" },
    not_started: { label: "Not Started", cls: "bg-gray-800 text-gray-400 border-gray-700" },
  };
  const { label, cls } = map[status] || map.not_started;
  return (
    <span className={`text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border ${cls}`}>{label}</span>
  );
}

export default function CandidateDashboard() {
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: sessions = [], isLoading: sessionsLoading } = useQuery({
    queryKey: ["my-candidate-sessions", user?.email],
    queryFn: () => base44.entities.CandidateSession.filter({ candidate_email: user.email }, "-created_date", 50),
    enabled: !!user?.email,
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ["my-invitations", user?.email],
    queryFn: () => base44.entities.CandidateInvitation.filter({ candidate_email: user.email }, "-created_date", 50),
    enabled: !!user?.email,
  });

  const { data: scorecards = [] } = useQuery({
    queryKey: ["my-scorecards", user?.email],
    queryFn: () => base44.entities.Scorecard.filter({ candidate_email: user.email }, "-created_date", 50),
    enabled: !!user?.email,
  });

  const { data: labScores = [] } = useQuery({
    queryKey: ["my-lab-scores", user?.email],
    queryFn: () => base44.entities.LabScore.filter({ user_email: user.email }, "-created_date", 100),
    enabled: !!user?.email,
    staleTime: 0,
  });

  // Fetch all lab scores across all users to compute per-lab averages
  const { data: allLabScores = [] } = useQuery({
    queryKey: ["all-lab-scores-avg"],
    queryFn: () => base44.entities.LabScore.list("-created_date", 500),
    enabled: !!user?.email,
    staleTime: 5 * 60 * 1000,
  });

  // Build a map of assessmentId -> assessment name via invitation
  const { data: assessments = [] } = useQuery({
    queryKey: ["candidate-assessments-list", invitations.map(i => i.assessment_id).join(",")],
    queryFn: async () => {
      const ids = [...new Set(invitations.map(i => i.assessment_id).filter(Boolean))];
      if (!ids.length) return [];
      const results = await Promise.all(ids.map(id => base44.entities.Assessment.get(id).catch(() => null)));
      return results.filter(Boolean);
    },
    enabled: invitations.length > 0,
  });

  const assessmentMap = useMemo(() => {
    const m = {};
    assessments.forEach(a => { m[a.id] = a; });
    return m;
  }, [assessments]);

  const scorecardMap = useMemo(() => {
    const m = {};
    scorecards.forEach(s => { m[s.session_id] = s; });
    return m;
  }, [scorecards]);

  // Build per-lab average scores from all users (excluding current user for a fair "others" avg)
  const labAvgMap = useMemo(() => {
    const map = {};
    allLabScores
      .filter(s => s.user_email !== user?.email && s.points_possible > 0)
      .forEach(s => {
        const pct = Math.round((s.points_earned / s.points_possible) * 100);
        if (!map[s.lab_title]) map[s.lab_title] = { total: 0, count: 0 };
        map[s.lab_title].total += pct;
        map[s.lab_title].count += 1;
      });
    const avg = {};
    Object.entries(map).forEach(([title, { total, count }]) => {
      avg[title] = Math.round(total / count);
    });
    return avg;
  }, [allLabScores, user?.email]);

  const stats = useMemo(() => {
    const completed = sessions.filter(s => s.status === "submitted" || s.status === "evaluated");
    const totalTime = sessions.reduce((acc, s) => acc + (s.time_elapsed_minutes || 0), 0);
    const evaluated = sessions.filter(s => scorecardMap[s.id]);
    const scores = evaluated.map(s => scorecardMap[s.id]?.overall_score || 0);
    const avgScore = scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    const passed = evaluated.filter(s => scorecardMap[s.id]?.passed).length;

    // Lab scores chart — last 10, with avg comparison
    const labScoreChart = labScores.slice(0, 10).map((s, i) => ({
      name: `#${i + 1}`,
      score: s.points_possible > 0 ? Math.round((s.points_earned / s.points_possible) * 100) : 0,
      avg: labAvgMap[s.lab_title] ?? null,
      label: s.lab_title || "Lab",
    }));

    return { completed: completed.length, totalTime, avgScore, passed, evaluated: evaluated.length, labScoreChart };
  }, [sessions, scorecardMap, labScores, labAvgMap]);

  const isLoading = userLoading || sessionsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/20 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-red-500" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-10 w-10 text-red-500 mx-auto mb-3" />
          <p className="text-white font-semibold mb-2">Sign in to view your dashboard</p>
          <button onClick={() => base44.auth.redirectToLogin(window.location.href)} className="px-5 py-2 bg-red-700 hover:bg-red-600 text-white rounded-xl text-sm font-bold transition-colors">
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/20">
      {/* Header */}
      <div className="border-b border-red-900/30 bg-black/60 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-6 w-6 text-red-500" />
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">My Progress Dashboard</h1>
              <p className="text-gray-500 text-xs">Welcome back, {user.full_name || user.email}</p>
            </div>
          </div>
          <Link to="/InteractiveVirtualLabs" className="flex items-center gap-1.5 text-xs text-red-400 hover:text-red-300 transition-colors font-mono">
            Active Labs <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-8">

        {/* KPI stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={BookOpen} label="Assessments Taken" value={sessions.length} sub={`${stats.completed} submitted`} color="text-cyan-400" bg="bg-cyan-400/10" />
          <StatCard icon={Timer} label="Total Time Spent" value={stats.totalTime >= 60 ? `${Math.floor(stats.totalTime / 60)}h ${stats.totalTime % 60}m` : `${stats.totalTime}m`} sub="Across all assessments" color="text-purple-400" bg="bg-purple-400/10" />
          <StatCard icon={Target} label="Avg Hardening Score" value={stats.avgScore != null ? `${stats.avgScore}%` : "—"} sub={stats.evaluated > 0 ? `from ${stats.evaluated} scored` : "No scores yet"} color="text-orange-400" bg="bg-orange-400/10" />
          <StatCard icon={Trophy} label="Assessments Passed" value={stats.passed} sub={stats.evaluated > 0 ? `${Math.round((stats.passed / stats.evaluated) * 100)}% pass rate` : "Pending evaluation"} color="text-green-400" bg="bg-green-400/10" />
        </div>

        {/* Assessments table + Lab score chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Assessment sessions list */}
          <div className="lg:col-span-2 rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
              <Shield className="h-4 w-4 text-red-400" />
              <h2 className="text-sm font-semibold text-gray-200">Assessment History</h2>
            </div>
            {sessions.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2 text-gray-600">
                <BookOpen className="h-8 w-8" />
                <p className="text-sm">No assessments yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {sessions.map(session => {
                  const inv = invitations.find(i => i.id === session.invitation_id);
                  const assessment = assessmentMap[session.assessment_id];
                  const scorecard = scorecardMap[session.id];
                  const timeLabel = session.time_elapsed_minutes
                    ? `${session.time_elapsed_minutes} min`
                    : "—";
                  return (
                    <div key={session.id} className="flex items-start gap-3 p-3 bg-black/30 rounded-lg border border-white/5 hover:border-white/10 transition-colors">
                      <div className={`h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${scorecard?.passed ? "bg-green-900/30" : scorecard ? "bg-red-900/30" : "bg-gray-800"}`}>
                        {scorecard?.passed ? <CheckCircle2 className="h-5 w-5 text-green-400" /> : scorecard ? <XCircle className="h-5 w-5 text-red-400" /> : <Clock className="h-5 w-5 text-gray-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-sm font-semibold text-white truncate">
                            {assessment?.position_title || inv?.candidate_name || "Assessment"}
                          </p>
                          <StatusBadge status={session.status} />
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-gray-500 font-mono flex-wrap">
                          {assessment?.company_name && <span>{assessment.company_name}</span>}
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeLabel}</span>
                          {scorecard?.overall_score != null && (
                            <span className={`font-bold ${scorecard.overall_score >= 70 ? "text-green-400" : "text-red-400"}`}>
                              {scorecard.overall_score}% score
                            </span>
                          )}
                          {session.submitted_at && (
                            <span>{formatDistanceToNow(parseISO(session.submitted_at), { addSuffix: true })}</span>
                          )}
                        </div>
                        {/* Task progress bar */}
                        {session.task_submissions?.length > 0 && (
                          <div className="mt-2">
                            <div className="flex justify-between text-[9px] font-mono text-gray-600 mb-0.5">
                              <span>Tasks completed</span>
                              <span>{session.task_submissions.length}</span>
                            </div>
                            <div className="h-1 bg-gray-800 rounded-full overflow-hidden w-full">
                              <div
                                className="h-full bg-gradient-to-r from-red-700 to-red-400 rounded-full"
                                style={{ width: `${Math.min(100, (session.task_submissions.length / Math.max(1, session.task_submissions.length)) * 100)}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right column: lab scores + scorecard highlights */}
          <div className="space-y-4">
            {/* Lab hardening scores chart */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                <BarChart2 className="h-4 w-4 text-cyan-400" />
                <h2 className="text-sm font-semibold text-gray-200">Lab Scores</h2>
              </div>
              {stats.labScoreChart.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-24 text-gray-600 gap-1">
                  <TrendingUp className="h-6 w-6" />
                  <p className="text-xs">No lab scores yet</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <BarChart data={stats.labScoreChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="name" tick={{ fontSize: 9, fill: "#6b7280" }} />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#6b7280" }} />
                      <Tooltip
                        contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
                        formatter={(val, name, props) => [`${val}%`, name === "score" ? props.payload.label || "You" : "Others Avg"]}
                      />
                      <Legend wrapperStyle={{ fontSize: 9, color: "#9ca3af" }} formatter={v => v === "score" ? "You" : "Others Avg"} />
                      <Bar dataKey="score" fill="#10b981" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="avg" fill="#6366f1" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </>
              )}
            </div>

            {/* Recent scorecard highlights */}
            <div className="rounded-xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 mb-3 pb-2 border-b border-white/10">
                <Trophy className="h-4 w-4 text-yellow-400" />
                <h2 className="text-sm font-semibold text-gray-200">Scorecard Highlights</h2>
              </div>
              {scorecards.length === 0 ? (
                <p className="text-xs text-gray-600 text-center py-4">Scores will appear after evaluation.</p>
              ) : (
                <div className="space-y-3">
                  {scorecards.slice(0, 3).map(sc => (
                    <div key={sc.id} className="p-2.5 bg-black/30 rounded-lg border border-white/5">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className={`text-sm font-bold font-mono ${sc.passed ? "text-green-400" : "text-red-400"}`}>
                          {sc.overall_score ?? "?"}%
                        </span>
                        <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${sc.passed ? "bg-green-900/30 text-green-400 border-green-700/40" : "bg-red-900/30 text-red-400 border-red-700/40"}`}>
                          {sc.passed ? "PASS" : "FAIL"}
                        </span>
                      </div>
                      {sc.hiring_recommendation && (
                        <p className="text-[10px] text-gray-400 capitalize">
                          Recommendation: <span className="text-gray-300">{sc.hiring_recommendation.replace(/_/g, " ")}</span>
                        </p>
                      )}
                      {sc.strengths?.length > 0 && (
                        <p className="text-[10px] text-emerald-400 mt-1 truncate">✓ {sc.strengths[0]}</p>
                      )}
                      {sc.generated_at && (
                        <p className="text-[9px] text-gray-600 mt-1 font-mono">
                          {formatDistanceToNow(parseISO(sc.generated_at), { addSuffix: true })}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Lab completion table */}
        {labScores.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-white/10">
              <BookOpen className="h-4 w-4 text-violet-400" />
              <h2 className="text-sm font-semibold text-gray-200">Lab Completion History</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 font-mono border-b border-white/5">
                    <th className="text-left pb-2 pr-4 font-medium">Lab</th>
                    <th className="text-left pb-2 pr-4 font-medium">Chapter</th>
                    <th className="text-left pb-2 pr-4 font-medium">Difficulty</th>
                    <th className="text-right pb-2 pr-4 font-medium">Steps</th>
                    <th className="text-right pb-2 pr-4 font-medium">Your Score</th>
                    <th className="text-right pb-2 pr-4 font-medium">Others Avg</th>
                    <th className="text-right pb-2 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {labScores.map(ls => {
                    const pct = ls.points_possible > 0 ? Math.round((ls.points_earned / ls.points_possible) * 100) : 0;
                    return (
                      <tr key={ls.id} className="border-b border-white/5 hover:bg-white/[0.03] transition-colors">
                        <td className="py-2.5 pr-4 text-gray-200 font-medium max-w-[180px] truncate">{ls.lab_title || "—"}</td>
                        <td className="py-2.5 pr-4 text-gray-400 font-mono">{ls.lab_chapter || "—"}</td>
                        <td className="py-2.5 pr-4">
                          {ls.difficulty && (
                            <span className={`px-2 py-0.5 rounded-full border font-mono text-[10px] ${
                              ls.difficulty === "Beginner" ? "bg-green-900/20 text-green-400 border-green-800/40" :
                              ls.difficulty === "Intermediate" ? "bg-yellow-900/20 text-yellow-400 border-yellow-800/40" :
                              "bg-red-900/20 text-red-400 border-red-800/40"
                            }`}>{ls.difficulty}</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-4 text-right text-gray-400 font-mono">
                          {ls.steps_completed ?? "—"}/{ls.total_steps ?? "—"}
                        </td>
                        <td className="py-2.5 pr-4 text-right font-bold font-mono">
                          <span className={pct >= 70 ? "text-green-400" : "text-red-400"}>{pct}%</span>
                        </td>
                        <td className="py-2.5 pr-4 text-right font-mono">
                          {labAvgMap[ls.lab_title] != null ? (
                            <span className={`font-semibold ${pct > labAvgMap[ls.lab_title] ? "text-cyan-400" : pct < labAvgMap[ls.lab_title] ? "text-orange-400" : "text-gray-400"}`}>
                              {labAvgMap[ls.lab_title]}%
                              <span className="text-[9px] ml-1 font-normal">
                                {pct > labAvgMap[ls.lab_title] ? "↑" : pct < labAvgMap[ls.lab_title] ? "↓" : "="}
                              </span>
                            </span>
                          ) : (
                            <span className="text-gray-600">—</span>
                          )}
                        </td>
                        <td className="py-2.5 text-right text-gray-500 font-mono">
                          {ls.completed_at ? format(parseISO(ls.completed_at), "MMM d, yyyy") : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}