import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const MAX_MCQ = 15;
const MAX_MATCHING = 10;
const MAX_TOTAL = 20;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    questions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          kind: { type: 'string', enum: ['mcq', 'matching'] },
          prompt: { type: 'string', description: 'The question text' },
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
        required: ['kind', 'prompt', 'points'],
      },
    },
  },
  required: ['questions'],
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
  return { kind: 'mcq', prompt, points: normalizePoints(raw && raw.points), options, correct_index: correctIndex };
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

  return { kind: 'matching', prompt, points: normalizePoints(raw && raw.points), pairs, choices };
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const topic = cleanText(body.prompt, 2000);
    if (!topic) return Response.json({ error: 'Describe what the test should cover.' }, { status: 400 });

    const mcqCount = Math.min(MAX_MCQ, Math.max(0, Math.round(Number(body.mcq_count) || 0)));
    const matchingCount = Math.min(MAX_MATCHING, Math.max(0, Math.round(Number(body.matching_count) || 0)));
    if (mcqCount + matchingCount < 1) {
      return Response.json({ error: 'Ask for at least one question.' }, { status: 400 });
    }
    const total = Math.min(MAX_TOTAL, mcqCount + matchingCount);

    const instruction = [
      'You write timed hiring tests for cybersecurity and IT roles.',
      `Test brief from the hiring manager: "${topic}"`,
      `Write exactly ${mcqCount} multiple-choice question(s) and ${matchingCount} matching question(s), ${total} question(s) in total.`,
      'For each multiple-choice question: give 4 distinct, plausible options, exactly one technically correct, and set correct_index to the 0-based index of that correct option. Leave pairs and distractors empty.',
      'For each matching question: give 3 to 5 correct prompt/answer pairs, and add exactly 2 additional choices that are plausible but are NOT the answer to any prompt. Leave options, correct_index empty.',
      'Each prompt must be self-contained, unambiguous and answerable without extra context. Vary difficulty across the set. Never repeat a question.',
      'Points: 5 for a multiple-choice question, 10 for a matching question.',
    ].join('\n');

    const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: instruction,
      response_json_schema: RESPONSE_SCHEMA,
    });

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

    return Response.json({ questions });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}