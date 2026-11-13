import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { ArrowLeft, CheckCircle2, XCircle, AlertCircle, TrendingUp, MessageSquare, Star, ChevronRight, BarChart2, Sparkles, Mail } from "lucide-react";
import ReportEmailDialog from "@/components/scorecard/ReportEmailDialog";

const HIRE_CONFIG = {
  strong_hire: { label: "Strong Hire", color: "text-green-400", bg: "bg-green-900/20 border-green-700/40" },
  hire: { label: "Hire", color: "text-blue-400", bg: "bg-blue-900/20 border-blue-700/40" },
  borderline: { label: "Borderline", color: "text-yellow-400", bg: "bg-yellow-900/20 border-yellow-700/40" },
  no_hire: { label: "No Hire", color: "text-red-400", bg: "bg-red-900/20 border-red-700/40" },
};

export default function ScorecardView() {
  const navigate = useNavigate();
  const [reportOpen, setReportOpen] = useState(false);
  const params = new URLSearchParams(window.location.search);
  const scorecardId = params.get("scorecard_id");
  const invitationId = params.get("invitation_id");

  const { data: scorecard, isLoading, error } = useQuery({
    queryKey: ["scorecard", scorecardId, invitationId],
    queryFn: async () => {
      if (scorecardId) {
        // Read the record directly, then fall back to a filtered read (the same call the tracker uses).
        const direct = await base44.entities.Scorecard.get(scorecardId).catch(() => null);
        if (direct) return direct;
        const page = await base44.entities.Scorecard.filter({ id: scorecardId });
        const items = Array.isArray(page) ? page : page?.items || [];
        return items[0] || null;
      }
      if (invitationId) {
        // The invitation id is not the scorecard session id — resolve the session first.
        const sessions = await base44.entities.CandidateSession.filter({ invitation_id: invitationId });
        const session = sessions[0];
        if (!session) return null;
        const results = await base44.entities.Scorecard.filter({ session_id: session.id });
        return results[0] || null;
      }
      return null;
    },
    enabled: !!(scorecardId || invitationId),
  });

  const { data: assessment } = useQuery({
    queryKey: ["assessment-for-sc", scorecard?.assessment_id],
    queryFn: () => base44.entities.Assessment.get(scorecard.assessment_id),
    enabled: !!scorecard?.assessment_id,
  });

  const { data: session } = useQuery({
    queryKey: ["session-for-sc", scorecard?.session_id],
    queryFn: () => base44.entities.CandidateSession.get(scorecard.session_id),
    enabled: !!scorecard?.session_id,
  });

  if (isLoading) return <div className="min-h-screen bg-black flex items-center justify-center text-gray-400">Loading scorecard...</div>;
  if (error) return <div className="min-h-screen bg-black flex flex-col items-center justify-center gap-2 text-gray-400 px-6 text-center">
    <span>This scorecard could not be opened.</span>
    <span className="text-xs text-gray-500">{error?.message || String(error)}</span>
  </div>;
  if (!scorecard) return <div className="min-h-screen bg-black flex items-center justify-center text-gray-400">
    {scorecardId || invitationId ? "Scorecard not found." : "No scorecard was selected. Open a candidate's report from the tracker."}
  </div>;

  const hConf = HIRE_CONFIG[scorecard.hiring_recommendation] || HIRE_CONFIG.borderline;
  const catScores = scorecard.category_scores || {};
  const usedMinutes = Number(session?.time_elapsed_minutes) || 0;
  const allowedMinutes = Number(assessment?.duration_minutes) || 0;
  const timingNote = usedMinutes && allowedMinutes ? `Used ${usedMinutes} of ${allowedMinutes} min` : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/10">
      <div className="border-b border-gray-800 bg-black/50 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-gray-400 hover:text-white text-sm transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <span className="text-gray-600">|</span>
            <h1 className="text-white font-bold">Candidate Scorecard</h1>
          </div>
          <button
            onClick={() => setReportOpen(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
          >
            <Mail className="h-4 w-4" /> Email Report
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Hero card */}
        <div className="bg-gray-900/60 border border-gray-800 rounded-2xl p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-white text-2xl font-bold">{scorecard.candidate_name}</h2>
              <p className="text-gray-400">{scorecard.candidate_email}</p>
              {assessment && <p className="text-gray-500 text-sm mt-1">{assessment.position_title} · {assessment.assessment_type}</p>}
            </div>
            <div className="text-right">
              <div className={`text-5xl font-black ${scorecard.passed ? "text-green-400" : "text-red-400"}`}>{scorecard.overall_score}%</div>
              <div className={`text-sm font-bold mt-1 ${scorecard.passed ? "text-green-500" : "text-red-500"}`}>{scorecard.passed ? "PASSED" : "FAILED"}</div>
              <div className={`mt-2 inline-flex items-center px-3 py-1 rounded-full border text-sm font-semibold ${hConf.bg} ${hConf.color}`}>
                {hConf.label}
              </div>
            </div>
          </div>

        </div>

        <div className="grid grid-cols-3 gap-6 items-start">
          {/* Category Scores */}
          <div className="col-span-2 space-y-6">
            <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
              <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><BarChart2 className="h-4 w-4 text-blue-400" />Score Breakdown</h3>
              <div className="space-y-3">
                {Object.entries(catScores).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-3">
                    <div className="w-48 shrink-0">
                      <span className="text-gray-400 text-xs capitalize">{key.replace(/_/g, " ")}</span>
                      {key === "time_management" && timingNote && (
                        <span className="block text-[10px] text-gray-500">{timingNote}</span>
                      )}
                    </div>
                    <div className="flex-1 h-2.5 bg-gray-800 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${val >= 80 ? "bg-green-500" : val >= 60 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${val}%` }} />
                    </div>
                    <span className={`text-xs font-bold w-10 text-right ${val >= 80 ? "text-green-400" : val >= 60 ? "text-yellow-400" : "text-red-400"}`}>{val}%</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Skillset synopsis written from this candidate's results */}
            {scorecard.smart_summary && (
              <div className="bg-gray-900/60 border border-red-900/30 rounded-xl p-5">
                <h3 className="text-white font-semibold mb-3 flex items-center gap-2"><Sparkles className="h-4 w-4 text-red-400" />Skillset Synopsis</h3>
                <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{scorecard.smart_summary}</p>
              </div>
            )}
          </div>

          {/* Strengths / Weaknesses — one card so the column matches the left side */}
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
            <h4 className="text-green-400 font-semibold text-sm mb-3 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5" />Strengths
            </h4>
            <ul className="space-y-1.5">
              {(scorecard.strengths || []).map((s, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-gray-300 leading-snug">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />{s}
                </li>
              ))}
            </ul>

            <div className="my-4 border-t border-gray-800" />

            <h4 className="text-red-400 font-semibold text-sm mb-3 flex items-center gap-1.5">
              <AlertCircle className="h-3.5 w-3.5" />Weaknesses
            </h4>
            <ul className="space-y-1.5">
              {(scorecard.weaknesses || []).map((w, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-gray-300 leading-snug">
                  <XCircle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />{w}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Task Results */}
        {(scorecard.task_results || []).length > 0 && (
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4">Task-by-Task Performance</h3>
            <div className="space-y-3">
              {scorecard.task_results.map((tr, i) => (
                <div key={i} className="flex items-center gap-4 bg-black/30 rounded-lg p-3">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${tr.validation_passed ? "bg-green-900/50 border border-green-700/50" : "bg-red-900/50 border border-red-700/50"}`}>
                    {tr.validation_passed ? <CheckCircle2 className="h-4 w-4 text-green-400" /> : <XCircle className="h-4 w-4 text-red-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-white text-sm font-medium truncate">{tr.title}</p>
                      {tr.question_type && tr.question_type !== "manual" && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-gray-800 border border-gray-700 text-gray-400 uppercase tracking-wide shrink-0">
                          {tr.question_type === "mcq" ? "Multiple choice" : "Matching"}
                        </span>
                      )}
                      {tr.auto_graded === false && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-yellow-900/30 border border-yellow-700/40 text-yellow-400 shrink-0">
                          Evaluated
                        </span>
                      )}
                    </div>
                    {tr.submitted_answer && <p className="text-gray-500 text-xs truncate mt-0.5">{tr.submitted_answer.substring(0, 90)}</p>}
                    {tr.correct === false && tr.correct_answer && (
                      <p className="text-green-500/80 text-xs truncate mt-0.5">Correct: {tr.correct_answer}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-sm font-bold ${tr.completion_percentage >= 70 ? "text-green-400" : "text-red-400"}`}>{tr.points_earned}/{tr.points_possible}</span>
                    <div className="text-gray-600 text-[10px]">{tr.completion_percentage}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Missed Steps */}
        {(scorecard.missed_steps || []).length > 0 && (
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
            <h3 className="text-yellow-400 font-semibold mb-3 flex items-center gap-2"><AlertCircle className="h-4 w-4" />Missed Steps</h3>
            <ul className="space-y-2">
              {scorecard.missed_steps.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-400"><ChevronRight className="h-4 w-4 text-yellow-600 shrink-0 mt-0.5" />{s}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Follow-up Questions */}
        {(scorecard.follow_up_questions || []).length > 0 && (
          <div className="bg-gray-900/60 border border-gray-800 rounded-xl p-5">
            <h3 className="text-white font-semibold mb-4 flex items-center gap-2"><MessageSquare className="h-4 w-4 text-purple-400" />Suggested Interview Follow-Up Questions</h3>
            <ul className="space-y-2">
              {scorecard.follow_up_questions.map((q, i) => (
                <li key={i} className="flex items-start gap-2 bg-black/30 rounded-lg p-3">
                  <span className="text-purple-500 font-bold text-xs mt-0.5 w-4 shrink-0">Q{i + 1}</span>
                  <span className="text-gray-300 text-sm">{q}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <ReportEmailDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        scorecard={scorecard}
        assessment={assessment}
      />
    </div>
  );
}