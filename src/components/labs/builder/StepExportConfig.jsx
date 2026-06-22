import React from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileCheck, GraduationCap, BookOpen, ClipboardList } from "lucide-react";

const OPTIONAL_EXPORTS = [
  { key: "export_instructor_guide", label: "Instructor Guide", icon: GraduationCap, desc: "Teaching notes, answer keys, and facilitation guidance" },
  { key: "export_student_guide", label: "Student Guide", icon: BookOpen, desc: "Step-by-step instructions and reference materials for learners" },
  { key: "export_lms_outline", label: "LMS Outline", icon: ClipboardList, desc: "Course structure ready for import into an LMS" },
];

export default function StepExportConfig({ form, updateForm }) {
  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold text-white">Export Configuration</h2>
      <p className="text-gray-400 text-sm">
        Configure which artifacts to generate for this lab template. The NICE Alignment Report is always generated.
      </p>

      {/* NICE Report — always on */}
      <div className="flex items-center justify-between p-4 bg-green-950/20 border border-green-800/30 rounded-lg">
        <div className="flex items-center gap-3">
          <FileCheck className="h-5 w-5 text-green-400" />
          <div>
            <p className="text-white text-sm font-medium">NICE Alignment Report</p>
            <p className="text-gray-400 text-xs mt-0.5">Auto-generated with framework mapping data</p>
          </div>
        </div>
        <Badge className="bg-green-800/50 text-green-200 border-0">Auto</Badge>
      </div>

      {/* Optional exports */}
      <div className="space-y-3">
        <Label className="text-gray-300 block mb-2">Optional Artifacts</Label>
        {OPTIONAL_EXPORTS.map(({ key, label, icon: Icon, desc }) => (
          <div key={key} className="flex items-center justify-between p-4 bg-gray-800/50 border border-gray-700/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-white text-sm font-medium">{label}</p>
                <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
              </div>
            </div>
            <Switch checked={form[key] || false} onCheckedChange={v => updateForm({ [key]: v })} />
          </div>
        ))}
      </div>

      <div className="p-4 bg-gray-800/30 border border-gray-700/30 rounded-lg">
        <p className="text-gray-400 text-xs">
          Artifacts are generated after you save the template. Enabled exports will appear in a results panel
          where you can review and download each one.
        </p>
      </div>
    </div>
  );
}