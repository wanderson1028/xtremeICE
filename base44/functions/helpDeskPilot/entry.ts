import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { canEditFeature } from '../../shared/featureAccess.ts';
import { actions, rubric, scenario, scenarioVersion, type ActionKey } from '../../shared/helpDeskPilot.ts';

const slots = ['A', 'B', 'practice'];
const verbs = ['load', 'start', 'observe', 'save', 'submit', 'finalize'];
const limit = 4000;

function fail(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function responseFor(attempt: any) {
  const events = (attempt?.events || []).map((event: { action: ActionKey; at: string }) => ({
    id: event.action,
    label: actions[event.action].label,
    result: actions[event.action].result,
    at: event.at,
  }));
  const toolActions = Object.entries(actions).map(([id, action]) => ({
    id,
    label: action.label,
    tool: action.tool,
    available: id !== 'web_save' || events.some((event: { id: string }) => event.id === 'web_open'),
  }));

  const state = attempt ? {
    slot: attempt.slot,
    status: attempt.status,
    startedAt: attempt.started_at,
    deadlineAt: new Date(Date.parse(attempt.started_at) + scenario.durationMinutes * 60_000).toISOString(),
    submittedAt: attempt.submitted_at,
    finalizedAt: attempt.finalized_at,
    employeeReply: attempt.employee_reply || '',
    ticketNote: attempt.ticket_note || '',
    events,
    observed: {
      deviceChecked: events.some((event: { id: string }) => event.id === 'device' || event.id === 'reproduce'),
      serviceChecked: events.some((event: { id: string }) => event.id === 'status'),
      relevantArticleRead: events.some((event: { id: string }) => event.id === 'kb_launch'),
      saveVerified: events.some((event: { id: string }) => event.id === 'web_save'),
    },
    review: attempt.review || null,
  } : null;
  const reviewRubric = attempt?.status === 'submitted' || attempt?.status === 'finalized' ? rubric : null;
  return Response.json({ scenario, toolActions, state, rubric: reviewRubric });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user?.id) return fail('Sign in to run the interview.', 401);
    if (!await canEditFeature(base44, user, 'soc_assessments')) {
      return fail('Editor access to Candidate Assessments is required.', 403);
    }

    const body = await req.json().catch(() => null);
    if (!body || !slots.includes(body.slot) || !verbs.includes(body.action)) {
      return fail('Select a pilot slot and a supported action.', 400);
    }
    const records = base44.asServiceRole.entities.HelpDeskPilotAttempt;
    const scope = { owner_id: user.id, slot: body.slot, scenario_version: scenarioVersion };
    const rows = await records.filter(scope, 'created_date', 1);
    let current = rows[0];
    if (current?.status === 'in_progress') {
      const deadline = Date.parse(current.started_at) + scenario.durationMinutes * 60_000;
      if (Date.now() >= deadline) {
        const timedOut = { status: 'submitted', submitted_at: new Date(deadline).toISOString() };
        await records.update(current.id, timedOut);
        current = { ...current, ...timedOut };
      }
    }

    if (body.action === 'load') return responseFor(current);
    if (body.action === 'start') {
      if (current) return responseFor(current);
      const created = await records.create({
        ...scope, status: 'in_progress', started_at: new Date().toISOString(),
        events: [], employee_reply: '', ticket_note: '',
      });
      return responseFor(created);
    }
    if (!current) return fail('Start this attempt first.', 409);

    if (body.action === 'finalize') {
      if (current.status === 'finalized') return responseFor(current);
      if (current.status !== 'submitted') return fail('Submit the work sample before scoring.', 409);
      const scores = rubric.map(({ id }) => body.scores?.[id]);
      if (scores.some(score => ![0, 1, 2].includes(score))) {
        return fail('Rate every criterion on the 0–2 scale.', 400);
      }
      if (typeof body.evidence !== 'string' || !body.evidence.trim() || body.evidence.length > limit) {
        return fail('Record a specific evidence note before finalizing.', 400);
      }
      const review = {
        scores: Object.fromEntries(rubric.map(({ id }, index) => [id, scores[index]])),
        total: scores.reduce((sum, score) => sum + score, 0),
        evidence: body.evidence.trim(),
      };
      const patch = { status: 'finalized', finalized_at: new Date().toISOString(), review };
      await records.update(current.id, patch);
      return responseFor({ ...current, ...patch });
    }

    if (current.status !== 'in_progress') {
      if (body.action === 'submit') return responseFor(current);
      return fail('This attempt has already been submitted.', 409);
    }

    if (body.action === 'observe') {
      const key = body.id as ActionKey;
      if (!Object.hasOwn(actions, key)) return fail('Unknown simulated action.', 400);
      const events = Array.isArray(current.events) ? current.events : [];
      if (events.some(event => event.action === key)) return responseFor(current);
      if (key === 'web_save' && !events.some(event => event.action === 'web_open')) {
        return fail('Open the web app before testing a save.', 409);
      }
      const updatedEvents = [...events, { action: key, at: new Date().toISOString() }];
      await records.update(current.id, { events: updatedEvents });
      return responseFor({ ...current, events: updatedEvents });
    }

    const reply = body.employeeReply;
    const note = body.ticketNote;
    if (typeof reply !== 'string' || typeof note !== 'string' || reply.length > limit || note.length > limit) {
      return fail('Each work product must be text of 4,000 characters or fewer.', 400);
    }
    const patch = {
      employee_reply: reply,
      ticket_note: note,
      ...(body.action === 'submit'
        ? { status: 'submitted', submitted_at: new Date().toISOString() }
        : {}),
    };
    await records.update(current.id, patch);
    return responseFor({ ...current, ...patch });
  } catch (error) {
    console.error('helpDeskPilot failed:', error instanceof Error ? error.message : String(error));
    return fail('Pilot data could not be saved or loaded. Try again.', 500);
  }
});
