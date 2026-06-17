import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Clock, User, Search, ChevronDown, ChevronRight } from "lucide-react";

const STATUS_CONFIG = {
  not_started: { color: "bg-gray-500/20 text-gray-300", label: "Not Started" },
  in_progress: { color: "bg-blue-500/20 text-blue-300", label: "In Progress" },
  completed: { color: "bg-green-500/20 text-green-300", label: "Completed" },
  failed: { color: "bg-red-500/20 text-red-300", label: "Failed" },
  abandoned: { color: "bg-yellow-500/20 text-yellow-300", label: "Abandoned" },
};

export default function AttemptTracker() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterScenario, setFilterScenario] = useState("all");
  const [expandedAttempt, setExpandedAttempt] = useState(null);
  const [gradingAttempt, setGradingAttempt] = useState(null);
  const [instructorNotes, setInstructorNotes] = useState("");
  const queryClient = useQueryClient();

  const { data: attempts = [], isLoading } = useQuery({
    queryKey: ["lab_attempts"],
    queryFn: () => base44.entities.LabAttempt.list("-created_date"),
  });

  const { data: scenarios = [] } = useQuery({
    queryKey: ["lab_scenarios"],
    queryFn: () => base44.entities.LabScenario.list(),
  });

  const { data: taskProgress = [] } = useQuery({
    queryKey: ["task_progress", expandedAttempt],
    queryFn: () => base44.entities.TaskProgress.filter({ attempt_id: expandedAttempt }),
    enabled: !!expandedAttempt,
  });

  const updateAttemptMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.LabAttempt.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab_attempts"] });
      setGradingAttempt(null);
    },
  });

  const scenarioMap = Object.fromEntries(scenarios.map(s => [s.id, s]));

  const filtered = attempts.filter(a => {
    const matchSearch = !search || a.user_email?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || a.status === filterStatus;
    const matchScenario = filterScenario === "all" || a.scenario_id === filterScenario;
    return matchSearch && matchStatus && matchScenario;
  });

  const openGrading = (attempt) => {
    setGradingAttempt(attempt);
    setInstructorNotes(attempt.instructor_notes || "");
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by user email..." className="pl-9 bg-secondary" />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 bg-secondary"><SelectValue placeholder="All statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterScenario} onValueChange={setFilterScenario}>
          <SelectTrigger className="w-52 bg-secondary"><SelectValue placeholder="All scenarios" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Scenarios</SelectItem>
            {scenarios.map(s => <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex items-center justify-center py-16 text-muted-foreground">No attempts found.</CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(attempt => {
            const scenario = scenarioMap[attempt.scenario_id];
            const isExpanded = expandedAttempt === attempt.id;
            const sc = STATUS_CONFIG[attempt.status] || STATUS_CONFIG.not_started;
            return (
              <Card key={attempt.id} className="bg-card border-border">
                <CardHeader
                  className="py-3 px-4 cursor-pointer"
                  onClick={() => setExpandedAttempt(isExpanded ? null : attempt.id)}
                >
                  <div className="flex flex-wrap items-center gap-3">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    <div className="flex items-center gap-2 min-w-0">
                      <User className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm font-medium truncate">{attempt.user_email}</span>
                    </div>
                    <div className="flex-1 min-w-0 text-sm text-muted-foreground truncate">
                      {scenario?.title || "Unknown Scenario"}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge className={`text-xs ${sc.color}`}>{sc.label}</Badge>
                      {attempt.score != null && (
                        <Badge className={`text-xs ${attempt.passed ? "bg-green-500/20 text-green-300" : "bg-red-500/20 text-red-300"}`}>
                          {attempt.score}%
                        </Badge>
                      )}
                      {attempt.time_elapsed_minutes && (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />{attempt.time_elapsed_minutes}m
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">Attempt #{attempt.attempt_number}</span>
                      <Button size="sm" variant="outline" onClick={e => { e.stopPropagation(); openGrading(attempt); }}>
                        Review
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent className="pt-0 px-4 pb-4">
                    <div className="border-t border-border pt-3 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground mb-2">Task Progress</p>
                      {taskProgress.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No task progress recorded yet.</p>
                      ) : taskProgress.map(tp => (
                        <div key={tp.id} className="flex items-center gap-3 p-2 bg-secondary rounded-lg">
                          {tp.status === "passed" ? <CheckCircle className="h-4 w-4 text-green-400 shrink-0" /> : tp.status === "failed" ? <XCircle className="h-4 w-4 text-red-400 shrink-0" /> : <Clock className="h-4 w-4 text-muted-foreground shrink-0" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">{tp.task_id}</p>
                            <p className="text-xs text-muted-foreground capitalize">{tp.status} • {tp.points_earned || 0} pts • {tp.hints_used || 0} hints used</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={!!gradingAttempt} onOpenChange={() => setGradingAttempt(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Attempt</DialogTitle>
          </DialogHeader>
          {gradingAttempt && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div><span className="text-muted-foreground">User:</span> <span className="font-medium">{gradingAttempt.user_email}</span></div>
                <div><span className="text-muted-foreground">Score:</span> <span className="font-medium">{gradingAttempt.score ?? "—"}%</span></div>
                <div><span className="text-muted-foreground">Status:</span> <span className="capitalize font-medium">{gradingAttempt.status}</span></div>
                <div><span className="text-muted-foreground">Passed:</span> <span className="font-medium">{gradingAttempt.passed ? "Yes" : "No"}</span></div>
              </div>
              <div className="space-y-1">
                <Label>Instructor Notes</Label>
                <Textarea value={instructorNotes} onChange={e => setInstructorNotes(e.target.value)} rows={4} placeholder="Add feedback or notes for this attempt..." className="bg-secondary" />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setGradingAttempt(null)}>Cancel</Button>
                <Button onClick={() => updateAttemptMutation.mutate({ id: gradingAttempt.id, data: { instructor_notes: instructorNotes } })} disabled={updateAttemptMutation.isPending}>
                  Save Notes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}