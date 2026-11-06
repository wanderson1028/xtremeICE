import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const MAX_MCQ = 15;
const MAX_MATCHING = 10;
const MAX_TOTAL = 20;

const QUESTION_PROPS = {
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

const RESPONSE_SCHEMA = {
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

const REPAIR_SCHEMA = {
  type: 'object',
  properties: {
    fixes: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          index: { type: 'number', description: '0-based position of the question being replaced' },
          ...QUESTION_PROPS,
        },
        required: ['index', 'kind', 'prompt', 'points', 'theme'],
      },
    },
  },
  required: ['fixes'],
};

function cleanText(value, max) {
  return String(value === undefined || value === null ? '' : value).trim().slice(0, max);
}

function normalizePoints(value) {
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

function normalizeMcq(raw) {
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

function normalizeMatching(raw) {
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

function normalizeQuestion(raw) {
  const kind = cleanText(raw && raw.kind, 20).toLowerCase();
  if (kind === 'matching') return normalizeMatching(raw);
  if (kind === 'mcq') return normalizeMcq(raw);
  return null;
}

function compareText(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function correctAnswerText(question) {
  if (question.kind !== 'mcq') return '';
  return question.options[question.correct_index] || '';
}

// A correct answer that appears word-for-word in its own stem, or in any later
// stem, hands the candidate the answer. Flag those questions by index.
function findGiveaways(questions) {
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
function spreadAnswerPositions(questions) {
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

const RULES = [
  'SEQUENCING — every question must stand on its own:',
  '- The questions follow the scenario in order, but a question must never restate, hint at, or depend on the answer to an earlier question.',
  '- Never reuse an earlier question\'s correct answer, command or term in a later stem or option set.',
  '- No chained wording such as "using the command from the previous question" or "following that fix".',
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

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const topic = cleanText(body.prompt, 2000);
    if (!topic) return Response.json({ error: 'Describe what the test should cover.' }, { status: 400 });

    const existingScenario = cleanText(body.scenario, 3000);
    const mcqCount = Math.min(MAX_MCQ, Math.max(0, Math.round(Number(body.mcq_count) || 0)));
    const matchingCount = Math.min(MAX_MATCHING, Math.max(0, Math.round(Number(body.matching_count) || 0)));
    if (mcqCount + matchingCount < 1) {
      return Response.json({ error: 'Ask for at least one question.' }, { status: 400 });
    }
    const total = Math.min(MAX_TOTAL, mcqCount + matchingCount);

    const scenarioInstruction = existingScenario
      ? `The assessment already has this shared scenario. Every question must follow it exactly:\n"""${existingScenario}"""`
      : 'Write the shared scenario yourself, then base every question on it.';

    const instruction = [
      'You write scenario-driven hiring tests for cybersecurity and IT roles.',
      `Test brief from the hiring manager: "${topic}"`,
      scenarioInstruction,
      'The scenario is a realistic workplace situation in second person, 120-180 words, with concrete detail (systems, users, alerts, timings) that questions can refer back to.',
      `Then write exactly ${mcqCount} multiple-choice question(s) and ${matchingCount} matching question(s), ${total} in total.`,
      ...RULES,
      'For each multiple-choice question: give 4 distinct plausible options and set correct_index to the 0-based index of the one fully correct answer. Leave pairs and distractors empty.',
      'For each matching question: give 3 to 5 correct prompt/answer pairs, each item drawn from the scenario, plus exactly 2 additional choices that are plausible but are not the answer to any prompt. Leave options and correct_index empty.',
      'Give each question a theme: a 2-4 word competency label such as "Alert Triage", "Identity & Access" or "BGP Troubleshooting".',
      'Points: 5 for a multiple-choice question, 10 for a matching question.',
      'Never repeat a question.',
    ].join('\n');

    const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: instruction,
      response_json_schema: RESPONSE_SCHEMA,
    });

    const scenario = existingScenario || cleanText(llm && llm.scenario, 3000);
    if (!scenario) {
      return Response.json({ error: 'The generator returned no scenario. Try rephrasing the brief.' }, { status: 422 });
    }

    const rawQuestions = Array.isArray(llm && llm.questions) ? llm.questions : [];
    let questions = [];
    for (const raw of rawQuestions) {
      if (questions.length >= total) break;
      const normalized = normalizeQuestion(raw);
      if (normalized) questions.push(normalized);
    }

    if (!questions.length) {
      return Response.json(
        { error: 'The generator returned no usable questions. Try rephrasing the brief.' },
        { status: 422 }
      );
    }

    // Rewrite only the questions that hand away an answer, then keep the originals
    // for anything the repair pass does not return cleanly.
    const flagged = findGiveaways(questions);
    if (flagged.length) {
      try {
        const repair = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: [
            'You repair scenario-driven hiring-test questions.',
            `Shared scenario:\n"""${scenario}"""`,
            'These questions give the answer away: a correct answer appears word-for-word in its own stem or in a later question\'s stem.',
            JSON.stringify(
              questions.map((q, index) => ({
                index,
                kind: q.kind,
                prompt: q.prompt,
                theme: q.theme,
                points: q.points,
                options: q.options || [],
                correct_answer: correctAnswerText(q) || undefined,
                pairs: q.pairs || undefined,
                choices: q.choices || undefined,
              })),
              null,
              1
            ),
            `Rewrite ONLY the questions at these indexes: ${flagged.join(', ')}.`,
            'Keep each repaired question on the same scenario moment and theme pool, but remove every word of the answer from the stem and from later stems, and make the options non-obvious and technically substantive.',
            ...RULES,
            'Return one fix per index, using the same kind as the original. Keep answer counts and points as they were.',
          ].join('\n'),
          response_json_schema: REPAIR_SCHEMA,
        });

        const fixes = Array.isArray(repair && repair.fixes) ? repair.fixes : [];
        for (const fix of fixes) {
          const index = Number(fix && fix.index);
          if (!Number.isInteger(index) || index < 0 || index >= questions.length) continue;
          if (!flagged.includes(index)) continue;
          const replacement = normalizeQuestion(fix);
          if (!replacement) continue;
          if (replacement.kind !== questions[index].kind) continue;
          questions[index] = replacement;
        }
        questions = questions.filter((question, index) => !(flagged.includes(index) && findGiveaways([question]).includes(0)));
      } catch (error) {
        // A failed repair keeps the original set rather than losing questions.
      }
    }

    questions = spreadAnswerPositions(questions);

    return Response.json({ scenario, questions });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}