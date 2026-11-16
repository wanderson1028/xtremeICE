import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';
import {
  MAX_MCQ,
  MAX_MATCHING,
  MAX_TOTAL,
  QUESTION_PROPS,
  RESPONSE_SCHEMA,
  RULES,
  cleanText,
  normalizeQuestion,
  findGiveaways,
  correctAnswerText,
  spreadAnswerPositions,
} from '../../shared/applicationQuestions.ts';

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
      `Then write exactly ${mcqCount} multiple-choice question(s) and ${matchingCount} matching question(s), ${total} in total, already in scenario order from first notice to final verification.`,
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