import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Pencil, Trash2, GripVertical, CheckSquare, Lock } from "lucide-react";
import TaskFormDialog from "./TaskFormDialog";

const TASK_TYPE_COLORS = {
  Configuration: "bg-blue-500/20 text-blue-300",
  Verification: "bg-green-500/20 text-green-300",
  Troubleshooting: "bg-yellow-500/20 text-yellow-300",
  Analysis: "bg-purple-500/20 text-purple-300",
  Documentation: "bg-gray-500/20 text-gray-300",
  "Security Assessment": "bg-red-500/20 text-red-300",
};

export default function TaskManager({ selectedScenarioId }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [localScenarioId, setLocalScenarioId] = useState(selectedScenarioId || "");
  const queryClient = useQueryClient();

  const { data: scenarios = [] } = useQuery({
    queryKey: ["lab_scenarios"],
    queryFn: () => base44.entities.LabScenario.list("-created_date"),
  });

  const activeScenarioId = selectedScenarioId || localScenarioId;

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["lab_tasks", activeScenarioId],
    queryFn: () => base44.entities.LabTask.filter({ scenario_id: activeScenarioId }, "order"),
    enabled: !!activeScenarioId,
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.LabTask.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lab_tasks", activeScenarioId] }),
  });

  const totalPoints = tasks.reduce((sum, t) => sum + (t.points || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Select value={localScenarioId} onValueChange={setLocalScenarioId}>
            <SelectTrigger className="w-72 bg-secondary">
              <SelectValue placeholder="Select a scenario to manage tasks" />
            </SelectTrigger>
            <SelectContent>
              {scenarios.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {activeScenarioId && tasks.length > 0 && (
            <Badge className="bg-primary/20 text-primary">{totalPoints} total points</Badge>
          )}
        </div>
        {activeScenarioId && (
          <Button onClick={() => { setEditingTask(null); setDialogOpen(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Add Task
          </Button>
        )}
      </div>

      {!activeScenarioId ? (
        <Card className="bg-card border-border">
          <CardContent className="flex items-center justify-center py-16 text-muted-foreground">
            <p>Select a scenario above to manage its tasks.</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-primary" />
        </div>
      ) : tasks.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <CheckSquare className="h-12 w-12 mb-4 opacity-40" />
            <p className="text-lg font-medium">No tasks yet</p>
            <p className="text-sm">Add tasks to define what users will do in this scenario.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task, idx) => (
            <Card key={task.id} className="bg-card border-border hover:border-primary/30 transition-colors">
              <CardHeader className="py-3 px-4">
                <div className="flex items-start gap-3">
                  <GripVertical className="h-5 w-5 text-muted-foreground mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs text-muted-foreground font-mono">#{task.order}</span>
                      <CardTitle className="text-sm">{task.title}</CardTitle>
                      {!task.is_required && <Lock className="h-3 w-3 text-muted-foreground" title="Optional task" />}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <Badge className={`text-xs ${TASK_TYPE_COLORS[task.task_type]}`}>{task.task_type}</Badge>
                      <Badge className="text-xs bg-secondary text-muted-foreground">{task.points || 0} pts</Badge>
                      {task.hints?.length > 0 && <Badge className="text-xs bg-secondary text-muted-foreground">{task.hints.length} hints</Badge>}
                      {task.validation_criteria?.length > 0 && <Badge className="text-xs bg-green-500/10 text-green-400">{task.validation_criteria.length} checks</Badge>}
                    </div>
                    {task.description && <p className="text-xs text-muted-foreground mt-1.5 line-clamp-2">{task.description}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => { setEditingTask(task); setDialogOpen(true); }}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => deleteMutation.mutate(task.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}

      <TaskFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        task={editingTask}
        scenarioId={activeScenarioId}
        existingTasks={tasks}
      />
    </div>
  );
}