/**
 * Event-ordering regression for the Microsoft 365 point-and-click assessment.
 *
 * Reported from a real browser session: on the first task (budget 9), one Bold
 * click, eight Home clicks, Layout, Orientation and finally Landscape left the
 * document in Portrait and closed the task as "click limit reached" — the final
 * allowed click never performed its action.
 *
 * The cause was ordering, not the answer key. The budget was settled from the
 * state update made by the capture-phase counter. React flushes a discrete event
 * update before the same press reaches the pressed control's own handler, so the
 * task was already closed (window locked, `emit` returning early) when the
 * Landscape operation tried to run.
 *
 * Every test below drives the real flow (`pointerFlow`) and the real session in
 * the order a browser dispatches a single press:
 *
 *   1. capture  — the window boundary counts the press
 *   2. flush    — whatever React does with that count; it must not settle/lock
 *   3. bubble   — the pressed control's operation is applied and verified
 *   4. after    — the deferred budget decision runs (a macrotask, because the
 *                 browser drains microtasks between the capture and bubble
 *                 listeners of the same event)
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  M365_APPS, M365_QUESTIONS, findControl, initialAppState,
} from "../src/lib/m365/index.js";
import { contextChoice, menuChoice, ribbonPress } from "../src/lib/m365/actions.js";
import { applyTaskAction, expireTask } from "../src/lib/m365/session.js";
import { clickBudget } from "../src/lib/m365/clicks.js";
import { createTaskPointerFlow } from "../src/lib/m365/pointerFlow.js";
import * as wordData from "../src/lib/m365/word.js";

const questionById = (id) => M365_QUESTIONS.find((question) => question.id === id);
const appOf = (question) => M365_APPS.find((app) => app.id === question.appId);

/** One task driven by the real flow, with manual control over the dispatch phases. */
function openTask(question) {
  const sim = {
    question,
    answers: {},
    states: initialAppState(),
    used: 0,
    locked: false,
    exhausted: false,
    expiries: 0,
    armed: [],
  };

  sim.flow = createTaskPointerFlow({
    limit: clickBudget(question.minClicks),
    isResolved: () => Boolean(sim.answers[question.id]),
    onCount: (used) => {
      sim.used = used;
    },
    expire: () => {
      sim.expiries += 1;
      const result = expireTask({
        question: sim.question,
        answers: sim.answers,
        states: sim.states,
      });
      sim.answers = result.answers;
      sim.states = result.states;
      if (result.outcome === "exhausted") {
        sim.exhausted = true;
        sim.locked = true;
      }
    },
    /* The page's real scheduler is a timer; keeping the callbacks here lets a
       test choose exactly when the "press has finished" moment arrives. */
    defer: (decide) => {
      sim.armed.push(decide);
      return () => {
        sim.armed = sim.armed.filter((entry) => entry !== decide);
      };
    },
  });

  return sim;
}

/** Step 1: capture phase at the window boundary. */
const count = (sim, eventType = "click") => sim.flow.press(eventType);

/** Step 3: the pressed control's operation reaches the session. */
function act(sim, action) {
  if (sim.locked) return { outcome: "ignored", answers: sim.answers, states: sim.states };
  const result = applyTaskAction({
    question: sim.question,
    answers: sim.answers,
    states: sim.states,
    action,
  });
  sim.answers = result.answers;
  sim.states = result.states;
  if (result.outcome === "correct") sim.locked = true;
  return result;
}

/** Step 4: the press is over, so armed budget decisions run. */
function finishPress(sim) {
  const armed = sim.armed;
  sim.armed = [];
  armed.forEach((decide) => decide());
}

/** One whole press, in order. */
function press(sim, action = null) {
  count(sim);
  const result = act(sim, action);
  finishPress(sim);
  return result;
}

const tab = (tabId) => ({ type: "tab", tabId });

/* ------------------------------------------------- the reported sequence --- */

test("the reported sequence: the twelfth click still performs Landscape and scores", () => {
  const question = questionById("word-q1");
  const app = appOf(question);
  const bold = findControl(app, "bold");
  const orientation = findControl(app, "orientation");
  const landscape = orientation.menu.find((item) => item.id === "landscape");

  const sim = openTask(question);
  assert.equal(sim.flow.limit, 9);

  press(sim, ribbonPress(bold, null));
  assert.equal(sim.used, 1, "1 · Bold");

  for (let index = 0; index < 5; index += 1) press(sim, tab("home"));
  assert.equal(sim.used, 6, "2-6 · Home pressed five times");

  press(sim, tab("layout"));
  assert.equal(sim.used, 7, "7 · Layout");

  press(sim, ribbonPress(orientation, null));
  assert.equal(sim.used, 8, "8 · Orientation");
  assert.equal(sim.answers["word-q1"], undefined, "eight clicks leaves the task open");
  assert.equal(sim.locked, false);

  /* 9 · the final allowed click. Counting it must not close the task: the
     Landscape operation has not been dispatched yet. */
  count(sim);
  assert.equal(sim.used, 9, "the ninth click is counted");
  assert.equal(sim.locked, false, "counting the last click never locks the window");
  assert.equal(sim.answers["word-q1"], undefined, "and never records an answer");
  assert.equal(sim.exhausted, false, "nor expires the task before its operation runs");

  const result = act(sim, menuChoice(orientation.id, landscape, null));
  assert.equal(result.outcome, "correct", "the final allowed click performs its action");

  finishPress(sim);
  assert.equal(sim.states.word.orientation, "landscape", "the document really is landscape");
  assert.equal(sim.answers["word-q1"].correct, true);
  assert.equal(sim.expiries, 0, "the click that solves the task never expires it");
});

/* ------------------------------------------ a final click that hits nothing --- */

