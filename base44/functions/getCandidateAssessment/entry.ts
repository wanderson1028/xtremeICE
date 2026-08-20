import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token } = await req.json();
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
    if (expired && invitation.status !== 'expired') {
      await base44.asServiceRole.entities.CandidateInvitation.update(invitation.id, { status: 'expired' });
    }

    const assessment = await base44.asServiceRole.entities.Assessment.get(invitation.assessment_id);
    const tasks = await base44.asServiceRole.entities.AssessmentTask.filter({ assessment_id: invitation.assessment_id });

    // Return only the fields needed by the candidate experience.
    return Response.json({
      invitation: { ...invitation, expired },
      assessment,
      tasks: tasks.sort((a, b) => (a.order || 0) - (b.order || 0)),
    });
  } catch (error) {
    console.error('getCandidateAssessment failed:', error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});
