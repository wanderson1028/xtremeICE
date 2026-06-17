import React, { useMemo, useState } from "react";
import { CheckCircle, Circle, ClipboardList, Trophy, AlertCircle, Eye } from "lucide-react";
import { motion } from "framer-motion";
import { TASK_DEFINITIONS, PHASE_COLORS } from "./assessmentTasks";

export default function AssessmentTaskList({ actionsLog, tabsVisited, score, reportGenerated, mode, onHintUsed }) {
  const actionIds = useMemo(() => new Set(actionsLog.map(a => a.id)), [actionsLog]);
  const [revealedHints, setRevealedHints] = useState(new Set());

  const tasks = useMemo(() =>
    TASK_DEFINITIONS.map(t => ({
      ...t,
      completed: t.check({ actionIds, tabsVisited, reportGenerated }),
    })),
    [actionIds, tabsVisited, reportGenerated]
  );

  const completedCount = tasks.filter(t => t.completed).length;
  const totalPts = tasks.filter(t => t.completed).reduce((s, t) => s + t.points, 0);
  const maxPts = tasks.reduce((s, t) => s + t.points, 0);
  const allDone = completedCount === tasks.length;

  const isAssessment = mode === "assessment";

  const handleRevealHint = (task) => {
    if (revealedHints.has(task.id)) return;
    setRevealedHints(prev => new Set([...prev, task.id]));
    // Deduct 25% of the task's points
    const penalty = Math.round(task.points * 0.25);
    if (onHintUsed) onHintUsed(penalty);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/20 bg-orange-500/5 flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-orange-400" />
        <span className="text-xs font-semibold">Assessment Tasks</span>
        <span className="ml-auto text-[10px] font-mono text-muted-foreground">{completedCount}/{tasks.length}</span>
      </div>

      {/* Score banner */}
      <div className="mx-3 mt-3 rounded-xl bg-secondary/30 border border-border/20 p-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] text-muted-foreground uppercase font-mono">Score Progress</span>
          <span className="text-xs font-bold text-primary font-mono">{score} / 100 pts</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${score >= 80 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-orange-500"}`}
            style={{ width: `${Math.min(score, 100)}%` }}
          />
        </div>
        <div className="text-[10px] text-muted-foreground mt-1.5">
          Task completion: {totalPts}/{maxPts} bonus pts
        </div>
      </div>

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 mt-1">
        {tasks.map((task, idx) => {
          const hintRevealed = revealedHints.has(task.id);
          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={`rounded-xl border p-3 transition-all ${
                task.completed
                  ? "border-green-500/30 bg-green-500/5"
                  : "border-border/30 bg-secondary/10"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 shrink-0">
                  {task.completed
                    ? <CheckCircle className="h-4 w-4 text-green-400" />
                    : <Circle className="h-4 w-4 text-muted-foreground/40" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-xs font-semibold ${task.completed ? "text-green-400" : "text-foreground"}`}>
                    {task.label}
                  </div>

                  {/* Description: always shown in training, hidden behind hint in assessment */}
                  {isAssessment ? (
                    hintRevealed ? (
                      <div className="text-[10px] text-yellow-400/80 mt-0.5 leading-relaxed border border-yellow-500/20 bg-yellow-500/5 rounded-lg px-2 py-1.5">
                        💡 {task.description}
                        <span className="text-[9px] text-muted-foreground ml-1">(-{Math.round(task.points * 0.25)}pts)</span>
                      </div>
                    ) : (
                      !task.completed && (
                        <button
                          onClick={() => handleRevealHint(task)}
                          className="mt-1 flex items-center gap-1 text-[10px] text-orange-400/70 hover:text-orange-300 border border-orange-500/20 hover:border-orange-400/40 rounded-md px-2 py-1 transition-all"
                        >
                          <Eye className="h-3 w-3" />
                          Reveal Hint <span className="text-muted-foreground">(-{Math.round(task.points * 0.25)}pts)</span>
                        </button>
                      )
                    )
                  ) : (
                    <div className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{task.description}</div>
                  )}

                  <div className="flex items-center gap-2 mt-1.5">
                    <span className={`text-[10px] font-mono ${PHASE_COLORS[task.phase]?.text}`}>{task.phase}</span>
                    <span className="text-[10px] text-muted-foreground">·</span>
                    <span className={`text-[10px] font-bold font-mono ${task.completed ? "text-green-400" : "text-muted-foreground"}`}>
                      {task.completed ? `+${task.points}` : `${task.points} pts`}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Completion banner */}
      {allDone && (
        <div className="m-3 p-3 rounded-xl bg-green-500/10 border border-green-500/30 flex items-center gap-3">
          <Trophy className="h-5 w-5 text-yellow-400 shrink-0" />
          <div>
            <div className="text-xs font-semibold text-green-400">All Tasks Complete!</div>
            <div className="text-[10px] text-muted-foreground">Generate your report to finalize the assessment.</div>
          </div>
        </div>
      )}

      {/* Info note */}
      {!allDone && (
        <div className="mx-3 mb-3 flex items-start gap-2 text-[10px] text-muted-foreground bg-secondary/20 rounded-lg p-2.5">
          <AlertCircle className="h-3 w-3 shrink-0 mt-0.5 text-orange-400" />
          <span>{isAssessment ? "Hints available but cost 25% of each task's points." : "Complete tasks independently. The AI assistant provides limited hints in assessment mode."}</span>
        </div>
      )}
    </div>
  );
}