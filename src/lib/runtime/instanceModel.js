import { normalizeTasks } from "../taskModel";
import { normalizeEnvironmentDefinition } from "../environmentModel";
import { buildInitialResults, computeTaskPoints, isTaskPassed } from "./taskValidator";

function sanitizeRuntimeTask(task) {
  const { expected_commands, reference_config, ...runtimeTask } = task || {};
  return runtimeTask;
}

/**
 * Build the immutable runtime snapshot stored on LabInstance.
 * The snapshot intentionally contains only runtime-relevant, provider-independent data.
 */
export function buildTemplateSnapshot(template) {
  const normalizedEnvironment = normalizeEnvironmentDefinition(template?.environment_definition);
  const { _validation_context, ...environmentDefinition } = normalizedEnvironment;

  return {
    title: template?.title || "Untitled Lab",
    description: template?.description || "",
    difficulty: template?.difficulty || "Beginner",
    passing_score: typeof template?.passing_score === "number" ? template.passing_score : 70,
    estimated_duration_minutes: template?.estimated_duration_minutes || 60,
    objectives: Array.isArray(template?.objectives) ? template.objectives : [],
    prerequisites: Array.isArray(template?.prerequisites) ? template.prerequisites : [],
    lab_guidance: template?.lab_guidance || "",
    environment_profile_id: template?.environment_profile_id || "",
    environment_definition: environmentDefinition,
    lab_content: {
      ...(template?.lab_content || {}),
      scenario: template?.lab_content?.scenario || "",
      tasks: normalizeTasks(template?.lab_content?.tasks || []).map(sanitizeRuntimeTask),
      success_criteria: template?.lab_content?.success_criteria || "",
    },
  };
}

export function createInitialTaskResult(task, now = new Date()) {
  return {
    task_id: task.id,
    status: "in_progress",
    points_earned: 0,
    points_possible: typeof task.points === "number" ? task.points : 0,
    hints_used: 0,
    submission: "",
    validation_results: buildInitialResults(task),
    started_at: now.toISOString(),
    submitted_at: undefined,
    time_spent_minutes: 0,
  };
}

export function getTaskResult(taskResults, taskId) {
  return (taskResults || []).find((result) => result?.task_id === taskId) || null;
}

export function upsertTaskResult(taskResults, nextResult) {
  const results = Array.isArray(taskResults) ? taskResults : [];
  const index = results.findIndex((result) => result?.task_id === nextResult?.task_id);
  if (index === -1) return [...results, nextResult];
  return results.map((result, i) => (i === index ? nextResult : result));
}

export function buildUpdatedTaskResult(task, existingResult, patch = {}, now = new Date()) {
  const base = existingResult || createInitialTaskResult(task, now);
  const next = { ...base, ...patch, task_id: task.id };

  if (!next.started_at) next.started_at = now.toISOString();
  const started = Date.parse(next.started_at);
  if (Number.isFinite(started)) {
    next.time_spent_minutes = Math.max(
      next.time_spent_minutes || 0,
      Math.round(((now.getTime() - started) / 60000) * 100) / 100
    );
  }

  const points = computeTaskPoints(task, next);
  next.points_earned = points.points_earned;
  next.points_possible = points.points_possible;

  if (patch.finalize === true) {
    delete next.finalize;
    next.submitted_at = now.toISOString();
    next.status = isTaskPassed(task, next) ? "passed" : "failed";
  } else {
    delete next.finalize;
  }

  return next;
}

export function setCriterionPassed(task, existingResult, checkId, passed, now = new Date()) {
  const base = existingResult || createInitialTaskResult(task, now);
  const authored = task?.validation_criteria || [];
  const criterion = authored.find((c) => c.check === checkId);
  const current = Array.isArray(base.validation_results) ? base.validation_results : buildInitialResults(task);
  const nextValidation = authored.map((c) => {
    const existing = current.find((r) => r.check === c.check) || {
      check: c.check,
      passed: false,
      points_awarded: 0,
      message: "Not yet evaluated",
    };
    if (c.check !== checkId) return existing;
    return {
      ...existing,
      passed: !!passed,
      points_awarded: passed ? (criterion?.points || 0) : 0,
      message: passed ? "Marked passed manually" : "Marked not passed manually",
      source: "manual",
      validated_at: now.toISOString(),
    };
  });

  return buildUpdatedTaskResult(task, base, {
    validation_results: nextValidation,
    status: "in_progress",
  }, now);
}

export function applyCriterionValidationOutcome(
  task,
  existingResult,
  checkId,
  outcome,
  now = new Date()
) {
  const base = existingResult || createInitialTaskResult(task, now);
  const authored = task?.validation_criteria || [];
  const criterion = authored.find((c) => c.check === checkId);
  if (!criterion) return base;

  const current = Array.isArray(base.validation_results)
    ? base.validation_results
    : buildInitialResults(task);

  const nextValidation = authored.map((c) => {
    const existing = current.find((r) => r.check === c.check) || {
      check: c.check,
      passed: false,
      points_awarded: 0,
      message: "Not yet evaluated",
    };
    if (c.check !== checkId) return existing;

    const passed = !!outcome?.passed;
    return {
      ...existing,
      passed,
      points_awarded: passed ? (criterion.points || 0) : 0,
      message: outcome?.message || (passed ? "Runtime validation passed" : "Runtime validation failed"),
      source: "runtime",
      runtime_validator_type: outcome?.validator_type || criterion?.runtime_validator?.type || "",
      evidence: outcome?.evidence || {},
      validated_at: outcome?.validated_at || now.toISOString(),
    };
  });

  return buildUpdatedTaskResult(
    task,
    base,
    {
      validation_results: nextValidation,
      status: base.status === "not_started" ? "in_progress" : (base.status || "in_progress"),
    },
    now
  );
}

export function revealNextHint(task, existingResult, now = new Date()) {
  const maxHints = (task?.hints || []).length;
  const base = existingResult || createInitialTaskResult(task, now);
  return buildUpdatedTaskResult(task, base, {
    hints_used: Math.min((base.hints_used || 0) + 1, maxHints),
    status: base.status === "not_started" ? "in_progress" : (base.status || "in_progress"),
  }, now);
}