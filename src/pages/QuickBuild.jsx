import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { Zap, Save, RefreshCw, Clock, BookOpen, ChevronLeft } from "lucide-react";
import LabStatusBadge from "@/components/labs/LabStatusBadge";
import { AI_SCHEMA, generationPrompt, buildAiGuidedTemplate } from "@/lib/awsLearnerTemplate";

export default function QuickBuild() {
  const navigate = useNavigate();
  const defaultAwsPrompt = "Create a beginner lab about protecting a Linux configuration file. Use the guided file editor to demonstrate permissions changing from 644 to 600 and validate before and after.";
  const [awsProfile, setAwsProfile] = useState(new URLSearchParams(window.location.search).get("preset") === "aws-learner");
  const [prompt, setPrompt] = useState(new URLSearchParams(window.location.search).get("preset") === "aws-learner" ? defaultAwsPrompt : "");
  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  const generate = async () => {
    if (!prompt.trim()) return;
    setGenerating(true);
    setResult(null);
    setError("");
    try {
    if (awsProfile) {
      const narrative = await base44.integrations.Core.InvokeLLM({ prompt: generationPrompt(prompt), response_json_schema: AI_SCHEMA });
      setResult(buildAiGuidedTemplate(narrative));
      return;
    }
    const res = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a cybersecurity lab curriculum designer. Generate a detailed lab template based on this request: "${prompt}"
      
Return a JSON object with these fields:
- title: string (concise lab title)
- description: string (2-3 sentence description)
- difficulty: one of "Beginner", "Intermediate", "Advanced", "Expert"
- estimated_duration_minutes: number
- nice_category: one of "Securely Provision", "Operate and Maintain", "Oversee and Govern", "Protect and Defend", "Analyze", "Collect and Operate", "Investigate"
- nice_work_role: string (specific work role within that category)
- objectives: array of 3-5 learning objectives
- prerequisites: array of 2-3 prerequisites
- tags: array of relevant tags
- modules: array of 3-6 objects each with: title, description, type (hands_on/reading/quiz/challenge), duration_minutes, points, content (detailed instructions)`,
      response_json_schema: {
        type: "object",
        properties: {
          title: { type: "string" },
          description: { type: "string" },
          difficulty: { type: "string" },
          estimated_duration_minutes: { type: "number" },
          nice_category: { type: "string" },
          nice_work_role: { type: "string" },
          objectives: { type: "array", items: { type: "string" } },
          prerequisites: { type: "array", items: { type: "string" } },
          tags: { type: "array", items: { type: "string" } },
          modules: { type: "array", items: { type: "object" } },
        }
      }
    });
    setResult(res);
    } catch (cause) { setError(cause?.message || "Lab generation failed. Please try again."); }
    finally { setGenerating(false); }
  };

  const save = async () => {
    if (!result) return;
    setSaving(true);
    setError("");
    try {
    const { modules, ...templateData } = result;
    const created = await base44.entities.LabTemplate.create({ ...templateData, status: "draft" });
    if (modules?.length) {
      for (let i = 0; i < modules.length; i++) {
        await base44.entities.CourseModule.create({ ...modules[i], template_id: created.id, order: i + 1 });
      }
    }
    navigate(`/LabBuilder?id=${created.id}`);
    } catch (cause) { setError(cause?.message || "The generated draft could not be saved."); }
    finally { setSaving(false); }
  };

  const DIFF_COLORS = {
    Beginner: "bg-green-900/40 text-green-300",
    Intermediate: "bg-blue-900/40 text-blue-300",
    Advanced: "bg-orange-900/40 text-orange-300",
    Expert: "bg-red-900/40 text-red-300",
  };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto">
        <Link to="/LabBuilderDashboard" className="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-5 transition-colors">
          <ChevronLeft className="h-4 w-4" /> Course Lab Builder
        </Link>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-lg bg-red-950/60 flex items-center justify-center">
              <Zap className="h-5 w-5 text-red-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Quick Build</h1>
          </div>
          <p className="text-gray-400 text-sm">{awsProfile ? "Generate a deployable AWS file-permissions lab, review it in Lab Builder, then launch the reviewed task." : "Describe the lab you want — the system will generate a complete template in seconds."}</p>
        </div>

        {error && <div role="alert" className="border border-red-700 text-red-200 p-3 mb-4">{error}</div>}
        <label className="block text-gray-300 text-sm mb-4">Generation profile
          <select aria-label="Lab generation profile" className="block mt-2 w-full bg-gray-900 border border-gray-700 rounded p-2" disabled={generating || saving} value={awsProfile ? "aws" : "general"} onChange={e => { const aws = e.target.value === "aws"; setAwsProfile(aws); setResult(null); setPrompt(aws ? defaultAwsPrompt : ""); }}>
            <option value="general">General course template</option><option value="aws">AWS guided file-permissions demo</option>
          </select>
        </label>
        {awsProfile && <p className="text-sm text-sky-300 mb-4">One Linux guest · Private SSM access · One task · Independent mode-600 validation. AI generates the courseware; the deployment profile supplies the supported environment and validator.</p>}
        {/* Prompt */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-5 mb-4">
          <Label className="text-gray-300 mb-2 block">Describe your lab</Label>
          <Textarea
            value={prompt}
            onChange={e => setPrompt(e.target.value)}
            placeholder="e.g., A hands-on lab teaching junior SOC analysts how to investigate a phishing attack using Splunk, covering email header analysis, IOC identification, and incident documentation..."
            className="bg-gray-800 border-gray-700 text-white h-32 resize-none mb-3"
          />
          <Button onClick={generate} disabled={!prompt.trim() || generating}
            className="bg-red-700 hover:bg-red-600 text-white w-full">
            {generating ? (
              <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Generating...</>
            ) : (
              <><Zap className="h-4 w-4 mr-2" /> Generate Lab Template</>
            )}
          </Button>
        </div>

        {/* Result */}
        {result && (
          <div className="bg-gray-900 rounded-xl border border-red-900/30 p-5 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-xl font-bold text-white">{result.title}</h2>
              <LabStatusBadge status="draft" />
            </div>

            <p className="text-gray-300 text-sm">{result.description}</p>

            <div className="flex flex-wrap gap-2">
              {result.nice_category && <Badge className="bg-red-950/60 text-red-300 border-0 text-xs">{result.nice_category}</Badge>}
              {result.difficulty && <Badge className={`border-0 text-xs ${DIFF_COLORS[result.difficulty] || DIFF_COLORS.Beginner}`}>{result.difficulty}</Badge>}
              {result.estimated_duration_minutes && (
                <Badge className="bg-gray-800 text-gray-300 border-0 text-xs flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" />{result.estimated_duration_minutes}m
                </Badge>
              )}
              {result.nice_work_role && <Badge className="bg-gray-700 text-gray-300 border-0 text-xs">{result.nice_work_role}</Badge>}
            </div>

            {result.objectives?.length > 0 && (
              <div>
                <h3 className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-2">Objectives</h3>
                <ul className="space-y-1">
                  {result.objectives.map((o, i) => (
                    <li key={i} className="text-gray-400 text-sm flex gap-2">
                      <span className="text-green-500 flex-shrink-0">✓</span>{o}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {awsProfile && result.lab_content?.tasks?.[0] && <div className="rounded border border-sky-800 p-3 text-gray-300 text-sm space-y-2"><p className="font-semibold">{result.lab_content.tasks[0].title}</p><p className="whitespace-pre-wrap">{result.lab_content.tasks[0].instructions}</p><p>Validation: guest file mode must equal 600.</p></div>}
            {result.modules?.length > 0 && (
              <div>
                <h3 className="text-gray-300 text-xs font-semibold uppercase tracking-wide mb-2 flex items-center gap-1">
                  <BookOpen className="h-3.5 w-3.5" /> {result.modules.length} Modules
                </h3>
                <div className="space-y-1.5">
                  {result.modules.map((m, i) => (
                    <div key={i} className="flex items-center gap-3 p-2.5 bg-gray-800 rounded-lg">
                      <span className="text-gray-600 text-xs w-4">{i + 1}.</span>
                      <span className="flex-1 text-sm text-gray-200">{m.title}</span>
                      <Badge className="bg-gray-700 text-gray-400 border-0 text-xs">{m.type?.replace("_", " ")}</Badge>
                      <span className="text-gray-500 text-xs">{m.points || 10}pts</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button onClick={generate} variant="outline" className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800">
                <RefreshCw className="h-4 w-4 mr-2" /> Regenerate
              </Button>
              <Button onClick={save} disabled={saving} className="bg-green-700 hover:bg-green-600 text-white flex-1">
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save & Open in Builder"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}