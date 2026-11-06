import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const MAX_MCQ = 15;
const MAX_MATCHING = 10;
const MAX_TOTAL = 20;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    scenario: {
      type: 'string',
      description: 'The shared scenario every question follows (120-180 words)',
    },
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['mcq', 'matching'] },
          prompt: { type: 'string', description: 'The question text, tied to the scenario' },
          theme: { type: 'string', description: 'Short competency theme, 2-4 words' },
          points: { type: 'number' },
          options: { type: 'array', items: { type: 'string' } },
          correct_index: { type: 'number', description: '0-based index into options of the correct answer' },
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
        },
        required: ['kind', 'prompt', 'points', 'theme'],
      },
    },
  },
  required: ['scenario', 'questions'],
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
    const text = cleanText(item, 300);
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out;
}

function normalizeMcq(raw) {
  const prompt = cleanText(raw && raw.prompt, 600);
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
  const prompt = cleanText(raw && raw.prompt, 600);
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
      'The scenario is a realistic workplace situation written in second person, 120-180 words, with concrete detail (systems, users, alerts, timings) that the questions can refer back to.',
      `Then write exactly ${mcqCount} multiple-choice question(s) and ${matchingCount} matching question(s), ${total} question(s) in total.`,
      'Order the questions so they progressively follow the scenario: the first ones cover the opening situation, later ones depend on what was found or decided earlier. Each question must reference the scenario rather than stand alone.',
      'Give each question a theme: a 2-4 word competency label such as "Alert Triage", "Identity & Access", "Network Routing" or "Incident Communication".',
      'For each multiple-choice question: give 4 distinct, plausible options, exactly one fully correct, and set correct_index to the 0-based index of that option. Leave pairs and distractors empty.',
      'For each matching question: give 3 to 5 correct prompt/answer pairs, and add exactly 2 additional choices that are plausible but are NOT the answer to any prompt. Leave options and correct_index empty.',
      'Each question must be unambiguous and answerable from the scenario plus role knowledge. Never repeat a question.',
      'Points: 5 for a multiple-choice question, 10 for a matching question.',
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
    const questions = [];
    for (const raw of rawQuestions) {
      if (questions.length >= total) break;
      const kind = cleanText(raw && raw.kind, 20).toLowerCase();
      const normalized = kind === 'matching' ? normalizeMatching(raw) : kind === 'mcq' ? normalizeMcq(raw) : null;
      if (normalized) questions.push(normalized);
    }

    if (!questions.length) {
      return Response.json(
        { error: 'The generator returned no usable questions. Try rephrasing the brief.' },
        { status: 422 }
      );
    }

    return Response.json({ scenario, questions });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}