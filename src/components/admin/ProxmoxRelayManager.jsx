import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { RefreshCw, Server } from "lucide-react";

async function relay(action, payload = {}) {
  const response = await base44.functions.invoke("proxmoxRelay", { action, ...payload });
  const body = response?.data ?? response;
  if (body?.error) throw new Error(body.error);
  return body;
}

function formatTime(value) {
  return value ? new Date(value).toLocaleString() : "Never";
}

export default function ProxmoxRelayManager() {
  const queryClient = useQueryClient();
  const [templateId, setTemplateId] = useState("");
  const templatesQuery = useQuery({
    queryKey: ["proxmox-pilot-templates"],
    queryFn: () => base44.entities.LabTemplate.list("-updated_date", 100),
  });
  const planPilot = useMutation({ mutationFn: (id) => relay("planPilot", { template_id: id }) });
  const jobsQuery = useQuery({
    queryKey: ["proxmox-relay-jobs"],
    queryFn: () => relay("listJobs"),
    refetchInterval: 3000,
  });
  const workersQuery = useQuery({
    queryKey: ["proxmox-relay-workers"],
    queryFn: () => relay("listWorkers"),
    refetchInterval: 5000,
  });
  const enqueue = useMutation({
    mutationFn: ({ operation, parameters = {}, request_id }) => relay("enqueue", { operation, parameters, request_id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["proxmox-relay-jobs"] }),
  });

  const jobs = jobsQuery.data?.jobs || [];
  const workers = workersQuery.data?.workers || [];
  const busy = enqueue.isPending;
  const vm101MutationPending = jobs.some((job) =>
    ["queued", "leased"].includes(job.status) &&
    ["vm_start", "vm_stop"].includes(job.operation) &&
    Number(job.parameters?.vmid) === 101
  );
  const queue = (operation, parameters = {}) =>
    enqueue.mutate({ operation, parameters, request_id: crypto.randomUUID() });

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Server className="h-5 w-5 text-blue-600" />
              Proxmox Relay
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Outbound worker queue. Proxmox credentials remain on VM100 and are never returned to the browser.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => {
              jobsQuery.refetch();
              workersQuery.refetch();
            }}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </Button>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button disabled={busy} onClick={() => queue("inventory")}>
            Read inventory
          </Button>
          <Button disabled={busy} variant="outline" onClick={() => queue("vm_status", { vmid: 100 })}>
            VM100 worker status
          </Button>
          <Button disabled={busy} variant="outline" onClick={() => queue("vm_status", { vmid: 101 })}>
            VM101 status
          </Button>
          <Button disabled={busy || vm101MutationPending} variant="outline" onClick={() => queue("vm_start", { vmid: 101 })}>
            Start VM101
          </Button>
          <Button disabled={busy || vm101MutationPending} variant="destructive" onClick={() => queue("vm_stop", { vmid: 101 })}>
            Graceful shutdown VM101
          </Button>
        </div>
        {enqueue.error && <p className="mt-3 text-sm text-red-600">{enqueue.error.message}</p>}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm space-y-3">
        <h3 className="font-semibold text-gray-900">Proxmox lab preflight</h3>
        <p className="text-sm text-muted-foreground">
          Read-only compatibility check. This does not reserve a VM, clone a template, or launch a lab.
        </p>
        <div className="flex flex-wrap gap-2">
          <select
            className="h-10 min-w-64 rounded-md border border-input bg-background px-3 text-sm"
            value={templateId}
            onChange={(event) => { setTemplateId(event.target.value); planPilot.reset(); }}
          >
            <option value="">Select a lab template...</option>
            {(templatesQuery.data || []).map((template) => (
              <option key={template.id} value={template.id}>
                {template.title || template.id} ({template.status || "draft"})
              </option>
            ))}
          </select>
          <Button variant="outline" disabled={!templateId || planPilot.isPending} onClick={() => planPilot.mutate(templateId)}>
            Check compatibility
          </Button>
        </div>
        {templatesQuery.error && <p className="text-sm text-red-600">Could not load templates.</p>}
        {planPilot.error && <p className="text-sm text-red-600">{planPilot.error.message}</p>}
        {planPilot.data?.assessment && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm space-y-2">
            <p className="font-medium">
              Template {planPilot.data.assessment.compatible ? "fits the current pilot shape" : "is not compatible with the current pilot"}.
            </p>
            {(planPilot.data.assessment.reasons || []).map((reason) => <p key={reason}>• {reason}</p>)}
            <p className="font-medium text-amber-800">Provisioning is not ready:</p>
            {(planPilot.data.assessment.provisioning_blockers || []).map((reason) => <p key={reason}>• {reason}</p>)}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900">Workers</h3>
        {workers.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No registered worker is reporting yet.</p>
        ) : (
          <div className="mt-3 grid gap-3">
            {workers.map((worker) => (
              <div key={worker.id} className="rounded-lg border border-gray-200 p-3 text-sm">
                <div className="flex flex-wrap justify-between gap-2">
                  <span className="font-medium">{worker.worker_id}</span>
                  <span className={worker.status === "active" && worker.last_seen && Date.now() - Date.parse(worker.last_seen) < 60000 ? "text-green-700" : "text-amber-700"}>
                    {worker.status !== "active" ? worker.status : (worker.last_seen && Date.now() - Date.parse(worker.last_seen) < 60000 ? "Checking in" : "No recent heartbeat")}
                  </span>
                </div>
                <p className="mt-1 text-muted-foreground">Last seen: {formatTime(worker.last_seen)}</p>
                <p className="mt-1 text-muted-foreground">Worker source: {worker.metadata?.source_version || "Not reported by installed worker"}</p>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h3 className="font-semibold text-gray-900">Recent jobs</h3>
        {jobs.length === 0 ? (
          <p className="mt-2 text-sm text-muted-foreground">No Proxmox jobs have been queued.</p>
        ) : (
          <div className="mt-3 space-y-3">
            {jobs.map((job) => (
              <details key={job.id} className="rounded-lg border border-gray-200 p-3">
                <summary className="cursor-pointer text-sm">
                  <span className="font-medium">{job.operation}</span>
                  <span className="ml-2 text-muted-foreground">{job.status}</span>
                  <span className="ml-2 text-xs text-muted-foreground">{formatTime(job.created_date)}</span>
                </summary>
                <div className="mt-3 space-y-2 text-xs">
                  <p><span className="font-medium">Job ID:</span> {job.id}</p>
                  <p><span className="font-medium">Worker:</span> {job.worker_id || "Not leased"}</p>
                  {job.error_message && <p className="text-red-600">{job.error_message}</p>}
                  {job.result && (
                    <pre className="max-h-80 overflow-auto rounded bg-slate-950 p-3 text-slate-100">
                      {JSON.stringify(job.result, null, 2)}
                    </pre>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
