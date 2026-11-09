/**
 * Runtime Modules — Focused Tests
 * ================================================================
 * Pure-function verification for taskValidator, instanceScoring,
 * branchingResolver, and the Phase 2 taskModel helpers
 * (cycle prevention, lab validation, deletion reset, branch summary).
 *
 * These tests use a minimal assert() harness (no external test runner).
 * Run via: import { runAllTests } from this file; runAllTests();
 *
 * CHECKPOINT: 2026-08-13 — Runtime logic extraction + Phase 2
 */

import {
  buildInitialResults,
  reconcileResults,
  sumPointsAwarded,
  sumCriteriaPoints,
  allCriteriaPassed,
  allCriteriaPassedOrEmpty,
  computeTaskPoints,
  isTaskPassed,
} from "../taskValidator";
import {
  calculateInstanceScore,
  determinePassFail,
} from "../instanceScoring";
import {
  resolveUnlockedTasks,
  getUnlockedTasks,
  isTaskUnlocked,
} from "../branchingResolver";
import {
  applyCriterionValidationOutcome,
  buildTemplateSnapshot,
  buildUpdatedTaskResult,
  setCriterionPassed,
  upsertTaskResult,
} from "../instanceModel";
import { assessKasmBinding, buildKasmBinding } from "../../providers/kasmBinding";
import {
  normalizeTask,
  normalizeTasks,
  createBlankTask,
  getInvalidPrerequisiteIds,
  validateLabContent,
  resetBranchTasksForDeletedTask,
  buildBranchSummary,
} from "../../taskModel";

// ── Test harness ────────────────────────────────────────────────────────
let _pass = 0;
let _fail = 0;

function assert(condition, label) {
  if (condition) {
    _pass++;
  } else {
    _fail++;
    console.error(`FAIL: ${label}`);
  }
}

function approxEq(a, b, eps = 0.01) {
  return Math.abs(a - b) < eps;
}

// ── Representative test data ────────────────────────────────────────────

/** A snapshot with 3 tasks: two required, one optional, with validation criteria. */
const SNAPSHOT = {
  title: "Router Security Hardening",
  difficulty: "Intermediate",
  passing_score: 70,
  estimated_duration_minutes: 90,
  lab_content: {
    scenario: "Secure a branch router...",
    tasks: [
      {
        id: "task_a",
        title: "Configure ACL",
        points: 10,
        is_required: true,
        validation_criteria: [
          { check: "acl_exists", description: "ACL 101 exists", points: 5 },
          { check: "acl_applied", description: "ACL applied to interface", points: 5 },
        ],
      },
      {
        id: "task_b",
        title: "Verify SSH",
        points: 20,
        is_required: true,
        validation_criteria: [
          { check: "ssh_enabled", description: "SSH v2 enabled", points: 10 },
          { check: "ssh_key_set", description: "RSA key generated", points: 10 },
        ],
      },
      {
        id: "task_c",
        title: "Bonus: Logging",
        points: 5,
        is_required: false,
        validation_criteria: [
          { check: "logging_on", description: "Logging enabled", points: 5 },
        ],
      },
    ],
    success_criteria: "All required tasks pass.",
  },
};

// ── taskValidator tests ────────────────────────────────────────────────

function testBuildInitialResults() {
  const results = buildInitialResults(SNAPSHOT.lab_content.tasks[0]);
  assert(results.length === 2, "buildInitialResults: 2 criteria → 2 results");
  assert(results.every((r) => r.passed === false), "buildInitialResults: all passed=false");
  assert(results.every((r) => r.points_awarded === 0), "buildInitialResults: all points_awarded=0");
}

function testReconcileResults() {
  const task = SNAPSHOT.lab_content.tasks[0];
  // Runtime results: first check passed, second missing
  const runtimeResults = [
    { check: "acl_exists", passed: true, points_awarded: 5, message: "Verified" },
  ];
  const reconciled = reconcileResults(task.validation_criteria, runtimeResults);
  assert(reconciled.length === 2, "reconcileResults: adds missing criterion");
  assert(reconciled[0].passed === true, "reconcileResults: preserves existing pass");
  assert(reconciled[1].passed === false, "reconcileResults: missing = not passed");
  assert(reconciled[1].points_awarded === 0, "reconcileResults: missing = 0 points");
}

function testReconcileOrphans() {
  const task = SNAPSHOT.lab_content.tasks[0];
  // Runtime has an orphan result for a check that no longer exists in authored criteria
  const runtimeResults = [
    { check: "acl_exists", passed: true, points_awarded: 5 },
    { check: "old_check", passed: true, points_awarded: 99 },
  ];
  const reconciled = reconcileResults(task.validation_criteria, runtimeResults);
  assert(reconciled.length === 2, "reconcileResults: removes orphaned results");
  assert(!reconciled.find((r) => r.check === "old_check"), "reconcileResults: orphan not present");
}

function testSumPoints() {
  assert(sumPointsAwarded([{ points_awarded: 5 }, { points_awarded: 3 }]) === 8, "sumPointsAwarded");
  assert(sumPointsAwarded([]) === 0, "sumPointsAwarded: empty");
  assert(sumCriteriaPoints([{ points: 5 }, { points: 5 }]) === 10, "sumCriteriaPoints");
}

function testAllCriteriaPassed() {
  assert(allCriteriaPassed([{ passed: true }, { passed: true }]) === true, "allCriteriaPassed: all true");
  assert(allCriteriaPassed([{ passed: true }, { passed: false }]) === false, "allCriteriaPassed: one false");
  assert(allCriteriaPassed([]) === false, "allCriteriaPassed: empty → false");
  assert(allCriteriaPassedOrEmpty([]) === true, "allCriteriaPassedOrEmpty: empty → true");
}

