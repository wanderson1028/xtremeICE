import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

// Takes a ThreatFeedItem id, loads the record, and calls InvokeLLM to generate
// a full scenario object compatible with the existing SOC simulation engine.

const ENDPOINT_LIST = [
  { id: 'win-ws-01', name: 'DESKTOP-WIN01', os: 'Windows 10', ip: '10.0.1.10', role: 'Workstation' },
  { id: 'win-ws-02', name: 'DESKTOP-WIN02', os: 'Windows 10', ip: '10.0.1.11', role: 'Workstation' },
  { id: 'win-srv-01', name: 'SERVER-WIN01', os: 'Windows Server 2019', ip: '10.0.2.10', role: 'File Server' },
  { id: 'dc-01', name: 'DC-PRIMARY', os: 'Windows Server 2022', ip: '10.0.2.5', role: 'Domain Controller' },
  { id: 'linux-srv-01', name: 'LINUX-APP01', os: 'Ubuntu 22.04', ip: '10.0.2.20', role: 'App Server' },
  { id: 'linux-web-01', name: 'LINUX-WEB01', os: 'Ubuntu 20.04', ip: '10.0.3.10', role: 'Web Server' },
  { id: 'vpn-gw', name: 'VPN-GATEWAY', os: 'FortiOS 7.2', ip: '203.0.113.1', role: 'VPN Gateway' },
  { id: 'fw-01', name: 'FIREWALL-EDGE', os: 'Palo Alto PAN-OS', ip: '203.0.113.254', role: 'Firewall' },
];

const IOC_TYPES = ['attackerIP', 'compromisedUser', 'maliciousFile', 'maliciousProcess', 'persistence'];

const SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    name: { type: 'string' },
    category: { type: 'string' },
    difficulty: { type: 'string', enum: ['Beginner'] },
    duration_min: { type: 'number' },
    description: { type: 'string' },
    mitre: { type: 'array', items: { type: 'string' } },
    compromisedEndpoints: { type: 'array', items: { type: 'string' } },
    iocProfile: {
      type: 'object',
      properties: {
        iocs: { type: 'array', items: { type: 'string' } },
        patientZero: { type: 'string' },
      },
    },
    alerts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          sev: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          src: { type: 'string' },
          tactic: { type: 'string' },
          rule: { type: 'string' },
        },
      },
    },
    logs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          ts: { type: 'number' },
          src: { type: 'string' },
          type: { type: 'string' },
          sev: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
          msg: { type: 'string' },
        },
      },
    },
    edrDetections: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          process: { type: 'string' },
          cmdline: { type: 'string' },
          parent: { type: 'string' },
          severity: { type: 'string', enum: ['medium', 'high', 'critical'] },
          mitre: { type: 'string' },
          endpointId: { type: 'string' },
        },
      },
    },
    escalationEvents: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          atMinute: { type: 'number' },
          alert: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              sev: { type: 'string' },
              src: { type: 'string' },
              tactic: { type: 'string' },
              rule: { type: 'string' },
            },
          },
          log: {
            type: 'object',
            properties: {
              src: { type: 'string' },
              type: { type: 'string' },
              sev: { type: 'string' },
              msg: { type: 'string' },
            },
          },
          spreadTo: { type: 'array', items: { type: 'string' } },
          threatIncrease: { type: 'number' },
          message: { type: 'string' },
        },
      },
    },
  },
  required: ['id', 'name', 'category', 'difficulty', 'duration_min', 'description', 'mitre', 'compromisedEndpoints', 'iocProfile', 'alerts', 'logs', 'escalationEvents'],
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const feedItemId = body.feed_item_id;
    if (!feedItemId) return Response.json({ error: 'feed_item_id is required' }, { status: 400 });

    const feedItem = await base44.entities.ThreatFeedItem.get(feedItemId);
    if (!feedItem) return Response.json({ error: 'Threat feed item not found' }, { status: 404 });

    const scenarioId = `dyn-${feedItem.external_id.replace(/[^a-zA-Z0-9]/g, '_')}`;

    const endpointSummary = ENDPOINT_LIST.map(e => `${e.id} (${e.name}, ${e.role}, ${e.ip})`).join('\n');

    const prompt = `You are a cybersecurity training scenario designer. Generate a beginner-level SOC incident response training scenario based on this REAL vulnerability/attack:

**Attack Details:**
- Source: ${feedItem.source}
- CVE/ID: ${feedItem.cve_id || feedItem.external_id}
- Title: ${feedItem.title}
- Description: ${feedItem.description}
- CVSS Score: ${feedItem.severity ?? 'Unknown'}
- Affected Products: ${(feedItem.affected_products || []).join(', ')}

**Available Endpoints (use these exact IDs):**
${endpointSummary}

**IOC Types available:** ${IOC_TYPES.join(', ')}

Generate a complete training scenario. The scenario must:
1. Be beginner-friendly (difficulty: "Beginner", duration ~15-20 min)
2. Use ONLY endpoint IDs from the list above
3. Map the real vulnerability to a plausible incident in a corporate network
4. Include 3-5 initial alerts, 5-8 SIEM logs (ts = minutes before now, negative numbers), 2-4 EDR detections
5. Include 3 escalation events (at minutes 1, 2, 3) that fire if the attack isn't contained
6. Choose 1-3 IOC types for the iocProfile that match the attack pattern
7. Set compromisedEndpoints to the initially compromised endpoints
8. Use realistic MITRE ATT&CK technique IDs

Return ONLY the JSON object matching the schema. Make all alert/log messages realistic and specific with IPs, usernames, and file paths from the endpoint list.`;

    const llmResponse = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: SCHEMA,
      model: 'claude_sonnet_4_6',
    });

    // Ensure the id matches our convention
    const scenario = typeof llmResponse === 'string' ? JSON.parse(llmResponse) : llmResponse;
    scenario.id = scenarioId;
    scenario.difficulty = 'Beginner';

    return Response.json({ scenario });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}