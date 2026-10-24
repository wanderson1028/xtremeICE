/**
 * Task Validator — Runtime validation logic (pure functions)
 * ================================================================
 * Provider-independent evaluation of structured task validation_criteria.
 *
 * Operates on:
 *   - Authored task definitions from template_snapshot.lab_content.tasks[]
 *     (each task has validation_criteria: [{ check, description, points }])
 *   - Runtime task results from LabInstance.task_results[]
 *     (each result has validation_results: [{ check, passed, points_awarded, message }])
 *
 * No React state, no entity calls, no side effects. Every function is pure.
 *
 * CHECKPOINT: 2026-08-13 — Runtime logic extraction (not wired into UI yet)
 */

/**
 * Build initial validation_results from authored validation_criteria.
 * Creates a 1:1 mapping: each criterion → a result with passed=false, points_awarded=0.
 *
 * @param {Object} task - Authored task with validation_criteria[]
 * @returns {Array} validation_results[] matching criteria 1:1
 */
export function buildInitialResults(task) {
  const criteria = task?.validation_criteria || [];
  return criteria.map((c) => ({
    check: c.check || "",
    passed: false,
    points_awarded: 0,
    message: "Not yet evaluated",
  }));
}

/**
 * Reconcile runtime validation_results against authored validation_criteria.
 * Ensures 1:1 mapping by check ID: adds missing results, removes orphaned results.
 * Preserves existing pass/points/message for matched results.
 *
 * @param {Array} authoredCriteria - task.validation_criteria
 * @param {Array} runtimeResults  - taskResult.validation_results
 * @returns {Array} reconciled validation_results matching authored criteria
 */
export function reconcileResults(authoredCriteria, runtimeResults) {
  const criteria = authoredCriteria || [];
  const results = runtimeResults || [];
  const resultsByCheck = {};
  results.forEach((r) => {
    if (r && r.check) resultsByCheck[r.check] = r;
  });

  return criteria.map((c) => {
    const existing = resultsByCheck[c.check];
    if (existing) {
      return {
        check: c.check,
        passed: !!existing.passed,
        points_awarded:
          typeof existing.points_awarded === "number" ? existing.points_awarded : 0,
        message: existing.message || "",
      };
    }
    return {
      check: c.check,
      passed: false,
      points_awarded: 0,
      message: "Not yet evaluated",
    };
  });
}

/**
 * Sum points_awarded across validation_results.
 */
export function sumPointsAwarded(validationResults) {
  return (validationResults || []).reduce(
    (sum, r) => sum + (r?.points_awarded || 0),
    0
  );
}

/**
 * Sum max points across authored validation_criteria (the maximum awardable).
 */
export function sumCriteriaPoints(validationCriteria) {
  return (validationCriteria || []).reduce(
    (sum, c) => sum + (c?.points || 0),
    0
  );
}

/**
 * True if all validation_results passed. Returns false for empty (no criteria = not passed).
 * Use allCriteriaPassedOrEmpty if empty should be vacuously true.
 */
export function allCriteriaPassed(validationResults) {
  const results = validationResults || [];
  if (results.length === 0) return false;
  return results.every((r) => r?.passed);
}

/**
 * True if all validation_results passed, OR if there are no criteria (vacuously true).
 * Use this for tasks with no validation_criteria.
 */
export function allCriteriaPassedOrEmpty(validationResults) {
  const results = validationResults || [];
  if (results.length === 0) return true;
  return results.every((r) => r?.passed);
}

/**
 * Compute points_earned and points_possible for a single task result.
 *
 * points_possible = task.points (the authored weight, default 10).
 *   Falls back to taskResult.points_possible (denormalized at first interaction)
 *   then to sum of criteria points.
 * points_earned = instructor_override_score if set, else sum of points_awarded
 *   across reconciled validation_results.
 *
 * @param {Object} task       - Authored task from template_snapshot.lab_content.tasks[]
 * @param {Object} taskResult - Runtime result from LabInstance.task_results[]
 * @returns {{points_earned: number, points_possible: number}}
 */
export function computeTaskPoints(task, taskResult) {
  const criteria = task?.validation_criteria || [];
  const results = reconcileResults(criteria, taskResult?.validation_results);

  // points_possible: prefer authored task.points, then denormalized, then criteria sum
  const taskWeight =
    typeof task?.points === "number" ? task.points : 0;
  const denormalized =
    typeof taskResult?.points_possible === "number" ? taskResult.points_possible : 0;
  const criteriaSum = sumCriteriaPoints(criteria);
  const pointsPossible = taskWeight || denormalized || criteriaSum;

  // points_earned: instructor override supersedes calculated
  if (typeof taskResult?.instructor_override_score === "number") {
    return {
      points_earned: taskResult.instructor_override_score,
      points_possible: pointsPossible,
    };
  }

  return {
    points_earned: sumPointsAwarded(results),
    points_possible: pointsPossible,
  };
}

/**
 * Determine if a task passed validation (all criteria passed, or no criteria).
 * Does NOT consider instructor_override_score — that affects points, not criteria pass/fail.
 *
 * @param {Object} task       - Authored task
 * @param {Object} taskResult - Runtime result
 * @returns {boolean}
 */
export function isTaskPassed(task, taskResult) {
  const criteria = task?.validation_criteria || [];
  const results = reconcileResults(criteria, taskResult?.validation_results);
  return allCriteriaPassedOrEmpty(results);
}