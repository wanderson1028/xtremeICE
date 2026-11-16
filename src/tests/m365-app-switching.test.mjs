/**
 * Switching applications mid-attempt: any application can be opened at any time,
 * every task already answered is kept, and the score only appears once nothing
 * is left open.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { M365_APPS, M365_QUESTIONS } from "../src/lib/m365/index.js";
import { afterTask, firstIndexOfApp, nextOpenTask } from "../src/lib/m365/progress.js";

const answersFor = (ids) => Object.fromEntries(ids.map((id) => [id, { correct: true }]));

test("a task opens at the start of its own application", () => {
  for (const app of M365_APPS) {
    const index = firstIndexOfApp(app.id);
    assert.equal(M365_QUESTIONS[index].appId, app.id, `${app.name} opens on its first task`);
    for (const question of app.questions) {
      assert.ok(M365_QUESTIONS.some((entry) => entry.id === question.id));
    }
  }
});

test("the next open task skips what is already answered", () => {
  const first = M365_QUESTIONS[0];
  const second = M365_QUESTIONS[1];
  const answers = answersFor([first.id]);
  assert.equal(nextOpenTask(answers, 0), 1, "the task after the answered one is next");
  assert.equal(nextOpenTask({}, -1), 0, "nothing answered starts at the first task");
  assert.equal(nextOpenTask(answersFor([second.id]), -1), 0);
});

test("open work in another application is found by wrapping around", () => {
  const last = M365_QUESTIONS[M365_QUESTIONS.length - 1];
  const answers = answersFor(M365_QUESTIONS.filter((q) => q.id !== last.id).map((q) => q.id));
  assert.equal(nextOpenTask(answers, M365_QUESTIONS.length - 1), M365_QUESTIONS.length - 1);
  assert.equal(
    nextOpenTask(answers, 0),
    M365_QUESTIONS.length - 1,
    "the last unanswered task is reached from the start"
  );
});

test("with every task answered there is nothing left to open", () => {
  const all = answersFor(M365_QUESTIONS.map((q) => q.id));
  assert.equal(nextOpenTask(all, -1), null);
  assert.equal(nextOpenTask(all, M365_QUESTIONS.length - 1), null);
});

test("a wrong task counts as answered, so it never reopens", () => {
  const first = M365_QUESTIONS[0];
  const answers = { [first.id]: { correct: false } };
  assert.equal(nextOpenTask(answers, -1), 1);
});

test("the hand-off step still names the next application in sequence", () => {
  const endOfFirst = M365_APPS[0].questions.length - 1;
  const step = afterTask(endOfFirst);
  assert.equal(step.kind, "section");
  assert.equal(step.to.id, M365_APPS[1].id);
});