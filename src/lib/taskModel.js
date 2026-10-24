/**
 * Task Model — Phase 2  (Checkpoint: 2026-08-13 — Phase 2 Advanced Task Authoring)
 * ================================================================
 * Single source of truth for the authored task shape stored in
 * LabTemplate.lab_content.tasks[].
 *
 * ── MVP fields (authored, stored on LabTemplate) ────────────────────────
 *   id                   stable task identity; survives reordering
 *   title                short task title
 *   instructions         markdown step-by-step instructions
 *   order                1-based display order
 *   task_type            Configuration | Verification | Troubleshooting |
 *                        Analysis | Documentation | Security Assessment
 *   points               point weighting (default 10)
 *   is_required          core vs optional (default true)
 *   hints                array of strings, revealed progressively at runtime
 *   validation_criteria  array of { check, description, points }
 *
 * ── Phase 2 fields (authored, stored on LabTemplate) ───────────────────
 *   expected_commands    array of strings — authored execution/reference
 *                        commands. NOT authoritative automated validation
 *                        rules; reference data a future terminal/provider
 *                        validator may consume.
 *   reference_config     string — raw target configuration text.
 *   branch_type          standard | advanced | remediation (default standard)
 *   depends_on_task_id   string — stable id of prerequisite task. Primary
 *                        dependency source read by the runtime.
 *   unlock_condition     { trigger, score_threshold? } — how the prerequisite
 *                        result unlocks this task.
 *
 * ── Runtime-only (belong in LabInstance.task_results, NOT LabTemplate) ──
 *   status, hints_used, submission, validation_results, points_earned,
 *   time_spent_minutes, started_at, submitted_at,
 *   instructor_override_score, instructor_notes
 *
 * ── Non-persisting fields (removed from UI — not in LabTemplate schema) ─
 *   bloom_level, estimated_minutes, reference_solution
 *
 * Architectural rule: authored task DEFINITIONS live on LabTemplate;
 * learner/session STATE lives on LabInstance.task_results. Never mix.
 *
 * ────────────────────────────────────────────────────────────────────────
 * CHECKPOINT: 2026-08-13 — Phase 2 Advanced Task Authoring
 *   1. LabTemplate.lab_content.tasks[] schema extended with Phase 2 fields:
 *      expected_commands, reference_config, branch_type, depends_on_task_id,
 *      unlock_condition (trigger + score_threshold).
 *   2. normalizeTask() extended with Phase 2 defaults. Per Modification 1,
 *      dangling depends_on_task_id is PRESERVED (not auto-downgraded) on
 *      load — the editor surfaces a warning so the instructor can repair.
 *      Automatic downgrade happens ONLY when an instructor explicitly
 *      deletes a referenced prerequisite task (see resetBranchTasksForDeletedTask).
 *   3. Added pure helpers for adaptive-flow authoring:
 *        getInvalidPrerequisiteIds(tasks, currentTaskId) — cycle prevention
 *        validateLabContent(labContent) → { warnings, errors }
 *        resetBranchTasksForDeletedTask(tasks, deletedTaskId) → { tasks, resetCount }
 *        buildBranchSummary(task, tasks) → string (plain-English info-box text)
 *   4. branchingResolver.js updated to read task.depends_on_task_id as the
 *      primary dependency source, with unlock_condition.depends_on_task_id
 *      as a legacy fallback.
 *   5. LabContentEditor.jsx: Execution & Validation + Adaptive Flow groups
 *      added inside the existing Advanced section. Fixed the shared
 *      showAdvanced state to track expansion per task index.
 *   6. Tests extended for branching, thresholds, cycle prevention, deletion,
 *      dangling references, and linear-default behavior.
 * ────────────────────────────────────────────────────────────────────────
 *
 * Earlier checkpoints (preserved):
 *   - 2026-08-13 Native runtime contract (passing_score, template_snapshot,
 *     template_version, structured task_results).
 *   - 2026-08-13 Runtime consistency fixes (criteria points default 1,
 *     deriveDifficultyWeightedScore removed).
 *   - 2026-08-13 Runtime logic extraction (taskValidator, instanceScoring,
 *     branchingResolver pure modules).
 */

export const TASK_TYPES = [
  "Configuration",
  "Verification",
  "Troubleshooting",
  "Analysis",
  "Documentation",
  "Security Assessment",
];

export const DEFAULT_TASK_TYPE = "Configuration";
export const DEFAULT_POINTS = 10;
/** Sensible non-zero default for newly added validation criteria. */
export const DEFAULT_CRITERION_POINTS = 1;

export const BRANCH_TYPES = ["standard", "advanced", "remediation"];

export const UNLOCK_TRIGGERS = ["passed", "failed", "score_above", "score_below"];

