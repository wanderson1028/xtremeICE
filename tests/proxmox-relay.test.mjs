import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { webcrypto } from "node:crypto";
import { transform } from "esbuild";

const records = [];
let nextId = 1;
const clone = (value) => structuredClone(value);
const matches = (record, query) => Object.entries(query).every(([key, wanted]) => {
  const actual = record[key];
  if (wanted && typeof wanted === "object" && !Array.isArray(wanted)) {
    if ("$lt" in wanted) return actual < wanted.$lt;
    if ("$in" in wanted) return wanted.$in.includes(actual);
  }
  return actual === wanted;
});
const jobs = {
  async filter(query, sort, limit) {
    const found = records.filter((record) => matches(record, query)).map(clone);
    if (sort) found.sort((a, b) => String(a[sort.replace(/^-/, "")] || "").localeCompare(String(b[sort.replace(/^-/, "")] || "")) * (sort.startsWith("-") ? -1 : 1));
    return limit ? found.slice(0, limit) : found;
  },
  async get(id) { return clone(records.find((record) => record.id === id) || null); },
  async create(data) {
    const record = { ...clone(data), id: String(nextId++), created_date: new Date().toISOString(), updated_date: new Date().toISOString() };
    records.push(record);
    return clone(record);
  },
  async update(id, data) {
    const record = records.find((item) => item.id === id);
    assert.ok(record, "job exists");
    Object.assign(record, clone(data), { updated_date: new Date().toISOString() });
    return clone(record);
  },
  async list() { return records.map(clone); },
};
const worker = { id: "worker-1", worker_id: "proxmox-vm100", provider: "proxmox", status: "active", token_hash: "" };
const workers = {
  async filter(query) { return matches(worker, query) ? [clone(worker)] : []; },
  async update(id, data) { assert.equal(id, worker.id); Object.assign(worker, data); return clone(worker); },
  async list() { return [clone(worker)]; },
};
const template = {
  id: "template-001", status: "published", version: "1.0",
  environment_definition: {
    resources: [{ id: "resource-1", resource_type: "server", network_ids: ["network-1"], startup_scripts: [], initial_files: [] }],
    networks: [{ id: "network-1", isolated: true, internet_access: false }],
    connections: [],
    connectivity_policy: { isolation_required: true, internet_access: "none", allow_inbound_external: false, allow_outbound_external: false },
    identity_requirements: { accounts_needed: [], directory_required: false, mfa_required: false },
    initialization: { startup_scripts: [] },
  },
  lab_content: { tasks: [{ validation_criteria: [{ check: "manual-1" }] }] },
};
const templates = { async get(id) { return id === template.id ? clone(template) : null; } };
let currentUser = { role: "admin", email: "test@example.invalid" };
const base44 = {
  auth: { async me() { return currentUser; } },
  asServiceRole: { entities: { ProviderExecutionJob: jobs, ProviderWorker: workers, LabTemplate: templates } },
};
let handler;
const source = readFileSync("base44/functions/proxmoxRelay/entry.ts", "utf8")
  .replace(/^import \{ createClientFromRequest \} from "npm:@base44\/sdk@[^"]+";/m, "const createClientFromRequest = () => globalThis.testBase44;");
const compiled = await transform(source, { loader: "ts", format: "cjs" });
runInNewContext(compiled.code, {
  Deno: { serve(fn) { handler = fn; } },
  globalThis: { testBase44: base44 },
  crypto: webcrypto, TextEncoder, Response, Request, Date, console,
});
assert.equal(typeof handler, "function");
async function call(action, extra = {}, workerCall = false) {
  const request = new Request("https://example.invalid", {
    method: "POST",
    headers: workerCall ? { "x-provider-worker-token": workerCall === true ? "test-worker-token" : workerCall } : {},
    body: JSON.stringify({ action, ...extra }),
  });
  const response = await handler(request);
  return { status: response.status, body: await response.json() };
}
worker.token_hash = Array.from(new Uint8Array(await webcrypto.subtle.digest("SHA-256", new TextEncoder().encode("test-worker-token"))))
  .map((byte) => byte.toString(16).padStart(2, "0")).join("");
worker.metadata = { source_version: "1.1.0", notes: "token=never-return-this-marker" };
const workerList = await call("listWorkers");
assert.equal(workerList.body.workers[0].metadata.source_version, "1.1.0");
assert.ok(!JSON.stringify(workerList.body).includes("never-return-this-marker"));
assert.equal((await call("poll", {}, "wrong-worker-token")).status, 401);
assert.equal((await call("complete", { job_id: "missing", success: true }, "wrong-worker-token")).status, 401);
currentUser = null;
assert.equal((await call("listJobs")).status, 401);
assert.equal((await call("enqueue", { operation: "vm_start", parameters: { vmid: 101 } })).status, 401);
currentUser = { role: "user", email: "learner@example.invalid" };
assert.equal((await call("planPilot", { template_id: template.id })).status, 403);
assert.equal((await call("listWorkers")).status, 403);
assert.equal((await call("enqueue", { operation: "vm_start", parameters: { vmid: 101 } })).status, 403);
assert.equal(records.length, 0);
currentUser = { role: "admin", email: "test@example.invalid" };

