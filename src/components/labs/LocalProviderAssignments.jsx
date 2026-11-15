import React, { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { kasmProviderClient } from "@/lib/providers/kasmProviderClient";
import { proxmoxLearnerClient } from "@/lib/providers/proxmoxLearnerClient";

const providers = [
  { name: "Kasm", type: "kasm_template", catalog: () => kasmProviderClient.catalog().then(result => result.labs) },
  { name: "Proxmox", type: "proxmox_template", catalog: proxmoxLearnerClient.catalog },
];
const assignmentScope = { service_key: "lab_scenarios", lab_type: { $in: providers.map(provider => provider.type) } };
const assignmentKey = ["local-provider-assignments"];

export default function LocalProviderAssignments({ users }) {
  const [template, setTemplate] = useState("");
  const [learner, setLearner] = useState("");
  const cache = useQueryClient();

  const catalogs = useQuery({
    queryKey: ["local-provider-catalogs"],
    queryFn: async () => {
      const results = await Promise.allSettled(providers.map(provider => provider.catalog()));
      return {
        labs: results.flatMap((result, index) => {
          const provider = providers[index];
          return result.status === "fulfilled" ? result.value.map(lab => ({
            ...lab, provider: provider.name, type: provider.type, key: provider.type + ":" + lab.template_id,
          })) : [];
        }),
        unavailable: results.flatMap((result, index) => result.status === "rejected" ? [providers[index].name] : []),
      };
    },
  });
  const assignments = useQuery({
    queryKey: assignmentKey,
    queryFn: () => base44.entities.UserLabAssignment.filter(assignmentScope, "-created_date", 100),
  });

  const selectedLab = catalogs.data?.labs.find(lab => lab.key === template);
  const selectedUser = users.find(user => user.id === learner);
  const operation = useMutation({
    mutationFn: async (request) => {
      if (request.id) return base44.entities.UserLabAssignment.delete(request.id);
      const assignment = {
        user_email: request.user.email, lab_id: request.lab.template_id,
        lab_type: request.lab.type, service_key: assignmentScope.service_key,
      };
      const existing = await base44.entities.UserLabAssignment.filter(assignment, "-created_date", 1);
      return existing[0] || base44.entities.UserLabAssignment.create(assignment);
    },
    onSuccess: () => cache.invalidateQueries({ queryKey: assignmentKey }),
  });

  return (
    <section className="space-y-4 rounded-xl border border-gray-700 bg-gray-900 p-6">
      <h2 className="text-xl font-semibold">Kasm and Proxmox assignments</h2>
      <form className="grid items-end gap-3 md:grid-cols-[1fr_1fr_auto]" onSubmit={event => {
        event.preventDefault();
        if (selectedLab && selectedUser) operation.mutate({ lab: selectedLab, user: selectedUser });
      }}>
        <label className="block">Published lab
          <select className="mt-2 block w-full rounded border border-gray-600 bg-gray-950 p-3" value={template}
            onChange={event => setTemplate(event.target.value)} disabled={operation.isPending}>
            <option value="">Choose a provider lab</option>
            {catalogs.data?.labs.map(lab => <option key={lab.key} value={lab.key}>{lab.provider} · {lab.title}</option>)}
          </select>
        </label>
        <label className="block">Learner
          <select className="mt-2 block w-full rounded border border-gray-600 bg-gray-950 p-3" value={learner}
            onChange={event => setLearner(event.target.value)} disabled={operation.isPending}>
            <option value="">Choose an existing app user</option>
            {users.map(user => <option key={user.id} value={user.id}>{user.name} · {user.email}</option>)}
          </select>
        </label>
        <Button type="submit" disabled={!selectedLab || !selectedUser || operation.isPending}>Assign lab</Button>
      </form>
      {catalogs.isSuccess && !catalogs.data.labs.length && <p>No published Kasm or Proxmox labs are currently available.</p>}
      {!!catalogs.data?.unavailable.length && <p role="alert">Catalog unavailable for {catalogs.data.unavailable.join(", ")}.</p>}
      {(operation.error || assignments.error) && <p role="alert">{(operation.error || assignments.error).message}</p>}
      {operation.isSuccess && <p role="status">Assignments updated.</p>}
      {assignments.data?.map(row => {
        const lab = catalogs.data?.labs.find(item => item.template_id === row.lab_id && item.type === row.lab_type);
        const provider = providers.find(item => item.type === row.lab_type);
        return (
          <div key={row.id} className="flex items-center justify-between gap-4 rounded border border-gray-700 p-3">
            <div><p>{lab?.title || provider?.name + " lab"}</p><p className="text-sm text-gray-400">{row.user_email}</p></div>
            <Button type="button" variant="outline" disabled={operation.isPending} onClick={() => {
              if (window.confirm("Revoke this provider lab assignment?")) operation.mutate({ id: row.id });
            }}>Revoke access</Button>
          </div>
        );
      })}
    </section>
  );
}
