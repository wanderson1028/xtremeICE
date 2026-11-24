import { KasmApiError, kasmRequest } from "./api.ts";
import { catalog, hasAssignment, kasmEnabled, listAssigned } from "./learnerAccess.ts";
import { finish, launch, ownedInstance, preview, RequestError, requestCleanup, status, sweep, taskAction } from "./lifecycle.ts";

const writeActions = new Set(["applyValidation", "hint", "saveTask", "submitTask", "finish", "stop"]);
const previewActions = new Set(["createPreview", "savePreview", "stopPreview"]);
const runningActions = new Set(["status", ...writeActions]);
const locks = new Map<string, Promise<unknown>>();

async function inOrder<T>(key: string, operation: () => Promise<T>): Promise<T> {
  const pending = locks.get(key) || Promise.resolve();
  const next = pending.catch(() => {}).then(operation);
  locks.set(key, next);
  try {
    return await next;
  } finally {
    if (locks.get(key) === next) locks.delete(key);
  }
}

export async function handleKasm(base44: any, request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const action = body?.action;
    if (action === "execCommand" || action === "requestKasm" || action === "getKasmStatus" || action === "destroyKasm") {
      throw new RequestError(403, "Use a Design Studio lab instance for Kasm operations.");
    }
    const user = await base44.auth.me().catch(() => null);
    if (!user) throw new RequestError(401, "Sign in to continue.");
    const db = base44.asServiceRole.entities;
    if (action === "assignedLabs") {
      return Response.json({ success: true, data: await listAssigned(db, user) });
    }
    if (action === "catalog") {
      if (user.role !== "admin") throw new RequestError(403, "Administrator access required.");
      return Response.json({ success: true, data: await catalog(db) });
    }
    if (action === "getImages") {
      if (user.role !== "admin") throw new RequestError(403, "Administrator access required.");
      const response = await kasmRequest("get_images");
      const images = Array.isArray(response.images) ? response.images.map((image: Record<string, unknown>) =>
        Object.fromEntries(["image_id", "friendly_name", "name", "description", "enabled", "cores", "memory", "image_src", "image_type"]
          .filter((key) => Object.hasOwn(image, key)).map((key) => [key, image[key]]))) : [];
      return Response.json({ success: true, data: { images } });
    }
    if (action === "inspectWorkspace") {
      if (user.role !== "admin") throw new RequestError(403, "Administrator access required.");
      const row = await ownedInstance(db, user, body.instance_id, "kasm", true);
      const session = row.provider_session_id || row.kasm_session_id;
      const owner = row.provider_user_ref || row.kasm_user_id;
      if (!session || !owner) throw new RequestError(409, "The stored workspace identity is incomplete.");
      const response = await kasmRequest("get_kasms").catch(() => {
        throw new RequestError(502, "Kasm inventory could not be read. Check Sessions View permission.");
      });
      if (!Array.isArray(response.kasms)) throw new RequestError(502, "Kasm returned no workspace inventory.");
      const found = response.kasms.some((item: Record<string, unknown>) => item.kasm_id === session && item.user_id === owner);
      return Response.json({ success: true, data: { present: found, workspace_count: response.kasms.length } });
    }
    if (action === "sweep") {
      if (user.role !== "admin") throw new RequestError(403, "Administrator access required.");
      return Response.json({ success: true, data: await sweep(db) });
    }
    if (action === "launch") {
      if (!await kasmEnabled(db)) throw new RequestError(403, "Kasm learner labs are disabled.");
      const data = await inOrder(`launch:${user.email}`, () => launch(db, user, body.template_id));
      return Response.json({ success: true, data });
    }
    if (previewActions.has(action)) {
      const data = await preview(db, user, action, body);
      return Response.json({ success: true, data });
    }
    if (!runningActions.has(action)) throw new RequestError(400, "Unknown Kasm lab action.");
    const data = await inOrder(`instance:${body.instance_id}`, async () => {
      const row = await ownedInstance(db, user, body.instance_id);
      if (action === "status") {
        if (!await hasAssignment(db, user, row.template_id)) return requestCleanup(db, row, "assignment_revoked");
        return status(db, row);
      }
      if (action === "stop") return requestCleanup(db, row, "stopped");
      if (action === "finish") return finish(db, row);
      if (!await hasAssignment(db, user, row.template_id)) throw new RequestError(403, "Lab assignment was revoked.");
      return taskAction(db, row, body, action);
    });
    return Response.json({ success: true, data });
  } catch (error) {
    const status = error instanceof RequestError ? error.status : 502;
    const hint = error instanceof KasmApiError
      ? `Kasm returned HTTP ${error.status}.`
      : error instanceof Error && (error.message.startsWith("Missing Kasm configuration:") || error.message.startsWith("Kasm HTTPS transport failed") ||
        error.message === "Incomplete Cloudflare Access configuration.")
        ? error.message
        : error instanceof Error && (error.name === "TimeoutError" || error.name === "TypeError")
          ? "Kasm HTTPS request failed: " + error.name + "."
          : "The Kasm lab operation could not be confirmed.";
    const message = error instanceof RequestError ? error.message : hint;
    return Response.json({ error: message }, { status });
  }
}
