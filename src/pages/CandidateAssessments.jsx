import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link } from "react-router-dom";
import { Plus, ClipboardList, Users, BarChart3, Eye, Trash2, Send, CheckCircle2, Clock, AlertCircle, Activity, TrendingUp, UserCheck, Hourglass, X } from "lucide-react";

const STATUS_STYLE = {
  draft: "bg-gray-800 text-gray-400 border-gray-700",
  active: "bg-green-900/30 text-green-400 border-green-700/40",
  archived: "bg-gray-900 text-gray-600 border-gray-800",
};

function getAssessmentTrackStatus(assessment, invitations) {
  const hasCompleted = invitations.some(
    i => i.assessment_id === assessment.id && (i.status === "completed" || i.status === "evaluated")
  );
  if (hasCompleted) return "completed";
  const hasInvites = invitations.some(i => i.assessment_id === assessment.id);
  if (assessment.status === "active" || hasInvites) return "ready";
  return "draft";
}

const TRACK_STATUS_CONFIG = {
  draft: { label: "Draft", color: "text-gray-400", bg: "bg-gray-800/60 border-gray-700", dot: "bg-gray-500", desc: "Not yet active" },
  ready: { label: "Ready for Candidate", color: "text-blue-400", bg: "bg-blue-900/20 border-blue-700/40", dot: "bg-blue-400", desc: "Active — invite candidates" },
  completed: { label: "Completed", color: "text-green-400", bg: "bg-green-900/20 border-green-700/40", dot: "bg-green-400", desc: "At least one candidate done" },
};

