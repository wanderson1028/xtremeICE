import { base44 } from "@/api/base44Client";

async function invoke(action, payload = {}) {
  try {
    const response = await base44.functions.invoke("runtimeValidation", {
      action,
      ...payload,
    });

    const body = response?.data ?? response;
    if (body?.error) throw new Error(body.error);
    return body;
  } catch (error) {
    const backendMessage =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error?.data?.error ||
      error?.message ||
      "Runtime validation failed.";
    throw new Error(backendMessage);
  }
}

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

function outcomeFromAttempt(attempt) {
  const evidence = attempt?.evidence || {};
  const pathKind = evidence.path_kind || "path";
  const label = pathKind === "directory" ? "Directory" : pathKind === "file" ? "File" : "Path";
  const path = evidence.requested_path || "configured path";
  const passed = attempt?.passed === true;
  const isCommandResult = attempt?.validator_type === "command_result";

  return {
    passed,
    validator_type: attempt?.validator_type || "path_exists",
    validated_at: attempt?.updated_date || new Date().toISOString(),
    message: attempt?.message || (isCommandResult
      ? `File mode ${passed ? "matches" : "does not match"} ${evidence.expected_output || "expected value"}: ${path}`
      : (passed ? `${label} exists: ${path}` : `${label} not found: ${path}`)),
    evidence: {
      ...evidence,
      path,
      path_kind: pathKind,
      observed: attempt?.observed || (isCommandResult ? "unavailable" : (passed ? "exists" : "missing")),
      callback_received: evidence.callback_received === true,
    },
  };
}

async function validateCriterion({ instanceId, taskId, checkId }) {
  const response = await invoke("validateCriterion", {
    instance_id: instanceId,
    task_id: taskId,
    check_id: checkId,
  });

  if (!response?.pending || !response?.attempt_id) return response;

  for (let poll = 0; poll < 20; poll += 1) {
    await wait(1000);
    const inspection = await invoke("getAttempt", { attempt_id: response.attempt_id });
    const attempt = inspection?.attempt;
    if (attempt?.status === "completed") {
      return {
        success: true,
        attempt_id: attempt.id,
        outcome: outcomeFromAttempt(attempt),
        diagnostic: attempt,
      };
    }
    if (attempt?.status === "failed" || attempt?.status === "expired") {
      const error = new Error(attempt.message || `Runtime validation ${attempt.status}.`);
      error.diagnostic = attempt;
      throw error;
    }
  }

  const error = new Error("The Kasm probe was dispatched, but its callback is still pending.");
  error.diagnostic = response.diagnostic;
  throw error;
}

export const runtimeValidationClient = {
  validateCriterion,
  getAttempt: (attemptId) => invoke("getAttempt", { attempt_id: attemptId }),
  listAttempts: (instanceId) => invoke("listAttempts", { instance_id: instanceId }),
};
