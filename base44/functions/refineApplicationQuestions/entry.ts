import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  MAX_TOTAL,
  QUESTION_PROPS,
  RULES,
  cleanText,
  normalizeQuestions,
  spreadAnswerPositions,
} from '../../shared/applicationQuestions.ts';

const MAX_QUESTIONS_IN = 30;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    details: {
      type: 'object',
      properties: {
        position_title: { type: 'string' },
        company_name: { type: 'string' },
        duration_minutes: { type: 'number', description: 'Minutes a candidate gets for the whole test' },
        pass_threshold: { type: 'number', description: 'Pass score as a percentage, 1-100' },
        scenario_narrative: { type: 'string', description: 'Instructions shown to the candidate before the test starts' },
        scenario_block: { type: 'string', description: 'The shared scenario shown above every question (120-180 words)' },
      },
      required: ['position_title', 'scenario_block'],
    },
    questions: {
      type: 'array',
      items: { type: 'object', properties: QUESTION_PROPS, required: ['kind', 'prompt', 'points', 'theme'] },
    },
    changes: {
      type: 'array',
      items: { type: 'string' },
      description: 'Plain-language list of what was changed, 1 to 5 short items',
    },
  },
  required: ['details', 'questions', 'changes'],
};

// A builder question record -> the compact form the model reads and writes.
function toCompact(question) {
  const kind = question && question.question_type === 'matching' ? 'matching' : 'mcq';
  const base = {
    kind,
    prompt: cleanText(question && question.title, 1200),
    theme: cleanText(question && question.theme, 60),
    points: Number(question && question.points) || 5,
  };

  if (kind === 'mcq') {
    const options = (Array.isArray(question.options) ? question.options : [])
      .map((option) => cleanText(option && option.text, 400))
      .filter(Boolean);
    const correct = (Array.isArray(question.options) ? question.options : []).find(
      (option) => option && option.id === question.correct_option_id
    );
    return {
      ...base,
      options,
      correct_index: correct ? Math.max(0, options.indexOf(cleanText(correct.text, 400))) : 0,
    };
  }

  const prompts = (Array.isArray(question.matching_prompts) ? question.matching_prompts : []).filter(
    (item) => cleanText(item && item.text, 300)
  );
  const choices = (Array.isArray(question.matching_choices) ? question.matching_choices : []).filter(
    (item) => cleanText(item && item.text, 300)
  );
  const answers = question.matching_answer && typeof question.matching_answer === 'object' ? question.matching_answer : {};
  const usedChoiceIds = Object.values(answers);
  return {
    ...base,
    pairs: prompts.map((item) => {
      const match = choices.find((choice) => choice.id === answers[item.id]);
      return { prompt: cleanText(item.text, 300), answer: match ? cleanText(match.text, 300) : '' };
    }),
    distractors: choices
      .filter((choice) => !usedChoiceIds.includes(choice.id))
      .map((choice) => cleanText(choice.text, 300)),
  };
}

