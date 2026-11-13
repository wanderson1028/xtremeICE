import React, { useCallback, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { BookOpenCheck, ClipboardCheck, Loader2, Sparkles, Wand2 } from "lucide-react";
import OrganizationPicker from "@/components/trainingdesigner/OrganizationPicker";
import AssessmentPicker from "@/components/trainingdesigner/AssessmentPicker";
import FindingSelector from "@/components/trainingdesigner/FindingSelector";
import NiceRoleSelector from "@/components/trainingdesigner/NiceRoleSelector";
import ExercisePreview from "@/components/trainingdesigner/ExercisePreview";
import SavedExercises from "@/components/trainingdesigner/SavedExercises";
import MyAssignments from "@/components/trainingdesigner/MyAssignments";

const message = (error, fallback) => error?.response?.data?.error || error?.response?.data?.message || error?.message || fallback;

export default function TrainingDesigner() {
  const [tab, setTab] = useState("build");

  const [companies, setCompanies] = useState([]);
  const [companiesLoading, setCompaniesLoading] = useState(true);
  const [companiesError, setCompaniesError] = useState("");
  const [organization, setOrganization] = useState(null);
  const [scope, setScope] = useState(null);

  const [assessments, setAssessments] = useState([]);
  const [assessmentsLoading, setAssessmentsLoading] = useState(false);
  const [assessmentsError, setAssessmentsError] = useState("");
  const [assessment, setAssessment] = useState(null);

  const [findings, setFindings] = useState([]);
  const [findingsLoading, setFindingsLoading] = useState(false);
  const [findingsError, setFindingsError] = useState("");
  const [selectedFindingIds, setSelectedFindingIds] = useState([]);

  const [roles, setRoles] = useState([]);
  const [difficulty, setDifficulty] = useState("Intermediate");
  const [duration, setDuration] = useState(45);

  const [draft, setDraft] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [savedFlash, setSavedFlash] = useState("");

  const [saved, setSaved] = useState([]);
  const [attempts, setAttempts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [me, setMe] = useState(null);
  const [savedLoading, setSavedLoading] = useState(true);

  const loadCompanies = useCallback(async () => {
    setCompaniesLoading(true);
    setCompaniesError("");
    try {
      const response = await base44.functions.invoke("vpentestConnection", { action: "status" });
      const data = response.data || {};
      setCompanies(data.companies || []);
      setScope(data.scope || null);
      if (data.status && data.status !== "connected") {
        setCompaniesError(data.message || "The vPenTest connection is not available.");
      }
    } catch (error) {
      setCompaniesError(message(error, "Organizations could not be loaded from vPenTest."));
    } finally {
      setCompaniesLoading(false);
    }
  }, []);

  const loadSaved = useCallback(async () => {
    setSavedLoading(true);
    try {
      const [exercises, attemptPage, assignmentPage, currentUser] = await Promise.all([
        base44.entities.TrainingExercise.filter({}, { sort: "-created_date", limit: 100 }),
        base44.entities.TrainingExerciseAttempt.filter({}, { sort: "-created_date", limit: 200 }),
        base44.entities.TrainingAssignment.filter({}, { sort: "-created_date", limit: 200 }),
        base44.auth.me(),
      ]);
      setSaved(exercises.items || []);
      setAttempts(attemptPage.items || []);
      setAssignments(assignmentPage.items || []);
      setMe(currentUser);
    } finally {
      setSavedLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCompanies();
    loadSaved();
  }, [loadCompanies, loadSaved]);

  const loadAssessments = async (org) => {
    setAssessmentsLoading(true);
    setAssessmentsError("");
    setAssessments([]);
    setAssessment(null);
    setFindings([]);
    setSelectedFindingIds([]);
    setDraft(null);
    try {
      const response = await base44.functions.invoke("vpentestConnection", { action: "assessments", company_id: org.id });
      setAssessments(response.data?.assessments || []);
    } catch (error) {
      setAssessmentsError(message(error, "Assessments could not be loaded for this organization."));
    } finally {
      setAssessmentsLoading(false);
    }
  };

  const loadFindings = async (org, selectedAssessment) => {
    setFindingsLoading(true);
    setFindingsError("");
    setFindings([]);
    setSelectedFindingIds([]);
    setDraft(null);
    try {
      const response = await base44.functions.invoke("vpentestConnection", {
        action: "assessment_package",
        company_id: org.id,
        assessment_id: selectedAssessment.id,
      });
      setFindings((response.data?.findings || []).filter((finding) => finding.id));
    } catch (error) {
      setFindingsError(message(error, "Findings could not be imported for this assessment."));
    } finally {
      setFindingsLoading(false);
    }
  };

  const pickOrganization = (org) => {
    setOrganization(org);
    setSavedFlash("");
    loadAssessments(org);
  };

  const pickAssessment = (selectedAssessment) => {
    setAssessment(selectedAssessment);
    if (organization) loadFindings(organization, selectedAssessment);
  };

  const toggleFinding = (id) => {
    setSelectedFindingIds((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));
  };

  const selectedFindings = findings.filter((finding) => selectedFindingIds.includes(finding.id));

  const toggleRole = (role) => {
    setRoles((current) =>
      current.some((item) => item.id === role.id) ? current.filter((item) => item.id !== role.id) : [...current, role]
    );
  };

  const generate = async () => {
    setGenerateError("");
    if (!selectedFindings.length) { setGenerateError("Select at least one finding."); return; }
    if (!roles.length) { setGenerateError("Choose at least one NICE Framework work role."); return; }
    setGenerating(true);
    try {
      const response = await base44.functions.invoke("generateTrainingExercise", {
        organization_name: organization?.name,
        assessment_name: assessment?.name,
        nice_roles: roles.map((role) => ({ id: role.id, name: role.name, category: role.category, description: role.description })),
        findings: selectedFindings.slice(0, 12),
        difficulty,
        duration_minutes: Number(duration) || 45,
      });
      setDraft(response.data?.exercise || null);
    } catch (error) {
      setGenerateError(message(error, "The exercise could not be generated."));
    } finally {
      setGenerating(false);
    }
  };

  const save = async () => {
    setSaveError("");
    if (!draft?.title?.trim()) { setSaveError("The exercise needs a title."); return; }
    setSaving(true);
    try {
      const me = await base44.auth.me();
      await base44.entities.TrainingExercise.create({
        title: draft.title,
        summary: draft.summary || "",
        status: "published",
        difficulty: draft.difficulty || difficulty,
        duration_minutes: Number(draft.duration_minutes) || Number(duration) || 45,
        organization_id: organization?.id || "",
        organization_name: organization?.name || "",
        app_organization_id: organization?.app_organization_id || "",
        assigned_emails: [],
        source_assessment_id: assessment?.id || "",
        source_assessment_name: assessment?.name || "",
        source_assessment_date: assessment?.created_at || "",
        source_finding_ids: selectedFindings.map((finding) => finding.id),
        source_findings: selectedFindings.map((finding) => ({
          id: finding.id,
          title: finding.title,
          severity: finding.severity,
          asset: finding.asset,
          evidence: String(finding.evidence || "").slice(0, 800),
          mitre_technique_id: finding.mitre_technique_id || "",
        })),
        nice_roles: roles.map((role) => ({ id: role.id, name: role.name, category: role.category })),
        nice_role_id: roles[0]?.id || "",
        nice_role_name: roles.map((role) => role.name).join(", "),
        nice_category: roles[0]?.category || "",
        nice_tasks: draft.nice_tasks || [],
        nice_knowledge: draft.nice_knowledge || [],
        nice_skills: draft.nice_skills || [],
        scenario: draft.scenario || "",
        objectives: draft.objectives || [],
        tasks: draft.tasks || [],
        success_criteria: draft.success_criteria || [],
        generated: true,
        created_by_email: me?.email || "",
      });
      setDraft(null);
      setSelectedFindingIds([]);
      setSavedFlash("Exercise saved. Assign it to learners from the saved exercises list.");
      setTab("saved");
      await loadSaved();
    } catch (error) {
      setSaveError(message(error, "The exercise could not be saved."));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (exercise) => {
    if (!window.confirm(`Delete “${exercise.title}”? This cannot be undone.`)) return;
    await base44.entities.TrainingExercise.delete(exercise.id);
    await loadSaved();
  };

  const openExercise = (exercise) => {
    window.location.href = `/training-designer/${exercise.id}`;
  };

  const handleAssigned = async (created) => {
    setSavedFlash(
      created
        ? `${created} learner${created === 1 ? "" : "s"} assigned to the exercise.`
        : "Those learners already had this exercise assigned."
    );
    await loadSaved();
  };

  const myAssignments = me?.email
    ? assignments.filter(
        (assignment) => String(assignment.assignee_email || "").toLowerCase() === String(me.email).toLowerCase()
      )
    : [];

  return (
    <div className="cfrs-sg min-h-screen">
      <div className="mx-auto max-w-[1480px] px-4 py-7 lg:px-7">
        <header className="sg-enter mb-5 flex flex-wrap items-end justify-between gap-4 border-b pb-5" style={{ borderColor: "#d4d4d4" }}>
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-semibold lg:text-3xl">
              <Wand2 className="h-6 w-6" style={{ color: "#b91c1c" }} /> Training Designer
            </h1>
            <p className="sg-body mt-1" style={{ color: "#404040" }}>
              Turn vPenTest findings into role-specific training exercises for your team.
            </p>
          </div>
          <div className="flex rounded-lg border p-1" style={{ borderColor: "#d4d4d4", background: "#f5f5f5" }}>
            <button
              type="button"
              onClick={() => setTab("build")}
              className={`rounded px-3 py-1.5 text-xs font-semibold ${tab === "build" ? "sg-btn-primary" : ""}`}
            >
              Build exercise
            </button>
            <button
              type="button"
              onClick={() => setTab("saved")}
              className={`rounded px-3 py-1.5 text-xs font-semibold ${tab === "saved" ? "sg-btn-primary" : ""}`}
            >
              Saved exercises ({saved.length})
            </button>
            <button
              type="button"
              onClick={() => setTab("mine")}
              className={`rounded px-3 py-1.5 text-xs font-semibold ${tab === "mine" ? "sg-btn-primary" : ""}`}
            >
              Assigned to me ({myAssignments.length})
            </button>
          </div>
        </header>

        {savedFlash && (
          <p className="mb-4 flex items-center gap-2 rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-xs" style={{ color: "#166534" }}>
            <ClipboardCheck className="h-4 w-4" /> {savedFlash}
          </p>
        )}

        {tab === "saved" ? (
          <SavedExercises
            exercises={saved}
            attempts={attempts}
            assignments={assignments}
            me={me}
            loading={savedLoading}
            onDelete={remove}
            onOpen={openExercise}
            onAssigned={handleAssigned}
          />
        ) : tab === "mine" ? (
          <MyAssignments assignments={myAssignments} exercises={saved} attempts={attempts} me={me} loading={savedLoading} />
        ) : (
          <div className="space-y-4">
            <div className="grid gap-4 xl:grid-cols-2">
              <OrganizationPicker
                companies={companies}
                loading={companiesLoading}
                error={companiesError}
                selectedId={organization?.id}
                onSelect={pickOrganization}
                onRefresh={loadCompanies}
                scope={scope}
              />
              {organization && (
                <AssessmentPicker
                  organizationName={organization.name}
                  assessments={assessments}
                  loading={assessmentsLoading}
                  error={assessmentsError}
                  selectedId={assessment?.id}
                  onSelect={pickAssessment}
                  onRefresh={() => loadAssessments(organization)}
                />
              )}
            </div>

            {assessment && (
              <div className="grid gap-4 xl:grid-cols-2">
                <FindingSelector
                  findings={findings}
                  loading={findingsLoading}
                  error={findingsError}
                  selectedIds={selectedFindingIds}
                  onToggle={toggleFinding}
                  onSelectAll={(all) => setSelectedFindingIds(all.map((finding) => finding.id))}
                  onClear={() => setSelectedFindingIds([])}
                />
                <NiceRoleSelector values={roles} onToggle={toggleRole} onClear={() => setRoles([])} />
              </div>
            )}

            {assessment && (
              <section className="sg-panel sg-enter p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold">
                  <Sparkles className="h-4 w-4" /> 5 · Generate exercise
                </h2>
                <p className="sg-body mt-1" style={{ color: "#404040" }}>
                  {selectedFindings.length} finding{selectedFindings.length === 1 ? "" : "s"} ·{" "}
                  {roles.length
                    ? `${roles.length} role${roles.length === 1 ? "" : "s"} (${roles.map((item) => item.name).join(", ")})`
                    : "no roles selected"}
                </p>
                <div className="mt-3 flex flex-wrap items-end gap-3">
                  <label className="block">
                    <span className="sg-micro">Difficulty</span>
                    <select value={difficulty} onChange={(event) => setDifficulty(event.target.value)} className="sg-input mt-1 h-10 px-3 text-sm">
                      {["Beginner", "Intermediate", "Advanced", "Expert"].map((level) => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="sg-micro">Minutes</span>
                    <input
                      type="number"
                      min={15}
                      max={480}
                      value={duration}
                      onChange={(event) => setDuration(event.target.value)}
                      className="sg-input mt-1 h-10 w-24 px-3 text-sm"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={generate}
                    disabled={generating || findingsLoading}
                    className="sg-btn-primary flex items-center gap-2 px-4 py-2 text-xs font-semibold"
                  >
                    {generating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                    {generating ? "Generating exercise…" : draft ? "Regenerate" : "Generate exercise"}
                  </button>
                  {generating && (
                    <span className="text-[11px]" style={{ color: "#404040" }}>
                      Building a mixed multiple-choice, matching, point-and-click and hands-on sequence…
                    </span>
                  )}
                </div>
                {generateError && <p className="mt-3 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-xs" style={{ color: "#7f1d1d" }}>{generateError}</p>}
              </section>
            )}

            {draft ? (
              <ExercisePreview draft={draft} setDraft={setDraft} onSave={save} saving={saving} error={saveError} />
            ) : (
              <section className="sg-panel p-5">
                <h2 className="flex items-center gap-2 text-sm font-semibold"><BookOpenCheck className="h-4 w-4" /> How it works</h2>
                <ol className="sg-body mt-2 space-y-1 pl-5" style={{ color: "#404040" }}>
                  <li>Pick the organization from the list. App admins choose any organization; organization admins only see their own.</li>
                  <li>Pick the vPenTest assessment to import and select the findings the exercise should be built on.</li>
                  <li>Pick one or more NICE Framework work roles the learner is training for.</li>
                  <li>Generate, edit and save the exercise.</li>
                  <li>Assign it to individual learners or the whole organization, then track attempts from Saved exercises.</li>
                </ol>
              </section>
            )}
          </div>
        )}
      </div>
    </div>
  );
}