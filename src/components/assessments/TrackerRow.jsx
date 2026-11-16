import React from "react";
import { Link } from "react-router-dom";
import { Trash2, RotateCcw, Clock } from "lucide-react";
import AssessmentCell from "@/components/assessments/AssessmentCell";
import { completionMinutes, formatDuration, isFinished } from "@/lib/assessmentTiming";

const STATUS_CONFIG = {
  pending:     { label: "Invited",     color: "text-yellow-400",  bg: "bg-yellow-900/20 border-yellow-700/40",  dot: "bg-yellow-400" },
  accepted:    { label: "Accepted",    color: "text-blue-400",    bg: "bg-blue-900/20 border-blue-700/40",      dot: "bg-blue-400" },
  in_progress: { label: "In Progress", color: "text-purple-400",  bg: "bg-purple-900/20 border-purple-700/40",  dot: "bg-purple-400 animate-pulse" },
  submitted:   { label: "Submitted",   color: "text-orange-400",  bg: "bg-orange-900/20 border-orange-700/40",  dot: "bg-orange-400" },
  completed:   { label: "Completed",   color: "text-green-400",   bg: "bg-green-900/20 border-green-700/40",    dot: "bg-green-400" },
  expired:     { label: "Expired",     color: "text-gray-500",    bg: "bg-gray-900/40 border-gray-700/40",      dot: "bg-gray-600" },
  evaluated:   { label: "Evaluated",   color: "text-green-400",   bg: "bg-green-900/20 border-green-700/40",    dot: "bg-green-400" },
};

const HIRE_CONFIG = {
  strong_hire: { label: "Strong Hire", color: "text-green-400" },
  hire:        { label: "Hire",        color: "text-blue-400" },
  borderline:  { label: "Borderline",  color: "text-yellow-400" },
  no_hire:     { label: "No Hire",     color: "text-red-400" },
};

export default function TrackerRow({ inv, session, scorecard, onReset, onDelete }) {
  const st = STATUS_CONFIG[session?.status || inv.status] || STATUS_CONFIG.pending;
  const submittedCount = session?.task_submissions?.length || 0;
  const minutes = completionMinutes(session);
  const finished = isFinished(inv, session);
  const hireConf = HIRE_CONFIG[scorecard?.hiring_recommendation] || null;

  return (
    <div className="grid grid-cols-12 gap-3 px-4 py-3.5 border-b border-gray-800/60 last:border-0 hover:bg-gray-800/20 transition-colors items-center">
      {/* Candidate */}
      <div className="col-span-3 flex items-center gap-2 min-w-0">
        <div className="h-7 w-7 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center text-gray-200 font-bold text-xs shrink-0">
          {inv.candidate_name?.[0]?.toUpperCase() || "?"}
        </div>
        <div className="min-w-0">
          <p className="text-gray-200 text-xs font-normal truncate">{inv.candidate_name}</p>
          <p className="text-gray-400 text-[10px] truncate">{inv.candidate_email}</p>
        </div>
      </div>

      {/* Status + Date */}
      <div className="col-span-2">
        <span className={`inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-1 rounded-full border ${st.bg} ${st.color}`}>
          <span className={`h-1.5 w-1.5 rounded-full shrink-0 ${st.dot}`} />
          {st.label}
        </span>
        {inv.email_delivery_status && (
          <p
            className={`text-[10px] mt-1 ${inv.email_delivery_status === "sent" ? "text-green-400" : inv.email_delivery_status === "failed" ? "text-red-400" : "text-yellow-400"}`}
            title={inv.email_delivery_error || ""}
          >
            Email {inv.email_delivery_status}
          </p>
        )}
        {inv.sent_at && (
          <p className="text-gray-200 text-[10px] mt-1">{new Date(inv.sent_at).toLocaleDateString()}</p>
        )}
      </div>

      {/* Progress + time taken */}
      <div className="col-span-3">
        {session?.started_at ? (
          <div>
            <div className="flex justify-between text-[10px] text-gray-200 mb-0.5">
              <span>{submittedCount} tasks submitted</span>
            </div>
            <div className={`flex items-center gap-1 text-[10px] mb-1 ${finished ? "text-green-300" : "text-gray-300"}`}>
              <Clock className="h-2.5 w-2.5" />
              {finished ? `Completed in ${formatDuration(minutes)}` : `Elapsed ${formatDuration(minutes)}`}
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${finished ? "bg-green-500" : "bg-purple-500"}`}
                style={{ width: `${finished ? 100 : Math.min(100, submittedCount * 15)}%` }}
              />
            </div>
          </div>
        ) : (
          <span className="text-gray-300 text-xs">Not started yet</span>
        )}
      </div>

      {/* Score */}
      <div className="col-span-2 text-center">
        {scorecard ? (
          <div>
            <div className={`text-lg font-bold ${scorecard.passed ? "text-green-400" : "text-red-400"}`}>{scorecard.overall_score}%</div>
            {hireConf && <div className={`text-[10px] font-semibold ${hireConf.color}`}>{hireConf.label}</div>}
          </div>
        ) : (
          <span className="text-gray-300 text-xs">Pending</span>
        )}
      </div>

      {/* Action */}
      <div className="col-span-2 flex justify-center items-center gap-1">
        <button
          onClick={() => onReset(inv)}
          className="flex items-center gap-1 text-[10px] px-2 py-1 bg-gray-800 border border-gray-700 text-gray-300 hover:text-white hover:border-gray-600 rounded-lg transition-colors whitespace-nowrap"
          title="Reset attempt & resend invite"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </button>
        {scorecard ? (
          <Link to={`/scorecard?scorecard_id=${scorecard.id}`} className="text-[10px] px-2 py-1 bg-green-900/30 border border-green-700/40 text-green-400 rounded-lg hover:bg-green-900/50 transition-colors whitespace-nowrap">
            Report
          </Link>
        ) : (
          <Link to={`/invite-candidate?assessment_id=${inv.assessment_id}&candidate_name=${encodeURIComponent(inv.candidate_name || "")}&candidate_email=${encodeURIComponent(inv.candidate_email || "")}`} className="text-[10px] px-2 py-1 bg-gray-800 border border-gray-700 text-gray-100 rounded-lg hover:text-white transition-colors whitespace-nowrap">
            Resend
          </Link>
        )}
        <button
          onClick={() => onDelete(inv)}
          className="p-1.5 bg-red-950/60 border border-red-700/70 text-red-300 hover:bg-red-800 hover:text-white rounded-md transition-colors"
          title="Delete invite"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}