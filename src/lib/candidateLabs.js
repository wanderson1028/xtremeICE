import { VIRTUAL_LABS, LINUX_LABS, POWERSHELL_LABS, LAB_COURSES, M365_LABS } from "@/lib/labCatalog";

const CATALOG = [...M365_LABS, ...VIRTUAL_LABS, ...LINUX_LABS, ...POWERSHELL_LABS, ...LAB_COURSES];

/* Labs chosen in the assessment builder are stored as readable text
   ("Selected labs: Microsoft 365 Point & Click Assessment"), so each entry is
   resolved back to its catalog lab by title, and by id for newer records. */
export function assessmentLabs(assessment) {
  const text = String(assessment?.custom_tasks || "");
  const list = text
    .replace(/^\s*selected labs:\s*/i, "")
    .replace(/^\s*labs:\s*/i, "")
    .trim();
  if (!list) return [];

  const seen = new Set();
  return list
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry && !seen.has(entry) && seen.add(entry))
    .map((entry) => CATALOG.find((lab) => lab.title === entry || lab.id === entry)
      || { id: entry, title: entry });
}

/* Labs that can be delivered to a candidate in the browser. */
export const CANDIDATE_LAB_RUNNERS = {
  "microsoft-365": true,
};

export const isCandidateRunnable = (lab) => Boolean(CANDIDATE_LAB_RUNNERS[lab?.id]);