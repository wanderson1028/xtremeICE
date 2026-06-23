import React from "react";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { FileCheck, GraduationCap, BookOpen, ClipboardList } from "lucide-react";
import ExportArtifact from "@/components/labs/exports/ExportArtifact";
import { generateInstructorGuide } from "@/components/labs/exports/InstructorGuide";
import { generateStudentGuide } from "@/components/labs/exports/StudentGuide";
import { generateLmsOutline } from "@/components/labs/exports/LmsOutline";
import { generateNiceReport } from "@/components/labs/exports/NiceAlignmentReport";

const GUIDES = [
  { label: "NICE Alignment Report", icon: FileCheck, desc: "Framework mapping data and summary", generate: generateNiceReport, filename: "nice-alignment-report.md" },
  { label: "Instructor Guide", icon: GraduationCap, desc: "Teaching notes, answer keys, and facilitation guidance", generate: generateInstructorGuide, filename: "instructor-guide.md" },
  { label: "Student Guide", icon: BookOpen, desc: "Step-by-step instructions and reference materials for learners", generate: generateStudentGuide, filename: "student-guide.md" },
  { label: "LMS Outline", icon: ClipboardList, desc: "Course structure ready for import into an LMS", generate: generateLmsOutline, filename: "lms-outline.md" },
];

export default function StepExportConfig({ form, updateForm }) {
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

      {/* Inline guides */}
      <div className="space-y-3">
        <Label className="text-gray-300 block mb-2">Generated Artifacts</Label>
        {GUIDES.map(({ label, icon: Icon, desc, generate, filename }) => (
          <div key={label} className="space-y-1">
            <div className="flex items-center gap-2 px-1">
              <Icon className="h-4 w-4 text-gray-400" />
              <p className="text-white text-sm font-medium">{label}</p>
              <p className="text-gray-500 text-xs">— {desc}</p>
            </div>
            <ExportArtifact
              title={label}
              icon={Icon}
              generate={generate}
              template={form}
              filename={filename}
            />
          </div>
        ))}
      </div>
    </div>
  );
}