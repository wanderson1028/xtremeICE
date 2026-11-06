export const QUESTION_TYPE_LABEL = {
  mcq: "Multiple Choice",
  matching: "Matching",
  hotspot: "Hotspot",
  manual: "Written Answer",
};

export const EDITABLE_TYPES = ["mcq", "matching", "hotspot"];

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
    theme: "",
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
      option_credits: {},
    };
  }

  if (type === "hotspot") {
    return {
      ...base,
      hotspot_image_url: "",
      hotspot_regions: [],
      correct_region_id: "",
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
      theme: String(raw.theme || "").trim(),
      points,
      options,
      correct_option_id: Number.isInteger(idx) && idx >= 0 && idx < options.length ? options[idx].id : "",
      option_credits: {},
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
      theme: String(raw.theme || "").trim(),
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

/**
 * Convert an authored question to another format, keeping its wording, theme,
 * points and stored record identity so saving updates the same question.
 */
export function convertQuestionType(question, type) {
  if (question.question_type === type) return question;
  const fresh = createQuestion(type);
  return {
    ...fresh,
    key: question.key,
    ...(question.id ? { id: question.id } : {}),
    title: question.title || "",
    description: question.description || "",
    theme: question.theme || "",
    points: Number(question.points) || 5,
  };
}

/**
 * A saved task → the editable question shape used by the builder.
 */
export function questionFromTask(task) {
  const type = EDITABLE_TYPES.includes(task?.question_type) ? task.question_type : "manual";
  const base = {
    key: task?.id || uid(),
    id: task?.id,
    question_type: type,
    title: task?.title || "",
    description: task?.description || "",
    theme: task?.theme || "",
    points: Number(task?.points) || 5,
  };

  if (type === "mcq") {
    return {
      ...base,
      options: (task.options || []).map((o) => ({ id: o.id, text: o.text || "" })),
      correct_option_id: task.correct_option_id || "",
      option_credits: task.option_credits || {},
    };
  }

  if (type === "matching") {
    return {
      ...base,
      matching_prompts: (task.matching_prompts || []).map((p) => ({ id: p.id, text: p.text || "" })),
      matching_choices: (task.matching_choices || []).map((c) => ({ id: c.id, text: c.text || "" })),
      matching_answer: task.matching_answer || {},
    };
  }

  if (type === "hotspot") {
    return {
      ...base,
      hotspot_image_url: task.hotspot_image_url || "",
      hotspot_regions: (task.hotspot_regions || []).map((r) => ({
        id: r.id,
        label: r.label || "",
        x: Number(r.x) || 0,
        y: Number(r.y) || 0,
        w: Number(r.w) || 0,
        h: Number(r.h) || 0,
      })),
      correct_region_id: task.correct_region_id || "",
    };
  }

  return base;
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
    const credits = question.option_credits || {};
    const invalidCredit = options.some((option) => {
      if (option.id === question.correct_option_id) return false;
      const value = Number(credits[option.id]);
      return Number.isFinite(value) && value >= 1;
    });
    if (invalidCredit) return `${label}: partial credit must be below 100%.`;
    return null;
  }

  if (question.question_type === "hotspot") {
    if (!String(question.hotspot_image_url || "").trim()) {
      return `${label}: add the image candidates should click on.`;
    }
    const regions = (question.hotspot_regions || []).filter((r) => r && r.id);
    if (regions.length < 2) return `${label}: draw at least two hotspot areas.`;
    if (!regions.some((r) => r.id === question.correct_region_id)) {
      return `${label}: mark the correct hotspot area.`;
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
    theme: String(question.theme || "").trim(),
    points: Number(question.points) || 5,
    options: [],
    matching_prompts: [],
    matching_choices: [],
    matching_answer: {},
    correct_option_id: "",
    hotspot_image_url: "",
    hotspot_regions: [],
    correct_region_id: "",
  };

  if (question.id) payload.id = question.id;

  if (question.question_type === "mcq") {
    payload.options = (question.options || [])
      .filter((o) => String(o.text || "").trim())
      .map((o) => ({ id: o.id, text: o.text.trim() }));
    payload.correct_option_id = question.correct_option_id || "";
    const credits = question.option_credits || {};
    payload.option_credits = {};
    for (const option of payload.options) {
      if (option.id === payload.correct_option_id) continue;
      const value = Number(credits[option.id]);
      if (Number.isFinite(value) && value > 0) payload.option_credits[option.id] = Math.min(0.99, value);
    }
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

  if (question.question_type === "hotspot") {
    payload.hotspot_image_url = String(question.hotspot_image_url || "").trim();
    payload.hotspot_regions = (question.hotspot_regions || [])
      .filter((r) => r && r.id)
      .map((r) => ({
        id: r.id,
        label: String(r.label || "").trim(),
        x: Number(r.x) || 0,
        y: Number(r.y) || 0,
        w: Number(r.w) || 0,
        h: Number(r.h) || 0,
      }));
    payload.correct_region_id = question.correct_region_id || "";
  }

  return payload;
}

export function uniqueThemes(questions) {
  const seen = new Map();
  for (const question of questions || []) {
    const theme = String(question.theme || "").trim();
    if (!theme) continue;
    const key = theme.toLowerCase();
    if (!seen.has(key)) seen.set(key, theme);
  }
  return [...seen.values()];
}

export function totalPoints(questions) {
  return (questions || []).reduce((sum, q) => sum + (Number(q.points) || 0), 0);
}