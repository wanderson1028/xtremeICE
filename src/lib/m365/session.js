/**
 * Attempt state for the Microsoft 365 assessment: one answer per task and one
 * simulated document per application, kept across tasks so the candidate sees
 * their own changes carry forward.
 *
 * A task closes in exactly two ways: the correct operation is performed (even
 * on the last click the budget allows), or the click budget runs out without the
 * task being solved, which records it as wrong once.
 *
 * The two paths are deliberately separate functions. Applying an action never
 * looks at the budget, so the operation of the final allowed click is always
 * applied and verified; expiry is a decision the caller makes after that press
 * has finished dispatching (see `pointerFlow.js`). A wrong command never ends
 * the task by itself — it changes the document and the candidate can correct it.
 */
import { applyAction } from "./engine.js";

export const isTaskResolved = (answers, questionId) => Boolean(answers?.[questionId]);

/**
 * Apply the operation one press emitted (`null` for a click that hit nothing).
 * Answers and states keep their references when nothing changed, so callers can
 * skip re-rendering on navigation.
 */
export function applyTaskAction({ question, answers, states, action = null }) {
  if (isTaskResolved(answers, question.id)) return { outcome: "ignored", answers, states };

  const current = states[question.appId];
  const { outcome, state } = applyAction({ question, state: current, action });
  const nextStates = state === current ? states : { ...states, [question.appId]: state };

  if (outcome === "correct") {
    return {
      outcome: "correct",
      answers: { ...answers, [question.id]: { correct: true } },
      states: nextStates,
    };
  }

  /* "explore" is a wrong operation that leaves the task open; navigation and
     operations that changed nothing report as "ignored". */
  return { outcome: outcome === "wrong" ? "explore" : "ignored", answers, states: nextStates };
}

/**
 * The budget is spent and the press that spent it did not solve the task: record
 * it wrong, once. Called after the press has finished dispatching, never during
 * it, so a correct operation is never overwritten by its own click.
 */
export function expireTask({ question, answers, states }) {
  if (isTaskResolved(answers, question.id)) return { outcome: "ignored", answers, states };
  return {
    outcome: "exhausted",
    answers: { ...answers, [question.id]: { correct: false } },
    states,
  };
}