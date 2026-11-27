import assert from "node:assert/strict";
import { KasmApiError, isMissingWorkspace } from "../base44/functions/kasmProvider/api.ts";
import { handleKasm } from "../base44/functions/kasmProvider/handler.ts";
import { cleanup, finish, launch, requestCleanup, status, sweep, taskAction } from "../base44/functions/kasmProvider/lifecycle.ts";

const owner = { email: "owner@example.test", role: "user" };
const peer = { email: "peer@example.test", role: "user" };
const content = { tasks: [{ id: "t", points: 1, is_required: true, validation_criteria: [
  { check: "mode", points: 1, runtime_validator: { type: "command_result", command_key: "file_mode", expected_output: "600", path: "/tmp/proof" } },
] }] };
const fixture = () => {
  const instances = new Map();
  const attempts = new Map();
  const table = (rows) => ({
    async create(input) {
      const row = { ...structuredClone(input), id: "new-" + (rows.size + 1) };
      rows.set(row.id, row);
      return structuredClone(row);
    },
    async filter(query) {
      const match = (row, fields) => Object.entries(fields).every(([key, value]) => {
        if (key === "$or") return value.some((item) => match(row, item));
        if (value && typeof value === "object") {
          if ("$in" in value) return value.$in.includes(row[key]);
          if ("$lte" in value) return row[key] != null && row[key] <= value.$lte;
        }
        return row[key] === value;
      });
      return [...rows.values()].filter((row) => match(row, query)).map((row) => structuredClone(row));
    },
    async update(id, patch) { rows.set(id, { ...rows.get(id), ...structuredClone(patch) }); },
  });
  const template = { id: "lab", version: "1", status: "published", environment_profile_id: "profile", passing_score: 100,
    environment_definition: { resources: [{ id: "guest", os_type: "Linux", access_method: "browser" }] }, lab_content: content };
  const db = {
    KasmLearnerRun: table(instances),
    LabTemplate: table(new Map([["lab", template]])),
    EnvironmentProfile: table(new Map([["profile", { id: "profile", kasm_image_id: "image", os_type: "Linux" }]])),
    UserLabAssignment: table(new Map([["a", { user_email: owner.email, lab_id: "lab", lab_type: "kasm_template", service_key: "lab_scenarios" }]])),
    RuntimeValidationAttempt: table(attempts),
  };
  const row = { id: "run", provider: "kasm", runtime_authority: "server_kasm_v1", status: "running", user_email: owner.email,
    expires_at: new Date(Date.now()+600000).toISOString(), provider_session_id: "workspace", provider_user_ref: "kasm-owner",
    template_snapshot: { lab_content: content, passing_score: 100 }, task_results: [] };
  return { db, row, instances, attempts, template };
};

Deno.test("peer operations, legacy handles and direct command cannot reach Kasm", async () => {
  const { db, row, instances } = fixture();
  instances.set(row.id, row);
  const send = (user, action, fields = {}) => handleKasm({ auth: { me: async () => user }, asServiceRole: { entities: db } },
    new Request("https://app.example.test", { method: "POST", body: JSON.stringify({ action, instance_id: row.id, ...fields }) }));
  for (const action of ["status", "stop", "finish", "applyValidation"]) {
    assert.equal((await send(peer, action)).status, 404);
  }
  assert.equal((await send(owner, "execCommand", { command: "id" })).status, 403);
  assert.equal((await send(peer, "getImages")).status, 403);
  instances.set(row.id, { ...row, runtime_authority: undefined });
  assert.equal((await send(owner, "status")).status, 409);
});

Deno.test("disabled launches and revoked assignments cannot operate Kasm workspaces", async () => {
  const { db, row, instances } = fixture();
  db.FeatureFlag = { filter: async () => [] };
  instances.set(row.id, { ...row, template_id: "lab" });
  const send = (user, action, fields = {}) => handleKasm(
    { auth: { me: async () => user }, asServiceRole: { entities: db } },
    new Request("https://app.example.test", { method: "POST", body: JSON.stringify({ action, ...fields }) }),
  );

  assert.equal((await send(owner, "launch", { template_id: "lab" })).status, 403);
  const disabled = (await (await send(owner, "assignedLabs")).json()).data;
  assert.deepEqual(disabled.labs, []);
  assert.deepEqual(disabled.runs.map(run => run.id), [row.id]);
  const other = (await (await send(peer, "assignedLabs")).json()).data;
  assert.deepEqual(other.runs, []);

  db.FeatureFlag = { filter: async () => [{ is_enabled: true }] };
  const assigned = (await (await send(owner, "assignedLabs")).json()).data;
  assert.deepEqual(assigned.labs.map(lab => lab.template_id), ["lab"]);
  db.UserLabAssignment = { filter: async () => [] };
  assert.equal((await send(owner, "submitTask", { instance_id: row.id, task_id: "t" })).status, 403);
});

