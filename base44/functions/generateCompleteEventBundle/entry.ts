import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import JSZip from 'npm:jszip@3.10.1';

function generateGNS3Lab(eventData, designData) {
  const slug = (eventData.title || 'CyberEvent').replace(/[^a-zA-Z0-9_]/g, '_');
  return `{
  "version": "2.2.0",
  "name": "${slug}",
  "type": "topology",
  "project_id": "${slug}",
  "topology": {
    "nodes": [
      {
        "name": "Core-Router",
        "node_type": "router",
        "properties": {
          "image": "vios-adventerprisek9-m.03.16.03.S.151-2.S-std.bin",
          "ram": 1024
        }
      }
    ],
    "links": []
  },
  "metadata": {
    "scenario_title": "${eventData.title}",
    "difficulty": "${eventData.difficulty}",
    "duration_minutes": ${eventData.duration_minutes},
    "topology_type": "${designData?.topology_type || 'unknown'}"
  }
}`;
}

function generatePacketTracerFormat(eventData, designData) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<network version="1.0">
  <scenario>
    <title>${eventData.title || 'Cyber Exercise'}</title>
    <description>${eventData.description || ''}</description>
    <difficulty>${eventData.difficulty}</difficulty>
    <duration>${eventData.duration_minutes}</duration>
    <red_team_size>${eventData.red_team_size}</red_team_size>
    <blue_team_size>${eventData.blue_team_size}</blue_team_size>
    <topology_type>${designData?.topology_type || 'unknown'}</topology_type>
  </scenario>
  <devices>
    <!-- Generated Packet Tracer devices from network design -->
  </devices>
</network>`;
}

function generateScenarioMarkdown(eventData) {
  const redObjs = (eventData.red_team_objectives || []).map((o, i) => `${i + 1}. ${o}`).join('\n');
  const blueObjs = (eventData.blue_team_objectives || []).map((o, i) => `${i + 1}. ${o}`).join('\n');
  const whiteObjs = (eventData.white_team_objectives || []).map((o, i) => `${i + 1}. ${o}`).join('\n');
  const redIngress = (eventData.ingress_points || []).filter(p => p.team === 'red');
  const blueIngress = (eventData.ingress_points || []).filter(p => p.team === 'blue');

  return `# ${eventData.title || 'Cyber Exercise Event'}
## Red Team vs Blue Team Exercise

**Difficulty:** ${eventData.difficulty}  
**Duration:** ${eventData.duration_minutes} minutes  
**Status:** ${eventData.status}

---

## Overview
${eventData.description || eventData.scenario_prompt || 'No description provided.'}

---

## Rules of Engagement
${eventData.rules_of_engagement || '_Not specified._'}

---

## 🔴 RED TEAM (MITRE ATT&CK)

### Objectives
${redObjs || '_None defined._'}

### Instructions
${eventData.red_team_directions || '_No directions provided._'}

### Access Points
${redIngress.map(p => `- **${p.role}** on ${p.system} (${p.ip}): ${p.credentials}`).join('\n') || '_None defined._'}

---

## 🔵 BLUE TEAM (NICE Framework)

### Objectives
${blueObjs || '_None defined._'}

### Instructions
${eventData.blue_team_directions || '_No directions provided._'}

### Access Points
${blueIngress.map(p => `- **${p.role}** on ${p.system} (${p.ip}): ${p.credentials}`).join('\n') || '_None defined._'}

---

## ⚪ WHITE TEAM / CONTROLLER

### Objectives
${whiteObjs || '_None defined._'}

### Instructions
${eventData.white_team_directions || '_No directions provided._'}

---

## Scoring Criteria
${eventData.scoring_criteria || '_Not defined._'}

${eventData.flags && eventData.flags.length > 0 ? `
## Flags (${eventData.flags.length})
${eventData.flags.map(f => `- **${f.name}** (${f.points} pts) - ${f.description || 'Flag'}`).join('\n')}
` : ''}
`;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { eventData, designData } = await req.json();

    if (!eventData) {
      return Response.json({ error: 'Event data required' }, { status: 400 });
    }

    const slug = (eventData.title || 'CyberEvent').replace(/[^a-zA-Z0-9_]/g, '_');
    const zip = new JSZip();

    // Scenario documents
    const scenarioMd = generateScenarioMarkdown(eventData);
    zip.file('SCENARIO.md', scenarioMd);

    // Network formats
    if (designData) {
      const gns3Lab = generateGNS3Lab(eventData, designData);
      const packetTracer = generatePacketTracerFormat(eventData, designData);

      zip.file('NETWORK_TOPOLOGY.json', gns3Lab);
      zip.file('NETWORK_TOPOLOGY.pkt', packetTracer);

      // EVE-NG format
      zip.file('EVENG_LAB.unl', `<?xml version="1.0" encoding="UTF-8"?>
<lab name="${slug}" description="${eventData.description || ''}" version="1.0">
  <author>${user.full_name}</author>
  <description>${eventData.title}</description>
  <difficulty>${eventData.difficulty}</difficulty>
</lab>`);
    }

    // Team-specific packets
    const redTeamPacket = `# RED TEAM PACKET - ${eventData.title}
## MITRE ATT&CK Framework

${(eventData.red_team_objectives || []).map((o, i) => `${i + 1}. ${o}`).join('\n')}

### Instructions
${eventData.red_team_directions || 'No instructions provided.'}

### Access Points
${(eventData.ingress_points || []).filter(p => p.team === 'red').map(p => `- ${p.role} on ${p.system} (${p.ip}): ${p.credentials}`).join('\n')}
`;

    const blueTeamPacket = `# BLUE TEAM PACKET - ${eventData.title}
## NICE Cybersecurity Workforce Framework

${(eventData.blue_team_objectives || []).map((o, i) => `${i + 1}. ${o}`).join('\n')}

### Instructions
${eventData.blue_team_directions || 'No instructions provided.'}

### Defensive Focus
Monitor for red team ingress and lateral movement attempts.
`;

    zip.file('TEAM_PACKETS/RED_TEAM_PACKET.md', redTeamPacket);
    zip.file('TEAM_PACKETS/BLUE_TEAM_PACKET.md', blueTeamPacket);

    // Metadata
    zip.file('EVENT_METADATA.json', JSON.stringify({
      event_title: eventData.title,
      event_id: eventData.id,
      difficulty: eventData.difficulty,
      duration_minutes: eventData.duration_minutes,
      red_team_size: eventData.red_team_size,
      blue_team_size: eventData.blue_team_size,
      white_team_size: eventData.white_team_size,
      status: eventData.status,
      created_date: eventData.created_date,
      network_design_id: eventData.network_design_id,
      network_design_name: designData?.name || null,
      exported_at: new Date().toISOString(),
      exported_by: user.email,
    }, null, 2));

    const blob = await zip.generateAsync({ type: 'arraybuffer' });
    return new Response(blob, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${slug}_Complete_Event.zip"`,
      },
    });
  } catch (error) {
    console.error('Export error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});