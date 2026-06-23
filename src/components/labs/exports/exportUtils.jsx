export function downloadText(filename, content, mimeType = "text/markdown") {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function buildTemplateContext(template, modules) {
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

Course Modules:
${(modules || []).map((m, i) => `${i + 1}. ${m.title} (${m.type || "hands_on"}) - ${m.description || "N/A"}`).join("\n")}`;
}