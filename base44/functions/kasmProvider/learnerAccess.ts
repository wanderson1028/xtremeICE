import { assessKasmBinding } from "./shared/providers/kasmBinding.js";

const FLAG = "kasm_learner_labs";
const ASSIGNMENT = { lab_type: "kasm_template", service_key: "lab_scenarios" };
type Row = Record<string, any>;

export async function kasmEnabled(db: any) {
  const flags = await db.FeatureFlag.filter({ key: FLAG }, "-created_date", 2);
  return flags.length === 1 && flags[0].is_enabled === true;
}

export async function hasAssignment(db: any, user: Row, templateId: string) {
  if (user.role === "admin") return true;
  if (!user.email) return false;
  const rows = await db.UserLabAssignment.filter({ ...ASSIGNMENT, user_email: user.email, lab_id: templateId }, "-created_date", 1);
  return rows.length === 1;
}

async function supportedLabs(db: any, templates: Row[]) {
  const ids = [...new Set(templates.map(template => template.environment_profile_id).filter(Boolean))];
  if (!ids.length) return [];
  const profiles = await db.EnvironmentProfile.filter({ id: { $in: ids } }, "-created_date", ids.length);
  const byId = new Map<string, Row>(profiles.map((profile: Row) => [profile.id, profile]));
  return templates.flatMap(template => {
    const profile = byId.get(template.environment_profile_id);
    if (!profile || profile.is_active === false) return [];
    const binding = assessKasmBinding(template.environment_definition, profile);
    if (!binding.launch_ready || !binding.binding || binding.warnings.length) return [];
    return [{ template_id: template.id, title: template.title }];
  });
}

export async function catalog(db: any) {
  const enabled = await kasmEnabled(db);
  if (!enabled) return { labs: [], enabled };
  const templates = await db.LabTemplate.filter({ status: "published" }, "-created_date", 100);
  return { labs: await supportedLabs(db, templates), enabled };
}

export async function listAssigned(db: any, user: Row) {
  const [enabled, runs] = await Promise.all([
    kasmEnabled(db),
    db.KasmLearnerRun.filter({ provider: "kasm", user_email: user.email }, "-created_date", 50),
  ]);
  let labs: Awaited<ReturnType<typeof supportedLabs>> = [];
  if (enabled && user.email) {
    const rows = await db.UserLabAssignment.filter({ ...ASSIGNMENT, user_email: user.email }, "-created_date", 50);
    const ids = [...new Set(rows.map((assignment: Row) => assignment.lab_id).filter(Boolean))];
    if (ids.length) {
      const templates = await db.LabTemplate.filter({ id: { $in: ids }, status: "published" }, "-created_date", ids.length);
      labs = await supportedLabs(db, templates);
    }
  }
  return {
    labs,
    runs: runs.map((run: Row) => ({
      id: run.id, template_id: run.template_id, title: run.template_snapshot?.title || "Kasm lab",
      status: run.status, cleanup_state: run.cleanup_state || null, score: run.score,
      learning_outcome: run.learning_outcome || null,
    })),
  };
}
