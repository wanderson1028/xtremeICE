/**
 * Regression suite for the Microsoft 365 outcome feedback and scoring.
 *
 * The reported defect: two blank-clicked tasks were exhausted, the rail showed
 * "2/6" as though both were answered successfully, and nothing said either was
 * wrong. These tests pin the true outcome — answered is not correct, a section
 * that finished with failures is not passed, and an exhausted task scores zero —
 * and pin the copy the candidate is shown.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { M365_APPS, M365_QUESTIONS, correctCount, initialAppState } from "../src/lib/m365/index.js";
import { expireTask } from "../src/lib/m365/session.js";
import {
  QUESTION_CORRECT, QUESTION_UNANSWERED, QUESTION_WRONG, questionStatus, sectionResult, tally,
} from "../src/lib/m365/outcome.js";

const word = M365_APPS[0];
const wordQuestions = M365_QUESTIONS.filter((q) => q.appId === word.id);

/** Exhaust the given tasks exactly the way the window does: the budget runs out. */
function exhaust(questions) {
  let answers = {};
  const states = initialAppState();
  questions.forEach((question) => {
    const result = expireTask({ question, answers, states });
    answers = result.answers;
  });
  return answers;
}

const answersFor = (questions, correct) =>
  Object.fromEntries(questions.map((q) => [q.id, { correct }]));

test("exhausting the first two tasks reports answered 2, correct 0, wrong 2", () => {
  const answers = exhaust(wordQuestions.slice(0, 2));
  const result = sectionResult(word, answers);

  assert.equal(result.answered, 2);
  assert.equal(result.correct, 0);
  assert.equal(result.wrong, 2);
  assert.equal(result.total, wordQuestions.length);
  assert.deepEqual(result.statuses.slice(0, 2), [QUESTION_WRONG, QUESTION_WRONG]);
  assert.deepEqual(
    result.statuses.slice(2),
    wordQuestions.slice(2).map(() => QUESTION_UNANSWERED),
  );
});

test("a wrong marker is never green and a green marker is only verified success", () => {
  assert.equal(questionStatus(undefined), QUESTION_UNANSWERED);
  assert.equal(questionStatus({ correct: false }), QUESTION_WRONG);
  assert.equal(questionStatus({ correct: true }), QUESTION_CORRECT);
});

test("an exhausted task scores zero, so answered length can never be the score", () => {
  const exhausted = exhaust(wordQuestions.slice(0, 2));
  const solved = answersFor(wordQuestions.slice(0, 2), true);

  assert.equal(correctCount(exhausted), 0);
  assert.equal(correctCount(solved), 2);
  // Same answered length, different outcome — the counts must diverge.
  assert.equal(tally(wordQuestions, exhausted).answered, tally(wordQuestions, solved).answered);
  assert.notEqual(tally(wordQuestions, exhausted).correct, tally(wordQuestions, solved).correct);
});

test("a section that finished with a failure is finished but not passed", () => {
  const answers = answersFor(wordQuestions, true);
  assert.deepEqual(
    (({ finished, passed, wrong }) => ({ finished, passed, wrong }))(sectionResult(word, answers)),
    { finished: true, passed: true, wrong: 0 },
  );

  const withFailure = { ...answers, [wordQuestions[0].id]: { correct: false } };
  const result = sectionResult(word, withFailure);
  assert.equal(result.finished, true);
  assert.equal(result.passed, false);
  assert.equal(result.wrong, 1);
  assert.equal(result.correct, wordQuestions.length - 1);
});

test("a partially answered section is neither finished nor passed", () => {
  const result = sectionResult(word, answersFor(wordQuestions.slice(0, 2), true));
  assert.equal(result.finished, false);
  assert.equal(result.passed, false);
});

test("expiry is idempotent: one wrong record per task, no duplicates", () => {
  const answers = exhaust(wordQuestions.slice(0, 2));
  const again = expireTask({ question: wordQuestions[0], answers, states: initialAppState() });

  assert.equal(again.outcome, "ignored");
  assert.equal(again.answers, answers, "a second expiry must not rewrite the record");
  assert.equal(Object.keys(again.answers).length, 2);
});

test("retaking clears every marker back to unanswered", () => {
  exhaust(wordQuestions.slice(0, 2));
  const fresh = tally(M365_QUESTIONS, {});
  assert.equal(fresh.answered, 0);
  assert.equal(fresh.correct, 0);
  assert.equal(fresh.wrong, 0);
  assert.ok(fresh.statuses.every((status) => status === QUESTION_UNANSWERED));
});

test("the rail and task card label failures as Wrong, not as progress", () => {
  const read = (file) => fs.readFileSync(path.join(process.cwd(), "src/components/m365", file), "utf8");
  const rail = read("M365Rail.jsx");
  const card = read("M365QuestionCard.jsx");
  const transition = read("M365SectionTransition.jsx");

  assert.match(rail, /Answered: \{result\.answered\}\/\{result\.total\}/);
  assert.match(rail, /Correct: \{result\.correct\}/);
  assert.match(rail, /Wrong: \{result\.wrong\}/);
  assert.match(rail, /label: "Wrong"/);
  assert.match(rail, /label: "Correct"/);

  assert.match(card, /Wrong — click limit reached\./);
  assert.match(card, /text-red-400/);

  assert.match(transition, /Passed" : "Not passed"/);
  assert.match(transition, /Wrong/);
});