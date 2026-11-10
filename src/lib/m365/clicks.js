/**
 * Click budget for the Microsoft 365 point-and-click assessment.
 *
 * Every task allows four times the number of physical clicks its shortest valid
 * solution needs, so a candidate can explore, hit the wrong control and correct
 * themselves before the task closes. Only clicks inside the simulated window are
 * counted: one per physical press, taken once at the window boundary.
 */

export const CLICK_MULTIPLIER = 4;

/** The clicks a task allows: four times its audited minimum. */
export const clickBudget = (minClicks) =>
  Math.max(1, Math.round(Number(minClicks) || 1)) * CLICK_MULTIPLIER;

/**
 * Only these DOM events are physical clicks. A pointerdown that is followed by a
 * click, a mousemove, a scroll or a keystroke never adds to the tally, and the
 * window listens for the click events alone so one press can never count twice.
 */
const COUNTED_EVENTS = new Set(["click", "contextmenu"]);

export const countsAsClick = (eventType) => COUNTED_EVENTS.has(eventType);

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
    reset() {
      used = 0;
    },
  };
}