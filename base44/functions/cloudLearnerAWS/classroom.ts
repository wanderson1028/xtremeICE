export const PILOT_STACK_NAME = "ExtremeICE-DesignStudio-Learner-Pilot";
export const CLASSROOM_LIMIT = 20;
export const CLASSROOM_SETTING = "AWS_LEARNER_CLASSROOM";
export const ACTIVE_RUN_STATUSES = ["preparing", "provisioning", "ready", "cleanup_pending", "failed"];
export const ACTIVE_PROOF_STATUSES = ["preparing", "provisioning", "running", "cleanup_pending"];

type Member = { user_id: string; assignment_id: string };
type Classroom = {
  id: string;
  opens_at: string;
  expires_at: string;
  template_id: string;
  template_hash: string;
  seats: Member[];
};
export type ClassroomState = { mode: "pilot" | "invalid" } | { mode: "classroom"; config: Classroom };
export type ClassroomRun = { id: string; slot: number };

const idPattern = /^[a-f0-9]{16,32}$/i;
const classIdPattern = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,63}$/;
const utcTimestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function isUtc(value: unknown): value is string {
  if (typeof value !== "string" || !utcTimestamp.test(value)) return false;
  const time = Date.parse(value);
  const normalized = value.includes(".") ? value : value.slice(0, -1) + ".000Z";
  return Number.isFinite(time) && new Date(time).toISOString() === normalized;
}

export function readClassroom(): ClassroomState {
  const raw = Deno.env.get(CLASSROOM_SETTING);
  if (raw === undefined) return { mode: "pilot" };
  let config: Classroom;
  try {
    config = JSON.parse(raw);
  } catch {
    return { mode: "invalid" };
  }
  if (!config || typeof config.id !== "string" || !classIdPattern.test(config.id) ||
      !isUtc(config.opens_at) || !isUtc(config.expires_at) ||
      Date.parse(config.opens_at) >= Date.parse(config.expires_at) ||
      typeof config.template_id !== "string" || !idPattern.test(config.template_id) ||
      typeof config.template_hash !== "string" || !/^[a-f0-9]{64}$/.test(config.template_hash) ||
      !Array.isArray(config.seats) || config.seats.length < 1 || config.seats.length > CLASSROOM_LIMIT) {
    return { mode: "invalid" };
  }
  const keys = ["user_id", "assignment_id"] as const;
  for (const key of keys) {
    if (config.seats.some(member => !member || typeof member[key] !== "string" || !idPattern.test(member[key])) ||
        new Set(config.seats.map(member => member[key].toLowerCase())).size !== config.seats.length) {
      return { mode: "invalid" };
    }
  }
  return { mode: "classroom", config };
}

export function stackForSlot(slot: unknown) {
  if (typeof slot !== "number" || !Number.isInteger(slot) || slot < 1 || slot > CLASSROOM_LIMIT) return null;
  return "ExtremeICE-DSCap-" + String(slot).padStart(2, "0");
}

/** A saved run carries the immutable binding needed after the class configuration changes. */
export function classroomRun(contract: any): ClassroomRun | null {
  const group = contract?.classroom;
  if (!group || typeof group.id !== "string" || !classIdPattern.test(group.id) || !stackForSlot(group.slot)) return null;
  return { id: group.id, slot: group.slot };
}

export function classroomSeat(state: ClassroomState, user: any, assignment: any) {
  if (state.mode !== "classroom" || !assignment || user.role !== "user" ||
      assignment.lab_id !== state.config.template_id) return null;
  const index = state.config.seats.findIndex(member => member.user_id === user.id &&
    member.assignment_id === assignment.id);
  return index < 0 ? null : { id: state.config.id, slot: index + 1 };
}

export function classroomWindow(state: ClassroomState, now = Date.now()) {
  if (state.mode !== "classroom") return state.mode;
  if (now < Date.parse(state.config.opens_at)) return "scheduled";
  if (now >= Date.parse(state.config.expires_at)) return "ended";
  return "open";
}

export function launchScope(seat: ClassroomRun | null) {
  return seat ? stackForSlot(seat.slot)! : PILOT_STACK_NAME;
}

export function classroomTags(seat: ClassroomRun | null) {
  return seat ? [{ Key: "ClassroomId", Value: seat.id }] : [];
}

export function capacityConflict(active: any[], previousProofs: any[]) {
  const occupied = new Map<number, string>();
  let legacy = previousProofs.length;
  for (const run of active) {
    const seat = classroomRun(run.contract);
    if (!seat) {
      if (run.contract?.classroom) return true;
      legacy++;
      continue;
    }
    if (run.stack_name !== stackForSlot(seat.slot) || occupied.has(seat.slot)) return true;
    occupied.set(seat.slot, seat.id);
  }
  return legacy > 1 || (legacy > 0 && occupied.size > 0) || new Set(occupied.values()).size > 1;
}
