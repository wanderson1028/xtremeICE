import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const SCORING_VERSION = 'TTX-2026.1';
const CATEGORIES = [
  'preparation_governance','detection_analysis','escalation_command','containment',
  'eradication_remediation','recovery_restoration','communications','legal_evidence','lessons_improvement'
];

const SCHEMA = {
  type: 'object',
  properties: {
    title: { type: 'string' },
    executive_brief: { type: 'string' },
    objectives: { type: 'array', items: { type: 'string' } },
    assumptions: { type: 'array', items: { type: 'string' } },
    injects: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          sequence: { type: 'number' },
          phase: { type: 'string', enum: CATEGORIES },
          delivery_channel: { type: 'string', enum: ['email','phone','siem','news','vendor','regulator','executive'] },
          time_label: { type: 'string' },
          situation: { type: 'string' },
          question: { type: 'string' },
          choices: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                label: { type: 'string' },
                points: { type: 'number' },
                rationale: { type: 'string' },
                consequence: { type: 'string' },
                tags: { type: 'array', items: { type: 'string' } }
              },
              required: ['id','label','points','rationale','consequence']
            }
          },
          facilitator_note: { type: 'string' }
        },
        required: ['id','sequence','phase','delivery_channel','time_label','situation','question','choices']
      }
    },
    recovery_complications: { type: 'array', items: { type: 'string' } },
    closing_summary: { type: 'string' }
  },
  required: ['title','executive_brief','objectives','assumptions','injects','recovery_complications','closing_summary']
};

function shuffle<T>(items: T[]) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    if (user.role !== 'admin') {
      const access = await base44.entities.UserService.filter({
        user_email: user.email,
        service_key: 'tabletop_exercises'
      });
      if (!access?.length) return Response.json({ error: 'Tabletop Exercises access is not assigned.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const { profile, attack_category, attack_scenario, disaster_type, geography, difficulty } = body;
    if (!profile?.company_name || !attack_category || !attack_scenario) {
      return Response.json({ error: 'A saved company profile, attack category, and attack scenario are required.' }, { status: 400 });
    }

    const seed = crypto.randomUUID();
    const feed = await base44.entities.ThreatFeedItem.list('-published_date', 30);
    const threats = shuffle((feed || []).filter((x: any) => x.title)).slice(0, 6);
    const threatContext = threats.map((x: any) => ({
      source: x.source,
      id: x.cve_id || x.external_id,
      title: x.title,
      severity: x.severity_label || x.severity || 'unknown',
      products: x.affected_products || []
    }));

    const profileText = JSON.stringify({
      company_name: profile.company_name,
      industry: profile.industry,
      employee_count: profile.employee_count,
      headquarters: profile.headquarters,
      operating_locations: profile.operating_locations,
      critical_services: profile.critical_services,
      technology_stack: profile.technology_stack,
      regulated_data: profile.regulated_data,
      response_team: profile.response_team,
      third_parties: profile.third_parties,
      backup_strategy: profile.backup_strategy,
      rto_hours: profile.rto_hours,
      rpo_hours: profile.rpo_hours,
      primary_geography: profile.primary_geography
    });

    const prompt = `You are an expert cyber incident and business-resilience exercise designer. Create a realistic, executive-friendly CYBER tabletop exercise for the company profile below. Disaster recovery is a complicating factor inside the cyber incident, never a separate scenario.

COMPANY PROFILE:
${profileText}

EXERCISE REQUEST:
- Exercise type: Cyber tabletop exercise with an integrated disaster-recovery factor
- Attack category: ${attack_category || 'not applicable'}
- Attack scenario: ${attack_scenario || 'not applicable'}
- Disaster-recovery factor selected by user: ${disaster_type || 'regional operational disruption'}
- Geographic area: ${geography || profile.primary_geography}
- Difficulty: ${difficulty || 'standard'}
- Unique scenario seed: ${seed}

RECENT THREAT INTELLIGENCE:
${JSON.stringify(threatContext)}

Requirements:
1. Return exactly 8 sequential injects. Cover at least 6 different incident-response categories from: ${CATEGORIES.join(', ')}.
2. The selected cyberattack is always the primary event. Weave the disaster-recovery factor into the same incident as a realistic complication affecting staffing, facilities, communications, utilities, vendors, backups, recovery capacity, or restoration timing. Do not create a separate disaster storyline.
3. Personalize affected services, stakeholders, locations, vendors, time objectives, and decisions to this company profile.
4. Every inject must have exactly 3 plausible choices. Avoid obviously correct wording. One choice scores 75-100, one 35-70, and one 0-30; randomize their order for every inject.
5. Consequences must change the apparent business situation and explain operational impact in plain language. Do not expose points before selection.
6. Include imperfect information, time pressure, communications, legal/regulatory concerns, recovery validation, and an executive decision.
7. Use current threat intelligence only as realistic inspiration. Do not claim a feed item directly targets this company.
8. Vary names, timing, entry point, affected service, vendor role, communications pressure, and recovery complication using the seed, so repeat exercises cannot be memorized.
9. Use plain business language, not unexplained technical jargon. Keep each situation under 110 words and each choice under 35 words.
10. The exercise must be safe and defensive. Do not provide exploit instructions.

Return only JSON matching the schema.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: SCHEMA,
      model: 'claude_sonnet_4_6'
    });
    const exercise = typeof result === 'string' ? JSON.parse(result) : result;
    exercise.injects = (exercise.injects || []).slice(0, 8).map((inject: any, i: number) => ({
      ...inject,
      id: inject.id || `inject-${i + 1}`,
      sequence: i + 1,
      choices: shuffle((inject.choices || []).slice(0, 3)).map((choice: any, j: number) => ({
        ...choice,
        id: choice.id || `choice-${i + 1}-${j + 1}`,
        points: Math.max(0, Math.min(100, Number(choice.points) || 0))
      }))
    }));

    return Response.json({
      scenario_seed: seed,
      scoring_version: SCORING_VERSION,
      threat_sources: threatContext.map((x: any) => `${x.source}: ${x.id || x.title}`),
      exercise
    });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : 'Exercise generation failed' }, { status: 500 });
  }
}
