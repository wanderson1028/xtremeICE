import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";

const DEFAULTS = {
  title: "",
  description: "",
  order: 1,
  task_type: "Configuration",
  branch_type: "standard",
  unlock_condition: { depends_on_task_id: "", trigger: "passed", score_threshold: 80 },
  points: 10,
  is_required: true,
  hints: [],
  expected_commands: [],
  validation_criteria: [],
  reference_config: "",
  depends_on_task_id: "",
};

export default function TaskFormDialog({ open, onClose, task, scenarioId, existingTasks }) {
  const [form, setForm] = useState(DEFAULTS);
  const [hintsText, setHintsText] = useState("");
  const [commandsText, setCommandsText] = useState("");
  const [criteria, setCriteria] = useState([]);
  const [newCheck, setNewCheck] = useState({ check: "", description: "", points: 5 });
  const queryClient = useQueryClient();

  const setUnlock = (k, v) => setForm(f => ({ ...f, unlock_condition: { ...f.unlock_condition, [k]: v } }));

  useEffect(() => {
    if (task) {
      setForm({ ...DEFAULTS, ...task, unlock_condition: { ...DEFAULTS.unlock_condition, ...(task.unlock_condition || {}) } });
      setHintsText((task.hints || []).join("\n"));
      setCommandsText((task.expected_commands || []).join("\n"));
      setCriteria(task.validation_criteria || []);
    } else {
      const nextOrder = existingTasks.length > 0 ? Math.max(...existingTasks.map(t => t.order)) + 1 : 1;
      setForm({ ...DEFAULTS, order: nextOrder });
      setHintsText("");
      setCommandsText("");
      setCriteria([]);
    }
    setNewCheck({ check: "", description: "", points: 5 });
  }, [task, open, existingTasks]);

  const saveMutation = useMutation({
    mutationFn: (data) => task
      ? base44.entities.LabTask.update(task.id, data)
      : base44.entities.LabTask.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab_tasks", scenarioId] });
      onClose();
    },
  });

  const handleSave = () => {
    saveMutation.mutate({
      ...form,
      scenario_id: scenarioId,
      hints: hintsText.split("\n").filter(Boolean),
      expected_commands: commandsText.split("\n").filter(Boolean),
      validation_criteria: criteria,
    });
  };

  const addCriteria = () => {
    if (!newCheck.check) return;
    setCriteria(c => [...c, { ...newCheck }]);
    setNewCheck({ check: "", description: "", points: 5 });
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const otherTasks = existingTasks.filter(t => t.id !== task?.id);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle>{task ? "Edit Task" : "New Task"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Task Title *</Label>
              <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Configure OSPF on Router-1" className="bg-secondary" />
            </div>

            <div className="space-y-1">
              <Label>Task Type</Label>
              <Select value={form.task_type} onValueChange={v => set("task_type", v)}>
                <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Configuration", "Verification", "Troubleshooting", "Analysis", "Documentation", "Security Assessment"].map(t => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Order</Label>
              <Input type="number" min={1} value={form.order} onChange={e => set("order", +e.target.value)} className="bg-secondary" />
            </div>

            <div className="space-y-1">
              <Label>Points</Label>
              <Input type="number" min={0} value={form.points} onChange={e => set("points", +e.target.value)} className="bg-secondary" />
            </div>

            <div className="space-y-1">
              <Label>Branch Type</Label>
              <Select value={form.branch_type || "standard"} onValueChange={v => set("branch_type", v)}>
                <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="standard">Standard (always visible)</SelectItem>
                  <SelectItem value="advanced">Advanced (unlocked by high performance)</SelectItem>
                  <SelectItem value="remediation">Remediation (unlocked by low performance)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {(form.branch_type === "advanced" || form.branch_type === "remediation") && (
              <div className="col-span-2 space-y-3 p-3 bg-primary/5 border border-primary/20 rounded-lg">
                <p className="text-xs font-semibold text-primary uppercase tracking-wide">Unlock Condition</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Prerequisite Task</Label>
                    <Select value={form.unlock_condition?.depends_on_task_id || ""} onValueChange={v => setUnlock("depends_on_task_id", v)}>
                      <SelectTrigger className="bg-secondary text-xs"><SelectValue placeholder="Select task..." /></SelectTrigger>
                      <SelectContent>
                        {otherTasks.filter(t => t.branch_type === "standard" || !t.branch_type).map(t => (
                          <SelectItem key={t.id} value={t.id}>#{t.order} {t.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Trigger</Label>
                    <Select value={form.unlock_condition?.trigger || "passed"} onValueChange={v => setUnlock("trigger", v)}>
                      <SelectTrigger className="bg-secondary text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="passed">Student passed prerequisite</SelectItem>
                        <SelectItem value="failed">Student failed prerequisite</SelectItem>
                        <SelectItem value="score_above">Score above threshold</SelectItem>
                        <SelectItem value="score_below">Score below threshold</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(form.unlock_condition?.trigger === "score_above" || form.unlock_condition?.trigger === "score_below") && (
                    <div className="col-span-2 space-y-1">
                      <Label className="text-xs">Score Threshold (points)</Label>
                      <Input type="number" min={0} value={form.unlock_condition?.score_threshold ?? 80} onChange={e => setUnlock("score_threshold", +e.target.value)} className="bg-secondary" />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="col-span-2 flex items-center gap-3">
              <Switch checked={form.is_required} onCheckedChange={v => set("is_required", v)} />
              <Label>Required task (must complete to pass scenario)</Label>
            </div>

            <div className="col-span-2 space-y-1">
              <Label>Instructions / Description</Label>
              <Textarea value={form.description} onChange={e => set("description", e.target.value)} rows={4} placeholder="Detailed step-by-step instructions for the user..." className="bg-secondary" />
            </div>

            <div className="col-span-2 space-y-1">
              <Label>Expected CLI Commands (one per line)</Label>
              <Textarea value={commandsText} onChange={e => setCommandsText(e.target.value)} rows={3} placeholder="router ospf 1&#10;network 10.0.0.0 0.255.255.255 area 0" className="bg-secondary font-mono text-xs" />
            </div>

            <div className="col-span-2 space-y-1">
              <Label>Hints (one per line, shown progressively)</Label>
              <Textarea value={hintsText} onChange={e => setHintsText(e.target.value)} rows={3} placeholder="Try using 'show ip ospf neighbor'&#10;Check your network statement subnet mask" className="bg-secondary" />
            </div>

            <div className="col-span-2 space-y-2">
              <Label>Validation Criteria</Label>
              <div className="space-y-2">
                {criteria.map((c, i) => (
                  <div key={i} className="flex items-center gap-2 p-2 bg-secondary rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground">{c.check}</p>
                      {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                    </div>
                    <Badge className="bg-primary/20 text-primary shrink-0">{c.points} pts</Badge>
                    <Button size="sm" variant="ghost" className="text-destructive shrink-0" onClick={() => setCriteria(cr => cr.filter((_, j) => j !== i))}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="grid grid-cols-8 gap-2">
                  <Input className="col-span-4 bg-secondary text-sm" value={newCheck.check} onChange={e => setNewCheck(c => ({ ...c, check: e.target.value }))} placeholder="Check name (e.g. ospf_neighbor_up)" />
                  <Input className="col-span-3 bg-secondary text-sm" value={newCheck.description} onChange={e => setNewCheck(c => ({ ...c, description: e.target.value }))} placeholder="Description" />
                  <Input className="col-span-1 bg-secondary text-sm" type="number" value={newCheck.points} onChange={e => setNewCheck(c => ({ ...c, points: +e.target.value }))} placeholder="Pts" />
                </div>
                <Button size="sm" variant="outline" onClick={addCriteria} disabled={!newCheck.check} className="gap-1">
                  <Plus className="h-3 w-3" /> Add Check
                </Button>
              </div>
            </div>

            <div className="col-span-2 space-y-1">
              <Label>Reference Configuration (Instructor Only)</Label>
              <Textarea value={form.reference_config} onChange={e => set("reference_config", e.target.value)} rows={4} placeholder="! Reference answer config&#10;router ospf 1&#10; network 10.0.0.0 0.255.255.255 area 0" className="bg-secondary font-mono text-xs" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending || !form.title}>
            {saveMutation.isPending ? "Saving..." : "Save Task"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}