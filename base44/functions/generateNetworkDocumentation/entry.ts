import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { diagramData, designName } = await req.json();

    if (!diagramData || !diagramData.nodes) {
      return Response.json({ error: 'Invalid diagram data' }, { status: 400 });
    }

    const { nodes, links } = diagramData;

    // Group devices by type
    const devicesByType = {};
    nodes.forEach(node => {
      if (!devicesByType[node.type]) {
        devicesByType[node.type] = [];
      }
      devicesByType[node.type].push(node);
    });

    // Build documentation structure
    const doc = {
      title: designName || 'Network Documentation',
      generatedDate: new Date().toISOString().split('T')[0],
      summary: {
        totalDevices: nodes.length,
        totalConnections: links.length,
        deviceTypes: Object.keys(devicesByType).map(type => ({
          type,
          count: devicesByType[type].length
        }))
      },
      devices: nodes.map(node => ({
        id: node.id,
        label: node.label,
        type: node.type,
        ip: node.ip || 'Not configured',
        config: node.config || 'Default configuration'
      })),
      connections: links.map(link => {
        const fromNode = nodes.find(n => n.id === link.from);
        const toNode = nodes.find(n => n.id === link.to);
        return {
          from: fromNode?.label || link.from,
          to: toNode?.label || link.to,
          label: link.label || 'Standard link',
          type: link.wan ? 'WAN' : 'LAN',
          style: link.style || 'solid'
        };
      })
    };

    return Response.json(doc);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});