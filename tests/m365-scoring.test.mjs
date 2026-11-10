/**
 * Regression suite for the Microsoft 365 point-and-click assessment.
 *
 * The suite is behavioural: every task is played the way the window would emit
 * it (menu items through `menuItemAction`, body clicks with an explicit commit
 * flag) so a missing commit marker, a dead answer key or an unreachable dialog
 * shows up as a failing task instead of a silently unscorable question.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import * as wordData from "../src/lib/m365/word.js";
import * as excelData from "../src/lib/m365/excel.js";
import * as sharepointData from "../src/lib/m365/sharepoint.js";
import * as outlookData from "../src/lib/m365/outlook.js";
import * as teamsData from "../src/lib/m365/teams.js";
import * as powerbiData from "../src/lib/m365/powerbi.js";

import {
  M365_APPS, M365_QUESTIONS, TOTAL_QUESTIONS, PASS_MARK,
  findControl, initialAppState, correctCount, scorePercent,
} from "../src/lib/m365/index.js";
import { applyAction } from "../src/lib/m365/engine.js";
import { isCommit, menuItemAction } from "../src/lib/m365/actions.js";
import { applyTaskAction } from "../src/lib/m365/session.js";

const DATA_MODULES = {
  word: wordData,
  excel: excelData,
  sharepoint: sharepointData,
  outlook: outlookData,
  teams: teamsData,
  powerbi: powerbiData,
};

const BODY_FILES = {
  word: "src/components/m365/bodies/WordBody.jsx",
  sheet: "src/components/m365/bodies/ExcelBody.jsx",
  library: "src/components/m365/bodies/SharePointBody.jsx",
  mail: "src/components/m365/bodies/OutlookBody.jsx",
  chat: "src/components/m365/bodies/TeamsBody.jsx",
  report: "src/components/m365/bodies/PowerBiBody.jsx",
};

/** Body elements whose click performs an operation (and can therefore score). */
const CLICK_COMMITS = {
  teams: teamsData.TEAMS_CLICK_COMMITS,
  powerbi: powerbiData.PBI_FILTER_TARGETS,
};

/** A target that exists in the same body but is the wrong one for the task. */
const WRONG_TARGETS = {
  "word-q4": "word-para-2",
  "word-q5": "word-para-3",
  "word-q6": "word-title",
  "excel-q2": "excel-row-soc",
  "excel-q3": "excel-col-d",
  "excel-q5": "excel-col-a",
  "excel-q6": "excel-col-e",
  "sharepoint-q3": "sp-row-vendor",
  "sharepoint-q4": "sp-row-policy",
  "sharepoint-q5": "sp-row-notes",
  "sharepoint-q6": "sp-row-policy",
  "outlook-q1": "ol-msg-phish",
  "outlook-q2": "ol-msg-access",
  "outlook-q3": "ol-msg-tabletop",
  "outlook-q4": "ol-msg-vendor",
  "teams-q3": "teams-channel-general",
  "teams-q6": "teams-file-policy",
  "powerbi-q5": "pbi-filter-emea",
};

/** A valid but wrong choice inside the same dialog. */
const WRONG_VALUES = {
  "sharepoint-q1": "Vendor_Contract.pdf",
  "sharepoint-q2": "Q1 Evidence",
  "sharepoint-q3": "All staff",
  "teams-q2": "SOC_Runbook.pdf",
  "teams-q5": "Incident 2026-10",
  "powerbi-q6": "NORTHWIND-FILE02",
};

/** Right command, wrong option: a partly-correct operation must still be wrong. */
const PARTIAL_CASES = {
  "word-q2": { type: "option", controlId: "table-of-contents", optionId: "toc-custom" },
  "excel-q1": { type: "option", controlId: "column-chart", optionId: "stacked" },
  "excel-q3": { type: "option", controlId: "currency", optionId: "currency-eur", targetId: "excel-col-e" },
  "excel-q4": { type: "option", controlId: "freeze", optionId: "unfreeze" },
  "outlook-q5": { type: "option", controlId: "filter", optionId: "flagged" },
  "powerbi-q1": { type: "option", controlId: "publish", optionId: "my-workspace" },
};

