/**
 * Click accounting and budget expiry for one task, kept out of React so the
 * dispatch order can be tested directly.
 *
 * The order is the whole point. The count is taken in the capture phase, before
 * the control's own handler runs, so it may only record and reserve the press:
 * settling, locking or re-rendering the task away there would destroy the very
 * click that spends the last of the budget. The expiry is therefore armed here
 * and decided by `defer` — which runs after the press has finished dispatching,
 * when the bubbled operation has been applied and the document verified. A
 * correct operation on the final allowed click wins; a press that changed
 * nothing lets the armed decision close the task as wrong.
 */
import { createClickTally, deferUntilAfterDispatch } from "./clicks.js";

export function createTaskPointerFlow({
  limit,
  isResolved,
  onCount,
  expire,
  defer = deferUntilAfterDispatch,
}) {
  const tally = createClickTally(limit);
  let armed = null;
  let disposed = false;

  const decide = () => {
    if (disposed) return;
    if (isResolved?.()) return; // this press solved the task
    if (!tally.spent) return;
    expire?.();
  };

  return {
    get used() {
      return tally.used;
    },
    get limit() {
      return tally.limit;
    },
    get remaining() {
      return tally.remaining;
    },
    get spent() {
      return tally.spent;
    },
    /**
     * Capture phase of one physical press: count it once and arm the budget
     * decision. Nothing is settled here. Only one decision is ever pending.
     */
    press(eventType) {
      if (disposed) return tally.used;
      const used = tally.spend(eventType);
      onCount?.(used);
      if (tally.spent && !armed) armed = defer(decide);
      return used;
    },
    /** A new task, or leaving the attempt: nothing armed may close it. */
    dispose() {
      disposed = true;
      if (armed) {
        armed();
        armed = null;
      }
    },
  };
}