export const TASK_TYPES = ["hands_on", "mcq", "matching", "hotspot"];

export const TASK_TYPE_LABEL = {
  hands_on: "Hands-on",
  mcq: "Multiple choice",
  matching: "Matching",
  hotspot: "Point and click",
};

// Exercises created before interactive tasks existed only carry hands-on tasks.
export const taskType = (task) => (TASK_TYPES.includes(task?.type) ? task.type : "hands_on");

const same = (a, b) => String(a ?? "") === String(b ?? "");

export function isAnswered(task, answer) {
  const type = taskType(task);
  if (type === "hands_on") return answer === true;
  if (type === "mcq" || type === "hotspot") return Boolean(answer);
  if (type === "matching") {
    const prompts = task.matching_prompts || [];
    const given = answer || {};
    return prompts.length > 0 && prompts.every((prompt) => given[prompt.id]);
  }
  return false;
}

export function scoreTask(task, answer) {
  if (!isAnswered(task, answer)) return false;
  const type = taskType(task);
  if (type === "hands_on") return true;
  if (type === "mcq") return same(answer, task.correct_option_id);
  if (type === "hotspot") return same(answer, task.correct_region_id);
  const key = task.matching_answer || {};
  const given = answer || {};
  return (task.matching_prompts || []).every((prompt) => same(given[prompt.id], key[prompt.id]));
}

export function answerKey(task) {
  const type = taskType(task);
  if (type === "mcq") {
    const option = (task.options || []).find((item) => item.id === task.correct_option_id);
    return option?.text || "No answer key";
  }
  if (type === "hotspot") {
    const region = (task.hotspot_regions || []).find((item) => item.id === task.correct_region_id);
    return region?.label || "No answer key";
  }
  if (type === "matching") {
    const key = task.matching_answer || {};
    const choices = task.matching_choices || [];
    return (task.matching_prompts || [])
      .map((prompt) => {
        const choice = choices.find((item) => item.id === key[prompt.id]);
        return `${prompt.text} → ${choice?.text || "—"}`;
      })
      .join("; ");
  }
  return task.success_criteria || "Completed";
}

export function evaluateExercise(tasks = [], answers = {}) {
  const rows = tasks.map((task) => ({
    id: task.id,
    title: task.title,
    type: taskType(task),
    answer: answers[task.id],
    key: answerKey(task),
    correct: scoreTask(task, answers[task.id]),
  }));
  const correct = rows.filter((row) => row.correct).length;
  return {
    rows,
    correct,
    total: rows.length,
    score: rows.length ? Math.round((correct / rows.length) * 100) : 0,
    completed: rows.filter((row) => row.correct).map((row) => row.id),
  };
}