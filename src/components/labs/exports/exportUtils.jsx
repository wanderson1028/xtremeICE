export function downloadText(filename, content, mimeType = "text/markdown") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildTemplateContext(template) {
  const labContent = template.lab_content || {};
  const tasks = labContent.tasks || [];

  return `Lab Title: ${template.title || "Untitled"}
Description: ${template.description || "N/A"}
Difficulty: ${template.difficulty || "Beginner"}
Estimated Duration: ${template.estimated_duration_minutes || 60} minutes
NICE Category: ${template.nice_category || "N/A"}
NICE Work Role: ${template.nice_work_role || "N/A"}
NICE Task IDs: ${(template.nice_task_ids || []).join(", ") || "N/A"}
NICE TKS IDs: ${(template.nice_tks_ids || []).join(", ") || "N/A"}
Objectives: ${(template.objectives || []).join("; ") || "N/A"}
Prerequisites: ${(template.prerequisites || []).join("; ") || "N/A"}

Lab Scenario:
${labContent.scenario || "N/A"}

Lab Tasks:
${tasks.length ? tasks.map((t, i) => `${i + 1}. ${t.title}\n   ${t.instructions || "N/A"}`).join("\n") : "N/A"}

Success Criteria:
${labContent.success_criteria || "N/A"}`;
}