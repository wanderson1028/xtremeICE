/** Aggregated Microsoft 365 lab definition and scoring helpers. */
import { wordApp } from "./word.js";
import { excelApp } from "./excel.js";
import { sharepointApp } from "./sharepoint.js";
import { outlookApp } from "./outlook.js";
import { teamsApp } from "./teams.js";
import { powerbiApp } from "./powerbi.js";

export const M365_APPS = [wordApp, excelApp, sharepointApp, outlookApp, teamsApp, powerbiApp];

/** Each task carries its app's reducer so scoring can verify the resulting state. */
export const M365_QUESTIONS = M365_APPS.flatMap((app) =>
  app.questions.map((question) => ({
    ...question,
    appId: app.id,
    appName: app.name,
    accent: app.accent,
    reduce: app.reduce,
    verify: question.verify,
  }))
);

export const TOTAL_QUESTIONS = M365_QUESTIONS.length;
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

/** All commands of an app, including the ones rendered outside the ribbon. */
export function allControls(app) {
  const groups = [];
  (app.tabs || []).forEach((tab) => groups.push(...tab.groups));
  return [
    ...groups.flatMap((group) => group.controls),
    ...(app.commandBar || []),
    ...(app.titleActions || []),
    ...(app.controls || []),
  ];
}

export const initialAppState = () =>
  Object.fromEntries(M365_APPS.map((app) => [app.id, { ...app.defaults }]));

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