function testComputeTaskPoints() {
  const task = SNAPSHOT.lab_content.tasks[0]; // points: 10, criteria: 5+5
  const taskResult = {
    task_id: "task_a",
    validation_results: [
      { check: "acl_exists", passed: true, points_awarded: 5 },
      { check: "acl_applied", passed: true, points_awarded: 5 },
    ],
  };
  const pts = computeTaskPoints(task, taskResult);
  assert(pts.points_earned === 10, "computeTaskPoints: full credit");
  assert(pts.points_possible === 10, "computeTaskPoints: possible = task.points");
}

function testComputeTaskPointsPartial() {
  const task = SNAPSHOT.lab_content.tasks[0];
  const taskResult = {
    task_id: "task_a",
    validation_results: [
      { check: "acl_exists", passed: true, points_awarded: 5 },
      { check: "acl_applied", passed: false, points_awarded: 0 },
    ],
  };
  const pts = computeTaskPoints(task, taskResult);
  assert(pts.points_earned === 5, "computeTaskPoints: partial credit = 5");
  assert(pts.points_possible === 10, "computeTaskPoints: possible still 10");
}

function testInstructorOverride() {
  const task = SNAPSHOT.lab_content.tasks[0]; // points: 10
  const taskResult = {
    task_id: "task_a",
    instructor_override_score: 8,
    validation_results: [
      { check: "acl_exists", passed: false, points_awarded: 0 },
      { check: "acl_applied", passed: false, points_awarded: 0 },
    ],
  };
  const pts = computeTaskPoints(task, taskResult);
  assert(pts.points_earned === 8, "instructor_override: supersedes calculated (0 → 8)");
  assert(pts.points_possible === 10, "instructor_override: possible unchanged");
}

function testIsTaskPassed() {
  const task = SNAPSHOT.lab_content.tasks[0];
  const passed = {
    task_id: "task_a",
    validation_results: [
      { check: "acl_exists", passed: true, points_awarded: 5 },
      { check: "acl_applied", passed: true, points_awarded: 5 },
    ],
  };
  const failed = {
    task_id: "task_a",
    validation_results: [
      { check: "acl_exists", passed: true, points_awarded: 5 },
      { check: "acl_applied", passed: false, points_awarded: 0 },
    ],
  };
  assert(isTaskPassed(task, passed) === true, "isTaskPassed: all criteria → true");
  assert(isTaskPassed(task, failed) === false, "isTaskPassed: one failed → false");
}

// ── instanceScoring tests ──────────────────────────────────────────────

function testEmptyInstance() {
  const result = calculateInstanceScore(SNAPSHOT, []);
  assert(result.score === 0, "empty instance: score 0");
  assert(result.points_earned === 0, "empty instance: earned 0");
  assert(result.points_possible === 35, "empty instance: possible = 10+20+5");
  assert(result.passed === false, "empty instance: not passed (0 < 70)");
  assert(result.progress === 0, "empty instance: progress 0");
  assert(result.required_tasks_total === 2, "empty instance: 2 required tasks");
}

function testPerfectInstance() {
  const taskResults = [
    {
      task_id: "task_a",
      validation_results: [
        { check: "acl_exists", passed: true, points_awarded: 5 },
        { check: "acl_applied", passed: true, points_awarded: 5 },
      ],
    },
    {
      task_id: "task_b",
      validation_results: [
        { check: "ssh_enabled", passed: true, points_awarded: 10 },
        { check: "ssh_key_set", passed: true, points_awarded: 10 },
      ],
    },
    {
      task_id: "task_c",
      validation_results: [
        { check: "logging_on", passed: true, points_awarded: 5 },
      ],
    },
  ];
  const result = calculateInstanceScore(SNAPSHOT, taskResults);
  assert(approxEq(result.score, 100), "perfect: score 100");
  assert(result.points_earned === 35, "perfect: earned 35");
  assert(result.points_possible === 35, "perfect: possible 35");
  assert(result.passed === true, "perfect: passed");
  assert(result.tasks_passed === 3, "perfect: 3 tasks passed");
  assert(result.progress === 100, "perfect: progress 100");
}

function testPartialInstance() {
  // task_a: full credit (10/10, passed)
  // task_b: half credit (10/20, not passed)
  // task_c: not attempted
  const taskResults = [
    {
      task_id: "task_a",
      validation_results: [
        { check: "acl_exists", passed: true, points_awarded: 5 },
        { check: "acl_applied", passed: true, points_awarded: 5 },
      ],
    },
    {
      task_id: "task_b",
      validation_results: [
        { check: "ssh_enabled", passed: true, points_awarded: 10 },
        { check: "ssh_key_set", passed: false, points_awarded: 0 },
      ],
    },
  ];
  const result = calculateInstanceScore(SNAPSHOT, taskResults);
  // score = (10 + 10) / 35 * 100 = 57.14
  assert(approxEq(result.score, 57.14), "partial: score ~57.14");
  assert(result.points_earned === 20, "partial: earned 20");
  assert(result.points_possible === 35, "partial: possible 35");
  assert(result.passed === false, "partial: 57.14 < 70 → not passed");
  assert(result.tasks_passed === 1, "partial: 1 task passed (task_a)");
  assert(result.required_tasks_passed === 1, "partial: 1 required passed");
  assert(result.required_tasks_total === 2, "partial: 2 required total");
  assert(approxEq(result.progress, 50), "partial: progress 50%");
}

