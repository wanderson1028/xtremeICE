import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Eye,
  Pencil,
  ListChecks,
  Copy,
  Settings2,
  CheckCircle2,
  AlertTriangle,
  Info,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import {
  createBlankTask,
  TASK_TYPES,
  duplicateTaskInList,
  DEFAULT_CRITERION_POINTS,
  BRANCH_TYPES,
  UNLOCK_TRIGGERS,
  getInvalidPrerequisiteIds,
  validateLabContent,
  resetBranchTasksForDeletedTask,
  buildBranchSummary,
} from "@/lib/taskModel";

const MD_COMPONENTS = {
  h1: (props) => <h1 className="text-base font-bold text-foreground mb-2" {...props} />,
  h2: (props) => <h2 className="text-sm font-semibold text-foreground mb-1.5" {...props} />,
  h3: (props) => <h3 className="text-sm font-semibold text-muted-foreground mb-1" {...props} />,
  p: (props) => <p className="mb-2 text-muted-foreground" {...props} />,
  ul: (props) => <ul className="list-disc list-inside mb-2 space-y-0.5 text-muted-foreground" {...props} />,
  ol: (props) => <ol className="list-decimal list-inside mb-2 space-y-0.5 text-muted-foreground" {...props} />,
  code: (props) => <code className="bg-secondary px-1 py-0.5 rounded text-xs text-green-600" {...props} />,
  strong: (props) => <strong className="text-foreground font-semibold" {...props} />,
};

