/**
 * Instance Scoring — Raw score calculation (pure functions)
 * ================================================================
 * Calculates the authoritative instance score from LabInstance.task_results.
 *
 * score = (total_points_earned / total_points_possible) * 100
 *
 * No difficulty multiplier is applied to the authoritative score.
 * Difficulty may be used later as a separate derived metric.
 *
 * Honors instructor_override_score at the task-result level: when set,
 * the override supersedes the calculated points_earned for that task.
 *
 * Operates on:
 *   - template_snapshot (with .passing_score and .lab_content.tasks[])
 *   - LabInstance.task_results[]
 *
 * No React state, no entity calls, no side effects.
 *
 * CHECKPOINT: 2026-08-13 — Runtime logic extraction (not wired into UI yet)
 */

import {
  computeTaskPoints,
  isTaskPassed,
} from "./taskValidator.js";
import { resolveUnlockedTasks } from "./branchingResolver.js";

/** Keep persisted percentage scores within the runtime's 0–100 range. */
export function boundScore(score) {
  return Number.isFinite(score) ? Math.min(100, Math.max(0, score)) : 0;
}

/**
 * Calculate the raw instance score, pass/fail, and progress.
 *
 * @param {Object} snapshot    - template_snapshot with lab_content.tasks[] and passing_score
 * @param {Array}  taskResults - LabInstance.task_results[]
 * @returns {{
 *   score: number,              // 0-100, raw (no difficulty multiplier)
 *   points_earned: number,
 *   points_possible: number,
 *   passing_score: number,
 *   passed: boolean,            // score >= passing_score
 *   tasks_passed: number,       // count of tasks that passed validation
 *   tasks_total: number,       // count of tasks that have been interacted with
 *   required_tasks_passed: number,
 *   required_tasks_total: number,
 *   progress: number,           // 0-100, required tasks passed / required tasks total
 * }}
 */
export function calculateInstanceScore(snapshot, taskResults) {
  const authoredTasks = snapshot?.lab_content?.tasks || [];
  const results = taskResults || [];

  // Index task results by task_id for O(1) lookup
  const resultsById = {};
  results.forEach((r) => {
    if (r && r.task_id) resultsById[r.task_id] = r;
  });

  // Adaptive branches that never unlock are not part of the learner's active path
  // and therefore must not count against score/progress. If a branch task already
  // has runtime state, preserve it in scoring even if a later prerequisite change
  // would currently lock it again.
  const tasks = resolveUnlockedTasks(authoredTasks, results).filter(
    (task) => task.unlocked || !!resultsById[task.id]
  );

  let pointsEarned = 0;
  let pointsPossible = 0;
  let tasksPassed = 0;
  let tasksAttempted = 0;
  let requiredTasksPassed = 0;
  let requiredTasksTotal = 0;

  for (const task of tasks) {
    const result = resultsById[task.id];
    const isRequired = task.is_required !== false; // default true

    if (isRequired) {
      requiredTasksTotal++;
    }

    const { points_earned, points_possible } = computeTaskPoints(task, result);
    pointsEarned += points_earned;
    pointsPossible += points_possible;

    if (result) {
      tasksAttempted++;

      if (isTaskPassed(task, result)) {
        tasksPassed++;
        if (isRequired) requiredTasksPassed++;
      }
    }
  }

  const score = boundScore((pointsEarned / pointsPossible) * 100);
  const passingScore =
    typeof snapshot?.passing_score === "number" ? snapshot.passing_score : 70;
  const passed = score >= passingScore;
  const progress =
    requiredTasksTotal > 0 ? (requiredTasksPassed / requiredTasksTotal) * 100 : 0;

  return {
    score: Math.round(score * 100) / 100,
    points_earned: pointsEarned,
    points_possible: pointsPossible,
    passing_score: passingScore,
    passed,
    tasks_passed: tasksPassed,
    tasks_total: tasksAttempted,
    required_tasks_passed: requiredTasksPassed,
    required_tasks_total: requiredTasksTotal,
    progress: Math.round(progress * 100) / 100,
  };
}

/**
 * Determine pass/fail for a raw score against a passing_score threshold.
 * Standalone helper for cases where the full snapshot isn't available.
 */
export function determinePassFail(score, passingScore) {
  const threshold = typeof passingScore === "number" ? passingScore : 70;
  return score >= threshold;
}
