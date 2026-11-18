import { applyPilotAction, pilotView, scenarioVersion } from "../../base44/functions/helpDeskPilot/state";

export function browserPilot(userId, body) {
  const key = `help-desk-pilot:${scenarioVersion}:${userId}:${body.slot}`;
  const saved = localStorage.getItem(key);
  const transition = applyPilotAction(saved ? JSON.parse(saved) : null, body);
  if (transition.error) throw new Error(transition.error);
  if (transition.changes) localStorage.setItem(key, JSON.stringify(transition.attempt));
  return pilotView(transition.attempt, "browser");
}

export function hasBrowserPilot(userId, slot) {
  return localStorage.getItem(`help-desk-pilot:${scenarioVersion}:${userId}:${slot}`) !== null;
}
