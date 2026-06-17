import React from "react";
import { motion } from "framer-motion";
import {
  Trophy, CheckCircle, XCircle, Clock, Shield, BarChart2,
  ChevronRight, RotateCcw, FileText, AlertTriangle, Target
} from "lucide-react";
import { TASK_DEFINITIONS, PHASE_COLORS } from "./assessmentTasks";

const phaseColors = PHASE_COLORS;

function getGrade(score) {
  if (score >= 90) return { label: "A", color: "text-green-400", desc: "Outstanding" };
  if (score >= 80) return { label: "B", color: "text-primary", desc: "Proficient" };
  if (score >= 70) return { label: "C", color: "text-yellow-400", desc: "Satisfactory" };
  if (score >= 60) return { label: "D", color: "text-orange-400", desc: "Needs Improvement" };
  return { label: "F", color: "text-red-400", desc: "Unsatisfactory" };
}

export default function AssessmentSummary({ scenario, score, actionsLog, tabsVisited, reportGenerated, elapsedMinutes, onRestart, onExit }) {
  const actionIds = new Set(actionsLog.map(a => a.id));
  const tasks = TASK_DEFINITIONS.map(t => ({
    ...t,
    completed: t.check({ actionIds, tabsVisited, reportGenerated }),
  }));

  const completedTasks = tasks.filter(t => t.completed);
  const missedTasks = tasks.filter(t => !t.completed);
  const taskPoints = completedTasks.reduce((s, t) => s + t.points, 0);
  const maxTaskPoints = tasks.reduce((s, t) => s + t.points, 0);
  const grade = getGrade(score);
  const passed = score >= 70;

  const metrics = [
    { label: "Final Score", value: `${score}/100`, icon: Trophy, color: "text-yellow-400" },
    { label: "Tasks Completed", value: `${completedTasks.length}/${tasks.length}`, icon: Target, color: "text-primary" },
    { label: "Task Points", value: `${taskPoints}/${maxTaskPoints}`, icon: CheckCircle, color: "text-green-400" },
    { label: "Actions Taken", value: actionsLog.length, icon: Shield, color: "text-orange-400" },
    { label: "Time Elapsed", value: `${elapsedMinutes}m`, icon: Clock, color: "text-muted-foreground" },
    { label: "Scenario", value: scenario?.difficulty, icon: BarChart2, color: "text-primary" },
  ];

  return (
    <div className="min-h-screen bg-background flex items-start justify-center p-6">
      <div className="w-full max-w-3xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full border-4 mb-4"
            style={{ borderColor: passed ? "rgb(34 197 94 / 0.5)" : "rgb(239 68 68 / 0.5)", background: passed ? "rgb(34 197 94 / 0.1)" : "rgb(239 68 68 / 0.1)" }}
          >
            {passed
              ? <Trophy className="h-9 w-9 text-yellow-400" />
              : <AlertTriangle className="h-9 w-9 text-red-400" />
            }
          </div>
          <h1 className="text-3xl font-bold mb-1">Assessment Complete</h1>
          <p className="text-muted-foreground text-sm">{scenario?.name} · {scenario?.category}</p>
          <div className="flex items-center justify-center gap-3 mt-3">
            <span className={`text-5xl font-black font-mono ${grade.color}`}>{grade.label}</span>
            <div className="text-left">
              <div className={`text-lg font-semibold ${grade.color}`}>{grade.desc}</div>
              <div className="text-xs text-muted-foreground">{passed ? "Minimum passing score met (70+)" : "Did not meet passing score (70)"}</div>
            </div>
          </div>
        </motion.div>

        {/* Metrics grid */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6"
        >
          {metrics.map((m, i) => {
            const Icon = m.icon;
            return (
              <div key={i} className="bg-card border border-border/40 rounded-xl p-4 flex items-center gap-3">
                <Icon className={`h-5 w-5 shrink-0 ${m.color}`} />
                <div>
                  <div className="text-xs text-muted-foreground">{m.label}</div>
                  <div className="text-sm font-bold font-mono">{m.value}</div>
                </div>
              </div>
            );
          })}
        </motion.div>

        {/* Score bar */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.15 }}
          className="bg-card border border-border/40 rounded-xl p-4 mb-6"
        >
          <div className="flex justify-between text-xs text-muted-foreground mb-2">
            <span>Overall Score</span>
            <span className="font-mono font-semibold text-foreground">{score} / 100</span>
          </div>
          <div className="h-3 bg-secondary rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${score}%` }}
              transition={{ delay: 0.3, duration: 0.8, ease: "easeOut" }}
              className={`h-full rounded-full ${score >= 80 ? "bg-green-500" : score >= 70 ? "bg-primary" : score >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
            />
          </div>
          <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
            <span>0</span>
            <span className="text-yellow-500">70 — Pass</span>
            <span>100</span>
          </div>
        </motion.div>

        {/* Task breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-card border border-border/40 rounded-xl p-5 mb-6"
        >
          <h2 className="text-sm font-semibold mb-4 flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Task Breakdown
          </h2>
          <div className="space-y-2.5">
            {tasks.map((task, idx) => {
              const pc = phaseColors[task.phase];
              return (
                <motion.div
                  key={task.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.25 + idx * 0.05 }}
                  className={`flex items-center gap-3 rounded-lg border p-3 ${task.completed ? "border-green-500/30 bg-green-500/5" : "border-border/30 bg-secondary/10 opacity-70"}`}
                >
                  {task.completed
                    ? <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />
                    : <XCircle className="h-4 w-4 text-red-400/60 shrink-0" />
                  }
                  <div className="flex-1 min-w-0">
                    <div className={`text-xs font-semibold ${task.completed ? "text-foreground" : "text-muted-foreground"}`}>{task.label}</div>
                    <span className={`text-[10px] font-mono ${pc.text}`}>{task.phase}</span>
                  </div>
                  <span className={`text-xs font-bold font-mono ${task.completed ? "text-green-400" : "text-red-400/60"}`}>
                    {task.completed ? `+${task.points}` : `−${task.points}`} pts
                  </span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Missed tasks callout */}
        {missedTasks.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 mb-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <span className="text-sm font-semibold text-red-400">Missed Tasks ({missedTasks.length})</span>
            </div>
            <ul className="space-y-1">
              {missedTasks.map(t => (
                <li key={t.id} className="text-xs text-muted-foreground flex items-start gap-2">
                  <ChevronRight className="h-3 w-3 mt-0.5 shrink-0 text-red-400/50" />
                  {t.label}
                </li>
              ))}
            </ul>
          </motion.div>
        )}

        {/* Actions */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="flex gap-3"
        >
          <button
            onClick={onRestart}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-border/40 bg-secondary/30 hover:bg-secondary/60 text-sm font-medium transition-all"
          >
            <RotateCcw className="h-4 w-4" /> Try Again
          </button>
          <button
            onClick={onExit}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium transition-all"
          >
            Exit to Menu <ChevronRight className="h-4 w-4" />
          </button>
        </motion.div>
      </div>
    </div>
  );
}