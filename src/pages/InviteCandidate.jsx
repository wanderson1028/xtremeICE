import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Send, CheckCircle2, Loader2, Mail, User, Edit2, Eye, EyeOff } from "lucide-react";

export default function InviteCandidate() {
  const navigate = useNavigate();
  const params = new URLSearchParams(window.location.search);
  const assessmentId = params.get("assessment_id");

  const candidateName = params.get("candidate_name") || "";
  const candidateEmail = params.get("candidate_email") || "";
  const [form, setForm] = useState({ candidate_name: candidateName, candidate_email: candidateEmail });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  const { data: assessment } = useQuery({
    queryKey: ["assessment", assessmentId],
    queryFn: () => base44.entities.Assessment.get(assessmentId),
    enabled: !!assessmentId,
  });

  const { data: me } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const handleSend = async () => {
    if (!form.candidate_name || !form.candidate_email) { setError("Name and email are required."); return; }
    if (!form.candidate_email.includes("@")) { setError("Please enter a valid email address."); return; }
    setError("");
    setSending(true);

    try {
      const res = await base44.functions.invoke("sendCandidateInvite", {
        candidate_name: form.candidate_name,
        candidate_email: form.candidate_email.trim().toLowerCase(),
        assessment_id: assessmentId,
        app_url: window.location.origin,
      });

      if (res?.data?.emailSent !== true) {
        const reason = res?.data?.emailFailReason || "";
        setError(
          "The invitation was created, but the email could not be delivered (" +
          (reason || "the email service did not confirm delivery") +
          "). Direct link: " + (res?.data?.assessmentLink || "unavailable")
        );
      } else {
        setSent(true);
        setEditMode(false);
      }
      } catch (e) {
      setError(e.message || "Failed to send invitation. Please try again.");
      } finally {
      setSending(false);
      }
      };

  const inputCls = "w-full bg-gray-900 border border-gray-700 text-white rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-red-600 transition-colors placeholder-gray-600";
  const labelCls = "block text-sm font-medium text-gray-300 mb-1.5";

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/10">
      <div className="border-b border-gray-800 bg-black/50 px-6 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <span className="text-gray-600">|</span>
          <h1 className="text-white font-bold">Invite Candidate</h1>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-12">
        {sent ? (
          <div className="text-center py-16">
            <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
            <h2 className="text-white text-2xl font-bold mb-2">Invitation Sent!</h2>
            <p className="text-gray-400 mb-2">{form.candidate_name} will receive an email at <span className="text-white">{form.candidate_email}</span></p>
            <p className="text-gray-500 text-sm mb-8">The invitation link is valid for 7 days.</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => { setForm({ candidate_name: "", candidate_email: "" }); setSent(false); }} className="px-4 py-2.5 border border-gray-700 text-gray-300 hover:text-white rounded-lg text-sm transition-colors">
                Invite Another
              </button>
              <button onClick={() => navigate(`/assessment-detail?id=${assessmentId}`)} className="px-4 py-2.5 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm transition-colors">
                View Assessment
              </button>
            </div>
          </div>
        ) : (
          <>
            {assessment && (
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 mb-6">
                <p className="text-gray-400 text-xs uppercase mb-1">Sending assessment</p>
                <p className="text-white font-semibold">{assessment.position_title}</p>
                <p className="text-gray-400 text-sm">{assessment.assessment_type} · {assessment.seniority_level} · {assessment.duration_minutes} min</p>
              </div>
            )}

            {editMode ? (
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 space-y-4">
                <h2 className="text-white font-semibold text-lg">Edit Candidate Details</h2>

                {error && <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">{error}</div>}

                <div>
                  <label className={labelCls}><User className="inline h-3.5 w-3.5 mr-1.5" />Candidate Name *</label>
                  <input className={inputCls} placeholder="Jane Smith" value={form.candidate_name} onChange={e => setForm(f => ({ ...f, candidate_name: e.target.value }))} />
                </div>

                <div>
                  <label className={labelCls}><Mail className="inline h-3.5 w-3.5 mr-1.5" />Candidate Email *</label>
                  <input type="email" className={inputCls} placeholder="jane@example.com" value={form.candidate_email} onChange={e => setForm(f => ({ ...f, candidate_email: e.target.value }))} />
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setEditMode(false)} className="flex-1 py-2.5 border border-gray-700 text-gray-300 hover:text-white rounded-lg text-sm transition-colors">
                    Cancel
                  </button>
                  <button onClick={() => { if (!form.candidate_name || !form.candidate_email) { setError("Name and email are required."); return; } if (!form.candidate_email.includes("@")) { setError("Please enter a valid email address."); return; } setError(""); setEditMode(false); }} className="flex-1 py-2.5 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm transition-colors font-bold">
                    Save Changes
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-white font-semibold text-lg">Send Invitation</h2>
                  <button onClick={() => setEditMode(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 rounded-lg transition-colors">
                    <Edit2 className="h-3.5 w-3.5" /> Edit
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Candidate</p>
                    <p className="text-white font-medium">{form.candidate_name}</p>
                    <p className="text-gray-400 text-sm">{form.candidate_email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase mb-1">Position</p>
                    <p className="text-white font-medium">{assessment?.position_title}</p>
                    <p className="text-gray-400 text-sm">{assessment?.assessment_type}</p>
                  </div>
                </div>

                {error && <div className="p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-sm">{error}</div>}

                {/* Email Preview / Edit */}
                <div className="border border-gray-700 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowPreview(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-800/60 hover:bg-gray-800 transition-colors text-sm"
                  >
                    <span className="flex items-center gap-2 text-gray-200 font-medium">
                      <Mail className="h-4 w-4 text-red-400" />
                      Email Preview &amp; Edit
                    </span>
                    {showPreview ? <EyeOff className="h-4 w-4 text-gray-500" /> : <Eye className="h-4 w-4 text-gray-500" />}
                  </button>

                  {showPreview && (
                    <div className="p-4 space-y-3 bg-gray-900/40">
                      <div>
                        <p className="block text-xs text-gray-500 uppercase mb-1.5">Subject</p>
                        <p className="text-sm text-gray-200">
                          {assessment?.assessment_kind === "application_test" ? "Application Test Invitation" : "Skills Assessment Invitation"}
                          {assessment?.position_title ? ` — ${assessment.position_title}` : ""}
                          {assessment?.company_name ? ` at ${assessment.company_name}` : ""}
                        </p>
                      </div>
                      <div>
                        <p className="block text-xs text-gray-500 uppercase mb-1.5">Message</p>
                        <p className="text-xs text-gray-400 leading-relaxed">
                          Hello <span className="text-white">{form.candidate_name || "[Candidate Name]"}</span>, you have been invited to complete a
                          {" "}{assessment?.assessment_kind === "application_test" ? "timed application test" : "hands-on cybersecurity skills assessment"} for the
                          {" "}<span className="text-red-400">{assessment?.position_title || "Cybersecurity Position"}</span> position
                          {assessment?.company_name ? ` at ${assessment.company_name}` : ""}.
                        </p>
                      </div>
                      <p className="text-xs text-gray-600">A branded start button with this candidate's unique secure link is appended automatically. Use “Invite Multiple” to send to several candidates at once.</p>
                    </div>
                  )}
                </div>

                <button onClick={handleSend} disabled={sending || !form.candidate_name || !form.candidate_email} className="w-full py-3 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-lg font-bold text-sm transition-colors flex items-center justify-center gap-2">
                  {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending Invitation...</> : <><Send className="h-4 w-4" /> Send Invitation</>}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}