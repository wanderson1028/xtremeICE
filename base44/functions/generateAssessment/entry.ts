import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { position_title, company_name, job_description, assessment_type, seniority_level, difficulty, duration_minutes, required_tools, custom_tasks } = body;

    const prompt = `You are an expert cybersecurity hiring and assessment architect with deep knowledge of the NICE Cybersecurity Workforce Framework (NICE CSF).

Generate a comprehensive hands-on candidate assessment for the following position:

Position Title: ${position_title}
Company: ${company_name || 'Undisclosed'}
Assessment Type: ${assessment_type}
Seniority Level: ${seniority_level}
Difficulty: ${difficulty}
Duration: ${duration_minutes} minutes
Required Tools: ${(required_tools || []).join(', ') || 'Standard toolset for role'}
Job Description / Requirements: ${job_description || 'Generate from industry-standard expectations for this role and seniority level'}
Custom Tasks: ${custom_tasks || 'None'}

Generate a complete assessment blueprint. The assessment must be hands-on practical — not a quiz. Candidates must perform real actions: investigate alerts, analyze logs, run tools, configure systems, document findings, remediate issues.

Return a JSON object with this exact structure:
{
  "role_summary": "2-3 sentence summary of the role and what this assessment evaluates",
  "nice_category": "The NICE Framework category (e.g. Protect and Defend, Analyze, Investigate)",
  "nice_work_role": "Specific NICE work role name",
  "nice_alignment": {
    "category": "string",
    "work_role": "string",
    "task_ids": ["T0001", "T0002"],
    "knowledge_ids": ["K0001", "K0002"],
    "skill_ids": ["S0001", "S0002"],
    "competency_areas": ["string"]
  },
  "objectives": ["objective1", "objective2", "objective3", "objective4", "objective5"],
  "scenario_narrative": "A 150-200 word realistic scenario describing the situation the candidate walks into. Make it feel like a real incident or assignment.",
  "tasks": [
    {
      "order": 1,
      "title": "Task title",
      "description": "Detailed task description with specific instructions",
      "task_type": "Investigation|Configuration|Analysis|Documentation|Remediation|Scripting|Verification",
      "tools_required": ["tool1", "tool2"],
      "expected_actions": ["Specific action 1", "Specific action 2", "Specific action 3"],
      "validation_checks": [
        { "check": "Description of what is validated", "automated": true, "points": 5 }
      ],
      "hints": ["hint1", "hint2"],
      "nice_task_ids": ["T0001"],
      "points": 15
    }
  ],
  "scoring_weights": {
    "technical_accuracy": 20,
    "task_completion": 20,
    "tool_usage": 10,
    "troubleshooting_process": 10,
    "security_reasoning": 15,
    "documentation_quality": 10,
    "time_management": 5,
    "remediation_quality": 5,
    "communication_clarity": 3,
    "compliance_with_instructions": 2
  },
  "pass_threshold": 70,
  "recommended_follow_up_questions": ["question1", "question2", "question3"]
}

Generate between 5-8 realistic hands-on tasks appropriate for ${seniority_level} level ${assessment_type}. Each task should be achievable within the ${duration_minutes} minute window total.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          role_summary: { type: 'string' },
          nice_category: { type: 'string' },
          nice_work_role: { type: 'string' },
          nice_alignment: { type: 'object' },
          objectives: { type: 'array', items: { type: 'string' } },
          scenario_narrative: { type: 'string' },
          tasks: { type: 'array', items: { type: 'object' } },
          scoring_weights: { type: 'object' },
          pass_threshold: { type: 'number' },
          recommended_follow_up_questions: { type: 'array', items: { type: 'string' } }
        }
      }
    });

    return Response.json({ success: true, assessment: result.response || result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});