/**
 * Branching Resolver — Runtime task unlock resolution (pure functions)
 * ================================================================
 * Determines which tasks are visible/unlocked for a learner based on their
 * task_results. Adapted from legacy branchingLogic.jsx.
 *
 * Operates on:
 *   - template_snapshot.lab_content.tasks[] (authored task definitions)
 *   - LabInstance.task_results[] (runtime state keyed by task_id)
 *
 * No LabTask or TaskProgress entity dependencies. No React state. No side effects.
 *
 * NOTE: Phase 2 branching fields (branch_type, unlock_condition) are NOT in the
 * current LabTemplate schema yet. Tasks without these fields are treated as
 * "standard" (always unlocked). When Phase 2 fields are added to the schema,
 * this module will automatically honor them without changes.
 *
 * CHECKPOINT: 2026-08-13 — Runtime logic extraction (not wired into UI yet)
 */

/**
 * Resolve which tasks are unlocked for a learner.
 *
 * Each task is annotated with:
 *   - unlocked: boolean
 *   - branch_locked_reason: string | null (human-readable reason when locked)
 *
 * @param {Array} tasks       - template_snapshot.lab_content.tasks[]
 * @param {Array} taskResults - LabInstance.task_results[]
 * @returns {Array} tasks annotated with { unlocked, branch_locked_reason }
 */
export function resolveUnlockedTasks(tasks, taskResults) {
  const resultsById = {};
  (taskResults || []).forEach((r) => {
    if (r && r.task_id) resultsById[r.task_id] = r;
  });

  return (tasks || []).map((task) => {
    // Standard tasks (or tasks without Phase 2 fields) are always unlocked
    if (!task.branch_type || task.branch_type === "standard") {
      return { ...task, unlocked: true, branch_locked_reason: null };
    }

    // Phase 2: depends_on_task_id is read from the task level (primary),
    // with unlock_condition.depends_on_task_id as a legacy fallback.
    const dependsOn = task.depends_on_task_id || task.unlock_condition?.depends_on_task_id;
    const cond = task.unlock_condition;
    if (!dependsOn || !cond || !cond.trigger) {
      return { ...task, unlocked: true, branch_locked_reason: null };
    }

    const parentResult = resultsById[dependsOn];

    if (!parentResult) {
      const label =
        task.branch_type === "advanced" ? "Advanced task" : "Remediation task";
      return {
        ...task,
        unlocked: false,
        branch_locked_reason: `${label} — unlocks after completing the prerequisite task`,
      };
    }

    const parentPassed = parentResult.status === "passed";
    const parentFailed = parentResult.status === "failed";
    const parentScore = parentResult.points_earned ?? 0;

    let unlocked = false;

    switch (cond.trigger) {
      case "passed":
        unlocked = parentPassed;
        break;
      case "failed":
        unlocked = parentFailed;
        break;
      case "score_above":
        unlocked = parentPassed && parentScore >= (cond.score_threshold ?? 0);
        break;
      case "score_below":
        unlocked =
          parentFailed || (parentPassed && parentScore < (cond.score_threshold ?? 100));
        break;
      default:
        unlocked = false;
    }

    const reason = unlocked ? null : buildLockedReason(task.branch_type, cond);
    return { ...task, unlocked, branch_locked_reason: reason };
  });
}

/**
 * Build a human-readable reason for a locked branch task.
 */
function buildLockedReason(branchType, cond) {
  const triggerLabels = {
    passed: "passing",
    failed: "failing",
    score_above: `scoring ≥ ${cond.score_threshold ?? 0} pts on`,
    score_below: `scoring < ${cond.score_threshold ?? 100} pts on`,
  };
  const typeLabel = branchType === "advanced" ? "Advanced" : "Remediation";
  return `${typeLabel} task — unlocks after ${
    triggerLabels[cond.trigger] || "completing"
  } the prerequisite task`;
}

/**
 * Get only the unlocked tasks (convenience filter).
 */
export function getUnlockedTasks(tasks, taskResults) {
  return resolveUnlockedTasks(tasks, taskResults).filter((t) => t.unlocked);
}

/**
 * Check if a specific task is unlocked.
 */
export function isTaskUnlocked(taskId, tasks, taskResults) {
  const resolved = resolveUnlockedTasks(tasks, taskResults);
  const task = resolved.find((t) => t.id === taskId);
  return task ? task.unlocked : false;
}