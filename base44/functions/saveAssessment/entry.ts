import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const QUESTION_TYPES = ['mcq', 'matching', 'manual'];

const pairs = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((entry) => entry && entry.id && String(entry.text || '').trim())
    .map((entry) => ({ id: String(entry.id), text: String(entry.text).trim() }));

const normalizeType = (value) => (QUESTION_TYPES.includes(String(value)) ? String(value) : 'manual');

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((error) => (error?.status === 401 ? null : Promise.reject(error)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const assessmentData = body?.assessmentData;
    const tasks = Array.isArray(body?.tasks) ? body.tasks : [];

    if (!assessmentData || typeof assessmentData !== 'object') {
      return Response.json({ error: 'Assessment details are required.' }, { status: 400 });
    }
    if (!String(assessmentData.position_title || '').trim()) {
      return Response.json({ error: 'Position title is required.' }, { status: 400 });
    }

    // Build and validate task records (including the objective answer keys).
    const normalizedTasks = [];
    for (let index = 0; index < tasks.length; index += 1) {
      const task = tasks[index] || {};
      const label = `Question ${index + 1}`;
      const question_type = normalizeType(task.question_type);
      const points = Number(task.points);
      const title = String(task.title || '').trim();

      if (!title) return Response.json({ error: `${label}: question text is required.` }, { status: 400 });
      if (!(points > 0)) return Response.json({ error: `${label}: points must be greater than zero.` }, { status: 400 });

      const record = {
        order: Number(task.order) || index + 1,
        title,
        description: String(task.description || '').trim(),
        question_type,
        task_type: ['Knowledge Check', 'Investigation', 'Configuration', 'Analysis', 'Documentation', 'Remediation', 'Scripting', 'Verification'].includes(String(task.task_type))
          ? String(task.task_type)
          : question_type === 'manual' ? 'Investigation' : 'Knowledge Check',
        points,
        tools_required: Array.isArray(task.tools_required) ? task.tools_required : [],
        expected_actions: Array.isArray(task.expected_actions) ? task.expected_actions : [],
        validation_checks: Array.isArray(task.validation_checks) ? task.validation_checks : [],
        hints: Array.isArray(task.hints) ? task.hints : [],
        nice_task_ids: Array.isArray(task.nice_task_ids) ? task.nice_task_ids : [],
        scoring_criteria: task.scoring_criteria && typeof task.scoring_criteria === 'object' ? task.scoring_criteria : {},
        options: [],
        correct_option_id: '',
        matching_prompts: [],
        matching_choices: [],
        matching_answer: {},
      };

      if (question_type === 'mcq') {
        const options = pairs(task.options);
        if (options.length < 2) return Response.json({ error: `${label}: at least two answer choices are required.` }, { status: 400 });
        const correct = String(task.correct_option_id || '');
        if (!options.some((option) => option.id === correct)) {
          return Response.json({ error: `${label}: the correct answer must be one of the choices.` }, { status: 400 });
        }
        record.options = options;
        record.correct_option_id = correct;
      }

      if (question_type === 'matching') {
        const prompts = pairs(task.matching_prompts);
        const choices = pairs(task.matching_choices);
        if (!prompts.length) return Response.json({ error: `${label}: add at least one item to match.` }, { status: 400 });
        if (choices.length < 2) return Response.json({ error: `${label}: at least two match options are required.` }, { status: 400 });
        const key = task.matching_answer && typeof task.matching_answer === 'object' ? task.matching_answer : {};
        const answer = {};
        for (const prompt of prompts) {
          const target = String(key[prompt.id] || '');
          if (!choices.some((choice) => choice.id === target)) {
            return Response.json({ error: `${label}: set the correct match for every item.` }, { status: 400 });
          }
          answer[prompt.id] = target;
        }
        record.matching_prompts = prompts;
        record.matching_choices = choices;
        record.matching_answer = answer;
      }

      normalizedTasks.push(record);
    }

    const assessment = await base44.asServiceRole.entities.Assessment.create({
      ...assessmentData,
      created_by_id: user.id,
      created_by_email: user.email,
      assessment_kind: assessmentData.assessment_kind === 'application_test' ? 'application_test' : 'hands_on',
    });

    if (normalizedTasks.length) {
      await base44.asServiceRole.entities.AssessmentTask.bulkCreate(
        normalizedTasks.map((task) => ({ ...task, assessment_id: assessment.id }))
      );
    }

    return Response.json({ success: true, assessment_id: assessment.id, task_count: normalizedTasks.length });
  } catch (error) {
    console.error('saveAssessment failed:', error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});