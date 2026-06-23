import React from "react";
import { FileCheck } from "lucide-react";
import ExportArtifact from "./ExportArtifact";

export function generateNiceReport(template) {
  const taskIds = template.nice_task_ids || [];
  const knowledgeIds = template.nice_knowledge_ids || [];
  const skillIds = template.nice_skill_ids || [];
  const objectives = template.objectives || [];
  const prerequisites = template.prerequisites || [];
  const labContent = template.lab_content || {};
  const tasks = labContent.tasks || [];

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
    `### Knowledge IDs`,
    ...(knowledgeIds.length ? knowledgeIds.map(k => `- ${k}`) : ["- None specified"]),
    ``,
    `### Skill IDs`,
    ...(skillIds.length ? skillIds.map(k => `- ${k}`) : ["- None specified"]),
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
    `## Lab Content Alignment`,
    ``,
    `### Scenario`,
    labContent.scenario || "- No scenario defined",
    ``,
    `### Tasks`,
    ...(tasks.length
      ? tasks.map((t, i) => `${i + 1}. ${t.title}`)
      : ["- No tasks defined"]),
    ``,
    `### Success Criteria`,
    labContent.success_criteria || "- No success criteria defined",
    ``,
    `---`,
    ``,
    `## Summary`,
    ``,
    `This lab template is aligned with the **${template.nice_category || "unspecified"}** NICE Framework category` +
    `${template.nice_work_role ? ` for the **${template.nice_work_role}** work role` : ""}. ` +
    `It contains ${tasks.length} task(s), covers ${taskIds.length} NICE task(s), ${knowledgeIds.length} knowledge item(s), and ${skillIds.length} skill item(s).`,
  ];

  return Promise.resolve(lines.join("\n"));
}

export default function NiceAlignmentReport({ template }) {
  return (
    <ExportArtifact
      title="NICE Alignment Report"
      icon={FileCheck}
      generate={generateNiceReport}
      template={template}
      filename={`nice-report-${(template.title || "lab").replace(/\s+/g, "-").toLowerCase()}.md`}
    />
  );
}