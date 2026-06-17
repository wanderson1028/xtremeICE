import React from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

export default function NiceCategoryPicker({ category, workRole, onCategoryChange, onWorkRoleChange }) {
  const roles = NICE_WORK_ROLES[category] || [];

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-gray-300 mb-1.5 block text-sm">NICE Category *</Label>
        <Select value={category || ""} onValueChange={(v) => { onCategoryChange(v); onWorkRoleChange(""); }}>
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="Select a category..." />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {category && (
        <div>
          <Label className="text-gray-300 mb-1.5 block text-sm">Work Role</Label>
          <Select value={workRole || ""} onValueChange={onWorkRoleChange}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Select a work role..." />
            </SelectTrigger>
            <SelectContent>
              {roles.map(r => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}