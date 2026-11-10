/** Pure scoring rules for the Microsoft 365 point-and-click assessment. */
import { isCommit, answerMatches } from "./actions.js";

/**
 * Score one candidate action against a task.
 *
 * - Navigation (tabs, menu opens, dialogs, context menus, selections) is
 *   "ignored": it never awards credit and never ends the task.
 * - A commit is scored. It only counts as "correct" when it is one of the
 *   task's accepted operations AND the simulation state it produced passes the
 *   task's own verification. Anything else is "wrong".
 *
 * `resolved` marks a task that already has an answer, so repeated clicks can
 * never score twice.
 */
export function applyAction({ question, state, action, resolved = false }) {
  if (resolved || !isCommit(action)) return { outcome: "ignored", state };
  const next = question.reduce(state, action);
  const accepted = question.answers.some((answer) => answerMatches(answer, action));
  const outcome = accepted && question.verify(next) ? "correct" : "wrong";
  return { outcome, state: next };
}