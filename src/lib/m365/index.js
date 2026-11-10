/** Aggregated Microsoft 365 lab definition and scoring helpers. */
import { wordApp } from "./word.js";
import { excelApp } from "./excel.js";
import { sharepointApp } from "./sharepoint.js";
import { outlookApp } from "./outlook.js";
import { teamsApp } from "./teams.js";
import { powerbiApp } from "./powerbi.js";

export const M365_APPS = [wordApp, excelApp, sharepointApp, outlookApp, teamsApp, powerbiApp];

export const M365_QUESTIONS = M365_APPS.flatMap((app) =>
  app.questions.map((q) => ({ ...q, appId: app.id, appName: app.name, accent: app.accent }))
);

export const TOTAL_QUESTIONS = M365_QUESTIONS.length;
export const QUESTIONS_PER_APP = 6;
export const PASS_MARK = 70;
export const LAB_TITLE = "Microsoft 365 Point & Click Assessment";

export const appById = (id) => M365_APPS.find((app) => app.id === id);

/** Every command in an app: ribbon controls, command bar, title actions and body chrome. */
export function findControl(app, controlId) {
  const groups = [];
  (app.tabs || []).forEach((tab) => groups.push(...tab.groups));
  const controls = [
    ...groups.flatMap((group) => group.controls),
    ...(app.commandBar || []),
    ...(app.titleActions || []),
    ...(app.controls || []),
  ];
  return controls.find((control) => control.id === controlId);
}


export const initialAppState = () =>
  Object.fromEntries(M365_APPS.map((app) => [app.id, { ...app.defaults }]));

/** True when an emitted action completes the expected step. */
export function stepMatches(step, action) {
  if (!step || !action) return false;
  switch (step.do) {
    case "tab":
      return action.type === "tab" && action.tabId === step.tab;
    case "control":
      return action.type === "control" && action.controlId === step.control;
    case "option":
      return action.type === "option" && action.optionId === step.option;
    case "click":
      return action.type === "click" && action.targetId === step.target;
    case "context":
      return action.type === "context" && action.targetId === step.target;
    case "menu":
      return action.type === "menu" && action.targetId === step.target && action.itemId === step.item;
    default:
      return false;
  }
}

export const correctCount = (answers) =>
  M365_QUESTIONS.filter((q) => answers[q.id]?.correct).length;

export const scorePercent = (answers) =>
  Math.round((correctCount(answers) / TOTAL_QUESTIONS) * 100);

export const appScore = (app, answers) => ({
  id: app.id,
  name: app.name,
  accent: app.accent,
  correct: app.questions.filter((q) => answers[q.id]?.correct).length,
  total: app.questions.length,
});