function AssessmentStatusPill({ assessment, invitations }) {
  const key = getAssessmentTrackStatus(assessment, invitations);
  const cfg = TRACK_STATUS_CONFIG[key];
  return (
    <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2.5 py-1 rounded-full border ${cfg.bg} ${cfg.color}`}>
      <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

function AssessmentStatusBar({ assessments, invitations }) {
  const counts = { draft: 0, ready: 0, completed: 0 };
  assessments.forEach(a => { counts[getAssessmentTrackStatus(a, invitations)]++; });
  const steps = [
    { key: "draft", label: "Draft", icon: "✏️", desc: `${counts.draft} assessment${counts.draft !== 1 ? "s" : ""}` },
    { key: "ready", label: "Ready for Candidate", icon: "🚀", desc: `${counts.ready} assessment${counts.ready !== 1 ? "s" : ""}` },
    { key: "completed", label: "Completed", icon: "✅", desc: `${counts.completed} assessment${counts.completed !== 1 ? "s" : ""}` },
  ];
  return (
    <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 mb-6 flex items-center gap-0">
      {steps.map((s, i) => {
        const cfg = TRACK_STATUS_CONFIG[s.key];
        const active = counts[s.key] > 0;
        return (
          <React.Fragment key={s.key}>
            <div className={`flex-1 flex flex-col items-center gap-1 px-4 py-2 rounded-lg transition-all ${active ? cfg.bg + " border" : "opacity-40"}`}>
              <span className="text-lg">{s.icon}</span>
              <span className={`text-xs font-semibold ${active ? cfg.color : "text-gray-300"}`}>{s.label}</span>
              <span className={`text-xl font-bold ${active ? "text-white" : "text-gray-200"}`}>{counts[s.key]}</span>
              <span className="text-[10px] text-gray-300">{s.desc}</span>
            </div>
            {i < steps.length - 1 && (
              <div className="flex flex-col items-center px-2 text-gray-700">
                <div className="h-px w-8 bg-gray-700" />
                <span className="text-gray-700 text-xs mt-0.5">→</span>
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

const HIRE_STYLE = {
  strong_hire: "text-green-400",
  hire: "text-blue-400",
  borderline: "text-yellow-400",
  no_hire: "text-red-400",
};

const HIRE_LABEL = {
  strong_hire: "Strong Hire",
  hire: "Hire",
  borderline: "Borderline",
  no_hire: "No Hire",
};

export default function CandidateAssessments() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("tracker");

  const { data: assessments = [], isLoading } = useQuery({
    queryKey: ["my-assessments"],
    queryFn: () => base44.entities.Assessment.list("-created_date", 50),
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ["my-invitations"],
    queryFn: () => base44.entities.CandidateInvitation.list("-created_date", 100),
  });

  const { data: scorecards = [] } = useQuery({
    queryKey: ["my-scorecards"],
    queryFn: () => base44.entities.Scorecard.list("-created_date", 100),
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["my-sessions"],
    queryFn: () => base44.entities.CandidateSession.list("-created_date", 200),
  });

  const deleteAssessmentMutation = useMutation({
    mutationFn: async (assessmentId) => {
      const relatedInvites = invitations.filter(i => i.assessment_id === assessmentId);
      for (const inv of relatedInvites) {
        const relatedSessions = sessions.filter(s => s.invitation_id === inv.id);
        for (const session of relatedSessions) {
          const relatedScorecards = scorecards.filter(sc => sc.session_id === session.id);
          for (const sc of relatedScorecards) await base44.entities.Scorecard.delete(sc.id);
          await base44.entities.CandidateSession.delete(session.id);
        }
        await base44.entities.CandidateInvitation.delete(inv.id);
      }
      await base44.entities.Assessment.delete(assessmentId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-assessments"] });
      qc.invalidateQueries({ queryKey: ["my-invitations"] });
      qc.invalidateQueries({ queryKey: ["my-sessions"] });
      qc.invalidateQueries({ queryKey: ["my-scorecards"] });
    },
  });

  const deleteInvitationMutation = useMutation({
    mutationFn: async (invId) => {
      const relatedSessions = sessions.filter(s => s.invitation_id === invId);
      for (const session of relatedSessions) {
        const relatedScorecards = scorecards.filter(sc => sc.session_id === session.id);
        for (const sc of relatedScorecards) await base44.entities.Scorecard.delete(sc.id);
        await base44.entities.CandidateSession.delete(session.id);
      }
      await base44.entities.CandidateInvitation.delete(invId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my-invitations"] });
      qc.invalidateQueries({ queryKey: ["my-sessions"] });
      qc.invalidateQueries({ queryKey: ["my-scorecards"] });
    },
  });

  const stats = {
    total: assessments.length,
    active: assessments.filter(a => a.status === "active").length,
    candidates: invitations.length,
    completed: invitations.filter(i => i.status === "completed").length,
    in_progress: invitations.filter(i => i.status === "in_progress").length,
    pending: invitations.filter(i => i.status === "pending").length,
  };

  const trackerRows = invitations.map(inv => {
    const assessment = assessments.find(a => a.id === inv.assessment_id);
    const session = sessions.find(s => s.invitation_id === inv.id);
    const scorecard = scorecards.find(sc => sc.session_id === session?.id);
    return { inv, assessment, session, scorecard };
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/10">
      <div className="border-b border-gray-800 bg-black/50 px-6 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-gray-100 tracking-tight">Candidate Assessments</h1>
            <p className="text-gray-400 text-sm mt-0.5">AI-powered hands-on technical evaluation platform</p>
          </div>
          <Link
            to="/create-assessment"
            className="flex items-center gap-2 px-4 py-2.5 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors"
          >
            <Plus className="h-4 w-4" />
            Create Assessment
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          {[
            { label: "Total Assessments", value: stats.total, icon: ClipboardList, color: "text-blue-400" },
            { label: "Active", value: stats.active, icon: CheckCircle2, color: "text-green-400" },
            { label: "Candidates Invited", value: stats.candidates, icon: Users, color: "text-purple-400" },
            { label: "In Progress", value: stats.in_progress, icon: Activity, color: "text-orange-400" },
            { label: "Completed", value: stats.completed, icon: BarChart3, color: "text-yellow-400" },
          ].map(s => (
            <div key={s.label} className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-gray-200 text-xs">{s.label}</span>
              </div>
              <div className="text-3xl font-light text-gray-100">{s.value}</div>
            </div>
          ))}
        </div>

        <div className="flex gap-1 mb-6 bg-gray-900/40 border border-gray-800 rounded-lg p-1 w-fit">
          {["tracker", "assessments", "candidates", "results"].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${
                activeTab === tab ? "bg-red-800 text-white" : "text-gray-400 hover:text-white"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "tracker" && (
          <div>
            <div className="grid grid-cols-4 gap-3 mb-6">
              {[
                { label: "In Progress", value: stats.in_progress, icon: Activity, color: "text-purple-400", bg: "border-purple-800/40" },
                { label: "Awaiting Start", value: stats.pending, icon: Hourglass, color: "text-yellow-400", bg: "border-yellow-800/40" },
                { label: "Completed", value: stats.completed, icon: UserCheck, color: "text-green-400", bg: "border-green-800/40" },
                { label: "Avg Score", value: scorecards.length ? Math.round(scorecards.reduce((s, sc) => s + (sc.overall_score || 0), 0) / scorecards.length) + "%" : "—", icon: TrendingUp, color: "text-blue-400", bg: "border-blue-800/40" },
              ].map(s => (
                <div key={s.label} className={`bg-gray-900/60 border ${s.bg} rounded-xl p-3 flex items-center gap-3`}>
                  <s.icon className={`h-5 w-5 ${s.color} shrink-0`} />
                  <div>
                    <div className="text-xl font-light text-gray-100">{s.value}</div>
                    <div className="text-gray-300 text-xs">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>

            {trackerRows.length === 0 ? (
              <div className="text-center py-20 border border-dashed border-gray-800 rounded-xl">
                <Activity className="h-12 w-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-200">No candidates invited yet. Invite candidates to track their progress here.</p>
              </div>
            ) : (
              <div className="bg-gray-900/40 border border-gray-800 rounded-xl overflow-hidden">
                <div className="grid grid-cols-12 gap-3 px-4 py-2.5 border-b border-gray-800 text-[10px] font-semibold text-gray-300 uppercase tracking-wider">
                  <div className="col-span-2">Candidate</div>
                  <div className="col-span-2">Assessment</div>
                  <div className="col-span-2">Status / Date</div>
                  <div className="col-span-3">Progress</div>
                  <div className="col-span-2 text-center">Score</div>
                  <div className="col-span-1 text-center">Action</div>
                </div>

                {trackerRows.map(({ inv, assessment, session, scorecard }) => {
                  const statusConfig = {
                    pending: { label: "Invited", color: "text-yellow-400", bg: "bg-yellow-900/20 border-yellow-700/40", dot: "bg-yellow-400" },
                    accepted: { label: "Accepted", color: "text-blue-400", bg: "bg-blue-900/20 border-blue-700/40", dot: "bg-blue-400" },
                    in_progress: { label: "In Progress", color: "text-purple-400", bg: "bg-purple-900/20 border-purple-700/40", dot: "bg-purple-400 animate-pulse" },
                    submitted: { label: "Submitted", color: "text-orange-400", bg: "bg-orange-900/20 border-orange-700/40", dot: "bg-orange-400" },
                    completed: { label: "Completed", color: "text-green-400", bg: "bg-green-900/20 border-green-700/40", dot: "bg-green-400" },
                    expired: { label: "Expired", color: "text-gray-500", bg: "bg-gray-900/40 border-gray-700/40", dot: "bg-gray-600" },
                    evaluated: { label: "Evaluated", color: "text-green-400", bg: "bg-green-900/20 border-green-700/40", dot: "bg-green-400" },
                  };
                  const st = statusConfig[session?.status || inv.status] || statusConfig.pending;
                  const submittedCount = session?.task_submissions?.length || 0;
                  const timeElapsed = session?.time_elapsed_minutes || 0;

                  return (
                    <div key={inv.id} className="grid grid-cols-12 gap-3 px-4 py-3.5 border-b border-gray-800/60 last:border-0 hover:bg-gray-800/20 transition-colors items-center">
                      <div className="col-span-2 flex items-center gap-2 min-w-0">
                        <div className="h-7 w-7 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-200 font-bold text-xs shrink-0">
                          {inv.candidate_name?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-gray-200 text-xs font-normal truncate">{inv.candidate_name}</p>
                          <p className="text-gray-400 text-[10px] truncate">{inv.candidate_email}</p>
                        </div>
                      </div>

                      <div className="col-span-2 min-w-0">
                        <p className="text-gray-300 text-xs font-normal truncate">{assessment?.position_title || "—"}</p>
                        <p className="text-gray-300 text-[10px] truncate">{assessment?.assessment_type || ""}</p>
                      </div>

                      <div className="col-span-2">
                        <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full border ${st.bg} ${st.color}`}>
                          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${st.dot}`} />
                          {st.label}
                        </span>
                        {inv.sent_at && (
                          <p className="text-gray-200 text-[10px] mt-1">{new Date(inv.sent_at).toLocaleDateString()}</p>
                        )}
                      </div>

                      <div className="col-span-3">
                        {session?.started_at ? (
                          <div>
                            <div className="flex justify-between text-[10px] text-gray-200 mb-1">
                              <span>{submittedCount} tasks submitted</span>
                              <span className="flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{timeElapsed}m elapsed</span>
                            </div>
                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${session.status === "submitted" || session.status === "evaluated" ? "bg-green-500" : "bg-purple-500"}`}
                                style={{ width: `${submittedCount > 0 ? Math.min(100, submittedCount * 15) : timeElapsed > 0 ? Math.min(100, (timeElapsed / (assessment?.duration_minutes || 60)) * 100) : 0}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">Not started yet</span>
                        )}
                      </div>

                      <div className="col-span-2 text-center">
                        {scorecard ? (
                          <div>
                            <div className={`text-lg font-bold ${scorecard.passed ? "text-green-400" : "text-red-400"}`}>{scorecard.overall_score}%</div>
                            {scorecard.hiring_recommendation && (
                              <div className={`text-[10px] font-semibold ${HIRE_STYLE[scorecard.hiring_recommendation] || "text-gray-400"}`}>
                                {HIRE_LABEL[scorecard.hiring_recommendation]}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-300 text-xs">Pending</span>
                        )}
                      </div>

                      <div className="col-span-1 flex justify-center">
                        {scorecard ? (
                          <Link to={`/scorecard?scorecard_id=${scorecard.id}`} className="text-[10px] px-2 py-1 bg-green-900/30 border border-green-700/40 text-green-400 rounded-lg hover:bg-green-900/50 transition-colors whitespace-nowrap">
                            Report
                          </Link>
                        ) : (
                          <Link to={`/invite-candidate?assessment_id=${inv.assessment_id}&candidate_name=${encodeURIComponent(inv.candidate_name || "")}&candidate_email=${encodeURIComponent(inv.candidate_email || "")}`} className="text-[10px] px-2 py-1 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg hover:text-white transition-colors whitespace-nowrap">
                            Resend
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "assessments" && (
          <div className="space-y-3">
            {!isLoading && assessments.length > 0 && (
              <AssessmentStatusBar assessments={assessments} invitations={invitations} />
            )}
            {isLoading && (
              <div className="text-center py-12 text-gray-200">Loading assessments...</div>
            )}
            {!isLoading && assessments.length === 0 && (
              <div className="text-center py-20 border border-dashed border-gray-800 rounded-xl">
                <ClipboardList className="h-12 w-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-200 mb-4">No assessments created yet</p>
                <Link to="/create-assessment" className="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm transition-colors">
                  Create your first assessment
                </Link>
              </div>
            )}
            {assessments.map(a => {
              const aInvites = invitations.filter(i => i.assessment_id === a.id);
              return (
              <div key={a.id} className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 flex items-center gap-4 hover:border-gray-700 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1 flex-wrap">
                    <h3 className="text-gray-200 font-normal truncate">{a.position_title}</h3>
                    <AssessmentStatusPill assessment={a} invitations={invitations} />
                    {a.generated && <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-900/30 border border-purple-700/40 text-purple-400">AI Generated</span>}
                    {aInvites.length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {aInvites.map(inv => (
                          <span key={inv.id} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-200">
                            <span className="h-3.5 w-3.5 rounded-full bg-gray-700 flex items-center justify-center text-[8px] font-bold text-white shrink-0">
                              {inv.candidate_name?.[0]?.toUpperCase() || "?"}
                            </span>
                            {inv.candidate_name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-300">
                    <span>{a.assessment_type}</span>
                    <span>•</span>
                    <span>{a.seniority_level}</span>
                    <span>•</span>
                    <span>{a.difficulty}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{a.duration_minutes}min</span>
                    {a.company_name && <><span>•</span><span>{a.company_name}</span></>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Link to={`/assessment-detail?id=${a.id}`} className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors" title="View">
                    <Eye className="h-4 w-4" />
                  </Link>
                  <Link to={`/invite-candidate?assessment_id=${a.id}`} className="p-2 text-gray-400 hover:text-blue-400 hover:bg-gray-800 rounded-lg transition-colors" title="Invite Candidate">
                    <Send className="h-4 w-4" />
                  </Link>
                  <button onClick={() => deleteAssessmentMutation.mutate(a.id)} className="p-2 text-gray-400 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors" title="Delete">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              );
            })}
          </div>
        )}

        {activeTab === "candidates" && (
          <div className="space-y-3">
            {invitations.length === 0 && (
              <div className="text-center py-20 border border-dashed border-gray-800 rounded-xl">
                <Users className="h-12 w-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-200">No candidates invited yet</p>
              </div>
            )}
            {invitations.map(inv => {
              const statusColor = {
                pending: "text-yellow-400",
                accepted: "text-blue-400",
                in_progress: "text-purple-400",
                completed: "text-green-400",
                expired: "text-gray-500",
              }[inv.status] || "text-gray-400";
              const assessment = assessments.find(a => a.id === inv.assessment_id);
              return (
                <div key={inv.id} className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 flex items-center gap-4 flex-wrap sm:flex-nowrap">
                  <div className="h-10 w-10 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold text-sm shrink-0">
                    {inv.candidate_name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-200 font-normal">{inv.candidate_name}</p>
                    <p className="text-gray-200 text-xs">{inv.candidate_email}</p>
                    {assessment && <p className="text-gray-300 text-[11px] mt-0.5">{assessment.position_title}</p>}
                  </div>
                  <div className="flex items-center gap-3 shrink-0 ml-auto">
                    <span className={`text-xs font-semibold capitalize ${statusColor}`}>{inv.status}</span>
                    <span className="text-gray-200 text-xs whitespace-nowrap">{inv.sent_at ? new Date(inv.sent_at).toLocaleDateString() : "—"}</span>
                    {inv.status === "completed" ? (
                      <Link to={`/scorecard?invitation_id=${inv.id}`} className="text-xs px-3 py-1.5 bg-green-900/30 border border-green-700/40 text-green-400 rounded-lg hover:bg-green-900/50 transition-colors whitespace-nowrap">
                        View Results
                      </Link>
                    ) : (
                      <Link to={`/invite-candidate?assessment_id=${inv.assessment_id}&candidate_name=${encodeURIComponent(inv.candidate_name || "")}&candidate_email=${encodeURIComponent(inv.candidate_email || "")}`} className="text-xs px-3 py-1.5 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg hover:text-white transition-colors whitespace-nowrap">
                        Resend
                      </Link>
                    )}
                    <button onClick={() => deleteInvitationMutation.mutate(inv.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-gray-800 rounded-lg transition-colors" title="Delete candidate">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === "results" && (
          <div className="space-y-3">
            {scorecards.length === 0 && (
              <div className="text-center py-20 border border-dashed border-gray-800 rounded-xl">
                <BarChart3 className="h-12 w-12 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-200">No completed assessments yet</p>
              </div>
            )}
            {scorecards.map(sc => (
              <div key={sc.id} className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 flex items-center gap-4 hover:border-gray-700 transition-colors">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <p className="text-gray-200 font-normal">{sc.candidate_name}</p>
                    <span className={`text-xs font-bold ${HIRE_STYLE[sc.hiring_recommendation] || "text-gray-400"}`}>
                      {HIRE_LABEL[sc.hiring_recommendation] || "—"}
                    </span>
                  </div>
                  <p className="text-gray-200 text-xs">{sc.candidate_email}</p>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-2xl font-bold ${sc.passed ? "text-green-400" : "text-red-400"}`}>{sc.overall_score}%</div>
                  <div className={`text-xs ${sc.passed ? "text-green-500" : "text-red-500"}`}>{sc.passed ? "PASSED" : "FAILED"}</div>
                </div>
                <Link to={`/scorecard?scorecard_id=${sc.id}`} className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-xs transition-colors shrink-0">
                  Full Report
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}