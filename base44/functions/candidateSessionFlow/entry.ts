import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const action = String(payload.action || '');
    const token = String(payload.token || '').trim();

    if (!/^[a-f0-9]{64}$/.test(token)) {
      return Response.json({ error: 'Invalid invitation link.' }, { status: 400 });
    }

    // Authorize via the invitation token — no user login required.
    const invitations = await base44.asServiceRole.entities.CandidateInvitation.filter({ invite_token: token });
    if (!invitations.length) {
      return Response.json({ error: 'Invitation not found.' }, { status: 404 });
    }
    const invitation = invitations[0];

    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      return Response.json({ error: 'This invitation has expired.' }, { status: 410 });
    }
    if (invitation.status === 'completed') {
      return Response.json({ error: 'This assessment has already been completed.' }, { status: 410 });
    }

    // --- START: create a candidate session and mark invitation in-progress ---
    if (action === 'start') {
      const session = await base44.asServiceRole.entities.CandidateSession.create({
        invitation_id: invitation.id,
        assessment_id: invitation.assessment_id,
        candidate_email: invitation.candidate_email,
        candidate_name: invitation.candidate_name,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        task_submissions: [],
        activity_log: [],
      });
      await base44.asServiceRole.entities.CandidateInvitation.update(invitation.id, {
        status: 'in_progress',
        accepted_at: new Date().toISOString(),
      });
      return Response.json({ success: true, session });
    }

    // --- UPDATE: persist task submissions mid-assessment ---
    if (action === 'update') {
      const session_id = String(payload.session_id || '');
      const task_submissions = Array.isArray(payload.task_submissions) ? payload.task_submissions : [];
      const current_task_index = payload.current_task_index;

      const session = await base44.asServiceRole.entities.CandidateSession.get(session_id);
      if (!session || session.invitation_id !== invitation.id) {
        return Response.json({ error: 'Session not found.' }, { status: 404 });
      }

      const updateData = { task_submissions };
      if (typeof current_task_index === 'number') updateData.current_task_index = current_task_index;

      await base44.asServiceRole.entities.CandidateSession.update(session_id, updateData);
      return Response.json({ success: true });
    }

    // --- SUBMIT: final submission + scorecard generation ---
    if (action === 'submit') {
      const session_id = String(payload.session_id || '');
      const task_submissions = Array.isArray(payload.task_submissions) ? payload.task_submissions : [];
      const time_elapsed_minutes = Number(payload.time_elapsed_minutes || 0);

      const session = await base44.asServiceRole.entities.CandidateSession.get(session_id);
      if (!session || session.invitation_id !== invitation.id) {
        return Response.json({ error: 'Session not found.' }, { status: 404 });
      }

      await base44.asServiceRole.entities.CandidateSession.update(session_id, {
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        time_elapsed_minutes,
        task_submissions,
      });
      await base44.asServiceRole.entities.CandidateInvitation.update(invitation.id, {
        status: 'completed',
        completed_at: new Date().toISOString(),
      });

      // Generate scorecard (mirrors generateScorecard logic, service-role for no-login flow)
      const assessment = await base44.asServiceRole.entities.Assessment.get(session.assessment_id);
      const tasks = await base44.asServiceRole.entities.AssessmentTask.filter({ assessment_id: session.assessment_id });

      const totalPoints = tasks.reduce((sum, t) => sum + (t.points || 10), 0);
      let earned = 0;
      const taskResults = tasks.map((task) => {
        const sub = task_submissions.find(s => s.task_id === task.id) || {};
        const taskScore = sub.score ?? 0;
        earned += taskScore;
        return {
          task_id: task.id,
          title: task.title,
          points_possible: task.points || 10,
          points_earned: taskScore,
          completion_percentage: Math.round((taskScore / (task.points || 10)) * 100),
          submitted_answer: sub.answer || '',
          evaluator_feedback: sub.feedback || '',
          validation_passed: sub.validation_passed || false,
          time_spent_minutes: sub.time_spent || 0,
        };
      });

      const overallScore = totalPoints > 0 ? Math.round((earned / totalPoints) * 100) : 0;

      const prompt = `You are a senior cybersecurity hiring manager reviewing a candidate's assessment results.

Assessment: ${assessment.position_title} (${assessment.assessment_type})
Seniority Level: ${assessment.seniority_level}
Candidate: ${session.candidate_name}
Overall Score: ${overallScore}%
Pass Threshold: ${assessment.pass_threshold || 70}%
Time Used: ${time_elapsed_minutes} of ${assessment.duration_minutes} minutes

Task Results:
${taskResults.map(t => `- ${t.title}: ${t.points_earned}/${t.points_possible} pts (${t.completion_percentage}%) — Answer: ${t.submitted_answer.substring(0, 200)}`).join('\n')}

Generate a professional candidate scorecard and evaluation. Return JSON:
{
  "category_scores": {
    "technical_accuracy": <0-100>,
    "task_completion": <0-100>,
    "tool_usage": <0-100>,
    "troubleshooting_process": <0-100>,
    "security_reasoning": <0-100>,
    "documentation_quality": <0-100>,
    "time_management": <0-100>,
    "remediation_quality": <0-100>,
    "communication_clarity": <0-100>,
    "compliance_with_instructions": <0-100>
  },
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2"],
  "missed_steps": ["missed step 1", "missed step 2"],
  "follow_up_questions": ["interview question 1", "question 2", "question 3", "question 4", "question 5"],
  "smart_summary": "3-4 sentence professional evaluation summary of the candidate's performance",
  "hiring_recommendation": "strong_hire|hire|borderline|no_hire",
  "recommendation_rationale": "2-3 sentences explaining the hiring recommendation"
}`;

      const smartResult = await base44.integrations.Core.InvokeLLM({
        prompt,
        model: 'claude_sonnet_4_6',
        response_json_schema: {
          type: 'object',
          properties: {
            category_scores: { type: 'object' },
            strengths: { type: 'array', items: { type: 'string' } },
            weaknesses: { type: 'array', items: { type: 'string' } },
            missed_steps: { type: 'array', items: { type: 'string' } },
            follow_up_questions: { type: 'array', items: { type: 'string' } },
            smart_summary: { type: 'string' },
            hiring_recommendation: { type: 'string' },
            recommendation_rationale: { type: 'string' },
          },
        },
      });

      await base44.asServiceRole.entities.Scorecard.create({
        session_id,
        assessment_id: session.assessment_id,
        candidate_email: session.candidate_email,
        candidate_name: session.candidate_name,
        overall_score: overallScore,
        passed: overallScore >= (assessment.pass_threshold || 70),
        hiring_recommendation: smartResult.hiring_recommendation || 'borderline',
        category_scores: smartResult.category_scores || {},
        task_results: taskResults,
        strengths: smartResult.strengths || [],
        weaknesses: smartResult.weaknesses || [],
        missed_steps: smartResult.missed_steps || [],
        follow_up_questions: smartResult.follow_up_questions || [],
        smart_summary: smartResult.smart_summary || '',
        generated_at: new Date().toISOString(),
      });

      await base44.asServiceRole.entities.CandidateSession.update(session_id, { status: 'evaluated' });

      return Response.json({ success: true });
    }

    return Response.json({ error: 'Unknown action.' }, { status: 400 });
  } catch (error) {
    console.error('candidateSessionFlow failed:', error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});