import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Shield, CheckCircle2, ChevronRight, Loader2, Send, AlertCircle } from "lucide-react";
import CandidateQuestion, { isAnswered } from "@/components/assessment/CandidateQuestion";
import CandidateLabRunner from "@/components/assessment/CandidateLabRunner";
import { assessmentLabs } from "@/lib/candidateLabs";

export default function CandidatePortal() {
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  const [session, setSession] = useState(null);
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [startTime, setStartTime] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [alreadyTaken, setAlreadyTaken] = useState(false);
  const [labResult, setLabResult] = useState(null);
  const [labSubmitError, setLabSubmitError] = useState("");

  useEffect(() => {
    if (startTime && !submitted) {
      const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startTime) / 1000)), 1000);
      return () => clearInterval(interval);
    }
  }, [startTime, submitted]);

  const { data: portalData, isLoading: invLoading, isError: portalLoadFailed } = useQuery({
    queryKey: ["candidate-assessment-portal", token],
    queryFn: async () => {
      if (!token) return null;
      const response = await base44.functions.invoke("getCandidateAssessment", { token });
      return response?.data || null;
    },
    enabled: !!token,
    retry: false,
  });

  const invitation = portalData?.invitation;
  const assessment = portalData?.assessment;
  const tasks = portalData?.tasks || [];
  const sortedTasks = [...tasks].sort((a, b) => a.order - b.order);
  /* Assessments built from a lab carry no written questions — the invite opens
     the lab itself so the candidate never lands on an empty answer form. */
  const labs = assessmentLabs(assessment);
  const labAssessment = sortedTasks.length === 0 && labs.length > 0;

  // Resume an in-progress attempt so a refresh never loses answers.
  useEffect(() => {
    const openSession = portalData?.session;
    if (!openSession || openSession.status === "submitted" || openSession.status === "evaluated") return;
    setSession(openSession);
    if (openSession.started_at) setStartTime(new Date(openSession.started_at).getTime());
    const restored = {};
    (openSession.task_submissions || []).forEach((sub) => {
      restored[sub.task_id] = { answer: sub.answer || "", matches: sub.matches || {} };
    });
    setAnswers(restored);
    setCurrentTaskIndex(Number(openSession.current_task_index) || 0);
  }, [portalData?.session?.id]);

  const handleStart = async () => {
    setError("");
    try {
      const res = await base44.functions.invoke("candidateSessionFlow", { action: "start", token });
      if (res?.data?.session) {
        setSession(res.data.session);
        setStartTime(Date.now());
        const resumable = {};
        (res.data.session.task_submissions || []).forEach((sub) => {
          resumable[sub.task_id] = { answer: sub.answer || "", matches: sub.matches || {} };
        });
        setAnswers(resumable);
      }
    } catch (e) {
      const status = e?.response?.status ?? e?.status;
      const message = e?.response?.data?.error || e?.message || "";
      // A single-attempt test that is already submitted is a dead end, not an error
      // the candidate can retry — send them to the closed screen instead.
      if (status === 410 && !/expired/i.test(message)) {
        setAlreadyTaken(true);
        return;
      }
      setError(message || "Unable to start the assessment.");
    }
  };

  const persist = async (nextAnswers, nextIndex) => {
    if (!session) return;
    await base44.functions.invoke("candidateSessionFlow", {
      action: "update",
      token,
      session_id: session.id,
      task_submissions: Object.entries(nextAnswers).map(([taskId, value]) => ({
        task_id: taskId,
        answer: value.answer || "",
        matches: value.matches || {},
        time_spent: Math.floor(elapsed / 60),
        submitted_at: new Date().toISOString(),
      })),
      current_task_index: nextIndex,
    });
  };

  const currentTask = sortedTasks[currentTaskIndex];
  const currentValue = answers[currentTask?.id] || { answer: "", matches: {} };

  const handleTaskSubmit = async () => {
    if (!currentTask || !isAnswered(currentTask, currentValue)) {
      setError("Please answer this question before continuing.");
      return;
    }
    setError("");
    setSubmitting(true);
    const nextAnswers = {
      ...answers,
      [currentTask.id]: { ...currentValue, time_spent: Math.floor(elapsed / 60) },
    };
    setAnswers(nextAnswers);
    try {
      const nextIndex = Math.min(currentTaskIndex + 1, sortedTasks.length - 1);
      await persist(nextAnswers, nextIndex);
      setCurrentTaskIndex(nextIndex);
    } catch (e) {
      setError(e?.response?.data?.error || "Could not save your answer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    setError("");
    try {
      await base44.functions.invoke("candidateSessionFlow", {
        action: "submit",
        token,
        session_id: session.id,
        task_submissions: sortedTasks.map((task) => {
          const value = answers[task.id] || { answer: "", matches: {} };
          return {
            task_id: task.id,
            answer: value.answer || "",
            matches: value.matches || {},
            time_spent: Math.floor(elapsed / 60),
            submitted_at: new Date().toISOString(),
          };
        }),
        time_elapsed_minutes: Math.floor((Date.now() - startTime) / 60000),
      });
      setSubmitted(true);
    } catch (e) {
      const status = e?.response?.status ?? e?.status;
      const message = e?.response?.data?.error || "";
      if (status === 410) {
        setAlreadyTaken(true);
        return;
      }
      setError(
        message ||
          "We could not submit your assessment just now. Your answers are saved — please press Submit again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  /* Lab attempts are scored inside the lab itself; the invitation flow turns that
     result into the candidate's scorecard. */
  const submitLab = async (result) => {
    if (!session) return;
    setSubmitting(true);
    setLabSubmitError("");
    try {
      await base44.functions.invoke("candidateSessionFlow", {
        action: "submit",
        token,
        session_id: session.id,
        lab_result: result,
        time_elapsed_minutes: Math.floor((Date.now() - (startTime || Date.now())) / 60000),
      });
      setSubmitted(true);
    } catch (e) {
      const status = e?.response?.status ?? e?.status;
      const message = e?.response?.data?.error || "";
      if (status === 410) {
        setAlreadyTaken(true);
        return;
      }
      setLabSubmitError(message || "We could not save your result. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLabComplete = (result) => {
    setLabResult(result);
    submitLab(result);
  };

  const fmtTime = (secs) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };
  const limitSecs = (assessment?.duration_minutes || 60) * 60;
  const remaining = Math.max(0, limitSecs - elapsed);
  const timerColor = remaining < 300 ? "text-red-400" : "text-green-400";

  if (invLoading) {
    return <div className="min-h-screen bg-black flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-red-500" /></div>;
  }

  if (!token || portalLoadFailed || !invitation) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-white text-xl font-bold mb-2">Invalid or Expired Link</h2>
          <p className="text-gray-400">This assessment link is invalid, expired, or has already been used.</p>
        </div>
      </div>
    );
  }

  if (invitation?.expired && !session) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-orange-500 mx-auto mb-4" />
          <h2 className="text-white text-xl font-bold mb-2">Invitation Expired</h2>
          <p className="text-gray-400">This invitation link has expired. Please contact the hiring team for a new invitation.</p>
        </div>
      </div>
    );
  }

  if (alreadyTaken) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <AlertCircle className="h-20 w-20 text-orange-500 mx-auto mb-6" />
          <h2 className="text-white text-3xl font-bold mb-3">Assessment Already Submitted</h2>
          <p className="text-gray-300 mb-2">
            This assessment can only be taken once, and your attempt has already been completed.
          </p>
          <p className="text-gray-400 text-sm leading-relaxed">
            Your answers are with the hiring team. Please contact them if you believe this is a mistake.
          </p>
        </div>
      </div>
    );
  }

  // A completed invitation never shows the landing page again, even if the
  // candidate opens an old tab and clicks Start.
  if (submitted || portalData?.already_submitted || invitation.status === "completed") {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6">
        <div className="text-center max-w-md">
          <CheckCircle2 className="h-20 w-20 text-green-400 mx-auto mb-6" />
          <h2 className="text-white text-3xl font-bold mb-3">Submitted!</h2>
          <p className="text-gray-300 mb-2">Thank you, <span className="text-white font-semibold">{invitation.candidate_name}</span>.</p>
          <p className="text-gray-400 text-sm leading-relaxed mb-6">
            Your answers have been recorded. The hiring team will review your results and be in touch.
          </p>
        </div>
      </div>
    );
  }

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

          {assessment?.scenario_block && (
            <div className="bg-gray-900/80 border border-red-900/30 rounded-xl p-6 mb-6">
              <p className="text-[10px] uppercase tracking-widest text-red-400 font-semibold mb-2">Scenario</p>
              <p className="text-gray-300 text-sm leading-relaxed whitespace-pre-line">{assessment.scenario_block}</p>
            </div>
          )}

          <div className="bg-gray-900/80 border border-gray-800 rounded-2xl p-8 mb-6">
            <p className="text-white font-semibold text-lg mb-2">Hello, {invitation.candidate_name} 👋</p>
            <p className="text-gray-300 leading-relaxed mb-6">
              {assessment?.scenario_narrative || "You are about to begin a candidate assessment. Answer every question to the best of your ability."}
            </p>

            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                {
                  label: labAssessment
                    ? "Lab"
                    : assessment?.assessment_kind === "application_test"
                    ? "Questions"
                    : "Tasks",
                  value: labAssessment ? labs[0]?.title || "1" : sortedTasks.length,
                },
                { label: "Duration", value: `${assessment?.duration_minutes} min` },
                { label: "Pass Score", value: `${assessment?.pass_threshold || 70}%` },
              ].map((s) => (
                <div key={s.label} className="bg-black/40 rounded-lg p-3 text-center">
                  <div className="text-2xl font-bold text-white">{s.value}</div>
                  <div className="text-gray-500 text-xs mt-1">{s.label}</div>
                </div>
              ))}
            </div>

            <div className="bg-yellow-950/30 border border-yellow-800/40 rounded-lg p-3 mb-6">
              <p className="text-yellow-400 text-xs font-semibold mb-1">⚠ Before you begin</p>
              <ul className="text-yellow-300/70 text-xs space-y-1">
                <li>• Timer starts when you click Start</li>
                <li>• You cannot pause once started</li>
                <li>• Your answers save as you go — you can refresh safely</li>
                <li>• Answer every question before submitting</li>
                <li>• Single attempt — you cannot retake this once submitted</li>
              </ul>
            </div>

            {error && <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-xs">{error}</div>}

            <button onClick={handleStart} className="w-full py-4 bg-red-700 hover:bg-red-600 text-white rounded-xl font-bold text-lg transition-colors flex items-center justify-center gap-2">
              Start {assessment?.assessment_kind === "application_test" ? "Test" : "Assessment"} <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* A lab assessment runs the lab itself, not a written-answer form. */
  if (labAssessment) {
    if (labSubmitError) {
      return (
        <div className="min-h-screen bg-black flex items-center justify-center p-6">
          <div className="max-w-md text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-white text-xl font-bold mb-2">Result not saved yet</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-6">{labSubmitError}</p>
            <button
              onClick={() => submitLab(labResult)}
              disabled={submitting || !labResult}
              className="px-6 py-3 bg-red-700 hover:bg-red-600 disabled:opacity-50 text-white rounded-xl font-bold transition-colors"
            >
              {submitting ? "Saving..." : "Save my result again"}
            </button>
          </div>
        </div>
      );
    }
    return <CandidateLabRunner lab={labs[0]} onComplete={handleLabComplete} />;
  }

  const answeredCount = sortedTasks.filter((task) => isAnswered(task, answers[task.id])).length;
  const allTasksDone = answeredCount >= sortedTasks.length && sortedTasks.length > 0;
  const progress = sortedTasks.length ? (answeredCount / sortedTasks.length) * 100 : 0;

  return (
    <div className="min-h-screen bg-black flex flex-col">
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
            <div className="text-white font-bold">{answeredCount}/{sortedTasks.length}</div>
            <div className="text-gray-600 text-[10px]">answered</div>
          </div>
        </div>
      </div>

      <div className="h-1 bg-gray-900">
        <div className="h-full bg-gradient-to-r from-red-700 to-red-500 transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>

      <div className="flex flex-1 min-h-0">
        <div className="w-52 shrink-0 border-r border-gray-800 bg-gray-950/50 p-3 overflow-y-auto">
          <p className="text-gray-500 text-[10px] uppercase font-mono mb-2 px-1">
            {assessment?.assessment_kind === "application_test" ? "Questions" : "Tasks"}
          </p>
          {sortedTasks.map((t, i) => {
            const done = isAnswered(t, answers[t.id]);
            const active = i === currentTaskIndex && !allTasksDone;
            return (
              <button
                key={t.id}
                onClick={() => setCurrentTaskIndex(i)}
                className={`w-full text-left px-3 py-2 rounded-lg text-[11px] mb-1 flex items-start gap-2 transition-all ${
                  active
                    ? "bg-red-900/40 border border-red-700/50 text-white"
                    : done
                    ? "bg-green-900/20 border border-green-800/30 text-green-400"
                    : "text-gray-500 hover:text-gray-300 border border-transparent"
                }`}
              >
                {done ? <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0" /> : <span className={`h-3 w-3 mt-0.5 shrink-0 rounded-full border ${active ? "border-red-500 bg-red-700" : "border-gray-700"}`} />}
                <span className="line-clamp-2">{done || active ? t.title : `Question ${i + 1}`}</span>
              </button>
            );
          })}
        </div>

        <div className="flex-1 p-6 overflow-y-auto">
          {allTasksDone ? (
            <div className="max-w-xl mx-auto text-center py-12">
              <CheckCircle2 className="h-16 w-16 text-green-400 mx-auto mb-4" />
              <h2 className="text-white text-2xl font-bold mb-2">All Questions Answered</h2>
              <p className="text-gray-400 mb-6">Review any answer before submitting — you cannot change it afterwards.</p>
              <div className="text-left max-w-sm mx-auto mb-8 space-y-1">
                {sortedTasks.map((t, i) => (
                  <button key={t.id} onClick={() => setCurrentTaskIndex(i)} className="w-full flex items-center gap-2 text-xs text-gray-400 hover:text-white transition-colors py-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" />
                    <span className="truncate">{i + 1}. {t.title}</span>
                  </button>
                ))}
              </div>
              {error && <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-xs">{error}</div>}
              <button onClick={handleFinalSubmit} disabled={submitting} className="px-8 py-3 bg-green-700 hover:bg-green-600 disabled:opacity-50 text-white rounded-xl font-bold transition-colors flex items-center gap-2 mx-auto">
                {submitting ? <><Loader2 className="h-5 w-5 animate-spin" /> Submitting...</> : <><Send className="h-5 w-5" /> Submit</>}
              </button>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              {assessment?.scenario_block && (
                <details open className="mb-5 rounded-xl border border-red-900/30 bg-gray-900/70">
                  <summary className="cursor-pointer px-4 py-2 text-[10px] uppercase tracking-widest text-red-400 font-semibold">
                    Scenario
                  </summary>
                  <p className="px-4 pb-3 text-gray-300 text-xs leading-relaxed whitespace-pre-line max-h-40 overflow-y-auto">
                    {assessment.scenario_block}
                  </p>
                </details>
              )}

              <div className="mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-mono text-gray-500">QUESTION {currentTaskIndex + 1} / {sortedTasks.length}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700 capitalize">
                    {currentTask?.question_type === "mcq" ? "Multiple choice" : currentTask?.question_type === "matching" ? "Matching" : currentTask?.question_type === "hotspot" ? "Hotspot" : currentTask?.task_type}
                  </span>
                  <span className="ml-auto text-yellow-400 font-mono text-xs">{currentTask?.points} pts</span>
                </div>
                <h2 className="text-white text-xl font-bold mb-3">{currentTask?.title}</h2>
                {currentTask?.description && (
                  <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-gray-300 text-sm leading-relaxed mb-4">
                    {currentTask.description}
                  </div>
                )}
              </div>

              {currentTask?.hints?.length > 0 && (
                <details className="mb-4">
                  <summary className="cursor-pointer text-yellow-400 text-xs font-mono hover:text-yellow-300">💡 Show hint</summary>
                  <div className="mt-2 p-3 bg-yellow-900/20 border border-yellow-700/30 rounded-lg text-yellow-300 text-xs">
                    {currentTask.hints[0]}
                  </div>
                </details>
              )}

              <div className="mb-4">
                <label className="block text-gray-300 text-sm font-medium mb-2">
                  {currentTask?.question_type === "manual" ? "Your Response / Findings" : "Your Answer"}
                </label>
                <CandidateQuestion
                  task={currentTask}
                  value={currentValue}
                  onChange={(next) => setAnswers((prev) => ({ ...prev, [currentTask.id]: next }))}
                />
              </div>

              {error && <div className="mb-4 p-3 bg-red-900/30 border border-red-700/50 rounded-lg text-red-300 text-xs">{error}</div>}

              <div className="flex items-center justify-between">
                <span className="text-gray-600 text-xs">
                  {currentTaskIndex < sortedTasks.length - 1 && isAnswered(sortedTasks[currentTaskIndex + 1], answers[sortedTasks[currentTaskIndex + 1]?.id])
                    ? "Next question already answered"
                    : "Your progress is saved automatically"}
                </span>
                <button
                  onClick={handleTaskSubmit}
                  disabled={submitting || !isAnswered(currentTask, currentValue)}
                  className="px-5 py-2.5 bg-red-700 hover:bg-red-600 disabled:opacity-40 text-white rounded-lg font-semibold text-sm transition-colors flex items-center gap-2"
                >
                  {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {currentTaskIndex < sortedTasks.length - 1 ? "Save & Next" : "Save Answer"}
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