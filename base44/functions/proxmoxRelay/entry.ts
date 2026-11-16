import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

const ALLOWED_OPERATIONS = new Set(["inventory", "vm_status", "vm_start", "vm_stop"]);
const LEASE_MS = 90_000;
const MAX_READ_ATTEMPTS = 3;
const READ_ONLY_OPERATIONS = new Set(["inventory", "vm_status"]);
const MUTATING_OPERATIONS = new Set(["vm_start", "vm_stop"]);

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return bytesToHex(new Uint8Array(digest));
}

function bearerToken(req: Request) {
  return (req.headers.get("x-provider-worker-token") || "").trim();
}

function safeParameters(operation: string, raw: any) {
  if (operation === "inventory") return {};
  const vmid = Number(raw?.vmid);
  if (!Number.isInteger(vmid) || vmid < 100 || vmid > 999999) {
    throw new Error("vmid must be an integer between 100 and 999999");
  }
  return { vmid };
}

function pilotTemplateAssessment(template: any) {
  const reasons: string[] = [];
  const environment = template?.environment_definition || {};
  const resources = Array.isArray(environment.resources) ? environment.resources : [];
  const networks = Array.isArray(environment.networks) ? environment.networks : [];
  const connections = Array.isArray(environment.connections) ? environment.connections : [];
  const policy = environment.connectivity_policy || {};
  const identity = environment.identity_requirements || {};
  const initialization = environment.initialization || {};
  const resource = resources[0] || {};
  const network = networks[0] || {};
  const emptyOptionalArray = (value: any) => value == null || (Array.isArray(value) && value.length === 0);

  if ([environment.resources, environment.networks, environment.connections].some(
    (value) => value != null && !Array.isArray(value)
  )) reasons.push("Environment resources, networks, and connections must be arrays.");
  if (template?.status !== "published") reasons.push("Template must be published.");
  if (resources.length !== 1 || !["workstation", "server"].includes(resource.resource_type)) {
    reasons.push("Pilot requires exactly one workstation or server resource.");
  }
  if (!resource.id || !network.id || resources.length !== 1 || networks.length !== 1 ||
      !Array.isArray(resource.network_ids) || resource.network_ids.length !== 1 ||
      resource.network_ids[0] !== network.id || connections.length) {
    reasons.push("Pilot requires one resource attached to one network and no inter-resource connections.");
  }
  if (network.isolated !== true || network.internet_access === true ||
      policy.isolation_required !== true || policy.internet_access !== "none" ||
      policy.allow_inbound_external === true || policy.allow_outbound_external === true) {
    reasons.push("Pilot requires an isolated network with no external connectivity.");
  }
  if (![resource.startup_scripts, resource.initial_files, initialization.startup_scripts].every(emptyOptionalArray)) {
    reasons.push("Startup scripts and seeded files are not supported by this pilot.");
  }
  if (!emptyOptionalArray(identity.accounts_needed) || identity.directory_required === true || identity.mfa_required === true) {
    reasons.push("Identity provisioning is not supported by this pilot.");
  }
  const taskRows = template?.lab_content?.tasks;
  if (taskRows != null && !Array.isArray(taskRows)) reasons.push("Tasks must be an array.");
  const tasks = Array.isArray(taskRows) ? taskRows : [];
  if (tasks.some((task: any) => !task || typeof task !== "object" || Array.isArray(task) ||
      (task.validation_criteria != null && !Array.isArray(task.validation_criteria)))) {
    reasons.push("Task validation criteria must be arrays.");
  }
  const criteria = tasks.flatMap((task: any) =>
    Array.isArray(task?.validation_criteria) ? task.validation_criteria : []);
  if (criteria.some((criterion: any) => !criterion || typeof criterion !== "object" || Array.isArray(criterion))) {
    reasons.push("Validation criteria must be objects.");
  }
  if (criteria.some((criterion: any) => criterion?.runtime_validator)) {
    reasons.push("Proxmox runtime validators are not implemented; this pilot requires manual criteria.");
  }

  return {
    template_id: template?.id || "",
    template_version: template?.version || "",
    compatible: reasons.length === 0,
    reasons,
    provisioning_ready: false,
    provisioning_blockers: [
      "No approved credential-free Proxmox source template and isolated bridge are configured.",
      "Per-instance VM allocation, clone, learner access, and reconciliation are not implemented.",
    ],
  };
}

