
/* global Deno */

const FLAG = "proxmox_learner_labs";
const TYPE = "proxmox_template";
const SERVICE = "lab_scenarios";
const VMIDS = new Set([9530, 9531]);
const END = new Set(["finished", "expired", "failed"]);
const COMMANDS = new Set(["identity", "stat", "chmod", "isolation"]);
const PATH = "/opt/design-studio-proof/permissions.txt";
const ID = /^[a-f0-9]{24}$/;
const UUID = /^[a-f0-9-]{36}$/;

function durationMs() {
  const value = Number(Deno.env.get("PROXMOX_LAB_SECONDS") || 900);
  return (Number.isInteger(value) && value >= 150 && value <= 3600 ? value : 900) * 1000;
}

function validRun(run) {
  return run && ID.test(run.id) && ID.test(run.assignment_id) && ID.test(run.owner_id);
}

function usableAssignment(row) {
  return row?.lab_type === TYPE && row.service_key === SERVICE &&
    ID.test(row.id) && ID.test(row.lab_id);
}

function publishedExercise(template) {
  if (template?.status !== "published" || !Array.isArray(template.tags) || !template.tags.includes("proxmox-pilot")) return null;
  const tasks = template.lab_content?.tasks;
  if (!Array.isArray(tasks) || tasks.length !== 1) return null;
  const task = tasks[0];
  const checks = task?.validation_criteria;
  if (!Array.isArray(checks) || checks.length !== 1) return null;
  const validator = checks[0]?.runtime_validator;
  if (validator?.type !== "command_result" || validator.command_key !== "file_mode" ||
      validator.path !== PATH || validator.expected_output !== "600") return null;
  return {
    template_id: template.id,
    template_version: String(template.version || "1.0").slice(0, 40),
    title: String(template.title || "Linux file permissions").slice(0, 150),
    task_title: String(task.title || "Protect the lab file").slice(0, 150),
    instructions: String(task.instructions || task.description ||
      "Give the owner read and write access to the lab file and remove access for everyone else.").slice(0, 3000),
  };
}

async function featureEnabled(entities) {
  const configured = /^[a-f0-9]{64}$/.test(Deno.env.get("PROXMOX_LEARNER_WORKER_SHA256") || "");
  if (!configured) return false;
  const flags = await entities.FeatureFlag.filter({ key: FLAG }, "-created_date", 2);
  return flags.length === 1 && flags[0].is_enabled === true;
}

async function actorAssignments(entities, email) {
  const rows = await entities.UserLabAssignment.filter({ user_email: email, lab_type: TYPE }, "-created_date", 50);
  return rows.filter(usableAssignment);
}

