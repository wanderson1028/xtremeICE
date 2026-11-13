import { createClientFromRequest } from "npm:@base44/sdk@0.8.54";

type Finding = {
  id?: string;
  title?: string;
  severity?: string;
  asset?: string;
  evidence?: string;
  assessment_type?: string;
  mitre_technique_id?: string;
  mitre_technique_name?: string;
  mitre_tactic?: string;
};

const clip = (value: unknown, limit: number) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);

const responseSchema = {
  type: "object",
  properties: {
    title: { type: "string" },
    summary: { type: "string" },
    scenario: { type: "string" },
    objectives: { type: "array", items: { type: "string" } },
    tasks: {
      type: "array",
      items: {
        type: "object",
        properties: {
          title: { type: "string" },
          instructions: { type: "string" },
          success_criteria: { type: "string" },
        },
        required: ["title", "instructions", "success_criteria"],
      },
    },
    success_criteria: { type: "array", items: { type: "string" } },
    nice_tasks: { type: "array", items: { type: "string" } },
    nice_knowledge: { type: "array", items: { type: "string" } },
    nice_skills: { type: "array", items: { type: "string" } },
  },
  required: ["title", "summary", "scenario", "objectives", "tasks", "success_criteria"],
};

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const role = body?.nice_role;
    if (!role?.name) return Response.json({ error: "A NICE Framework work role is required." }, { status: 400 });

    const findings: Finding[] = Array.isArray(body?.findings) ? body.findings.slice(0, 12) : [];
    if (!findings.length) return Response.json({ error: "Select at least one pentest finding." }, { status: 400 });

    const difficulty = ["Beginner", "Intermediate", "Advanced", "Expert"].includes(body?.difficulty)
      ? body.difficulty
      : "Intermediate";
    const duration = Math.min(480, Math.max(15, Number(body?.duration_minutes) || 45));

    const findingText = findings
      .map((finding, index) => {
        const parts = [
          `${index + 1}. ${clip(finding.title, 220) || "Unnamed finding"}`,
          finding.severity ? `   Severity: ${clip(finding.severity, 40)}` : "",
          finding.asset ? `   Affected asset: ${clip(finding.asset, 160)}` : "",
          finding.assessment_type ? `   Test area: ${clip(finding.assessment_type, 80)}` : "",
          finding.mitre_technique_id
            ? `   MITRE ATT&CK: ${clip(finding.mitre_technique_id, 30)} ${clip(finding.mitre_technique_name, 120)}${finding.mitre_tactic ? ` (${clip(finding.mitre_tactic, 60)})` : ""}`
            : "",
          finding.evidence ? `   Evidence: ${clip(finding.evidence, 700)}` : "",
        ];
        return parts.filter(Boolean).join("\n");
      })
      .join("\n\n");

    const prompt = `You are a cybersecurity training designer. Build one hands-on training exercise for a learner working as a ${role.name}${role.category ? ` in the NICE Framework "${role.category}" category` : ""}.
${role.description ? `Role description: ${role.description}` : ""}

The exercise must be grounded in these real penetration test findings from an authorized client engagement at ${clip(body?.organization_name, 160) || "the client organization"}${body?.assessment_name ? ` (assessment: ${clip(body.assessment_name, 160)})` : ""}:

${findingText}

Requirements:
- Difficulty: ${difficulty}. Total learner time: about ${duration} minutes.
- The scenario must reuse the client context, affected assets and evidence above so the learner recognises the exposure, but keep the wording professional and free of real credentials or personal data.
- Write 4 to 7 tasks in the order a ${role.name} would perform them: investigation, technical work, remediation or validation. Each task needs clear instructions the learner can follow and a concrete success criterion.
- Include 3 to 5 measurable objectives and 3 to 5 overall success criteria.
- Map the exercise to NICE Framework tasks, knowledge and skills that fit the role (human-readable statements, not bare IDs).
- Never invent findings that are not implied by the evidence provided.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: responseSchema,
      model: "claude-sonnet-5",
    });

    const generated: any = result || {};
    const tasks = (Array.isArray(generated.tasks) ? generated.tasks : []).map((task: any, index: number) => ({
      id: `task-${index + 1}`,
      title: clip(task?.title, 160) || `Task ${index + 1}`,
      instructions: clip(task?.instructions, 2000),
      success_criteria: clip(task?.success_criteria, 500),
    }));

    if (!tasks.length) return Response.json({ error: "The exercise could not be generated. Try again." }, { status: 502 });

    return Response.json({
      exercise: {
        title: clip(generated.title, 200) || `Training exercise for ${role.name}`,
        summary: clip(generated.summary, 1200),
        scenario: clip(generated.scenario, 4000),
        objectives: (Array.isArray(generated.objectives) ? generated.objectives : []).map((v: any) => clip(v, 400)).filter(Boolean),
        tasks,
        success_criteria: (Array.isArray(generated.success_criteria) ? generated.success_criteria : []).map((v: any) => clip(v, 400)).filter(Boolean),
        nice_tasks: (Array.isArray(generated.nice_tasks) ? generated.nice_tasks : []).map((v: any) => clip(v, 400)).filter(Boolean),
        nice_knowledge: (Array.isArray(generated.nice_knowledge) ? generated.nice_knowledge : []).map((v: any) => clip(v, 400)).filter(Boolean),
        nice_skills: (Array.isArray(generated.nice_skills) ? generated.nice_skills : []).map((v: any) => clip(v, 400)).filter(Boolean),
        difficulty,
        duration_minutes: duration,
      },
    });
  } catch (error) {
    return Response.json({ error: error?.message || "The exercise could not be generated." }, { status: 500 });
  }
}