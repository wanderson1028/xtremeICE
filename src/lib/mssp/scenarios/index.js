import gatewayCompromise from "./gatewayCompromise";
import otDisruption from "./otDisruption";
import crossLayer from "./crossLayer";

export const SCENARIOS = [gatewayCompromise, otDisruption, crossLayer];
export const SCENARIO_MAP = SCENARIOS.reduce((acc, s) => ({ ...acc, [s.id]: s }), {});

export function getScenario(id) {
  return SCENARIO_MAP[id] || SCENARIOS[0];
}