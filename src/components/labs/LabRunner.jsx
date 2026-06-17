import React, { useState, useRef, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { ArrowLeft, ChevronRight, Terminal, Lightbulb, CheckCircle2, BookOpen, ArrowRight, Trophy, RotateCcw, Copy, Check, XCircle, AlertTriangle } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useTranslation } from "react-i18next";
import LabIntro from "./LabIntro";
import LabAIBot from "./LabAIBot";
import LabSecurityInsight from "./LabSecurityInsight";
import LabNotepad from "./LabNotepad";

const POINTS_PER_COMMAND = 10;

function HintCopy({ command }) {
  const [copied, setCopied] = React.useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-mono text-gray-500">Hint:</span>
      <span className="text-[11px] font-mono text-cyan-400">{command}</span>
      <button
        onClick={handleCopy}
        className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-gray-800 hover:bg-gray-700 border border-gray-600 transition-colors"
        title="Copy command"
      >
        {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3 text-gray-400" />}
      </button>
    </div>
  );
}

const STORAGE_KEY = (labTitle) => `lab_progress_${labTitle.replace(/\s+/g, "_")}`;

function loadProgress(labTitle) {
  try {
    const saved = localStorage.getItem(STORAGE_KEY(labTitle));
    return saved ? JSON.parse(saved) : null;
  } catch { return null; }
}

function saveProgress(labTitle, data) {
  try {
    localStorage.setItem(STORAGE_KEY(labTitle), JSON.stringify(data));
  } catch {}
}

function clearProgress(labTitle) {
  try {
    localStorage.removeItem(STORAGE_KEY(labTitle));
  } catch {}
}

