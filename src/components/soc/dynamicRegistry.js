// Dynamic scenario registry — allows runtime-registered scenarios (generated
// from real attack feeds) to be consumed by the existing simulation engine
// without modifying static data arrays. Static scenarios are unaffected.

const registry = {};

/**
 * Register a dynamically-generated scenario so the existing helpers
 * (generateRunSeed, generateAlerts, generateLogs, generateEDRDetections,
 * getProgressionConfig, COMPROMISED_MAP) can find it by id.
 *
 * @param {object} scenario - Full scenario object with:
 *   - id, name, category, difficulty, duration_min, description, mitre
 *   - compromisedEndpoints: string[] (endpoint IDs from ENDPOINTS)
 *   - iocProfile: { iocs: string[], patientZero: string }
 *   - alerts: alert template array
 *   - logs: log template array
 *   - edrDetections: EDR detection array
 *   - escalationEvents: escalation event array
 */
export function registerDynamicScenario(scenario) {
  if (!scenario?.id) return;
  registry[scenario.id] = scenario;
}

export function getDynamicScenario(id) {
  return registry[id] || null;
}

export function getDynamicCompromised(id) {
  return registry[id]?.compromisedEndpoints || null;
}

export function getDynamicEscalation(id) {
  return registry[id]?.escalationEvents || null;
}

export function getDynamicProfile(id) {
  return registry[id]?.iocProfile || null;
}

export function getDynamicAlerts(id) {
  return registry[id]?.alerts || null;
}

export function getDynamicLogs(id) {
  return registry[id]?.logs || null;
}

export function getDynamicEDR(id) {
  return registry[id]?.edrDetections || null;
}

export function clearDynamicScenario(id) {
  delete registry[id];
}