const appOf = (question) => M365_APPS.find((app) => app.id === question.appId);
const freshState = (question) => initialAppState()[question.appId];

/** Every exported menu array of an app's data module (context and dialog menus). */
const menuItems = (appId) =>
  Object.values(DATA_MODULES[appId])
    .filter(
      (value) =>
        Array.isArray(value) &&
        value.length > 0 &&
        value.every((item) => item && typeof item === "object" && "id" in item && "label" in item)
    )
    .flat();

/** Every command that opens a dropdown: ribbon groups, command bar, title and body controls. */
function menuControls(app) {
  const fromTabs = (app.tabs || []).flatMap((tab) =>
    tab.groups.flatMap((group) => group.controls)
  );
  return [...fromTabs, ...(app.commandBar || []), ...(app.titleActions || []), ...(app.controls || [])]
    .filter((control) => control.menu?.length);
}

/** The command that opens a given dialog. */
const dialogMenuControl = (app, dialogId) =>
  menuControls(app).find((control) => control.menu.some((item) => item.opens === dialogId));

/**
 * Build the action the simulated window emits for one accepted answer:
 * menu items go through `menuItemAction`, dialogs confirm with their value,
 * and body clicks carry an explicit commit.
 */
function actionFor(question, answer = question.answers[0]) {
  const app = appOf(question);
  const base = { targetId: answer.target };

  switch (answer.kind) {
    case "option": {
      const control = findControl(app, answer.control);
      const item = control.menu.find((entry) => entry.id === answer.option);
      return menuItemAction(
        { type: "option", controlId: answer.control, optionId: answer.option, ...base },
        item
      );
    }
    case "menu": {
      const item = menuItems(question.appId).find((entry) => entry.id === answer.item);
      return menuItemAction({ type: "menu", itemId: answer.item, ...base }, item);
    }
    case "confirm":
      return {
        type: "confirm",
        dialogId: answer.dialog,
        value: answer.value ?? app.dialogs[answer.dialog].confirm,
        ...base,
        commit: true,
      };
    case "click":
      return { type: "click", ...base, commit: true };
    default:
      return { type: "control", controlId: answer.control, ...base, commit: true };
  }
}

/** The navigation-only version of a task: what the candidate does before committing. */
function openingAction(question, answer = question.answers[0]) {
  const app = appOf(question);
  if (answer.kind === "menu") return { type: "context", targetId: answer.target };
  if (answer.kind === "option") {
    return { type: "control", controlId: answer.control, targetId: answer.target, commit: false };
  }
  if (answer.kind === "confirm") {
    const control = dialogMenuControl(app, answer.dialog);
    return { type: "control", controlId: control.id, targetId: answer.target, commit: false };
  }
  return { type: "click", targetId: answer.target, commit: false };
}

/* ------------------------------------------------------------------ shape --- */

test("six applications with six scored tasks each", () => {
  assert.equal(M365_APPS.length, 6);
  assert.deepEqual(M365_APPS.map((app) => app.id), [
    "word", "excel", "sharepoint", "outlook", "teams", "powerbi",
  ]);
  M365_APPS.forEach((app) => assert.equal(app.questions.length, 6, `${app.name} task count`));
  assert.equal(TOTAL_QUESTIONS, 36);
  assert.ok(PASS_MARK > 0 && PASS_MARK <= 100);
});

