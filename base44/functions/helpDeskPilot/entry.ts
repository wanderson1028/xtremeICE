import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { canEditFeature } from '../../shared/featureAccess.ts';
import { applyPilotAction, pilotView, scenarioVersion, validPilotRequest } from './state.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch(() => null);
    if (!user?.id) return Response.json({ error: 'Sign in to run the interview.' }, { status: 401 });
    if (!await canEditFeature(base44, user, 'soc_assessments')) {
      return Response.json({ error: 'Editor access to Candidate Assessments is required.' }, { status: 403 });
    }
    const body = await req.json().catch(() => null);
    if (!validPilotRequest(body)) {
      return Response.json({ error: 'Select a pilot slot and a supported action.' }, { status: 400 });
    }
    const records = base44.asServiceRole.entities.HelpDeskPilotAttempt;
    const scope = { owner_id: user.id, slot: body.slot, scenario_version: scenarioVersion };
    let current;
    try {
      current = (await records.filter(scope, 'created_date', 1))[0];
    } catch (error) {
      console.error('Pilot storage unavailable:', error instanceof Error ? error.message : String(error));
      return Response.json({ error: 'Branch storage is unavailable.', code: 'pilot_storage_unavailable' }, { status: 503 });
    }

    const result = applyPilotAction(current || null, body);
    if ('error' in result) return Response.json({ error: result.error }, { status: result.status });
    if (result.changes && current) await records.update(current.id, result.changes);
    if (result.changes && !current) await records.create({ ...scope, ...result.changes });
    return Response.json(pilotView(result.attempt, 'server'));
  } catch (error) {
    console.error('helpDeskPilot failed:', error instanceof Error ? error.message : String(error));
    return Response.json({ error: 'Pilot data could not be saved or loaded. Try again.' }, { status: 500 });
  }
});
