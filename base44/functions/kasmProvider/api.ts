const TIMEOUT_MS = 12000;

export class KasmApiError extends Error {
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

export async function kasmRequest(endpoint: string, fields: Record<string, unknown> = {}) {
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
  }).catch((error: unknown) => {
    const original = error instanceof Error ? error.message : "";
    const known = ["AbortSignal", "certificate", "TLS", "DNS", "denied", "forbidden", "permission", "blocked", "connection", "redirect", "not a function"]
      .filter((word) => original.toLowerCase().includes(word.toLowerCase()));
    throw new Error("Kasm HTTPS transport failed" + (known.length ? " (" + known.join(", ") + ")." : "."));
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

export function isMissingWorkspace(error: unknown) {
  return error instanceof KasmApiError && [200, 400, 404].includes(error.status) &&
    /^invalid kasm_id(?:\s*\([a-f0-9-]+\))?[.!]?$/i.test(error.providerMessage.trim());
}

export function workspaceUrl(relative: unknown) {
  if (typeof relative !== "string" || !relative) return "";
  const origin = kasmOrigin();
  const url = new URL(relative, origin);
  if (url.origin !== origin || url.username || url.password) return "";
  return url.href;
}