function testInstructorOverrideScoring() {
  // task_a: auto-validated as failed (0 points) but instructor overrides to 10
  // task_b: not attempted
  // task_c: not attempted
  const taskResults = [
    {
      task_id: "task_a",
      instructor_override_score: 10,
      validation_results: [
        { check: "acl_exists", passed: false, points_awarded: 0 },
        { check: "acl_applied", passed: false, points_awarded: 0 },
      ],
    },
  ];
  const result = calculateInstanceScore(SNAPSHOT, taskResults);
  // score = 10 / 35 * 100 = 28.57
  assert(approxEq(result.score, 28.57), "override: score ~28.57");
  assert(result.points_earned === 10, "override: earned 10 (from override)");
  assert(result.points_possible === 35, "override: possible 35");
  assert(result.passed === false, "override: 28.57 < 70 → not passed");
}

function testDeterminePassFail() {
  assert(determinePassFail(75, 70) === true, "determinePassFail: 75 >= 70 → true");
  assert(determinePassFail(70, 70) === true, "determinePassFail: 70 >= 70 → true (boundary)");
  assert(determinePassFail(69.9, 70) === false, "determinePassFail: 69.9 < 70 → false");
  assert(determinePassFail(100, undefined) === true, "determinePassFail: default threshold 70");
}

function testNoDifficultyMultiplier() {
  // Even an Expert-difficulty snapshot should produce raw percentage score
  const expertSnapshot = { ...SNAPSHOT, difficulty: "Expert" };
  const taskResults = [
    {
      task_id: "task_a",
      validation_results: [
        { check: "acl_exists", passed: true, points_awarded: 5 },
        { check: "acl_applied", passed: true, points_awarded: 5 },
      ],
    },
  ];
  const result = calculateInstanceScore(expertSnapshot, taskResults);
  // score = 10 / 35 * 100 = 28.57 — no multiplier applied
  assert(approxEq(result.score, 28.57), "no multiplier: Expert score = raw percentage");
}

// ── branchingResolver tests ───────────────────────────────────────────

// Legacy form: depends_on_task_id nested inside unlock_condition (fallback path)
const BRANCH_TASKS_LEGACY = [
  { id: "t1", title: "Standard Task", points: 10 }, // no branch_type → standard
  {
    id: "t2",
    title: "Advanced Task",
    points: 20,
    branch_type: "advanced",
    unlock_condition: { depends_on_task_id: "t1", trigger: "passed" },
  },
  {
    id: "t3",
    title: "Remediation Task",
    points: 10,
    branch_type: "remediation",
    unlock_condition: { depends_on_task_id: "t1", trigger: "failed" },
  },
];

// Phase 2 form: depends_on_task_id at the task level (primary path)
const BRANCH_TASKS_P2 = [
  { id: "t1", title: "Standard Task", points: 10 },
  {
    id: "t2",
    title: "Advanced Task",
    points: 20,
    branch_type: "advanced",
    depends_on_task_id: "t1",
    unlock_condition: { trigger: "passed" },
  },
  {
    id: "t3",
    title: "Remediation Task",
    points: 10,
    branch_type: "remediation",
    depends_on_task_id: "t1",
    unlock_condition: { trigger: "failed" },
  },
];

function testStandardTasksUnlocked() {
  const resolved = resolveUnlockedTasks(BRANCH_TASKS_LEGACY, []);
  assert(resolved[0].unlocked === true, "branch: standard task unlocked");
  assert(resolved[0].branch_locked_reason === null, "branch: standard no reason");
}

function testBranchLockedWithoutParent() {
  const resolved = resolveUnlockedTasks(BRANCH_TASKS_LEGACY, []);
  assert(resolved[1].unlocked === false, "branch: advanced locked without parent result");
  assert(resolved[1].branch_locked_reason !== null, "branch: advanced has reason");
  assert(resolved[2].unlocked === false, "branch: remediation locked without parent result");
}

function testBranchUnlockedOnParentPassed() {
  const taskResults = [{ task_id: "t1", status: "passed", points_earned: 10 }];
  const resolved = resolveUnlockedTasks(BRANCH_TASKS_LEGACY, taskResults);
  assert(resolved[1].unlocked === true, "branch: advanced unlocked when parent passed");
  assert(resolved[2].unlocked === false, "branch: remediation still locked when parent passed");
}

function testBranchUnlockedOnParentFailed() {
  const taskResults = [{ task_id: "t1", status: "failed", points_earned: 0 }];
  const resolved = resolveUnlockedTasks(BRANCH_TASKS_LEGACY, taskResults);
  assert(resolved[1].unlocked === false, "branch: advanced locked when parent failed");
  assert(resolved[2].unlocked === true, "branch: remediation unlocked when parent failed");
}

function testScoreAboveTrigger() {
  const tasks = [
    {
      id: "t1",
      title: "Parent",
      points: 10,
    },
    {
      id: "t2",
      title: "Score-gated",
      points: 20,
      branch_type: "advanced",
      unlock_condition: { depends_on_task_id: "t1", trigger: "score_above", score_threshold: 8 },
    },
  ];
  // Parent passed with 10 points → t2 unlocked (10 >= 8)
  const passed = resolveUnlockedTasks(tasks, [{ task_id: "t1", status: "passed", points_earned: 10 }]);
  assert(passed[1].unlocked === true, "branch: score_above unlocked (10 >= 8)");

  // Parent passed with 5 points → t2 locked (5 < 8)
  const lowScore = resolveUnlockedTasks(tasks, [{ task_id: "t1", status: "passed", points_earned: 5 }]);
  assert(lowScore[1].unlocked === false, "branch: score_above locked (5 < 8)");
}