test("every task is fully specified", () => {
  M365_QUESTIONS.forEach((question) => {
    assert.ok(question.task?.length > 20, `${question.id} task text`);
    assert.ok(question.explanation?.length > 20, `${question.id} explanation`);
    assert.ok(Array.isArray(question.answers) && question.answers.length > 0, `${question.id} answer key`);
    assert.equal(typeof question.reduce, "function", `${question.id} reducer`);
    assert.equal(typeof question.verify, "function", `${question.id} verifier`);
    question.answers.forEach((answer) => {
      assert.ok(isCommit(actionFor(question, answer)), `${question.id} key ${JSON.stringify(answer)} commits`);
    });
  });
});

test("answer keys point at real controls, options, dialogs and menu items", () => {
  M365_QUESTIONS.forEach((question) => {
    const app = appOf(question);
    const dataSource = fs.readFileSync(path.join(process.cwd(), `src/lib/m365/${app.id}.js`), "utf8");
    const bodySource = fs.readFileSync(path.join(process.cwd(), BODY_FILES[app.variant]), "utf8");

    question.answers.forEach((answer) => {
      if (answer.kind === "control" || answer.kind === "option") {
        const control = findControl(app, answer.control);
        assert.ok(control, `${question.id}: control ${answer.control} exists`);
        if (answer.kind === "option") {
          assert.ok(
            control.menu?.some((item) => item.id === answer.option),
            `${question.id}: option ${answer.option} on ${answer.control}`
          );
        }
      }
      if (answer.kind === "menu") {
        assert.ok(
          menuItems(question.appId).some((item) => item.id === answer.item),
          `${question.id}: menu item ${answer.item} exists`
        );
      }
      if (answer.kind === "confirm") {
        assert.ok(app.dialogs?.[answer.dialog], `${question.id}: dialog ${answer.dialog} exists`);
      }
      if (answer.target) {
        assert.ok(
          bodySource.includes(`"${answer.target}"`) || dataSource.includes(`"${answer.target}"`),
          `${question.id}: target ${answer.target} is rendered`
        );
      }
    });
  });
});

test("commands that score are marked as committing, and body clicks commit", () => {
  M365_QUESTIONS.forEach((question) => {
    const app = appOf(question);
    question.answers.forEach((answer) => {
      if (answer.kind === "control") {
        const control = findControl(app, answer.control);
        assert.equal(control.commits, true, `${question.id}: ${answer.control} is a committing command`);
      }
      if (answer.kind === "click") {
        assert.ok(
          CLICK_COMMITS[app.id]?.includes(answer.target),
          `${question.id}: ${answer.target} is a commit-marked body element`
        );
      }
    });
  });
});

test("every dialog a task needs is reachable from a menu item", () => {
  M365_QUESTIONS.forEach((question) => {
    const app = appOf(question);
    question.answers
      .filter((answer) => answer.kind === "confirm")
      .forEach((answer) => {
        const control = dialogMenuControl(app, answer.dialog);
        assert.ok(control, `${question.id}: a command opens ${answer.dialog}`);
        const item = control.menu.find((entry) => entry.opens === answer.dialog);
        assert.equal(isCommit(menuItemAction({ type: "option" }, item)), false, `${question.id}: opening a dialog never scores`);
      });
  });
});

/* -------------------------------------------------------------- scoring --- */

test("every accepted answer scores its task correct from a fresh document", () => {
  M365_QUESTIONS.forEach((question) => {
    question.answers.forEach((answer, i) => {
      const result = applyAction({
        question,
        state: freshState(question),
        action: actionFor(question, answer),
      });
      assert.equal(result.outcome, "correct", `${question.id} answer ${i}`);
      assert.equal(question.verify(result.state), true, `${question.id} answer ${i} verification`);
    });
  });
});

test("a whole attempt scores 36 of 36 through the session reducer", () => {
  let answers = {};
  let states = initialAppState();

  M365_QUESTIONS.forEach((question) => {
    const result = applyTaskAction({ question, answers, states, action: actionFor(question) });
    assert.equal(result.outcome, "correct", `${question.id} during the attempt`);
    answers = result.answers;
    states = result.states;
  });

  assert.equal(correctCount(answers), TOTAL_QUESTIONS);
  assert.equal(scorePercent(answers), 100);
  assert.equal(Object.keys(answers).length, TOTAL_QUESTIONS);
});

