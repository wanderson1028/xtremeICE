import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { proxmoxLearnerClient } from "@/lib/providers/proxmoxLearnerClient";
import { useAuth } from "@/lib/AuthContext";

const path = "/opt/design-studio-proof/permissions.txt";
const commands = new Map([
  ["id", "identity"],
  ["stat -c %a " + path, "stat"],
  ["chmod 600 " + path, "chmod"],
  ["test-isolation", "isolation"],
]);
const statuses = {
  idle: "Ready to launch",
  queued: "Launch queued",
  provisioning: "Preparing your VM",
  active: "Lab running",
  cleanup_pending: "Saving result and removing lab",
  finished: "Finished",
  expired: "Expired",
  failed: "Lab closed",
};

export default function AssignedProxmoxLab({ assignmentId }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const queryKey = ["proxmox-assignment", assignmentId, user?.id];
  const [terminal, setTerminal] = useState("");
  const [inputError, setInputError] = useState("");
  const labQuery = useQuery({
    queryKey,
    queryFn: () => proxmoxLearnerClient.view(assignmentId),
    enabled: !!user?.id,
    retry: false,
    refetchInterval: query => (
      ["queued", "provisioning", "active", "cleanup_pending"].includes(query.state.data?.run?.stage)
        ? 2200 : false
    ),
  });

  const mutation = useMutation({
    mutationFn: ({ action, ...args }) => proxmoxLearnerClient.act(assignmentId, action, args),
    onMutate: () => qc.cancelQueries({ queryKey }),
    onSuccess: (lab) => {
      qc.setQueryData(queryKey, lab);
      void qc.invalidateQueries({ queryKey: ["assigned-proxmox-labs", user?.id] });
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });
  const lab = labQuery.data;
  const run = lab?.run;
  const blocked = mutation.isPending ||
    (run?.command_request && run.command_request !== run.command_done) ||
    (run?.grade_request && run.grade_request !== run.grade_done);

  function submit(event) {
    event.preventDefault();
    const command = commands.get(terminal.trim());
    if (!command) {
      setInputError("Enter one of the available lab commands.");
      return;
    }
    setInputError("");
    setTerminal("");
    mutation.mutate({ action: "terminal", command });
  }

  return (
    <main className="mx-auto max-w-4xl space-y-5 p-6">
      <Button variant="ghost" size="sm" asChild><Link to="/StudentDashboard">Back to My Lab Progress</Link></Button>
      {labQuery.isLoading && <p>Loading assigned lab…</p>}
      {labQuery.error && <p role="alert" className="text-destructive">{labQuery.error.message}</p>}
      {user?.id && <p data-testid="identity" className="text-sm text-muted-foreground">{user.full_name || user.email} · {user.role}</p>}
      {lab && (
        <div data-testid="run" data-run-id={run.id || ""} data-assignment-id={assignmentId} data-stage={run.stage} className="space-y-5">
          <header className="space-y-2">
            <Badge variant="secondary">Proxmox</Badge>
            <h1 className="text-2xl font-bold">{lab.title}</h1>
          </header>
          <Card>
            <CardContent className="space-y-4 p-5">
              <p role="status" data-testid="stage" className="font-semibold">{statuses[run.stage]}</p>
              {lab.task_title && <h2 className="text-lg font-medium">{lab.task_title}</h2>}
              {lab.instructions && <p className="whitespace-pre-wrap text-muted-foreground">{lab.instructions}</p>}
              {lab.can_launch && <Button disabled={mutation.isPending} onClick={() => mutation.mutate({ action: "launch" })}>Launch lab</Button>}
              {lab.can_operate && (
                <>
                  <p className="text-sm text-muted-foreground">Expires at {new Date(run.expires_at).toLocaleTimeString()}.</p>
                  <div className="rounded-lg bg-muted p-4">
                    <p className="font-medium">Lab terminal</p>
                    <pre data-testid="terminal-output" className="mt-2 whitespace-pre-wrap font-mono text-sm">
                      {run.command_request && run.command_request !== run.command_done
                        ? "Running in your VM…" : run.command_output || "Enter a command to begin."}
                    </pre>
                    <form className="mt-3 flex flex-wrap gap-2" onSubmit={submit}>
                      <input aria-label="Lab command" autoComplete="off" spellCheck={false}
                        value={terminal} onChange={event => setTerminal(event.target.value)}
                        className="min-w-48 flex-1 rounded-md border border-input bg-background px-3 font-mono text-sm" />
                      <Button type="submit" disabled={blocked || !terminal.trim()}>Run command</Button>
                    </form>
                    <details className="mt-3 text-sm">
                      <summary>Available commands</summary>
                      <ul className="mt-2 space-y-1 break-all font-mono">
                        {[...commands.keys()].map(command => <li key={command}>{command}</li>)}
                      </ul>
                    </details>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button disabled={blocked} onClick={() => mutation.mutate({ action: "grade" })}>Check grade</Button>
                    <Button variant="outline" disabled={blocked || run.score == null} onClick={() => mutation.mutate({ action: "finish" })}>Finish lab</Button>
                  </div>
                </>
              )}
              {(inputError || mutation.error) && <p role="alert" className="text-destructive">{inputError || mutation.error.message}</p>}
              {(run.final_score != null || run.score != null) && (
                <div className="rounded-lg border p-4">
                  <p className="text-sm text-muted-foreground">{run.final_score == null ? "Latest grade" : "Final grade"}</p>
                  <p data-testid="score" className="text-xl font-semibold">{run.final_score ?? run.score} / 100</p>
                  <p data-testid="file-mode" className="text-sm text-muted-foreground">File mode {run.result_mode ?? run.last_mode}</p>
                </div>
              )}
              {run.cleanup_verified && <p data-testid="cleanup" className="text-sm">VM, disk, and lab network removal verified.</p>}
            </CardContent>
          </Card>
        </div>
      )}
    </main>
  );
}
