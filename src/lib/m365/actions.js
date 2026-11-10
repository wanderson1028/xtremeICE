/**
 * Action classification and answer-key matching for the Microsoft 365 lab.
 *
 * Every UI interaction the simulation reports is either navigation — opening a
 * tab, ribbon menu, dialog, context menu, or selecting a body item — or a
 * commit, a real operation that changes the simulated data. Only commits can
 * score, and only when the state they produce passes the task's verification.
 */

const COMMIT_TYPES = new Set(["option", "menu", "confirm"]);

/** True when the action performs an operation rather than opening UI. */
export function isCommit(action) {
  if (!action || typeof action !== "object") return false;
  if (typeof action.commit === "boolean") return action.commit;
  return COMMIT_TYPES.has(action.type);
}

/**
 * Build the action for a menu item. Items flagged `opens` only open a dialog or
 * panel, so they stay navigation; a string value names the dialog to show.
 */
export function menuItemAction(base, item) {
  const opensDialog = typeof item.opens === "string";
  return {
    ...base,
    commit: !item.opens,
    ...(opensDialog ? { dialog: item.opens } : {}),
  };
}

/**
 * An answer key names the fields the intended commit must carry. Omitted fields
 * are not constrained, so `{ kind: "menu", item: "mute" }` accepts the operation
 * on any target while `{ kind: "menu", target: "...", item: "mute" }` pins it.
 */
export function answerMatches(answer, action) {
  if (!answer || !action) return false;
  if (answer.kind !== action.type) return false;
  if (answer.control && answer.control !== action.controlId) return false;
  if (answer.option && answer.option !== action.optionId) return false;
  if (answer.target && answer.target !== action.targetId) return false;
  if (answer.item && answer.item !== action.itemId) return false;
  if (answer.dialog && answer.dialog !== action.dialogId) return false;
  if (answer.value && answer.value !== action.value) return false;
  return true;
}