import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { toPublicTask } from '../../shared/objectiveScoring.ts';

function hashSeed(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

// Each candidate gets their own question order, seeded by their invitation token
// so a refresh or resume shows exactly the same sequence.
function seededShuffle(list, seed) {
  const out = [...list];
  let state = seed || 1;
  for (let i = out.length - 1; i > 0; i -= 1) {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    const rand = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    const j = Math.floor(rand * (i + 1));
    const swap = out[i];
    out[i] = out[j];
    out[j] = swap;
  }
  return out;
}

// Matching choices are authored (and often auto-generated) in the same order as the
// prompts, which lets a candidate line them up positionally. Give every candidate a
// seeded order instead, and never hand back an order that still mirrors the answers.
function withShuffledChoices(task, token) {
  if (String(task?.question_type || '') !== 'matching') return task;

  const choices = Array.isArray(task.matching_choices) ? task.matching_choices : [];
  if (choices.length < 2) return task;

  let ordered = seededShuffle(choices, hashSeed(`${token}:${task.id}:choices`));

  const prompts = Array.isArray(task.matching_prompts) ? task.matching_prompts : [];
  const key = task.matching_answer && typeof task.matching_answer === 'object' ? task.matching_answer : {};
  const mirrorsAnswers =
    prompts.length === ordered.length &&
    ordered.every((choice, index) => String(key[prompts[index]?.id] || '') === String(choice.id));
  if (mirrorsAnswers) ordered = [...ordered.slice(1), ordered[0]];

  return { ...task, matching_choices: ordered };
}

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

    // One attempt per candidate per assessment: once this candidate has submitted,
    // the questions are never served again, even from another invitation link.
    const attemptSessions = await base44.asServiceRole.entities.CandidateSession.filter({
      assessment_id: invitation.assessment_id,
    });
    const candidateEmail = String(invitation.candidate_email || '').toLowerCase();
    const alreadySubmitted =
      invitation.status === 'completed' ||
      attemptSessions.some(
        (entry) =>
          String(entry.candidate_email || '').toLowerCase() === candidateEmail &&
          (entry.status === 'submitted' || entry.status === 'evaluated')
      );

    return Response.json({
      invitation: { ...invitation, expired },
      assessment,
      // Answer keys are stripped server-side so they never reach the candidate's browser,
      // and the order is shuffled per candidate so no two candidates see the same sequence.
      // A submitted candidate gets no questions at all.
      tasks: alreadySubmitted
        ? []
        : seededShuffle(
            tasks
              .sort((a, b) => (a.order || 0) - (b.order || 0))
              .map((task) => withShuffledChoices(task, normalizedToken))
              .map(toPublicTask),
            hashSeed(normalizedToken)
          ).map((task, index) => ({ ...task, order: index + 1 })),
      session: openSession,
      already_submitted: alreadySubmitted,
    });
  } catch (error) {
    console.error('getCandidateAssessment failed:', error);
    return Response.json({ error: error?.message || String(error) }, { status: 500 });
  }
});