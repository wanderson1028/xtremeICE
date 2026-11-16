import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Clears a candidate's attempt so the assessment can be taken again: their
// sessions and results are removed and the invitation returns to "invited".
// The invitation email is re-sent by the caller through sendCandidateInvite.

// filter() without options returns an array; with options it returns { items }.
function asList(result) {
  if (Array.isArray(result)) return result;
  return result?.items || [];
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { invitation_id } = await req.json().catch(() => ({}));
    const invitationId = String(invitation_id || '').trim();
    if (!invitationId) return Response.json({ error: 'invitation_id is required' }, { status: 400 });

    const invitation = await base44.entities.CandidateInvitation
      .get(invitationId)
      .catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!invitation) return Response.json({ error: 'Invitation not found' }, { status: 404 });
    if (user.role !== 'admin' && invitation.invited_by_id !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sr = base44.asServiceRole;
    const candidateEmail = String(invitation.candidate_email || '').toLowerCase();

    // One attempt per candidate per assessment is enforced by email, so every
    // session and result this candidate has on this assessment is cleared.
    const sessions = asList(await sr.entities.CandidateSession.filter({
      assessment_id: invitation.assessment_id,
    }));
    const attemptSessions = sessions.filter(
      (session) =>
        session.invitation_id === invitation.id
        || String(session.candidate_email || '').toLowerCase() === candidateEmail
    );

    for (const session of attemptSessions) {
      const scorecards = asList(await sr.entities.Scorecard.filter({ session_id: session.id }));
      await Promise.allSettled(scorecards.map((card) => sr.entities.Scorecard.delete(card.id)));
      await sr.entities.CandidateSession.delete(session.id).catch(() => null);
    }

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    const updated = await sr.entities.CandidateInvitation.update(invitation.id, {
      status: 'pending',
      expires_at: expiresAt,
      accepted_at: null,
      completed_at: null,
      email_delivery_status: 'pending',
      email_delivery_error: '',
    }).catch(() => sr.entities.CandidateInvitation.update(invitation.id, {
      status: 'pending',
      expires_at: expiresAt,
      email_delivery_status: 'pending',
      email_delivery_error: '',
    }));

    return Response.json({
      success: true,
      cleared_sessions: attemptSessions.length,
      invitation: updated,
    });
  } catch (error) {
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
}