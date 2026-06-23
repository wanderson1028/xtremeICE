import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Zap, RefreshCw, ChevronDown, ChevronUp, Sparkles } from "lucide-react";

export default function AIGeneratorPanel({ updateForm }) {
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const generate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a cybersecurity lab designer aligned to the NICE Cybersecurity Workforce Framework. Generate a complete lab template based on this request: "${prompt}"

Return a JSON object with these fields:
- title: string (concise lab title)
- description: string (2-3 sentence description)
- difficulty: one of "Beginner", "Intermediate", "Advanced", "Expert"
- estimated_duration_minutes: number
- nice_category: one of "Securely Provision", "Operate and Maintain", "Oversee and Govern", "Protect and Defend", "Analyze", "Collect and Operate", "Investigate"
- nice_work_role: string (specific work role within that category)
- nice_task_ids: array of NICE task ID strings (e.g., "T0001", "T0023")
- nice_knowledge_ids: array of NICE Knowledge ID strings (e.g., "K0001", "K0061")
- nice_skill_ids: array of NICE Skill ID strings (e.g., "S0001", "S0010")
- objectives: array of 3-5 learning objectives
- prerequisites: array of 2-3 prerequisites
- tags: array of relevant tags
- lab_content: object with:
  - scenario: string (markdown narrative describing the real-world scenario students will work through)
  - tasks: array of 3-6 objects each with: title (string), instructions (detailed step-by-step markdown instructions string)
  - success_criteria: string (markdown describing how to verify the lab is complete, including expected outputs or states)`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            description: { type: "string" },
            difficulty: { type: "string" },
            estimated_duration_minutes: { type: "number" },
            nice_category: { type: "string" },
            nice_work_role: { type: "string" },
            nice_task_ids: { type: "array", items: { type: "string" } },
            nice_knowledge_ids: { type: "array", items: { type: "string" } },
            nice_skill_ids: { type: "array", items: { type: "string" } },
            objectives: { type: "array", items: { type: "string" } },
            prerequisites: { type: "array", items: { type: "string" } },
            tags: { type: "array", items: { type: "string" } },
            lab_content: {
              type: "object",
              properties: {
                scenario: { type: "string" },
                tasks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      title: { type: "string" },
                      instructions: { type: "string" }
                    },
                    required: ["title", "instructions"]
                  }
                },
                success_criteria: { type: "string" }
              },
              required: ["scenario", "tasks", "success_criteria"]
            }
          },
          required: ["title", "description", "difficulty", "estimated_duration_minutes", "nice_category", "nice_work_role", "nice_task_ids", "nice_knowledge_ids", "nice_skill_ids", "objectives", "prerequisites", "tags", "lab_content"]
        }
      });

      updateForm({
        title: res.title || "",
        description: res.description || "",
        difficulty: res.difficulty || "Beginner",
        estimated_duration_minutes: res.estimated_duration_minutes || 60,
        nice_category: res.nice_category || "",
        nice_work_role: res.nice_work_role || "",
        nice_task_ids: res.nice_task_ids || [],
        nice_knowledge_ids: res.nice_knowledge_ids || [],
        nice_skill_ids: res.nice_skill_ids || [],
        objectives: res.objectives || [],
        prerequisites: res.prerequisites || [],
        tags: res.tags || [],
        lab_content: res.lab_content || { scenario: "", tasks: [], success_criteria: "" },
      });

      setExpanded(false);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="bg-gray-900 rounded-xl border border-red-900/30 overflow-hidden mb-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full p-4 hover:bg-gray-800/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-red-950/60 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-red-400" />
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-white">AI Lab Generator</h3>
            <p className="text-xs text-gray-500">Describe your lab goals — AI populates all fields</p>
          </div>
        </div>
        {expanded
          ? <ChevronUp className="h-4 w-4 text-gray-500" />
          : <ChevronDown className="h-4 w-4 text-gray-500" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-3">
          <Label className="text-gray-300 text-sm block">Lab goals / description</Label>
          <Textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="e.g., A hands-on lab teaching junior SOC analysts how to investigate a phishing attack using Splunk, covering email header analysis, IOC identification, and incident documentation..."
            className="bg-gray-800 border-gray-700 text-white h-28 resize-none"
          />
          <Button
            onClick={generate}
            disabled={!prompt.trim() || generating}
            className="bg-red-700 hover:bg-red-600 text-white w-full"
          >
            {generating ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><Zap className="h-4 w-4 mr-2" /> Populate All Fields with AI</>
            )}
          </Button>
          <p className="text-xs text-gray-600 text-center">
            Fills Basics, Lab Content, and NICE Mapping automatically
          </p>
        </div>
      )}
    </div>
  );
}