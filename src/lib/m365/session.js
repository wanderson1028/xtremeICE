/**
 * Attempt state for the Microsoft 365 assessment: one answer per task and one
 * simulated document per application, kept across tasks so the candidate sees
 * their own changes carry forward.
 */
import { applyAction } from "./engine.js";

export const isTaskResolved = (answers, questionId) => Boolean(answers?.[questionId]);

/**
 * Feed one interaction into the attempt. Returns the same object references
 * when nothing was scored, so callers can skip re-rendering on navigation.
 */
export function applyTaskAction({ question, answers, states, action }) {
  const current = states[question.appId];
  const { outcome, state } = applyAction({
    question,
    state: current,
    action,
    resolved: isTaskResolved(answers, question.id),
  });

  if (outcome === "ignored") return { outcome, answers, states };

  return {
    outcome,
    answers: { ...answers, [question.id]: { correct: outcome === "correct" } },
    states: state === current ? states : { ...states, [question.appId]: state },
  };
}