let _idSeq = 0;

/** Generate a stable, unique task id (not array-index based). */
export function generateTaskId() {
  _idSeq += 1;
  return `task_${Date.now().toString(36)}_${_idSeq}`;
}

function normalizeRuntimeValidator(value) {
  if (!value || typeof value !== "object") return undefined;
  const path = typeof value.path === "string" ? value.path.trim() : "";
  const resourceId = typeof value.resource_id === "string" && value.resource_id.trim()
    ? value.resource_id.trim()
    : undefined;

  if (value.type === "path_exists") {
    const pathKind = ["any", "file", "directory"].includes(value.path_kind) ? value.path_kind : "any";
    return {
      type: "path_exists",
      path,
      path_kind: pathKind,
      ...(resourceId ? { resource_id: resourceId } : {}),
    };
  }

  if (value.type === "command_result" && value.command_key === "file_mode") {
    return {
      type: "command_result",
      command_key: "file_mode",
      path,
      expected_output: typeof value.expected_output === "string" ? value.expected_output.trim() : "",
      ...(resourceId ? { resource_id: resourceId } : {}),
    };
  }

  return undefined;
}

/** Coerce a single criterion object into the structured runtime-validation shape. */
function normalizeCriterion(c) {
  if (!c || typeof c !== "object") {
    return { check: "", description: "", points: 0 };
  }
  const runtimeValidator = normalizeRuntimeValidator(c.runtime_validator);
  return {
    check: typeof c.check === "string" ? c.check : "",
    description: typeof c.description === "string" ? c.description : "",
    points: typeof c.points === "number" ? c.points : DEFAULT_CRITERION_POINTS,
    ...(runtimeValidator ? { runtime_validator: runtimeValidator } : {}),
  };
}

/**
 * Normalize an unlock_condition object. Returns undefined when absent/invalid.
 * Note: depends_on_task_id lives at the task level (primary); it is NOT
 * read from inside unlock_condition here. The resolver reads both with
 * the task-level field taking precedence.
 */
function normalizeUnlockCondition(cond) {
  if (!cond || typeof cond !== "object") return undefined;
  const trigger = UNLOCK_TRIGGERS.includes(cond.trigger) ? cond.trigger : undefined;
  if (!trigger) return undefined;
  const out = { trigger };
  if (typeof cond.score_threshold === "number") {
    out.score_threshold = cond.score_threshold;
  }
  return out;
}

/**
 * Ensure a task object carries every MVP + Phase 2 field with a sensible default.
 *
 * Phase 2 / Modification 1: a non-standard branch_type with a dangling
 * depends_on_task_id is PRESERVED as-is (not downgraded). The editor uses
 * validateLabContent() to surface a warning so the instructor can repair.
 * Automatic downgrade only happens on explicit prerequisite deletion
 * (resetBranchTasksForDeletedTask).
 */
export function normalizeTask(task, index) {
  const t = task && typeof task === "object" ? task : {};

  // validation_criteria: legacy string → single criterion; array → normalize; else []
  let vc = t.validation_criteria;
  if (typeof vc === "string") {
    vc = vc.trim() ? [{ check: "criteria", description: vc, points: DEFAULT_CRITERION_POINTS }] : [];
  } else if (!Array.isArray(vc)) {
    vc = [];
  }
  vc = vc.map(normalizeCriterion);

  const branchType = BRANCH_TYPES.includes(t.branch_type) ? t.branch_type : "standard";

  return {
    ...t,
    id: t.id || generateTaskId(),
    title: typeof t.title === "string" ? t.title : "",
    instructions: typeof t.instructions === "string" ? t.instructions : "",
    order: typeof t.order === "number" ? t.order : index + 1,
    task_type: TASK_TYPES.includes(t.task_type) ? t.task_type : DEFAULT_TASK_TYPE,
    points: typeof t.points === "number" ? t.points : DEFAULT_POINTS,
    is_required: typeof t.is_required === "boolean" ? t.is_required : true,
    hints: Array.isArray(t.hints) ? t.hints : [],
    validation_criteria: vc,
    // Phase 2 — Execution & Validation
    expected_commands: Array.isArray(t.expected_commands) ? t.expected_commands : [],
    reference_config: typeof t.reference_config === "string" ? t.reference_config : undefined,
    // Phase 2 — Adaptive Flow (preserved even if dangling — see Modification 1)
    branch_type: branchType,
    depends_on_task_id: typeof t.depends_on_task_id === "string" ? t.depends_on_task_id : undefined,
    unlock_condition: normalizeUnlockCondition(t.unlock_condition),
  };
}