async function findRun(db, assignmentId) {
  const matches = await db.filter({ assignment_id: assignmentId }, "created_date", 2);
  if (matches.length > 1) throw new Error("Duplicate run records for assignment");
  return matches[0] || null;
}
function reply(data, status = 200) {
  return Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
}
function fail(status, error) {
  return reply({ ok: false, status, error }, status);
}
function view(r) {
  return {
    id: r.id, stage: r.stage,
    expires_at: r.expires_at ?? null, ready_at: r.ready_at ?? null,
    command_request: r.command_request || null, command_done: r.command_done || null,
    command_output: r.command_output || null,
    grade_request: r.grade_request || null, grade_done: r.grade_done || null,
    last_mode: r.last_mode ?? null, score: r.score ?? null,
    result_mode: r.result_mode ?? null, final_score: r.final_score ?? null, reason: r.reason ?? null,
    cleanup_at: r.cleanup_at ?? null,
    cleanup_verified: r.cleanup_vm_absent === true && r.cleanup_disk_absent === true && r.cleanup_network_absent === true,
  };
}
function modeScore(mode) {
  return /^[0-7]{3,4}$/.test(mode ?? "") ? (mode === "600" ? 100 : 0) : null;
}
function closed(reason) {
  return { stage: "cleanup_pending", reason, closed_at: Date.now() };
}
async function digest(value) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))), n => n.toString(16).padStart(2, "0")).join("");
}
async function workerAuthorized(req) {
  const key = req.headers.get("x-proxmox-learner-worker") || "";
  const expected = Deno.env.get("PROXMOX_LEARNER_WORKER_SHA256") || "";
  if (!/^[a-f0-9]{64}$/.test(key) || !/^[a-f0-9]{64}$/.test(expected)) return false;
  const actual = await digest(key);
  let diff = 0;
  for (let i = 0; i < 64; i++) diff |= actual.charCodeAt(i) ^ expected.charCodeAt(i);
  return diff === 0;
}
async function workerEvent(db, b) {
  if (!ID.test(b.run_id ?? "")) return fail(400, "Invalid run.");
  const r = await db.get(b.run_id).catch(() => null);
  if (!validRun(r) || !VMIDS.has(b.vmid) || (r.vmid != null && b.vmid !== r.vmid) ||
      (r.vmid == null && !["provisioning", "abort", "finalize", "cleaned"].includes(b.event))) {
    return fail(404, "Run unavailable.");
  }
  const now = Date.now();
  let patch;
  switch (b.event) {
    case "provisioning":
      if (r.stage === "provisioning") return reply({ ok: true, run: view(r) });
      if (r.stage !== "queued") return fail(409, "Run is not queued.");
      if ((await db.filter({ vmid: b.vmid }, "-created_date", 100)).some(run => run.id !== r.id && !END.has(run.stage))) {
        return fail(409, "VM slot is already bound to an active run.");
      }
      patch = { stage: "provisioning", vmid: b.vmid };
      break;
    case "ready":
      if (r.stage === "active") return reply({ ok: true, run: view(r) });
      if (r.stage !== "provisioning") return fail(409, "Run is not provisioning.");
      patch = { stage: "active", ready_at: now, expires_at: now + durationMs() };
      break;
    case "command":
      if (r.stage !== "active" || now >= r.expires_at || !UUID.test(b.request_id ?? "") || r.command_request !== b.request_id)
        return fail(409, "Terminal request is closed.");
      if (r.command_done === b.request_id) return reply({ ok: true, run: view(r) });
      if (typeof b.output !== "string" || b.output.length > 400 || Array.from(b.output).some(ch => ch.charCodeAt(0) < 32 && ch !== "\n" && ch !== "\t"))
        return fail(400, "Invalid terminal result.");
      patch = { command_done: b.request_id, command_output: b.output };
      break;
    case "grade":
      if (r.stage !== "active" || now >= r.expires_at || !UUID.test(b.request_id ?? "") || r.grade_request !== b.request_id)
        return fail(409, "Grade request is closed.");
      if (r.grade_done === b.request_id) return reply({ ok: true, run: view(r) });
      if (modeScore(b.mode) === null) return fail(400, "Invalid grade evidence.");
      patch = { grade_done: b.request_id, last_mode: b.mode, score: modeScore(b.mode) };
      break;
    case "expire":
      if (r.stage === "cleanup_pending" || END.has(r.stage)) return reply({ ok: true, run: view(r) });
      if (r.stage !== "active" || !r.expires_at || now < r.expires_at) return fail(409, "Run has not expired.");
      patch = closed("expiry");
      break;
    case "abort":
      if (r.stage === "cleanup_pending" || END.has(r.stage)) return reply({ ok: true, run: view(r) });
      if (!["queued", "provisioning", "active"].includes(r.stage)) return fail(409, "Run was not launched.");
      if (r.stage === "active" && now >= r.expires_at) patch = closed("expiry");
      else patch = closed("failure");
      break;
    case "finalize":
      if (r.stage !== "cleanup_pending") return fail(409, "Run is not closed.");
      if (r.finalized_at) return reply({ ok: true, run: view(r) });
      if (r.reason !== "failure" && modeScore(b.mode) === null) return fail(400, "Final grade evidence is required.");
      patch = { finalized_at: now };
      if (r.reason !== "failure") Object.assign(patch, { result_mode: b.mode, final_score: modeScore(b.mode) });
      break;
    case "cleaned":
      if (END.has(r.stage)) return reply({ ok: true, run: view(r) });
      if (r.stage !== "cleanup_pending" || !r.finalized_at ||
          b.vm_absent !== true || b.disks_absent !== true || b.network_absent !== true)
        return fail(409, "Result and provider cleanup must both be confirmed.");
      patch = {
        stage: { finish: "finished", expiry: "expired", failure: "failed" }[r.reason],
        cleanup_at: now, cleanup_vm_absent: true, cleanup_disk_absent: true, cleanup_network_absent: true,
      };
      break;
    default:
      return fail(400, "Unknown worker event.");
  }
  return reply({ ok: true, run: view(await db.update(r.id, patch)) });
}