function describeQuestions(questions) {
  return questions
    .map((question, index) => {
      const lines = [`${index + 1}. [${question.kind}] (${question.points} pts · ${question.theme || 'no theme'}) ${question.prompt}`];
      if (question.kind === 'mcq') {
        lines.push(`   options: ${JSON.stringify(question.options)}`);
        lines.push(`   fully correct option: index ${question.correct_index} — ${question.options[question.correct_index] || ''}`);
      } else {
        lines.push(`   pairs: ${JSON.stringify(question.pairs)}`);
        lines.push(`   extra choices: ${JSON.stringify(question.distractors || [])}`);
      }
      return lines.join('\n');
    })
    .join('\n');
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const instruction = cleanText(body.instruction, 1200);
    if (!instruction) return Response.json({ error: 'Describe the change you want.' }, { status: 400 });

    const details = body.details && typeof body.details === 'object' ? body.details : {};
    const current = {
      position_title: cleanText(details.position_title, 120),
      company_name: cleanText(details.company_name, 120),
      duration_minutes: clampNumber(details.duration_minutes, 1, 480, 30),
      pass_threshold: clampNumber(details.pass_threshold, 1, 100, 70),
      scenario_narrative: cleanText(details.scenario_narrative, 2000),
      scenario_block: cleanText(details.scenario_block, 4000),
    };

    const incoming = Array.isArray(body.questions) ? body.questions.slice(0, MAX_QUESTIONS_IN) : [];
    if (!incoming.length) {
      return Response.json({ error: 'This test has no questions to edit yet.' }, { status: 400 });
    }
    const currentQuestions = incoming.map(toCompact).filter((question) => question.prompt);

    const prompt = [
      'You revise scenario-driven hiring tests for cybersecurity and IT roles, on the hiring manager\'s instruction.',
      'CURRENT TEST',
      `Position title: ${current.position_title || '(none)'}`,
      `Company: ${current.company_name || '(none)'}`,
      `Time limit: ${current.duration_minutes} minutes`,
      `Pass score: ${current.pass_threshold}%`,
      `Instructions shown to the candidate: """${current.scenario_narrative || '(none)'}"""`,
      `Shared scenario shown above every question: """${current.scenario_block || '(none yet)'}"""`,
      'CURRENT QUESTIONS, in order:',
      describeQuestions(currentQuestions) || '(none)',
      'THE CHANGE TO MAKE, in the hiring manager\'s own words:',
      `"""${instruction}"""`,
      'HOW TO APPLY IT',
      '- Return the complete updated test — every detail field and every question, not a diff.',
      '- Change only what the instruction asks for. Copy every other field and question through word for word: same stem, same options in the same order, same correct answer, same theme, same points, same position in the sequence.',
      '- Return position_title, company_name, duration_minutes, pass_threshold, scenario_narrative and scenario_block exactly as given unless the instruction asks to change them. Do not rewrite, lengthen or "improve" the scenario or the candidate instructions unasked; if a field was empty, leave it empty.',
      '- Apply the instruction to every part of the test it touches, including the scenario or the candidate instructions when the instruction explicitly asks for that.',
      '- When asked to add questions, keep the existing ones and slot the new ones in at the scenario stage they belong to, so the set still reads as one progression. Never exceed 20 questions.',
      '- When asked to remove questions, remove only the ones the instruction targets.',
      '- When asked to make the test harder, easier, longer, shorter or more technical, adapt the stems, options and scenario detail accordingly rather than only relabelling them.',
      '- Keep exactly one fully correct option per multiple-choice question, and set correct_index to its 0-based position in the returned options.',
      '- For matching questions give 3 to 5 correct prompt/answer pairs plus exactly 2 extra plausible choices that answer no prompt. Leave options and correct_index empty.',
      '- Leave pairs and distractors empty on multiple-choice questions and options on matching questions.',
      '- Keep the existing themes unless the instruction changes the subject matter; use 2-4 word labels such as "Alert Triage" or "Identity & Access".',
      ...RULES,
      'Finally, list what you changed in "changes": 1 to 5 short plain-language items a hiring manager would understand. If the instruction could not be applied to something, say so there.',
    ].join('\n');

    const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: RESPONSE_SCHEMA,
    });

    const rawDetails = llm && llm.details && typeof llm.details === 'object' ? llm.details : {};
    const nextDetails = {
      position_title: cleanText(rawDetails.position_title, 120) || current.position_title,
      company_name: cleanText(rawDetails.company_name, 120) || current.company_name,
      duration_minutes: clampNumber(rawDetails.duration_minutes, 1, 480, current.duration_minutes),
      pass_threshold: clampNumber(rawDetails.pass_threshold, 1, 100, current.pass_threshold),
      scenario_narrative: cleanText(rawDetails.scenario_narrative, 2000) || current.scenario_narrative,
      scenario_block: cleanText(rawDetails.scenario_block, 4000) || current.scenario_block,
    };

    const questions = normalizeQuestions(llm && llm.questions, MAX_TOTAL);
    if (!questions.length) {
      return Response.json(
        { error: 'The edit came back without usable questions. Try rephrasing what you want changed.' },
        { status: 422 }
      );
    }

    const changes = (Array.isArray(llm && llm.changes) ? llm.changes : [])
      .map((change) => cleanText(change, 240))
      .filter(Boolean)
      .slice(0, 5);

    return Response.json({
      details: nextDetails,
      questions: spreadAnswerPositions(questions),
      changes,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}