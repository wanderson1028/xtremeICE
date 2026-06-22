import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Check } from "lucide-react";

import Step1Basics from "@/components/labs/builder/Step1Basics";
import Step2Environment from "@/components/labs/builder/Step2Environment";
import Step3Content from "@/components/labs/builder/Step3Content";
import Step4Assessment from "@/components/labs/builder/Step4Assessment";
import Step5NiceMapping from "@/components/labs/builder/Step5NiceMapping";

const STEPS = ["Basics", "Environment", "Content", "Assessment", "NICE Mapping"];

const DEFAULT_FORM = {
  title: "", description: "", difficulty: "Beginner",
  estimated_duration_minutes: 60, tags: [], status: "draft",
  environment_profile_id: "",
  objectives: [], prerequisites: [], passing_score: 70,
  nice_category: "", nice_work_role: "", nice_task_ids: [], nice_ksa_ids: [],
};

export default function LabBuilder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get("id");

  const [step, setStep] = useState(0);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [modules, setModules] = useState([]);
  const [saving, setSaving] = useState(false);

  const { data: existing } = useQuery({
    queryKey: ["lab-template", editId],
    queryFn: () => base44.entities.LabTemplate.filter({ id: editId }).then(r => r[0]),
    enabled: !!editId,
  });

  const { data: existingModules = [] } = useQuery({
    queryKey: ["lab-modules", editId],
    queryFn: () => base44.entities.CourseModule.filter({ template_id: editId }),
    enabled: !!editId,
  });

  useEffect(() => {
    if (existing) setForm({ ...DEFAULT_FORM, ...existing });
  }, [existing]);

  useEffect(() => {
    if (existingModules.length) setModules(existingModules);
  }, [existingModules]);

  const updateForm = (updates) => setForm(prev => ({ ...prev, ...updates }));

  const handleSave = async () => {
    setSaving(true);
    try {
      let templateId = editId;
      if (editId) {
        await base44.entities.LabTemplate.update(editId, form);
      } else {
        const created = await base44.entities.LabTemplate.create(form);
        templateId = created.id;
      }
      // Sync modules: delete removed, create/update remaining
      for (const mod of existingModules) {
        if (!modules.find(m => m.id === mod.id)) {
          await base44.entities.CourseModule.delete(mod.id);
        }
      }
      for (const mod of modules) {
        if (mod.id) {
          await base44.entities.CourseModule.update(mod.id, { ...mod, template_id: templateId });
        } else {
          await base44.entities.CourseModule.create({ ...mod, template_id: templateId });
        }
      }
      queryClient.invalidateQueries({ queryKey: ["lab-templates"] });
      navigate("/LabTemplates");
    } finally {
      setSaving(false);
    }
  };

  const stepProps = { form, updateForm };

  return (
    <div className="min-h-screen bg-gray-950 p-6">
      <div className="max-w-3xl mx-auto">
        <Link to="/LabBuilderDashboard" className="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-5 transition-colors">
          <ChevronLeft className="h-4 w-4" /> Course Lab Builder
        </Link>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">{editId ? "Edit Lab Template" : "Create Lab Template"}</h1>
          <p className="text-gray-400 text-sm mt-1">Build a NICE Framework-aligned lab course</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center mb-8">
          {STEPS.map((s, i) => (
            <React.Fragment key={s}>
              <button
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm transition-all ${
                  i === step ? "text-white font-semibold" :
                  i < step ? "text-green-400 cursor-pointer hover:text-green-300" : "text-gray-600"
                }`}
              >
                <span className={`h-6 w-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                  i < step ? "bg-green-700" : i === step ? "bg-red-700" : "bg-gray-800"
                }`}>
                  {i < step ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className="hidden sm:inline">{s}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-px mx-1 ${i < step ? "bg-green-800" : "bg-gray-800"}`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step Content */}
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 mb-6">
          {step === 0 && <Step1Basics {...stepProps} />}
          {step === 1 && <Step2Environment {...stepProps} />}
          {step === 2 && <Step3Content {...stepProps} modules={modules} setModules={setModules} />}
          {step === 3 && <Step4Assessment {...stepProps} />}
          {step === 4 && <Step5NiceMapping {...stepProps} />}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline"
            onClick={() => step === 0 ? navigate("/LabTemplates") : setStep(s => s - 1)}
            className="bg-transparent border-gray-700 text-gray-300 hover:bg-gray-800">
            <ChevronLeft className="h-4 w-4 mr-1" />
            {step === 0 ? "Cancel" : "Back"}
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={() => setStep(s => s + 1)} disabled={!form.title}
              className="bg-red-700 hover:bg-red-600 text-white">
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={saving || !form.title}
              className="bg-green-700 hover:bg-green-600 text-white">
              {saving ? "Saving..." : editId ? "Update Template" : "Create Template"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}