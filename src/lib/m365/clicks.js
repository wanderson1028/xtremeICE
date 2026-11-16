/**
 * Click budget for the Microsoft 365 point-and-click assessment.
 *
 * Every task allows three times the number of physical clicks its shortest valid
 * solution needs, so a candidate can explore, hit the wrong control and correct
 * themselves before the task closes. Only clicks inside the simulated window are
 * counted: one per physical press, taken once at the window boundary.
 */

export const CLICK_MULTIPLIER = 3;

/** The clicks a task allows: three times its audited minimum. */
export const clickBudget = (minClicks) =>
  Math.max(1, Math.round(Number(minClicks) || 1)) * CLICK_MULTIPLIER;

/**
 * Only these DOM events are physical clicks. A pointerdown that is followed by a
 * click, a mousemove, a scroll or a keystroke never adds to the tally, and the
 * window listens for the click events alone so one press can never count twice.
 */
const COUNTED_EVENTS = new Set(["click", "contextmenu"]);

export const countsAsClick = (eventType) => COUNTED_EVENTS.has(eventType);

/**
 * Run `decide` once the current press has finished dispatching — after the
 * bubbled control handler has run, not during the capture phase that counted the
 * click. A macrotask is used on purpose: microtasks are drained between the
 * capture and bubble listeners of the same event, so a microtask (or a React
 * effect flushed on the counting update) would still settle the task before the
 * click's own operation is applied and could never be taken back.
 *
 * Returns a cancel function.
 */
export function deferUntilAfterDispatch(decide) {
  const id = setTimeout(decide, 0);
  return () => clearTimeout(id);
}

/** A tally that stops at the budget, so the counter can never overrun the limit. */
export function createClickTally(limit) {
  const max = Math.max(1, Math.round(Number(limit) || 1));
  let used = 0;
  return {
    limit: max,
    get used() {
      return used;
    },
    get remaining() {
      return Math.max(0, max - used);
    },
    get spent() {
      return used >= max;
    },
    /** Count one physical click; returns the tally after it. */
    spend(eventType) {
      if (countsAsClick(eventType) && used < max) used += 1;
      return used;
    },
    /** Reopen a task that keeps the presses it already spent. */
    restore(value) {
      used = Math.min(max, Math.max(0, Math.round(Number(value) || 0)));
    },
    reset() {
      used = 0;
    },
  };
}