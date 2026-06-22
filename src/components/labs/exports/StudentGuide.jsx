import React from "react";
import { BookOpen } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ExportArtifact from "./ExportArtifact";
import { buildTemplateContext } from "./exportUtils";

async function generateStudentGuide(template, modules) {
  const prompt = `You are an expert cybersecurity educator. Generate a Student Guide in Markdown format for the following lab:\n\n${buildTemplateContext(template, modules)}\n\nInclude these sections:\n1. Lab Overview\n2. Learning Objectives\n3. Prerequisites Checklist\n4. Step-by-Step Instructions\n5. Reference Materials and Resources\n6. Knowledge Check Questions\n7. Completion Criteria\n\nFormat as clean Markdown. Write instructions clearly for a student at the ${template.difficulty || "Beginner"} level.`;
  const result = await base44.integrations.Core.InvokeLLM({ prompt });
  return typeof result === "string" ? result : JSON.stringify(result, null, 2);
}

export default function StudentGuide({ template, modules }) {
  return (
    <ExportArtifact
      title="Student Guide"
      icon={BookOpen}
      generate={generateStudentGuide}
      template={template}
      modules={modules}
      filename={`student-guide-${(template.title || "lab").replace(/\s+/g, "-").toLowerCase()}.md`}
    />
  );
}