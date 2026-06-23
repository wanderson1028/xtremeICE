import React from "react";
import { X, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import NiceAlignmentReport from "./NiceAlignmentReport";
import InstructorGuide from "./InstructorGuide";
import StudentGuide from "./StudentGuide";
import LmsOutline from "./LmsOutline";

export default function ExportResultsModal({ template, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-400" />
            <h3 className="text-white font-semibold">Export Artifacts</h3>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="overflow-y-auto p-5 space-y-4">
          <NiceAlignmentReport template={template} />
          {template.export_instructor_guide && <InstructorGuide template={template} />}
          {template.export_student_guide && <StudentGuide template={template} />}
          {template.export_lms_outline && <LmsOutline template={template} />}
        </div>
        <div className="p-5 border-t border-gray-800 flex justify-end flex-shrink-0">
          <Button onClick={onClose} className="bg-red-700 hover:bg-red-600 text-white">Done</Button>
        </div>
      </div>
    </div>
  );
}