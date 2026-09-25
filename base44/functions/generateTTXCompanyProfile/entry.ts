import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const PROFILE_SCHEMA = {
  type: 'object',
  properties: {
    company_name: { type: 'string' },
    industry: { type: 'string' },
    employee_count: { type: 'number' },
    annual_revenue_range: { type: 'string' },
    headquarters: { type: 'string' },
    operating_locations: { type: 'array', items: { type: 'string' } },
    critical_services: { type: 'array', items: { type: 'string' } },
    technology_stack: { type: 'array', items: { type: 'string' } },
    regulated_data: { type: 'array', items: { type: 'string' } },
    response_team: { type: 'array', items: { type: 'string' } },
    third_parties: { type: 'array', items: { type: 'string' } },
    backup_strategy: { type: 'string' },
    rto_hours: { type: 'number' },
    rpo_hours: { type: 'number' },
    primary_geography: { type: 'string' },
    source_url: { type: 'string' },
    confidence_notes: { type: 'array', items: { type: 'string' } }
  },
  required: ['company_name','industry','headquarters','operating_locations','critical_services','technology_stack','regulated_data','response_team','third_parties','backup_strategy','rto_hours','rpo_hours','primary_geography','source_url','confidence_notes']
};

function validateUrl(raw: string) {
  let url: URL;
  try { url = new URL(raw); } catch { throw new Error('Enter a valid public company URL.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP or HTTPS URLs are allowed.');
  const h = url.hostname.toLowerCase();
  if (h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || !h.includes('.')) {
    throw new Error('Enter a public company website URL.');
  }
  return url;
}

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      const access = await base44.entities.UserService.filter({ user_email: user.email, service_key: 'tabletop_exercises' });
      if (!access?.length) return Response.json({ error: 'Tabletop Exercises access is not assigned.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const url = validateUrl(String(body.url || '').trim());
    const prompt = `Research this public company website and create a DRAFT cyber tabletop company profile: ${url.toString()}

Rules:
- Use only facts that can be supported by the public website or clearly attributable public sources.
- Never invent employee counts, technology, vendors, regulated data, backup capabilities, RTO, RPO, or response-team structure.
- For unknown text fields, use "Needs customer confirmation".
- For unknown arrays, use ["Needs customer confirmation"].
- For unknown numbers, use 0.
- Infer the broad industry only when public information clearly supports it.
- Add confidence_notes identifying every field the user must verify.
- This is a reviewable draft, not a verified security assessment.
- Return only JSON matching the schema.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: PROFILE_SCHEMA,
      add_context_from_internet: true,
      model: 'claude_sonnet_4_6'
    });
    const profile = typeof result === 'string' ? JSON.parse(result) : result;
    profile.source_url = url.toString();
    return Response.json({ profile });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Unable to create a profile from this URL.' }, { status: 400 });
  }
}
