/** Pure scoring rules for the Microsoft 365 point-and-click assessment. */
import { isCommit, answerMatches } from "./actions.js";

/** State values are primitives and short lists; compare them by value. */
function sameValue(a, b) {
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((item, index) => item === b[index]);
  }
  return Object.is(a, b);
}

/** Flat app states compare by value, so a duplicate operation is detectable. */
function sameState(a, b) {
  const keys = Object.keys(a);
  if (keys.length !== Object.keys(b).length) return false;
  return keys.every((key) => sameValue(a[key], b[key]));
}

/**
 * Score one candidate action against a task.
 *
 * - Navigation (tabs, menu opens, dialogs, context menus, selections) is
 *   "ignored": it never awards credit and never ends the task.
 * - A commit that leaves the document unchanged is also "ignored" — clicking a
 *   command with nothing to act on, or repeating an operation already applied,
 *   must not lock the task.
 * - A commit that changes state is scored. It only counts as "correct" when it
 *   is one of the task's accepted operations AND the state it produced passes
 *   the task's own verification. Anything else is "wrong".
 *
 * `resolved` marks a task that already has an answer, so repeated clicks can
 * never score twice. A task whose document already meets its goal is likewise
 * ignored: repeating "add a page" must not turn a correct answer into a wrong
 * one. Task verifications read distinct fields, so no task can be satisfied by
 * an earlier task's document state.
 */
export function applyAction({ question, state, action, resolved = false }) {
  if (resolved || !isCommit(action)) return { outcome: "ignored", state };
  if (question.verify(state)) return { outcome: "ignored", state };
  const next = question.reduce(state, action);
  if (sameState(state, next)) return { outcome: "ignored", state };
  const accepted = question.answers.some((answer) => answerMatches(answer, action));
  const outcome = accepted && question.verify(next) ? "correct" : "wrong";
  return { outcome, state: next };
}