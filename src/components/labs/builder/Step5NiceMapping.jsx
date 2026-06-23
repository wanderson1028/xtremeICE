import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Circle, Target, Layers, ClipboardList, BookOpen, Wrench } from "lucide-react";
import { NICE_TASKS, NICE_KNOWLEDGE, NICE_SKILLS } from "@/lib/niceDataset";
import NiceIdPicker from "@/components/labs/builder/NiceIdPicker";

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

function mergeDatasets(localArr, dbArr) {
  const map = new Map();
  for (const item of localArr) map.set(item.id, item);
  if (dbArr) for (const item of dbArr) map.set(item.id, item);
  return Array.from(map.values());
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 flex items-center gap-3">
      <div className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 uppercase tracking-wide">{label}</p>
        <p className="text-sm font-semibold text-white truncate">{value || "—"}</p>
      </div>
    </div>
  );
}

export default function Step5NiceMapping({ form, updateForm }) {
  const category = form.nice_category;
  const workRole = form.nice_work_role;
  const taskIds = form.nice_task_ids || [];
  const knowledgeIds = form.nice_knowledge_ids || [];
  const skillIds = form.nice_skill_ids || [];
  const roles = NICE_WORK_ROLES[category] || [];

  // Load the active NICE framework version from the database
  const { data: settings } = useQuery({
    queryKey: ["nice-settings"],
    queryFn: () => base44.entities.NiceAppSettings.filter({ setting_key: "global" }),
  });

  const activeVersionId = settings?.[0]?.active_version_id;

  const { data: activeVersion } = useQuery({
    queryKey: ["nice-version", activeVersionId],
    queryFn: () => base44.entities.NiceFrameworkVersion.get(activeVersionId),
    enabled: !!activeVersionId,
  });

  // Merge DB dataset (priority) with local static fallback
  const allTasks = mergeDatasets(NICE_TASKS, activeVersion?.tasks);
  const allKnowledge = mergeDatasets(NICE_KNOWLEDGE, activeVersion?.knowledge);
  const allSkills = mergeDatasets(NICE_SKILLS, activeVersion?.skills);

  const completedFields = [category, workRole, taskIds.length > 0, knowledgeIds.length > 0, skillIds.length > 0];
  const completedCount = completedFields.filter(Boolean).length;
  const completionPct = Math.round((completedCount / 5) * 100);

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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard icon={Layers} label="Category" value={category} accent="bg-blue-500/15 text-blue-400" />
        <StatCard icon={Target} label="Work Role" value={workRole} accent="bg-cyan-500/15 text-cyan-400" />
        <StatCard icon={ClipboardList} label="Tasks" value={`${taskIds.length} mapped`} accent="bg-amber-500/15 text-amber-400" />
        <StatCard icon={BookOpen} label="Knowledge" value={`${knowledgeIds.length} mapped`} accent="bg-purple-500/15 text-purple-400" />
        <StatCard icon={Wrench} label="Skills" value={`${skillIds.length} mapped`} accent="bg-green-500/15 text-green-400" />
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

      {/* Task, Knowledge & Skills Panel */}
      <div className="bg-gray-800/30 border border-gray-700/50 rounded-xl p-5 space-y-5">
        <div className="flex items-center gap-2">
          <ClipboardList className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Tasks, Knowledge & Skills</h3>
        </div>
        <NiceIdPicker
          label="Task IDs"
          dataset={allTasks}
          items={taskIds}
          onChange={v => updateForm({ nice_task_ids: v })}
          placeholder="Search tasks... (e.g., T0163)"
        />
        <div className="border-t border-gray-700/50" />
        <NiceIdPicker
          label="Knowledge IDs"
          dataset={allKnowledge}
          items={knowledgeIds}
          onChange={v => updateForm({ nice_knowledge_ids: v })}
          placeholder="Search knowledge... (e.g., K0001)"
        />
        <div className="border-t border-gray-700/50" />
        <NiceIdPicker
          label="Skill IDs"
          dataset={allSkills}
          items={skillIds}
          onChange={v => updateForm({ nice_skill_ids: v })}
          placeholder="Search skills... (e.g., S0001)"
        />
      </div>
    </div>
  );
}