export default function LabRunner({ labTitle, chapterNum, difficulty, tags = [], steps = [], terminalLabel = "Terminal", duration, intro }) {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const saved = loadProgress(labTitle);
  const [showIntro, setShowIntro] = useState(saved ? false : !!intro);
  const [showRecap, setShowRecap] = useState(saved?.showRecap ?? false);
  const [currentStep, setCurrentStep] = useState(saved?.currentStep ?? 0);
  const [completedSteps, setCompletedSteps] = useState(saved?.completedSteps ?? []);
  const [terminalHistory, setTerminalHistory] = useState(saved?.terminalHistory ?? []);
  const [totalCommands, setTotalCommands] = useState(saved?.totalCommands ?? 0);
  const [totalErrors, setTotalErrors] = useState(saved?.totalErrors ?? 0);
  const [inputVal, setInputVal] = useState("");
  const [awaitingEnter, setAwaitingEnter] = useState(!(saved?.completedSteps ?? []).includes(saved?.currentStep ?? 0));
  const [stepCompleted, setStepCompleted] = useState((saved?.completedSteps ?? []).includes(saved?.currentStep ?? 0));
  const [wrongCommand, setWrongCommand] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const outputRef = useRef(null);
  const inputRef = useRef(null);

  const [scenarioOpen, setScenarioOpen] = useState(true);

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  // Persist progress whenever key state changes
  useEffect(() => {
    if (!showRecap) {
      saveProgress(labTitle, { currentStep, completedSteps, terminalHistory, totalCommands, totalErrors, showRecap: false });
    }
  }, [currentStep, completedSteps, terminalHistory, totalCommands, totalErrors]);

  const handleReset = () => {
    clearProgress(labTitle);
    setShowResetConfirm(false);
    setShowRecap(false);
    setCurrentStep(0);
    setCompletedSteps([]);
    setTerminalHistory([]);
    setTotalCommands(0);
    setTotalErrors(0);
    setInputVal("");
    setAwaitingEnter(true);
    setStepCompleted(false);
    setWrongCommand(false);
    setShowIntro(!!intro);
  };

  useEffect(() => {
    if (outputRef.current) outputRef.current.scrollTop = outputRef.current.scrollHeight;
  }, [terminalHistory]);

  const prevStepRef = useRef(currentStep);
  useEffect(() => {
    // Only run side-effects when the user actually navigates to a new step
    if (prevStepRef.current === currentStep) return;
    prevStepRef.current = currentStep;

    const alreadyDone = completedSteps.includes(currentStep);
    if (!alreadyDone) {
      if (currentStep > 0) {
        setTerminalHistory(prev => [...prev, { type: "sep", text: "" }]);
      }
      setAwaitingEnter(true);
      setStepCompleted(false);
    } else {
      setAwaitingEnter(false);
      setStepCompleted(true);
    }
    setInputVal("");
    setWrongCommand(false);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [currentStep]);

  const handleInput = (e) => {
    if (e.key === "Enter") {
      const typed = inputVal.trim();
      const expected = step.command.trim();
      setTotalCommands(c => c + 1);
      const isMatch = step.caseSensitive
        ? typed === expected
        : typed.toLowerCase() === expected.toLowerCase();
      if (isMatch) {
        setWrongCommand(false);
        setTerminalHistory(prev => [
          ...prev,
          { type: "cmd", text: `${step.prompt} ${typed}` },
          ...step.output.map(line => ({ type: "out", text: line })),
        ]);
        if (!completedSteps.includes(currentStep)) {
          setCompletedSteps(prev => [...prev, currentStep]);
        }
        setAwaitingEnter(false);
        setStepCompleted(true);
      } else {
        setWrongCommand(true);
        setTotalErrors(e => e + 1);
        setTerminalHistory(prev => [
          ...prev,
          { type: "cmd", text: `${step.prompt} ${typed}` },
          { type: "err", text: `bash: ${typed.split(" ")[0]}: command not found or incorrect usage` },
        ]);
      }
      setInputVal("");
    }
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) setCurrentStep(s => s + 1);
  };

  const handleFinish = async () => {
    clearProgress(labTitle);
    try {
      const user = await base44.auth.me();
      const pointsPossible = steps.length * POINTS_PER_COMMAND;
      const pointsEarned = completedSteps.length * POINTS_PER_COMMAND;
      await base44.entities.LabScore.create({
        user_email: user.email,
        user_name: user.full_name || user.email,
        lab_title: labTitle,
        lab_chapter: String(chapterNum),
        difficulty,
        total_steps: steps.length,
        steps_completed: completedSteps.length,
        questions_correct: 0,
        questions_total: 0,
        points_earned: pointsEarned,
        points_possible: pointsPossible,
        step_results: steps.map((s, i) => ({
          stepLabel: s.stepLabel,
          commandCompleted: completedSteps.includes(i),
          questionCorrect: null,
          pointsEarned: completedSteps.includes(i) ? POINTS_PER_COMMAND : 0,
        })),
        completed_at: new Date().toISOString(),
      });
    } catch (_) {
      // Score save failed silently — still show recap
    }
    setShowRecap(true);
  };

  const diffColor = {
    Beginner: "text-green-400 border-green-600/50 bg-green-900/20",
    Intermediate: "text-yellow-400 border-yellow-600/50 bg-yellow-900/20",
    Advanced: "text-orange-400 border-orange-600/50 bg-orange-900/20",
    Expert: "text-red-400 border-red-600/50 bg-red-900/20",
  }[difficulty] || "text-gray-400 border-gray-600/50 bg-gray-900/20";

  if (showIntro && intro) {
    return (
      <LabIntro
        labTitle={labTitle}
        chapterNum={chapterNum}
        difficulty={difficulty}
        tags={tags}
        terminalLabel={terminalLabel}
        duration={duration}
        intro={intro}
        onStart={() => setShowIntro(false)}
      />
    );
  }

  if (showRecap) {
    const finalGoal = steps[steps.length - 1]?.finalGoal;
    const commandsUsed = [...new Set(steps.map(s => s.command.split(" ")[0]))];
    const passed = completedSteps.length === steps.length;
    const accuracy = totalCommands > 0 ? Math.round(((totalCommands - totalErrors) / totalCommands) * 100) : 100;

    return (
      <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/20 flex flex-col">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-black/60 shrink-0">
          <div className="flex items-center gap-3">
            <span className="text-white font-mono font-bold text-sm">Ch.{chapterNum} — {labTitle}</span>
          </div>
          <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-mono font-semibold ${diffColor}`}>{difficulty}</span>
        </div>
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-6 py-8">

            {/* Trophy + Title */}
            <div className="text-center mb-6">
              <div className={`inline-flex items-center justify-center h-16 w-16 rounded-full border-2 mb-3 ${passed ? "bg-yellow-900/30 border-yellow-600/50" : "bg-gray-900/50 border-gray-600/50"}`}>
                {passed ? <Trophy className="h-8 w-8 text-yellow-400" /> : <AlertTriangle className="h-8 w-8 text-orange-400" />}
              </div>
              <h1 className="text-2xl font-bold text-white mb-1">
                {passed ? t("labRunner.labComplete") : t("labRunner.sessionEnded")}
              </h1>
              <p className="text-gray-400 font-mono text-xs">
                {completedSteps.length}/{steps.length} {t("labRunner.stepsCompleted")}
              </p>
            </div>

            {/* Summary Card */}
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 mb-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t("labRunner.sessionSummary")}</h2>
                {passed ? (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-900/40 border border-green-600/50 text-green-400 text-[11px] font-mono font-bold">
                    <CheckCircle2 className="h-3.5 w-3.5" /> {t("labRunner.pass")}
                  </span>
                ) : (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-900/40 border border-red-600/50 text-red-400 text-[11px] font-mono font-bold">
                    <XCircle className="h-3.5 w-3.5" /> {t("labRunner.fail")}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-black/40 rounded-lg p-3 text-center border border-gray-800">
                  <div className="text-2xl font-bold text-cyan-400 font-mono">{totalCommands}</div>
                  <div className="text-[10px] text-gray-500 font-mono uppercase mt-1">{t("labRunner.commandsEntered")}</div>
                </div>
                <div className="bg-black/40 rounded-lg p-3 text-center border border-gray-800">
                  <div className={`text-2xl font-bold font-mono ${totalErrors > 0 ? "text-red-400" : "text-green-400"}`}>{totalErrors}</div>
                  <div className="text-[10px] text-gray-500 font-mono uppercase mt-1">{t("labRunner.errorsMade")}</div>
                </div>
                <div className="bg-black/40 rounded-lg p-3 text-center border border-gray-800">
                  <div className={`text-2xl font-bold font-mono ${accuracy >= 80 ? "text-green-400" : accuracy >= 50 ? "text-yellow-400" : "text-red-400"}`}>{accuracy}%</div>
                  <div className="text-[10px] text-gray-500 font-mono uppercase mt-1">{t("labRunner.accuracyRate")}</div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex justify-between text-[10px] font-mono text-gray-500 mb-1">
                  <span>{t("labRunner.stepsCompleted")}</span>
                  <span>{completedSteps.length}/{steps.length}</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${passed ? "bg-gradient-to-r from-green-600 to-green-400" : "bg-gradient-to-r from-red-600 to-orange-400"}`}
                    style={{ width: `${(completedSteps.length / steps.length) * 100}%` }}
                  />
                </div>
              </div>
              {!passed && (
                <p className="text-xs text-orange-300/80 font-mono mt-3 text-center">
                  {t("labRunner.completeAll", { count: steps.length })}
                </p>
              )}
            </div>

            {/* Final goal */}
            {finalGoal && passed && (
              <div className="bg-green-950/30 border border-green-700/40 rounded-xl px-4 py-3 flex gap-3 items-start mb-5">
                <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />
                <p className="text-green-200 text-xs leading-relaxed">{finalGoal}</p>
              </div>
            )}

            {/* Commands practiced */}
            <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 mb-6">
              <h2 className="text-xs font-bold text-gray-400 uppercase mb-3">{t("labRunner.commandsPracticed")}</h2>
              <div className="flex flex-wrap gap-2">
                {commandsUsed.map(cmd => (
                  <span key={cmd} className="text-[11px] font-mono px-2.5 py-1 rounded-lg bg-gray-800 border border-gray-600 text-cyan-300">{cmd}</span>
                ))}
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-5 py-2.5 border border-gray-600 hover:border-gray-400 text-gray-300 hover:text-white rounded-xl font-mono text-sm transition-colors"
              >
                <RotateCcw className="h-4 w-4" /> {t("labRunner.retryLab")}
              </button>
              <button
                onClick={() => navigate("/InteractiveVirtualLabs")}
                className="flex items-center gap-2 px-6 py-2.5 bg-red-700 hover:bg-red-600 text-white rounded-xl font-mono font-bold text-sm transition-colors"
              >
                {t("labRunner.backToCourses")} <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-950 to-red-950/20 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-black/60 shrink-0">
        <div className="flex items-center gap-3">
          <Link to="/InteractiveVirtualLabs" className="flex items-center gap-1.5 text-gray-400 hover:text-white text-xs font-mono transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> {t("labRunner.trainingLabs")}
          </Link>
          <span className="text-gray-600">|</span>
          <span className="text-white font-mono font-bold text-sm">Ch.{chapterNum} — {labTitle}</span>
        </div>
        <div className="flex items-center gap-2">
          {tags.map(t => (
            <span key={t} className="text-[10px] px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700 font-mono">{t}</span>
          ))}
          <span className={`text-[10px] px-2.5 py-0.5 rounded-full border font-mono font-semibold ${diffColor}`}>{difficulty}</span>
          <div className="relative">
            <button
              onClick={() => setShowResetConfirm(v => !v)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-700 hover:border-red-700/60 text-gray-400 hover:text-red-400 text-[11px] font-mono transition-colors"
              title="Reset lab progress"
            >
              <RotateCcw className="h-3 w-3" /> {t("labRunner.reset")}
            </button>
            {showResetConfirm && (
              <div className="absolute right-0 top-full mt-1 w-56 bg-gray-900 border border-red-700/50 rounded-xl shadow-xl z-50 p-3">
                <p className="text-xs text-gray-300 font-mono mb-3">{t("labRunner.resetTitle")}</p>
                <div className="flex gap-2">
                  <button onClick={() => setShowResetConfirm(false)} className="flex-1 px-2 py-1.5 text-[11px] font-mono border border-gray-600 hover:border-gray-400 text-gray-400 hover:text-white rounded-lg transition-colors">{t("labRunner.cancel")}</button>
                  <button onClick={handleReset} className="flex-1 px-2 py-1.5 text-[11px] font-mono bg-red-800 hover:bg-red-700 text-white rounded-lg transition-colors font-bold">{t("labRunner.confirmReset")}</button>
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
            <div
              className="h-full bg-gradient-to-r from-red-600 to-red-400 rounded-full transition-all duration-500"
              style={{ width: `${(completedSteps.length / steps.length) * 100}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-gray-500 shrink-0">
            {completedSteps.length}/{steps.length} {t("labRunner.stepsCompleted")}
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex min-h-0">
        {/* Left sidebar: Steps + AI Bot */}
        <div className="w-56 shrink-0 border-r border-gray-800 bg-black/30 flex flex-col overflow-hidden">
          {/* Steps list */}
          <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-1">
            <div className="text-[10px] font-mono text-gray-500 uppercase mb-2 px-1">{t("labRunner.steps")}</div>
            {steps.map((s, i) => {
              const done = completedSteps.includes(i);
              const active = i === currentStep;
              return (
                <button
                  key={i}
                  onClick={() => setCurrentStep(i)}
                  className={`text-left px-3 py-2 rounded-lg text-[11px] font-mono transition-all flex items-start gap-2 ${
                    active ? "bg-red-900/40 border border-red-700/50 text-white" :
                    done ? "bg-green-900/20 border border-green-800/30 text-green-400" :
                    "text-gray-500 hover:text-gray-300 hover:bg-gray-800/50 border border-transparent"
                  }`}
                >
                  {done ? <CheckCircle2 className="h-3 w-3 mt-0.5 shrink-0 text-green-400" /> :
                    <span className={`h-3 w-3 mt-0.5 shrink-0 rounded-full border ${active ? "border-red-500 bg-red-700" : "border-gray-600"}`} />}
                  <span className="line-clamp-2">{s.stepLabel}</span>
                </button>
              );
            })}
          </div>

          {/* AI Bot pinned to bottom of sidebar */}
          <LabAIBot labTitle={labTitle} currentStepLabel={step?.stepLabel} />
        </div>

        {/* Main area */}
        <div className="flex-1 flex flex-col min-w-0 p-4 gap-4">
          {/* Scenario context bar */}
          {intro?.overview && (
            <div className="bg-gray-900/60 border border-red-900/30 rounded-xl shrink-0 overflow-hidden">
              <button
                onClick={() => setScenarioOpen(v => !v)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-950/20 transition-colors"
              >
                <BookOpen className="h-4 w-4 text-red-400 shrink-0" />
                <span className="text-[10px] font-mono text-red-400 uppercase tracking-wider font-bold flex-1 text-left">{t("labRunner.scenario")}</span>
                <ChevronRight className={`h-3.5 w-3.5 text-gray-500 transition-transform ${scenarioOpen ? "rotate-90" : ""}`} />
              </button>
              {scenarioOpen && (
                <div className="px-4 pb-3">
                  <p className="text-gray-300 text-xs leading-relaxed font-mono">{intro.overview}</p>
                </div>
              )}
            </div>
          )}

          {/* Task description */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl shrink-0 overflow-hidden">
            {/* Step header */}
            <div className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-800 bg-black/30">
              <span className="text-[10px] font-mono text-gray-500 bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700">{t("labRunner.step", { current: currentStep + 1, total: steps.length })}</span>
              <span className="text-sm font-bold text-white font-mono">{step.stepLabel}</span>
            </div>

            <div className="p-4 flex flex-col gap-3">
              {/* Objective callout */}
              <div className="bg-red-950/30 border border-red-800/40 rounded-lg px-3 py-2.5">
                <p className="text-gray-200 text-xs leading-relaxed">
                  {step.explanation}{" "}
                  <span className="text-red-300 font-mono font-semibold">{t("labRunner.objective", { label: step.stepLabel.toLowerCase() })}</span>
                </p>
              </div>

              {/* Why it matters */}
              <div className="flex items-start gap-2">
                <Lightbulb className="h-3.5 w-3.5 text-yellow-400 mt-0.5 shrink-0" />
                <div>
                  <span className="text-[10px] font-mono text-yellow-500 font-bold uppercase tracking-wider">{t("labRunner.whyItMatters")}</span>
                  <span className="text-yellow-200/80 text-[11px] font-mono leading-relaxed">{step.whyItMatters}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Security Insight for this step */}
          <LabSecurityInsight insight={step.securityInsight} />

          {/* Wrong command warning */}
          {wrongCommand && (
            <div className="bg-red-950/50 border border-red-600/50 rounded-xl px-4 py-3 flex gap-3 items-center shrink-0">
              <span className="text-red-400 text-lg leading-none">⚠</span>
              <p className="text-red-300 text-xs font-mono leading-relaxed">
                {t("labRunner.incorrect")}
              </p>
            </div>
          )}

          {/* Terminal */}
          <div className="flex-1 bg-black border border-gray-700 rounded-xl flex flex-col overflow-hidden min-h-[160px]">
            <div className="flex items-center gap-2 px-4 py-2 border-b border-gray-800 bg-gray-950 shrink-0">
              <Terminal className="h-3.5 w-3.5 text-gray-500" />
              <span className="text-[11px] font-mono text-gray-500">{terminalLabel}</span>
            </div>
            <div ref={outputRef} className="flex-1 overflow-y-auto p-4 font-mono text-xs space-y-0.5">
              {terminalHistory.map((line, i) => (
                <div key={i} className={
                  line.type === "sep" ? "border-t border-gray-800 my-2" :
                  line.type === "cmd" ? "text-cyan-300" :
                  line.type === "err" ? "text-red-400" :
                  line.type === "sim" ? "text-gray-500 italic" :
                  "text-gray-300"
                }>{line.type === "sep" ? null : (line.text || "\u00A0")}</div>
              ))}
              {awaitingEnter && (
                <div className="flex items-center gap-1">
                  <span className="text-cyan-400">{step.prompt}</span>
                  <input
                    ref={inputRef}
                    value={inputVal}
                    onChange={e => setInputVal(e.target.value)}
                    onKeyDown={handleInput}
                    autoFocus
                    className="flex-1 bg-transparent text-green-300 font-mono text-xs outline-none caret-green-400"
                    spellCheck={false}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Next step directions */}
          {stepCompleted && step.nextStepDirections && (
            <div className="bg-blue-950/40 border border-blue-700/40 rounded-xl px-4 py-3 flex gap-3 items-start shrink-0">
              <ArrowRight className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
              <p className="text-blue-200 text-xs leading-relaxed font-mono">{step.nextStepDirections}</p>
            </div>
          )}

          {/* Hint + Next/Finish */}

          <div className="flex items-center justify-between shrink-0">
            <HintCopy command={step.command} />

            {stepCompleted && (
              isLastStep ? (
                <button
                  onClick={handleFinish}
                  className="flex items-center gap-2 px-5 py-2 bg-yellow-700 hover:bg-yellow-600 text-white rounded-lg font-mono text-xs font-bold transition-colors shrink-0"
                >
                  <Trophy className="h-3.5 w-3.5" />
                   {t("labRunner.completeLab")}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg font-mono text-xs transition-colors shrink-0"
                >
                  {t("labRunner.nextStep")} <ChevronRight className="h-3.5 w-3.5" />
                </button>
              )
            )}
          </div>
        </div>

        {/* Right notepad pane */}
        <LabNotepad labTitle={labTitle} />
      </div>
    </div>
  );
}