import { base44 } from "@/api/base44Client";

async function invoke(action, payload = {}) {
  try {
    const response = await base44.functions.invoke("proxmoxLearner", { action, ...payload });
    const body = response?.data ?? response;
    if (body?.ok !== true) throw new Error(body?.error || "Proxmox lab request failed.");
    return body;
  } catch (error) {
    throw new Error(error?.response?.data?.error || error?.message || "Proxmox lab request failed.");
  }
}

export const proxmoxLearnerClient = {
  catalog: () => invoke("catalog").then(result => result.labs),
  list: () => invoke("list").then(result => result.labs),
  view: (assignmentId) => invoke("view", { assignment_id: assignmentId }).then(result => result.lab),
  act: (assignmentId, action, fields = {}) =>
    invoke(action, { assignment_id: assignmentId, ...fields }).then(result => result.lab),
};
