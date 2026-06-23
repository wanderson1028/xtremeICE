import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, X, CheckCircle2, Circle, Target, Layers, ClipboardList, GraduationCap } from "lucide-react";

const NICE_WORK_ROLES = {
  "Securely Provision": ["Software Developer", "Enterprise Architect", "Systems Security Architect", "Security Control Assessor", "R&D Specialist", "Cyber Policy and Strategy Planner"],
  "Operate and Maintain": ["System Administrator", "Network Operations Specialist", "IT Project Manager", "Database Administrator", "Knowledge Manager", "Technical Support Specialist"],
  "Oversee and Govern": ["ISSO", "Security Manager", "CISO", "Cyber Legal Advisor", "Privacy Officer", "Risk Analyst"],
  "Protect and Defend": ["Cyber Defense Analyst", "Cyber Defense Infrastructure Support Specialist", "Incident Responder", "Vulnerability Assessment Analyst", "Cyber Defense Forensics Analyst"],
  "Analyze": ["All-Source Analyst", "Mission Assessment Specialist", "Target Network Analyst", "Threat/Warning Analyst", "Exploitation Analyst"],
  "Collect and Operate": ["All-Source Collection Manager", "SIGINT Collector", "Cyber Operator", "Cyber Intel Planner"],
  "Investigate": ["Cyber Crime Investigator", "Law Enforcement Counterintelligence Forensics Analyst", "Multi-Disciplined Language Analyst"],
};
const CATEGORIES = Object.keys(NICE_WORK_ROLES);

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-white truncate">{value || "—"}</p>
        {sub && <p className="text-xs text-gray-500 truncate">{sub}</p>}
      </div>
    </div>
  );
}

function TagEditor({ label, items = [], onChange, placeholder }) {
  const [input, setInput] = useState("");
  const add = () => {
    if (input.trim()) { onChange([...items, input.trim()]); setInput(""); }
  };
  return (
    <div>
      <Label className="text-gray-300 mb-1.5 block text-sm">{label}</Label>
      <div className="flex gap-2 mb-2">
        <Input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && (e.preventDefault(), add())}
          placeholder={placeholder}
          className="bg-gray-800 border-gray-700 text-white text-sm" />
        <Button onClick={add} size="sm" className="bg-gray-700 hover:bg-gray-600 text-white border-0 px-3">
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex flex-wrap gap-1.5 min-h-[28px]">
        {items.length === 0 ? (
          <p className="text-gray-600 text-xs italic">No items added yet</p>
        ) : (
          items.map((item, i) => (
            <Badge key={i} className="bg-gray-700 text-gray-200 border-0 flex items-center gap-1 text-xs">
              {item}
              <button onClick={() => onChange(items.filter((_, j) => j !== i))}>
                <X className="h-2.5 w-2.5" />
              </button>
            </Badge>
          ))
        )}
      </div>
    </div>
  );
}

export default function Step5NiceMapping({ form, updateForm }) {
  const category = form.nice_category;
  const workRole = form.nice_work_role;
  const taskIds = form.nice_task_ids || [];
  const tksIds = form.nice_tks_ids || [];
  const roles = NICE_WORK_ROLES[category] || [];

  const completedFields = [category, workRole, taskIds.length > 0, tksIds.length > 0];
  const completedCount = completedFields.filter(Boolean).length;
  const completionPct = Math.round((completedCount / 4) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-end gap-2 text-sm">
        {completionPct === 100 ? (
          <CheckCircle2 className="h-4 w-4 text-green-400" />
        ) : (
          <Circle className="h-4 w-4 text-gray-600" />
        )}
        <span className="text-gray-300 font-medium">{completionPct}% Complete</span>
      </div>

      {/* Progress Bar */}
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 rounded-full transition-all duration-500"
          style={{ width: `${completionPct}%` }}
        />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard icon={Layers} label="Category" value={category} accent="bg-blue-500/15 text-blue-400" />
        <StatCard icon={Target} label="Work Role" value={workRole} accent="bg-cyan-500/15 text-cyan-400" />
        <StatCard icon={ClipboardList} label="Task IDs" value={`${taskIds.length} mapped`} accent="bg-amber-500/15 text-amber-400" />
        <StatCard icon={GraduationCap} label="TKS IDs" value={`${tksIds.length} mapped`} accent="bg-purple-500/15 text-purple-400" />
      </div>

      {/* Category & Work Role Panel */}
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Layers className="h-4 w-4 text-blue-400" />
          <h3 className="text-sm font-semibold text-white">Category & Work Role</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-gray-300 mb-1.5 block text-sm">NICE Category *</Label>
            <Select value={category || ""} onValueChange={(v) => { updateForm({ nice_category: v, nice_work_role: "" }); }}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder="Select a category..." />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-gray-300 mb-1.5 block text-sm">Work Role</Label>
            <Select value={workRole || ""} onValueChange={v => updateForm({ nice_work_role: v })}>
              <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                <SelectValue placeholder={category ? "Select a work role..." : "Select category first"} />
              </SelectTrigger>
              <SelectContent>
                {roles.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Task & TKS Panel */}
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Tasks & TKS</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <TagEditor
            label="Task IDs"
            items={taskIds}
            onChange={v => updateForm({ nice_task_ids: v })}
            placeholder="e.g., T0001"
          />
          <TagEditor
            label="TKS IDs (Task, Knowledge, Skills)"
            items={tksIds}
            onChange={v => updateForm({ nice_tks_ids: v })}
            placeholder="e.g., K0001, S0001"
          />
        </div>
      </div>
    </div>
  );
}