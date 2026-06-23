import React, { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { FileCheck, GraduationCap, BookOpen, ClipboardList, Eye } from "lucide-react";
import ArtifactPreviewModal from "@/components/labs/exports/ArtifactPreviewModal";
import { generateInstructorGuide } from "@/components/labs/exports/InstructorGuide";
import { generateStudentGuide } from "@/components/labs/exports/StudentGuide";
import { generateLmsOutline } from "@/components/labs/exports/LmsOutline";

const OPTIONAL_EXPORTS = [
  { key: "export_instructor_guide", label: "Instructor Guide", icon: GraduationCap, desc: "Teaching notes, answer keys, and facilitation guidance", generate: generateInstructorGuide, filename: "instructor-guide-preview.md" },
  { key: "export_student_guide", label: "Student Guide", icon: BookOpen, desc: "Step-by-step instructions and reference materials for learners", generate: generateStudentGuide, filename: "student-guide-preview.md" },
  { key: "export_lms_outline", label: "LMS Outline", icon: ClipboardList, desc: "Course structure ready for import into an LMS", generate: generateLmsOutline, filename: "lms-outline-preview.md" },
];

export default function StepExportConfig({ form, updateForm }) {
  const [preview, setPreview] = useState(null);

  return (
    <div className="space-y-6">
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
        {OPTIONAL_EXPORTS.map(({ key, label, icon: Icon, desc, generate, filename }) => (
          <div key={key} className="flex items-center justify-between p-4 bg-gray-800/50 border border-gray-700/50 rounded-lg">
            <div className="flex items-center gap-3">
              <Icon className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-white text-sm font-medium">{label}</p>
                <p className="text-gray-400 text-xs mt-0.5">{desc}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" className="text-gray-300 border-gray-600 hover:bg-gray-700 h-8"
                onClick={() => setPreview({ label, icon: Icon, generate, filename })}>
                <Eye className="h-3.5 w-3.5 mr-1" /> Preview
              </Button>
              <Switch checked={form[key] || false} onCheckedChange={v => updateForm({ [key]: v })} />
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 bg-gray-800/30 border border-gray-700/30 rounded-lg">
        <p className="text-gray-400 text-xs">
          Use <span className="text-gray-200 font-medium">Preview</span> to review a guide on-screen before saving.
          Enabled exports will also be available for download after you save the template.
        </p>
      </div>

      {preview && (
        <ArtifactPreviewModal
          title={preview.label}
          icon={preview.icon}
          generate={preview.generate}
          template={form}
          filename={preview.filename}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  );
}