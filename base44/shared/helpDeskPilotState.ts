import { actions, rubric, scenario, scenarioVersion, type ActionKey } from "./helpDeskPilot.ts";

export const resumeTopics = [
  { id: "active-directory", title: "Active Directory and access", matches: ["active directory", "aduc", "entra id", "group membership", "domain accounts"], statementIds: ["S0844", "S0661"], prompt: "Walk me through an access ticket you handled. How did you verify identity and current access, identify the approved group or route, and document the outcome?" },
  { id: "networking", title: "TCP/IP and DNS troubleshooting", matches: ["tcp/ip", "tcp ip", "dns", "dhcp", "network troubleshooting", "networking", "ip addressing"], statementIds: ["T0237", "S0661"], prompt: "Give an example of a connectivity issue you worked. What evidence helped you distinguish name resolution from basic connectivity, and what did you verify or hand off?" },
  { id: "service-desk", title: "Help desk and ticketing", matches: ["help desk", "helpdesk", "service desk", "desktop support", "servicenow", "jira service", "ticketing"], statementIds: ["T1427", "K0903", "S0478"], prompt: "Describe a ticket involving a frustrated employee. What did you communicate while troubleshooting, and what did you record so another technician could continue?" },
  { id: "workstations", title: "Windows and workstation support", matches: ["windows 10", "windows 11", "windows desktop", "workstation", "endpoint support", "software deployment", "intune"], statementIds: ["T0237", "S0661"], prompt: "Describe a desktop issue after a software change. Which checks narrowed the cause, and what authorized workaround or escalation did you use?" },
] as const;

const slots = ["A", "B", "practice"];
const verbs = ["load", "start", "observe", "save", "submit", "finalize"];
const textLimit = 4000;

type Event = { action: ActionKey; at: string };
type Attempt = {
  status: "in_progress" | "submitted" | "finalized";
  started_at: string;
  submitted_at?: string;
  finalized_at?: string;
  events: Event[];
  employee_reply: string;
  ticket_note: string;
  resume_focus_ids?: string[];
  review?: { scores: Record<string, number>; total: number; evidence: string };
};

type Change =
  | { error: string; status: number }
  | { attempt: Attempt | null; changes?: Partial<Attempt> };

export function validPilotRequest(body: any) {
  return body && slots.includes(body.slot) && verbs.includes(body.action);
}

function fail(error: string, status: number): Change {
  return { error, status };
}

export function applyPilotAction(current: Attempt | null, body: any, now = Date.now()): Change {
  if (!validPilotRequest(body)) return fail("Select a pilot slot and a supported action.", 400);
  const timestamp = new Date(now).toISOString();
  let expiration: Partial<Attempt> | undefined;
  if (current?.status === "in_progress") {
    const deadline = Date.parse(current.started_at) + scenario.durationMinutes * 60_000;
    if (now >= deadline) {
      expiration = { status: "submitted", submitted_at: new Date(deadline).toISOString() };
      current = { ...current, ...expiration };
    }
  }

  if (body.action === "load") return { attempt: current, changes: expiration };
  if (body.action === "start") {
    if (current) return { attempt: current, changes: expiration };
    const focus = body.focusIds ?? [];
    if (!Array.isArray(focus) || focus.length > 2 || new Set(focus).size !== focus.length ||
        focus.some(id => !resumeTopics.some(topic => topic.id === id))) {
      return fail("Choose up to two résumé follow-up topics.", 400);
    }
    const attempt: Attempt = {
      status: "in_progress", started_at: timestamp, events: [],
      employee_reply: "", ticket_note: "", resume_focus_ids: focus,
    };
    return { attempt, changes: attempt };
  }
  if (!current) return fail("Start this attempt first.", 409);

  if (body.action === "finalize") {
    if (current.status === "finalized") return { attempt: current };
    if (current.status !== "submitted") return fail("Submit the work sample before scoring.", 409);
    const scores = rubric.map(({ id }) => body.scores?.[id]);
    if (scores.some(score => ![0, 1, 2].includes(score))) return fail("Rate every criterion on the 0–2 scale.", 400);
    if (typeof body.evidence !== "string" || !body.evidence.trim() || body.evidence.length > textLimit) {
      return fail("Record a specific evidence note before finalizing.", 400);
    }
    const finalize: Partial<Attempt> = {
      status: "finalized", finalized_at: timestamp,
      review: {
        scores: Object.fromEntries(rubric.map(({ id }, index) => [id, scores[index]])),
        total: scores.reduce((sum, score) => sum + score, 0),
        evidence: body.evidence.trim(),
      },
    };
    return { attempt: { ...current, ...finalize }, changes: { ...expiration, ...finalize } };
  }

  if (current.status !== "in_progress") {
    return { attempt: current, changes: expiration };
  }
  if (body.action === "observe") {
    if (typeof body.id !== "string" || !Object.hasOwn(actions, body.id)) return fail("Unknown simulated action.", 400);
    const key = body.id as ActionKey;
    if (current.events.some(event => event.action === key)) return { attempt: current };
    if (key === "web_save" && !current.events.some(event => event.action === "web_open")) {
      return fail("Open the web app before testing a save.", 409);
    }
    const events = [...current.events, { action: key, at: timestamp }];
    return { attempt: { ...current, events }, changes: { events } };
  }

  const reply = body.employeeReply;
  const note = body.ticketNote;
  if (typeof reply !== "string" || typeof note !== "string" || reply.length > textLimit || note.length > textLimit) {
    return fail("Each work product must be text of 4,000 characters or fewer.", 400);
  }
  const draft: Partial<Attempt> = { employee_reply: reply, ticket_note: note };
  if (body.action === "submit") {
    draft.status = "submitted";
    draft.submitted_at = timestamp;
  }
  return { attempt: { ...current, ...draft }, changes: draft };
}

export function pilotView(attempt: Attempt | null, storage: "server" | "browser") {
  const events = (attempt?.events || []).map(event => ({
    id: event.action, label: actions[event.action].label, result: actions[event.action].result, at: event.at,
  }));
  const observed = new Set(events.map(event => event.id));
  const toolActions = Object.entries(actions).map(([id, action]) => ({
    id, label: action.label, tool: action.tool, available: id !== "web_save" || observed.has("web_open"),
  }));

  return {
    storage, scenario, toolActions, resumeTopics,
    rubric: attempt && attempt.status !== "in_progress" ? rubric : null,
    state: attempt ? {
      status: attempt.status,
      startedAt: attempt.started_at,
      deadlineAt: new Date(Date.parse(attempt.started_at) + scenario.durationMinutes * 60_000).toISOString(),
      employeeReply: attempt.employee_reply,
      ticketNote: attempt.ticket_note,
      events,
      focusIds: attempt.resume_focus_ids || [],
      observed: {
        deviceChecked: observed.has("device") || observed.has("reproduce"),
        serviceChecked: observed.has("status"),
        relevantArticleRead: observed.has("kb_launch"),
        saveVerified: observed.has("web_save"),
      },
      review: attempt.review || null,
    } : null,
  };
}

export { scenarioVersion };
