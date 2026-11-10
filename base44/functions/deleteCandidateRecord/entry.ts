import { createClientFromRequest } from 'npm:@base44/sdk@0.8.54';

// Deletes a candidate invitation (with its session + scorecard) or an entire
// assessment (with its questions, invitations, sessions and scorecards).
// Child cleanup runs under the service role because candidates own those records
// and a recruiter cannot delete them directly.

function chunk(list, size) {
  const out = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

async function deleteSessionsAndScorecards(sr, sessionIds) {
  if (!sessionIds.length) return;
  for (const batch of chunk(sessionIds, 20)) {
    const scorecards = await sr.entities.Scorecard.filter({ session_id: { $in: batch } });
    await Promise.allSettled(scorecards.items.map((sc) => sr.entities.Scorecard.delete(sc.id)));
  }
  for (const batch of chunk(sessionIds, 20)) {
    await Promise.allSettled(batch.map((id) => sr.entities.CandidateSession.delete(id)));
  }
}

export default async function (req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { kind, id } = await req.json().catch(() => ({}));
    if (!kind || !id) return Response.json({ error: 'kind and id are required' }, { status: 400 });
    if (!['invitation', 'assessment'].includes(kind)) {
      return Response.json({ error: 'Unsupported kind' }, { status: 400 });
    }

    const isAdmin = user.role === 'admin';

    if (kind === 'invitation') {
      const inv = await base44.entities.CandidateInvitation.get(id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
      if (!inv) return Response.json({ error: 'Invitation not found' }, { status: 404 });
      if (!isAdmin && inv.invited_by_id !== user.id) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      const sessions = await base44.entities.CandidateSession.filter({ invitation_id: id });
      await deleteSessionsAndScorecards(base44.asServiceRole, sessions.items.map((s) => s.id));
      await base44.entities.CandidateInvitation.delete(id);
      return Response.json({ success: true });
    }

    const assessment = await base44.entities.Assessment.get(id).catch((e) => (e.status === 404 ? null : Promise.reject(e)));
    if (!assessment) return Response.json({ error: 'Assessment not found' }, { status: 404 });
    if (!isAdmin && assessment.created_by_id !== user.id) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const sr = base44.asServiceRole;
    const tasks = await sr.entities.AssessmentTask.filter({ assessment_id: id });
    const invitations = await sr.entities.CandidateInvitation.filter({ assessment_id: id });
    const sessions = await sr.entities.CandidateSession.filter({ assessment_id: id });

    await deleteSessionsAndScorecards(sr, sessions.items.map((s) => s.id));
    await Promise.allSettled(invitations.items.map((inv) => sr.entities.CandidateInvitation.delete(inv.id)));
    await Promise.allSettled(tasks.items.map((task) => sr.entities.AssessmentTask.delete(task.id)));
    await base44.entities.Assessment.delete(id);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}