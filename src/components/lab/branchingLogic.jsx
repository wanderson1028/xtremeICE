/**
 * Branching Logic Utility
 * Determines which tasks are visible/unlocked for a student
 * based on their current TaskProgress records.
 */

/**
 * Resolves which tasks are unlocked for a student given their task progress.
 *
 * @param {Array} tasks        - All LabTask records for the scenario
 * @param {Array} taskProgress - Student's TaskProgress records for this scenario
 * @returns {Array}            - Tasks annotated with { ...task, unlocked: boolean, branch_locked_reason: string|null }
 */
export function resolveUnlockedTasks(tasks, taskProgress) {
  const progressMap = {};
  taskProgress.forEach(tp => { progressMap[tp.task_id] = tp; });

  return tasks.map(task => {
    if (!task.branch_type || task.branch_type === "standard") {
      return { ...task, unlocked: true, branch_locked_reason: null };
    }

    const cond = task.unlock_condition;
    if (!cond || !cond.depends_on_task_id || !cond.trigger) {
      return { ...task, unlocked: true, branch_locked_reason: null };
    }

    const parentProgress = progressMap[cond.depends_on_task_id];

    if (!parentProgress) {
      const label = task.branch_type === "advanced" ? "Advanced task" : "Remediation task";
      return { ...task, unlocked: false, branch_locked_reason: `${label} — unlocks after completing the prerequisite task` };
    }

    const parentPassed = parentProgress.status === "passed";
    const parentFailed = parentProgress.status === "failed";
    const parentScore = parentProgress.points_earned ?? 0;

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
        unlocked = parentFailed || (parentPassed && parentScore < (cond.score_threshold ?? 100));
        break;
      default:
        unlocked = false;
    }

    const reason = unlocked ? null : buildLockedReason(task.branch_type, cond);
    return { ...task, unlocked, branch_locked_reason: reason };
  });
}

function buildLockedReason(branchType, cond) {
  const triggerLabels = {
    passed: "passing",
    failed: "failing",
    score_above: `scoring ≥ ${cond.score_threshold ?? 0} pts on`,
    score_below: `scoring < ${cond.score_threshold ?? 100} pts on`,
  };
  const typeLabel = branchType === "advanced" ? "Advanced" : "Remediation";
  return `${typeLabel} task — unlocks after ${triggerLabels[cond.trigger] || "completing"} the prerequisite task`;
}