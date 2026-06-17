import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { session_id } = await req.json();

    const session = await base44.entities.CandidateSession.get(session_id);
    if (!session) return Response.json({ error: 'Session not found' }, { status: 404 });

    const assessment = await base44.entities.Assessment.get(session.assessment_id);
    const tasks = await base44.entities.AssessmentTask.filter({ assessment_id: session.assessment_id });

    const submissions = session.task_submissions || [];
    const totalPoints = tasks.reduce((sum, t) => sum + (t.points || 10), 0);
    let earned = 0;
    const taskResults = tasks.map((task, i) => {
      const sub = submissions.find(s => s.task_id === task.id) || {};
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
        time_spent_minutes: sub.time_spent || 0
      };
    });

    const overallScore = totalPoints > 0 ? Math.round((earned / totalPoints) * 100) : 0;

    const prompt = `You are a senior cybersecurity hiring manager reviewing a candidate's assessment results.

Assessment: ${assessment.position_title} (${assessment.assessment_type})
Seniority Level: ${assessment.seniority_level}
Candidate: ${session.candidate_name}
Overall Score: ${overallScore}%
Pass Threshold: ${assessment.pass_threshold || 70}%
Time Used: ${session.time_elapsed_minutes || 0} of ${assessment.duration_minutes} minutes

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
  "ai_summary": "3-4 sentence professional evaluation summary of the candidate's performance",
  "hiring_recommendation": "strong_hire|hire|borderline|no_hire",
  "recommendation_rationale": "2-3 sentences explaining the hiring recommendation"
}`;

    const aiResult = await base44.integrations.Core.InvokeLLM({
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
          ai_summary: { type: 'string' },
          hiring_recommendation: { type: 'string' },
          recommendation_rationale: { type: 'string' }
        }
      }
    });

    const scorecard = await base44.entities.Scorecard.create({
      session_id,
      assessment_id: session.assessment_id,
      candidate_email: session.candidate_email,
      candidate_name: session.candidate_name,
      overall_score: overallScore,
      passed: overallScore >= (assessment.pass_threshold || 70),
      hiring_recommendation: aiResult.hiring_recommendation || 'borderline',
      category_scores: aiResult.category_scores || {},
      task_results: taskResults,
      strengths: aiResult.strengths || [],
      weaknesses: aiResult.weaknesses || [],
      missed_steps: aiResult.missed_steps || [],
      follow_up_questions: aiResult.follow_up_questions || [],
      ai_summary: aiResult.ai_summary || '',
      generated_at: new Date().toISOString()
    });

    await base44.entities.CandidateSession.update(session_id, { status: 'evaluated' });

    return Response.json({ success: true, scorecard });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});