test("a change carries forward to the next task", () => {
  const question = M365_QUESTIONS.find((item) => item.id === "word-q1");
  const next = M365_QUESTIONS.find((item) => item.id === "word-q2");
  const first = applyTaskAction({
    question,
    answers: {},
    states: initialAppState(),
    action: actionFor(question),
  });
  assert.equal(first.states.word.orientation, "landscape");
  const second = applyTaskAction({
    question: next,
    answers: first.answers,
    states: first.states,
    action: actionFor(next),
  });
  assert.equal(second.outcome, "correct");
  assert.equal(second.states.word.orientation, "landscape", "earlier layout is preserved");
  assert.equal(second.states.word.toc, "auto1");
});

/* ------------------------------------------------------------ navigation --- */

test("selecting and opening menus is never scored", () => {
  M365_QUESTIONS.forEach((question) => {
    const state = freshState(question);
    const result = applyAction({ question, state, action: openingAction(question) });
    assert.equal(result.outcome, "ignored", `${question.id} opening its own command`);
    assert.equal(result.state, state, `${question.id} document untouched`);
  });
});

test("tabs, context menus and dropdowns never score in any application", () => {
  M365_APPS.forEach((app) => {
    const question = app.questions[0];
    const state = freshState(question);
    (app.tabs || []).forEach((tab) => {
      const result = applyAction({ question, state, action: { type: "tab", tabId: tab.id } });
      assert.equal(result.outcome, "ignored", `${app.id} tab ${tab.id}`);
    });
    menuControls(app).forEach((control) => {
      const result = applyAction({
        question,
        state,
        action: { type: "control", controlId: control.id, commit: false },
      });
      assert.equal(result.outcome, "ignored", `${app.id} menu ${control.id}`);
    });
    ["word-title", "excel-row-soc", "sp-row-policy", "ol-msg-vendor", "teams-channel-general", "pbi-visual-1"]
      .forEach((targetId) => {
        const result = applyAction({ question, state, action: { type: "context", targetId } });
        assert.equal(result.outcome, "ignored", `${app.id} context menu on ${targetId}`);
      });
  });
});

test("re-opening the menu before choosing does not disturb the document", () => {
  M365_QUESTIONS.forEach((question) => {
    const state = freshState(question);
    const opened = applyAction({ question, state, action: openingAction(question) });
    const reopened = applyAction({ question, state: opened.state, action: openingAction(question) });
    assert.equal(reopened.outcome, "ignored", question.id);
    assert.deepEqual(reopened.state, state, question.id);
  });
});

/* ------------------------------------------------------- wrong operations --- */

test("performing the right command on the wrong target is wrong", () => {
  const covered = Object.keys(WRONG_TARGETS);
  assert.equal(covered.length, 18, "every targeted task is covered");

  covered.forEach((id) => {
    const question = M365_QUESTIONS.find((item) => item.id === id);
    assert.ok(question, `${id} exists`);
    const result = applyAction({
      question,
      state: freshState(question),
      action: { ...actionFor(question), targetId: WRONG_TARGETS[id] },
    });
    assert.equal(result.outcome, "wrong", `${id} wrong target`);
  });
});

test("a different option in the same command is never correct", () => {
  M365_QUESTIONS.forEach((question) => {
    const app = appOf(question);
    question.answers
      .filter((answer) => answer.kind === "option")
      .forEach((answer) => {
        const control = findControl(app, answer.control);
        const accepted = question.answers
          .filter((entry) => entry.kind === "option" && entry.control === answer.control)
          .map((entry) => entry.option);
        control.menu
          .filter((item) => !accepted.includes(item.id))
          .forEach((item) => {
            const action = menuItemAction(
              { type: "option", controlId: answer.control, optionId: item.id, targetId: answer.target },
              item
            );
            const result = applyAction({ question, state: freshState(question), action });
            assert.notEqual(result.outcome, "correct", `${question.id} option ${item.id}`);
          });
      });
  });
});