// ── Phase 2: primary depends_on_task_id path + boundary tests ──────────

function testPhase2PrimaryDependencyPath() {
  // Phase 2 form: depends_on_task_id at task level (no nested fallback)
  const resolved = resolveUnlockedTasks(BRANCH_TASKS_P2, [{ task_id: "t1", status: "passed", points_earned: 10 }]);
  assert(resolved[1].unlocked === true, "phase2: advanced unlocked via task-level depends_on_task_id");
  assert(resolved[2].unlocked === false, "phase2: remediation locked when parent passed");
}

function testScoreAboveBoundary() {
  // Boundary: score exactly == threshold should unlock (>=)
  const tasks = [
    { id: "t1", title: "Parent", points: 10 },
    {
      id: "t2",
      title: "Gated",
      points: 10,
      branch_type: "advanced",
      depends_on_task_id: "t1",
      unlock_condition: { trigger: "score_above", score_threshold: 8 },
    },
  ];
  const exact = resolveUnlockedTasks(tasks, [{ task_id: "t1", status: "passed", points_earned: 8 }]);
  assert(exact[1].unlocked === true, "phase2: score_above boundary (8 == 8) unlocks");

  const below = resolveUnlockedTasks(tasks, [{ task_id: "t1", status: "passed", points_earned: 7 }]);
  assert(below[1].unlocked === false, "phase2: score_above below (7 < 8) locked");
}

function testScoreBelowBoundary() {
  // score_below: unlocks when failed OR (passed AND points < threshold)
  const tasks = [
    { id: "t1", title: "Parent", points: 10 },
    {
      id: "t2",
      title: "Remediation",
      points: 10,
      branch_type: "remediation",
      depends_on_task_id: "t1",
      unlock_condition: { trigger: "score_below", score_threshold: 8 },
    },
  ];
  // Passed with 7 points (< 8) → unlocked
  const lowPass = resolveUnlockedTasks(tasks, [{ task_id: "t1", status: "passed", points_earned: 7 }]);
  assert(lowPass[1].unlocked === true, "phase2: score_below unlocked (passed 7 < 8)");

  // Passed with 8 points (== 8, NOT < 8) → locked
  const exactPass = resolveUnlockedTasks(tasks, [{ task_id: "t1", status: "passed", points_earned: 8 }]);
  assert(exactPass[1].unlocked === false, "phase2: score_below locked (passed 8 == 8, not <)");

  // Failed → unlocked regardless
  const failed = resolveUnlockedTasks(tasks, [{ task_id: "t1", status: "failed", points_earned: 0 }]);
  assert(failed[1].unlocked === true, "phase2: score_below unlocked (failed)");
}

function testGetUnlockedTasks() {
  const taskResults = [{ task_id: "t1", status: "passed", points_earned: 10 }];
  const unlocked = getUnlockedTasks(BRANCH_TASKS_LEGACY, taskResults);
  assert(unlocked.length === 2, "getUnlockedTasks: standard + advanced unlocked");
  assert(unlocked.some((t) => t.id === "t1"), "getUnlockedTasks: includes t1");
  assert(unlocked.some((t) => t.id === "t2"), "getUnlockedTasks: includes t2");
}

function testIsTaskUnlocked() {
  const taskResults = [{ task_id: "t1", status: "passed", points_earned: 10 }];
  assert(isTaskUnlocked("t1", BRANCH_TASKS_LEGACY, taskResults) === true, "isTaskUnlocked: t1 true");
  assert(isTaskUnlocked("t2", BRANCH_TASKS_LEGACY, taskResults) === true, "isTaskUnlocked: t2 true");
  assert(isTaskUnlocked("t3", BRANCH_TASKS_LEGACY, taskResults) === false, "isTaskUnlocked: t3 false");
  assert(isTaskUnlocked("nonexistent", BRANCH_TASKS_LEGACY, taskResults) === false, "isTaskUnlocked: missing → false");
}

function testNoPhase2Fields() {
  // Tasks without branch_type/unlock_condition (pre-Phase-2 data) → all unlocked
  const tasks = [
    { id: "t1", title: "Task 1", points: 10 },
    { id: "t2", title: "Task 2", points: 10 },
  ];
  const resolved = resolveUnlockedTasks(tasks, []);
  assert(resolved.every((t) => t.unlocked === true), "no Phase 2 fields: all unlocked");
}

// ── Phase 2: normalizeTask linear-default + preservation ──────────────

function testNormalizeTaskLinearDefaults() {
  const blank = createBlankTask(0);
  assert(blank.branch_type === "standard", "normalize: blank task is standard");
  assert(blank.depends_on_task_id === undefined, "normalize: blank has no dependency");
  assert(blank.unlock_condition === undefined, "normalize: blank has no unlock_condition");
  assert(Array.isArray(blank.expected_commands) && blank.expected_commands.length === 0, "normalize: blank expected_commands []");
  assert(blank.reference_config === undefined, "normalize: blank reference_config undefined");
}

