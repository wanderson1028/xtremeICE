// Shared between the application-test generator and the natural-language editor so
// both produce the same question shape, limits and answer-integrity rules.

export const MAX_MCQ = 15;
export const MAX_MATCHING = 10;
export const MAX_TOTAL = 20;

export const QUESTION_PROPS = {
  kind: { type: 'string', enum: ['mcq', 'matching'] },
  prompt: { type: 'string', description: 'The question stem; may include short command, config, script or log snippets' },
  theme: { type: 'string', description: 'Short competency theme, 2-4 words' },
  points: { type: 'number' },
  options: { type: 'array', items: { type: 'string' }, description: 'Multiple-choice options; may be short commands or code' },
  correct_index: { type: 'number', description: '0-based index into options of the fully correct answer' },
  pairs: {
    type: 'array',
    items: {
      type: 'object',
      properties: {
        prompt: { type: 'string' },
        answer: { type: 'string' },
      },
      required: ['prompt', 'answer'],
    },
  },
  distractors: { type: 'array', items: { type: 'string' } },
};

export const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    scenario: {
      type: 'string',
      description: 'The shared scenario every question follows (120-180 words)',
    },
    questions: {
      type: 'array',
      items: { type: 'object', properties: QUESTION_PROPS, required: ['kind', 'prompt', 'points', 'theme'] },
    },
  },
  required: ['scenario', 'questions'],
};

export const RULES = [
  'SEQUENCING AND PROGRESSION — the set reads as one continuous investigation:',
  '- Anchor every question in named specifics from the scenario: the same hosts, users, VLANs, subnets, alerts, timestamps or tools. Never introduce a system, ticket, vendor or event the scenario does not mention.',
  '- Order the questions along the scenario timeline, one stage each: first notice and triage, then scope and evidence gathering, then containment or corrective configuration, then verification and documentation. Each question sits at a later stage of the same incident and goes deeper and more specific than the one before it.',
  '- Each question must stand on its own: it may treat earlier work as already done ("after the trunk was corrected..."), but it must never restate, hint at, or depend on the candidate having answered an earlier question correctly.',
  '- Never reuse an earlier question\'s correct answer, command or term in a later stem or option set.',
  '- No chained wording such as "using the command from the previous question" or "following that fix" — state the situation, not a reference to an earlier answer.',
  'ANSWER INTEGRITY:',
  '- The stem states the situation only. It must never contain the wording of the correct answer.',
  '- Never write joke, absurd or placeholder options. No "all of the above", "none of the above", "A and C", or options that merely restate the stem.',
  '- Every option must be credible to someone with partial knowledge: real commands, real settings, real protocols, realistic near-miss values (off-by-one subnet, wrong port, wrong AD attribute, wrong log source, wrong direction of an ACL).',
  '- Exactly one option fully resolves the question; the others must be wrong on a specific, believable technical point.',
  'TECHNICAL DEPTH:',
  '- Where the role is technical, the question must require applied reasoning rather than recall: put a short failing command output, configuration fragment, script, log line, route table, ACL or API call in the stem and ask what it means, what to fix, or which change is correct.',
  '- Multiple-choice options may be concrete artifacts: a 1-3 line command, config block, script or API call, formatted as plain text.',
  '- Keep any snippet short, syntactically realistic for the platform named in the scenario, and consistent with it.',
  '- No glossary trivia, no dictionary definitions, nothing answerable by knowing a single acronym.',
  'VARY ANSWER POSITIONS: spread correct_index across the options; never put the correct answer first more often than chance.',
];

export function cleanText(value, max) {
  return String(value === undefined || value === null ? '' : value).trim().slice(0, max);
}

export function normalizePoints(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 5;
  return Math.min(20, Math.max(1, Math.round(n)));
}

function dedupe(list) {
  const out = [];
  const seen = new Set();
  for (const item of list) {
    const text = cleanText(item, 400);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

export function normalizeMcq(raw) {
  const prompt = cleanText(raw && raw.prompt, 1200);
  if (!prompt) return null;
  const options = dedupe(Array.isArray(raw && raw.options) ? raw.options : []).slice(0, 6);
  if (options.length < 2) return null;
  const idx = Number(raw && raw.correct_index);
  const correctIndex = Number.isInteger(idx) && idx >= 0 && idx < options.length ? idx : 0;
  return {
    kind: 'mcq',
    prompt,
    theme: cleanText(raw && raw.theme, 60),
    points: normalizePoints(raw && raw.points),
    options,
    correct_index: correctIndex,
  };
}

export function normalizeMatching(raw) {
  const prompt = cleanText(raw && raw.prompt, 1200);
  if (!prompt) return null;
  const pairs = (Array.isArray(raw && raw.pairs) ? raw.pairs : [])
    .map((p) => ({
      prompt: cleanText(p && p.prompt, 300),
      answer: cleanText(p && p.answer, 300),
    }))
    .filter((p) => p.prompt && p.answer)
    .slice(0, 6);
  if (!pairs.length) return null;

  const answers = dedupe(pairs.map((p) => p.answer));
  const distractors = dedupe(Array.isArray(raw && raw.distractors) ? raw.distractors : []).filter(
    (d) => !answers.some((a) => a.toLowerCase() === d.toLowerCase())
  );
  const choices = [...answers, ...distractors].slice(0, 8);
  if (choices.length < 2) return null;

  return {
    kind: 'matching',
    prompt,
    theme: cleanText(raw && raw.theme, 60),
    points: normalizePoints(raw && raw.points),
    pairs,
    choices,
  };
}

export function normalizeQuestion(raw) {
  const kind = cleanText(raw && raw.kind, 20).toLowerCase();
  if (kind === 'matching') return normalizeMatching(raw);
  if (kind === 'mcq') return normalizeMcq(raw);
  return null;
}

export function normalizeQuestions(list, limit) {
  const out = [];
  for (const raw of Array.isArray(list) ? list : []) {
    if (out.length >= limit) break;
    const normalized = normalizeQuestion(raw);
    if (normalized) out.push(normalized);
  }
  return out;
}

function compareText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function correctAnswerText(question) {
  if (question.kind !== 'mcq') return '';
  return question.options[question.correct_index] || '';
}

// A correct answer that appears word-for-word in its own stem, or in any later
// stem, hands the candidate the answer. Flag those questions by index.
export function findGiveaways(questions) {
  const flagged = new Set();
  const stems = questions.map((q) => compareText(q.prompt));
  questions.forEach((question, index) => {
    const answer = compareText(correctAnswerText(question));
    if (answer.length < 18) return;
    if (stems[index].includes(answer)) flagged.add(index);
    for (let later = index + 1; later < stems.length; later += 1) {
      if (stems[later].includes(answer)) flagged.add(later);
    }
  });
  return [...flagged].sort((a, b) => a - b);
}

// If every answer sits in the same position, the pattern itself gives it away.
export function spreadAnswerPositions(questions) {
  const mcqs = questions.filter((q) => q.kind === 'mcq');
  if (mcqs.length < 3) return questions;
  if (new Set(mcqs.map((q) => q.correct_index)).size > 1) return questions;

  let turn = 0;
  return questions.map((question) => {
    if (question.kind !== 'mcq') return question;
    const offset = turn % question.options.length;
    turn += 1;
    if (!offset) return question;
    const options = [...question.options.slice(offset), ...question.options.slice(0, offset)];
    const correct = question.options[question.correct_index];
    return { ...question, options, correct_index: options.indexOf(correct) };
  });
}