import React, { useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { useTranslation } from "react-i18next";
import {
  LineChart, Line, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";
import {
  BookOpen, Award, ShieldCheck, Clock, CheckCircle2, XCircle,
  Flame, Target, ArrowRight, Network, Monitor, Swords, FlaskConical,
  Play, Zap, TrendingUp, AlertCircle, LogIn, Timer
} from "lucide-react";
import { format, subDays, parseISO, formatDistanceToNow } from "date-fns";

// ─── Sub-components ──────────────────────────────────────────────────────────

const StatCard = ({ icon: Icon, label, value, sub, color = "text-cyan-400", bgColor = "bg-cyan-400/10" }) => (
  <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex items-start gap-3 hover:bg-white/[0.07] transition-all">
    <div className={`h-10 w-10 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0`}>
      <Icon className={`h-5 w-5 ${color}`} />
    </div>
    <div className="min-w-0">
      <p className="text-2xl font-bold text-white leading-tight">{value}</p>
      <p className="text-xs text-gray-400 mt-0.5">{label}</p>
      {sub && <p className={`text-xs mt-1 font-medium ${color}`}>{sub}</p>}
    </div>
  </div>
);

const SparklineCard = ({ icon: Icon, label, value, sub, color = "text-cyan-400", bgColor = "bg-cyan-400/10", strokeColor = "#38bdf8", data = [], dataKey = "count" }) => (
  <div className="rounded-xl border border-white/10 bg-white/5 p-4 hover:bg-white/[0.07] transition-all">
    <div className="flex items-center gap-2 mb-2">
      <div className={`h-7 w-7 rounded-lg ${bgColor} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`h-4 w-4 ${color}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xl font-bold text-white leading-tight">{value}</p>
        <p className="text-[10px] text-gray-400">{label}</p>
      </div>
    </div>
    <ResponsiveContainer width="100%" height={40}>
      <LineChart data={data}>
        <Line type="monotone" dataKey={dataKey} stroke={strokeColor} strokeWidth={1.5} dot={false} />
      </LineChart>
    </ResponsiveContainer>
    {sub && <p className={`text-[10px] mt-1 font-medium ${color}`}>{sub}</p>}
  </div>
);

const ALL_QUICK_STARTS = [
  { key: "network_design_wizard", icon: Network,     color: "text-cyan-400",   bg: "bg-cyan-400/10 border-cyan-400/20",   labelKey: "dashboard.designNetwork",    descKey: "dashboard.designNetworkDesc",    path: createPageUrl("NetworkWizard") },
  { key: "lab_scenarios",         icon: FlaskConical, color: "text-violet-400", bg: "bg-violet-400/10 border-violet-400/20", labelKey: "dashboard.startLab",        descKey: "dashboard.startLabDesc",         path: createPageUrl("Labs") },
  { key: "soc_training",          icon: ShieldCheck,  color: "text-emerald-400", bg: "bg-emerald-400/10 border-emerald-400/20", labelKey: "dashboard.socTraining",  descKey: "dashboard.socTrainingDesc",      path: "/soc-training" },
  { key: "cyber_range",           icon: Swords,       color: "text-red-400",    bg: "bg-red-400/10 border-red-400/20",     labelKey: "dashboard.cyberRange",       descKey: "dashboard.cyberRangeDesc",       path: createPageUrl("CyberEventBuilder") + "?new=true" },
  { key: "course_lab_builder",    icon: BookOpen,     color: "text-orange-400", bg: "bg-orange-400/10 border-orange-400/20", labelKey: "dashboard.courseLabBuilder", descKey: "dashboard.courseLabBuilderDesc", path: "/LabBuilderDashboard" },
];

const TIPS_KEYS = [
  { icon: Zap, textKey: "dashboard.tip1" },
  { icon: Target, textKey: "dashboard.tip2" },
  { icon: TrendingUp, textKey: "dashboard.tip3" },
  { icon: AlertCircle, textKey: "dashboard.tip4" },
];

// ─── Main component ───────────────────────────────────────────────────────────

export default function UserDashboard({ userEmail, assignedKeys = [], isAdmin = false }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const sessionStartRef = useRef(Date.now());

  // Track login event once on mount
  useEffect(() => {
    if (!userEmail) return;
    base44.entities.UserActivity.create({
      user_email: userEmail,
      event_type: "login",
    }).catch(() => {});

    // Track session duration on unmount / page close
    const handleEnd = () => {
      const mins = Math.round((Date.now() - sessionStartRef.current) / 60000);
      if (mins < 1) return;
      navigator.sendBeacon
        ? base44.entities.UserActivity.create({ user_email: userEmail, event_type: "session_end", session_duration_minutes: mins }).catch(() => {})
        : null;
    };
    window.addEventListener("beforeunload", handleEnd);
    return () => {
      window.removeEventListener("beforeunload", handleEnd);
      handleEnd();
    };
  }, [userEmail]);

  const { data: attempts = [] } = useQuery({
    queryKey: ["my-attempts", userEmail],
    queryFn: () => base44.entities.LabAttempt.filter({ user_email: userEmail }, "-created_date", 200),
    enabled: !!userEmail,
  });

  const { data: labScores = [] } = useQuery({
    queryKey: ["my-lab-scores", userEmail],
    queryFn: () => base44.entities.LabScore.filter({ user_email: userEmail }, "-created_date", 200),
    enabled: !!userEmail,
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: socSessions = [] } = useQuery({
    queryKey: ["my-soc-sessions", userEmail],
    queryFn: () => base44.entities.SOCSession.filter({ user_email: userEmail }, "-created_date", 100),
    enabled: !!userEmail,
  });

  const { data: scenarios = [] } = useQuery({
    queryKey: ["lab-scenarios-names"],
    queryFn: () => base44.entities.LabScenario.list("-created_date", 100),
  });

  const { data: activityLogs = [] } = useQuery({
    queryKey: ["my-activity", userEmail],
    queryFn: () => base44.entities.UserActivity.filter({ user_email: userEmail }, "-created_date", 200),
    enabled: !!userEmail,
  });

  const quickStarts = (isAdmin ? ALL_QUICK_STARTS : ALL_QUICK_STARTS.filter((qs) => assignedKeys.includes(qs.key)));

  const stats = useMemo(() => {
    // Merge LabAttempt completions + LabScore completions (from linux labs)
    const completed = attempts.filter((a) => a.status === "completed");
    const inProgress = attempts.filter((a) => a.status === "in_progress");

    // LabScore entries count as completed labs too
    const totalLabsCompleted = completed.length + labScores.length;

    // Avg score across both sources
    const allScores = [
      ...completed.map(a => a.score || 0),
      ...labScores.map(s => s.points_possible > 0 ? Math.round((s.points_earned / s.points_possible) * 100) : 0),
    ];
    const avgScore = allScores.length
      ? Math.round(allScores.reduce((s, v) => s + v, 0) / allScores.length)
      : null;

    const passRate = completed.length
      ? Math.round((completed.filter((a) => a.passed).length / completed.length) * 100)
      : null;

    // Streak — include both sources
    const allActivityDates = [
      ...attempts.map(a => a.created_date),
      ...labScores.map(s => s.completed_at || s.created_date),
    ];
    const actDays = new Set(
      allActivityDates
        .filter(Boolean)
        .map(d => format(parseISO(d), "yyyy-MM-dd"))
    );
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      if (actDays.has(format(subDays(new Date(), i), "yyyy-MM-dd"))) streak++;
      else break;
    }

    // Activity chart — last 14 days (all lab activity)
    const actByDay = {};
    for (let i = 13; i >= 0; i--) {
      actByDay[format(subDays(new Date(), i), "MMM d")] = 0;
    }
    allActivityDates.filter(Boolean).forEach(d => {
      const key = format(parseISO(d), "MMM d");
      if (key in actByDay) actByDay[key]++;
    });
    const activityChart = Object.entries(actByDay).map(([date, count]) => ({ date, count }));

    // Score chart — last 10 from LabScores (linux labs), plus LabAttempts
    const labScoreChart = labScores.slice(0, 10).map((s, i) => ({
      attempt: `#${i + 1}`,
      score: s.points_possible > 0 ? Math.round((s.points_earned / s.points_possible) * 100) : 0,
      passed: true,
    }));
    const attemptChart = completed.slice(0, 10).map((a, i) => ({
      attempt: `#${i + 1}`,
      score: a.score || 0,
      passed: a.passed,
    }));
    const scoresChart = [...labScoreChart, ...attemptChart].slice(0, 10);

    // Recent activity feed — merge attempts + lab scores
    const recentActivity = [
      ...attempts.slice(0, 5).map(a => {
        const scenario = scenarios.find(s => s.id === a.scenario_id);
        return {
          id: a.id,
          scenarioName: scenario?.title || "Lab Attempt",
          status: a.status,
          score: a.score,
          passed: a.passed,
          date: a.created_date,
        };
      }),
      ...labScores.slice(0, 5).map(s => ({
        id: s.id,
        scenarioName: s.lab_title || "Linux Lab",
        status: "completed",
        score: s.points_possible > 0 ? Math.round((s.points_earned / s.points_possible) * 100) : null,
        passed: true,
        date: s.completed_at || s.created_date,
      })),
    ]
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 5);

    // Login & usage stats from UserActivity
    const loginEvents = activityLogs.filter(a => a.event_type === "login");
    const sessionEvents = activityLogs.filter(a => a.event_type === "session_end");
    const totalLogins = loginEvents.length;
    const totalUsageMinutes = sessionEvents.reduce((s, a) => s + (a.session_duration_minutes || 0), 0);
    const lastLogin = loginEvents[0]?.created_date || null;

    // Logins per day chart — last 14 days
    const loginByDay = {};
    for (let i = 13; i >= 0; i--) {
      loginByDay[format(subDays(new Date(), i), "MMM d")] = 0;
    }
    loginEvents.forEach(a => {
      if (!a.created_date) return;
      const d = format(parseISO(a.created_date), "MMM d");
      if (d in loginByDay) loginByDay[d]++;
    });
    const loginChart = Object.entries(loginByDay).map(([date, count]) => ({ date, count }));

    return {
      totalAttempts: attempts.length + labScores.length,
      completedAttempts: totalLabsCompleted,
      inProgress: inProgress.length,
      avgScore,
      passRate,
      streak,
      socSessions: socSessions.length,
      activityChart,
      scoresChart,
      recentActivity,
      hasActivity: attempts.length > 0 || labScores.length > 0 || socSessions.length > 0,
      totalLogins,
      totalUsageMinutes,
      lastLogin,
      loginChart,
    };
  }, [attempts, labScores, socSessions, scenarios, activityLogs]);

  const statusIcon = (status, passed) => {
    if (status === "completed" && passed) return <CheckCircle2 className="h-4 w-4 text-green-400 flex-shrink-0" />;
    if (status === "completed" && !passed) return <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />;
    if (status === "in_progress") return <Clock className="h-4 w-4 text-yellow-400 flex-shrink-0" />;
    return <XCircle className="h-4 w-4 text-red-400 flex-shrink-0" />;
  };

  const statusLabel = (status, passed) => {
    if (status === "completed") return passed ? t("dashboard.passed") : t("dashboard.failed");
    if (status === "in_progress") return t("dashboard.inProgress", { count: "" }).trim();
    return t("dashboard.failed");
  };

  return (
    <div className="mb-8 space-y-5">
      {/* Section header */}
      <div className="flex items-center gap-3">
        <h2 className="text-xs font-semibold text-red-500 uppercase tracking-widest whitespace-nowrap">{t("dashboard.title")}</h2>
        <div className="flex-1 border-t border-red-900/30" />
      </div>

      {/* KPI stat cards — always visible */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <SparklineCard
          icon={BookOpen}
          label={t("dashboard.labAttempts")}
          value={stats.totalAttempts}
          sub={stats.inProgress > 0 ? t("dashboard.inProgress", { count: stats.inProgress }) : t("dashboard.startFirst")}
          color="text-cyan-400"
          bgColor="bg-cyan-400/10"
          strokeColor="#22d3ee"
          data={stats.activityChart}
        />
        <StatCard
          icon={Award}
          label={t("dashboard.completed")}
          value={stats.completedAttempts}
          sub={stats.avgScore != null ? t("dashboard.avgScore", { score: stats.avgScore }) : t("dashboard.noneYet")}
          color="text-green-400"
          bgColor="bg-green-400/10"
        />
        <SparklineCard
          icon={ShieldCheck}
          label={t("dashboard.socSessions")}
          value={stats.socSessions}
          sub={stats.socSessions === 0 ? t("dashboard.trySoc") : null}
          color="text-purple-400"
          bgColor="bg-purple-400/10"
          strokeColor="#a78bfa"
          data={stats.activityChart}
        />
        <StatCard
          icon={Flame}
          label={t("dashboard.dayStreak")}
          value={stats.streak}
          sub={stats.streak > 0 ? t("dashboard.keepItUp") : t("dashboard.startToday")}
          color="text-orange-400"
          bgColor="bg-orange-400/10"
        />
        <SparklineCard
          icon={LogIn}
          label={t("dashboard.totalLogins")}
          value={stats.totalLogins}
          sub={stats.lastLogin ? t("dashboard.lastLogin", { time: formatDistanceToNow(parseISO(stats.lastLogin), { addSuffix: true }) }) : t("dashboard.firstSession")}
          color="text-sky-400"
          bgColor="bg-sky-400/10"
          strokeColor="#38bdf8"
          data={stats.loginChart}
        />
        <StatCard
          icon={Timer}
          label={t("dashboard.usageTime")}
          value={stats.totalUsageMinutes >= 60 ? `${Math.floor(stats.totalUsageMinutes / 60)}h ${stats.totalUsageMinutes % 60}m` : `${stats.totalUsageMinutes}m`}
          sub={t("dashboard.totalTime")}
          color="text-rose-400"
          bgColor="bg-rose-400/10"
        />
      </div>

      {/* Bottom section: changes based on activity */}
      {stats.hasActivity ? (
        /* ── ACTIVE USER: charts + recent activity ── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Login activity line chart */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/10">
              <p className="text-sm font-semibold text-gray-200">Logins (14 days)</p>
              <span className="text-xs text-sky-400 font-mono">{t("dashboard.total", { count: stats.totalLogins })}</span>
            </div>
            <ResponsiveContainer width="100%" height={110}>
              <LineChart data={stats.loginChart}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: "#6b7280" }} interval={2} />
                <YAxis allowDecimals={false} tick={{ fontSize: 9, fill: "#6b7280" }} />
                <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} labelStyle={{ color: "#e2e8f0" }} />
                <Line type="monotone" dataKey="count" stroke="#38bdf8" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
            <div className="mt-2 pt-2 border-t border-white/10 flex items-center justify-between">
              <span className="text-[10px] text-gray-500">Total usage time</span>
              <span className="text-xs text-rose-400 font-semibold font-mono">
                {stats.totalUsageMinutes >= 60
                  ? `${Math.floor(stats.totalUsageMinutes / 60)}h ${stats.totalUsageMinutes % 60}m`
                  : `${stats.totalUsageMinutes}m`}
              </span>
            </div>
          </div>

          {/* Score bar chart */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4">
            <p className="text-sm font-semibold text-gray-200 mb-3 pb-3 border-b border-white/10">{t("dashboard.recentScores")}</p>
            {stats.scoresChart.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[130px] gap-2">
                <BookOpen className="h-8 w-8 text-gray-600" />
                <p className="text-xs text-gray-500">{t("dashboard.completeToSee")}</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={130}>
                <BarChart data={stats.scoresChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="attempt" tick={{ fontSize: 9, fill: "#6b7280" }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 9, fill: "#6b7280" }} />
                  <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8 }} formatter={(val) => [`${val}%`, "Score"]} />
                  <Bar dataKey="score" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Recent activity feed */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 flex flex-col gap-3">
            <p className="text-sm font-semibold text-gray-200 pb-3 border-b border-white/10">{t("dashboard.recentActivity")}</p>
            {stats.recentActivity.length === 0 ? (
              <p className="text-xs text-gray-600 py-4 text-center">{t("dashboard.nothingYet")}</p>
            ) : (
              <div className="space-y-3">
                {stats.recentActivity.map((item) => (
                  <div key={item.id} className="flex items-start gap-2">
                    {statusIcon(item.status, item.passed)}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-gray-200 truncate font-medium">{item.scenarioName}</p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {statusLabel(item.status, item.passed)}
                        {item.score != null ? ` · ${item.score}%` : ""}
                        {item.date ? ` · ${formatDistanceToNow(parseISO(item.date), { addSuffix: true })}` : ""}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {stats.passRate != null && (
              <div className="mt-auto pt-3 border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-gray-400">{t("dashboard.overallPassRate")}</span>
                <span className={`text-sm font-bold ${stats.passRate >= 70 ? "text-green-400" : stats.passRate >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                  {stats.passRate}%
                </span>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── NEW USER: Quick Start + Tips ── */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Quick Start cards */}
          <div className="lg:col-span-2 rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Play className="h-4 w-4 text-red-400" />
              <p className="text-sm font-semibold text-gray-200">{t("dashboard.quickStart")}</p>
            </div>
            {quickStarts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-2">
                <Target className="h-8 w-8 text-gray-600" />
                <p className="text-sm text-gray-500">{t("dashboard.noFeatures")}</p>
              </div>
            ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {quickStarts.map((qs) => (
                <button
                  key={qs.labelKey}
                  onClick={() => navigate(qs.path)}
                  className={`group text-left rounded-lg border ${qs.bg} p-3 hover:brightness-125 transition-all`}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <qs.icon className={`h-4 w-4 ${qs.color}`} />
                    <span className={`text-xs font-semibold ${qs.color}`}>{t(qs.labelKey)}</span>
                  </div>
                  <p className="text-xs text-gray-400 leading-snug">{t(qs.descKey)}</p>
                  <div className={`flex items-center gap-1 mt-2 text-xs ${qs.color} opacity-70 group-hover:opacity-100 transition-opacity`}>
                    <span>Launch</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </button>
              ))}
            </div>
            )}
          </div>

          {/* Tips panel */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-5">
            <div className="flex items-center gap-2 mb-4">
              <Zap className="h-4 w-4 text-yellow-400" />
              <p className="text-sm font-semibold text-gray-200">{t("dashboard.platformTips")}</p>
            </div>
            <div className="space-y-3">
              {TIPS_KEYS.map((tip, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="h-6 w-6 rounded-md bg-yellow-400/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <tip.icon className="h-3.5 w-3.5 text-yellow-400" />
                  </div>
                  <p className="text-xs text-gray-400 leading-snug">{t(tip.textKey)}</p>
                </div>
              ))}
            </div>


          </div>
        </div>
      )}
    </div>
  );
}