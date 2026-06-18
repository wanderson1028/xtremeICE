/**
 * Instance cost tier system — limits which EC2 instance types users can select
 * based on CPU/RAM thresholds and whether the lab has admin approval.
 */

export const COST_TIERS = {
  standard: {
    label: "Standard",
    color: "text-green-400",
    bg: "bg-green-500/10 border-green-500/20",
    maxCpu: 2,
    maxRamMB: 4096,
    description: "Up to 2 vCPU / 4 GB RAM",
  },
  performance: {
    label: "Performance",
    color: "text-amber-400",
    bg: "bg-amber-500/10 border-amber-500/20",
    maxCpu: 4,
    maxRamMB: 16384,
    description: "Up to 4 vCPU / 16 GB RAM",
    requiresApproval: false,
  },
  enterprise: {
    label: "Enterprise",
    color: "text-red-400",
    bg: "bg-red-500/10 border-red-500/20",
    maxCpu: 16,
    maxRamMB: 65536,
    description: "Up to 16 vCPU / 64 GB RAM",
    requiresApproval: true,
    adminOnly: true,
  },
  extreme: {
    label: "Extreme",
    color: "text-purple-400",
    bg: "bg-purple-500/10 border-purple-500/20",
    maxCpu: Infinity,
    maxRamMB: Infinity,
    description: "16+ vCPU / 64+ GB RAM",
    requiresApproval: true,
    adminOnly: true,
    superAdminOnly: true,
  },
};

/**
 * Determine the cost tier for given CPU/RAM specs.
 */
export function getCostTier(cpuCores, ramMB) {
  if (cpuCores > 16 || ramMB > 65536) return "extreme";
  if (cpuCores > 4 || ramMB > 16384) return "enterprise";
  if (cpuCores > 2 || ramMB > 4096) return "performance";
  return "standard";
}

/**
 * Check if a device's specs are allowed for a given user role and lab approval status.
 * Returns { allowed, tier, reason, requiresAdminApproval }
 */
export function checkDeviceAllowance(cpuCores, ramMB, isAdmin, isLabApproved = false) {
  const tier = getCostTier(cpuCores, ramMB);
  const tierConfig = COST_TIERS[tier];

  // Admins can deploy anything
  if (isAdmin) return { allowed: true, tier, reason: null, requiresAdminApproval: false };

  // Non-admins need lab approval for enterprise+
  if (tierConfig.requiresApproval && !isLabApproved) {
    return {
      allowed: false,
      tier,
      reason: `${tierConfig.label} tier requires admin approval. Reduce vCPU to ≤${COST_TIERS.performance.maxCpu} and RAM to ≤${COST_TIERS.performance.maxRamMB / 1024} GB, or ask an admin to approve this lab for high-cost instances.`,
      requiresAdminApproval: true,
    };
  }

  return { allowed: true, tier, reason: null, requiresAdminApproval: false };
}

/**
 * Map CPU/RAM to an AWS instance type respecting tier limits.
 * Non-admin: caps at t3.xlarge unless lab is approved.
 */
export function selectInstanceType(cpu, ram, isAdmin = false, isLabApproved = false) {
  const { allowed, tier } = checkDeviceAllowance(cpu, ram, isAdmin, isLabApproved);
  
  // Clamp to max allowed tier for non-admins
  const effectiveCpu = allowed ? cpu : Math.min(cpu, COST_TIERS.performance.maxCpu);
  const effectiveRam = allowed ? ram : Math.min(ram, COST_TIERS.performance.maxRamMB);

  if (effectiveCpu >= 8 || effectiveRam >= 32768) return "c5.2xlarge";
  if (effectiveCpu >= 4 || effectiveRam >= 16384) return "t3.xlarge";
  if (effectiveCpu >= 2 || effectiveRam >= 8192) return "t3.large";
  if (effectiveCpu >= 1 || effectiveRam >= 2048) return "t3.medium";
  return "t3.small";
}

/**
 * Get estimated hourly cost for an instance type.
 */
export function getInstanceCost(instanceType) {
  const pricing = {
    "t3.small": 0.021,
    "t3.medium": 0.042,
    "t3.large": 0.083,
    "t3.xlarge": 0.166,
    "c5.xlarge": 0.17,
    "c5.2xlarge": 0.34,
    "m5.2xlarge": 0.384,
    "r5.xlarge": 0.252,
  };
  return pricing[instanceType] || 0.15;
}

/**
 * Check if a lab's device list has any that exceed the user's allowance.
 * Returns { hasViolations, violations: [{ deviceName, tier, reason }] }
 */
export function checkLabDevices(devices, isAdmin, isLabApproved = false) {
  const violations = [];
  for (const device of devices) {
    const { allowed, tier, reason } = checkDeviceAllowance(
      device.cpu_cores || 2,
      device.ram_mb || 4096,
      isAdmin,
      isLabApproved
    );
    if (!allowed) {
      violations.push({
        deviceId: device.id,
        deviceName: device.name || device.id,
        tier,
        reason,
      });
    }
  }
  return {
    hasViolations: violations.length > 0,
    violations,
  };
}