/** Compact readiness dot for the collapsed task header. */
function ReadinessDot({ filled, label }) {
  return (
    <span
      title={label}
      className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${
        filled ? "bg-green-500" : "bg-muted-foreground/25"
      }`}
    />
  );
}

const BRANCH_LABELS = {
  standard: "Linear (standard)",
  advanced: "Advanced (stretch)",
  remediation: "Remediation (fallback)",
};

const TRIGGER_LABELS = {
  passed: "When prerequisite is passed",
  failed: "When prerequisite is failed",
  score_above: "When score is high enough",
  score_below: "When score is low",
};

export default function LabContentEditor({ form, updateForm }) {
  const labContent = form.lab_content || { scenario: "", tasks: [], success_criteria: "" };
  const [previewField, setPreviewField] = useState(null);
  const [expandedTask, setExpandedTask] = useState(null);
  // Fixed: track Advanced expansion per task index (was a single shared boolean).
  const [advancedOpen, setAdvancedOpen] = useState({});
  const { toast } = useToast();

  const updateLabContent = (updates) => {
    updateForm({ lab_content: { ...labContent, ...updates } });
  };

  const addTask = () => {
    const newTask = createBlankTask((labContent.tasks || []).length);
    const tasks = [...(labContent.tasks || []), newTask];
    updateLabContent({ tasks });
    setExpandedTask(tasks.length - 1);
    setAdvancedOpen((prev) => ({ ...prev, [tasks.length - 1]: false }));
  };

  const updateTask = (idx, updates) => {
    const tasks = labContent.tasks.map((t, i) => (i === idx ? { ...t, ...updates } : t));
    updateLabContent({ tasks });
  };

  const removeTask = (idx) => {
    const task = labContent.tasks[idx];
    const deletedId = task?.id;
    const remaining = labContent.tasks.filter((_, i) => i !== idx).map((t, i) => ({ ...t, order: i + 1 }));

    // Auto-downgrade branch tasks that depended on the deleted prerequisite (Modification 1).
    let resetCount = 0;
    if (deletedId) {
      const { tasks: reset, resetCount: rc } = resetBranchTasksForDeletedTask(remaining, deletedId);
      remaining.splice(0, remaining.length, ...reset);
      resetCount = rc;
    }
    updateLabContent({ tasks: remaining });
    setExpandedTask(null);
    if (resetCount > 0) {
      toast({
        title: "Prerequisite deleted",
        description: `${resetCount} branch task${resetCount > 1 ? "s were" : " was"} depending on it and ${resetCount > 1 ? "have" : "has"} been reset to linear.`,
      });
    }
  };

  const moveTask = (idx, dir) => {
    const newIdx = idx + dir;
    if (newIdx < 0 || newIdx >= (labContent.tasks || []).length) return;
    const tasks = [...labContent.tasks];
    [tasks[idx], tasks[newIdx]] = [tasks[newIdx], tasks[idx]];
    updateLabContent({ tasks: tasks.map((t, i) => ({ ...t, order: i + 1 })) });
    setExpandedTask(newIdx);
  };

  const duplicateTask = (idx) => {
    const tasks = duplicateTaskInList(labContent.tasks || [], idx);
    updateLabContent({ tasks });
    setExpandedTask(idx + 1);
    setAdvancedOpen((prev) => ({ ...prev, [idx + 1]: false }));
  };

  const addCriteria = (taskIdx) => {
    const task = labContent.tasks[taskIdx];
    const criteria = [
      ...(task.validation_criteria || []),
      { check: "", description: "", points: DEFAULT_CRITERION_POINTS },
    ];
    updateTask(taskIdx, { validation_criteria: criteria });
  };

  const updateCriteria = (taskIdx, ci, updates) => {
    const task = labContent.tasks[taskIdx];
    const criteria = (task.validation_criteria || []).map((c, i) =>
      i === ci ? { ...c, ...updates } : c
    );
    updateTask(taskIdx, { validation_criteria: criteria });
  };

  const removeCriteria = (taskIdx, ci) => {
    const task = labContent.tasks[taskIdx];
    const criteria = (task.validation_criteria || []).filter((_, i) => i !== ci);
    updateTask(taskIdx, { validation_criteria: criteria });
  };

  const tasks = labContent.tasks || [];

  // Live validation for adaptive-flow warnings/errors.
  const validation = validateLabContent(labContent);

  const toggleAdvanced = (idx) => {
    setAdvancedOpen((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-amber-700/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-200">
        Runtime checks here define what to verify. Kasm execution is not connected in Extreme ICE yet; authoring a check does not run it.
      </div>
      {/* Lab Scenario */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <Label className="text-muted-foreground text-sm">Lab Scenario</Label>
          <button
            onClick={() => setPreviewField(previewField === "scenario" ? null : "scenario")}
            className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors ${
              previewField === "scenario" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {previewField === "scenario" ? <><Pencil className="h-3 w-3" /> Edit</> : <><Eye className="h-3 w-3" /> Preview</>}
          </button>
        </div>
        {previewField === "scenario" ? (
          <div className="bg-secondary border border-border rounded-lg p-3 min-h-[80px] text-sm">
            <ReactMarkdown components={MD_COMPONENTS}>
              {labContent.scenario || "*No scenario written yet*"}
            </ReactMarkdown>
          </div>
        ) : (
          <Textarea
            value={labContent.scenario || ""}
            onChange={(e) => updateLabContent({ scenario: e.target.value })}
            className="bg-secondary border-border text-foreground h-20"
            placeholder="Describe the real-world scenario students will work through... (Markdown supported)"
          />
        )}
      </div>

      {/* Lab Tasks */}
      <div className="pt-2 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <Label className="text-muted-foreground text-sm flex items-center gap-1.5">
            <ListChecks className="h-3.5 w-3.5 text-muted-foreground" />
            Lab Tasks
          </Label>
          <Button onClick={addTask} size="sm" className="bg-primary/10 hover:bg-primary/20 text-primary border-0">
            <Plus className="h-3.5 w-3.5 mr-1" /> Add Task
          </Button>
        </div>

        {tasks.length === 0 && (
          <div className="text-center py-8 border border-dashed border-border rounded-lg">
            <ListChecks className="h-7 w-7 text-gray-700 mx-auto mb-2" />
            <p className="text-muted-foreground text-sm mb-1">No tasks defined yet</p>
            <p className="text-muted-foreground text-xs">Add the step-by-step tasks students must complete</p>
          </div>
        )}

        <div className="space-y-2">
          {tasks.map((task, idx) => {
            const hasInstructions = !!(task.instructions && task.instructions.trim());
            const hasHints = (task.hints || []).length > 0;
            const hasValidation =
              Array.isArray(task.validation_criteria) &&
              task.validation_criteria.some((c) => c && (c.description || c.check));
            const hasExec = (task.expected_commands && task.expected_commands.length > 0) || !!task.reference_config;
            const hasBranch = task.branch_type && task.branch_type !== "standard";
            const isAdvancedOpen = !!advancedOpen[idx];

            return (
              <div key={task.id || idx} className="border border-border rounded-lg overflow-hidden">
                {/* ── Collapsed header ── */}
                <div className="flex items-center gap-2 p-3 bg-secondary/70">
                  <span className="text-xs text-muted-foreground w-4 text-center font-mono flex-shrink-0">{idx + 1}</span>

                  {/* Readiness indicator — instructions / hints / validation */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <ReadinessDot filled={hasInstructions} label="Has instructions" />
                    <ReadinessDot filled={hasHints} label="Has hints" />
                    <ReadinessDot filled={hasValidation} label="Has validation criteria" />
                    <ReadinessDot filled={hasExec} label="Has execution/reference data" />
                    <ReadinessDot filled={hasBranch} label="Adaptive flow configured" />
                  </div>

                  <span className="flex-1 text-sm text-foreground font-medium truncate">
                    {task.title || "Untitled Task"}
                  </span>
                  {task.task_type && (
                    <Badge className="text-[10px] flex-shrink-0 border-0 bg-primary/10 text-primary">
                      {task.task_type}
                    </Badge>
                  )}
                  {hasBranch && (
                    <Badge className="text-[10px] flex-shrink-0 border-0 bg-amber-100 text-amber-700">
                      {BRANCH_LABELS[task.branch_type]}
                    </Badge>
                  )}
                  <span className="text-[10px] text-muted-foreground flex-shrink-0 font-mono">
                    {task.points ?? 0} pts{task.is_required === false ? " · optional" : ""}
                  </span>
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button onClick={() => moveTask(idx, -1)} disabled={idx === 0} className="text-muted-foreground hover:text-foreground p-1 disabled:opacity-20" title="Move up">
                      <ChevronUp className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => moveTask(idx, 1)} disabled={idx === tasks.length - 1} className="text-muted-foreground hover:text-foreground p-1 disabled:opacity-20" title="Move down">
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => duplicateTask(idx)} className="text-muted-foreground hover:text-foreground p-1" title="Duplicate task">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => removeTask(idx)} className="text-muted-foreground hover:text-destructive p-1" title="Delete task">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => { setExpandedTask(expandedTask === idx ? null : idx); }}
                      className="text-muted-foreground hover:text-foreground p-1 ml-1"
                      title={expandedTask === idx ? "Collapse" : "Expand"}
                    >
                      {expandedTask === idx ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* ── Expanded panel ── */}
                {expandedTask === idx && (
                  <div className="p-4 space-y-3 border-t border-border bg-card">
                    {/* Task Title */}
                    <div>
                      <Label className="text-muted-foreground text-xs mb-1 block">Task Title</Label>
                      <Input
                        value={task.title}
                        onChange={(e) => updateTask(idx, { title: e.target.value })}
                        className="bg-secondary border-border text-foreground text-sm"
                        placeholder="e.g., Configure OSPF on Router R1"
                      />
                    </div>

                    {/* Instructions */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label className="text-muted-foreground text-xs">Instructions</Label>
                        <button
                          onClick={() => setPreviewField(previewField === `task-${idx}` ? null : `task-${idx}`)}
                          className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors ${
                            previewField === `task-${idx}` ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
                          }`}
                        >
                          {previewField === `task-${idx}` ? <><Pencil className="h-3 w-3" /> Edit</> : <><Eye className="h-3 w-3" /> Preview</>}
                        </button>
                      </div>
                      {previewField === `task-${idx}` ? (
                        <div className="bg-secondary border border-border rounded-lg p-3 min-h-[80px] text-sm">
                          <ReactMarkdown components={MD_COMPONENTS}>
                            {task.instructions || "*No instructions written yet*"}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <Textarea
                          value={task.instructions || ""}
                          onChange={(e) => updateTask(idx, { instructions: e.target.value })}
                          className="bg-secondary border-border text-foreground text-sm h-24"
                          placeholder="Step-by-step instructions for this task... (Markdown supported — use # for headings, - for lists, `code` for commands)"
                        />
                      )}
                    </div>

                    {/* Primary metadata */}
                    <div className="grid grid-cols-3 gap-3 pt-1">
                      <div>
                        <Label className="text-muted-foreground text-xs mb-1 block">Task Type</Label>
                        <Select
                          value={task.task_type || "Configuration"}
                          onValueChange={(v) => updateTask(idx, { task_type: v })}
                        >
                          <SelectTrigger className="bg-secondary border-border text-foreground text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TASK_TYPES.map((t) => (
                              <SelectItem key={t} value={t}>{t}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs mb-1 block">Points</Label>
                        <Input
                          type="number"
                          value={task.points ?? 10}
                          onChange={(e) =>
                            updateTask(idx, { points: parseInt(e.target.value) || 0 })
                          }
                          className="bg-secondary border-border text-foreground text-sm"
                        />
                      </div>
                      <div>
                        <Label className="text-muted-foreground text-xs mb-1 block">Required</Label>
                        <Select
                          value={task.is_required === false ? "optional" : "required"}
                          onValueChange={(v) => updateTask(idx, { is_required: v === "required" })}
                        >
                          <SelectTrigger className="bg-secondary border-border text-foreground text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="required">Required</SelectItem>
                            <SelectItem value="optional">Optional</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* ── Advanced (collapsible, per-task) ── */}
                    <div className="border border-border rounded-lg">
                      <button
                        onClick={() => toggleAdvanced(idx)}
                        className="w-full flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Settings2 className="h-3.5 w-3.5" />
                        Advanced
                        <span className="ml-auto flex items-center gap-2">
                          {hasHints && <span className="text-[10px] text-green-600">hints</span>}
                          {hasValidation && <span className="text-[10px] text-green-600">validation</span>}
                          {hasExec && <span className="text-[10px] text-green-600">exec</span>}
                          {hasBranch && <span className="text-[10px] text-amber-600">branch</span>}
                          {!hasHints && !hasValidation && !hasExec && !hasBranch && (
                            <span className="text-[10px] text-muted-foreground/60">hints & validation</span>
                          )}
                        </span>
                        {isAdvancedOpen ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                      </button>

                      {isAdvancedOpen && (
                        <div className="px-3 pb-3 pt-3 space-y-4 border-t border-border">
                          {/* Progressive Hints */}
                          <div>
                            <Label className="text-muted-foreground text-xs mb-1 block">
                              Progressive Hints{" "}
                              <span className="opacity-60">(one per line — 2–3 of increasing specificity)</span>
                            </Label>
                            <Textarea
                              value={(task.hints || []).join("\n")}
                              onChange={(e) =>
                                updateTask(idx, {
                                  hints: e.target.value.split("\n").filter((h) => h.trim()),
                                })
                              }
                              className="bg-secondary border-border text-foreground text-sm h-16"
                              placeholder={
                                "Hint 1: General nudge toward the right approach\nHint 2: More specific direction\nHint 3: Near-complete answer"
                              }
                            />
                          </div>

                          {/* Validation Criteria */}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <Label className="text-muted-foreground text-xs">
                                Validation Criteria
                              </Label>
                              <button
                                onClick={() => addCriteria(idx)}
                                className="flex items-center gap-1 text-xs px-2 py-0.5 rounded text-primary hover:bg-primary/10 transition-colors"
                              >
                                <Plus className="h-3 w-3" /> Add Criterion
                              </button>
                            </div>
                            {(task.validation_criteria || []).length === 0 ? (
                              <p className="text-xs text-muted-foreground italic">
                                No criteria yet — add structured checks for scoring, rubrics, and lab QA.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {/* Column headers */}
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] text-muted-foreground font-medium w-28 flex-shrink-0">Check ID</span>
                                  <span className="text-[10px] text-muted-foreground font-medium flex-1">What to verify</span>
                                  <span className="text-[10px] text-muted-foreground font-medium w-16 flex-shrink-0 text-center">Points</span>
                                  <span className="w-5 flex-shrink-0" />
                                </div>
                                {(task.validation_criteria || []).map((crit, ci) => {
                                  const validatorMode = crit.runtime_validator?.type || "manual";
                                  return (
                                    <div key={ci} className="rounded-lg border border-border/60 p-2 space-y-2">
                                      <div className="flex items-start gap-2">
                                        <Input
                                          value={crit.check}
                                          onChange={(e) => updateCriteria(idx, ci, { check: e.target.value })}
                                          className="bg-secondary border-border text-foreground text-xs w-28 flex-shrink-0"
                                          placeholder="directory_created"
                                        />
                                        <Input
                                          value={crit.description}
                                          onChange={(e) => updateCriteria(idx, ci, { description: e.target.value })}
                                          className="bg-secondary border-border text-foreground text-xs flex-1"
                                          placeholder="What to verify"
                                        />
                                        <Input
                                          type="number"
                                          value={crit.points ?? 0}
                                          onChange={(e) =>
                                            updateCriteria(idx, ci, { points: parseInt(e.target.value) || 0 })
                                          }
                                          className="bg-secondary border-border text-foreground text-xs w-16 flex-shrink-0"
                                        />
                                        <button
                                          onClick={() => removeCriteria(idx, ci)}
                                          className="text-muted-foreground hover:text-destructive p-1 flex-shrink-0"
                                        >
                                          <Trash2 className="h-3.5 w-3.5" />
                                        </button>
                                      </div>

                                      <div className="grid sm:grid-cols-[160px_1fr_130px] gap-2 items-end">
                                        <div>
                                          <Label className="text-[10px] text-muted-foreground">Runtime validation</Label>
                                          <Select
                                            value={validatorMode}
                                            onValueChange={(value) =>
                                              updateCriteria(idx, ci, {
                                                runtime_validator: value === "path_exists"
                                                  ? {
                                                      type: "path_exists",
                                                      path: crit.runtime_validator?.path || "",
                                                      path_kind: crit.runtime_validator?.path_kind || "any",
                                                      ...(crit.runtime_validator?.resource_id
                                                        ? { resource_id: crit.runtime_validator.resource_id }
                                                        : {}),
                                                    }
                                                  : value === "command_result"
                                                    ? {
                                                        type: "command_result",
                                                        command_key: "file_mode",
                                                        path: crit.runtime_validator?.path || "",
                                                        expected_output: "600",
                                                        ...(crit.runtime_validator?.resource_id
                                                          ? { resource_id: crit.runtime_validator.resource_id }
                                                          : {}),
                                                      }
                                                    : undefined,
                                              })
                                            }
                                          >
                                            <SelectTrigger className="h-8 bg-secondary border-border text-xs">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="manual">Manual</SelectItem>
                                              <SelectItem value="path_exists">Path exists</SelectItem>
                                              <SelectItem value="command_result">File mode (command result)</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>

                                        {validatorMode === "path_exists" ? (
                                          <>
                                            <div>
                                              <Label className="text-[10px] text-muted-foreground">Absolute path</Label>
                                              <Input
                                                value={crit.runtime_validator?.path || ""}
                                                onChange={(e) =>
                                                  updateCriteria(idx, ci, {
                                                    runtime_validator: {
                                                      ...crit.runtime_validator,
                                                      type: "path_exists",
                                                      path: e.target.value,
                                                    },
                                                  })
                                                }
                                                className="h-8 bg-secondary border-border text-foreground text-xs font-mono"
                                                placeholder="/home/kasm-user/lab1"
                                              />
                                            </div>
                                            <div>
                                              <Label className="text-[10px] text-muted-foreground">Kind</Label>
                                              <Select
                                                value={crit.runtime_validator?.path_kind || "any"}
                                                onValueChange={(value) =>
                                                  updateCriteria(idx, ci, {
                                                    runtime_validator: {
                                                      ...crit.runtime_validator,
                                                      type: "path_exists",
                                                      path_kind: value,
                                                    },
                                                  })
                                                }
                                              >
                                                <SelectTrigger className="h-8 bg-secondary border-border text-xs">
                                                  <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                  <SelectItem value="any">Any path</SelectItem>
                                                  <SelectItem value="file">File</SelectItem>
                                                  <SelectItem value="directory">Directory</SelectItem>
                                                </SelectContent>
                                              </Select>
                                            </div>
                                          </>
                                        ) : validatorMode === "command_result" ? (
                                          <>
                                            <div>
                                              <Label className="text-[10px] text-muted-foreground">Absolute file path</Label>
                                              <Input
                                                value={crit.runtime_validator?.path || ""}
                                                onChange={(e) =>
                                                  updateCriteria(idx, ci, {
                                                    runtime_validator: {
                                                      ...crit.runtime_validator,
                                                      type: "command_result",
                                                      command_key: "file_mode",
                                                      path: e.target.value,
                                                    },
                                                  })
                                                }
                                                className="h-8 bg-secondary border-border text-foreground text-xs font-mono"
                                                placeholder="/home/kasm-user/config.secret"
                                              />
                                            </div>
                                            <div>
                                              <Label className="text-[10px] text-muted-foreground">Expected mode</Label>
                                              <Input
                                                value={crit.runtime_validator?.expected_output || ""}
                                                onChange={(e) =>
                                                  updateCriteria(idx, ci, {
                                                    runtime_validator: {
                                                      ...crit.runtime_validator,
                                                      type: "command_result",
                                                      command_key: "file_mode",
                                                      expected_output: e.target.value,
                                                    },
                                                  })
                                                }
                                                className="h-8 bg-secondary border-border text-foreground text-xs font-mono"
                                                placeholder="600"
                                              />
                                            </div>
                                            <p className="sm:col-span-3 text-[10px] text-muted-foreground">
                                              Runs the read-only file-mode check in the learner workspace; raw command output is not returned.
                                            </p>
                                          </>
                                        ) : (
                                          <p className="sm:col-span-2 text-[10px] text-muted-foreground pb-2">
                                            Manual criteria remain instructor/preview checks and are not treated as automated proof.
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  );
                                })}

                                {/* Points total reconciliation */}
                                {(() => {
                                  const sum = (task.validation_criteria || []).reduce(
                                    (acc, c) => acc + (c.points || 0), 0
                                  );
                                  const taskPoints = task.points ?? 0;
                                  const match = sum === taskPoints;
                                  return (
                                    <div className={`flex items-center gap-1.5 text-xs pt-1 ${match ? "text-green-600" : "text-orange-600"}`}>
                                      {match ? (
                                        <><CheckCircle2 className="h-3 w-3" /> Criteria points ({sum}) match task points ({taskPoints})</>
                                      ) : (
                                        <><AlertTriangle className="h-3 w-3" /> Criteria points ({sum}) ≠ task points ({taskPoints})</>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>

                          {/* ── Execution & Validation (Phase 2) ── */}
                          <div className="pt-2 border-t border-border/60">
                            <Label className="text-muted-foreground text-xs mb-2 block">
                              Execution &amp; Validation
                            </Label>

                            {/* Expected Commands */}
                            <div className="mb-3">
                              <Label className="text-muted-foreground text-[11px] mb-1 block">
                                Expected Commands{" "}
                                <span className="opacity-60">(one per line)</span>
                              </Label>
                              <Textarea
                                value={(task.expected_commands || []).join("\n")}
                                onChange={(e) =>
                                  updateTask(idx, {
                                    expected_commands: e.target.value.split("\n").filter((c) => c.trim()),
                                  })
                                }
                                className="bg-secondary border-border text-foreground text-xs font-mono h-16"
                                placeholder={"show ip ospf neighbor\nshow ip interface brief"}
                              />
                              <p className="text-[10px] text-muted-foreground mt-1 flex items-start gap-1">
                                <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                <span>
                                  Authored reference data only. Entering expected commands does <strong>not</strong> by itself
                                  enable automated validation — a future terminal/provider validator may consume these.
                                </span>
                              </p>
                            </div>

                            {/* Reference Configuration */}
                            <div>
                              <Label className="text-muted-foreground text-[11px] mb-1 block">
                                Reference Configuration
                              </Label>
                              {previewField === `refcfg-${idx}` ? (
                                <div className="bg-secondary border border-border rounded-lg p-3 min-h-[80px]">
                                  <pre className="text-xs font-mono text-foreground whitespace-pre-wrap break-words">
                                    {task.reference_config || "(no reference configuration)"}
                                  </pre>
                                </div>
                              ) : (
                                <Textarea
                                  value={task.reference_config || ""}
                                  onChange={(e) => updateTask(idx, { reference_config: e.target.value })}
                                  className="bg-secondary border-border text-foreground text-xs font-mono h-32"
                                  placeholder="Paste the authoritative target configuration for this task (router config, firewall ruleset, script, etc.)"
                                />
                              )}
                              <div className="flex items-center justify-end mt-1">
                                <button
                                  onClick={() => setPreviewField(previewField === `refcfg-${idx}` ? null : `refcfg-${idx}`)}
                                  className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  {previewField === `refcfg-${idx}` ? <><Pencil className="h-3 w-3" /> Edit</> : <><Eye className="h-3 w-3" /> Preview</>}
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* ── Adaptive Flow (Phase 2) ── */}
                          <div className="pt-2 border-t border-border/60">
                            <Label className="text-muted-foreground text-xs mb-2 block">
                              Adaptive Flow
                            </Label>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              {/* Branch Type */}
                              <div>
                                <Label className="text-muted-foreground text-[11px] mb-1 block">Branch Type</Label>
                                <Select
                                  value={task.branch_type || "standard"}
                                  onValueChange={(v) => {
                                    if (v === "standard") {
                                      updateTask(idx, { branch_type: "standard", depends_on_task_id: undefined, unlock_condition: undefined });
                                    } else {
                                      updateTask(idx, { branch_type: v });
                                    }
                                  }}
                                >
                                  <SelectTrigger className="bg-secondary border-border text-foreground text-sm">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {BRANCH_TYPES.map((b) => (
                                      <SelectItem key={b} value={b}>{BRANCH_LABELS[b]}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>

                              {/* Prerequisite Task */}
                              {task.branch_type && task.branch_type !== "standard" && (
                                <div>
                                  <Label className="text-muted-foreground text-[11px] mb-1 block">Prerequisite Task</Label>
                                  <Select
                                    value={task.depends_on_task_id || ""}
                                    onValueChange={(v) => updateTask(idx, { depends_on_task_id: v })}
                                  >
                                    <SelectTrigger className="bg-secondary border-border text-foreground text-sm">
                                      <SelectValue placeholder="Select prerequisite…" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {(() => {
                                        const invalid = getInvalidPrerequisiteIds(tasks, task.id);
                                        return tasks
                                          .filter((t) => t.id !== task.id && !invalid.has(t.id))
                                          .map((t) => (
                                            <SelectItem key={t.id} value={t.id}>
                                              {`${t.order}. ${t.title || "Untitled Task"}`}
                                            </SelectItem>
                                          ));
                                      })()}
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                            </div>

                            {/* Dangling prerequisite warning (Modification 1 — preserve, warn) */}
                            {task.branch_type && task.branch_type !== "standard" && task.depends_on_task_id && (
                              !tasks.some((t) => t.id === task.depends_on_task_id) ? (
                                <p className="text-[10px] text-orange-600 mt-2 flex items-start gap-1">
                                  <AlertTriangle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                                  <span>
                                    Prerequisite task is missing. Select a valid task or reset to linear — this branch
                                    will be ignored at runtime until repaired.
                                  </span>
                                </p>
                              ) : null
                            )}

                            {/* Trigger + Threshold */}
                            {task.branch_type && task.branch_type !== "standard" && task.depends_on_task_id && (
                              tasks.some((t) => t.id === task.depends_on_task_id) ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                                  <div>
                                    <Label className="text-muted-foreground text-[11px] mb-1 block">Unlock Trigger</Label>
                                    <Select
                                      value={task.unlock_condition?.trigger || "passed"}
                                      onValueChange={(v) => {
                                        const base = { trigger: v };
                                        if (v === "score_above" || v === "score_below") {
                                          const prereq = tasks.find((t) => t.id === task.depends_on_task_id);
                                          const max = typeof prereq?.points === "number" ? prereq.points : 10;
                                          base.score_threshold = task.unlock_condition?.score_threshold ?? Math.ceil(max / 2);
                                        }
                                        updateTask(idx, { unlock_condition: base });
                                      }}
                                    >
                                      <SelectTrigger className="bg-secondary border-border text-foreground text-sm">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {UNLOCK_TRIGGERS.map((tr) => (
                                          <SelectItem key={tr} value={tr}>{TRIGGER_LABELS[tr]}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  {(task.unlock_condition?.trigger === "score_above" || task.unlock_condition?.trigger === "score_below") && (
                                    <div>
                                      <Label className="text-muted-foreground text-[11px] mb-1 block">
                                        Score Threshold{" "}
                                        <span className="opacity-60">
                                          (points; max {(() => {
                                            const prereq = tasks.find((t) => t.id === task.depends_on_task_id);
                                            return typeof prereq?.points === "number" ? prereq.points : 0;
                                          })()})
                                        </span>
                                      </Label>
                                      <Input
                                        type="number"
                                        value={task.unlock_condition?.score_threshold ?? 0}
                                        onChange={(e) =>
                                          updateTask(idx, {
                                            unlock_condition: {
                                              ...task.unlock_condition,
                                              trigger: task.unlock_condition?.trigger,
                                              score_threshold: parseInt(e.target.value) || 0,
                                            },
                                          })
                                        }
                                        className="bg-secondary border-border text-foreground text-sm"
                                      />
                                    </div>
                                  )}
                                </div>
                              ) : null
                            )}

                            {/* Live info box */}
                            {task.branch_type && task.branch_type !== "standard" && (() => {
                              const summary = buildBranchSummary(task, tasks);
                              if (!summary) return null;
                              return (
                                <div className="mt-3 flex items-start gap-1.5 rounded-md bg-slate-50 border border-slate-200 p-2.5">
                                  <Info className="h-3.5 w-3.5 flex-shrink-0 mt-0.5 text-slate-500" />
                                  <p className="text-[11px] text-slate-600 leading-snug">{summary}</p>
                                </div>
                              );
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Success Criteria */}
      <div className="pt-2 border-t border-border">
        <div className="flex items-center justify-between mb-1">
          <Label className="text-muted-foreground text-sm">Success Criteria</Label>
          <button
            onClick={() => setPreviewField(previewField === "success" ? null : "success")}
            className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded transition-colors ${
              previewField === "success" ? "bg-secondary text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {previewField === "success" ? <><Pencil className="h-3 w-3" /> Edit</> : <><Eye className="h-3 w-3" /> Preview</>}
          </button>
        </div>
        {previewField === "success" ? (
          <div className="bg-secondary border border-border rounded-lg p-3 min-h-[80px] text-sm">
            <ReactMarkdown components={MD_COMPONENTS}>
              {labContent.success_criteria || "*No success criteria defined yet*"}
            </ReactMarkdown>
          </div>
        ) : (
          <Textarea
            value={labContent.success_criteria || ""}
            onChange={(e) => updateLabContent({ success_criteria: e.target.value })}
            className="bg-secondary border-border text-foreground h-20"
            placeholder="How will students and instructors verify the lab is complete? (e.g., specific CLI outputs, configuration states, test results)"
          />
        )}
      </div>
    </div>
  );
}