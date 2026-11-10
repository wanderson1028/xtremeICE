/**
 * Click-budget regression for the Microsoft 365 point-and-click assessment.
 *
 * These tests drive a window simulator, not hand-written answer payloads: every
 * physical press goes through the same builders the components use (tab press,
 * ribbon/command press, menu item, context menu, dialog pick and confirm, body
 * click) and is fed to the flow and session the page uses, in the order a
 * browser dispatches one press: capture counts, the pressed control's action is
 * applied, and only then does the deferred budget decision run. A click that hits
 * nothing is dispatched as a click with no action.
 */
import test from "node:test";
import assert from "node:assert/strict";

import * as wordData from "../src/lib/m365/word.js";
import * as excelData from "../src/lib/m365/excel.js";
import * as sharepointData from "../src/lib/m365/sharepoint.js";
import * as outlookData from "../src/lib/m365/outlook.js";
import * as teamsData from "../src/lib/m365/teams.js";
import * as powerbiData from "../src/lib/m365/powerbi.js";

import {
  M365_APPS, M365_QUESTIONS, TOTAL_QUESTIONS, findControl, initialAppState,
} from "../src/lib/m365/index.js";
import {
  bodyClick, contextChoice, dialogConfirm, menuChoice, ribbonPress,
} from "../src/lib/m365/actions.js";
import { applyTaskAction, expireTask } from "../src/lib/m365/session.js";
import { createTaskPointerFlow } from "../src/lib/m365/pointerFlow.js";
import {
  CLICK_MULTIPLIER, clickBudget, countsAsClick, createClickTally,
} from "../src/lib/m365/clicks.js";
import { afterTask } from "../src/lib/m365/progress.js";

const DATA_MODULES = {
  word: wordData,
  excel: excelData,
  sharepoint: sharepointData,
  outlook: outlookData,
  teams: teamsData,
  powerbi: powerbiData,
};

/** Body elements whose click performs an operation (and can therefore score). */
const CLICK_COMMITS = {
  teams: teamsData.TEAMS_CLICK_COMMITS,
  powerbi: powerbiData.PBI_FILTER_TARGETS,
};

const appOf = (question) => M365_APPS.find((app) => app.id === question.appId);
const questionById = (id) => M365_QUESTIONS.find((question) => question.id === id);

const isMenuArray = (value) =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((item) => item && typeof item === "object" && "id" in item && "label" in item);

/** Every exported menu of an app's data module (context menus and dialogs). */
const menuArrays = (appId) => Object.values(DATA_MODULES[appId]).filter(isMenuArray);
const menuWith = (appId, itemId) => menuArrays(appId).find((menu) => menu.some((item) => item.id === itemId));

const defaultTabOf = (app) => app.defaultTab || app.tabs?.[0]?.id || null;
const tabOf = (app, controlId) =>
  (app.tabs || [])
    .find((tab) => tab.groups.some((group) => group.controls.some((control) => control.id === controlId)))
    ?.id || null;

/** The command that opens a given dialog. */
function dialogMenuControl(app, dialogId) {
  const controls = [
    ...(app.tabs || []).flatMap((tab) => tab.groups.flatMap((group) => group.controls)),
    ...(app.commandBar || []),
    ...(app.titleActions || []),
    ...(app.controls || []),
  ];
  return controls.find((control) => control.menu?.some((item) => item.opens === dialogId));
}

/**
 * One simulated application window. Every method below is one physical press:
 * it is counted at the boundary first, then dispatched with the payload the
 * component emits for that press.
 */
class WindowSim {
  constructor(question, { answers = {}, states = initialAppState() } = {}) {
    this.question = question;
    this.app = appOf(question);
    this.answers = answers;
    this.states = states;
    this.tab = defaultTabOf(this.app);
    this.selected = null;
    this.context = null;
    this.dialog = null;
    this.ui = {};
    this.limit = clickBudget(question.minClicks);
    this.used = 0;
    this.locked = false;
    this.outcomes = [];
    this.last = null;
    this.armed = [];

    /* The flow the page uses: the capture phase counts and arms a budget
       decision, which is only run once the press has finished dispatching. */
    this.flow = createTaskPointerFlow({
      limit: this.limit,
      isResolved: () => Boolean(this.answers[this.question.id]),
      onCount: (used) => {
        this.used = used;
      },
      expire: () => this.expire(),
      defer: (decide) => {
        this.armed.push(decide);
        return () => {
          this.armed = this.armed.filter((entry) => entry !== decide);
        };
      },
    });
  }