Deno.test("launch requires assignment and published revision; Kasm identity is derived on the server", async () => {
  const { db, template } = fixture();
  const calls = [];
  const api = async (endpoint, fields) => {
    calls.push([endpoint, fields]);
    if (endpoint === "get_users") return { users: [{ username: owner.email, user_id: "mine" }] };
    return { kasm_id: "workspace" };
  };
  await assert.rejects(launch(db, peer, "lab", api), /assignment/);
  template.status = "draft";
  await assert.rejects(launch(db, owner, "lab", api), /Publish/);
  template.status = "published";
  const row = await launch(db, owner, "lab", api);
  assert.deepEqual(calls, [["get_users", undefined], ["request_kasm", { image_id: "image", user_id: "mine", enable_sharing: false }]]);
  assert.equal(row.provider_session_id, "workspace");
  assert.equal(row.template_snapshot.lab_content.tasks[0].validation_criteria[0].runtime_validator.expected_output, "600");
  assert.equal((await launch(db, owner, "lab", api)).id, row.id);
  assert.equal(calls.length, 2);
});

Deno.test("scoring consumes completed owned evidence and survives verified finish", async () => {
  const { db, row, instances, attempts } = fixture();
  instances.set(row.id, row);
  const action = (current, action, fields = {}) => taskAction(db, current, { task_id: "t", ...fields }, action);
  await assert.rejects(action(row, "applyValidation", { attempt_id: "forged", score: 100 }), /completed owned/);
  for (const [id, observed, passed, time] of [["fail", "644", false, 0], ["pass", "600", true, 1], ["fail-again", "644", false, 2]]) {
    attempts.set(id, { id, instance_id: row.id, task_id: "t", check_id: "mode", user_email: owner.email,
      status: "completed", observed, passed, validator_type: "command_result", updated_date: new Date(1000 + Number(time)).toISOString() });
  }
  const failed = await action(row, "applyValidation", { attempt_id: "fail", passed: true });
  assert.equal(failed.score, 0);
  const passed = await action(failed, "applyValidation", { attempt_id: "pass", passed: false });
  assert.equal(passed.score, 100);
  const retained = await action(passed, "applyValidation", { attempt_id: "fail-again" });
  assert.equal(retained.score, 100);
  const submitted = await action(retained, "submitTask", { score: 9 });
  assert.equal(submitted.task_results[0].status, "passed");
  let gone = false;
  const api = async (endpoint) => {
    if (endpoint === "destroy_kasm") gone = true;
    if (endpoint === "get_kasm_status" && gone) throw new KasmApiError(400, "Invalid kasm_id (aabb)");
    return {};
  };
  const finished = await finish(db, submitted, api);
  assert.equal(finished.status, "terminated");
  assert.equal(finished.cleanup_state, "verified");
  assert.equal(finished.learning_outcome, "passed");
  assert.equal(finished.score, 100);
});

Deno.test("a mismatched rubric cannot create a new Kasm workspace", async () => {
  const { db, row, template, instances } = fixture();
  template.lab_content = { tasks: [{ id: "t", validation_criteria: [{ check: "mode", points: 100 }] }] };
  const api = () => assert.fail("An invalid rubric must not call Kasm");
  await assert.rejects(launch(db, owner, "lab", api), { status: 409, message: /100 criterion points.*worth 10/ });
  assert.equal(instances.size, 0);

  instances.set(row.id, { ...row, template_id: "lab" });
  assert.equal((await launch(db, owner, "lab", api)).id, row.id);
});

