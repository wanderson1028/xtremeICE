import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const QUESTION_TYPES = ['mcq', 'matching', 'hotspot', 'manual'];

const pairs = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((entry) => entry && entry.id && String(entry.text || '').trim())
    .map((entry) => ({ id: String(entry.id), text: String(entry.text).trim() }));

const normalizeType = (value) => (QUESTION_TYPES.includes(String(value)) ? String(value) : 'manual');

const clampPercent = (value) => Math.min(100, Math.max(0, Math.round((Number(value) || 0) * 10) / 10));

const normalizeRegions = (list) =>
  (Array.isArray(list) ? list : [])
    .filter((entry) => entry && entry.id)
    .map((entry) => ({
      id: String(entry.id),
      label: String(entry.label || '').trim().slice(0, 60),
      x: clampPercent(entry.x),
      y: clampPercent(entry.y),
      w: clampPercent(entry.w),
      h: clampPercent(entry.h),
    }))
    .filter((entry) => entry.w > 0 && entry.h > 0);

const normalizeWeights = (raw) => {
  const list = raw && Array.isArray(raw.themes) ? raw.themes : [];
  const seen = new Set();
  const themes = [];
  for (const entry of list) {
    const theme = String(entry?.theme || '').trim().slice(0, 60);
    const key = theme.toLowerCase();
    if (!theme || seen.has(key)) continue;
    const weight = Number(entry?.weight);
    if (!Number.isFinite(weight) || weight <= 0) continue;
    seen.add(key);
    themes.push({ theme, weight: Math.min(10, Math.max(0.1, Math.round(weight * 100) / 100)) });
  }
  return { themes };
};

const normalizeCredits = (raw, options, correctId) => {
  const source = raw && typeof raw === 'object' ? raw : {};
  const credits = {};
  for (const option of options) {
    if (option.id === correctId) continue;
    if (!Object.prototype.hasOwnProperty.call(source, option.id)) continue;
    const value = Number(source[option.id]);
    if (!Number.isFinite(value) || value <= 0) continue;
    credits[option.id] = Math.min(0.99, Math.round(value * 100) / 100);
  }
  return credits;
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((error) => (error?.status === 401 ? null : Promise.reject(error)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const assessmentData = body?.assessmentData;
    const tasks = Array.isArray(body?.tasks) ? body.tasks : [];
    const assessmentId = String(body?.assessment_id || '').trim();

    if (!assessmentData || typeof assessmentData !== 'object') {
      return Response.json({ error: 'Assessment details are required.' }, { status: 400 });
    }
    if (!String(assessmentData.position_title || '').trim()) {
      return Response.json({ error: 'Position title is required.' }, { status: 400 });
    }

    // Build and validate task records (including the objective answer keys).
    const normalizedTasks = [];
    const taskIds = [];
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
        theme: String(task.theme || '').trim().slice(0, 60),
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
        option_credits: {},
        matching_prompts: [],
        matching_choices: [],
        matching_answer: {},
        hotspot_image_url: '',
        hotspot_regions: [],
        correct_region_id: '',
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
        record.option_credits = normalizeCredits(task.option_credits, options, correct);
      }

      if (question_type === 'hotspot') {
        const image = String(task.hotspot_image_url || '').trim();
        if (!image) return Response.json({ error: `${label}: add the image candidates should click on.` }, { status: 400 });
        const regions = normalizeRegions(task.hotspot_regions);
        if (regions.length < 2) return Response.json({ error: `${label}: draw at least two hotspot areas.` }, { status: 400 });
        const correct = String(task.correct_region_id || '');
        if (!regions.some((region) => region.id === correct)) {
          return Response.json({ error: `${label}: mark the correct hotspot area.` }, { status: 400 });
        }
        record.hotspot_image_url = image;
        record.hotspot_regions = regions;
        record.correct_region_id = correct;
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
      taskIds.push(String(task.id || ''));
    }

    const assessmentPayload = {
      ...assessmentData,
      scenario_block: String(assessmentData.scenario_block || '').trim(),
      scoring_weights: normalizeWeights(assessmentData.scoring_weights),
      assessment_kind: assessmentData.assessment_kind === 'application_test' ? 'application_test' : 'hands_on',
    };
    delete assessmentPayload.id;
    delete assessmentPayload.created_by_id;
    delete assessmentPayload.created_by_email;

    let assessment;
    if (assessmentId) {
      const current = await base44.asServiceRole.entities.Assessment
        .get(assessmentId)
        .catch((error) => (error?.status === 404 ? null : Promise.reject(error)));
      if (!current) return Response.json({ error: 'Assessment not found.' }, { status: 404 });
      if (current.created_by_id !== user.id && user.role !== 'admin') {
        return Response.json({ error: 'You cannot edit this assessment.' }, { status: 403 });
      }
      assessment = await base44.asServiceRole.entities.Assessment.update(assessmentId, assessmentPayload);
    } else {
      assessment = await base44.asServiceRole.entities.Assessment.create({
        ...assessmentPayload,
        created_by_id: user.id,
        created_by_email: user.email,
      });
    }

    if (!assessmentId) {
      if (normalizedTasks.length) {
        await base44.asServiceRole.entities.AssessmentTask.bulkCreate(
          normalizedTasks.map((task) => ({ ...task, assessment_id: assessment.id }))
        );
      }
      return Response.json({ success: true, assessment_id: assessment.id, task_count: normalizedTasks.length });
    }

    // Editing: existing questions keep their record ids so in-progress candidate
    // sessions and completed scorecards still line up with the questions.
    const currentTasks = await base44.asServiceRole.entities.AssessmentTask.filter({ assessment_id: assessmentId });
    const existingIds = new Set(currentTasks.map((task) => task.id));
    const updates = [];
    const creates = [];

    normalizedTasks.forEach((task, index) => {
      const id = taskIds[index];
      if (id && existingIds.has(id)) updates.push({ id, ...task });
      else creates.push({ ...task, assessment_id: assessmentId });
    });

    if (updates.length) await base44.asServiceRole.entities.AssessmentTask.bulkUpdate(updates);
    if (creates.length) await base44.asServiceRole.entities.AssessmentTask.bulkCreate(creates);

    const keptIds = new Set(updates.map((task) => task.id));
    const removed = currentTasks.filter((task) => !keptIds.has(task.id)).map((task) => task.id);
    if (removed.length) await base44.asServiceRole.entities.AssessmentTask.deleteMany({ id: { $in: removed } });

    return Response.json({
      success: true,
      assessment_id: assessment.id,
      task_count: normalizedTasks.length,
      updated: true,
    });
  } catch (error) {
    console.error('saveAssessment failed:', error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});