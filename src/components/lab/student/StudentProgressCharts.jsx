import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  RadialBarChart, RadialBar, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell,
  PieChart, Pie,
} from "recharts";

const NICE_COLORS = {
  "Securely Provision": "#3b82f6",
  "Operate and Maintain": "#22c55e",
  "Oversee and Govern": "#a855f7",
  "Protect and Defend": "#ef4444",
  "Analyze": "#eab308",
  "Collect and Operate": "#f97316",
  "Investigate": "#ec4899",
};

const TASK_STATUS_COLORS = {
  passed: "#22c55e",
  failed: "#ef4444",
  in_progress: "#3b82f6",
  not_started: "#6b7280",
  submitted: "#a855f7",
  skipped: "#f97316",
};

const tooltipStyle = {
  contentStyle: { background: "hsl(222 47% 9%)", border: "1px solid hsl(222 30% 18%)", borderRadius: 8, fontSize: 12 },
  labelStyle: { color: "hsl(210 40% 96%)" },
};

export default function StudentProgressCharts({ attempts, scenarios, taskProgress }) {
  // Scores per scenario (latest attempt)
  const latestByScenario = {};
  attempts.forEach(a => {
    if (!latestByScenario[a.scenario_id] || a.attempt_number > latestByScenario[a.scenario_id].attempt_number) {
      latestByScenario[a.scenario_id] = a;
    }
  });

  const scenarioScoreData = Object.values(latestByScenario)
    .filter(a => a.score != null)
    .map(a => {
      const sc = scenarios.find(s => s.id === a.scenario_id);
      return {
        name: sc ? (sc.title.length > 18 ? sc.title.slice(0, 18) + "…" : sc.title) : "Unknown",
        score: a.score,
        passing: sc?.passing_score || 70,
        category: sc?.nice_category,
      };
    });

  // Time spent per scenario
  const timeData = Object.values(latestByScenario)
    .filter(a => a.time_elapsed_minutes)
    .map(a => {
      const sc = scenarios.find(s => s.id === a.scenario_id);
      return {
        name: sc ? (sc.title.length > 18 ? sc.title.slice(0, 18) + "…" : sc.title) : "Unknown",
        time: a.time_elapsed_minutes,
        category: sc?.nice_category,
      };
    });

  // Task status breakdown (pie)
  const taskStatusCounts = taskProgress.reduce((acc, tp) => {
    acc[tp.status] = (acc[tp.status] || 0) + 1;
    return acc;
  }, {});
  const taskPieData = Object.entries(taskStatusCounts).map(([status, count]) => ({
    name: status.replace("_", " "),
    value: count,
    fill: TASK_STATUS_COLORS[status] || "#6b7280",
  }));

  // Hints used per scenario
  const hintsByScenario = {};
  taskProgress.forEach(tp => {
    hintsByScenario[tp.scenario_id] = (hintsByScenario[tp.scenario_id] || 0) + (tp.hints_used || 0);
  });
  const hintsData = Object.entries(hintsByScenario)
    .filter(([, h]) => h > 0)
    .map(([sid, hints]) => {
      const sc = scenarios.find(s => s.id === sid);
      return { name: sc ? (sc.title.length > 16 ? sc.title.slice(0, 16) + "…" : sc.title) : "Unknown", hints };
    });

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Scores per scenario */}
      {scenarioScoreData.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Score per Scenario</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={scenarioScoreData} margin={{ top: 4, right: 8, bottom: 4, left: -20 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} unit="%" domain={[0, 100]} />
                <Tooltip {...tooltipStyle} formatter={v => [`${v}%`, "Score"]} />
                <Bar dataKey="score" radius={4} maxBarSize={48}>
                  {scenarioScoreData.map((d, i) => (
                    <Cell key={i} fill={d.score >= d.passing ? "#22c55e" : "#ef4444"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-xs text-muted-foreground text-center mt-1">Green = passed · Red = below passing score</p>
          </CardContent>
        </Card>
      )}

      {/* Task status pie */}
      {taskPieData.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Task Completion Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={taskPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                  {taskPieData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
                </Pie>
                <Tooltip {...tooltipStyle} />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Time spent */}
      {timeData.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Time Spent per Scenario (minutes)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={timeData} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} unit="m" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={90} />
                <Tooltip {...tooltipStyle} formatter={v => [`${v} min`, "Time"]} />
                <Bar dataKey="time" radius={4} maxBarSize={20}>
                  {timeData.map((d, i) => <Cell key={i} fill={NICE_COLORS[d.category] || "hsl(var(--primary))"} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Hints used */}
      {hintsData.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Hints Used per Scenario</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hintsData} layout="vertical" margin={{ top: 4, right: 8, bottom: 4, left: 4 }}>
                <XAxis type="number" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} width={90} />
                <Tooltip {...tooltipStyle} formatter={v => [v, "Hints"]} />
                <Bar dataKey="hints" radius={4} fill="#a855f7" maxBarSize={20} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
}