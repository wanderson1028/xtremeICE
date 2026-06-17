import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, Send, Users, Clock, Target, CheckCircle2, Shield, FileText, BarChart2, ChevronRight } from "lucide-react";

const urlParams = () => new URLSearchParams(window.location.search);

export default function AssessmentDetail() {
  const navigate = useNavigate();
  const id = urlParams().get("id");
  const [activeTab, setActiveTab] = useState("overview");

  const { data: assessment, isLoading } = useQuery({
    queryKey: ["assessment", id],
    queryFn: () => base44.entities.Assessment.get(id),
    enabled: !!id,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["assessment-tasks", id],
    queryFn: () => base44.entities.AssessmentTask.filter({ assessment_id: id }),
    enabled: !!id,
  });

  const { data: invitations = [] } = useQuery({
    queryKey: ["assessment-invitations", id],
    queryFn: () => base44.entities.CandidateInvitation.filter({ assessment_id: id }),
    enabled: !!id,
  });

  if (isLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-gray-400">Loading...</div>;
  }

  if (!assessment) {
    return <div className="min-h-screen bg-black flex items-center justify-center text-gray-400">Assessment not found.</div>;
  }

  const totalPoints = tasks.reduce((s, t) => s + (t.points || 10), 0);

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/10">
      <div className="border-b border-gray-800 bg-black/50 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate("/CandidateAssessments")} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <span className="text-gray-600">|</span>
            <div>
              <h1 className="text-white font-bold">{assessment.position_title}</h1>
              {assessment.company_name && <p className="text-gray-500 text-xs">{assessment.company_name}</p>}
            </div>
          </div>
          <Link to={`/invite-candidate?assessment_id=${id}`} className="flex items-center gap-2 px-4 py-2.5 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm font-semibold transition-colors">
            <Send className="h-4 w-4" /> Invite Candidate
          </Link>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Meta strip */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {[
            assessment.assessment_type,
            assessment.seniority_level,
            assessment.difficulty,
          ].map(t => (
            <span key={t} className="text-xs px-3 py-1 rounded-full bg-gray-800 border border-gray-700 text-gray-300">{t}</span>
          ))}
          <span className="flex items-center gap-1 text-xs text-gray-400"><Clock className="h-3 w-3" />{assessment.duration_minutes} min</span>
          <span className="flex items-center gap-1 text-xs text-gray-400"><Target className="h-3 w-3" />Pass: {assessment.pass_threshold}%</span>
          <span className="flex items-center gap-1 text-xs text-gray-400"><Users className="h-3 w-3" />{invitations.length} invited</span>
          <span className={`text-xs px-2.5 py-0.5 rounded-full border ${assessment.status === "active" ? "bg-green-900/30 text-green-400 border-green-700/40" : "bg-gray-800 text-gray-400 border-gray-700"}`}>{assessment.status}</span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-900/40 border border-gray-800 rounded-lg p-1 w-fit mb-6">
          {["overview", "tasks", "nice alignment", "candidates"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${activeTab === tab ? "bg-red-800 text-white" : "text-gray-400 hover:text-white"}`}>
              {tab}
            </button>
          ))}
        </div>

        {activeTab === "overview" && (
          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-2 space-y-5">
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Shield className="h-4 w-4 text-red-400" />Role Summary</h3>
                <p className="text-gray-300 text-sm leading-relaxed">{assessment.role_summary || "No summary available."}</p>
              </div>
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><FileText className="h-4 w-4 text-blue-400" />Scenario Narrative</h3>
                <p className="text-gray-300 text-sm leading-relaxed">{assessment.scenario_narrative || "No scenario generated."}</p>
              </div>
              {assessment.objectives?.length > 0 && (
                <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
                  <h3 className="text-white font-semibold mb-3">Assessment Objectives</h3>
                  <ul className="space-y-2">
                    {assessment.objectives.map((o, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />{o}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="space-y-4">
              <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                <h4 className="text-gray-400 text-xs uppercase mb-3">Assessment Stats</h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm"><span className="text-gray-400">Tasks</span><span className="text-white font-semibold">{tasks.length}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-400">Total Points</span><span className="text-white font-semibold">{totalPoints}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-400">Pass Score</span><span className="text-white font-semibold">{Math.round(totalPoints * (assessment.pass_threshold || 70) / 100)} pts</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-400">Candidates</span><span className="text-white font-semibold">{invitations.length}</span></div>
                </div>
              </div>
              {assessment.nice_alignment && (
                <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
                  <h4 className="text-gray-400 text-xs uppercase mb-3">NICE Framework</h4>
                  <p className="text-xs text-purple-400 font-semibold">{assessment.nice_category}</p>
                  <p className="text-xs text-gray-300 mt-1">{assessment.nice_work_role}</p>
                  {assessment.nice_alignment.competency_areas?.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {assessment.nice_alignment.competency_areas.slice(0, 4).map((c, i) => (
                        <div key={i} className="text-[10px] text-gray-500 flex items-center gap-1"><ChevronRight className="h-2.5 w-2.5" />{c}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "tasks" && (
          <div className="space-y-4">
            {tasks.sort((a, b) => a.order - b.order).map((task, i) => (
              <div key={task.id} className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="h-7 w-7 rounded-full bg-red-900/50 border border-red-700/50 text-red-400 text-xs flex items-center justify-center font-bold shrink-0">{task.order}</span>
                    <div>
                      <h3 className="text-white font-semibold">{task.title}</h3>
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 border border-gray-700 text-gray-400">{task.task_type}</span>
                    </div>
                  </div>
                  <span className="text-yellow-400 font-mono font-bold text-sm shrink-0">{task.points} pts</span>
                </div>
                <p className="text-gray-300 text-sm leading-relaxed mb-4">{task.description}</p>

                {task.expected_actions?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-gray-500 text-xs uppercase mb-2">Expected Actions</p>
                    <ul className="space-y-1">
                      {task.expected_actions.map((a, j) => (
                        <li key={j} className="text-xs text-gray-400 flex items-start gap-1.5"><span className="text-red-500 mt-0.5">→</span>{a}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {task.validation_checks?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-gray-500 text-xs uppercase mb-2">Validation Checks</p>
                    <div className="space-y-1">
                      {task.validation_checks.map((v, j) => (
                        <div key={j} className="flex items-center gap-2 text-xs">
                          <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                          <span className="text-gray-400">{v.check}</span>
                          <span className="ml-auto text-yellow-400 font-mono">{v.points} pts</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {task.tools_required?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {task.tools_required.map(t => (
                      <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-blue-950/40 border border-blue-800/40 text-blue-400">{t}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {activeTab === "nice alignment" && (
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><BarChart2 className="h-4 w-4 text-purple-400" />NICE Framework Alignment</h3>
              <div className="space-y-4">
                <div><p className="text-gray-500 text-xs uppercase mb-1">Category</p><p className="text-white font-medium">{assessment.nice_category || "—"}</p></div>
                <div><p className="text-gray-500 text-xs uppercase mb-1">Work Role</p><p className="text-white font-medium">{assessment.nice_work_role || "—"}</p></div>
                {assessment.nice_alignment?.task_ids?.length > 0 && (
                  <div><p className="text-gray-500 text-xs uppercase mb-2">Task IDs</p>
                    <div className="flex flex-wrap gap-1">{assessment.nice_alignment.task_ids.map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded bg-purple-950/40 border border-purple-800/40 text-purple-400">{t}</span>)}</div>
                  </div>
                )}
                {assessment.nice_alignment?.knowledge_ids?.length > 0 && (
                  <div><p className="text-gray-500 text-xs uppercase mb-2">Knowledge IDs</p>
                    <div className="flex flex-wrap gap-1">{assessment.nice_alignment.knowledge_ids.map(k => <span key={k} className="text-[10px] px-2 py-0.5 rounded bg-blue-950/40 border border-blue-800/40 text-blue-400">{k}</span>)}</div>
                  </div>
                )}
                {assessment.nice_alignment?.skill_ids?.length > 0 && (
                  <div><p className="text-gray-500 text-xs uppercase mb-2">Skill IDs</p>
                    <div className="flex flex-wrap gap-1">{assessment.nice_alignment.skill_ids.map(s => <span key={s} className="text-[10px] px-2 py-0.5 rounded bg-green-950/40 border border-green-800/40 text-green-400">{s}</span>)}</div>
                  </div>
                )}
                {assessment.nice_alignment?.competency_areas?.length > 0 && (
                  <div><p className="text-gray-500 text-xs uppercase mb-2">Competency Areas</p>
                    <ul className="space-y-1">{assessment.nice_alignment.competency_areas.map((c, i) => <li key={i} className="text-xs text-gray-300 flex items-center gap-1.5"><ChevronRight className="h-3 w-3 text-purple-400" />{c}</li>)}</ul>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4">Scoring Weights</h3>
              <div className="space-y-3">
                {Object.entries(assessment.scoring_weights || {}).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-gray-400 text-xs capitalize w-48 shrink-0">{key.replace(/_/g, " ")}</span>
                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-red-600 rounded-full transition-all" style={{ width: `${val}%` }} />
                    </div>
                    <span className="text-gray-300 text-xs font-mono w-8 text-right">{val}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "candidates" && (
          <div className="space-y-3">
            <div className="flex justify-between items-center mb-4">
              <p className="text-gray-400 text-sm">{invitations.length} candidates invited</p>
              <Link to={`/invite-candidate?assessment_id=${id}`} className="flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm transition-colors">
                <Send className="h-4 w-4" /> Invite Candidate
              </Link>
            </div>
            {invitations.length === 0 && (
              <div className="text-center py-16 border border-dashed border-gray-800 rounded-xl text-gray-500">No candidates invited yet.</div>
            )}
            {invitations.map(inv => (
              <div key={inv.id} className="bg-gray-900/60 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
                <div className="h-10 w-10 rounded-full bg-gray-800 flex items-center justify-center text-white font-bold shrink-0">{inv.candidate_name?.[0]?.toUpperCase()}</div>
                <div className="flex-1"><p className="text-white font-medium">{inv.candidate_name}</p><p className="text-gray-400 text-xs">{inv.candidate_email}</p></div>
                <span className={`text-xs font-semibold capitalize px-2.5 py-1 rounded-full ${inv.status === "completed" ? "bg-green-900/30 text-green-400" : inv.status === "in_progress" ? "bg-blue-900/30 text-blue-400" : "bg-gray-800 text-gray-400"}`}>{inv.status}</span>
                {inv.status === "completed" && (
                  <Link to={`/scorecard?invitation_id=${inv.id}`} className="text-xs px-3 py-1.5 bg-green-900/30 border border-green-700/40 text-green-400 rounded-lg hover:bg-green-900/50">View Results</Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}