/** Normalize a tasks array (e.g. from a loaded LabTemplate or AI output). */
export function normalizeTasks(tasks) {
  if (!Array.isArray(tasks)) return [];
  return tasks.map((t, i) => normalizeTask(t, i));
}

/** Create a blank task pre-populated with MVP + Phase 2 defaults (linear). */
export function createBlankTask(index) {
  return normalizeTask(
    {
      title: "",
      instructions: "",
      hints: [],
      validation_criteria: [],
    },
    index
  );
}

/**
 * Duplicate a task at the given index: deep-copies authored content,
 * assigns a new stable id, and inserts it immediately after the original.
 * Re-indexes order for all tasks. Phase 2 adaptive fields are NOT copied —
 * a duplicated task resets to standard (no dependency), since the original's
 * prerequisite may no longer be the intended parent for the copy.
 */
export function duplicateTaskInList(tasks, index) {
  if (!Array.isArray(tasks) || index < 0 || index >= tasks.length) return tasks || [];
  const original = tasks[index];
  const copy = {
    ...original,
    id: generateTaskId(),
    title: original.title ? `${original.title} (copy)` : "Untitled Task (copy)",
    hints: [...(original.hints || [])],
    validation_criteria: (original.validation_criteria || []).map((c) => ({
      ...c,
      ...(c.runtime_validator ? { runtime_validator: { ...c.runtime_validator } } : {}),
    })),
    expected_commands: [...(original.expected_commands || [])],
    reference_config: original.reference_config,
    // Reset adaptive flow — a copy is linear by default to avoid accidental cycles.
    branch_type: "standard",
    depends_on_task_id: undefined,
    unlock_condition: undefined,
  };
  const next = [...tasks];
  next.splice(index + 1, 0, copy);
  return next.map((t, i) => ({ ...t, order: i + 1 }));
}

/**
 * Cycle prevention — compute the set of task ids that `currentTaskId`
 * cannot depend on: itself plus every task that (transitively) depends on it.
 *
 * Fixed-point iteration: start with { currentTaskId }, then repeatedly mark
 * any task whose depends_on_task_id is already marked, until no new marks.
 * Choosing any task in the resulting set as a prerequisite would create a cycle.
 *
 * @returns {Set<string>} task ids that are invalid as a prerequisite
 */
export function getInvalidPrerequisiteIds(tasks, currentTaskId) {
  const invalid = new Set([currentTaskId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const task of tasks || []) {
      const dep = task.depends_on_task_id || task.unlock_condition?.depends_on_task_id;
      if (dep && invalid.has(dep) && !invalid.has(task.id)) {
        invalid.add(task.id);
        changed = true;
      }
    }
  }
  return invalid;
}

/**
 * Validate authored lab_content. Returns { warnings: [], errors: [] }.
 *
 * Warnings are advisory (non-blocking, orange). Errors are save-blocking.
 *
 * Checks:
 *  - E1 cycle: a dependency cycle exists (only via external/AI data — UI prevents it)
 *  - E2 self-reference: a task depends on itself
 *  - E3 invalid trigger: non-standard task with missing/invalid unlock_condition.trigger
 *  - W1 dangling: non-standard task whose depends_on_task_id resolves to no task
 *  - W2 incomplete: non-standard task missing depends_on_task_id
 *  - W3 threshold range: score_above/score_below threshold outside [0, prereq points]
 */
export function validateLabContent(labContent) {
  const warnings = [];
  const errors = [];
  const tasks = labContent?.tasks || [];
  const byId = {};
  tasks.forEach((t) => { if (t && t.id) byId[t.id] = t; });

  // E2 self-reference
  for (const t of tasks) {
    const dep = t.depends_on_task_id || t.unlock_condition?.depends_on_task_id;
    if (dep && dep === t.id) {
      errors.push(`Task "${t.title || t.id}" cannot depend on itself.`);
    }
  }

  // E1 cycle detection (whole-graph fixed point from each node)
  if (hasCycle(tasks)) {
    errors.push("Circular dependency detected between tasks. Branch tasks cannot depend on each other.");
  }

  for (const t of tasks) {
    if (!t.branch_type || t.branch_type === "standard") continue;

    const dep = t.depends_on_task_id || t.unlock_condition?.depends_on_task_id;
    const trigger = t.unlock_condition?.trigger;

    // E3 invalid trigger
    if (!trigger || !UNLOCK_TRIGGERS.includes(trigger)) {
      errors.push(`Task "${t.title || t.id}" has a non-standard branch type but no valid unlock trigger.`);
    }

    // W2 incomplete
    if (!dep) {
      warnings.push(`Task "${t.title || t.id}" is a branch task with no prerequisite task selected.`);
      continue;
    }

    // W1 dangling
    if (!byId[dep]) {
      warnings.push(`Task "${t.title || t.id}" references a missing prerequisite task. Repair or reset to linear.`);
      continue;
    }

    // W3 threshold range
    if ((trigger === "score_above" || trigger === "score_below") && typeof t.unlock_condition.score_threshold === "number") {
      const max = typeof byId[dep].points === "number" ? byId[dep].points : 0;
      const thr = t.unlock_condition.score_threshold;
      if (thr < 0 || thr > max) {
        warnings.push(`Task "${t.title || t.id}" threshold (${thr}) is outside the prerequisite's point range (0–${max}).`);
      }
    }
  }

  return { warnings, errors };
}

