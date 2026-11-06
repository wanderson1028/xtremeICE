const QUESTION_TYPES = ['mcq', 'matching', 'manual'];

const round2 = (value) => Math.round(Number(value) * 100) / 100;

export function questionType(task) {
  const type = String(task?.question_type || 'manual');
  return QUESTION_TYPES.includes(type) ? type : 'manual';
}

function choiceText(choices, id) {
  const hit = (Array.isArray(choices) ? choices : []).find((choice) => choice.id === id);
  return hit ? String(hit.text || '') : '';
}

function sanitizePairs(list) {
  return (Array.isArray(list) ? list : [])
    .filter((entry) => entry && entry.id)
    .map((entry) => ({ id: String(entry.id), text: String(entry.text || '') }));
}

/**
 * Strip the answer key before a task is handed to a candidate's browser.
 */
export function toPublicTask(task) {
  const question_type = questionType(task);
  return {
    id: task.id,
    assessment_id: task.assessment_id,
    order: task.order,
    title: task.title,
    description: task.description,
    points: task.points,
    question_type,
    task_type: task.task_type,
    hints: Array.isArray(task.hints) ? task.hints : [],
    options: question_type === 'mcq' ? sanitizePairs(task.options) : [],
    matching_prompts: question_type === 'matching' ? sanitizePairs(task.matching_prompts) : [],
    matching_choices: question_type === 'matching' ? sanitizePairs(task.matching_choices) : [],
  };
}

/**
 * Deterministic scoring for one task against its stored answer key.
 * Manual (written) answers are never auto-graded.
 */
export function scoreTask(task, submission) {
  const type = questionType(task);
  const possible = Number(task.points) || 0;

  if (type === 'manual') {
    return {
      graded: false,
      type,
      possible,
      earned: 0,
      correct: null,
      submitted_display: String(submission?.answer || ''),
      correct_display: '',
    };
  }

  if (type === 'mcq') {
    const chosen = String(submission?.answer || '');
    const expected = String(task.correct_option_id || '');
    const correct = Boolean(chosen) && Boolean(expected) && chosen === expected;
    return {
      graded: true,
      type,
      possible,
      earned: correct ? possible : 0,
      correct,
      submitted_display: choiceText(task.options, chosen),
      correct_display: choiceText(task.options, expected),
    };
  }

  const prompts = sanitizePairs(task.matching_prompts);
  const matches = submission?.matches && typeof submission.matches === 'object' ? submission.matches : {};
  const key = task.matching_answer && typeof task.matching_answer === 'object' ? task.matching_answer : {};

  const details = prompts.map((prompt) => {
    const given = String(matches[prompt.id] || '');
    const expected = String(key[prompt.id] || '');
    return {
      prompt: prompt.text,
      given: choiceText(task.matching_choices, given),
      expected: choiceText(task.matching_choices, expected),
      ok: Boolean(given) && Boolean(expected) && given === expected,
    };
  });

  const hits = details.filter((detail) => detail.ok).length;
  const ratio = prompts.length ? hits / prompts.length : 0;

  return {
    graded: true,
    type,
    possible,
    earned: round2(possible * ratio),
    correct: prompts.length > 0 && hits === prompts.length,
    partial: { correct: hits, total: prompts.length },
    submitted_display: details.map((detail) => `${detail.prompt}: ${detail.given || '—'}`).join(' · '),
    correct_display: details.map((detail) => `${detail.prompt}: ${detail.expected || '—'}`).join(' · '),
    details,
  };
}

/**
 * Score every task and return scorecard-ready results plus totals.
 */
export function buildResults(tasks, submissions) {
  const submissionMap = new Map(
    (Array.isArray(submissions) ? submissions : []).map((entry) => [String(entry.task_id || ''), entry])
  );

  const ordered = [...(Array.isArray(tasks) ? tasks : [])].sort(
    (a, b) => (Number(a.order) || 0) - (Number(b.order) || 0)
  );

  let earned = 0;
  let possible = 0;
  let autoCorrect = 0;
  let autoCount = 0;
  let hasManual = false;
  let answered = 0;

  const results = ordered.map((task) => {
    const submission = submissionMap.get(String(task.id)) || {};
    const scored = scoreTask(task, submission);

    possible += scored.possible;
    earned += scored.earned;

    if (scored.type === 'manual') {
      hasManual = true;
    } else {
      autoCount += 1;
      if (scored.correct) autoCorrect += 1;
    }
    if (scored.submitted_display) answered += 1;

    return {
      task_id: task.id,
      title: task.title,
      question_type: scored.type,
      points_possible: scored.possible,
      points_earned: scored.earned,
      completion_percentage: scored.possible > 0 ? Math.round((scored.earned / scored.possible) * 100) : 0,
      submitted_answer: scored.submitted_display,
      correct_answer: scored.correct_display,
      correct: scored.correct,
      partial: scored.partial || null,
      auto_graded: scored.graded,
      validation_passed: scored.graded ? Boolean(scored.correct) : false,
      evaluator_feedback: '',
      time_spent_minutes: Number(submission.time_spent) || 0,
    };
  });

  return {
    results,
    earned: round2(earned),
    possible: round2(possible),
    autoCorrect,
    autoCount,
    answered,
    hasManual,
    total: results.length,
  };
}

export function percentage(earned, possible) {
  if (!possible) return 0;
  return Math.round((Number(earned) / Number(possible)) * 100);
}

export function recommendationFor(score) {
  if (score >= 85) return 'strong_hire';
  if (score >= 70) return 'hire';
  if (score >= 55) return 'borderline';
  return 'no_hire';
}