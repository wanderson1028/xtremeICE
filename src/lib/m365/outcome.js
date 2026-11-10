/**
 * True-outcome reporting for the Microsoft 365 assessment.
 *
 * An answered task is either correct or wrong — never merely "done". Everything
 * shown to the candidate (rail markers, section hand-off, progress header) and
 * everything scored reads the same `{ correct: boolean }` answer, so a task
 * closed by its click budget can never present as a success.
 */

export const QUESTION_CORRECT = "correct";
export const QUESTION_WRONG = "wrong";
export const QUESTION_UNANSWERED = "unanswered";

export const questionStatus = (answer) => {
  if (!answer) return QUESTION_UNANSWERED;
  return answer.correct ? QUESTION_CORRECT : QUESTION_WRONG;
};

/** Tally any set of questions — one application's, or all of them. */
export function tally(questions, answers) {
  const statuses = questions.map((question) => questionStatus(answers?.[question.id]));
  return {
    total: questions.length,
    statuses,
    answered: statuses.filter((status) => status !== QUESTION_UNANSWERED).length,
    correct: statuses.filter((status) => status === QUESTION_CORRECT).length,
    wrong: statuses.filter((status) => status === QUESTION_WRONG).length,
  };
}

/**
 * A section is `finished` once every task in it is answered, but it is only
 * `passed` when every one of those answers was verified correct: finishing a
 * section that contains failures is not a pass.
 */
export function sectionResult(app, answers) {
  const counts = tally(app.questions, answers);
  return {
    ...counts,
    finished: counts.answered === counts.total,
    passed: counts.answered === counts.total && counts.wrong === 0,
  };
}