function testNormalizeTaskPreservesDanglingBranch() {
  // Modification 1: dangling depends_on_task_id is PRESERVED, not downgraded.
  const task = {
    id: "t9",
    title: "Orphaned branch",
    branch_type: "advanced",
    depends_on_task_id: "ghost_task",
    unlock_condition: { trigger: "passed" },
  };
  const n = normalizeTask(task, 0);
  assert(n.branch_type === "advanced", "normalize: dangling branch_type preserved");
  assert(n.depends_on_task_id === "ghost_task", "normalize: dangling depends_on_task_id preserved");
  assert(n.unlock_condition.trigger === "passed", "normalize: dangling unlock_condition preserved");
}

function testNormalizeTaskStripsInvalidBranchType() {
  const n = normalizeTask({ id: "x", title: "X", branch_type: "weird" }, 0);
  assert(n.branch_type === "standard", "normalize: invalid branch_type → standard");
}

// ── Phase 2: cycle prevention ──────────────────────────────────────────

function testCyclePreventionBlocksSelfAndDescendants() {
  // t2 depends on t1; asking what t1 can't depend on → must include t2 (and t1 itself).
  const tasks = [
    { id: "t1", title: "T1", points: 10 },
    { id: "t2", title: "T2", points: 10, depends_on_task_id: "t1" },
    { id: "t3", title: "T3", points: 10, depends_on_task_id: "t2" },
  ];
  const invalid = getInvalidPrerequisiteIds(tasks, "t1");
  assert(invalid.has("t1"), "cycle: self is invalid");
  assert(invalid.has("t2"), "cycle: direct dependent is invalid");
  assert(invalid.has("t3"), "cycle: transitive dependent is invalid");
}

function testCyclePreventionAllowsUnrelated() {
  const tasks = [
    { id: "t1", title: "T1", points: 10 },
    { id: "t2", title: "T2", points: 10 },
    { id: "t3", title: "T3", points: 10, depends_on_task_id: "t1" },
  ];
  // t2 is unrelated to t1's dependency chain → valid as t1's prerequisite.
  const invalid = getInvalidPrerequisiteIds(tasks, "t1");
  assert(!invalid.has("t2"), "cycle: unrelated task is valid");
}

function testValidateLabContentDetectsCycle() {
  // A→B→A cycle (only possible via external/AI data; UI prevents selection)
  const cyclic = {
    tasks: [
      { id: "a", title: "A", points: 10, branch_type: "advanced", depends_on_task_id: "b", unlock_condition: { trigger: "passed" } },
      { id: "b", title: "B", points: 10, branch_type: "advanced", depends_on_task_id: "a", unlock_condition: { trigger: "passed" } },
    ],
  };
  const { errors } = validateLabContent(cyclic);
  assert(errors.some((e) => e.toLowerCase().includes("circular")), "validate: cycle → error");
}

function testValidateLabContentDanglingWarning() {
  // Modification 1: dangling reference → warning (not error), branch preserved.
  const lab = {
    tasks: [
      { id: "t1", title: "T1", points: 10, branch_type: "advanced", depends_on_task_id: "ghost", unlock_condition: { trigger: "passed" } },
    ],
  };
  const { warnings, errors } = validateLabContent(lab);
  assert(warnings.some((w) => w.toLowerCase().includes("missing")), "validate: dangling → warning");
  assert(errors.length === 0, "validate: dangling is not an error (preserved)");
}

function testValidateLabContentSelfReferenceError() {
  const lab = {
    tasks: [
      { id: "t1", title: "T1", points: 10, branch_type: "advanced", depends_on_task_id: "t1", unlock_condition: { trigger: "passed" } },
    ],
  };
  const { errors } = validateLabContent(lab);
  assert(errors.some((e) => e.toLowerCase().includes("itself")), "validate: self-reference → error");
}

function testValidateLabContentThresholdRangeWarning() {
  const lab = {
    tasks: [
      { id: "t1", title: "Parent", points: 10 },
      {
        id: "t2",
        title: "Gated",
        points: 10,
        branch_type: "advanced",
        depends_on_task_id: "t1",
        unlock_condition: { trigger: "score_above", score_threshold: 50 },
      },
    ],
  };
  const { warnings } = validateLabContent(lab);
  assert(warnings.some((w) => w.toLowerCase().includes("threshold")), "validate: threshold out of range → warning");
}

function testValidateLabContentIncompleteBranchWarning() {
  const lab = {
    tasks: [
      { id: "t1", title: "T1", points: 10, branch_type: "advanced", unlock_condition: { trigger: "passed" } },
    ],
  };
  const { warnings } = validateLabContent(lab);
  assert(warnings.some((w) => w.toLowerCase().includes("no prerequisite")), "validate: incomplete branch → warning");
}

function testValidateLabContentCleanLinear() {
  const lab = {
    tasks: [
      { id: "t1", title: "T1", points: 10, branch_type: "standard" },
      { id: "t2", title: "T2", points: 10, branch_type: "standard" },
    ],
  };
  const { warnings, errors } = validateLabContent(lab);
  assert(warnings.length === 0 && errors.length === 0, "validate: linear lab → clean");
}

// ── Phase 2: deletion handling ─────────────────────────────────────────

