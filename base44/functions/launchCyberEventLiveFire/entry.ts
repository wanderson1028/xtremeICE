import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const TYPE_MAP = {
  internet: 'cloud_resource',
  cloud: 'cloud_resource',
  router: 'router',
  switch: 'switch',
  firewall: 'firewall',
  server: 'server',
  workstation: 'workstation',
  pc: 'workstation',
  wireless: 'router',
  wap: 'router',
  loadbalancer: 'security_appliance',
  load_balancer: 'security_appliance',
  ids: 'security_appliance',
  ips: 'security_appliance',
  siem: 'monitoring',
  nas: 'server',
  ot: 'server',
};

const COST_MAP = {
  router: 0.18,
  switch: 0.12,
  firewall: 0.22,
  server: 0.15,
  workstation: 0.08,
  cloud_resource: 0.15,
  security_appliance: 0.22,
  monitoring: 0.18,
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { cyber_event_id, cloud_provider = 'aws', region = 'us-east-1', visibility = 'private', auto_shutdown_minutes = 120 } = await req.json();
    if (!cyber_event_id) return Response.json({ error: 'cyber_event_id is required' }, { status: 400 });

    const svc = base44.asServiceRole;
    const event = await svc.entities.CyberEvent.get(cyber_event_id);
    if (!event) return Response.json({ error: 'Saved Red vs Blue scenario not found' }, { status: 404 });
    if (!event.network_design_id) {
      return Response.json({ error: 'Link a Network Design to this scenario before launching it in Live Fire.' }, { status: 400 });
    }

    const design = await svc.entities.NetworkDesign.get(event.network_design_id);
    if (!design) return Response.json({ error: 'The linked Network Design could not be found.' }, { status: 404 });

    const source = parseDiagram(design.diagram_data);
    if (!source.nodes.length) {
      return Response.json({ error: 'The linked design does not have a generated topology. Open the design and generate its topology first.' }, { status: 400 });
    }

    const devices = source.nodes.map((node, index) => {
      const type = TYPE_MAP[String(node.type || '').toLowerCase()] || 'server';
      return {
        id: String(node.id || `dev_${index + 1}`),
        type,
        icon_id: type,
        name: String(node.label || node.name || `${type}_${index + 1}`).replace(/\n/g, ' '),
        position_x: Number(node.x ?? (180 + (index % 4) * 170)),
        position_y: Number(node.y ?? (120 + Math.floor(index / 4) * 170)),
        connections: [],
        cpu_cores: type === 'workstation' ? 2 : 4,
        ram_mb: type === 'workstation' ? 4096 : 8192,
        storage_gb: type === 'workstation' ? 30 : 50,
        status: 'pending',
        ami_image_id: null,
        cost_per_hour: COST_MAP[type] || 0.15,
        subnet: inferSubnet(node, event.ingress_points),
        ip_address: node.ip || node.ip_address || null,
        source_network_node_id: String(node.id || ''),
      };
    });

    const byId = new Map(devices.map(device => [device.id, device]));
    for (const link of source.links) {
      const fromId = String(link.from ?? link.source ?? '');
      const toId = String(link.to ?? link.target ?? '');
      const from = byId.get(fromId);
      const to = byId.get(toId);
      if (!from || !to || fromId === toId) continue;
      if (!from.connections.some(c => c.target_device_id === toId)) {
        const fromIndex = from.connections.length;
        const toIndex = to.connections.length;
        from.connections.push({
          target_device_id: toId,
          source_interface: `eth${fromIndex}`,
          target_interface: `eth${toIndex}`,
          connection_type: 'ethernet',
          bandwidth_mbps: link.wan ? 100 : 1000,
          label: link.label || null,
        });
        to.connections.push({
          target_device_id: fromId,
          source_interface: `eth${toIndex}`,
          target_interface: `eth${fromIndex}`,
          connection_type: 'ethernet',
          bandwidth_mbps: link.wan ? 100 : 1000,
          label: link.label || null,
        });
      }
    }

    const zone = region + 'a';
    const exerciseConfig = {
      source_event_id: event.id,
      source_network_design_id: design.id,
      title: event.title,
      description: event.description,
      difficulty: event.difficulty,
      duration_minutes: event.duration_minutes,
      team_sizes: {
        red: event.red_team_size || 2,
        blue: event.blue_team_size || 2,
        white: event.white_team_size || 1,
      },
      red_team_objectives: event.red_team_objectives || [],
      blue_team_objectives: event.blue_team_objectives || [],
      white_team_objectives: event.white_team_objectives || [],
      red_team_directions: event.red_team_directions || '',
      blue_team_directions: event.blue_team_directions || '',
      white_team_directions: event.white_team_directions || '',
      ingress_points: event.ingress_points || [],
      rules_of_engagement: event.rules_of_engagement || '',
      scoring_criteria: event.scoring_criteria || '',
      flags: event.flags || [],
      financial_impact: event.financial_impact || null,
      linked_at: new Date().toISOString(),
    };

    const lab = await svc.entities.LiveFireLab.create({
      name: `${event.title} — Live Fire`,
      description: event.description || event.scenario_prompt || 'Red vs Blue live-fire exercise',
      tags: ['red-vs-blue', 'cyber-event', String(event.difficulty || 'intermediate').toLowerCase()],
      category: 'Purple Team',
      difficulty: event.difficulty || 'Intermediate',
      visibility,
      cloud_provider,
      region,
      status: 'draft',
      collaboration_enabled: true,
      organization_id: user.organization_id || null,
      auto_shutdown_minutes,
      device_count: devices.length,
      estimated_cost_hourly: devices.reduce((sum, d) => sum + (d.cost_per_hour || 0), 0),
      cyber_event_id: event.id,
      exercise_config: exerciseConfig,
      topology_data: {
        devices,
        connections: [],
        source_network_design_id: design.id,
        vpcConfig: {
          cidr: normalizeCidr(design.ip_scheme),
          subnets: [
            { name: 'public', cidr: '10.50.1.0/24', zone },
            { name: 'private', cidr: '10.50.2.0/24', zone },
            { name: 'security', cidr: '10.50.3.0/24', zone },
          ],
          securityGroups: [
            {
              name: 'livefire-exercise-sg',
              description: 'Default Red vs Blue exercise security group — review before deployment',
              rules: [
                { protocol: 'tcp', port: 22, source: '0.0.0.0/0', desc: 'SSH exercise access — restrict before deployment' },
                { protocol: 'tcp', port: 443, source: '0.0.0.0/0', desc: 'HTTPS exercise access' },
              ],
            },
          ],
          enableInternetGateway: true,
        },
      },
      created_by_id: user.id,
    });

    const labIds = Array.from(new Set([...(event.live_fire_lab_ids || []), lab.id]));
    await svc.entities.CyberEvent.update(event.id, { live_fire_lab_ids: labIds });

    return Response.json({
      success: true,
      lab_id: lab.id,
      device_count: devices.length,
      estimated_cost_hourly: lab.estimated_cost_hourly,
      message: 'Live Fire draft created. Review topology, images, access rules, and cost before deployment.',
    });
  } catch (error) {
    console.error('launchCyberEventLiveFire error:', error);
    return Response.json({ error: error.message || 'Unable to create Live Fire exercise' }, { status: 500 });
  }
});

function parseDiagram(value) {
  if (!value) return { nodes: [], links: [] };
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    return { nodes: parsed?.nodes || [], links: parsed?.links || [] };
  } catch {
    return { nodes: [], links: [] };
  }
}

function inferSubnet(node, ingressPoints = []) {
  const text = `${node.label || ''} ${node.name || ''} ${node.type || ''}`.toLowerCase();
  const ingressMatch = ingressPoints.some(point => String(point.system || '').toLowerCase().includes(String(node.label || node.name || '').toLowerCase()));
  if (ingressMatch || text.includes('internet') || text.includes('dmz') || text.includes('firewall')) return 'public';
  if (text.includes('siem') || text.includes('ids') || text.includes('security') || text.includes('soc')) return 'security';
  return 'private';
}

function normalizeCidr(value) {
  const cidr = String(value || '');
  if (/^10\.\d{1,3}\.\d{1,3}\.0\/16$/.test(cidr)) return cidr;
  return '10.50.0.0/16';
}
