import { createClientFromRequest } from "npm:@base44/sdk@0.8.38";

const TIMEOUT_MS = 12000;

class KasmApiError extends Error {
  constructor(readonly status: number, readonly providerMessage = "") {
    super(`Kasm request failed (HTTP ${status}).`);
  }
}

function configured(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing Kasm configuration: ${name}`);
  return value;
}

function kasmOrigin() {
  const url = new URL(configured("KASM_BASE_URL"));
  if (url.protocol !== "https:" || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("KASM_BASE_URL must be an HTTPS origin.");
  }
  return url.origin;
}

async function kasmRequest(endpoint: string, fields: Record<string, unknown> = {}) {
  const cfId = Deno.env.get("CF_ACCESS_CLIENT_ID");
  const cfSecret = Deno.env.get("CF_ACCESS_CLIENT_SECRET");
  if (Boolean(cfId) !== Boolean(cfSecret)) throw new Error("Incomplete Cloudflare Access configuration.");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  const response = await fetch(`${kasmOrigin()}/api/public/${endpoint}`, {
    method: "POST",
    redirect: "manual",
    signal: controller.signal,
    headers: {
      "Content-Type": "application/json",
      ...(cfId && cfSecret ? { "CF-Access-Client-Id": cfId, "CF-Access-Client-Secret": cfSecret } : {}),
    },
    body: JSON.stringify({
      ...fields,
      api_key: configured("KASM_API_KEY_ID"),
      api_key_secret: configured("KASM_API_KEY_SECRET"),
    }),
  }).finally(() => clearTimeout(timer));
  let body;
  try {
    body = await response.json();
  } catch {
    throw new KasmApiError(response.status);
  }
  if (!response.ok || !body || typeof body !== "object" || body.error_message || body.error) {
    throw new KasmApiError(response.status, String(body?.error_message || ""));
  }
  return body;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function bytesToHex(bytes: Uint8Array) {
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function sha256(value: string) {
  const encoded = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return bytesToHex(new Uint8Array(digest));
}

function createToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

const APP_ID = "69a0a5a90473fac0aa3ea135";
function callbackAddress() {
  const route = "/api/apps/" + APP_ID + "/functions/runtimeValidation";
  const target = new URL(Deno.env.get("KASM_LEARNER_CALLBACK_URL") || ("https://base44.app" + route));
  const allowedHost = target.hostname === "base44.app" || target.hostname.endsWith(".base44.app") ||
    target.hostname === "app.base44.com";
  if (target.protocol !== "https:" || !allowedHost || target.username || target.password ||
      target.port || target.pathname !== route || target.search || target.hash) {
    throw new Error("Kasm callback must use the Base44 function URL for this Xtreme I.C.E. app.");
  }
  return target.href;
}

function buildProbeCommand() {
  const script = [
    "set -u",
    "TRACE_DIR=/home/kasm-user/.runtime-validation",
    "mkdir -p \"$TRACE_DIR\"",
    "TRACE_FILE=\"$TRACE_DIR/${VALIDATION_ATTEMPT_ID}.json\"",
    "printf '%s\\n' \"{\\\"attempt_id\\\":\\\"$VALIDATION_ATTEMPT_ID\\\",\\\"stage\\\":\\\"probe_started\\\",\\\"validator_type\\\":\\\"$VALIDATION_TYPE\\\"}\" > \"$TRACE_FILE\"",
    "PASSED=false",
    "OBSERVED=missing",
    "if [ \"$VALIDATION_TYPE\" = command_result ]; then",
    "  OBSERVED=unavailable",
    "  if [ -f \"$VALIDATION_PATH\" ] && MODE=$(stat -c '%a' -- \"$VALIDATION_PATH\" 2>/dev/null); then OBSERVED=\"$MODE\"; [ \"$MODE\" = \"$VALIDATION_EXPECTED_OUTPUT\" ] && PASSED=true; fi",
    "else",
    "  case \"$VALIDATION_KIND\" in file) [ -f \"$VALIDATION_PATH\" ] && PASSED=true ;; directory) [ -d \"$VALIDATION_PATH\" ] && PASSED=true ;; *) [ -e \"$VALIDATION_PATH\" ] && PASSED=true ;; esac",
    "  [ \"$PASSED\" = true ] && OBSERVED=exists",
    "fi",
    "printf '%s\\n' \"{\\\"attempt_id\\\":\\\"$VALIDATION_ATTEMPT_ID\\\",\\\"stage\\\":\\\"probe_complete\\\",\\\"validator_type\\\":\\\"$VALIDATION_TYPE\\\",\\\"observed\\\":\\\"$OBSERVED\\\",\\\"passed\\\":$PASSED}\" > \"$TRACE_FILE\"",
    "CALLBACK_BODY=\"{\\\"action\\\":\\\"callback\\\",\\\"attempt_id\\\":\\\"$VALIDATION_ATTEMPT_ID\\\",\\\"token\\\":\\\"$VALIDATION_TOKEN\\\",\\\"passed\\\":$PASSED,\\\"observed\\\":\\\"$OBSERVED\\\"}\"",
    "HTTP_STATUS=$(curl -sS --max-time 15 -o /dev/null -w '%{http_code}' -H 'Content-Type: application/json' -H \"X-App-Id: $VALIDATION_APP_ID\" -H \"Base44-Functions-Version: $VALIDATION_FUNCTIONS_VERSION\" -d \"$CALLBACK_BODY\" \"$VALIDATION_CALLBACK_URL\") || HTTP_STATUS=transport_error",
    "unset CALLBACK_BODY VALIDATION_TOKEN",
    "printf '%s\\n' \"{\\\"attempt_id\\\":\\\"$VALIDATION_ATTEMPT_ID\\\",\\\"stage\\\":\\\"callback_finished\\\",\\\"validator_type\\\":\\\"$VALIDATION_TYPE\\\",\\\"observed\\\":\\\"$OBSERVED\\\",\\\"passed\\\":$PASSED,\\\"callback_http_status\\\":\\\"$HTTP_STATUS\\\"}\" > \"$TRACE_FILE\"",
  ].join("\n");
  return "bash -c '" + script.replaceAll("'", "'\"'\"'") + "'";
}

function publicAttempt(attempt: any) {
  if (!attempt) return null;
  const evidence = attempt.evidence || {};
  const expired = attempt.status === "pending" && Date.parse(attempt.expires_at || "") < Date.now();
  return {
    id: attempt.id,
    instance_id: attempt.instance_id,
    task_id: attempt.task_id,
    check_id: attempt.check_id,
    validator_type: attempt.validator_type,
    status: expired ? "expired" : attempt.status,
    passed: attempt.passed === true,
    observed: attempt.observed || null,
    message: expired ? "No callback arrived before this attempt expired." : (attempt.message || ""),
    evidence: {
      provider: evidence.provider || "kasm",
      requested_path: evidence.requested_path || "",
      path_kind: evidence.path_kind || "any",
      command_key: evidence.command_key || null,
      expected_output: evidence.expected_output || null,
      workspace_result_path: evidence.workspace_result_path || "",
      callback_self_test: evidence.callback_self_test ? {
        ok: evidence.callback_self_test.ok === true,
        status: evidence.callback_self_test.status || null,
      } : null,
      dispatch_acknowledged: evidence.dispatch_acknowledged === true,
      observed: evidence.observed || null,
      callback_received: evidence.callback_received === true,
      stages: evidence.stages || {},
    },
    expires_at: attempt.expires_at,
    created_date: attempt.created_date,
    updated_date: attempt.updated_date,
  };
}

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);

  try {
    const payload = await req.json();
    const action = String(payload?.action || "");

    if (action === "ping") {
      return Response.json({ ok: true, function: "runtimeValidation" });
    }

    if (action === "callback") {
      const token = String(payload?.token || "");
      if (!token) return Response.json({ error: "Missing callback token" }, { status: 400 });

      const tokenHash = await sha256(token);
      const attempts = await base44.asServiceRole.entities.RuntimeValidationAttempt.filter({
        token_hash: tokenHash,
        status: "pending",
      });
      const attempt = attempts?.[0];

      if (!attempt || attempt.evidence?.provider !== "kasm") {
        return Response.json({ error: "Validation attempt not found or already used" }, { status: 404 });
      }

      const expiresAt = Date.parse(attempt.expires_at || "");
      if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) {
        await base44.asServiceRole.entities.RuntimeValidationAttempt.update(attempt.id, {
          status: "expired",
          message: "Validation callback arrived after the attempt expired.",
        });
        return Response.json({ error: "Validation attempt expired" }, { status: 410 });
      }

      if (payload?.attempt_id && String(payload.attempt_id) !== attempt.id) {
        return Response.json({ error: "Validation attempt mismatch" }, { status: 404 });
      }

      const rawObserved = String(payload?.observed || "");
      const observed = attempt.validator_type === "command_result"
        ? (/^[0-7]{3,4}$/.test(rawObserved) ? rawObserved : "unavailable")
        : (rawObserved === "exists" ? "exists" : "missing");
      const expectedOutput = String(attempt.evidence?.expected_output || "");
      const passed = payload?.passed === true && (
        attempt.validator_type === "command_result"
          ? observed === expectedOutput
          : observed === "exists"
      );
      const message = attempt.validator_type === "command_result"
        ? (passed ? `File mode is ${observed}, as expected.` : `File mode is ${observed}; expected ${expectedOutput}.`)
        : (passed ? "Runtime path check passed." : "Runtime path check failed.");
      await base44.asServiceRole.entities.RuntimeValidationAttempt.update(attempt.id, {
        status: "completed",
        passed,
        observed,
        message,
        evidence: {
          ...(attempt.evidence || {}),
          observed,
          callback_received: true,
          stages: {
            ...(attempt.evidence?.stages || {}),
            probe_execution: "completed",
            callback: "received",
          },
        },
      });

      return Response.json({ received: true });
    }

    const user = await base44.auth.me();
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    if (action === "getAttempt") {
      const attemptId = String(payload?.attempt_id || "");
      if (!attemptId) return Response.json({ error: "attempt_id is required" }, { status: 400 });

      const attempts = await base44.asServiceRole.entities.RuntimeValidationAttempt.filter({ id: attemptId });
      const attempt = attempts?.[0];
      if (!attempt) return Response.json({ error: "Validation attempt not found" }, { status: 404 });
      if (user.role !== "admin" && attempt.user_email !== user.email) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }

      return Response.json({ success: true, attempt: publicAttempt(attempt) });
    }

    if (action === "listAttempts") {
      const instanceId = String(payload?.instance_id || "");
      if (!instanceId) return Response.json({ error: "instance_id is required" }, { status: 400 });
      const instances = await base44.asServiceRole.entities.KasmLearnerRun.filter({ id: instanceId });
      const instance = instances?.[0];
      if (!instance) return Response.json({ error: "LabInstance not found" }, { status: 404 });
      if (user.role !== "admin" && instance.user_email !== user.email) {
        return Response.json({ error: "Forbidden" }, { status: 403 });
      }

      const attempts = await base44.asServiceRole.entities.RuntimeValidationAttempt.filter(
        { instance_id: instanceId }, "-created_date", 20
      );
      return Response.json({ success: true, attempts: (attempts || []).map(publicAttempt) });
    }

    if (action !== "validateCriterion") {
      return Response.json({ error: "Unknown runtime validation action" }, { status: 400 });
    }

    const instanceId = String(payload?.instance_id || "");
    const taskId = String(payload?.task_id || "");
    const checkId = String(payload?.check_id || "");
    if (!instanceId || !taskId || !checkId) {
      return Response.json(
        { error: "instance_id, task_id, and check_id are required" },
        { status: 400 }
      );
    }

    const instances = await base44.asServiceRole.entities.KasmLearnerRun.filter({ id: instanceId });
    const instance = instances?.[0];
    if (!instance) return Response.json({ error: "LabInstance not found" }, { status: 404 });

    if (user.role !== "admin" && instance.user_email !== user.email) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    if (instance.provider !== "kasm" || instance.status !== "running" ||
      instance.runtime_authority !== "server_kasm_v1" || instance.cleanup_state ||
      Date.parse(instance.expires_at || "") <= Date.now()) {
      return Response.json(
        { error: "Runtime validation currently requires a running Kasm-backed LabInstance." },
        { status: 409 }
      );
    }

    const sessionId = instance.provider_session_id || instance.kasm_session_id;
    const providerUserRef = instance.provider_user_ref || instance.kasm_user_id;
    if (!sessionId || !providerUserRef) {
      return Response.json({ error: "Kasm session handles are missing." }, { status: 409 });
    }

    const tasks = instance.template_snapshot?.lab_content?.tasks || [];
    const task = tasks.find((item: any) => item?.id === taskId);
    const criterion = task?.validation_criteria?.find((item: any) => item?.check === checkId);
    if (!task || !criterion) {
      return Response.json({ error: "Task or validation criterion not found in frozen snapshot." }, { status: 404 });
    }

    const validator = criterion.runtime_validator;
    const validatorType = String(validator?.type || "");
    if (!["path_exists", "command_result"].includes(validatorType)) {
      return Response.json(
        { error: "This criterion does not have a supported runtime validator." },
        { status: 400 }
      );
    }

    const path = String(validator.path || "").trim();
    if (!path.startsWith("/") || path.includes("\0")) {
      return Response.json({ error: "Runtime validation requires a valid absolute path." }, { status: 400 });
    }

    const pathKind = ["file", "directory"].includes(validator.path_kind)
      ? validator.path_kind
      : "any";
    const commandKey = validatorType === "command_result" ? String(validator.command_key || "") : "";
    const expectedOutput = validatorType === "command_result" ? String(validator.expected_output || "").trim() : "";
    if (validatorType === "command_result" && (commandKey !== "file_mode" || !/^[0-7]{3,4}$/.test(expectedOutput))) {
      return Response.json(
        { error: "command_result currently supports only file_mode with a 3- or 4-digit octal expected output." },
        { status: 400 }
      );
    }

    if (user.role !== "admin") {
      const assignments = await base44.asServiceRole.entities.UserLabAssignment.filter({
        user_email: user.email, lab_id: instance.template_id, lab_type: "kasm_template", service_key: "lab_scenarios",
      }, "-created_date", 1);
      if (!assignments.length) return Response.json({ error: "Lab assignment was revoked." }, { status: 403 });
    }
    const callbackUrl = callbackAddress();
    const token = createToken();
    const tokenHash = await sha256(token);
    const expiresAt = new Date(Date.now() + 60_000).toISOString();

    const attempt = await base44.asServiceRole.entities.RuntimeValidationAttempt.create({
      instance_id: instance.id,
      user_email: instance.user_email,
      task_id: taskId,
      check_id: checkId,
      validator_type: validatorType,
      status: "pending",
      token_hash: tokenHash,
      expires_at: expiresAt,
      evidence: {
        provider: "kasm",
        requested_path: path,
        path_kind: pathKind,
        ...(commandKey ? { command_key: commandKey, expected_output: expectedOutput } : {}),
      },
    });

    const functionsVersion = req.headers.get("Base44-Functions-Version") || "preview";

    let callbackSelfTest: { ok: boolean; status?: number; body?: string; error?: string } = { ok: false };
    try {
      const selfTestResponse = await fetch(callbackUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-App-Id": APP_ID,
          "Base44-Functions-Version": functionsVersion,
        },
        body: JSON.stringify({ action: "ping" }),
      });
      const selfTestBody = await selfTestResponse.text();
      callbackSelfTest = {
        ok: selfTestResponse.ok,
        status: selfTestResponse.status,
        body: selfTestBody.slice(0, 300),
      };
    } catch (error) {
      callbackSelfTest = {
        ok: false,
        error: error instanceof Error ? error.message : "Callback self-test failed",
      };
    }

    await base44.asServiceRole.entities.RuntimeValidationAttempt.update(attempt.id, {
      evidence: {
        provider: "kasm",
        requested_path: path,
        path_kind: pathKind,
        ...(commandKey ? { command_key: commandKey, expected_output: expectedOutput } : {}),
        callback_url: callbackUrl,
        callback_self_test: callbackSelfTest,
      },
    });

    if (!callbackSelfTest.ok) {
      await base44.asServiceRole.entities.RuntimeValidationAttempt.update(attempt.id, {
        status: "failed",
        message: `Base44 callback endpoint self-test failed${callbackSelfTest.status ? ` with HTTP ${callbackSelfTest.status}` : ""}.`,
      });
      return Response.json(
        {
          error: `Base44 callback endpoint is not reachable${callbackSelfTest.status ? ` (HTTP ${callbackSelfTest.status})` : ""}.`,
          callback_diagnostic: callbackSelfTest,
        },
        { status: 502 }
      );
    }

    const workspaceResultPath = `/home/kasm-user/.runtime-validation/${attempt.id}.json`;
    const dispatchEvidence = {
      provider: "kasm",
      requested_path: path,
      path_kind: pathKind,
      ...(commandKey ? { command_key: commandKey, expected_output: expectedOutput } : {}),
      callback_url: callbackUrl,
      callback_self_test: callbackSelfTest,
      workspace_result_path: workspaceResultPath,
      stages: {
        callback_preflight: "passed",
        dispatch: "requested",
        probe_execution: "pending",
        callback: "pending",
      },
    };

    try {
      await kasmRequest("exec_command_kasm", {
        kasm_id: sessionId,
        user_id: providerUserRef,
        exec_config: {
          cmd: buildProbeCommand(),
          workdir: "/home/kasm-user",
          privileged: false,
          environment: {
            VALIDATION_PATH: path,
            VALIDATION_KIND: pathKind,
            VALIDATION_TYPE: validatorType,
            VALIDATION_EXPECTED_OUTPUT: expectedOutput,
            VALIDATION_TOKEN: token,
            VALIDATION_ATTEMPT_ID: attempt.id,
            VALIDATION_CALLBACK_URL: callbackUrl,
            VALIDATION_APP_ID: APP_ID,
            VALIDATION_FUNCTIONS_VERSION: functionsVersion,
          },
        },
      });

      const dispatchAccepted = true;
      const latestRows = await base44.asServiceRole.entities.RuntimeValidationAttempt.filter({ id: attempt.id });
      const latestAttempt = latestRows?.[0];
      const latestEvidence = latestAttempt?.evidence || {};
      await base44.asServiceRole.entities.RuntimeValidationAttempt.update(attempt.id, {
        evidence: {
          ...dispatchEvidence,
          ...latestEvidence,
          dispatch_acknowledged: dispatchAccepted,
          stages: {
            ...dispatchEvidence.stages,
            ...(latestEvidence.stages || {}),
            dispatch: dispatchAccepted ? "acknowledged" : "rejected",
          },
        },
      });

      if (!dispatchAccepted) {
        throw new Error("Kasm rejected the validation probe dispatch.");
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kasm validation probe could not be dispatched.";
      await base44.asServiceRole.entities.RuntimeValidationAttempt.update(attempt.id, {
        status: "failed",
        message,
        evidence: {
          ...dispatchEvidence,
          stages: {
            ...dispatchEvidence.stages,
            dispatch: "failed",
          },
        },
      });
      return Response.json({ error: message, attempt_id: attempt.id, stage: "dispatch" }, { status: 502 });
    }

    let completed: any = null;
    for (let poll = 0; poll < 24; poll += 1) {
      await sleep(500);
      const current = await base44.asServiceRole.entities.RuntimeValidationAttempt.filter({ id: attempt.id });
      if (current?.[0]?.status !== "pending") {
        completed = current[0];
        break;
      }
    }

    if (!completed) {
      return Response.json(
        {
          success: true,
          pending: true,
          attempt_id: attempt.id,
          stage: "callback_pending",
          diagnostic: publicAttempt({
            ...attempt,
            evidence: {
              ...dispatchEvidence,
              dispatch_acknowledged: true,
              stages: {
                ...dispatchEvidence.stages,
                dispatch: "acknowledged",
              },
            },
          }),
        },
        { status: 202 }
      );
    }

    const passed = completed.passed === true;
    return Response.json({
      success: true,
      attempt_id: attempt.id,
      outcome: {
        passed,
        validator_type: validatorType,
        validated_at: completed.updated_date || new Date().toISOString(),
        message: validatorType === "command_result"
          ? (passed ? `File mode matches ${expectedOutput}: ${path}` : `File mode is ${completed.observed || "unavailable"}; expected ${expectedOutput}: ${path}`)
          : (passed
            ? `${pathKind === "directory" ? "Directory" : pathKind === "file" ? "File" : "Path"} exists: ${path}`
            : `${pathKind === "directory" ? "Directory" : pathKind === "file" ? "File" : "Path"} not found: ${path}`),
        evidence: {
          ...publicAttempt(completed)?.evidence,
          resource_id: validator.resource_id || null,
          path,
          observed: completed.observed || (validatorType === "command_result" ? "unavailable" : (passed ? "exists" : "missing")),
          callback_received: true,
        },
      },
      diagnostic: publicAttempt(completed),
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Runtime validation failed" },
      { status: 500 }
    );
  }
});
