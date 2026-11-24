import { assessKasmBinding } from "./shared/providers/kasmBinding.js";
import { buildTemplateSnapshot, applyCriterionValidationOutcome, buildUpdatedTaskResult, getTaskResult, revealNextHint, upsertTaskResult } from "./shared/runtime/instanceModel.js";
import { calculateInstanceScore } from "./shared/runtime/instanceScoring.js";
import { resolveUnlockedTasks } from "./shared/runtime/branchingResolver.js";
import { isMissingWorkspace, kasmRequest, workspaceUrl } from "./api.ts";

export class RequestError extends Error {
  constructor(readonly status: number, message: string) { super(message); }
}

const LIVE = new Set(["provisioning", "running"]);
const TASK_FINAL = new Set(["passed", "failed", "skipped"]);
type RecordData = Record<string, any>;

const first = async (table: any, fields: RecordData) => (await table.filter(fields, "-created_date", 1))?.[0];
const handles = (row: RecordData) => ({
  kasm_id: row.provider_session_id || row.kasm_session_id,
  user_id: row.provider_user_ref || row.kasm_user_id,
});
const admin = (user: RecordData) => user.role === "admin";
const expired = (row: RecordData) => Boolean(row.expires_at) && Date.parse(row.expires_at) <= Date.now();

async function update(table: any, row: RecordData, patch: RecordData) {
  await table.update(row.id, patch);
  return { ...row, ...patch };
}

export async function ownedInstance(db: any, user: RecordData, id: unknown, provider = "kasm", allowLegacy = false) {
  if (typeof id !== "string" || !id) throw new RequestError(400, "An instance ID is required.");
  const row = await first(db.KasmLearnerRun, { id });
  if (!row || row.provider !== provider || (!admin(user) && row.user_email !== user.email)) {
    throw new RequestError(404, "Lab instance not found.");
  }
  if (provider === "kasm" && !allowLegacy && row.runtime_authority !== "server_kasm_v1") {
    throw new RequestError(409, "This earlier Kasm session requires operator reconciliation.");
  }
  return row;
}

async function templateFor(db: any, user: RecordData, id: unknown, live: boolean) {
  if (typeof id !== "string" || !id) throw new RequestError(400, "A lab template is required.");
  const template = await first(db.LabTemplate, { id });
  if (!template) throw new RequestError(404, "Lab template not found.");
  if (!live) {
    if (!admin(user) && template.created_by !== user.email && template.created_by_id !== user.id) {
      throw new RequestError(404, "Lab template not found.");
    }
    return template;
  }
  if (template.status !== "published") throw new RequestError(409, "Publish the lab revision before launching an assigned session.");
  if (!admin(user)) {
    const assigned = await first(db.UserLabAssignment, {
      user_email: user.email,
      lab_id: id,
      lab_type: "kasm_template",
      service_key: "lab_scenarios",
    });
    if (!assigned) throw new RequestError(404, "Lab assignment not found.");
  }
  return template;
}

function instanceFields(template: RecordData, user: RecordData, provider: string) {
  return {
    template_id: template.id,
    template_snapshot: buildTemplateSnapshot(template),
    template_version: template.version || "1.0",
    user_email: user.email,
    provider,
    environment_profile_id: template.environment_profile_id || "",
    started_at: new Date().toISOString(),
    task_results: [],
    progress: 0,
    score: 0,
  };
}

export async function launch(db: any, user: RecordData, templateId: unknown, request = kasmRequest) {
  const template = await templateFor(db, user, templateId, true);
  const active = await first(db.KasmLearnerRun, { user_email: user.email, provider: "kasm",
    $or: [{ status: { $in: ["provisioning", "running"] } }, { cleanup_state: { $in: ["pending", "unconfirmed"] } }],
  });
  if (active) {
    if (active.runtime_authority === "server_kasm_v1" && active.template_id === template.id &&
      !expired(active) && !active.cleanup_state) return active;
    throw new RequestError(409, "Finish your earlier Kasm session or wait for its cleanup.");
  }

  const profile = await first(db.EnvironmentProfile, { id: template.environment_profile_id });
  const binding = assessKasmBinding(template.environment_definition, profile);
  if (!binding.launch_ready || !binding.binding || binding.warnings.length) {
    throw new RequestError(409, [...binding.errors, ...binding.warnings].join(" ") || "This lab has no compatible Kasm image.");
  }
  const accountResponse = await request("get_users");
  const accounts = Array.isArray(accountResponse.users) ? accountResponse.users : [];
  const matches = accounts.filter((account: RecordData) =>
    !account.disabled && [account.username, account.email].some((address) =>
      typeof address === "string" && address.toLowerCase() === user.email.toLowerCase()));
  if (matches.length !== 1 || !matches[0]?.user_id) {
    throw new RequestError(409, "This learner needs a uniquely matching active Kasm account.");
  }
  const userRef = matches[0].user_id;
  const imageId = binding.binding.resolved.kasm_image_id;
  const ttl = Math.min(120, Math.max(5, Number(template.estimated_duration_minutes) || 30));
  const row = await db.KasmLearnerRun.create({
    ...instanceFields(template, user, "kasm"),
    status: "provisioning",
    runtime_authority: "server_kasm_v1",
    expires_at: new Date(Date.now() + ttl * 60000).toISOString(),
    provider_user_ref: userRef,
    provider_status_message: "Requesting Kasm workspace",
  });

  let sessionId = "";
  try {
    const workspace = await request("request_kasm", {
      image_id: imageId, user_id: userRef, enable_sharing: false,
    });
    sessionId = workspace.kasm_id || workspace.kasm?.kasm_id;
    if (typeof sessionId !== "string" || !sessionId) throw new Error("Missing Kasm session reference.");
    return await update(db.KasmLearnerRun, row, { provider_session_id: sessionId });
  } catch {
    await update(db.KasmLearnerRun, row, {
      status: "failed",
      provider_session_id: sessionId || "",
      cleanup_state: sessionId ? "pending" : "unconfirmed",
      cleanup_reason: "launch_error",
      provider_status_message: "Kasm launch requires reconciliation.",
    });
    throw new RequestError(502, "Kasm launch could not be confirmed.");
  }
}