test("a partly correct operation is scored wrong", () => {
  Object.entries(PARTIAL_CASES).forEach(([id, action]) => {
    const question = M365_QUESTIONS.find((item) => item.id === id);
    const result = applyAction({ question, state: freshState(question), action: { ...action, commit: true } });
    assert.equal(result.outcome, "wrong", `${id} partial operation`);
  });
});

test("confirming a dialog with the wrong value is wrong", () => {
  Object.entries(WRONG_VALUES).forEach(([id, value]) => {
    const question = M365_QUESTIONS.find((item) => item.id === id);
    const action = { ...actionFor(question), value };
    const result = applyAction({ question, state: freshState(question), action });
    assert.equal(result.outcome, "wrong", `${id} wrong dialog value`);
  });
});

test("a command with nothing to act on leaves the task open", () => {
  const question = M365_QUESTIONS.find((item) => item.id === "word-q6");
  const state = freshState(question);
  const result = applyAction({
    question,
    state,
    action: { type: "control", controlId: "bold", targetId: null, commit: true },
  });
  assert.equal(result.outcome, "ignored");
  assert.equal(result.state, state);
});

/* ----------------------------------------------------------- duplicates --- */

test("an answered task ignores further commits and stays answered", () => {
  M365_QUESTIONS.forEach((question) => {
    const first = applyTaskAction({
      question,
      answers: {},
      states: initialAppState(),
      action: actionFor(question),
    });
    const repeat = applyTaskAction({
      question,
      answers: first.answers,
      states: first.states,
      action: actionFor(question),
    });
    assert.equal(repeat.outcome, "ignored", `${question.id} repeat`);
    assert.equal(repeat.answers, first.answers, `${question.id} answers untouched`);
    assert.equal(repeat.states, first.states, `${question.id} document untouched`);

    const stray = applyTaskAction({
      question,
      answers: first.answers,
      states: first.states,
      action: { type: "click", targetId: "not-a-real-control", commit: true },
    });
    assert.equal(stray.outcome, "ignored", `${question.id} stray commit`);
    assert.deepEqual(stray.answers, first.answers);
  });
});

test("the engine ignores repeated commits even without a resolved flag", () => {
  M365_QUESTIONS.forEach((question) => {
    const action = actionFor(question);
    const once = applyAction({ question, state: freshState(question), action });
    const twice = applyAction({ question, state: once.state, action });
    assert.equal(twice.outcome, "ignored", `${question.id} second application`);
    assert.equal(twice.state, once.state, `${question.id} state unchanged`);
  });
});

test("the first commit decides the task", () => {
  const question = M365_QUESTIONS.find((item) => item.id === "word-q1");
  const wrong = applyTaskAction({
    question,
    answers: {},
    states: initialAppState(),
    action: { type: "option", controlId: "margins", optionId: "margin-narrow", commit: true },
  });
  assert.equal(wrong.outcome, "wrong");
  assert.equal(wrong.answers["word-q1"].correct, false);

  const later = applyTaskAction({
    question,
    answers: wrong.answers,
    states: wrong.states,
    action: actionFor(question),
  });
  assert.equal(later.outcome, "ignored");
  assert.equal(later.answers["word-q1"].correct, false, "a later correct command cannot rescue the task");
});

test("reducers never mutate the state they are given", () => {
  M365_QUESTIONS.forEach((question) => {
    const state = Object.freeze({ ...freshState(question) });
    assert.doesNotThrow(
      () => applyAction({ question, state, action: actionFor(question) }),
      `${question.id} reducer purity`
    );
  });
});