function safeResult(operation: string, raw: any) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const pickNumber = (value: any) => typeof value === "number" && Number.isFinite(value) ? value : null;
  const pickText = (value: any) => typeof value === "string" && /^[a-zA-Z0-9_. -]{1,120}$/.test(value) ? value : null;
  const vm = (value: any) => ({
    vmid: pickNumber(value?.vmid),
    name: pickText(value?.name),
    node: pickText(value?.node),
    status: pickText(value?.status),
    cpu: pickNumber(value?.cpu),
    mem: pickNumber(value?.mem),
    maxmem: pickNumber(value?.maxmem),
  });
  if (operation === "inventory") {
    return { cluster: Array.isArray(source.cluster) ? source.cluster.slice(0, 100).map((row: any) => ({
      ...vm(row), type: pickText(row?.type), maxcpu: pickNumber(row?.maxcpu),
    })) : [] };
  }
  if (operation === "vm_status") {
    return {
      ...vm(source), qmpstatus: pickText(source.qmpstatus), uptime: pickNumber(source.uptime),
      cpus: pickNumber(source.cpus),
    };
  }
  if (operation === "vm_start" || operation === "vm_stop") {
    return {
      vmid: pickNumber(source.vmid), node: pickText(source.node),
      requested_state: source.requested_state === (operation === "vm_start" ? "running" : "stopped")
        ? source.requested_state : null,
      task: {
        status: source.task?.status === "stopped" ? "stopped" : null,
        exit_status: source.task?.exit_status === "OK" ? "OK" : null,
      },
    };
  }
  return {};
}

const SAFE_JOB_ERRORS = new Set([
  "Lease expired; safe read-only retry queued",
  "Lease expired during VM mutation; check actual VM state before requesting another action",
  "Lease expired after maximum read-only attempts",
  "Job rejected by relay dispatch policy",
  "Worker execution failed",
]);

function safeErrorMessage(raw: any) {
  const message = String(raw || "");
  if (!message) return "";
  if (SAFE_JOB_ERRORS.has(message)) return message;
  const httpError = /^HTTP Error ([1-5][0-9]{2})(?::[^\n]*)?$/.exec(message);
  if (httpError) return "Provider HTTP " + httpError[1] + ".";
  if (/timed out|timeout/i.test(message)) return "Provider request timed out.";
  if (/connection refused/i.test(message)) return "Provider connection refused.";
  return "Provider execution failed; inspect worker logs for details.";
}

function publicJob(job: any) {
  let parameters = {};
  if (ALLOWED_OPERATIONS.has(job.operation)) {
    try { parameters = safeParameters(job.operation, job.parameters); } catch { /* Legacy malformed job. */ }
  }
  return {
    id: job.id,
    provider: job.provider,
    operation: job.operation,
    parameters,
    status: job.status,
    requested_by: job.requested_by,
    worker_id: job.worker_id || null,
    attempts: job.attempts || 0,
    result: job.result ? safeResult(job.operation, job.result) : null,
    error_message: safeErrorMessage(job.error_message),
    lease_expires_at: job.lease_expires_at || null,
    completed_at: job.completed_at || null,
    created_date: job.created_date,
    updated_date: job.updated_date,
  };
}

