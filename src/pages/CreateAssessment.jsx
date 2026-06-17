import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, ChevronRight, CheckCircle2, Loader2, Mail, Copy, Check } from "lucide-react";
import { VIRTUAL_LABS, LINUX_LABS, POWERSHELL_LABS, LAB_COURSES } from "@/lib/labCatalog";

const SESSION_CATEGORIES = {
  "Active Labs": "lab_scenarios",
  "SOC Response Drills": "soc_training",
  "Assessment Scenarios": "soc_assessments"
};

const STEPS = ["Session Type", "Select Labs", "Assessment Details"];

export default function CreateAssessment() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedLabs, setSelectedLabs] = useState([]);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [createdAssessmentId, setCreatedAssessmentId] = useState(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const allLabs = [...VIRTUAL_LABS, ...LINUX_LABS, ...POWERSHELL_LABS, ...LAB_COURSES];

  const [form, setForm] = useState({
    position_title: "",
    company_name: "",
    candidate_name: "",
    candidate_email: "",
    assessment_date: "",
    assessment_time: "",
  });

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const goToStep = (n) => { setStep(n); window.scrollTo({ top: 0, behavior: "instant" }); };

  const getLabsForCategory = () => {
    if (!selectedCategory) return [];
    let labs;
    if (selectedCategory === "Active Labs") {
      labs = allLabs;
    } else {
      // SOC Response Drills and Assessment Scenarios only show LAB_COURSES, not network/virtual labs
      labs = [...LAB_COURSES];
    }
    return labs.map(lab => ({ id: lab.id, title: lab.title, type: "lab", data: lab }));
  };

  const availableLabs = getLabsForCategory();

  const handleSelectLab = (lab) => {
    if (selectedLabs.find(l => l.id === lab.id)) {
      setSelectedLabs(selectedLabs.filter(l => l.id !== lab.id));
    } else {
      setSelectedLabs([...selectedLabs, lab]);
    }
  };

  const handleCreateAssessment = async () => {
    if (!form.position_title) {
      setError("Position title is required.");
      return;
    }
    if (!form.candidate_name) {
      setError("Candidate name is required.");
      return;
    }
    if (!form.candidate_email) {
      setError("Candidate email is required.");
      return;
    }
    if (!form.assessment_date || !form.assessment_time) {
      setError("Assessment date and time are required.");
      return;
    }
    if (selectedLabs.length === 0) {
      setError("Select at least one lab.");
      return;
    }

    setError("");
    setSaving(true);
    try {
      const res = await base44.functions.invoke("saveAssessment", {
        assessmentData: {
          position_title: form.position_title,
          company_name: form.company_name,
          assessment_type: "Custom",
          seniority_level: "intermediate",
          difficulty: "Intermediate",
          duration_minutes: 60,
          job_description_raw: `Labs: ${selectedLabs.map(l => l.title).join(", ")}`,
          required_tools: selectedLabs.flatMap(l => l.data.tags || []),
          custom_tasks: `Selected labs: ${selectedLabs.map(l => l.title).join(", ")}`,
          status: "active",
          generated: false,
          organization_id: me?.organization_id || null,
        },
        tasks: [],
      });

      setCreatedAssessmentId(res.data.assessment_id);
    } catch (e) {
      setError(e.message || "Failed to create assessment.");
    } finally {
      setSaving(false);
    }
  };

  const handleSendInvite = async () => {
    if (!createdAssessmentId) return;
    setSaving(true);
    try {
      await base44.functions.invoke("sendCandidateInvite", {
        assessment_id: createdAssessmentId,
        candidate_name: form.candidate_name,
        candidate_email: form.candidate_email,
        assessment_date: `${form.assessment_date} ${form.assessment_time}`,
        position_title: form.position_title,
        company_name: form.company_name,
      });
      navigate("/CandidateAssessments");
    } catch (e) {
      setError(e.message || "Failed to send invitation.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-colors placeholder-gray-600";
  const labelCls = "block text-sm font-medium text-gray-300 mb-1.5";

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/10">
      {/* Header */}
      <div className="border-b border-gray-800 bg-black/50 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate("/CandidateAssessments")} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <span className="text-gray-600">|</span>
          <h1 className="text-white font-bold">Create Assessment from Labs</h1>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Step indicators */}
        {!createdAssessmentId && (
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <React.Fragment key={s}>
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  i === step ? "bg-red-800 text-white" :
                  i < step ? "bg-green-900/40 text-green-400 border border-green-700/40" :
                  "text-gray-600"
                }`}>
                  {i < step ? <CheckCircle2 className="h-3 w-3" /> : <span>{i + 1}</span>}
                  {s}
                </div>
                {i < STEPS.length - 1 && <ChevronRight className="h-3.5 w-3.5 text-gray-700" />}
              </React.Fragment>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-6 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">{error}</div>
        )}

        {/* Step 0: Session Category */}
        {step === 0 && !createdAssessmentId && (
          <div className="space-y-6">
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
              <h2 className="text-white font-semibold text-lg mb-5">Select Session Type</h2>
              <p className="text-gray-400 text-sm mb-4">Choose the type of training session you want to base this assessment on:</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {Object.entries(SESSION_CATEGORIES).map(([label, key]) => (
                  <button
                    key={key}
                    onClick={() => { setSelectedCategory(label); setSelectedLabs([]); }}
                    className={`p-4 rounded-lg border-2 transition-all text-left ${
                      selectedCategory === label
                        ? "border-red-600 bg-red-900/20 text-white"
                        : "border-gray-700 bg-gray-800/40 text-gray-300 hover:border-gray-600"
                    }`}
                  >
                    <p className="font-semibold text-sm">{label}</p>
                    <p className="text-xs text-gray-500 mt-1">{key.replace(/_/g, " ")}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <button 
                onClick={() => { if (!selectedCategory) { setError("Select a session type first."); return; } setError(""); goToStep(1); }} 
                className="px-6 py-2.5 bg-red-700 hover:bg-red-600 text-white rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Select Labs */}
        {step === 1 && !createdAssessmentId && (
          <div className="space-y-6">
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-white font-semibold text-lg">{selectedCategory}</h2>
                  <p className="text-gray-400 text-sm mt-1">Select one or more labs for this assessment:</p>
                </div>
                <span className="text-sm font-semibold px-3 py-1.5 bg-red-900/30 border border-red-700/40 text-red-400 rounded-full">
                  {selectedLabs.length} selected
                </span>
              </div>

              {availableLabs.length === 0 ? (
                <div className="text-center py-10 text-gray-500 text-sm">
                  No labs available for this session type.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {availableLabs.map(lab => (
                    <button
                      key={lab.id}
                      onClick={() => handleSelectLab(lab)}
                      className={`p-4 rounded-lg border-2 transition-all text-left flex flex-col ${
                        selectedLabs.find(l => l.id === lab.id)
                          ? "border-red-600 bg-red-900/20"
                          : "border-gray-700 bg-gray-800/30 hover:border-gray-600"
                      }`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <div className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${
                          selectedLabs.find(l => l.id === lab.id)
                            ? "border-red-500 bg-red-600"
                            : "border-gray-600"
                        }`}>
                          {selectedLabs.find(l => l.id === lab.id) && (
                            <CheckCircle2 className="h-3 w-3 text-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm">{lab.title}</p>
                        </div>
                      </div>
                      {lab.data.description && (
                        <p className="text-gray-400 text-xs line-clamp-2 mb-3">{lab.data.description}</p>
                      )}
                      {lab.data.difficulty && (
                        <div className="flex items-center gap-2 mt-auto">
                          <span className="text-[10px] px-2 py-0.5 rounded bg-gray-800 text-gray-400">
                            {lab.data.difficulty}
                          </span>
                          {lab.data.estimated_duration_minutes && (
                            <span className="text-[10px] text-gray-500">{lab.data.estimated_duration_minutes} min</span>
                          )}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button 
                onClick={() => { setSelectedLabs([]); setSelectedCategory(null); goToStep(0); }} 
                className="px-4 py-2.5 border border-gray-700 text-gray-300 hover:text-white rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button 
                onClick={() => goToStep(2)} 
                disabled={selectedLabs.length === 0}
                className="px-6 py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
              >
                Next <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Assessment Details */}
        {step === 2 && !createdAssessmentId && (
          <div className="space-y-6">
            {/* Assessment Info */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
              <h2 className="text-white font-semibold text-lg mb-5">Assessment Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Position Title *</label>
                  <input 
                    className={inputCls} 
                    placeholder="e.g. SOC Analyst" 
                    value={form.position_title} 
                    onChange={e => set("position_title", e.target.value)} 
                  />
                </div>
                <div>
                  <label className={labelCls}>Company Name</label>
                  <input 
                    className={inputCls} 
                    placeholder="e.g. Acme Corp" 
                    value={form.company_name} 
                    onChange={e => set("company_name", e.target.value)} 
                  />
                </div>
              </div>
            </div>

            {/* Candidate Info */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
              <h2 className="text-white font-semibold text-lg mb-5">Candidate Information</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Candidate Name *</label>
                  <input 
                    className={inputCls} 
                    placeholder="e.g. John Doe" 
                    value={form.candidate_name} 
                    onChange={e => set("candidate_name", e.target.value)} 
                  />
                </div>
                <div>
                  <label className={labelCls}>Candidate Email *</label>
                  <input 
                    className={inputCls} 
                    type="email"
                    placeholder="e.g. john@example.com" 
                    value={form.candidate_email} 
                    onChange={e => set("candidate_email", e.target.value)} 
                  />
                </div>
              </div>
            </div>

            {/* Assessment Schedule */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
              <h2 className="text-white font-semibold text-lg mb-5">Assessment Schedule</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Date *</label>
                  <input 
                    type="date"
                    className={inputCls + " [color-scheme:dark]"} 
                    value={form.assessment_date} 
                    onChange={e => set("assessment_date", e.target.value)} 
                  />
                </div>
                <div>
                  <label className={labelCls}>Time *</label>
                  <input 
                    type="time"
                    className={inputCls + " [color-scheme:dark]"} 
                    value={form.assessment_time} 
                    onChange={e => set("assessment_time", e.target.value)} 
                  />
                </div>
              </div>
            </div>

            {/* Selected Labs */}
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
              <h3 className="text-white font-semibold mb-3">Selected Labs ({selectedLabs.length})</h3>
              <div className="space-y-2">
                {selectedLabs.map((lab, i) => (
                  <div key={lab.id} className="flex items-center gap-3 p-3 bg-gray-800/40 border border-gray-700 rounded-lg">
                    <span className="text-sm font-mono text-gray-500">{i + 1}.</span>
                    <div className="flex-1">
                      <p className="text-white text-sm font-medium">{lab.title}</p>
                      <p className="text-gray-500 text-xs">{lab.data.difficulty || ""}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <button 
                onClick={() => goToStep(1)} 
                className="px-4 py-2.5 border border-gray-700 text-gray-300 hover:text-white rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
              <button 
                onClick={handleCreateAssessment} 
                disabled={saving}
                className="px-6 py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
              >
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating...</> : "Create Assessment"}
              </button>
            </div>
          </div>
        )}

        {/* Post-Creation: Send Invite */}
        {createdAssessmentId && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 p-4 bg-green-950/30 border border-green-700/40 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-400 shrink-0" />
              <div>
                <p className="text-green-300 font-semibold">Assessment Created Successfully</p>
                <p className="text-green-400/70 text-xs mt-0.5">Ready to send invitation to candidate</p>
              </div>
            </div>

            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6">
              <h2 className="text-white font-semibold text-lg mb-5">Send Invitation</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-gray-400 text-sm mb-2">Candidate</p>
                  <p className="text-white font-medium">{form.candidate_name}</p>
                  <p className="text-gray-500 text-sm">{form.candidate_email}</p>
                </div>
                <div className="border-t border-gray-800 pt-4">
                  <p className="text-gray-400 text-sm mb-2">Position</p>
                  <p className="text-white font-medium">{form.position_title}</p>
                  {form.company_name && <p className="text-gray-500 text-sm">{form.company_name}</p>}
                </div>
                <div className="border-t border-gray-800 pt-4">
                  <p className="text-gray-400 text-sm mb-2">Assessment Date & Time</p>
                  <p className="text-white font-medium">{form.assessment_date} {form.assessment_time}</p>
                </div>
              </div>
            </div>

            <div className="bg-blue-950/30 border border-blue-700/40 rounded-xl p-4">
              <p className="text-blue-300 text-sm">An invitation email will be sent to the candidate with a link to create an account and begin the assessment.</p>
            </div>

            <div className="flex items-center gap-3">
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(form.candidate_email);
                  setCopiedEmail(true);
                  setTimeout(() => setCopiedEmail(false), 2000);
                }}
                className="px-4 py-2.5 border border-gray-700 text-gray-300 hover:text-white rounded-lg text-sm transition-colors flex items-center gap-2"
              >
                {copiedEmail ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copiedEmail ? "Copied" : "Copy Email"}
              </button>
              <button 
                onClick={handleSendInvite} 
                disabled={saving}
                className="ml-auto px-6 py-2.5 bg-green-700 hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
              >
                {saving ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : <><Mail className="h-4 w-4" /> Send Invitation</>}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}