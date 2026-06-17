import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, BookOpen, Award, Tag, CheckCircle2, Circle, ChevronDown, ChevronUp, Lightbulb, Terminal, Loader2, Users, Target, Send, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import TerminalSimulator from "@/components/lab/TerminalSimulator";
import { useTranslation } from "react-i18next";

const taskTypeColor = {
  Configuration: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  Verification: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  Troubleshooting: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  Analysis: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
  Documentation: "bg-green-500/20 text-green-400 border-green-500/30",
  "Security Assessment": "bg-red-500/20 text-red-400 border-red-500/30",
};

// Tasks that require typed answers rather than terminal commands
const TEXT_TASK_TYPES = ["Documentation", "Analysis"];

function TaskCard({ task, index, onCommandRun, completedTaskIds, onTaskComplete, t }) {
  const [open, setOpen] = useState(false);
  const [hintsVisible, setHintsVisible] = useState(false);
  const [textAnswer, setTextAnswer] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const isCompleted = completedTaskIds.has(task.id);
  const isTextTask = TEXT_TASK_TYPES.includes(task.task_type);

  // Check if all expected commands have been run (for terminal tasks)
  const hasExpectedCommands = task.expected_commands?.length > 0;

  const handleTextSubmit = () => {
    if (!textAnswer.trim()) return;
    setSubmitted(true);
    onTaskComplete(task.id);
  };

  return (
    <div className={`bg-card border rounded-xl overflow-hidden transition-colors ${isCompleted ? "border-green-500/40" : "border-border"}`}>
      <button
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-secondary/40 transition-colors text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold transition-colors ${
          isCompleted
            ? "bg-green-500/20 border border-green-500/40 text-green-400"
            : "bg-primary/10 border border-primary/20 text-primary"
        }`}>
          {isCompleted ? <CheckCircle2 className="h-4 w-4" /> : index}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-foreground text-sm truncate">{task.title}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${taskTypeColor[task.task_type] || "bg-secondary text-muted-foreground border-border"}`}>
              {task.task_type}
            </span>
            <span className="text-[10px] text-muted-foreground flex items-center gap-1">
              <Award className="h-3 w-3" /> {task.points} pts
            </span>
            {isCompleted && <span className="text-[10px] text-green-400 font-semibold">{t("courseDashboard.complete")}</span>}
          </div>
        </div>
        {open ? <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-border pt-4 space-y-4">
          {/* Instructions */}
          <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {task.description}
          </div>

          {/* Expected Commands */}
          {hasExpectedCommands && (
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Terminal className="h-3.5 w-3.5 text-primary" /> {t("courseDashboard.commandToRun")}
              </p>
              <div className="space-y-1.5">
                {task.expected_commands.map((cmd, i) => (
                  <code key={i} className="block bg-secondary border border-border rounded-lg px-4 py-2 text-xs font-mono text-green-400">
                    {cmd}
                  </code>
                ))}
              </div>
              {!isCompleted && (
                <p className="text-[10px] text-muted-foreground mt-2">
                  {t("courseDashboard.commandHint")}
                </p>
              )}
            </div>
          )}

          {/* Text submission for Documentation/Analysis tasks */}
          {isTextTask && !isCompleted && !submitted && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5 text-primary" /> {t("courseDashboard.yourAnswer")}
              </p>
              <textarea
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                placeholder={t("courseDashboard.answerPlaceholder")}
                rows={4}
                className="w-full bg-secondary border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
              />
              <Button
                size="sm"
                onClick={handleTextSubmit}
                disabled={!textAnswer.trim()}
                className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Send className="h-3.5 w-3.5" /> {t("courseDashboard.submitAnswer")}
              </Button>
            </div>
          )}

          {/* Submitted text answer display */}
          {isTextTask && (submitted || isCompleted) && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg px-4 py-3">
              <p className="text-xs text-green-400 font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" /> {t("courseDashboard.answerSubmitted")}
              </p>
            </div>
          )}

          {/* Validation Criteria */}
          {task.validation_criteria?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-primary" /> {t("courseDashboard.gradingCriteria")}
              </p>
              <div className="space-y-2">
                {task.validation_criteria.map((c, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs">
                    {isCompleted
                      ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0 mt-0.5" />
                      : <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                    }
                    <div className="flex-1">
                      <span className="text-foreground">{c.description}</span>
                      <span className="ml-2 text-primary font-medium">({c.points} pts)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Hints */}
          {task.hints?.length > 0 && (
            <div>
              <button
                onClick={() => setHintsVisible((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-yellow-400 hover:text-yellow-300 transition-colors font-medium"
              >
                <Lightbulb className="h-3.5 w-3.5" />
                {hintsVisible ? t("courseDashboard.hideHints") : t("courseDashboard.showHints", { count: task.hints.length })}
              </button>
              {hintsVisible && (
                <div className="mt-2 space-y-1.5">
                  {task.hints.map((h, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs bg-yellow-500/10 border border-yellow-500/20 rounded-lg px-3 py-2">
                      <Lightbulb className="h-3.5 w-3.5 text-yellow-400 shrink-0 mt-0.5" />
                      <span className="text-yellow-200/80">{h}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function CourseDashboard() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");

  // Track which tasks are completed (in-memory for this session)
  const [completedTaskIds, setCompletedTaskIds] = useState(new Set());

  const { data: scenario, isLoading: loadingScenario } = useQuery({
    queryKey: ["scenario", id],
    queryFn: () => base44.entities.LabScenario.filter({ id }),
    select: (d) => d[0],
    enabled: !!id,
  });

  const { data: tasks = [], isLoading: loadingTasks } = useQuery({
    queryKey: ["tasks", id],
    queryFn: () => base44.entities.LabTask.filter({ scenario_id: id }),
    select: (d) => [...d].sort((a, b) => a.order - b.order),
    enabled: !!id,
  });

  const totalPoints = tasks.reduce((sum, t) => sum + (t.points || 0), 0);
  const earnedPoints = tasks
    .filter((t) => completedTaskIds.has(t.id))
    .reduce((sum, t) => sum + (t.points || 0), 0);

  // Build a map of command → task id for quick lookup
  const commandToTaskId = {};
  tasks.forEach((task) => {
    (task.expected_commands || []).forEach((cmd) => {
      commandToTaskId[cmd.trim().toLowerCase()] = task.id;
    });
  });

  const handleCommandRun = (cmd) => {
    const normalized = cmd.trim().toLowerCase();
    // Check exact match or if command starts with any expected command
    const matchedTaskId = Object.entries(commandToTaskId).find(
      ([expected]) => normalized === expected || normalized.startsWith(expected.split(" ")[0] + " ")
    )?.[1];
    // More precise: check if normalized contains the core command
    const matchedTaskIdPrecise = Object.entries(commandToTaskId).find(
      ([expected]) => normalized === expected
    )?.[1];

    const finalMatch = matchedTaskIdPrecise || Object.entries(commandToTaskId).find(
      ([expected]) => {
        // e.g. "nmap 192.168.1.10" matches "nmap 192.168.1.10"
        return normalized.replace(/\s+/g, " ") === expected.replace(/\s+/g, " ");
      }
    )?.[1];

    if (finalMatch) {
      setCompletedTaskIds((prev) => new Set([...prev, finalMatch]));
    }
  };

  const handleTaskComplete = (taskId) => {
    setCompletedTaskIds((prev) => new Set([...prev, taskId]));
  };

  // All expected commands across all tasks for "quick run" buttons
  const allExpectedCommands = [
    ...new Set(tasks.flatMap((t) => t.expected_commands || []).slice(0, 8)),
  ];

  if (loadingScenario || loadingTasks) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!scenario) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        {t("courseDashboard.notFound")}
      </div>
    );
  }

  return (
    <div className="min-h-screen py-10 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Back */}
        <Button variant="ghost" size="sm" className="mb-6 gap-2 text-muted-foreground" onClick={() => navigate("/Labs")}>
          <ArrowLeft className="h-4 w-4" /> {t("courseDashboard.allCourses")}
        </Button>

        {/* Header */}
        <div className="bg-card border border-border rounded-xl p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary">
                  {scenario.difficulty}
                </span>
                {scenario.nice_category && (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-secondary border border-border text-muted-foreground">
                    {scenario.nice_category}
                  </span>
                )}
              </div>
              <h1 className="text-xl font-bold text-foreground">{scenario.title}</h1>
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">{scenario.description}</p>
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mt-6 pt-6 border-t border-border">
            <div className="text-center">
              <p className="text-xl font-bold text-primary">{tasks.length}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("courseDashboard.tasks")}</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-primary">{completedTaskIds.size}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("courseDashboard.completed")}</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-primary">{scenario.estimated_duration_minutes || "—"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("courseDashboard.minutes")}</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-primary">{earnedPoints} / {totalPoints}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("courseDashboard.points")}</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-primary">{scenario.passing_score || 70}%</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t("courseDashboard.toPass")}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          {/* Tasks */}
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider mb-3">
              {t("courseDashboard.labTasks", { count: tasks.length })}
            </h2>
            {tasks.map((task, i) => (
              <TaskCard
                key={task.id}
                task={task}
                index={i + 1}
                completedTaskIds={completedTaskIds}
                onTaskComplete={handleTaskComplete}
                t={t}
              />
            ))}
          </div>

          {/* Sticky Terminal */}
          <div className="sticky top-20 space-y-2">
            <h2 className="text-sm font-semibold text-foreground uppercase tracking-wider flex items-center gap-2">
              <Terminal className="h-4 w-4 text-primary" /> {t("courseDashboard.practiceTerminal")}
            </h2>
            <TerminalSimulator
              suggestedCommands={allExpectedCommands}
              onCommandRun={handleCommandRun}
            />
            <p className="text-[10px] text-muted-foreground">
              {t("courseDashboard.terminalHint")}
            </p>

            {/* Sidebar info */}
            <div className="space-y-4 mt-4">
              {scenario.objectives?.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" /> {t("courseDashboard.learningObjectives")}
                  </h3>
                  <ul className="space-y-2">
                    {scenario.objectives.map((obj, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                        {obj}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {scenario.prerequisites?.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" /> {t("courseDashboard.prerequisites")}
                  </h3>
                  <ul className="space-y-2">
                    {scenario.prerequisites.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {scenario.tags?.length > 0 && (
                <div className="bg-card border border-border rounded-xl p-5">
                  <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                    <Tag className="h-4 w-4 text-primary" /> {t("courseDashboard.topics")}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {scenario.tags.map((tag) => (
                      <span key={tag} className="text-[10px] px-2 py-1 rounded-full bg-secondary border border-border text-muted-foreground">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}