async function authenticateWorker(base44: any, req: Request) {
  const token = bearerToken(req);
  if (!token) return null;
  const tokenHash = await sha256(token);
  const rows = await base44.asServiceRole.entities.ProviderWorker.filter({
    token_hash: tokenHash,
    provider: "proxmox",
    status: "active",
  });
  return rows?.[0] || null;
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const payload = await req.json();
    const action = String(payload?.action || "");

    if (action === "health") {
      return Response.json({ ok: true, version: "xtreme-ice-proxmox-relay-v1" });
    }

    if (action === "poll" || action === "complete") {
      const worker = await authenticateWorker(base44, req);
      if (!worker) return Response.json({ error: "Worker authentication failed" }, { status: 401 });

      const reportedVersion = String(payload?.worker_version || "");
      await base44.asServiceRole.entities.ProviderWorker.update(worker.id, {
        last_seen: new Date().toISOString(),
        metadata: {
          ...(worker.metadata || {}),
          source_version: /^[a-zA-Z0-9._-]{1,32}$/.test(reportedVersion) ? reportedVersion : "unreported",
        },
      });

      if (action === "poll") {
        const now = new Date().toISOString();
        const stale = await base44.asServiceRole.entities.ProviderExecutionJob.filter(
          { provider: "proxmox", status: "leased", lease_expires_at: { $lt: now } },
          "lease_expires_at",
          20
        );
        for (const candidate of stale || []) {
          // Re-read before updating: a completion may have arrived since the stale query.
          const current = await base44.asServiceRole.entities.ProviderExecutionJob.get(candidate.id);
          if (current?.status !== "leased" || !current.lease_expires_at || current.lease_expires_at >= now) continue;
          if (READ_ONLY_OPERATIONS.has(current.operation) && Number(current.attempts || 0) < MAX_READ_ATTEMPTS) {
            await base44.asServiceRole.entities.ProviderExecutionJob.update(current.id, {
              status: "queued",
              worker_id: "",
              lease_expires_at: null,
              error_message: "Lease expired; safe read-only retry queued",
            });
          } else {
            await base44.asServiceRole.entities.ProviderExecutionJob.update(current.id, {
              status: "expired",
              completed_at: now,
              error_message: MUTATING_OPERATIONS.has(current.operation)
                ? "Lease expired during VM mutation; check actual VM state before requesting another action"
                : "Lease expired after maximum read-only attempts",
            });
          }
        }

        const queued = await base44.asServiceRole.entities.ProviderExecutionJob.filter(
          { provider: "proxmox", status: "queued" },
          "created_date",
          1
        );
        const job = queued?.[0];
        if (!job) return Response.json({ success: true, job: null });

        // Admin RLS permits direct entity writes, so enforce the pilot policy again
        // at dispatch before an older installed worker can see a forged job.
        let parameters: Record<string, any>;
        try {
          if (!ALLOWED_OPERATIONS.has(job.operation)) throw new Error("Unsupported operation");
          parameters = safeParameters(job.operation, job.parameters);
          if (MUTATING_OPERATIONS.has(job.operation) && parameters.vmid !== 101) {
            throw new Error("VM mutation outside disposable VM101");
          }
        } catch {
          await base44.asServiceRole.entities.ProviderExecutionJob.update(job.id, {
            status: "failed",
            completed_at: new Date().toISOString(),
            error_message: "Job rejected by relay dispatch policy",
          });
          return Response.json({ success: true, job: null, rejected: true });
        }

        const leased = await base44.asServiceRole.entities.ProviderExecutionJob.update(job.id, {
          status: "leased",
          worker_id: worker.worker_id,
          lease_expires_at: new Date(Date.now() + LEASE_MS).toISOString(),
          attempts: Number(job.attempts || 0) + 1,
          error_message: "",
        });
        return Response.json({
          success: true,
          job: {
            id: leased.id,
            operation: leased.operation,
            parameters,
          },
        });
      }

      const jobId = String(payload?.job_id || "");
      const jobs = await base44.asServiceRole.entities.ProviderExecutionJob.filter({ id: jobId });
      const job = jobs?.[0];
      if (!job || job.worker_id !== worker.worker_id) {
        return Response.json({ error: "Leased job not found for this worker" }, { status: 409 });
      }

      const success = payload?.success === true;
      if (job.status === (success ? "succeeded" : "failed")) {
        return Response.json({ success: true, job: publicJob(job), already_completed: true });
      }
      if (job.status !== "leased") {
        return Response.json({ error: "Job is no longer leased; reconcile its state before retrying" }, { status: 409 });
      }
      const update: Record<string, any> = {
        status: success ? "succeeded" : "failed",
        completed_at: new Date().toISOString(),
      };
      if (success) update.result = safeResult(job.operation, payload?.result || {});
      else update.error_message = safeErrorMessage(payload?.error || "Worker execution failed");
      const completed = await base44.asServiceRole.entities.ProviderExecutionJob.update(job.id, update);
      return Response.json({ success: true, job: publicJob(completed) });
    }

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (user.role !== "admin") return Response.json({ error: "Admin role required" }, { status: 403 });

    if (action === "planPilot") {
      const templateId = String(payload?.template_id || "");
      if (!/^[a-zA-Z0-9_-]{8,100}$/.test(templateId)) {
        return Response.json({ error: "Valid template_id required" }, { status: 400 });
      }
      const template = await base44.asServiceRole.entities.LabTemplate.get(templateId);
      if (!template) return Response.json({ error: "Template not found" }, { status: 404 });
      return Response.json({ success: true, assessment: pilotTemplateAssessment(template) });
    }

    if (action === "enqueue") {
      const operation = String(payload?.operation || "");
      if (!ALLOWED_OPERATIONS.has(operation)) {
        return Response.json({ error: "Unsupported Proxmox operation" }, { status: 400 });
      }
      const parameters = safeParameters(operation, payload?.parameters);
      // Until instance-owned VM allocations exist, mutations are confined to disposable VM101.
      // VM100 hosts the only worker and must never be a lifecycle target.
      if (MUTATING_OPERATIONS.has(operation) && parameters.vmid !== 101) {
        return Response.json({ error: "VM mutation is limited to the disposable VM101 pilot" }, { status: 403 });
      }
      const requestId = String(payload?.request_id || "");
      if (requestId && !/^[a-zA-Z0-9_-]{8,100}$/.test(requestId)) {
        return Response.json({ error: "Invalid request_id" }, { status: 400 });
      }
      const requestKey = requestId ? user.email + ":" + requestId : "";
      if (requestKey) {
        const prior = await base44.asServiceRole.entities.ProviderExecutionJob.filter({ request_key: requestKey }, "-created_date", 1);
        if (prior?.[0]) {
          if (prior[0].operation !== operation || JSON.stringify(prior[0].parameters || {}) !== JSON.stringify(parameters)) {
            return Response.json({ error: "request_id was already used for a different operation" }, { status: 409 });
          }
          return Response.json({ success: true, job: publicJob(prior[0]), deduplicated: true });
        }
      }
      if (MUTATING_OPERATIONS.has(operation)) {
        const active = await base44.asServiceRole.entities.ProviderExecutionJob.filter(
          { provider: "proxmox", status: { $in: ["queued", "leased"] } },
          "-created_date",
          500
        );
        const existing = (active || []).find((item: any) =>
          MUTATING_OPERATIONS.has(item.operation) && Number(item.parameters?.vmid) === parameters.vmid
        );
        if (existing) {
          if (existing.operation !== operation) {
            return Response.json({ error: "A different VM mutation is already queued or running", job: publicJob(existing) }, { status: 409 });
          }
          return Response.json({ success: true, job: publicJob(existing), deduplicated: true });
        }
      }
      const job = await base44.asServiceRole.entities.ProviderExecutionJob.create({
        provider: "proxmox",
        operation,
        parameters,
        request_key: requestKey,
        status: "queued",
        requested_by: user.email,
        attempts: 0,
      });
      return Response.json({ success: true, job: publicJob(job), deduplicated: false });
    }

    if (action === "listJobs") {
      const jobs = await base44.asServiceRole.entities.ProviderExecutionJob.list("-created_date", 30);
      return Response.json({ success: true, jobs: (jobs || []).map(publicJob) });
    }

    if (action === "getJob") {
      const jobId = String(payload?.job_id || "");
      const jobs = await base44.asServiceRole.entities.ProviderExecutionJob.filter({ id: jobId });
      const job = jobs?.[0];
      if (!job) return Response.json({ error: "Job not found" }, { status: 404 });
      return Response.json({ success: true, job: publicJob(job) });
    }

    if (action === "listWorkers") {
      const workers = await base44.asServiceRole.entities.ProviderWorker.list("-updated_date", 20);
      return Response.json({
        success: true,
        workers: (workers || []).map((worker: any) => ({
          id: worker.id,
          worker_id: worker.worker_id,
          provider: worker.provider,
          status: worker.status,
          capabilities: worker.capabilities || [],
          last_seen: worker.last_seen || null,
          metadata: {
            source_version: /^[a-zA-Z0-9._-]{1,32}$/.test(String(worker.metadata?.source_version || ""))
              ? worker.metadata.source_version : "unreported",
          },
        })),
      });
    }

    return Response.json({ error: "Unknown relay action" }, { status: 400 });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Proxmox relay failed" },
      { status: 500 }
    );
  }
});
