import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ChevronLeft, FileText, Server, BookOpen, Target, Download } from "lucide-react";

import Step1Basics from "@/components/labs/builder/Step1Basics";
import Step2Environment from "@/components/labs/builder/Step2Environment";
import Step3Content from "@/components/labs/builder/Step3Content";
import Step5NiceMapping from "@/components/labs/builder/Step5NiceMapping";
import StepExportConfig from "@/components/labs/builder/StepExportConfig";
import ExportResultsModal from "@/components/labs/exports/ExportResultsModal";
import AIGeneratorPanel from "@/components/labs/builder/AIGeneratorPanel";
import SectionCard from "@/components/labs/builder/SectionCard";
import BuilderSidebar from "@/components/labs/builder/BuilderSidebar";

const DEFAULT_FORM = {
  title: "", description: "", difficulty: "Beginner",
  estimated_duration_minutes: 60, tags: [], status: "draft",
  environment_profile_id: "",
  objectives: [], prerequisites: [], passing_score: 70,
  nice_category: "", nice_work_role: "", nice_task_ids: [], nice_tks_ids: [],
  export_instructor_guide: false, export_student_guide: false, export_lms_outline: false,
};

const SECTIONS = [
  { id: "basics", label: "Basics & Objectives", icon: FileText },
  { id: "environment", label: "Environment", icon: Server },
  { id: "content", label: "Course Content", icon: BookOpen },
  { id: "nice", label: "NICE Mapping", icon: Target },
  { id: "exports", label: "Export Config", icon: Download },
];

export default function LabBuilder() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const editId = urlParams.get("id");

  const [form, setForm] = useState(DEFAULT_FORM);
  const [modules, setModules] = useState([]);
  const [saving, setSaving] = useState(false);
  const [exportResults, setExportResults] = useState(null);

  const { data: existing } = useQuery({
    queryKey: ["lab-template", editId],
    queryFn: () => base44.entities.LabTemplate.filter({ id: editId }).then((r) => r[0]),
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

  const updateForm = (updates) => setForm((prev) => ({ ...prev, ...updates }));

  const scrollToSection = (id) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
      for (const mod of existingModules) {
        if (!modules.find((m) => m.id === mod.id)) {
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
      setExportResults({ template: { ...form, id: templateId }, modules });
    } finally {
      setSaving(false);
    }
  };

  const basicsComplete = !!form.title;
  const contentComplete = modules.length > 0;
  const niceComplete = !!(form.nice_category && form.nice_work_role);

  return (
    <div className="min-h-screen bg-gray-950 p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        <Link
          to="/LabBuilderDashboard"
          className="inline-flex items-center gap-1 text-gray-400 hover:text-white text-sm mb-5 transition-colors"
        >
          <ChevronLeft className="h-4 w-4" /> Course Lab Builder
        </Link>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">
            {editId ? "Edit Lab Template" : "Create Lab Template"}
          </h1>
          <p className="text-gray-400 text-sm mt-1">
            Build a NICE Framework-aligned lab course — all sections are editable below
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-6">
          {/* Sidebar */}
          <BuilderSidebar
            form={form}
            modules={modules}
            saving={saving}
            onSave={handleSave}
            sections={SECTIONS}
            onNavigate={scrollToSection}
          />

          {/* Main Canvas */}
          <div className="space-y-4 min-w-0">
            <AIGeneratorPanel updateForm={updateForm} setModules={setModules} />

            <SectionCard
              id="basics"
              icon={FileText}
              title="Basics & Objectives"
              subtitle="Title, description, difficulty, and learning objectives"
              tip="Clear learning objectives help students understand what they'll achieve and guide your assessment design. Aim for 3–5 measurable objectives."
              complete={basicsComplete}
            >
              <Step1Basics form={form} updateForm={updateForm} />
            </SectionCard>

            <SectionCard
              id="environment"
              icon={Server}
              title="Lab Environment"
              subtitle="Select the workspace image for this lab"
              tip="The environment provides students with a consistent, isolated workspace. You can skip this and configure it later."
              complete={true}
            >
              <Step2Environment form={form} updateForm={updateForm} />
            </SectionCard>

            <SectionCard
              id="content"
              icon={BookOpen}
              title="Course Content"
              subtitle="Build modules with guided pacing and instructional mix"
              tip="A balanced lab mixes reading, hands-on practice, and assessment. Use the pacing bar to monitor your instructional mix, and the Preview button to see how students will view each module."
              complete={contentComplete}
            >
              <Step3Content modules={modules} setModules={setModules} />
            </SectionCard>

            <SectionCard
              id="nice"
              icon={Target}
              title="NICE Framework Mapping"
              subtitle="Align with the NICE Cybersecurity Workforce Framework"
              tip="NICE mapping helps students and employers understand how this lab develops specific workforce competencies."
              complete={niceComplete}
            >
              <Step5NiceMapping form={form} updateForm={updateForm} />
            </SectionCard>

            <SectionCard
              id="exports"
              icon={Download}
              title="Export Configuration"
              subtitle="Choose which artifacts to generate"
              tip="The NICE Alignment Report is always generated. Instructor Guide, Student Guide, and LMS Outline are optional — enable them to generate downloadable materials after saving."
              complete={true}
            >
              <StepExportConfig form={form} updateForm={updateForm} />
            </SectionCard>
          </div>
        </div>

        {exportResults && (
          <ExportResultsModal
            template={exportResults.template}
            modules={exportResults.modules}
            onClose={() => {
              setExportResults(null);
              navigate("/LabTemplates");
            }}
          />
        )}
      </div>
    </div>
  );
}