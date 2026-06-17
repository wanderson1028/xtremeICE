import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, Clock, Lightbulb, RotateCcw, ChevronDown, ChevronRight, AlertCircle, Lock, Star, Wrench, Terminal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resolveUnlockedTasks } from "../branchingLogic";

const NICE_CATEGORY_COLORS = {
  "Securely Provision": "bg-blue-500/20 text-blue-300",
  "Operate and Maintain": "bg-green-500/20 text-green-300",
  "Oversee and Govern": "bg-purple-500/20 text-purple-300",
  "Protect and Defend": "bg-red-500/20 text-red-300",
  "Analyze": "bg-yellow-500/20 text-yellow-300",
  "Collect and Operate": "bg-orange-500/20 text-orange-300",
  "Investigate": "bg-pink-500/20 text-pink-300",
};

const DIFFICULTY_COLORS = {
  Beginner: "bg-emerald-500/20 text-emerald-300",
  Intermediate: "bg-yellow-500/20 text-yellow-300",
  Advanced: "bg-orange-500/20 text-orange-300",
  Expert: "bg-red-500/20 text-red-300",
};

const TASK_STATUS_ICON = {
  passed: <CheckCircle className="h-3.5 w-3.5 text-green-400" />,
  failed: <XCircle className="h-3.5 w-3.5 text-red-400" />,
  in_progress: <Clock className="h-3.5 w-3.5 text-blue-400" />,
  not_started: <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />,
  submitted: <CheckCircle className="h-3.5 w-3.5 text-purple-400" />,
  skipped: <RotateCcw className="h-3.5 w-3.5 text-orange-400" />,
};

const BRANCH_BADGE = {
  advanced: { label: "Advanced", icon: Star, color: "bg-yellow-500/20 text-yellow-300" },
  remediation: { label: "Remediation", icon: Wrench, color: "bg-orange-500/20 text-orange-300" },
};

