import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { assessmentData, tasks } = body;

    // Create assessment using service role
    const assessment = await base44.asServiceRole.entities.Assessment.create({
      ...assessmentData,
      created_by_id: user.id,
    });

    // Create tasks using service role
    const taskPromises = (tasks || []).map((t, i) =>
      base44.asServiceRole.entities.AssessmentTask.create({
        assessment_id: assessment.id,
        order: t.order || i + 1,
        title: t.title,
        description: t.description,
        task_type: t.task_type || "Investigation",
        tools_required: t.tools_required || [],
        expected_actions: t.expected_actions || [],
        validation_checks: t.validation_checks || [],
        hints: t.hints || [],
        nice_task_ids: t.nice_task_ids || [],
        points: t.points || 10,
        scoring_criteria: t.scoring_criteria || {},
      })
    );
    await Promise.all(taskPromises);

    return Response.json({ success: true, assessment_id: assessment.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});