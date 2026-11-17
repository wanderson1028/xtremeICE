import { format, subDays, parseISO } from "date-fns";
export function dashboardStats({ attempts=[], labScores=[], socSessions=[], scenarios=[], activityLogs=[] }) {
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

    // Include SOC session dates in activity tracking
    const socSessionDates = socSessions.map(s => s.completed_at || s.started_at || s.created_date);

    // Activity chart — last 14 days (all lab + SOC activity)
    const actByDay = {};
    for (let i = 13; i >= 0; i--) {
      actByDay[format(subDays(new Date(), i), "MMM d")] = 0;
    }
    [...allActivityDates, ...socSessionDates].filter(Boolean).forEach(d => {
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

    // Recent activity feed — merge attempts + lab scores + SOC sessions
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
          type: "lab",
        };
      }),
      ...labScores.slice(0, 5).map(s => ({
        id: s.id,
        scenarioName: s.lab_title || "Linux Lab",
        status: "completed",
        score: s.points_possible > 0 ? Math.round((s.points_earned / s.points_possible) * 100) : null,
        passed: true,
        date: s.completed_at || s.created_date,
        type: "lab",
      })),
      ...socSessions.slice(0, 5).map(s => ({
        id: s.id,
        scenarioName: s.scenario_name || "SOC Drill",
        status: "completed",
        score: s.score != null ? s.score : null,
        passed: (s.score_breakdown?.outcome === "complete") || (s.score || 0) >= 50,
        date: s.completed_at || s.started_at || s.created_date,
        type: "soc",
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
}