  get remaining() {
    return Math.max(0, this.limit - this.used);
  }

  get outcome() {
    return this.outcomes[this.outcomes.length - 1] ?? null;
  }

  /** One physical press in dispatch order: capture counts, the control's own
      handler commits, then the budget decision armed by the count runs. */
  press(build = null) {
    if (this.locked) return null;
    this.flow.press("click");
    const result = this.dispatch(build ? build() : null);
    this.settle();
    return result;
  }

  /** Runs the budget decisions armed by presses that have finished dispatching. */
  settle() {
    const armed = this.armed;
    this.armed = [];
    armed.forEach((decide) => decide());
  }

  dispatch(action) {
    const result = applyTaskAction({
      question: this.question,
      answers: this.answers,
      states: this.states,
      action,
    });
    this.answers = result.answers;
    this.states = result.states;
    this.last = result;
    this.outcomes.push(result.outcome);
    if (result.outcome === "correct") this.locked = true;
    return result;
  }

  expire() {
    const result = expireTask({
      question: this.question,
      answers: this.answers,
      states: this.states,
    });
    this.answers = result.answers;
    this.states = result.states;
    this.last = result;
    this.outcomes.push(result.outcome);
    if (result.outcome === "exhausted") this.locked = true;
  }

  pressTab(tabId) {
    return this.press(() => {
      if (tabId === this.tab) return null;
      this.tab = tabId;
      return { type: "tab", tabId };
    });
  }

  pressControl(controlId) {
    const control = findControl(this.app, controlId);
    return this.press(() => {
      if (control?.ui) this.ui[control.ui] = !this.ui[control.ui];
      return ribbonPress(control, this.selected);
    });
  }

  choose(controlId, itemId) {
    const control = findControl(this.app, controlId);
    const item = control.menu.find((entry) => entry.id === itemId);
    return this.press(() => {
      if (typeof item.opens === "string") {
        const definition = this.app.dialogs[item.opens];
        this.dialog = { id: item.opens, definition, choice: null, text: definition?.input?.value || "" };
      }
      return menuChoice(control.id, item, this.selected);
    });
  }

  select(targetId) {
    const commits = CLICK_COMMITS[this.app.id] || [];
    return this.press(() => {
      this.selected = targetId;
      return bodyClick(targetId, commits.includes(targetId));
    });
  }

  rightClick(targetId, menu) {
    return this.press(() => {
      this.selected = targetId;
      this.context = { targetId, menu };
      return { type: "context", targetId };
    });
  }

  chooseContext(itemId) {
    const { targetId, menu } = this.context;
    const item = menu.find((entry) => entry.id === itemId);
    return this.press(() => {
      this.context = null;
      return contextChoice(targetId, item);
    });
  }

  pickInDialog(itemId) {
    return this.press(() => {
      this.dialog.choice = itemId;
      return null;
    });
  }

  typeInDialog(text) {
    this.dialog.text = text;
  }

  confirmDialog() {
    const open = this.dialog;
    const value = open.definition.items
      ? open.choice
      : open.definition.input
      ? open.text.trim()
      : open.definition.confirm;
    return this.press(() => {
      this.dialog = null;
      return dialogConfirm(open.id, value, this.selected);
    });
  }

  /** A click on empty window space. */
  blank() {
    return this.press(() => null);
  }
}

