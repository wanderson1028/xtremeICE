/**
 * IP Allocator - generates structured IP addresses for network diagrams
 * based on the ip_scheme chosen in the design.
 */

function parseBaseNetwork(ipScheme) {
  // Try to extract a base like "10.0.0.0/8" or "192.168.0.0/16" or "172.16.0.0/12"
  if (!ipScheme) return { base: [10, 0, 0, 0], prefixLen: 8 };

  const match = ipScheme.match(/(\d+)\.(\d+)\.(\d+)\.(\d+)(?:\/(\d+))?/);
  if (match) {
    return {
      base: [parseInt(match[1]), parseInt(match[2]), parseInt(match[3]), parseInt(match[4])],
      prefixLen: match[5] ? parseInt(match[5]) : 8,
    };
  }
  // Fallback by keyword
  const lower = ipScheme.toLowerCase();
  if (lower.includes("192.168")) return { base: [192, 168, 0, 0], prefixLen: 16 };
  if (lower.includes("172.16")) return { base: [172, 16, 0, 0], prefixLen: 12 };
  return { base: [10, 0, 0, 0], prefixLen: 8 };
}

function toIp(o1, o2, o3, o4) {
  return `${o1}.${o2}.${o3}.${o4}`;
}

/**
 * Allocates IP addresses for all nodes and links in a diagram.
 * Returns:
 *   nodeIps: { [nodeId]: string }    — loopback / management IP
 *   linkIps: { [linkKey]: { fromIp, toIp, subnet } }
 *
 * Link key: `${link.from}-${link.to}`
 */
export function allocateIPs(nodes, links, ipScheme) {
  const { base } = parseBaseNetwork(ipScheme);
  const [b1, b2] = base;

  const nodeIps = {};
  const linkIps = {};

  // Assign management/loopback IP per node
  // e.g. 10.0.0.X  (or 192.168.0.X)
  nodes.forEach((node, idx) => {
    nodeIps[node.id] = toIp(b1, b2, 0, idx + 1);
  });

  // Assign a /30 subnet per link
  // Using 10.X.Y.0/30 where X = link index / 64, Y = (link index % 64) * 4
  links.forEach((link, idx) => {
    const subnetIndex = idx + 1;
    const thirdOctet = Math.floor(subnetIndex / 64) + 1;
    const fourthBase = (subnetIndex % 64) * 4;
    const subnet = toIp(b1, b2 + 1, thirdOctet, fourthBase);
    const fromIp = toIp(b1, b2 + 1, thirdOctet, fourthBase + 1);
    const toIp_ = toIp(b1, b2 + 1, thirdOctet, fourthBase + 2);
    const key = `${link.from}-${link.to}`;
    linkIps[key] = { fromIp, toIp: toIp_, subnet: `${subnet}/30` };
  });

  return { nodeIps, linkIps };
}

/**
 * Given a node's links and the linkIps map, return interface-level IP assignments.
 * Returns array of { interfaceName, ip, peer, subnet, peerNode }
 */
export function getNodeInterfaces(nodeId, links, linkIps, nodes) {
  const result = [];
  let ifaceIdx = 0;

  links.forEach(link => {
    const key = `${link.from}-${link.to}`;
    const assignment = linkIps[key];
    if (!assignment) return;

    const isFrom = link.from === nodeId;
    const isTo = link.to === nodeId;
    if (!isFrom && !isTo) return;

    const ip = isFrom ? assignment.fromIp : assignment.toIp;
    const peerIp = isFrom ? assignment.toIp : assignment.fromIp;
    const peerId = isFrom ? link.to : link.from;
    const peerNode = nodes.find(n => n.id === peerId);

    // Interface naming
    const isWan = link.wan;
    const ifaceName = isWan
      ? `GigabitEthernet0/${ifaceIdx}`
      : `GigabitEthernet0/${ifaceIdx}`;

    result.push({
      interfaceName: ifaceName,
      ip: `${ip}/30`,
      peerIp,
      subnet: assignment.subnet,
      peerNode: peerNode ? peerNode.label.replace(/\n/g, " ") : peerId,
      isWan,
      label: link.label,
    });
    ifaceIdx++;
  });

  return result;
}