async function workerPoll(entities) {
  const db = entities.ProxmoxLearnerRun;
  const enabled = await featureEnabled(entities);
  const result = [];
  const stages = ["queued", "provisioning", "active", "cleanup_pending"];
  const assignments = await entities.UserLabAssignment.filter({ lab_type: TYPE }, "created_date", 100);
  const byId = new Map(assignments.filter(usableAssignment).map(assignment => [assignment.id, assignment]));
  const records = await db.filter({ stage: { $in: stages } }, "created_date", 100);
  for (let r of records) {
    if (!validRun(r)) continue;
    const current = byId.get(r.assignment_id);
    if (r.stage !== "cleanup_pending" && (!current || current.user_email !== r.owner_email ||
        current.lab_id !== r.template_id || ((r.stage === "queued" || r.stage === "provisioning") && !enabled))) {
      r = await db.update(r.id, closed("failure"));
    }
    result.push(r);
  }
  if (enabled && result.length < VMIDS.size) {
    for (const assignment of byId.values()) {
      if (result.length >= VMIDS.size) break;
      const request = assignment.proxmox_launch;
      if (!request || !ID.test(request.owner_id) || request.owner_email !== assignment.user_email ||
          request.template_id !== assignment.lab_id || !Number.isFinite(request.requested_at) ||
          (await findRun(db, assignment.id))) continue;
      const row = await db.create({
        assignment_id: assignment.id, template_id: request.template_id, template_version: request.template_version,
        owner_id: request.owner_id, owner_email: request.owner_email,
        title: request.title, task_title: request.task_title, instructions: request.instructions,
        requested_at: request.requested_at, stage: "queued",
      });
      result.push(row);
    }
  }
  return reply({ ok: true, runs: result, now: Date.now() });
}

function summary(r, assignment, exercise, enabled) {
  const frozen = r || assignment?.proxmox_launch || exercise;
  return {
    assignment_id: r?.assignment_id || assignment.id,
    title: frozen?.title || "Proxmox lab",
    task_title: frozen?.task_title || null,
    instructions: frozen?.instructions || null,
    run: r ? view(r) : { id: null, stage: assignment.proxmox_launch ? "queued" : "idle" },
    can_launch: enabled && !!assignment && !!exercise && !r && !assignment.proxmox_launch,
    can_operate: !!assignment && r?.stage === "active",
  };
}