function testResetBranchTasksOnDeletion() {
  const tasks = [
    { id: "t1", title: "Parent", points: 10 },
    { id: "t2", title: "Advanced", points: 20, branch_type: "advanced", depends_on_task_id: "t1", unlock_condition: { trigger: "passed" } },
    { id: "t3", title: "Remediation", points: 10, branch_type: "remediation", depends_on_task_id: "t1", unlock_condition: { trigger: "failed" } },
    { id: "t4", title: "Unrelated", points: 10 },
  ];
  const { tasks: next, resetCount } = resetBranchTasksForDeletedTask(tasks, "t1");
  assert(resetCount === 2, "deletion: 2 branch tasks reset");
  const t2 = next.find((t) => t.id === "t2");
  const t3 = next.find((t) => t.id === "t3");
  const t4 = next.find((t) => t.id === "t4");
  assert(t2.branch_type === "standard", "deletion: t2 downgraded to standard");
  assert(t2.depends_on_task_id === undefined, "deletion: t2 dependency cleared");
  assert(t2.unlock_condition === undefined, "deletion: t2 unlock_condition cleared");
  assert(t3.branch_type === "standard", "deletion: t3 downgraded to standard");
  assert(t4.branch_type === "standard", "deletion: unrelated task untouched (already standard)");
}

function testResetBranchTasksNoMatch() {
  const tasks = [
    { id: "t1", title: "T1", points: 10 },
    { id: "t2", title: "T2", points: 10, branch_type: "advanced", depends_on_task_id: "t1", unlock_condition: { trigger: "passed" } },
  ];
  const { resetCount } = resetBranchTasksForDeletedTask(tasks, "nonexistent");
  assert(resetCount === 0, "deletion: no match → 0 reset");
}

// ── Phase 2: branch summary ────────────────────────────────────────────

function testBuildBranchSummaryStandard() {
  const tasks = [{ id: "t1", title: "T1", points: 10 }];
  assert(buildBranchSummary(tasks[0], tasks) === null, "summary: standard → null");
}

function testBuildBranchSummaryAdvanced() {
  const tasks = [
    { id: "t1", title: "Configure OSPF", points: 10 },
    {
      id: "t2",
      title: "Stretch Task",
      points: 20,
      branch_type: "advanced",
      depends_on_task_id: "t1",
      unlock_condition: { trigger: "passed" },
    },
  ];
  const s = buildBranchSummary(tasks[1], tasks);
  assert(s !== null && s.includes("Advanced"), "summary: advanced includes type label");
  assert(s.includes("Configure OSPF"), "summary: includes prereq title");
}

function testBuildBranchSummaryDangling() {
  const tasks = [
    {
      id: "t2",
      title: "Orphan",
      points: 10,
      branch_type: "remediation",
      depends_on_task_id: "ghost",
      unlock_condition: { trigger: "failed" },
    },
  ];
  const s = buildBranchSummary(tasks[0], tasks);
  assert(s !== null && s.toLowerCase().includes("missing"), "summary: dangling mentions missing");
}

// ── Native Runner Preview / instanceModel ─────────────────────────────

function testLockedBranchExcludedFromScore() {
  const snapshot = {
    passing_score: 70,
    lab_content: {
      tasks: [
        {
          id: "parent",
          title: "Parent",
          points: 10,
          is_required: true,
          validation_criteria: [{ check: "parent_ok", points: 10 }],
        },
        {
          id: "remediate",
          title: "Remediation",
          points: 10,
          is_required: true,
          branch_type: "remediation",
          depends_on_task_id: "parent",
          unlock_condition: { trigger: "failed" },
          validation_criteria: [{ check: "retry_ok", points: 10 }],
        },
      ],
    },
  };
  const results = [{
    task_id: "parent",
    status: "passed",
    validation_results: [{ check: "parent_ok", passed: true, points_awarded: 10 }],
    points_possible: 10,
  }];
  const score = calculateInstanceScore(snapshot, results);
  assert(score.score === 100, "native runner: locked remediation branch excluded from score");
  assert(score.required_tasks_total === 1, "native runner: locked remediation branch excluded from progress denominator");
}

function testTemplateSnapshotIncludesEnvironment() {
  const snapshot = buildTemplateSnapshot({
    title: "Preview Lab",
    version: "2.0",
    objectives: ["Investigate an alert"],
    lab_content: { scenario: "Scenario", tasks: [], success_criteria: "Done" },
    environment_definition: {
      resources: [{ name: "Analyst", resource_type: "workstation", os_type: "Ubuntu" }],
      networks: [],
      connections: [],
    },
  });
  assert(snapshot.title === "Preview Lab", "native runner: snapshot preserves title");
  assert(snapshot.objectives.length === 1, "native runner: snapshot preserves objectives");
  assert(snapshot.environment_definition.resources.length === 1, "native runner: snapshot preserves environment resources");
  assert(!!snapshot.environment_definition.resources[0].id, "native runner: snapshot normalizes stable resource IDs");
  assert(snapshot.environment_definition._validation_context === undefined, "native runner: snapshot strips internal environment validation context");
}

function testTemplateSnapshotStripsInstructorOnlyTaskFields() {
  const snapshot = buildTemplateSnapshot({
    title: "Secure Preview",
    lab_content: {
      scenario: "Scenario",
      tasks: [{
        id: "t_secure",
        title: "Do the thing",
        instructions: "Learner instructions",
        expected_commands: ["secret-command --answer"],
        reference_config: "enable\nconfigure terminal\nsecret answer",
      }],
      success_criteria: "Done",
    },
  });
  const task = snapshot.lab_content.tasks[0];
  assert(task.expected_commands === undefined, "native runner: snapshot strips expected commands from learner runtime");
  assert(task.reference_config === undefined, "native runner: snapshot strips reference configuration from learner runtime");
}

