export const QUESTION_TYPE_LABEL = {
  mcq: "Multiple Choice",
  matching: "Matching",
  manual: "Written Answer",
};

export const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export function createQuestion(type) {
  const base = {
    key: uid(),
    question_type: type,
    title: "",
    description: "",
    points: 5,
  };

  if (type === "mcq") {
    return {
      ...base,
      options: [
        { id: uid(), text: "" },
        { id: uid(), text: "" },
      ],
      correct_option_id: "",
    };
  }

  return {
    ...base,
    matching_prompts: [
      { id: uid(), text: "" },
      { id: uid(), text: "" },
    ],
    matching_choices: [
      { id: uid(), text: "" },
      { id: uid(), text: "" },
    ],
    matching_answer: {},
  };
}

export function fromGeneratedQuestion(raw) {
  if (!raw || typeof raw !== "object") return null;
  const title = String(raw.prompt || "").trim();
  if (!title) return null;
  const points = Number(raw.points) > 0 ? Math.round(Number(raw.points)) : 5;

  if (raw.kind === "mcq") {
    const options = [];
    for (const choice of Array.isArray(raw.options) ? raw.options : []) {
      const text = String(choice || "").trim();
      if (!text) continue;
      if (options.some((o) => o.text.toLowerCase() === text.toLowerCase())) continue;
      options.push({ id: uid(), text });
    }
    if (options.length < 2) return null;
    const idx = Number(raw.correct_index);
    return {
      key: uid(),
      question_type: "mcq",
      title,
      description: "",
      points,
      options,
      correct_option_id: Number.isInteger(idx) && idx >= 0 && idx < options.length ? options[idx].id : "",
    };
  }

  if (raw.kind === "matching") {
    const pairs = (Array.isArray(raw.pairs) ? raw.pairs : [])
      .map((p) => ({ prompt: String(p?.prompt || "").trim(), answer: String(p?.answer || "").trim() }))
      .filter((p) => p.prompt && p.answer);
    if (!pairs.length) return null;

    const choices = [];
    const addChoice = (value) => {
      const text = String(value || "").trim();
      if (!text || choices.some((c) => c.text.toLowerCase() === text.toLowerCase())) return;
      choices.push({ id: uid(), text });
    };
    pairs.forEach((p) => addChoice(p.answer));
    (Array.isArray(raw.distractors) ? raw.distractors : []).forEach(addChoice);
    if (choices.length < 2) return null;

    const prompts = pairs.map((p) => ({ id: uid(), text: p.prompt }));
    const matching_answer = {};
    pairs.forEach((pair, i) => {
      const match = choices.find((c) => c.text.toLowerCase() === pair.answer.toLowerCase());
      if (match) matching_answer[prompts[i].id] = match.id;
    });

    return {
      key: uid(),
      question_type: "matching",
      title,
      description: "",
      points,
      matching_prompts: prompts,
      matching_choices: choices,
      matching_answer,
    };
  }

  return null;
}

export function fromGeneratedQuestions(list) {
  return (Array.isArray(list) ? list : []).map(fromGeneratedQuestion).filter(Boolean);
}

export function validateQuestion(question, index) {
  const label = `Question ${index + 1}`;
  if (!String(question.title || "").trim()) {
    return `${label}: enter the question text.`;
  }
  if (!(Number(question.points) > 0)) {
    return `${label}: points must be greater than zero.`;
  }

  if (question.question_type === "mcq") {
    const options = (question.options || []).filter((o) => String(o.text || "").trim());
    if (options.length < 2) return `${label}: add at least two answer choices.`;
    if (!question.correct_option_id) return `${label}: mark the correct answer.`;
    if (!options.some((o) => o.id === question.correct_option_id)) {
      return `${label}: the correct answer must be one of the choices.`;
    }
    return null;
  }

  if (question.question_type === "matching") {
    const prompts = (question.matching_prompts || []).filter((p) => String(p.text || "").trim());
    const choices = (question.matching_choices || []).filter((c) => String(c.text || "").trim());
    if (!prompts.length) return `${label}: add at least one item to match.`;
    if (choices.length < 2) return `${label}: add at least two match options.`;
    const answers = question.matching_answer || {};
    const missing = prompts.some((p) => {
      const target = answers[p.id];
      return !target || !choices.some((c) => c.id === target);
    });
    if (missing) return `${label}: set the correct match for every item.`;
    return null;
  }

  return null;
}

export function toTaskPayload(question, index) {
  const payload = {
    order: index + 1,
    title: String(question.title || "").trim(),
    description: String(question.description || "").trim(),
    question_type: question.question_type,
    task_type: "Knowledge Check",
    points: Number(question.points) || 5,
    options: [],
    matching_prompts: [],
    matching_choices: [],
    matching_answer: {},
    correct_option_id: "",
  };

  if (question.question_type === "mcq") {
    payload.options = (question.options || [])
      .filter((o) => String(o.text || "").trim())
      .map((o) => ({ id: o.id, text: o.text.trim() }));
    payload.correct_option_id = question.correct_option_id || "";
  }

  if (question.question_type === "matching") {
    payload.matching_prompts = (question.matching_prompts || [])
      .filter((p) => String(p.text || "").trim())
      .map((p) => ({ id: p.id, text: p.text.trim() }));
    payload.matching_choices = (question.matching_choices || [])
      .filter((c) => String(c.text || "").trim())
      .map((c) => ({ id: c.id, text: c.text.trim() }));
    payload.matching_answer = question.matching_answer || {};
  }

  return payload;
}

export function totalPoints(questions) {
  return (questions || []).reduce((sum, q) => sum + (Number(q.points) || 0), 0);
}