const validPlan = await call("planPilot", { template_id: template.id });
assert.equal(validPlan.status, 200);
assert.equal(validPlan.body.assessment.compatible, true);
assert.equal(validPlan.body.assessment.provisioning_ready, false);
assert.equal((await call("planPilot", { template_id: "missing-001" })).status, 404);
const originalTasks = clone(template.lab_content.tasks);
template.lab_content.tasks = { unexpected: "shape" };
const malformedTasks = await call("planPilot", { template_id: template.id });
assert.equal(malformedTasks.status, 200);
assert.equal(malformedTasks.body.assessment.compatible, false);
assert.match(malformedTasks.body.assessment.reasons.join(" "), /Tasks must be an array/);
template.lab_content.tasks = clone(originalTasks);
template.lab_content.tasks[0].validation_criteria = {};
const malformedCriteria = await call("planPilot", { template_id: template.id });
assert.equal(malformedCriteria.body.assessment.compatible, false);
assert.match(malformedCriteria.body.assessment.reasons.join(" "), /Task validation criteria must be arrays/);
template.lab_content.tasks = clone(originalTasks);
template.environment_definition.connections = {};
const malformedConnections = await call("planPilot", { template_id: template.id });
assert.equal(malformedConnections.body.assessment.compatible, false);
assert.match(malformedConnections.body.assessment.reasons.join(" "), /connections must be arrays/);
template.environment_definition.connections = [];
template.environment_definition.resources[0].startup_scripts = {};
const malformedStartup = await call("planPilot", { template_id: template.id });
assert.equal(malformedStartup.body.assessment.compatible, false);
assert.match(malformedStartup.body.assessment.reasons.join(" "), /Startup scripts/);
template.environment_definition.resources[0].startup_scripts = [];
template.environment_definition.identity_requirements.accounts_needed = {};
const malformedIdentity = await call("planPilot", { template_id: template.id });
assert.equal(malformedIdentity.body.assessment.compatible, false);
assert.match(malformedIdentity.body.assessment.reasons.join(" "), /Identity provisioning/);
template.environment_definition.identity_requirements.accounts_needed = [];
template.environment_definition.networks[0].isolated = false;
const unsafePlan = await call("planPilot", { template_id: template.id });
assert.equal(unsafePlan.body.assessment.compatible, false);
assert.match(unsafePlan.body.assessment.reasons.join(" "), /isolated network/);
template.environment_definition.networks[0].isolated = true;
template.lab_content.tasks[0].validation_criteria[0].runtime_validator = { type: "path_exists", path: "/tmp/test" };
const unsupportedValidator = await call("planPilot", { template_id: template.id });
assert.match(unsupportedValidator.body.assessment.reasons.join(" "), /runtime validators/);

const workerStop = await call("enqueue", { operation: "vm_stop", parameters: { vmid: 100 }, request_id: "worker-stop-001" });
assert.equal(workerStop.status, 403);
assert.match(workerStop.body.error, /VM101 pilot/);
assert.equal(records.length, 0);
const first = await call("enqueue", { operation: "vm_start", parameters: { vmid: 101 }, request_id: "same-request-001" });
assert.equal(first.status, 200);
assert.equal(first.body.deduplicated, false);
const repeat = await call("enqueue", { operation: "vm_start", parameters: { vmid: 101 }, request_id: "same-request-001" });
assert.equal(repeat.body.job.id, first.body.job.id);
assert.equal(repeat.body.deduplicated, true);
const activeRepeat = await call("enqueue", { operation: "vm_start", parameters: { vmid: 101 }, request_id: "different-request-002" });
assert.equal(activeRepeat.body.job.id, first.body.job.id);
assert.equal(activeRepeat.body.deduplicated, true);
const conflict = await call("enqueue", { operation: "vm_stop", parameters: { vmid: 101 }, request_id: "different-request-003" });
assert.equal(conflict.status, 409);
assert.equal(records.length, 1);

