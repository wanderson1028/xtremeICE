const QUESTION_TYPES = ['mcq', 'matching', 'hotspot', 'manual'];
const MAX_PARTIAL_CREDIT = 0.99;

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
 * Clickable areas as geometry only — never which one is correct.
 */
function sanitizeRegions(list) {
  return (Array.isArray(list) ? list : [])
    .filter((entry) => entry && entry.id)
    .map((entry) => ({
      id: String(entry.id),
      label: String(entry.label || ''),
      x: Number(entry.x) || 0,
      y: Number(entry.y) || 0,
      w: Number(entry.w) || 0,
      h: Number(entry.h) || 0,
    }));
}

function regionLabel(regions, id) {
  const hit = regions.find((region) => region.id === id);
  return hit ? String(hit.label || '') : '';
}

/**
 * Theme weights stored on the assessment → lookup map (lowercased theme → weight).
 */
export function weightsMapFrom(scoringWeights) {
  const list = scoringWeights && Array.isArray(scoringWeights.themes) ? scoringWeights.themes : [];
  const map = {};
  for (const entry of list) {
    const key = String(entry?.theme || '').trim().toLowerCase();
    const weight = Number(entry?.weight);
    if (key && Number.isFinite(weight) && weight > 0) map[key] = weight;
  }
  return map;
}

export function weightFor(theme, weights) {
  const key = String(theme || '').trim().toLowerCase();
  const raw = key && weights ? weights[key] : undefined;
  const weight = Number(raw);
  return Number.isFinite(weight) && weight > 0 ? weight : 1;
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
    theme: task.theme || '',
    task_type: task.task_type,
    hints: Array.isArray(task.hints) ? task.hints : [],
    options: question_type === 'mcq' ? sanitizePairs(task.options) : [],
    matching_prompts: question_type === 'matching' ? sanitizePairs(task.matching_prompts) : [],
    matching_choices: question_type === 'matching' ? sanitizePairs(task.matching_choices) : [],
    hotspot_image_url: question_type === 'hotspot' ? String(task.hotspot_image_url || '') : '',
    hotspot_regions: question_type === 'hotspot' ? sanitizeRegions(task.hotspot_regions) : [],
  };
}

/**
 * Deterministic scoring for one task against its stored answer key.
 * Multiple choice awards the credit configured for the chosen option,
 * matching awards proportional credit per correct pair. Manual answers are never auto-graded.
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
      credit: 0,
      correct: null,
      submitted_display: String(submission?.answer || ''),
      correct_display: '',
    };
  }

  if (type === 'mcq') {
    const chosen = String(submission?.answer || '');
    const expected = String(task.correct_option_id || '');
    const correct = Boolean(chosen) && Boolean(expected) && chosen === expected;
    const credits = task.option_credits && typeof task.option_credits === 'object' ? task.option_credits : {};

    let credit = correct ? 1 : 0;
    if (!correct && chosen && Object.prototype.hasOwnProperty.call(credits, chosen)) {
      const raw = Number(credits[chosen]);
      if (Number.isFinite(raw) && raw > 0) credit = Math.min(MAX_PARTIAL_CREDIT, raw);
    }

    return {
      graded: true,
      type,
      possible,
      earned: Math.min(possible, round2(possible * credit)),
      credit: round2(credit),
      correct,
      partial: credit > 0 && !correct ? { credit: round2(credit) } : null,
      submitted_display: choiceText(task.options, chosen),
      correct_display: choiceText(task.options, expected),
    };
  }

  if (type === 'hotspot') {
    const regions = sanitizeRegions(task.hotspot_regions);
    const chosen = String(submission?.answer || '');
    const expected = String(task.correct_region_id || '');
    const correct = Boolean(chosen) && Boolean(expected) && chosen === expected;

    return {
      graded: true,
      type,
      possible,
      earned: correct ? possible : 0,
      credit: correct ? 1 : 0,
      correct,
      submitted_display: regionLabel(regions, chosen),
      correct_display: regionLabel(regions, expected),
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
    credit: round2(ratio),
    correct: prompts.length > 0 && hits === prompts.length,
    partial: { correct: hits, total: prompts.length },
    submitted_display: details.map((detail) => `${detail.prompt}: ${detail.given || '—'}`).join(' · '),
    correct_display: details.map((detail) => `${detail.prompt}: ${detail.expected || '—'}`).join(' · '),
    details,
  };
}

/**
 * Score every task and return scorecard-ready results plus raw totals.
 */
export function buildResults(tasks, submissions, weights) {
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
    const theme = String(task.theme || '');

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
      theme,
      theme_weight: weightFor(theme, weights),
      question_type: scored.type,
      points_possible: scored.possible,
      points_earned: scored.earned,
      completion_percentage: scored.possible > 0 ? Math.round((scored.earned / scored.possible) * 100) : 0,
      credit: scored.credit,
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
    weighted: weightedTotals(results, weights),
  };
}

/**
 * Apply theme weights to scored results. A question's theme weight multiplies both
 * the points it could earn and the points it was worth, so the score stays a
 * percentage bounded by 0–100 regardless of the weights configured.
 */
export function weightedTotals(results, weights) {
  let earned = 0;
  let possible = 0;

  for (const result of Array.isArray(results) ? results : []) {
    const weight = weightFor(result?.theme, weights);
    earned += (Number(result?.points_earned) || 0) * weight;
    possible += (Number(result?.points_possible) || 0) * weight;
  }

  return {
    earned: round2(earned),
    possible: round2(possible),
    score: possible > 0 ? Math.round((earned / possible) * 100) : 0,
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