function testKasmBindingSingleResourceReady() {
  const env = {
    resources: [{
      id: "res_kali",
      name: "Kali",
      resource_type: "workstation",
      os_type: "Kali Linux",
      cpu_cores: 2,
      memory_mb: 4096,
      storage_gb: 20,
      tools: ["nmap"],
      access_method: "web_terminal",
    }],
    networks: [{ id: "net_internal", name: "Internal" }],
    identity_requirements: {},
  };
  const profile = {
    id: "profile_kali",
    name: "Kali Kasm",
    is_active: true,
    kasm_image_id: "image-123",
    kasm_image_name: "Kali",
    os_type: "Kali",
    cpu_cores: 2,
    memory_mb: 4096,
    storage_gb: 20,
    pre_installed_tools: ["nmap"],
  };
  const assessment = assessKasmBinding(env, profile);
  assert(assessment.ready === true, "provider binding: compatible single Kasm resource is ready");
  assert(assessment.launch_ready === true, "provider binding: verified image ID makes the Kasm binding launch-ready");
  const binding = buildKasmBinding(env, profile);
  assert(binding.provider === "kasm", "provider binding: resolved provider is Kasm");
  assert(binding.resource_id === "res_kali", "provider binding: preserves authored resource identity");
  assert(binding.resolved.kasm_image_id === "image-123", "provider binding: resolves Kasm image ID");
}

function testKasmBindingCompatibleButNotLaunchReadyWithoutImageId() {
  const env = {
    resources: [{
      id: "res_kali",
      resource_type: "workstation",
      os_type: "Kali Linux",
      cpu_cores: 2,
      memory_mb: 4096,
      storage_gb: 20,
    }],
    networks: [],
    identity_requirements: {},
  };
  const profile = {
    id: "profile_kali",
    is_active: true,
    kasm_image_name: "Kali",
    kasm_image_source: "kasmweb/kali",
    os_type: "Kali",
    cpu_cores: 2,
    memory_mb: 4096,
    storage_gb: 20,
  };
  const assessment = assessKasmBinding(env, profile);
  assert(assessment.ready === true, "provider binding: profile can be structurally compatible without a live image ID");
  assert(assessment.launch_ready === false, "provider binding: missing live image ID blocks launch readiness");
  assert(assessment.warnings.some((message) => message.includes("live Kasm image identifier")), "provider binding: missing live image ID is explained");
}

function testKasmBindingRejectsMultiResourceV1() {
  const env = {
    resources: [
      { id: "one", resource_type: "workstation" },
      { id: "two", resource_type: "server" },
    ],
    networks: [],
    identity_requirements: {},
  };
  const profile = { id: "profile", is_active: true, kasm_image_id: "img" };
  const assessment = assessKasmBinding(env, profile);
  assert(assessment.ready === false, "provider binding: v1 rejects multi-resource environments");
  assert(assessment.errors.some((message) => message.includes("exactly one resource")), "provider binding: explains v1 single-resource limit");
}

function testKasmBindingRejectsUndersizedProfile() {
  const env = {
    resources: [{
      id: "res",
      resource_type: "workstation",
      cpu_cores: 4,
      memory_mb: 8192,
      storage_gb: 40,
    }],
    networks: [],
    identity_requirements: {},
  };
  const profile = {
    id: "profile",
    is_active: true,
    kasm_image_id: "img",
    cpu_cores: 2,
    memory_mb: 4096,
    storage_gb: 20,
  };
  const assessment = assessKasmBinding(env, profile);
  assert(assessment.ready === false, "provider binding: rejects undersized profile");
  assert(assessment.errors.length >= 3, "provider binding: reports resource sizing mismatches");
}

function testRuntimeValidatorNormalization() {
  const task = normalizeTask({
    id: "t_runtime_norm",
    validation_criteria: [
      {
        check: "dir_exists",
        description: "Lab directory exists",
        points: 5,
        runtime_validator: {
          type: "path_exists",
          path: " /home/kasm-user/lab1 ",
          path_kind: "directory",
        },
      },
    ],
  }, 0);

  const validator = task.validation_criteria[0].runtime_validator;
  assert(validator?.type === "path_exists", "runtime validation: normalize preserves validator type");
  assert(validator?.path === "/home/kasm-user/lab1", "runtime validation: normalize trims path");
  assert(validator?.path_kind === "directory", "runtime validation: normalize preserves path kind");
}

function testCommandResultValidatorNormalization() {
  const task = normalizeTask({
    id: "t_command_result",
    validation_criteria: [{
      check: "mode_600",
      points: 10,
      runtime_validator: {
        type: "command_result",
        command_key: "file_mode",
        path: " /home/kasm-user/config.secret ",
        expected_output: " 600 ",
      },
    }],
  }, 0);
  const validator = task.validation_criteria[0].runtime_validator;
  assert(validator?.type === "command_result", "command result: type is preserved");
  assert(validator?.command_key === "file_mode", "command result: allowlisted command key is preserved");
  assert(validator?.path === "/home/kasm-user/config.secret", "command result: path is trimmed");
  assert(validator?.expected_output === "600", "command result: expected mode is trimmed");
}

function testMissingPathFailsWithoutPoints() {
  const task = {
    id: "t_missing_path",
    title: "Create directory",
    points: 10,
    validation_criteria: [{
      check: "dir_exists",
      points: 10,
      runtime_validator: { type: "path_exists", path: "/home/kasm-user/missing", path_kind: "directory" },
    }],
  };
  const next = applyCriterionValidationOutcome(task, null, "dir_exists", {
    passed: false,
    validator_type: "path_exists",
    message: "Directory not found",
    evidence: { observed: "missing", callback_received: true },
  });
  const result = next.validation_results[0];
  assert(result.passed === false, "missing path: criterion fails");
  assert(result.points_awarded === 0, "missing path: no points awarded");
  assert(result.evidence?.callback_received === true, "missing path: completed callback evidence retained");
}

