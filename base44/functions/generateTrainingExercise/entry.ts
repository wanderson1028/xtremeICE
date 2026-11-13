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

type Role = {
  id?: string;
  name?: string;
  category?: string;
  description?: string;
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
          type: { type: "string", enum: ["hands_on", "mcq", "matching", "hotspot"] },
          title: { type: "string" },
          instructions: { type: "string" },
          success_criteria: { type: "string" },
          options: {
            type: "array",
            items: {
              type: "object",
              properties: { id: { type: "string" }, text: { type: "string" } },
              required: ["id", "text"],
            },
          },
          correct_option_id: { type: "string" },
          explanation: { type: "string" },
          matching_prompts: {
            type: "array",
            items: {
              type: "object",
              properties: { id: { type: "string" }, text: { type: "string" } },
              required: ["id", "text"],
            },
          },
          matching_choices: {
            type: "array",
            items: {
              type: "object",
              properties: { id: { type: "string" }, text: { type: "string" } },
              required: ["id", "text"],
            },
          },
          matching_answer: {
            type: "array",
            items: {
              type: "object",
              properties: { prompt_id: { type: "string" }, choice_id: { type: "string" } },
              required: ["prompt_id", "choice_id"],
            },
          },
          interface_name: { type: "string" },
          hotspot_regions: {
            type: "array",
            items: {
              type: "object",
              properties: { id: { type: "string" }, label: { type: "string" }, detail: { type: "string" } },
              required: ["id", "label"],
            },
          },
          correct_region_id: { type: "string" },
        },
        required: ["type", "title", "instructions"],
      },
    },
    success_criteria: { type: "array", items: { type: "string" } },
    nice_tasks: { type: "array", items: { type: "string" } },
    nice_knowledge: { type: "array", items: { type: "string" } },
    nice_skills: { type: "array", items: { type: "string" } },
  },
  required: ["title", "summary", "scenario", "objectives", "tasks", "success_criteria"],
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export default async function (req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me().catch((e) => (e.status === 401 ? null : Promise.reject(e)));
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json().catch(() => ({}));

    const roles: Role[] = (Array.isArray(body?.nice_roles) ? body.nice_roles : body?.nice_role ? [body.nice_role] : [])
      .filter((role: Role) => clip(role?.name, 120))
      .slice(0, 5);
    if (!roles.length) return Response.json({ error: "Select at least one NICE Framework work role." }, { status: 400 });

    const findings: Finding[] = Array.isArray(body?.findings) ? body.findings.slice(0, 12) : [];
    if (!findings.length) return Response.json({ error: "Select at least one pentest finding." }, { status: 400 });

    const difficulty = ["Beginner", "Intermediate", "Advanced", "Expert"].includes(body?.difficulty)
      ? body.difficulty
      : "Intermediate";
    const duration = Math.min(480, Math.max(15, Number(body?.duration_minutes) || 45));

    // The client organization must never be identifiable in the generated exercise.
    const orgName = clip(body?.organization_name, 160);
    const scrub = (value: unknown) => {
      const text = String(value ?? "");
      if (orgName.length < 2) return text;
      return text.replace(new RegExp(escapeRegExp(orgName), "gi"), "the client organization");
    };

    const roleText = roles
      .map((role) => `- ${clip(role.name, 120)}${role.category ? ` (${clip(role.category, 120)})` : ""}${role.description ? `: ${clip(role.description, 400)}` : ""}`)
      .join("\n");

    const findingText = findings
      .map((finding, index) => {
        const parts = [
          `${index + 1}. ${scrub(clip(finding.title, 220)) || "Unnamed finding"}`,
          finding.severity ? `   Severity: ${clip(finding.severity, 40)}` : "",
          finding.asset ? `   Affected asset: ${scrub(clip(finding.asset, 160))}` : "",
          finding.assessment_type ? `   Test area: ${clip(finding.assessment_type, 80)}` : "",
          finding.mitre_technique_id
            ? `   MITRE ATT&CK: ${clip(finding.mitre_technique_id, 30)} ${clip(finding.mitre_technique_name, 120)}${finding.mitre_tactic ? ` (${clip(finding.mitre_tactic, 60)})` : ""}`
            : "",
          finding.evidence ? `   Evidence: ${scrub(clip(finding.evidence, 700))}` : "",
        ];
        return parts.filter(Boolean).join("\n");
      })
      .join("\n\n");

    const activityCount = duration >= 90 ? 9 : duration >= 60 ? 8 : 6;

    const prompt = `You are a cybersecurity training designer building an interactive, assessment-style training exercise for these NICE Framework work roles:
${roleText}

The activity content is grounded in these real penetration test findings from an authorized client engagement. NEVER name the client organization, its brand, its people or its web domains: refer to it only as "the client organization" or "the target environment".

${findingText}

Requirements:
- Difficulty: ${difficulty}. Total learner time: about ${duration} minutes.
- Build exactly ${activityCount} activities in a realistic order. Use a MIXED sequence and include at least one activity of EVERY type: "hands_on", "mcq", "matching" and "hotspot". Never place three activities of the same type in a row.
- Each activity must exercise at least one of the listed work roles; where it helps, name the role in the instructions so the learner knows the perspective.
- "hands_on": a real task the learner performs in their own environment. Give clear step-by-step instructions and one concrete "success_criteria" the learner can verify.
- "mcq": exactly 4 options with ids "o1", "o2", "o3", "o4". Exactly one is correct — set "correct_option_id" to it. Add a short "explanation" of why it is correct. Distractors must be plausible but wrong.
- "matching": 4 prompts with ids "p1"–"p4" and 5 choices with ids "c1"–"c5" (one choice is a distractor). Provide "matching_answer" as one { prompt_id, choice_id } pair per prompt.
- "hotspot": "interface_name" is a simulated console the learner clicks in (for example "Firewall policy console", "SIEM alert queue", "Switch running-config"), and 4 to 6 "hotspot_regions" with ids "r1"–"r6". Each region needs a short UI "label" (e.g. "Inbound ACL", "Deny log", "Port 22 rule") and a one-line "detail". Set "correct_region_id" to the region the learner must click.
- Include 3 to 5 measurable objectives and 3 to 5 overall success criteria.
- Map the exercise to NICE Framework tasks, knowledge and skills that fit the selected roles (human-readable statements, not bare IDs).
- Keep it professional and free of real credentials or personal data. Never invent findings that are not implied by the evidence provided.`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: responseSchema,
      model: "claude-sonnet-5",
    });

    const generated: any = result || {};

    const normalizeMcq = (raw: any) => {
      const options = (Array.isArray(raw?.options) ? raw.options : [])
        .map((option: any, index: number) => ({ id: clip(option?.id, 20) || `o${index + 1}`, text: clip(option?.text, 300) }))
        .filter((option: any) => option.text)
        .slice(0, 6);
      if (options.length < 2) return null;
      const requested = clip(raw?.correct_option_id, 20);
      const correct = options.some((option: any) => option.id === requested) ? requested : options[0].id;
      return { options, correct_option_id: correct, explanation: clip(raw?.explanation, 600) };
    };

    const normalizeMatching = (raw: any) => {
      const prompts = (Array.isArray(raw?.matching_prompts) ? raw.matching_prompts : [])
        .map((prompt: any, index: number) => ({ id: clip(prompt?.id, 20) || `p${index + 1}`, text: clip(prompt?.text, 300) }))
        .filter((prompt: any) => prompt.text)
        .slice(0, 6);
      const choices = (Array.isArray(raw?.matching_choices) ? raw.matching_choices : [])
        .map((choice: any, index: number) => ({ id: clip(choice?.id, 20) || `c${index + 1}`, text: clip(choice?.text, 300) }))
        .filter((choice: any) => choice.text)
        .slice(0, 8);
      if (prompts.length < 2 || choices.length < 2) return null;
      const pairs = Array.isArray(raw?.matching_answer) ? raw.matching_answer : [];
      const answer: Record<string, string> = {};
      prompts.forEach((prompt: any) => {
        const pair = pairs.find((item: any) => clip(item?.prompt_id, 20) === prompt.id);
        const choiceId = clip(pair?.choice_id, 20);
        if (choices.some((choice: any) => choice.id === choiceId)) answer[prompt.id] = choiceId;
      });
      const used = new Set(Object.values(answer));
      prompts.forEach((prompt: any) => {
        if (answer[prompt.id]) return;
        const free = choices.find((choice: any) => !used.has(choice.id));
        if (free) {
          answer[prompt.id] = free.id;
          used.add(free.id);
        }
      });
      if (prompts.some((prompt: any) => !answer[prompt.id])) return null;
      return { matching_prompts: prompts, matching_choices: choices, matching_answer: answer };
    };

    const normalizeHotspot = (raw: any) => {
      const regions = (Array.isArray(raw?.hotspot_regions) ? raw.hotspot_regions : [])
        .map((region: any, index: number) => ({
          id: clip(region?.id, 20) || `r${index + 1}`,
          label: clip(region?.label, 120),
          detail: clip(region?.detail, 200),
        }))
        .filter((region: any) => region.label)
        .slice(0, 6);
      if (regions.length < 3) return null;
      const requested = clip(raw?.correct_region_id, 20);
      const correct = regions.some((region: any) => region.id === requested) ? requested : regions[0].id;
      return { interface_name: clip(raw?.interface_name, 120), hotspot_regions: regions, correct_region_id: correct };
    };

    const buildTask = (raw: any, index: number) => {
      const base = {
        id: `task-${index + 1}`,
        title: scrub(clip(raw?.title, 200)) || `Activity ${index + 1}`,
        instructions: scrub(clip(raw?.instructions, 1600)),
      };
      if (raw?.type === "mcq") {
        const mcq = normalizeMcq(raw);
        if (mcq) return { ...base, type: "mcq", ...mcq };
      }
      if (raw?.type === "matching") {
        const matching = normalizeMatching(raw);
        if (matching) return { ...base, type: "matching", ...matching };
      }
      if (raw?.type === "hotspot") {
        const hotspot = normalizeHotspot(raw);
        if (hotspot) return { ...base, type: "hotspot", ...hotspot };
      }
      return { ...base, type: "hands_on", success_criteria: scrub(clip(raw?.success_criteria, 500)) };
    };

    const tasks = (Array.isArray(generated.tasks) ? generated.tasks : []).slice(0, 12).map(buildTask);

    if (tasks.length < 3) return Response.json({ error: "The exercise could not be generated. Try again." }, { status: 502 });

    return Response.json({
      exercise: {
        title: scrub(clip(generated.title, 200)) || `Training exercise for ${clip(roles[0].name, 120)}`,
        summary: scrub(clip(generated.summary, 1200)),
        scenario: scrub(clip(generated.scenario, 4000)),
        objectives: (Array.isArray(generated.objectives) ? generated.objectives : []).map((value: any) => scrub(clip(value, 400))).filter(Boolean),
        tasks,
        success_criteria: (Array.isArray(generated.success_criteria) ? generated.success_criteria : []).map((value: any) => scrub(clip(value, 400))).filter(Boolean),
        nice_tasks: (Array.isArray(generated.nice_tasks) ? generated.nice_tasks : []).map((value: any) => clip(value, 400)).filter(Boolean),
        nice_knowledge: (Array.isArray(generated.nice_knowledge) ? generated.nice_knowledge : []).map((value: any) => clip(value, 400)).filter(Boolean),
        nice_skills: (Array.isArray(generated.nice_skills) ? generated.nice_skills : []).map((value: any) => clip(value, 400)).filter(Boolean),
        difficulty,
        duration_minutes: duration,
      },
    });
  } catch (error) {
    return Response.json({ error: error?.message || "The exercise could not be generated." }, { status: 500 });
  }
}