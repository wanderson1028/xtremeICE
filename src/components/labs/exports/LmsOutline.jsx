import React from "react";
import { ClipboardList } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ExportArtifact from "./ExportArtifact";
import { buildTemplateContext } from "./exportUtils";

async function generateLmsOutline(template, modules) {
  const prompt = `You are an instructional designer. Generate an LMS-compatible course outline in Markdown format for the following lab:\n\n${buildTemplateContext(template, modules)}\n\nInclude:\n1. Course Title and Description\n2. Module Structure (sequenced lessons with objectives)\n3. Assessment Items (quizzes, hands-on tasks, rubrics)\n4. SCORM-compatible Metadata (title, duration, completion criteria)\n5. Gradebook Configuration (points, weights)\n\nFormat as clean Markdown with clear hierarchical structure.`;
  const result = await base44.integrations.Core.InvokeLLM({ prompt });
  return typeof result === "string" ? result : JSON.stringify(result, null, 2);
}

export default function LmsOutline({ template, modules }) {
  return (
    <ExportArtifact
      title="LMS Outline"
      icon={ClipboardList}
      generate={generateLmsOutline}
      template={template}
      modules={modules}
      filename={`lms-outline-${(template.title || "lab").replace(/\s+/g, "-").toLowerCase()}.md`}
    />
  );
}