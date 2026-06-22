import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Save, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import StepIndicator from "@/components/labbuilder/StepIndicator";
import StepBasics from "@/components/labbuilder/StepBasics";
import StepEnvironment from "@/components/labbuilder/StepEnvironment";
import StepContent from "@/components/labbuilder/StepContent";
import StepNiceMapping from "@/components/labbuilder/StepNiceMapping";

const STEP_TITLES = ["Lab Basics", "Environment", "Content & Steps", "NICE Framework Mapping"];

export default function LabBuilder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [data, setData] = useState({
    title: "",
    description: "",
    difficulty: "Beginner",
    estimated_duration_minutes: 60,
    tags: [],
    prerequisites: [],
    environment_profile_id: "",
    network_topology: { name: "", description: "", devices: [] },
    objectives: [],
    steps: [],
    lab_learning_purpose: "",
    lab_authenticity: "",
    lab_guidance: "",
    nice_category: "",
    nice_work_role: "",
    nice_task_ids: [],
    nice_ksa_ids: [],
    nice_mapping_notes: "",
    nice_evidence_of_performance: "",
    nice_rubric_criteria: [],
    status: "draft",
    version: "1.0",
  });

  const update = (patch) => setData((prev) => ({ ...prev, ...patch }));

  const canProceed = () => {
    if (currentStep === 0) return data.title?.trim() && data.difficulty;
    if (currentStep === 3) return data.nice_category;
    return true;
  };

  const handleNext = () => {
    if (!canProceed()) return;
    setCurrentStep((s) => Math.min(s + 1, 3));
  };

  const handleBack = () => setCurrentStep((s) => Math.max(s - 1, 0));

  const handleSave = async (publish = false) => {
    if (!data.title?.trim() || !data.nice_category || !data.difficulty) {
      alert("Please complete required fields: Title, Difficulty (Basics) and NICE Category (NICE Mapping).");
      return;
    }
    setSaving(true);
    try {
      const payload = { ...data };
      if (publish) payload.status = "published";

      await base44.entities.LabTemplate.create(payload);
      queryClient.invalidateQueries({ queryKey: ["lab-templates"] });
      setSaved(true);
      setTimeout(() => navigate("/training-catalog"), 1500);
    } catch (err) {
      alert("Failed to save lab: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return <StepBasics data={data} update={update} />;
      case 1:
        return <StepEnvironment data={data} update={update} />;
      case 2:
        return <StepContent data={data} update={update} />;
      case 3:
        return <StepNiceMapping data={data} update={update} />;
      default:
        return null;
    }
  };

  if (saved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-black via-gray-950 to-red-950/20">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white">Lab Saved!</h2>
          <p className="text-gray-400 text-sm mt-1">Redirecting to catalog...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/10">
      {/* Header */}
      <div className="border-b border-gray-800 bg-black/50 px-6 py-5">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-100 tracking-tight">Lab Builder</h1>
              <p className="text-gray-400 text-sm mt-0.5">
                {STEP_TITLES[currentStep]} — Step {currentStep + 1} of 4
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={() => navigate("/training-catalog")}
              className="text-gray-400 hover:text-white"
            >
              Cancel
            </Button>
          </div>
          <StepIndicator currentStep={currentStep} />
        </div>
      </div>

      {/* Form Body */}
      <div className="max-w-3xl mx-auto px-6 py-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Footer Nav */}
      <div className="sticky bottom-0 border-t border-gray-800 bg-black/80 backdrop-blur-sm px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={handleBack}
            disabled={currentStep === 0}
            className="text-gray-300 hover:text-white disabled:opacity-30"
          >
            <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
          </Button>

          <div className="flex items-center gap-2">
            {currentStep === 3 && (
              <Button
                variant="ghost"
                onClick={() => handleSave(false)}
                disabled={saving}
                className="text-gray-300 hover:text-white border border-gray-700"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <Save className="h-4 w-4 mr-1.5" />}
                Save Draft
              </Button>
            )}
            {currentStep < 3 ? (
              <Button
                onClick={handleNext}
                disabled={!canProceed()}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Next <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            ) : (
              <Button
                onClick={() => handleSave(true)}
                disabled={saving}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-1.5" /> : <CheckCircle2 className="h-4 w-4 mr-1.5" />}
                Save & Publish
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}