function testApplyRuntimeValidationOutcome() {
  const task = {
    id: "t_runtime",
    title: "Create directory",
    points: 10,
    validation_criteria: [
      {
        check: "dir_exists",
        description: "Directory exists",
        points: 10,
        runtime_validator: {
          type: "path_exists",
          path: "/home/kasm-user/lab1",
          path_kind: "directory",
        },
      },
    ],
  };

  const next = applyCriterionValidationOutcome(
    task,
    null,
    "dir_exists",
    {
      passed: true,
      validator_type: "path_exists",
      validated_at: "2026-10-15T20:00:00.000Z",
      message: "Directory exists: /home/kasm-user/lab1",
      evidence: {
        provider: "kasm",
        path: "/home/kasm-user/lab1",
        path_kind: "directory",
        observed: "exists",
      },
    },
    new Date("2026-10-15T20:00:00.000Z")
  );

  const result = next.validation_results[0];
  assert(result.passed === true, "runtime validation: passed outcome marks criterion passed");
  assert(result.points_awarded === 10, "runtime validation: passed outcome awards criterion points");
  assert(result.source === "runtime", "runtime validation: result records runtime source");
  assert(result.runtime_validator_type === "path_exists", "runtime validation: result records validator type");
  assert(result.evidence?.observed === "exists", "runtime validation: structured evidence is preserved");
  assert(next.points_earned === 10, "runtime validation: task points recompute from automated criterion");
}

function testManualPreviewValidationFlow() {
  const task = {
    id: "t_preview",
    title: "Preview task",
    points: 10,
    validation_criteria: [
      { check: "one", points: 5 },
      { check: "two", points: 5 },
    ],
  };
  const first = setCriterionPassed(task, null, "one", true, new Date("2026-08-13T00:00:00Z"));
  assert(first.points_earned === 5, "native runner: manual criterion awards points");
  const second = setCriterionPassed(task, first, "two", true, new Date("2026-08-13T00:01:00Z"));
  const final = buildUpdatedTaskResult(task, second, { finalize: true }, new Date("2026-08-13T00:02:00Z"));
  assert(final.status === "passed", "native runner: fully validated task finalizes as passed");
  assert(final.points_earned === 10, "native runner: finalized task retains full points");
  const list = upsertTaskResult([], final);
  assert(list.length === 1 && list[0].task_id === "t_preview", "native runner: task result upserts by stable task id");
}

// ── Run all tests ──────────────────────────────────────────────────────

export function runAllTests() {
  _pass = 0;
  _fail = 0;

  // taskValidator
  testBuildInitialResults();
  testReconcileResults();
  testReconcileOrphans();
  testSumPoints();
  testAllCriteriaPassed();
  testComputeTaskPoints();
  testComputeTaskPointsPartial();
  testInstructorOverride();
  testIsTaskPassed();

  // instanceScoring
  testEmptyInstance();
  testPerfectInstance();
  testPartialInstance();
  testInstructorOverrideScoring();
  testDeterminePassFail();
  testNoDifficultyMultiplier();

  // branchingResolver (legacy + Phase 2)
  testStandardTasksUnlocked();
  testBranchLockedWithoutParent();
  testBranchUnlockedOnParentPassed();
  testBranchUnlockedOnParentFailed();
  testScoreAboveTrigger();
  testGetUnlockedTasks();
  testIsTaskUnlocked();
  testNoPhase2Fields();

  // Phase 2 — branching primary path + boundaries
  testPhase2PrimaryDependencyPath();
  testScoreAboveBoundary();
  testScoreBelowBoundary();

  // Phase 2 — normalizeTask linear defaults + preservation
  testNormalizeTaskLinearDefaults();
  testNormalizeTaskPreservesDanglingBranch();
  testNormalizeTaskStripsInvalidBranchType();

  // Phase 2 — cycle prevention
  testCyclePreventionBlocksSelfAndDescendants();
  testCyclePreventionAllowsUnrelated();
  testValidateLabContentDetectsCycle();
  testValidateLabContentDanglingWarning();
  testValidateLabContentSelfReferenceError();
  testValidateLabContentThresholdRangeWarning();
  testValidateLabContentIncompleteBranchWarning();
  testValidateLabContentCleanLinear();

  // Phase 2 — deletion handling
  testResetBranchTasksOnDeletion();
  testResetBranchTasksNoMatch();

  // Phase 2 — branch summary
  testBuildBranchSummaryStandard();
  testBuildBranchSummaryAdvanced();
  testBuildBranchSummaryDangling();

  // Native Lab Runner Preview
  testLockedBranchExcludedFromScore();
  testTemplateSnapshotIncludesEnvironment();
  testTemplateSnapshotStripsInstructorOnlyTaskFields();
  testKasmBindingSingleResourceReady();
  testKasmBindingCompatibleButNotLaunchReadyWithoutImageId();
  testKasmBindingRejectsMultiResourceV1();
  testKasmBindingRejectsUndersizedProfile();
  testRuntimeValidatorNormalization();
  testCommandResultValidatorNormalization();
  testMissingPathFailsWithoutPoints();
  testApplyRuntimeValidationOutcome();
  testManualPreviewValidationFlow();

  return { passed: _pass, failed: _fail, total: _pass + _fail };
}