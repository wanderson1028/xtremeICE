/**
 * UI payload regression for the Microsoft 365 point-and-click assessment.
 *
 * The scoring suite plays answers it builds itself. This suite builds every
 * action with the *same* builders the window uses (ribbon menu choice, context
 * menu choice, command press, body click, dialog confirm) and replays it, so a
 * payload that loses the chosen option, a command that forgets to commit, or an
 * answer key that stops pinning its option fails here instead of scoring zero
 * in silence while the task appears to advance.
 */
import test from "node:test";
import assert from "node:assert/strict";

import * as wordData from "../src/lib/m365/word.js";
import { isLandscape } from "../src/lib/m365/word.js";
import * as excelData from "../src/lib/m365/excel.js";
import * as sharepointData from "../src/lib/m365/sharepoint.js";
import * as outlookData from "../src/lib/m365/outlook.js";
import * as teamsData from "../src/lib/m365/teams.js";
import * as powerbiData from "../src/lib/m365/powerbi.js";

import {
  M365_APPS, M365_QUESTIONS, allControls, findControl, initialAppState,
} from "../src/lib/m365/index.js";
import {
  bodyClick, contextChoice, dialogConfirm, isCommit, menuChoice, ribbonPress,
} from "../src/lib/m365/actions.js";
import { applyAction } from "../src/lib/m365/engine.js";
import { applyTaskAction } from "../src/lib/m365/session.js";

const DATA_MODULES = {
  word: wordData,
  excel: excelData,
  sharepoint: sharepointData,
  outlook: outlookData,
  teams: teamsData,
  powerbi: powerbiData,
};

/** Body elements whose click performs an operation, exactly as the bodies declare. */
const CLICK_COMMITS = {
  teams: teamsData.TEAMS_CLICK_COMMITS,
  powerbi: powerbiData.PBI_FILTER_TARGETS,
};

const appOf = (question) => M365_APPS.find((app) => app.id === question.appId);
const freshState = (question) => initialAppState()[question.appId];

/** Every command in an app that opens a dropdown. */
const dropdowns = (app) => allControls(app).filter((control) => control.menu?.length);

/** Every exported menu array of an app's data module (body and dialog menus). */
const bodyMenus = (appId) =>
  Object.values(DATA_MODULES[appId])
    .filter(
      (value) =>
        Array.isArray(value) &&
        value.length > 0 &&
        value.every((item) => item && typeof item === "object" && "id" in item && "label" in item)
    )
    .flat();

/** The action the window emits for one accepted answer, built the UI's way. */
function liveAction(question, answer) {
  const app = appOf(question);
  switch (answer.kind) {
    case "option":
      return menuChoice(
        answer.control,
        findControl(app, answer.control).menu.find((item) => item.id === answer.option),
        answer.target
      );
    case "menu":
      return contextChoice(
        answer.target,
        bodyMenus(question.appId).find((item) => item.id === answer.item)
      );
    case "confirm":
      return dialogConfirm(
        answer.dialog,
        answer.value ?? app.dialogs[answer.dialog].confirm,
        answer.target
      );
    case "click":
      return bodyClick(answer.target, CLICK_COMMITS[app.id].includes(answer.target));
    default:
      return ribbonPress(findControl(app, answer.control), answer.target);
  }
}

/* ------------------------------------------------------- payload integrity --- */

test("every dropdown choice carries its own item id", () => {
  let count = 0;
  M365_APPS.forEach((app) => {
    dropdowns(app).forEach((control) => {
      control.menu.forEach((item) => {
        const action = menuChoice(control.id, item, null);
        const label = `${app.id}/${control.id}/${item.id}`;
        assert.equal(action.type, "option", `${label} type`);
        assert.equal(action.controlId, control.id, `${label} control id`);
        assert.equal(action.optionId, item.id, `${label} carries the chosen option`);
        assert.equal(action.commit, !item.opens, `${label} commit flag`);
        if (typeof item.opens === "string") assert.equal(action.dialog, item.opens, `${label} dialog`);
        count += 1;
      });
    });
  });
  assert.ok(count > 60, `all dropdown items inspected (${count})`);
});

test("every context-menu choice carries its own item id", () => {
  let count = 0;
  M365_APPS.forEach((app) => {
    bodyMenus(app.id).forEach((item) => {
      const action = contextChoice("some-target", item);
      assert.equal(action.type, "menu", `${app.id}/${item.id} type`);
      assert.equal(action.itemId, item.id, `${app.id}/${item.id} carries the chosen item`);
      assert.equal(action.commit, !item.opens, `${app.id}/${item.id} commit flag`);
      count += 1;
    });
  });
  assert.ok(count > 15, `all body menu items inspected (${count})`);
});

