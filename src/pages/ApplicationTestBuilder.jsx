import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Plus, Loader2, CheckCircle2, ListChecks, Shuffle, Send, Eye, ScrollText, Crosshair } from "lucide-react";
import QuestionCard from "@/components/assessment/QuestionCard";
import PromptGenerator from "@/components/assessment/PromptGenerator";
import ThemeWeights from "@/components/assessment/ThemeWeights";
import JobDescriptionIntake from "@/components/assessment/JobDescriptionIntake";
import {
  createQuestion,
  validateQuestion,
  toTaskPayload,
  totalPoints,
  uniqueThemes,
  questionFromTask,
} from "@/lib/assessmentQuestions";

const inputCls =
  "w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-colors placeholder-gray-600";
const labelCls = "block text-sm font-medium text-gray-300 mb-1.5";

const isBlankQuestion = (q) =>
  !String(q.title || "").trim() &&
  (q.options || []).every((o) => !String(o.text || "").trim()) &&
  (q.matching_prompts || []).every((p) => !String(p.text || "").trim()) &&
  (q.matching_choices || []).every((c) => !String(c.text || "").trim());

export default function ApplicationTestBuilder() {
  const editId = new URLSearchParams(window.location.search).get("id");
  const [hydrated, setHydrated] = useState(false);

  const { data: existing, error: loadError } = useQuery({
    queryKey: ["assessment-edit", editId],
    queryFn: async () => {
      const assessment = await base44.entities.Assessment.get(editId);
      const tasks = await base44.entities.AssessmentTask.filter({ assessment_id: editId });
      return { assessment, tasks: [...tasks].sort((a, b) => (a.order || 0) - (b.order || 0)) };
    },
    enabled: !!editId,
  });

  const [form, setForm] = useState({
    position_title: "",
    company_name: "",
    duration_minutes: 30,
    pass_threshold: 70,
    scenario_narrative: "",
    scenario_block: "",
  });
  const [brief, setBrief] = useState("");
  const [questions, setQuestions] = useState([createQuestion("mcq")]);
  const [weights, setWeights] = useState({});
  const themes = uniqueThemes(questions);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [createdId, setCreatedId] = useState(null);

  // Edit mode: fill the builder from the saved assessment exactly once.
  useEffect(() => {
    if (!existing || hydrated) return;
    const { assessment, tasks } = existing;
    setForm({
      position_title: assessment.position_title || "",
      company_name: assessment.company_name || "",
      duration_minutes: assessment.duration_minutes || 30,
      pass_threshold: assessment.pass_threshold || 70,
      scenario_narrative: assessment.scenario_narrative || "",
      scenario_block: assessment.scenario_block || "",
    });
    setQuestions(tasks.length ? tasks.map(questionFromTask) : [createQuestion("mcq")]);
    const savedThemes = Array.isArray(assessment.scoring_weights?.themes) ? assessment.scoring_weights.themes : [];
    setWeights(Object.fromEntries(savedThemes.map((entry) => [entry.theme, Number(entry.weight) || 1])));
    setHydrated(true);
  }, [existing, hydrated]);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const updateQuestion = (index, next) =>
    setQuestions((qs) => qs.map((q, i) => (i === index ? next : q)));

  const removeQuestion = (index) => setQuestions((qs) => qs.filter((_, i) => i !== index));

  const moveQuestion = (index, direction) => {
    setQuestions((qs) => {
      const target = index + direction;
      if (target < 0 || target >= qs.length) return qs;
      const next = [...qs];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  // Drafted intake fills the editable fields below; nothing is generated until the user confirms.
  const applyDraft = (draft) => {
    if (!draft) return;
    setForm((f) => ({
      ...f,
      position_title: draft.position_title?.trim() || f.position_title,
      company_name: draft.company_name?.trim() || f.company_name,
      duration_minutes: draft.duration_minutes || f.duration_minutes,
      scenario_narrative: draft.candidate_instructions?.trim() || f.scenario_narrative,
      scenario_block: draft.scenario?.trim() || f.scenario_block,
    }));
    if (draft.brief?.trim()) setBrief(draft.brief.trim());
  };

  const addGeneratedQuestions = (generated) => {
    setQuestions((qs) => [...qs.filter((q) => !isBlankQuestion(q)), ...generated]);
  };

  const handleSave = async () => {
    if (!form.position_title.trim()) {
      setError("Enter the position title for this test.");
      return;
    }
    if (!questions.length) {
      setError("Add at least one question.");
      return;
    }
    for (let i = 0; i < questions.length; i += 1) {
      const problem = validateQuestion(questions[i], i);
      if (problem) {
        setError(problem);
        return;
      }
    }

    setError("");
    setSaving(true);
    try {
      const res = await base44.functions.invoke("saveAssessment", {
        assessment_id: editId || undefined,
        assessmentData: {
          position_title: form.position_title.trim(),
          company_name: form.company_name.trim(),
          assessment_type: existing?.assessment?.assessment_type || "Custom",
          assessment_kind: "application_test",
          seniority_level: existing?.assessment?.seniority_level || "intermediate",
          difficulty: existing?.assessment?.difficulty || "Intermediate",
          duration_minutes: Number(form.duration_minutes) || 30,
          pass_threshold: Number(form.pass_threshold) || 70,
          scenario_narrative: form.scenario_narrative.trim(),
          scenario_block: form.scenario_block.trim(),
          scoring_weights: {
            themes: themes.map((theme) => ({ theme, weight: Number(weights[theme]) || 1 })),
          },
          role_summary: existing?.assessment?.role_summary || "Application test",
          nice_category: existing?.assessment?.nice_category,
          nice_work_role: existing?.assessment?.nice_work_role,
          status: existing?.assessment?.status || "active",
          generated: false,
        },
        tasks: questions.map(toTaskPayload),
      });
      setCreatedId(res.data.assessment_id);
    } catch (e) {
      setError(e.message || "Failed to save the application test.");
    } finally {
      setSaving(false);
    }
  };

  if (editId && !hydrated) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        {loadError ? (
          <p className="text-sm text-gray-400">That assessment could not be loaded.</p>
        ) : (
          <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
        )}
      </div>
    );
  }

  if (createdId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/10">
        <div className="border-b border-gray-800 bg-black/50 px-6 py-4">
          <div className="max-w-3xl mx-auto flex items-center gap-4">
            <Link to="/CandidateAssessments" className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            <span className="text-gray-600">|</span>
            <h1 className="text-white font-bold">{editId ? "Changes Saved" : "Application Test Saved"}</h1>
          </div>
        </div>
        <div className="max-w-3xl mx-auto px-6 py-16 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-white text-2xl font-bold mb-2">{form.position_title}</h2>
          <p className="text-gray-400 mb-1">
            {questions.length} questions · {totalPoints(questions)} points · pass at {form.pass_threshold}%
          </p>
          <p className="text-gray-500 text-sm mb-8">
            Objective questions are scored automatically the moment a candidate submits.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to={`/bulk-invite?assessment_id=${createdId}`}
              className="flex items-center gap-2 px-5 py-2.5 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              <Send className="h-4 w-4" /> Invite Candidates
            </Link>
            <Link
              to={`/assessment-detail?id=${createdId}`}
              className="flex items-center gap-2 px-5 py-2.5 border border-gray-700 text-gray-300 hover:text-white rounded-lg text-sm transition-colors"
            >
              <Eye className="h-4 w-4" /> View Test
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/10">
      <div className="border-b border-gray-800 bg-black/50 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link to="/CandidateAssessments" className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            <span className="text-gray-600">|</span>
            <div>
              <h1 className="text-white font-bold">{editId ? "Edit Application Test" : "New Application Test"}</h1>
              <p className="text-gray-500 text-xs">
                {editId
                  ? "Update the details or any question — saved changes apply to the next candidate who opens it"
                  : "Multiple choice, matching and hotspot, auto-scored on submission"}
              </p>
            </div>
          </div>
          <span className="text-xs px-3 py-1.5 rounded-full bg-gray-900 border border-gray-700 text-gray-300 font-mono shrink-0">
            {questions.length} Q · {totalPoints(questions)} pts
          </span>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        {error && (
          <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">{error}</div>
        )}

        <JobDescriptionIntake onDrafted={applyDraft} />

        <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 space-y-4">
          <h2 className="text-white font-semibold text-lg">Test Details</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Position Title *</label>
              <input
                className={inputCls}
                placeholder="e.g. Junior SOC Analyst"
                value={form.position_title}
                onChange={(e) => set("position_title", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Company Name</label>
              <input
                className={inputCls}
                placeholder="e.g. Acme Corp"
                value={form.company_name}
                onChange={(e) => set("company_name", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Time Limit (minutes)</label>
              <input
                type="number"
                min="1"
                className={inputCls}
                value={form.duration_minutes}
                onChange={(e) => set("duration_minutes", e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Pass Score (%)</label>
              <input
                type="number"
                min="1"
                max="100"
                className={inputCls}
                value={form.pass_threshold}
                onChange={(e) => set("pass_threshold", e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={labelCls}>Instructions for Candidates</label>
            <textarea
              rows={3}
              className={inputCls + " resize-none"}
              placeholder="Shown on the candidate's welcome screen before the test starts."
              value={form.scenario_narrative}
              onChange={(e) => set("scenario_narrative", e.target.value)}
            />
          </div>
        </div>

        <div className="bg-gray-900/60 border border-red-900/40 rounded-xl p-6 space-y-3">
          <div className="flex items-start gap-3">
            <div className="icon-3d h-9 w-9 rounded-lg bg-red-950/60 border border-red-900/50 flex items-center justify-center shrink-0">
              <ScrollText className="h-4 w-4 text-red-400" />
            </div>
            <div>
              <h2 className="text-white font-semibold text-lg leading-tight">Shared Scenario</h2>
              <p className="text-gray-500 text-xs mt-0.5">
                Shown to candidates above every question. Generated questions are written to follow it.
              </p>
            </div>
          </div>
          <textarea
            rows={6}
            className={inputCls + " resize-none"}
            placeholder="e.g. You are the Level 1 help desk technician at Northwind Logistics. A user calls because they cannot sign in to their workstation, and the error points to a trust relationship with the domain…"
            value={form.scenario_block}
            onChange={(e) => set("scenario_block", e.target.value)}
          />
          <p className="text-gray-600 text-xs">
            {form.scenario_block.trim()
              ? `${form.scenario_block.trim().split(/\s+/).length} words`
              : "Optional — the generator writes one for you when this is empty."}
          </p>
        </div>

        <PromptGenerator
          brief={brief}
          onBriefChange={setBrief}
          scenario={form.scenario_block}
          onScenarioChange={(value) => set("scenario_block", value)}
          onGenerated={addGeneratedQuestions}
        />

        <ThemeWeights themes={themes} weights={weights} onChange={setWeights} />

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-white font-semibold text-lg">Questions</h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setQuestions((qs) => [...qs, createQuestion("mcq")])}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 rounded-lg text-xs font-medium transition-colors"
              >
                <ListChecks className="h-3.5 w-3.5 text-blue-400" /> Multiple Choice
              </button>
              <button
                type="button"
                onClick={() => setQuestions((qs) => [...qs, createQuestion("matching")])}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 rounded-lg text-xs font-medium transition-colors"
              >
                <Shuffle className="h-3.5 w-3.5 text-purple-400" /> Matching
              </button>
              <button
                type="button"
                onClick={() => setQuestions((qs) => [...qs, createQuestion("hotspot")])}
                className="flex items-center gap-1.5 px-3 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-200 rounded-lg text-xs font-medium transition-colors"
              >
                <Crosshair className="h-3.5 w-3.5 text-emerald-400" /> Hotspot
              </button>
            </div>
          </div>

          {questions.length === 0 && (
            <div className="text-center py-16 border border-dashed border-gray-800 rounded-xl">
              <ListChecks className="h-10 w-10 text-gray-700 mx-auto mb-3" />
              <p className="text-gray-300 text-sm mb-4">No questions yet.</p>
              <button
                type="button"
                onClick={() => setQuestions([createQuestion("mcq")])}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm transition-colors"
              >
                <Plus className="h-4 w-4" /> Add first question
              </button>
            </div>
          )}

          {questions.map((question, index) => (
            <QuestionCard
              key={question.key}
              question={question}
              index={index}
              total={questions.length}
              onChange={(next) => updateQuestion(index, next)}
              onRemove={removeQuestion}
              onMove={moveQuestion}
            />
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-gray-800 pt-6">
          <p className="text-gray-500 text-xs">
            Every question is scored automatically — no manual marking required.
          </p>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <>{editId ? "Save Changes" : "Save Application Test"}</>}
          </button>
        </div>
      </div>
    </div>
  );
}