const claimed = await call("poll", { worker_version: "1.1.0" }, true);
assert.equal(claimed.body.job.id, first.body.job.id);
assert.equal(worker.metadata.source_version, "1.1.0");
const complete = await call("complete", { job_id: first.body.job.id, success: true, result: {
  vmid: 101, node: "prox", requested_state: "running", task: { status: "stopped", exit_status: "OK", detail: "never-return-this-marker" },
  debug: "never-return-this-marker",
} }, true);
assert.equal(complete.body.job.status, "succeeded");
assert.equal(complete.body.job.result.requested_state, "running");
assert.equal(complete.body.job.result.task.exit_status, "OK");
assert.ok(!JSON.stringify(complete.body).includes("never-return-this-marker"));
assert.ok(!JSON.stringify(await jobs.get(first.body.job.id)).includes("never-return-this-marker"));
const repeatedComplete = await call("complete", { job_id: first.body.job.id, success: true, result: { requested_state: "running" } }, true);
assert.equal(repeatedComplete.body.already_completed, true);
assert.equal(records.length, 1);

const forged = await jobs.create({
  provider: "proxmox", operation: "vm_stop", parameters: { vmid: 100, token: "never-return-this-marker" },
  result: { secret: "never-return-this-marker", detail: "never-return-this-marker", name: "token=never-return-this-marker" }, error_message: "never-return-this-marker",
  status: "queued", requested_by: "direct-write", attempts: 0,
});
const projected = await call("getJob", { job_id: forged.id });
assert.equal(projected.body.job.parameters.vmid, 100);
assert.equal(projected.body.job.parameters.token, undefined);
assert.equal(projected.body.job.result.secret, undefined);
assert.equal(projected.body.job.result.detail, undefined);
assert.match(projected.body.job.error_message, /inspect worker logs/);
assert.ok(!JSON.stringify(projected.body).includes("never-return-this-marker"));
const rejected = await call("poll", {}, true);
assert.equal(rejected.body.job, null);
assert.equal(rejected.body.rejected, true);
assert.equal((await jobs.get(forged.id)).status, "failed");
assert.match((await jobs.get(forged.id)).error_message, /dispatch policy/);

const past = new Date(Date.now() - 120_000).toISOString();
const readJob = await jobs.create({ provider: "proxmox", operation: "vm_status", parameters: { vmid: 101 }, status: "leased", worker_id: worker.worker_id, requested_by: "test", attempts: 1, lease_expires_at: past });
const mutationJob = await jobs.create({ provider: "proxmox", operation: "vm_stop", parameters: { vmid: 101 }, status: "leased", worker_id: worker.worker_id, requested_by: "test", attempts: 1, lease_expires_at: past });
const exhaustedJob = await jobs.create({ provider: "proxmox", operation: "inventory", parameters: {}, status: "leased", worker_id: worker.worker_id, requested_by: "test", attempts: 3, lease_expires_at: past });
const recovered = await call("poll", {}, true);
assert.equal(worker.metadata.source_version, "unreported");
assert.equal(recovered.body.job.id, readJob.id);
assert.equal((await jobs.get(readJob.id)).attempts, 2);
assert.equal((await jobs.get(mutationJob.id)).status, "expired");
assert.equal((await jobs.get(exhaustedJob.id)).status, "expired");
assert.match((await jobs.get(mutationJob.id)).error_message, /check actual VM state/);
const failed = await call("complete", { job_id: readJob.id, success: false, error: "token=never-return-this-marker" }, true);
assert.equal(failed.body.job.status, "failed");
assert.match(failed.body.job.error_message, /inspect worker logs/);
assert.ok(!JSON.stringify(failed.body).includes("never-return-this-marker"));
assert.ok(!(await jobs.get(readJob.id)).error_message.includes("never-return-this-marker"));

const inventoryJob = await jobs.create({
  provider: "proxmox", operation: "inventory", parameters: {}, status: "succeeded",
  result: { cluster: [{ vmid: 101, name: "lab-vm101", node: "prox", type: "qemu", status: "stopped",
    cpu: 0, maxcpu: 2, mem: 0, maxmem: 1024, detail: "never-return-this-marker" }] },
});
const inventoryResult = (await call("getJob", { job_id: inventoryJob.id })).body.job.result;
assert.equal(inventoryResult.cluster[0].name, "lab-vm101");
assert.equal(inventoryResult.cluster[0].maxcpu, 2);
assert.equal(inventoryResult.cluster[0].detail, undefined);
const statusJob = await jobs.create({
  provider: "proxmox", operation: "vm_status", parameters: { vmid: 101 }, status: "succeeded",
  result: { vmid: 101, name: "lab-vm101", node: "prox", status: "stopped", qmpstatus: "stopped",
    uptime: 0, cpu: 0, cpus: 2, mem: 0, maxmem: 1024, detail: "never-return-this-marker" },
});
const statusResult = (await call("getJob", { job_id: statusJob.id })).body.job.result;
assert.equal(statusResult.vmid, 101);
assert.equal(statusResult.cpus, 2);
assert.equal(statusResult.detail, undefined);
assert.ok(!JSON.stringify(statusResult).includes("never-return-this-marker"));
console.log("Proxmox relay policy checks passed");
