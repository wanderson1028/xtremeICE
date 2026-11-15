import React from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { proxmoxLearnerClient } from "@/lib/providers/proxmoxLearnerClient";

export default function AssignedProxmoxLabs({ user }) {
  const { data: labs = [] } = useQuery({
    queryKey: ["assigned-proxmox-labs", user?.id],
    queryFn: proxmoxLearnerClient.list,
    enabled: !!user?.id,
    retry: false,
  });
  if (!labs.length) return null;

  return (
    <section>
      <h2 className="text-lg font-semibold text-foreground mb-4">Assigned Proxmox Labs</h2>
      <div className="grid gap-4 md:grid-cols-2">
        {labs.map(lab => (
          <Card key={lab.assignment_id}>
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div>
                <h3 className="font-medium">{lab.title}</h3>
                {lab.run.final_score != null && (
                  <p className="text-sm text-muted-foreground">{lab.run.final_score} / 100</p>
                )}
              </div>
              <Button asChild size="sm">
                <Link to={"/LabRunnerPreview?assignmentId=" + encodeURIComponent(lab.assignment_id)}>
                  {lab.run.final_score != null ? "View result" : "Open assigned lab"}
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}
