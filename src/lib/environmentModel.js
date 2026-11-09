// Environment Model v1
// Canonical, provider-independent lab environment definition.
// Describes WHAT the lab requires; provider bindings later decide HOW to instantiate it.

export const RESOURCE_TYPES = [
  "workstation", "server", "router", "switch", "firewall",
  "container", "security_appliance", "cloud_resource", "other",
];

export const ACCESS_METHODS = [
  "web_terminal", "ssh", "rdp", "vnc", "browser", "serial_console", "none",
];

export const INTERNET_POLICIES = ["none", "restricted", "full"];
export const RESET_MODES = ["recreate", "snapshot_restore", "provider_default", "manual"];

export function generateEnvironmentId(prefix = "env") {
  const rand = Math.random().toString(36).slice(2, 9);
  return `${prefix}_${Date.now().toString(36)}_${rand}`;
}

export function createBlankResource() {
  return {
    id: generateEnvironmentId("res"),
    name: "New Resource",
    role: "",
    resource_type: "workstation",
    os_type: "",
    cpu_cores: 2,
    memory_mb: 4096,
    storage_gb: 20,
    tools: [],
    services: [],
    access_method: "web_terminal",
    network_ids: [],
    startup_scripts: [],
    initial_files: [],
    initial_state_notes: "",
  };
}

export function createBlankNetwork() {
  return {
    id: generateEnvironmentId("net"),
    name: "New Network",
    purpose: "internal",
    cidr: "",
    isolated: true,
    internet_access: false,
  };
}

export function createBlankConnection(sourceResourceId = "", targetResourceId = "") {
  return {
    id: generateEnvironmentId("conn"),
    source_resource_id: sourceResourceId,
    target_resource_id: targetResourceId,
    connection_type: "virtual_network",
    network_id: "",
    notes: "",
  };
}

export function createBlankEnvironmentDefinition() {
  return {
    resources: [],
    networks: [],
    connections: [],
    connectivity_policy: {
      internet_access: "none",
      isolation_required: true,
      allow_inbound_external: false,
      allow_outbound_external: false,
      notes: "",
    },
    identity_requirements: {
      accounts_needed: [],
      directory_required: false,
      mfa_required: false,
      notes: "",
    },
    initialization: {
      startup_scripts: [],
      configuration_notes: "",
      seed_data_notes: "",
      snapshot_required: false,
    },
    reset_policy: {
      reset_required: true,
      reset_mode: "provider_default",
      preserve_learner_artifacts: false,
      notes: "",
    },
  };
}

function normalizeStringArray(value) {
  return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
}

export function normalizeEnvironmentDefinition(input) {
  const base = createBlankEnvironmentDefinition();
  if (!input || typeof input !== "object") return base;

  const resources = Array.isArray(input.resources)
    ? input.resources.map((r) => ({
        ...createBlankResource(),
        ...r,
        id: r?.id || generateEnvironmentId("res"),
        tools: normalizeStringArray(r?.tools),
        services: normalizeStringArray(r?.services),
        network_ids: normalizeStringArray(r?.network_ids),
        startup_scripts: normalizeStringArray(r?.startup_scripts),
        initial_files: normalizeStringArray(r?.initial_files),
      }))
    : [];

  const resourceIds = new Set(resources.map((r) => r.id));

  const networks = Array.isArray(input.networks)
    ? input.networks.map((n) => ({
        ...createBlankNetwork(),
        ...n,
        id: n?.id || generateEnvironmentId("net"),
      }))
    : [];
  const networkIds = new Set(networks.map((n) => n.id));

  // Preserve dangling references for author visibility; validation reports them.
  const connections = Array.isArray(input.connections)
    ? input.connections.map((c) => ({
        ...createBlankConnection(),
        ...c,
        id: c?.id || generateEnvironmentId("conn"),
      }))
    : [];

  return {
    ...base,
    ...input,
    resources,
    networks,
    connections,
    connectivity_policy: { ...base.connectivity_policy, ...(input.connectivity_policy || {}) },
    identity_requirements: {
      ...base.identity_requirements,
      ...(input.identity_requirements || {}),
      accounts_needed: normalizeStringArray(input.identity_requirements?.accounts_needed),
    },
    initialization: {
      ...base.initialization,
      ...(input.initialization || {}),
      startup_scripts: normalizeStringArray(input.initialization?.startup_scripts),
    },
    reset_policy: { ...base.reset_policy, ...(input.reset_policy || {}) },
    _validation_context: { resourceIds, networkIds },
  };
}

export function validateEnvironmentDefinition(input) {
  const env = normalizeEnvironmentDefinition(input);
  const errors = [];
  const warnings = [];
  const resourceIds = new Set(env.resources.map((r) => r.id));
  const networkIds = new Set(env.networks.map((n) => n.id));

  const duplicateResourceIds = env.resources.filter((r, i, a) => a.findIndex((x) => x.id === r.id) !== i);
  const duplicateNetworkIds = env.networks.filter((n, i, a) => a.findIndex((x) => x.id === n.id) !== i);
  if (duplicateResourceIds.length) errors.push("Duplicate resource IDs detected.");
  if (duplicateNetworkIds.length) errors.push("Duplicate network IDs detected.");

  env.resources.forEach((r) => {
    if (!r.name?.trim()) warnings.push(`Resource ${r.id} has no name.`);
    (r.network_ids || []).forEach((id) => {
      if (!networkIds.has(id)) warnings.push(`${r.name || r.id} references a missing network (${id}).`);
    });
  });

  env.connections.forEach((c) => {
    if (!resourceIds.has(c.source_resource_id)) warnings.push(`Connection ${c.id} has a missing source resource.`);
    if (!resourceIds.has(c.target_resource_id)) warnings.push(`Connection ${c.id} has a missing target resource.`);
    if (c.source_resource_id && c.source_resource_id === c.target_resource_id) errors.push(`Connection ${c.id} cannot connect a resource to itself.`);
    if (c.network_id && !networkIds.has(c.network_id)) warnings.push(`Connection ${c.id} references a missing network.`);
  });

  const { _validation_context, ...clean } = env;
  return { environment: clean, warnings, errors };
}

export function removeResourceAndReferences(environment, resourceId) {
  const env = normalizeEnvironmentDefinition(environment);
  const resources = env.resources.filter((r) => r.id !== resourceId);
  const connections = env.connections.filter(
    (c) => c.source_resource_id !== resourceId && c.target_resource_id !== resourceId
  );
  const { _validation_context, ...clean } = env;
  return { ...clean, resources, connections };
}

export function removeNetworkAndReferences(environment, networkId) {
  const env = normalizeEnvironmentDefinition(environment);
  const networks = env.networks.filter((n) => n.id !== networkId);
  const resources = env.resources.map((r) => ({
    ...r,
    network_ids: (r.network_ids || []).filter((id) => id !== networkId),
  }));
  const connections = env.connections.map((c) =>
    c.network_id === networkId ? { ...c, network_id: "" } : c
  );
  const { _validation_context, ...clean } = env;
  return { ...clean, networks, resources, connections };
}

export function environmentSummary(input) {
  const env = normalizeEnvironmentDefinition(input);
  return {
    resources: env.resources.length,
    networks: env.networks.length,
    connections: env.connections.length,
    internet: env.connectivity_policy.internet_access,
    isolated: env.connectivity_policy.isolation_required,
  };
}