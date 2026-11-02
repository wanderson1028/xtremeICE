export const VALIDATION_TITLE = "AWS Guest Validation Self-Test (Design Studio)";
export const TASK_ID = "aws_guest_path_self_test";
export const CHECKS = [
  { check: "present_file", path: "/var/tmp/design-studio-poc/proof.txt", expected: true },
  { check: "missing_file", path: "/var/tmp/design-studio-poc/missing.txt", expected: false },
] as const;
export function validationTasks() {
  return [{ id: TASK_ID, title: "Verify guest path checks", order: 1, task_type: "Verification", points: 2, is_required: true,
    description: "System self-test: verify a seeded file passes and an absent file fails.",
    validation_criteria: CHECKS.map(c => ({ check: c.check, description: `Verify ${c.path} is a file`, points: 1,
      runtime_validator: { type: "path_exists", path: c.path, path_kind: "file", resource_id: "res_aws_boot_poc" } })) }];
}
export function isValidationTemplate(template: any) {
  return template?.title === VALIDATION_TITLE;
}
export function validValidationTasks(template: any) {
  const tasks = template?.lab_content?.tasks;
  if (!Array.isArray(tasks) || tasks.length !== 1 || tasks[0].id !== TASK_ID) return false;
  const criteria = tasks[0].validation_criteria;
  return Array.isArray(criteria) && criteria.length === CHECKS.length && CHECKS.every(c => {
    const matches = criteria.filter((item: any) => item.check === c.check);
    const v = matches[0]?.runtime_validator;
    return matches.length === 1 && v?.type === "path_exists" && v.path === c.path && v.path_kind === "file" && v.resource_id === "res_aws_boot_poc";
  });
}
export async function digest(value: string) {
  return Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))))
    .map(b => b.toString(16).padStart(2, "0")).join("");
}
export function validationUserData(runId: string, nonce: string) {
  if (!/^[a-f0-9]{16,32}$/.test(runId) || !/^[a-f0-9]{32}$/.test(nonce)) throw new Error("INVALID_PROBE_BINDING");
  const lines = ["#!/bin/bash", "set -eu", "shutdown -h +105", "mkdir -p /var/tmp/design-studio-poc",
    "printf 'Design Studio validation fixture\\n' > /var/tmp/design-studio-poc/proof.txt",
    "rm -f /var/tmp/design-studio-poc/missing.txt"];
  for (const c of CHECKS) lines.push(`if test -f '${c.path}'; then result=pass; else result=fail; fi`,
    `echo "DSV1:${runId}:${nonce}:${c.check}:$result" > /dev/console`);
  lines.push(`echo "DESIGN_STUDIO_POC_READY:${runId}" > /dev/console`);
  return lines.join("\n") + "\n";
}
export async function readProbe(consoleText: string, runId: string, tokenHash: string, checkId: string) {
  if (!CHECKS.some(c => c.check === checkId) || consoleText.length > 2_000_000) return null;
  const outcomes = new Set<string>();
  for (const line of consoleText.split("\n")) {
    const match = line.trim().match(/^DSV1:([a-f0-9]{16,32}):([a-f0-9]{32}):(present_file|missing_file):(pass|fail)$/);
    if (match && match[1] === runId && match[3] === checkId && await digest(match[2]) === tokenHash) outcomes.add(match[4]);
  }
  if (outcomes.size !== 1) return null;
  return [...outcomes][0] === "pass";
}
