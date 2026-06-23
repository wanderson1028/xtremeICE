import React from "react";
import { FileCheck } from "lucide-react";
import ExportArtifact from "./ExportArtifact";

function generateNiceReport(template, modules) {
  const taskIds = template.nice_task_ids || [];
  const tksIds = template.nice_tks_ids || [];
  const objectives = template.objectives || [];
  const prerequisites = template.prerequisites || [];

  const lines = [
    `# NICE Alignment Report`,
    ``,
    `## Lab: ${template.title || "Untitled"}`,
    ``,
    `**Generated:** ${new Date().toLocaleString()}`,
    ``,
    `---`,
    ``,
    `## NICE Framework Mapping`,
    ``,
    `| Field | Value |`,
    `|-------|-------|`,
    `| Category | ${template.nice_category || "Not specified"} |`,
    `| Work Role | ${template.nice_work_role || "Not specified"} |`,
    `| Difficulty | ${template.difficulty || "Beginner"} |`,
    `| Estimated Duration | ${template.estimated_duration_minutes || 60} minutes |`,
    ``,
    `### Task IDs`,
    ...(taskIds.length ? taskIds.map(t => `- ${t}`) : ["- None specified"]),
    ``,
    `### TKS IDs (Task, Knowledge, Skills)`,
    ...(tksIds.length ? tksIds.map(k => `- ${k}`) : ["- None specified"]),
    ``,
    `---`,
    ``,
    `## Lab Objectives`,
    ...(objectives.length ? objectives.map((o, i) => `${i + 1}. ${o}`) : ["- None specified"]),
    ``,
    `## Prerequisites`,
    ...(prerequisites.length ? prerequisites.map((p, i) => `${i + 1}. ${p}`) : ["- None specified"]),
    ``,
    `---`,
    ``,
    `## Module Alignment`,
    ``,
    ...(modules && modules.length
      ? modules.map((m, i) =>
          `### ${i + 1}. ${m.title}\n- **Type:** ${m.type || "hands_on"}\n- **Description:** ${m.description || "N/A"}\n- **Duration:** ${m.duration_minutes || "N/A"} minutes\n- **Points:** ${m.points || 10}\n`
        )
      : ["- No modules defined"]),
    ``,
    `---`,
    ``,
    `## Summary`,
    ``,
    `This lab template is aligned with the **${template.nice_category || "unspecified"}** NICE Framework category` +
    `${template.nice_work_role ? ` for the **${template.nice_work_role}** work role` : ""}. ` +
    `It contains ${modules?.length || 0} module(s), covers ${taskIds.length} task(s), and addresses ${tksIds.length} TKS item(s).`,
  ];

  return Promise.resolve(lines.join("\n"));
}

export default function NiceAlignmentReport({ template, modules }) {
  return (
    <ExportArtifact
      title="NICE Alignment Report"
      icon={FileCheck}
      generate={generateNiceReport}
      template={template}
      modules={modules}
      filename={`nice-report-${(template.title || "lab").replace(/\s+/g, "-").toLowerCase()}.md`}
    />
  );
}