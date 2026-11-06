import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { buildResults, weightsMapFrom, weightedTotals, recommendationFor } from '../../shared/objectiveScoring.ts';

const ACTION_STATUS = {
  start: 'in_progress',
  update: 'in_progress',
  submit: 'completed',
};

const RECOMMENDATIONS = ['strong_hire', 'hire', 'borderline', 'no_hire'];

function sanitizeSubmissions(raw) {
  return (Array.isArray(raw) ? raw : [])
    .map((entry) => ({
      task_id: String(entry?.task_id || ''),
      answer: String(entry?.answer ?? ''),
      matches: entry?.matches && typeof entry.matches === 'object' ? entry.matches : {},
      time_spent: Number(entry?.time_spent) || 0,
      submitted_at: String(entry?.submitted_at || new Date().toISOString()),
    }))
    .filter((entry) => entry.task_id);
}

function buildSummary(candidateName, positionTitle, overallScore, earned, possible, scored) {
  const parts = [
    `${candidateName} scored ${overallScore}% (${earned} of ${possible} points) on ${positionTitle}.`,
  ];
  if (scored.autoCount > 0) {
    parts.push(`${scored.autoCorrect} of ${scored.autoCount} objective questions were answered correctly.`);
  }
  parts.push(`${scored.answered} of ${scored.total} questions were answered.`);
  return parts.join(' ');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json().catch(() => ({}));
    const action = String(payload.action || '');
    const token = String(payload.token || '').trim();

    if (!ACTION_STATUS[action]) {
      return Response.json({ error: 'Unknown action.' }, { status: 400 });
    }
    if (!/^[a-f0-9]{64}$/.test(token)) {
      return Response.json({ error: 'Invalid invitation link.' }, { status: 400 });
    }

    // Authorize via the invitation token — no user login required.
    const invitations = await base44.asServiceRole.entities.CandidateInvitation.filter({ invite_token: token });
    if (!invitations.length) {
      return Response.json({ error: 'Invitation not found.' }, { status: 404 });
    }
    const invitation = invitations[0];

    // A completed invitation can still be missing its scorecard after an
    // interrupted submission, so only new starts and answer saves are blocked.
    if (action !== 'submit' && invitation.status === 'completed') {
      return Response.json({ error: 'This assessment has already been completed.' }, { status: 410 });
    }

    // --- START: reuse an open session, otherwise create one ---
    if (action === 'start') {
      if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
        return Response.json({ error: 'This invitation has expired.' }, { status: 410 });
      }

      // One attempt per candidate per assessment: a second invitation for the same
      // address never reopens a test that has already been submitted.
      const allSessions = await base44.asServiceRole.entities.CandidateSession.filter({
        assessment_id: invitation.assessment_id,
      });
      const candidateEmail = String(invitation.candidate_email || '').toLowerCase();
      const alreadyTaken = allSessions.some(
        (entry) =>
          String(entry.candidate_email || '').toLowerCase() === candidateEmail &&
          (entry.status === 'submitted' || entry.status === 'evaluated')
      );
      if (alreadyTaken) {
        return Response.json(
          { error: 'This assessment has already been submitted and can only be taken once.' },
          { status: 410 }
        );
      }

      const existing = await base44.asServiceRole.entities.CandidateSession.filter({ invitation_id: invitation.id });
      const open = existing.find((session) => session.status === 'in_progress' || session.status === 'not_started');
      if (open) {
        if (!open.started_at) {
          await base44.asServiceRole.entities.CandidateSession.update(open.id, {
            status: 'in_progress',
            started_at: new Date().toISOString(),
          });
        }
        await base44.asServiceRole.entities.CandidateInvitation.update(invitation.id, {
          status: 'in_progress',
          accepted_at: invitation.accepted_at || new Date().toISOString(),
        });
        return Response.json({ success: true, session: open, resumed: true });
      }

      const session = await base44.asServiceRole.entities.CandidateSession.create({
        invitation_id: invitation.id,
        assessment_id: invitation.assessment_id,
        candidate_email: invitation.candidate_email,
        candidate_name: invitation.candidate_name,
        status: 'in_progress',
        started_at: new Date().toISOString(),
        task_submissions: [],
        activity_log: [],
        current_task_index: 0,
      });
      await base44.asServiceRole.entities.CandidateInvitation.update(invitation.id, {
        status: 'in_progress',
        accepted_at: invitation.accepted_at || new Date().toISOString(),
      });
      return Response.json({ success: true, session, resumed: false });
    }

    const session_id = String(payload.session_id || '');
    const session = await base44.asServiceRole.entities.CandidateSession
      .get(session_id)
      .catch((error) => (error?.status === 404 ? null : Promise.reject(error)));
    if (!session || session.invitation_id !== invitation.id) {
      return Response.json({ error: 'Session not found.' }, { status: 404 });
    }
    if (action === 'update' && (session.status === 'submitted' || session.status === 'evaluated')) {
      return Response.json({ error: 'This assessment has already been submitted.' }, { status: 410 });
    }

    // Submitting again finishes an interrupted run instead of failing. Scoring is
    // deterministic, so the stored answers reproduce the same result.
    const existingScorecards = await base44.asServiceRole.entities.Scorecard.filter({ session_id });
    if (action === 'submit' && existingScorecards.length) {
      const card = existingScorecards[0];
      return Response.json({
        success: true,
        already_submitted: true,
        overall_score: card.overall_score,
        passed: card.passed,
        scorecard_id: card.id,
      });
    }

    const submissions = sanitizeSubmissions(payload.task_submissions);

    // --- UPDATE: persist in-progress answers (scores are never trusted from the browser) ---
    if (action === 'update') {
      const updateData = { task_submissions: submissions };
      if (typeof payload.current_task_index === 'number') {
        updateData.current_task_index = payload.current_task_index;
      }
      await base44.asServiceRole.entities.CandidateSession.update(session_id, updateData);
      return Response.json({ success: true, saved: submissions.length });
    }

    // --- SUBMIT: deterministic objective scoring, then scorecard ---
    const time_elapsed_minutes = Number(payload.time_elapsed_minutes) || 0;
    const tasks = await base44.asServiceRole.entities.AssessmentTask.filter({ assessment_id: session.assessment_id });
    const assessment = await base44.asServiceRole.entities.Assessment.get(session.assessment_id);

    const weights = weightsMapFrom(assessment.scoring_weights);
    const scored = buildResults(tasks, submissions, weights);
    const results = scored.results;

    let narrative = null;
    if (scored.hasManual && results.some((item) => !item.auto_graded)) {
      const manualAnswers = results
        .filter((item) => !item.auto_graded)
        .map((item) => `- ${item.title} (max ${item.points_possible} pts): ${String(item.submitted_answer || '').substring(0, 600)}`)
        .join('\n');

      try {
        narrative = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `You are a senior cybersecurity hiring manager grading the written answers of a candidate assessment.

Assessment: ${assessment.position_title} (${assessment.assessment_type})
Seniority Level: ${assessment.seniority_level}
Candidate: ${session.candidate_name}
Objective score already awarded automatically: ${scored.earned} of ${scored.possible} points

Written answers to grade:
${manualAnswers}

Award points for each written answer strictly against its maximum. Return JSON with a "task_scores" array containing one entry per task_id above.`,
          response_json_schema: {
            type: 'object',
            properties: {
              task_scores: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    task_id: { type: 'string' },
                    points_earned: { type: 'number' },
                    feedback: { type: 'string' },
                  },
                },
              },
              category_scores: { type: 'object' },
              strengths: { type: 'array', items: { type: 'string' } },
              weaknesses: { type: 'array', items: { type: 'string' } },
              missed_steps: { type: 'array', items: { type: 'string' } },
              follow_up_questions: { type: 'array', items: { type: 'string' } },
              smart_summary: { type: 'string' },
              hiring_recommendation: { type: 'string' },
            },
          },
        });
      } catch (error) {
        console.error('Manual answer grading failed, continuing with objective results:', error);
      }
    }

    if (narrative && Array.isArray(narrative.task_scores)) {
      const scoresById = new Map(narrative.task_scores.map((entry) => [String(entry?.task_id || ''), entry]));
      for (const result of results) {
        if (result.auto_graded) continue;
        const graded = scoresById.get(String(result.task_id));
        if (!graded) continue;
        const points = Math.max(0, Math.min(result.points_possible, Number(graded.points_earned) || 0));
        result.points_earned = Math.round(points * 100) / 100;
        result.completion_percentage = result.points_possible
          ? Math.round((result.points_earned / result.points_possible) * 100)
          : 0;
        result.validation_passed = result.completion_percentage >= 70;
        result.evaluator_feedback = String(graded.feedback || '');
      }
    }

    // Theme weights scale each question's earned and possible points, so the
    // overall score stays a bounded percentage of the weighted total.
    const totals = weightedTotals(results, weights);
    const earned = totals.earned;
    const possible = totals.possible;
    const overallScore = totals.score;
    const passed = overallScore >= (Number(assessment.pass_threshold) || 70);

    const correctResults = results.filter((item) => item.correct === true);
    const wrongResults = results.filter((item) => item.correct === false);
    const answeredPct = scored.total ? Math.round((scored.answered / scored.total) * 100) : 0;
    const duration = Number(assessment.duration_minutes) || 0;
    const timePct = duration ? Math.max(0, Math.round(100 - (time_elapsed_minutes / duration) * 50)) : 100;

    const categoryScores = narrative?.category_scores && Object.keys(narrative.category_scores).length
      ? narrative.category_scores
      : {
          answer_accuracy: overallScore,
          completion: answeredPct,
          time_management: timePct,
        };

    await base44.asServiceRole.entities.CandidateSession.update(session_id, {
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      time_elapsed_minutes,
      task_submissions: submissions,
    });
    await base44.asServiceRole.entities.CandidateInvitation.update(invitation.id, {
      status: 'completed',
      completed_at: new Date().toISOString(),
    });

    const scorecard = await base44.asServiceRole.entities.Scorecard.create({
      session_id,
      assessment_id: session.assessment_id,
      candidate_email: session.candidate_email,
      candidate_name: session.candidate_name,
      overall_score: overallScore,
      passed,
      hiring_recommendation: RECOMMENDATIONS.includes(String(narrative?.hiring_recommendation || ''))
        ? narrative.hiring_recommendation
        : recommendationFor(overallScore),
      category_scores: categoryScores,
      task_results: results,
      strengths: narrative?.strengths?.length
        ? narrative.strengths
        : correctResults.slice(0, 4).map((item) => `Answered correctly: ${item.title}`),
      weaknesses: narrative?.weaknesses?.length
        ? narrative.weaknesses
        : wrongResults.slice(0, 4).map((item) => `Incorrect: ${item.title}`),
      missed_steps: narrative?.missed_steps?.length
        ? narrative.missed_steps
        : wrongResults.map((item) => `${item.title} — correct answer: ${item.correct_answer || 'see answer key'}`),
      follow_up_questions: Array.isArray(narrative?.follow_up_questions) ? narrative.follow_up_questions : [],
      smart_summary: narrative?.smart_summary || buildSummary(session.candidate_name, assessment.position_title, overallScore, earned, possible, scored),
      generated_at: new Date().toISOString(),
    });

    await base44.asServiceRole.entities.CandidateSession.update(session_id, { status: 'evaluated' });

    return Response.json({
      success: true,
      overall_score: overallScore,
      passed,
      earned,
      possible,
      scorecard_id: scorecard.id,
    });
  } catch (error) {
    console.error('candidateSessionFlow failed:', error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});