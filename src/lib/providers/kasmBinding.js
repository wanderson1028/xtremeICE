/**
 * Kasm Provider Binding v1
 * ========================
 * Translates one platform-independent environment resource into the existing
 * EnvironmentProfile contract. This is intentionally a compatibility layer:
 * EnvironmentDefinition remains authoritative; Kasm-specific values live here.
 */

const lower = (value) => String(value || "").trim().toLowerCase();

function osMatches(requirement, profileOs) {
  const required = lower(requirement);
  const provided = lower(profileOs);
  if (!required || !provided || provided === "custom") return true;
  if (required.includes(provided) || provided.includes(required)) return true;
  if (required.includes("kali") && provided.includes("kali")) return true;
  if (required.includes("ubuntu") && provided.includes("ubuntu")) return true;
  if (required.includes("windows") && provided.includes("windows")) return true;
  if (required.includes("linux") && ["linux", "kali", "ubuntu"].some((v) => provided.includes(v))) return true;
  return false;
}

export function assessKasmBinding(environmentDefinition, profile) {
  const env = environmentDefinition || {};
  const resources = Array.isArray(env.resources) ? env.resources : [];
  const networks = Array.isArray(env.networks) ? env.networks : [];
  const errors = [];
  const warnings = [];

  if (resources.length === 0) {
    errors.push("Define one environment resource before binding to Kasm.");
  } else if (resources.length > 1) {
    errors.push("Kasm Provider Binding v1 supports exactly one resource. Multi-resource orchestration is deferred.");
  }

  if (!profile) {
    errors.push("Select an EnvironmentProfile to bind this environment to Kasm.");
  }

  const resource = resources[0] || null;

  if (profile && profile.is_active === false) {
    errors.push("The selected EnvironmentProfile is inactive.");
  }
  if (profile && !profile.kasm_image_id) {
    warnings.push("The selected EnvironmentProfile does not yet have a live Kasm image identifier. Binding can be evaluated, but direct launch remains unavailable.");
  }

  if (resource && profile) {
    if (!osMatches(resource.os_type, profile.os_type)) {
      errors.push(`OS requirement "${resource.os_type || "unspecified"}" does not match profile OS "${profile.os_type || "unspecified"}".`);
    }

    const checks = [
      ["vCPU", Number(resource.cpu_cores || 0), Number(profile.cpu_cores || 0)],
      ["memory MB", Number(resource.memory_mb || 0), Number(profile.memory_mb || 0)],
      ["storage GB", Number(resource.storage_gb || 0), Number(profile.storage_gb || 0)],
    ];
    for (const [label, required, provided] of checks) {
      if (required > 0 && provided > 0 && provided < required) {
        errors.push(`Profile provides ${provided} ${label}; the lab requires ${required}.`);
      }
    }

    const installed = new Set((profile.pre_installed_tools || []).map(lower));
    const missingTools = (resource.tools || []).filter((tool) => !installed.has(lower(tool)));
    if (missingTools.length) {
      warnings.push(`Profile does not declare these required tools as pre-installed: ${missingTools.join(", ")}. They may need initialization/startup installation.`);
    }

    if (resource.access_method && !["web_terminal", "browser", "vnc"].includes(resource.access_method)) {
      warnings.push(`Learner access method "${resource.access_method}" may need provider-specific handling in Kasm.`);
    }
  }

  if (networks.length > 1) {
    warnings.push("Multiple authored networks exist. Kasm Provider Binding v1 does not yet translate multi-network topology.");
  }
  if (env.identity_requirements?.directory_required) {
    warnings.push("Directory-service requirements are not provisioned by Kasm Provider Binding v1.");
  }
  if (env.identity_requirements?.mfa_required) {
    warnings.push("MFA requirements are not provisioned by Kasm Provider Binding v1.");
  }

  const ready = errors.length === 0;
  const launch_ready = ready && !!profile?.kasm_image_id;
  const binding = ready && resource && profile ? {
    provider: "kasm",
    version: 1,
    resource_id: resource.id,
    environment_profile_id: profile.id,
    resolved: {
      kasm_image_id: profile.kasm_image_id || "",
      kasm_image_name: profile.kasm_image_name || "",
      kasm_image_source: profile.kasm_image_source || "",
      os_type: profile.os_type || "",
      cpu_cores: profile.cpu_cores || resource.cpu_cores || 2,
      memory_mb: profile.memory_mb || resource.memory_mb || 4096,
      storage_gb: profile.storage_gb || resource.storage_gb || 20,
      pre_installed_tools: Array.isArray(profile.pre_installed_tools) ? profile.pre_installed_tools : [],
      startup_scripts: Array.isArray(profile.startup_scripts) ? profile.startup_scripts : [],
      network_config: profile.network_config || {},
    },
  } : null;

  return { ready, launch_ready, errors, warnings, binding };
}

export function buildKasmBinding(environmentDefinition, profile) {
  const assessment = assessKasmBinding(environmentDefinition, profile);
  if (!assessment.ready) {
    const error = new Error(assessment.errors.join(" "));
    error.code = "KASM_BINDING_NOT_READY";
    error.details = assessment;
    throw error;
  }
  return assessment.binding;
}