/** The physical presses a task's shortest accepted solution needs. */
function clickPath(question, answer = question.answers[0]) {
  const app = appOf(question);
  const steps = [];

  const tabStep = (controlId) => {
    const tab = tabOf(app, controlId);
    if (tab && tab !== defaultTabOf(app)) steps.push((sim) => sim.pressTab(tab));
  };
  const selectStep = () => {
    if (answer.target) steps.push((sim) => sim.select(answer.target));
  };

  (question.prep || []).forEach((prep) => {
    if (prep.tab) steps.push((sim) => sim.pressTab(prep.tab));
    else if (prep.control) steps.push((sim) => sim.pressControl(prep.control));
    else if (prep.select) steps.push((sim) => sim.select(prep.select));
  });

  if (answer.kind === "option") {
    selectStep();
    tabStep(answer.control);
    steps.push((sim) => sim.pressControl(answer.control));
    steps.push((sim) => sim.choose(answer.control, answer.option));
  } else if (answer.kind === "control") {
    selectStep();
    tabStep(answer.control);
    steps.push((sim) => sim.pressControl(answer.control));
  } else if (answer.kind === "menu") {
    const menu = menuWith(question.appId, answer.item);
    steps.push((sim) => sim.rightClick(answer.target, menu));
    steps.push((sim) => sim.chooseContext(answer.item));
  } else if (answer.kind === "confirm") {
    selectStep();
    const control = dialogMenuControl(app, answer.dialog);
    const opening = control.menu.find((entry) => entry.opens === answer.dialog);
    const definition = app.dialogs[answer.dialog];
    tabStep(control.id);
    steps.push((sim) => sim.pressControl(control.id));
    steps.push((sim) => sim.choose(control.id, opening.id));
    if (definition.items) steps.push((sim) => sim.pickInDialog(answer.value));
    steps.push((sim) => {
      if (definition.input) sim.typeInDialog(answer.value);
      return sim.confirmDialog();
    });
  } else if (answer.kind === "click") {
    steps.push((sim) => sim.select(answer.target));
  }

  return steps;
}

const playPath = (question, sim) => {
  clickPath(question).forEach((step) => step(sim));
  return sim;
};

/* ---------------------------------------------------------------- budget --- */

test("every task declares an audited minimum and three times that many clicks", () => {
  assert.equal(M365_QUESTIONS.length, 36);
  assert.equal(CLICK_MULTIPLIER, 3);

  M365_QUESTIONS.forEach((question) => {
    assert.equal(typeof question.minClicks, "number", `${question.id} declares minClicks`);
    assert.ok(Number.isInteger(question.minClicks) && question.minClicks >= 1, `${question.id} minimum`);
    assert.equal(clickBudget(question.minClicks), question.minClicks * 3, `${question.id} budget`);
    assert.ok(question.minClicks <= 5, `${question.id} minimum is plausible (${question.minClicks})`);
  });

  /* The reported example: Layout > Orientation > Landscape is three clicks. */
  assert.equal(questionById("word-q1").minClicks, 3);
  assert.equal(clickBudget(questionById("word-q1").minClicks), 9);
});

test("the declared minimum is the real shortest click path for all 36 tasks", () => {
  M365_QUESTIONS.forEach((question) => {
    const steps = clickPath(question);
    assert.equal(steps.length, question.minClicks, `${question.id} audited click path`);

    const sim = new WindowSim(question);
    playPath(question, sim);

    assert.equal(sim.used, question.minClicks, `${question.id} needs exactly that many clicks`);
    assert.equal(sim.outcome, "correct", `${question.id} shortest path scores`);
    assert.equal(sim.answers[question.id].correct, true, `${question.id} recorded correct`);
    assert.equal(sim.remaining, question.minClicks * 2, `${question.id} leaves two thirds of the budget`);
  });
});

/* --------------------------------------------------------------- counting --- */

test("only click and context menu are physical clicks", () => {
  assert.equal(countsAsClick("click"), true);
  assert.equal(countsAsClick("contextmenu"), true);
  ["pointerdown", "pointerup", "mousedown", "mouseup", "mousemove", "scroll", "keydown", "input"]
    .forEach((type) => assert.equal(countsAsClick(type), false, `${type} is not counted`));
});

