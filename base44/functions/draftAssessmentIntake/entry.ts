import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

const ALLOWED_EXTENSIONS = ['pdf', 'docx', 'txt'];

const DRAFT_SCHEMA = {
  type: 'object',
  properties: {
    position_title: { type: 'string', description: 'The role title, normalized' },
    company_name: { type: 'string', description: 'Employer name only when the source names one, else empty string' },
    seniority_level: { type: 'string', enum: ['entry', 'intermediate', 'senior', 'lead'] },
    difficulty: { type: 'string', enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'] },
    duration_minutes: { type: 'number', description: 'Realistic screening test length in minutes (20-60)' },
    key_skills: {
      type: 'array',
      items: { type: 'string' },
      description: '4-8 short tools or topics the test should cover',
    },
    candidate_instructions: {
      type: 'string',
      description: '2-3 sentences shown to the candidate before the test starts',
    },
    scenario: {
      type: 'string',
      description: 'Realistic workplace scenario in second person, 120-180 words, that the questions follow',
    },
    brief: {
      type: 'string',
      description: 'One paragraph telling the question writer exactly what to cover',
    },
  },
  required: ['position_title', 'seniority_level', 'difficulty', 'candidate_instructions', 'scenario', 'brief'],
};

function cleanText(value, max) {
  return String(value === undefined || value === null ? '' : value).trim().slice(0, max);
}

function oneOf(value, allowed, fallback) {
  const text = cleanText(value, 40).toLowerCase();
  const hit = allowed.find((item) => item.toLowerCase() === text);
  return hit || fallback;
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const fileUri = cleanText(body.file_uri, 500);
    const fileName = cleanText(body.file_name, 200);
    const jobTitle = cleanText(body.job_title, 200);
    const companyName = cleanText(body.company_name, 160);

    if (!fileUri && !jobTitle) {
      return Response.json({ error: 'Upload a job description or type a job title.' }, { status: 400 });
    }

    let fileUrls = [];
    if (fileUri) {
      const extension = (fileName.split('.').pop() || '').toLowerCase();
      if (fileName && !ALLOWED_EXTENSIONS.includes(extension)) {
        return Response.json({ error: 'Upload a PDF, DOCX or TXT file.' }, { status: 400 });
      }
      try {
        const signed = await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({
          file_uri: fileUri,
          expires_in: 900,
        });
        fileUrls = [signed.signed_url];
      } catch (error) {
        return Response.json(
          { error: 'That file could not be read. Upload the job description again.' },
          { status: 400 }
        );
      }
    }

    const source = fileUri
      ? [
          `Read the attached job description${jobTitle ? ` (the role is "${jobTitle}")` : ''} and draft a pre-employment application test from it.`,
          'Use only what the posting actually says about the role, its tools, tasks and level. Do not invent certifications or products it never mentions.',
        ]
      : [
        `No document is attached. Draft a pre-employment application test for this role: "${jobTitle}"${companyName ? ` at ${companyName}` : ''}.`,
        'Base it on what this role realistically does day to day, at the level the title implies.',
      ];

    const instruction = [
      'You help a hiring manager turn a role into a scenario-driven application test for cybersecurity and IT candidates.',
      ...source,
      'Write:',
      '- position_title: the role title.',
      '- company_name: only if the source names the employer, otherwise an empty string.',
      '- seniority_level: entry, intermediate, senior or lead, judging from the requirements.',
      '- difficulty: Beginner, Intermediate, Advanced or Expert to match that level.',
      '- duration_minutes: a realistic screening length between 20 and 60.',
      '- key_skills: 4-8 short items (tools, systems, duties) the test must probe.',
      '- candidate_instructions: 2-3 sentences for the candidate welcome screen, including that answers are saved as they go.',
      '- scenario: one realistic workplace situation written in second person, 120-180 words, naming concrete systems, users, alerts or tickets that the later questions can refer back to.',
      '- brief: one paragraph, 2-4 sentences, telling the question writer what to cover, referencing the scenario and the key skills.',
      'Keep everything specific to this role. No filler, no placeholders, no mention of this instruction.',
    ].join('\n');

    const llm = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: instruction,
      response_json_schema: DRAFT_SCHEMA,
      ...(fileUrls.length ? { file_urls: fileUrls } : {}),
    });

    const draft = {
      position_title: cleanText(llm && llm.position_title, 160) || jobTitle,
      company_name: cleanText(llm && llm.company_name, 160) || companyName,
      seniority_level: oneOf(llm && llm.seniority_level, ['entry', 'intermediate', 'senior', 'lead'], 'intermediate'),
      difficulty: oneOf(llm && llm.difficulty, ['Beginner', 'Intermediate', 'Advanced', 'Expert'], 'Intermediate'),
      duration_minutes: Math.min(60, Math.max(20, Math.round(Number(llm && llm.duration_minutes) || 30))),
      key_skills: (Array.isArray(llm && llm.key_skills) ? llm.key_skills : [])
        .map((item) => cleanText(item, 80))
        .filter(Boolean)
        .slice(0, 8),
      candidate_instructions: cleanText(llm && llm.candidate_instructions, 2000),
      scenario: cleanText(llm && llm.scenario, 4000),
      brief: cleanText(llm && llm.brief, 2000),
    };

    if (!draft.scenario || !draft.brief) {
      return Response.json(
        { error: 'Could not draft a scenario from that source. Add a little more detail and try again.' },
        { status: 422 }
      );
    }

    return Response.json(draft);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}