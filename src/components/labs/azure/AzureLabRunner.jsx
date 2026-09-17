import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ChevronRight, Lightbulb, CheckCircle2, BookOpen, ArrowRight, Trophy, RotateCcw, XCircle, AlertTriangle, Cloud, HelpCircle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useTranslation } from "react-i18next";
import AzureLabIntro from "./AzureLabIntro";
import DashboardInteraction from "./DashboardInteraction";
import PortalInteraction from "./PortalInteraction";
import CanvasInteraction from "./CanvasInteraction";

const AZURE = "#0078D4";
const POINTS_PER_STEP = 10;

const STORAGE_KEY = (labTitle) => `azlab_progress_${labTitle.replace(/\s+/g, "_")}`;

function loadProgress(labTitle) {
  try { const s = localStorage.getItem(STORAGE_KEY(labTitle)); return s ? JSON.parse(s) : null; } catch { return null; }
}
function saveProgress(labTitle, data) {
  try { localStorage.setItem(STORAGE_KEY(labTitle), JSON.stringify(data)); } catch {}
}
function clearProgress(labTitle) {
  try { localStorage.removeItem(STORAGE_KEY(labTitle)); } catch {}
}

function QuestionCard({ question, onAnswered }) {
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);

  const handleSubmit = () => {
    if (selected === null) return;
    setAnswered(true);
    onAnswered(selected === question.correctIndex);
  };

  const isCorrect = answered && selected === question.correctIndex;

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <HelpCircle className="h-4 w-4" style={{ color: AZURE }} />
        <span className="text-[10px] font-mono uppercase tracking-wider font-bold" style={{ color: AZURE }}>Knowledge Check</span>
      </div>
      <p className="text-xs text-gray-200 leading-relaxed mb-3">{question.text}</p>
      <div className="space-y-2 mb-3">
        {question.options.map((opt, i) => {
          const isSelected = selected === i;
          const showCorrect = answered && i === question.correctIndex;
          const showWrong = answered && isSelected && i !== question.correctIndex;
          return (
            <button
              key={i}
              onClick={() => !answered && setSelected(i)}
              disabled={answered}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-mono border transition-all flex items-center gap-2 ${
                showCorrect ? "bg-green-900/30 border-green-700/50 text-green-300" :
                showWrong ? "bg-red-900/30 border-red-700/50 text-red-300" :
                isSelected ? "text-white border-2" :
                "bg-gray-800 border-gray-600 text-gray-400 hover:border-gray-500"
              }`}
              style={isSelected && !answered ? { backgroundColor: AZURE, borderColor: AZURE } : {}}
            >
              <span className="h-5 w-5 shrink-0 rounded-full border flex items-center justify-center text-[10px] font-bold" style={{ borderColor: showCorrect ? "#22c55e" : showWrong ? "#ef4444" : isSelected ? AZURE : "#4b5563" }}>
                {String.fromCharCode(65 + i)}
              </span>
              {opt}
              {showCorrect && <CheckCircle2 className="h-3.5 w-3.5 text-green-400 ml-auto" />}
              {showWrong && <XCircle className="h-3.5 w-3.5 text-red-400 ml-auto" />}
            </button>
          );
        })}
      </div>
      {!answered ? (
        <button onClick={handleSubmit} disabled={selected === null} className="px-4 py-1.5 rounded-lg text-white text-xs font-mono font-bold transition-colors disabled:opacity-40" style={{ backgroundColor: AZURE }}>
          Submit Answer
        </button>
      ) : (
        <div className={`rounded-lg px-3 py-2 text-xs leading-relaxed ${isCorrect ? "bg-green-950/30 text-green-300" : "bg-red-950/30 text-red-300"}`}>
          {isCorrect ? "✓ Correct! " : "✗ Not quite. "}{question.explanation}
        </div>
      )}
    </div>
  );
}

export default function AzureLabRunner({ labTitle, chapterNum, difficulty, tags = [], steps = [], toolLabel = "Azure Portal Simulation", duration, intro }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const saved = loadProgress(labTitle);
  const [showIntro, setShowIntro] = useState(saved ? false : !!intro);
  const [showRecap, setShowRecap] = useState(saved?.showRecap ?? false);
  const [currentStep, setCurrentStep] = useState(saved?.currentStep ?? 0);
  const [completedSteps, setCompletedSteps] = useState(saved?.completedSteps ?? []);
  const [interactionDone, setInteractionDone] = useState(false);
  const [questionCorrect, setQuestionCorrect] = useState(null);
  const [questionsCorrect, setQuestionsCorrect] = useState(saved?.questionsCorrect ?? 0);
  const [scenarioOpen, setScenarioOpen] = useState(true);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  useEffect(() => {
    if (!showRecap) {
      saveProgress(labTitle, { currentStep, completedSteps, questionsCorrect, showRecap: false });
    }
  }, [currentStep, completedSteps, questionsCorrect]);

  const stepComplete = interactionDone && questionCorrect !== null;

  useEffect(() => {
    const done = completedSteps.includes(currentStep);
    setInteractionDone(done);
    setQuestionCorrect(done ? (saved?.stepResults?.[currentStep] ?? null) : null);
    // eslint-disable-next-line
  }, [currentStep]);

  const handleInteractionComplete = () => setInteractionDone(true);
  const handleQuestionAnswered = (correct) => {
    setQuestionCorrect(correct);
    if (correct && !completedSteps.includes(currentStep)) {
      setQuestionsCorrect(c => c + 1);
    }
  };

  const handleStepComplete = () => {
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps(prev => [...prev, currentStep]);
    }
  };

  // Auto-complete step when both interaction and question are done
  useEffect(() => {
    if (interactionDone && questionCorrect !== null && !completedSteps.includes(currentStep)) {
      handleStepComplete();
    }
    // eslint-disable-next-line
  }, [interactionDone, questionCorrect]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(s => s + 1);
  };

  const handleReset = () => {
    clearProgress(labTitle);
    setShowResetConfirm(false);
    setShowRecap(false);
    setCurrentStep(0);
    setCompletedSteps([]);
    setInteractionDone(false);
    setQuestionCorrect(null);
    setQuestionsCorrect(0);
    setShowIntro(!!intro);
  };

  const handleFinish = async () => {
    clearProgress(labTitle);
    try {
      const user = await base44.auth.me();
      const pointsPossible = steps.length * POINTS_PER_STEP;
      const pointsEarned = completedSteps.length * POINTS_PER_STEP;
      await base44.entities.LabScore.create({
        user_email: user.email,
        user_name: user.full_name || user.email,
        lab_title: labTitle,
        lab_chapter: String(chapterNum),
        difficulty,
        total_steps: steps.length,
        steps_completed: completedSteps.length,
        questions_correct: questionsCorrect,
        questions_total: steps.length,
        points_earned: pointsEarned,
        points_possible: pointsPossible,
        step_results: steps.map((s, i) => ({
          stepLabel: s.stepLabel,
          interactionCompleted: completedSteps.includes(i),
          questionCorrect: completedSteps.includes(i),
          pointsEarned: completedSteps.includes(i) ? POINTS_PER_STEP : 0,
        })),
        completed_at: new Date().toISOString(),
      });
    } catch (_) {}
    setShowRecap(true);
  };

  const diffColor = {
    Beginner: "text-green-400 border-green-600/50 bg-green-900/20",
    Intermediate: "text-yellow-400 border-yellow-600/50 bg-yellow-900/20",
    Advanced: "text-orange-400 border-orange-600/50 bg-orange-900/20",
    Expert: "text-red-400 border-red-600/50 bg-red-900/20",
  }[difficulty] || "text-gray-400 border-gray-600/50 bg-gray-900/20";

  if (showIntro && intro) {
    return <AzureLabIntro labTitle={labTitle} chapterNum={chapterNum} difficulty={difficulty} tags={tags} toolLabel={toolLabel} duration={duration} intro={intro} onStart={() => setShowIntro(false)} />;
  }

  if (showRecap) {
    const passed = completedSteps.length === steps.length;
    const accuracy = steps.length > 0 ? Math.round((questionsCorrect / steps.length) * 100) : 0;

    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-blue-950/20 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-black/60 shrink-0">
          <span className="text-white font-mono font-bold text-sm">Ch.{chapterNum} — {labTitle}</span>
          <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-mono font-semibold ${diffColor}`}>{difficulty}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-8">
            <div className="text-center mb-6">
              <div className={`inline-flex items-center justify-center h-16 w-16 rounded-full border-2 mb-3 ${passed ? "bg-yellow-900/30 border-yellow-600/50" : "bg-gray-900/50 border-gray-600/50"}`}>
                {passed ? <Trophy className="h-8 w-8 text-yellow-400" /> : <AlertTriangle className="h-8 w-8 text-orange-400" />}
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">{passed ? "Lab Complete" : "Session Ended"}</h1>
              <p className="text-gray-400 font-mono text-xs">{completedSteps.length}/{steps.length} steps completed</p>
            </div>

            <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Session Summary</h2>
                {passed ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-900/40 border border-green-600/50 text-green-400 text-[11px] font-mono font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Pass
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-900/40 border border-red-600/50 text-red-400 text-[11px] font-mono font-bold">
                    <XCircle className="h-3.5 w-3.5" /> Incomplete
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-black/40 rounded-lg p-3 text-center border border-gray-800">
                  <div className="text-2xl font-bold font-mono" style={{ color: AZURE }}>{completedSteps.length}</div>
                  <div className="text-[10px] text-gray-500 font-mono uppercase mt-1">Steps Done</div>
                </div>
                <div className="bg-black/40 rounded-lg p-3 text-center border border-gray-800">
                  <div className="text-2xl font-bold font-mono text-green-400">{questionsCorrect}</div>
                  <div className="text-[10px] text-gray-500 font-mono uppercase mt-1">Correct Answers</div>
                </div>
                <div className="bg-black/40 rounded-lg p-3 text-center border border-gray-800">
                  <div className={`text-2xl font-bold font-mono ${accuracy >= 80 ? "text-green-400" : accuracy >= 50 ? "text-yellow-400" : "text-red-400"}`}>{accuracy}%</div>
                  <div className="text-[10px] text-gray-500 font-mono uppercase mt-1">Score</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-1">
                  <span>Progress</span><span>{completedSteps.length}/{steps.length}</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all" style={{ width: `${(completedSteps.length / steps.length) * 100}%`, backgroundColor: AZURE }} />
                </div>
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button onClick={handleReset} className="flex items-center gap-2 px-5 py-2.5 border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white rounded-xl font-mono text-sm transition-colors">
                <RotateCcw className="h-4 w-4" /> Retry Lab
              </button>
              <button onClick={() => navigate("/InteractiveVirtualLabs")} className="flex items-center gap-2 px-6 py-2.5 text-white rounded-xl font-mono font-bold text-sm transition-colors" style={{ backgroundColor: AZURE }}>
                Back to Courses <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderInteraction = () => {
    if (!step.interaction) return null;
    const props = { interaction: step.interaction, onComplete: handleInteractionComplete };
    switch (step.interaction.type) {
      case "dashboard": return <DashboardInteraction {...props} />;
      case "portal": return <PortalInteraction {...props} />;
      case "canvas": return <CanvasInteraction {...props} />;
      default: return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-blue-950/20 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-black/60 shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/InteractiveVirtualLabs" className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs font-mono transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Training Labs
          </Link>
          <span className="text-gray-600">|</span>
          <span className="text-white font-mono font-bold text-sm">Ch.{chapterNum} — {labTitle}</span>
        </div>
        <div className="flex items-center gap-2">
          {tags.map(t => <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700 font-mono">{t}</span>)}
          <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-mono font-semibold ${diffColor}`}>{difficulty}</span>
          <div className="relative">
            <button onClick={() => setShowResetConfirm(v => !v)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-700 hover:border-red-700/60 text-gray-400 hover:text-red-400 text-[11px] font-mono transition-colors">
              <RotateCcw className="h-3 w-3" /> Reset
            </button>
            {showResetConfirm && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-gray-900 border border-red-700/50 rounded-xl shadow-xl z-50 p-3">
                <p className="text-xs text-gray-300 font-mono mb-3">Reset all progress for this lab?</p>
                <div className="flex gap-2">
                  <button onClick={() => setShowResetConfirm(false)} className="flex-1 px-2 py-1.5 text-[11px] font-mono border border-gray-600 hover:border-gray-400 text-gray-400 hover:text-white rounded-lg transition-colors">Cancel</button>
                  <button onClick={handleReset} className="flex-1 px-2 py-1.5 text-[11px] font-mono bg-red-800 hover:bg-red-700 text-white rounded-lg transition-colors font-bold">Confirm</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="shrink-0 px-4 py-2 bg-black/40 border-b border-gray-800">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-500" style={{ width: `${(completedSteps.length / steps.length) * 100}%`, backgroundColor: AZURE }} />
          </div>
          <span className="text-[10px] font-mono text-gray-500 shrink-0">{completedSteps.length}/{steps.length} steps</span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {/* Left sidebar: Steps */}
        <div className="w-56 shrink-0 border-r border-gray-800 bg-black/30 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
            <div className="flex items-center gap-2 mb-2 px-1">
              <Cloud className="h-3.5 w-3.5" style={{ color: AZURE }} />
              <span className="text-[10px] font-mono text-gray-500 uppercase">Lab Steps</span>
            </div>
            {steps.map((s, i) => {
              const done = completedSteps.includes(i);
              const active = i === currentStep;
              return (
                <button key={i} onClick={() => setCurrentStep(i)} className={`text-left px-3 py-2 rounded-lg text-[11px] font-mono transition-all flex items-start gap-2 ${
                  active ? "border text-white" : done ? "bg-green-900/20 border border-green-800/30 text-green-400" : "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 border border-transparent"
                }`} style={active ? { backgroundColor: "rgba(0,120,212,0.15)", borderColor: AZURE } : {}}>
                  {done ? <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0 text-green-400" /> : <span className="h-3 w-3 mt-0.5 shrink-0 rounded-full border" style={active ? { borderColor: AZURE, backgroundColor: AZURE } : { borderColor: "#4b5563" }} />}
                  <span className="line-clamp-2">{s.stepLabel}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0 p-4 gap-4 overflow-y-auto">
          {/* Scenario context */}
          {intro?.overview && (
            <div className="bg-gray-900/60 border rounded-xl shrink-0 overflow-hidden" style={{ borderColor: "rgba(0,120,212,0.3)" }}>
              <button onClick={() => setScenarioOpen(v => !v)} className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-blue-950/20 transition-colors">
                <BookOpen className="h-4 w-4 shrink-0" style={{ color: AZURE }} />
                <span className="text-[10px] font-mono uppercase tracking-wider font-bold flex-1 text-left" style={{ color: AZURE }}>Scenario</span>
                <ChevronRight className={`h-3.5 w-3.5 text-gray-500 transition-transform ${scenarioOpen ? "rotate-90" : ""}`} />
              </button>
              {scenarioOpen && <div className="px-4 pb-3"><p className="text-gray-300 text-xs leading-relaxed font-mono">{intro.overview}</p></div>}
            </div>
          )}

          {/* Task description */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl shrink-0 overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-800 bg-black/30">
              <span className="text-[10px] font-mono text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700">STEP {currentStep + 1} / {steps.length}</span>
              <span className="text-sm font-bold text-white font-mono">{step.stepLabel}</span>
            </div>
            <div className="p-4 flex flex-col gap-3">
              <div className="rounded-lg px-3 py-2.5" style={{ backgroundColor: "rgba(0,120,212,0.1)", border: "1px solid rgba(0,120,212,0.3)" }}>
                <p className="text-gray-200 text-xs leading-relaxed">{step.explanation}</p>
              </div>
              <div className="flex items-start gap-2">
                <Lightbulb className="h-3.5 w-3.5 text-yellow-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] font-mono text-yellow-500 font-bold uppercase tracking-wider">Why It Matters </span>
                  <span className="text-yellow-200/80 text-[11px] font-mono leading-relaxed">{step.whyItMatters}</span>
                </div>
              </div>
            </div>
          </div>

          {/* GUI Interaction */}
          <div className="bg-gray-900/60 border border-gray-700 rounded-xl shrink-0 p-4">
            {renderInteraction()}
          </div>

          {/* Knowledge Check — appears after interaction is done */}
          {interactionDone && step.question && (
            <QuestionCard question={step.question} onAnswered={handleQuestionAnswered} />
          )}

          {/* Next step */}
          {stepComplete && step.nextStepDirections && (
            <div className="bg-blue-950/40 border border-blue-700/40 rounded-xl px-4 py-3 flex gap-3 items-start shrink-0">
              <ArrowRight className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
              <p className="text-blue-200 text-xs leading-relaxed font-mono">{step.nextStepDirections}</p>
            </div>
          )}

          {/* Next/Finish button */}
          <div className="flex items-center justify-end shrink-0">
            {stepComplete && (
              isLastStep ? (
                <button onClick={handleFinish} className="flex items-center gap-2 px-5 py-2 text-white rounded-lg font-mono text-xs font-bold transition-colors shrink-0" style={{ backgroundColor: "#b8860b" }}>
                  <Trophy className="h-3.5 w-3.5" /> Complete Lab
                </button>
              ) : (
                <button onClick={handleNext} className="flex items-center gap-2 px-4 py-2 text-white rounded-lg font-mono text-xs transition-colors shrink-0" style={{ backgroundColor: AZURE }}>
                  Next Step <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}