test("the tally counts one press once, caps at the budget and resets", () => {
  const tally = createClickTally(12);
  assert.equal(tally.used, 0);
  assert.equal(tally.remaining, 12);

  tally.spend("click");
  assert.equal(tally.used, 1, "a left click counts once");
  tally.spend("pointerdown");
  assert.equal(tally.used, 1, "the pointerdown of the same press adds nothing");
  tally.spend("contextmenu");
  assert.equal(tally.used, 2, "a right click counts once");
  tally.spend("mousemove");
  assert.equal(tally.used, 2, "moving the pointer adds nothing");

  for (let index = 0; index < 20; index += 1) tally.spend("click");
  assert.equal(tally.used, 12, "the tally never overruns the budget");
  assert.equal(tally.remaining, 0);
  assert.equal(tally.spent, true);

  tally.reset();
  assert.equal(tally.used, 0, "a new task starts from zero");
  assert.equal(tally.remaining, 12);
});

test("left click, right click and a blank click each spend one", () => {
  const question = questionById("word-q1");
  const sim = new WindowSim(question);

  sim.select("word-title");
  assert.equal(sim.used, 1, "selecting text counts");
  sim.rightClick("word-para-2", wordData.PARA_MENU);
  assert.equal(sim.used, 2, "the right click counts, not the menu it opens");
  sim.chooseContext("new-comment");
  assert.equal(sim.used, 3, "choosing from the context menu counts");
  sim.blank();
  assert.equal(sim.used, 4, "a blank click counts");
  assert.equal(sim.remaining, 5);
});

/* ---------------------------------------------------------- exploration --- */

test("a wrong command leaves the task open and can be corrected", () => {
  const question = questionById("word-q1");
  const sim = new WindowSim(question);

  sim.pressTab("layout");
  sim.pressControl("margins");
  sim.choose("margins", "margin-narrow");

  assert.equal(sim.outcome, "explore", "the wrong command is not fatal");
  assert.equal(sim.answers["word-q1"], undefined, "the task is still open");
  assert.equal(sim.locked, false, "the window stays live");

  sim.pressControl("orientation");
  sim.choose("orientation", "landscape");

  assert.equal(sim.outcome, "correct");
  assert.equal(sim.answers["word-q1"].correct, true);
  assert.equal(sim.states.word.orientation, "landscape");
  assert.ok(sim.used < sim.limit, "the correction fits inside the budget");
});

test("wrong commands never close a task before the budget runs out", () => {
  const question = questionById("excel-q1");
  const sim = new WindowSim(question);

  sim.pressTab("insert");
  sim.pressControl("column-chart");
  sim.choose("column-chart", "stacked");
  assert.equal(sim.answers["excel-q1"], undefined);

  sim.pressControl("column-chart");
  sim.choose("column-chart", "clustered-bar");
  assert.equal(sim.answers["excel-q1"], undefined);
  assert.equal(sim.locked, false);

  sim.blank();
  assert.equal(sim.answers["excel-q1"], undefined, "clicks that change nothing never close the task early");
  assert.equal(sim.locked, false);
});

/* ---------------------------------------------------------------- limits --- */

test("the first task closes as wrong on the ninth click, once", () => {
  const question = questionById("word-q1");
  const sim = new WindowSim(question);
  assert.equal(sim.limit, 9);

  for (let index = 0; index < 8; index += 1) sim.blank();
  assert.equal(sim.used, 8);
  assert.equal(sim.answers["word-q1"], undefined, "eight clicks is not the limit");
  assert.equal(sim.outcome, "ignored");

  sim.blank();
  assert.equal(sim.used, 9);
  assert.equal(sim.outcome, "exhausted");
  assert.equal(sim.answers["word-q1"].correct, false, "the task is recorded wrong");
  assert.equal(sim.locked, true, "the window locks as the task closes");

  const extra = sim.blank();
  assert.equal(extra, null, "clicks after the limit do nothing");
  assert.equal(sim.used, 9, "and are not counted");
  assert.equal(sim.outcomes.filter((outcome) => outcome === "exhausted").length, 1, "wrong is recorded once");
});

