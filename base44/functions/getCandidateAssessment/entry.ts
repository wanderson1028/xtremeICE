import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { toPublicTask } from '../../shared/objectiveScoring.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json().catch(() => ({}));
    const normalizedToken = String(token || '').trim();

    if (!/^[a-f0-9]{64}$/.test(normalizedToken)) {
      return Response.json({ error: 'Invalid invitation link.' }, { status: 400 });
    }

    const invitations = await base44.asServiceRole.entities.CandidateInvitation.filter({ invite_token: normalizedToken });
    if (!invitations.length) {
      return Response.json({ error: 'Invitation not found.' }, { status: 404 });
    }

    const invitation = invitations[0];
    const expired = Boolean(invitation.expires_at && new Date(invitation.expires_at) < new Date());
    if (expired && invitation.status !== 'expired' && invitation.status !== 'completed') {
      await base44.asServiceRole.entities.CandidateInvitation.update(invitation.id, { status: 'expired' });
    }

    const assessment = await base44.asServiceRole.entities.Assessment.get(invitation.assessment_id);
    const tasks = await base44.asServiceRole.entities.AssessmentTask.filter({ assessment_id: invitation.assessment_id });

    // Resume support: hand back the candidate's open session so a refresh never loses progress.
    const sessions = await base44.asServiceRole.entities.CandidateSession.filter({ invitation_id: invitation.id });
    const openSession = sessions.find((session) => session.status === 'in_progress' || session.status === 'not_started') || null;
    const submittedSession = sessions.find((session) => session.status === 'submitted' || session.status === 'evaluated') || null;

    return Response.json({
      invitation: { ...invitation, expired },
      assessment,
      // Answer keys are stripped server-side so they never reach the candidate's browser.
      tasks: tasks
        .sort((a, b) => (a.order || 0) - (b.order || 0))
        .map(toPublicTask),
      session: openSession,
      already_submitted: Boolean(submittedSession) || invitation.status === 'completed',
    });
  } catch (error) {
    console.error('getCandidateAssessment failed:', error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});