test("commands commit only where the app flags an operation", () => {
  M365_APPS.forEach((app) => {
    allControls(app).forEach((control) => {
      assert.equal(
        ribbonPress(control, "target").commit,
        Boolean(control.commits),
        `${app.id}/${control.id} commit flag mirrors the app config`
      );
    });
  });
});

/* --------------------------------------------------- reported regression --- */

test("choosing Landscape changes the rendered document before the task advances", () => {
  const app = DATA_MODULES.word.wordApp;
  const question = M365_QUESTIONS.find((entry) => entry.id === "word-q1");
  const control = findControl(app, "orientation");
  const item = control.menu.find((entry) => entry.id === "landscape");

  const payload = menuChoice(control.id, item, null);
  assert.deepEqual(payload, {
    type: "option",
    controlId: "orientation",
    targetId: null,
    optionId: "landscape",
    commit: true,
  });

  const result = applyAction({ question, state: app.defaults, action: payload });
  assert.equal(result.outcome, "correct");
  assert.equal(isLandscape(result.state), true, "the document and status bar show Landscape");
  assert.equal(question.verify(result.state), true);

  const next = applyTaskAction({
    question,
    answers: {},
    states: initialAppState(),
    action: payload,
  });
  assert.equal(next.answers[question.id].correct, true);
  assert.equal(isLandscape(next.states.word), true, "the landscape page survives the advance");
});

test("Portrait neither scores nor locks the task", () => {
  const app = DATA_MODULES.word.wordApp;
  const question = M365_QUESTIONS.find((entry) => entry.id === "word-q1");
  const control = findControl(app, "orientation");
  const payload = menuChoice(control.id, control.menu.find((entry) => entry.id === "portrait"));

  const result = applyAction({ question, state: app.defaults, action: payload });
  assert.equal(result.outcome, "ignored", "re-applying the current setting changes nothing");
  assert.equal(isLandscape(result.state), false);
  assert.equal(result.state, app.defaults, "document untouched");
});

test("a choice that loses its option id can never score", () => {
  M365_QUESTIONS.forEach((question) => {
    question.answers
      .filter((answer) => answer.kind === "option")
      .forEach((answer) => {
        const control = findControl(appOf(question), answer.control);
        const result = applyAction({
          question,
          state: freshState(question),
          action: { type: "option", controlId: control.id, targetId: answer.target ?? null, commit: true },
        });
        assert.notEqual(result.outcome, "correct", `${question.id} without an option id`);
      });
  });
});

/* ------------------------------------------------- real payloads score well --- */

test("every accepted answer scores from the payload the window really emits", () => {
  M365_QUESTIONS.forEach((question) => {
    question.answers.forEach((answer, index) => {
      const action = liveAction(question, answer);
      const label = `${question.id} answer ${index}`;
      assert.equal(isCommit(action), true, `${label} commits`);
      const result = applyAction({ question, state: freshState(question), action });
      assert.equal(result.outcome, "correct", label);
      assert.equal(question.verify(result.state), true, `${label} verification`);
    });
  });
});

test("a full attempt driven only by UI payloads scores 36 of 36", () => {
  let answers = {};
  let states = initialAppState();

  M365_QUESTIONS.forEach((question) => {
    const result = applyTaskAction({
      question,
      answers,
      states,
      action: liveAction(question, question.answers[0]),
    });
    assert.equal(result.outcome, "correct", `${question.id} through the session`);
    answers = result.answers;
    states = result.states;
  });

  assert.equal(Object.values(answers).filter((entry) => entry.correct).length, M365_QUESTIONS.length);
  assert.equal(states.word.orientation, "landscape", "the first task is visible in the final document");
});

test("no committed choice writes an undefined value into the document", () => {
  M365_APPS.forEach((app) => {
    dropdowns(app).forEach((control) => {
      control.menu
        .filter((item) => !item.opens)
        .forEach((item) => {
          const next = app.reduce(app.defaults, menuChoice(control.id, item, null));
          Object.entries(next).forEach(([key, value]) => {
            assert.notEqual(
              value,
              undefined,
              `${app.id}/${control.id}/${item.id} left ${key} undefined`
            );
          });
        });
    });
  });
});