async function learner(base44, request) {
  const actor = await base44.auth.me().catch(() => null);
  if (!actor) return fail(401, "Sign in to continue.");
  const entities = base44.asServiceRole.entities;
  const db = entities.ProxmoxLearnerRun;
  const enabled = await featureEnabled(entities);
  if (request.action === "catalog") {
    if (actor.role !== "admin") return fail(403, "Administrator access required.");
    if (!enabled) return reply({ ok: true, labs: [] });
    const templates = await entities.LabTemplate.filter({ status: "published" }, "-created_date", 100);
    return reply({ ok: true, labs: templates.map(publishedExercise).filter(Boolean) });
  }
  if (request.action === "list") {
    const assignments = await actorAssignments(entities, actor.email);
    const runs = await db.filter({ owner_id: actor.id }, "-created_date", 100);
    const output = [];
    for (const assignment of assignments) {
      const run = runs.find(row => row.assignment_id === assignment.id);
      if (!run && !enabled) continue;
      const template = run ? null : await entities.LabTemplate.get(assignment.lab_id).catch(() => null);
      const exercise = publishedExercise(template);
      if (run || exercise || assignment.proxmox_launch) output.push(summary(run, assignment, exercise, enabled));
    }
    for (const run of runs.filter(row => END.has(row.stage))) {
      if (!output.some(item => item.assignment_id === run.assignment_id)) output.push(summary(run, null, null, enabled));
    }
    return reply({ ok: true, labs: output });
  }
  if (!ID.test(request.assignment_id ?? "")) return fail(404, "Assigned lab not found.");
  let assignment = await entities.UserLabAssignment.get(request.assignment_id).catch(() => null);
  if (!usableAssignment(assignment) || assignment.user_email !== actor.email) assignment = null;
  const r = assignment
    ? await findRun(db, request.assignment_id)
    : (await db.filter({ assignment_id: request.assignment_id, owner_id: actor.id }, "created_date", 2))[0];
  if (r && (r.owner_id !== actor.id || r.owner_email !== actor.email)) return fail(404, "Assigned lab not found.");
  if (!assignment && !(request.action === "view" && r && END.has(r.stage))) return fail(404, "Assigned lab not found.");
  const template = assignment && !r ? await entities.LabTemplate.get(assignment.lab_id).catch(() => null) : null;
  const exercise = publishedExercise(template);
  if (request.action === "view") {
    if (!r && !exercise && !assignment.proxmox_launch) return fail(404, "Assigned lab not found.");
    return reply({ ok: true, lab: summary(r, assignment, exercise, enabled) });
  }
  if (request.action === "launch") {
    if (!enabled) return fail(403, "Proxmox labs are disabled.");
    if (r || assignment.proxmox_launch) return reply({ ok: true, lab: summary(r, assignment, exercise, enabled) });
    if (!exercise) return fail(409, "The published lab is unavailable.");
    const updated = await entities.UserLabAssignment.update(assignment.id, {
      proxmox_launch: { ...exercise, owner_id: actor.id, owner_email: actor.email, requested_at: Date.now() },
    });
    return reply({ ok: true, lab: summary(null, updated, exercise, enabled) });
  }
  if (!r || r.stage !== "active" || !r.expires_at || Date.now() >= r.expires_at) {
    return fail(409, "This lab is no longer open.");
  }
  const busy = r.command_request && r.command_request !== r.command_done ||
    r.grade_request && r.grade_request !== r.grade_done;
  if (busy) return fail(409, "Wait for the current request to finish.");
  let patch;
  if (request.action === "terminal") {
    if (!COMMANDS.has(request.command)) return fail(400, "Only the commands shown in this lab are available.");
    patch = { command_request: crypto.randomUUID(), command_kind: request.command };
  } else if (request.action === "grade") {
    patch = { grade_request: crypto.randomUUID() };
  } else if (request.action === "finish") {
    if (r.score == null) return fail(409, "Check your work before finishing.");
    patch = closed("finish");
  } else {
    return fail(400, "Unknown learner action.");
  }
  return reply({ ok: true, lab: summary(await db.update(r.id, patch), assignment, null, enabled) });
}

export async function handleProxmoxLearner(req, createClientFromRequest) {
  if (req.method !== "POST") return fail(405, "POST required.");
  try {
    const raw = await req.text();
    if (raw.length > 4096) return fail(413, "Request too large.");
    let request;
    try { request = JSON.parse(raw); } catch { return fail(400, "Invalid request."); }
    if (!request || typeof request !== "object" || Array.isArray(request)) return fail(400, "Invalid request.");
    if (request.action === "health") return reply({ ok: true, version: "proxmox-assigned-v1" });
    const base44 = createClientFromRequest(req);
    if (["workerPoll", "workerEvent", "workerRead"].includes(request.action)) {
      if (!await workerAuthorized(req)) return fail(401, "Worker authentication required.");
      const entities = base44.asServiceRole.entities;
      if (request.action === "workerPoll") return await workerPoll(entities);
      if (request.action === "workerRead") {
        if (!ID.test(request.run_id ?? "")) return fail(404, "Run unavailable.");
        const run = await entities.ProxmoxLearnerRun.get(request.run_id).catch(() => null);
        return validRun(run) ? reply({ ok: true, run: view(run) }) : fail(404, "Run unavailable.");
      }
      return await workerEvent(entities.ProxmoxLearnerRun, request);
    }
    return await learner(base44, request);
  } catch (error) {
    console.error("Proxmox learner operation failed", error?.name);
    return fail(502, "Design Studio could not complete the lab request.");
  }
}
