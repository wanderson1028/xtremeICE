import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import AssignedProxmoxLabs from "./AssignedProxmoxLabs";
import { kasmProviderClient } from "@/lib/providers/kasmProviderClient";

function AssignedKasmLabs({ user }) {
  const { data } = useQuery({
    queryKey: ["assigned-kasm-labs", user?.id],
    queryFn: kasmProviderClient.assignedLabs,
    enabled: !!user?.id,
    retry: false,
  });
  if (!data?.labs.length && !data?.runs.length) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold">Assigned Kasm labs</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {data.labs.map(lab => (
          <Card key={lab.template_id}>
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <h3 className="font-medium">{lab.title}</h3>
              <Button asChild size="sm">
                <Link to={"/LabRunnerPreview?templateId=" + encodeURIComponent(lab.template_id)}>Open assigned lab</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
        {data.runs.map(run => (
          <Card key={run.id}>
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div>
                <h3 className="font-medium">{run.title}</h3>
                {run.learning_outcome && <p className="text-sm text-muted-foreground">Score {run.score} / 100</p>}
              </div>
              <Button asChild size="sm" variant="outline">
                <Link to={"/LabRunnerPreview?instanceId=" + encodeURIComponent(run.id)}>
                  {run.status === "terminated" ? "View result" : "Open session"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

export default function AssignedProviderLabs({ user }) {
  return (
    <>
      <AssignedKasmLabs user={user} />
      <AssignedProxmoxLabs user={user} />
    </>
  );
}
