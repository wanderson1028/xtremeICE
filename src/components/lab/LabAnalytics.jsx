import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Users, BookOpen, CheckCircle, TrendingUp, Clock, Award } from "lucide-react";

const NICE_COLORS = {
  "Securely Provision": "#3b82f6",
  "Operate and Maintain": "#22c55e",
  "Oversee and Govern": "#a855f7",
  "Protect and Defend": "#ef4444",
  "Analyze": "#eab308",
  "Collect and Operate": "#f97316",
  "Investigate": "#ec4899",
};

export default function LabAnalytics() {
  const { data: attempts = [] } = useQuery({
    queryKey: ["lab_attempts"],
    queryFn: () => base44.entities.LabAttempt.list("-created_date"),
  });

  const { data: scenarios = [] } = useQuery({
    queryKey: ["lab_scenarios"],
    queryFn: () => base44.entities.LabScenario.list(),
  });

  const { data: taskProgress = [] } = useQuery({
    queryKey: ["task_progress_all"],
    queryFn: () => base44.entities.TaskProgress.list(),
  });

  const totalAttempts = attempts.length;
  const completedAttempts = attempts.filter(a => a.status === "completed").length;
  const passedAttempts = attempts.filter(a => a.passed).length;
  const uniqueUsers = new Set(attempts.map(a => a.user_email)).size;
  const avgScore = attempts.filter(a => a.score != null).length > 0
    ? Math.round(attempts.filter(a => a.score != null).reduce((s, a) => s + a.score, 0) / attempts.filter(a => a.score != null).length)
    : 0;
  const avgTime = attempts.filter(a => a.time_elapsed_minutes).length > 0
    ? Math.round(attempts.filter(a => a.time_elapsed_minutes).reduce((s, a) => s + a.time_elapsed_minutes, 0) / attempts.filter(a => a.time_elapsed_minutes).length)
    : 0;

  // Scenario performance
  const scenarioStats = scenarios.map(s => {
    const sa = attempts.filter(a => a.scenario_id === s.id);
    const passed = sa.filter(a => a.passed).length;
    return {
      name: s.title.length > 20 ? s.title.slice(0, 20) + "…" : s.title,
      attempts: sa.length,
      passRate: sa.length > 0 ? Math.round((passed / sa.length) * 100) : 0,
      category: s.nice_category,
    };
  }).filter(s => s.attempts > 0);

  // NICE category breakdown
  const categoryStats = Object.keys(NICE_COLORS).map(cat => {
    const catScenarios = scenarios.filter(s => s.nice_category === cat);
    const catAttempts = attempts.filter(a => catScenarios.some(s => s.id === a.scenario_id));
    return { name: cat.split(" ").slice(-1)[0], fullName: cat, count: catAttempts.length, color: NICE_COLORS[cat] };
  }).filter(c => c.count > 0);

  // Most failed tasks
  const failedTasks = taskProgress.filter(tp => tp.status === "failed");
  const taskFailCounts = failedTasks.reduce((acc, tp) => {
    acc[tp.task_id] = (acc[tp.task_id] || 0) + 1;
    return acc;
  }, {});
  const topFailedTasks = Object.entries(taskFailCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  const statCards = [
    { label: "Total Attempts", value: totalAttempts, icon: BookOpen, color: "text-primary" },
    { label: "Unique Users", value: uniqueUsers, icon: Users, color: "text-blue-400" },
    { label: "Completion Rate", value: totalAttempts > 0 ? `${Math.round((completedAttempts / totalAttempts) * 100)}%` : "—", icon: CheckCircle, color: "text-green-400" },
    { label: "Pass Rate", value: completedAttempts > 0 ? `${Math.round((passedAttempts / completedAttempts) * 100)}%` : "—", icon: Award, color: "text-yellow-400" },
    { label: "Avg Score", value: avgScore > 0 ? `${avgScore}%` : "—", icon: TrendingUp, color: "text-purple-400" },
    { label: "Avg Time", value: avgTime > 0 ? `${avgTime}m` : "—", icon: Clock, color: "text-orange-400" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map(({ label, value, icon: IconComp, color }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <IconComp className={`h-6 w-6 mx-auto mb-2 ${color}`} />
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {scenarioStats.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Pass Rate by Scenario</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={scenarioStats} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} unit="%" />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} formatter={(v) => [`${v}%`, "Pass Rate"]} />
                  <Bar dataKey="passRate" radius={4}>
                    {scenarioStats.map((s, i) => (
                      <Cell key={i} fill={NICE_COLORS[s.category] || "hsl(var(--primary))"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {categoryStats.length > 0 && (
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Attempts by NICE Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={categoryStats} margin={{ top: 4, right: 4, bottom: 4, left: -20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} labelFormatter={(_, p) => p[0]?.payload?.fullName} />
                  <Bar dataKey="count" radius={4}>
                    {categoryStats.map((c, i) => <Cell key={i} fill={c.color} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>

      {topFailedTasks.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Most Challenging Tasks (by failures)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {topFailedTasks.map(([taskId, count], i) => (
                <div key={taskId} className="flex items-center gap-3 p-2 bg-secondary rounded-lg">
                  <span className="text-sm font-bold text-muted-foreground w-4">#{i + 1}</span>
                  <span className="flex-1 text-sm text-foreground font-mono truncate">{taskId}</span>
                  <Badge className="bg-red-500/20 text-red-300">{count} failures</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {totalAttempts === 0 && (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <TrendingUp className="h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">No data yet</p>
            <p className="text-sm">Analytics will appear once users start attempting scenarios.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}