export async function cleanup(db: any, row: RecordData, request = kasmRequest) {
  if (row.cleanup_state === "verified") return row;
  const binding = handles(row);
  if (!binding.kasm_id || !binding.user_id) {
    return update(db.KasmLearnerRun, row, { cleanup_state: "unconfirmed", provider_status_message: "Workspace identity requires operator reconciliation." });
  }
  const gone = async () => {
    try {
      await request("get_kasm_status", binding);
      return false;
    } catch (error) {
      if (isMissingWorkspace(error)) return true;
      throw error;
    }
  };
  let absent = await gone();
  if (!absent) {
    try {
      await request("destroy_kasm", binding);
    } catch (error) {
      if (!isMissingWorkspace(error)) throw error;
    }
    absent = await gone();
  }
  if (!absent) return row;
  return update(db.KasmLearnerRun, row, {
    status: "terminated",
    cleanup_state: "verified",
    provider_session_url: "",
    kasm_session_url: "",
    learning_outcome: row.learning_outcome || (row.cleanup_reason === "expired" ? "expired" : "abandoned"),
    provider_status_message: "Kasm workspace removal verified",
  });
}

export async function requestCleanup(db: any, row: RecordData, reason: string, request = kasmRequest) {
  if (row.cleanup_state === "verified") return row;
  if (!row.cleanup_state) {
    row = await update(db.KasmLearnerRun, row, {
      cleanup_state: "pending",
      cleanup_reason: reason,
      provider_session_url: "",
      kasm_session_url: "",
      provider_status_message: "Waiting for Kasm workspace removal",
    });
  }
  return cleanup(db, row, request);
}

export async function status(db: any, row: RecordData, request = kasmRequest) {
  if (expired(row) || row.cleanup_state) return requestCleanup(db, row, "expired", request);
  const binding = handles(row);
  if (!LIVE.has(row.status) || !binding.kasm_id || !binding.user_id) return row;
  let live;
  try {
    live = await request("get_kasm_status", binding);
  } catch (error) {
    if (isMissingWorkspace(error)) return requestCleanup(db, row, "provider_absent", request);
    throw error;
  }
  const operational = String(live.kasm?.operational_status || live.operational_status || live.status || "");
  const latest = await first(db.KasmLearnerRun, { id: row.id });
  if (!latest || latest.cleanup_state || expired(latest) || !LIVE.has(latest.status)) return latest || row;
  return update(db.KasmLearnerRun, latest, {
    status: operational === "running" ? "running" : "provisioning",
    provider_status_message: operational === "running" ? "Workspace is ready" : "Waiting for Kasm readiness",
    provider_status_progress: Number(live.kasm?.operational_progress || live.operational_progress) || 0,
    provider_session_url: operational === "running" ? workspaceUrl(live.kasm_url || live.kasm?.kasm_url) : "",
  });
}

function availableTasks(row: RecordData) {
  return resolveUnlockedTasks(row.template_snapshot?.lab_content?.tasks || [], row.task_results || []);
}

