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

const NICE_CATEGORIES = [
  "Securely Provision",
  "Operate and Maintain",
  "Oversee and Govern",
  "Protect and Defend",
  "Analyze",
  "Collect and Operate",
  "Investigate",
];

const NICE_WORK_ROLES = {
  "Securely Provision": ["Software Developer", "Systems Requirements Planner", "System Testing and Evaluation Specialist", "Information Systems Security Developer", "Systems Developer", "Database Administrator", "Data Analyst", "Knowledge Manager", "Enterprise Architect", "Security Architect", "Research & Development Specialist", "Network Engineer"],
  "Operate and Maintain": ["Data Administrator", "Knowledge Manager", "Customer Service and Technical Support", "Network Operations Specialist", "System Administrator", "Systems Security Analyst"],
  "Oversee and Govern": ["Cyber Legal Advisor", "Privacy Officer", "Cyber Instructional Curriculum Developer", "Cyber Instructor", "Information Systems Security Manager", "Communications Security Manager", "Cyber Workforce Developer and Manager", "Executive Cyber Leadership", "Program Manager", "IT Project Manager", "Product Support Manager", "IT Investment and Portfolio Manager", "IT Program Auditor"],
  "Protect and Defend": ["Cyber Defense Analyst", "Cyber Defense Infrastructure Support Specialist", "Cyber Defense Incident Responder", "Vulnerability Assessment Analyst", "Cyber Defense Forensics Analyst"],
  "Analyze": ["All-Source Analyst", "Mission Assessment Specialist", "Exploitation Analyst", "Target Developer", "Warning Analyst", "Multi-Disciplined Language Analyst"],
  "Collect and Operate": ["All-Source Collection Manager", "All-Source Collection Requirements Manager", "Cyber Operational Planner", "Cyber Ops Specialist", "Partner Integration Planner"],
  "Investigate": ["Cyber Crime Investigator", "Law Enforcement and Counterintelligence Forensics Analyst"],
};

const DEFAULTS = {
  title: "",
  description: "",
  nice_category: "",
  nice_work_role: "",
  difficulty: "Beginner",
  estimated_duration_minutes: 60,
  passing_score: 70,
  max_attempts: 0,
  status: "draft",
  branching_enabled: false,
  objectives: [],
  prerequisites: [],
  tags: [],
};

export default function ScenarioFormDialog({ open, onClose, scenario }) {
  const [form, setForm] = useState(DEFAULTS);
  const [objectivesText, setObjectivesText] = useState("");
  const [prereqText, setPrereqText] = useState("");
  const [tagsText, setTagsText] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    if (scenario) {
      setForm({ ...DEFAULTS, ...scenario });
      setObjectivesText((scenario.objectives || []).join("\n"));
      setPrereqText((scenario.prerequisites || []).join("\n"));
      setTagsText((scenario.tags || []).join(", "));
    } else {
      setForm(DEFAULTS);
      setObjectivesText("");
      setPrereqText("");
      setTagsText("");
    }
  }, [scenario, open]);

  const saveMutation = useMutation({
    mutationFn: (data) => scenario
      ? base44.entities.LabScenario.update(scenario.id, data)
      : base44.entities.LabScenario.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["lab_scenarios"] });
      onClose();
    },
  });

  const handleSave = () => {
    const data = {
      ...form,
      objectives: objectivesText.split("\n").filter(Boolean),
      prerequisites: prereqText.split("\n").filter(Boolean),
      tags: tagsText.split(",").map(t => t.trim()).filter(Boolean),
    };
    saveMutation.mutate(data);
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const workRoles = NICE_WORK_ROLES[form.nice_category] || [];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-card border-border">
        <DialogHeader>
          <DialogTitle>{scenario ? "Edit Scenario" : "New Lab Scenario"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1">
              <Label>Title *</Label>
              <Input value={form.title} onChange={e => set("title", e.target.value)} placeholder="e.g. Configure OSPF Multi-Area Network" className="bg-secondary" />
            </div>

            <div className="space-y-1">
              <Label>NICE Category *</Label>
              <Select value={form.nice_category} onValueChange={v => { set("nice_category", v); set("nice_work_role", ""); }}>
                <SelectTrigger className="bg-secondary"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {NICE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Work Role</Label>
              <Select value={form.nice_work_role} onValueChange={v => set("nice_work_role", v)} disabled={!form.nice_category}>
                <SelectTrigger className="bg-secondary"><SelectValue placeholder="Select work role" /></SelectTrigger>
                <SelectContent>
                  {workRoles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Difficulty</Label>
              <Select value={form.difficulty} onValueChange={v => set("difficulty", v)}>
                <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Beginner", "Intermediate", "Advanced", "Expert"].map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => set("status", v)}>
                <SelectTrigger className="bg-secondary"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["draft", "published", "archived"].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Estimated Duration (minutes)</Label>
              <Input type="number" value={form.estimated_duration_minutes} onChange={e => set("estimated_duration_minutes", +e.target.value)} className="bg-secondary" />
            </div>

            <div className="space-y-1">
              <Label>Passing Score (%)</Label>
              <Input type="number" min={0} max={100} value={form.passing_score} onChange={e => set("passing_score", +e.target.value)} className="bg-secondary" />
            </div>

            <div className="space-y-1">
              <Label>Max Attempts (0 = unlimited)</Label>
              <Input type="number" min={0} value={form.max_attempts} onChange={e => set("max_attempts", +e.target.value)} className="bg-secondary" />
            </div>

            <div className="col-span-2 flex items-center gap-3 p-3 bg-secondary rounded-lg border border-border">
              <Switch checked={!!form.branching_enabled} onCheckedChange={v => set("branching_enabled", v)} />
              <div>
                <Label className="text-sm font-medium">Enable Branching Paths</Label>
                <p className="text-xs text-muted-foreground">When enabled, tasks marked as Advanced or Remediation unlock dynamically based on student performance.</p>
              </div>
            </div>

            <div className="col-span-2 space-y-1">
              <Label>Description</Label>
              <Textarea value={form.description} onChange={e => set("description", e.target.value)} rows={3} placeholder="Describe the lab scenario..." className="bg-secondary" />
            </div>

            <div className="col-span-2 space-y-1">
              <Label>Learning Objectives (one per line)</Label>
              <Textarea value={objectivesText} onChange={e => setObjectivesText(e.target.value)} rows={3} placeholder="Configure OSPF area 0&#10;Verify adjacencies&#10;Test failover" className="bg-secondary" />
            </div>

            <div className="col-span-2 space-y-1">
              <Label>Prerequisites (one per line)</Label>
              <Textarea value={prereqText} onChange={e => setPrereqText(e.target.value)} rows={2} placeholder="Basic routing knowledge&#10;Familiarity with Cisco IOS" className="bg-secondary" />
            </div>

            <div className="col-span-2 space-y-1">
              <Label>Tags (comma-separated)</Label>
              <Input value={tagsText} onChange={e => setTagsText(e.target.value)} placeholder="ospf, routing, cisco, wan" className="bg-secondary" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saveMutation.isPending || !form.title || !form.nice_category}>
            {saveMutation.isPending ? "Saving..." : "Save Scenario"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}