test("a correct command on the last allowed click wins", () => {
  const question = questionById("word-q1");
  const sim = new WindowSim(question);

  for (let index = 0; index < 6; index += 1) sim.blank();
  assert.equal(sim.remaining, 3);

  playPath(question, sim);

  assert.equal(sim.used, 9, "the solution lands on the final click");
  assert.equal(sim.outcome, "correct");
  assert.equal(sim.answers["word-q1"].correct, true, "the last click still scores");
  assert.equal(sim.outcomes.includes("exhausted"), false, "the limit never marks it wrong");
});

test("the budget is per task and the document carries forward", () => {
  const first = playPath(questionById("word-q1"), new WindowSim(questionById("word-q1")));
  assert.equal(first.used, 3);

  const second = new WindowSim(questionById("word-q2"), {
    answers: first.answers,
    states: first.states,
  });
  assert.equal(second.used, 0, "the counter resets for the next task");
  assert.equal(second.remaining, second.limit);
  assert.equal(second.states.word.orientation, "landscape", "the earlier change is still there");

  playPath(second.question, second);
  assert.equal(second.outcome, "correct");
  assert.equal(second.states.word.orientation, "landscape", "and survives the second task");
});

test("rapid clicks cannot resolve a task twice", () => {
  const question = questionById("teams-q4");
  const sim = new WindowSim(question);

  sim.select("teams-send");
  const after = sim.dispatch(bodyClick("teams-send", true));

  assert.equal(after.outcome, "ignored", "the window ignores a repeat press");
  assert.equal(Object.keys(sim.answers).length, 1, "one answer is recorded");
  assert.equal(sim.outcomes.filter((outcome) => outcome === "correct").length, 1);

  const again = applyTaskAction({
    question,
    answers: sim.answers,
    states: sim.states,
    action: bodyClick("teams-send", true),
  });
  assert.equal(again.outcome, "ignored");
  assert.equal(again.answers, sim.answers, "the recorded answer is untouched");
});

/* ------------------------------------------------------------ boundaries --- */

test("five application boundaries hand off and the last task goes to results", () => {
  const boundaries = [5, 11, 17, 23, 29].map((index) => afterTask(index));

  boundaries.forEach((step) => assert.equal(step.kind, "section"));
  assert.deepEqual(
    boundaries.map((step) => [step.from.name, step.to.name]),
    [
      ["Word", "Excel"],
      ["Excel", "SharePoint"],
      ["SharePoint", "Outlook"],
      ["Outlook", "Teams"],
      ["Teams", "Power BI"],
    ]
  );
  assert.deepEqual(boundaries.map((step) => step.index), [6, 12, 18, 24, 30]);

  assert.deepEqual(afterTask(35), { kind: "results", index: null }, "Power BI goes straight to the score");
  assert.deepEqual(afterTask(0), { kind: "task", index: 1 }, "inside an application the task advances by itself");
  assert.deepEqual(afterTask(4), { kind: "task", index: 5 });
});

test("a whole attempt answers 36 tasks through 5 hand-offs with no click carried over", () => {
  let answers = {};
  let states = initialAppState();
  const sections = [];
  let current = 0;

  while (current < TOTAL_QUESTIONS) {
    const question = M365_QUESTIONS[current];
    const sim = new WindowSim(question, { answers, states });
    assert.equal(sim.used, 0, `${question.id} opens with a full budget`);

    playPath(question, sim);
    assert.equal(sim.outcome, "correct", `${question.id} solved through real clicks`);

    answers = sim.answers;
    states = sim.states;

    const step = afterTask(current);
    if (step.kind === "results") break;
    if (step.kind === "section") {
      sections.push([step.from.name, step.to.name]);
      assert.equal(step.index, current + 1);
    }
    current = step.index;
  }

  assert.equal(sections.length, 5, "one hand-off between each pair of applications");
  assert.equal(Object.values(answers).filter((answer) => answer.correct).length, TOTAL_QUESTIONS);
  assert.equal(answers["powerbi-q6"].correct, true, "the last task is scored by the results step");
});