export async function taskAction(db: any, row: RecordData, body: RecordData, action: string) {
  if (row.status !== "running" || row.cleanup_state || expired(row)) throw new RequestError(409, "The lab is unavailable.");
  const task = availableTasks(row).find((item: RecordData) => item.id === body.task_id && item.unlocked);
  if (!task) throw new RequestError(404, "Active task not found.");
  const prior = getTaskResult(row.task_results, task.id);
  let next;
  if (action === "applyValidation") {
    const attempt = await first(db.RuntimeValidationAttempt, { id: body.attempt_id, instance_id: row.id, task_id: task.id });
    const criterion = (task.validation_criteria || []).find((item: RecordData) => item.check === attempt?.check_id);
    if (!attempt || attempt.status !== "completed" || attempt.user_email !== row.user_email || !criterion?.runtime_validator) {
      throw new RequestError(409, "A completed owned runtime attempt is required.");
    }
    const credited = prior?.validation_results?.find((item: RecordData) => item.check === criterion.check);
    if (credited?.passed || (credited?.validated_at && Date.parse(credited.validated_at) >= Date.parse(attempt.updated_date))) return row;
    next = applyCriterionValidationOutcome(task, prior, criterion.check, {
      passed: attempt.passed === true,
      message: attempt.message,
      validator_type: attempt.validator_type,
      validated_at: attempt.updated_date,
      evidence: { attempt_id: attempt.id, observed: attempt.observed, callback_received: true },
    });
    if (TASK_FINAL.has(prior?.status)) next = buildUpdatedTaskResult(task, next, { finalize: true });
  } else if (action === "hint") {
    next = revealNextHint(task, prior);
  } else {
    const submission = typeof body.submission === "string" ? body.submission.slice(0, 12000) : "";
    next = buildUpdatedTaskResult(task, prior, { submission, finalize: action === "submitTask" });
  }
  const task_results = upsertTaskResult(row.task_results, next);
  const { score, progress } = calculateInstanceScore(row.template_snapshot, task_results);
  const latest = await first(db.KasmLearnerRun, { id: row.id });
  if (!latest || latest.cleanup_state || latest.status !== "running" || expired(latest)) {
    throw new RequestError(409, "The lab is unavailable.");
  }
  if (row.updated_date && latest.updated_date && row.updated_date !== latest.updated_date) {
    throw new RequestError(409, "Progress changed. Refresh the lab and retry.");
  }
  return update(db.KasmLearnerRun, latest, { task_results, score, progress });
}

export async function finish(db: any, row: RecordData, request = kasmRequest) {
  if (row.cleanup_state || expired(row)) return requestCleanup(db, row, "expired", request);
  if (row.status !== "running") throw new RequestError(409, "The lab is unavailable.");
  const required = availableTasks(row).filter((task: RecordData) => task.is_required !== false &&
    (task.unlocked || getTaskResult(row.task_results, task.id)));
  if (!required.length || !required.every((task: RecordData) => TASK_FINAL.has(getTaskResult(row.task_results, task.id)?.status))) {
    throw new RequestError(409, "Submit all required tasks before finishing.");
  }
  const { score, progress, passed } = calculateInstanceScore(row.template_snapshot, row.task_results);
  const finalized = await update(db.KasmLearnerRun, row, {
    score, progress,
    learning_outcome: passed ? "passed" : "failed",
    completed_at: new Date().toISOString(),
    cleanup_state: "pending",
    cleanup_reason: "finished",
    provider_session_url: "",
    kasm_session_url: "",
    provider_status_message: "Waiting for Kasm workspace removal",
  });
  return cleanup(db, finalized, request);
}

export async function sweep(db: any, request = kasmRequest) {
  const rows = await db.KasmLearnerRun.filter({ provider: "kasm", runtime_authority: "server_kasm_v1", $or: [
    { cleanup_state: "pending" },
    { status: { $in: ["provisioning", "running"] }, expires_at: { $lte: new Date().toISOString() } },
  ] }, "expires_at", 10);
  const results = await Promise.allSettled((rows || []).map((row: RecordData) => requestCleanup(db, row, "expired", request)));
  return { scanned: results.length, verified: results.filter((r) => r.status === "fulfilled" && r.value.cleanup_state === "verified").length,
    failed: results.filter((r) => r.status === "rejected").length };
}

export async function preview(db: any, user: RecordData, action: string, body: RecordData) {
  if (action === "createPreview") {
    const template = await templateFor(db, user, body.template_id, false);
    return db.KasmLearnerRun.create({ ...instanceFields(template, user, "preview"), status: "running" });
  }
  const row = await ownedInstance(db, user, body.instance_id, "preview");
  if (row.status !== "running" && action !== "stopPreview") throw new RequestError(409, "The preview is closed.");
  if (action === "stopPreview") {
    return update(db.KasmLearnerRun, row, { status: "terminated", provider_status_message: "Preview instance terminated" });
  }
  const patch = body.patch || {};
  const allowed = Object.fromEntries(["task_results", "score", "progress", "status", "completed_at"]
    .filter((key) => Object.hasOwn(patch, key)).map((key) => [key, patch[key]]));
  if (allowed.status && !["completed", "failed"].includes(allowed.status)) {
    throw new RequestError(400, "Invalid preview status.");
  }
  return update(db.KasmLearnerRun, row, allowed);
}