export default function StudentScenarioCard({ scenario, attempt, taskProgress, allAttempts, tasks = [], onOpenTask }) {
  const [expanded, setExpanded] = useState(false);

  // Apply branching logic if scenario has branching enabled
  const resolvedTasks = scenario.branching_enabled && tasks.length > 0
    ? resolveUnlockedTasks(tasks, taskProgress)
    : null;

  const passingScore = scenario.passing_score || 70;
  const score = attempt?.score ?? null;
  const passed = attempt?.passed ?? false;
  const status = attempt?.status || "not_started";
  const tasksTotal = taskProgress.length;
  const tasksPassed = taskProgress.filter(tp => tp.status === "passed").length;
  const hintsUsed = taskProgress.reduce((s, tp) => s + (tp.hints_used || 0), 0);
  const timeSpent = attempt?.time_elapsed_minutes || 0;
  const progressPct = tasksTotal > 0 ? Math.round((tasksPassed / tasksTotal) * 100) : 0;

  const statusLabel = {
    not_started: { label: "Not Started", color: "bg-gray-500/20 text-gray-300" },
    in_progress: { label: "In Progress", color: "bg-blue-500/20 text-blue-300" },
    completed: { label: "Completed", color: passed ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300" },
    failed: { label: "Failed", color: "bg-red-500/20 text-red-300" },
    abandoned: { label: "Abandoned", color: "bg-yellow-500/20 text-yellow-300" },
  }[status] || { label: status, color: "bg-gray-500/20 text-gray-300" };

  return (
    <Card className="bg-card border-border flex flex-col">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-sm leading-tight">{scenario.title}</CardTitle>
          <Badge className={`text-xs shrink-0 ${statusLabel.color}`}>{statusLabel.label}</Badge>
        </div>
        <div className="flex flex-wrap gap-1 mt-1">
          <Badge className={`text-xs ${NICE_CATEGORY_COLORS[scenario.nice_category]}`}>{scenario.nice_category}</Badge>
          <Badge className={`text-xs ${DIFFICULTY_COLORS[scenario.difficulty]}`}>{scenario.difficulty}</Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 space-y-4">
        {/* Score indicator */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Score</span>
            <span className="font-medium">
              {score !== null ? (
                <span className={score >= passingScore ? "text-green-400" : "text-red-400"}>{score}%</span>
              ) : "—"}
              <span className="text-muted-foreground"> / pass {passingScore}%</span>
            </span>
          </div>
          <div className="relative h-2.5 rounded-full bg-secondary overflow-hidden">
            {score !== null && (
              <div
                className={`h-full rounded-full transition-all ${score >= passingScore ? "bg-green-500" : "bg-red-500"}`}
                style={{ width: `${Math.min(score, 100)}%` }}
              />
            )}
            {/* passing threshold marker */}
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-yellow-400/60"
              style={{ left: `${passingScore}%` }}
            />
          </div>
          {score !== null && (
            <p className={`text-xs font-medium ${score >= passingScore ? "text-green-400" : "text-red-400"}`}>
              {score >= passingScore ? "✓ Passed" : "✗ Not passed yet"}
            </p>
          )}
        </div>

        {/* Task progress */}
        {tasksTotal > 0 && (
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Tasks Completed</span>
              <span>{tasksPassed} / {tasksTotal}</span>
            </div>
            <Progress value={progressPct} className="h-2" />
          </div>
        )}

        {/* Metrics row */}
        <div className="flex gap-4 text-xs text-muted-foreground">
          {timeSpent > 0 && (
            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{timeSpent}m</span>
          )}
          {hintsUsed > 0 && (
            <span className="flex items-center gap-1"><Lightbulb className="h-3 w-3" />{hintsUsed} hints</span>
          )}
          {allAttempts.length > 1 && (
            <span className="flex items-center gap-1"><RotateCcw className="h-3 w-3" />{allAttempts.length} attempts</span>
          )}
        </div>

        {/* Expandable task breakdown */}
        {(taskProgress.length > 0 || (resolvedTasks && resolvedTasks.length > 0)) && (
          <div>
            <button
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => setExpanded(e => !e)}
            >
              {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
              Task breakdown {scenario.branching_enabled && <span className="text-primary">(branching)</span>}
            </button>
            {expanded && (
              <div className="mt-2 space-y-1.5">
                {resolvedTasks ? (
                  resolvedTasks.map((t, i) => {
                    const tp = taskProgress.find(p => p.task_id === t.id);
                    const branchInfo = BRANCH_BADGE[t.branch_type];
                    return (
                      <div
                        key={t.id || i}
                        className={`flex items-center gap-2 text-xs p-1.5 rounded-md transition-colors ${t.unlocked ? "bg-secondary hover:bg-secondary/80 cursor-pointer" : "bg-secondary/40 opacity-60"}`}
                        onClick={() => t.unlocked && onOpenTask && onOpenTask(t)}
                      >
                        {!t.unlocked
                          ? <Lock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          : (TASK_STATUS_ICON[tp?.status] || TASK_STATUS_ICON.not_started)
                        }
                        <span className="flex-1 text-foreground truncate">{t.title}</span>
                        {branchInfo && (
                          <Badge className={`text-[10px] px-1 py-0 shrink-0 ${branchInfo.color}`}>{branchInfo.label}</Badge>
                        )}
                        {t.unlocked && (
                          <Terminal className="h-3 w-3 text-primary shrink-0" />
                        )}
                        {t.unlocked && tp && (
                          <span className="text-muted-foreground shrink-0">{tp.points_earned || 0} pts</span>
                        )}
                        {!t.unlocked && (
                          <span className="text-muted-foreground text-[10px] shrink-0 max-w-[80px] truncate" title={t.branch_locked_reason}>Locked</span>
                        )}
                      </div>
                    );
                  })
                ) : (
                  tasks.length > 0 ? tasks.map((t, i) => {
                    const tp = taskProgress.find(p => p.task_id === t.id);
                    return (
                      <div
                        key={t.id || i}
                        className="flex items-center gap-2 text-xs p-1.5 bg-secondary hover:bg-secondary/80 rounded-md cursor-pointer transition-colors"
                        onClick={() => onOpenTask && onOpenTask(t)}
                      >
                        {TASK_STATUS_ICON[tp?.status] || TASK_STATUS_ICON.not_started}
                        <span className="flex-1 text-foreground truncate">{t.title}</span>
                        <Terminal className="h-3 w-3 text-primary shrink-0" />
                        {tp && <span className="text-muted-foreground shrink-0">{tp.points_earned || 0} pts</span>}
                      </div>
                    );
                  }) : taskProgress.map((tp, i) => (
                    <div key={tp.id || i} className="flex items-center gap-2 text-xs p-1.5 bg-secondary rounded-md">
                      {TASK_STATUS_ICON[tp.status] || TASK_STATUS_ICON.not_started}
                      <span className="flex-1 text-foreground truncate">{tp.task_id}</span>
                      <span className="text-muted-foreground shrink-0">{tp.points_earned || 0} pts</span>
                      {tp.hints_used > 0 && (
                        <span className="flex items-center gap-0.5 text-purple-400 shrink-0">
                          <Lightbulb className="h-3 w-3" />{tp.hints_used}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        )}

        {/* Instructor feedback */}
        {attempt?.feedback && (
          <div className="p-2.5 bg-primary/5 border border-primary/20 rounded-lg">
            <p className="text-xs font-medium text-primary mb-1">Instructor Feedback</p>
            <p className="text-xs text-muted-foreground">{attempt.feedback}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}