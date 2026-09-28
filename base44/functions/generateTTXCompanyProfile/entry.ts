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
  const normalized = raw.startsWith('//') ? 'https:' + raw : /^[a-z][a-z0-9+.-]*:/i.test(raw) ? raw : 'https://' + raw;
  try { url = new URL(normalized); } catch { throw new Error('Enter a valid public company URL.'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only HTTP or HTTPS URLs are allowed.');
  const h = url.hostname.toLowerCase();
  if (url.username || url.password || h === 'localhost' || h.endsWith('.local') || h.endsWith('.internal') || !h.includes('.') || /^\d+(\.\d+){3}$/.test(h)) {
    throw new Error('Enter a public company website URL.');
  }
  return url;
}

export default async function(req: Request) {
  let stage = 'authentication';
  const requestId = crypto.randomUUID();
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      const access = await base44.entities.UserService.filter({ user_email: user.email, service_key: 'tabletop_exercises' });
      if (!access?.length) return Response.json({ error: 'Tabletop Exercises access is not assigned.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    stage = 'URL validation';
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

    stage = 'website research';
    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: PROFILE_SCHEMA,
      add_context_from_internet: true
    });
    stage = 'profile validation';
    const profile = typeof result === 'string' ? JSON.parse(result.replace(/^\s*```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')) : result;
    if (!profile || typeof profile !== 'object' || Array.isArray(profile) || typeof profile.company_name !== 'string' || !profile.company_name.trim()) throw new Error('Incomplete profile');
    for (const [key, schema] of Object.entries(PROFILE_SCHEMA.properties)) {
      if (schema.type === 'array' && (!Array.isArray(profile[key]) || !profile[key].every((value: unknown) => typeof value === 'string'))) profile[key] = ['Needs customer confirmation'];
      if (schema.type === 'string' && typeof profile[key] !== 'string') profile[key] = 'Needs customer confirmation';
      if (schema.type === 'number' && (!Number.isFinite(profile[key]) || profile[key] < 0)) profile[key] = 0;
    }
    profile.source_url = url.toString();
    return Response.json({ profile });
  } catch (error) {
    const upstream = Number((error as any)?.response?.status || (error as any)?.status || 0);
    const status = stage === 'URL validation' ? 400 : [401,403].includes(upstream) ? upstream : stage === 'profile validation' ? 422 : 503;
    const message = stage === 'URL validation' && error instanceof Error ? error.message : status === 401 ? 'Your session expired. Sign in again.' : status === 403 ? 'Website research is not available for this account.' : stage === 'profile validation' ? 'Website research returned an incomplete company profile. Please retry or build the profile manually.' : 'Company website research could not complete. Please retry or build the profile manually.';
    console.error(JSON.stringify({event:'ttx_profile_generation_failed',stage,status,request_id:requestId}));
    return Response.json({ error: message, stage, request_id: requestId }, { status });
  }
}
