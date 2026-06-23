import React from "react";
import { GraduationCap } from "lucide-react";
import { base44 } from "@/api/base44Client";
import ExportArtifact from "./ExportArtifact";
import { buildTemplateContext } from "./exportUtils";

async function generateInstructorGuide(template) {
  const prompt = `You are an expert cybersecurity instructor. Generate a comprehensive Instructor Guide in Markdown format for the following lab:\n\n${buildTemplateContext(template)}\n\nInclude these sections:\n1. Lab Overview\n2. Learning Objectives\n3. Instructor Preparation (setup, environment, tools)\n4. Teaching Notes (step-by-step facilitation guidance)\n5. Answer Keys and Expected Outcomes\n6. Troubleshooting Tips\n7. Assessment Rubric\n8. Discussion Questions\n\nFormat as clean Markdown.`;
  const result = await base44.integrations.Core.InvokeLLM({ prompt });
  return typeof result === "string" ? result : JSON.stringify(result, null, 2);
}

export default function InstructorGuide({ template }) {
  return (
    <ExportArtifact
      title="Instructor Guide"
      icon={GraduationCap}
      generate={generateInstructorGuide}
      template={template}
      filename={`instructor-guide-${(template.title || "lab").replace(/\s+/g, "-").toLowerCase()}.md`}
    />
  );
}