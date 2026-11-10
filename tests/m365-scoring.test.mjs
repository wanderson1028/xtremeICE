import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { M365_APPS, M365_QUESTIONS, TOTAL_QUESTIONS, findControl, initialAppState } from "../src/lib/m365/index.js";
import { applyAction, resolveAction } from "../src/lib/m365/engine.js";

const BODY_FILES = {
  word: "src/components/m365/bodies/WordBody.jsx",
  sheet: "src/components/m365/bodies/ExcelBody.jsx",
  library: "src/components/m365/bodies/SharePointBody.jsx",
  mail: "src/components/m365/bodies/OutlookBody.jsx",
  chat: "src/components/m365/bodies/TeamsBody.jsx",
  report: "src/components/m365/bodies/PowerBiBody.jsx",
};

const DATA_FILES = {
  word: "src/lib/m365/word.js",
  excel: "src/lib/m365/excel.js",
  sharepoint: "src/lib/m365/sharepoint.js",
  outlook: "src/lib/m365/outlook.js",
  teams: "src/lib/m365/teams.js",
  powerbi: "src/lib/m365/powerbi.js",
};

const actionFor = (step) => {
  if (step.do === "tab") return { type: "tab", tabId: step.tab };
  if (step.do === "control") return { type: "control", controlId: step.control };
  if (step.do === "option") return { type: "option", controlId: step.control, optionId: step.option };
  if (step.do === "click") return { type: "click", targetId: step.target };
  if (step.do === "context") return { type: "context", targetId: step.target };
  if (step.do === "menu") return { type: "menu", targetId: step.target, itemId: step.item };
  throw new Error(`unknown step ${step.do}`);
};

const playPath = (question, steps) =>
  steps.reduce((state, step) => applyAction(state, question, actionFor(step)), { stepIndex: 0, result: null });

test("six applications with six scored tasks each", () => {
  assert.equal(M365_APPS.length, 6);
  assert.deepEqual(M365_APPS.map((app) => app.id), ["word", "excel", "sharepoint", "outlook", "teams", "powerbi"]);
  M365_APPS.forEach((app) => assert.equal(app.questions.length, 6, `${app.name} task count`));
  assert.equal(TOTAL_QUESTIONS, 36);
});

test("every task resolves to correct on its own command path", () => {
  M365_QUESTIONS.forEach((question) => {
    const state = playPath(question, question.steps);
    assert.equal(state.result, "correct", `${question.id} path`);
    assert.equal(state.stepIndex, question.steps.length - 1, `${question.id} final step`);
  });
});

test("every task asks for at least one command and none exceed four steps", () => {
  M365_QUESTIONS.forEach((question) => {
    assert.ok(question.steps.length >= 1 && question.steps.length <= 4, `${question.id} steps`);
  });
});

test("a wrong command fails the task immediately", () => {
  M365_QUESTIONS.forEach((question) => {
    const state = applyAction({ stepIndex: 0, result: null }, question, {
      type: "click",
      targetId: "not-a-real-control",
    });
    assert.equal(state.result, "wrong", question.id);
  });
});

test("selecting before a context action is not scored as an answer", () => {
  M365_QUESTIONS.filter((question) => question.steps[0].do === "context").forEach((question) => {
    const target = question.steps[0].target;
    const state = applyAction({ stepIndex: 0, result: null }, question, { type: "click", targetId: target });
    assert.equal(state.result, null, `${question.id} click`);
    assert.equal(state.stepIndex, 0, `${question.id} step`);
    assert.equal(resolveAction(question.steps[0], { type: "click", targetId: target }), "ignored");
  });
});

test("re-opening the command menu is not scored as an answer", () => {
  M365_QUESTIONS.forEach((question) => {
    const optionIndex = question.steps.findIndex((step) => step.do === "option");
    if (optionIndex < 1) return;
    const before = playPath(question, question.steps.slice(0, optionIndex));
    const repeated = applyAction(before, question, actionFor(question.steps[optionIndex - 1]));
    assert.deepEqual(repeated, before, `${question.id} repeated control`);
  });
});

test("repeated clicks after completion do not resolve a task twice", () => {
  M365_QUESTIONS.forEach((question) => {
    const done = playPath(question, question.steps);
    const repeated = applyAction(done, question, actionFor(question.steps[question.steps.length - 1]));
    assert.deepEqual(repeated, done, `${question.id} duplicate`);
    const stray = applyAction(done, question, { type: "click", targetId: "not-a-real-control" });
    assert.deepEqual(stray, done, `${question.id} stray click`);
  });
});

test("every command is reachable from the tab that is open at that step", () => {
  M365_APPS.forEach((app) => {
    const alwaysVisible = new Set([
      ...(app.commandBar || []).map((control) => control.id),
      ...(app.titleActions || []).map((control) => control.id),
      ...(app.controls || []).map((control) => control.id),
    ]);
    const defaultTab = app.defaultTab || app.tabs?.[0]?.id;

    app.questions.forEach((question) => {
      let activeTab = defaultTab;
      question.steps.forEach((step, i) => {
        if (step.do === "tab") {
          assert.notEqual(
            step.tab,
            activeTab,
            `${question.id} step ${i}: window already opens on the ${step.tab} tab`
          );
          activeTab = step.tab;
          return;
        }
        if (step.do !== "control" && step.do !== "option") return;
        if (alwaysVisible.has(step.control)) return;
        const tab = (app.tabs || []).find((item) => item.id === activeTab);
        const visible = tab?.groups.some((group) =>
          group.controls.some((control) => control.id === step.control)
        );
        assert.ok(visible, `${question.id} step ${i}: ${step.control} is not on the ${activeTab} tab`);
      });
    });
  });
});

test("answer key, options and body targets all exist", () => {
  M365_APPS.forEach((app) => {
    const bodySource = fs.readFileSync(path.join(process.cwd(), BODY_FILES[app.variant]), "utf8");
    const dataSource = fs.readFileSync(path.join(process.cwd(), DATA_FILES[app.id]), "utf8");

    app.questions.forEach((question) => {
      question.steps.forEach((step) => {
        if (step.do === "tab") {
          assert.ok(app.tabs.some((tab) => tab.id === step.tab), `${question.id} tab ${step.tab}`);
        }
        if (step.do === "control" || step.do === "option") {
          const control = findControl(app, step.control);
          assert.ok(control, `${question.id} control ${step.control}`);
          if (step.do === "option") {
            assert.ok(
              control.menu?.some((item) => item.id === step.option),
              `${question.id} option ${step.option} on ${step.control}`
            );
          }
        }
        if (step.target) {
          assert.ok(
            bodySource.includes(`"${step.target}"`),
            `${question.id} target ${step.target} rendered by ${BODY_FILES[app.variant]}`
          );
        }
        if (step.do === "menu") {
          assert.ok(
            dataSource.includes(`id: "${step.item}"`) || bodySource.includes(`id: "${step.item}"`),
            `${question.id} menu item ${step.item}`
          );
        }
      });

      Object.keys(question.effect || {}).forEach((key) => {
        assert.ok(key in initialAppState()[app.id], `${question.id} effect key ${key}`);
      });
    });
  });
});