/**
 * Attempt state for the Microsoft 365 assessment: one answer per task and one
 * simulated document per application, kept across tasks so the candidate sees
 * their own changes carry forward.
 *
 * A task closes in exactly two ways: the correct operation is performed (even
 * on the last click the budget allows), or the click budget runs out, which
 * records the task as wrong once. A wrong command never ends the task by
 * itself — it changes the document and the candidate can correct it.
 */
import { applyAction } from "./engine.js";
import { clickBudget } from "./clicks.js";

export const isTaskResolved = (answers, questionId) => Boolean(answers?.[questionId]);

/**
 * Feed one physical click into the attempt: the action the window emitted (or
 * `null` for a click that hit nothing) together with the clicks used so far.
 * Answers and states keep their references when nothing changed, so callers can
 * skip re-rendering on navigation.
 */
export function applyTaskAction({
  question, answers, states, action = null, clicks = 0, budget,
}) {
  if (isTaskResolved(answers, question.id)) return { outcome: "ignored", answers, states };

  const limit = budget ?? clickBudget(question.minClicks);
  const current = states[question.appId];
  const { outcome, state } = applyAction({ question, state: current, action });

  if (outcome === "correct") {
    return {
      outcome: "correct",
      answers: { ...answers, [question.id]: { correct: true } },
      states: state === current ? states : { ...states, [question.appId]: state },
    };
  }

  const nextStates = state === current ? states : { ...states, [question.appId]: state };

  if (clicks >= limit) {
    return {
      outcome: "exhausted",
      answers: { ...answers, [question.id]: { correct: false } },
      states: nextStates,
    };
  }

  /* "explore" is a wrong operation that leaves the task open; navigation and
     operations that changed nothing report as "ignored". */
  return { outcome: outcome === "wrong" ? "explore" : "ignored", answers, states: nextStates };
}