import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Clock, Lightbulb, Award, BookOpen, Target } from "lucide-react";

export default function StudentOverviewStats({ attempts, scenarios, taskProgress }) {
  const completed = attempts.filter(a => a.status === "completed").length;
  const passed = attempts.filter(a => a.passed).length;
  const inProgress = attempts.filter(a => a.status === "in_progress").length;
  const totalTime = attempts.reduce((s, a) => s + (a.time_elapsed_minutes || 0), 0);
  const totalHints = taskProgress.reduce((s, tp) => s + (tp.hints_used || 0), 0);
  const avgScore = attempts.filter(a => a.score != null).length > 0
    ? Math.round(attempts.filter(a => a.score != null).reduce((s, a) => s + a.score, 0) / attempts.filter(a => a.score != null).length)
    : null;

  const stats = [
    { label: "Scenarios Assigned", value: scenarios.length, icon: BookOpen, color: "text-primary", bg: "bg-primary/10" },
    { label: "Completed", value: completed, icon: CheckCircle, color: "text-green-400", bg: "bg-green-400/10" },
    { label: "Passed", value: passed, icon: Award, color: "text-yellow-400", bg: "bg-yellow-400/10" },
    { label: "In Progress", value: inProgress, icon: Target, color: "text-blue-400", bg: "bg-blue-400/10" },
    { label: "Total Time", value: totalTime > 0 ? `${totalTime}m` : "—", icon: Clock, color: "text-orange-400", bg: "bg-orange-400/10" },
    { label: "Hints Used", value: totalHints, icon: Lightbulb, color: "text-purple-400", bg: "bg-purple-400/10" },
  ];

  return (
    <div className="space-y-4">
      {/* Overall score banner */}
      {avgScore !== null && (
        <div className={`rounded-xl p-5 flex items-center gap-5 border ${avgScore >= 70 ? "bg-green-500/10 border-green-500/30" : "bg-red-500/10 border-red-500/30"}`}>
          <div className={`flex items-center justify-center w-20 h-20 rounded-full text-3xl font-bold border-4 ${avgScore >= 70 ? "border-green-500 text-green-400" : "border-red-500 text-red-400"}`}>
            {avgScore}%
          </div>
          <div>
            <p className="text-lg font-bold text-foreground">Overall Average Score</p>
            <p className={`text-sm font-medium ${avgScore >= 70 ? "text-green-400" : "text-red-400"}`}>
              {avgScore >= 70 ? "Above passing threshold — great work!" : "Below passing threshold — keep practicing!"}
            </p>
            <p className="text-xs text-muted-foreground mt-1">Passing score: 70% · Based on {attempts.filter(a => a.score != null).length} scored attempt(s)</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {stats.map(({ label, value, icon: IconComp, color, bg }) => (
          <Card key={label} className="bg-card border-border">
            <CardContent className="p-4 text-center">
              <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center mx-auto mb-2`}>
                <IconComp className={`h-5 w-5 ${color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground leading-tight">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}