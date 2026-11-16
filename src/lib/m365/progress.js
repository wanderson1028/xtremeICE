/** Where an answering task leads: the next task, a section hand-off, or results. */
import { M365_APPS, M365_QUESTIONS } from "./index.js";

/** The application that owns the task at `index`. */
export const appAt = (index) => M365_APPS.find((app) => app.id === M365_QUESTIONS[index]?.appId) || null;

/** Index of the last task belonging to the application that owns `index`. */
export function lastIndexOfApp(index) {
  const app = appAt(index);
  if (!app) return index;
  const before = M365_APPS.slice(0, M365_APPS.indexOf(app))
    .reduce((count, entry) => count + entry.questions.length, 0);
  return before + app.questions.length - 1;
}

/**
 * What follows once the task at `index` is answered.
 *
 * - `task`: the next task of the same application, opened automatically.
 * - `section`: the application just finished, so its hand-off screen is shown
 *   and the candidate continues to `to` themselves.
 * - `results`: the last application, which goes straight to the score.
 */
export function afterTask(index) {
  if (index + 1 >= M365_QUESTIONS.length) return { kind: "results", index: null };
  if (index === lastIndexOfApp(index)) {
    return { kind: "section", from: appAt(index), to: appAt(index + 1), index: index + 1 };
  }
  return { kind: "task", index: index + 1 };
}

/** Index of the first task belonging to `appId`. */
export const firstIndexOfApp = (appId) =>
  M365_QUESTIONS.findIndex((question) => question.appId === appId);

/**
 * The first task still unanswered after `index`, wrapping around to the start.
 * Applications can be opened in any order, so this is what keeps the attempt
 * moving and what makes the score appear only once every task is answered.
 * Returns `null` when nothing is left open.
 */
export function nextOpenTask(answers, index = -1) {
  const total = M365_QUESTIONS.length;
  for (let step = 1; step <= total; step += 1) {
    const at = (index + step + total) % total;
    if (!answers?.[M365_QUESTIONS[at].id]) return at;
  }
  return null;
}