Deno.test("a frozen legacy rubric cannot overcredit a task or the score saved at Finish", async () => {
  const { db, row, instances, attempts } = fixture();
  const task = content.tasks[0];
  row.template_snapshot.lab_content = { tasks: [
    { ...task, points: 10, validation_criteria: [{ ...task.validation_criteria[0], points: 100 }] },
    { id: "optional", points: 10, is_required: false, validation_criteria: [{ check: "other", points: 10 }] },
  ] };
  instances.set(row.id, row);
  attempts.set("pass", { id: "pass", instance_id: row.id, task_id: task.id, check_id: "mode",
    status: "completed", user_email: owner.email, passed: true, observed: "600", updated_date: new Date().toISOString() });

  const graded = await taskAction(db, row, { task_id: task.id, attempt_id: "pass" }, "applyValidation");
  assert.equal(instances.get(row.id).score, 50);
  assert.equal(graded.task_results[0].points_earned, 10);

  const submitted = await taskAction(db, graded, { task_id: task.id }, "submitTask");
  const finished = await finish(db, submitted, async (endpoint) => {
    assert.equal(endpoint, "get_kasm_status");
    throw new KasmApiError(400, "Invalid kasm_id (aabb)");
  });
  assert.equal(finished.status, "terminated");
  assert.equal(instances.get(row.id).score, 50);
});

Deno.test("preview writes and legacy expiry cleanup keep saved scores bounded", async () => {
  const { db, row, instances } = fixture();
  instances.set(row.id, { ...row, provider: "preview" });
  const res = await handleKasm({ auth: { me: async () => owner }, asServiceRole: { entities: db } },
    new Request("https://app.example.test", { method: "POST", body: JSON.stringify({
      action: "savePreview", instance_id: row.id, patch: { score: 1000 },
    }) }));
  assert.equal(res.status, 200);
  assert.equal(instances.get(row.id).score, 100);

  instances.set(row.id, { ...row, score: 1000, expires_at: new Date(Date.now() - 1000).toISOString() });
  await sweep(db, async (endpoint) => {
    assert.equal(endpoint, "get_kasm_status");
    throw new KasmApiError(400, "Invalid kasm_id (aabb)");
  });
  assert.equal(instances.get(row.id).score, 100);
  assert.equal(instances.get(row.id).cleanup_state, "verified");
});

Deno.test("expiry durably queues a destroy; readiness and token refresh do not run during cleanup", async () => {
  const { db, row, instances } = fixture();
  const expired = { ...row, expires_at: new Date(Date.now()-1000).toISOString() };
  instances.set(row.id, expired);
  let gone = false;
  const calls = [];
  const api = async (endpoint) => {
    calls.push(endpoint);
    if (gone) throw new KasmApiError(400, "Invalid kasm_id (abcd)");
    return { operational_status: "running" };
  };
  assert.deepEqual(await sweep(db, api), { scanned: 1, verified: 0, failed: 0 });
  const pending = instances.get(row.id);
  assert.equal(pending.cleanup_state, "pending");
  assert.equal(pending.status, "running");
  await assert.rejects(taskAction(db, pending, { task_id: "t" }, "hint"), /unavailable/);
  gone = true;
  assert.deepEqual(await sweep(db, api), { scanned: 1, verified: 1, failed: 0 });
  assert.equal(instances.get(row.id).learning_outcome, "expired");
  assert.deepEqual(calls, ["get_kasm_status", "destroy_kasm", "get_kasm_status", "get_kasm_status"]);
});

Deno.test("auth failure and ambiguous launch preserve reconciliation state", async () => {
  const { db, row, instances } = fixture();
  instances.set(row.id, row);
  const badCredentials = new KasmApiError(403, "Unauthorized");
  assert.equal(isMissingWorkspace(badCredentials), false);
  await assert.rejects(requestCleanup(db, row, "stopped", async () => { throw badCredentials; }));
  assert.equal(instances.get(row.id).cleanup_state, "pending");
  const missing = { ...row, provider_session_id: "", cleanup_state: "pending" };
  assert.equal((await cleanup(db, missing, async () => { throw Error("must not call Kasm"); })).cleanup_state, "unconfirmed");
});

Deno.test("stale readiness response cannot clear already recorded cleanup", async () => {
  const { db, row, instances } = fixture();
  instances.set(row.id, row);
  const result = await status(db, row, async () => {
    instances.set(row.id, { ...row, cleanup_state: "pending" });
    return { operational_status: "running" };
  });
  assert.equal(result.cleanup_state, "pending");
  assert.equal(instances.get(row.id).provider_session_url, undefined);
});
