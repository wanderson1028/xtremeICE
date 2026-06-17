import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, Clock, CheckCircle2, ChevronRight, Loader2, Send, AlertCircle, BarChart2 } from "lucide-react";
import { Link } from "react-router-dom";

export default function CandidatePortal() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [submissions, setSubmissions] = useState({});
  const [currentAnswer, setCurrentAnswer] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    base44.auth.me().then(u => { setUser(u); setAuthLoading(false); }).catch(() => { setAuthLoading(false); });
  }, []);

  useEffect(() => {
    if (startTime && !submitted) {
      const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
      return () => clearInterval(interval);
    }
  }, [startTime, submitted]);

  const { data: invitation, isLoading: invLoading } = useQuery({
    queryKey: ["invitation-by-token", token],
    queryFn: async () => {
      if (!token) return null;
      const results = await base44.entities.CandidateInvitation.filter({ invite_token: token });
      if (results.length === 0) return null;
      const inv = results[0];
      // Check if expired
      if (inv.expires_at && new Date(inv.expires_at) < new Date()) {
        return { ...inv, expired: true };
      }
      return inv;
    },
    enabled: !!token,
  });

  const { data: assessment } = useQuery({
    queryKey: ["candidate-assessment", invitation?.assessment_id],
    queryFn: () => base44.entities.Assessment.get(invitation.assessment_id),
    enabled: !!invitation?.assessment_id,
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["candidate-tasks", invitation?.assessment_id],
    queryFn: () => base44.entities.AssessmentTask.filter({ assessment_id: invitation.assessment_id }),
    enabled: !!invitation?.assessment_id,
  });

  const sortedTasks = [...tasks].sort((a, b) => a.order - b.order);

  const handleStart = async () => {
    if (!user) { base44.auth.redirectToLogin(); return; }
    const s = await base44.entities.CandidateSession.create({
      invitation_id: invitation.id,
      assessment_id: invitation.assessment_id,
      candidate_email: user.email,
      candidate_name: user.full_name || invitation.candidate_name,
      status: "in_progress",
      started_at: new Date().toISOString(),
      task_submissions: [],
      activity_log: [],
    });
    await base44.entities.CandidateInvitation.update(invitation.id, { status: "in_progress", accepted_at: new Date().toISOString() });
    setSession(s);
    setStartTime(Date.now());
  };

  const handleTaskSubmit = async () => {
    if (!currentAnswer.trim()) return;
    setSubmitting(true);
    const task = sortedTasks[currentTaskIndex];
    const taskScore = Math.floor(Math.random() * 4 + 7) / 10 * (task?.points || 10); // Simulated scoring; real system would validate
    const newSubs = {
      ...submissions,
      [task.id]: {
        task_id: task.id,
        answer: currentAnswer,
        score: Math.round(taskScore),
        validation_passed: taskScore >= (task.points || 10) * 0.7,
        submitted_at: new Date().toISOString(),
        time_spent: Math.floor(elapsed / 60),
      }
    };
    setSubmissions(newSubs);
    setCurrentAnswer("");

    await base44.entities.CandidateSession.update(session.id, {
      task_submissions: Object.values(newSubs),
      current_task_index: currentTaskIndex + 1,
    });

    if (currentTaskIndex < sortedTasks.length - 1) {
      setCurrentTaskIndex(i => i + 1);
    }
    setSubmitting(false);
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    const elapsed_min = Math.floor((Date.now() - startTime) / 60000);
    await base44.entities.CandidateSession.update(session.id, {
      status: "submitted",
      submitted_at: new Date().toISOString(),
      time_elapsed_minutes: elapsed_min,
      task_submissions: Object.values(submissions),
    });
    await base44.entities.CandidateInvitation.update(invitation.id, {
      status: "completed",
      completed_at: new Date().toISOString(),
    });
    // Trigger scorecard generation
    await base44.functions.invoke("generateScorecard", { session_id: session.id });
    setSubmitted(true);
    setSubmitting(false);
  };

  const fmtTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };
  const limitSecs = (assessment?.duration_minutes || 60) * 60;
  const remaining = Math.max(0, limitSecs - elapsed);
  const timerColor = remaining < 300 ? "text-red-400" : "text-green-400";

  if (authLoading || invLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-red-500" /></div>;
  }

  if (!token || !invitation) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-white text-xl font-bold mb-2">Invalid or Expired Link</h2>
          <p className="text-gray-400">This assessment link is invalid, expired, or has already been used.</p>
        </div>
      </div>
    );
  }

  if (invitation?.expired) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h2 className="text-white text-xl font-bold mb-2">Invitation Expired</h2>
          <p className="text-gray-400">This invitation link has expired. Please contact the hiring team for a new invitation.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <CheckCircle2 className="h-20 w-20 text-green-400 mx-auto mb-6" />
          <h2 className="text-white text-3xl font-bold mb-3">Assessment Submitted!</h2>
          <p className="text-gray-300 mb-2">Thank you, <span className="text-white font-semibold">{invitation.candidate_name}</span>.</p>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">Your assessment has been submitted successfully. The hiring team will review your results and be in touch.</p>
          <Link to="/candidate-dashboard" className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-800 hover:bg-gray-700 text-white rounded-xl font-semibold text-sm transition-colors">
            <BarChart2 className="h-4 w-4 text-cyan-400" /> View My Progress Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Splash / start screen
  if (!session) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/20 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 bg-red-900/20 border border-red-800/40 rounded-full">
              <Shield className="h-4 w-4 text-red-400" />
              <span className="text-red-400 text-sm font-semibold">Xtreme I.C.E. — Candidate Assessment</span>
            </div>
            <h1 className="text-4xl font-black text-white mb-2">{assessment?.position_title}</h1>
            {assessment?.company_name && <p className="text-gray-400 text-lg">{assessment.company_name}</p>}
          </div>

          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-8 mb-6">
            <p className="text-white font-semibold text-lg mb-2">Hello, {invitation.candidate_name} 👋</p>
            <p className="text-gray-300 leading-relaxed mb-6">{assessment?.scenario_narrative || "You are about to begin a hands-on cybersecurity assessment. Complete each task to the best of your ability."}</p>

            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: "Tasks", value: sortedTasks.length },
                { label: "Duration", value: `${assessment?.duration_minutes} min` },
                { label: "Pass Score", value: `${assessment?.pass_threshold || 70}%` },
              ].map(s => (
                <div key={s.label} className="bg-black/40 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">{s.value}</div>
                  <div className="text-gray-500 text-xs mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-yellow-950/30 border border-yellow-800/40 rounded-lg p-3 mb-6">
              <p className="text-yellow-400 text-xs font-semibold mb-1">⚠ Before you begin</p>
              <ul className="text-yellow-300/70 text-xs space-y-1">
                <li>• Timer starts when you click Start Assessment</li>
                <li>• You cannot pause the assessment once started</li>
                <li>• Complete each task as thoroughly as possible</li>
                <li>• Document your findings and reasoning clearly</li>
              </ul>
            </div>

            {!user ? (
              <button onClick={() => base44.auth.redirectToLogin(window.location.href)} className="w-full py-4 bg-red-700 hover:bg-red-600 text-white rounded-xl font-bold text-lg transition-colors">
                Sign In to Begin
              </button>
            ) : (
              <button onClick={handleStart} className="w-full py-4 bg-red-700 hover:bg-red-600 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2">
                Start Assessment <ChevronRight className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Active assessment
  const currentTask = sortedTasks[currentTaskIndex];
  const completedCount = Object.keys(submissions).length;
  const allTasksDone = completedCount >= sortedTasks.length;
  const progress = (completedCount / sortedTasks.length) * 100;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* Header bar */}
      <div className="border-b border-gray-800 bg-gray-950 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <Shield className="h-5 w-5 text-red-500" />
          <span className="text-white font-bold text-sm">{assessment?.position_title}</span>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-center">
            <div className={`font-mono font-bold ${timerColor}`}>{fmtTime(remaining)}</div>
            <div className="text-gray-600 text-[10px]">remaining</div>
          </div>
          <div className="text-center">
            <div className="text-white font-bold">{completedCount}/{sortedTasks.length}</div>
            <div className="text-gray-600 text-[10px]">tasks done</div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-900">
        <div className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex flex-1 min-h-0">
        {/* Task list sidebar */}
        <div className="w-52 shrink-0 border-r border-gray-800 bg-gray-950/50 p-3 overflow-y-auto">
          <p className="text-gray-500 text-[10px] uppercase font-mono mb-2 px-1">Tasks</p>
          {sortedTasks.map((t, i) => {
            const done = !!submissions[t.id];
            const active = i === currentTaskIndex && !allTasksDone;
            return (
              <button key={t.id} onClick={() => !allTasksDone && setCurrentTaskIndex(i)}
                className={`w-full text-left px-3 py-2 rounded-lg text-[11px] mb-1 flex items-start gap-2 transition-all ${active ? "bg-red-900/40 border border-red-700/50 text-white" : done ? "bg-green-900/20 border border-green-800/30 text-green-400" : "text-gray-500 hover:text-gray-300 border border-transparent"}`}>
                {done ? <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" /> : <span className={`h-3 w-3 mt-0.5 shrink-0 rounded-full border ${active ? "border-red-500 bg-red-700" : "border-gray-700"}`} />}
                <span className="line-clamp-2">{t.title}</span>
              </button>
            );
          })}
        </div>

        {/* Main area */}
        <div className="flex-1 p-6 overflow-y-auto">
          {allTasksDone ? (
            <div className="max-w-xl mx-auto text-center py-12">
              <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-white text-2xl font-bold mb-2">All Tasks Complete!</h2>
              <p className="text-gray-400 mb-8">You've completed all {sortedTasks.length} tasks. Review your submissions and submit the assessment when ready.</p>
              <button onClick={handleFinalSubmit} disabled={submitting} className="px-8 py-3 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl font-bold transition-colors flex items-center gap-2 mx-auto">
                {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Submitting...</> : <><Send className="h-5 w-5" /> Submit Assessment</>}
              </button>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-mono text-gray-500">TASK {currentTaskIndex + 1} / {sortedTasks.length}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">{currentTask?.task_type}</span>
                  <span className="ml-auto text-yellow-400 font-mono text-xs">{currentTask?.points} pts</span>
                </div>
                <h2 className="text-white text-xl font-bold mb-3">{currentTask?.title}</h2>
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-gray-300 text-sm leading-relaxed">
                  {currentTask?.description}
                </div>
              </div>

              {currentTask?.hints?.length > 0 && (
                <details className="mb-4 group">
                  <summary className="cursor-pointer text-yellow-400 text-xs font-mono hover:text-yellow-300">💡 Show hint</summary>
                  <div className="mt-2 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg text-yellow-300 text-xs">
                    {currentTask.hints[0]}
                  </div>
                </details>
              )}

              {currentTask?.tools_required?.length > 0 && (
                <div className="mb-4 flex flex-wrap gap-1">
                  {currentTask.tools_required.map(t => (
                    <span key={t} className="text-[10px] px-2 py-1 rounded bg-blue-950/40 border border-blue-800/40 text-blue-400">{t}</span>
                  ))}
                </div>
              )}

              <div className="mb-4">
                <label className="block text-gray-300 text-sm font-medium mb-2">Your Response / Findings</label>
                <textarea
                  className="w-full bg-gray-900 border border-gray-700 text-white rounded-xl p-4 text-sm font-mono h-40 resize-none focus:outline-none focus:border-red-600 transition-colors placeholder-gray-600"
                  placeholder="Document your approach, commands run, findings, analysis, and conclusions here..."
                  value={currentAnswer}
                  onChange={e => setCurrentAnswer(e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-xs">Be thorough — document your reasoning and steps taken</span>
                <button onClick={handleTaskSubmit} disabled={submitting || !currentAnswer.trim()} className="px-5 py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white rounded-lg font-semibold text-sm transition-colors flex items-center gap-2">
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {currentTaskIndex < sortedTasks.length - 1 ? "Submit & Next Task" : "Submit Final Task"}
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}