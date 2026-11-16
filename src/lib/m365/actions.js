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

/** Which action field carries the chosen item, by action type. */
const ID_FIELD = { option: "optionId", menu: "itemId" };

/**
 * Build the action for a menu item. Items flagged `opens` only open a dialog or
 * panel, so they stay navigation; a string value names the dialog to show.
 * The chosen item's id is always carried on the action — without it a reducer
 * receives `undefined` for the selection and the operation silently does nothing.
 */
export function menuItemAction(base, item) {
  const opensDialog = typeof item.opens === "string";
  const field = ID_FIELD[base.type] || "optionId";
  return {
    ...base,
    [field]: base[field] ?? item.id,
    commit: !item.opens,
    ...(opensDialog ? { dialog: item.opens } : {}),
  };
}

/* The builders below are the only places UI payloads are constructed, so the
   components and the regression suite exercise the very same shapes. */

/** Ribbon, command-bar or title-bar dropdown choice. */
export const menuChoice = (controlId, item, targetId = null) =>
  menuItemAction({ type: "option", controlId, targetId: targetId || null }, item);

/** Context-menu choice on a body item. */
export const contextChoice = (targetId, item) =>
  menuItemAction({ type: "menu", targetId: targetId || null }, item);

/** Ribbon/command-bar press: a command commits only when flagged as an operation. */
export const ribbonPress = (control, targetId = null) => ({
  type: "control",
  controlId: control.id,
  commit: Boolean(control.commits),
  targetId: targetId || null,
});

/** Body click: a commit only for elements that perform an operation. */
export const bodyClick = (targetId, commit = false) => ({
  type: "click",
  targetId,
  commit: Boolean(commit),
});

/** Dialog confirmation with its chosen value. */
export const dialogConfirm = (dialogId, value, targetId = null) => ({
  type: "confirm",
  dialogId,
  value,
  targetId: targetId || null,
  commit: true,
});

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