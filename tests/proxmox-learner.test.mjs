import assert from "node:assert/strict";
import { createHash, webcrypto } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";

const key = "a".repeat(64);
const alice = { id: "1".repeat(24), email: "a@example.com", role: "user" };
const bob = { id: "2".repeat(24), email: "b@example.com", role: "user" };
const aa = "3".repeat(24);
const ab = "4".repeat(24);
const template = "5".repeat(24);
const modeTask = {
  title: "Restrict file access",
  instructions: "Remove group and other permissions.",
  validation_criteria: [{
    runtime_validator: {
      type: "command_result", command_key: "file_mode",
      path: "/opt/design-studio-proof/permissions.txt", expected_output: "600",
    },
  }],
};
function collection(initial = []) {
  const rows = initial.map(row => structuredClone(row));
  return {
    rows,
    get: async (id) => structuredClone(rows.find(row => row.id === id)) ?? null,
    filter: async (where, _sort, limit) => structuredClone(rows.filter(row =>
      Object.entries(where).every(([field, value]) =>
        value?.$in ? value.$in.includes(row[field]) : row[field] === value,
      ),
    ).slice(0, limit)),
    create: async (data) => {
      const row = { ...structuredClone(data), id: String(rows.length + 10).padStart(24, "0") };
      rows.push(row);
      return structuredClone(row);
    },
    update: async (id, patch) => {
      const row = rows.find(item => item.id === id);
      assert.ok(row);
      Object.assign(row, structuredClone(patch));
      return structuredClone(row);
    },
  };
}

function fixture({ workerConfigured = true } = {}) {
  let now = 1000;
  const entities = {
    FeatureFlag: collection([{ key: "proxmox_learner_labs", is_enabled: true }]),
    UserLabAssignment: collection([
      { id: aa, user_email: alice.email, lab_id: template, lab_type: "proxmox_template", service_key: "lab_scenarios" },
      { id: ab, user_email: bob.email, lab_id: template, lab_type: "proxmox_template", service_key: "lab_scenarios" },
    ]),
    LabTemplate: collection([{ id: template, status: "published", tags: ["proxmox-pilot"],
      title: "Published Linux lab", version: "1.0", lab_content: { tasks: [modeTask] } }]),
    ProxmoxLearnerRun: collection(),
  };
  let handler;
  const code = readFileSync(new URL("../base44/functions/proxmoxLearner/handler.js", import.meta.url), "utf8")
    .replace("export async function handleProxmoxLearner", "async function handleProxmoxLearner") +
    "\nDeno.serve(req => handleProxmoxLearner(req, createClientFromRequest));";
  runInNewContext(code, {
    Response, TextEncoder, console, crypto: webcrypto,
    Date: { now: () => now },
    Deno: {
      env: { get: name => name === "PROXMOX_LAB_SECONDS"
        ? "150" : workerConfigured ? createHash("sha256").update(key).digest("hex") : undefined },
      serve: fn => { handler = fn; },
    },
    createClientFromRequest: req => ({
      auth: { me: async () => [alice, bob].find(user => user.id === req.headers.get("x-test-actor")) },
      asServiceRole: { entities },
    }),
  });
  const call = async (action, payload = {}, options = {}) => {
    const headers = { "Content-Type": "application/json" };
    if (options.user) headers["x-test-actor"] = options.user.id;
    if (options.worker) headers["x-proxmox-learner-worker"] = key;
    const response = await handler(new Request("https://unit.test", {
      method: "POST", headers, body: JSON.stringify({ action, ...payload }),
    }));
    return { status: response.status, data: await response.json() };
  };
  return { call, entities, advance(ms) { now += ms; } };
}
const learner = (call, user, assignmentId) => (action, payload = {}) =>
  call(action, { assignment_id: assignmentId, ...payload }, { user });
const work = (call, runId, vmid) => (event, fields = {}) =>
  call("workerEvent", { event, run_id: runId, vmid, ...fields }, { worker: true });

test("only explicit published assignments launch, and duplicate requests share a frozen run", async () => {
  const { call, entities } = fixture();
  const mine = learner(call, alice, aa);
  const peer = learner(call, bob, aa);
  assert.equal((await peer("launch")).status, 404);
  assert.equal((await peer("view")).status, 404);
  assert.equal((await call("workerPoll", {}, { user: alice })).status, 401);
  entities.FeatureFlag.rows[0].is_enabled = false;
  assert.equal((await mine("launch")).status, 403);
  entities.FeatureFlag.rows[0].is_enabled = true;
  await Promise.all([mine("launch"), mine("launch")]);
  entities.LabTemplate.rows[0].title = "New published revision";
  const pull = () => call("workerPoll", {}, { worker: true });
  const first = (await pull()).data.runs;
  const second = (await pull()).data.runs;
  assert.equal(first.length, 1);
  assert.equal(second.length, 1);
  assert.equal(first[0].id, second[0].id);
  assert.equal(first[0].title, "Published Linux lab");
});

test("an enabled flag without a configured worker cannot queue a launch", async () => {
  const { call, entities } = fixture({ workerConfigured: false });
  const response = await learner(call, alice, aa)("launch");
  assert.equal(response.status, 403);
  assert.equal(entities.UserLabAssignment.rows[0].proxmox_launch, undefined);
  assert.equal((await call("workerPoll", {}, { worker: true })).status, 401);
});

test("automatic expiry requires a saved grade and verified cleanup, then retains the learner result", async () => {
  const { call, advance, entities } = fixture();
  const mine = learner(call, bob, ab);
  assert.equal((await mine("launch")).status, 200);
  const { data: { runs: [run] } } = await call("workerPoll", {}, { worker: true });
  const worker = work(call, run.id, 9530);
  assert.equal((await worker("provisioning")).status, 200);
  assert.equal((await worker("ready")).status, 200);
  assert.equal((await worker("expire")).status, 409);
  const grade = await mine("grade", { mode: "600", score: 100 });
  assert.equal(grade.data.lab.run.score, null);
  await worker("grade", { request_id: grade.data.lab.run.grade_request, mode: "644" });
  assert.equal((await mine("view")).data.lab.run.score, 0);
  advance(150_000);
  assert.equal((await mine("terminal", { command: "chmod" })).status, 409);
  assert.equal((await worker("expire")).status, 200);
  const cleanup = { vm_absent: true, disks_absent: true, network_absent: true };
  assert.equal((await worker("cleaned", cleanup)).status, 409);
  assert.equal((await worker("finalize", { mode: "644" })).status, 200);
  assert.equal((await worker("cleaned", { ...cleanup, disks_absent: false })).status, 409);
  assert.equal((await worker("cleaned", cleanup)).status, 200);
  entities.UserLabAssignment.rows.splice(1, 1);
  const retained = (await mine("view")).data.lab.run;
  assert.equal(retained.stage, "expired");
  assert.equal(retained.final_score, 0);
  assert.equal(retained.cleanup_verified, true);
  assert.equal((await learner(call, alice, ab)("view")).status, 404);
});