/** Whole-graph cycle detection via DFS with coloring. */
function hasCycle(tasks) {
  const byId = {};
  (tasks || []).forEach((t) => { if (t && t.id) byId[t.id] = t; });
  const WHITE = 0, GRAY = 1, BLACK = 2;
  // Initialize every node to WHITE up front so `color[dep] === WHITE` is true
  // (undefined === 0 would be false and skip the recursive visit).
  const color = {};
  (tasks || []).forEach((t) => { if (t && t.id) color[t.id] = WHITE; });
  let cycle = false;

  function visit(id) {
    if (cycle) return;
    color[id] = GRAY;
    const node = byId[id];
    if (node) {
      const dep = node.depends_on_task_id || node.unlock_condition?.depends_on_task_id;
      if (dep && byId[dep]) {
        if (color[dep] === GRAY) { cycle = true; return; }
        if (color[dep] === WHITE) visit(dep);
      }
    }
    color[id] = BLACK;
  }

  for (const t of tasks || []) {
    if (cycle) break;
    if (color[t.id] === WHITE) visit(t.id);
  }
  return cycle;
}

/**
 * When an instructor explicitly deletes a prerequisite task, reset every
 * branch task that depended on it back to linear (standard). This is the
 * ONLY place automatic downgrade occurs (per Modification 1).
 *
 * @returns {{ tasks: Array, resetCount: number }}
 */
export function resetBranchTasksForDeletedTask(tasks, deletedTaskId) {
  if (!Array.isArray(tasks)) return { tasks: [], resetCount: 0 };
  let resetCount = 0;
  const next = tasks.map((t) => {
    const dep = t.depends_on_task_id || t.unlock_condition?.depends_on_task_id;
    if (dep === deletedTaskId && t.branch_type && t.branch_type !== "standard") {
      resetCount += 1;
      return {
        ...t,
        branch_type: "standard",
        depends_on_task_id: undefined,
        unlock_condition: undefined,
      };
    }
    return { ...t, branch_type: t.branch_type || "standard" };
  });
  return { tasks: next, resetCount };
}

/**
 * Build a plain-English summary of a task's adaptive-flow configuration,
 * for the editor's live info box. Returns null for standard tasks.
 *
 * @param {Object} task       - the branch task
 * @param {Array}  tasks      - all tasks (to resolve the prerequisite title)
 * @returns {string|null}
 */
export function buildBranchSummary(task, tasks) {
  if (!task || !task.branch_type || task.branch_type === "standard") return null;

  const dep = task.depends_on_task_id || task.unlock_condition?.depends_on_task_id;
  const trigger = task.unlock_condition?.trigger;
  const threshold = task.unlock_condition?.score_threshold;

  const byId = {};
  (tasks || []).forEach((t) => { if (t && t.id) byId[t.id] = t; });
  const prereq = dep ? byId[dep] : null;
  const prereqLabel = prereq ? `"${prereq.title || prereq.id}"` : "a missing prerequisite task";

  const typeLabel = task.branch_type === "advanced" ? "Advanced (stretch)" : "Remediation (fallback)";
  const lockedIcon = "🔒";

  let triggerPhrase;
  switch (trigger) {
    case "passed":
      triggerPhrase = `the learner passes ${prereqLabel}`;
      break;
    case "failed":
      triggerPhrase = `the learner fails ${prereqLabel}`;
      break;
    case "score_above":
      triggerPhrase = `the learner passes ${prereqLabel} with at least ${threshold ?? 0} points`;
      break;
    case "score_below":
      triggerPhrase = `the learner fails ${prereqLabel}, or passes with fewer than ${threshold ?? 100} points`;
      break;
    default:
      triggerPhrase = `the learner completes ${prereqLabel}`;
  }

  const tail = task.branch_type === "advanced"
    ? "High performers will see this stretch task; others move on."
    : "It appears only for learners who need extra support.";

  if (!prereq) {
    return `${lockedIcon} ${typeLabel}: prerequisite task is missing. Repair the dependency or reset to linear.`;
  }
  return `${lockedIcon} ${typeLabel}: unlocks after ${triggerPhrase}. ${tail}`;
}