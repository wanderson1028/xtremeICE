/** Pure scoring rules for the Microsoft 365 point-and-click assessment. */
import { stepMatches } from "./index.js";

/**
 * Classify one committed action against the current step.
 * Returns "match" (step completed), "wrong" (task failed) or "ignored" (preparation, not an answer).
 */
export function resolveAction(step, action) {
  if (!step || !action) return "ignored";
  // Selecting an item before opening its context menu is preparation.
  if (action.type === "click" && step.do === "context" && action.targetId === step.target) return "ignored";
  // Re-opening the menu of the command already chosen is preparation too.
  if (action.type === "control" && step.do === "option" && action.controlId === step.control) return "ignored";
  return stepMatches(step, action) ? "match" : "wrong";
}

/**
 * Advance one task by one action.
 * state: { stepIndex, result } where result is null | "correct" | "wrong".
 * A resolved task ignores every later action, so repeated clicks cannot score twice.
 */
export function applyAction(state, question, action) {
  if (state.result) return state;
  const outcome = resolveAction(question.steps[state.stepIndex], action);
  if (outcome === "ignored") return state;
  if (outcome === "wrong") return { stepIndex: state.stepIndex, result: "wrong" };
  if (state.stepIndex + 1 < question.steps.length) {
    return { stepIndex: state.stepIndex + 1, result: null };
  }
  return { stepIndex: state.stepIndex, result: "correct" };
}