test("a blank final click expires the task, once, after it has dispatched", () => {
  const question = questionById("word-q1");
  const sim = openTask(question);

  for (let index = 0; index < 8; index += 1) press(sim, null);
  assert.equal(sim.used, 8);
  assert.equal(sim.answers["word-q1"], undefined, "eight blank clicks is not the limit");

  count(sim);
  assert.equal(sim.used, 9);
  assert.equal(sim.answers["word-q1"], undefined, "the count itself records nothing");

  act(sim, null); // the click hit nothing
  assert.equal(sim.exhausted, false, "expiry waits for the press to finish");
  finishPress(sim);

  assert.equal(sim.answers["word-q1"].correct, false, "the task closes as wrong");
  assert.equal(sim.expiries, 1, "wrong is recorded once");

  press(sim, menuChoice(findControl(appOf(question), "orientation").id, { id: "landscape" }, null));
  assert.equal(sim.expiries, 1, "a closed task cannot expire twice");
  assert.equal(sim.answers["word-q1"].correct, false);
});

/* --------------------------------------------- right-click and menu timing --- */

test("a right-click that spends the last click expires after its own dispatch", () => {
  const question = questionById("word-q1");
  const sim = openTask(question);

  for (let index = 0; index < 8; index += 1) press(sim, null);

  /* The ninth press is a right-click: opening the context menu is navigation,
     so the menu choice that follows arrives at an already spent budget. */
  count(sim, "contextmenu");
  assert.equal(sim.used, 9);
  act(sim, { type: "context", targetId: "word-para-2" });
  assert.equal(sim.exhausted, false, "the menu opening itself does not decide it");
  finishPress(sim);

  assert.equal(sim.answers["word-q1"].correct, false, "the press spends the budget and closes the task");
  assert.equal(sim.expiries, 1);

  const item = wordData.PARA_MENU.find((entry) => entry.id === "new-comment");
  const after = act(sim, contextChoice("word-para-2", item));
  assert.equal(after.outcome, "ignored", "the later menu choice cannot resurrect the task");
});

/* --------------------------------------------------------- deferral timing --- */

test("the budget decision cannot run between the capture count and the bubble", async () => {
  const question = questionById("word-q1");
  const orientation = findControl(appOf(question), "orientation");

  /* The real scheduler: a macrotask. A microtask would be drained between the
     capture and bubble listeners of the same press and would reinstate the bug. */
  const state = { answers: {}, used: 0, expiries: 0 };
  const flow = createTaskPointerFlow({
    limit: clickBudget(question.minClicks),
    isResolved: () => Boolean(state.answers[question.id]),
    onCount: (used) => {
      state.used = used;
    },
    expire: () => {
      state.expiries += 1;
      state.answers = expireTask({
        question, answers: state.answers, states: initialAppState(),
      }).answers;
    },
  });

  for (let index = 0; index < 8; index += 1) flow.press("click");
  assert.equal(flow.used, 8);

  flow.press("click");
  assert.equal(flow.spent, true);

  /* The browser drains microtasks between the two listeners of one event. */
  await Promise.resolve();
  assert.equal(state.expiries, 0, "a microtask checkpoint must not settle the task");
  assert.equal(state.answers[question.id], undefined, "nothing is recorded mid-press");

  const result = applyTaskAction({
    question,
    answers: state.answers,
    states: initialAppState(),
    action: menuChoice(orientation.id, { id: "landscape" }, null),
  });
  state.answers = result.answers;
  assert.equal(result.outcome, "correct");

  /* Now the press is over and the deferred decision runs. */
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(state.expiries, 0, "the click that solved the task is never expired");
  assert.equal(state.answers[question.id].correct, true);

  /* And with nothing done, the same deferral does expire the task. */
  const idle = { answers: {}, expiries: 0 };
  const idleFlow = createTaskPointerFlow({
    limit: clickBudget(question.minClicks),
    isResolved: () => Boolean(idle.answers[question.id]),
    expire: () => {
      idle.expiries += 1;
    },
  });
  for (let index = 0; index < 9; index += 1) idleFlow.press("click");
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(idle.expiries, 1, "a spent budget closes a task that was not solved");
});

/* ---------------------------------------------------------- duplicate guards --- */

test("one press arms one decision, and a disposed flow cannot close the next task", () => {
  const question = questionById("word-q1");

  const sim = openTask(question);
  for (let index = 0; index < 9; index += 1) count(sim);
  assert.equal(sim.armed.length, 1, "only one decision is ever armed");
  finishPress(sim);
  assert.equal(sim.expiries, 1);

  count(sim);
  count(sim);
  assert.equal(sim.armed.length, 0, "presses past the limit arm nothing");
  assert.equal(sim.used, 9, "the tally never overruns the budget");
  assert.equal(sim.expiries, 1, "and never expire twice");

  /* A task change disposes the task's flow: its pending decision must not reach
     the next task. */
  const stale = openTask(question);
  for (let index = 0; index < 9; index += 1) count(stale);
  assert.equal(stale.armed.length, 1);
  stale.flow.dispose();
  assert.equal(stale.armed.length, 0, "disposing cancels the armed decision");
  finishPress(stale);
  assert.equal(stale.answers["word-q1"], undefined, "a disposed flow never closes its task");
  assert.equal(stale.expiries, 0);
});

test("applying an operation never closes a task; only expiry does", () => {
  M365_QUESTIONS.forEach((question) => {
    const result = applyTaskAction({
      question,
      answers: {},
      states: initialAppState(),
      action: null,
    });
    assert.notEqual(result.outcome, "exhausted", `${question.id} stays open on a blank click`);
    assert.equal(result.answers[question.id], undefined);
  });
});