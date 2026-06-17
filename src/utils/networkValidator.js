/**
 * Network Design Validator
 * Checks for common configuration errors
 */

function parseIPRange(cidr) {
  const [ip, bits] = cidr.split('/');
  if (!ip || !bits) return null;
  
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p > 255)) return null;
  
  return { ip, bits: Number(bits), parts };
}

function ipToNumber(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p > 255)) return null;
  return (parts[0] << 24) + (parts[1] << 16) + (parts[2] << 8) + parts[3];
}

function isIPInRange(ip, cidr) {
  const range = parseIPRange(cidr);
  if (!range) return false;
  
  const ipNum = ipToNumber(ip);
  if (ipNum === null) return false;
  
  const rangeStart = ipToNumber(range.ip);
  const mask = (0xffffffff << (32 - range.bits)) >>> 0;
  
  return (ipNum & mask) === (rangeStart & mask);
}

export function validateNetworkDesign(design) {
  const issues = [];
  const warnings = [];
  const info = [];

  if (!design) {
    issues.push({
      level: 'error',
      category: 'Basic',
      message: 'No design data provided',
    });
    return { issues, warnings, info, isValid: false };
  }

  // 1. Check basic configuration
  if (!design.name) {
    issues.push({
      level: 'error',
      category: 'Basic',
      message: 'Design name is required',
    });
  }

  if (!design.num_sites || design.num_sites < 1) {
    issues.push({
      level: 'error',
      category: 'Basic',
      message: 'At least one site is required',
    });
  }

  // 2. Check IP scheme validity
  if (design.ip_scheme) {
    const ipRange = parseIPRange(design.ip_scheme);
    if (!ipRange) {
      issues.push({
        level: 'error',
        category: 'IP Configuration',
        message: `Invalid IP scheme format: "${design.ip_scheme}". Use CIDR notation (e.g., 10.0.0.0/8)`,
      });
    }
  } else {
    warnings.push({
      level: 'warning',
      category: 'IP Configuration',
      message: 'No IP scheme defined. Assign one for consistency.',
    });
  }

  // 3. Check gateway configuration
  if (design.num_sites > 1 && design.topology_type !== 'ring') {
    if (!design.routing_protocol) {
      issues.push({
        level: 'error',
        category: 'Routing',
        message: 'Multi-site topology requires a routing protocol (OSPF, EIGRP, BGP, etc.)',
      });
    }

    if (!design.wan_technology) {
      issues.push({
        level: 'error',
        category: 'WAN',
        message: 'Multi-site topology requires a WAN technology defined',
      });
    }
  }

  // 4. Check firewall configuration
  if (design.firewall_enabled && !design.firewall_vendor) {
    warnings.push({
      level: 'warning',
      category: 'Firewall',
      message: 'Firewall enabled but vendor not specified',
    });
  }

  // 5. Check device models
  if (!design.router_model) {
    warnings.push({
      level: 'warning',
      category: 'Hardware',
      message: 'No router model specified',
    });
  }

  if (!design.switch_model) {
    warnings.push({
      level: 'warning',
      category: 'Hardware',
      message: 'No switch model specified',
    });
  }

  // 6. Check server configuration
  if (design.server_farm && design.num_servers < 1) {
    issues.push({
      level: 'error',
      category: 'Servers',
      message: 'Server farm enabled but no servers defined',
    });
  }

  // 7. Check VLAN configuration
  if (design.num_vlans_per_site && design.num_vlans_per_site > 0) {
    if (!design.vlan_names || design.vlan_names.length === 0) {
      warnings.push({
        level: 'warning',
        category: 'VLANs',
        message: `${design.num_vlans_per_site} VLANs configured but no names defined`,
      });
    } else if (design.vlan_names.length < design.num_vlans_per_site) {
      warnings.push({
        level: 'warning',
        category: 'VLANs',
        message: `Only ${design.vlan_names.length} of ${design.num_vlans_per_site} VLANs have names`,
      });
    }
  }

  // 8. Check DNS configuration
  if (!design.dns_servers || design.dns_servers.length === 0) {
    warnings.push({
      level: 'warning',
      category: 'DNS',
      message: 'No DNS servers configured',
    });
  } else {
    design.dns_servers.forEach((dns, i) => {
      if (!dns || dns.trim() === '') {
        issues.push({
          level: 'error',
          category: 'DNS',
          message: `DNS server ${i + 1} is empty`,
        });
      }
    });
  }

  // 9. Check NTP configuration
  if (!design.ntp_server) {
    warnings.push({
      level: 'warning',
      category: 'Time Sync',
      message: 'No NTP server configured',
    });
  }

  // 10. Check site names
  if (design.site_names && design.site_names.length > 0) {
    const duplicates = new Set();
    const seen = new Set();
    design.site_names.forEach(name => {
      if (name && seen.has(name.toLowerCase())) {
        duplicates.add(name);
      }
      if (name) seen.add(name.toLowerCase());
    });
    if (duplicates.size > 0) {
      issues.push({
        level: 'error',
        category: 'Site Configuration',
        message: `Duplicate site names found: ${Array.from(duplicates).join(', ')}`,
      });
    }
  }

  // 11. Check domain configuration
  if (!design.domain_name) {
    warnings.push({
      level: 'warning',
      category: 'Domain',
      message: 'No domain name configured',
    });
  }

  // 12. Check credentials
  if (!design.device_username || !design.device_password) {
    issues.push({
      level: 'error',
      category: 'Credentials',
      message: 'Device username and password are required',
    });
  }

  // 13. Check connectivity based on topology
  if (design.topology_type === 'full-mesh' && design.num_sites > 4) {
    warnings.push({
      level: 'warning',
      category: 'Topology',
      message: 'Full-mesh with >4 sites creates many connections. Consider partial-mesh for scalability.',
    });
  }

  if (design.topology_type === 'hub-and-spoke' && design.num_sites > 10) {
    warnings.push({
      level: 'warning',
      category: 'Topology',
      message: 'Hub-and-spoke with >10 sites may create bottleneck at hub.',
    });
  }

  // 14. Redundancy check
  if (!design.redundancy_enabled && design.firewall_enabled) {
    warnings.push({
      level: 'warning',
      category: 'High Availability',
      message: 'Firewall enabled without redundancy. Consider enabling for fault tolerance.',
    });
  }

  // 15. Check user device configuration
  if (design.num_user_devices && design.num_user_devices > 0) {
    if (!design.user_device_types || design.user_device_types.length === 0) {
      warnings.push({
        level: 'warning',
        category: 'Endpoints',
        message: `${design.num_user_devices} user devices defined but no device types specified`,
      });
    }
  }

  // Summary info
  info.push({
    level: 'info',
    category: 'Summary',
    message: `Design contains ${design.num_sites || 0} site(s) with ${design.topology_type || 'unknown'} topology`,
  });

  const isValid = issues.length === 0;

  return {
    issues,
    warnings,
    info,
    isValid,
    summary: {
      errorCount: issues.length,
      warningCount: warnings.length,
      infoCount: info.length,
    },
  };
}