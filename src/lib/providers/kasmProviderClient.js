import { base44 } from "@/api/base44Client";

async function invoke(action, payload = {}) {
  try {
    const response = await base44.functions.invoke("kasmProvider", { action, ...payload });
    const body = response?.data ?? response;
    if (body?.error) throw new Error(body.error);
    return body?.data ?? body;
  } catch (error) {
    throw new Error(error?.response?.data?.error || error?.message || "Kasm lab operation failed.");
  }
}

export const kasmProviderClient = {
  assignedLabs: () => invoke("assignedLabs"),
  catalog: () => invoke("catalog"),
  getImages: () => invoke("getImages"),
  inspectWorkspace: (instanceId) => invoke("inspectWorkspace", { instance_id: instanceId }),
  launch: (templateId) => invoke("launch", { template_id: templateId }),
  status: (instanceId) => invoke("status", { instance_id: instanceId }),
  stop: (instanceId) => invoke("stop", { instance_id: instanceId }),
  finish: (instanceId) => invoke("finish", { instance_id: instanceId }),
  task: (action, instanceId, taskId, fields = {}) =>
    invoke(action, { instance_id: instanceId, task_id: taskId, ...fields }),
  createPreview: (templateId) => invoke("createPreview", { template_id: templateId }),
  savePreview: (instanceId, patch) => invoke("savePreview", { instance_id: instanceId, patch }),
  stopPreview: (instanceId) => invoke("stopPreview", { instance_id: instanceId }),
};
