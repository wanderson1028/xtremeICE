import React, { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Plus, X, GripVertical } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function StepContent({ data, update }) {
  const [aiLoading, setAiLoading] = useState(false);
  const [objectivesText, setObjectivesText] = useState((data.objectives || []).join("\n"));
  const [steps, setSteps] = useState(data.steps || []);
  const [learningPurpose, setLearningPurpose] = useState(data.lab_learning_purpose || "");
  const [authenticity, setAuthenticity] = useState(data.lab_authenticity || "");
  const [guidance, setGuidance] = useState(data.lab_guidance || "");

  const syncObjectives = (text) => {
    setObjectivesText(text);
    update({ objectives: text.split("\n").map((o) => o.trim()).filter(Boolean) });
  };

  const syncField = (field, value) => {
    if (field === "lab_learning_purpose") setLearningPurpose(value);
    if (field === "lab_authenticity") setAuthenticity(value);
    if (field === "lab_guidance") setGuidance(value);
    update({ [field]: value });
  };

  const addStep = () => {
    const newSteps = [...steps, { id: `step-${Date.now()}`, title: "", instructions: "" }];
    setSteps(newSteps);
    update({ steps: newSteps });
  };

  const updateStep = (id, field, value) => {
    const newSteps = steps.map((s) => (s.id === id ? { ...s, [field]: value } : s));
    setSteps(newSteps);
    update({ steps: newSteps });
  };

  const removeStep = (id) => {
    const newSteps = steps.filter((s) => s.id !== id);
    setSteps(newSteps);
    update({ steps: newSteps });
  };

  const generateWithAI = async () => {
    if (!data.title) {
      alert("Please enter a lab title in the Basics step first.");
      return;
    }
    setAiLoading(true);
    try {
      const prompt = `You are a cybersecurity lab designer. Generate a structured lab specification as JSON for the following lab:

Title: ${data.title}
Description: ${data.description || "N/A"}
Difficulty: ${data.difficulty || "Intermediate"}

Generate:
1. 3-5 learning objectives (concise, actionable)
2. 4-6 lab steps (each with a title and detailed instructions)
3. A learning purpose statement
4. An authenticity note (how this reflects real-world scenarios)
5. Guidance for the student/instructor

Respond ONLY with valid JSON matching this schema:
{
  "objectives": ["string"],
  "steps": [{"title": "string", "instructions": "string"}],
  "lab_learning_purpose": "string",
  "lab_authenticity": "string",
  "lab_guidance": "string"
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            objectives: { type: "array", items: { type: "string" } },
            steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  instructions: { type: "string" },
                },
              },
            },
            lab_learning_purpose: { type: "string" },
            lab_authenticity: { type: "string" },
            lab_guidance: { type: "string" },
          },
        },
      });

      const objText = (result.objectives || []).join("\n");
      setObjectivesText(objText);
      const aiSteps = (result.steps || []).map((s, i) => ({
        id: `step-ai-${Date.now()}-${i}`,
        title: s.title || "",
        instructions: s.instructions || "",
      }));
      setSteps(aiSteps);
      setLearningPurpose(result.lab_learning_purpose || "");
      setAuthenticity(result.lab_authenticity || "");
      setGuidance(result.lab_guidance || "");

      update({
        objectives: result.objectives || [],
        steps: aiSteps,
        lab_learning_purpose: result.lab_learning_purpose || "",
        lab_authenticity: result.lab_authenticity || "",
        lab_guidance: result.lab_guidance || "",
      });
    } catch (err) {
      alert("AI generation failed: " + err.message);
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-5">
      {/* AI Generation */}
      <div className="rounded-lg border border-red-900/40 bg-red-950/20 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-red-300 flex items-center gap-2">
              <Sparkles className="h-4 w-4" /> AI Lab Generator
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Auto-generate objectives, steps, and guidance from your lab title and description.
            </p>
          </div>
          <Button
            type="button"
            onClick={generateWithAI}
            disabled={aiLoading}
            className="bg-red-600 hover:bg-red-700 text-white shrink-0"
          >
            {aiLoading ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Sparkles className="h-4 w-4 mr-1.5" />}
            {aiLoading ? "Generating..." : "Generate"}
          </Button>
        </div>
      </div>

      {/* Objectives */}
      <div>
        <Label className="text-gray-200 text-sm font-medium">Learning Objectives (one per line)</Label>
        <Textarea
          value={objectivesText}
          onChange={(e) => syncObjectives(e.target.value)}
          placeholder="Identify common network protocols&#10;Capture and analyze traffic with Wireshark"
          className="mt-1.5 bg-gray-900 border-gray-700 text-gray-200 placeholder-gray-500 focus:border-red-600 min-h-[90px]"
        />
      </div>

      {/* Steps */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label className="text-gray-200 text-sm font-medium">Lab Steps</Label>
          <button
            type="button"
            onClick={addStep}
            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-300 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" /> Add Step
          </button>
        </div>

        {steps.length === 0 ? (
          <p className="text-xs text-gray-500 italic py-4 text-center border border-dashed border-gray-800 rounded-lg">
            No steps yet. Use AI Generate or click "Add Step".
          </p>
        ) : (
          <div className="space-y-3">
            {steps.map((step, idx) => (
              <div key={step.id} className="rounded-lg border border-gray-800 bg-gray-900/50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <GripVertical className="h-4 w-4 text-gray-600 shrink-0" />
                  <span className="text-xs font-semibold text-gray-500">Step {idx + 1}</span>
                  <input
                    value={step.title}
                    onChange={(e) => updateStep(step.id, "title", e.target.value)}
                    placeholder="Step title..."
                    className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-600 focus:outline-none border-b border-transparent focus:border-gray-700"
                  />
                  <button
                    type="button"
                    onClick={() => removeStep(step.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                <Textarea
                  value={step.instructions}
                  onChange={(e) => updateStep(step.id, "instructions", e.target.value)}
                  placeholder="Detailed instructions for this step..."
                  className="bg-gray-900 border-gray-800 text-gray-300 placeholder-gray-600 focus:border-red-600 text-sm min-h-[60px]"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Learning Purpose */}
      <div>
        <Label className="text-gray-200 text-sm font-medium">Learning Purpose</Label>
        <Textarea
          value={learningPurpose}
          onChange={(e) => syncField("lab_learning_purpose", e.target.value)}
          placeholder="What the student should learn and be able to do after completing this lab..."
          className="mt-1.5 bg-gray-900 border-gray-700 text-gray-200 placeholder-gray-500 focus:border-red-600 min-h-[60px]"
        />
      </div>

      {/* Authenticity */}
      <div>
        <Label className="text-gray-200 text-sm font-medium">Authenticity Notes</Label>
        <Textarea
          value={authenticity}
          onChange={(e) => syncField("lab_authenticity", e.target.value)}
          placeholder="How this lab reflects real-world scenarios and tools..."
          className="mt-1.5 bg-gray-900 border-gray-700 text-gray-200 placeholder-gray-500 focus:border-red-600 min-h-[60px]"
        />
      </div>

      {/* Guidance */}
      <div>
        <Label className="text-gray-200 text-sm font-medium">Guidance</Label>
        <Textarea
          value={guidance}
          onChange={(e) => syncField("lab_guidance", e.target.value)}
          placeholder="Notes for instructors or students on approaching this lab..."
          className="mt-1.5 bg-gray-900 border-gray-700 text-gray-200 placeholder-gray-500 focus:border-red-600 min-h-[60px]"
        />
      </div>
    </div>
  );
}